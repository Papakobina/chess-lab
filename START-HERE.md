# Start Chess Lab yourself

## Easiest way on this Windows computer

1. Open File Explorer (Windows + E).
2. Paste this folder into the address bar, then press Enter:
   C:\Users\t-kobinakw\Documents\Codex\2026-10-27\i\outputs\chess-lab
3. Double-click **Start Chess Lab.cmd**. If extensions are hidden, its name may appear as **Start Chess Lab**.
4. Wait until the window says **Local: http://127.0.0.1:5173/**.
5. Open http://127.0.0.1:5173/ in your browser.

Keep the command window open while you use Chess Lab. Closing it stops the local server.
To stop intentionally, focus that window and press Ctrl+C. If asked to terminate the batch job, type Y and press Enter.
To start again tomorrow, repeat steps 3–5.

The launcher uses the working Node runtime bundled with Codex on this computer. You do not need to run npm install again.
If the launcher says the port is already in use, the app may already be running: open the URL before starting another copy.

## From a PowerShell terminal

Run these two commands:

```powershell
cd "C:\Users\t-kobinakw\Documents\Codex\2026-10-27\i\outputs\chess-lab"
& ".\Start Chess Lab.cmd"
```

## Standard npm workflow on a computer with Node.js configured

From the project folder, first-time setup is:

```sh
npm install
npm run engine:download
```

Then each time you want to start the app:

```sh
npm run dev
```

The Openings database prepares automatically when needed. No internet connection is required for a restart when all assets are already downloaded, apart from optional web fonts.

## Your saves and appearance

Use the same browser profile and http://127.0.0.1:5173/ each time to access the same saved games.
Switch themes with the sun/moon button at the top right. The choice is remembered in this browser.
The first visit follows your system’s light/dark preference.
