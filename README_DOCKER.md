# WorkMonitor Docker Deployment (Phase 8)

## Overview

This is a production-ready Docker deployment setup for the WorkMonitor platform. It provides a complete, containerized solution for self-hosting on Ubuntu VPS with all necessary components: PostgreSQL, MinIO S3 storage, FastAPI backend, React frontend, and Nginx reverse proxy.

## Quick Links

- **Full Deployment Guide**: [DEPLOYMENT_INSTRUCTIONS.md](./DEPLOYMENT_INSTRUCTIONS.md)
- **Architecture & Reference**: [DOCKER_SETUP_SUMMARY.md](./DOCKER_SETUP_SUMMARY.md)
- **File Manifest**: [DEPLOYMENT_FILES_MANIFEST.md](./DEPLOYMENT_FILES_MANIFEST.md)
- **Health Monitoring**: `./deployment-scripts/health-check.sh`
- **Backup Script**: `./deployment-scripts/backup.sh`
- **Restore Script**: `./deployment-scripts/restore.sh`

## What's Included

### Docker Containers
- **PostgreSQL 15**: Primary database with persistent storage
- **MinIO**: S3-compatible object storage for files and backups
- **FastAPI Backend**: Python backend API with Uvicorn (4 workers)
- **React Frontend**: Production-optimized React app served by Nginx
- **Nginx**: Reverse proxy with SSL/TLS, caching, and rate limiting

### Configuration Files
- `docker-compose.yml` - Service orchestration
- `Dockerfile.backend` - Backend container image
- `Dockerfile.frontend` - Frontend container image
- `nginx.conf` - Complete reverse proxy configuration
- `.env.production.example` - Production variables template
- `.dockerignore` - Build optimization

### Documentation
- `DEPLOYMENT_INSTRUCTIONS.md` - Step-by-step deployment (24 KB)
- `DOCKER_SETUP_SUMMARY.md` - Architecture overview (15 KB)
- `DEPLOYMENT_FILES_MANIFEST.md` - File descriptions (detailed manifest)
- `README_DOCKER.md` - This file

### Scripts
- `deployment-scripts/health-check.sh` - Health monitoring
- `deployment-scripts/backup.sh` - Automated backups
- `deployment-scripts/restore.sh` - Disaster recovery

## System Requirements

### Minimum
- 4 CPU cores
- 8GB RAM
- 100GB SSD storage
- Ubuntu 20.04 LTS or higher

### Recommended (Production)
- 8+ CPU cores
- 16GB+ RAM
- 200GB+ SSD storage
- Ubuntu 22.04 LTS
- Static IP address
- High-speed internet

## 5-Minute Quick Start

```bash
# 1. Clone and navigate to project
git clone <your-repo> workmonitor
cd workmonitor

# 2. Create necessary directories
mkdir -p ssl/certs init-scripts backups logs data

# 3. Copy environment template
cp .env.production.example .env.production

# 4. Edit configuration (IMPORTANT!)
nano .env.production
# Update at minimum:
# - DB_PASSWORD
# - MINIO_ROOT_PASSWORD
# - JWT_SECRET
# - FRONTEND_URL
# - BACKEND_URL
# - DOMAIN
# - Email/SMS/Payment credentials

# 5. Get SSL certificates
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

# 6. Copy certificates
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem ./ssl/certs/cert.pem
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem ./ssl/certs/key.pem
sudo cp /etc/letsencrypt/live/yourdomain.com/chain.pem ./ssl/certs/chain.pem
sudo chown $USER:$USER ./ssl/certs/*

# 7. Build containers
docker compose build

# 8. Start services
docker compose up -d

# 9. Wait for services to start (30-60 seconds)
sleep 30

# 10. Initialize database
docker compose exec -T postgres psql \
  -U workmonitor_user \
  -d workmonitor_db \
  -f /docker-entrypoint-initdb.d/01-init-db.sql

# 11. Verify health
./deployment-scripts/health-check.sh

# 12. Access your services
# Frontend: https://yourdomain.com
# API: https://api.yourdomain.com
# API Docs: https://api.yourdomain.com/docs
# MinIO: https://s3.yourdomain.com (optional, restricted)
```

