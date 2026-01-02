# Apps & Extensions Setup Guide

Complete guide for setting up and deploying all WorkMonitor client applications and browser extensions.

## Overview

WorkMonitor includes 4 client applications:

1. **Desktop Tracker** (Electron) - Windows, macOS, Linux
2. **Mobile App** (React Native/Expo) - iOS & Android
3. **Browser Extensions** - Chrome, Firefox, Edge
4. **Web App** (React) - Main dashboard

## Status Summary

### ✅ Desktop Tracker - Ready to Deploy
- Fully functional time tracking
- Screenshot capture with configurable intervals
- Activity monitoring (app/window tracking)
- Idle detection
- System tray integration
- Needs: Icon assets and environment setup

### ✅ Mobile App - Fully Implemented
- 7 complete screens (Login, Dashboard, Timer, Attendance, Projects, Timesheets, Profile)
- Navigation configured
- API integration ready
- Needs: Dependencies installation and testing

### ✅ Browser Extensions - Functional
- Chrome, Firefox, and Edge versions
- Tab tracking and URL monitoring
- Activity categorization
- Daily time totals
- Needs: Icon assets

---

## Quick Start

### 1. Desktop Tracker

**Install & Run:**
```bash
cd desktop-tracker
npm install
npm start
```

**Configure:**
```bash
cp .env.example .env
# Edit .env with your API URL
```

**Build for Distribution:**
```bash
npm run build:win    # Windows installer
npm run build:mac    # macOS app
npm run build:linux  # Linux AppImage
```

