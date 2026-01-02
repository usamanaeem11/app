# 🔌 Browser Extension Build Guide

Complete guide to building and publishing WorkMonitor browser extensions for Chrome, Firefox, and Edge.

---

## 📋 Overview

The WorkMonitor browser extension tracks active website and tab usage. Each browser requires a slightly different manifest and packaging format.

**Supported Browsers**:
- Google Chrome
- Mozilla Firefox
- Microsoft Edge
- Opera (uses Chrome extension)
- Brave (uses Chrome extension)

---

## 🏗️ Project Structure

```
browser-extensions/
├── chrome/                 # Chrome extension
│   ├── manifest.json
│   ├── background.js
│   ├── content.js
│   ├── popup.html
│   ├── popup.js
│   └── icons/
├── firefox/                # Firefox extension
│   ├── manifest.json
│   ├── background.js
│   ├── content.js
│   ├── popup.html
│   ├── popup.js
│   └── icons/
└── edge/                   # Edge extension
    ├── manifest.json
    ├── background.js
    ├── content.js
    ├── popup.html
    ├── popup.js
    └── icons/
```

---

## 🎨 Creating Extension Icons

### Required Icon Sizes

All browsers need:
- 16x16 (toolbar)
- 32x32 (toolbar retina)
- 48x48 (extensions page)
- 128x128 (Chrome Web Store)

Firefox also needs:
- 96x96

### Creating Icons

1. **Start with 512x512 PNG** with transparent background

2. **Resize using ImageMagick**:
```bash
# Install ImageMagick
brew install imagemagick  # macOS
apt install imagemagick   # Linux

# Create all sizes
convert icon-512.png -resize 16x16 icon-16.png
convert icon-512.png -resize 32x32 icon-32.png
convert icon-512.png -resize 48x48 icon-48.png
convert icon-512.png -resize 96x96 icon-96.png
convert icon-512.png -resize 128x128 icon-128.png
```

3. **Place icons** in `browser-extensions/[browser]/icons/`

---

## 🔧 Configuration

### Update API URL

Edit `config.example.js` (copy to `config.js` for local development):

```javascript
const CONFIG = {
  API_URL: 'https://api.yourdomain.com',
  WEBSOCKET_URL: 'wss://api.yourdomain.com'
};
```

For production, update this URL in:
- `chrome/background.js`
- `firefox/background.js`
- `edge/background.js`

---

## 🌐 Chrome Extension

### Step 1: Update Manifest

Edit `browser-extensions/chrome/manifest.json`:

```json
{
  "manifest_version": 3,
  "name": "WorkMonitor",
  "version": "1.0.0",
  "description": "Track time and productivity across websites",
  "permissions": [
    "tabs",
    "activeTab",
    "storage"
  ],
  "host_permissions": [
    "https://api.yourdomain.com/*"
  ],
  "background": {
    "service_worker": "background.js"
  },
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon-16.png",
      "32": "icons/icon-32.png",
      "48": "icons/icon-48.png",
      "128": "icons/icon-128.png"
    }
  },
  "icons": {
    "16": "icons/icon-16.png",
    "32": "icons/icon-32.png",
    "48": "icons/icon-48.png",
    "128": "icons/icon-128.png"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"]
    }
  ]
}
```

### Step 2: Test Locally

1. Open Chrome
2. Go to `chrome://extensions/`
3. Enable "Developer mode" (top right toggle)
4. Click "Load unpacked"
5. Select `browser-extensions/chrome` folder
6. Test the extension

### Step 3: Build Package

```bash
cd browser-extensions/chrome

# Create ZIP file
zip -r workmonitor-chrome-1.0.0.zip . -x "*.git*" -x "*.DS_Store"
```

### Step 4: Create Chrome Web Store Account

1. Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole/)
2. Pay $5 one-time registration fee
3. Accept terms

### Step 5: Upload Extension

1. Click "New Item"
2. Upload `workmonitor-chrome-1.0.0.zip`
3. Fill in store listing:

   **Product Details**:
   - Extension name: WorkMonitor
   - Summary (132 chars max)
   - Description (detailed, up to 16,000 chars)
   - Category: Productivity
   - Language: English

   **Graphics**:
   - Small promo tile: 440x280 PNG
   - Large promo tile: 920x680 PNG (optional)
   - Marquee promo tile: 1400x560 PNG (optional)
   - Screenshots: 1280x800 or 640x400 (at least 1, max 5)

   **Privacy**:
   - Single purpose description
   - Permission justifications
   - Privacy policy URL

   **Pricing & Distribution**:
   - Free or paid
   - Regions to distribute

4. Submit for review
   - Review time: 1-3 days typically

---

## 🦊 Firefox Extension

### Step 1: Update Manifest

Edit `browser-extensions/firefox/manifest.json`:

