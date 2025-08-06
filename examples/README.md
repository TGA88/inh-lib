# Fastify with Unified Telemetry Examples

ตัวอย่างการใช้งาน Fastify ร่วมกับ Unified Telemetry และ Unified Route โดยไม่ใช้ `type any`

## ตัวอย่างที่มี

1. **telemetry-enhanced-app.ts** - ตัวอย่างเต็มรูปแบบ OpenTelemetry พร้อม dual mode support
2. **fastify-with-telemetry-example.ts** - ตัวอย่างใช้ unified packages ทั้งหมด
3. **simplified-fastify-example.ts** - ตัวอย่างแบบง่าย ใช้ mock telemetry สำหรับการทดสอบ

## การรัน

### ตัวอย่างแบบง่าย (simplified-fastify-example.ts)

```bash
# รันแบบมี telemetry mock
npm run simple
# → รัน simplified-fastify-example.ts

# รันแบบไม่มี telemetry
npm run simple:no-telemetry
# → รัน simplified-fastify-example.ts โดยไม่เปิด telemetry
```

### ตัวอย่างเต็มรูปแบบ OpenTelemetry (telemetry-enhanced-app.ts)

```bash
# รันแบบมี telemetry จริง (Prometheus only - default)
npm run dev:telemetry
# → รัน telemetry-enhanced-app.ts

# รัน dual mode (OTLP + Prometheus)
npm run dev:dual
# → รัน telemetry-enhanced-app.ts พร้อม dual mode

# รัน OTLP metrics only  
npm run dev:otlp-only
# → รัน telemetry-enhanced-app.ts แบบ OTLP เท่านั้น

# รัน Prometheus metrics only
npm run dev:prometheus-only
# → รัน telemetry-enhanced-app.ts แบบ Prometheus เท่านั้น
```

### ตัวอย่างใช้ Unified Packages (fastify-with-telemetry-example.ts)

```bash
# รันแบบมี unified packages
npm run dev
# → รัน fastify-with-telemetry-example.ts

# รันแบบไม่มี telemetry
npm run dev:no-telemetry
# → รัน fastify-with-telemetry-example.ts โดยไม่เปิด telemetry
```

## ฟีเจอร์หลัก

- ✅ **Type Safety**: ใช้ TypeScript อย่างเต็มรูปแบบ ไม่มี `type any`
- 🔍 **Telemetry**: Distributed tracing, metrics, และ logging ด้วย OpenTelemetry
- 🚀 **Fastify Integration**: ใช้ `@inh-lib/api-util-fastify` adapter
- 📊 **Unified Middleware**: ใช้ `UnifiedMiddleware` และ `UnifiedRouteHandler`
- 🏗️ **Hierarchical Spans**: สร้าง child spans สำหรับ business logic
- 📝 **Structured Logging**: Logger ที่ผูกกับ span context
- 🛡️ **Error Handling**: จัดการ error และ exception tracking
- 🔄 **Dual Mode**: รองรับ OTLP + Prometheus metrics export พร้อมกัน
- 🐳 **Docker Support**: พร้อม telemetry stack สำหรับ local development

## การติดตั้ง

```bash
# ติดตั้ง dependencies
npm install

# Build TypeScript
npm run build
```

## การรัน

### OpenTelemetry Enhanced Mode (telemetry-enhanced-app.ts)
```bash
# รันแบบมี telemetry (Prometheus only - default)
npm run dev:telemetry
# → รัน telemetry-enhanced-app.ts

# รัน dual mode (OTLP + Prometheus)
npm run dev:dual
# → รัน telemetry-enhanced-app.ts พร้อม dual mode

# รัน OTLP metrics only
npm run dev:otlp-only
# → รัน telemetry-enhanced-app.ts แบบ OTLP เท่านั้น

# รัน Prometheus metrics only  
npm run dev:prometheus-only
# → รัน telemetry-enhanced-app.ts แบบ Prometheus เท่านั้น
```

### Unified Packages Mode (fastify-with-telemetry-example.ts)
```bash
# รันแบบมี unified packages
npm run dev
# → รัน fastify-with-telemetry-example.ts

# รันแบบไม่มี telemetry
npm run dev:no-telemetry
# → รัน fastify-with-telemetry-example.ts โดยไม่เปิด telemetry
```

