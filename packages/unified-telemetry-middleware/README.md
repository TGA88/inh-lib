# @inh-lib/unified-telemetry-middleware

> Unified telemetry middleware for HTTP frameworks - seamless observability integration

A powerful TypeScript middleware library that provides automated telemetry collection for HTTP applications. Integrates seamlessly with `@inh-lib/unified-route` and `@inh-lib/unified-telemetry-otel` to provide comprehensive observability with minimal configuration.

## ✨ Features

- **🔌 Plug & Play** - Zero-configuration telemetry for HTTP applications
- **📊 Full Observability** - Automatic logging, tracing, and metrics collection
- **🎯 Route-Aware** - Intelligent telemetry based on route patterns
- **🔗 Trace Propagation** - W3C and B3 header support for distributed tracing
- **📈 HTTP Metrics** - Request duration, status codes, and throughput metrics
- **🖥️ System Monitoring** - CPU and memory usage tracking
- **🔍 Request Correlation** - Automatic request ID and correlation ID generation
- **⚡ Performance Focused** - Minimal overhead with smart resource cleanup
- **🎛️ Highly Configurable** - Enable/disable features as needed

## 📦 Installation

```bash
npm install @inh-lib/unified-telemetry-middleware
```

## 🚀 Quick Start

### Basic Setup with Unified Route

```typescript
import { 
  UnifiedHttpContext, 
  UnifiedMiddleware, 
  composeMiddleware 
} from '@inh-lib/unified-route';
import { OpenTelemetryProvider } from '@inh-lib/unified-telemetry-otel';
import { TelemetryMiddlewareService } from '@inh-lib/unified-telemetry-middleware';

// Create telemetry provider
const telemetryProvider = new OpenTelemetryProvider({
  serviceName: 'my-api',
  serviceVersion: '1.0.0',
  environment: 'production'
});

// Create telemetry middleware service
const telemetryService = new TelemetryMiddlewareService(telemetryProvider, {
  serviceName: 'my-api',
  serviceVersion: '1.0.0',
  enableMetrics: true,
  enableTracing: true,
  enableResourceTracking: true
});

// Define middlewares and route handler
const middlewares = [
  telemetryService.createMiddleware() // Telemetry is automatically collected
];

const routeHandler = async (context: UnifiedHttpContext) => {
  // Your route logic here
  // Telemetry data is already available in context
  context.response.json({ message: 'Hello World!' });
};

// Compose middleware with handler
const composedHandler = composeMiddleware(middlewares)(routeHandler);

// Use with your HTTP framework (Express, Fastify, etc.)
// See integration examples below
```

### Advanced Configuration

```typescript
const telemetryService = new TelemetryMiddlewareService(telemetryProvider, {
  serviceName: 'my-api',
  serviceVersion: '1.0.0',
  
  // Feature toggles
  enableMetrics: true,
  enableTracing: true,
  enableResourceTracking: true,
  enableTraceExtraction: true,
  enableCorrelationId: true,
  enableSystemMetrics: true,
  
  // System metrics configuration
  systemMetricsInterval: 30000, // 30 seconds
  
  // Performance optimization
  enableRegistryCleanup: true,
  
  // Custom attributes for all spans
  customAttributes: {
    'service.team': 'backend',
    'service.domain': 'user-management'
  }
});
```

## 📊 What Gets Collected

### Automatic HTTP Telemetry

**Logging:**
- Request start/end with timing
- HTTP method, URL, and route patterns
- Request/correlation IDs for tracing
- Error logging with stack traces

**Tracing:**
- HTTP spans with proper parent-child relationships
- Trace propagation via W3C and B3 headers
- Automatic span status based on HTTP status codes
- Custom attributes and events

**Metrics:**
- `http_requests_total` - Total HTTP requests by method and status
- `http_request_duration_ms` - Request duration histogram
- `http_requests_active` - Currently active requests gauge

### System Metrics (Optional)

- `system_cpu_usage_percent` - CPU usage percentage
- `system_memory_usage_bytes` - Memory usage in bytes
- `system_memory_usage_percent` - Memory usage percentage

