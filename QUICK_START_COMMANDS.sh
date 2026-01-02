#!/bin/bash

# ========================================
# Working Tracker - Quick Deployment Script
# For Contabo VPS with CloudPanel
# ========================================

# IMPORTANT: Read COMPLETE_DEPLOYMENT_PLAN.md first!
# This script is a reference - review and adjust before running

# ========================================
# CONFIGURATION - UPDATE THESE VALUES
# ========================================

DOMAIN="worktracker.yourdomain.com"
GITHUB_REPO="git@github.com:yourusername/working-tracker.git"
SITE_USER="worktracker"
SITE_PATH="/home/$SITE_USER/htdocs/$DOMAIN"

# Supabase Configuration
SUPABASE_URL="your_supabase_url"
SUPABASE_ANON_KEY="your_supabase_anon_key"
SUPABASE_SERVICE_ROLE_KEY="your_supabase_service_role_key"
DATABASE_URL="postgresql://user:pass@host:5432/dbname"

# Stripe Configuration
STRIPE_SECRET_KEY="your_stripe_secret_key"
STRIPE_PUBLISHABLE_KEY="your_stripe_publishable_key"
STRIPE_WEBHOOK_SECRET="your_stripe_webhook_secret"

# Generate JWT secret: openssl rand -hex 32
JWT_SECRET="your_jwt_secret_min_32_chars"

# ========================================
# STEP 1: Verify Prerequisites
# ========================================

echo "🔍 Step 1: Verifying prerequisites..."

# Check if running as root
if [ "$EUID" -ne 0 ]; then
  echo "❌ Please run as root"
  exit 1
fi

# Check CloudPanel
systemctl is-active --quiet nginx || { echo "❌ Nginx not running"; exit 1; }
echo "✅ CloudPanel/Nginx running"

# Check GitHub SSH
ssh -T git@github.com 2>&1 | grep -q "successfully authenticated" || {
  echo "❌ GitHub SSH not configured. Run: ssh-keygen -t rsa -b 4096 -C 'your@email.com'"
  exit 1
}
echo "✅ GitHub SSH configured"

# ========================================
# STEP 2: Install Required Software
# ========================================

echo "📦 Step 2: Installing required software..."

# Update system
apt update

# Install Python 3.11
apt install -y python3.11 python3.11-venv python3.11-dev

# Install Node.js 20
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
fi

# Verify versions
python3.11 --version
node --version
npm --version

echo "✅ Software installed"

# ========================================
# STEP 3: Clone Repository
# ========================================

echo "📥 Step 3: Cloning repository..."

# Create site directory if not exists
mkdir -p $SITE_PATH
cd $SITE_PATH

# Clone repository
if [ -d ".git" ]; then
    echo "Repository already exists, pulling latest..."
    git pull origin main
else
    rm -rf *
    git clone $GITHUB_REPO .
fi

echo "✅ Repository cloned"

# ========================================
# STEP 4: Configure Environment
# ========================================

echo "⚙️ Step 4: Configuring environment..."

# Create .env.production
cat > $SITE_PATH/.env.production << EOF
# Database Configuration (Supabase)
SUPABASE_URL=$SUPABASE_URL
SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY
DATABASE_URL=$DATABASE_URL

# JWT Configuration
JWT_SECRET=$JWT_SECRET
JWT_ALGORITHM=HS256
JWT_EXPIRATION_MINUTES=43200

# Stripe Configuration
STRIPE_SECRET_KEY=$STRIPE_SECRET_KEY
STRIPE_PUBLISHABLE_KEY=$STRIPE_PUBLISHABLE_KEY
STRIPE_WEBHOOK_SECRET=$STRIPE_WEBHOOK_SECRET

# API Configuration
API_URL=https://$DOMAIN/api
FRONTEND_URL=https://$DOMAIN

# Node Environment
NODE_ENV=production
PORT=3000
BACKEND_PORT=8001

# CORS Origins
CORS_ORIGINS=https://$DOMAIN,https://www.$DOMAIN
EOF

# Secure the file
chmod 600 $SITE_PATH/.env.production

echo "✅ Environment configured"

# ========================================
# STEP 5: Deploy Backend
# ========================================

