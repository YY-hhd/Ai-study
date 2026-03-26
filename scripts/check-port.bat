@echo off
echo ========================================
echo Chrome Remote Debugging Port Check
echo ========================================
echo.
echo Checking port 18800...
netstat -ano | findstr 18800
echo.
if %ERRORLEVEL% EQU 0 (
    echo SUCCESS: Port 18800 is LISTENING!
    echo.
    echo Copy the line above and send to OpenClaw.
) else (
    echo FAILED: Port 18800 is NOT listening.
    echo.
    echo Chrome may not be running with --remote-debugging-port=18800
    echo.
    echo Try running:
    echo "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=18800
)
echo.
echo ========================================
pause
