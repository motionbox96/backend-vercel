@echo off
title Sync Backend Changes to GitHub & Vercel
echo.
echo ========================================
echo   Syncing Backend Changes
echo ========================================
echo.

cd /d "%~dp0"

echo Checking Git status...
git status
echo.

echo Adding all changes...
git add .
echo.

set /p commit_message="Enter commit message (or press Enter for default): "
if "%commit_message%"=="" set commit_message=Backend updates

echo Committing changes...
git commit -m "%commit_message%"
echo.

echo Pushing to GitHub...
git push origin main
echo.

echo ========================================
echo   Deployment Status
echo ========================================
echo ✅ Code pushed to GitHub successfully!
echo 🚀 Vercel will auto-deploy in 1-2 minutes
echo 📡 Your API will be updated at:
echo    https://backend-vercel-kappa-blush.vercel.app
echo.
echo Check Vercel dashboard for deployment status:
echo https://vercel.com/dashboard
echo.
echo Would you like to test the deployment now? (y/n)
set /p test_now="Test deployment: "
if /i "%test_now%"=="y" (
    echo.
    echo Testing deployment...
    call test-deployment.bat
)
echo.
pause
