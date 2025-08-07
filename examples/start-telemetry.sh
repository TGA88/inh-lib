#!/bin/bash

echo "🚀 Starting Full Telemetry Stack (Infrastructure + Application)..."

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

# Step 1: Start infrastructure services first
echo ""
echo "🏗️ Step 1: Starting telemetry infrastructure..."
docker-compose -f docker-compose.telemetry.yml up -d prometheus tempo loki grafana otel-collector promtail

# Step 2: Wait for infrastructure to be ready
echo ""
echo "⏳ Step 2: Waiting for infrastructure services to be ready..."

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

if ! check_service "http://localhost:13133" "OpenTelemetry Collector" 20; then
    failed_services="$failed_services OTel-Collector"
fi

if [ -n "$failed_services" ]; then
    echo ""
    echo "⚠️  Some infrastructure services failed to start:$failed_services"
    echo ""
    echo "❓ Continue with application startup anyway? (y/N)"
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        echo "❌ Aborted. Check service logs and try again."
        echo "🔍 Check logs: docker-compose -f docker-compose.telemetry.yml logs$failed_services"
        exit 1
    fi
    echo "⚠️  Continuing with partial infrastructure..."
fi

# Step 3: Build application image
echo ""
echo "📦 Step 3: Building application image..."
echo "🔧 Running complete build process (packages + Docker image)..."
./build-docker.sh

# Step 4: Start application
echo ""
echo "🚀 Step 4: Starting application..."
docker-compose -f docker-compose.telemetry.yml up -d app-unified

# Step 5: Wait for application to be ready
echo ""
echo "⏳ Step 5: Waiting for application to be ready..."
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

echo "✅ Telemetry stack is ready!"
if [ -n "$failed_services" ]; then
    echo "⚠️  Note: Some infrastructure services had issues:$failed_services"
    echo "� The application will still work, but some telemetry features may be limited"
fi
echo ""
echo "�📊 Access URLs:"
echo "  Application: http://localhost:3001"
echo "  Health Check: http://localhost:3001/health"
echo "  App Metrics: http://localhost:9464/metrics"
echo "  Grafana Dashboard: http://localhost:3000 (admin/admin)"
echo "  Prometheus: http://localhost:9090"
echo ""
echo "🔍 To view logs:"
echo "  docker-compose -f docker-compose.telemetry.yml logs -f"
echo ""
echo "🛑 To stop:"
echo "  npm run telemetry:stop"
