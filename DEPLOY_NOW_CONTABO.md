# ⚡ Deploy Working Tracker NOW - Contabo + CloudPanel

**Your Setup:**
- ✅ Contabo VPS, Ubuntu 24.04
- ✅ CloudPanel running
- ✅ N8N with Docker
- ✅ Domain: workingtracker.com

**What's New:**
- ✅ Independent PostgreSQL database (no Supabase dependency)
- ✅ Modern professional UI (blue/indigo business theme)
- ✅ Updated Chrome extension design
- ✅ Auto-detects database type (PostgreSQL or Supabase)

**Time**: 60 minutes | **No interference** with CloudPanel or N8N

---

## 🎯 Choose Your Database

You can deploy with either:

1. **Standalone PostgreSQL** (Recommended) - Complete independence, runs on your VPS
2. **Supabase** (Alternative) - Managed database, external service

This guide covers **both options**. Choose one based on your needs.

---

## 🚀 Quick Deploy Commands

Copy-paste these commands in order. **They won't touch CloudPanel or N8N.**

---

### ⚙️ Step 1: Prepare System (10 min)

```bash
# Install Python 3.11
sudo apt update
sudo apt install -y software-properties-common
sudo add-apt-repository -y ppa:deadsnakes/ppa
sudo apt update
sudo apt install -y python3.11 python3.11-venv python3.11-dev

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install build essentials for psycopg2
sudo apt install -y build-essential libpq-dev

# Verify
python3.11 --version
node --version
```

---

### 📦 Step 2: Clone Project (5 min)

```bash
# Clone to /opt (separate from CloudPanel)
sudo mkdir -p /opt/workmonitor
sudo chown -R $USER:$USER /opt/workmonitor
cd /opt/workmonitor

# If you have Git repository:
# git clone https://github.com/yourusername/workmonitor.git .

# Or upload your project files here
# The project structure should be:
# /opt/workmonitor/backend/
# /opt/workmonitor/frontend/
# /opt/workmonitor/deploy/
```

---

## 🗄️ OPTION A: Standalone PostgreSQL (Recommended)

**Advantages**: Complete independence, no external dependencies, better control

### Step 3A: Install & Configure PostgreSQL (15 min)

```bash
cd /opt/workmonitor

# Run automated PostgreSQL setup
chmod +x deploy/scripts/setup-postgres.sh
sudo ./deploy/scripts/setup-postgres.sh
```

**This script will:**
- Install PostgreSQL 16
- Create database: `workmonitor`
- Create user: `workmonitor_user`
- Generate secure password
- Save credentials to: `/opt/workmonitor/postgres-credentials.txt`

**⚠️ SAVE YOUR CREDENTIALS:**
```bash
# View and copy your database credentials
cat /opt/workmonitor/postgres-credentials.txt

# Sample output:
# DATABASE_URL=postgresql://workmonitor_user:ABC123XYZ@localhost:5432/workmonitor
```

### Step 4A: Create Database Schema

```bash
# Apply the database schema
sudo -u postgres psql -d workmonitor -f /opt/workmonitor/deploy/sql/postgres-schema.sql

# Verify tables were created
sudo -u postgres psql -d workmonitor -c "\dt"
# Should show: companies, users, time_entries, screenshots, etc.
```

### Step 5A: Configure Backend for PostgreSQL

```bash
cd /opt/workmonitor

# Create production config with PostgreSQL
cat > .env.production << 'EOF'
# Database Configuration (PostgreSQL)
DATABASE_URL=postgresql://workmonitor_user:YOUR_PASSWORD@localhost:5432/workmonitor

# API Configuration
API_URL=https://api.workingtracker.com
FRONTEND_URL=https://workingtracker.com
BACKEND_PORT=8001

# JWT Configuration
JWT_SECRET=$(openssl rand -hex 32)

# Stripe Configuration (optional - add later)
STRIPE_SECRET_KEY=sk_test_YOUR_KEY
STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_KEY
STRIPE_WEBHOOK_SECRET=whsec_YOUR_KEY

# Application Settings
ALLOWED_ORIGINS=https://workingtracker.com,https://www.workingtracker.com,https://api.workingtracker.com
ENVIRONMENT=production
DEBUG=False
EOF

# Edit and add your DATABASE_URL from postgres-credentials.txt
nano .env.production
# Replace YOUR_PASSWORD with actual password
# Add Stripe keys if you have them
```

