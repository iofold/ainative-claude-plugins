#!/bin/bash
set -euo pipefail

GWS="gws"
DB="${GWS_INDEX_DB:-~/.local/share/gws/inbox.duckdb}"

# Default spreadsheet ID (override with first argument)
SPREADSHEET_ID="${1:-}"

if [ -z "$SPREADSHEET_ID" ]; then
    echo "Usage: $0 <spreadsheet-id>"
    echo "  Syncs application emails from DuckDB to a Google Sheet."
    exit 1
fi

SHEET_NAME="Applications"

echo "Querying application emails from DuckDB..."

# Export application emails as JSON rows
ROWS_JSON=$(duckdb "$DB" -json <<'SQL'
SELECT
    gmail_id,
    from_name,
    from_email,
    subject,
    strftime(date, '%Y-%m-%d %H:%M') as date,
    COALESCE(tier, '') as tier,
    COALESCE(status, 'unseen') as status,
    COALESCE(institution, '') as institution,
    COALESCE(highlights, '') as highlights,
    COALESCE(notes, '') as notes,
    substr(snippet, 1, 200) as snippet
FROM emails
WHERE category = 'application'
ORDER BY
    CASE tier
        WHEN 'Tier 1' THEN 1
        WHEN 'Tier 2' THEN 2
        WHEN 'Tier 3' THEN 3
        ELSE 4
    END,
    date DESC;
SQL
)

ROW_COUNT=$(echo "$ROWS_JSON" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))")
echo "Found $ROW_COUNT application emails."

# Build the values array for sheets API
VALUES_JSON=$(python3 -c "
import sys, json

rows = json.load(sys.stdin)
header = ['Gmail ID', 'From Name', 'From Email', 'Subject', 'Date', 'Tier', 'Status', 'Institution', 'Highlights', 'Notes', 'Snippet']
values = [header]
for r in rows:
    values.append([
        r['gmail_id'],
        r['from_name'],
        r['from_email'],
        r['subject'],
        r['date'],
        r['tier'],
        r['status'],
        r['institution'],
        r['highlights'],
        r['notes'],
        r['snippet']
    ])
print(json.dumps(values))
" <<< "$ROWS_JSON")

# Clear the sheet first
echo "Clearing existing sheet data..."
$GWS sheets spreadsheets values clear \
    --params "{\"spreadsheetId\":\"$SPREADSHEET_ID\",\"range\":\"${SHEET_NAME}!A:K\"}" \
    --format json 2>/dev/null || echo "  (Sheet may be empty or range doesn't exist yet, continuing...)"

# Write fresh data
echo "Writing $ROW_COUNT rows to sheet..."
$GWS sheets spreadsheets values update \
    --params "{\"spreadsheetId\":\"$SPREADSHEET_ID\",\"range\":\"${SHEET_NAME}!A1\",\"valueInputOption\":\"USER_ENTERED\"}" \
    --json "{\"range\":\"${SHEET_NAME}!A1\",\"majorDimension\":\"ROWS\",\"values\":$VALUES_JSON}" \
    --format json > /dev/null

echo "Done! Synced $ROW_COUNT application emails to spreadsheet."
echo "  Spreadsheet: https://docs.google.com/spreadsheets/d/$SPREADSHEET_ID"
