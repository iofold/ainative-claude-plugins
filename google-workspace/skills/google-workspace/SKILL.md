---
name: google-workspace
description: "Interact with Google Workspace (Gmail, Drive, Calendar, Docs, Sheets, Tasks) via the gws CLI. Use when the user asks to read emails, check calendar, manage drive files, send emails, create events, read spreadsheets, or any Google Workspace operation."
---

# Google Workspace CLI (gws)

Binary: `gws` (must be on PATH)
Auth: OAuth2 with your authenticated Google account (encrypted credentials in ~/.config/gws/)

## Drive Index (DuckDB)

A local DuckDB index of all Google Drive files lives at a configurable path. This avoids API round trips for search/browse operations.

**Default location:** `~/.local/share/gws/inbox.duckdb`
**Override:** Set `GWS_INDEX_DB` env var to point to a different DuckDB file.

Scripts that sync and query the index:

```bash
# Sync Drive files into the DuckDB index
gws drive +sync-index

# Query the index (search, videos, folders, recent, stats, tree, sql)
gws drive +query search "term"
gws drive +query videos
gws drive +query recent
gws drive +query stats
gws drive +query tree "folder name"
gws drive +query sql "SELECT ..."
```

**From other projects:** The index scripts read `GWS_INDEX_DB` if set, falling back to the default path. The index is shared — sync once, query from anywhere.

## Quick Reference

### Gmail

```bash
# Triage unread inbox (default 20, adjust with --max)
gws gmail +triage --max 10

# Triage with search query
gws gmail +triage --query "from:someone@example.com" --max 20

# Read a specific email by message ID
gws gmail users messages get --params '{"userId":"me","id":"MESSAGE_ID"}' --format json

# List messages matching a query
gws gmail users messages list --params '{"userId":"me","q":"is:unread category:primary","maxResults":10}'

# Send an email
gws gmail +send --to "recipient@example.com" --subject "Subject" --body "Body text"

# Watch for new emails (streaming NDJSON)
gws gmail +watch --project your-gcp-project --once
```

### Calendar

```bash
# Today's agenda
gws calendar +agenda --today

# This week's agenda
gws calendar +agenda --week

# Tomorrow's agenda
gws calendar +agenda --tomorrow

# Next N days
gws calendar +agenda --days 3

# Create an event
gws calendar +insert --summary "Meeting" --start "2026-03-07T10:00:00" --end "2026-03-07T11:00:00" --attendee "person@example.com"
```

### Drive

```bash
# Search by name (partial match, case-insensitive)
gws drive files list --params '{"q":"name contains \"term\"","pageSize":20,"fields":"files(id,name,mimeType,size,parents)"}' --format json

# Include "Shared with me" and shared drives
gws drive files list --params '{"q":"sharedWithMe=true and name contains \"term\"","includeItemsFromAllDrives":true,"supportsAllDrives":true,"pageSize":20,"fields":"files(id,name,mimeType,size,parents)"}' --format json

# Filter by MIME type (e.g. videos, folders)
gws drive files list --params '{"q":"mimeType contains \"video/\"","pageSize":50,"fields":"files(id,name,mimeType,size)"}' --format json

# Navigate into a folder (by folder ID)
gws drive files list --params '{"q":"\"FOLDER_ID\" in parents","pageSize":50,"fields":"files(id,name,mimeType,size)","includeItemsFromAllDrives":true,"supportsAllDrives":true}' --format json

# Download binary file (pdf, mp4, xlsx, docx, pptx, etc.)
gws drive files get --params '{"fileId":"FILE_ID","alt":"media"}' --output ./local-file.ext

# Export Google Doc/Sheet/Slides (CANNOT use alt:media - will 403)
gws drive files export --params '{"fileId":"FILE_ID","mimeType":"application/pdf"}' --output file.pdf
gws drive files export --params '{"fileId":"FILE_ID","mimeType":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}' --output file.xlsx

# Upload a file
gws drive +upload ./file.pdf --name "My Document"

# Check API schema
gws schema drive.files.list --resolve-refs
```

**Drive gotchas:**
- Search is NOT recursive - navigate folder-by-folder with `"FOLDER_ID" in parents`
- Shared files need `includeItemsFromAllDrives` + `supportsAllDrives` to appear
- Google Docs/Sheets/Slides require `export`, not `get` with `alt:media`
- Always include `fields` param - default response omits size/parents
- Query syntax: `name contains "x"`, `"parentId" in parents`, `mimeType="x"`, combine with `and`/`or`
- Large files (>100MB): run download in background or increase timeout
- **Prefer the DuckDB index** for search/browse — only hit the API for downloads, uploads, and mutations

### Sheets

```bash
# Read a spreadsheet range
gws sheets +read --spreadsheet "SPREADSHEET_ID" --range "Sheet1!A1:D10"

# Append rows
gws sheets +append --spreadsheet "SPREADSHEET_ID" --values '[["col1","col2"],["val1","val2"]]'
```

### Docs

```bash
# Read a document
gws docs documents get --params '{"documentId":"DOC_ID"}'

# Append text to a document
gws docs +write --document "DOC_ID" --text "New content here"
```

### Tasks

```bash
# List task lists
gws tasks tasklists list

# List tasks in a task list
gws tasks tasks list --params '{"tasklist":"TASKLIST_ID"}'
```

### Workflow Helpers

```bash
# Morning standup report (today's calendar + tasks)
gws workflow +standup-report

# Prep for next meeting
gws workflow +meeting-prep

# Convert email to task
gws workflow +email-to-task --message-id "MSG_ID" --tasklist "TASKLIST_ID"

# Weekly digest
gws workflow +weekly-digest
```

## Common Flags

| Flag | Purpose |
|------|---------|
| `--format json` | JSON output (default) |
| `--format table` | Table output |
| `--format csv` | CSV output |
| `--format yaml` | YAML output |
| `--page-all` | Auto-paginate (NDJSON) |
| `--page-limit N` | Max pages (default 10) |
| `--dry-run` | Validate without sending |

## Usage Instructions

When the user asks about their Google Workspace data:

1. **Reading emails**: Use `gws gmail +triage` for overview, then `gws gmail users messages get` for specific emails
2. **Searching emails**: Use `--query` flag with Gmail search syntax (same as Gmail web search)
3. **Calendar**: Use `+agenda` helpers for quick views, raw API for complex queries
4. **Drive**: Prefer the DuckDB index for searching files. Use API for downloads, uploads, and mutations.
5. **Sending/creating**: Always confirm with user before sending emails or creating events

Parse the JSON/table output and present it clearly to the user. When processing multiple emails, use subagents to read them in parallel.
