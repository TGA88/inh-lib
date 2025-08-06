#!/bin/bash

echo "🧪 Testing Unified Service (app-unified)"
echo "======================================="

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

echo "1. Starting unified app service..."
docker-compose -f docker-compose.telemetry.yml --profile unified up -d

echo "2. Waiting for unified app to be ready..."
sleep 15

# Health check
echo "3. Checking unified app health..."
if curl -s http://localhost:3002/health >/dev/null; then
    echo "✅ Unified app is ready at http://localhost:3002"
else
    echo "❌ Unified app is not responding"
    exit 1
fi

# Test API endpoints
echo "4. Testing API endpoints..."

echo "   📝 Testing GET /api/users..."
curl -s http://localhost:3002/api/users | jq .

echo "   📝 Testing POST /api/users..."
curl -s -X POST http://localhost:3002/api/users \
  -H 'Content-Type: application/json' \
  -d '{"name":"John Doe","email":"john@example.com"}' | jq .

echo "   📝 Testing GET /api/users again..."
curl -s http://localhost:3002/api/users | jq .

# Check metrics (if available)
echo "5. Checking metrics endpoint..."
if curl -s http://localhost:9465/metrics >/dev/null; then
    echo "✅ Metrics available at http://localhost:9465/metrics"
    echo "   Sample metrics:"
    curl -s http://localhost:9465/metrics | head -10
else
    echo "⚠️ Metrics endpoint not available"
fi

echo ""
echo "🎉 Unified app testing completed!"
echo ""
echo "📊 Access URLs:"
echo "   🏠 Unified App:      http://localhost:3002"
echo "   📊 App Metrics:      http://localhost:9465/metrics"
echo "   💓 Health Check:     http://localhost:3002/health"
echo ""
echo "📝 Useful commands:"
echo "   📋 View logs:        docker-compose -f docker-compose.telemetry.yml logs -f app-unified"
echo "   🛑 Stop service:     docker-compose -f docker-compose.telemetry.yml down"
echo "   🔄 Restart:          docker-compose -f docker-compose.telemetry.yml restart app-unified"
