@echo off
title Deploy DesignForge360 Backend to GitHub & Vercel
echo.
echo ========================================
echo   GitHub & Vercel Deployment Setup
echo ========================================
echo.

REM Check if git is initialized
if not exist ".git" (
    echo Initializing Git repository...
    git init
    echo.
)

echo Adding files to Git...
git add .
echo.

echo Committing changes...
set /p commit_message="Enter commit message (or press Enter for default): "
if "%commit_message%"=="" set commit_message=Backend setup for Vercel deployment

git commit -m "%commit_message%"
echo.

echo ========================================
echo   Next Steps (Manual):
echo ========================================
echo 1. Create a new repository on GitHub:
echo    - Go to github.com
echo    - Click "New Repository"
echo    - Name: designforge360-backend
echo    - Don't initialize with README
echo.
echo 2. Add GitHub remote and push:
echo    git remote add origin https://github.com/YOUR_USERNAME/designforge360-backend.git
echo    git branch -M main
echo    git push -u origin main
echo.
echo 3. Deploy to Vercel:
echo    - Go to vercel.com
echo    - Sign in with GitHub
echo    - Import your repository
echo    - Add environment variables from .env.production
echo.
echo 4. Update your frontend with the new Vercel URL
echo.
pause
