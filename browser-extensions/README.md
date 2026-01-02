# WorkMonitor Browser Extensions

Browser extensions for Chrome, Firefox, and Edge that track time spent on websites and monitor online activity.

## Features

- 🌐 **Website Tracking** - Automatic tracking of time spent on websites
- 📊 **Activity Categorization** - Classifies sites as productive/distracting/neutral
- ⏱️ **Daily Totals** - Shows total time tracked today
- 🔐 **Secure Authentication** - Login with company credentials
- 🎯 **Real-time Sync** - Data syncs with backend immediately

## Supported Browsers

- **Chrome** - Version 88+
- **Firefox** - Version 109+
- **Edge** - Version 88+

## Installation

### For Development/Testing

#### Chrome/Edge:
1. Open `chrome://extensions` (Chrome) or `edge://extensions` (Edge)
2. Enable "Developer mode" (top right)
3. Click "Load unpacked"
4. Select the `browser-extensions/chrome` or `browser-extensions/edge` folder

#### Firefox:
1. Open `about:debugging`
2. Click "This Firefox"
3. Click "Load Temporary Add-on"
4. Select any file in `browser-extensions/firefox` folder

### For Production

Extensions will be published to:
- Chrome Web Store
- Firefox Add-ons
- Edge Add-ons Store

## Configuration

Update the API URL in each extension's `background.js`:

```javascript
const API_URL = 'http://localhost:8001/api';
```

For production, use your production API URL:
```javascript
const API_URL = 'https://api.workmonitor.com/api';
```

## Icon Assets Required

Create the following icon files in each extension's `icons/` directory:

- **icon16.png** - 16x16 pixels (toolbar)
- **icon32.png** - 32x32 pixels (extension management)
- **icon48.png** - 48x48 pixels (extension details)
- **icon128.png** - 128x128 pixels (store listing)

### Creating Icons

Recommended approach:

1. **Design a 128x128 base icon**:
   - Green background (#10b981) or transparent
   - Stopwatch/clock icon in white
   - Clean, recognizable design

2. **Resize to all required sizes**:
   - Use [ResizeImage.net](https://resizeimage.net/)
   - Or use Figma/Photoshop export

3. **Export as PNG** with transparency

Quick design tool: [Canva](https://www.canva.com/create/icons/)

## How It Works

1. **Tab Monitoring**: Listens for tab switches and URL changes
2. **Time Tracking**: Records time spent on each domain
3. **Categorization**: Automatically categorizes websites
4. **API Sync**: Sends activity logs to backend API
5. **Daily Reset**: Resets daily totals at midnight

## Usage

### First Time Setup

1. Click extension icon in toolbar
2. Enter your email and password
3. Click "Login"

### Start Tracking

1. Click "Start Tracking" in popup
2. Extension tracks active tab automatically
3. View today's total time in popup

### Stop Tracking

1. Click "Stop Tracking" in popup
2. Data is saved to backend

## Popup Features

- **Login/Logout**: Authenticate with credentials
- **Start/Stop**: Control tracking status
- **Time Display**: View today's tracked time
- **Status Indicator**: Shows if tracking is active

## Activity Categories

### Productive Sites
- GitHub, GitLab, Bitbucket
- Stack Overflow
- Google Docs, Notion
- Figma, Trello, Asana, Jira
- Slack, Zoom, Microsoft Teams

### Distracting Sites
- Social media (Facebook, Twitter, Instagram, TikTok)
- Entertainment (YouTube, Netflix, Twitch)
- Reddit

### Neutral Sites
- All other websites

## Privacy & Security

- Extension only tracks when explicitly enabled
- Credentials stored securely in browser storage
- No tracking in incognito/private mode
- Data encrypted in transit to backend

## Permissions Explained

- **tabs**: Monitor active tab and URL changes
- **activeTab**: Access current tab information
- **storage**: Store authentication token locally
- **alarms**: Schedule periodic tasks (daily reset)
- **notifications**: Show tracking notifications
- **<all_urls>**: Required to track all websites

## Publishing

### Chrome Web Store

1. Create developer account ($5 one-time fee)
2. Prepare store listing assets:
   - Screenshots (1280x800)
   - Promotional images
   - Description (see below)
3. Upload extension ZIP
4. Submit for review

### Firefox Add-ons

1. Create developer account (free)
2. Submit extension for review
3. Wait for approval (1-7 days)

### Edge Add-ons

1. Use Chrome Web Store package
2. Submit to Edge Partner Center
3. Usually auto-approved if on Chrome Store

## Store Listing Description

**Title**: WorkMonitor - Time Tracking & Productivity

**Short Description**: Track time spent on websites and boost productivity with automatic activity monitoring.

**Full Description**:
```
WorkMonitor helps you track time spent on websites automatically. Perfect for remote workers, freelancers, and teams using time tracking software.

Features:
✓ Automatic website time tracking
✓ Productivity insights
✓ Daily time summaries
✓ Secure authentication
✓ Privacy-focused

Works seamlessly with WorkMonitor desktop and mobile apps. Requires a WorkMonitor account.
```

## Development

### File Structure

```
browser-extensions/
├── chrome/
│   ├── background.js       # Service worker
│   ├── content.js          # Page scripts
│   ├── popup.html          # Extension popup UI
│   ├── popup.js            # Popup logic
│   ├── manifest.json       # Extension config
│   └── icons/              # Icon assets
├── firefox/
│   └── [same structure]
└── edge/
    └── [same structure]
```

### Testing

1. Load extension in developer mode
2. Open popup and login
3. Start tracking
4. Switch between tabs/websites
5. Check console for errors
6. Verify data sent to backend

### Common Issues

**Issue: Login fails**
- Verify API URL is correct
- Check network tab for errors
- Ensure backend is running

**Issue: Time not tracking**
- Check if tracking is enabled
- Verify active tab has valid URL
- Check background script console

**Issue: Icons not showing**
- Ensure all icon files exist
- Check file names match manifest
- Icons must be PNG format

## Browser Compatibility

| Feature | Chrome | Firefox | Edge |
|---------|--------|---------|------|
| Manifest V3 | ✅ | ✅ | ✅ |
| Service Worker | ✅ | ✅ | ✅ |
| Storage API | ✅ | ✅ | ✅ |
| Alarms API | ✅ | ✅ | ✅ |

## License

Proprietary - WorkMonitor Platform
