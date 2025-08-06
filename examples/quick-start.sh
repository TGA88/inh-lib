#!/bin/bash

echo "🚀 Fastify Telemetry Example - Quick Start"
echo "========================================"

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Check if docker-compose is available
if ! command -v docker-compose >/dev/null 2>&1; then
    echo "❌ docker-compose is not installed. Please install docker-compose first."
    exit 1
fi

echo "1. Creating logs directory..."
mkdir -p logs

echo "2. Building application Docker image..."
docker build -f Dockerfile.app -t fastify-telemetry-app .

echo "3. Starting telemetry stack..."
docker-compose -f docker-compose.telemetry.yml up -d

echo "4. Waiting for services to be ready..."
echo "   This may take 30-60 seconds..."

# Wait for services
sleep 30

# Health checks
echo "5. Checking service health..."

# Check Prometheus
if curl -s http://localhost:9090/-/healthy >/dev/null; then
    echo "✅ Prometheus is ready"
else
    echo "⚠️  Prometheus is not ready yet"
fi

# Check Grafana
if curl -s http://localhost:3000/api/health >/dev/null; then
    echo "✅ Grafana is ready"
else
    echo "⚠️  Grafana is not ready yet"
fi

# Check Application
if curl -s http://localhost:3001/health >/dev/null; then
    echo "✅ Application is ready"
else
    echo "⚠️  Application is not ready yet"
fi

echo ""
echo "🎉 Telemetry stack started successfully!"
echo ""
echo "📊 Access URLs:"
echo "   🏠 Application:      http://localhost:3001"
echo "   📈 Grafana:          http://localhost:3000 (admin/admin)"
echo "   🔍 Prometheus:       http://localhost:9090"
echo "   📊 App Metrics:      http://localhost:9464/metrics"
echo "   💓 Health Check:     http://localhost:3001/health"
echo ""
echo "🧪 Test the API:"
echo "   curl http://localhost:3001/api/users"
echo "   curl -X POST http://localhost:3001/api/users -H 'Content-Type: application/json' -d '{\"name\":\"John\",\"email\":\"john@example.com\"}'"
echo ""
echo "📝 Useful commands:"
echo "   📋 View logs:        docker-compose -f docker-compose.telemetry.yml logs -f"
echo "   🛑 Stop stack:       docker-compose -f docker-compose.telemetry.yml down"
echo "   🔄 Restart app:      docker-compose -f docker-compose.telemetry.yml restart app-server"
echo ""
echo "� Try other app modes:"
echo "   📦 Unified mode:     npm run telemetry:unified    # → port 3002"
echo "   🎯 Simple mode:      npm run telemetry:simple     # → port 3003"
echo "   🌟 All modes:        npm run telemetry:all        # → ports 3001,3002,3003"
echo ""
echo "�📖 Read TELEMETRY.md for detailed documentation"
