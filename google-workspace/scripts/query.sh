#!/bin/bash
set -euo pipefail

DB="${GWS_INDEX_DB:-~/.local/share/gws/inbox.duckdb}"

usage() {
    echo "Usage: $0 <command> [args]"
    echo ""
    echo "Commands:"
    echo "  applications    Show all application emails with tier/status"
    echo "  unseen          Show all unseen emails"
    echo "  stats           Show category/status counts"
    echo "  search \"term\"   Full-text search across subject/body/from"
    echo "  sql \"SELECT..\"  Raw SQL passthrough"
    exit 1
}

if [ $# -lt 1 ]; then
    usage
fi

COMMAND="$1"
shift

case "$COMMAND" in
    applications)
        duckdb "$DB" -box <<'SQL'
SELECT
    substr(from_name, 1, 20) as "from",
    substr(subject, 1, 45) as subject,
    strftime(date, '%Y-%m-%d') as date,
    COALESCE(tier, '-') as tier,
    COALESCE(status, 'unseen') as status,
    COALESCE(institution, '') as institution,
    gmail_id
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
        ;;

    unseen)
        duckdb "$DB" -box <<'SQL'
SELECT
    substr(from_name || ' <' || from_email || '>', 1, 35) as "from",
    substr(subject, 1, 45) as subject,
    strftime(date, '%Y-%m-%d') as date,
    category,
    gmail_id
FROM emails
WHERE status = 'unseen'
ORDER BY date DESC;
SQL
        ;;

    stats)
        echo "=== By Category ==="
        duckdb "$DB" -box <<'SQL'
SELECT
    COALESCE(category, 'uncategorized') as category,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE status = 'unseen') as unseen,
    COUNT(*) FILTER (WHERE status = 'seen') as seen,
    COUNT(*) FILTER (WHERE status = 'actioned') as actioned
FROM emails
GROUP BY category
ORDER BY total DESC;
SQL

        echo ""
        echo "=== By Tier (applications only) ==="
        duckdb "$DB" -box <<'SQL'
SELECT
    COALESCE(tier, 'untiered') as tier,
    COUNT(*) as count,
    COUNT(*) FILTER (WHERE status = 'unseen') as unseen
FROM emails
WHERE category = 'application'
GROUP BY tier
ORDER BY
    CASE tier
        WHEN 'S' THEN 1
        WHEN 'A' THEN 2
        WHEN 'B' THEN 3
        WHEN 'C' THEN 4
        ELSE 5
    END;
SQL

        echo ""
        echo "=== Overall ==="
        duckdb "$DB" -box <<'SQL'
SELECT
    COUNT(*) as total_emails,
    MIN(date) as oldest,
    MAX(date) as newest
FROM emails;
SQL
        ;;

    search)
        if [ $# -lt 1 ]; then
            echo "Usage: $0 search \"keyword\""
            exit 1
        fi
        TERM="$1"
        # Sanitize input to prevent SQL injection
        SAFE_TERM=$(echo "$TERM" | sed "s/'/''/g")
        duckdb "$DB" -box -c "
SELECT
    substr(from_name || ' <' || from_email || '>', 1, 35) as \"from\",
    substr(subject, 1, 40) as subject,
    strftime(date, '%Y-%m-%d') as date,
    category,
    COALESCE(status, 'unseen') as status,
    gmail_id
FROM emails
WHERE lower(subject) LIKE lower('%${SAFE_TERM}%')
   OR lower(body_preview) LIKE lower('%${SAFE_TERM}%')
   OR lower(from_name) LIKE lower('%${SAFE_TERM}%')
   OR lower(from_email) LIKE lower('%${SAFE_TERM}%')
ORDER BY date DESC
LIMIT 50;
"
        ;;

    sql)
        if [ $# -lt 1 ]; then
            echo "Usage: $0 sql \"SELECT ...\""
            exit 1
        fi
        duckdb "$DB" -box -c "$1"
        ;;

    *)
        echo "Unknown command: $COMMAND"
        usage
        ;;
esac
