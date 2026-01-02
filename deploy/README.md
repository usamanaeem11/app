# 🚀 WorkMonitor Deployment Package

**Complete production deployment solution for VPS hosting with Cloudflare security.**

This package contains everything you need to deploy WorkMonitor to your own infrastructure - fully independent from any development platforms.

---

## 📦 What's Included

### 🌐 Web Application
- **Backend API**: FastAPI Python server with Supabase database
- **Frontend**: React SPA with modern UI components
- **Nginx Configuration**: Production-ready web server setup
- **SSL/TLS**: Automatic Let's Encrypt certificate management
- **Cloudflare Integration**: DDoS protection, CDN, and security

### 📱 Native Applications
- **Desktop App**: Electron-based time tracker (Windows, macOS, Linux)
- **Mobile App**: React Native app (iOS & Android)
- **Browser Extensions**: Chrome, Firefox, Edge productivity tracking

### 🔐 Security & Payments
- **Supabase Auth**: Secure user authentication
- **Stripe Integration**: Payment processing (already integrated)
- **RLS Policies**: Row-level security on all database tables
- **Cloudflare**: WAF, DDoS protection, rate limiting

---

## 🎯 Quick Start

### Prerequisites
- VPS (Contabo/Hostinger or similar) with Ubuntu 20.04/22.04
- Domain name
- Cloudflare account (free)
- Supabase database (already configured)

### Deploy in 5 Steps

```bash
# 1. Clone repository to VPS
ssh root@your-vps
cd /var/www
git clone https://github.com/yourusername/workmonitor.git
cd workmonitor

# 2. Install system dependencies
sudo bash deploy/scripts/install-vps.sh

# 3. Deploy backend
sudo bash deploy/scripts/deploy-backend.sh

# 4. Deploy frontend
sudo bash deploy/scripts/deploy-frontend.sh

# 5. Setup SSL & Cloudflare
sudo bash deploy/scripts/setup-ssl.sh
bash deploy/scripts/setup-cloudflare.sh
```

**Done!** Your WorkMonitor platform is now live at `https://yourdomain.com`

---

## 📚 Documentation

### Web Deployment
- **[Deployment Guide](DEPLOYMENT_GUIDE.md)** - Complete VPS setup walkthrough
- **[Nginx Configuration](nginx/workmonitor.conf)** - Production web server config
- **[Systemd Service](systemd/workmonitor-backend.service)** - Backend service setup
- **[Docker Setup](docker/)** - Alternative containerized deployment

### Application Building
- **[Desktop App Guide](apps/DESKTOP_BUILD_GUIDE.md)** - Build Windows/Mac/Linux apps
- **[Mobile App Guide](apps/MOBILE_BUILD_GUIDE.md)** - Build iOS/Android apps
- **[Browser Extensions](apps/EXTENSION_BUILD_GUIDE.md)** - Build Chrome/Firefox/Edge extensions

### Scripts
- `install-vps.sh` - System dependencies installation
- `deploy-backend.sh` - Backend deployment script
- `deploy-frontend.sh` - Frontend deployment script
- `setup-ssl.sh` - SSL certificate setup
- `setup-cloudflare.sh` - Cloudflare configuration guide

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                      CLOUDFLARE                          │
│            (CDN, DDoS Protection, WAF)                   │
└────────────────────┬────────────────────────────────────┘
                     │
         ┌───────────┴───────────┐
         │                       │
    ┌────▼─────┐          ┌─────▼────┐
    │  Nginx   │          │  Nginx   │
    │ (HTTPS)  │          │ (HTTPS)  │
    └────┬─────┘          └─────┬────┘
         │                      │
    ┌────▼─────────┐     ┌─────▼────────┐
    │   React      │     │   FastAPI    │
    │   Frontend   │────>│   Backend    │
    │  (Port 443)  │     │  (Port 8001) │
    └──────────────┘     └─────┬────────┘
                               │
                        ┌──────▼──────┐
                        │  Supabase   │
                        │  PostgreSQL │
                        └─────────────┘
```

### Data Flow

1. **User Access**: User visits `https://yourdomain.com`
2. **Cloudflare**: Filters malicious traffic, caches static assets
3. **Nginx**: Serves React frontend, proxies API requests
4. **Backend**: FastAPI processes requests
5. **Database**: Supabase stores all application data
6. **Stripe**: Processes payments via webhooks

