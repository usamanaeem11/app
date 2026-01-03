#!/bin/bash

# ============================================================
# WorkMonitor Restore from Backup Script
# Restores PostgreSQL, MinIO, and configuration
# ============================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Logging functions
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1" >&2
}

warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

# Validate inputs
if [ $# -eq 0 ]; then
    echo "Usage: $0 <backup_directory> [database_only|minio_only|config_only]"
    echo ""
    echo "Examples:"
    echo "  $0 /path/to/backups                    # Restore all"
    echo "  $0 /path/to/backups database_only      # Restore only database"
    echo "  $0 /path/to/backups minio_only         # Restore only MinIO"
    exit 1
fi

BACKUP_DIR="$1"
RESTORE_TYPE="${2:-all}"

# Validate backup directory
if [ ! -d "$BACKUP_DIR" ]; then
    error "Backup directory not found: $BACKUP_DIR"
    exit 1
fi

# Confirmation prompt
confirmation_prompt() {
    local prompt="$1"
    read -p "$prompt (yes/no): " -r response
    if [[ ! "$response" =~ ^[Yy][Ee][Ss]$ ]]; then
        error "Restore cancelled"
        exit 1
    fi
}

log "=========================================="
log "WorkMonitor Restore from Backup"
log "=========================================="
log "Backup directory: $BACKUP_DIR"
log "Restore type: $RESTORE_TYPE"
log ""

# Confirm restore
warning "This will overwrite your current data!"
confirmation_prompt "Are you sure you want to restore from backup?"

# ============================================================
# PostgreSQL Restore
# ============================================================
if [ "$RESTORE_TYPE" = "all" ] || [ "$RESTORE_TYPE" = "database_only" ]; then
    log ""
    log "Restoring PostgreSQL database..."

    # Find latest PostgreSQL backup
    POSTGRES_BACKUP=$(find "$BACKUP_DIR" -name "postgres_*.sql.gz" -type f | sort -r | head -1)

    if [ -z "$POSTGRES_BACKUP" ]; then
        error "No PostgreSQL backup found in $BACKUP_DIR"
        exit 1
    fi

    log "Found PostgreSQL backup: $(basename "$POSTGRES_BACKUP")"
    log "Backup size: $(du -h "$POSTGRES_BACKUP" | cut -f1)"

    # Check if database is running
    if ! docker compose exec -T postgres pg_isready -U workmonitor_user > /dev/null 2>&1; then
        error "PostgreSQL is not running"
        exit 1
    fi

    # Drop existing database (with warning)
    warning "Dropping existing database..."
    docker compose exec -T postgres psql -U postgres -c "DROP DATABASE IF EXISTS workmonitor_db;" || true
    docker compose exec -T postgres psql -U postgres -c "CREATE DATABASE workmonitor_db;" || true

    # Restore database
    log "Restoring database from backup..."
    if zcat "$POSTGRES_BACKUP" | docker compose exec -T postgres psql -U workmonitor_user workmonitor_db; then
        log "✓ PostgreSQL restore completed"
    else
        error "PostgreSQL restore failed"
        exit 1
    fi

    # Verify restore
    RESTORED_TABLES=$(docker compose exec -T postgres psql -U workmonitor_user -d workmonitor_db -tc "\dt" | wc -l)
    log "  Restored tables: $RESTORED_TABLES"
fi

# ============================================================
# MinIO Restore
# ============================================================
if [ "$RESTORE_TYPE" = "all" ] || [ "$RESTORE_TYPE" = "minio_only" ]; then
    log ""
    log "Restoring MinIO storage..."

    # Find latest MinIO backup
    MINIO_BACKUP=$(find "$BACKUP_DIR" -maxdepth 1 -type d -name "minio_*" | sort -r | head -1)

    if [ -z "$MINIO_BACKUP" ]; then
        error "No MinIO backup found in $BACKUP_DIR"
        exit 1
    fi

    log "Found MinIO backup: $(basename "$MINIO_BACKUP")"
    log "Backup size: $(du -sh "$MINIO_BACKUP" | cut -f1)"

    # Check if MinIO is running
    if ! docker compose exec -T minio curl -sf http://localhost:9000/minio/health/live > /dev/null 2>&1; then
        error "MinIO is not running"
        exit 1
    fi

    # Clear existing bucket
    warning "Clearing existing MinIO bucket..."
    docker compose exec -T minio mc rm -r --force minio/workmonitor-storage/ || true

    # Restore MinIO
    log "Restoring MinIO from backup..."
    if docker compose exec -T minio mc mirror \
        --overwrite \
        "$MINIO_BACKUP" \
        minio/workmonitor-storage; then
        log "✓ MinIO restore completed"
    else
        error "MinIO restore failed"
        exit 1
    fi

    # Verify restore
    RESTORED_OBJECTS=$(docker compose exec -T minio mc ls minio/workmonitor-storage --recursive | wc -l)
    log "  Restored objects: $RESTORED_OBJECTS"
fi

# ============================================================
# Configuration Restore
# ============================================================
if [ "$RESTORE_TYPE" = "all" ] || [ "$RESTORE_TYPE" = "config_only" ]; then
    log ""
    log "Restoring configuration files..."

    # Find latest configuration backup
    CONFIG_BACKUP=$(find "$BACKUP_DIR" -name "config_*.tar.gz" -type f | sort -r | head -1)

    if [ -z "$CONFIG_BACKUP" ]; then
        error "No configuration backup found in $BACKUP_DIR"
        exit 1
    fi

    log "Found configuration backup: $(basename "$CONFIG_BACKUP")"
    log "Backup size: $(du -h "$CONFIG_BACKUP" | cut -f1)"

    # Backup current config before restoring
    log "Backing up current configuration..."
    tar czf "config_before_restore_$(date +%Y%m%d_%H%M%S).tar.gz" \
        .env.production \
        ssl/certs/ \
        nginx.conf \
        docker-compose.yml \
        Dockerfile.backend \
        Dockerfile.frontend \
        2>/dev/null || true

    # Restore configuration
    log "Restoring configuration from backup..."
    if tar xzf "$CONFIG_BACKUP"; then
        log "✓ Configuration restore completed"
    else
        error "Configuration restore failed"
        exit 1
    fi

    # Restart services to load new config
    log "Restarting services to load new configuration..."
    docker compose restart || warning "Failed to restart services"
fi

# ============================================================
# Post-Restore Verification
# ============================================================
log ""
log "Performing post-restore verification..."

# Check database connectivity
if docker compose exec -T postgres psql -U workmonitor_user -d workmonitor_db -c "SELECT 1;" > /dev/null 2>&1; then
    log "✓ Database connectivity verified"
else
    error "Database connectivity verification failed"
    exit 1
fi

# Check MinIO connectivity
if docker compose exec -T minio curl -sf http://localhost:9000/minio/health/live > /dev/null 2>&1; then
    log "✓ MinIO connectivity verified"
else
    error "MinIO connectivity verification failed"
    exit 1
fi

# ============================================================
# Restore Summary
# ============================================================
log ""
log "=========================================="
log "Restore Summary"
log "=========================================="
log "Restore type: $RESTORE_TYPE"
log "Timestamp: $(date +'%Y-%m-%d %H:%M:%S')"
log ""
if [ "$RESTORE_TYPE" = "all" ] || [ "$RESTORE_TYPE" = "database_only" ]; then
    log "Database: ✓ Restored"
    log "Source: $(basename "$POSTGRES_BACKUP")"
fi
if [ "$RESTORE_TYPE" = "all" ] || [ "$RESTORE_TYPE" = "minio_only" ]; then
    log "MinIO: ✓ Restored"
    log "Source: $(basename "$MINIO_BACKUP")"
fi
if [ "$RESTORE_TYPE" = "all" ] || [ "$RESTORE_TYPE" = "config_only" ]; then
    log "Configuration: ✓ Restored"
    log "Source: $(basename "$CONFIG_BACKUP")"
fi
log "=========================================="
log "Restore process completed successfully"