**Now skip to Step 6 (Deploy Backend)**

---

## 🗄️ OPTION B: Supabase Database (Alternative)

**Advantages**: Managed service, no maintenance required

### Step 3B: Get Supabase Credentials

1. Go to: https://supabase.com/dashboard
2. Create new project or use existing one
3. Go to **Project Settings** → **API**
4. Copy:
   - Project URL: `https://xxx.supabase.co`
   - Anon/Public Key: `eyJhbG...`

### Step 4B: Apply Supabase Migrations

```bash
cd /opt/workmonitor

# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref YOUR_PROJECT_REF

# Apply migrations
supabase db push
```

### Step 5B: Configure Backend for Supabase

```bash
cd /opt/workmonitor

# Create production config with Supabase
cat > .env.production << 'EOF'
# Database Configuration (Supabase)
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY
VITE_SUPABASE_SUPABASE_ANON_KEY=YOUR_ANON_KEY

# API Configuration
API_URL=https://api.workingtracker.com
FRONTEND_URL=https://workingtracker.com
BACKEND_PORT=8001

# JWT Configuration
JWT_SECRET=$(openssl rand -hex 32)

# Stripe Configuration (optional)
STRIPE_SECRET_KEY=sk_test_YOUR_KEY
STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_KEY
STRIPE_WEBHOOK_SECRET=whsec_YOUR_KEY

# Application Settings
ALLOWED_ORIGINS=https://workingtracker.com,https://www.workingtracker.com,https://api.workingtracker.com
ENVIRONMENT=production
DEBUG=False
EOF

# Edit and add your Supabase credentials
nano .env.production
```

---

### 🔧 Step 6: Deploy Backend (10 min)

```bash
cd /opt/workmonitor

# Create Python virtual environment
python3.11 -m venv venv
source venv/bin/activate

# Install dependencies
cd backend
pip install --upgrade pip
pip install -r requirements.txt

# Test database connection
python -c "from db import get_db; print('✓ Database connected!')"
# Should print: ✓ Database connected!

# Create systemd service
sudo tee /etc/systemd/system/workmonitor-backend.service > /dev/null << 'EOF'
[Unit]
Description=Working Tracker Backend API
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/workmonitor/backend
Environment="PATH=/opt/workmonitor/venv/bin"
EnvironmentFile=/opt/workmonitor/.env.production
ExecStart=/opt/workmonitor/venv/bin/uvicorn server:app --host 0.0.0.0 --port 8001
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Start backend
sudo systemctl daemon-reload
sudo systemctl start workmonitor-backend
sudo systemctl enable workmonitor-backend

# Verify it's running
sudo systemctl status workmonitor-backend

# Test API endpoint
curl http://127.0.0.1:8001/health
# Should return: {"status":"ok"}
```

**Check logs if there are issues:**
```bash
sudo journalctl -u workmonitor-backend -f
```

---

### 🎨 Step 7: Build Frontend (10 min)

```bash
cd /opt/workmonitor/frontend

# Create frontend environment config
cat > .env.production << 'EOF'
REACT_APP_API_URL=https://api.workingtracker.com
EOF

# If using Supabase, add these too:
# REACT_APP_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
# REACT_APP_SUPABASE_ANON_KEY=YOUR_ANON_KEY

# Edit if needed
nano .env.production

# Install dependencies (use legacy-peer-deps for compatibility)
npm install --legacy-peer-deps

# Build for production
npm run build

# Verify build was created
ls -la build/
# Should show: index.html, static/, etc.
```

---

