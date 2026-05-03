@echo off
REM POS System Launcher - Production Mode
REM This script starts the POS application with frontend and backend

cd /d "%~dp0"

REM Set production environment variables
set NODE_ENV=production

REM Check if build files exist
if not exist "build\main\electron.js" (
    echo Building application...
    call npm run build
)

REM Start the Electron app
echo Starting POS System...
call npx electron .

pause
