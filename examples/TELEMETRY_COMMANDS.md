# Telemetry Commands Reference

## 📋 Quick Reference Table

| Command | Purpose | What It Does | Use Case |
|---------|---------|--------------|----------|
| `npm run telemetry:infra` | Start Infrastructure Only | Starts Prometheus, Grafana, Tempo, Loki, OTLP Collector | Development (run app locally) |
| `npm run telemetry:app` | Start App Only | Builds & starts unified app (assumes infra ready) | Quick app restart |
| `npm run telemetry:start` | Start Full Stack | Starts infra → waits → starts app | Full testing |
| `npm run telemetry:stop` | Stop Everything | Stops all services (apps + infra) | Complete shutdown |
| `npm run telemetry:stop:infra` | Stop Infrastructure | Stops infra, keeps apps running | Keep apps, stop monitoring |
| `npm run telemetry:stop:app` | Stop Apps | Stops apps, keeps infra running | Restart apps quickly |
| `npm run telemetry:clean` | Clean Everything | Stops all + removes volumes | Fresh start |
| `npm run telemetry:logs` | View Logs | Shows logs from all services | Debugging |

## 🎯 Workflow Examples

### Development Workflow
```bash
# 1. Start infrastructure for monitoring
npm run telemetry:infra

# 2. Run your app locally (with hot reload)
npm run dev

# 3. View metrics in Grafana
open http://localhost:3000

# 4. Stop infrastructure when done
npm run telemetry:stop:infra
```

### Testing Workflow  
```bash
# Start full stack
npm run telemetry:start

# Test endpoints
curl http://localhost:3001/health

# Stop everything
npm run telemetry:stop
```

### Quick Restart Workflow
```bash
# Infrastructure already running...
npm run telemetry:stop:app   # Stop app
npm run telemetry:app        # Start app again
```

## 🌐 Service URLs

### Applications
- **Unified App**: http://localhost:3001
- **Health Check**: http://localhost:3001/health
- **App Metrics**: http://localhost:9464/metrics

### Infrastructure  
- **Grafana**: http://localhost:3000 (admin/admin)
- **Prometheus**: http://localhost:9090
- **Tempo**: http://localhost:3200
- **Loki**: http://localhost:3100

## 🛡️ Safety Features

- **Infrastructure Check**: `telemetry:app` checks if infrastructure is ready
- **Graceful Waiting**: Scripts wait for services to be healthy before proceeding
- **Selective Stopping**: Stop only what you need (apps vs infrastructure)
- **Clean Volumes**: `telemetry:clean` removes persistent data for fresh starts