echo "🐍 Step 5: Deploying backend..."

cd $SITE_PATH

# Create virtual environment
python3.11 -m venv venv
source venv/bin/activate

# Upgrade pip
pip install --upgrade pip setuptools wheel

# Install dependencies
cd backend
echo "Installing Python packages (this may take a few minutes)..."
pip install -r requirements.txt

# If you get conflicts, uncomment this:
# pip install --use-deprecated=legacy-resolver -r requirements.txt

# Test database connection
python -c "from db import get_db; print('✅ Database connected!')" || {
    echo "❌ Database connection failed. Check your credentials."
    exit 1
}

cd ..

echo "✅ Backend dependencies installed"

# ========================================
# STEP 6: Create Backend Service
# ========================================

echo "🔧 Step 6: Creating backend service..."

cat > /etc/systemd/system/worktracker-backend.service << EOF
[Unit]
Description=Working Tracker Backend API
After=network.target

[Service]
Type=simple
User=$SITE_USER
WorkingDirectory=$SITE_PATH/backend
Environment="PATH=$SITE_PATH/venv/bin"
EnvironmentFile=$SITE_PATH/.env.production
ExecStart=$SITE_PATH/venv/bin/uvicorn server:app --host 127.0.0.1 --port 8001 --workers 4
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Set ownership
chown -R $SITE_USER:$SITE_USER $SITE_PATH

# Start service
systemctl daemon-reload
systemctl start worktracker-backend
systemctl enable worktracker-backend

# Wait for service to start
sleep 3

# Verify service
systemctl is-active --quiet worktracker-backend || {
    echo "❌ Backend service failed to start"
    journalctl -u worktracker-backend -n 20
    exit 1
}

# Test endpoint
curl -s http://127.0.0.1:8001/health | grep -q "ok" || {
    echo "❌ Backend health check failed"
    exit 1
}

echo "✅ Backend service running"

# ========================================
# STEP 7: Deploy Frontend
# ========================================

echo "⚛️ Step 7: Deploying frontend..."

cd $SITE_PATH/frontend

# Create frontend environment
cat > .env.production << EOF
REACT_APP_API_URL=https://$DOMAIN/api
REACT_APP_SUPABASE_URL=$SUPABASE_URL
REACT_APP_SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY
REACT_APP_STRIPE_PUBLISHABLE_KEY=$STRIPE_PUBLISHABLE_KEY
EOF

# Install dependencies
echo "Installing npm packages (this may take a few minutes)..."
npm install

# Build production bundle
echo "Building frontend (this may take a few minutes)..."
npm run build

# Verify build
[ -d "build" ] && [ -f "build/index.html" ] || {
    echo "❌ Frontend build failed"
    exit 1
}

echo "✅ Frontend built successfully"

# ========================================
# STEP 8: Configure Nginx
# ========================================

echo "🌐 Step 8: Configuring Nginx..."

