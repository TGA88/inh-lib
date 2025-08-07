#!/bin/bash

echo "🚀 Starting Application (assumes infrastructure is ready)..."

# Function to check if a service is ready
check_service() {
    local url=$1
    local service_name=$2
    local max_attempts=${3:-30}
    local attempt=1
    
    echo "🔍 Checking $service_name..."
    while [ $attempt -le $max_attempts ]; do
        if curl -s "$url" > /dev/null 2>&1; then
            echo "✅ $service_name is ready!"
            return 0
        fi
        echo "⏳ $service_name not ready yet... (attempt $attempt/$max_attempts)"
        sleep 2
        ((attempt++))
    done
    echo "❌ $service_name failed to start within timeout"
    return 1
}

# Quick check if infrastructure is running
echo ""
echo "🔍 Checking if telemetry infrastructure is ready..."
if ! check_service "http://localhost:9090/-/ready" "Prometheus" 3; then
    echo ""
    echo "⚠️  Telemetry infrastructure doesn't seem to be ready!"
    echo "📋 To start infrastructure first:"
    echo "  npm run telemetry:infra"
    echo ""
    echo "❓ Continue anyway? (y/N)"
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        echo "❌ Aborted. Start infrastructure first."
        exit 1
    fi
fi

# Build packages first (like in build-docker.sh)
echo ""
echo "🔧 Building packages from mono-repo..."
cd ..
npx nx run-many --target=build --all --parallel=false

# Verify dist exists
if [ ! -d "dist/packages" ]; then
    echo "❌ Error: dist/packages not found. Build failed?"
    exit 1
fi

echo "✅ Packages built successfully"

# Build application image
echo ""
echo "📦 Building application image..."
cd examples
docker build -f Dockerfile.app -t fastify-telemetry-app ..

# Start application
echo ""
echo "🚀 Starting application..."
docker-compose -f docker-compose.telemetry.yml up -d app-unified

# Wait for application to be ready
echo ""
echo "⏳ Waiting for application to be ready..."
check_service "http://localhost:3001/health" "Application" 15

# Test the application
echo ""
echo "🧪 Testing the application..."
response=$(curl -s http://localhost:3001/health)
if command -v jq &> /dev/null; then
    echo "$response" | jq .
else
    echo "$response"
fi

echo "✅ Application is ready!"
echo ""
echo "🌐 Application URLs:"
echo "  Application: http://localhost:3001"
echo "  Health Check: http://localhost:3001/health"
echo "  Users API: http://localhost:3001/api/users"
echo "  App Metrics: http://localhost:9464/metrics"
echo ""
echo "🔍 To view app logs:"
echo "  docker-compose -f docker-compose.telemetry.yml logs -f app-unified"
echo ""
echo "🛑 To stop app only:"
echo "  npm run telemetry:stop:app"
