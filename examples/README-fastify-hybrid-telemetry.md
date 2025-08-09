# Fastify Hybrid Telemetry Example

ตัวอย่างการใช้งาน **Hybrid Telemetry Architecture** โดยใช้:

- **TelemetryPluginService** สำหรับ Fastify hooks (auto-tracing)
- **UnifiedTelemetryMiddlewareService** สำหรับ business logic
- **createFastifyContext** สำหรับแปลง req/res เป็น UnifiedHttpContext

## 🎯 Architecture

```
Fastify Request/Response Framework
├── TelemetryPluginService (Fastify hooks)
│   ├── onRequest → Auto-create request span
│   ├── onResponse → Auto-finish span + metrics
│   ├── onError → Auto-record exceptions
│   └── System metrics collection
│
└── Endpoint Handlers
    ├── createFastifyContext() → Convert req/res to UnifiedHttpContext
    └── UnifiedTelemetryMiddlewareService → Business logic telemetry
        ├── createChildSpan() → Service operations
        ├── createMiddleware() → Composed operations
        └── Structured logging with trace context
```

## 🌟 Benefits

| Component | Purpose | Features |
|-----------|---------|----------|
| **TelemetryPluginService** | HTTP layer telemetry | ✅ Auto-tracing<br/>✅ System metrics<br/>✅ Error handling |
| **UnifiedTelemetryMiddlewareService** | Business logic telemetry | ✅ Service operations<br/>✅ Validation spans<br/>✅ Database operations |
| **createFastifyContext** | Framework adapter | ✅ Type-safe conversion<br/>✅ Unified context<br/>✅ Registry support |

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd examples
npm install
```

### 2. Run the Example

```bash
# Start the hybrid telemetry server
npx tsx fastify-hybrid-telemetry-example.ts

# Or with custom port
PORT=3001 npx tsx fastify-hybrid-telemetry-example.ts
```

### 3. Test the API

```bash
# Check architecture
curl http://localhost:3000/api/architecture/status | jq .

# Test user operations
curl http://localhost:3000/api/users | jq .
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com"}' | jq .
```

## 📊 Code Examples

### Fastify Hooks (Auto-Tracing)

```typescript
// TelemetryPluginService automatically handles:
await app.register(TelemetryPluginService.createPlugin({
  telemetryProvider: provider,
  autoTracing: true,        // ✅ onRequest/onResponse/onError hooks
  enableSystemMetrics: true // ✅ System metrics collection
}));

// This creates spans automatically for ALL requests:
// - HTTP GET /api/users → auto span
// - HTTP POST /api/users → auto span  
// - Includes: method, path, status_code, duration, errors
```

### Endpoint Handler (UnifiedHttpContext)

```typescript
app.get('/api/users', async (request, reply) => {
  // 1. Convert Fastify req/res to UnifiedHttpContext
  const context = createFastifyContext(request, reply);
  
  // 2. Use UnifiedTelemetryMiddlewareService
  const result = await telemetryMiddleware.createMiddleware()(
    context,
    async (ctx) => {
      // 3. Business logic with telemetry
      const users = await userService.findAll(ctx);
      return { users };
    }
  );
  
  return { success: true, data: result.users };
});
```

### Service Layer (Business Logic Telemetry)

```typescript
class UserService {
  constructor(telemetryProvider: UnifiedTelemetryProvider) {
    this.telemetryMiddleware = new TelemetryMiddlewareService(telemetryProvider, {
      serviceName: 'user-service',
      enableTracing: true,
      enableMetrics: true
    });
  }

