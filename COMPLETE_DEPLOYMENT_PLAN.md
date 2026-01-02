# 🚀 Complete Working Tracker Deployment Plan for Contabo VPS

**Your Setup:**
- Contabo VPS with CloudPanel
- N8N with Docker + Docker Compose
- Ubuntu OS
- GitHub SSH Key: SHA256:MI52rYLKv7OJZxvWOU43Ri++ShOv89rCz0Y0JhFTx6c

**What You'll Deploy:**
1. ✅ Web Application (Frontend + Backend)
2. ✅ Browser Extensions (Chrome, Firefox, Edge)
3. ✅ Desktop Tracker App
4. ✅ Mobile App (React Native)

---

## 📋 Pre-Deployment Checklist

### ☑️ 1. Verify Your GitHub SSH Key

```bash
# SSH into your Contabo VPS
ssh root@your-vps-ip

# Verify SSH key is configured
ssh -T git@github.com
# Should return: "Hi username! You've successfully authenticated..."

# If not configured, add your SSH key:
cat ~/.ssh/id_rsa.pub
# Copy this and add to GitHub → Settings → SSH Keys
```

### ☑️ 2. Verify CloudPanel Setup

```bash
# Check CloudPanel is running
systemctl status nginx
systemctl status mysql

# Note your CloudPanel URL
echo "CloudPanel: https://your-vps-ip:8443"
```

### ☑️ 3. Prepare Environment Variables

**You'll need:**
- ✅ Supabase Project URL (already configured)
- ✅ Supabase Anon Key (already configured)
- ✅ Supabase Service Role Key (already configured)
- ✅ Stripe Secret Key (already integrated)
- ✅ JWT Secret (generate one)
- ✅ Your domain name (e.g., worktracker.yourdomain.com)

---

## 🎯 Part 1: Deploy Web Application (Frontend + Backend)

### Step 1.1: Create Site in CloudPanel

1. **Access CloudPanel:**
   ```
   https://your-vps-ip:8443
   ```

2. **Add New Site:**
   - Click "Sites" → "Add Site"
   - Site Type: **Generic Application (Node.js)**
   - Domain Name: `worktracker.yourdomain.com`
   - Site User: `worktracker`
   - Click "Create"

3. **Enable SSL:**
   - Go to Site → SSL/TLS
   - Click "Let's Encrypt" → Issue Certificate

### Step 1.2: Clone Repository

```bash
# SSH into your VPS
ssh root@your-vps-ip

# Navigate to CloudPanel sites directory
cd /home/worktracker/htdocs/worktracker.yourdomain.com

# Remove default files
rm -rf *

# Clone your repository
git clone git@github.com:yourusername/working-tracker.git .

# Verify files are cloned
ls -la
# Should show: backend/, frontend/, browser-extensions/, etc.
```

### Step 1.3: Configure Environment Variables

```bash
# Create production environment file
cat > .env.production << 'EOF'
# Database Configuration (Supabase)
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
DATABASE_URL=postgresql://user:pass@host:5432/dbname

# JWT Configuration
JWT_SECRET=your_jwt_secret_here_min_32_chars_random
JWT_ALGORITHM=HS256
JWT_EXPIRATION_MINUTES=43200

# Stripe Configuration (Already Integrated - DO NOT REMOVE)
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# API Configuration
API_URL=https://worktracker.yourdomain.com/api
FRONTEND_URL=https://worktracker.yourdomain.com

# Node Environment
NODE_ENV=production
PORT=3000
BACKEND_PORT=8001

# CORS Origins (CloudPanel domain)
CORS_ORIGINS=https://worktracker.yourdomain.com,https://www.worktracker.yourdomain.com
EOF

# Secure the file
chmod 600 .env.production
```

### Step 1.4: Install Backend Dependencies

```bash
cd /home/worktracker/htdocs/worktracker.yourdomain.com

# Install Python 3.11 if not available
apt update
apt install -y python3.11 python3.11-venv python3.11-dev

# Create virtual environment
python3.11 -m venv venv
source venv/bin/activate

# Upgrade pip
pip install --upgrade pip setuptools wheel

# Install backend dependencies
cd backend
pip install -r requirements.txt

# If you get dependency conflicts, use:
# pip install --use-deprecated=legacy-resolver -r requirements.txt

# Test database connection
python -c "from db import get_db; print('✅ Database connected successfully!')"
```

### Step 1.5: Create Backend Service

