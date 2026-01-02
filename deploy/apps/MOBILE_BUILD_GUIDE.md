# 📱 Mobile App Build Guide

Complete guide to building and publishing the WorkMonitor mobile app for iOS and Android.

---

## 📋 Prerequisites

### For iOS Development
- **macOS** (required for iOS builds)
- **Xcode** 14+ installed
- **Apple Developer Account** ($99/year)
- **iOS device** or simulator for testing
- **Node.js** 18+
- **CocoaPods**: `sudo gem install cocoapods`

### For Android Development
- **Windows, macOS, or Linux**
- **Android Studio** installed
- **Java Development Kit (JDK)** 11+
- **Android SDK** (via Android Studio)
- **Android device** or emulator for testing
- **Node.js** 18+
- **Google Play Developer Account** ($25 one-time fee)

### Install React Native CLI

```bash
npm install -g react-native-cli
# or
npm install -g expo-cli
```

---

## 🏗️ Project Setup

### Install Dependencies

```bash
cd mobile-app
npm install

# For iOS (macOS only)
cd ios
pod install
cd ..
```

### Configure Environment

Create `mobile-app/.env`:

```env
API_URL=https://api.yourdomain.com
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
```

---

## 📱 iOS Build

### Step 1: Configure Xcode Project

1. **Open Project in Xcode**
   ```bash
   open ios/WorkMonitor.xcworkspace
   ```

2. **Update Bundle Identifier**
   - Select project in navigator
   - Go to "Signing & Capabilities"
   - Change Bundle Identifier: `com.yourcompany.workmonitor`

3. **Configure Signing**
   - Team: Select your Apple Developer team
   - Signing Certificate: Automatic
   - Provisioning Profile: Automatic

4. **Update Display Name**
   - General tab
   - Display Name: `WorkMonitor`

5. **Update Version**
   - Version: `1.0.0`
   - Build: `1`

### Step 2: Configure App Icon

1. **Prepare Icon**
   - Create 1024x1024 PNG image
   - No transparency, no alpha channel
   - RGB color space

2. **Add to Xcode**
   - Open `ios/WorkMonitor/Images.xcassets/AppIcon.appiconset`
   - Drag 1024x1024 image into "App Store iOS 1024pt" slot
   - Xcode will generate all required sizes

### Step 3: Configure Launch Screen

Edit `ios/WorkMonitor/LaunchScreen.storyboard` in Xcode

### Step 4: Build for Testing

```bash
# Run on simulator
npm run ios
# or
npx react-native run-ios

# Run on specific simulator
npx react-native run-ios --simulator="iPhone 14 Pro"

# Run on physical device
npx react-native run-ios --device="Your iPhone Name"
```

### Step 5: Create Archive for App Store

1. **In Xcode**:
   - Product > Scheme > Edit Scheme
   - Run > Build Configuration: Release
   - Product > Archive
   - Wait for archive to complete

2. **Upload to App Store Connect**:
   - Window > Organizer
   - Select your archive
   - Click "Distribute App"
   - Choose "App Store Connect"
   - Upload

### Step 6: TestFlight (Beta Testing)

1. **Go to App Store Connect**
   - https://appstoreconnect.apple.com
   - My Apps > Your App
   - TestFlight tab

2. **Add Beta Testers**
   - Internal Testing: Add team members
   - External Testing: Add external testers (up to 10,000)

3. **Distribute Build**
   - Select uploaded build
   - Add to test group
   - Invite testers

### Step 7: Submit to App Store

1. **Prepare App Store Connect Listing**:
   - App Name
   - Subtitle
   - Description
   - Keywords
   - Screenshots (required sizes):
     - 6.7" (iPhone 14 Pro Max): 1290x2796
     - 6.5" (iPhone 11 Pro Max): 1242x2688
     - 5.5" (iPhone 8 Plus): 1242x2208
   - App Preview videos (optional)
   - Support URL
   - Privacy Policy URL

2. **Submit for Review**:
   - Select build
   - Answer questions
   - Submit
   - Review time: 1-2 days typically

---

## 🤖 Android Build

### Step 1: Configure Android Project

1. **Update Package Name**

Edit `android/app/build.gradle`:
```gradle
android {
    defaultConfig {
        applicationId "com.yourcompany.workmonitor"
        // ...
    }
}
```

2. **Update App Name**

Edit `android/app/src/main/res/values/strings.xml`:
```xml
<resources>
    <string name="app_name">WorkMonitor</string>
</resources>
```

3. **Update Version**

