# 🖥️ Desktop App Build Guide

Complete guide to building and distributing the WorkMonitor Desktop Tracker app for Windows, macOS, and Linux.

---

## 📋 Prerequisites

### Development Machine Requirements

**For Windows Builds:**
- Windows 10/11 or macOS/Linux with Wine
- Node.js 18+
- npm or yarn

**For macOS Builds:**
- macOS 10.15+ (required for code signing)
- Xcode Command Line Tools
- Node.js 18+
- Apple Developer Account ($99/year) for distribution

**For Linux Builds:**
- Any Linux distribution
- Node.js 18+
- npm or yarn

### Install Dependencies

```bash
cd desktop-tracker
npm install
```

---

## 🏗️ Building the App

### Build for Current Platform

```bash
# Build for your current operating system
npm run build

# The installer will be in desktop-tracker/dist/
```

### Build for Specific Platforms

```bash
# Build for Windows (.exe installer)
npm run build:win

# Build for macOS (.dmg installer)
npm run build:mac

# Build for Linux (.AppImage)
npm run build:linux

# Build for all platforms
npm run build:all
```

---

## 🪟 Windows Build

### Prerequisites
- Windows 10/11
- Or Linux/Mac with Wine for cross-compilation

### Configuration

Edit `desktop-tracker/package.json`:

```json
{
  "build": {
    "appId": "com.yourcompany.workmonitor",
    "productName": "WorkMonitor",
    "win": {
      "target": ["nsis"],
      "icon": "assets/icon.ico",
      "publisherName": "Your Company Name",
      "certificateFile": "certs/certificate.pfx",
      "certificatePassword": "YOUR_CERT_PASSWORD"
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true,
      "createDesktopShortcut": true,
      "createStartMenuShortcut": true,
      "shortcutName": "WorkMonitor"
    }
  }
}
```

### Code Signing (Windows)

1. **Get Code Signing Certificate**
   - Purchase from: Sectigo, DigiCert, or Comodo
   - Cost: ~$100-400/year
   - Validates your identity as publisher

2. **Export Certificate**
   ```bash
   # Export to PFX format
   # Save as desktop-tracker/certs/certificate.pfx
   ```

3. **Set Environment Variables**
   ```bash
   # Windows
   set CSC_LINK=certs/certificate.pfx
   set CSC_KEY_PASSWORD=your_password

   # macOS/Linux
   export CSC_LINK=certs/certificate.pfx
   export CSC_KEY_PASSWORD=your_password
   ```

4. **Build Signed Installer**
   ```bash
   npm run build:win
   ```

### Build Without Code Signing

```bash
# Build unsigned (not recommended for distribution)
npm run build:win -- --config.win.certificateFile=undefined

# Or set environment variable
set CSC_IDENTITY_AUTO_DISCOVERY=false
npm run build:win
```

### Output

```
desktop-tracker/dist/
  └── WorkMonitor Setup 1.0.0.exe     (Windows installer)
```

---

## 🍎 macOS Build

### Prerequisites
- **macOS 10.15+** (required!)
- Xcode Command Line Tools: `xcode-select --install`
- Apple Developer Account

### Configuration

Edit `desktop-tracker/package.json`:

```json
{
  "build": {
    "appId": "com.yourcompany.workmonitor",
    "productName": "WorkMonitor",
    "mac": {
      "target": ["dmg", "zip"],
      "category": "public.app-category.productivity",
      "icon": "assets/icon.icns",
      "hardenedRuntime": true,
      "gatekeeperAssess": false,
      "entitlements": "build/entitlements.mac.plist",
      "entitlementsInherit": "build/entitlements.mac.plist"
    },
    "dmg": {
      "contents": [
        {
          "x": 130,
          "y": 220
        },
        {
          "x": 410,
          "y": 220,
          "type": "link",
          "path": "/Applications"
        }
      ]
    }
  }
}
```

### Code Signing (macOS)

1. **Join Apple Developer Program**
   - Go to: https://developer.apple.com/programs/
   - Cost: $99/year
   - Get Developer ID Certificate

2. **Create Developer ID Certificate**
   - Open Xcode
   - Preferences > Accounts
   - Select your Apple ID
   - Manage Certificates > Create "Developer ID Application"

3. **Create Entitlements File**

Create `desktop-tracker/build/entitlements.mac.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>com.apple.security.cs.allow-unsigned-executable-memory</key>
    <true/>
    <key>com.apple.security.automation.apple-events</key>
    <true/>
    <key>com.apple.security.cs.allow-jit</key>
    <true/>
    <key>com.apple.security.device.microphone</key>
    <true/>
    <key>com.apple.security.device.camera</key>
    <true/>
</dict>
</plist>
```

