@echo off
setlocal
cd /d "%~dp0"

rem ---- haze must be running on :8000 first ----
curl -s -o nul -w "%%{http_code}" http://localhost:8000/ > tunnel-port-check.txt 2>nul
set /p PORTCHECK=<tunnel-port-check.txt
del tunnel-port-check.txt >nul 2>&1
if not "%PORTCHECK%"=="200" (
  echo [haze-public] haze isn't answering on http://localhost:8000
  echo [haze-public] start it first in another window: haze.bat
  echo.
  pause
  exit /b 1
)

rem ---- fetch cloudflared once ----
if not exist cloudflared.exe (
  echo [haze-public] fetching cloudflared...
  powershell -NoProfile -Command "irm https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe -OutFile cloudflared.exe"
  if errorlevel 1 (
    echo [haze-public] download failed - install from https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/
    pause
    exit /b 1
  )
)

echo [haze-public] exposing http://localhost:8000 via Cloudflare quick tunnel...
echo [haze-public] websockets (/wisp/) pass through untouched. Keep this window open.
echo.
cloudflared.exe tunnel --no-autoupdate --url http://localhost:8000
