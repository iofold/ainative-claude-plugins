#!/usr/bin/env bun

import { runPresetCli } from "../../apify-actor-ops/scripts/seo_actor_presets.ts";

const examples = `
  bun run \${CLAUDE_PLUGIN_ROOT}/skills/apify-seo-gtm-research/scripts/run_seo_gtm_collection.ts --preset google-rich-serp --query "best crm software for small business" --dry-run
  bun run \${CLAUDE_PLUGIN_ROOT}/skills/apify-seo-gtm-research/scripts/run_seo_gtm_collection.ts --preset ahrefs-keyword-volume --keywords "crm software,crm for startups" --country us --dry-run
  bun run \${CLAUDE_PLUGIN_ROOT}/skills/apify-seo-gtm-research/scripts/run_seo_gtm_collection.ts --preset meta-ads-page --facebook-url https://www.facebook.com/ZapierApp --dry-run
`;

await runPresetCli(
  [
    "google-rich-serp",
    "google-cheap-serp",
    "ahrefs-keyword-volume",
    "seo-page-audit",
    "seo-complete-audit",
    "meta-ads-page",
    "google-ads-transparency",
  ],
  "google-cheap-serp",
  examples
);