## � API Reference

### TelemetryMiddlewareService Methods

#### Core Middleware
- `createMiddleware()`: Creates main HTTP telemetry middleware
- `createSystemTelemetry(serviceName)`: Creates independent system telemetry

#### Business Logic Methods
- `createChildSpan(context, operationName, options?)`: Creates child span for manual telemetry
- `createBusinessLogicMiddleware(operationName, options?)`: Creates middleware for business operations
- `createValidationMiddleware(validationName, options?)`: Creates middleware for validation steps
- `getCurrentSpan(context)`: Gets current span from request context
- `getCurrentLogger(context)`: Gets current logger from request context

#### Utility Methods
- `getTraceHeaders(context)`: Gets trace headers for outgoing requests
- `recordCustomMetrics(...)`: Manually record custom metrics
- `shutdown()`: Gracefully shutdown telemetry service

### Business Logic Options

```typescript
interface BusinessLogicOptions {
  /** Operation type (default: 'business') */
  operationType?: 'business' | 'validation' | 'database' | 'integration' | 'auth' | 'custom';
  
  /** Layer identifier (default: 'service') */
  layer?: 'presentation' | 'service' | 'data' | 'integration' | 'core' | 'custom';
  
  /** Log operation start (default: true) */
  logStart?: boolean;
  
  /** Log operation end (default: true) */  
  logEnd?: boolean;
  
  /** Custom attributes for span */
  attributes?: Record<string, string | number | boolean>;
}

interface ValidationOptions {
  /** Layer identifier (default: 'service') */
  layer?: string;
  
  /** Log validation details (default: true) */
  logValidationDetails?: boolean;
  
  /** Custom attributes for span */
  attributes?: Record<string, string | number | boolean>;
}
```

```typescript
interface TelemetryMiddlewareConfig {
  /** Service name for telemetry */
  serviceName: string;
  
  /** Service version for telemetry */
  serviceVersion?: string;
  
  /** Enable metrics collection (default: true) */
  enableMetrics?: boolean;
  
  /** Enable distributed tracing (default: true) */
  enableTracing?: boolean;
  
  /** Enable resource tracking (CPU/Memory) (default: false) */
  enableResourceTracking?: boolean;
  
  /** Enable trace extraction from headers (default: true) */
  enableTraceExtraction?: boolean;
  
  /** Enable correlation ID generation (default: true) */
  enableCorrelationId?: boolean;
  
  /** Enable system metrics monitoring (default: false) */
  enableSystemMetrics?: boolean;
  
  /** System metrics update interval in milliseconds (default: 60000) */
  systemMetricsInterval?: number;
  
  /** Enable cleanup of registry after request (default: true) */
  enableRegistryCleanup?: boolean;
  
  /** Custom attributes to add to all spans */
  customAttributes?: Record<string, string | number | boolean>;
}
```

## 🎛️ Constants and Headers

### Telemetry Headers

```typescript
import { TELEMETRY_HEADERS } from '@inh-lib/unified-telemetry-middleware';

// W3C Trace Context
TELEMETRY_HEADERS.W3C_TRACEPARENT    // 'traceparent'
TELEMETRY_HEADERS.W3C_TRACESTATE     // 'tracestate'

// B3 Headers
TELEMETRY_HEADERS.B3_TRACE_ID        // 'x-b3-traceid'
TELEMETRY_HEADERS.B3_SPAN_ID         // 'x-b3-spanid'
TELEMETRY_HEADERS.B3_SAMPLED         // 'x-b3-sampled'

// Custom Headers
TELEMETRY_HEADERS.REQUEST_ID         // 'x-request-id'
TELEMETRY_HEADERS.CORRELATION_ID     // 'x-correlation-id'
```

### Operation Types and Layers

