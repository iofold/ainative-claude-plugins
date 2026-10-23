# Apify Cloud

Safe Apify Actor workflows for capped scraping, social research, SEO/GEO/SERP collection, ad-library intelligence, and dataset export.

## Configuration

Set one of these environment variables in the shell, project `.env`, or Claude settings:

- `APIFY_API_TOKEN`
- `APIFY_TOKEN`

Never print or commit tokens.

## Included Skills

- `apify-actor-ops` - Run Apify Actors safely with spend caps and dataset export.
- `apify-reddit-research` - Fetch Reddit posts, comments, listings, communities, and users.
- `apify-x-research` - Fetch public X/Twitter posts, replies, timelines, searches, and X Articles.
- `apify-seo-gtm-research` - Run known-good SEO/GEO/SERP, keyword-volume, page-audit, and ad-library presets.

## Quick Checks

```bash
bun run ${CLAUDE_PLUGIN_ROOT}/skills/apify-seo-gtm-research/scripts/run_seo_gtm_collection.ts --list-presets

bun run ${CLAUDE_PLUGIN_ROOT}/skills/apify-seo-gtm-research/scripts/run_seo_gtm_collection.ts \
  --preset google-cheap-serp \
  --query "best crm software for small business" \
  --dry-run
```