---

## 🔧 Configuration

### Environment Variables

Create `/var/www/workmonitor/.env.production`:

```env
# Supabase (Database)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Stripe (Payments)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_API_KEY=sk_live_...

# Application
API_URL=https://api.yourdomain.com
FRONTEND_URL=https://yourdomain.com
BACKEND_PORT=8001

# Security
JWT_SECRET_KEY=$(openssl rand -hex 32)
ALLOWED_ORIGINS=https://yourdomain.com
```

### Domain Configuration

Update domains in:
- `deploy/nginx/workmonitor.conf` - Replace `yourdomain.com`
- Frontend environment variables
- Cloudflare DNS settings

---

## 🚀 Deployment Methods

### Method 1: Traditional VPS (Recommended)
- Direct deployment to Ubuntu VPS
- Full control over server
- Uses systemd services
- Best for production

**Pros**: Full control, cost-effective, simple
**Cons**: Manual setup required

### Method 2: Docker
- Containerized deployment
- Easier scaling
- Consistent environments

**Pros**: Portable, reproducible, isolated
**Cons**: Slight overhead, requires Docker knowledge

```bash
cd deploy/docker
docker-compose up -d
```

### Method 3: Cloud Platforms
- Deploy to DigitalOcean, AWS, Railway, etc.
- Platform-specific configurations
- Often includes automatic scaling

---

## 📊 What Gets Deployed

### Backend (`/var/www/workmonitor/backend`)
- FastAPI Python application
- RESTful API endpoints
- WebSocket server (for real-time features)
- Stripe webhook handler
- Supabase database connection
- JWT authentication

### Frontend (`/var/www/workmonitor/frontend/build`)
- React Single Page Application (SPA)
- Marketing pages
- User dashboard
- Time tracking interface
- Payment/subscription pages

### Desktop App (`desktop-tracker/dist/`)
- Electron application
- Time tracking agent
- Screenshot capture
- Activity monitoring
- Runs on user's computer

### Mobile App
- React Native application
- iOS (.ipa) and Android (.apk)
- Time tracking on mobile
- GPS tracking (with consent)
- Available via App Store/Play Store

### Browser Extensions (`browser-extensions/`)
- Chrome, Firefox, Edge extensions
- Website time tracking
- Tab monitoring
- Distributed via browser stores

---

## 🔐 Security Features

### Network Security
- **Cloudflare WAF**: Web Application Firewall
- **DDoS Protection**: Automatic mitigation
- **Rate Limiting**: Prevent abuse
- **SSL/TLS**: Encrypted connections (A+ rating)

### Application Security
- **Row Level Security (RLS)**: Database-level access control
- **JWT Authentication**: Secure token-based auth
- **CORS Configuration**: Controlled cross-origin requests
- **Input Validation**: Prevent injection attacks

### Server Security
- **UFW Firewall**: Only ports 22, 80, 443 open
- **Fail2ban**: Automatic IP blocking after failed attempts
- **Automatic Updates**: Security patches via unattended-upgrades
- **Non-root User**: Services run as www-data

---

## 📈 Monitoring & Maintenance

### View Logs

```bash
# Backend API logs
sudo journalctl -u workmonitor-backend -f
tail -f /var/log/workmonitor/backend.log

# Nginx access logs
tail -f /var/log/nginx/workmonitor_access.log

# Nginx error logs
tail -f /var/log/nginx/workmonitor_error.log
```

### Restart Services

```bash
# Restart backend
sudo systemctl restart workmonitor-backend

# Restart web server
sudo systemctl restart nginx

# Check status
sudo systemctl status workmonitor-backend nginx
```

### Update Application