**Create Icons:**
- Design a 512x512 PNG with green background (#10b981)
- Use [icon.kitchen](https://icon.kitchen/) to generate all formats
- Place in `assets/` folder

---

### 2. Mobile App

**Install & Run:**
```bash
cd mobile-app
npm install
npm start
```

**Test on Device:**
```bash
# Install Expo Go app on your phone
# Scan QR code displayed in terminal
```

**Configure:**
```bash
cp .env.example .env
# Set REACT_APP_API_URL
```

**Build for Production:**
```bash
# iOS
npx expo build:ios

# Android
npx expo build:android
```

**Screens Included:**
- Login - Email/password authentication
- Dashboard - Stats, quick actions, recent activity
- Time Tracking - Start/stop timer with project selection
- Attendance - Clock in/out with history
- Projects - Project list with status
- Timesheets - Weekly timesheet summaries
- Profile - User info and logout

---

### 3. Browser Extensions

**Load in Browser:**

**Chrome/Edge:**
1. Open `chrome://extensions` or `edge://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select `browser-extensions/chrome` or `browser-extensions/edge`

**Firefox:**
1. Open `about:debugging`
2. Click "Load Temporary Add-on"
3. Select any file from `browser-extensions/firefox`

**Configure API URL:**
Edit `background.js` in each extension:
```javascript
const API_URL = 'http://localhost:8001/api';
```

**Create Icons:**
Create 4 PNG files for each extension:
- `icons/icon16.png` - 16x16
- `icons/icon32.png` - 32x32
- `icons/icon48.png` - 48x48
- `icons/icon128.png` - 128x128

Use [ResizeImage.net](https://resizeimage.net/) to resize from a base 128x128 design.

---

## Feature Compatibility Matrix

| Feature | Desktop | Mobile | Extension | Web |
|---------|---------|--------|-----------|-----|
| Time Tracking | ✅ | ✅ | ✅ | ✅ |
| Screenshots | ✅ | ❌ | ❌ | View Only |
| Activity Monitoring | ✅ | ❌ | ✅ | View Only |
| Idle Detection | ✅ | ❌ | ❌ | View Only |
| GPS Tracking | ❌ | ✅ | ❌ | View Only |
| Clock In/Out | ✅ | ✅ | ❌ | ✅ |
| Projects | ✅ | ✅ | ❌ | ✅ |
| Timesheets | View | ✅ | ❌ | ✅ |
| Reports | ❌ | ❌ | ❌ | ✅ |

---

## Subscription Tier Features

### Starter ($2.99/user/month)
- Basic time tracking
- Limited screenshots (10/day)
- Basic reports
- **Apps**: All functional with limited features

### Pro ($4.99/user/month)
- Unlimited time tracking
- Unlimited screenshots
- Activity monitoring
- GPS tracking
- **Apps**: Full functionality

### Business ($6.99/user/month)
- All Pro features
- Screen recording
- Advanced analytics
- White label options
- **Apps**: Full access + premium features

---

## Deployment Checklist

### Pre-Deployment

- [ ] Backend API running and accessible
- [ ] Database migrations applied
- [ ] Supabase configured
- [ ] Environment variables set
- [ ] SSL certificates for production

### Desktop Tracker

- [ ] Environment file configured
- [ ] Icon assets created
- [ ] Dependencies installed
- [ ] Tested on target platforms
- [ ] Built installers/packages
- [ ] Code signed (Windows/macOS)
- [ ] Tested installation

### Mobile App

- [ ] Dependencies installed
- [ ] API URL configured
- [ ] Tested on iOS device
- [ ] Tested on Android device
- [ ] App icons created
- [ ] Splash screen configured
- [ ] Build for App Store/Play Store
- [ ] Screenshots for store listings

### Browser Extensions

- [ ] API URL updated
- [ ] Icons created (all sizes)
- [ ] Tested in all browsers
- [ ] Store listings prepared
- [ ] Promotional images created
- [ ] Submitted to stores

---

## Testing Guide

### Desktop Tracker
1. Launch app and login
2. Start time tracking
3. Verify screenshots captured
4. Check activity logs
5. Test idle detection
6. Stop tracking
7. Verify data in web dashboard

### Mobile App
1. Install Expo Go
2. Scan QR code
3. Login with credentials
4. Navigate all screens
5. Start/stop timer
6. Clock in/out
7. Check data sync

### Browser Extensions
1. Load extension
2. Login via popup
3. Start tracking
4. Switch between tabs
5. Check daily total
6. Stop tracking
7. Verify backend data

---

## Troubleshooting

### Desktop Tracker

**Issue: Screenshots fail**
- macOS: Grant Screen Recording permission
- Windows: Run as administrator
- Linux: Check X11/Wayland compatibility

**Issue: Can't connect to API**
- Verify API URL in .env
- Check network/firewall
- Ensure backend is running

### Mobile App

**Issue: App won't start**
- Check Node.js version (16+)
- Clear npm cache: `npm cache clean --force`
- Delete node_modules and reinstall

**Issue: API calls fail**
- Check API URL in .env
- Verify device network connection
- Check backend logs for errors

### Browser Extensions

**Issue: Login fails**
- Check API URL in background.js
- Open browser console for errors
- Verify backend auth endpoint

**Issue: Tracking not working**
- Check if tracking is enabled
- Verify permissions granted
- Check background service worker

---

## Publishing

### Desktop App

**Windows:**
- Use Electron Builder
- Code sign with certificate
- Submit to Microsoft Store (optional)

**macOS:**
- Code sign with Apple Developer certificate
- Notarize app
- Submit to Mac App Store (optional)

**Linux:**
- Create AppImage, .deb, .rpm
- List on Snapcraft/Flathub

### Mobile App

**iOS:**
- Apple Developer account ($99/year)
- Configure app in App Store Connect
- Submit via Xcode or Expo

**Android:**
- Google Play Developer account ($25 one-time)
- Create store listing
- Submit AAB file

### Browser Extensions

**Chrome:**
- Developer account ($5 one-time)
- Upload to Chrome Web Store
- 1-3 day review period

**Firefox:**
- Free developer account
- Submit to Firefox Add-ons
- 1-7 day review

**Edge:**
- Use same package as Chrome
- Submit to Edge Add-ons
- Usually fast approval

---

## Support & Resources

### Documentation
- Desktop: `/desktop-tracker/README.md`
- Mobile: `/mobile-app/README.md`
- Extensions: `/browser-extensions/README.md`
- Backend: `/backend/README.md`

### Tools
- Icon Generator: [icon.kitchen](https://icon.kitchen/)
- Image Resize: [ResizeImage.net](https://resizeimage.net/)
- Expo: [expo.dev](https://expo.dev/)
- Electron Builder: [electron.build](https://www.electron.build/)

### API Documentation
- Base URL: `http://localhost:8001/api`
- Docs: `http://localhost:8001/docs`
- OpenAPI: `http://localhost:8001/openapi.json`

---

## Next Steps

1. **Create icon assets** for all apps/extensions
2. **Set up environment files** with production URLs
3. **Test thoroughly** on all platforms
4. **Build installers** and packages
5. **Prepare store listings** with screenshots
6. **Submit to stores** and await approval
7. **Deploy backend** to production server
8. **Update API URLs** in all apps to production
9. **Distribute to users** via download links or stores

---

## Development Roadmap

### Phase 1: Core Apps (Complete)
- ✅ Desktop tracker
- ✅ Mobile app
- ✅ Browser extensions
- ✅ Web dashboard

### Phase 2: Enhancements
- [ ] Push notifications
- [ ] Offline mode
- [ ] Auto-updates
- [ ] Dark/light themes

### Phase 3: Advanced Features
- [ ] Screen recording (desktop)
- [ ] Webcam captures (opt-in)
- [ ] Advanced analytics
- [ ] AI insights

---

For questions or issues, check the README files in each app directory or consult the main project documentation.