  async findById(context: UnifiedHttpContext, id: string): Promise<User | null> {
    // Create child span for database operation
    const { span, logger, finish } = this.telemetryMiddleware.createChildSpan(
      context,
      'user.findById',
      {
        operationType: 'database',
        layer: 'service',
        attributes: {
          'db.operation': 'select',
          'db.table': 'users',
          'user.id': id
        }
      }
    );

    try {
      logger.info('Finding user by ID', { userId: id });
      
      // Your business logic here
      const user = await this.database.findById(id);
      
      span.setTag('user.found', !!user);
      return user;
    } catch (error) {
      span.recordException(error);
      logger.error('Failed to find user', error);
      throw error;
    } finally {
      finish(); // Always finish the span
    }
  }
}
```

### Validation with Telemetry

```typescript
async validateUser(context: UnifiedHttpContext, userData: CreateUserRequest) {
  const { span, logger, finish } = this.telemetryMiddleware.createChildSpan(
    context,
    'user.validate',
    {
      operationType: 'validation',
      layer: 'service',
      attributes: { 'validation.fields': ['name', 'email'] }
    }
  );

  try {
    const errors: string[] = [];
    
    if (!userData.name) errors.push('Name is required');
    if (!userData.email) errors.push('Email is required');
    
    const valid = errors.length === 0;
    
    span.setTag('validation.success', valid);
    span.setTag('validation.errors_count', errors.length);
    
    return { valid, errors };
  } finally {
    finish();
  }
}
```

## 🛠️ API Endpoints

| Method | Endpoint | Description | Telemetry |
|--------|----------|-------------|-----------|
| GET | `/health` | Health check | ❌ Skipped |
| GET | `/ready` | Readiness check | ❌ Skipped |
| GET | `/api/architecture/status` | Architecture info | ✅ Auto-traced |
| GET | `/api/users` | Get all users | ✅ Auto + Business |
| GET | `/api/users/:id` | Get user by ID | ✅ Auto + Business |
| POST | `/api/users` | Create user | ✅ Auto + Business + Validation |
| PUT | `/api/users/:id` | Update user | ✅ Auto + Business |
| DELETE | `/api/users/:id` | Delete user | ✅ Auto + Business |

## 📈 Telemetry Spans Generated

### Auto-Tracing (TelemetryPluginService)
```
HTTP GET /api/users
├── Duration: 45ms
├── Status: 200
├── Headers: x-request-id
└── Resource metrics
```

### Business Logic (UnifiedTelemetryMiddlewareService)
```
HTTP GET /api/users
└── endpoint.getAllUsers (child)
    └── user.findAll (child)
        ├── Duration: 20ms
        ├── db.rows_returned: 2
        └── operation.success: true
```

### Validation Example
```
HTTP POST /api/users
└── endpoint.createUser (child)
    ├── user.validate (child)
    │   ├── validation.success: true
    │   └── validation.fields: ["name", "email"]
    └── user.create (child)
        ├── db.rows_affected: 1
        └── user.id: "abc123"
```

## 🔧 Configuration

### Environment Variables

```bash
PORT=3000                                    # Server port
NODE_ENV=development                         # Environment
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317  # OTLP endpoint
```

### TelemetryPluginService Config

```typescript
await app.register(TelemetryPluginService.createPlugin({
  telemetryProvider: provider,
  autoTracing: true,                        // Enable Fastify hooks
  serviceName: 'fastify-hybrid-telemetry',  // Service name
  enableResourceTracking: true,             // Resource usage metrics
  enableSystemMetrics: true,                // System metrics collection
  systemMetricsInterval: 30000,             // Metrics interval
  skipRoutes: ['/health', '/ready']         // Skip telemetry for these
}));
```

### UnifiedTelemetryMiddlewareService Config

```typescript
const telemetryMiddleware = new TelemetryMiddlewareService(provider, {
  serviceName: 'user-service',
  enableTracing: true,                      // Enable span creation
  enableMetrics: true,                      // Enable metrics collection
  enableResourceTracking: true             // Track resource usage
});
```

## 🆚 เปรียบเทียบกับแนวทางอื่น

| Feature | Hybrid Approach | Plugin Only | Middleware Only |
|---------|----------------|-------------|-----------------|
| HTTP Auto-tracing | ✅ TelemetryPluginService | ✅ Built-in | ❌ Manual setup |
| Business Logic | ✅ UnifiedTelemetryMiddleware | ⚠️ Instance methods | ✅ Native |
| Framework Coupling | ⚠️ Fastify adapter needed | ✅ Native Fastify | ❌ Framework agnostic |
| Setup Complexity | ⚠️ Medium | ✅ Simple | ⚠️ Complex |
| Flexibility | ✅ Best of both | ⚠️ Limited | ✅ High |
| Type Safety | ✅ Full TypeScript | ✅ Good | ✅ Excellent |

## 💡 Use Cases

### เหมาะสำหรับ:
- ✅ Fastify applications ที่ต้องการ auto-tracing
- ✅ มี business logic ที่ซับซ้อน
- ✅ ต้องการ flexibility ในการจัดการ telemetry
- ✅ ต้องการใช้ unified patterns ใน service layer
- ✅ มี validation, database operations หลายชั้น

### ไม่เหมาะสำหรับ:
- ❌ Simple applications ที่ไม่ต้องการ business logic telemetry
- ❌ Framework-agnostic applications
- ❌ Applications ที่ต้องการ minimal dependencies

## 🎉 Summary

Hybrid approach นี้ให้:

1. **Best of Both Worlds**: Auto-tracing + Business logic telemetry
2. **Fastify as Request/Response Framework**: เก็บ Fastify เป็นแค่ transport layer
3. **Unified Business Logic**: ใช้ UnifiedTelemetryMiddlewareService สำหรับ service operations  
4. **Type Safety**: ใช้ createFastifyContext แปลงเป็น UnifiedHttpContext
5. **Production Ready**: Error handling, graceful shutdown, comprehensive telemetry

Perfect สำหรับ Fastify applications ที่ต้องการ **comprehensive telemetry** แต่ยังคง **flexibility** ใน business logic! 🚀
