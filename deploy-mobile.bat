@echo off
echo 🚀 SNGCE Workflow Mobile App Deployment
echo ========================================

REM Check if we're in the right directory
if not exist "frontend\package.json" (
    echo ❌ Error: Please run this script from the project root directory
    pause
    exit /b 1
)

REM Install dependencies
echo 📦 Installing dependencies...
cd frontend
call npm install

REM Build the app
echo 🔨 Building the app...
call npm run build

REM Check if build was successful
if not exist "build" (
    echo ❌ Build failed! Please check for errors.
    pause
    exit /b 1
)

echo ✅ Build completed successfully!
echo.
echo 📱 Your PWA is ready for deployment!
echo.
echo Next steps:
echo 1. Deploy the 'build' folder to any web hosting service:
echo    - Netlify (free): https://netlify.com
echo    - Vercel (free): https://vercel.com
echo    - GitHub Pages (free): https://pages.github.com
echo.
echo 2. Users can install the app on their mobile devices:
echo    - Android: Open in Chrome → Add to Home Screen
echo    - iOS: Open in Safari → Share → Add to Home Screen
echo.
echo 3. For app store distribution, see mobile-app-guide.md
echo.
echo 🎉 Your mobile app is ready!
pause 