```json
{
  "manifest_version": 2,
  "name": "WorkMonitor",
  "version": "1.0.0",
  "description": "Track time and productivity across websites",
  "permissions": [
    "tabs",
    "activeTab",
    "storage",
    "https://api.yourdomain.com/*"
  ],
  "background": {
    "scripts": ["background.js"]
  },
  "browser_action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon-16.png",
      "32": "icons/icon-32.png",
      "48": "icons/icon-48.png",
      "96": "icons/icon-96.png"
    }
  },
  "icons": {
    "16": "icons/icon-16.png",
    "48": "icons/icon-48.png",
    "96": "icons/icon-96.png"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"]
    }
  ],
  "browser_specific_settings": {
    "gecko": {
      "id": "workmonitor@yourdomain.com",
      "strict_min_version": "91.0"
    }
  }
}
```

### Step 2: Test Locally

1. Open Firefox
2. Go to `about:debugging#/runtime/this-firefox`
3. Click "Load Temporary Add-on"
4. Select any file in `browser-extensions/firefox` folder
5. Test the extension

### Step 3: Sign Extension

Firefox requires all extensions to be signed, even for testing.

```bash
cd browser-extensions/firefox

# Install web-ext tool
npm install -g web-ext

# Build and sign
web-ext sign \
  --api-key=YOUR_JWT_ISSUER \
  --api-secret=YOUR_JWT_SECRET

# Creates: workmonitor-1.0.0.xpi
```

### Step 4: Get API Credentials

