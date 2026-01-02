# 🚀 WorkMonitor VPS Deployment Guide

Complete guide to deploying WorkMonitor on Contabo/Hostinger VPS with Cloudflare.

---

## 📋 Prerequisites

### VPS Requirements
- **OS**: Ubuntu 20.04 or 22.04 LTS
- **RAM**: Minimum 2GB (4GB recommended)
- **Storage**: Minimum 20GB SSD
- **CPU**: 2+ cores recommended
- **Provider**: Contabo, Hostinger, or any VPS provider

### Domain & Services
- **Domain Name**: Registered domain (Namecheap, GoDaddy, etc.)
- **Cloudflare Account**: Free account at cloudflare.com
- **Supabase Database**: Already configured in `.env`
- **Stripe Account**: For payment processing (already integrated)

### Local Requirements
- SSH access to your VPS
- Basic terminal/command line knowledge
- Git installed on VPS

---

## 🎯 Quick Start (5 Steps)

```bash
# 1. Install base system
sudo bash deploy/scripts/install-vps.sh

# 2. Deploy backend
sudo bash deploy/scripts/deploy-backend.sh

# 3. Deploy frontend
sudo bash deploy/scripts/deploy-frontend.sh

# 4. Setup SSL certificates
sudo bash deploy/scripts/setup-ssl.sh

# 5. Configure Cloudflare
bash deploy/scripts/setup-cloudflare.sh
```

---

## 📝 Detailed Step-by-Step Guide

### Step 1: Prepare Your VPS

#### 1.1 Connect to VPS
```bash
ssh root@your-vps-ip
```

#### 1.2 Update System
```bash
apt update && apt upgrade -y
```

#### 1.3 Create Deployment User (Optional but recommended)
```bash
adduser deploy
usermod -aG sudo deploy
su - deploy
```

### Step 2: Clone Repository

```bash
# Navigate to web directory
cd /var/www

# Clone your repository
sudo git clone https://github.com/yourusername/workmonitor.git
# OR upload files via SFTP

# Set ownership
sudo chown -R www-data:www-data /var/www/workmonitor
```

### Step 3: Configure Environment

#### 3.1 Create Production Environment File
```bash
cd /var/www/workmonitor
sudo cp .env.production.example .env.production
sudo nano .env.production
```

#### 3.2 Update Environment Variables
```env
# Supabase (already have these from development)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Stripe (get from Stripe Dashboard)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_API_KEY=sk_live_...

# Application URLs (replace with your domain)
API_URL=https://api.yourdomain.com
FRONTEND_URL=https://yourdomain.com
BACKEND_PORT=8001

# Security (generate random 256-bit key)
JWT_SECRET_KEY=$(openssl rand -hex 32)
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

Save and exit (Ctrl+X, Y, Enter)

### Step 4: Run Installation Script

```bash
cd /var/www/workmonitor
sudo bash deploy/scripts/install-vps.sh
```

This installs:
- Python 3.11
- Node.js 18
- Nginx
- Certbot (SSL certificates)
- Fail2ban (security)
- UFW firewall

### Step 5: Deploy Backend

```bash
sudo bash deploy/scripts/deploy-backend.sh
```

This will:
- Create Python virtual environment
- Install Python dependencies
- Set up systemd service
- Start the backend API server

#### Verify Backend is Running
```bash
# Check service status
sudo systemctl status workmonitor-backend

# Check logs
sudo journalctl -u workmonitor-backend -f

# Test API
curl http://localhost:8001/api/
```

### Step 6: Deploy Frontend

```bash
sudo bash deploy/scripts/deploy-frontend.sh
```

When prompted, enter your domain name (e.g., `workmonitor.com`)

This will:
- Install Node.js dependencies
- Build production React bundle
- Configure Nginx
- Start web server

#### Verify Nginx is Running
```bash
# Check Nginx status
sudo systemctl status nginx

