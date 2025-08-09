#!/bin/sh

echo "🚀 Starting Fastify Telemetry Example Application"
echo "================================================"
echo "APP_MODE: ${APP_MODE:-enhanced}"
echo "ENABLE_TELEMETRY: ${ENABLE_TELEMETRY:-true}"
echo "OTEL_SERVICE_NAME: ${OTEL_SERVICE_NAME:-fastify-telemetry-example}"
echo "PORT: ${PORT:-3001}"
echo "PROMETHEUS_METRICS_PORT: ${PROMETHEUS_METRICS_PORT:-9464}"
echo ""

# Default to enhanced mode if not specified
APP_MODE=${APP_MODE:-enhanced}

# Select which application to run based on APP_MODE
case $APP_MODE in
  "enhanced")
    echo "🔍 Running Enhanced Telemetry Application (with OpenTelemetry SDK)"
    APP_FILE="dist/telemetry-enhanced-app.js"
    ;;
  "unified")
    echo "🔧 Running Unified Packages Application (with @inh-lib packages)"
    APP_FILE="dist/fastify-with-telemetry-example.js"
    ;;
  "hybrid")
    echo "🔄 Running Hybrid Telemetry Application (with middleware patterns)"
    APP_FILE="dist/fastify-hybrid-telemetry.js"
    ;;
  "simple")
    echo "🎭 Running Simple Mock Application (with mock telemetry)"
    APP_FILE="dist/simplified-fastify-example.js"
    ;;
  *)
    echo "❌ Invalid APP_MODE: ${APP_MODE}"
    echo "Valid options: enhanced, unified, hybrid, simple"
    exit 1
    ;;
esac

# Check if the application file exists
if [ ! -f "$APP_FILE" ]; then
    echo "❌ Application file not found: $APP_FILE"
    echo "Available files:"
    ls -la dist/
    exit 1
fi

echo "📦 Starting: node $APP_FILE"
echo ""

# Execute the selected application with all passed arguments
exec node "$APP_FILE" "$@"
