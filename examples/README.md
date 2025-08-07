# Fastify with Unified Telemetry Examples

📁 Working Directory

**All commands in this README should be run from the `examples/` directory:**

```bash
# Navigate to examples directory first
cd examples/

# Then run any npm commands
npm install
npm run build
npm run dev
# etc...
```

**Directory Structure:**
```
inh-lib/                          # Monorepo root
├── packages/                     # Source packages
├── dist/packages/                # Built packages (after build)
└── examples/                     # 👈 Run commands from here
    ├── package.json              # Contains all scripts
    ├── Dockerfile.app            # Docker configuration
    ├── docker-compose.telemetry.yml
    ├── *.ts                      # Source files
    └── dist/                     # Compiled JS files
```

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

### Prerequisites
1. **Node.js** 18+ และ **npm**
2. **Docker** และ **Docker Compose** (สำหรับ telemetry stack)

### Installation Steps

```bash
# 1. Navigate to examples directory
cd examples/

# 2. Install dependencies
npm install

# 3. Build TypeScript files
npm run build

# 4. (Optional) Build packages if needed
npm run build:packages
```

**Important:** ⚠️ **คำสั่งทั้งหมดต้องรันจาก `examples/` directory**

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

**Run from `examples/` directory:**

### 🚀 Start Commands

```bash
# Start infrastructure only (Prometheus, Grafana, Tempo, Loki, OTLP Collector)
npm run telemetry:infra
# → รัน telemetry infrastructure และรอให้พร้อมใช้งาน

# Start application only (assumes infrastructure is ready)
npm run telemetry:app
# → build และรัน unified app (port 3001)

# Start full stack (infrastructure + app with proper waiting)
npm run telemetry:start
# → รัน infrastructure ก่อน รอให้พร้อม แล้วรัน app
```

### 🛑 Stop Commands

```bash
# Stop everything (infrastructure + applications)
npm run telemetry:stop
# → หยุดทุกอย่าง (apps + infra)

# Stop infrastructure only (keep apps running)
npm run telemetry:stop:infra
# → หยุด telemetry infrastructure แต่เก็บ apps ไว้

# Stop applications only (keep infrastructure running)
npm run telemetry:stop:app
# → หยุด apps แต่เก็บ infrastructure ไว้

# Clean up everything (stop + remove volumes)
npm run telemetry:clean
# → หยุดทุกอย่างและลบ data volumes (Prometheus, Grafana data)
```

### 🔍 Monitoring Commands

```bash
# View logs of all services
npm run telemetry:logs
# → แสดง logs จาก docker-compose services

# Troubleshoot service issues
npm run telemetry:troubleshoot
# → ตรวจสอบ service status และ configuration issues
```

### Docker App Commands

**Run from `examples/` directory:**

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

**Alternative: Run Docker commands directly from monorepo root:**

```bash
# From inh-lib/ (monorepo root)
docker build -t fastify-telemetry-app -f examples/Dockerfile.app .
docker run -p 3001:3001 -p 9464:9464 fastify-telemetry-app
```

### Docker Compose App Services

**Run from `examples/` directory:**

```bash
# รัน unified mode (default - port 3001) - Main App
docker-compose -f docker-compose.telemetry.yml up
# → รัน app-unified service (unified packages with optimized Prometheus metrics)

# รัน enhanced mode (port 3002) - Advanced Features
docker-compose -f docker-compose.telemetry.yml --profile enhanced up
# → รัน app-server service (enhanced mode with custom OtelConfig)

# รัน simple mode (port 3003) - Testing
docker-compose -f docker-compose.telemetry.yml --profile simple up
# → รัน app-simple service (simple example)

# รันหลาย modes พร้อมกัน
docker-compose -f docker-compose.telemetry.yml --profile enhanced --profile simple up
# → รัน app-unified + app-server + app-simple พร้อมกัน
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
CUSTOM_OTEL_CONFIG_ENABLED=false   # Main app: Basic telemetry for Prometheus (false)
                                   # Enhanced app: Custom OtelConfig (true)

# OpenTelemetry Configuration
OTEL_SERVICE_NAME=fastify-unified-example     # Main app service name
OTEL_SERVICE_VERSION=1.0.0                   # Service version  
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318  # OTLP collector endpoint
PROMETHEUS_METRICS_PORT=9464                # Prometheus metrics port
OTEL_ENABLE_PROMETHEUS=true                 # Enable Prometheus endpoint

# Telemetry Modes (Enhanced App)
OTEL_ENABLE_DUAL_MODE=false                 # Enable dual mode (OTLP + Prometheus)
OTEL_ENABLE_OTLP_METRICS=false             # Send metrics to OTLP
OTEL_DEBUG=false                           # Enable debug logging

# Docker App Mode
APP_MODE=unified                           # App mode: unified|enhanced|simple
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

### 1. Main Application (Unified + Prometheus)
```bash
# Clone และ navigate to examples directory
cd examples/

# Install dependencies
npm install

# รัน main app พร้อม optimized telemetry
npm run dev

