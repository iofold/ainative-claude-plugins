#!/bin/bash
set -euo pipefail

GWS="gws"
DB="${GWS_INDEX_DB:-~/.local/share/gws/inbox.duckdb}"
BATCH_SIZE=10

# Ensure the emails table exists
duckdb "$DB" <<'SQL'
CREATE TABLE IF NOT EXISTS emails (
    gmail_id VARCHAR PRIMARY KEY,
    from_name VARCHAR,
    from_email VARCHAR,
    subject VARCHAR,
    date TIMESTAMP,
    snippet TEXT,
    labels VARCHAR,
    body_preview TEXT,
    category VARCHAR DEFAULT 'uncategorized',
    tier VARCHAR,
    status VARCHAR DEFAULT 'unseen',
    highlights TEXT,
    notes TEXT,
    institution VARCHAR,
    created_at TIMESTAMP DEFAULT current_timestamp,
    updated_at TIMESTAMP DEFAULT current_timestamp
);
SQL

echo "Fetching inbox message list..."
MESSAGES_JSON=$($GWS gmail users messages list --params '{"userId":"me","q":"in:inbox","maxResults":500}' --format json)

# Extract message IDs
MESSAGE_IDS=$(echo "$MESSAGES_JSON" | python3 -c "
import sys, json
data = json.load(sys.stdin)
messages = data.get('messages', [])
for m in messages:
    print(m['id'])
")

TOTAL=$(echo "$MESSAGE_IDS" | grep -c . || true)
echo "Found $TOTAL messages in inbox."

if [ "$TOTAL" -eq 0 ]; then
    echo "No messages found."
    exit 0
fi

# Get existing IDs from DB
EXISTING_IDS=$(duckdb "$DB" -noheader -csv "SELECT gmail_id FROM emails;" 2>/dev/null || true)

# Filter to only new message IDs
NEW_IDS=()
SKIP_COUNT=0
while IFS= read -r mid; do
    if echo "$EXISTING_IDS" | grep -qx "$mid"; then
        SKIP_COUNT=$((SKIP_COUNT + 1))
    else
        NEW_IDS+=("$mid")
    fi
done <<< "$MESSAGE_IDS"

NEW_COUNT=${#NEW_IDS[@]}
echo "$NEW_COUNT new emails to fetch, $SKIP_COUNT already in DB."

if [ "$NEW_COUNT" -eq 0 ]; then
    echo "Nothing to sync."
    exit 0
fi

SYNCED=0
FAILED=0

# Process in batches
for ((i = 0; i < NEW_COUNT; i += BATCH_SIZE)); do
    BATCH=("${NEW_IDS[@]:i:BATCH_SIZE}")
    BATCH_ACTUAL=${#BATCH[@]}
    echo "Fetching batch $((i / BATCH_SIZE + 1)) ($BATCH_ACTUAL messages)..."

    for MSG_ID in "${BATCH[@]}"; do
        MSG_JSON=$($GWS gmail users messages get --params "{\"userId\":\"me\",\"id\":\"$MSG_ID\"}" --format json 2>/dev/null) || {
            echo "  Failed to fetch $MSG_ID"
            FAILED=$((FAILED + 1))
            continue
        }

        # Parse message and insert into DB — pipe JSON via stdin to avoid arg length limits
        echo "$MSG_JSON" | python3 -c "
import sys, json, re
from datetime import datetime

msg = json.load(sys.stdin)
db_path = sys.argv[1]

gmail_id = msg.get('id', '')
snippet = msg.get('snippet', '')
labels = ','.join(msg.get('labelIds', []))

# Extract headers
headers = {h['name'].lower(): h['value'] for h in msg.get('payload', {}).get('headers', [])}
subject = headers.get('subject', '(no subject)')
from_raw = headers.get('from', '')
date_str = headers.get('date', '')

# Parse from field
from_name = ''
from_email = ''
match = re.match(r'^\"?([^\"<]*)\"?\s*<?([^>]*)>?$', from_raw.strip())
if match:
    from_name = match.group(1).strip().strip('\"')
    from_email = match.group(2).strip()
if not from_email:
    from_email = from_raw.strip()

# Parse date
date_parsed = None
for fmt in ['%a, %d %b %Y %H:%M:%S %z', '%d %b %Y %H:%M:%S %z', '%a, %d %b %Y %H:%M:%S %Z']:
    try:
        clean_date = re.sub(r'\s*\([^)]*\)\s*$', '', date_str)
        date_parsed = datetime.strptime(clean_date, fmt)
        break
    except ValueError:
        continue
date_sql = date_parsed.strftime('%Y-%m-%d %H:%M:%S') if date_parsed else None

# Extract body text (plain text part)
def find_text_part(payload):
    if payload.get('mimeType') == 'text/plain' and 'body' in payload and 'data' in payload['body']:
        import base64
        return base64.urlsafe_b64decode(payload['body']['data']).decode('utf-8', errors='replace')
    for part in payload.get('parts', []):
        result = find_text_part(part)
        if result:
            return result
    return None

body = find_text_part(msg.get('payload', {})) or ''
body = body[:2000]

# Escape for SQL
def esc(s):
    if s is None:
        return 'NULL'
    return \"'\" + s.replace(\"'\", \"''\") + \"'\"

sql = f\"\"\"INSERT OR IGNORE INTO emails (gmail_id, from_name, from_email, subject, date, snippet, labels, body_preview)
VALUES ({esc(gmail_id)}, {esc(from_name)}, {esc(from_email)}, {esc(subject)}, {esc(date_sql) if date_sql else 'NULL'}, {esc(snippet)}, {esc(labels)}, {esc(body)});\"\"\"

import subprocess
subprocess.run(['duckdb', db_path, sql], check=True, capture_output=True)
" "$DB" && {
            SYNCED=$((SYNCED + 1))
        } || {
            echo "  Failed to parse/insert $MSG_ID"
            FAILED=$((FAILED + 1))
        }
    done

    # Small pause between batches to avoid overwhelming the API
    if [ $((i + BATCH_SIZE)) -lt "$NEW_COUNT" ]; then
        sleep 1
    fi
done

echo ""
echo "Sync complete: $SYNCED new emails synced, $SKIP_COUNT already in DB, $FAILED failed."