```typescript
import { 
  TELEMETRY_LAYERS,
  TELEMETRY_OPERATION_TYPES,
  TELEMETRY_SPAN_KINDS 
} from '@inh-lib/unified-telemetry-middleware';

// Telemetry layers
TELEMETRY_LAYERS.HTTP         // 'http'
TELEMETRY_LAYERS.SERVICE      // 'service'
TELEMETRY_LAYERS.DATA         // 'data'

// Operation types
TELEMETRY_OPERATION_TYPES.HTTP         // 'http'
TELEMETRY_OPERATION_TYPES.BUSINESS     // 'business'
TELEMETRY_OPERATION_TYPES.DATABASE     // 'database'

// Span kinds
TELEMETRY_SPAN_KINDS.SERVER     // 'server'
TELEMETRY_SPAN_KINDS.CLIENT     // 'client'
TELEMETRY_SPAN_KINDS.INTERNAL   // 'internal'
```

## 🔍 Trace Propagation

The middleware automatically handles trace propagation:

### Incoming Requests
- Extracts trace context from W3C `traceparent` and `tracestate` headers
- Falls back to B3 headers if W3C headers are not present
- Generates new trace context if no headers are found

### Outgoing Requests
- Automatically injects trace context into outgoing HTTP calls
- Supports both W3C and B3 propagation formats
- Maintains parent-child span relationships

## 📈 Performance Considerations

### Resource Management
- Automatic cleanup of telemetry data after request completion
- Configurable registry cleanup to prevent memory leaks
- Minimal overhead for disabled features

### System Metrics
- System metrics collection runs on a separate interval
- Can be disabled for minimal resource usage
- Efficient resource tracking with native Node.js APIs

## 🔧 Advanced Usage

### Business Logic Steps with Child Spans

For complex business operations with multiple validation and processing steps, you can create child spans for each step to get detailed distributed tracing:

```typescript
import { 
  UnifiedHttpContext, 
  composeMiddleware 
} from '@inh-lib/unified-route';

// Create business logic middlewares
const inputValidation = telemetryService.createValidationMiddleware('input-validation', {
  layer: 'service',
  attributes: { 'validation.step': '1' }
});

const userLookup = telemetryService.createBusinessLogicMiddleware('user-lookup', {
  operationType: 'business',
  layer: 'service',
  attributes: { 'business.step': '1' }
});

const permissionCheck = telemetryService.createValidationMiddleware('permission-check', {
  layer: 'service', 
  attributes: { 'validation.step': '2' }
});

const dataUpdate = telemetryService.createBusinessLogicMiddleware('data-update', {
  operationType: 'business',
  layer: 'data',
  attributes: { 'business.step': '2' }
});

// Define complete middleware chain
const updateUserMiddlewares = [
  telemetryService.createMiddleware(), // Main telemetry (first)
  inputValidation,                     // Child span: validation:input-validation
  userLookup,                         // Child span: user-lookup
  permissionCheck,                    // Child span: validation:permission-check  
  dataUpdate,                         // Child span: data-update
];

const updateUserHandler = async (context: UnifiedHttpContext) => {
  // Final endpoint handler
  context.response.json({ success: true });
};

// Compose the complete handler
const composedHandler = composeMiddleware(updateUserMiddlewares)(updateUserHandler);

// Use with Express, Fastify, or other frameworks
```

### Manual Child Span Creation

For fine-grained control, create child spans manually within your middleware:

**⚠️ Important Note**: `createBusinessLogicMiddleware()` only creates telemetry wrapper - it doesn't contain your business logic!