```bash
# Create systemd service for backend
sudo tee /etc/systemd/system/worktracker-backend.service > /dev/null << 'EOF'
[Unit]
Description=Working Tracker Backend API
After=network.target

[Service]
Type=simple
User=worktracker
WorkingDirectory=/home/worktracker/htdocs/worktracker.yourdomain.com/backend
Environment="PATH=/home/worktracker/htdocs/worktracker.yourdomain.com/venv/bin"
EnvironmentFile=/home/worktracker/htdocs/worktracker.yourdomain.com/.env.production
ExecStart=/home/worktracker/htdocs/worktracker.yourdomain.com/venv/bin/uvicorn server:app --host 127.0.0.1 --port 8001 --workers 4
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Set correct ownership
chown -R worktracker:worktracker /home/worktracker/htdocs/worktracker.yourdomain.com

# Start and enable service
systemctl daemon-reload
systemctl start worktracker-backend
systemctl enable worktracker-backend

# Verify backend is running
systemctl status worktracker-backend

# Test API endpoint
curl http://127.0.0.1:8001/health
# Should return: {"status":"ok"}
```

### Step 1.6: Build and Deploy Frontend

```bash
cd /home/worktracker/htdocs/worktracker.yourdomain.com/frontend

# Install Node.js 20 LTS (if not installed)
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Verify Node and npm
node --version  # Should be v20.x
npm --version   # Should be 10.x

# Create frontend environment file
cat > .env.production << 'EOF'
REACT_APP_API_URL=https://worktracker.yourdomain.com/api
REACT_APP_SUPABASE_URL=your_supabase_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
REACT_APP_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
EOF

# Install dependencies
npm install

# Build production bundle
npm run build

# Verify build succeeded
ls -lh build/
# Should show static/, index.html, etc.
```

### Step 1.7: Configure Nginx in CloudPanel

```bash
# Create nginx configuration
sudo tee /etc/nginx/sites-available/worktracker.conf > /dev/null << 'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name worktracker.yourdomain.com www.worktracker.yourdomain.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name worktracker.yourdomain.com www.worktracker.yourdomain.com;

    # SSL Configuration (CloudPanel manages these)
    ssl_certificate /etc/letsencrypt/live/worktracker.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/worktracker.yourdomain.com/privkey.pem;

    # Frontend - Serve React app
    location / {
        root /home/worktracker/htdocs/worktracker.yourdomain.com/frontend/build;
        try_files $uri $uri/ /index.html;

        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Backend API - Proxy to Python backend
    location /api {
        proxy_pass http://127.0.0.1:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Timeouts for long-running requests
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # WebSocket support for real-time features
    location /socket.io {
        proxy_pass http://127.0.0.1:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    # Max upload size (for screenshots/recordings)
    client_max_body_size 100M;
}
EOF

# Enable site
ln -s /etc/nginx/sites-available/worktracker.conf /etc/nginx/sites-enabled/

# Test nginx configuration
nginx -t

# Reload nginx
systemctl reload nginx
```

### Step 1.8: Verify Web Application

```bash
# Check backend
curl http://127.0.0.1:8001/health

# Check frontend (from browser)
# Visit: https://worktracker.yourdomain.com

# Check logs
sudo journalctl -u worktracker-backend -f
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

---

## 🧩 Part 2: Deploy Browser Extensions

### Step 2.1: Configure Extension Backend URL

```bash
cd /home/worktracker/htdocs/worktracker.yourdomain.com/browser-extensions

# Create config file
cat > config.js << 'EOF'
const CONFIG = {
  API_URL: 'https://worktracker.yourdomain.com/api',
  WS_URL: 'wss://worktracker.yourdomain.com/socket.io',
  APP_NAME: 'Working Tracker',
  VERSION: '1.0.0'
};

// For each extension
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
}
EOF

# Copy config to each extension
cp config.js chrome/config.js
cp config.js firefox/config.js
cp config.js edge/config.js
```

### Step 2.2: Update Extension Manifests

```bash
# Update Chrome extension
cd chrome
nano manifest.json
```

**Update these fields:**
```json
{
  "name": "Working Tracker - Time & Activity Monitor",
  "version": "1.0.0",
  "permissions": [
    "activeTab",
    "tabs",
    "storage",
    "idle"
  ],
  "host_permissions": [
    "https://worktracker.yourdomain.com/*"
  ],
  "background": {
    "service_worker": "background.js"
  }
}
```

**Repeat for Firefox and Edge extensions.**

### Step 2.3: Package Extensions

```bash
cd /home/worktracker/htdocs/worktracker.yourdomain.com/browser-extensions