4. **Set Environment Variables**
   ```bash
   export APPLE_ID="your@apple.id"
   export APPLE_ID_PASSWORD="app-specific-password"
   export APPLE_TEAM_ID="your_team_id"
   ```

5. **Build and Notarize**
   ```bash
   npm run build:mac

   # Notarization happens automatically with electron-builder
   # It will upload to Apple for notarization
   ```

### App-Specific Password

1. Go to https://appleid.apple.com
2. Sign in
3. Security > App-Specific Passwords
4. Generate password
5. Use this password, not your Apple ID password

### Output

```
desktop-tracker/dist/
  └── WorkMonitor-1.0.0.dmg          (macOS installer)
  └── WorkMonitor-1.0.0-mac.zip      (macOS zip)
```

---

## 🐧 Linux Build

### Prerequisites
- Any Linux distribution
- Node.js 18+

### Configuration

Edit `desktop-tracker/package.json`:

```json
{
  "build": {
    "appId": "com.yourcompany.workmonitor",
    "productName": "WorkMonitor",
    "linux": {
      "target": ["AppImage", "deb", "rpm"],
      "category": "Office",
      "icon": "assets/icon.png",
      "desktop": {
        "Name": "WorkMonitor",
        "Comment": "Time tracking and productivity monitoring",
        "Categories": "Office;ProjectManagement;"
      }
    }
  }
}
```

### Build

```bash
# Build AppImage (universal Linux format)
npm run build:linux

# Build DEB package (Ubuntu/Debian)
npm run build:linux -- --linux deb

# Build RPM package (Fedora/RedHat)
npm run build:linux -- --linux rpm
```

### Output

```
desktop-tracker/dist/
  └── WorkMonitor-1.0.0.AppImage     (Universal Linux)
  └── workmonitor_1.0.0_amd64.deb    (Debian/Ubuntu)
  └── workmonitor-1.0.0.x86_64.rpm   (Fedora/RedHat)
```

---

## 🎨 Creating App Icons

### Required Icon Formats

**Windows**: `icon.ico` (256x256)
**macOS**: `icon.icns` (multiple sizes)
**Linux**: `icon.png` (512x512)

### Using Online Tools

1. Create a 1024x1024 PNG logo
2. Convert at:
   - Windows ICO: https://icoconvert.com/
   - macOS ICNS: https://cloudconvert.com/png-to-icns
   - Linux PNG: Just resize to 512x512

### Using Command Line Tools

```bash
# Install imagemagick
brew install imagemagick  # macOS
apt install imagemagick   # Linux

# Create ICO file (Windows)
convert icon-1024.png -define icon:auto-resize=256,128,96,64,48,32,16 icon.ico

# Create ICNS file (macOS)
mkdir icon.iconset
sips -z 16 16     icon-1024.png --out icon.iconset/icon_16x16.png
sips -z 32 32     icon-1024.png --out icon.iconset/icon_16x16@2x.png
sips -z 32 32     icon-1024.png --out icon.iconset/icon_32x32.png
sips -z 64 64     icon-1024.png --out icon.iconset/icon_32x32@2x.png
sips -z 128 128   icon-1024.png --out icon.iconset/icon_128x128.png
sips -z 256 256   icon-1024.png --out icon.iconset/icon_128x128@2x.png
sips -z 256 256   icon-1024.png --out icon.iconset/icon_256x256.png
sips -z 512 512   icon-1024.png --out icon.iconset/icon_256x256@2x.png
sips -z 512 512   icon-1024.png --out icon.iconset/icon_512x512.png
sips -z 1024 1024 icon-1024.png --out icon.iconset/icon_512x512@2x.png
iconutil -c icns icon.iconset

# Create PNG file (Linux)
convert icon-1024.png -resize 512x512 icon.png
```

Place the icons in:
```
desktop-tracker/assets/
  ├── icon.ico     (Windows)
  ├── icon.icns    (macOS)
  └── icon.png     (Linux)
```

---

## 📦 Distribution

### Windows Distribution

**Option 1: Direct Download**
- Upload `WorkMonitor Setup.exe` to your website
- Users download and install

**Option 2: Microsoft Store**
- Convert to APPX/MSIX format
- Submit to Microsoft Partner Center
- Review time: 1-3 days

**Option 3: Chocolatey**
- Create Chocolatey package
- Publish to chocolatey.org
- Users install via: `choco install workmonitor`

### macOS Distribution

