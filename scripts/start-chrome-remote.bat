@echo off
REM Start Chrome with Remote Debugging for OpenClaw WSL2
REM Usage: Double-click this file or run from command prompt

echo Starting Chrome with Remote Debugging on port 18800...

taskkill /F /IM chrome.exe 2>nul

start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" ^
    --remote-debugging-port=18800 ^
    --remote-debugging-address=0.0.0.0 ^
    --no-first-run ^
    --no-default-browser-check ^
    --user-data-dir="C:\temp\chrome-openclaw" ^
    https://www.baidu.com

echo Chrome started!
echo Remote Debugging URL: http://localhost:18800
echo WSL2 Access URL: http://172.20.240.1:18800
echo.
echo Keep this window open or Chrome will close.
pause
