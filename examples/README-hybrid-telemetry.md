# Fastify Hybrid Telemetry Example

เป็น example ที่แสดงการใช้งาน **Hybrid Telemetry Architecture** ที่ต่อกับ real telemetry infrastructure ที่ provision ด้วย Docker

## 🏗️ Architecture

### ✅ **Perfect Hybrid Pattern:**
- **TelemetryPluginService** → ใช้เฉพาะ Fastify hooks (auto-tracing) เท่านั้น
- **UnifiedTelemetryMiddlewareService** → ใช้ใน ALL business layers (API, Service, Data)
- **UnifiedHttpContext** → ใช้ตลอดทุก layers โดยไม่ขึ้นกับ Fastify
- **Constructor Injection** → Clean dependency injection pattern สำหรับทุก layers
- **Real OTEL Provider** → เชื่อมต่อกับ infrastructure จริง

### 📦 **Layer Responsibilities:**
```
┌─────────────────────────────────────────────────────┐
│ 🚀 Fastify Hooks (TelemetryPluginService)          │
│    ✅ HTTP auto-tracing เท่านั้น                   │
└─────────────────────────────────────────────────────┘
                          ⬇️
┌─────────────────────────────────────────────────────┐
│ 📡 API Layer (UnifiedTelemetryMiddlewareService)    │
│    ✅ Convert req/res → UnifiedHttpContext          │
│    ✅ Constructor injection แทน registry pattern   │
└─────────────────────────────────────────────────────┘
                          ⬇️
┌─────────────────────────────────────────────────────┐
│ 🔧 Service Layer (UnifiedTelemetryMiddlewareService)│
│    ✅ Business logic telemetry                      │
│    ✅ Constructor dependency injection               │
└─────────────────────────────────────────────────────┘
                          ⬇️
┌─────────────────────────────────────────────────────┐
│ 💾 Data Layer (UnifiedTelemetryMiddlewareService)   │
│    ✅ Database operation telemetry                  │
│    ✅ Constructor injection pattern                 │
└─────────────────────────────────────────────────────┘
```

## 🐳 Infrastructure Requirements

### **Start Infrastructure:**
```bash
# เริ่ม telemetry infrastructure
docker-compose up -d

# ตรวจสอบ status
docker-compose ps

# ดู logs
docker-compose logs otel-collector
```

### **Infrastructure Endpoints:**
- **OTEL Collector**: `http://localhost:4318` (HTTP) หรือ `localhost:4317` (gRPC)
- **Jaeger UI**: `http://localhost:16686`
- **Prometheus**: `http://localhost:9090`
- **Grafana**: `http://localhost:3001`

## 🚀 Getting Started

### **1. Install Dependencies:**
```bash
cd examples
npm install
```

### **2. Start Infrastructure:**
```bash
# Start telemetry stack
docker-compose up -d

# Wait for services to be ready (~30 seconds)
sleep 30
```

### **3. Run Example:**
```bash
# Start the application
npx ts-node fastify-hybrid-telemetry.ts

# หรือใช้ environment variables
SERVICE_NAME=my-service \
SERVICE_VERSION=2.0.0 \
NODE_ENV=production \
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318 \
npx ts-node fastify-hybrid-telemetry.ts
```

### **4. Test APIs:**
```bash
# Get all users
curl http://localhost:3000/api/users

# Create new user
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com"}'

# Check telemetry info
curl http://localhost:3000/api/telemetry/info

# Health checks
curl http://localhost:3000/health
curl http://localhost:3000/ready
```

## 📊 Monitoring & Observability

### **Traces (Jaeger):**
1. เปิด Jaeger UI: `http://localhost:16686`
2. เลือก Service: `fastify-hybrid-telemetry`
3. คลิก "Find Traces"
4. ดู trace details และ span hierarchy

### **Metrics (Prometheus):**
1. เปิด Prometheus: `http://localhost:9090`
2. Query metrics: `http_requests_total`, `process_cpu_usage`
3. ดู targets status ใน Status → Targets

### **Dashboards (Grafana):**
1. เปิด Grafana: `http://localhost:3001`
2. Login: admin/admin
3. Import dashboards หรือสร้างใหม่

## 🔧 Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `NODE_ENV` | `development` | Environment |
| `SERVICE_NAME` | `fastify-hybrid-telemetry` | Service name |
| `SERVICE_VERSION` | `1.0.0` | Service version |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | `http://localhost:4318` | OTEL endpoint |
| `OTEL_EXPORTER_OTLP_PROTOCOL` | `http/protobuf` | OTEL protocol |

## 🎯 Key Features

### **✅ Production-Ready:**
- Real OTEL Provider connection
- Proper error handling
- Graceful shutdown
- Resource tracking
- System metrics

### **✅ Clean Architecture:**
- Constructor dependency injection
- Clean layer separation
- Framework independence
- Consistent telemetry pattern

### **✅ Full Observability:**
- Distributed tracing
- Structured logging
- Custom metrics
- Health checks

## 🧪 Integration Testing

Example นี้เป็น integration test ที่:
- ✅ ต่อกับ real telemetry infrastructure
- ✅ ทดสอบ end-to-end telemetry flow
- ✅ ส่งข้อมูลไปที่ Jaeger, Prometheus จริง
- ✅ พร้อมใช้ใน production environment

## 🛠️ Troubleshooting

### **Connection Issues:**
```bash
# ตรวจสอบ OTEL Collector
curl http://localhost:4318/v1/traces

# ตรวจสอบ services
docker-compose ps

# Restart infrastructure
docker-compose down && docker-compose up -d
```

### **No Traces in Jaeger:**
1. รอ 30-60 วินาที (batch export delay)
2. ตรวจสอบ OTEL Collector logs
3. ตรวจสอบ service configuration

### **No Metrics in Prometheus:**
1. ตรวจสอบ `/metrics` endpoint
2. ตรวจสอบ Prometheus targets
3. ตรวจสอบ scrape configuration

---

🎯 **Perfect hybrid telemetry architecture with real infrastructure integration!**
