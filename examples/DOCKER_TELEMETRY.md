# Docker Telemetry Stack

This docker-compose setup provides a complete observability stack for testing the Fastify Telemetry Example application.

## Architecture

The stack includes:
- **OpenTelemetry Collector**: OTLP endpoint for traces and metrics
- **Tempo**: Distributed tracing backend
- **Prometheus**: Metrics collection and storage
- **Loki**: Log aggregation system
- **Promtail**: Log collection agent
- **Grafana**: Dashboard and visualization

## Application Variants

### 🚀 Main Application: `app-unified` (Default)

The primary application using Unified Telemetry packages with basic telemetry configuration optimized for Prometheus metrics.

```bash
# Start the complete stack with unified app
docker-compose -f docker-compose.telemetry.yml up
```

**Features:**
- ✅ Full telemetry with UnifiedMiddleware
- ✅ Basic telemetry configuration (optimized for Prometheus)
- ✅ Auto-instrumentation and metrics collection
- ✅ Direct Prometheus metrics endpoint
- 📊 Port: `3001` (http://localhost:3001)
- 📈 Metrics: `9464` (http://localhost:9464/metrics)

### 🔧 Alternative Applications (Profiles)

#### Enhanced App (`app-server`)
Enhanced application with custom OtelConfig for advanced telemetry features.

```bash
# Start with enhanced app profile
docker-compose -f docker-compose.telemetry.yml --profile enhanced up
```

**Features:**
- ✅ Custom OtelConfig integration
- ✅ Advanced OpenTelemetry features
- ✅ Enhanced tracing capabilities
- 📊 Port: `3002` (http://localhost:3002)
- 📈 Metrics: `9465` (http://localhost:9465/metrics)

#### Simple App (`app-simple`)
Minimal application for testing without external dependencies.

```bash
# Start with simple app profile
docker-compose -f docker-compose.telemetry.yml --profile simple up
```

**Features:**
- ✅ Basic telemetry
- ❌ No external telemetry backends
- 📊 Port: `3003` (http://localhost:3003)

## Environment Variables

### Main App (`app-unified`)
- `CUSTOM_OTEL_CONFIG_ENABLED=false` - Use basic telemetry for better Prometheus integration
- `OTEL_ENABLE_PROMETHEUS=true` - Enable Prometheus metrics endpoint
- `OTEL_SERVICE_NAME=fastify-unified-example`
- `OTEL_SERVICE_VERSION=1.0.0`
- `OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318`

### Enhanced App (`app-server`)
- `CUSTOM_OTEL_CONFIG_ENABLED=true` - Use custom OtelConfig for advanced features
- `OTEL_ENABLE_PROMETHEUS=true` - Enable Prometheus metrics endpoint
- `OTEL_SERVICE_NAME=fastify-telemetry-example`
- `APP_MODE=enhanced`

## Quick Start

1. **Start the main stack:**
```bash
docker-compose -f docker-compose.telemetry.yml up -d
```

2. **Access the applications:**
- Main App: http://localhost:3001
- Health Check: http://localhost:3001/health
- Users API: http://localhost:3001/api/users

3. **Access observability tools:**
- Grafana: http://localhost:3000 (admin/admin)
- Prometheus: http://localhost:9090
- Tempo: http://localhost:3200
- Loki: http://localhost:3100

## API Testing

Test the Users API:

```bash
# Get all users
curl http://localhost:3001/api/users

# Create a user
curl -X POST http://localhost:3001/api/users \
  -H "Content-Type: application/json" \
  -d '{"name": "John Doe", "email": "john@example.com"}'

# Get user by ID
curl http://localhost:3001/api/users/1

# Update user
curl -X PUT http://localhost:3001/api/users/1 \
  -H "Content-Type: application/json" \
  -d '{"name": "Jane Doe"}'

# Delete user
curl -X DELETE http://localhost:3001/api/users/1
```

## Monitoring

### Metrics
- App metrics: http://localhost:9464/metrics
- OTel Collector metrics: http://localhost:8888/metrics

### Tracing
View traces in Grafana → Explore → Tempo datasource

### Logs
View logs in Grafana → Explore → Loki datasource

## Development

### Build and run:
```bash
# Build the application image
docker-compose -f docker-compose.telemetry.yml build

# Start with specific profile
docker-compose -f docker-compose.telemetry.yml --profile enhanced up

# View logs
docker-compose -f docker-compose.telemetry.yml logs -f app-unified
```

### Cleanup:
```bash
# Stop all services
docker-compose -f docker-compose.telemetry.yml down

# Remove volumes (careful - this deletes data!)
docker-compose -f docker-compose.telemetry.yml down -v
```

## Troubleshooting

### Check service health:
```bash
# Check all services
docker-compose -f docker-compose.telemetry.yml ps

# Check specific service logs
docker-compose -f docker-compose.telemetry.yml logs app-unified
docker-compose -f docker-compose.telemetry.yml logs otel-collector
```

### Common issues:
1. **Port conflicts**: Make sure ports 3001, 9464, 3000, 9090 are available
2. **Memory issues**: The stack requires ~2GB RAM
3. **Build failures**: Check Dockerfile.app exists and dependencies are built

## Configuration Files

Make sure these configuration files exist:
- `./telemetry-config/otel-collector-config.yml`
- `./telemetry-config/prometheus.yml`
- `./telemetry-config/loki-config.yml`
- `./telemetry-config/promtail-config.yml`
- `./telemetry-config/grafana/provisioning/`
