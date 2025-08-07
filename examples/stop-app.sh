#!/bin/bash

echo "🛑 Stopping Application Services..."

# Stop application services but keep infrastructure running
docker-compose -f docker-compose.telemetry.yml stop app-unified app-server app-simple

echo "✅ Application services stopped!"
echo ""
echo "📋 Application services stopped:"
echo "  • app-unified (unified mode)"
echo "  • app-server (enhanced mode)"
echo "  • app-simple (simple mode)"
echo ""
echo "ℹ️  Telemetry infrastructure is still running"
echo "📊 Infrastructure URLs:"
echo "  • Grafana: http://localhost:3000"
echo "  • Prometheus: http://localhost:9090"
echo ""
echo "🚀 To restart apps:"
echo "  npm run telemetry:app"
echo ""
echo "🛑 To stop everything:"
echo "  npm run telemetry:stop"