# Create packages directory
mkdir -p packages

# Package Chrome extension
cd chrome
zip -r ../packages/working-tracker-chrome.zip *
cd ..

# Package Firefox extension
cd firefox
zip -r ../packages/working-tracker-firefox.zip *
cd ..

# Package Edge extension
cd edge
zip -r ../packages/working-tracker-edge.zip *
cd ..

# List packaged extensions
ls -lh packages/
```

### Step 2.4: Host Extensions for Download

```bash
# Create public download directory
mkdir -p /home/worktracker/htdocs/worktracker.yourdomain.com/frontend/build/downloads

# Copy extensions
cp packages/*.zip /home/worktracker/htdocs/worktracker.yourdomain.com/frontend/build/downloads/

# Set permissions
chmod 644 /home/worktracker/htdocs/worktracker.yourdomain.com/frontend/build/downloads/*.zip

# Extensions will be available at:
# https://worktracker.yourdomain.com/downloads/working-tracker-chrome.zip
# https://worktracker.yourdomain.com/downloads/working-tracker-firefox.zip
# https://worktracker.yourdomain.com/downloads/working-tracker-edge.zip
```

### Step 2.5: Publish to Browser Stores (Optional)

**Chrome Web Store:**
1. Go to: https://chrome.google.com/webstore/devconsole
2. Create Developer Account ($5 one-time fee)
3. Upload `working-tracker-chrome.zip`
4. Fill out store listing
5. Submit for review (takes 1-3 days)

**Firefox Add-ons:**
1. Go to: https://addons.mozilla.org/developers/
2. Create Account (Free)
3. Upload `working-tracker-firefox.zip`
4. Submit for review (takes 1-5 days)

**Edge Add-ons:**
1. Go to: https://partner.microsoft.com/dashboard/microsoftedge/
2. Create Account (Free)
3. Upload `working-tracker-edge.zip`
4. Submit for review (takes 1-3 days)

---

## 🖥️ Part 3: Deploy Desktop Tracker App

### Step 3.1: Prepare Desktop App for Distribution

```bash
cd /home/worktracker/htdocs/worktracker.yourdomain.com/desktop-tracker

# Update configuration
cat > config.json << 'EOF'
{
  "apiUrl": "https://worktracker.yourdomain.com/api",
  "wsUrl": "wss://worktracker.yourdomain.com/socket.io",
  "appName": "Working Tracker Desktop",
  "version": "1.0.0",
  "updateUrl": "https://worktracker.yourdomain.com/downloads/desktop"
}
EOF

# Update package.json with your details
nano package.json
```

**Update package.json:**
```json
{
  "name": "working-tracker-desktop",
  "version": "1.0.0",
  "description": "Working Tracker Desktop Application",
  "main": "main.js",
  "scripts": {
    "start": "electron .",
    "pack": "electron-builder --dir",
    "dist": "electron-builder",
    "dist-win": "electron-builder --win",
    "dist-mac": "electron-builder --mac",
    "dist-linux": "electron-builder --linux"
  },
  "build": {
    "appId": "com.worktracker.desktop",
    "productName": "Working Tracker",
    "directories": {
      "output": "dist"
    },
    "win": {
      "target": ["nsis", "portable"],
      "icon": "assets/icon.ico"
    },
    "mac": {
      "target": ["dmg", "zip"],
      "icon": "assets/icon.icns",
      "category": "public.app-category.productivity"
    },
    "linux": {
      "target": ["AppImage", "deb"],
      "icon": "assets/icon.png",
      "category": "Utility"
    }
  }
}
```

### Step 3.2: Build Desktop Apps

**Option A: Build on VPS (Linux only)**

```bash
cd /home/worktracker/htdocs/worktracker.yourdomain.com/desktop-tracker

# Install dependencies
npm install
npm install electron-builder --save-dev

# Build for Linux
npm run dist-linux

# Built files will be in: dist/
ls -lh dist/
```

**Option B: Build on Local Machines (All platforms)**

Since Electron apps need to be built on their target OS:

1. **Windows Build** (on Windows PC):
   ```powershell
   git clone git@github.com:yourusername/working-tracker.git
   cd working-tracker/desktop-tracker
   npm install
   npm run dist-win
   ```

2. **macOS Build** (on Mac):
   ```bash
   git clone git@github.com:yourusername/working-tracker.git
   cd working-tracker/desktop-tracker
   npm install
   npm run dist-mac
   ```

3. **Linux Build** (on Linux/VPS):
   ```bash
   cd /home/worktracker/htdocs/worktracker.yourdomain.com/desktop-tracker
   npm install
   npm run dist-linux
   ```

### Step 3.3: Host Desktop Apps for Download

```bash
# Create download directory
mkdir -p /home/worktracker/htdocs/worktracker.yourdomain.com/frontend/build/downloads/desktop

# Copy built apps to download directory
cd /home/worktracker/htdocs/worktracker.yourdomain.com/desktop-tracker/dist

# Copy Windows installer
cp *.exe /home/worktracker/htdocs/worktracker.yourdomain.com/frontend/build/downloads/desktop/

# Copy Linux packages
cp *.AppImage /home/worktracker/htdocs/worktracker.yourdomain.com/frontend/build/downloads/desktop/
cp *.deb /home/worktracker/htdocs/worktracker.yourdomain.com/frontend/build/downloads/desktop/

# Copy Mac packages (if built on Mac)
# cp *.dmg /home/worktracker/htdocs/worktracker.yourdomain.com/frontend/build/downloads/desktop/

# Set permissions
chmod 644 /home/worktracker/htdocs/worktracker.yourdomain.com/frontend/build/downloads/desktop/*

# Apps will be available at:
# https://worktracker.yourdomain.com/downloads/desktop/Working-Tracker-Setup-1.0.0.exe
# https://worktracker.yourdomain.com/downloads/desktop/working-tracker-1.0.0.AppImage
# https://worktracker.yourdomain.com/downloads/desktop/working-tracker_1.0.0_amd64.deb
```

---

## 📱 Part 4: Deploy Mobile App

### Step 4.1: Prepare Mobile App

```bash
cd /home/worktracker/htdocs/worktracker.yourdomain.com/mobile-app

# Update configuration
cat > config.js << 'EOF'
export const CONFIG = {
  API_URL: 'https://worktracker.yourdomain.com/api',
  WS_URL: 'wss://worktracker.yourdomain.com/socket.io',
  APP_NAME: 'Working Tracker',
  VERSION: '1.0.0'
};
EOF
```

### Step 4.2: Build Mobile Apps

**Note:** Mobile apps MUST be built on macOS for iOS, and can be built on macOS/Linux/Windows for Android.

**Android Build:**

```bash
# On your VPS or local machine with Android SDK
cd /home/worktracker/htdocs/worktracker.yourdomain.com/mobile-app

# Install dependencies
npm install

# Build Android APK
npx react-native bundle --platform android --dev false --entry-file index.js --bundle-output android/app/src/main/assets/index.android.bundle

# Build APK
cd android
./gradlew assembleRelease

# APK will be at:
# android/app/build/outputs/apk/release/app-release.apk
```

**iOS Build (requires Mac):**

```bash
# On macOS only
cd mobile-app
npm install
cd ios
pod install
cd ..

# Build for iOS
npx react-native run-ios --configuration Release
```

### Step 4.3: Host Mobile Apps

```bash
# Create mobile downloads directory
mkdir -p /home/worktracker/htdocs/worktracker.yourdomain.com/frontend/build/downloads/mobile

# Copy Android APK
cp /home/worktracker/htdocs/worktracker.yourdomain.com/mobile-app/android/app/build/outputs/apk/release/app-release.apk \
   /home/worktracker/htdocs/worktracker.yourdomain.com/frontend/build/downloads/mobile/working-tracker.apk

# Set permissions
chmod 644 /home/worktracker/htdocs/worktracker.yourdomain.com/frontend/build/downloads/mobile/*.apk

# APK available at:
# https://worktracker.yourdomain.com/downloads/mobile/working-tracker.apk
```

### Step 4.4: Publish to App Stores (Optional)

**Google Play Store:**
1. Create Developer Account ($25 one-time fee)
2. Create App Listing
3. Upload APK or AAB
4. Fill out store listing
5. Submit for review (takes 1-3 days)

**Apple App Store:**
1. Create Apple Developer Account ($99/year)
2. Create App in App Store Connect
3. Archive and upload IPA via Xcode
4. Fill out store listing
5. Submit for review (takes 1-7 days)

---

## 🔄 Part 5: Setup Auto-Updates & CI/CD

### Step 5.1: Create Update Script

```bash
# Create deployment script
cat > /home/worktracker/update-worktracker.sh << 'EOF'
#!/bin/bash

echo "🔄 Updating Working Tracker..."

# Navigate to project directory
cd /home/worktracker/htdocs/worktracker.yourdomain.com

# Pull latest changes
git pull origin main

# Update backend
echo "📦 Updating backend..."
source venv/bin/activate
cd backend
pip install -r requirements.txt
cd ..

# Restart backend service
echo "🔄 Restarting backend..."
systemctl restart worktracker-backend

# Update frontend
echo "🎨 Building frontend..."
cd frontend
npm install
npm run build
cd ..

# Update extensions
echo "🧩 Packaging extensions..."
cd browser-extensions
./package-extensions.sh
cd ..

echo "✅ Update complete!"
EOF

# Make executable
chmod +x /home/worktracker/update-worktracker.sh

# Create extension packaging script
cat > /home/worktracker/htdocs/worktracker.yourdomain.com/browser-extensions/package-extensions.sh << 'EOF'
#!/bin/bash
cd chrome && zip -r ../packages/working-tracker-chrome.zip * && cd ..
cd firefox && zip -r ../packages/working-tracker-firefox.zip * && cd ..
cd edge && zip -r ../packages/working-tracker-edge.zip * && cd ..
cp packages/*.zip /home/worktracker/htdocs/worktracker.yourdomain.com/frontend/build/downloads/
EOF

chmod +x /home/worktracker/htdocs/worktracker.yourdomain.com/browser-extensions/package-extensions.sh
```

### Step 5.2: Setup GitHub Webhook (Optional)

```bash
# Install webhook handler
npm install -g webhook

# Create webhook script
cat > /home/worktracker/webhook.js << 'EOF'
const http = require('http');
const { exec } = require('child_process');

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/deploy') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        if (payload.ref === 'refs/heads/main') {
          exec('/home/worktracker/update-worktracker.sh', (error, stdout, stderr) => {
            console.log(stdout);
            if (error) console.error(error);
          });
          res.writeHead(200);
          res.end('Deployment triggered');
        }
      } catch (e) {
        res.writeHead(400);
        res.end('Bad request');
      }
    });
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(9000, () => console.log('Webhook listening on :9000'));
EOF

# Create webhook service
sudo tee /etc/systemd/system/worktracker-webhook.service > /dev/null << 'EOF'
[Unit]
Description=Working Tracker GitHub Webhook
After=network.target

[Service]
Type=simple
User=worktracker
ExecStart=/usr/bin/node /home/worktracker/webhook.js
Restart=always

[Install]
WantedBy=multi-user.target
EOF

# Start webhook service
systemctl daemon-reload
systemctl start worktracker-webhook
systemctl enable worktracker-webhook
```

---

## 📊 Part 6: Monitoring & Maintenance

### Step 6.1: Setup Log Rotation

```bash
# Create log rotation config
sudo tee /etc/logrotate.d/worktracker > /dev/null << 'EOF'
/var/log/worktracker/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 worktracker worktracker
    sharedscripts
    postrotate
        systemctl reload worktracker-backend > /dev/null 2>&1 || true
    endscript
}
EOF
```

### Step 6.2: Setup Health Checks

```bash
# Create health check script
cat > /home/worktracker/health-check.sh << 'EOF'
#!/bin/bash

# Check backend
BACKEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8001/health)
if [ "$BACKEND_STATUS" != "200" ]; then
    echo "Backend unhealthy, restarting..."
    systemctl restart worktracker-backend
fi

# Check frontend
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://worktracker.yourdomain.com)
if [ "$FRONTEND_STATUS" != "200" ]; then
    echo "Frontend unhealthy, reloading nginx..."
    systemctl reload nginx
fi

echo "Health check complete: Backend=$BACKEND_STATUS, Frontend=$FRONTEND_STATUS"
EOF

chmod +x /home/worktracker/health-check.sh

# Add to crontab (runs every 5 minutes)
(crontab -l 2>/dev/null; echo "*/5 * * * * /home/worktracker/health-check.sh >> /var/log/worktracker-health.log 2>&1") | crontab -
```

### Step 6.3: Setup Backup Script

```bash
# Create backup script
cat > /home/worktracker/backup.sh << 'EOF'
#!/bin/bash