1. Go to [Firefox Add-on Developer Hub](https://addons.mozilla.org/developers/)
2. Create account (free)
3. Go to Tools > Manage API Keys
4. Generate new credentials
5. Save JWT issuer and secret

### Step 5: Submit to Firefox Add-ons

1. Go to [Submit a New Add-on](https://addons.mozilla.org/developers/addon/submit/distribution)

2. **Upload Add-on**:
   - Upload signed `.xpi` file
   - Source code (if using build tools)

3. **Describe Add-on**:
   - Name: WorkMonitor
   - Summary (250 chars max)
   - Categories: Productivity, Web Development
   - Tags: time-tracking, productivity, monitoring
   - License: Choose appropriate license

4. **Complete Listing**:
   - Description (detailed)
   - Screenshots (up to 10)
   - Privacy policy URL
   - Support email
   - Homepage URL

5. Submit for review
   - Review time: 1-14 days typically

---

## 🪟 Microsoft Edge Extension

### Step 1: Update Manifest

Edge uses Chromium, so the manifest is similar to Chrome.

Edit `browser-extensions/edge/manifest.json` (same as Chrome but add):

```json
{
  "author": "Your Company Name",
  "minimum_edge_version": "91.0.0.0"
}
```

### Step 2: Test Locally

1. Open Edge
2. Go to `edge://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked"
5. Select `browser-extensions/edge` folder

### Step 3: Build Package

```bash
cd browser-extensions/edge
zip -r workmonitor-edge-1.0.0.zip . -x "*.git*" -x "*.DS_Store"
```

### Step 4: Create Microsoft Partner Center Account

1. Go to [Microsoft Partner Center](https://partner.microsoft.com/dashboard)
2. Enroll in Microsoft Partner Network
3. Register as an app developer (free for Edge extensions)

### Step 5: Submit Extension

1. Go to Partner Center
2. Apps and games > New product > Microsoft Edge extension
3. Upload ZIP file

4. **Product details**:
   - Name: WorkMonitor
   - Category: Productivity
   - Description
   - Screenshots (1280x800 or 640x400)
   - Privacy policy URL
   - Support contact

5. Submit for certification
   - Review time: 1-7 days

---

## 🏪 Opera Extension

Opera uses Chrome extensions directly!

1. Users can install from Chrome Web Store in Opera
2. Or submit to [Opera Add-ons](https://addons.opera.com/developer/) separately

---

## 🦁 Brave Browser

Brave uses Chrome extensions directly!

Users can install from Chrome Web Store in Brave.

---

## 📦 Build Automation

### Create Build Script

Create `browser-extensions/build.sh`:

```bash
#!/bin/bash

VERSION="1.0.0"

echo "Building WorkMonitor Browser Extensions v${VERSION}"

# Chrome
echo "Building Chrome extension..."
cd chrome
zip -r ../workmonitor-chrome-${VERSION}.zip . -x "*.git*" -x "*.DS_Store" -x "node_modules/*"
cd ..

# Firefox
echo "Building Firefox extension..."
cd firefox
web-ext build --overwrite-dest
mv web-ext-artifacts/*.zip ../workmonitor-firefox-${VERSION}.xpi
cd ..

# Edge
echo "Building Edge extension..."
cd edge
zip -r ../workmonitor-edge-${VERSION}.zip . -x "*.git*" -x "*.DS_Store" -x "node_modules/*"
cd ..

echo "Build complete!"
ls -lh workmonitor-*.{zip,xpi}
```

Make executable:
```bash
chmod +x browser-extensions/build.sh
```

Run:
```bash
cd browser-extensions
./build.sh
```

---

## 🧪 Testing Extensions

### Test Checklist

- [ ] Extension icon appears in toolbar
- [ ] Popup opens when clicking icon
- [ ] Authentication flow works
- [ ] Time tracking starts/stops correctly
- [ ] Website visits are recorded
- [ ] Data syncs to backend API
- [ ] Works across different websites
- [ ] Permissions are minimal and justified
- [ ] No console errors
- [ ] Tested on multiple tabs

### Manual Testing

```bash
# Chrome
1. Load unpacked from chrome://extensions
2. Test all features
3. Check console for errors
4. Test on different websites

# Firefox
1. Load temporary from about:debugging
2. Test all features
3. Check browser console
4. Test on different websites

# Edge
1. Load unpacked from edge://extensions
2. Test all features
3. Check console for errors
4. Test on different websites
```

### Automated Testing

Create `browser-extensions/test/test.js`:

```javascript
// Use Puppeteer or Playwright for automated testing
const puppeteer = require('puppeteer');

async function testExtension() {
  const browser = await puppeteer.launch({
    headless: false,
    args: [
      `--disable-extensions-except=./chrome`,
      `--load-extension=./chrome`
    ]
  });

  const page = await browser.newPage();
  await page.goto('https://example.com');

  // Test extension functionality
  // ...

  await browser.close();
}

testExtension();
```

---

## 📊 Extension Analytics

### Track Usage

Add to `background.js`:

```javascript
// Track installations
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    fetch('https://api.yourdomain.com/api/extensions/install', {
      method: 'POST',
      body: JSON.stringify({ version: chrome.runtime.getManifest().version })
    });
  }
});

// Track active users (daily ping)
setInterval(() => {
  fetch('https://api.yourdomain.com/api/extensions/ping', {
    method: 'POST'
  });
}, 86400000); // 24 hours
```

---

## 🔄 Auto-Update

### Chrome & Edge
- Auto-updates happen automatically from store
- Users get updates within hours

### Firefox
- Auto-updates happen automatically
- Can take 24-48 hours

### Manual Update

To release an update:
1. Increment version in `manifest.json`
2. Build new package
3. Upload to store
4. Submit for review
5. After approval, users get auto-update

---

## 🐛 Troubleshooting

### Extension Won't Load

```bash
# Check manifest.json syntax
jsonlint manifest.json

# Check for console errors
# Open extension popup, right-click, "Inspect"
```

### Permissions Error

- Ensure all required permissions are in manifest
- Check `host_permissions` includes your API domain

### Content Script Not Working

- Verify `matches` pattern in `content_scripts`
- Check browser console for errors
- Ensure content.js is included in manifest

### Background Script Not Running

- Chrome: Check `chrome://extensions` > Inspect views: background page
- Firefox: Check `about:debugging` > Inspect

---

## ✅ Pre-Release Checklist

**All Browsers**:
- [ ] Icons created (all sizes)
- [ ] Manifest.json updated with correct version
- [ ] API URL updated to production
- [ ] Permissions minimal and justified
- [ ] Extension tested thoroughly
- [ ] No console errors
- [ ] Privacy policy created
- [ ] Screenshots captured

**Chrome**:
- [ ] ZIP file created
- [ ] Store listing prepared
- [ ] Promo images created
- [ ] Developer account registered

**Firefox**:
- [ ] Extension signed
- [ ] .xpi file created
- [ ] Source code included (if applicable)
- [ ] Add-ons listing prepared

**Edge**:
- [ ] ZIP file created
- [ ] Partner Center account created
- [ ] Store listing prepared

---

## 📊 Build Commands Summary

```bash
# Development
cd browser-extensions/chrome
# Load in chrome://extensions (Developer mode)

cd browser-extensions/firefox
web-ext run  # Launches Firefox with extension

# Building
cd browser-extensions
./build.sh                    # Build all extensions

# Firefox specific
cd firefox
web-ext build                 # Create .xpi
web-ext sign --api-key=...    # Sign extension

# Testing
cd firefox
web-ext lint                  # Check for issues
```

---

## 🎉 Your Browser Extensions are Ready!

You now have production-ready browser extensions for Chrome, Firefox, and Edge.

**Next Steps**:
1. Submit to browser stores
2. Create marketing materials
3. Add extension download links to website
4. Monitor usage analytics
5. Gather user feedback
6. Iterate and improve

---

## 📚 Additional Resources

- [Chrome Extension Documentation](https://developer.chrome.com/docs/extensions/)
- [Firefox Extension Workshop](https://extensionworkshop.com/)
- [Edge Extension Documentation](https://docs.microsoft.com/microsoft-edge/extensions-chromium/)
- [web-ext Command Reference](https://extensionworkshop.com/documentation/develop/web-ext-command-reference/)
- [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole/)
- [Firefox Add-ons Developer Hub](https://addons.mozilla.org/developers/)
- [Microsoft Partner Center](https://partner.microsoft.com/dashboard)
