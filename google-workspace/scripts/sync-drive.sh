#!/bin/bash
set -euo pipefail

GWS="gws"
DB="${GWS_INDEX_DB:-~/.local/share/gws/inbox.duckdb}"
FIELDS="files(id,name,mimeType,size,parents,createdTime,modifiedTime,webViewLink,owners,shared)"

# Ensure the drive_files table exists
duckdb "$DB" <<'SQL'
CREATE TABLE IF NOT EXISTS drive_files (
    file_id VARCHAR PRIMARY KEY,
    name VARCHAR,
    mime_type VARCHAR,
    size BIGINT,
    parent_id VARCHAR,
    parent_path VARCHAR,
    created_time TIMESTAMP,
    modified_time TIMESTAMP,
    shared BOOLEAN,
    web_view_link VARCHAR,
    owners VARCHAR,
    synced_at TIMESTAMP DEFAULT current_timestamp
);
SQL

# Count existing files before sync
EXISTING_COUNT=$(duckdb "$DB" -noheader -csv "SELECT COUNT(*) FROM drive_files;" 2>/dev/null || echo "0")

echo "Fetching Drive files (owned)..."
OWNED_NDJSON=$($GWS drive files list --params "{\"corpora\":\"user\",\"fields\":\"nextPageToken,$FIELDS\",\"pageSize\":100,\"includeItemsFromAllDrives\":true,\"supportsAllDrives\":true}" --format json --page-all --page-limit 100 2>/dev/null) || {
    echo "Warning: Failed to fetch owned files"
    OWNED_NDJSON=""
}

echo "Fetching Drive files (shared with me)..."
SHARED_NDJSON=$($GWS drive files list --params "{\"q\":\"sharedWithMe=true\",\"fields\":\"nextPageToken,$FIELDS\",\"pageSize\":100,\"includeItemsFromAllDrives\":true,\"supportsAllDrives\":true}" --format json --page-all --page-limit 100 2>/dev/null) || {
    echo "Warning: Failed to fetch shared files"
    SHARED_NDJSON=""
}

# Combine and parse all NDJSON pages, upsert into DuckDB
COMBINED_NDJSON=$(printf '%s\n%s' "$OWNED_NDJSON" "$SHARED_NDJSON")

echo "$COMBINED_NDJSON" | python3 -c "
import sys, json, subprocess

db_path = sys.argv[1]
total = 0
upserted = 0
failed = 0

def esc(s):
    if s is None:
        return 'NULL'
    return \"'\" + str(s).replace(\"'\", \"''\") + \"'\"

for line in sys.stdin:
    line = line.strip()
    if not line:
        continue
    try:
        page = json.loads(line)
    except json.JSONDecodeError:
        continue

    files = page.get('files', [])
    for f in files:
        total += 1
        file_id = f.get('id', '')
        name = f.get('name', '')
        mime_type = f.get('mimeType', '')
        size = f.get('size')
        parents = f.get('parents', [])
        parent_id = parents[0] if parents else None
        created_time = f.get('createdTime', '').replace('T', ' ').replace('Z', '') if f.get('createdTime') else None
        modified_time = f.get('modifiedTime', '').replace('T', ' ').replace('Z', '') if f.get('modifiedTime') else None
        shared = f.get('shared', False)
        web_view_link = f.get('webViewLink', '')
        owners_list = f.get('owners', [])
        owners = ', '.join(o.get('displayName', o.get('emailAddress', '')) for o in owners_list) if owners_list else None

        size_sql = str(int(size)) if size is not None else 'NULL'
        shared_sql = 'TRUE' if shared else 'FALSE'

        sql = f\"\"\"INSERT OR REPLACE INTO drive_files
            (file_id, name, mime_type, size, parent_id, parent_path, created_time, modified_time, shared, web_view_link, owners, synced_at)
            VALUES ({esc(file_id)}, {esc(name)}, {esc(mime_type)}, {size_sql}, {esc(parent_id)}, NULL,
                    {esc(created_time) if created_time else 'NULL'},
                    {esc(modified_time) if modified_time else 'NULL'},
                    {shared_sql}, {esc(web_view_link)}, {esc(owners)}, current_timestamp);\"\"\"

        try:
            subprocess.run(['duckdb', db_path, sql], check=True, capture_output=True)
            upserted += 1
        except subprocess.CalledProcessError as e:
            failed += 1
            print(f'  Failed to upsert {file_id}: {name}', file=sys.stderr)

print(f'Parsed {total} files from API, upserted {upserted}, failed {failed}.')
" "$DB"

# Post-processing: reconstruct parent_path by walking parent_id chains
echo "Reconstructing folder paths..."
python3 -c "
import subprocess, json

db_path = '$DB'

# Get all folders: id -> (name, parent_id)
result = subprocess.run(
    ['duckdb', db_path, '-json', '-c',
     \"SELECT file_id, name, parent_id FROM drive_files WHERE mime_type = 'application/vnd.google-apps.folder'\"],
    capture_output=True, text=True
)
folders = {}
if result.returncode == 0 and result.stdout.strip():
    try:
        rows = json.loads(result.stdout)
        for r in rows:
            folders[r['file_id']] = (r['name'], r.get('parent_id'))
    except json.JSONDecodeError:
        pass

def build_path(parent_id, seen=None):
    if seen is None:
        seen = set()
    parts = []
    current = parent_id
    while current and current in folders and current not in seen:
        seen.add(current)
        name, pid = folders[current]
        parts.append(name)
        current = pid
    parts.reverse()
    return '/'.join(parts) if parts else None

# Get all files with a parent_id
result2 = subprocess.run(
    ['duckdb', db_path, '-json', '-c',
     'SELECT file_id, parent_id FROM drive_files WHERE parent_id IS NOT NULL'],
    capture_output=True, text=True
)
if result2.returncode == 0 and result2.stdout.strip():
    try:
        rows = json.loads(result2.stdout)
    except json.JSONDecodeError:
        rows = []

    updated = 0
    for r in rows:
        path = build_path(r['parent_id'])
        if path:
            safe_path = path.replace(\"'\", \"''\")
            safe_id = r['file_id'].replace(\"'\", \"''\")
            sql = f\"UPDATE drive_files SET parent_path = '{safe_path}' WHERE file_id = '{safe_id}';\"
            subprocess.run(['duckdb', db_path, sql], capture_output=True)
            updated += 1
    print(f'Updated {updated} files with parent paths.')
else:
    print('No files with parent IDs found.')
"

# Final stats
NEW_TOTAL=$(duckdb "$DB" -noheader -csv "SELECT COUNT(*) FROM drive_files;")
NEW_FILES=$((NEW_TOTAL - EXISTING_COUNT))
if [ "$NEW_FILES" -lt 0 ]; then
    NEW_FILES=0
fi
UPDATED=$((NEW_TOTAL - NEW_FILES))

echo ""
echo "Sync complete:"
echo "  Total files in index: $NEW_TOTAL"
echo "  New files: $NEW_FILES"
echo "  Updated files: $UPDATED"
