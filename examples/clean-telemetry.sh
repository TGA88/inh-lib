#!/bin/bash

echo "🗑️  Cleaning Up Telemetry Stack (Stop + Remove Volumes)..."

# Stop all services and remove volumes
docker-compose -f docker-compose.telemetry.yml down -v

echo "✅ All telemetry services stopped and data volumes removed!"
echo ""
echo "📋 Cleaned up:"
echo "  • All applications stopped"
echo "  • All infrastructure services stopped"
echo "  • All data volumes removed (Prometheus, Grafana, Loki data lost)"
echo ""
echo "⚠️  Next start will be fresh with no historical data"
echo ""
echo "🚀 To restart fresh:"
echo "  npm run telemetry:start"
