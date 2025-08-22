# OpenTelemetry Environment Variables & NodeSDK Configuration Guide

สรุปการใช้งาน Environment Variables กับ NodeSDK สำหรับ OpenTelemetry configuration

## Overview

OpenTelemetry NodeSDK รองรับการ configuration ผ่าน 3 วิธี:
1. **Environment Variables** (สะดวก สำหรับ runtime config)
2. **Manual Configuration** (ยืดหยุ่น สำหรับ custom logic)  
3. **Combination** (Best of both worlds)

## Priority Order (ลำดับความสำคัญ)

```
1. Manual Configuration (Code) ← สูงสุด
2. Environment Variables
3. Default Values ← ต่ำสุด
```

## Environment Variables Reference

### 🔍 Tracing Configuration

#### Trace Exporters
```bash
# เลือก exporter type (default: otlp)
OTEL_TRACES_EXPORTER=otlp                    # OTLP exporter
OTEL_TRACES_EXPORTER=console                 # Console exporter  
OTEL_TRACES_EXPORTER=otlp,console           # Multiple exporters
OTEL_TRACES_EXPORTER=none                    # Disable tracing

# OTLP Endpoints
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318          # Base endpoint
OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=http://localhost:4318/v1/traces  # Specific endpoint
```

#### Endpoint Priority
```bash
# 1. Specific endpoint (highest priority)
OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=http://custom:4318/v1/traces

# 2. Base endpoint + auto path append
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
# Results in: http://localhost:4318/v1/traces

# 3. Default (lowest)
# http://localhost:4318/v1/traces
```

#### Protocol & Authentication
```bash
# Protocol selection
OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf   # HTTP with protobuf (default)
OTEL_EXPORTER_OTLP_PROTOCOL=grpc            # gRPC
OTEL_EXPORTER_OTLP_PROTOCOL=http/json       # HTTP with JSON

# Authentication headers
OTEL_EXPORTER_OTLP_HEADERS="authorization=Bearer token123,x-api-key=key456"
```

### 📊 Metrics Configuration

#### Metrics Exporters
```bash
# Metrics exporter selection
OTEL_METRICS_EXPORTER=otlp                  # OTLP metrics
OTEL_METRICS_EXPORTER=prometheus            # Prometheus (default config only!)
OTEL_METRICS_EXPORTER=console               # Console metrics
OTEL_METRICS_EXPORTER=none                  # Disable metrics

# OTLP Metrics Endpoints
OTEL_EXPORTER_OTLP_METRICS_ENDPOINT=http://localhost:4318/v1/metrics
```

#### ⚠️ Prometheus Environment Limitations
```bash
# ❌ These DON'T work with OTEL_METRICS_EXPORTER=prometheus
OTEL_EXPORTER_PROMETHEUS_PORT=8080           # Ignored - always 9464
OTEL_EXPORTER_PROMETHEUS_HOST=127.0.0.1      # Ignored - always 0.0.0.0
OTEL_EXPORTER_PROMETHEUS_ENDPOINT=/custom    # Ignored - always /metrics

# ✅ For custom Prometheus config, use manual setup
```

### 📝 Logging Configuration

```bash
# Log exporters
OTEL_LOGS_EXPORTER=otlp                     # OTLP logs
OTEL_LOGS_EXPORTER=console                  # Console logs
OTEL_LOGS_EXPORTER=none                     # Disable logs

# OTLP Logs Endpoint
OTEL_EXPORTER_OTLP_LOGS_ENDPOINT=http://localhost:4318/v1/logs
```

### 🏷️ Resource Configuration

```bash
# Service identification
OTEL_SERVICE_NAME=my-fastify-app             # Service name
OTEL_SERVICE_VERSION=1.2.3                  # Service version
OTEL_SERVICE_NAMESPACE=production            # Service namespace
OTEL_SERVICE_INSTANCE_ID=instance-123       # Instance ID

# Deployment info
DEPLOYMENT_ENVIRONMENT=production            # Environment
OTEL_RESOURCE_ATTRIBUTES="key1=value1,key2=value2"  # Custom attributes
```

