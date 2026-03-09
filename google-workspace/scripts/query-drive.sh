#!/bin/bash
set -euo pipefail

DB="${GWS_INDEX_DB:-~/.local/share/gws/inbox.duckdb}"

usage() {
    echo "Usage: $0 <command> [args]"
    echo ""
    echo "Commands:"
    echo "  search \"term\"       Full-text search across name and parent_path"
    echo "  videos              List all video files with size and path"
    echo "  folders             List all folders as a tree-like view"
    echo "  recent              Files modified in last 7 days"
    echo "  stats               Count by mime_type, total size, shared vs owned"
    echo "  tree \"folder name\"  Show contents of a folder by name (fuzzy match)"
    echo "  sql \"SELECT..\"      Raw SQL passthrough"
    exit 1
}

if [ $# -lt 1 ]; then
    usage
fi

COMMAND="$1"
shift

case "$COMMAND" in
    search)
        if [ $# -lt 1 ]; then
            echo "Usage: $0 search \"keyword\""
            exit 1
        fi
        TERM="$1"
        SAFE_TERM=$(echo "$TERM" | sed "s/'/''/g")
        duckdb "$DB" -box -c "
SELECT
    substr(name, 1, 50) as name,
    substr(mime_type, 1, 35) as mime_type,
    CASE WHEN size IS NOT NULL THEN printf('%.1f MB', size / 1048576.0) ELSE '-' END as size,
    substr(COALESCE(parent_path, ''), 1, 50) as path,
    strftime(modified_time, '%Y-%m-%d') as modified,
    file_id
FROM drive_files
WHERE lower(name) LIKE lower('%${SAFE_TERM}%')
   OR lower(parent_path) LIKE lower('%${SAFE_TERM}%')
ORDER BY modified_time DESC
LIMIT 50;
"
        ;;

    videos)
        duckdb "$DB" -box <<'SQL'
SELECT
    substr(name, 1, 55) as name,
    CASE WHEN size IS NOT NULL THEN printf('%.1f MB', size / 1048576.0) ELSE '-' END as size,
    substr(COALESCE(parent_path, ''), 1, 45) as path,
    strftime(modified_time, '%Y-%m-%d') as modified,
    file_id
FROM drive_files
WHERE mime_type LIKE 'video/%'
ORDER BY size DESC NULLS LAST;
SQL
        ;;

    folders)
        duckdb "$DB" -box <<'SQL'
SELECT
    CASE
        WHEN parent_path IS NOT NULL THEN '  ' || parent_path || '/' || name
        ELSE name
    END as folder_tree,
    file_id
FROM drive_files
WHERE mime_type = 'application/vnd.google-apps.folder'
ORDER BY COALESCE(parent_path, '') || '/' || name;
SQL
        ;;

    recent)
        duckdb "$DB" -box <<'SQL'
SELECT
    substr(name, 1, 50) as name,
    substr(mime_type, 1, 35) as mime_type,
    CASE WHEN size IS NOT NULL THEN printf('%.1f MB', size / 1048576.0) ELSE '-' END as size,
    substr(COALESCE(parent_path, ''), 1, 40) as path,
    strftime(modified_time, '%Y-%m-%d %H:%M') as modified,
    CASE WHEN shared THEN 'shared' ELSE 'owned' END as ownership
FROM drive_files
WHERE modified_time >= current_timestamp - INTERVAL 7 DAY
ORDER BY modified_time DESC;
SQL
        ;;

    stats)
        echo "=== By MIME Type ==="
        duckdb "$DB" -box <<'SQL'
SELECT
    mime_type,
    COUNT(*) as count,
    CASE WHEN SUM(size) IS NOT NULL THEN printf('%.1f MB', SUM(size) / 1048576.0) ELSE '-' END as total_size
FROM drive_files
GROUP BY mime_type
ORDER BY count DESC;
SQL

        echo ""
        echo "=== Shared vs Owned ==="
        duckdb "$DB" -box <<'SQL'
SELECT
    CASE WHEN shared THEN 'Shared with me' ELSE 'Owned' END as ownership,
    COUNT(*) as count,
    CASE WHEN SUM(size) IS NOT NULL THEN printf('%.1f MB', SUM(size) / 1048576.0) ELSE '-' END as total_size
FROM drive_files
GROUP BY shared
ORDER BY count DESC;
SQL

        echo ""
        echo "=== Overall ==="
        duckdb "$DB" -box <<'SQL'
SELECT
    COUNT(*) as total_files,
    COUNT(*) FILTER (WHERE mime_type = 'application/vnd.google-apps.folder') as folders,
    CASE WHEN SUM(size) IS NOT NULL THEN printf('%.1f MB', SUM(size) / 1048576.0) ELSE '-' END as total_size,
    strftime(MIN(created_time), '%Y-%m-%d') as oldest,
    strftime(MAX(modified_time), '%Y-%m-%d') as newest
FROM drive_files;
SQL
        ;;

    tree)
        if [ $# -lt 1 ]; then
            echo "Usage: $0 tree \"folder name\""
            exit 1
        fi
        TERM="$1"
        SAFE_TERM=$(echo "$TERM" | sed "s/'/''/g")
        duckdb "$DB" -box -c "
WITH target_folder AS (
    SELECT file_id, name
    FROM drive_files
    WHERE mime_type = 'application/vnd.google-apps.folder'
      AND lower(name) LIKE lower('%${SAFE_TERM}%')
    LIMIT 1
)
SELECT
    substr(df.name, 1, 55) as name,
    substr(df.mime_type, 1, 35) as mime_type,
    CASE WHEN df.size IS NOT NULL THEN printf('%.1f MB', df.size / 1048576.0) ELSE '-' END as size,
    strftime(df.modified_time, '%Y-%m-%d') as modified
FROM drive_files df
JOIN target_folder tf ON df.parent_id = tf.file_id
ORDER BY df.mime_type = 'application/vnd.google-apps.folder' DESC, df.name;
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
