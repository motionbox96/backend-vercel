@echo off
title DesignForge360 Backend Server (Development)
echo.
echo ========================================
echo   DesignForge360 Backend Server (DEV)
echo ========================================
echo.
echo Starting development server with nodemon...
echo Server will auto-restart on file changes
echo API will be available at: http://localhost:3001/api
echo.
cd /d "%~dp0"
npm run dev
pause