### Simple Mode (simplified-fastify-example.ts)
```bash
# รันตัวอย่างแบบง่าย (ไม่ต้องพึ่งพา external packages)
npm run simple
# → รัน simplified-fastify-example.ts

# รันแบบง่ายโดยไม่มี telemetry
npm run simple:no-telemetry
# → รัน simplified-fastify-example.ts โดยไม่เปิด telemetry
```

### Testing & Production
```bash
# ทดสอบ API endpoints
npm run test:api

# รันเซิร์ฟเวอร์และทดสอบ API พร้อมกัน
npm run test:full

# รัน production build
npm start
# → รัน fastify-with-telemetry-example.js (compiled)
```

## Telemetry Stack (Docker Services)

```bash
# เริ่ม telemetry stack (Prometheus, Tempo, Loki, Grafana, OTLP Collector)
npm run telemetry:start
# → รัน docker-compose พร้อม build Docker app (default: enhanced mode)

# หยุด telemetry stack
npm run telemetry:stop
# → หยุด docker-compose services

# ดู logs ของ telemetry stack
npm run telemetry:logs
# → แสดง logs จาก docker-compose services
```

### Docker App Commands

```bash
# Build Docker image
npm run docker:build
# → build Docker image จาก Dockerfile.app

# รัน Docker app (enhanced mode)
npm run docker:run
# → docker run fastify-telemetry-app
# → รัน telemetry-enhanced-app.js ใน container

# รัน Docker app แบบ simple mode
npm run docker:run:simple
# → docker run -e APP_MODE=simple fastify-telemetry-app
# → รัน simplified-fastify-example.js ใน container
```

### Docker Compose App Services

```bash
# รัน enhanced mode (default - port 3001)
docker-compose -f docker-compose.telemetry.yml up
# → รัน app-server service (enhanced mode)

# รัน unified mode (port 3002)
docker-compose -f docker-compose.telemetry.yml --profile unified up
# → รัน app-unified service (unified packages)

# รัน simple mode (port 3003)
docker-compose -f docker-compose.telemetry.yml --profile simple up
# → รัน app-simple service (simple example)

# รันหลาย modes พร้อมกัน
docker-compose -f docker-compose.telemetry.yml --profile unified --profile simple up
# → รัน app-server + app-unified + app-simple พร้อมกัน
```

### Docker App Modes (ใน Container)

```bash
# Enhanced mode (default)
docker run -e APP_MODE=enhanced fastify-telemetry-app
# → รัน telemetry-enhanced-app.js

# Unified mode  
docker run -e APP_MODE=unified fastify-telemetry-app
# → รัน fastify-with-telemetry-example.js

# Simple mode
docker run -e APP_MODE=simple fastify-telemetry-app
# → รัน simplified-fastify-example.js
```

## API Endpoints

### Health Check
```http
GET /health
```

### Users API
```http
# Get all users
GET /api/users

# Get user by ID
GET /api/users/{id}

# Create user
POST /api/users
Content-Type: application/json
{
  "name": "John Doe",
  "email": "john@example.com"
}

# Update user
PUT /api/users/{id}
Content-Type: application/json
{
  "name": "Jane Doe",
  "email": "jane@example.com"
}

# Delete user
DELETE /api/users/{id}
```

## Architecture Highlights

### 1. Type Safety
```typescript
// ไม่ใช้ type any แต่ใช้ generic types
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Type-safe request/response
interface CreateUserRequest {
  name: string;
  email: string;
}
```

### 2. Unified Middleware Integration
```typescript
// แปลง UnifiedMiddleware เป็น Fastify middleware
this.fastify.get('/api/users', 
  this.adapter.convertHandler(this.getAllUsersHandler(), [
    this.adapter.createBusinessMiddleware('get-all-users'),
  ])
);
```

### 3. Hierarchical Telemetry
```typescript
// สร้าง child span สำหรับ business logic
const { span, logger: childLogger, finish } = this.telemetryService.createChildSpan(
  context, 
  'fetch-users-from-store',
  {
    operationType: 'database',
    layer: 'data',
  }
);

try {
  // business logic
  const users = await this.userStore.findAll(context); // ส่ง context ไปด้วย
  span.setTag('users.count', users.length);
  childLogger.info(\`Found \${users.length} users\`);
} finally {
  finish(); // สำคัญ: ต้อง finish span
}
```

