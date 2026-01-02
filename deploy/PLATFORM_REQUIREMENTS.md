# 📋 Platform Requirements for WorkMonitor

This document outlines exactly what you need from different platforms and services to run WorkMonitor.

---

## 🖥️ VPS/Hosting Requirements

### For Contabo VPS or Hostinger VPS

**Minimum Specifications:**
- **OS**: Ubuntu 20.04 LTS or 22.04 LTS
- **RAM**: 2GB (4GB recommended)
- **Storage**: 20GB SSD minimum
- **CPU**: 2 cores minimum
- **Bandwidth**: Unmetered or 1TB+
- **IP Address**: 1 dedicated IPv4 address

**What you get:**
```
✅ Root/sudo access
✅ Full server control
✅ Ability to install software
✅ Port 80/443 access
✅ SSH access
```

**Monthly Cost**: $5-15/month

**Recommended Providers:**
- **Contabo**: https://contabo.com/
  - VPS S: €4.99/month (4GB RAM, 2 cores)
  - VPS M: €8.99/month (8GB RAM, 4 cores)

- **Hostinger**: https://www.hostinger.com/vps-hosting
  - VPS 1: $5.99/month (4GB RAM, 2 cores)
  - VPS 2: $7.99/month (8GB RAM, 4 cores)

- **DigitalOcean**: https://www.digitalocean.com/
  - Basic Droplet: $6/month (1GB RAM, 1 core)
  - Regular Droplet: $12/month (2GB RAM, 2 cores)

- **Vultr**: https://www.vultr.com/
  - Cloud Compute: $6/month (1GB RAM, 1 core)
  - High Frequency: $12/month (2GB RAM, 1 core)

---

## 🌐 Domain Name

**What you need:**
- A registered domain name (e.g., workmonitor.com)
- Access to DNS management

**What you'll configure:**
```
DNS Records:
- A record: @ → your-vps-ip
- A record: www → your-vps-ip
- A record: api → your-vps-ip
```

**Cost**: $10-15/year

**Recommended Registrars:**
- **Namecheap**: https://www.namecheap.com/
- **GoDaddy**: https://www.godaddy.com/
- **Cloudflare Registrar**: https://www.cloudflare.com/products/registrar/
- **Google Domains**: https://domains.google/

---

## 🛡️ Cloudflare (Free Plan)

**What you need:**
- Free Cloudflare account
- Your domain added to Cloudflare
- Nameservers updated at your registrar

**What you get:**
```
✅ DDoS protection (unlimited)
✅ CDN (content delivery network)
✅ SSL certificate (optional, we use Let's Encrypt)
✅ Web Application Firewall (WAF)
✅ Rate limiting
✅ Analytics
✅ Page rules (3 free)
```

**Cost**: FREE

**Sign up**: https://dash.cloudflare.com/sign-up

**Configuration needed:**
1. Add your domain
2. Update nameservers at registrar
3. Set SSL/TLS mode to "Full (strict)"
4. Enable "Always Use HTTPS"
5. Set DNS records to Proxied (orange cloud)

---

## 💾 Database (Supabase)

**✅ Already configured in your project!**

**What you have:**
- PostgreSQL database
- Supabase connection string
- Authentication system
- Row Level Security (RLS)

**Free Plan Includes:**
```
✅ 500MB database storage
✅ 1GB file storage
✅ 2GB bandwidth
✅ 50,000 monthly active users
✅ 500,000 Edge Function invocations
✅ Daily backups (7 days retention)
```

**Cost**: FREE (sufficient for starting)

**Upgrade options** (when needed):
- Pro: $25/month (8GB database, 100GB storage, 250GB bandwidth)
- Team: $599/month (unlimited)

**Your Supabase is already set up - no action needed!**

---

## 💳 Payment Processing (Stripe)

**✅ Already integrated in your project!**

**What you need:**
1. Stripe account (free to create)
2. API keys (from Stripe Dashboard)
3. Webhook endpoint configured

