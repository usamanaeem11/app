# 🚀 WorkMonitor Deployment - Contabo VPS + CloudPanel + N8N

**Your Setup:**
- ✅ Contabo VPS
- ✅ Ubuntu 24.04
- ✅ Domain: workingtracker.com
- ✅ CloudPanel running (MUST NOT TOUCH)
- ✅ N8N with Docker Compose (MUST NOT TOUCH)

---

## 🎯 Deployment Strategy

We'll deploy WorkMonitor **alongside** your existing services:

```
Your VPS (Contabo)
├── CloudPanel (Port 8443) ✅ Keep as-is
├── N8N (Docker) ✅ Keep as-is
└── WorkMonitor (NEW)
    ├── Frontend → CloudPanel Nginx vhost
    └── Backend → Systemd service (Port 8001)
```

**What we'll do:**
- ✅ Use CloudPanel's Nginx to serve frontend
- ✅ Use CloudPanel's reverse proxy for backend API
- ✅ Deploy backend as systemd service (separate from Docker)
- ✅ Use CloudPanel's SSL management
- ✅ Zero interference with existing services

---

## 📋 Prerequisites Check

```bash
# Check CloudPanel is running
sudo systemctl status nginx
# Should show: active (running)

# Check Docker services
docker ps
# Should show N8N and other containers

# Check available disk space
df -h
# Should have at least 5GB free

# Check memory
free -h
# Should have at least 1GB available
```

---

## 🚀 Step 1: Prepare Domain in CloudPanel (5 minutes)

### 1.1 Log into CloudPanel

Open in browser:
```
https://your-vps-ip:8443
```

### 1.2 Create New Site for WorkMonitor