### 🔧 SDK Configuration

```bash
# Debug & Development
OTEL_LOG_LEVEL=debug                        # SDK debug logs
OTEL_SDK_DISABLED=false                     # Enable/disable SDK

# Sampling
OTEL_TRACES_SAMPLER=always_on               # Always sample
OTEL_TRACES_SAMPLER=always_off              # Never sample
OTEL_TRACES_SAMPLER=traceidratio            # Probabilistic
OTEL_TRACES_SAMPLER_ARG=0.1                 # Sample 10%
```

## NodeSDK Behavior Patterns

### 1. Zero Configuration (All Defaults)
```typescript
const sdk = new NodeSDK({
  instrumentations: [getNodeAutoInstrumentations()]
});
sdk.start();
```

**Result:**
- ✅ Traces → `http://localhost:4318/v1/traces` (OTLP)
- ❌ Metrics → No export (no default)
- ✅ Logs → Console or OTLP (if configured)

### 2. Environment Variables Only
```bash
export OTEL_SERVICE_NAME=my-app
export OTEL_METRICS_EXPORTER=prometheus
export OTEL_TRACES_EXPORTER=otlp,console
```

**Result:**
- ✅ Traces → OTLP + Console
- ✅ Metrics → Prometheus port 9464
- ✅ Service name = "my-app"

### 3. Manual Override
```typescript
const sdk = new NodeSDK({
  // This overrides environment variables
  traceExporter: new ConsoleSpanExporter(),
  metricReader: new PrometheusExporter({ port: 8080 }),
  resource: new Resource({
    [ATTR_SERVICE_NAME]: 'manual-service'
  })
});
```

**Priority Result:**
- ✅ Traces → Console (manual wins)
- ✅ Metrics → Prometheus port 8080 (manual wins)  
- ✅ Service name = "manual-service" (manual wins)

## Real-World Configuration Examples

### Development Setup
```bash
# .env.development
OTEL_SERVICE_NAME=fastify-dev
OTEL_SERVICE_VERSION=dev-latest
DEPLOYMENT_ENVIRONMENT=development
OTEL_LOG_LEVEL=debug
OTEL_METRICS_EXPORTER=prometheus
OTEL_TRACES_EXPORTER=console
```

### Production Setup
```bash
# .env.production
OTEL_SERVICE_NAME=fastify-api
OTEL_SERVICE_VERSION=1.2.3
DEPLOYMENT_ENVIRONMENT=production
OTEL_EXPORTER_OTLP_ENDPOINT=https://otel-collector.company.com
OTEL_TRACES_EXPORTER=otlp
OTEL_METRICS_EXPORTER=otlp
OTEL_EXPORTER_OTLP_HEADERS="authorization=Bearer ${API_TOKEN}"
```

### Dual Mode Setup (OTLP + Prometheus)
```bash
# Manual dual mode - requires code setup
OTEL_ENABLE_DUAL_MODE=true
OTEL_ENABLE_OTLP_METRICS=true  
OTEL_ENABLE_PROMETHEUS=true
OTEL_EXPORTER_OTLP_ENDPOINT=http://collector:4318
PROMETHEUS_METRICS_PORT=9464
```

## Common Patterns & Tips

### 1. Endpoint URL Patterns

#### Standard OTLP Collector
```bash
# Base endpoint approach (recommended)
OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318

# Auto-generated paths:
# Traces: http://otel-collector:4318/v1/traces
# Metrics: http://otel-collector:4318/v1/metrics
# Logs:    http://otel-collector:4318/v1/logs
```

