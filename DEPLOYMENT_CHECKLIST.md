# ✅ Working Tracker Deployment Checklist

**Use this checklist to track your deployment progress.**

---

## 🎯 Pre-Deployment (15 minutes)

- [ ] SSH into Contabo VPS: `ssh root@your-vps-ip`
- [ ] Verify CloudPanel is running: `systemctl status nginx`
- [ ] Test GitHub SSH: `ssh -T git@github.com`
- [ ] Note your domain name: `_______________________`
- [ ] Gather Supabase credentials (URL, keys)
- [ ] Gather Stripe credentials (keys)
- [ ] Generate JWT secret: `openssl rand -hex 32`

---

## 🌐 Part 1: Web Application (60 minutes)

### CloudPanel Setup (10 min)
- [ ] Access CloudPanel: `https://your-vps-ip:8443`
- [ ] Create new site: `worktracker.yourdomain.com`
- [ ] Enable SSL certificate
- [ ] Note site path: `/home/worktracker/htdocs/worktracker.yourdomain.com`

### Clone Repository (5 min)
- [ ] Navigate to site directory
- [ ] Remove default files: `rm -rf *`
- [ ] Clone repository: `git clone git@github.com:yourusername/working-tracker.git .`
- [ ] Verify files: `ls -la`

### Configure Environment (10 min)
- [ ] Create `.env.production` file
- [ ] Add Supabase credentials
- [ ] Add Stripe credentials (DO NOT SKIP - already integrated)
- [ ] Add JWT secret
- [ ] Add domain URLs
- [ ] Secure file: `chmod 600 .env.production`

### Deploy Backend (20 min)
- [ ] Install Python 3.11: `apt install python3.11 python3.11-venv`
- [ ] Create virtual environment: `python3.11 -m venv venv`
- [ ] Activate venv: `source venv/bin/activate`
- [ ] Upgrade pip: `pip install --upgrade pip setuptools wheel`
- [ ] Install dependencies: `cd backend && pip install -r requirements.txt`
- [ ] Test database: `python -c "from db import get_db; print('✅ Connected')"`
- [ ] Create systemd service
- [ ] Start service: `systemctl start worktracker-backend`
- [ ] Enable service: `systemctl enable worktracker-backend`
- [ ] Verify: `curl http://127.0.0.1:8001/health`

### Deploy Frontend (15 min)
- [ ] Install Node.js 20: `curl -fsSL https://deb.nodesource.com/setup_20.x | bash -`
- [ ] Install Node: `apt install -y nodejs`
- [ ] Navigate to frontend: `cd frontend`
- [ ] Create `.env.production`
- [ ] Install dependencies: `npm install`
- [ ] Build: `npm run build`
- [ ] Verify: `ls -lh build/`

### Configure Nginx (10 min)
- [ ] Create nginx config: `/etc/nginx/sites-available/worktracker.conf`
- [ ] Enable site: `ln -s /etc/nginx/sites-available/worktracker.conf /etc/nginx/sites-enabled/`
- [ ] Test config: `nginx -t`
- [ ] Reload nginx: `systemctl reload nginx`
- [ ] Test website: Visit `https://worktracker.yourdomain.com`

**✅ Web Application Complete!**

---

## 🧩 Part 2: Browser Extensions (30 minutes)

### Configure Extensions (10 min)
- [ ] Navigate to: `cd browser-extensions`
- [ ] Create `config.js` with API URL
- [ ] Copy to all extensions: `cp config.js chrome/ firefox/ edge/`
- [ ] Update manifest.json in each extension

### Package Extensions (10 min)
- [ ] Create packages directory: `mkdir -p packages`
- [ ] Package Chrome: `cd chrome && zip -r ../packages/working-tracker-chrome.zip *`
- [ ] Package Firefox: `cd firefox && zip -r ../packages/working-tracker-firefox.zip *`
- [ ] Package Edge: `cd edge && zip -r ../packages/working-tracker-edge.zip *`
- [ ] Verify: `ls -lh packages/`

### Host for Download (10 min)
- [ ] Create download directory: `mkdir -p frontend/build/downloads`
- [ ] Copy extensions: `cp packages/*.zip frontend/build/downloads/`
- [ ] Set permissions: `chmod 644 frontend/build/downloads/*.zip`
- [ ] Test downloads:
  - [ ] `curl -I https://worktracker.yourdomain.com/downloads/working-tracker-chrome.zip`
  - [ ] `curl -I https://worktracker.yourdomain.com/downloads/working-tracker-firefox.zip`
  - [ ] `curl -I https://worktracker.yourdomain.com/downloads/working-tracker-edge.zip`

**✅ Browser Extensions Complete!**

---

## 🖥️ Part 3: Desktop App (45 minutes)

### Prepare Desktop App (15 min)
- [ ] Navigate to: `cd desktop-tracker`
- [ ] Create `config.json` with API URLs
- [ ] Update `package.json` with app details
- [ ] Add app icons to `assets/` folder

### Build Desktop Apps (20 min)

**Linux Build (on VPS):**
- [ ] Install dependencies: `npm install`
- [ ] Install electron-builder: `npm install electron-builder --save-dev`
- [ ] Build: `npm run dist-linux`
- [ ] Verify: `ls -lh dist/`

**Windows Build (on Windows PC - optional):**
- [ ] Clone repo on Windows
- [ ] `npm install`
- [ ] `npm run dist-win`
- [ ] Upload .exe to VPS

