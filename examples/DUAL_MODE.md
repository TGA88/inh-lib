# OpenTelemetry Dual Mode Configuration

## Overview

รองรับการส่ง metrics ไปยัง **OTLP Collector** และ **Prometheus** พร้อมกันด้วย DualMode configuration

## Available Modes

### 1. Prometheus Only (Default)
```bash
npm run dev:prometheus-only
# หรือ
OTEL_ENABLE_OTLP_METRICS=false OTEL_ENABLE_PROMETHEUS=true npm run dev:telemetry
```

**Features:**
- ✅ Metrics available at `http://localhost:9464/metrics` 
- ✅ Traces sent to OTLP collector
- ❌ No metrics sent to OTLP collector

### 2. OTLP Only
```bash
npm run dev:otlp-only
# หรือ
OTEL_ENABLE_OTLP_METRICS=true OTEL_ENABLE_PROMETHEUS=false npm run dev:telemetry
```

**Features:**
- ❌ No Prometheus scraping endpoint
- ✅ Traces sent to OTLP collector  
- ✅ Metrics sent to OTLP collector

### 3. Dual Mode (OTLP + Prometheus)
```bash
npm run dev:dual
# หรือ
OTEL_ENABLE_DUAL_MODE=true OTEL_ENABLE_OTLP_METRICS=true OTEL_ENABLE_PROMETHEUS=true npm run dev:telemetry
```

**Features:**
- ✅ Metrics available at `http://localhost:9464/metrics` (Prometheus scraping)
- ✅ Traces sent to OTLP collector
- ✅ Metrics sent to OTLP collector
- 🔄 **Dual export**: เดียวกันแต่ส่งไปทั้งสองที่

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `OTEL_ENABLE_DUAL_MODE` | Enable dual mode (OTLP + Prometheus) | `false` |
| `OTEL_ENABLE_OTLP_METRICS` | Send metrics to OTLP collector | `false` |  
| `OTEL_ENABLE_PROMETHEUS` | Enable Prometheus metrics endpoint | `true` |
| `OTEL_DEBUG` | Enable debug logging | `false` |
| `PROMETHEUS_METRICS_PORT` | Prometheus metrics port | `9464` |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | OTLP collector endpoint | `http://localhost:4318` |

## Architecture

### Regular Mode (Single Export)
```
┌─────────────┐    ┌──────────────┐
│   Fastify   │    │     OTLP     │
│    App      │────│  Collector   │
└─────────────┘    └──────────────┘
        │                   
        └──────────────┐    
                       │    
                ┌─────────────┐
                │ Prometheus  │
                │  Endpoint   │
                └─────────────┘
```

### Dual Mode (Dual Export)
```
┌─────────────┐    ┌──────────────┐
│   Fastify   │────│     OTLP     │
│    App      │    │  Collector   │
└─────────────┘    └──────────────┘
        │                   
        └──────────────┐    
                       │    
                ┌─────────────┐
                │ Prometheus  │
                │  Endpoint   │
                └─────────────┘
```

## Implementation Details

### NodeSDK Configuration
ในกรณี **Single Mode**: NodeSDK ใช้ `metricReader` เพียง 1 ตัว (OTLP หรือ Prometheus)

### Dual Mode Implementation  
ในกรณี **Dual Mode**: 
1. NodeSDK ใช้ OTLP `metricReader` 
2. สร้าง `MeterProvider` แยกสำหรับ Prometheus
3. Set global meter provider เพื่อให้ metrics ส่งไปทั้งสองที่

```typescript
// NodeSDK uses OTLP
const sdk = new NodeSDK({
  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter(...)
  })
});

// Separate MeterProvider for Prometheus
const meterProvider = new MeterProvider({
  readers: [new PrometheusExporter({ port: 9464 })]
});
metrics.setGlobalMeterProvider(meterProvider);
```

## Testing

### Test All Modes
```bash
# Test dual mode
npm run dev:dual

# Test OTLP only  
npm run dev:otlp-only

# Test Prometheus only
npm run dev:prometheus-only
```

### Verify Metrics
```bash
# Check Prometheus metrics
curl http://localhost:9464/metrics

# Generate traffic for testing
curl http://localhost:3001/health
curl http://localhost:3001/api/users
```

### Debug Output
```bash
# Enable debug mode
OTEL_DEBUG=true npm run dev:dual
```

## Production Recommendations

### For Production Use
```bash
# Use dual mode for comprehensive observability
OTEL_ENABLE_DUAL_MODE=true \
OTEL_ENABLE_OTLP_METRICS=true \
OTEL_ENABLE_PROMETHEUS=true \
OTEL_EXPORTER_OTLP_ENDPOINT=https://your-otel-collector \
npm start
```

**Benefits:**
- 📊 **Prometheus**: For alerting and Grafana dashboards
- 🔍 **OTLP**: For centralized observability platform  
- 🔄 **Redundancy**: มี backup ถ้า service หนึ่งล่ม
- 🏗️ **Flexibility**: รองรับทั้ง pull-based และ push-based metrics

### Performance Considerations
- Dual mode จะใช้ memory และ CPU เพิ่มขึ้นเล็กน้อย
- เหมาะสำหรับ production workloads ที่ต้องการ comprehensive observability
- สำหรับ development ใช้ Prometheus-only mode ก็เพียงพอ