### 4. Database Layer Telemetry
```typescript
// UserStore จะสร้าง span สำหรับ database operations
class UserStore {
  async findAll(context?: UnifiedHttpContext): Promise<User[]> {
    const span = this.createDatabaseSpan('user.findAll', context);
    
    try {
      span.logger.info('Fetching all users from database');
      const users = Array.from(this.users.values());
      
      span.span.setTag('users.count', users.length);
      span.logger.info('Successfully fetched all users', { count: users.length });
      
      return users;
    } finally {
      span.finish();
    }
  }
}
```

### 4. Error Handling with Telemetry
```typescript
try {
  // operation
} catch (error) {
  // Record ใน span และ log
  span.recordException(error);
  span.setStatus({ code: 'error', message: error.message });
  logger.error('Operation failed', error);
  throw error;
}
```

## Key Components

### FastifyTelemetryAdapter
- แปลง `UnifiedMiddleware` เป็น Fastify hooks
- แปลง `UnifiedRouteHandler` เป็น Fastify handlers
- สร้าง business และ validation middlewares

### TelemetryMiddlewareService
- จัดการ telemetry lifecycle
- สร้าง spans และ loggers
- เก็บ metrics และ performance data

### Unified Route Handlers
- ใช้ `UnifiedHttpContext` แทน Fastify request/reply
- Type-safe parameter และ response handling
- Integrated telemetry support

## Environment Variables

```bash
# Application
PORT=3001                           # Port to listen on (default: 3001)
ENABLE_TELEMETRY=true              # Enable/disable telemetry (default: true)

# OpenTelemetry Configuration
OTEL_SERVICE_NAME=fastify-telemetry-example  # Service name
OTEL_SERVICE_VERSION=1.0.0                   # Service version  
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318  # OTLP collector endpoint
PROMETHEUS_METRICS_PORT=9464                # Prometheus metrics port

# Telemetry Modes
OTEL_ENABLE_DUAL_MODE=false                 # Enable dual mode (OTLP + Prometheus)
OTEL_ENABLE_OTLP_METRICS=false             # Send metrics to OTLP
OTEL_ENABLE_PROMETHEUS=true                # Enable Prometheus endpoint
OTEL_DEBUG=false                           # Enable debug logging

# Docker App Mode
APP_MODE=enhanced                          # App mode: enhanced|unified|simple
```

## ข้อดีของการใช้ Architecture นี้

1. **Framework Agnostic**: สามารถเปลี่ยนจาก Fastify เป็น Express หรือ framework อื่นได้ง่าย
2. **Type Safety**: TypeScript เต็มรูปแบบ ไม่มี runtime type errors
3. **Observability**: มี tracing, metrics, และ logging ครบครัน
4. **Testability**: แยก business logic ออกจาก HTTP framework
5. **Maintainability**: Code structure ที่ชัดเจนและแยกหน้าที่กันดี
6. **Flexibility**: รองรับ multiple telemetry export modes
7. **Production Ready**: พร้อม Docker และ telemetry stack สำหรับ deployment

## ตัวอย่าง Telemetry Output

เมื่อรัน API จะเห็น telemetry data แบบนี้:

```
🔍 [trace-1234] HTTP GET /api/users started
🎯 [trace-1234:span-5678] get-all-users started (business/service)
ℹ️  [trace-1234:span-5678] get-all-users started
🎯 [trace-1234:span-9012] fetch-users-from-store started (database/data)
ℹ️  [trace-1234:span-9012] Fetching all users from store
🎯 [trace-1234:span-3456] db.user.findAll started (database/data)
ℹ️  [trace-1234:span-3456] Fetching all users from database
🏷️  [trace-1234:span-3456] Tag: users.count=2
🏷️  [trace-1234:span-3456] Tag: db.operation=user.findAll
ℹ️  [trace-1234:span-3456] Successfully fetched all users from database { count: 2 }
🏁 [trace-1234:span-3456] db.user.findAll finished in 5ms
🏷️  [trace-1234:span-9012] Tag: users.count=2
ℹ️  [trace-1234:span-9012] Found 2 users
🏁 [trace-1234:span-9012] fetch-users-from-store finished in 8ms
📊 [trace-1234:span-5678] Status: ok
ℹ️  [trace-1234:span-5678] get-all-users completed successfully
🏁 [trace-1234:span-5678] get-all-users finished in 12ms
✅ [trace-1234] HTTP request completed in 15ms
```

## Quick Start Guide

### 1. Basic Development
```bash
# Clone และ install
npm install

# รัน app พร้อม telemetry
npm run dev:telemetry

# เข้าไปดู metrics
open http://localhost:9464/metrics
```

