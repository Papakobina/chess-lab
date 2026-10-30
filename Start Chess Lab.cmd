@echo off
setlocal
cd /d "%~dp0"
set "CHESS_NODE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
if not exist "%CHESS_NODE%" set "CHESS_NODE=node"
if not exist "node_modules\vite\bin\vite.js" (
  echo Dependencies are missing. Install Node.js 22 or newer, then run npm install in this folder.
  pause
  exit /b 1
)
if not exist "public\engine\stockfish-19-lite-single.wasm" (
  "%CHESS_NODE%" scripts\download-engine.mjs
  if errorlevel 1 goto error
)
"%CHESS_NODE%" scripts\download-openings.mjs
if errorlevel 1 goto error
echo.
echo Chess Lab will run at http://127.0.0.1:5173/
echo Keep this window open while using the app.
echo Press Ctrl+C to stop the server.
echo.
"%CHESS_NODE%" node_modules\vite\bin\vite.js
if errorlevel 1 goto error
exit /b 0
:error
echo.
echo Could not start Chess Lab. If the port is already in use, try opening http://127.0.0.1:5173/
pause
exit /b 1