# Test configuration
sudo nginx -t
```

### Step 7: Configure DNS (Before SSL)

**IMPORTANT**: Do this BEFORE running SSL setup!

Go to your domain registrar and add these DNS records:

```
Type    Name    Value              TTL
A       @       your-vps-ip        300
A       www     your-vps-ip        300
A       api     your-vps-ip        300
```

Wait 5-10 minutes for DNS propagation, then verify:
```bash
dig yourdomain.com
dig www.yourdomain.com
dig api.yourdomain.com
```

### Step 8: Setup SSL Certificates

```bash
sudo bash deploy/scripts/setup-ssl.sh
```

Enter when prompted:
- Primary domain: `yourdomain.com`
- WWW domain: `www.yourdomain.com`
- API subdomain: `api.yourdomain.com`
- Email: `your@email.com`

This will:
- Obtain Let's Encrypt SSL certificates
- Configure automatic renewal
- Enable HTTPS

#### Verify SSL
```bash
# Check certificate
sudo certbot certificates

# Test auto-renewal
sudo certbot renew --dry-run
```

### Step 9: Configure Cloudflare

```bash
bash deploy/scripts/setup-cloudflare.sh
```

Follow the interactive guide to:
1. Add domain to Cloudflare
2. Update nameservers
3. Configure DNS (set to Proxied/Orange)
4. Enable SSL/TLS (Full Strict mode)
5. Configure security settings
6. Set up firewall rules
7. Enable caching and optimization

### Step 10: Configure Stripe Webhook

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/webhooks)
2. Click "Add endpoint"
3. Enter webhook URL: `https://api.yourdomain.com/api/webhook/stripe`
4. Select events to listen to:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
5. Copy the webhook secret
6. Update `.env.production`:
   ```bash
   sudo nano /var/www/workmonitor/.env.production
   # Update STRIPE_WEBHOOK_SECRET=whsec_...
   ```
7. Restart backend:
   ```bash
   sudo systemctl restart workmonitor-backend
   ```

### Step 11: Test Everything

#### Test Backend API
```bash
curl https://api.yourdomain.com/api/
```

#### Test Frontend
Open browser and visit:
- `https://yourdomain.com`
- `https://www.yourdomain.com`

#### Test Authentication
1. Go to `https://yourdomain.com/signup`
2. Create an account
3. Login
4. Verify dashboard loads

#### Test Payment Flow
1. Go to `https://yourdomain.com/pricing`
2. Select a plan
3. Enter test credit card: `4242 4242 4242 4242`
4. Complete payment
5. Verify subscription is activated

---

## 🐳 Alternative: Docker Deployment

If you prefer Docker:

### Build and Run with Docker Compose

```bash
cd /var/www/workmonitor/deploy/docker

# Build images
docker-compose build

# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

---

## 📊 Monitoring & Maintenance

### View Logs

```bash
# Backend logs
sudo journalctl -u workmonitor-backend -f
tail -f /var/log/workmonitor/backend.log

# Nginx logs
tail -f /var/log/nginx/workmonitor_access.log
tail -f /var/log/nginx/workmonitor_error.log

# System logs
tail -f /var/log/syslog
```

### Restart Services

```bash
# Restart backend
sudo systemctl restart workmonitor-backend

# Restart Nginx
sudo systemctl restart nginx

# Restart all
sudo systemctl restart workmonitor-backend nginx
```

### Update Application

```bash
# Pull latest code
cd /var/www/workmonitor
sudo git pull origin main

# Update backend
cd backend
source ../venv/bin/activate
pip install -r requirements.txt
sudo systemctl restart workmonitor-backend

# Update frontend
cd ../frontend
npm install
npm run build
sudo systemctl reload nginx
```

### Monitor Resource Usage

```bash
# CPU and memory
htop

# Disk usage
df -h

# Service status
sudo systemctl status workmonitor-backend nginx

# Check SSL expiry
sudo certbot certificates
```

---

## 🔒 Security Best Practices

### 1. Firewall Configuration
```bash
# Allow only necessary ports
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow http
sudo ufw allow https
sudo ufw enable
```

### 2. Fail2ban (Already configured)
```bash
# Check banned IPs
sudo fail2ban-client status

# Unban IP if needed
sudo fail2ban-client set sshd unbanip <ip-address>
```

### 3. Regular Updates
```bash
# Update system weekly
sudo apt update && sudo apt upgrade -y

# Update Python packages
source /var/www/workmonitor/venv/bin/activate
pip list --outdated

