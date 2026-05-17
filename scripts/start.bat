@echo off
title Yazıcı

echo.
echo  ================================================
echo   Yazıcı — AI Study Coach
echo  ================================================
echo.

:: Check for Node.js
where node >nul 2>&1
if errorlevel 1 (
    echo  [ERROR] Node.js is not installed or not in PATH.
    echo  Download it from: https://nodejs.org  (LTS version)
    echo.
    pause
    exit /b 1
)

:: Print Node version
for /f "tokens=*" %%i in ('node -v') do set NODE_VER=%%i
echo  Node.js %NODE_VER% found.

:: Root is one level up from scripts\
set ROOT=%~dp0..

:: Create data directory if it doesn't exist
if not exist "%ROOT%\data" mkdir "%ROOT%\data"

:: Install dependencies if node_modules are missing
if not exist "%ROOT%\server\node_modules" (
    echo.
    echo  Installing server dependencies (first run only)...
    cd "%ROOT%\server"
    npm install --silent
    cd "%~dp0"
)

if not exist "%ROOT%\client\node_modules" (
    echo.
    echo  Installing client dependencies (first run only)...
    cd "%ROOT%\client"
    npm install --silent
    cd "%~dp0"
)

:: Build server if dist is missing
if not exist "%ROOT%\server\dist\index.mjs" (
    echo.
    echo  Building server...
    cd "%ROOT%\server"
    npm run build
    cd "%~dp0"
)

:: Build client if dist is missing
if not exist "%ROOT%\client\dist\index.html" (
    echo.
    echo  Building client...
    cd "%ROOT%\client"
    npm run build
    cd "%~dp0"
)

echo.
echo  Starting Yazıcı...
echo.

cd /d "%ROOT%"

set PORT=3001
set DB_PATH=data\Yazıcı.db
set CLIENT_DIST=client\dist

:: Open browser after short delay
start "" /b cmd /c "timeout /t 2 /nobreak >nul && start """" ""http://localhost:3001"""

echo  ================================================
echo   Running at: http://localhost:3001
echo   Press Ctrl+C to stop.
echo  ================================================
echo.

node server\dist\index.mjs
