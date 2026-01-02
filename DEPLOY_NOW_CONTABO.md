# ⚡ Deploy WorkMonitor NOW - Contabo + CloudPanel

**Your Setup:**
- ✅ Contabo VPS, Ubuntu 24.04
- ✅ CloudPanel running
- ✅ N8N with Docker
- ✅ Domain: workingtracker.com

**Time**: 45 minutes | **No interference** with CloudPanel or N8N

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

# Verify
python3.11 --version
node --version
```

---

### 📦 Step 2: Clone & Configure (5 min)

```bash
# Clone to /opt (separate from CloudPanel)
sudo mkdir -p /opt/workmonitor
sudo chown -R $USER:$USER /opt/workmonitor
cd /opt/workmonitor
git clone https://github.com/yourusername/workmonitor.git .

# Create production config
cat > .env.production << 'EOF'
VITE_SUPABASE_URL=https://ruvcvaekwqfhpjmzxiqz.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_KEY_HERE
SUPABASE_SERVICE_ROLE_KEY=YOUR_KEY_HERE

API_URL=https://api.workingtracker.com
FRONTEND_URL=https://workingtracker.com
BACKEND_PORT=8001

STRIPE_SECRET_KEY=YOUR_KEY_HERE
STRIPE_PUBLISHABLE_KEY=YOUR_KEY_HERE
STRIPE_WEBHOOK_SECRET=YOUR_KEY_HERE

JWT_SECRET_KEY=$(openssl rand -hex 32)
ALLOWED_ORIGINS=https://workingtracker.com,https://www.workingtracker.com
ENVIRONMENT=production
DEBUG=False
EOF

# Edit and add your real keys from Supabase and Stripe
nano .env.production
```

---

### 🔧 Step 3: Deploy Backend (10 min)

```bash
cd /opt/workmonitor

# Create Python virtual environment
python3.11 -m venv venv
source venv/bin/activate

# Install dependencies
cd backend
pip install --upgrade pip
pip install -r requirements.txt

# Create systemd service
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

# Start backend
sudo systemctl daemon-reload
sudo systemctl start workmonitor-backend
sudo systemctl enable workmonitor-backend

# Verify it's running
sudo systemctl status workmonitor-backend
curl http://127.0.0.1:8001/api/
# Should return: {"message":"Working Tracker API v1.0","status":"running"}
```

---

### 🎨 Step 4: Build Frontend (10 min)

```bash
cd /opt/workmonitor/frontend

# Create frontend .env
cat > .env.production << 'EOF'
REACT_APP_API_URL=https://api.workingtracker.com
REACT_APP_SUPABASE_URL=https://ruvcvaekwqfhpjmzxiqz.supabase.co
REACT_APP_SUPABASE_ANON_KEY=YOUR_KEY_HERE
REACT_APP_STRIPE_PUBLISHABLE_KEY=YOUR_KEY_HERE
EOF

# Edit with your keys
nano .env.production

# Install and build
npm install
npm run build

# Build creates: /opt/workmonitor/frontend/build/
ls -la build/
```

---

### 🌐 Step 5: Configure in CloudPanel (10 min)

#### 5.1 Create Sites in CloudPanel UI

**Open CloudPanel**: `https://your-vps-ip:8443`

