#!/bin/bash

# ============================================================
# WorkMonitor Backup Script
# Backs up PostgreSQL, MinIO, and configuration
# ============================================================

set -e

# Configuration
BACKUP_DIR="${BACKUP_DIR:-.../backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS="${RETENTION_DAYS:-30}"
COMPRESSION_LEVEL=9

# Logging
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

error() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1" >&2
}

# Create backup directory
mkdir -p "$BACKUP_DIR"
log "Starting backup process (Timestamp: $TIMESTAMP)"

# ============================================================
# PostgreSQL Backup
# ============================================================
log "Backing up PostgreSQL database..."

POSTGRES_BACKUP_FILE="$BACKUP_DIR/postgres_$TIMESTAMP.sql.gz"

if docker compose exec -T postgres pg_dump \
    -U workmonitor_user \
    workmonitor_db | gzip -$COMPRESSION_LEVEL > "$POSTGRES_BACKUP_FILE"; then

    POSTGRES_SIZE=$(du -h "$POSTGRES_BACKUP_FILE" | cut -f1)
    log "✓ PostgreSQL backup completed: $POSTGRES_BACKUP_FILE ($POSTGRES_SIZE)"
else
    error "PostgreSQL backup failed"
    exit 1
fi

# ============================================================
# MinIO Backup
# ============================================================
log "Backing up MinIO storage..."

MINIO_BACKUP_DIR="$BACKUP_DIR/minio_$TIMESTAMP"
mkdir -p "$MINIO_BACKUP_DIR"

# Set up MinIO client alias
docker compose exec -T minio mc alias set minio-backup http://localhost:9000 minioadmin "$MINIO_ROOT_PASSWORD" || true

# Mirror bucket
if docker compose exec -T minio mc mirror \
    --overwrite \
    minio/workmonitor-storage \
    "$MINIO_BACKUP_DIR"; then

    MINIO_SIZE=$(du -sh "$MINIO_BACKUP_DIR" | cut -f1)
    log "✓ MinIO backup completed: $MINIO_BACKUP_DIR ($MINIO_SIZE)"
else
    error "MinIO backup failed"
    exit 1
fi

# ============================================================
# Configuration Backup
# ============================================================
log "Backing up configuration files..."

CONFIG_BACKUP_FILE="$BACKUP_DIR/config_$TIMESTAMP.tar.gz"

tar czf "$CONFIG_BACKUP_FILE" \
    --exclude='.git' \
    --exclude='node_modules' \
    --exclude='__pycache__' \
    --exclude='.env.production' \
    .env.production.example \
    ssl/certs/ \
    nginx.conf \
    docker-compose.yml \
    Dockerfile.backend \
    Dockerfile.frontend \
    .dockerignore

CONFIG_SIZE=$(du -h "$CONFIG_BACKUP_FILE" | cut -f1)
log "✓ Configuration backup completed: $CONFIG_BACKUP_FILE ($CONFIG_SIZE)"

# ============================================================
# Clean Old Backups
# ============================================================
log "Cleaning old backups (retention: $RETENTION_DAYS days)..."

# PostgreSQL backups
DELETED_POSTGRES=$(find "$BACKUP_DIR" -name "postgres_*.sql.gz" -mtime +$RETENTION_DAYS -delete -print | wc -l)
[ "$DELETED_POSTGRES" -gt 0 ] && log "Deleted $DELETED_POSTGRES old PostgreSQL backups"

# Configuration backups
DELETED_CONFIG=$(find "$BACKUP_DIR" -name "config_*.tar.gz" -mtime +$RETENTION_DAYS -delete -print | wc -l)
[ "$DELETED_CONFIG" -gt 0 ] && log "Deleted $DELETED_CONFIG old configuration backups"

# MinIO backups (directories)
DELETED_MINIO=$(find "$BACKUP_DIR" -maxdepth 1 -type d -name "minio_*" -mtime +$RETENTION_DAYS -print -delete | wc -l)
[ "$DELETED_MINIO" -gt 0 ] && log "Deleted $DELETED_MINIO old MinIO backups"

# ============================================================
# Backup Summary
# ============================================================
log ""
log "=========================================="
log "Backup Summary"
log "=========================================="
log "Timestamp: $TIMESTAMP"
log "Retention: $RETENTION_DAYS days"
log "Location: $BACKUP_DIR"
log ""
log "Backups:"
ls -lh "$BACKUP_DIR" | grep -E "(postgres|config).*$TIMESTAMP" || true
log ""
log "Total backup directory size: $(du -sh "$BACKUP_DIR" | cut -f1)"
log "=========================================="

# ============================================================
# Optional: Upload to Remote Storage
# ============================================================
# Uncomment and configure for remote backup storage

# AWS S3 Upload
# if command -v aws &> /dev/null; then
#     log "Uploading to AWS S3..."
#     aws s3 cp "$POSTGRES_BACKUP_FILE" s3://your-bucket/backups/
#     aws s3 cp "$CONFIG_BACKUP_FILE" s3://your-bucket/backups/
#     log "✓ Uploaded to S3"
# fi

# Google Cloud Storage Upload
# if command -v gsutil &> /dev/null; then
#     log "Uploading to Google Cloud Storage..."
#     gsutil cp "$POSTGRES_BACKUP_FILE" gs://your-bucket/backups/
#     gsutil cp "$CONFIG_BACKUP_FILE" gs://your-bucket/backups/
#     log "✓ Uploaded to GCS"
# fi

log "Backup process completed successfully"
