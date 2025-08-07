#!/bin/bash

echo "🏗️ Starting Telemetry Infrastructure Only..."

# Create logs directory
mkdir -p logs

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

# Start infrastructure services only
echo ""
echo "🏗️ Starting telemetry infrastructure services..."
docker-compose -f docker-compose.telemetry.yml up -d prometheus tempo loki grafana otel-collector promtail

# Wait for infrastructure to be ready
echo ""
echo "⏳ Waiting for infrastructure services to be ready..."

failed_services=""

if ! check_service "http://localhost:9090/-/ready" "Prometheus" 30; then
    failed_services="$failed_services Prometheus"
fi

if ! check_service "http://localhost:3000/api/health" "Grafana" 30; then
    failed_services="$failed_services Grafana"
fi

if ! check_service "http://localhost:3200/ready" "Tempo" 20; then
    failed_services="$failed_services Tempo"
fi

if ! check_service "http://localhost:3100/ready" "Loki" 20; then
    failed_services="$failed_services Loki"
fi

if ! check_service "http://localhost:8888/metrics" "OpenTelemetry Collector" 20; then
    failed_services="$failed_services OTel-Collector"
fi

if [ -n "$failed_services" ]; then
    echo ""
    echo "⚠️  Some services failed to start properly:$failed_services"
    echo ""
    echo "🔍 Common issues and solutions:"
    if [[ "$failed_services" == *"Loki"* ]]; then
        echo "  • Loki: Configuration issue detected. Check telemetry-config/loki-config.yml"
    fi
    if [[ "$failed_services" == *"OTel-Collector"* ]]; then
        echo "  • OTel Collector: Configuration issue detected. Check telemetry-config/otel-collector-config.yml"
    fi
    echo ""
    echo "🔍 Check service logs:"
    echo "  docker-compose -f docker-compose.telemetry.yml logs$failed_services"
    echo ""
    echo "📋 Core services that should work:"
    echo "  • Prometheus: http://localhost:9090 (metrics collection)"
    echo "  • Grafana: http://localhost:3000 (dashboards)"
    echo "  • Tempo: http://localhost:3200 (distributed tracing)"
    echo ""
    echo "💡 You can still run applications and get basic telemetry!"
    echo ""
    echo "❓ Continue anyway? The core services are functional. (y/N)"
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        echo "❌ Aborted. Check configuration files and try again."
        exit 1
    fi
    echo ""
fi

echo "✅ Telemetry infrastructure setup completed!"
if [ -n "$failed_services" ]; then
    echo "⚠️  Note: Some services had issues:$failed_services"
    echo "💡 Core monitoring (Prometheus + Grafana) should still work fine"
fi
echo ""
echo "📊 Infrastructure Access URLs:"
echo "  🎯 Grafana Dashboard: http://localhost:3000 (admin/admin)"
echo "  📈 Prometheus: http://localhost:9090"
echo "  🔍 Tempo (traces): http://localhost:3200"
if [[ ! "$failed_services" == *"Loki"* ]]; then
    echo "  📝 Loki (logs): http://localhost:3100"
fi
if [[ ! "$failed_services" == *"OTel-Collector"* ]]; then
    echo "  📡 OTLP Collector: http://localhost:4318"
fi
echo ""
echo "🚀 To start applications:"
echo "  npm run telemetry:app        # Start unified app (port 3001)"
echo "  npm run telemetry:start      # Start infrastructure + app"
echo ""
echo "🔍 To view logs:"
echo "  docker-compose -f docker-compose.telemetry.yml logs -f"
echo ""
echo "🛑 To stop infrastructure:"
echo "  npm run telemetry:stop:infra"
