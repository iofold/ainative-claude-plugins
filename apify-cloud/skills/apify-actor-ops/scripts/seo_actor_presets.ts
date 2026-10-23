#!/usr/bin/env bun

import { mkdir } from "node:fs/promises";

type CliArgs = Record<string, string | boolean>;

type Preset = {
  actor: string;
  label: string;
  defaultOutPrefix: string;
  defaultMaxItems: number;
  defaultMaxTotalChargeUsd: string;
  timeout: string;
  memory: string;
  waitSeconds: string;
  costSummary: string;
  buildInput: (args: CliArgs) => Record<string, unknown>;
};

const PRESETS: Record<string, Preset> = {
  "google-rich-serp": {
    actor: "apify/google-search-scraper",
    label: "Rich Google SERP snapshot with organic, paid, PAA, and AI Overview containers",
    defaultOutPrefix: "google-rich-serp",
    defaultMaxItems: 1,
    defaultMaxTotalChargeUsd: "0.50",
    timeout: "120",
    memory: "512",
    waitSeconds: "180",
    costSummary: "Pay-per-event. Current Store listing starts from $1.80 / 1,000 scraped search result pages; Apify enforces a $0.50 minimum maxTotalChargeUsd cap for this Actor.",
    buildInput: (args) => ({
      countryCode: stringArg(args, "country", "us"),
      languageCode: stringArg(args, "language", "en"),
      maxPagesPerQuery: numberArg(args, "max-pages", 1),
      queries: required(args, "query"),
      resultsPerPage: numberArg(args, "results-per-page", 10),
      mobileResults: boolArg(args, "mobile", false),
      includeUnfilteredResults: false,
      saveHtml: false,
      saveHtmlToKeyValueStore: false,
      maxConcurrency: 1,
    }),
  },
  "google-cheap-serp": {
    actor: "igolaizola/google-search-scraper-ppe",
    label: "Low-cost Google organic result rows with position, title, URL, and snippet",
    defaultOutPrefix: "google-cheap-serp",
    defaultMaxItems: 10,
    defaultMaxTotalChargeUsd: "0.05",
    timeout: "120",
    memory: "256",
    waitSeconds: "180",
    costSummary: "Pay-per-result. Current Store listing starts from $0.13 / 1,000 results and advertises roughly $0.15 / 1,000 results.",
    buildInput: (args) => ({
      maxItems: numberArg(args, "max-items", 10),
      query: required(args, "query"),
      country: stringArg(args, "country", "us"),
      language: stringArg(args, "language", "en"),
      domain: stringArg(args, "google-domain", "google.com"),
    }),
  },
  "ahrefs-keyword-volume": {
    actor: "burbn/ahrefs-keyword-explorer",
    label: "Keyword volume, CPC, difficulty, clicks, global volume, and traffic-potential metrics",
    defaultOutPrefix: "ahrefs-keyword-volume",
    defaultMaxItems: 10,
    defaultMaxTotalChargeUsd: "0.25",
    timeout: "240",
    memory: "4096",
    waitSeconds: "300",
    costSummary: "Pay-per-event. Validated 2026-05-01: actor start charged $0.02 per GB of memory; a 3-keyword smoke at 4 GB cost $0.08, and an earlier 10-keyword batch cost $0.24 with result events. No subscription required, but review signal is weak.",
    buildInput: (args) => {
      const keywords = listArg(args, "keywords", [stringArg(args, "keyword", stringArg(args, "query", ""))]).filter(Boolean);
      if (keywords.length === 0) throw new Error("--keyword, --query, or --keywords is required for this preset");
      return {
        keywords,
        country: stringArg(args, "country", "us"),
      };
    },
  },
  "seo-page-audit": {
    actor: "happitap/seo-audit-tool",
    label: "Basic one-page SEO audit with title, meta, heading, and link checks",
    defaultOutPrefix: "seo-page-audit",
    defaultMaxItems: 2,
    defaultMaxTotalChargeUsd: "0.50",
    timeout: "120",
    memory: "512",
    waitSeconds: "180",
    costSummary: "Pay-per-event. Current Store docs list $0.001 per successfully audited page; failed pages are not charged.",
    buildInput: (args) => ({
      startUrl: required(args, "url"),
      crawlRecursive: boolArg(args, "crawl", false),
      proxy: { useApifyProxy: true },
      pageTimeout: 60000,
      handlePageTimeoutSecs: 30,
      maxRequestRetries: 1,
    }),
  },
  "seo-complete-audit": {
    actor: "smart-digital/complete-seo-audit-tool",
    label: "Comprehensive SEO audit actor, retained for explicit retries only",
    defaultOutPrefix: "seo-complete-audit",
    defaultMaxItems: 2,
    defaultMaxTotalChargeUsd: "0.50",
    timeout: "120",
    memory: "512",
    waitSeconds: "180",
    costSummary: "Pay-per-page. Current Store listing is $20.00 / 1,000 pages. Prior smoke test timed out, so this is not a default.",
    buildInput: (args) => ({
      startUrls: [required(args, "url")],
      crawlPages: boolArg(args, "crawl", false),
      maxPages: numberArg(args, "max-pages", 1),
      maxConcurrency: 1,
      auditMetaTags: true,
      auditHeadings: true,
      auditContent: true,
      auditTechnical: true,
      auditPerformance: false,
      auditSchema: true,
      auditLinks: true,
      auditImages: true,
      auditAccessibility: false,
    }),
  },
  "meta-ads-page": {
    actor: "curious_coder/facebook-ads-library-scraper",
    label: "Meta Ad Library ads for one Facebook page URL",
    defaultOutPrefix: "meta-ads-page",
    defaultMaxItems: 10,
    defaultMaxTotalChargeUsd: "0.50",
    timeout: "240",
    memory: "512",
    waitSeconds: "300",
    costSummary: "Pay-per-ad. Current Store listing is $0.75 / 1,000 ads. Actor requires at least 10 charged results.",
    buildInput: (args) => {
      const maxResults = Math.max(numberArg(args, "max-results", numberArg(args, "max-items", 10)), 10);
      return {
        urls: [{ url: required(args, "facebook-url") }],
        scrapeAdDetails: boolArg(args, "scrape-ad-details", false),
        limitPerSource: maxResults,
        count: maxResults,
        "scrapePageAds.activeStatus": stringArg(args, "active-status", "active"),
        "scrapePageAds.countryCode": stringArg(args, "country", "US").toUpperCase(),
        "scrapePageAds.sortBy": stringArg(args, "sort-by", "impressions_desc"),
        runTag: stringArg(args, "run-tag", "b2b-saas-gtm-ad-intel"),
        proxy: { useApifyProxy: true, apifyProxyGroups: ["RESIDENTIAL"] },
      };
    },
  },
  "google-ads-transparency": {
    actor: "solidcode/ads-transparency-scraper",
    label: "Google Ads Transparency Center creatives by domain, keyword, or advertiser ID",
    defaultOutPrefix: "google-ads-transparency",
    defaultMaxItems: 10,
    defaultMaxTotalChargeUsd: "0.50",
    timeout: "240",
    memory: "256",
    waitSeconds: "300",
    costSummary: "Pay-per-result. Current Store pages disagree: listing says from $0.80 / 1,000 results while README pricing says $4.00 / 1,000 results. Treat as provisional and cap every run.",
    buildInput: (args) => ({
      searchQuery: stringArg(args, "search-query", stringArg(args, "domain", "")) || required(args, "search-query"),
      maxResults: numberArg(args, "max-results", numberArg(args, "max-items", 10)),
      region: stringArg(args, "region", stringArg(args, "country", "US")).toUpperCase(),
    }),
  },
};

