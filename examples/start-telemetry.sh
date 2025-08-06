#!/bin/bash

echo "🚀 Starting Telemetry Stack..."

# Create logs directory
mkdir -p logs

# Build application image (if needed)
echo "📦 Building application image..."
docker build -f Dockerfile.app -t fastify-telemetry-app .

# Start the telemetry stack
echo "🔍 Starting telemetry services..."
docker-compose -f docker-compose.telemetry.yml up -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 30

# Check service health
echo "🔍 Checking service health..."
echo "Prometheus: http://localhost:9090"
echo "Grafana: http://localhost:3000 (admin/admin)"
echo "Tempo: http://localhost:3200"
echo "Loki: http://localhost:3100"
echo "Application: http://localhost:3001"
echo "Application Metrics: http://localhost:9464/metrics"

# Test the application
echo "🧪 Testing the application..."
curl -s http://localhost:3001/health | jq .

echo "✅ Telemetry stack is ready!"
echo ""
echo "📊 Access URLs:"
echo "  Grafana Dashboard: http://localhost:3000"
echo "  Prometheus: http://localhost:9090"
echo "  Application: http://localhost:3001"
echo "  App Metrics: http://localhost:9464/metrics"
echo ""
echo "🔍 To view logs:"
echo "  docker-compose -f docker-compose.telemetry.yml logs -f"
echo ""
echo "🛑 To stop:"
echo "  docker-compose -f docker-compose.telemetry.yml down"
