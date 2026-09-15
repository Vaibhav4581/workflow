#!/bin/bash

echo "🚀 SNGCE Workflow Mobile App Deployment"
echo "========================================"

# Check if we're in the right directory
if [ ! -f "frontend/package.json" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
cd frontend
npm install

# Build the app
echo "🔨 Building the app..."
npm run build

# Check if build was successful
if [ ! -d "build" ]; then
    echo "❌ Build failed! Please check for errors."
    exit 1
fi

echo "✅ Build completed successfully!"
echo ""
echo "📱 Your PWA is ready for deployment!"
echo ""
echo "Next steps:"
echo "1. Deploy the 'build' folder to any web hosting service:"
echo "   - Netlify (free): https://netlify.com"
echo "   - Vercel (free): https://vercel.com"
echo "   - GitHub Pages (free): https://pages.github.com"
echo ""
echo "2. Users can install the app on their mobile devices:"
echo "   - Android: Open in Chrome → Add to Home Screen"
echo "   - iOS: Open in Safari → Share → Add to Home Screen"
echo ""
echo "3. For app store distribution, see mobile-app-guide.md"
echo ""
echo "🎉 Your mobile app is ready!" 