## Important First Steps

### 1. Change Default Passwords
```bash
# Generate strong passwords
openssl rand -base64 32

# Update in .env.production:
DB_PASSWORD=<your-generated-password>
MINIO_ROOT_PASSWORD=<your-generated-password>
JWT_SECRET=<openssl rand -hex 32>
ADMIN_PASSWORD=<your-strong-password>
```

### 2. Configure External Services
Get API keys for:
- Stripe (payment processing)
- OpenAI (AI features)
- Google Cloud (OAuth/Calendar)
- SendGrid or SMTP (email)

### 3. Set Up SSL Certificates
Use Let's Encrypt (free and recommended):
```bash
sudo certbot certonly --standalone \
  -d yourdomain.com \
  -d www.yourdomain.com \
  -d api.yourdomain.com \
  -m admin@yourdomain.com
```

### 4. Configure Firewall
```bash
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

## Common Tasks

### Start/Stop Services
```bash
# Start all
docker compose up -d

# Stop all
docker compose down

# Restart specific service
docker compose restart backend

# View status
docker compose ps
```

### View Logs
```bash
# All logs
docker compose logs

# Follow logs (real-time)
docker compose logs -f

# Specific service
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f postgres

# Last 100 lines
docker compose logs --tail=100
```

### Health Monitoring
```bash
# Run health check
./deployment-scripts/health-check.sh

# Watch real-time stats
watch docker stats

# Check disk usage
df -h

# Check database size
docker compose exec postgres psql \
  -U workmonitor_user \
  -d workmonitor_db \
  -c "SELECT pg_size_pretty(pg_database_size('workmonitor_db'));"
```

### Database Access
```bash
# Connect to PostgreSQL
docker compose exec postgres psql \
  -U workmonitor_user \
  -d workmonitor_db

# Run SQL command
docker compose exec -T postgres psql \
  -U workmonitor_user \
  -d workmonitor_db \
  -c "SELECT COUNT(*) FROM users;"

# Backup database
docker compose exec -T postgres pg_dump \
  -U workmonitor_user \
  workmonitor_db > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Backup & Restore
```bash
# Create backup
./deployment-scripts/backup.sh

# Restore from backup
./deployment-scripts/restore.sh ./backups

# Schedule daily backups (2 AM)
echo "0 2 * * * /path/to/deployment-scripts/backup.sh" | crontab -
```

### Update Containers
```bash
# Pull latest images
docker compose pull

# Rebuild images
docker compose build

# Deploy updated images
docker compose up -d

# Clean up old images
docker image prune -a
```

## Container Details

### PostgreSQL 15
- **Port**: 5432 (internal only)
- **Storage**: `postgres_data` volume
- **Backup**: Included in backup.sh
- **User**: workmonitor_user
- **Health Check**: Every 10 seconds

### MinIO
- **Ports**: 9000 (API), 9001 (Console - optional)
- **Storage**: `minio_data` volume
- **Default User**: minioadmin
- **Buckets**: workmonitor-storage
- **Health Check**: Every 30 seconds

### FastAPI Backend
- **Port**: 8000
- **Workers**: 4 Uvicorn workers
- **Framework**: FastAPI
- **Python**: 3.11
- **Health Endpoint**: `/health`
- **Health Check**: Every 30 seconds

### React Frontend
- **Port**: 3000
- **Server**: Nginx 1.25
- **Build**: Production optimized
- **Compression**: Gzip enabled
- **Cache**: Long-lived static assets
- **Health Check**: Every 30 seconds