Edit `android/app/build.gradle`:
```gradle
android {
    defaultConfig {
        versionCode 1
        versionName "1.0.0"
        // ...
    }
}
```

### Step 2: Create App Icon

1. **Using Android Studio**:
   - Right-click `res` folder
   - New > Image Asset
   - Icon Type: Launcher Icons
   - Path: Select your 1024x1024 icon
   - Generate

2. **Manual Method**:
   Create icons in these sizes:
   ```
   android/app/src/main/res/
   ├── mipmap-mdpi/ic_launcher.png      (48x48)
   ├── mipmap-hdpi/ic_launcher.png      (72x72)
   ├── mipmap-xhdpi/ic_launcher.png     (96x96)
   ├── mipmap-xxhdpi/ic_launcher.png    (144x144)
   ├── mipmap-xxxhdpi/ic_launcher.png   (192x192)
   └── mipmap-xxxhdpi/ic_launcher.png   (512x512)
   ```

### Step 3: Generate Signing Key

```bash
# Generate keystore
keytool -genkeypair -v -storetype PKCS12 \
  -keystore workmonitor-release.keystore \
  -alias workmonitor \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000

# Enter keystore password (save this!)
# Enter key password (save this!)
# Enter your details when prompted
```

Move keystore to `android/app/workmonitor-release.keystore`

### Step 4: Configure Signing

Create `android/gradle.properties`:
```properties
MYAPP_RELEASE_STORE_FILE=workmonitor-release.keystore
MYAPP_RELEASE_KEY_ALIAS=workmonitor
MYAPP_RELEASE_STORE_PASSWORD=your_keystore_password
MYAPP_RELEASE_KEY_PASSWORD=your_key_password
```

Edit `android/app/build.gradle`:
```gradle
android {
    signingConfigs {
        release {
            if (project.hasProperty('MYAPP_RELEASE_STORE_FILE')) {
                storeFile file(MYAPP_RELEASE_STORE_FILE)
                storePassword MYAPP_RELEASE_STORE_PASSWORD
                keyAlias MYAPP_RELEASE_KEY_ALIAS
                keyPassword MYAPP_RELEASE_KEY_PASSWORD
            }
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            shrinkResources true
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}
```

### Step 5: Build for Testing

```bash
# Run on emulator
npm run android
# or
npx react-native run-android

# Run on physical device (enable USB debugging)
npx react-native run-android --device
```

### Step 6: Build Release APK

```bash
cd android
./gradlew assembleRelease

# APK will be in:
# android/app/build/outputs/apk/release/app-release.apk
```

### Step 7: Build App Bundle (for Play Store)

```bash
cd android
./gradlew bundleRelease

# AAB will be in:
# android/app/build/outputs/bundle/release/app-release.aab
```

### Step 8: Test Release Build

```bash
# Install APK on device
adb install android/app/build/outputs/apk/release/app-release.apk

# Test thoroughly before uploading to Play Store
```

### Step 9: Submit to Google Play

1. **Create Play Console Account**
   - Go to: https://play.google.com/console
   - Pay $25 one-time registration fee

2. **Create App**
   - Click "Create app"
   - Fill in app details

3. **Complete Store Listing**
   - **App Details**:
     - Name: WorkMonitor
     - Short description (80 chars max)
     - Full description (4000 chars max)

   - **Graphics**:
     - App icon (512x512 PNG)
     - Feature graphic (1024x500 PNG)
     - Screenshots (at least 2):
       - Phone: 16:9 or 9:16 ratio
       - 7-inch tablet (optional)
       - 10-inch tablet (optional)

   - **Categorization**:
     - App category: Productivity
     - Content rating: Complete questionnaire

   - **Contact Details**:
     - Email
     - Phone (optional)
     - Website

4. **Set Up Pricing & Distribution**
   - Free or Paid
   - Countries to distribute
   - Content rating
   - Target audience

5. **Upload App Bundle**
   - Production > Create new release
   - Upload AAB file: `app-release.aab`
   - Release name: `1.0.0`
   - Release notes

6. **Submit for Review**
   - Review time: 1-7 days typically

---

## 🔧 Build Optimization

### Reduce App Size

**iOS**:
Edit `ios/Podfile`:
```ruby
post_install do |installer|
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |config|
      config.build_settings['DEAD_CODE_STRIPPING'] = 'YES'
    end
  end
end
```

**Android**:
Edit `android/app/build.gradle`:
```gradle
android {
    buildTypes {
        release {
            minifyEnabled true
            shrinkResources true
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}
```

