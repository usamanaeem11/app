# Working Tracker - Deployment Checklist

## Pre-Deployment Setup

### 1. VPS Configuration
- [ ] Ubuntu 22.04 LTS installed
- [ ] Root SSH access configured
- [ ] Minimum 4GB RAM, 50GB storage
- [ ] Public IPv4 address assigned
- [ ] Domain purchased and DNS configured

### 2. Required Accounts
- [ ] Supabase account (database already configured)
- [ ] Domain registrar access
- [ ] SSH key generated for VPS access

## Server Installation

### 3. Install Software
```bash
# Update system
apt update && apt upgrade -y

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Install Python 3.11
apt install -y python3.11 python3.11-venv python3-pip

# Install Nginx
apt install -y nginx

# Install Certbot (SSL)
apt install -y certbot python3-certbot-nginx

# Install Git
apt install -y git

# Configure firewall
apt install -y ufw
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable
```

### 4. Clone Repository
```bash
mkdir -p /var/www/worktracker
cd /var/www/worktracker
git clone <your-repo-url> .
```

### 5. Configure Environment
```bash
# Copy environment template
cp .env.example .env

# Edit environment variables
nano .env

# Update these critical values:
# - VITE_SUPABASE_URL (already set)
# - VITE_SUPABASE_ANON_KEY (already set)
# - BACKEND_URL=https://api.yourdomain.com
# - REACT_APP_BACKEND_URL=https://api.yourdomain.com
# - FRONTEND_URL=https://yourdomain.com
# - JWT_SECRET=<generate_random_secure_string>
```

## Backend Deployment

### 6. Setup Python Backend
```bash
cd /var/www/worktracker/backend

# Create virtual environment
python3.11 -m venv venv

# Activate virtual environment
source venv/bin/activate

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt
```

### 7. Create Backend Service
```bash
# Create systemd service file
nano /etc/systemd/system/worktracker-backend.service
```

**Copy this content:**
```ini
[Unit]
Description=WorkTracker Backend API
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/worktracker/backend
Environment="PATH=/var/www/worktracker/backend/venv/bin"
ExecStart=/var/www/worktracker/backend/venv/bin/python server.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
# Set permissions
chown -R www-data:www-data /var/www/worktracker

# Enable and start
systemctl daemon-reload
systemctl enable worktracker-backend
systemctl start worktracker-backend
systemctl status worktracker-backend
```

## Frontend Deployment

### 8. Build React Frontend
```bash
cd /var/www/worktracker/frontend

# Install dependencies
npm install --legacy-peer-deps

# Build for production
npm run build

# Verify build directory exists
ls -la build/
```

## Nginx Configuration

### 9. Configure Nginx
```bash
# Create site configuration
nano /etc/nginx/sites-available/worktracker
```

**Copy this configuration:**
```nginx
# API Backend
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Frontend
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    root /var/www/worktracker/frontend/build;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /static/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

```bash
# Enable site
ln -s /etc/nginx/sites-available/worktracker /etc/nginx/sites-enabled/

# Remove default
rm /etc/nginx/sites-enabled/default

# Test configuration
nginx -t

# Restart Nginx
systemctl restart nginx
```

### 10. Setup SSL
```bash
# Generate SSL certificates
certbot --nginx -d yourdomain.com -d www.yourdomain.com -d api.yourdomain.com

# Select:
# - Agree to terms
# - Redirect HTTP to HTTPS (option 2)

# Test auto-renewal
certbot renew --dry-run
```

## Verification

### 11. Test Deployment
- [ ] Backend API: `curl https://api.yourdomain.com/health`
- [ ] Frontend: Open `https://yourdomain.com` in browser
- [ ] SSL certificate valid (green lock icon)
- [ ] Can register new account
- [ ] Can login
- [ ] Dashboard loads

### 12. Check Logs
```bash
# Backend logs
journalctl -u worktracker-backend -f

# Nginx logs
tail -f /var/log/nginx/error.log
tail -f /var/log/nginx/access.log
```

## Desktop & Mobile Apps

### 13. Build Desktop Tracker
**On your local development machine:**

```bash
cd desktop-tracker

# Update API URL in main.js
# Change: const apiUrl = process.env.WORKMONITOR_API_URL || 'http://localhost:8001/api'
# To: const apiUrl = process.env.WORKMONITOR_API_URL || 'https://api.yourdomain.com/api'

npm install

# Build for your platform
npm run build:win   # Windows
npm run build:mac   # macOS
npm run build:linux # Linux

# Installers in: desktop-tracker/dist/
```

### 14. Configure Browser Extensions
```bash
# Update API URLs in:
# - browser-extensions/chrome/config.js
# - browser-extensions/firefox/config.js
# - browser-extensions/edge/config.js

# Change API_URL to: 'https://api.yourdomain.com/api'

# Package extensions
cd browser-extensions/chrome
zip -r chrome-extension.zip *

cd ../firefox
zip -r firefox-extension.zip *

cd ../edge
zip -r edge-extension.zip *
```

### 15. Build Mobile App
```bash
cd mobile-app

# Update API URL in App.js
const API_URL = 'https://api.yourdomain.com/api';

npm install

# Build with Expo
expo build:android  # Android
expo build:ios      # iOS (requires Mac)
```

## Post-Deployment

### 16. Security
- [ ] JWT_SECRET changed from default
- [ ] UFW firewall enabled
- [ ] SSL certificates installed and auto-renewing
- [ ] Only ports 22, 80, 443 open
- [ ] Strong root password set
- [ ] SSH key authentication configured

### 17. Monitoring
- [ ] Backend service running: `systemctl status worktracker-backend`
- [ ] Nginx running: `systemctl status nginx`
- [ ] Disk space adequate: `df -h`
- [ ] Memory usage normal: `free -h`

### 18. Backup
- [ ] Database backup enabled in Supabase dashboard
- [ ] .env file backed up securely
- [ ] SSL certificates backed up (auto-renewed by Certbot)

## Quick Commands Reference

```bash
# Restart backend
systemctl restart worktracker-backend

# Restart Nginx
systemctl restart nginx

# View backend logs
journalctl -u worktracker-backend -f

# View Nginx logs
tail -f /var/log/nginx/error.log

# Check SSL renewal
certbot renew --dry-run

# Update application
cd /var/www/worktracker
git pull
systemctl restart worktracker-backend
cd frontend && npm run build
systemctl reload nginx
```

## Deployment Complete!

Your Working Tracker platform is now fully deployed and accessible at:
- **Web App:** https://yourdomain.com
- **API:** https://api.yourdomain.com

Next steps:
1. Create admin account
2. Configure company settings
3. Invite team members
4. Distribute desktop/mobile apps to users
5. Submit browser extensions to stores

---

**Total Deployment Time:** 2-3 hours for web application
**Additional Time:** 1-2 hours for building and distributing apps/extensions