### 2. Full Telemetry Stack
```bash
# เริ่ม telemetry stack
npm run telemetry:start

# รัน app พร้อม dual mode  
npm run dev:dual

# เข้าไปดู Grafana dashboard
open http://localhost:3000
```

### 3. Docker Deployment
```bash
# Build และรัน
npm run docker:build
npm run docker:run

# หรือใช้ docker-compose
docker-compose -f docker-compose.telemetry.yml up
```

## Metrics & Observability

### Application Endpoints (Docker Compose Services)
- **Enhanced App** (app-server): http://localhost:3001
- **Unified App** (app-unified): http://localhost:3002 (with `--profile unified`)
- **Simple App** (app-simple): http://localhost:3003 (with `--profile simple`)

### Health Check Endpoints
- **Enhanced App**: http://localhost:3001/health
- **Unified App**: http://localhost:3002/health  
- **Simple App**: http://localhost:3003/health

### Metrics Endpoints
- **Enhanced App Metrics**: http://localhost:9464/metrics
- **Unified App Metrics**: http://localhost:9465/metrics
- **Simple App**: No metrics endpoint (mock telemetry)

### Telemetry Stack
- **Grafana**: http://localhost:3000 (admin/admin)
- **Prometheus**: http://localhost:9090
- **Tempo**: http://localhost:3200
- **Loki**: http://localhost:3100
- **OTLP Collector**: http://localhost:4318

### Available Dashboards
- HTTP Request Metrics
- Database Operation Metrics  
- Custom Business Metrics
- System Resource Metrics
- Distributed Tracing

## Documentation

- **[TELEMETRY.md](./TELEMETRY.md)** - Complete telemetry stack setup และ configuration
- **[DUAL_MODE.md](./DUAL_MODE.md)** - Dual mode configuration (OTLP + Prometheus)
- **[OTEL_CONFIG_README.md](./OTEL_CONFIG_README.md)** - OpenTelemetry environment variables reference

## แอปพลิเคชันแต่ละตัว

### 1. **telemetry-enhanced-app.ts** 🚀
- **OpenTelemetry เต็มรูปแบบ** พร้อม dual mode support
- รองรับ OTLP + Prometheus metrics export
- Configuration ผ่าน environment variables
- เหมาะสำหรับ production deployment

### 2. **fastify-with-telemetry-example.ts** 🏗️
- ใช้ **unified packages** (@inh-lib) ทั้งหมด
- Framework-agnostic architecture
- Type-safe middleware และ route handlers
- เหมาะสำหรับ enterprise development

### 3. **simplified-fastify-example.ts** 🎯
- ตัวอย่าง**แบบง่าย** สำหรับการเรียนรู้
- Mock telemetry สำหรับการทดสอบ
- ไม่ต้องพึ่งพา external packages
- เหมาะสำหรับ rapid prototyping

## Docker Compose Services Summary

### Application Services

| Service | Container | Port | Metrics Port | Profile | App File |
|---------|-----------|------|--------------|---------|----------|
| `app-server` | `fastify-telemetry-app` | 3001 | 9464 | default | `telemetry-enhanced-app.js` |
| `app-unified` | `fastify-unified-app` | 3002 | 9465 | `unified` | `fastify-with-telemetry-example.js` |
| `app-simple` | `fastify-simple-app` | 3003 | - | `simple` | `simplified-fastify-example.js` |

### Usage Examples

```bash
# รัน enhanced mode only (default)
docker-compose -f docker-compose.telemetry.yml up

# รัน unified mode only
docker-compose -f docker-compose.telemetry.yml --profile unified up

# รัน simple mode only  
docker-compose -f docker-compose.telemetry.yml --profile simple up

# รันทุก modes พร้อมกัน
docker-compose -f docker-compose.telemetry.yml --profile unified --profile simple up
```

### Access URLs (เมื่อรันทุก services)

```bash
# Applications
curl http://localhost:3001/health  # Enhanced app
curl http://localhost:3002/health  # Unified app  
curl http://localhost:3003/health  # Simple app

# Metrics (เฉพาะ enhanced & unified)
curl http://localhost:9464/metrics  # Enhanced app metrics
curl http://localhost:9465/metrics  # Unified app metrics

# Telemetry Stack
open http://localhost:3000          # Grafana (admin/admin)
open http://localhost:9090          # Prometheus
```