#### Custom Collector Paths
```bash
# Specific endpoints for custom paths
OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=http://custom:8080/telemetry/traces
OTEL_EXPORTER_OTLP_METRICS_ENDPOINT=http://custom:8080/telemetry/metrics
```

#### Mixed Backends
```bash
# Traces to Jaeger, Metrics to Prometheus
OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=http://jaeger:14268/api/traces
OTEL_METRICS_EXPORTER=prometheus
```

### 2. Development vs Production

#### Development
```typescript
// Use environment variables for flexibility
const sdk = new NodeSDK({
  instrumentations: [getNodeAutoInstrumentations()],
  // Let environment variables control exporters
});
```

#### Production  
```typescript
// Explicit configuration for reliability
const sdk = new NodeSDK({
  resource: createProductionResource(),
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT,
    headers: parseHeaders(process.env.OTEL_EXPORTER_OTLP_HEADERS)
  }),
  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({
      url: process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT
    })
  })
});
```

### 3. Debugging Configuration

```bash
# Enable debug output
export OTEL_LOG_LEVEL=debug
export OTEL_DEBUG=true

# Start your app and check logs for:
# - "Using OTLP HTTP trace exporter"
# - "Exporting spans to http://..."
# - "MetricReader registered"
```

### 4. Health Checks

```bash
# Test if endpoints are reachable
curl -I $OTEL_EXPORTER_OTLP_ENDPOINT/v1/traces
curl -I http://localhost:9464/metrics

# Check collector health
curl $OTEL_EXPORTER_OTLP_ENDPOINT/health
```

## Troubleshooting Common Issues

### 1. Metrics Not Appearing
```bash
# ❌ Problem: No metrics exporter set
OTEL_TRACES_EXPORTER=otlp  # Only traces work

# ✅ Solution: Set metrics exporter
OTEL_METRICS_EXPORTER=prometheus
# or
OTEL_METRICS_EXPORTER=otlp
```

### 2. Wrong Prometheus Port
```bash
# ❌ Problem: Environment variable ignored
OTEL_METRICS_EXPORTER=prometheus
OTEL_EXPORTER_PROMETHEUS_PORT=8080  # This is ignored!

# ✅ Solution: Use manual configuration
# In code: new PrometheusExporter({ port: 8080 })
```

### 3. Collector Connection Issues
```bash
# ❌ Problem: Wrong endpoint format
OTEL_EXPORTER_OTLP_ENDPOINT=localhost:4318  # Missing protocol

# ✅ Solution: Include protocol
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
```

### 4. Mixed gRPC/HTTP Issues
```bash
# ❌ Problem: HTTP endpoint with gRPC protocol
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
OTEL_EXPORTER_OTLP_PROTOCOL=grpc

# ✅ Solution: Match protocol with endpoint
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
```

## Best Practices

### 1. Environment Separation
```bash
# Use different configurations per environment
# development: console exporters, debug enabled
# staging: OTLP to staging collector
# production: OTLP to production collector with auth
```

### 2. Graceful Fallbacks
```typescript
// Handle connection failures gracefully
const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT,
    // Will fallback to console if connection fails
  })
});
```

### 3. Performance Considerations
```bash
# Optimize for production
OTEL_TRACES_SAMPLER=traceidratio
OTEL_TRACES_SAMPLER_ARG=0.1          # Sample 10% of traces
OTEL_BSP_EXPORT_TIMEOUT=30000        # 30s export timeout
OTEL_BSP_SCHEDULE_DELAY=5000         # 5s batch delay
```

### 4. Security
```bash
# Use secure headers for production
OTEL_EXPORTER_OTLP_HEADERS="authorization=Bearer ${SECRET_TOKEN}"
OTEL_EXPORTER_OTLP_ENDPOINT=https://secure-collector.company.com
```

---

**Summary**: Environment Variables ทำให้ configuration ยืดหยุ่น แต่สำหรับ advanced use cases เช่น dual mode หรือ custom Prometheus config ยังต้องใช้ manual setup ใน code เสริม!

