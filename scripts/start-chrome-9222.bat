@echo off
echo ========================================
echo Chrome Remote Debugging Starter
echo Port: 9222
echo ========================================
echo.

echo Step 1: Closing all Chrome instances...
taskkill /F /IM chrome.exe /T 2>nul
timeout /t 3 /nobreak >nul

echo Step 2: Creating temp directory...
mkdir "C:\temp\chrome-debug" 2>nul

echo Step 3: Starting Chrome with remote debugging...
echo.
echo Chrome is starting...
echo Debugging URL: http://localhost:9222
echo WSL2 Access URL: http://172.20.240.1:9222
echo.
echo Keep this window open or Chrome will close.
echo Press Ctrl+C to stop Chrome.
echo.

cd /d "C:\Program Files\Google\Chrome\Application"
chrome.exe --remote-debugging-port=9222 --no-first-run --no-default-browser-check --user-data-dir="C:\temp\chrome-debug"

pause