1. **Sites** → **Add Site**
2. Configure:
   - **Domain Name**: `workingtracker.com`
   - **Site Type**: Choose **Static HTML** or **PHP** (we'll customize later)
   - **SSL**: Enable (CloudPanel will use Let's Encrypt)
   - **PHP Version**: Not needed (but select any if required)
3. Click **Create**

### 1.3 Add API Subdomain

1. **Sites** → **Add Site**
2. Configure:
   - **Domain Name**: `api.workingtracker.com`
   - **Site Type**: **Reverse Proxy**
   - **Reverse Proxy URL**: `http://127.0.0.1:8001`
   - **SSL**: Enable
3. Click **Create**

### 1.4 Update DNS (if not already done)

In your domain registrar (or Cloudflare):
```
Type    Name    Value                       TTL
A       @       YOUR_CONTABO_VPS_IP         300
A       www     YOUR_CONTABO_VPS_IP         300
A       api     YOUR_CONTABO_VPS_IP         300
```

Wait 5-10 minutes for DNS propagation.

---

## 🚀 Step 2: Install Python 3.11 (5 minutes)

```bash
# Check current Python version
python3 --version

# If not 3.11+, install it
sudo apt update
sudo apt install -y software-properties-common
sudo add-apt-repository -y ppa:deadsnakes/ppa
sudo apt update
sudo apt install -y python3.11 python3.11-venv python3.11-dev

# Verify installation
python3.11 --version
# Should show: Python 3.11.x
```

---

## 🚀 Step 3: Install Node.js 18+ (5 minutes)

```bash
# Check if Node.js is installed
node --version

# If not 18+, install it
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version  # Should be 20.x
npm --version   # Should be 10.x
```

---

## 🚀 Step 4: Clone Repository (2 minutes)

```bash
# Create application directory (outside CloudPanel paths)
sudo mkdir -p /opt/workmonitor
sudo chown -R $USER:$USER /opt/workmonitor
cd /opt/workmonitor

# Clone your repository
git clone https://github.com/yourusername/workmonitor.git .

# Or if you have the code elsewhere, copy it:
# rsync -av /path/to/your/workmonitor/ /opt/workmonitor/
```

---

## 🚀 Step 5: Configure Environment (5 minutes)

```bash
cd /opt/workmonitor

# Create production environment file
cat > .env.production << 'EOF'
# Supabase Configuration (from your .env file)
VITE_SUPABASE_URL=https://ruvcvaekwqfhpjmzxiqz.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Domain Configuration
API_URL=https://api.workingtracker.com
FRONTEND_URL=https://workingtracker.com
BACKEND_PORT=8001

# Stripe Configuration (get from dashboard.stripe.com)
STRIPE_SECRET_KEY=sk_live_your_key_here
STRIPE_PUBLISHABLE_KEY=pk_live_your_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_secret_here
STRIPE_API_KEY=sk_live_your_key_here

# Security
JWT_SECRET_KEY=REPLACE_WITH_RANDOM_KEY
ALLOWED_ORIGINS=https://workingtracker.com,https://www.workingtracker.com

# Database (using Supabase)
DATABASE_URL=postgresql://postgres:your_password@db.ruvcvaekwqfhpjmzxiqz.supabase.co:5432/postgres

# Environment
ENVIRONMENT=production
DEBUG=False
EOF

# Generate secure JWT secret
JWT_SECRET=$(openssl rand -hex 32)
sed -i "s/REPLACE_WITH_RANDOM_KEY/$JWT_SECRET/" .env.production

# Edit and add your real keys
nano .env.production
# Update:
# - VITE_SUPABASE_ANON_KEY
# - SUPABASE_SERVICE_ROLE_KEY
# - STRIPE_SECRET_KEY
# - STRIPE_PUBLISHABLE_KEY
# - STRIPE_WEBHOOK_SECRET
# - DATABASE_URL (if needed)
```

Save with: **Ctrl+X** → **Y** → **Enter**

---

## 🚀 Step 6: Deploy Backend API (10 minutes)

### 6.1 Install Python Dependencies

```bash
cd /opt/workmonitor

# Create Python virtual environment
python3.11 -m venv venv

# Activate virtual environment
source venv/bin/activate

# Upgrade pip
pip install --upgrade pip

# Install dependencies
cd backend
pip install -r requirements.txt

# Test backend can start
python server.py
# Press Ctrl+C after seeing "Application startup complete"
```

### 6.2 Create Systemd Service

```bash
# Create service file
sudo tee /etc/systemd/system/workmonitor-backend.service > /dev/null << 'EOF'
[Unit]
Description=WorkMonitor Backend API
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/workmonitor/backend
Environment="PATH=/opt/workmonitor/venv/bin"
EnvironmentFile=/opt/workmonitor/.env.production
ExecStart=/opt/workmonitor/venv/bin/python /opt/workmonitor/backend/server.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd
sudo systemctl daemon-reload

# Start backend service
sudo systemctl start workmonitor-backend

# Enable on boot
sudo systemctl enable workmonitor-backend

# Check status
sudo systemctl status workmonitor-backend
# Should show: active (running)

# Test backend
curl http://127.0.0.1:8001/api/
# Should return: {"message":"Working Tracker API v1.0","status":"running"}
```

### 6.3 Check Logs (if issues)

```bash
# View backend logs
sudo journalctl -u workmonitor-backend -f

# View last 50 lines
sudo journalctl -u workmonitor-backend -n 50
```

---

## 🚀 Step 7: Build & Deploy Frontend (10 minutes)

### 7.1 Build React Frontend

```bash
cd /opt/workmonitor/frontend

# Install dependencies
npm install

# Create production .env
cat > .env.production << 'EOF'
REACT_APP_API_URL=https://api.workingtracker.com
REACT_APP_SUPABASE_URL=https://ruvcvaekwqfhpjmzxiqz.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your_anon_key_here
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_live_your_key_here
EOF

# Edit with your real keys
nano .env.production
# Update the keys

# Build for production
npm run build

# Build should create: /opt/workmonitor/frontend/build/
ls -la build/
```

### 7.2 Find CloudPanel Site Path

```bash
# CloudPanel typically uses:
# /home/workingtracker.com/htdocs

# Check your site path in CloudPanel UI:
# Sites → workingtracker.com → click on domain → see "Root Directory"

# Typical path:
SITE_PATH="/home/workingtracker.com/htdocs"

# Verify it exists
ls -la $SITE_PATH
```

### 7.3 Deploy Frontend to CloudPanel

```bash
# Set your CloudPanel site path
SITE_PATH="/home/workingtracker.com/htdocs"

# Backup existing content (if any)
sudo mv $SITE_PATH $SITE_PATH.backup.$(date +%Y%m%d_%H%M%S)

# Create new directory
sudo mkdir -p $SITE_PATH

# Copy built frontend
sudo cp -r /opt/workmonitor/frontend/build/* $SITE_PATH/

# Set correct permissions (CloudPanel uses clp user typically)
sudo chown -R clp:clp $SITE_PATH
sudo chmod -R 755 $SITE_PATH

# Verify files are there
ls -la $SITE_PATH
```

### 7.4 Configure Nginx for React Router (Important!)

CloudPanel's Nginx config needs to support React Router (SPA).

```bash
# Find your site's Nginx config
# Typically in: /etc/nginx/sites-enabled/

# Find the config file
ls -la /etc/nginx/sites-enabled/ | grep workingtracker

# Edit the Nginx config
sudo nano /etc/nginx/sites-enabled/workingtracker.com.conf

# Add this inside the server block for workingtracker.com:
```

Add this configuration:
```nginx
location / {
    try_files $uri $uri/ /index.html;
}

# API proxy (if not already configured)
location /api/ {
    proxy_pass http://127.0.0.1:8001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
}
```

Save: **Ctrl+X** → **Y** → **Enter**

Test and reload Nginx:
```bash
# Test Nginx configuration
sudo nginx -t

# If OK, reload Nginx
sudo systemctl reload nginx
```

---

## 🚀 Step 8: Configure SSL via CloudPanel (2 minutes)

### Option A: Via CloudPanel UI (Easiest)

1. **CloudPanel** → **Sites** → **workingtracker.com**
2. **SSL/TLS** tab
3. Click **Issue Let's Encrypt Certificate**
4. Enter email
5. Include domains:
   - workingtracker.com
   - www.workingtracker.com
6. Click **Issue Certificate**

Repeat for `api.workingtracker.com`.

### Option B: Via Certbot (Command Line)

```bash
# Install certbot if not present
sudo apt install -y certbot python3-certbot-nginx

# Issue certificate (CloudPanel's Nginx)
sudo certbot --nginx -d workingtracker.com -d www.workingtracker.com -d api.workingtracker.com

# Follow prompts
# - Enter email
# - Agree to terms
# - Choose to redirect HTTP to HTTPS
```

---

## 🚀 Step 9: Configure Stripe Webhook (5 minutes)

### 9.1 Create Webhook in Stripe

1. Go to https://dashboard.stripe.com/webhooks
2. Click **Add endpoint**
3. **Endpoint URL**: `https://api.workingtracker.com/api/webhook/stripe`
4. **Events to send**:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Click **Add endpoint**
6. **Copy the Signing Secret** (starts with `whsec_...`)

### 9.2 Update Environment

```bash
# Update .env.production with webhook secret
nano /opt/workmonitor/.env.production

# Update this line:
# STRIPE_WEBHOOK_SECRET=whsec_your_actual_secret_here

# Save: Ctrl+X → Y → Enter

# Restart backend
sudo systemctl restart workmonitor-backend
```

---

## 🚀 Step 10: Configure Firewall (2 minutes)

```bash
# Check if UFW is active
sudo ufw status

# If active, ensure ports are open
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 8443/tcp  # CloudPanel UI
sudo ufw allow 8001/tcp  # WorkMonitor backend (only localhost access needed)

# Actually, block 8001 from outside (only allow localhost)
sudo ufw delete allow 8001/tcp
# Backend should only be accessed via Nginx reverse proxy

# Reload UFW
sudo ufw reload
```

---

## ✅ Step 11: Test Everything (5 minutes)

### 11.1 Test Backend API

```bash
# Test locally
curl http://127.0.0.1:8001/api/
# Should return: {"message":"Working Tracker API v1.0","status":"running"}

# Test via domain
curl https://api.workingtracker.com/api/
# Should return same response
```

### 11.2 Test Frontend

Open in browser:
- https://workingtracker.com
- https://www.workingtracker.com

Should load the WorkMonitor interface.

### 11.3 Test Complete Flow

1. **Sign Up**: Create a new account
2. **Log In**: Sign in with your account
3. **Dashboard**: Should load without errors
4. **Features**: Test time tracking, projects, etc.
5. **Payments**: Try checkout flow (use test card: 4242 4242 4242 4242)

### 11.4 Check Services Status

```bash
# Backend service
sudo systemctl status workmonitor-backend

# Nginx (CloudPanel)
sudo systemctl status nginx

# Docker containers (N8N should still be running)
docker ps
```

---

## 🔧 Verify CloudPanel & N8N Are Untouched

```bash
# Check CloudPanel UI still accessible
curl -k https://your-vps-ip:8443
# Should load CloudPanel

# Check Docker containers still running
docker ps
# Should show N8N and other containers

# Check N8N still accessible
curl http://127.0.0.1:5678
# Or visit your N8N URL
```

---

## 📊 Your Final Architecture

```
Contabo VPS (Ubuntu 24.04)
│
├── CloudPanel (Port 8443) ✅ Unchanged
│   └── Nginx (Ports 80, 443)
│       ├── workingtracker.com → /home/workingtracker.com/htdocs (Frontend)
│       └── api.workingtracker.com → Proxy to 127.0.0.1:8001
│
├── N8N (Docker) ✅ Unchanged
│   └── Running on whatever port you configured
│
└── WorkMonitor Backend (Systemd)
    └── FastAPI on 127.0.0.1:8001
        └── Supabase Database (External)
```

**Everything coexists peacefully!**

---

## 🔧 Maintenance Commands

### Backend Management

```bash
# View logs
sudo journalctl -u workmonitor-backend -f

# Restart backend
sudo systemctl restart workmonitor-backend

# Stop backend
sudo systemctl stop workmonitor-backend

# Start backend
sudo systemctl start workmonitor-backend

# Check status
sudo systemctl status workmonitor-backend
```

### Frontend Updates

```bash
# Rebuild frontend
cd /opt/workmonitor/frontend
npm run build

# Deploy new build
SITE_PATH="/home/workingtracker.com/htdocs"
sudo rm -rf $SITE_PATH/*
sudo cp -r build/* $SITE_PATH/
sudo chown -R clp:clp $SITE_PATH
sudo chmod -R 755 $SITE_PATH
```

### Update Application Code

```bash
# Pull latest code
cd /opt/workmonitor
git pull origin main

# Update backend
cd backend
source ../venv/bin/activate
pip install -r requirements.txt
sudo systemctl restart workmonitor-backend

# Update frontend
cd ../frontend
npm install
npm run build
SITE_PATH="/home/workingtracker.com/htdocs"
sudo rm -rf $SITE_PATH/*
sudo cp -r build/* $SITE_PATH/
sudo chown -R clp:clp $SITE_PATH
```

---

## 🆘 Troubleshooting

### Backend Not Starting

```bash
# Check logs
sudo journalctl -u workmonitor-backend -n 50

# Common issues:
# 1. Port 8001 already in use
sudo netstat -tulpn | grep 8001

# 2. Python environment issues
source /opt/workmonitor/venv/bin/activate
python --version  # Should be 3.11+

# 3. Missing environment variables
cat /opt/workmonitor/.env.production | grep -v "^#"
```

### Frontend 404 Errors

```bash
# Ensure React Router config is in Nginx
sudo nano /etc/nginx/sites-enabled/workingtracker.com.conf

# Must have:
# location / {
#     try_files $uri $uri/ /index.html;
# }

# Test and reload Nginx
sudo nginx -t
sudo systemctl reload nginx
```

### API Not Accessible

```bash
# Check backend is running
curl http://127.0.0.1:8001/api/

# Check Nginx proxy config
sudo nano /etc/nginx/sites-enabled/api.workingtracker.com.conf

# Should have:
# location / {
#     proxy_pass http://127.0.0.1:8001;
#     ...
# }

# Reload Nginx
sudo systemctl reload nginx
```

### SSL Issues

```bash
# Check certificate status via CloudPanel UI
# Or use certbot:
sudo certbot certificates

# Renew if needed
sudo certbot renew

# Reload Nginx
sudo systemctl reload nginx
```

### N8N or CloudPanel Broken?

```bash
# Check Nginx config is valid
sudo nginx -t

# If Nginx config has errors, restore CloudPanel's defaults:
# Go to CloudPanel UI → Sites → Reset Nginx config

# Check Docker is running
sudo systemctl status docker
docker ps

# Restart Docker if needed
sudo systemctl restart docker
```

---

## 🎉 Checklist - You're Done When:

- [ ] Backend service running: `sudo systemctl status workmonitor-backend`
- [ ] Backend API accessible: `curl https://api.workingtracker.com/api/`
- [ ] Frontend loads: https://workingtracker.com
- [ ] SSL certificates valid (green padlock in browser)
- [ ] CloudPanel still accessible: https://your-ip:8443
- [ ] N8N still running: `docker ps` shows N8N container
- [ ] Can sign up / log in to WorkMonitor
- [ ] Payment flow works (test card: 4242 4242 4242 4242)
- [ ] All features functional

---

## 🚀 Next Steps

### 1. Build Desktop App
```bash
cd /opt/workmonitor/desktop-tracker
npm install
npm run build
```
See: `deploy/apps/DESKTOP_BUILD_GUIDE.md`

### 2. Build Mobile Apps
See: `deploy/apps/MOBILE_BUILD_GUIDE.md`

### 3. Build Browser Extensions
```bash
cd /opt/workmonitor/browser-extensions
# Build all extensions
for browser in chrome firefox edge; do
  cd $browser && zip -r ../${browser}-extension.zip * && cd ..
done
```
See: `deploy/apps/EXTENSION_BUILD_GUIDE.md`

### 4. Set Up Monitoring

**Uptime Monitoring** (Free):
- https://uptimerobot.com
- Monitor: https://workingtracker.com and https://api.workingtracker.com/api/

**Error Tracking**:
- https://sentry.io (Free tier)
- Add to frontend and backend

**Analytics**:
- Google Analytics
- Plausible Analytics (privacy-friendly)

### 5. Configure Backups

```bash
# Backend/code backup (automated)
cat > /root/backup-workmonitor.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/root/backups/workmonitor"
mkdir -p $BACKUP_DIR
tar -czf $BACKUP_DIR/workmonitor-$(date +%Y%m%d).tar.gz /opt/workmonitor
# Keep only last 7 backups
find $BACKUP_DIR -name "workmonitor-*.tar.gz" -mtime +7 -delete
EOF

chmod +x /root/backup-workmonitor.sh

# Add to cron (daily at 2 AM)
echo "0 2 * * * /root/backup-workmonitor.sh" | sudo crontab -
```

**Database backups**: Supabase handles this automatically!

---

## 💰 Total Cost

- **Contabo VPS**: ~€5/month (you have this)
- **Domain**: ~$10-15/year (you have this)
- **Supabase**: FREE tier (already configured)
- **CloudPanel**: FREE (already running)
- **Stripe**: FREE (2.9% + $0.30 per transaction)
- **SSL**: FREE (Let's Encrypt via CloudPanel)

**Total: €5/month** (just your VPS cost!)

---

## 📞 Quick Reference

```bash
# View backend logs
sudo journalctl -u workmonitor-backend -f

# Restart services
sudo systemctl restart workmonitor-backend
sudo systemctl reload nginx

# Check everything is running
sudo systemctl status workmonitor-backend nginx
docker ps  # N8N should be here

# Update application
cd /opt/workmonitor && git pull
sudo systemctl restart workmonitor-backend
# Rebuild & redeploy frontend (see Maintenance Commands above)

# CloudPanel UI
https://your-vps-ip:8443

# Your application
https://workingtracker.com
https://api.workingtracker.com/api/
```

---

## ✅ Summary

You now have:
- ✅ WorkMonitor running at workingtracker.com
- ✅ Backend API at api.workingtracker.com
- ✅ CloudPanel still working perfectly
- ✅ N8N still running in Docker
- ✅ All services coexisting peacefully
- ✅ Production-ready SSL certificates
- ✅ Systemd service for auto-restart
- ✅ Zero conflicts with existing setup

**Total setup time**: ~45 minutes
**Cost**: Just your existing VPS (€5/month)

🎉 **You're live at https://workingtracker.com!**
