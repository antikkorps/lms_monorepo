#!/usr/bin/env bash
set -euo pipefail

# PostgreSQL backup → compress → upload to R2 via rclone
# Required env vars: PGHOST, PGUSER, PGPASSWORD, PGDATABASE, R2_BUCKET_NAME
# rclone config via RCLONE_CONFIG_R2_* env vars

TIMESTAMP=$(date +%Y-%m-%d-%H%M%S)
BACKUP_FILE="/tmp/lms-backup-${TIMESTAMP}.sql.gz"
R2_PATH="r2:${R2_BUCKET_NAME}/backups/postgres/"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"

echo "[$(date -Iseconds)] Starting backup..."

# Dump database (no owner/privileges for portability)
pg_dump \
  --no-owner \
  --no-privileges \
  --format=plain \
  | gzip > "${BACKUP_FILE}"

FILESIZE=$(stat -c%s "${BACKUP_FILE}" 2>/dev/null || stat -f%z "${BACKUP_FILE}")
echo "[$(date -Iseconds)] Dump complete: ${BACKUP_FILE} (${FILESIZE} bytes)"

# Upload to R2
rclone copy "${BACKUP_FILE}" "${R2_PATH}" --log-level INFO
echo "[$(date -Iseconds)] Uploaded to ${R2_PATH}"

# Retention: delete backups older than N days
rclone delete "${R2_PATH}" --min-age "${RETENTION_DAYS}d" --log-level INFO
echo "[$(date -Iseconds)] Retention policy applied (${RETENTION_DAYS} days)"

# Cleanup local temp file
rm -f "${BACKUP_FILE}"
echo "[$(date -Iseconds)] Backup completed successfully"
