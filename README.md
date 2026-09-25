# SoundClick

SoundClick is a tactile sound fidget progressive web app (PWA). It can be run locally with Python's built-in HTTP server; no packages or build step are required.

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

## Stop the server

Press `Ctrl+C` in the terminal.
