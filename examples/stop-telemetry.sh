#!/bin/bash

echo "🛑 Stopping All Telemetry Services (Infrastructure + Applications)..."

# Stop all services
docker-compose -f docker-compose.telemetry.yml down

echo "✅ All telemetry services stopped!"
echo ""
echo "📋 Services stopped:"
echo "  • All applications (app-unified, app-server, app-simple)"
echo "  • Grafana Dashboard"
echo "  • Prometheus"
echo "  • Tempo"
echo "  • Loki & Promtail"
echo "  • OpenTelemetry Collector"
echo ""
echo "🗑️  To also remove volumes (delete data):"
echo "  npm run telemetry:clean"