### Nginx Reverse Proxy
- **Ports**: 80 (HTTP), 443 (HTTPS)
- **SSL**: TLS 1.2+ only
- **Rate Limiting**: API (100r/s), Login (10r/m)
- **Cache**: Static (1 year), API (30 min)
- **Health Check**: Every 30 seconds

## Monitoring & Alerts

### Health Check Script
```bash
./deployment-scripts/health-check.sh
```
Checks:
- All containers running
- Service health endpoints responding
- Database connectivity
- MinIO bucket accessible
- System resources (disk, memory)

### Log Monitoring
```bash
# Error logs
docker compose logs postgres | grep ERROR
docker compose logs backend | grep ERROR
docker compose logs nginx | grep ERROR

# Real-time monitoring
tail -f logs/nginx/error.log
tail -f logs/backend/error.log
```

### Resource Monitoring
```bash
# Docker stats
docker stats

# System resources
free -h          # Memory
df -h            # Disk space
top              # CPU usage
```

## Scaling & Performance

### Horizontal Scaling
```bash
# Scale backend to 2 instances
docker compose up -d --scale backend=2
```

### Performance Optimization
- Nginx caching enabled for static assets (1 year)
- API response caching (30 minutes)
- Gzip compression on all responses
- Database query indexing
- Connection pooling
- Multi-worker backend (4 workers)

### Vertical Scaling
Edit `docker-compose.yml` resource limits:
```yaml
deploy:
  resources:
    limits:
      cpus: '8'
      memory: 8G
```

## Security Features

### SSL/TLS
- TLS 1.2+ only
- HSTS enabled
- Certificate auto-renewal via certbot

### Access Control
- Non-root user execution
- Firewall configuration
- Rate limiting
- CORS configuration
- JWT authentication

### Data Protection
- Encrypted environment variables
- Secure database passwords
- S3-compatible storage with encryption option
- Audit logging capability

### Backup Security
- Encrypted database backups (configurable)
- Backup retention policy
- Off-site backup capability (S3, GCS)
- Restore verification

## Troubleshooting

### Services Not Starting
```bash
# Check logs
docker compose logs

# Check resource availability
docker stats

# Check port conflicts
sudo lsof -i :80
sudo lsof -i :443
sudo lsof -i :5432
```

### Database Connection Issues
```bash
# Test PostgreSQL
docker compose exec postgres pg_isready -U workmonitor_user

# Check environment variables
docker compose exec backend env | grep DATABASE_URL

# View connection logs
docker compose logs postgres | grep -i connection
```

### Frontend Not Loading
```bash
# Check frontend logs
docker compose logs frontend

# Test connectivity
curl http://localhost:3000

# Check Nginx configuration
docker compose exec nginx nginx -t
```

### SSL Certificate Issues
```bash
# Check certificate validity
openssl x509 -in ./ssl/certs/cert.pem -noout -dates

# Verify certificate chain
openssl verify -CAfile ./ssl/certs/chain.pem ./ssl/certs/cert.pem

# Renew certificate
sudo certbot renew --force-renewal
```

See [DEPLOYMENT_INSTRUCTIONS.md](./DEPLOYMENT_INSTRUCTIONS.md) "Troubleshooting" section for detailed solutions.

## File Structure

```
/project/
├── docker-compose.yml              # Main config
├── docker-compose.override.yml     # Development overrides
├── Dockerfile.backend              # Backend image
├── Dockerfile.frontend             # Frontend image
├── nginx.conf                      # Nginx config
├── .dockerignore                   # Build ignore
├── .env.example                    # Dev env template
├── .env.production.example         # Prod env template
├── DEPLOYMENT_INSTRUCTIONS.md      # Full guide
├── DOCKER_SETUP_SUMMARY.md        # Architecture
├── DEPLOYMENT_FILES_MANIFEST.md   # File details
├── README_DOCKER.md               # This file
├── deployment-scripts/
│   ├── health-check.sh           # Monitor health
│   ├── backup.sh                 # Automated backup
│   └── restore.sh                # Restore backup
├── ssl/
│   └── certs/                    # SSL certificates
├── init-scripts/
│   └── 01-init-db.sql           # Database init
├── logs/                          # Application logs
├── data/                          # Persistent data
├── backend/                       # Backend code
└── frontend/                      # Frontend code
```

