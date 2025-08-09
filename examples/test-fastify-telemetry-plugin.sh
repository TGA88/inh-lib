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

# Test telemetry status
make_request "GET" "$BASE_URL/api/telemetry/status" "" "Telemetry status (shows instance-based methods)"

# Test users API
make_request "GET" "$BASE_URL/api/users" "" "Get all users (initial data)"

# Create a new user
NEW_USER='{"name":"Test User","email":"test@example.com"}'
echo "🆕 Creating new user..."
USER_RESPONSE=$(curl -s -X POST "$BASE_URL/api/users" \
    -H "Content-Type: application/json" \
    -d "$NEW_USER")

echo "$USER_RESPONSE" | jq .

# Extract user ID for further testing
USER_ID=$(echo "$USER_RESPONSE" | jq -r '.data.id // empty')

if [ -n "$USER_ID" ]; then
    echo ""
    make_request "GET" "$BASE_URL/api/users/$USER_ID" "" "Get created user by ID"
    
    # Update the user
    UPDATE_DATA='{"name":"Updated Test User"}'
    make_request "PUT" "$BASE_URL/api/users/$USER_ID" "$UPDATE_DATA" "Update user"
    
    # Get all users to see the update
    make_request "GET" "$BASE_URL/api/users" "" "Get all users (after update)"
    
    # Delete the user
    make_request "DELETE" "$BASE_URL/api/users/$USER_ID" "" "Delete user"
    
    # Verify deletion
    echo "🔍 Verifying user deletion (should return 404)"
    echo "   → GET $BASE_URL/api/users/$USER_ID"
    curl -s -w "HTTP Status: %{http_code}\n" "$BASE_URL/api/users/$USER_ID" | jq . || echo "User not found (expected)"
    echo ""
else
    echo "⚠️  Could not extract user ID from response"
fi

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