# Update Node packages
cd /var/www/workmonitor/frontend
npm outdated
```

### 4. Backup Database
Supabase handles backups automatically, but you can export:
```bash
# Backup Supabase data via dashboard
# Or use pg_dump if you have direct database access
```

### 5. Monitor SSL Certificates
```bash
# Auto-renewal is configured, but verify:
sudo certbot renew --dry-run

# Check expiry
sudo certbot certificates
```

---

## 🚨 Troubleshooting

### Backend Not Starting

```bash
# Check logs
sudo journalctl -u workmonitor-backend -n 50

# Verify environment file
cat /var/www/workmonitor/.env.production

# Check if port is in use
sudo netstat -tulpn | grep 8001

# Restart service
sudo systemctl restart workmonitor-backend
```

### Frontend Not Loading

```bash
# Check Nginx errors
tail -f /var/log/nginx/workmonitor_error.log

# Test Nginx config
sudo nginx -t

# Verify build directory exists
ls -la /var/www/workmonitor/frontend/build

# Reload Nginx
sudo systemctl reload nginx
```

### SSL Certificate Issues

```bash
# Renew certificates manually
sudo certbot renew

# Check certificate status
sudo certbot certificates

# If renewal fails, obtain new certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

### Database Connection Issues

```bash
# Test Supabase connection
curl -H "apikey: YOUR_ANON_KEY" \
  https://your-project.supabase.co/rest/v1/

# Verify environment variables
cat /var/www/workmonitor/.env.production | grep SUPABASE
```

### Cloudflare Issues

- Set SSL/TLS to "Full (strict)"
- Ensure DNS records are Proxied (Orange cloud)
- Check firewall rules aren't blocking traffic
- Verify origin server is accessible: https://your-vps-ip

---

## 📞 Getting Help

### Check Status Dashboard
```bash
# Create a simple status check script
curl -s https://api.yourdomain.com/api/ && echo "✓ API OK" || echo "✗ API DOWN"
curl -s https://yourdomain.com && echo "✓ Frontend OK" || echo "✗ Frontend DOWN"
```

### Common Error Solutions

| Error | Solution |
|-------|----------|
| 502 Bad Gateway | Backend not running - check `sudo systemctl status workmonitor-backend` |
| 403 Forbidden | File permissions issue - `sudo chown -R www-data:www-data /var/www/workmonitor` |
| SSL Error | Certificate issue - run `sudo certbot renew` |
| Database Connection | Check Supabase status and environment variables |

---

## ✅ Post-Deployment Checklist

- [ ] Backend API responding at `https://api.yourdomain.com/api/`
- [ ] Frontend accessible at `https://yourdomain.com`
- [ ] SSL certificate valid (A+ rating on SSL Labs)
- [ ] Cloudflare DNS configured and proxying
- [ ] Signup/Login working
- [ ] Payment flow functional (test mode)
- [ ] Stripe webhook receiving events
- [ ] Firewall configured (UFW enabled)
- [ ] Fail2ban active
- [ ] Auto-renewal configured for SSL
- [ ] Monitoring set up
- [ ] Backups scheduled

---

## 🎉 Your WorkMonitor is Now Live!

Your complete time tracking platform is now deployed and running on:
- **Website**: https://yourdomain.com
- **API**: https://api.yourdomain.com
- **Protected by**: Cloudflare CDN + DDoS Protection
- **Secured with**: Let's Encrypt SSL/TLS
- **Database**: Supabase PostgreSQL
- **Payments**: Stripe

---

## 📚 Next Steps

1. **Build Desktop Apps**: See `deploy/apps/DESKTOP_BUILD_GUIDE.md`
2. **Build Mobile Apps**: See `deploy/apps/MOBILE_BUILD_GUIDE.md`
3. **Package Browser Extensions**: See `deploy/apps/EXTENSION_BUILD_GUIDE.md`
4. **Set up Monitoring**: Install monitoring tools (Grafana, Prometheus)
5. **Configure Backups**: Set up automated database backups
6. **Add Custom Domain Email**: Configure email forwarding
7. **Set up Status Page**: Create uptime monitoring

---

Need help? Check the troubleshooting section or review the logs!
