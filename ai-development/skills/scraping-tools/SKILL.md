---
name: scraping-tools
description: This skill should be used when WebFetch fails (403, blocked, timeout), when the user asks to "scrape this URL", "fetch this page", "search the web for", "find articles about", or when you need to extract content from a URL that blocks standard fetching. Provides Firecrawl for scraping and Exa for semantic search as fallbacks.
---

# Scraping Tools: Firecrawl + Exa

Fallback web scraping and search when built-in WebFetch fails (403s, bot blocks, JS-heavy pages).

## When to Use

1. **WebFetch returns 403/blocked** - switch to Firecrawl scrape
2. **Need to search the web semantically** - use Exa search
3. **JS-heavy pages** that return empty content - use Firecrawl
4. **Find similar content** to a URL - use Exa findSimilar

## Prerequisites

Set these environment variables (add to `.env` or export):
```bash
export FIRECRAWL_API_KEY="fc-..."    # Get from https://firecrawl.dev
export EXA_API_KEY="..."              # Get from https://exa.ai
```

## Firecrawl: Scrape Any URL

Use when you need to extract content from a specific URL.

### Scrape a page to markdown
```bash
curl -s -X POST 'https://api.firecrawl.dev/v2/scrape' \
  -H "Authorization: Bearer $FIRECRAWL_API_KEY" \
  -H 'Content-Type: application/json' \
  -d "{\"url\": \"$URL\", \"formats\": [\"markdown\"]}" | jq -r '.data.markdown'
```

### Scrape with specific content extraction
```bash
curl -s -X POST 'https://api.firecrawl.dev/v2/scrape' \
  -H "Authorization: Bearer $FIRECRAWL_API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{
    "url": "'"$URL"'",
    "formats": ["markdown"],
    "onlyMainContent": true,
    "waitFor": 3000
  }' | jq -r '.data.markdown'
```

### Search the web via Firecrawl
```bash
curl -s -X POST 'https://api.firecrawl.dev/v2/search' \
  -H "Authorization: Bearer $FIRECRAWL_API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{
    "query": "'"$QUERY"'",
    "limit": 5,
    "scrapeOptions": {"formats": ["markdown"]}
  }' | jq '.data[] | {title: .title, url: .url, content: .markdown[:500]}'
```

## Exa: Semantic Web Search

Use when you need to find relevant content by meaning, not just keywords.

### Search for content
```bash
curl -s -X POST 'https://api.exa.ai/search' \
  -H "x-api-key: $EXA_API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{
    "query": "'"$QUERY"'",
    "type": "auto",
    "numResults": 5,
    "contents": {"text": {"maxCharacters": 2000}}
  }' | jq '.results[] | {title, url, text: .text[:500]}'
```

### Get page content by URL
```bash
curl -s -X POST 'https://api.exa.ai/contents' \
  -H "x-api-key: $EXA_API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{
    "ids": ["'"$URL"'"],
    "text": {"maxCharacters": 5000}
  }' | jq '.results[0].text'
```

### Find similar pages
```bash
curl -s -X POST 'https://api.exa.ai/findSimilar' \
  -H "x-api-key: $EXA_API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{
    "url": "'"$URL"'",
    "numResults": 5,
    "contents": {"text": {"maxCharacters": 1000}}
  }' | jq '.results[] | {title, url, text: .text[:300]}'
```

## Decision Matrix

| Scenario | Tool | Command |
|----------|------|---------|
| WebFetch 403'd on a URL | Firecrawl scrape | `curl POST /v2/scrape` |
| Need latest info on a topic | Exa search | `curl POST /search` |
| JS-rendered page (SPA) | Firecrawl scrape + `waitFor` | `curl POST /v2/scrape` |
| Find docs for a library | Exa search with `type: "auto"` | `curl POST /search` |
| Find pages like this one | Exa findSimilar | `curl POST /findSimilar` |
| Bulk scrape multiple pages | Firecrawl search | `curl POST /v2/search` |

## Fallback Chain

Follow this order when fetching web content:

1. **Try WebFetch first** (built-in, free, no API key needed)
2. **If 403/blocked/empty** → use Firecrawl scrape
3. **If Firecrawl unavailable** (no API key) → use Exa contents endpoint
4. **For search queries** → use Exa search (semantic) or Firecrawl search (keyword + scrape)

## Tips

- Always use `jq` to parse responses - the raw JSON is verbose
- Set `onlyMainContent: true` in Firecrawl to skip navbars/footers
- Use `waitFor: 3000` for JS-heavy pages that need time to render
- Exa's `type: "auto"` picks between keyword and neural search automatically
- Both APIs have free tiers - Firecrawl: 500 credits/month, Exa: 1000 searches/month
- Pipe markdown output through `head -100` to avoid flooding context
