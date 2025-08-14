#!/bin/bash

# Test script for Fastify Telemetry Plugin Simple Example
# This script tests the basic functionality of the TelemetryPluginService

set -e

echo "🧪 Testing Fastify Telemetry Plugin Simple Example..."
echo "================================================="

PORT=${PORT:-3001}
BASE_URL="http://localhost:$PORT"

echo "📋 Testing endpoints:"
echo "  Health: $BASE_URL/health"
echo "  Ready: $BASE_URL/ready"
echo "  Telemetry Status: $BASE_URL/api/telemetry/status"
echo "  Users API: $BASE_URL/api/users"
echo ""

# Function to make HTTP requests
make_request() {
    local method=$1
    local url=$2
    local data=$3
    local description=$4
    
    echo "🔍 $description"
    echo "   → $method $url"
    
    if [ -n "$data" ]; then
        curl -s -X "$method" "$url" \
            -H "Content-Type: application/json" \
            -d "$data" | jq . || echo "Request failed"
    else
        curl -s -X "$method" "$url" | jq . || echo "Request failed"
    fi
    echo ""
}

# Wait for server to be ready
echo "⏰ Waiting for server to be ready..."
for i in {1..30}; do
    if curl -s "$BASE_URL/health" > /dev/null 2>&1; then
        echo "✅ Server is ready!"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "❌ Server did not start within 30 seconds"
        exit 1
    fi
    sleep 1
done

echo ""

# Test health endpoints
make_request "GET" "$BASE_URL/health" "" "Health check"
make_request "GET" "$BASE_URL/ready" "" "Ready check"


# Test compose API
make_request "GET" "$BASE_URL/api/compose" "" "Get all compose (initial data)"




# Final telemetry status check
make_request "GET" "$BASE_URL/api/telemetry/status" "" "Final telemetry status check"

echo "✅ Test completed!"
echo ""
echo "💡 Key features demonstrated:"
echo "   ✅ Instance-based telemetry methods (createChildSpan, getCurrentSpan, getCurrentLogger)"
echo "   ✅ Auto-tracing hooks (automatic spans for all requests)"
echo "   ✅ System metrics collection"
echo "   ✅ Enhanced context creation"
echo "   ✅ Request ID tracking"
echo "   ✅ Structured logging with trace context"
echo "   ✅ Error handling with telemetry"
echo ""
echo "🔍 Check your telemetry backend (Jaeger/OTLP) to see the traces!"