## Maintenance Schedule

### Daily
- Monitor health: `./deployment-scripts/health-check.sh`
- Review error logs: `docker compose logs`
- Check disk space: `df -h`

### Weekly
- Test backup/restore: `./deployment-scripts/restore.sh`
- Review resource usage: `docker stats`
- Check for updates: `docker compose pull`

### Monthly
- Optimize database: `VACUUM ANALYZE;`
- Review access logs
- Update system packages: `sudo apt-get upgrade`
- SSL certificate status check

### Quarterly
- Full disaster recovery test
- Security audit
- Performance optimization review
- Documentation update

## Support Resources

- **Official Documentation**: [DEPLOYMENT_INSTRUCTIONS.md](./DEPLOYMENT_INSTRUCTIONS.md)
- **Architecture Guide**: [DOCKER_SETUP_SUMMARY.md](./DOCKER_SETUP_SUMMARY.md)
- **File Details**: [DEPLOYMENT_FILES_MANIFEST.md](./DEPLOYMENT_FILES_MANIFEST.md)
- **Docker Docs**: https://docs.docker.com
- **PostgreSQL**: https://www.postgresql.org/docs/15/
- **FastAPI**: https://fastapi.tiangolo.com
- **React**: https://react.dev
- **Nginx**: https://nginx.org

## Next Steps

1. **Review Documentation**
   - Read [DEPLOYMENT_INSTRUCTIONS.md](./DEPLOYMENT_INSTRUCTIONS.md)
   - Check [DOCKER_SETUP_SUMMARY.md](./DOCKER_SETUP_SUMMARY.md)

2. **Prepare Infrastructure**
   - Provision Ubuntu VPS
   - Configure DNS
   - Obtain SSL certificates

3. **Configure Deployment**
   - Copy `.env.production.example` to `.env.production`
   - Update all credentials and API keys
   - Review `nginx.conf` for domain names

4. **Deploy**
   - Run `docker compose build`
   - Run `docker compose up -d`
   - Initialize database
   - Run health check

5. **Verify**
   - Access frontend at your domain
   - Access API documentation
   - Test admin login
   - Verify file uploads

6. **Secure**
   - Configure firewall
   - Set up backups (cron)
   - Enable monitoring
   - Review security settings

## Production Checklist

- [ ] Domain and DNS configured
- [ ] SSL certificates obtained and installed
- [ ] All environment variables configured
- [ ] Database initialized with schema
- [ ] MinIO bucket created
- [ ] Admin user created
- [ ] Automated backups configured
- [ ] Firewall rules configured
- [ ] Monitoring and alerts set up
- [ ] Health checks passing
- [ ] HTTPS working properly
- [ ] Email notifications working
- [ ] Payment processing configured
- [ ] Load testing completed
- [ ] Disaster recovery tested

## Need Help?

1. Check [DEPLOYMENT_INSTRUCTIONS.md](./DEPLOYMENT_INSTRUCTIONS.md) "Troubleshooting"
2. Review logs: `docker compose logs -f`
3. Run health check: `./deployment-scripts/health-check.sh`
4. Check container status: `docker compose ps`
5. Verify environment: `cat .env.production | grep -v "^#"`

## License

WorkMonitor Platform - Phase 8 Docker Deployment
All rights reserved.

---

**Version**: 1.0.0
**Status**: Production Ready
**Last Updated**: 2024-01-02
**Phase**: 8 (Complete Docker Deployment)

Ready to deploy? Start with [DEPLOYMENT_INSTRUCTIONS.md](./DEPLOYMENT_INSTRUCTIONS.md)!
