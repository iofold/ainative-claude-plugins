---
name: apify-seo-gtm-research
description: Use for capped Apify collection of SEO, GEO, SERP, keyword-volume, page-audit, content-gap, and ad-library datasets.
---

# Apify SEO/GEO/GTM Research

Use this skill when a task needs repeatable paid-data collection for search results, keyword demand, page audits, competitor content-gap inputs, Meta ads, or Google Ads Transparency Center data.

## Selection Rules

- Use direct web search or page fetch first when a one-off answer is enough.
- Use Apify only when the task needs structured rows, repeatable snapshots, actor-specific fields, or larger bounded collection.
- Re-check the Apify Store before broad runs because pricing, ratings, maintenance status, and schemas change.
- Start every new source with `--dry-run`, then a tiny capped smoke test.
- Keep `--max-total-charge-usd` on every paid run.
- Store raw outputs in `.tmp/apify-runs/`; promote only curated summaries into durable docs.
- Do not use actors from banned or predatory authors. In Manifold work, `pro100chok/*` is banned.

## Preset Runner

```bash
bun run ${CLAUDE_PLUGIN_ROOT}/skills/apify-seo-gtm-research/scripts/run_seo_gtm_collection.ts --list-presets
```

Dry-run examples:

```bash
bun run ${CLAUDE_PLUGIN_ROOT}/skills/apify-seo-gtm-research/scripts/run_seo_gtm_collection.ts \
  --preset google-rich-serp \
  --query "best customer support software for small business" \
  --dry-run

bun run ${CLAUDE_PLUGIN_ROOT}/skills/apify-seo-gtm-research/scripts/run_seo_gtm_collection.ts \
  --preset ahrefs-keyword-volume \
  --keywords "crm software,crm for startups,crm alternatives" \
  --country us \
  --dry-run

bun run ${CLAUDE_PLUGIN_ROOT}/skills/apify-seo-gtm-research/scripts/run_seo_gtm_collection.ts \
  --preset meta-ads-page \
  --facebook-url https://www.facebook.com/ZapierApp \
  --dry-run
```

## Supported Presets

| Preset | Actor | Use |
| --- | --- | --- |
| `google-rich-serp` | `apify/google-search-scraper` | Rich Google SERP snapshots with organic, paid, PAA, and AI Overview containers. |
| `google-cheap-serp` | `igolaizola/google-search-scraper-ppe` | Low-cost organic rows with position, title, URL, and snippet. |
| `ahrefs-keyword-volume` | `burbn/ahrefs-keyword-explorer` | Keyword volume, CPC, difficulty, clicks, global volume, and traffic-potential metrics. |
| `seo-page-audit` | `happitap/seo-audit-tool` | Lightweight single-page title, meta, headings, and link checks. |
| `seo-complete-audit` | `smart-digital/complete-seo-audit-tool` | Comprehensive audit retained for explicit retries only. |
| `meta-ads-page` | `curious_coder/facebook-ads-library-scraper` | Meta Ad Library snapshots for one Facebook page URL. |
| `google-ads-transparency` | `solidcode/ads-transparency-scraper` | Google Ads Transparency Center creatives by domain, keyword, or advertiser ID. |

## Output Notes

Record the actor ID, Store URL, pricing/rating evidence, input payload without secrets, run ID, status, result count, and actual usage when available.

Do not call SERP-only data keyword volume. Use `ahrefs-keyword-volume` or label the volume field unknown.
