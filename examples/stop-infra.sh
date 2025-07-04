#!/bin/bash

echo "🛑 Stopping Telemetry Infrastructure..."

# Stop infrastructure services but keep applications running
docker-compose -f docker-compose.telemetry.yml stop prometheus tempo loki grafana otel-collector promtail

echo "✅ Telemetry infrastructure stopped!"
echo ""
echo "📋 Infrastructure services stopped:"
echo "  • Grafana Dashboard"
echo "  • Prometheus"
echo "  • Tempo"
echo "  • Loki & Promtail"
echo "  • OpenTelemetry Collector"
echo ""
echo "ℹ️  Applications are still running (if started)"
echo ""
echo "🛑 To stop everything:"
echo "  npm run telemetry:stop"
