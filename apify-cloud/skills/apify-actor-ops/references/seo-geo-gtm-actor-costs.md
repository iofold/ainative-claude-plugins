# SEO/GEO/GTM Apify Actor Cost Models

Last checked: 2026-05-01. Re-check Apify Store before broad runs because pricing, rating, usage, and maintenance status can change.

| Actor | Workflow | Current listed cost model | Default cap in bundled scripts | Stance |
|-------|----------|---------------------------|--------------------------------|--------|
| `apify/google-search-scraper` | Rich Google SERP snapshots for keyword research and content-gap discovery | Pay-per-event; Store listing starts from `$1.80 / 1,000` scraped search result pages. Prior runs required a minimum `maxTotalChargeUsd` of `$0.50`. | `$0.50`, 1 dataset item, 1 SERP page/query | Primary rich SERP actor |
| `igolaizola/google-search-scraper-ppe` | Low-cost organic SERP rows | Pay-per-result; Store listing starts from `$0.13 / 1,000` results and page copy advertises about `$0.15 / 1,000` results. | `$0.05`, 10 rows | Low-cost fallback |
| `burbn/ahrefs-keyword-explorer` | Keyword volume, CPC, difficulty, clicks, global volume, and traffic-potential metrics | Pay-per-event in validated runs: `$0.02` actor-start events per GB memory; a 3-keyword US smoke at 4 GB cost `$0.08`, and an earlier 10-keyword US batch cost `$0.24` with result events. No subscription required, but rating/review signal is weak. | `$0.25`, 10 keywords | Primary keyword-volume actor after 2026-05-01 smoke tests |
| `happitap/seo-audit-tool` | Basic one-page SEO audit | Pay-per-event; docs list `$0.001` per successfully audited page, failed pages not charged. | `$0.50`, 2 rows | Lightweight audit fallback |
| `smart-digital/complete-seo-audit-tool` | Comprehensive SEO audit | Pay-per-page; Store listing says `$20.00 / 1,000` pages. | `$0.50`, 2 rows | Not default; prior smoke test timed out |
| `curious_coder/facebook-ads-library-scraper` | Meta Ad Library competitor ads | Pay-per-ad; Store listing says `$0.75 / 1,000` ads. Actor requires at least 10 charged results. | `$0.50`, 10 ads | Selected Meta default |
| `solidcode/ads-transparency-scraper` | Google Ads Transparency Center creatives | Store surfaces conflict: listing says from `$0.80 / 1,000` results; README pricing says `$4.00 / 1,000` results. Platform fees may be additional. | `$0.50`, 10 results | Provisional; cap every run |

## Cost-Control Rules

- Keep every run behind `--max-total-charge-usd`.
- Start with one keyword, one page, one competitor URL, or one ad-library source.
- Use `--dry-run` first to inspect the exact input JSON and command.
- Do not use monthly subscription actors for these workflows.
- Treat actor-side minimums as real constraints. For example, the Meta actor rejected a 5-result cap and required at least 10 charged results.
- Store raw outputs under `.tmp/apify-runs/` and record run ID, status, item count, and actual usage.
- Do not call a SERP-only run "keyword research" unless it is paired with volume data or an explicitly labeled demand proxy. `google-*` presets produce SERP evidence; `ahrefs-keyword-volume` produces keyword metrics.