**Sign up**: https://dashboard.stripe.com/register

**What you'll get:**
```
API Keys:
- Publishable key (pk_live_...)
- Secret key (sk_live_...)
- Webhook secret (whsec_...)
```

**Cost**:
- Free to set up
- 2.9% + $0.30 per transaction
- No monthly fees

**Configuration steps:**
1. Create Stripe account
2. Complete business verification
3. Get API keys from Dashboard
4. Add keys to `.env.production`
5. Set up webhook endpoint: `https://api.yourdomain.com/api/webhook/stripe`
6. Select events: `checkout.session.completed`, `payment_intent.succeeded`

---

## 🔐 SSL Certificate (Let's Encrypt)

**✅ Automatically handled by deployment scripts!**

**What you get:**
- Free SSL/TLS certificate
- Automatic renewal every 90 days
- A+ SSL rating

**Cost**: FREE

**Handled by**: Certbot (installed during VPS setup)

**No action needed** - the `setup-ssl.sh` script handles everything.

---

## 📱 Mobile App Distribution

### iOS - Apple Developer Program

**What you need:**
- Apple Developer account
- macOS computer (for building)
- Xcode installed

**Cost**: $99/year

**Sign up**: https://developer.apple.com/programs/enroll/

**What you get:**
```
✅ Ability to publish on App Store
✅ TestFlight beta testing
✅ App analytics
✅ Push notifications
✅ Code signing certificates
```

### Android - Google Play Developer

**What you need:**
- Google Play Developer account
- Any computer (Windows/Mac/Linux)
- Android Studio (free)

**Cost**: $25 one-time fee

**Sign up**: https://play.google.com/console/signup

**What you get:**
```
✅ Ability to publish on Play Store
✅ Internal/closed/open testing
✅ App analytics
✅ Push notifications
✅ In-app billing
```

---

## 🖥️ Desktop App Distribution

### Windows Code Signing

**What you need (optional but recommended):**
- Code signing certificate
- Windows Authenticode certificate

**Cost**: $100-400/year

**Providers:**
- Sectigo: https://sectigo.com/ssl-certificates-tls/code-signing
- DigiCert: https://www.digercert.com/signing/code-signing-certificates
- Comodo: https://www.comodo.com/e-commerce/code-signing/

**Why?**
- Removes "Unknown Publisher" warning
- Users trust signed applications
- Required for some enterprises

**Can publish without?** Yes, but users will see security warnings.

### macOS Code Signing

**What you need:**
- Apple Developer account ($99/year)
- Developer ID certificate
- macOS computer

**Why?**
- Required for App Store distribution
- Required for Gatekeeper approval
- Users trust signed applications

### Linux

**No code signing required!**
- AppImage, DEB, RPM can be distributed directly
- Users can install without warnings

---

## 🔌 Browser Extension Distribution

### Chrome Web Store

**What you need:**
- Google account
- Developer registration

**Cost**: $5 one-time fee

**Sign up**: https://chrome.google.com/webstore/devconsole/

**What you get:**
```
✅ Publish extensions
✅ Automatic updates
✅ User reviews and ratings
✅ Analytics
```

### Firefox Add-ons

**What you need:**
- Mozilla account
- Add-on signing (free)

**Cost**: FREE

**Sign up**: https://addons.mozilla.org/developers/

**What you get:**
```
✅ Publish extensions
✅ Automatic updates
✅ User reviews
✅ Statistics
```

### Microsoft Edge Add-ons

**What you need:**
- Microsoft Partner Center account
- Microsoft account

**Cost**: FREE

**Sign up**: https://partner.microsoft.com/dashboard/microsoftedge/

**What you get:**
```
✅ Publish extensions
✅ Automatic updates
✅ User reviews
✅ Insights
```

---

## 📊 Optional Services

### Email Service (for notifications)

**Recommended providers:**
- **SendGrid**: 100 emails/day free
- **Mailgun**: 5,000 emails/month free
- **AWS SES**: $0.10 per 1,000 emails

