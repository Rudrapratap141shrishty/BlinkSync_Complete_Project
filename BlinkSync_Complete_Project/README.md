# BlinkSync — Smart Screen Fatigue Monitor

A client-side React + MediaPipe Face Mesh prototype that estimates blink activity, detects the OS from browser user-agent information, and offers gentle eye-break reminders.

## Requirements
- Node.js 18+ and npm
- Webcam and a modern browser (Chrome/Edge recommended)
- Internet on first load so MediaPipe model assets can be fetched from jsDelivr

## Run on Windows
1. Extract this folder.
2. Open the folder in VS Code.
3. Open Terminal → New Terminal.
4. Run:
   ```bash
   npm install
   npm run dev
   ```
5. Open the local URL printed by Vite (usually `http://localhost:5173`).
6. Click **Start eye monitor** and allow camera access.

## Run on Linux / macOS
```bash
npm install
npm run dev
```

## Build for production
```bash
npm run build
npm run preview
```

## What it does
- Detects OS family (Windows/macOS/Linux/Android/iOS) in the browser.
- Uses webcam frames and Face Mesh eye landmarks to estimate eye aspect ratio (EAR).
- Counts blink events and calculates a rolling 60-second blink estimate.
- Offers a 20-20-20 break reminder and optional warm screen tint.
- Video frames are processed in-browser by this app; no video upload endpoint exists.

## Important limitations
This is a wellness prototype, not a medical device or diagnosis. Blink rate varies by person and activity. The EAR threshold (`0.20`) is a starter value and may need calibration for camera angle, lighting, glasses, and face geometry. The current 20-minute reminder is a prototype timer; browser tab throttling can affect timing. The app does not change the operating system's actual display color temperature; the warm tint is a page-level effect only.
