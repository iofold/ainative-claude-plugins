---
name: apify-actor-ops
description: Use for running Apify Actors safely, fetching dataset results, checking account limits, and packaging actor outputs for downstream research workflows.
---

# Apify Actor Ops

Use this skill when a task needs Apify Actors, Apify API calls, Actor datasets, or reusable scraping runs.

## Token

- Read `APIFY_API_TOKEN` first, then `APIFY_TOKEN`.
- The bundled runner loads the nearest project `.env` when the environment variable is not already set.
- Never print, commit, or copy the token into docs, logs, examples, or screenshots.

## Safe Run Workflow

1. Select an Actor using the policy below; do not use random or meta Actors.
2. Confirm the target Actor ID and its current input contract from the Apify Store page or API docs.
3. Start with the smallest useful request: low `maxItems`, low `resultsLimit`, narrow subreddit/user/query, and one URL or ID when possible.
4. Pass Apify run caps: `maxTotalChargeUsd`, `maxItems` where supported, `timeout`, and `memory`.
5. Save raw outputs under `.tmp/apify-runs/`; promote only curated, source-safe summaries into `docs/wiki/`.
6. Record the actor ID, selection evidence, input payload without secrets, run status, result count, and any errors.

## Actor Selection Policy

Use only Actors that satisfy all of these unless the user explicitly overrides:

- Narrow task fit for the requested source and data shape.
- High rating, preferably `4.5+`, with meaningful usage/review signal.
- Recent maintenance and no `Deprecated` or `Under maintenance` status.
- Transparent cheap pay-per-use or pay-per-result pricing; avoid subscriptions for one-off research.
- Clear input/output docs and predictable result caps.
- Support for tiny smoke tests and run-level budget caps.

Do not use meta/generator Actors such as Hermes Skill Builder, actor-package generators, API-doc converters, or generic "build a skill from this URL" Actors for operational scraping. Those are only allowed when the task itself is to evaluate a generator.

Current approved and provisional defaults:

| Source | Actor | Use | Selection note |
| --- | --- | --- | --- |
| X/Twitter tweets | `xquik/x-tweet-scraper` | tweet ID lookup, search terms, advanced filters | 5.0 rating, pay-per-result, about `$0.15 / 1,000` tweets. |
| X/Twitter replies | `scraper_one/x-post-replies-scraper` | replies/comments for known post URLs | 4.6 rating, targeted replies actor; verify current pricing before broad runs. |
| X/Twitter articles | `fastcrawler/x-twitter-article-to-markdown` | long-form `x.com/i/article/...` content, starting from the post ID that links to the article | Provisional exception: no highly rated article-specific Actor was found; this one is narrow-fit, recently maintained, cheap pay-per-event, and passed a capped smoke test on 2026-04-30. Validate output before ingesting because article-ID input returned an empty row while the linking status ID returned Markdown. |
| Reddit | `peakydev/reddit-scraper-post-comments-users` | posts, comments, listings, communities, users | 4.9 rating, pay-per-use, about `$1.80 / 1,000` results. |

## Helper Script

Run a JSON input file through an Actor and save both run metadata and dataset items:

```bash
bun run ${CLAUDE_PLUGIN_ROOT}/skills/apify-actor-ops/scripts/run_actor.ts \
  --actor owner/actor-name \
  --input .tmp/apify-input.json \
  --out .tmp/apify-runs/example.json \
  --max-total-charge-usd 0.25 \
  --max-items 25 \
  --timeout 120 \
  --memory 256
```

The script accepts `owner/name` or `owner~name`, polls until the run reaches a terminal status, and fetches `defaultDatasetId` items when the run succeeds.

## SEO/GEO/GTM Presets

Use `apify-seo-gtm-research` for known-good SEO, content-gap, and ad-library configurations. It writes the exact Actor input JSON under `.tmp/apify-runs/<preset>/`, prints the Actor cost model, and supports `--dry-run` and `--list-presets` before any paid call.

Cost models for the bundled SEO/GEO/GTM presets live in `references/seo-geo-gtm-actor-costs.md`.

## Troubleshooting

- `platform-feature-disabled` with monthly usage hard limit exceeded: stop running paid Actors, report the account-limit blocker, and continue from public Actor docs only.
- Empty dataset: inspect Actor run status/logs before changing payloads; schema drift and blocked public pages are common.
- Partial results: preserve raw output and note missing fields rather than inventing normalized values.

## Sources

- Apify Run Actor API: https://docs.apify.com/api/v2/act-runs-post
- Apify Actor input schema docs: https://docs.apify.com/platform/actors/development/actor-definition/input-schema/specification/v1