```typescript
// ❌ This ONLY creates telemetry wrapper (no business logic)
const telemetryWrapper = telemetryService.createBusinessLogicMiddleware('user-lookup', {
  operationType: 'business',
  layer: 'service'
});

// ✅ You need to write your actual business logic separately
const actualBusinessLogic = async (context: UnifiedHttpContext, next: () => Promise<void>) => {
  try {
    const userId = context.request.params.id;
    
    // 🔥 Your actual business logic here
    const user = await userRepository.findById(userId);
    
    if (!user) {
      context.response.status(404).json({ error: 'User not found' });
      return;
    }
    
    context.registry.user = user;
    await next();
    
  } catch (error) {
    context.response.status(500).json({ error: 'Internal server error' });
  }
};

// Use both: telemetry wrapper + business logic
const middlewares = [
  telemetryService.createMiddleware(),
  telemetryWrapper,      // ✅ Creates child span + logging
  actualBusinessLogic,   // ✅ Your business logic
];

// ✅ Alternative: Write business logic with telemetry yourself
const businessLogicWithTelemetry = async (context: UnifiedHttpContext, next: () => Promise<void>) => {
  const { span, logger, finish } = telemetryService.createChildSpan(context, 'user-lookup-complete', {
    operationType: 'business',
    layer: 'service',
    attributes: {
      'business.operation': 'user_lookup',
      'user.id': context.request.params.id
    }
  });

  try {
    const userId = context.request.params.id;
    logger.info('Starting user lookup', { userId });
    
    // Your business logic with detailed telemetry
    const user = await userRepository.findByIdWithContext(context, userId);
    
    if (!user) {
      logger.warn('User not found', { userId });
      span.setTag('user.found', false);
      context.response.status(404).json({ error: 'User not found' });
      return;
    }
    
    span.setTag('user.found', true);
    span.setTag('user.email', user.email);
    logger.info('User found successfully', { userId, userEmail: user.email });
    
    context.registry.user = user;
    await next();
    
  } catch (error) {
    logger.error('User lookup failed', error);
    span.recordException(error);
    context.response.status(500).json({ error: 'Internal server error' });
  } finally {
    finish(); // Always finish the span
  }
};
```

### Trace Structure Example

With business logic steps, your traces will have a hierarchical structure:

**Approach 1: Using createBusinessLogicMiddleware + separate business logic**
```
Root Span: HTTP PUT /users/:id
├── Child Span: user-lookup (from createBusinessLogicMiddleware - telemetry only)
├── Child Span: actual-user-lookup (from your business logic middleware) 
│   └── Child Span: db-user-select-by-id (from repository)
└── Response completion
```

**Approach 2: Business logic with manual telemetry**
```
Root Span: HTTP PUT /users/:id
├── Child Span: user-lookup-complete (business logic + telemetry combined)
│   ├── Child Span: cache-get (cache check)
│   └── Child Span: db-user-select-by-id (database query)
└── Response completion
```

### Which Approach to Choose?

#### ✅ Use `createBusinessLogicMiddleware` + `getCurrentLogger/getCurrentSpan` when:
- You want consistent telemetry patterns across all business operations
- You prefer **separation between telemetry and business logic**
- You want **automatic error handling and span management**
- You need **better performance** (no child span overhead)
- You have many middleware that need similar telemetry wrapping
- You want **safer code** (no risk of forgotten finish() calls)
- **RECOMMENDED for most use cases** 🎯

#### ✅ Use manual `createChildSpan` when:
- You need **fine-grained control** over telemetry data and span lifecycle
- You want to add **dynamic attributes based on business logic results**
- You prefer **fewer middleware layers** but more complex individual middleware
- You want **custom error handling and logging** for specific operations
- You need **isolated error contexts** for different business operations
- You're building **complex hierarchical traces** with multiple nested operations

## Helper Methods for Business Logic

The `TelemetryMiddlewareService` provides convenient helper methods to access current telemetry context:

### 🔍 **getCurrentSpan(context)**
```typescript
const span = telemetryService.getCurrentSpan(context);
if (span) {
  span.setTag('business.operation', 'user-validation');
  span.setTag('validation.result', 'success');
}
```

### 📝 **getCurrentLogger(context)**  
```typescript
const logger = telemetryService.getCurrentLogger(context);
if (logger) {
  logger.info('Business operation started');
  logger.warn('Validation failed', { field: 'email' });
}
```

### 🎯 **createChildSpan(context, name, options)**
```typescript
const { span, logger, finish } = telemetryService.createChildSpan(
  context, 
  'complex-operation',
  { 
    operationType: 'business',
    layer: 'service'
  }
);

try {
  // Complex business logic here
  span.setTag('operation.complexity', 'high');
  logger.info('Complex operation completed');
} finally {
  finish(); // Important: Always call finish()
}
```

