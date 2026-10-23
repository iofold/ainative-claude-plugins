#!/usr/bin/env bun

type RunStatus = "READY" | "RUNNING" | "SUCCEEDED" | "FAILED" | "ABORTED" | "TIMED-OUT";

const TERMINAL_STATUSES = new Set<RunStatus>(["SUCCEEDED", "FAILED", "ABORTED", "TIMED-OUT"]);
const API_BASE = "https://api.apify.com/v2";

type Args = {
  actor?: string;
  input?: string;
  out?: string;
  maxTotalChargeUsd?: string;
  maxItems?: string;
  timeout?: string;
  memory?: string;
  pollSeconds: string;
  waitSeconds: string;
};

function usage(): never {
  console.error(`Usage:
  bun run ${CLAUDE_PLUGIN_ROOT}/skills/apify-actor-ops/scripts/run_actor.ts \\
    --actor owner/actor-name \\
    --input .tmp/apify-input.json \\
    --out .tmp/apify-runs/example.json \\
    --max-total-charge-usd 0.25 \\
    --max-items 25 \\
    --timeout 120 \\
    --memory 256`);
  process.exit(2);
}

function parseArgs(argv: string[]): Args {
  const args: Args = { pollSeconds: "5", waitSeconds: "180", maxTotalChargeUsd: "0.25" };
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    if (!key.startsWith("--")) usage();
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) usage();
    index += 1;
    switch (key) {
      case "--actor":
        args.actor = value;
        break;
      case "--input":
        args.input = value;
        break;
      case "--out":
        args.out = value;
        break;
      case "--max-total-charge-usd":
        args.maxTotalChargeUsd = value;
        break;
      case "--max-items":
        args.maxItems = value;
        break;
      case "--timeout":
        args.timeout = value;
        break;
      case "--memory":
        args.memory = value;
        break;
      case "--poll-seconds":
        args.pollSeconds = value;
        break;
      case "--wait-seconds":
        args.waitSeconds = value;
        break;
      default:
        usage();
    }
  }
  if (!args.actor || !args.input || !args.out) usage();
  return args;
}

async function loadDotenv(): Promise<void> {
  let current = process.cwd();
  while (true) {
    const envPath = `${current}/.env`;
    if (await Bun.file(envPath).exists()) {
      const text = await Bun.file(envPath).text();
      for (const line of text.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
        const [key, ...rest] = trimmed.split("=");
        const value = rest.join("=").trim().replace(/^['"]|['"]$/g, "");
        if (!process.env[key.trim()]) process.env[key.trim()] = value;
      }
      return;
    }
    const parent = current.replace(/[\\/][^\\/]+$/, "");
    if (parent === current) return;
    current = parent;
  }
}

function getToken(): string {
  const token = process.env.APIFY_API_TOKEN || process.env.APIFY_TOKEN;
  if (!token) {
    console.error("APIFY_API_TOKEN or APIFY_TOKEN is required");
    process.exit(2);
  }
  return token;
}

async function requestJson(method: string, url: string, token: string, payload?: unknown): Promise<any> {
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(payload === undefined ? {} : { "Content-Type": "application/json" }),
    },
    body: payload === undefined ? undefined : JSON.stringify(payload),
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  if (!response.ok) {
    throw new Error(`Apify API error ${response.status}: ${JSON.stringify(data)}`);
  }
  return data;
}

function actorApiId(actor: string): string {
  return actor.replace("/", "~");
}

function buildQuery(args: Args): string {
  const params = new URLSearchParams();
  if (args.timeout) params.set("timeout", args.timeout);
  if (args.memory) params.set("memory", args.memory);
  if (args.maxItems) params.set("maxItems", args.maxItems);
  if (args.maxTotalChargeUsd) params.set("maxTotalChargeUsd", args.maxTotalChargeUsd);
  return params.toString();
}

async function sleep(milliseconds: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, milliseconds));
}

const args = parseArgs(Bun.argv.slice(2));
await loadDotenv();
const token = getToken();

const runInput = await Bun.file(args.input!).json();
const actorId = actorApiId(args.actor!);
const query = buildQuery(args);
const runUrl = `${API_BASE}/acts/${actorId}/runs${query ? `?${query}` : ""}`;

const initial = await requestJson("POST", runUrl, token, runInput);
let run = initial.data ?? initial;
const runId = run.id;
const deadline = Date.now() + Number(args.waitSeconds) * 1000;

while (!TERMINAL_STATUSES.has(run.status) && Date.now() < deadline) {
  await sleep(Number(args.pollSeconds) * 1000);
  const latest = await requestJson("GET", `${API_BASE}/actor-runs/${runId}`, token);
  run = latest.data ?? latest;
}

let items: unknown[] = [];
if (run.status === "SUCCEEDED" && run.defaultDatasetId) {
  const itemsUrl = `${API_BASE}/datasets/${run.defaultDatasetId}/items?clean=true&format=json`;
  const dataset = await requestJson("GET", itemsUrl, token);
  items = Array.isArray(dataset) ? dataset : [dataset];
}

const output = {
  actor: args.actor,
  input_path: args.input,
  run,
  item_count: items.length,
  items,
};

await Bun.write(args.out!, `${JSON.stringify(output, null, 2)}\n`);
console.log(`${run.status} run_id=${runId} items=${items.length} out=${args.out}`);
process.exit(run.status === "SUCCEEDED" ? 0 : 1);
