#!/bin/bash

echo "🏗️ Starting Telemetry Infrastructure Only..."

# Create logs directory
mkdir -p logs

# Start only the telemetry infrastructure (no app services)
echo "🔍 Starting telemetry infrastructure services..."
docker-compose -f docker-compose.telemetry.yml up -d prometheus tempo loki grafana otel-collector promtail

# Wait for infrastructure services to be ready
echo "⏳ Waiting for infrastructure services to be ready..."

# Function to check if a service is ready
check_service() {
    local url=$1
    local service_name=$2
    local max_attempts=30
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

# Check each service
echo ""
echo "🔍 Checking infrastructure readiness..."
check_service "http://localhost:9090/-/ready" "Prometheus"
check_service "http://localhost:3000/api/health" "Grafana"
check_service "http://localhost:3200/ready" "Tempo"
check_service "http://localhost:3100/ready" "Loki"
check_service "http://localhost:8888/metrics" "OpenTelemetry Collector"

echo ""
echo "✅ Telemetry Infrastructure is ready!"
echo ""
echo "📊 Access URLs:"
echo "  🎯 Grafana Dashboard: http://localhost:3000 (admin/admin)"
echo "  📈 Prometheus: http://localhost:9090"
echo "  🔍 Tempo: http://localhost:3200"
echo "  📝 Loki: http://localhost:3100"
echo "  🚀 OTLP Collector: http://localhost:4318"
echo ""
echo "📱 Next Steps:"
echo "  📦 Build & run app: npm run telemetry:app"
echo "  🚀 Or run full stack: npm run telemetry:start"
echo ""
echo "🔍 To view infrastructure logs:"
echo "  docker-compose -f docker-compose.telemetry.yml logs -f prometheus grafana tempo loki otel-collector"
echo ""
echo "🛑 To stop infrastructure:"
echo "  docker-compose -f docker-compose.telemetry.yml stop prometheus grafana tempo loki otel-collector promtail"
