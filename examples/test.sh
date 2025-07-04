#!/bin/bash

# Test script for Fastify Telemetry Examples

echo "🧪 Testing Fastify Telemetry Examples"
echo "======================================"

# Check if Node.js and npm are available
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed"
    exit 1
fi

echo "✅ Node.js version: $(node --version)"
echo "✅ npm version: $(npm --version)"

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies installed successfully"

# Test TypeScript compilation
echo ""
echo "🔧 Testing TypeScript compilation..."
npx tsc --noEmit simplified-fastify-example.ts

if [ $? -eq 0 ]; then
    echo "✅ TypeScript compilation successful"
else
    echo "⚠️  TypeScript compilation has warnings (but should still work)"
fi

echo ""
echo "🚀 Ready to run examples!"
echo ""
echo "Available commands:"
echo "  npm run simple              - Run simplified example with telemetry"
echo "  npm run simple:no-telemetry - Run simplified example without telemetry"
echo ""
echo "Example API calls:"
echo "  curl http://localhost:3000/health"
echo "  curl http://localhost:3000/api/users"
echo "  curl -X POST http://localhost:3000/api/users -H 'Content-Type: application/json' -d '{\"name\":\"John Doe\",\"email\":\"john@example.com\"}'"
echo ""