**Create Main Site:**
1. Sites → Add Site
2. Domain: `workingtracker.com`
3. Type: Static HTML or PHP
4. SSL: Enable (Let's Encrypt)
5. Create

**Create API Site:**
1. Sites → Add Site
2. Domain: `api.workingtracker.com`
3. Type: **Reverse Proxy**
4. Reverse Proxy URL: `http://127.0.0.1:8001`
5. SSL: Enable
6. Create

#### 5.2 Deploy Frontend Files

```bash
# Find your CloudPanel site path (typically):
SITE_PATH="/home/workingtracker.com/htdocs"

# If different, check CloudPanel UI: Sites → workingtracker.com → Root Directory

# Backup existing content
sudo mv $SITE_PATH $SITE_PATH.backup.$(date +%Y%m%d)

# Deploy frontend
sudo mkdir -p $SITE_PATH
sudo cp -r /opt/workmonitor/frontend/build/* $SITE_PATH/

# Set permissions (clp is CloudPanel's user)
sudo chown -R clp:clp $SITE_PATH
sudo chmod -R 755 $SITE_PATH

# Verify
ls -la $SITE_PATH
```

#### 5.3 Configure Nginx for React Router

```bash
# Find Nginx config file
sudo ls /etc/nginx/sites-enabled/ | grep workingtracker

# Edit it (replace with your actual filename)
sudo nano /etc/nginx/sites-enabled/workingtracker.com.conf
```

**Add inside the `server` block for workingtracker.com:**

```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

**Save** (Ctrl+X → Y → Enter) and reload:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

### 🔒 Step 6: Update DNS (if not done)

In your domain registrar or Cloudflare:

```
Type    Name    Value                   TTL
A       @       YOUR_CONTABO_IP         300
A       www     YOUR_CONTABO_IP         300
A       api     YOUR_CONTABO_IP         300
```

Wait 5-10 minutes for propagation.

---

### 🎯 Step 7: Configure Stripe Webhook (5 min)

1. Go to https://dashboard.stripe.com/webhooks
2. Click **Add endpoint**
3. URL: `https://api.workingtracker.com/api/webhook/stripe`
4. Events:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
5. Copy **Signing Secret** (whsec_...)
6. Update .env:

```bash
nano /opt/workmonitor/.env.production
# Update: STRIPE_WEBHOOK_SECRET=whsec_your_secret
# Save: Ctrl+X → Y → Enter

sudo systemctl restart workmonitor-backend
```

---

## ✅ Test Everything

```bash
# Test backend
curl https://api.workingtracker.com/api/

# Check backend service
sudo systemctl status workmonitor-backend

# Check CloudPanel still works
curl -k https://your-vps-ip:8443

# Check N8N still running
docker ps
```

**Open in browser:**
- https://workingtracker.com ✅
- https://api.workingtracker.com/api/ ✅
- CloudPanel: https://your-ip:8443 ✅

**Test features:**
1. Sign up
2. Log in
3. Dashboard loads
4. Test payment (card: 4242 4242 4242 4242)

---

## ✅ Verification Checklist

- [ ] Backend running: `sudo systemctl status workmonitor-backend`
- [ ] Frontend loads: https://workingtracker.com
- [ ] API responds: https://api.workingtracker.com/api/
- [ ] SSL working (green padlock)
- [ ] CloudPanel still accessible
- [ ] N8N still running: `docker ps`
- [ ] Can sign up/login
- [ ] Payment flow works

---

## 🔧 Quick Commands

```bash
# View backend logs
sudo journalctl -u workmonitor-backend -f

# Restart backend
sudo systemctl restart workmonitor-backend

# Reload Nginx (CloudPanel)
sudo systemctl reload nginx

# Check all services
sudo systemctl status workmonitor-backend nginx
docker ps
```

---

## 🆘 Troubleshooting

### Backend won't start
```bash
sudo journalctl -u workmonitor-backend -n 50
# Check for errors, usually missing env variables
```

### Frontend shows blank page
```bash
# Check browser console for errors
# Verify API_URL in frontend .env.production
cat /opt/workmonitor/frontend/.env.production
```

### API not accessible
```bash
# Check backend is running
curl http://127.0.0.1:8001/api/

# Check Nginx config for api.workingtracker.com
sudo nano /etc/nginx/sites-enabled/api.workingtracker.com.conf
# Should proxy to http://127.0.0.1:8001
```

### 404 on routes
```bash
# Add React Router config to Nginx
sudo nano /etc/nginx/sites-enabled/workingtracker.com.conf
# Add: try_files $uri $uri/ /index.html;
sudo nginx -t && sudo systemctl reload nginx
```

---

## 📊 Architecture

```
Your Contabo VPS
├── CloudPanel (port 8443) ✅ Untouched
├── N8N (Docker) ✅ Untouched
└── WorkMonitor
    ├── Backend: systemd service (port 8001)
    ├── Frontend: CloudPanel Nginx → /home/workingtracker.com/htdocs
    └── Database: Supabase (external)
```

**Everything coexists perfectly!**

---

## 📚 Full Documentation

Detailed guide: **`deploy/CONTABO_CLOUDPANEL_DEPLOYMENT.md`**

---

## 🎉 Done!

**Your platform is live at**: https://workingtracker.com

**Cost**: Just your VPS (€5/month)

**Next**:
- Build desktop app: `deploy/apps/DESKTOP_BUILD_GUIDE.md`
- Build mobile apps: `deploy/apps/MOBILE_BUILD_GUIDE.md`
- Build extensions: `deploy/apps/EXTENSION_BUILD_GUIDE.md`

🚀 **Start serving customers!**
