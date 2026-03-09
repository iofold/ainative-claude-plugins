#!/bin/bash
set -euo pipefail

# AI-powered email categorization using Gemini
# Categorizes uncategorized emails in the DuckDB index using the gemini-batch skill.
#
# Usage:
#   ./categorize-emails.sh              # Categorize all uncategorized emails
#   ./categorize-emails.sh --limit 20   # Categorize up to 20 emails
#   ./categorize-emails.sh --dry-run    # Preview what would be categorized

DB="${GWS_INDEX_DB:-~/.local/share/gws/inbox.duckdb}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLUGIN_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Find gemini-batch skill relative to plugin marketplace root
GEMINI_CLI=""
for candidate in \
  "$PLUGIN_ROOT/../ai-development/skills/gemini-batch/gemini-batch.ts" \
  "$(dirname "$PLUGIN_ROOT")/ai-development/skills/gemini-batch/gemini-batch.ts"; do
  if [[ -f "$candidate" ]]; then
    GEMINI_CLI="$(cd "$(dirname "$candidate")" && pwd)/$(basename "$candidate")"
    break
  fi
done

if [[ -z "$GEMINI_CLI" ]]; then
  echo "Error: gemini-batch skill not found. Expected at ai-development/skills/gemini-batch/gemini-batch.ts"
  exit 1
fi

LIMIT=50
DRY_RUN=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --limit) LIMIT="$2"; shift 2 ;;
    --dry-run) DRY_RUN=true; shift ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

# Get uncategorized email count
UNCATEGORIZED=$(duckdb "$DB" -noheader -csv "SELECT COUNT(*) FROM emails WHERE category = 'uncategorized';")
echo "Found $UNCATEGORIZED uncategorized emails."

if [[ "$UNCATEGORIZED" -eq 0 ]]; then
  echo "Nothing to categorize."
  exit 0
fi

# Work directory (cleaned up on exit)
WORK_DIR=$(mktemp -d)
trap 'rm -rf "$WORK_DIR"' EXIT

# Export uncategorized emails as JSON for Gemini
duckdb "$DB" -json <<SQL > "$WORK_DIR/emails.json"
SELECT
    gmail_id,
    from_name,
    from_email,
    COALESCE(subject, '(no subject)') as subject,
    strftime(date, '%Y-%m-%d') as date,
    substr(COALESCE(body_preview, snippet, ''), 1, 200) as preview
FROM emails
WHERE category = 'uncategorized'
ORDER BY date DESC
LIMIT $LIMIT;
SQL

EMAIL_COUNT=$(python3 -c "import json; print(len(json.load(open('$WORK_DIR/emails.json'))))")
echo "Processing $EMAIL_COUNT emails with Gemini..."

if [[ "$DRY_RUN" == "true" ]]; then
  echo ""
  echo "=== Emails to categorize (dry run) ==="
  duckdb "$DB" -box <<SQL
SELECT
    gmail_id,
    substr(from_name || ' <' || from_email || '>', 1, 45) as "from",
    substr(COALESCE(subject, '(no subject)'), 1, 55) as subject,
    strftime(date, '%Y-%m-%d') as date
FROM emails
WHERE category = 'uncategorized'
ORDER BY date DESC
LIMIT $LIMIT;
SQL
  exit 0
fi

# Build the categorization prompt
cat > "$WORK_DIR/prompt.txt" <<'PROMPT'
You are an email categorizer. Analyze each email and assign exactly ONE category.

Categories:
- newsletter: Newsletters, digests, blog updates, mailing lists, product announcements
- notification: Automated platform notifications (GitHub, Google, Slack, CI/CD, billing, security alerts)
- meeting: Calendar invitations, meeting scheduling, event updates, RSVPs
- personal: Direct personal messages, conversations, replies from known contacts
- business: Business correspondence, invoices, contracts, recruitment outreach, compliance
- marketing: Promotional emails, sales pitches, cold outreach, discount offers
- uncategorized: Cannot determine category with confidence

Rules:
- Respond ONLY with a valid JSON array, no markdown fences, no explanation
- Each object must have exactly: {"gmail_id": "...", "category": "..."}
- When uncertain, prefer "uncategorized" over guessing
- noreply@ addresses are almost always "notification"
- Calendar subject patterns (Invitation:, Accepted:, Updated invitation:) are "meeting"

Here are the emails to categorize:
PROMPT

# Append the email data to prompt
cat "$WORK_DIR/emails.json" >> "$WORK_DIR/prompt.txt"

# Call Gemini (using flash for speed/cost, low temperature for consistency)
# Filter stdout to only the JSON line (bun's dotenv prints a warning line before it)
bun "$GEMINI_CLI" \
  -p "$WORK_DIR/prompt.txt" \
  --model gemini-3-flash-preview \
  --temperature 0.1 \
  --thinking MINIMAL \
  --json \
  --quiet 2>/dev/null | grep '^{' > "$WORK_DIR/result.json"

# Parse result and apply categorizations
python3 - "$WORK_DIR/result.json" "$DB" <<'PYEOF'
import json, sys, subprocess

result_file, db_path = sys.argv[1], sys.argv[2]

with open(result_file) as f:
    result = json.load(f)

if not result.get("success"):
    print(f"Gemini error: {result.get('error', 'unknown')}", file=sys.stderr)
    sys.exit(1)

# Strip markdown fences if present
text = result["output"].strip()
if text.startswith("```"):
    text = text.split("\n", 1)[1]
if text.endswith("```"):
    text = text.rsplit("\n", 1)[0]
text = text.strip()

try:
    categories = json.loads(text)
except json.JSONDecodeError as e:
    print(f"Error parsing Gemini response: {e}", file=sys.stderr)
    print(f"Raw output: {text[:500]}", file=sys.stderr)
    sys.exit(1)

valid_categories = {"newsletter", "notification", "meeting", "personal", "business", "marketing", "uncategorized"}
applied = 0
skipped = 0

for item in categories:
    gmail_id = item.get("gmail_id", "")
    category = item.get("category", "").lower().strip()

    if not gmail_id or category not in valid_categories or category == "uncategorized":
        skipped += 1
        continue

    # Sanitize inputs (reject any with quotes to prevent SQL injection)
    if "'" in gmail_id or "'" in category:
        skipped += 1
        continue

    subprocess.run(
        ["duckdb", db_path, "-c",
         f"UPDATE emails SET category = '{category}', updated_at = current_timestamp "
         f"WHERE gmail_id = '{gmail_id}' AND category = 'uncategorized';"],
        check=True, capture_output=True,
    )
    applied += 1

print(f"  Applied {applied} categorizations, skipped {skipped}.")
PYEOF

echo ""
echo "=== Category Summary ==="
duckdb "$DB" -box <<'SQL'
SELECT
    category,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE status = 'unseen') as unseen
FROM emails
GROUP BY category
ORDER BY total DESC;
SQL

REMAINING=$(duckdb "$DB" -noheader -csv "SELECT COUNT(*) FROM emails WHERE category = 'uncategorized';")
echo ""
echo "$REMAINING emails remain uncategorized."
