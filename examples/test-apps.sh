#!/bin/bash

echo "🧪 Testing Different Application Modes"
echo "======================================"

# Function to test an app
test_app() {
    local mode=$1
    local port=$2
    local description=$3
    
    echo ""
    echo "🚀 Testing $description (APP_MODE=$mode, Port=$port)"
    echo "----------------------------------------------"
    
    # Start the app
    APP_MODE=$mode PORT=$port docker-compose -f docker-compose.telemetry.yml up -d app-server
    
    # Wait for startup
    echo "⏳ Waiting for application to start..."
    sleep 10
    
    # Test health endpoint
    echo "💓 Testing health endpoint..."
    if curl -s http://localhost:$port/health | jq . >/dev/null 2>&1; then
        echo "✅ Health check passed"
    else
        echo "❌ Health check failed"
    fi
    
    # Test API endpoints
    echo "📊 Testing API endpoints..."
    
    # Get users
    echo "  GET /api/users"
    curl -s http://localhost:$port/api/users | jq .success 2>/dev/null || echo "  ❌ Failed"
    
    # Create user
    echo "  POST /api/users"
    USER_RESPONSE=$(curl -s -X POST http://localhost:$port/api/users \
        -H "Content-Type: application/json" \
        -d '{"name":"Test User","email":"test@example.com"}')
    
    USER_ID=$(echo $USER_RESPONSE | jq -r '.data.id' 2>/dev/null)
    if [ "$USER_ID" != "null" ] && [ "$USER_ID" != "" ]; then
        echo "  ✅ User created with ID: $USER_ID"
        
        # Get user by ID
        echo "  GET /api/users/$USER_ID"
        curl -s http://localhost:$port/api/users/$USER_ID | jq .success 2>/dev/null || echo "  ❌ Failed"
        
        # Update user
        echo "  PUT /api/users/$USER_ID"
        curl -s -X PUT http://localhost:$port/api/users/$USER_ID \
            -H "Content-Type: application/json" \
            -d '{"name":"Updated User"}' | jq .success 2>/dev/null || echo "  ❌ Failed"
        
        # Delete user
        echo "  DELETE /api/users/$USER_ID"
        curl -s -X DELETE http://localhost:$port/api/users/$USER_ID | jq .success 2>/dev/null || echo "  ❌ Failed"
    else
        echo "  ❌ Failed to create user"
    fi
    
    # Test metrics endpoint (if available)
    if [ "$mode" == "enhanced" ]; then
        echo "📈 Testing metrics endpoint..."
        if curl -s http://localhost:9464/metrics | grep -q "http_requests_total"; then
            echo "  ✅ Metrics endpoint working"
        else
            echo "  ❌ Metrics endpoint not working"
        fi
    fi
    
    # Show logs
    echo "📝 Recent application logs:"
    docker-compose -f docker-compose.telemetry.yml logs --tail=5 app-server
    
    # Stop the app
    docker-compose -f docker-compose.telemetry.yml stop app-server
    
    echo "✅ Test completed for $description"
}

# Ensure telemetry stack is running
echo "🔍 Starting telemetry stack..."
docker-compose -f docker-compose.telemetry.yml up -d otel-collector prometheus loki tempo grafana promtail

# Wait for telemetry services
echo "⏳ Waiting for telemetry services..."
sleep 15

# Test each application mode
test_app "simple" "3001" "Simple Mock Application"
test_app "enhanced" "3001" "Enhanced OpenTelemetry Application"  
test_app "unified" "3001" "Unified Packages Application"

echo ""
echo "🎉 All tests completed!"
echo ""
echo "📊 Access telemetry dashboards:"
echo "  Grafana:    http://localhost:3000 (admin/admin)"
echo "  Prometheus: http://localhost:9090" 
echo "  Loki:       http://localhost:3100"
echo ""
echo "🛑 To stop all services:"
echo "  docker-compose -f docker-compose.telemetry.yml down"
