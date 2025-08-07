#!/bin/bash

# Build script for creating Docker image with pre-built packages
set -e

echo "🔧 Building packages from mono-repo..."

# Navigate to repo root
cd "$(dirname "$0")/.."

# Ensure dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install --legacy-peer-deps
else
    echo "✅ Dependencies already installed"
fi

# Build all packages
echo "📦 Building all packages..."
npx nx run-many --target=build --all --parallel=false

# Verify dist exists
if [ ! -d "dist/packages" ]; then
    echo "❌ Error: dist/packages not found. Build failed?"
    exit 1
fi

echo "✅ Packages built successfully"

# Navigate to examples
cd examples

echo "🐳 Building Docker image..."

# Build Docker image from examples directory with context including parent
docker build -f Dockerfile.app -t unified-telemetry-app:latest ..

echo "✅ Docker image built successfully!"
echo ""
echo "🚀 To run the application:"
echo "docker run -p 3001:3001 -p 9464:9464 unified-telemetry-app:latest"
echo ""
echo "Or use docker-compose:"
echo "docker-compose -f docker-compose.telemetry.yml up"
