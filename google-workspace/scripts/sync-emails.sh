#!/bin/bash
set -euo pipefail

# Sync Gmail inbox to local DuckDB index
#
# Usage:
#   ./sync-emails.sh              # Sync all new inbox messages
#   ./sync-emails.sh --limit 100  # Sync at most 100 new messages

GWS="gws"
DB="${GWS_INDEX_DB:-~/.local/share/gws/inbox.duckdb}"
BATCH_SIZE=10
LIMIT=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --limit) LIMIT="$2"; shift 2 ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

# Ensure DB directory and table exist
mkdir -p "$(dirname "$DB")"
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

echo "=== Gmail Inbox Sync ==="
echo "  DB: $DB"
echo ""
echo "Fetching inbox message list..."
MESSAGES_JSON=$($GWS gmail users messages list --params '{"userId":"me","q":"in:inbox","maxResults":500}' --format json)

# Extract message IDs (handle empty/missing messages gracefully)
MESSAGE_IDS=$(echo "$MESSAGES_JSON" | python3 -c "
import sys, json
data = json.load(sys.stdin)
messages = data.get('messages', [])
if not messages:
    sys.exit(0)
for m in messages:
    mid = m.get('id', '')
    if mid:
        print(mid)
") || true

if [[ -z "$MESSAGE_IDS" ]]; then
    echo "No messages found in inbox."
    exit 0
fi

TOTAL=$(echo "$MESSAGE_IDS" | grep -c . || true)
echo "Found $TOTAL messages in inbox."

# Get existing IDs from DB
EXISTING_IDS=$(duckdb "$DB" -noheader -csv "SELECT gmail_id FROM emails;" 2>/dev/null || true)

# Filter to only new message IDs
NEW_IDS=()
SKIP_COUNT=0
while IFS= read -r mid; do
    [[ -z "$mid" ]] && continue
    if echo "$EXISTING_IDS" | grep -qx "$mid"; then
        SKIP_COUNT=$((SKIP_COUNT + 1))
    else
        NEW_IDS+=("$mid")
    fi
done <<< "$MESSAGE_IDS"

NEW_COUNT=${#NEW_IDS[@]}
echo "$NEW_COUNT new, $SKIP_COUNT already in DB."

if [ "$NEW_COUNT" -eq 0 ]; then
    echo "Nothing to sync."
    exit 0
fi

# Apply limit if set
if [[ "$LIMIT" -gt 0 && "$NEW_COUNT" -gt "$LIMIT" ]]; then
    NEW_IDS=("${NEW_IDS[@]:0:$LIMIT}")
    NEW_COUNT=$LIMIT
    echo "Limiting to $LIMIT messages."
fi

echo ""
SYNCED=0
FAILED=0

# Process in batches
TOTAL_BATCHES=$(( (NEW_COUNT + BATCH_SIZE - 1) / BATCH_SIZE ))

for ((i = 0; i < NEW_COUNT; i += BATCH_SIZE)); do
    BATCH=("${NEW_IDS[@]:i:BATCH_SIZE}")
    BATCH_NUM=$((i / BATCH_SIZE + 1))
    BATCH_ACTUAL=${#BATCH[@]}
    BATCH_SYNCED=0

    printf "[Batch %d/%d] Fetching %d messages... " "$BATCH_NUM" "$TOTAL_BATCHES" "$BATCH_ACTUAL"

    for MSG_ID in "${BATCH[@]}"; do
        MSG_JSON=$($GWS gmail users messages get --params "{\"userId\":\"me\",\"id\":\"$MSG_ID\"}" --format json 2>/dev/null) || {
            FAILED=$((FAILED + 1))
            continue
        }

        # Parse message and insert into DB
        echo "$MSG_JSON" | python3 -c "
import sys, json, re, subprocess, base64
from datetime import datetime

msg = json.load(sys.stdin)
db_path = sys.argv[1]

gmail_id = msg.get('id', '')
if not gmail_id:
    sys.exit(1)

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
match = re.match(r'^\"?([^\"<]*)\"?\s*<?([^>]*)>?\$', from_raw.strip())
if match:
    from_name = match.group(1).strip().strip('\"')
    from_email = match.group(2).strip()
if not from_email:
    from_email = from_raw.strip()

# Parse date (try multiple formats)
date_parsed = None
for fmt in ['%a, %d %b %Y %H:%M:%S %z', '%d %b %Y %H:%M:%S %z', '%a, %d %b %Y %H:%M:%S %Z']:
    try:
        clean_date = re.sub(r'\s*\([^)]*\)\s*\$', '', date_str)
        date_parsed = datetime.strptime(clean_date, fmt)
        break
    except ValueError:
        continue
date_sql = date_parsed.strftime('%Y-%m-%d %H:%M:%S') if date_parsed else None

# Extract body text (plain text part)
def find_text_part(payload):
    if payload.get('mimeType') == 'text/plain' and 'body' in payload and 'data' in payload['body']:
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

subprocess.run(['duckdb', db_path, sql], check=True, capture_output=True)
" "$DB" && {
            SYNCED=$((SYNCED + 1))
            BATCH_SYNCED=$((BATCH_SYNCED + 1))
        } || {
            FAILED=$((FAILED + 1))
        }
    done

    PROGRESS=$(( (SYNCED + FAILED) * 100 / NEW_COUNT ))
    echo "$BATCH_SYNCED ok | Total: $SYNCED synced, $FAILED failed ($PROGRESS%)"

    # Small pause between batches to avoid overwhelming the API
    if [ $((i + BATCH_SIZE)) -lt "$NEW_COUNT" ]; then
        sleep 1
    fi
done

echo ""
echo "=== Sync Complete ==="
echo "  New:      $SYNCED synced"
echo "  Existing: $SKIP_COUNT skipped"
echo "  Failed:   $FAILED"
TOTAL_DB=$(duckdb "$DB" -noheader -csv "SELECT COUNT(*) FROM emails;")
echo "  Total DB: $TOTAL_DB emails"