export async function runPresetCli(allowedPresets: string[], defaultPreset: string, examples: string): Promise<void> {
  const args = parseArgs(Bun.argv.slice(2));
  if (args.help || args.h) usage(allowedPresets, examples, 0);
  if (args["list-presets"]) {
    for (const name of allowedPresets) {
      const preset = PRESETS[name];
      console.log(`${name}\t${preset.actor}\t${preset.label}\t${preset.costSummary}`);
    }
    return;
  }

  const presetName = stringArg(args, "preset", defaultPreset);
  if (!allowedPresets.includes(presetName)) usage(allowedPresets, examples, 2);
  const preset = PRESETS[presetName];
  const input = preset.buildInput(args);
  const outDir = stringArg(args, "out-dir", `.tmp/apify-runs/${preset.defaultOutPrefix}`);
  const slug = slugify([
    presetName,
    stringArg(args, "query", ""),
    stringArg(args, "keyword", ""),
    stringArg(args, "domain", ""),
    stringArg(args, "url", ""),
    stringArg(args, "facebook-url", ""),
    stringArg(args, "search-query", ""),
  ].filter(Boolean).join("-") || "run");
  const inputPath = stringArg(args, "input-out", `${outDir}/${slug}.input.json`);
  const outPath = stringArg(args, "out", `${outDir}/${slug}.output.json`);

  await writeJson(inputPath, input);
  const runnerPath = new URL("./run_actor.ts", import.meta.url).pathname;
  const runnerArgs = [
    "run",
    runnerPath,
    "--actor",
    preset.actor,
    "--input",
    inputPath,
    "--out",
    outPath,
    "--max-total-charge-usd",
    stringArg(args, "max-total-charge-usd", preset.defaultMaxTotalChargeUsd),
    "--max-items",
    String(numberArg(args, "max-items", preset.defaultMaxItems)),
    "--timeout",
    stringArg(args, "timeout", preset.timeout),
    "--memory",
    stringArg(args, "memory", preset.memory),
    "--wait-seconds",
    stringArg(args, "wait-seconds", preset.waitSeconds),
  ];

  console.log(`Preset: ${presetName}`);
  console.log(`Actor: ${preset.actor}`);
  console.log(`Cost model: ${preset.costSummary}`);
  console.log(`Input: ${inputPath}`);
  console.log(`Output: ${outPath}`);
  console.log(`Command: bun ${runnerArgs.map(shellQuote).join(" ")}`);

  if (args["dry-run"]) return;

  const proc = Bun.spawn(["bun", ...runnerArgs], { stdout: "inherit", stderr: "inherit" });
  const exitCode = await proc.exited;
  process.exit(exitCode);
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {};
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    if (!key.startsWith("--")) {
      args._ = [String(args._ ?? ""), key].filter(Boolean).join(" ");
      continue;
    }
    const name = key.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      args[name] = true;
    } else {
      args[name] = next;
      index += 1;
    }
  }
  return args;
}

