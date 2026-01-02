# WorkMonitor Docker Deployment Instructions (Phase 8)

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Pre-Deployment Setup](#pre-deployment-setup)
3. [SSL/TLS Certificate Setup](#ssltls-certificate-setup)
4. [Environment Configuration](#environment-configuration)
5. [Database Initialization](#database-initialization)
6. [Building and Deploying](#building-and-deploying)
7. [Post-Deployment Verification](#post-deployment-verification)
8. [Monitoring and Maintenance](#monitoring-and-maintenance)
9. [Backup and Disaster Recovery](#backup-and-disaster-recovery)
10. [Troubleshooting](#troubleshooting)
11. [Security Best Practices](#security-best-practices)

---

## Prerequisites

### System Requirements
- **OS**: Ubuntu 20.04 LTS or higher
- **RAM**: Minimum 8GB (16GB recommended for production)
- **CPU**: 4 cores minimum (8 cores recommended)
- **Storage**: 100GB+ SSD (scalable based on usage)
- **Network**: Static IP address, port access for 80, 443, and optionally 9001 (MinIO console)

### Required Software
1. **Docker Engine** (20.10 or higher)
   ```bash
   # Install Docker
   sudo apt-get update
   sudo apt-get install -y docker.io docker-compose-plugin
   sudo usermod -aG docker $USER
   newgrp docker
   docker --version
   ```

2. **Docker Compose** (v2.0 or higher)
   ```bash
   docker compose --version
   ```

3. **Git**
   ```bash
   sudo apt-get install -y git
   ```

4. **curl and wget** (for health checks)
   ```bash
   sudo apt-get install -y curl wget
   ```

### Domain and DNS
- Register a domain (e.g., `yourdomain.com`)
- Point DNS records to your VPS IP:
  - `yourdomain.com` A record → Your VPS IP
  - `www.yourdomain.com` A record → Your VPS IP
  - `api.yourdomain.com` A record → Your VPS IP
  - `s3.yourdomain.com` A record → Your VPS IP (optional, for MinIO)

### SSL/TLS Certificate Provider
- Obtain SSL certificates (see [SSL/TLS Certificate Setup](#ssltls-certificate-setup) section)

---

## Pre-Deployment Setup

### 1. Clone or Prepare Your Project

```bash
# Option A: Clone from Git repository
git clone https://your-repo-url.git workmonitor
cd workmonitor

# Option B: If you have the code locally, upload to VPS
scp -r /path/to/workmonitor user@your-vps-ip:/home/user/
ssh user@your-vps-ip
cd /home/user/workmonitor
```

### 2. Create Required Directories

```bash
# Create directory structure
mkdir -p ssl/certs
mkdir -p init-scripts
mkdir -p backups/postgres
mkdir -p backups/minio
mkdir -p logs/nginx
mkdir -p logs/backend
mkdir -p data/minio
mkdir -p data/postgres

# Set permissions
chmod 755 ssl/certs
chmod 755 init-scripts
chmod 755 backups
chmod 755 logs
chmod 755 data
```

### 3. Create Database Initialization Script

Create `init-scripts/01-init-db.sql`:

```sql
-- ============================================================
-- WorkMonitor Database Initialization Script
-- ============================================================

-- Create UUID extension (if not exists)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types and enums
CREATE TYPE user_role AS ENUM ('admin', 'manager', 'employee', 'contractor');
CREATE TYPE subscription_status AS ENUM ('active', 'inactive', 'suspended', 'expired');
CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded');

-- Create base tables
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role user_role DEFAULT 'employee',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP,
    two_factor_enabled BOOLEAN DEFAULT FALSE
);

-- Create companies table
CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    website VARCHAR(255),
    industry VARCHAR(100),
    country VARCHAR(100),
    subscription_status subscription_status DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    settings JSONB DEFAULT '{}'::jsonb
);

-- Create company users mapping
CREATE TABLE IF NOT EXISTS company_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role user_role DEFAULT 'employee',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, user_id)
);

-- Create screenshots table
CREATE TABLE IF NOT EXISTS screenshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    file_path VARCHAR(500),
    file_size BIGINT,
    s3_key VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create screen recordings table
CREATE TABLE IF NOT EXISTS screen_recordings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    file_path VARCHAR(500),
    file_size BIGINT,
    s3_key VARCHAR(500),
    duration_seconds INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create activity logs table
CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    activity_type VARCHAR(100),
    description TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created_at ON users(created_at);
CREATE INDEX idx_company_users_company_id ON company_users(company_id);
CREATE INDEX idx_company_users_user_id ON company_users(user_id);
CREATE INDEX idx_screenshots_user_id ON screenshots(user_id);
CREATE INDEX idx_screenshots_created_at ON screenshots(created_at);
CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at);

-- Create audit table for tracking changes
CREATE TABLE IF NOT EXISTS audit_log (
    id BIGSERIAL PRIMARY KEY,
    table_name VARCHAR(255),
    record_id UUID,
    action VARCHAR(10),
    changes JSONB,
    user_id UUID,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_log_created_at ON audit_log(created_at);
CREATE INDEX idx_audit_log_table_name ON audit_log(table_name);

-- Grant permissions to application user
GRANT CONNECT ON DATABASE workmonitor_db TO workmonitor_user;
GRANT USAGE ON SCHEMA public TO workmonitor_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO workmonitor_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO workmonitor_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO workmonitor_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO workmonitor_user;
```

Save this file as `/path/to/workmonitor/init-scripts/01-init-db.sql`.

---

## SSL/TLS Certificate Setup

### Option 1: Let's Encrypt with Certbot (Recommended - Free)

```bash
# Install Certbot
sudo apt-get install -y certbot python3-certbot-nginx

# Obtain certificates for all domains
sudo certbot certonly --standalone \
  -d yourdomain.com \
  -d www.yourdomain.com \
  -d api.yourdomain.com \
  -d s3.yourdomain.com \
  -m admin@yourdomain.com \
  --agree-tos \
  --no-eff-email

# Certificates will be in: /etc/letsencrypt/live/yourdomain.com/

# Copy to project directory
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem ./ssl/certs/cert.pem
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem ./ssl/certs/key.pem
sudo cp /etc/letsencrypt/live/yourdomain.com/chain.pem ./ssl/certs/chain.pem
sudo chown $USER:$USER ./ssl/certs/*

# Set up auto-renewal
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

### Option 2: Commercial SSL Provider

1. Purchase SSL certificate from your provider (Sectigo, DigiCert, GlobalSign, etc.)
2. Download certificate files
3. Copy to `/path/to/workmonitor/ssl/certs/`:
   - `cert.pem` - Server certificate
   - `key.pem` - Private key
   - `chain.pem` - Certificate chain

### Option 3: Self-Signed (Development Only)

```bash
# Generate self-signed certificate (NOT for production)
openssl req -x509 -newkey rsa:4096 -keyout ./ssl/certs/key.pem \
  -out ./ssl/certs/cert.pem -days 365 -nodes \
  -subj "/CN=yourdomain.com"

# Create chain file
cp ./ssl/certs/cert.pem ./ssl/certs/chain.pem

# Set permissions
chmod 600 ./ssl/certs/*.pem
```

---

## Environment Configuration

### 1. Create Production Environment File

```bash
# Copy the example file
cp .env.production.example .env.production

# Edit with your actual values
nano .env.production
```

### 2. Update Key Variables

Edit `.env.production` and replace these values:

```bash
# Domain Configuration
FRONTEND_URL=https://yourdomain.com
BACKEND_URL=https://api.yourdomain.com
API_DOMAIN=api.yourdomain.com
DOMAIN=yourdomain.com

# Database
DB_USER=workmonitor_user
DB_PASSWORD=YOUR_STRONG_PASSWORD_HERE_MIN_16_CHARS
DB_NAME=workmonitor_db

# MinIO
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=YOUR_STRONG_PASSWORD_HERE_MIN_32_CHARS
S3_BUCKET_NAME=workmonitor-storage

# JWT Secret (generate with: openssl rand -hex 32)
JWT_SECRET=YOUR_LONG_RANDOM_STRING_HERE

# Email (e.g., SendGrid, Gmail)
SMTP_HOST=smtp.sendgrid.net
SMTP_USER=apikey
SMTP_PASSWORD=YOUR_SENDGRID_API_KEY

# Stripe
STRIPE_API_KEY=sk_live_YOUR_KEY
STRIPE_WEBHOOK_SECRET=whsec_YOUR_SECRET

# Google
GOOGLE_CLIENT_ID=YOUR_CLIENT_ID.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=YOUR_SECRET
GOOGLE_API_KEY=YOUR_API_KEY

# OpenAI
OPENAI_API_KEY=sk-YOUR_KEY

# Admin Account
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=YOUR_STRONG_ADMIN_PASSWORD
```

### 3. Generate Strong Random Secrets

```bash
# Generate JWT Secret
openssl rand -hex 32

# Generate Database Password
openssl rand -base64 32

# Generate MinIO Password
openssl rand -base64 48
```

---

## Database Initialization

### 1. Start Database Container

```bash
# Start only PostgreSQL
docker compose up -d postgres

# Wait for PostgreSQL to be ready (check health)
docker compose exec postgres pg_isready -U workmonitor_user
```

### 2. Initialize Database

```bash
# Run initialization script
docker compose exec -T postgres psql \
  -U workmonitor_user \
  -d workmonitor_db \
  -f /docker-entrypoint-initdb.d/01-init-db.sql

# Verify tables were created
docker compose exec postgres psql \
  -U workmonitor_user \
  -d workmonitor_db \
  -c "\dt"
```

### 3. Create MinIO Bucket

```bash
# Start MinIO
docker compose up -d minio

# Wait for MinIO to be ready
sleep 10

# Create bucket
docker compose exec minio \
  mc alias set minio http://localhost:9000 minioadmin YOUR_PASSWORD

docker compose exec minio \
  mc mb minio/workmonitor-storage

# Set bucket policy (public read, private write)
docker compose exec minio \
  mc policy set download minio/workmonitor-storage
```

---

## Building and Deploying

### 1. Build Docker Images

```bash
# Build all services
docker compose build

# Or build specific services
docker compose build backend
docker compose build frontend
```

### 2. Deploy Full Stack

```bash
# Start all services
docker compose up -d

# Verify all services are running
docker compose ps

# Expected output:
# NAME                     STATUS              PORTS
# workmonitor-postgres     Up (healthy)        5432/tcp
# workmonitor-minio        Up (healthy)        9000/tcp, 9001/tcp
# workmonitor-backend      Up (healthy)        8000/tcp
# workmonitor-frontend     Up (healthy)        3000/tcp
# workmonitor-nginx        Up (healthy)        80/tcp, 443/tcp
```

### 3. Monitor Startup

```bash
# View logs for all services
docker compose logs -f

# View logs for specific service
docker compose logs -f backend
docker compose logs -f frontend

# Check specific container health
docker compose exec backend curl http://localhost:8000/health
docker compose exec frontend curl http://localhost:3000
```

### 4. Verify Deployment

```bash
# Check all services are healthy
docker compose ps --all

# Test health endpoints
curl http://localhost/health
curl http://localhost:8000/health
curl http://localhost:3000

# Test API connectivity
curl -H "Content-Type: application/json" http://localhost:8000/api/health
```

---

## Post-Deployment Verification

### 1. Access the Application

```bash
# Frontend
https://yourdomain.com

# API Documentation
https://api.yourdomain.com/docs

# MinIO Console (if public access enabled)
https://s3.yourdomain.com/login
# Username: minioadmin
# Password: YOUR_PASSWORD
```

### 2. Create First Admin User

```bash
# Access PostgreSQL
docker compose exec postgres psql \
  -U workmonitor_user \
  -d workmonitor_db

# Insert admin user (run in psql)
INSERT INTO users (email, password_hash, first_name, last_name, role, is_active)
VALUES ('admin@yourdomain.com', 'hashed_password_here', 'Admin', 'User', 'admin', TRUE);

# Note: Use bcrypt to hash the password in your application before storing
```

### 3. Run Database Migrations (if needed)

```bash
# Connect to backend container
docker compose exec backend bash

# Run migrations
python -m alembic upgrade head

# Exit
exit
```

### 4. Verify File Storage

```bash
# Test S3/MinIO upload
docker compose exec backend python -c "
from utils.storage import upload_file
# Test file upload
"

# Or verify via MinIO console
https://s3.yourdomain.com
```

---

## Monitoring and Maintenance

### 1. Monitor Service Health

```bash
# Check running containers
docker compose ps

# View resource usage
docker stats

# Check Docker daemon logs
journalctl -u docker -f

# View container resource limits
docker compose config | grep -A 10 "resources:"
```

### 2. View Application Logs

```bash
# All logs
docker compose logs

# Specific service logs
docker compose logs backend
docker compose logs frontend
docker compose logs postgres
docker compose logs nginx

# Follow logs in real-time
docker compose logs -f

# Last 100 lines
docker compose logs --tail=100

# Logs from last hour
docker compose logs --since 1h
```

### 3. Monitor Disk Usage

```bash
# Check disk space
df -h

# Check Docker volumes
docker volume ls
docker volume inspect workmonitor_postgres_data

# Clean up unused Docker resources
docker system prune -a --volumes
```

### 4. Database Maintenance

```bash
# Backup database
docker compose exec -T postgres pg_dump \
  -U workmonitor_user \
  workmonitor_db > backup_$(date +%Y%m%d_%H%M%S).sql

# Vacuum database (optimize)
docker compose exec postgres psql \
  -U workmonitor_user \
  -d workmonitor_db \
  -c "VACUUM ANALYZE;"

# Check database size
docker compose exec postgres psql \
  -U workmonitor_user \
  -d workmonitor_db \
  -c "SELECT pg_size_pretty(pg_database_size('workmonitor_db'));"
```

### 5. Update Containers

```bash
# Pull latest images
docker compose pull

# Rebuild images
docker compose build --no-cache

# Stop old containers and start new ones
docker compose up -d

# Remove old images
docker image prune -a
```

### 6. SSL Certificate Renewal

```bash
# For Let's Encrypt certificates (auto-renewal should be configured)
sudo certbot renew

# Manual renewal
sudo certbot renew --force-renewal

# Copy renewed certificates
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem ./ssl/certs/cert.pem
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem ./ssl/certs/key.pem
sudo chown $USER:$USER ./ssl/certs/*

# Restart Nginx
docker compose restart nginx
```

---

## Backup and Disaster Recovery

### 1. Automated Backup Script

Create `backup.sh`:

```bash
#!/bin/bash

# ============================================================
# WorkMonitor Backup Script
# ============================================================

BACKUP_DIR="/home/user/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Database backup
echo "Backing up PostgreSQL..."
docker compose exec -T postgres pg_dump \
  -U workmonitor_user \
  workmonitor_db | gzip > "$BACKUP_DIR/postgres_$TIMESTAMP.sql.gz"

# MinIO backup
echo "Backing up MinIO..."
docker compose exec -T minio mc mirror \
  --overwrite minio/workmonitor-storage \
  "$BACKUP_DIR/minio_$TIMESTAMP"

# Configuration backup
echo "Backing up configuration..."
tar czf "$BACKUP_DIR/config_$TIMESTAMP.tar.gz" \
  .env.production ssl/certs/ nginx.conf

# Clean old backups
find "$BACKUP_DIR" -name "postgres_*.sql.gz" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "config_*.tar.gz" -mtime +$RETENTION_DAYS -delete

echo "Backup completed: $TIMESTAMP"
```

### 2. Schedule Automatic Backups

```bash
# Make script executable
chmod +x backup.sh

# Add to crontab (run daily at 2 AM)
crontab -e

# Add this line:
0 2 * * * /home/user/workmonitor/backup.sh
```

### 3. Restore from Backup

```bash
# Restore PostgreSQL
zcat backup_postgres_20240102_020000.sql.gz | \
  docker compose exec -T postgres psql \
    -U workmonitor_user \
    workmonitor_db

# Restore MinIO
docker compose exec -T minio mc mirror \
  --overwrite /backups/minio_20240102_020000 \
  minio/workmonitor-storage

# Restore configuration
tar xzf config_20240102_020000.tar.gz
docker compose restart
```

---

## Troubleshooting

### Container Won't Start

```bash
# Check container logs
docker compose logs container_name

# Check resource limits
docker stats container_name

# Inspect container
docker compose exec container_name /bin/sh

# Restart container
docker compose restart container_name
```

### Database Connection Issues

```bash
# Test PostgreSQL connection
docker compose exec postgres psql \
  -U workmonitor_user \
  -d workmonitor_db \
  -c "SELECT 1;"

# Check PostgreSQL logs
docker compose logs postgres

# Verify environment variables
docker compose exec backend env | grep DATABASE
```

### Frontend Not Loading

```bash
# Check frontend health
curl http://localhost:3000

# Check Nginx configuration
docker compose exec nginx nginx -t

# Reload Nginx
docker compose exec nginx nginx -s reload

# View Nginx logs
docker compose logs -f nginx
```

### API Connection Issues

```bash
# Test backend directly
curl http://localhost:8000/health

# Check CORS headers
curl -i http://localhost:8000/api/health

# Verify environment variables
docker compose exec backend env | grep FRONTEND_URL

# Check backend logs
docker compose logs -f backend
```

### Storage Issues

```bash
# Check MinIO health
docker compose exec minio curl http://localhost:9000/minio/health/live

# List buckets
docker compose exec minio mc ls minio/

# Check storage usage
docker compose exec minio du -sh /minio_data

# View MinIO logs
docker compose logs minio
```

### SSL Certificate Issues

```bash
# Verify certificate validity
openssl x509 -in ./ssl/certs/cert.pem -noout -dates

# Test HTTPS connection
curl -v https://yourdomain.com

# Check certificate expiry
certbot certificates

# Renew certificates
sudo certbot renew --force-renewal
```

### Port Conflicts

```bash
# Check which process is using a port
sudo lsof -i :80
sudo lsof -i :443
sudo lsof -i :5432

# Kill process using port
sudo kill -9 <PID>

# Or change port in docker-compose.yml
```

### Disk Space Issues

```bash
# Check disk usage
du -sh /var/lib/docker/volumes/

# Clean old logs
docker compose logs --tail=0 > /dev/null

# Prune unused Docker data
docker system prune -a --volumes

# Remove old backups
find ./backups -mtime +30 -delete
```

---

## Security Best Practices

### 1. Firewall Configuration

```bash
# Allow SSH
sudo ufw allow 22/tcp

# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Deny MinIO console from external (optional)
# sudo ufw deny 9001/tcp

# Enable firewall
sudo ufw enable

# Check rules
sudo ufw status
```

### 2. SSH Security

```bash
# Edit SSH config
sudo nano /etc/ssh/sshd_config

# Set these configurations:
# Port 22
# PermitRootLogin no
# PubkeyAuthentication yes
# PasswordAuthentication no
# UsePAM yes
# X11Forwarding no

# Restart SSH
sudo systemctl restart sshd
```

### 3. Database Security

```bash
# Change default MinIO credentials
docker compose exec minio mc admin user add minio newuser newpassword
docker compose exec minio mc admin user rm minio minioadmin

# Restrict database access
docker compose exec postgres psql \
  -U workmonitor_user \
  -d workmonitor_db \
  -c "REVOKE CONNECT ON DATABASE workmonitor_db FROM PUBLIC;"

# Enable SSL for database connections
# (Configure in .env.production)
```

### 4. Environment Variable Security

```bash
# Ensure .env.production is not tracked in Git
echo ".env.production" >> .gitignore

# Set file permissions
chmod 600 .env.production
chmod 600 ssl/certs/key.pem

# Use secret management for sensitive values
# Consider using: HashiCorp Vault, AWS Secrets Manager, or Azure Key Vault
```

### 5. Regular Security Updates

```bash
# Update system packages
sudo apt-get update
sudo apt-get upgrade

# Update Docker images
docker compose pull
docker compose up -d

# Check for vulnerabilities
docker scout cves
```

### 6. Monitoring and Alerts

```bash
# Set up log monitoring
tail -f logs/nginx/error.log
tail -f logs/backend/error.log

# Monitor resource usage
watch -n 1 'docker stats --no-stream'

# Set up alerts for:
# - Disk usage > 80%
# - Memory usage > 80%
# - CPU usage > 90%
# - Failed API requests
```

---

## Performance Optimization

### 1. Enable Caching

```bash
# Redis caching (optional addition)
# Add to docker-compose.yml:
# redis:
#   image: redis:7-alpine
#   volumes:
#     - redis_data:/data

# Configure in backend
REDIS_URL=redis://redis:6379/0
```

### 2. Database Query Optimization

```bash
# Monitor slow queries
docker compose exec postgres psql \
  -U workmonitor_user \
  -d workmonitor_db \
  -c "ALTER SYSTEM SET log_min_duration_statement = 1000;"

# Reload configuration
docker compose exec postgres psql \
  -U workmonitor_user \
  -d workmonitor_db \
  -c "SELECT pg_reload_conf();"
```

### 3. Scale Services

```bash
# Increase backend workers (in Dockerfile or docker-compose)
# Modify CMD to: uvicorn server:app --workers 8

# Increase Nginx worker processes
# Modify nginx.conf: worker_processes 8;

# Scale services up/down
docker compose up -d --scale backend=2 backend
```

---

## Support and Documentation

For additional help:
- Check Docker logs: `docker compose logs -f`
- Review nginx configuration: `./nginx.conf`
- Backend documentation: `https://api.yourdomain.com/docs`
- Frontend documentation: See `/frontend/README.md`

---

## Rollback Procedure

```bash
# Revert to previous image
docker compose down
git checkout previous_version
docker compose build
docker compose up -d

# Or restore from backup
./backup.sh restore backup_20240102_020000.sql.gz
```

---

## Production Checklist

- [ ] Domain and DNS configured
- [ ] SSL certificates obtained and installed
- [ ] Environment variables configured
- [ ] Database initialized and seeded
- [ ] MinIO bucket created
- [ ] Admin user created
- [ ] Backups configured
- [ ] Firewall rules configured
- [ ] SSL auto-renewal configured
- [ ] Monitoring and alerts set up
- [ ] Load testing completed
- [ ] Disaster recovery plan tested

---

**Last Updated**: 2024-01-02
**Version**: 1.0.0
**Status**: Production Ready
