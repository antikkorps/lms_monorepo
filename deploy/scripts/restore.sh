#!/usr/bin/env bash
set -euo pipefail

# Restore PostgreSQL backup from R2
# Usage:
#   restore.sh                  — list available backups
#   restore.sh <filename.gz>    — restore a specific backup

R2_PATH="r2:${R2_BUCKET_NAME}/backups/postgres/"

if [ $# -eq 0 ]; then
  echo "Available backups:"
  echo "---"
  rclone ls "${R2_PATH}" | sort -k2
  echo "---"
  echo "Usage: restore.sh <filename.sql.gz>"
  exit 0
fi

BACKUP_NAME="$1"
LOCAL_FILE="/tmp/${BACKUP_NAME}"

echo "[$(date -Iseconds)] Downloading ${BACKUP_NAME}..."
rclone copy "${R2_PATH}${BACKUP_NAME}" /tmp/ --log-level INFO

if [ ! -f "${LOCAL_FILE}" ]; then
  echo "Error: File not found after download: ${LOCAL_FILE}"
  exit 1
fi

echo "[$(date -Iseconds)] Restoring to ${PGDATABASE}..."
gunzip -c "${LOCAL_FILE}" | psql --single-transaction

echo "[$(date -Iseconds)] Restore completed successfully"
rm -f "${LOCAL_FILE}"
