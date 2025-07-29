# @inh-lib/unified-telemetry-http

HTTP middleware and web framework telemetry integration for the Unified Telemetry system.

## 🎯 **Features**

- ✅ **HTTP Telemetry Middleware** - Automatic request/response telemetry
- ✅ **Context Propagation** - Trace context extraction and injection
- ✅ **Multiple Trace Formats** - W3C Trace Context, B3, Amazon X-Ray
- ✅ **Direct Provider Integration** - No service layer complexity
- ✅ **Type Safety** - Full TypeScript support, no `any` types
- ✅ **Clean Architecture** - Utils functions instead of private methods
- ✅ **Framework Agnostic** - Works with any HTTP framework using unified-route

## 📦 **Installation**

```bash
npm install @inh-lib/unified-telemetry-http @inh-lib/unified-telemetry-core @inh-lib/unified-route
```

## 🚀 **Quick Start**

### **Basic Usage**

```typescript
import { 
  createCombinedHttpTelemetryMiddleware,
  UnifiedHttpContextWithTelemetry 
} from '@inh-lib/unified-telemetry-http';
import { ConsoleUnifiedTelemetryProvider } from '@inh-lib/unified-telemetry-core';
import { composeMiddleware } from '@inh-lib/unified-route';

// 1. Create telemetry provider
const provider = new ConsoleUnifiedTelemetryProvider({
  serviceName: 'my-api',
  serviceVersion: '1.0.0',
  environment: 'development'
});

// 2. Create combined middleware (context propagation + HTTP telemetry)
const telemetryMiddlewares = createCombinedHttpTelemetryMiddleware(provider);

// 3. Setup middleware stack
const middlewareStack = composeMiddleware([
  ...telemetryMiddlewares,
  // ... other middlewares
]);

// 4. Use in your route handler
const handler = middlewareStack(async (context: UnifiedHttpContextWithTelemetry) => {
  // ✅ Telemetry context is available
  const { telemetry } = context;
  
  // Create logger for this operation
  const logger = telemetry.provider.logger.createChildLogger('create_user', {
    'trace.id': telemetry.traceId,
    'user.action': 'create'
  });
  
  // Create span for business logic
  const span = telemetry.provider.tracer.startSpan('user.create', {
    attributes: {
      'trace.id': telemetry.traceId,
      'operation': 'create_user'
    }
  });
  
  try {
    logger.info('Creating user');
    
    // Your business logic here
    const userData = context.request.body;
    const user = await createUser(telemetry.traceId, userData);
    
    // Record success metrics
    const counter = telemetry.provider.metrics.createCounter('users_created_total');
    counter.add(1, { method: context.request.method });
    
    logger.info('User created successfully', { userId: user.id });
    
    context.response.status(201).json({
      success: true,
      data: user,
      meta: { traceId: telemetry.traceId }
    });
    
  } catch (error) {
    logger.error('User creation failed', error as Error);
    span.recordException(error as Error);
    
    context.response.status(500).json({
      success: false,
      error: 'Internal server error',
      meta: { traceId: telemetry.traceId }
    });
  } finally {
    span.finish();
  }
});
```

### **Individual Middleware Setup**

```typescript
import { 
  createHttpTelemetryMiddleware,
  createContextPropagationMiddleware 
} from '@inh-lib/unified-telemetry-http';

// Context propagation middleware (first)
const contextMiddleware = createContextPropagationMiddleware(provider, {
  traceHeaders: ['x-trace-id', 'traceparent', 'x-request-id'],
  injectHeaders: ['x-trace-id'],
  generateTraceId: true
});

// HTTP telemetry middleware (second)  
const telemetryMiddleware = createHttpTelemetryMiddleware(provider, {
  createRootSpan: true,
  options: {
    captureHeaders: false,
    excludeUrls: [/\/health/, /\/metrics/]
  }
});

const middlewareStack = composeMiddleware([
  contextMiddleware.createMiddleware(),
  telemetryMiddleware.createMiddleware(),
]);
```

## 🔧 **Configuration**

### **HTTP Telemetry Options**