### 💡 **Usage Patterns:**

#### Pattern 1: Simple Business Logic (Recommended)
```typescript
async (context, next) => {
  const logger = telemetryService.getCurrentLogger(context);
  const span = telemetryService.getCurrentSpan(context);
  
  // Simple business logic with existing telemetry context
  logger?.info('Processing request');
  span?.setTag('request.type', 'user-lookup');
  
  const result = await someBusinessLogic();
  await next();
}
```

#### Pattern 2: Complex Business Logic 
```typescript
async (context, next) => {
  const { span, logger, finish } = telemetryService.createChildSpan(
    context, 'complex-processing', { operationType: 'business' }
  );
  
  try {
    // Complex business logic that needs its own span
    for (const step of complexSteps) {
      logger.info(`Processing step: ${step.name}`);
      await processStep(step);
      span.setTag(`step.${step.name}.completed`, true);
    }
  } finally {
    finish();
  }
  
  await next();
}
```

---
```typescript
import { createUnifiedApp } from '@inh-lib/unified-route';

const app = createUnifiedApp();

// Apply telemetry middleware early in the chain
app.use(telemetryService.createMiddleware());

// Other middleware will have access to telemetry context
app.use(async (context, next) => {
  // Access telemetry data if needed
  const telemetryData = context.state.telemetry;
  await next();
});

app.get('/health', async (context) => {
  context.json({ status: 'ok' });
});
```

## 🎯 Integration with HTTP Frameworks

### Express.js Integration

```typescript
import express from 'express';
import { 
  UnifiedHttpContext,
  UnifiedRequestContext,
  UnifiedResponseContext,
  composeMiddleware 
} from '@inh-lib/unified-route';
import { TelemetryMiddlewareService } from '@inh-lib/unified-telemetry-middleware';

const app = express();
app.use(express.json());

// Create telemetry provider
const telemetryProvider = new OpenTelemetryProvider({
  serviceName: 'my-api',
  serviceVersion: '1.0.0',
  environment: 'production'
});

// Create telemetry middleware service
const telemetryService = new TelemetryMiddlewareService(telemetryProvider, {
  serviceName: 'my-api',
  serviceVersion: '1.0.0',
  enableMetrics: true,
  enableTracing: true,
  enableResourceTracking: true
});

// Create Express adapter for unified context
function createExpressContext(req: express.Request, res: express.Response): UnifiedHttpContext {
  const request: UnifiedRequestContext = {
    body: req.body || {},
    params: req.params || {},
    query: req.query as Record<string, string | string[]>,
    headers: req.headers as Record<string, string>,
    method: req.method,
    url: req.url,
    ip: req.ip || req.connection.remoteAddress || '127.0.0.1',
    userAgent: req.get('User-Agent'),
  };

  const response: UnifiedResponseContext = {
    status: (code: number) => {
      res.status(code);
      return response;
    },
    json: <T>(data: T) => res.json(data),
    send: (data: string) => res.send(data),
    header: (name: string, value: string) => {
      res.set(name, value);
      return response;
    },
    redirect: (url: string) => res.redirect(url),
  };

  return { request, response, registry: {} };
}

// Define middleware chain with telemetry
const updateUserMiddlewares = [
  telemetryService.createMiddleware(),
  telemetryService.createValidationMiddleware('input-validation'),
  telemetryService.createBusinessLogicMiddleware('user-update'),
];

const updateUserHandler = async (context: UnifiedHttpContext) => {
  const logger = telemetryService.getCurrentLogger(context);
  logger?.info('User update completed');
  
  context.response.json({ 
    message: 'User updated successfully',
    userId: context.request.params.id 
  });
};

const composedHandler = composeMiddleware(updateUserMiddlewares)(updateUserHandler);

// Apply to Express route
app.put('/users/:id', async (req, res) => {
  const context = createExpressContext(req, res);
  await composedHandler(context);
});

app.listen(3000);
```

### Fastify Integration

