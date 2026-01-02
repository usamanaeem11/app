#!/bin/bash

# ============================================================
# WorkMonitor Health Check Script
# Monitors all services and reports status
# ============================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
HEALTH_CHECK_TIMEOUT=10
RETRY_COUNT=3
RETRY_DELAY=2

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"
}

warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

# Health check function
check_service_health() {
    local service=$1
    local url=$2
    local retry=0

    while [ $retry -lt $RETRY_COUNT ]; do
        if curl -sf --max-time $HEALTH_CHECK_TIMEOUT "$url" > /dev/null 2>&1; then
            log "✓ $service is healthy"
            return 0
        fi

        retry=$((retry + 1))
        if [ $retry -lt $RETRY_COUNT ]; then
            warning "$service health check failed, retrying..."
            sleep $RETRY_DELAY
        fi
    done

    error "✗ $service is unhealthy"
    return 1
}

# Container status check
check_container_status() {
    local container=$1

    if docker ps --filter "name=$container" --filter "status=running" --quiet | grep -q .; then
        log "✓ Container $container is running"
        return 0
    else
        error "✗ Container $container is not running"
        return 1
    fi
}

# Resource check
check_resources() {
    log "Checking system resources..."

    # Check disk usage
    disk_usage=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
    if [ "$disk_usage" -gt 80 ]; then
        warning "Disk usage is ${disk_usage}% (threshold: 80%)"
    else
        log "✓ Disk usage: ${disk_usage}%"
    fi

    # Check memory (requires available command)
    if command -v free &> /dev/null; then
        memory_usage=$(free | awk 'NR==2 {printf("%.0f", $3/$2 * 100)}')
        if [ "$memory_usage" -gt 80 ]; then
            warning "Memory usage is ${memory_usage}% (threshold: 80%)"
        else
            log "✓ Memory usage: ${memory_usage}%"
        fi
    fi
}

# Database connectivity check
check_database() {
    log "Checking PostgreSQL database..."

    if docker compose exec -T postgres psql -U workmonitor_user -d workmonitor_db -c "SELECT 1;" > /dev/null 2>&1; then
        log "✓ PostgreSQL database is accessible"

        # Check database size
        db_size=$(docker compose exec -T postgres psql -U workmonitor_user -d workmonitor_db -tc "SELECT pg_size_pretty(pg_database_size('workmonitor_db'));" | tr -d ' ')
        log "  Database size: $db_size"

        return 0
    else
        error "✗ PostgreSQL database connection failed"
        return 1
    fi
}

# MinIO health check
check_minio() {
    log "Checking MinIO storage..."

    if docker compose exec -T minio curl -sf http://localhost:9000/minio/health/live > /dev/null 2>&1; then
        log "✓ MinIO is healthy"

        # Check bucket
        if docker compose exec -T minio mc ls minio/workmonitor-storage > /dev/null 2>&1; then
            log "✓ Bucket 'workmonitor-storage' exists"
            return 0
        else
            error "✗ Bucket 'workmonitor-storage' not found"
            return 1
        fi
    else
        error "✗ MinIO health check failed"
        return 1
    fi
}

# Main health check
main() {
    log "=========================================="
    log "WorkMonitor Health Check"
    log "=========================================="

    local failed=0

    # Check containers
    log ""
    log "Checking container status..."
    check_container_status "workmonitor-postgres" || failed=1
    check_container_status "workmonitor-minio" || failed=1
    check_container_status "workmonitor-backend" || failed=1
    check_container_status "workmonitor-frontend" || failed=1
    check_container_status "workmonitor-nginx" || failed=1

    # Check service health
    log ""
    log "Checking service health..."
    check_service_health "Backend" "http://localhost:8000/health" || failed=1
    check_service_health "Frontend" "http://localhost:3000" || failed=1
    check_service_health "Nginx" "http://localhost/health" || failed=1

    # Check database
    log ""
    check_database || failed=1

    # Check MinIO
    log ""
    check_minio || failed=1

    # Check resources
    log ""
    check_resources

    # Summary
    log ""
    log "=========================================="
    if [ $failed -eq 0 ]; then
        log "All services are healthy ✓"
        log "=========================================="
        return 0
    else
        error "Some services are not healthy"
        log "=========================================="
        return 1
    fi
}

# Run main function
main
exit $?