```typescript
interface HttpTelemetryOptions {
  captureHeaders?: boolean;        // Capture request headers
  captureRequestBody?: boolean;    // Capture request body (careful with sensitive data)
  captureResponseBody?: boolean;   // Capture response body (careful with sensitive data)
  excludeHeaders?: string[];       // Headers to exclude from telemetry
  excludeUrls?: RegExp[];         // URL patterns to exclude
  traceIdHeader?: string;         // Custom trace ID header
  generateTraceId?: boolean;      // Generate trace ID if not provided
}
```

### **Context Propagation Options**

```typescript
interface ContextPropagationMiddlewareConfig {
  traceHeaders?: string[];        // Headers to extract trace context from
  injectHeaders?: string[];       // Headers to inject trace context into
  generateTraceId?: boolean;      // Generate new trace ID if none found
  validateTraceId?: (traceId: string) => boolean; // Custom validation
}
```

## 🎯 **Advanced Usage**

### **Custom Span Naming**

```typescript
const telemetryMiddleware = createHttpTelemetryMiddleware(provider, {
  spanNameGenerator: (context) => {
    return `${context.request.method.toLowerCase()}.${getApiVersion(context)}`;
  }
});
```

### **Custom Attributes**

```typescript
const telemetryMiddleware = createHttpTelemetryMiddleware(provider, {
  attributesGenerator: (context) => ({
    'api.version': getApiVersion(context),
    'user.id': getUserId(context),
    'tenant.id': getTenantId(context),
  })
});
```

### **Service Layer Integration**

```typescript
// In your service layer
export class UserService {
  async createUser(traceId: string, userData: CreateUserData): Promise<User> {
    // Create service-layer logger
    const logger = this.provider.logger.createChildLogger('UserService.createUser', {
      'trace.id': traceId,
      'service.layer': 'business',
      'entity.type': 'User'
    });

    logger.info('Creating user in service layer');
    
    try {
      // Business logic with telemetry
      const user = await this.repository.create(traceId, userData);
      logger.info('User created successfully', { userId: user.id });
      return user;
    } catch (error) {
      logger.error('User creation failed in service layer', error as Error);
      throw error;
    }
  }
}
```

## 📊 **Telemetry Data**

### **Automatic Metrics**

The middleware automatically creates these metrics:

- `http_requests_total` - Total HTTP requests
- `http_responses_total` - Total HTTP responses  
- `http_request_duration_ms` - Request duration histogram
- `http_request_size_bytes` - Request size histogram
- `http_response_size_bytes` - Response size histogram
- `http_request_errors_total` - HTTP request errors

### **Automatic Spans**

- Root span for each HTTP request
- Automatic error recording
- Standard HTTP attributes (method, URL, status code, etc.)

### **Automatic Logs**

- Request start/completion logs
- Error logs with stack traces
- Correlation with trace/span IDs

## 🏗️ **Architecture**

### **No Service Layer Complexity**

```typescript
// ✅ Direct provider access - simple and clean
context.telemetry.provider.logger.createChildLogger('operation');
context.telemetry.provider.tracer.startSpan('operation');
context.telemetry.provider.metrics.createCounter('operation_count');

// ❌ No unnecessary service wrappers
// this.telemetryService.createLogger() // NOT needed!
```

### **Utils Functions Instead of Private Methods**

```typescript
// ✅ Reusable utils functions
import { extractTraceIdFromHeaders, createHttpSpan } from './utils';

// ❌ No private methods in classes
class MyClass {
  // private extractTraceId() {} // NOT allowed!
}
```

## 🧪 **Testing**

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## 🔍 **Debugging**

Enable debug logging to see telemetry operations:

```typescript
const provider = new ConsoleUnifiedTelemetryProvider({
  serviceName: 'my-api',
  logLevel: 'debug' // Enable debug logs
});
```

## 📄 **License**

MIT

## 🤝 **Contributing**

Please read our contributing guidelines and code of conduct.

## 📞 **Support**

- GitHub Issues: [Report bugs or request features](https://github.com/inh-lib/unified-telemetry-http/issues)
- Documentation: [Full API documentation](https://github.com/inh-lib/unified-telemetry-http/docs)