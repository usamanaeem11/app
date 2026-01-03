# WorkMonitor Deployment Guide

Complete step-by-step guide to deploy WorkMonitor on Ubuntu VPS using Docker and Docker Compose.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Server Setup](#server-setup)
3. [Clone Repository](#clone-repository)
4. [Environment Configuration](#environment-configuration)
5. [SSL Certificate Setup](#ssl-certificate-setup)
6. [Database Initialization](#database-initialization)
7. [Deploy with Docker Compose](#deploy-with-docker-compose)
8. [Verification](#verification)
9. [Post-Deployment](#post-deployment)
10. [Troubleshooting](#troubleshooting)
11. [Maintenance](#maintenance)

---

## Prerequisites

### Server Requirements

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| CPU | 2 cores | 4 cores |
| RAM | 4 GB | 8 GB |
| Storage | 40 GB SSD | 100 GB SSD |
| OS | Ubuntu 20.04+ | Ubuntu 22.04 LTS |

### Domain Setup

Before deployment, configure DNS records:

```
A    yourdomain.com        → Your-VPS-IP
A    api.yourdomain.com    → Your-VPS-IP
A    storage.yourdomain.com → Your-VPS-IP
```

---

## Server Setup

### 1. Update System

```bash
sudo apt update && sudo apt upgrade -y
```

### 2. Install Docker

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group
sudo usermod -aG docker $USER

# Apply group changes (or logout/login)
newgrp docker

# Verify installation
docker --version
```

### 3. Install Docker Compose

```bash
# Install Docker Compose v2
sudo apt install docker-compose-plugin -y

# Verify installation
docker compose version
```

### 4. Install Additional Tools

```bash
sudo apt install -y git curl wget nano htop
```

### 5. Configure Firewall

```bash
# Allow SSH
sudo ufw allow 22/tcp

# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable
```

---

## Clone Repository

```bash
# Create app directory
sudo mkdir -p /opt/workmonitor
sudo chown $USER:$USER /opt/workmonitor
cd /opt/workmonitor

# Clone repository
git clone https://github.com/usamanaeem11/app.git .

# Or if using SSH
git clone git@github.com:usamanaeem11/app.git .
```

---

## Environment Configuration

### 1. Create Environment File

```bash
# Copy example environment file
cp .env.example .env

# Edit with your values
nano .env
```

### 2. Required Environment Variables

Edit `.env` and set these values:

```bash
# Database (generate strong passwords!)
POSTGRES_PASSWORD=your_secure_password_32_chars_min
DATABASE_URL=postgresql://workmonitor:your_secure_password@postgres:5432/workmonitor

# JWT Secret (generate with: openssl rand -hex 64)
JWT_SECRET=your_64_character_hex_secret_here

# MinIO Storage
MINIO_ROOT_PASSWORD=your_minio_password_min_8_chars

# Domain Configuration
DOMAIN=yourdomain.com
API_URL=https://api.yourdomain.com
REACT_APP_API_URL=https://api.yourdomain.com

# Email (choose one)
# Option A: SMTP
SMTP_HOST=smtp.gmail.com
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_specific_password

# Option B: SendGrid
SENDGRID_API_KEY=SG.your_api_key

# Stripe (if using payments)
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

### 3. Generate Secure Secrets

```bash
# Generate JWT secret
openssl rand -hex 64

# Generate database password
openssl rand -base64 32

# Generate MinIO password
openssl rand -base64 16
```

---

## SSL Certificate Setup

### Option A: Let's Encrypt (Recommended)

```bash
# Create SSL directory
mkdir -p /opt/workmonitor/ssl/certs

# Install Certbot
sudo apt install certbot -y

# Get certificates
sudo certbot certonly --standalone \
  -d yourdomain.com \
  -d api.yourdomain.com \
  -d storage.yourdomain.com \
  --email admin@yourdomain.com \
  --agree-tos

# Copy certificates
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem /opt/workmonitor/ssl/certs/cert.pem
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem /opt/workmonitor/ssl/certs/key.pem
sudo chown $USER:$USER /opt/workmonitor/ssl/certs/*
```

### Auto-Renewal Setup

```bash
# Create renewal script
cat > /opt/workmonitor/ssl/renew.sh << 'EOF'
#!/bin/bash
certbot renew --quiet
cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem /opt/workmonitor/ssl/certs/cert.pem
cp /etc/letsencrypt/live/yourdomain.com/privkey.pem /opt/workmonitor/ssl/certs/key.pem
docker compose -f /opt/workmonitor/docker-compose.yml restart nginx
EOF

chmod +x /opt/workmonitor/ssl/renew.sh

# Add to crontab (runs twice daily)
(crontab -l 2>/dev/null; echo "0 0,12 * * * /opt/workmonitor/ssl/renew.sh") | crontab -
```

### Option B: Self-Signed (Development Only)

```bash
mkdir -p /opt/workmonitor/ssl/certs
cd /opt/workmonitor/ssl/certs

openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout key.pem -out cert.pem \
  -subj "/C=US/ST=State/L=City/O=Org/CN=yourdomain.com"
```

---

## Database Initialization

### 1. Create Init Scripts Directory

```bash
mkdir -p /opt/workmonitor/init-scripts
```

### 2. Copy Initialization Script

Copy the `init.sql` file from this deployment package to:
```bash
cp init-scripts/init.sql /opt/workmonitor/init-scripts/
```

The init script will run automatically on first database startup.

---

## Deploy with Docker Compose

### 1. Build and Start Services

```bash
cd /opt/workmonitor

# Pull latest images
docker compose pull

# Build custom images
docker compose build --no-cache

# Start all services
docker compose up -d

# View logs
docker compose logs -f
```

### 2. Check Service Status

```bash
docker compose ps
```

Expected output:
```
NAME                STATUS              PORTS
workmonitor-backend    Up (healthy)     0.0.0.0:5000->5000/tcp
workmonitor-frontend   Up               0.0.0.0:3000->3000/tcp
workmonitor-postgres   Up (healthy)     5432/tcp
workmonitor-minio      Up               9000/tcp, 9001/tcp
workmonitor-redis      Up               6379/tcp
workmonitor-nginx      Up               0.0.0.0:80->80/tcp, 0.0.0.0:443->443/tcp
```

---

## Verification

### 1. Run Verification Script

```bash
chmod +x scripts/verify-deployment.sh
./scripts/verify-deployment.sh
```

### 2. Manual Checks

```bash
# Check PostgreSQL
docker compose exec postgres psql -U workmonitor -c "SELECT version();"

# Check tables exist
docker compose exec postgres psql -U workmonitor -c "\dt"

# Check MinIO
curl http://localhost:9001/minio/health/live

# Check Backend API
curl http://localhost:5000/health

# Check Frontend
curl http://localhost:3000
```

### 3. Test External Access

```bash
# Test HTTPS
curl -I https://yourdomain.com
curl -I https://api.yourdomain.com/health
```

---

## Post-Deployment

### 1. Change Default Admin Password

1. Open https://yourdomain.com
2. Login with:
   - Email: `admin@workmonitor.local`
   - Password: `admin123`
3. Go to Profile → Change Password
4. Set a strong password

### 2. Configure MinIO Bucket

```bash
# Access MinIO container
docker compose exec minio sh

# Configure mc client
mc alias set local http://localhost:9000 $MINIO_ROOT_USER $MINIO_ROOT_PASSWORD

# Create bucket
mc mb local/workmonitor

# Set bucket policy (for screenshots)
mc anonymous set download local/workmonitor/public
```

### 3. Setup Stripe Webhooks

1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://api.yourdomain.com/api/webhooks/stripe`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
4. Copy webhook secret to `.env` as `STRIPE_WEBHOOK_SECRET`
5. Restart backend: `docker compose restart backend`

---

## Troubleshooting

### View Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f backend
docker compose logs -f postgres
docker compose logs -f nginx
```

### Common Issues

#### Backend won't start
```bash
# Check logs
docker compose logs backend

# Verify database connection
docker compose exec backend npm run db:test
```

#### Database connection refused
```bash
# Restart postgres
docker compose restart postgres

# Check postgres logs
docker compose logs postgres
```

#### SSL Certificate Issues
```bash
# Verify certificates
ls -la ssl/certs/

# Check nginx config
docker compose exec nginx nginx -t
```

#### MinIO Bucket Access
```bash
# Check MinIO logs
docker compose logs minio

# Recreate bucket
docker compose exec minio mc mb local/workmonitor --ignore-existing
```

### Reset Everything

```bash
# Stop all containers
docker compose down

# Remove all data (DANGER: deletes all data!)
docker compose down -v

# Remove images
docker compose down --rmi all

# Start fresh
docker compose up -d --build
```

---

## Maintenance

### Backup Database

```bash
# Create backup
docker compose exec postgres pg_dump -U workmonitor workmonitor > backup_$(date +%Y%m%d).sql

# Restore backup
cat backup_20240101.sql | docker compose exec -T postgres psql -U workmonitor workmonitor
```

### Backup MinIO

```bash
# Backup bucket
docker compose exec minio mc mirror local/workmonitor /tmp/backup

# Or use rclone for remote backup
```

### Update Application

```bash
cd /opt/workmonitor

# Pull latest code
git pull origin main

# Rebuild and restart
docker compose build --no-cache
docker compose up -d
```

### Monitor Resources

```bash
# Container stats
docker stats

# Disk usage
docker system df

# Clean unused resources
docker system prune -a
```

---

## Service Ports Summary

| Service | Internal Port | External Port | URL |
|---------|--------------|---------------|-----|
| Frontend | 3000 | 80/443 | https://yourdomain.com |
| Backend | 5000 | 80/443 | https://api.yourdomain.com |
| PostgreSQL | 5432 | - | internal only |
| MinIO API | 9000 | - | internal only |
| MinIO Console | 9001 | 9001 | http://localhost:9001 |
| Redis | 6379 | - | internal only |

---

## Support

For issues or questions:
- GitHub Issues: https://github.com/usamanaeem11/app/issues
- Documentation: Check the `/docs` folder in the repository