```bash
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

---

## 💰 Cost Estimate

### Infrastructure Costs

| Item | Provider | Cost |
|------|----------|------|
| VPS (2GB RAM, 2 CPU) | Contabo/Hostinger | $5-15/month |
| Domain Name | Namecheap/GoDaddy | $10-15/year |
| Cloudflare | Cloudflare | Free |
| Supabase Database | Supabase | Free (up to 500MB) |
| Stripe Payment | Stripe | 2.9% + $0.30/transaction |
| SSL Certificate | Let's Encrypt | Free |
| **Total** | | **~$5-15/month** |

### Optional Costs

| Item | Cost |
|------|------|
| Apple Developer ($99/year) | For iOS app distribution |
| Google Play Developer ($25 one-time) | For Android distribution |
| Code Signing Certificate ($100-400/year) | For Windows/Mac desktop apps |
| Chrome Web Store ($5 one-time) | For Chrome extension |

---

## 🆘 Troubleshooting

### Common Issues

**1. Backend Not Starting**
```bash
sudo journalctl -u workmonitor-backend -n 50
# Check .env.production file
# Verify Supabase credentials
```

**2. Frontend Shows 502 Error**
```bash
# Backend is down, check:
sudo systemctl status workmonitor-backend
# Restart if needed:
sudo systemctl restart workmonitor-backend
```

**3. SSL Certificate Error**
```bash
# Renew certificates
sudo certbot renew
# Restart nginx
sudo systemctl restart nginx
```

**4. Cloudflare SSL Loop**
- Set Cloudflare SSL/TLS mode to "Full (strict)"
- Ensure Let's Encrypt certificate is installed

**5. Database Connection Failed**
- Verify SUPABASE_URL in .env.production
- Check Supabase project status
- Test connection: `curl $VITE_SUPABASE_URL/rest/v1/`

### Getting Help

1. Check logs first (see Monitoring section)
2. Review [Deployment Guide](DEPLOYMENT_GUIDE.md)
3. Verify environment variables
4. Test API directly: `curl https://api.yourdomain.com/api/`

---

## ✅ Post-Deployment Checklist

### Web Platform
- [ ] Frontend accessible at https://yourdomain.com
- [ ] Backend API responding at https://api.yourdomain.com/api/
- [ ] SSL certificate valid (test at ssllabs.com)
- [ ] Cloudflare proxy enabled (orange cloud)
- [ ] User signup/login working
- [ ] Payment flow functional
- [ ] Stripe webhooks receiving events
- [ ] Database migrations applied
- [ ] Firewall enabled (UFW)
- [ ] Fail2ban active

### Applications
- [ ] Desktop app built for Windows/Mac/Linux
- [ ] Mobile app submitted to App Store/Play Store
- [ ] Browser extensions submitted to stores
- [ ] Download links added to website
- [ ] Documentation published

### Monitoring
- [ ] Server monitoring setup
- [ ] Error tracking configured
- [ ] Backup strategy implemented
- [ ] SSL auto-renewal configured
- [ ] Analytics integrated

---

## 🎉 You're All Set!

Your WorkMonitor platform is now:
- ✅ Deployed on your own VPS
- ✅ Protected by Cloudflare
- ✅ Secured with SSL/TLS
- ✅ Connected to Supabase database
- ✅ Integrated with Stripe payments
- ✅ **100% Independent from development platforms**

### What You Own
- Complete source code
- All infrastructure
- All data (in your Supabase)
- All user accounts
- All revenue (minus Stripe fees)

### Next Steps
1. Build and distribute native apps
2. Set up monitoring and analytics
3. Configure automated backups
4. Launch marketing campaigns
5. Gather user feedback
6. Iterate and improve

---

## 📞 Support & Resources

### Official Documentation
- [Supabase Docs](https://supabase.com/docs)
- [FastAPI Docs](https://fastapi.tiangolo.com/)
- [React Docs](https://react.dev/)
- [Nginx Docs](https://nginx.org/en/docs/)
- [Stripe Docs](https://stripe.com/docs)

### Community
- Supabase Discord
- FastAPI Discord
- React Community Forums

### Deployment Guides
- DigitalOcean Tutorials
- Cloudflare Learning Center
- Let's Encrypt Documentation

---

## 📄 License

This deployment package is part of the WorkMonitor project.
Ensure you comply with all licensing requirements for included technologies:
- FastAPI (MIT)
- React (MIT)
- Supabase (Apache 2.0)
- Nginx (BSD-like)

---

## 🙏 Credits

Built with:
- FastAPI
- React
- Supabase
- Stripe
- Nginx
- Cloudflare
- Let's Encrypt
- Electron
- React Native

---

**Ready to deploy? Start with the [Deployment Guide](DEPLOYMENT_GUIDE.md)!**
