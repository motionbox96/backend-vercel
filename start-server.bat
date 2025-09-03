@echo off
title DesignForge360 Backend Server
echo.
echo ========================================
echo   DesignForge360 Backend Server
echo ========================================
echo.
echo Starting server on port 3001...
echo API will be available at: http://localhost:3001/api
echo.
cd /d "%~dp0"
npm start
pause