BACKUP_DIR="/home/worktracker/backups"
DATE=$(date +%Y%m%d_%H%M%S)
PROJECT_DIR="/home/worktracker/htdocs/worktracker.yourdomain.com"

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup application files
tar -czf $BACKUP_DIR/worktracker-app-$DATE.tar.gz -C $PROJECT_DIR .

# Backup database (Supabase handles this, but backup .env)
cp $PROJECT_DIR/.env.production $BACKUP_DIR/env-$DATE.backup

# Keep only last 7 days of backups
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete
find $BACKUP_DIR -name "*.backup" -mtime +7 -delete

echo "Backup completed: $DATE"
EOF

chmod +x /home/worktracker/backup.sh

# Add to crontab (runs daily at 2 AM)
(crontab -l 2>/dev/null; echo "0 2 * * * /home/worktracker/backup.sh >> /var/log/worktracker-backup.log 2>&1") | crontab -
```

---

## 🎉 Final Verification Checklist

### ✅ Web Application
```bash
# Check backend
curl https://worktracker.yourdomain.com/api/health

# Check frontend (browser)
# Visit: https://worktracker.yourdomain.com

# Check WebSocket
# Open browser console on site and check for WebSocket connections

# Check services
systemctl status worktracker-backend
systemctl status nginx
```

### ✅ Browser Extensions
```bash
# Verify extensions are downloadable
curl -I https://worktracker.yourdomain.com/downloads/working-tracker-chrome.zip
curl -I https://worktracker.yourdomain.com/downloads/working-tracker-firefox.zip
curl -I https://worktracker.yourdomain.com/downloads/working-tracker-edge.zip
```

### ✅ Desktop App
```bash
# Verify desktop apps are downloadable
ls -lh /home/worktracker/htdocs/worktracker.yourdomain.com/frontend/build/downloads/desktop/
```

### ✅ Mobile App
```bash
# Verify mobile app is downloadable
curl -I https://worktracker.yourdomain.com/downloads/mobile/working-tracker.apk
```

### ✅ Security Checks
```bash
# Check SSL certificate
openssl s_client -connect worktracker.yourdomain.com:443 -servername worktracker.yourdomain.com

