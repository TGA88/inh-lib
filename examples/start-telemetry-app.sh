#!/bin/bash

echo "📦 Starting Application with Telemetry..."

# Check if telemetry infrastructure is running
echo "🔍 Checking if telemetry infrastructure is ready..."

# Function to check if a service is ready
check_service() {
    local url=$1
    local service_name=$2
    
    if curl -s "$url" > /dev/null 2>&1; then
        echo "✅ $service_name is ready"
        return 0
    else
        echo "❌ $service_name is not ready"
        return 1
    fi
}

# Check required infrastructure
infra_ready=true

echo "🔍 Checking infrastructure services..."
if ! check_service "http://localhost:9090/-/ready" "Prometheus"; then
    infra_ready=false
fi

if ! check_service "http://localhost:3000/api/health" "Grafana"; then
    infra_ready=false
fi

if ! check_service "http://localhost:13133" "OpenTelemetry Collector"; then
    infra_ready=false
fi

if [ "$infra_ready" = false ]; then
    echo ""
    echo "⚠️  Telemetry infrastructure is not ready!"
    echo ""
    echo "🔧 Please start infrastructure first:"
    echo "  npm run telemetry:infra"
    echo ""
    echo "🚀 Or run full stack (will start infrastructure automatically):"
    echo "  npm run telemetry:start"
    echo ""
    exit 1
fi

echo ""
echo "✅ Infrastructure is ready! Starting application..."

# Build application image
echo "📦 Building application image..."
echo "🔧 Running complete build process (packages + Docker image)..."
./build-docker.sh

# Start the application services only
echo "🚀 Starting application services..."
docker-compose -f docker-compose.telemetry.yml up -d app-unified

# Wait for application to be ready
echo "⏳ Waiting for application to be ready..."
sleep 10

# Check application health
echo "🔍 Checking application health..."
max_attempts=15
attempt=1

while [ $attempt -le $max_attempts ]; do
    if curl -s http://localhost:3001/health > /dev/null 2>&1; then
        echo "✅ Application is ready!"
        break
    fi
    echo "⏳ Application not ready yet... (attempt $attempt/$max_attempts)"
    sleep 2
    ((attempt++))
done

if [ $attempt -gt $max_attempts ]; then
    echo "❌ Application failed to start within timeout"
    echo "🔍 Check application logs:"
    echo "  docker-compose -f docker-compose.telemetry.yml logs app-unified"
    exit 1
fi

# Test the application
echo ""
echo "🧪 Testing the application..."
response=$(curl -s http://localhost:3001/health)
echo "Health check response: $response"

echo ""
echo "✅ Application is running!"
echo ""
echo "📱 Application URLs:"
echo "  🚀 Main App: http://localhost:3001"
echo "  ❤️  Health: http://localhost:3001/health"
echo "  👥 Users API: http://localhost:3001/api/users"
echo "  📊 Metrics: http://localhost:9464/metrics"
echo ""
echo "🔍 To view application logs:"
echo "  docker-compose -f docker-compose.telemetry.yml logs -f app-unified"
echo ""
echo "🛑 To stop application:"
echo "  docker-compose -f docker-compose.telemetry.yml stop app-unified"
