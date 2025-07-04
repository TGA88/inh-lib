# Telemetry### 📊 Metrics
- **Prometheus**: Metrics collection และ storage  
- **OpenTelemetry Collector**: OTLP metrics receiver
- **Application**: Direct metrics endpoint สำหรับ Prometheus scraping
- **Dual Mode**: รองรับการส่ง metrics ไป OTLP และ Prometheus พร้อมกันck for Fastify Application

Complete telemetry stack using Docker Compose with Prometheus, Tempo, Loki, Grafana, และ OpenTelemetry Collector.

## Stack Components

### � **Example Applications**
- **Enhanced App** (`telemetry-enhanced-app.ts`): Full OpenTelemetry integration
- **Unified App** (`fastify-with-telemetry-example.ts`): Using @inh-lib packages
- **Simple App** (`simplified-fastify-example.ts`): Mock telemetry for development

### �📊 Metrics
- **Prometheus**: Metrics collection และ storage
- **OpenTelemetry Collector**: OTLP metrics receiver
- **Application**: Direct metrics endpoint สำหรับ Prometheus scraping

### 🔍 Tracing  
- **Tempo**: Distributed tracing backend
- **OpenTelemetry Collector**: OTLP trace receiver
- **Application**: OpenTelemetry NodeSDK integration

### 📝 Logging
- **Loki**: Log aggregation system
- **Promtail**: Log collection agent
- **Application**: Structured JSON logging

### 📈 Visualization
- **Grafana**: Dashboard และ visualization
- Auto-configured datasources (Prometheus, Tempo, Loki)
- Correlation between metrics, traces, และ logs

## Quick Start

### 1. Start the Telemetry Stack

```bash
# Make script executable
chmod +x start-telemetry.sh

# Start everything (default: enhanced app)
./start-telemetry.sh
```

### 2. Test Different Application Modes

```bash
# Test all app variants
./test-apps.sh

# Test specific modes with dual mode support:
npm run dev:dual           # OTLP + Prometheus (dual export)
npm run dev:otlp-only      # OTLP metrics only
npm run dev:prometheus-only # Prometheus metrics only

# Or manually choose app mode:
APP_MODE=enhanced ./start-telemetry.sh   # Full OpenTelemetry
APP_MODE=unified ./start-telemetry.sh    # @inh-lib packages  
APP_MODE=simple ./start-telemetry.sh     # Mock telemetry
```

### 3. Manual Setup

```bash
# Build application image
docker build -f Dockerfile.app -t fastify-telemetry-app .

# Start telemetry stack
docker-compose -f docker-compose.telemetry.yml up -d

# Check status
docker-compose -f docker-compose.telemetry.yml ps
```

## Access URLs

| Service | URL | Credentials |
|---------|-----|-------------|
| **Application** | http://localhost:3001 | - |
| **App Metrics** | http://localhost:9464/metrics | - |
| **Grafana** | http://localhost:3000 | admin/admin |
| **Prometheus** | http://localhost:9090 | - |
| **Tempo** | http://localhost:3200 | - |
| **Loki** | http://localhost:3100 | - |

## API Testing

### Test the Application

```bash
# Health check
curl http://localhost:3001/health

# Get all users
curl http://localhost:3001/api/users

# Create a user
curl -X POST http://localhost:3001/api/users \
  -H "Content-Type: application/json" \
  -d '{"name":"John Doe","email":"john@example.com"}'

# Get user by ID
curl http://localhost:3001/api/users/1

# Update user
curl -X PUT http://localhost:3001/api/users/1 \
  -H "Content-Type: application/json" \
  -d '{"name":"John Smith"}'

# Delete user
curl -X DELETE http://localhost:3001/api/users/1
```

### Test Metrics Endpoint

```bash
# Application metrics (Prometheus format)
curl http://localhost:9464/metrics

# OpenTelemetry Collector metrics
curl http://localhost:8888/metrics
```

## Telemetry Features

### 📊 Metrics
- HTTP request metrics (count, duration, status codes)
- Database operation metrics
- Custom business metrics
- System metrics (memory, CPU)
- OpenTelemetry Collector metrics

### 🔍 Tracing
- HTTP request tracing
- Database operation spans
- Business logic spans
- Error tracking
- Trace correlation with logs

### 📝 Logging
- Structured JSON logs
- Trace ID correlation
- Log levels (info, warn, error)
- Request/response logging
- Error stack traces

## Configuration

### Environment Variables

```bash
# Application
PORT=3001
ENABLE_TELEMETRY=true
OTEL_SERVICE_NAME=fastify-telemetry-example
OTEL_SERVICE_VERSION=1.0.0

# OpenTelemetry
OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318
PROMETHEUS_METRICS_PORT=9464

# Logging
LOG_LEVEL=info
```

### OpenTelemetry Configuration

