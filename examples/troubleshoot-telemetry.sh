#!/bin/bash

echo "🔍 Telemetry Stack Troubleshooting"
echo "=================================="

# Check if services are running
echo ""
echo "📋 Service Status Check:"
docker-compose -f docker-compose.telemetry.yml ps

echo ""
echo "🔍 Service Health Checks:"

services=("prometheus:9090" "grafana:3000" "tempo:3200" "loki:3100")
for service in "${services[@]}"; do
    IFS=':' read -r name port <<< "$service"
    if curl -s "http://localhost:$port" > /dev/null 2>&1; then
        echo "✅ $name (port $port) is responding"
    else
        echo "❌ $name (port $port) is not responding"
    fi
done

# Check specific endpoints
echo ""
echo "🎯 Specific Endpoint Checks:"

# Prometheus ready check
if curl -s "http://localhost:9090/-/ready" > /dev/null 2>&1; then
    echo "✅ Prometheus is ready"
else
    echo "❌ Prometheus is not ready"
fi

# Grafana health check
if curl -s "http://localhost:3000/api/health" > /dev/null 2>&1; then
    echo "✅ Grafana is healthy"
else
    echo "❌ Grafana is not healthy"
fi

# Tempo ready check
if curl -s "http://localhost:3200/ready" > /dev/null 2>&1; then
    echo "✅ Tempo is ready"
else
    echo "❌ Tempo is not ready"
fi

# Loki ready check
if curl -s "http://localhost:3100/ready" > /dev/null 2>&1; then
    echo "✅ Loki is ready"
else
    echo "❌ Loki is not ready"
fi

# OTel Collector health check
if curl -s "http://localhost:13133" > /dev/null 2>&1; then
    echo "✅ OpenTelemetry Collector health endpoint is responding"
else
    echo "❌ OpenTelemetry Collector health endpoint is not responding"
fi

echo ""
echo "🔍 Recent Error Logs:"
echo "===================="

# Show recent errors for problematic services
echo ""
echo "📝 Loki errors (if any):"
docker-compose -f docker-compose.telemetry.yml logs loki 2>/dev/null | grep -i error | tail -3

echo ""
echo "📡 OTel Collector errors (if any):"
docker-compose -f docker-compose.telemetry.yml logs otel-collector 2>/dev/null | grep -i error | tail -3

echo ""
echo "💡 Common Solutions:"
echo "==================="
echo "• Loki config issues: Check telemetry-config/loki-config.yml"
echo "• OTel Collector issues: Check telemetry-config/otel-collector-config.yml"
echo "• Port conflicts: Make sure ports 3000, 3100, 3200, 4318, 8888, 9090 are free"
echo "• Memory issues: Docker may need more memory (recommended: 4GB+)"

echo ""
echo "🛠️  Quick Fixes:"
echo "• Restart services: npm run telemetry:stop && npm run telemetry:infra"
echo "• View full logs: docker-compose -f docker-compose.telemetry.yml logs [service-name]"
echo "• Clean restart: npm run telemetry:clean && npm run telemetry:infra"
