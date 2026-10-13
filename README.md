# SoundClick

SoundClick is a tactile sound fidget app available as a progressive web app (PWA) and an Android app built with Capacitor.

## Setup

1. Install Python 3 if it is not already installed.
2. Open a terminal in the project directory:

```powershell
cd path\to\sound-fidget-toy
```

## Start the server

Run:

```powershell
py -m http.server 8000
```

On systems where `py` is unavailable, use:

```powershell
python -m http.server 8000
```

Open [http://localhost:8000](http://localhost:8000) in a browser. Keep the terminal running while using the app.

## Android

1. Install Node.js and Android Studio, including an Android SDK.
2. Install the project dependencies:

```powershell
npm install
```

3. Sync the web app into the Android project:

```powershell
npm run android:sync
```

4. Open the project in Android Studio:

```powershell
npm run android:open
```

Alternatively, build a debug APK from PowerShell:

```powershell
.\android\gradlew.bat -p .\android assembleDebug
```

The debug APK is generated at `android\app\build\outputs\apk\debug\app-debug.apk`. Release signing configuration and keystore files are local-only and must not be committed.

## Stop the server

Press `Ctrl+C` in the terminal.