**Mac Build (on Mac - optional):**
- [ ] Clone repo on Mac
- [ ] `npm install`
- [ ] `npm run dist-mac`
- [ ] Upload .dmg to VPS

### Host for Download (10 min)
- [ ] Create directory: `mkdir -p frontend/build/downloads/desktop`
- [ ] Copy builds: `cp dist/*.AppImage dist/*.deb frontend/build/downloads/desktop/`
- [ ] Set permissions: `chmod 644 frontend/build/downloads/desktop/*`
- [ ] Test: `curl -I https://worktracker.yourdomain.com/downloads/desktop/working-tracker.AppImage`

**✅ Desktop App Complete!**

---

## 📱 Part 4: Mobile App (60 minutes)

### Prepare Mobile App (15 min)
- [ ] Navigate to: `cd mobile-app`
- [ ] Create `config.js` with API URLs
- [ ] Install dependencies: `npm install`

### Build Android (30 min)
- [ ] Setup Android SDK (if not installed)
- [ ] Bundle JS: `npx react-native bundle --platform android...`
- [ ] Build APK: `cd android && ./gradlew assembleRelease`
- [ ] Verify: `ls android/app/build/outputs/apk/release/`

### Build iOS (30 min - Mac only)
- [ ] Install pods: `cd ios && pod install`
- [ ] Build: `npx react-native run-ios --configuration Release`

### Host for Download (15 min)
- [ ] Create directory: `mkdir -p frontend/build/downloads/mobile`
- [ ] Copy APK: `cp android/app/build/outputs/apk/release/app-release.apk frontend/build/downloads/mobile/working-tracker.apk`
- [ ] Set permissions: `chmod 644 frontend/build/downloads/mobile/*.apk`
- [ ] Test: `curl -I https://worktracker.yourdomain.com/downloads/mobile/working-tracker.apk`

**✅ Mobile App Complete!**

---

## 🔄 Part 5: Automation & Monitoring (30 minutes)

### Setup Auto-Update (10 min)
- [ ] Create update script: `/home/worktracker/update-worktracker.sh`
- [ ] Make executable: `chmod +x update-worktracker.sh`
- [ ] Test: `./update-worktracker.sh`

### Setup Health Checks (10 min)
- [ ] Create health check script: `/home/worktracker/health-check.sh`
- [ ] Make executable: `chmod +x health-check.sh`
- [ ] Add to crontab: `crontab -e`
- [ ] Test: `./health-check.sh`

### Setup Backups (10 min)
- [ ] Create backup script: `/home/worktracker/backup.sh`
- [ ] Make executable: `chmod +x backup.sh`
- [ ] Add to crontab: `crontab -e`
- [ ] Test: `./backup.sh`

**✅ Automation Complete!**

---

## ✅ Final Verification (15 minutes)

### Web Application
- [ ] Backend health: `curl https://worktracker.yourdomain.com/api/health`
- [ ] Frontend loads: Visit `https://worktracker.yourdomain.com`
- [ ] Can login
- [ ] Can create account
- [ ] Time tracking works
- [ ] Screenshots work (if enabled)
- [ ] Stripe payment works

### Services Running
- [ ] Backend: `systemctl status worktracker-backend`
- [ ] Nginx: `systemctl status nginx`
- [ ] No errors in logs: `journalctl -u worktracker-backend -n 50`

### Downloads Available
- [ ] Chrome extension: `https://worktracker.yourdomain.com/downloads/working-tracker-chrome.zip`
- [ ] Firefox extension: `https://worktracker.yourdomain.com/downloads/working-tracker-firefox.zip`
- [ ] Edge extension: `https://worktracker.yourdomain.com/downloads/working-tracker-edge.zip`
- [ ] Desktop app: `https://worktracker.yourdomain.com/downloads/desktop/working-tracker.AppImage`
- [ ] Mobile app: `https://worktracker.yourdomain.com/downloads/mobile/working-tracker.apk`

### Security
- [ ] SSL certificate valid
- [ ] `.env.production` secured: `ls -la .env.production` (should be 600)
- [ ] Firewall configured: `ufw status`
- [ ] No sensitive data in logs

**✅ Everything Deployed Successfully! 🎉**

---

## 📊 Post-Deployment Tasks

### Immediate (Today)
- [ ] Configure DNS to point to VPS IP
- [ ] Test all features thoroughly
- [ ] Set up monitoring (UptimeRobot, etc.)
- [ ] Document any issues

### This Week
- [ ] Create user documentation
- [ ] Set up analytics (Google Analytics)
- [ ] Create demo videos/screenshots
- [ ] Test on different devices

### This Month
- [ ] Submit extensions to browser stores
- [ ] Submit mobile app to app stores
- [ ] Launch marketing campaign
- [ ] Gather user feedback

---

## 🆘 Emergency Contacts

**VPS Issues:** Contact Contabo Support
**DNS Issues:** Contact your domain registrar
**SSL Issues:** Check Let's Encrypt status
**Code Issues:** Check GitHub repository issues

---

## 📝 Quick Commands

```bash
# Restart backend
sudo systemctl restart worktracker-backend

# View backend logs
sudo journalctl -u worktracker-backend -f

# Update application
/home/worktracker/update-worktracker.sh

# Run health check
/home/worktracker/health-check.sh

# Manual backup
/home/worktracker/backup.sh

# Check all services
systemctl status worktracker-backend nginx
```

---

**Total Estimated Time: 4-5 hours**

Good luck with your deployment! 🚀
