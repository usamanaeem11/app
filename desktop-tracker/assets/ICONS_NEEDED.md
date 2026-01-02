# Icon Assets Required

Create the following icon files in this directory:

## Required Files:

1. **icon.png** - 512x512 pixels, PNG format
   - Main application icon
   - Used for Linux builds

2. **icon.ico** - 256x256 pixels, ICO format
   - Windows application icon
   - Multi-resolution ICO file

3. **icon.icns** - 512x512 pixels, ICNS format
   - macOS application icon
   - Apple icon format

4. **tray-icon.png** - 32x32 pixels, PNG with transparency
   - System tray icon
   - Should be simple and recognizable at small size

## Recommended Design:

- Background: Green (#10b981) or transparent
- Icon: White stopwatch or clock symbol
- Style: Clean, minimal, easily recognizable
- Brand: WorkMonitor

## Tools to Create Icons:

1. **icon.kitchen** - https://icon.kitchen/
   - Upload 512x512 PNG
   - Download all formats

2. **makeappicon.com** - https://makeappicon.com/
   - Generate iOS, Android, and desktop icons

3. **CloudConvert** - https://cloudconvert.com/
   - Convert between ICO, ICNS, PNG formats

## Quick Start:

1. Design 512x512 base icon in Figma/Canva/Photoshop
2. Export as PNG
3. Use icon.kitchen to generate all formats
4. Place files in this directory
5. Build app: `npm run build`
