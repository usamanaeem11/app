# WorkMonitor Desktop Tracker

Cross-platform desktop application for employee time tracking and monitoring.

## Features

- **Time Tracking**: Start/stop timer with automatic sync to server
- **Screenshot Capture**: Configurable interval screenshots
- **Activity Monitoring**: Track active applications and windows
- **Idle Detection**: Detect and record idle time
- **System Tray**: Run silently in background
- **Auto-Start**: Optionally start with system boot

## Installation

### Prerequisites

- Node.js 18+
- npm or yarn

### Development Setup

```bash
cd desktop-tracker
npm install
npm start
```

### Build for Production

```bash
# Build for current platform
npm run build

# Build for specific platform
npm run build:win    # Windows
npm run build:mac    # macOS
npm run build:linux  # Linux
```

## Configuration

### Environment Variables

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Update `.env` with your settings:
   ```env
   WORKMONITOR_API_URL=http://localhost:8001/api
   SCREENSHOT_INTERVAL=300
   IDLE_TIMEOUT=300
   AUTO_START=true
   BLUR_SCREENSHOTS=false
   ```

### Settings (in-app)

Access via system tray > Settings:

- **Screenshot Interval**: How often to capture screenshots (60-3600 seconds)
- **Idle Timeout**: Time before marking as idle (60-1800 seconds)
- **Auto-Start**: Launch tracker on system startup
- **Blur Screenshots**: Apply blur to captured screenshots

### Icon Assets Required

Create the following icon files in the `assets/` directory:

- **icon.png** - Main application icon (512x512 PNG)
- **icon.ico** - Windows icon (256x256 ICO format)
- **icon.icns** - macOS icon (512x512 ICNS format)
- **tray-icon.png** - System tray icon (32x32 PNG with transparency)

**Creating Icons**: Use [icon.kitchen](https://icon.kitchen/) or [makeappicon.com](https://makeappicon.com/) to generate all formats from a single design. Recommended: green background (#10b981) with white stopwatch icon.

## API Endpoints Used

The tracker communicates with these backend endpoints:

- `POST /api/auth/login` - User authentication
- `POST /api/time-entries` - Create time entry
- `PUT /api/time-entries/{id}` - Update time entry
- `POST /api/screenshots/upload` - Upload screenshot
- `POST /api/activity-logs` - Log activity

## Project Structure

```
desktop-tracker/
├── main.js          # Main Electron process
├── preload.js       # Preload script for IPC
├── index.html       # Renderer UI
├── package.json     # Dependencies and build config
├── assets/          # Icons and images
│   ├── icon.png     # App icon (512x512)
│   ├── icon.ico     # Windows icon
│   ├── icon.icns    # macOS icon
│   └── tray-icon.png # System tray icon (16x16)
└── dist/            # Built applications
```

## Security

- Uses secure IPC communication between main and renderer
- Credentials stored locally using electron-store (encrypted)
- Screenshots captured locally before upload
- HTTPS required for production API

## Supported Platforms

- Windows 10/11
- macOS 10.15+
- Ubuntu 20.04+ / Debian 10+

## Troubleshooting

### Screenshots not capturing

On macOS, grant Screen Recording permission:
System Preferences → Security & Privacy → Privacy → Screen Recording

### Activity tracking not working

On macOS, grant Accessibility permission:
System Preferences → Security & Privacy → Privacy → Accessibility

### App not starting with system

Check your OS auto-start settings and ensure the app has necessary permissions.