# หรือรันด้วย Docker (unified mode - default)
docker-compose -f docker-compose.telemetry.yml up

# เข้าถึง application
open http://localhost:3001

# ดู metrics ที่ optimize สำหรับ Prometheus
open http://localhost:9464/metrics
```

### 2. Full Telemetry Stack
```bash
# Make sure you're in examples/ directory
cd examples/

# เริ่ม telemetry stack (จะรัน unified app โดยอัตโนมัติ)
npm run telemetry:start

# เข้าไปดู Grafana dashboard
open http://localhost:3000  # admin/admin

# ดู Prometheus targets
open http://localhost:9090  # เช็คว่า unified app metrics ถูก scrape หรือไม่
```

### 3. Advanced Features Testing
```bash
# From examples/ directory
cd examples/

# รัน enhanced app สำหรับ testing advanced telemetry
docker-compose -f docker-compose.telemetry.yml --profile enhanced up

# หรือรันด้วย npm (enhanced mode)
npm run dev:telemetry

# เข้าถึง enhanced app
open http://localhost:3002
open http://localhost:9465/metrics  # Advanced telemetry metrics
```

## Monitoring & Observability

### Application Endpoints (Docker Compose Services)
- **Unified App** (app-unified): http://localhost:3001 - **Main Application**
- **Enhanced App** (app-server): http://localhost:3002 (with `--profile enhanced`) 
- **Simple App** (app-simple): http://localhost:3003 (with `--profile simple`)

### Health Check Endpoints
- **Unified App**: http://localhost:3001/health - **Main Application**
- **Enhanced App**: http://localhost:3002/health  
- **Simple App**: http://localhost:3003/health

### Metrics Endpoints
- **Unified App Metrics**: http://localhost:9464/metrics - **Optimized for Prometheus**
- **Enhanced App Metrics**: http://localhost:9465/metrics - **Advanced OtelConfig**
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

## 📚 Documentation Quick Links

- **[DOCKER_SYMLINKS.md](./DOCKER_SYMLINKS.md)** - Technical guide to Docker symlinks for monorepo packages
- **[DOCKER_TELEMETRY.md](./DOCKER_TELEMETRY.md)** - Complete observability stack setup and usage

## Table of Contents

- [� Working Directory](#-working-directory)
- [�📚 Documentation Quick Links](#-documentation-quick-links)
- [ตัวอย่างที่มี](#ตัวอย่างที่มี)
- [การติดตั้ง](#การติดตั้ง)
- [การรัน](#การรัน)
  - [ตัวอย่างแบบง่าย](#ตัวอย่างแบบง่าย-simplified-fastify-examplets)
  - [Enhanced Mode](#enhanced-mode-telemetry-enhanced-appts)
  - [Unified Packages Mode](#unified-packages-mode-fastify-with-telemetry-examplets)
  - [Telemetry Stack](#telemetry-stack-docker-services)
- [Docker Commands](#docker-app-commands)
- [Docker Architecture & Symlinks](#-docker-architecture--symlinks)
- [API Endpoints](#api-endpoints)
- [Architecture Highlights](#architecture-highlights)
- [Environment Variables](#environment-variables)
- [Monitoring & Observability](#-monitoring--observability)
- [Troubleshooting](#-troubleshooting)

## แอปพลิเคชันแต่ละตัว

### 1. **fastify-with-telemetry-example.ts** 🚀 (Main App)
- ใช้ **unified packages** (@inh-lib) ทั้งหมด
- **Basic telemetry configuration** เพื่อ optimize สำหรับ Prometheus
- Framework-agnostic architecture
- Type-safe middleware และ route handlers
- เหมาะสำหรับ **production deployment**

### 2. **telemetry-enhanced-app.ts** 🔧 (Enhanced Features)
- **OpenTelemetry เต็มรูปแบบ** พร้อม custom OtelConfig
- รองรับ dual mode support และ advanced features
- Configuration ผ่าน environment variables
- เหมาะสำหรับ **testing advanced telemetry capabilities**

### 3. **simplified-fastify-example.ts** 🎯 (Testing)
- ตัวอย่าง**แบบง่าย** สำหรับการเรียนรู้
- Mock telemetry สำหรับการทดสอบ
- ไม่ต้องพึ่งพา external packages
- เหมาะสำหรับ **rapid prototyping**

## Docker Compose Services Summary

### Application Services

| Service | Container | App Port | Metrics Port (Host→Container) | Profile | App File | Telemetry Mode |
|---------|-----------|----------|-------------------------------|---------|----------|---------------|
| `app-unified` | `fastify-unified-app` | 3001 | 9464→9464 | **default** | `fastify-with-telemetry-example.js` | Basic (optimized for Prometheus) |
| `app-server` | `fastify-telemetry-app` | 3002 | 9465→9464 | `enhanced` | `telemetry-enhanced-app.js` | Custom OtelConfig |
| `app-simple` | `fastify-simple-app` | 3003 | - | `simple` | `simplified-fastify-example.js` | Mock/Basic |

### Key Features by Service

#### 🚀 app-unified (Main - Default)
- **Port**: 3001
- **Features**: 
  - ✅ Unified packages (@inh-lib) integration
  - ✅ Basic telemetry (CUSTOM_OTEL_CONFIG_ENABLED=false)
  - ✅ Optimized Prometheus metrics export
  - ✅ Auto-instrumentation enabled
  - 📊 Best for production Prometheus monitoring

#### 🔧 app-server (Enhanced - Profile)
- **Port**: 3002  
- **Features**:
  - ✅ Custom OtelConfig (CUSTOM_OTEL_CONFIG_ENABLED=true)
  - ✅ Advanced OpenTelemetry features
  - ✅ Dual-mode telemetry support
  - 🧪 Best for testing advanced telemetry features

#### 🎯 app-simple (Testing - Profile)
- **Port**: 3003
- **Features**:
  - ✅ Minimal dependencies
  - ✅ Mock telemetry for testing
  - ✅ No external telemetry services required
  - 🏃‍♂️ Best for rapid prototyping

### Usage Examples

```bash
# รัน unified mode only (default - Main App)
docker-compose -f docker-compose.telemetry.yml up