```typescript
import Fastify, { FastifyRequest, FastifyReply } from 'fastify';
import { 
  UnifiedHttpContext,
  UnifiedRequestContext,
  UnifiedResponseContext,
  composeMiddleware 
} from '@inh-lib/unified-route';
import { TelemetryMiddlewareService } from '@inh-lib/unified-telemetry-middleware';

const fastify = Fastify({ logger: true });

// Create telemetry provider
const telemetryProvider = new OpenTelemetryProvider({
  serviceName: 'my-api',
  serviceVersion: '1.0.0',
  environment: 'production'
});

// Create telemetry middleware service
const telemetryService = new TelemetryMiddlewareService(telemetryProvider, {
  serviceName: 'my-api',
  serviceVersion: '1.0.0',
  enableMetrics: true,
  enableTracing: true,
  enableResourceTracking: true
});

// Create Fastify adapter for unified context
function createFastifyContext(request: FastifyRequest, reply: FastifyReply): UnifiedHttpContext {
  const unifiedRequest: UnifiedRequestContext = {
    body: request.body as Record<string, unknown> || {},
    params: request.params as Record<string, string> || {},
    query: request.query as Record<string, string | string[]> || {},
    headers: request.headers as Record<string, string>,
    method: request.method,
    url: request.url,
    ip: request.ip,
    userAgent: request.headers['user-agent'],
  };

  const unifiedResponse: UnifiedResponseContext = {
    status: (code: number) => {
      reply.code(code);
      return unifiedResponse;
    },
    json: <T>(data: T) => reply.send(data),
    send: (data: string) => reply.send(data),
    header: (name: string, value: string) => {
      reply.header(name, value);
      return unifiedResponse;
    },
    redirect: (url: string) => reply.redirect(url),
  };

  return { request: unifiedRequest, response: unifiedResponse, registry: {} };
}

// Business logic middleware chain
const getUserMiddlewares = [
  telemetryService.createMiddleware(),
  telemetryService.createBusinessLogicMiddleware('user-lookup', {
    operationType: 'business',
    layer: 'service'
  }),
];

const getUserHandler = async (context: UnifiedHttpContext) => {
  // Simulate user lookup
  const userId = context.request.params.id;
  const user = { id: userId, name: 'John Doe', email: 'john@example.com' };
  
  context.response.json({ user });
};

const composedGetUserHandler = composeMiddleware(getUserMiddlewares)(getUserHandler);

// Register Fastify route
fastify.get('/users/:id', async (request, reply) => {
  const context = createFastifyContext(request, reply);
  await composedGetUserHandler(context);
});

await fastify.listen({ port: 3000 });
```

### Required Dependencies
- `@inh-lib/unified-route` - HTTP routing framework
- `@inh-lib/unified-telemetry-core` - Core telemetry abstractions

### Recommended Providers
- `@inh-lib/unified-telemetry-otel` - OpenTelemetry implementation for production
- `@inh-lib/unified-telemetry` - Console implementation for development

## 🔍 Troubleshooting

### Common Issues

**Missing Telemetry Data:**
- Ensure the middleware is applied before route handlers
- Check that telemetry provider is properly initialized
- Verify configuration options are correct

**Performance Issues:**
- Disable system metrics in high-load scenarios
- Enable registry cleanup
- Consider sampling for high-traffic applications

**Memory Leaks:**
- Ensure `enableRegistryCleanup` is set to `true`
- Stop system telemetry on application shutdown
- Monitor memory usage with system metrics

## 📚 Related Packages

- [`@inh-lib/unified-route`](../unified-route/README.md) - HTTP routing framework
- [`@inh-lib/unified-telemetry-core`](../unified-telemetry-core/README.md) - Core telemetry abstractions
- [`@inh-lib/unified-telemetry-otel`](../unified-telemetry-otel/README.md) - OpenTelemetry provider
- [`@inh-lib/unified-telemetry`](../unified-telemetry/README.md) - Console telemetry provider

## 📄 License

MIT License - see the [LICENSE](../../LICENSE) file for details.

## 🤝 Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.