The application uses `otel-config.ts` for OpenTelemetry setup:

```typescript
// Import and initialize
import { setupTelemetryForApp } from './otel-config';
const otelSDK = setupTelemetryForApp();
```

Key features:
- Auto-instrumentation for HTTP, Fastify
- OTLP export to collector
- Prometheus metrics export
- Resource detection
- Trace correlation

## Development

### Local Development (without Docker)

```bash
# Install dependencies
npm install

# Start telemetry services only
docker-compose -f docker-compose.telemetry.yml up -d prometheus loki tempo grafana otel-collector promtail

# Set environment variables
export OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
export PROMETHEUS_METRICS_PORT=9464

# Run application
npm run dev
```

### Testing Telemetry

1. **Generate Traffic**:
```bash
# Run the test script
node test-api.js
```

2. **View Metrics** in Prometheus:
- Go to http://localhost:9090
- Query: `http_requests_total`
- Query: `http_request_duration_seconds`

3. **View Traces** in Tempo:
- Go to Grafana http://localhost:3000
- Navigate to Explore → Tempo
- Search for traces

4. **View Logs** in Loki:
- Go to Grafana http://localhost:3000  
- Navigate to Explore → Loki
- Query: `{service="fastify-telemetry-example"}`

## Grafana Dashboards

Auto-configured datasources:
- **Prometheus**: Metrics
- **Tempo**: Traces  
- **Loki**: Logs

You can create custom dashboards or import existing ones:

### Sample Queries

**Prometheus Metrics**:
```promql
# Request rate
rate(http_requests_total[5m])

# Error rate
rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m])

# Response time percentiles
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))
```

**Loki Logs**:
```logql
# All application logs
{service="fastify-telemetry-example"}

# Error logs only
{service="fastify-telemetry-example"} |= "ERROR"

# Logs for specific trace
{service="fastify-telemetry-example"} | json | traceId="your-trace-id"
```

## Troubleshooting

### Common Issues

1. **Services not starting**:
```bash
# Check logs
docker-compose -f docker-compose.telemetry.yml logs

# Check specific service
docker-compose -f docker-compose.telemetry.yml logs grafana
```

2. **Application can't connect to collector**:
```bash
# Check collector health
curl http://localhost:4318/v1/traces

# Check network
docker network ls
docker network inspect examples_telemetry
```

3. **Metrics not appearing**:
```bash
# Check application metrics endpoint
curl http://localhost:9464/metrics

# Check Prometheus targets
curl http://localhost:9090/api/v1/targets
```

4. **Traces not appearing**:
```bash
# Check Tempo health
curl http://localhost:3200/ready

# Check collector logs
docker-compose -f docker-compose.telemetry.yml logs otel-collector
```

### Logs and Debugging

```bash
# View all logs
docker-compose -f docker-compose.telemetry.yml logs -f

# View specific service logs
docker-compose -f docker-compose.telemetry.yml logs -f app-server
docker-compose -f docker-compose.telemetry.yml logs -f otel-collector
docker-compose -f docker-compose.telemetry.yml logs -f prometheus

# View application logs (from container)
docker exec -it fastify-telemetry-app tail -f /app/logs/app.log
```

## Cleanup

```bash
# Stop all services
docker-compose -f docker-compose.telemetry.yml down

# Remove volumes (⚠️ deletes all data)
docker-compose -f docker-compose.telemetry.yml down -v

# Clean up images
docker image prune -f
```

## Next Steps

1. **Custom Dashboards**: Create Grafana dashboards specific to your application
2. **Alerting**: Set up alerts in Grafana based on metrics and logs  
3. **Sampling**: Configure trace sampling for production
4. **Security**: Add authentication and TLS for production
5. **Scaling**: Use distributed storage backends for production

## Dual Mode Configuration

OpenTelemetry สามารถส่ง metrics ไปยัง **OTLP Collector** และ **Prometheus** พร้อมกันได้ ดู [DUAL_MODE.md](./DUAL_MODE.md) สำหรับรายละเอียดเพิ่มเติม

### Environment Variables สำหรับ Dual Mode

```bash
# Enable dual mode (OTLP + Prometheus)
export OTEL_ENABLE_DUAL_MODE=true
export OTEL_ENABLE_OTLP_METRICS=true
export OTEL_ENABLE_PROMETHEUS=true
export OTEL_DEBUG=true

# Run with dual mode
npm run dev:telemetry
```

### ประโยชน์ของ Dual Mode
- 📊 **Prometheus**: สำหรับ alerting และ Grafana dashboards
- 🔍 **OTLP**: สำหรับ centralized observability platform
- 🔄 **Redundancy**: มี backup ถ้า service หนึ่งล่ม
- 🏗️ **Flexibility**: รองรับทั้ง pull-based และ push-based metrics
