---
name: google-workspace
description: "Interact with Google Workspace (Gmail, Drive, Calendar, Docs, Sheets, Tasks) via the gws CLI. Use when the user asks to read emails, check calendar, manage drive files, send emails, create events, read spreadsheets, or any Google Workspace operation."
---

# Google Workspace CLI (gws)

Binary: `gws` (must be on PATH)
Auth: OAuth2 with authenticated Google account (credentials in ~/.config/gws/)

## Quick Reference

### Gmail
```bash
gws gmail +triage --max 10                    # Triage unread inbox
gws gmail +triage --query "from:user@ex.com"  # Triage with search
gws gmail users messages get --params '{"userId":"me","id":"MSG_ID"}' --format json  # Read specific email
gws gmail +send --to "user@ex.com" --subject "Subject" --body "Body"
```

### Calendar
```bash
gws calendar +agenda --today       # Today's agenda
gws calendar +agenda --week        # This week
gws calendar +agenda --days 3      # Next N days
gws calendar +insert --summary "Meeting" --start "2026-03-07T10:00:00" --end "2026-03-07T11:00:00" --attendee "person@ex.com"
```

### Drive
```bash
# Search files
gws drive files list --params '{"q":"name contains \"term\"","pageSize":20,"fields":"files(id,name,mimeType,size,parents)"}' --format json

# Download binary file
gws drive files get --params '{"fileId":"FILE_ID","alt":"media"}' --output ./file.ext

# Export Google Doc/Sheet (CANNOT use alt:media - will 403)
gws drive files export --params '{"fileId":"FILE_ID","mimeType":"application/pdf"}' --output file.pdf

# Upload
gws drive +upload ./file.pdf --name "My Document"
```

**Drive gotchas:** Search is NOT recursive (use `"FOLDER_ID" in parents`). Shared files need `includeItemsFromAllDrives` + `supportsAllDrives`. Google Docs/Sheets/Slides require `export`, not `get`. Always include `fields` param. **Prefer the DuckDB index** for search/browse.

### Sheets
```bash
gws sheets +read --spreadsheet "ID" --range "Sheet1!A1:D10"
gws sheets +append --spreadsheet "ID" --values '[["col1","col2"],["val1","val2"]]'
```

### Docs
```bash
gws docs documents get --params '{"documentId":"DOC_ID"}'
gws docs +write --document "DOC_ID" --text "New content"
```

### Tasks
```bash
gws tasks tasklists list
gws tasks tasks list --params '{"tasklist":"TASKLIST_ID"}'
```

## Usage Guidelines

1. **Reading emails**: `+triage` for overview, then `messages get` for specifics
2. **Drive search**: Prefer DuckDB index; use API for downloads/uploads/mutations
3. **Sending/creating**: Always confirm with user before sending emails or creating events
4. Parse JSON/table output and present clearly. Use subagents for parallel email processing.

## Common Flags

| Flag | Purpose |
|------|---------|
| `--format json/table/csv/yaml` | Output format |
| `--page-all` | Auto-paginate (NDJSON) |
| `--page-limit N` | Max pages (default 10) |
| `--dry-run` | Validate without sending |

---

## Reference

### DuckDB Drive Index

Local DuckDB index of all Google Drive files. Avoids API round trips for search/browse.

**Location:** `${GWS_INDEX_DB:-~/.local/share/gws/inbox.duckdb}`

```bash
# Sync and query
${CLAUDE_PLUGIN_ROOT}/scripts/sync-drive.sh
${CLAUDE_PLUGIN_ROOT}/scripts/query-drive.sh search "term"
${CLAUDE_PLUGIN_ROOT}/scripts/query-drive.sh videos
${CLAUDE_PLUGIN_ROOT}/scripts/query-drive.sh recent
${CLAUDE_PLUGIN_ROOT}/scripts/query-drive.sh stats
${CLAUDE_PLUGIN_ROOT}/scripts/query-drive.sh tree "folder name"
${CLAUDE_PLUGIN_ROOT}/scripts/query-drive.sh sql "SELECT ..."
```

### DuckDB Email Index

```bash
${CLAUDE_PLUGIN_ROOT}/scripts/sync-emails.sh          # Sync inbox emails
${CLAUDE_PLUGIN_ROOT}/scripts/categorize-emails.sh     # Auto-categorize
${CLAUDE_PLUGIN_ROOT}/scripts/query.sh applications    # Query by type
${CLAUDE_PLUGIN_ROOT}/scripts/query.sh unseen
${CLAUDE_PLUGIN_ROOT}/scripts/query.sh stats
${CLAUDE_PLUGIN_ROOT}/scripts/query.sh search "term"
${CLAUDE_PLUGIN_ROOT}/scripts/query.sh sql "SELECT ..."
${CLAUDE_PLUGIN_ROOT}/scripts/sync-to-sheets.sh <spreadsheet-id>  # Sync to Sheet
```

### Workflow Helpers

```bash
gws workflow +standup-report    # Today's calendar + tasks
gws workflow +meeting-prep      # Prep for next meeting
gws workflow +email-to-task --message-id "MSG_ID" --tasklist "TASKLIST_ID"
gws workflow +weekly-digest
```

### Installation

```bash
pnpm add -g gws   # or: npm install -g gws
```

Dependencies: DuckDB (for indexing), Python 3 (for sync scripts).

### Shared Drive Search

```bash
gws drive files list --params '{"q":"sharedWithMe=true and name contains \"term\"","includeItemsFromAllDrives":true,"supportsAllDrives":true,"pageSize":20,"fields":"files(id,name,mimeType,size,parents)"}' --format json
```

### Drive Query Syntax

`name contains "x"`, `"parentId" in parents`, `mimeType="x"` — combine with `and`/`or`. Check schema: `gws schema drive.files.list --resolve-refs`
