#!/bin/bash

echo "🔧 Setting up Local Development Environment"
echo "=========================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Please run this script from the examples directory"
    exit 1
fi

echo "1. 📦 Installing dependencies in monorepo..."
cd ..
npm install

echo "2. 🔗 Building all packages..."
npm run build --workspaces --if-present

echo "3. 📍 Setting up local package links..."
cd examples

# For development, use file: protocol (already in package.json)
echo "   Using file: protocol for local packages:"
echo "   - @inh-lib/unified-route: file:../packages/unified-route"
echo "   - @inh-lib/api-util-fastify: file:../packages/api-util-fastify"
echo "   - @inh-lib/unified-telemetry-*: file:../packages/unified-telemetry-*"

echo "4. 📥 Installing example dependencies..."
npm install

echo "5. 🏗️  Building example TypeScript..."
npm run build

echo "6. 📁 Creating logs directory..."
mkdir -p logs

echo ""
echo "✅ Development environment ready!"
echo ""
echo "🚀 Available commands:"
echo "   npm run dev                # Run with source code (hot reload)"
echo "   npm run dev:telemetry      # Run enhanced telemetry version"
echo "   npm run simple             # Run simplified mock version"
echo "   npm run build              # Build TypeScript"
echo "   npm run type-check         # Check types only"
echo ""
echo "🐳 Docker commands:"
echo "   npm run docker:build       # Build Docker image"
echo "   npm run telemetry:start    # Start full telemetry stack"
echo ""
echo "🧪 Testing:"
echo "   npm run test:api           # Test API endpoints"
echo "   npm run test:full          # Full test with simple app"
echo ""
echo "📖 Read TELEMETRY.md for complete documentation"