cat > /etc/nginx/sites-available/worktracker.conf << EOF
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN www.$DOMAIN;
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name $DOMAIN www.$DOMAIN;

    # SSL Configuration (CloudPanel manages these)
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;

    # Frontend
    location / {
        root $SITE_PATH/frontend/build;
        try_files \$uri \$uri/ /index.html;

        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Backend API
    location /api {
        proxy_pass http://127.0.0.1:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # WebSocket
    location /socket.io {
        proxy_pass http://127.0.0.1:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    client_max_body_size 100M;
}
EOF

# Enable site
ln -sf /etc/nginx/sites-available/worktracker.conf /etc/nginx/sites-enabled/

# Test configuration
nginx -t || {
    echo "❌ Nginx configuration invalid"
    exit 1
}

# Reload nginx
systemctl reload nginx

echo "✅ Nginx configured"

# ========================================
# STEP 9: Package Browser Extensions
# ========================================

echo "🧩 Step 9: Packaging browser extensions..."

cd $SITE_PATH/browser-extensions

# Create config
cat > config.js << EOF
const CONFIG = {
  API_URL: 'https://$DOMAIN/api',
  WS_URL: 'wss://$DOMAIN/socket.io',
  APP_NAME: 'Working Tracker',
  VERSION: '1.0.0'
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
}
EOF

# Copy to each extension
cp config.js chrome/config.js
cp config.js firefox/config.js
cp config.js edge/config.js

# Create packages directory
mkdir -p packages

# Package extensions
cd chrome && zip -r ../packages/working-tracker-chrome.zip * && cd ..
cd firefox && zip -r ../packages/working-tracker-firefox.zip * && cd ..
cd edge && zip -r ../packages/working-tracker-edge.zip * && cd ..

# Create downloads directory
mkdir -p $SITE_PATH/frontend/build/downloads

# Copy to downloads
cp packages/*.zip $SITE_PATH/frontend/build/downloads/
chmod 644 $SITE_PATH/frontend/build/downloads/*.zip

echo "✅ Browser extensions packaged"

# ========================================
# STEP 10: Create Automation Scripts
# ========================================

echo "🤖 Step 10: Creating automation scripts..."

# Update script
cat > /home/$SITE_USER/update-worktracker.sh << EOF
#!/bin/bash
echo "🔄 Updating Working Tracker..."
cd $SITE_PATH
git pull origin main
source venv/bin/activate
cd backend && pip install -r requirements.txt && cd ..
systemctl restart worktracker-backend
cd frontend && npm install && npm run build && cd ..
echo "✅ Update complete!"
EOF

# Health check script
cat > /home/$SITE_USER/health-check.sh << EOF
#!/bin/bash
BACKEND=\$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8001/health)
if [ "\$BACKEND" != "200" ]; then
    echo "Backend unhealthy, restarting..."
    systemctl restart worktracker-backend
fi
echo "Health check: Backend=\$BACKEND"
EOF

# Backup script
cat > /home/$SITE_USER/backup.sh << EOF
#!/bin/bash
BACKUP_DIR="/home/$SITE_USER/backups"
DATE=\$(date +%Y%m%d_%H%M%S)
mkdir -p \$BACKUP_DIR
tar -czf \$BACKUP_DIR/worktracker-\$DATE.tar.gz -C $SITE_PATH .
find \$BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete
echo "Backup completed: \$DATE"
EOF

# Make executable
chmod +x /home/$SITE_USER/*.sh

# Add cron jobs
(crontab -u $SITE_USER -l 2>/dev/null; echo "*/5 * * * * /home/$SITE_USER/health-check.sh >> /var/log/worktracker-health.log 2>&1") | crontab -u $SITE_USER -
(crontab -u $SITE_USER -l 2>/dev/null; echo "0 2 * * * /home/$SITE_USER/backup.sh >> /var/log/worktracker-backup.log 2>&1") | crontab -u $SITE_USER -

echo "✅ Automation scripts created"

# ========================================
# FINAL VERIFICATION
# ========================================

echo ""
echo "========================================="
echo "🎉 DEPLOYMENT COMPLETE!"
echo "========================================="
echo ""
echo "✅ Backend: http://127.0.0.1:8001/health"
echo "✅ Frontend: https://$DOMAIN"
echo "✅ Extensions: https://$DOMAIN/downloads/"
echo ""
echo "📊 Service Status:"
systemctl status worktracker-backend --no-pager -l
echo ""
echo "🔍 Testing Backend:"
curl -s http://127.0.0.1:8001/health
echo ""
echo "📝 Next Steps:"
echo "1. Configure DNS to point $DOMAIN to this server"
echo "2. Test login and all features"
echo "3. Download and test browser extensions"
echo "4. Build desktop and mobile apps (see COMPLETE_DEPLOYMENT_PLAN.md)"
echo ""
echo "📚 Documentation:"
echo "- Full Guide: $SITE_PATH/COMPLETE_DEPLOYMENT_PLAN.md"
echo "- Checklist: $SITE_PATH/DEPLOYMENT_CHECKLIST.md"
echo ""
echo "🆘 Troubleshooting:"
echo "- Backend logs: journalctl -u worktracker-backend -f"
echo "- Nginx logs: tail -f /var/log/nginx/error.log"
echo "- Update app: /home/$SITE_USER/update-worktracker.sh"
echo ""
echo "Happy tracking! 🚀"
echo ""
