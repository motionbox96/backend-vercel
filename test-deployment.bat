@echo off
title Vercel Deployment Status Checker
echo.
echo ========================================
echo   Vercel Deployment Status Checker
echo ========================================
echo.

echo Testing your live backend deployment...
echo.

echo 1. Testing root endpoint:
echo URL: https://backend-vercel-kappa-blush.vercel.app/
powershell -Command "try { $response = Invoke-WebRequest -Uri 'https://backend-vercel-kappa-blush.vercel.app/' -Method GET; Write-Host 'Status:' $response.StatusCode; Write-Host 'Response:' $response.Content } catch { Write-Host 'Error:' $_.Exception.Message }"
echo.

echo 2. Testing health endpoint:
echo URL: https://backend-vercel-kappa-blush.vercel.app/api/health
powershell -Command "try { $response = Invoke-WebRequest -Uri 'https://backend-vercel-kappa-blush.vercel.app/api/health' -Method GET; Write-Host 'Status:' $response.StatusCode; Write-Host 'Response:' $response.Content } catch { Write-Host 'Error:' $_.Exception.Message }"
echo.

echo ========================================
echo   Deployment Information
echo ========================================
echo GitHub Repo: https://github.com/motionbox96/backend-vercel
echo Vercel Dashboard: https://vercel.com/dashboard
echo Live URL: https://backend-vercel-kappa-blush.vercel.app
echo.
echo If you see errors, wait 1-2 minutes for deployment to complete
echo then run this script again.
echo.
pause