**Not required initially** - users can use the app without email notifications.

### Cloud Storage (for screenshots/recordings)

**Recommended providers:**
- **AWS S3**: $0.023 per GB/month
- **DigitalOcean Spaces**: $5/month (250GB)
- **Cloudinary**: 25GB free

**Can store on VPS initially** - migrate to cloud storage when needed.

### Monitoring/Analytics

**Free options:**
- **Google Analytics**: Website analytics
- **Sentry**: Error tracking (free tier)
- **UptimeRobot**: Uptime monitoring (50 monitors free)

**Not required initially** - can add later as you grow.

---

## 💰 Total Cost Breakdown

### Absolute Minimum (To Get Started)

| Item | Provider | Cost |
|------|----------|------|
| VPS Hosting | Contabo/Hostinger | $5-15/month |
| Domain Name | Namecheap/GoDaddy | $10-15/year (~$1/month) |
| Cloudflare | Cloudflare | FREE |
| SSL Certificate | Let's Encrypt | FREE |
| Database | Supabase | FREE |
| Stripe | Stripe | 2.9% + $0.30/transaction only |
| **Monthly Total** | | **$6-16/month** |

### With Mobile Apps

| Item | Cost |
|------|------|
| Base infrastructure | $6-16/month |
| Apple Developer | $99/year (~$8/month) |
| Google Play Developer | $25 one-time (~$2 first month) |
| **Monthly Total** | **$14-24/month** |

### With All Apps & Extensions

| Item | Cost |
|------|------|
| Base infrastructure | $6-16/month |
| Apple Developer | $99/year (~$8/month) |
| Google Play Developer | $25 one-time |
| Windows Code Signing | $100-400/year (~$8-33/month) |
| Chrome Web Store | $5 one-time |
| **Monthly Total** | **$22-57/month** |

---

## ✅ What You DON'T Need

❌ **AWS/GCP/Azure** - Not required (VPS is sufficient)
❌ **MongoDB Atlas** - Not using MongoDB (using Supabase)
❌ **Redis** - Not required initially
❌ **Docker Hub** - Optional (can use Docker locally)
❌ **GitHub Actions** - Optional CI/CD
❌ **Custom SMTP** - Optional (SendGrid free tier works)
❌ **CDN Service** - Cloudflare provides CDN
❌ **Load Balancer** - Not needed initially
❌ **Dedicated Server** - VPS is sufficient

---

## 🎯 Recommended Starting Point

**Month 1 Budget: $6-16/month**

Start with:
1. ✅ VPS (Contabo or Hostinger)
2. ✅ Domain name
3. ✅ Cloudflare (free)
4. ✅ Supabase (free)
5. ✅ Stripe (pay per transaction)

**Deploy website first, then add:**
- Desktop apps (free to build)
- Browser extensions (ChromeWeb Store: $5)
- Mobile apps when revenue allows ($99+$25)

**Scale as you grow** - start small, add services as needed.

---

## 📞 Where to Get Everything

### Essential (Required)
1. **VPS**: https://contabo.com/ or https://www.hostinger.com/vps-hosting
2. **Domain**: https://www.namecheap.com/
3. **Cloudflare**: https://dash.cloudflare.com/sign-up
4. **Stripe**: https://dashboard.stripe.com/register
5. **Supabase**: Already configured ✅

### Optional (When Ready)
6. **Apple Developer**: https://developer.apple.com/programs/
7. **Google Play**: https://play.google.com/console/signup
8. **Chrome Store**: https://chrome.google.com/webstore/devconsole/
9. **Code Signing**: https://sectigo.com/ssl-certificates-tls/code-signing

---

## 🚀 Ready to Deploy?

You now know exactly what you need from each platform!

**Next step**: Start with `deploy/README.md` to begin deployment.

**Questions?** All services listed have free tiers or trials - you can start risk-free!