# Check firewall
ufw status

# Verify environment file permissions
ls -la /home/worktracker/htdocs/worktracker.yourdomain.com/.env.production
# Should show: -rw------- (600)
```

---

## 📞 Support & Troubleshooting

### Common Issues

**Backend Won't Start:**
```bash
# Check logs
sudo journalctl -u worktracker-backend -n 100 --no-pager

# Verify Python dependencies
source /home/worktracker/htdocs/worktracker.yourdomain.com/venv/bin/activate
pip list | grep -E 'fastapi|uvicorn|supabase|stripe'

# Test backend manually
cd /home/worktracker/htdocs/worktracker.yourdomain.com/backend
source ../venv/bin/activate
uvicorn server:app --host 127.0.0.1 --port 8001
```

**Frontend Shows 502 Error:**
```bash
# Check if backend is running
systemctl status worktracker-backend

# Check nginx configuration
nginx -t

# Check nginx logs
tail -f /var/log/nginx/error.log
```

**Database Connection Failed:**
```bash
# Verify Supabase credentials in .env.production
cat /home/worktracker/htdocs/worktracker.yourdomain.com/.env.production | grep SUPABASE

# Test connection
cd /home/worktracker/htdocs/worktracker.yourdomain.com/backend
source ../venv/bin/activate
python -c "from db import get_db; print(get_db())"
```

**Extensions Not Connecting:**
- Verify API_URL in extension config.js
- Check CORS settings in backend
- Check browser console for errors

### Quick Commands Reference

```bash
# Restart backend
sudo systemctl restart worktracker-backend

# Reload nginx
sudo systemctl reload nginx

# View backend logs
sudo journalctl -u worktracker-backend -f

# View nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Update application
/home/worktracker/update-worktracker.sh

# Run health check
/home/worktracker/health-check.sh

# Run backup
/home/worktracker/backup.sh
```

---

## 🚀 Next Steps

1. **Configure DNS:** Point your domain to VPS IP
2. **Test All Features:** Login, time tracking, screenshots, payments
3. **Setup Analytics:** Add Google Analytics or similar
4. **Setup Monitoring:** Use UptimeRobot or similar
5. **Submit to Stores:** Chrome Web Store, Firefox Add-ons, etc.
6. **Marketing:** Create landing page, documentation, tutorials

---

## 📝 Important Notes

- ✅ **Stripe Integration:** Fully integrated, DO NOT remove
- ✅ **Supabase Database:** Used for all data persistence
- ✅ **SSL/TLS:** Automatically managed by CloudPanel/Let's Encrypt
- ✅ **Auto-Backups:** Runs daily at 2 AM
- ✅ **Health Checks:** Runs every 5 minutes
- ✅ **Log Rotation:** Keeps 14 days of logs

Your Working Tracker application is now fully deployed! 🎉