## Default Protocol Behavior

### OpenTelemetry SDK Default Protocol: **HTTP/Protobuf** 🎯

เมื่อไม่ได้ระบุ protocol ใน SDK, OpenTelemetry NodeSDK จะใช้ **HTTP/Protobuf** เป็น default protocol

#### Default Behavior Pattern
```bash
# ถ้าเรา set แค่ endpoint
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318

# OpenTelemetry จะใช้:
# Protocol: HTTP/Protobuf (default)
# URL: http://localhost:4318/v1/traces
# Content-Type: application/x-protobuf
```

#### Port-Based Auto-Detection

**OTLP Collector มี port conventions ที่ OpenTelemetry จะ auto-detect:**
- **4317** = gRPC protocol (default gRPC port)
- **4318** = HTTP protocol (default HTTP port)

```bash
# gRPC endpoint (auto-detected from port)
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317
# → OpenTelemetry จะ auto-detect และใช้ gRPC

# HTTP endpoint (auto-detected from port)
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
# → OpenTelemetry จะ auto-detect และใช้ HTTP/Protobuf
```

#### Protocol Selection Priority Order

```
1. OTEL_EXPORTER_OTLP_PROTOCOL environment variable (highest)
2. Auto-detection จาก port number (4317=gRPC, 4318=HTTP)
3. Default: HTTP/Protobuf (lowest)
```

#### Available Protocol Options

```bash
# Binary protocols (recommended for production)
OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf  # Default, compact binary
OTEL_EXPORTER_OTLP_PROTOCOL=grpc           # Binary, streaming, efficient

# Text protocol (for debugging)
OTEL_EXPORTER_OTLP_PROTOCOL=http/json      # Human readable, larger size
```

#### Protocol Override Examples

```bash
# Force gRPC on HTTP port
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
OTEL_EXPORTER_OTLP_PROTOCOL=grpc

# Force HTTP/JSON on gRPC port  
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317
OTEL_EXPORTER_OTLP_PROTOCOL=http/json

# Explicit HTTP/Protobuf (same as default)
OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
```

#### Real-World SDK Behavior

```typescript
// ไม่ระบุ protocol ใน SDK code
const sdk = new NodeSDK({
  instrumentations: [getNodeAutoInstrumentations()]
  // ไม่มี traceExporter config - ให้ env vars ควบคุม
});

// Environment variables ควบคุม protocol:
// OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
// → Result: HTTP/Protobuf to http://localhost:4318/v1/traces
```

#### Protocol Comparison

| Protocol | Pros | Cons | Use Case |
|----------|------|------|----------|
| **HTTP/Protobuf** | ✅ Firewall friendly<br>✅ Load balancer compatible<br>✅ Compact binary | ❌ Slower than gRPC | **Default choice** |
| **gRPC** | ✅ Fastest performance<br>✅ Streaming support<br>✅ Built-in compression | ❌ Firewall issues<br>❌ Complex load balancing | High-throughput scenarios |
| **HTTP/JSON** | ✅ Human readable<br>✅ Easy debugging<br>✅ Wide compatibility | ❌ Large payload size<br>❌ Slower parsing | Development & debugging |

#### Why HTTP/Protobuf is Default

**ข้อดีของ HTTP/Protobuf (default):**
- ✅ **Network Compatibility**: ทำงานได้กับ load balancers, proxies, firewalls ทั่วไป
- ✅ **Performance**: Binary format ทำให้ payload compact
- ✅ **Reliability**: HTTP semantics ที่เข้าใจง่าย
- ✅ **Wide Support**: รองรับโดย OTLP collectors ทุกตัว

**เมื่อไหร่ควรเปลี่ยน:**
- **gRPC**: เมื่อต้องการ performance สูงสุดและ network รองรับ
- **HTTP/JSON**: เมื่อต้อง debug หรือ troubleshoot