**Option 1: Direct Download**
- Upload `WorkMonitor.dmg` to your website
- Users download and drag to Applications

**Option 2: Mac App Store**
- Requires additional setup (sandbox, capabilities)
- Submit via App Store Connect
- Review time: 1-7 days

**Option 3: Homebrew**
- Create Homebrew cask
- Users install via: `brew install --cask workmonitor`

### Linux Distribution

**Option 1: Direct Download**
- Upload `.AppImage`, `.deb`, `.rpm` files
- Users download and install

**Option 2: Snap Store**
```bash
# Create snapcraft.yaml
snapcraft
snapcraft upload --release=stable workmonitor_1.0.0_amd64.snap
```

**Option 3: Flathub**
- Create Flatpak manifest
- Submit to Flathub
- Available via: `flatpak install workmonitor`

---

## 🔄 Auto-Update Setup

### Configure Auto-Updater

Edit `desktop-tracker/main.js`:

```javascript
const { autoUpdater } = require('electron-updater');

app.on('ready', () => {
  // Check for updates on startup
  autoUpdater.checkForUpdatesAndNotify();

  // Check every hour
  setInterval(() => {
    autoUpdater.checkForUpdatesAndNotify();
  }, 3600000);
});

autoUpdater.on('update-downloaded', (info) => {
  // Prompt user to restart and install update
  dialog.showMessageBox({
    type: 'info',
    title: 'Update Available',
    message: 'A new version has been downloaded. Restart to install?',
    buttons: ['Restart', 'Later']
  }).then((result) => {
    if (result.response === 0) {
      autoUpdater.quitAndInstall();
    }
  });
});
```

### Host Update Files

Upload built files to your server:
```
https://yourdomain.com/downloads/desktop/
  ├── latest.yml                    (Windows update manifest)
  ├── latest-mac.yml                (macOS update manifest)
  ├── latest-linux.yml              (Linux update manifest)
  ├── WorkMonitor-Setup-1.0.0.exe
  ├── WorkMonitor-1.0.0.dmg
  └── WorkMonitor-1.0.0.AppImage
```

### Update package.json

```json
{
  "build": {
    "publish": {
      "provider": "generic",
      "url": "https://yourdomain.com/downloads/desktop/"
    }
  }
}
```

When you run `npm run build`, it will automatically generate the update manifests.

---

## 🐛 Troubleshooting

### Build Fails on Windows

```bash
# Clear cache
rm -rf node_modules dist
npm install
npm run build:win
```

### macOS Notarization Fails

```bash
# Check notarization status
xcrun altool --notarization-history 0 -u "your@apple.id" -p "@keychain:AC_PASSWORD"

# Validate app before uploading
codesign --verify --deep --strict --verbose=2 dist/mac/WorkMonitor.app
```

### Linux AppImage Not Executable

```bash
chmod +x WorkMonitor-1.0.0.AppImage
./WorkMonitor-1.0.0.AppImage
```

### Code Signing Certificate Errors

```bash
# Windows: Verify certificate
certutil -dump certificate.pfx

# macOS: List certificates
security find-identity -v -p codesigning
```

---

## ✅ Pre-Release Checklist

- [ ] App icon created for all platforms
- [ ] Version number updated in package.json
- [ ] Code signed (Windows & macOS)
- [ ] Tested on target operating systems
- [ ] Auto-updater configured
- [ ] Update manifests generated
- [ ] Release notes written
- [ ] Installers uploaded to server
- [ ] Download links added to website
- [ ] Documentation updated

---

## 📊 Build Scripts Summary

```bash
# Development
npm start                   # Run in development mode
npm run dev                 # Run with hot reload

# Building
npm run build               # Build for current OS
npm run build:win           # Build for Windows
npm run build:mac           # Build for macOS
npm run build:linux         # Build for Linux
npm run build:all           # Build for all platforms

# Testing
npm test                    # Run tests
npm run lint                # Check code style

# Distribution
npm run dist                # Build and package
npm run release             # Build, package, and publish updates
```

---

## 🎉 Your Desktop App is Ready!

You now have standalone desktop installers for Windows, macOS, and Linux that users can download and install directly from your website.

**Next Steps:**
1. Upload installers to your website downloads page
2. Create a changelog/release notes page
3. Set up analytics (optional)
4. Submit to app stores (optional)
5. Promote your desktop app!

---

## 📚 Additional Resources

- [Electron Documentation](https://www.electronjs.org/docs)
- [electron-builder](https://www.electron.build/)
- [Code Signing Guide](https://www.electron.build/code-signing)
- [Auto-Update Guide](https://www.electron.build/auto-update)