### 🌐 Step 8: Configure CloudPanel (15 min)

#### 8.1 Create Sites in CloudPanel UI

**Open CloudPanel**: `https://your-vps-ip:8443`

**Create Main Website:**
1. Go to **Sites** → **Add Site**
2. **Domain**: `workingtracker.com`
3. **Type**: Static HTML
4. **SSL**: Enable (Let's Encrypt)
5. Click **Create**
6. Wait for SSL certificate

**Create API Subdomain:**
1. Go to **Sites** → **Add Site**
2. **Domain**: `api.workingtracker.com`
3. **Type**: **Reverse Proxy**
4. **Reverse Proxy URL**: `http://127.0.0.1:8001`
5. **SSL**: Enable (Let's Encrypt)
6. Click **Create**
7. Wait for SSL certificate

#### 8.2 Deploy Frontend Files

```bash
# Find your CloudPanel site path
# Usually: /home/DOMAIN/htdocs
SITE_PATH="/home/workingtracker.com/htdocs"

# Verify the path in CloudPanel UI:
# Sites → workingtracker.com → Root Directory

# Backup existing content (if any)
sudo mv $SITE_PATH $SITE_PATH.backup.$(date +%Y%m%d) 2>/dev/null || true

# Create directory
sudo mkdir -p $SITE_PATH

# Deploy built frontend
sudo cp -r /opt/workmonitor/frontend/build/* $SITE_PATH/

# Set correct permissions (clp is CloudPanel user)
sudo chown -R clp:clp $SITE_PATH
sudo chmod -R 755 $SITE_PATH

# Verify deployment
ls -la $SITE_PATH
# Should show: index.html, static/, etc.
```

#### 8.3 Configure Nginx for React Router

```bash
# Find Nginx config file for your site
sudo ls /etc/nginx/sites-enabled/ | grep workingtracker

# Edit the main site config (not the API one)
sudo nano /etc/nginx/sites-enabled/workingtracker.com.conf
```

**Find the `server` block and add inside `location /`:**

```nginx
server {
    # ... existing config ...

    location / {
        root /home/workingtracker.com/htdocs;
        try_files $uri $uri/ /index.html;
        index index.html;
    }

    # ... rest of config ...
}
```

**Save and test:**
```bash
# Test Nginx configuration
sudo nginx -t

# If OK, reload Nginx
sudo systemctl reload nginx
```

---

### 🔒 Step 9: Update DNS (5 min)

**In your domain registrar (Namecheap, GoDaddy) or Cloudflare:**

```
Type    Name    Value                   TTL
A       @       YOUR_CONTABO_IP         300
A       www     YOUR_CONTABO_IP         300
A       api     YOUR_CONTABO_IP         300
```

**Get your Contabo IP:**
```bash
curl ifconfig.me
```

**Wait 5-10 minutes for DNS propagation**

---

### 🎯 Step 10: Configure Stripe Webhook (Optional - 5 min)

If you want payment functionality:

1. Go to: https://dashboard.stripe.com/webhooks
2. Click **Add endpoint**
3. **Endpoint URL**: `https://api.workingtracker.com/api/webhook/stripe`
4. **Events to send**:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Click **Add endpoint**
6. Copy **Signing secret** (starts with `whsec_`)
7. Update configuration:

```bash
# Edit production config
nano /opt/workmonitor/.env.production

# Update these lines:
# STRIPE_SECRET_KEY=sk_live_YOUR_KEY
# STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_KEY
# STRIPE_WEBHOOK_SECRET=whsec_YOUR_SECRET

# Restart backend
sudo systemctl restart workmonitor-backend
```

---

## ✅ Test Everything

### Test Backend

```bash
# Check service status
sudo systemctl status workmonitor-backend

# Test health endpoint
curl https://api.workingtracker.com/health
# Should return: {"status":"ok"}

# Test API root
curl https://api.workingtracker.com/api/
# Should return JSON with app info

# Check backend logs
sudo journalctl -u workmonitor-backend -n 50
```

### Test Frontend

**Open in browser:**
- https://workingtracker.com

**You should see:**
- ✅ Modern blue/indigo gradient design
- ✅ Professional login page
- ✅ Clean white cards with shadows
- ✅ Smooth animations

**Test functionality:**
1. Click "Create account"
2. Register a new account
3. Verify you can log in
4. Check dashboard loads with modern UI
5. Test timer start/stop

### Test Database

**For PostgreSQL:**
```bash
# Check database size
sudo -u postgres psql -c "SELECT pg_size_pretty(pg_database_size('workmonitor'));"

# Check active connections
sudo -u postgres psql -c "SELECT count(*) FROM pg_stat_activity WHERE datname='workmonitor';"

# View tables
sudo -u postgres psql -d workmonitor -c "\dt"
```

**For Supabase:**
- Check Supabase dashboard
- View table editor
- Check API logs

### Verify Other Services

```bash
# Check CloudPanel still works
curl -k https://your-vps-ip:8443
# Should return CloudPanel login page

# Check N8N still running
docker ps | grep n8n
# Should show n8n container

# Check Nginx
sudo systemctl status nginx

# Check all services
sudo systemctl status workmonitor-backend nginx
```

---

## ✅ Verification Checklist

**Backend:**
- [ ] Service running: `sudo systemctl status workmonitor-backend`
- [ ] Health check works: `curl https://api.workingtracker.com/health`
- [ ] Database connected (check logs)
- [ ] No errors in logs: `sudo journalctl -u workmonitor-backend -n 50`

**Frontend:**
- [ ] Website loads: https://workingtracker.com
- [ ] SSL working (green padlock)
- [ ] Modern blue/indigo UI visible
- [ ] Login page displays correctly
- [ ] Can register new account
- [ ] Can log in
- [ ] Dashboard loads with data
- [ ] Timer works

**Infrastructure:**
- [ ] CloudPanel accessible: https://your-ip:8443
- [ ] N8N running: `docker ps`
- [ ] DNS resolves: `nslookup workingtracker.com`
- [ ] All subdomains work

**Database:**
- [ ] PostgreSQL running (if used): `sudo systemctl status postgresql`
- [ ] Tables exist
- [ ] Can insert/query data

---

## 🔧 Essential Commands

### Backend Management

```bash
# View real-time logs
sudo journalctl -u workmonitor-backend -f

# Restart backend
sudo systemctl restart workmonitor-backend

# Stop backend
sudo systemctl stop workmonitor-backend

# Start backend
sudo systemctl start workmonitor-backend

# Check status
sudo systemctl status workmonitor-backend

# View last 100 log lines
sudo journalctl -u workmonitor-backend -n 100
```

### Frontend Updates

```bash
# Rebuild frontend after changes
cd /opt/workmonitor/frontend
npm run build

# Redeploy to CloudPanel
sudo cp -r build/* /home/workingtracker.com/htdocs/
sudo chown -R clp:clp /home/workingtracker.com/htdocs
```

### Database Management (PostgreSQL)

```bash
# Create backup
sudo -u postgres pg_dump workmonitor > ~/workmonitor_backup_$(date +%Y%m%d).sql

# Restore backup
sudo -u postgres psql workmonitor < ~/workmonitor_backup.sql

# Access database
sudo -u postgres psql -d workmonitor

# View database size
sudo -u postgres psql -c "SELECT pg_size_pretty(pg_database_size('workmonitor'));"

# Check connections
sudo -u postgres psql -c "SELECT count(*) FROM pg_stat_activity WHERE datname='workmonitor';"
```

### Nginx Management

```bash
# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx

# Restart Nginx
sudo systemctl restart nginx

# Check status
sudo systemctl status nginx

# View error logs
sudo tail -f /var/log/nginx/error.log
```

---

## 🆘 Troubleshooting Guide

### Backend Won't Start

**Symptoms**: Service fails to start or crashes immediately

**Solutions**:

```bash
# Check logs for errors
sudo journalctl -u workmonitor-backend -n 100

# Common issues:

# 1. Missing environment variables
cat /opt/workmonitor/.env.production
# Verify DATABASE_URL or Supabase credentials are set

# 2. Database connection failed
python -c "from db import get_db; print(get_db())"
# Should not error

# 3. Port already in use
sudo lsof -i :8001
# If something else is using port 8001, change BACKEND_PORT

# 4. Python dependencies missing
cd /opt/workmonitor/backend
source /opt/workmonitor/venv/bin/activate
pip install -r requirements.txt

# 5. File permissions
sudo chown -R $USER:$USER /opt/workmonitor
```

### Frontend Shows Blank Page

**Symptoms**: Website loads but shows blank white page

**Solutions**:

```bash
# 1. Check browser console (F12)
# Look for CORS errors, API connection errors, or JavaScript errors

# 2. Verify API URL
cat /opt/workmonitor/frontend/.env.production
# Should have correct REACT_APP_API_URL

# 3. Rebuild frontend
cd /opt/workmonitor/frontend
npm run build
sudo cp -r build/* /home/workingtracker.com/htdocs/

# 4. Check Nginx try_files
sudo nano /etc/nginx/sites-enabled/workingtracker.com.conf
# Should have: try_files $uri $uri/ /index.html;

# 5. Clear browser cache
# Or test in incognito mode
```

### API Returns 502 Bad Gateway

**Symptoms**: API subdomain shows 502 error

**Solutions**:

```bash
# 1. Check backend is running
sudo systemctl status workmonitor-backend
curl http://127.0.0.1:8001/health

# 2. Check Nginx reverse proxy config
sudo nano /etc/nginx/sites-enabled/api.workingtracker.com.conf
# Verify: proxy_pass http://127.0.0.1:8001;

# 3. Restart services
sudo systemctl restart workmonitor-backend
sudo systemctl reload nginx

# 4. Check firewall
sudo ufw status
# Port 8001 should not be publicly exposed
```

### Database Connection Errors

**For PostgreSQL**:

```bash
# 1. Check PostgreSQL is running
sudo systemctl status postgresql

# 2. Test connection
sudo -u postgres psql -d workmonitor -c "SELECT 1;"

# 3. Check credentials
cat /opt/workmonitor/postgres-credentials.txt
# Verify DATABASE_URL matches .env.production

# 4. Check user permissions
sudo -u postgres psql -c "\du workmonitor_user"

# 5. View PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-*.log
```

**For Supabase**:

```bash
# 1. Verify credentials
cat /opt/workmonitor/.env.production
# Check VITE_SUPABASE_URL and keys

# 2. Test connection from Python
python3 << EOF
from supabase import create_client
import os
url = "YOUR_SUPABASE_URL"
key = "YOUR_ANON_KEY"
client = create_client(url, key)
print("Connected!")
EOF

# 3. Check Supabase dashboard for:
#    - Project status
#    - API settings
#    - Database health
```

### SSL Certificate Issues

**Symptoms**: Browser shows "Not Secure" or certificate errors

**Solutions**:

```bash
# 1. Check SSL certificate status in CloudPanel
# Sites → Your Site → SSL/TLS

# 2. Renew Let's Encrypt certificate
sudo certbot renew --dry-run
sudo certbot renew

# 3. Reload Nginx
sudo systemctl reload nginx

# 4. Check certificate files
sudo ls -la /etc/letsencrypt/live/workingtracker.com/
```

### Routes Return 404

**Symptoms**: Direct URLs like /dashboard return 404

**Solution**:

```bash
# Add React Router support to Nginx
sudo nano /etc/nginx/sites-enabled/workingtracker.com.conf

# Add in location block:
location / {
    try_files $uri $uri/ /index.html;
}

# Test and reload
sudo nginx -t && sudo systemctl reload nginx
```

---

## 📊 System Architecture

```
Contabo VPS (Ubuntu 24.04)
├── CloudPanel (Port 8443) ✅ Untouched
│   ├── Nginx (Ports 80, 443)
│   │   ├── workingtracker.com → Frontend files
│   │   └── api.workingtracker.com → Reverse Proxy → Backend
│   └── SSL Certificates (Let's Encrypt)
│
├── N8N (Docker) ✅ Untouched
│
├── Working Tracker
│   ├── Backend
│   │   ├── FastAPI/Uvicorn (Port 8001)
│   │   ├── Location: /opt/workmonitor/backend
│   │   ├── Service: workmonitor-backend.service
│   │   └── Logs: journalctl -u workmonitor-backend
│   │
│   ├── Frontend
│   │   ├── React Build (Static files)
│   │   ├── Location: /home/workingtracker.com/htdocs
│   │   └── Served by: Nginx
│   │
│   └── Database (Choose one)
│       ├── Option A: PostgreSQL (Port 5432)
│       │   ├── Location: Localhost
│       │   ├── Database: workmonitor
│       │   ├── User: workmonitor_user
│       │   └── Service: postgresql.service
│       │
│       └── Option B: Supabase
│           ├── Location: External cloud
│           └── Connection: HTTPS API
│
└── Python Environment
    └── /opt/workmonitor/venv
```

**Everything coexists perfectly!**

---

## 🎨 UI Design Updates

Your application now features a modern, professional design:

### Design System

**Colors:**
- Primary: Blue 600 (#3b82f6) → Indigo 600 (#6366f1) gradients
- Background: White with Slate 50-100 accents
- Text: Slate 900 primary, Slate 600 secondary
- Borders: Slate 200-300
- Shadows: Subtle elevation with blur

**Components:**
- White cards with rounded corners (rounded-xl, rounded-2xl)
- Gradient buttons with shadow effects
- Smooth hover transitions
- Professional stat cards with icon badges
- Clean form inputs with focus states
- Modern charts with gradient bars

**Typography:**
- System font stack (Apple System, Segoe UI, Roboto)
- Bold headings (text-3xl, font-bold)
- Medium body text (text-base, font-medium)
- Consistent spacing and hierarchy

### Updated Pages

- **Login/Signup**: Gradient background, white cards, modern forms
- **Dashboard**: White layout, gradient stats, professional charts
- **Marketing Home**: Bold headlines, gradient CTAs, trust badges
- **Chrome Extension**: Light theme, blue gradients, modern popup

---

## 📚 Additional Documentation

**Detailed Guides:**
- Full deployment: `deploy/CONTABO_CLOUDPANEL_DEPLOYMENT.md`
- PostgreSQL setup: `SETUP_POSTGRES_GUIDE.md`
- Complete guide: `DEPLOYMENT_COMPLETE.md`

**App Builds:**
- Desktop app: `deploy/apps/DESKTOP_BUILD_GUIDE.md`
- Mobile apps: `deploy/apps/MOBILE_BUILD_GUIDE.md`
- Browser extensions: `deploy/apps/EXTENSION_BUILD_GUIDE.md`

**Database:**
- PostgreSQL schema: `deploy/sql/postgres-schema.sql`
- Supabase migrations: `supabase/migrations/`

---

## 🔐 Security Checklist

**Before going live:**

- [ ] Change all default passwords
- [ ] Use strong JWT_SECRET (not default)
- [ ] Enable firewall: `sudo ufw enable`
- [ ] Close unnecessary ports
- [ ] Set up fail2ban: `sudo apt install fail2ban`
- [ ] Regular backups configured
- [ ] SSL certificates auto-renewing
- [ ] Update packages: `sudo apt update && sudo apt upgrade`
- [ ] Secure PostgreSQL password (if used)
- [ ] Environment files not in Git
- [ ] CORS properly configured
- [ ] Rate limiting enabled (optional)

**PostgreSQL Security:**
```bash
# Only listen on localhost (should be default)
sudo nano /etc/postgresql/*/main/postgresql.conf
# Verify: listen_addresses = 'localhost'

# Restart PostgreSQL
sudo systemctl restart postgresql
```

---

## 🔄 Maintenance Tasks

### Daily

```bash
# Check service status
sudo systemctl status workmonitor-backend

# Check error logs
sudo journalctl -u workmonitor-backend --since today | grep -i error

# Check disk space
df -h
```

### Weekly

```bash
# Backup database (PostgreSQL)
sudo -u postgres pg_dump workmonitor > ~/backups/workmonitor_$(date +%Y%m%d).sql

# Update system packages
sudo apt update && sudo apt upgrade -y

# Check SSL certificate expiry
sudo certbot certificates

# Review backend logs
sudo journalctl -u workmonitor-backend --since "7 days ago" | tail -100
```

### Monthly

```bash
# Update Node dependencies
cd /opt/workmonitor/frontend
npm audit
npm update

# Update Python dependencies
cd /opt/workmonitor/backend
source /opt/workmonitor/venv/bin/activate
pip list --outdated

# Vacuum PostgreSQL database (if used)
sudo -u postgres psql -d workmonitor -c "VACUUM ANALYZE;"

# Check system resources
free -h
top -bn1 | head -20
```

---

## 💾 Backup Strategy

### Automated Daily Backups

```bash
# Create backup script
sudo mkdir -p /opt/backups/scripts
sudo nano /opt/backups/scripts/backup-workmonitor.sh
```

**Add this content:**

```bash
#!/bin/bash
BACKUP_DIR="/opt/backups/workmonitor"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup PostgreSQL database (if used)
if systemctl is-active --quiet postgresql; then
    sudo -u postgres pg_dump workmonitor | gzip > "$BACKUP_DIR/db_$DATE.sql.gz"
fi

# Backup environment files
cp /opt/workmonitor/.env.production "$BACKUP_DIR/env_$DATE"

# Keep only last 7 days of backups
find $BACKUP_DIR -name "db_*.sql.gz" -mtime +7 -delete
find $BACKUP_DIR -name "env_*" -mtime +7 -delete

echo "Backup completed: $DATE"
```

**Make executable and schedule:**

```bash
sudo chmod +x /opt/backups/scripts/backup-workmonitor.sh

# Add to crontab (daily at 2 AM)
(crontab -l 2>/dev/null; echo "0 2 * * * /opt/backups/scripts/backup-workmonitor.sh") | crontab -
```

---

## 🎉 Deployment Complete!

**Your Working Tracker is now live at**: https://workingtracker.com

### What You Have

✅ Independent PostgreSQL database (or Supabase)
✅ Modern professional UI with blue/indigo theme
✅ Secure backend API with authentication
✅ SSL certificates on all domains
✅ Production-ready systemd services
✅ CloudPanel and N8N untouched
✅ Automated monitoring and logging

### What's Next

**For Users:**
1. Create admin account
2. Add team members
3. Install browser extension
4. Download desktop app (optional)
5. Configure company settings

**For Stripe Payments:**
1. Add Stripe keys to `.env.production`
2. Configure webhook endpoint
3. Test payment flow
4. Switch to live keys when ready

**For Mobile Apps:**
1. Build Android app: `deploy/apps/MOBILE_BUILD_GUIDE.md`
2. Build iOS app: Follow same guide
3. Submit to app stores

**For Extensions:**
1. Package Chrome extension
2. Submit to Chrome Web Store
3. Package for Firefox and Edge

### Support

Need help? Check:
- Logs: `sudo journalctl -u workmonitor-backend -f`
- Troubleshooting section above
- Full docs: `DEPLOYMENT_COMPLETE.md`

---

## 🚀 Start Serving Customers!

**Your monthly costs:**
- VPS: €5-15/month (Contabo)
- Domain: €10/year
- **Total: ~€6-16/month**

No Supabase fees if using PostgreSQL!

**You now have a production-ready, scalable employee monitoring platform!**

🎊 Congratulations!