### Enable Hermes (JavaScript Engine)

**Android**:
Edit `android/app/build.gradle`:
```gradle
project.ext.react = [
    enableHermes: true
]
```

**iOS**:
Edit `ios/Podfile`:
```ruby
use_react_native!(
  :path => config[:reactNativePath],
  :hermes_enabled => true
)
```

### ProGuard Rules

Create `android/app/proguard-rules.pro`:
```
# Keep native methods
-keepclassmembers class * {
    native <methods>;
}

# React Native
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.unicode.** { *; }

# Keep your app classes
-keep class com.yourcompany.workmonitor.** { *; }
```

---

## 📸 Creating Screenshots

### Automated Screenshot Generation

```bash
# Install fastlane
brew install fastlane  # macOS
gem install fastlane   # Linux/Windows

cd mobile-app

# iOS
fastlane snapshot

# Android
fastlane screengrab
```

### Manual Screenshots

**iOS**:
- Use Simulator
- Capture: Cmd+S
- Required sizes: 6.7", 6.5", 5.5"

**Android**:
- Use Emulator
- Capture: Camera icon in emulator toolbar
- Required: Phone and tablet screenshots

---

## 🔄 Continuous Integration

### GitHub Actions

Create `.github/workflows/mobile-ci.yml`:

```yaml
name: Mobile CI

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  build-ios:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - name: Install dependencies
        run: |
          cd mobile-app
          npm install
          cd ios && pod install
      - name: Build iOS
        run: |
          cd mobile-app
          npx react-native run-ios --configuration Release

  build-android:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - uses: actions/setup-java@v3
        with:
          distribution: 'temurin'
          java-version: '11'
      - name: Install dependencies
        run: |
          cd mobile-app
          npm install
      - name: Build Android
        run: |
          cd mobile-app/android
          ./gradlew assembleRelease
```

---

## 🐛 Troubleshooting

### iOS Build Errors

```bash
# Clear derived data
rm -rf ~/Library/Developer/Xcode/DerivedData

# Clean build
cd ios
xcodebuild clean
cd ..

# Reinstall pods
cd ios
rm -rf Pods Podfile.lock
pod install
cd ..
```

### Android Build Errors

```bash
# Clean build
cd android
./gradlew clean
cd ..

# Clear cache
rm -rf android/.gradle
rm -rf android/app/build

# Rebuild
cd android
./gradlew assembleRelease
```

### Metro Bundler Issues

```bash
# Clear Metro cache
npx react-native start --reset-cache

# Clear watchman
watchman watch-del-all
```

---

## ✅ Pre-Release Checklist

**iOS**:
- [ ] Bundle identifier updated
- [ ] App icon added (all sizes)
- [ ] Launch screen configured
- [ ] Version and build number set
- [ ] Code signing configured
- [ ] Tested on physical device
- [ ] Tested on simulator
- [ ] Screenshots captured
- [ ] Privacy policy added
- [ ] App Store description written

**Android**:
- [ ] Package name updated
- [ ] App icon added (all densities)
- [ ] Splash screen configured
- [ ] Version code and name set
- [ ] Signing key generated
- [ ] Signed release build tested
- [ ] ProGuard configured
- [ ] Screenshots captured
- [ ] Privacy policy added
- [ ] Play Store description written

---

## 📊 Build Commands Summary

```bash
# Development
npm run ios                  # Run iOS simulator
npm run android              # Run Android emulator
npm start                    # Start Metro bundler

# iOS Production
# (Use Xcode to archive and upload)

# Android Production
cd android
./gradlew assembleRelease    # Build APK
./gradlew bundleRelease      # Build AAB for Play Store

# Testing
npm test                     # Run tests
npm run lint                 # Check code style

# Cleaning
npm run clean:ios            # Clean iOS build
npm run clean:android        # Clean Android build
```

---

## 🎉 Your Mobile App is Ready!

You now have production-ready mobile apps for both iOS and Android.

**Next Steps**:
1. Submit to App Store and Play Store
2. Set up app analytics
3. Configure push notifications
4. Add deep linking
5. Monitor crash reports
6. Gather user feedback

---

## 📚 Additional Resources

- [React Native Documentation](https://reactnative.dev/docs/getting-started)
- [iOS App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Google Play Console Help](https://support.google.com/googleplay/android-developer)
- [Fastlane Documentation](https://docs.fastlane.tools/)
- [App Store Connect](https://appstoreconnect.apple.com/)
- [Google Play Console](https://play.google.com/console)