# รัน enhanced mode only (Advanced Features)
docker-compose -f docker-compose.telemetry.yml --profile enhanced up

# รัน simple mode only (Testing)
docker-compose -f docker-compose.telemetry.yml --profile simple up

# รันทุก modes พร้อมกัน
docker-compose -f docker-compose.telemetry.yml --profile enhanced --profile simple up
```

### Access URLs (เมื่อรันทุก services)

```bash
# Applications
curl http://localhost:3001/health  # Unified app (Main - Default)
curl http://localhost:3002/health  # Enhanced app (Advanced)
curl http://localhost:3003/health  # Simple app (Testing)

# Metrics
curl http://localhost:9464/metrics  # Unified app metrics (optimized for Prometheus)
curl http://localhost:9465/metrics  # Enhanced app metrics (custom OtelConfig)
# Note: Simple app ไม่มี metrics endpoint (ใช้ mock telemetry)

# Telemetry Stack
open http://localhost:3000          # Grafana (admin/admin)
open http://localhost:9090          # Prometheus
```

## 🆕 Configuration Highlights

### Default Setup (Recommended)
- **Main App**: `app-unified` (port 3001)
- **Telemetry**: Basic configuration with `CUSTOM_OTEL_CONFIG_ENABLED=false`
- **Metrics**: Optimized for Prometheus scraping
- **Best for**: Production deployment และ Prometheus monitoring

### Advanced Setup (Testing)
- **Enhanced App**: `app-server` (port 3002, profile `enhanced`)
- **Telemetry**: Custom OtelConfig with `CUSTOM_OTEL_CONFIG_ENABLED=true`
- **Features**: Dual-mode, advanced tracing, custom exporters
- **Best for**: Testing advanced telemetry features

### Simple Setup (Development)
- **Simple App**: `app-simple` (port 3003, profile `simple`)
- **Telemetry**: Mock/basic สำหรับการทดสอบ
- **Best for**: Rapid prototyping ไม่ต้องการ external services

---

## 🎯 Summary

This examples project demonstrates:

### ✅ **Three Application Modes**
- **Enhanced Mode** (`telemetry-enhanced-app.ts`) - Full OpenTelemetry with custom configuration
- **Unified Mode** (`fastify-with-telemetry-example.ts`) - Using @inh-lib unified packages  
- **Simple Mode** (`simplified-fastify-example.ts`) - Basic setup with mock telemetry

### ✅ **Docker Support**
- **Multi-stage builds** for optimized production images
- **Symlink system** for monorepo package resolution  
- **Complete observability stack** with Docker Compose

### ✅ **Type Safety**
- **No `any` types** - fully typed implementations
- **Generic interfaces** for flexible telemetry providers
- **Comprehensive error handling** with proper typing

### ✅ **Production Ready**
- **Health checks** and monitoring endpoints
- **Graceful shutdown** handling
- **Security best practices** (non-root user, dumb-init)
- **Performance optimizations** (efficient symlinks, cached builds)

### 📋 Recommended Workflows

#### 🎯 **Development Workflow (Separate Infrastructure & App)**
```bash
# 1. Start infrastructure first
npm run telemetry:infra

# 2. Develop your app locally (outside Docker)
npm run dev

# 3. Stop app when done (keep infrastructure running)
# Ctrl+C to stop local app

# 4. Stop infrastructure when finished
npm run telemetry:stop:infra
```

#### 🚀 **Full Stack Testing (All in Docker)**
```bash
# Start everything together
npm run telemetry:start

# Test endpoints
curl http://localhost:3001/health
curl http://localhost:3001/api/users

# Stop everything
npm run telemetry:stop
```

#### 🔄 **Quick App Restart (Keep Infrastructure)**
```bash
# Infrastructure already running from previous session
npm run telemetry:app        # Start app

# Make changes and restart app
npm run telemetry:stop:app   # Stop app only
npm run telemetry:app        # Start app again

# Infrastructure stays running
```