function usage(allowedPresets: string[], examples: string, exitCode: number): never {
  console.error(`Usage:
  bun run <script> --preset <preset> [options]

Presets:
${allowedPresets.map((name) => `  ${name}: ${PRESETS[name].actor}`).join("\n")}

Common options:
  --dry-run
  --list-presets
  --query "best crm software for small business"
  --keyword "crm software"
  --domain zapier.com
  --url https://www.intercom.com/
  --facebook-url https://www.facebook.com/ZapierApp
  --search-query zapier.com
  --country us
  --max-items 10
  --max-total-charge-usd 0.50
  --out .tmp/apify-runs/example.json

Examples:
${examples}`);
  process.exit(exitCode);
}

function required(args: CliArgs, name: string): string {
  const value = stringArg(args, name, "");
  if (!value) throw new Error(`--${name} is required for this preset`);
  return value;
}

function stringArg(args: CliArgs, name: string, fallback: string): string {
  const value = args[name];
  if (typeof value === "string") return value;
  return fallback;
}

function listArg(args: CliArgs, name: string, fallback: string[]): string[] {
  const value = args[name];
  if (typeof value !== "string") return fallback;
  return value
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function numberArg(args: CliArgs, name: string, fallback: number): number {
  const value = args[name];
  if (typeof value !== "string") return fallback;
  const number = Number(value);
  if (!Number.isFinite(number)) throw new Error(`--${name} must be a number`);
  return number;
}

function boolArg(args: CliArgs, name: string, fallback: boolean): boolean {
  const value = args[name];
  if (typeof value === "boolean") return value;
  if (typeof value !== "string") return fallback;
  return ["1", "true", "yes", "y"].includes(value.toLowerCase());
}

async function writeJson(path: string, value: unknown): Promise<void> {
  const directory = path.replace(/[\\/][^\\/]+$/, "");
  await mkdir(directory, { recursive: true });
  await Bun.write(path, `${JSON.stringify(value, null, 2)}\n`);
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function shellQuote(value: string): string {
  if (/^[A-Za-z0-9_./:=~-]+$/.test(value)) return value;
  return `"${value.replace(/"/g, '\\"')}"`;
}
