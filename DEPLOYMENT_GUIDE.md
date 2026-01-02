# Working Tracker - Complete Deployment Guide for Contabo VPS

## Overview
This guide walks you through deploying the complete Working Tracker platform on a Contabo VPS with:
- **Web Application** (Frontend + Backend)
- **Desktop Tracker App** (Windows, Mac, Linux)
- **Browser Extensions** (Chrome, Firefox, Edge)
- **Mobile App** (iOS & Android)

## Prerequisites

### Contabo VPS Requirements
- **RAM:** Minimum 4GB (8GB recommended)
- **Storage:** Minimum 50GB SSD
- **OS:** Ubuntu 22.04 LTS
- **Network:** Public IPv4 address
- **Domain:** A domain name pointing to your VPS IP

### Required Accounts
- Supabase account (already configured in this project)
- Domain name with DNS access
- SSL certificate (Let's Encrypt - free)

---

## Part 1: VPS Setup & Prerequisites

### Step 1.1: Initial VPS Access
```bash
# SSH into your Contabo VPS
ssh root@your-vps-ip

# Update system
apt update && apt upgrade -y

# Set timezone
timedatectl set-timezone America/New_York  # Change to your timezone
```

### Step 1.2: Install Required Software
```bash
# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Install Python 3.11
apt install -y python3.11 python3.11-venv python3-pip

# Install Nginx
apt install -y nginx

# Install Certbot for SSL
apt install -y certbot python3-certbot-nginx

# Install Git
apt install -y git

# Verify installations
node --version    # Should show v20.x
python3 --version # Should show 3.11
nginx -v         # Should show nginx version
```

### Step 1.3: Configure Firewall
```bash
# Install and configure UFW
apt install -y ufw

# Allow SSH, HTTP, and HTTPS
ufw allow OpenSSH
ufw allow 'Nginx Full'

# Enable firewall
ufw enable
ufw status
```

---

## Part 2: Deploy Backend (FastAPI Python)

### Step 2.1: Create Application Directory
```bash
# Create directory structure
mkdir -p /var/www/worktracker
cd /var/www/worktracker

# Clone your repository
git clone <your-repo-url> .
# OR upload files via SFTP
```

### Step 2.2: Configure Environment Variables
```bash
# Copy and edit .env file
cp .env.example .env
nano .env

# Update these values:
# VITE_SUPABASE_URL=<your_supabase_url>
# VITE_SUPABASE_ANON_KEY=<your_supabase_anon_key>
# BACKEND_URL=https://api.yourdomain.com
# REACT_APP_BACKEND_URL=https://api.yourdomain.com
# FRONTEND_URL=https://yourdomain.com
# JWT_SECRET=<generate_random_secure_key>

# Save and exit (Ctrl+X, Y, Enter)
```

### Step 2.3: Setup Python Backend
```bash
# Navigate to backend directory
cd /var/www/worktracker/backend

# Create virtual environment
python3.11 -m venv venv

# Activate virtual environment
source venv/bin/activate

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt

# Test backend
python server.py
# Press Ctrl+C to stop
```

### Step 2.4: Create Systemd Service for Backend
```bash
# Create service file
nano /etc/systemd/system/worktracker-backend.service
```

**Add this content:**
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

# Enable and start service
systemctl daemon-reload
systemctl enable worktracker-backend
systemctl start worktracker-backend

# Check status
systemctl status worktracker-backend
```

---

## Part 3: Deploy Frontend (React)

### Step 3.1: Build React Frontend
```bash
# Navigate to frontend directory
cd /var/www/worktracker/frontend

# Install dependencies
npm install

# Build for production
npm run build

# Build output will be in: /var/www/worktracker/frontend/build
```

---

## Part 4: Configure Nginx

### Step 4.1: Create Nginx Configuration
```bash
# Create site configuration
nano /etc/nginx/sites-available/worktracker
```

**Add this content:**
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

# Remove default site
rm /etc/nginx/sites-enabled/default

# Test configuration
nginx -t

# Restart Nginx
systemctl restart nginx
```

### Step 4.2: Setup SSL with Let's Encrypt
```bash
# Generate SSL certificates
certbot --nginx -d yourdomain.com -d www.yourdomain.com -d api.yourdomain.com

# Follow prompts and select:
# - Agree to terms
# - Redirect HTTP to HTTPS (option 2)

# Test auto-renewal
certbot renew --dry-run
```

---

## Part 5: Verify Deployment

### Step 5.1: Test Backend API
```bash
# Test API health
curl https://api.yourdomain.com/health

# Should return: {"status":"healthy"}
```

### Step 5.2: Test Frontend
```bash
# Open in browser
https://yourdomain.com

# You should see the login page
```

### Step 5.3: Check Logs
```bash
# Backend logs
journalctl -u worktracker-backend -f

# Nginx logs
tail -f /var/log/nginx/error.log
tail -f /var/log/nginx/access.log
```

---

## Part 6: Desktop Tracker App

### Step 6.1: Build Desktop App Locally
**On your development machine (Windows/Mac/Linux):**

```bash
# Navigate to desktop tracker directory
cd desktop-tracker

# Install dependencies
npm install

# Build for your platform
npm run build:win   # Windows
npm run build:mac   # MacOS
npm run build:linux # Linux

# Installers will be in: desktop-tracker/dist/
```

### Step 6.2: Configure Desktop App
Before building, update the API URL:

```bash
# Edit desktop-tracker/main.js
# Change API_URL to your production URL:
const API_URL = 'https://api.yourdomain.com';
```

### Step 6.3: Distribute Desktop App
- Upload installers to your website
- Users download and install
- Users enter their credentials to connect to your server

---

## Part 7: Browser Extensions

### Step 7.1: Configure Extensions
Before submitting to stores, update the API URL in each extension:

**Chrome Extension:**
```bash
# Edit: browser-extensions/chrome/config.js
const API_URL = 'https://api.yourdomain.com';
```

**Firefox Extension:**
```bash
# Edit: browser-extensions/firefox/config.js
const API_URL = 'https://api.yourdomain.com';
```

**Edge Extension:**
```bash
# Edit: browser-extensions/edge/config.js
const API_URL = 'https://api.yourdomain.com';
```

### Step 7.2: Package Extensions
```bash
# Chrome/Edge
cd browser-extensions/chrome
zip -r chrome-extension.zip *

# Firefox
cd browser-extensions/firefox
zip -r firefox-extension.zip *
```

### Step 7.3: Submit to Stores
- **Chrome Web Store:** https://chrome.google.com/webstore/devconsole
- **Firefox Add-ons:** https://addons.mozilla.org/developers/
- **Edge Add-ons:** https://partner.microsoft.com/dashboard/microsoftedge

---

## Part 8: Mobile App

### Step 8.1: Setup React Native Environment
**Prerequisites:**
- Node.js installed
- Expo CLI: `npm install -g expo-cli`
- Expo account: https://expo.dev

### Step 8.2: Configure Mobile App
```bash
# Navigate to mobile app directory
cd mobile-app

# Install dependencies
npm install

# Update API URL in App.js
const API_URL = 'https://api.yourdomain.com';
```

### Step 8.3: Build Mobile App
```bash
# Login to Expo
expo login

# Build for Android
expo build:android

# Build for iOS (requires Mac)
expo build:ios

# Follow Expo prompts
```

### Step 8.4: Publish to Stores
- **Google Play Store:** Upload APK/AAB
- **Apple App Store:** Upload IPA (requires Mac + Apple Developer Account)

---

## Part 9: Maintenance & Updates

### Step 9.1: Update Application
```bash
# Pull latest code
cd /var/www/worktracker
git pull

# Update backend
cd backend
source venv/bin/activate
pip install -r requirements.txt
systemctl restart worktracker-backend

# Update frontend
cd ../frontend
npm install
npm run build
systemctl reload nginx
```

### Step 9.2: Database Backups (Supabase handles this automatically)
Supabase provides automatic backups. You can also export manually:
- Go to Supabase Dashboard
- Navigate to Database → Backups
- Click "Export" to download

### Step 9.3: Monitor System
```bash
# Check disk space
df -h

# Check memory usage
free -h

# Check backend status
systemctl status worktracker-backend

# Check Nginx status
systemctl status nginx
```

---

## Part 10: Troubleshooting

### Backend won't start
```bash
# Check logs
journalctl -u worktracker-backend -n 50

# Common issues:
# - Port 8001 already in use: netstat -tulpn | grep 8001
# - Permission issues: chown -R www-data:www-data /var/www/worktracker
# - Missing dependencies: pip install -r requirements.txt
```

### Frontend shows blank page
```bash
# Check Nginx error logs
tail -f /var/log/nginx/error.log

# Rebuild frontend
cd /var/www/worktracker/frontend
npm run build
systemctl reload nginx
```

### SSL certificate issues
```bash
# Renew certificates
certbot renew --force-renewal

# Restart Nginx
systemctl restart nginx
```

### Desktop app can't connect
- Check firewall allows port 443 (HTTPS)
- Verify API URL is correct in desktop app
- Check backend is running: `systemctl status worktracker-backend`

---

## Security Best Practices

1. **Change default JWT secret** in `.env` file
2. **Enable UFW firewall** and only allow necessary ports
3. **Keep system updated:** `apt update && apt upgrade` weekly
4. **Monitor logs** regularly for suspicious activity
5. **Use strong passwords** for all accounts
6. **Backup database** regularly (Supabase does this automatically)
7. **Enable 2FA** on your VPS provider account

---

## Support & Resources

- **Supabase Dashboard:** https://supabase.com/dashboard
- **Domain DNS:** Configure A records to point to VPS IP
- **SSL Certificate:** Auto-renews via Let's Encrypt

---

## Summary Checklist

- [ ] VPS set up with Ubuntu 22.04
- [ ] Node.js, Python, Nginx installed
- [ ] Repository cloned to `/var/www/worktracker`
- [ ] Environment variables configured
- [ ] Backend running as systemd service
- [ ] Frontend built and served by Nginx
- [ ] SSL certificates installed
- [ ] Domain pointing to VPS IP
- [ ] Web app accessible at `https://yourdomain.com`
- [ ] API accessible at `https://api.yourdomain.com`
- [ ] Desktop app built and configured
- [ ] Browser extensions configured and packaged
- [ ] Mobile app built with Expo

**Your Working Tracker platform is now fully deployed and ready for production use!**
