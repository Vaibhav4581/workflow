#!/bin/bash

echo "📱 Setting up Capacitor for Native Mobile App"
echo "============================================="

# Check if we're in the right directory
if [ ! -f "frontend/package.json" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

cd frontend

# Install Capacitor
echo "📦 Installing Capacitor..."
npm install @capacitor/core @capacitor/cli
npm install @capacitor/ios @capacitor/android

# Initialize Capacitor
echo "🔧 Initializing Capacitor..."
npx cap init SngceWorkflow com.sngce.workflow

# Build the app
echo "🔨 Building the app..."
npm run build

# Add platforms
echo "📱 Adding mobile platforms..."
npx cap add ios
npx cap add android

# Copy web assets to native projects
echo "📋 Copying assets to native projects..."
npx cap copy

echo "✅ Capacitor setup completed!"
echo ""
echo "Next steps:"
echo ""
echo "For iOS development:"
echo "1. Install Xcode from Mac App Store"
echo "2. Run: npx cap open ios"
echo "3. Build and run in Xcode"
echo ""
echo "For Android development:"
echo "1. Install Android Studio"
echo "2. Run: npx cap open android"
echo "3. Build and run in Android Studio"
echo ""
echo "For app store distribution:"
echo "1. Create developer accounts:"
echo "   - Apple Developer ($99/year)"
echo "   - Google Play Developer ($25 one-time)"
echo "2. Follow app store guidelines"
echo "3. Submit for review"
echo ""
echo "🎉 Your native mobile app is ready for development!" 