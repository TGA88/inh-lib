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

#### ✅ Use `createBusinessLogicMiddleware` when:
- You want consistent telemetry patterns across all business operations
- You prefer separation between telemetry and business logic
- You have many middleware that need similar telemetry wrapping
- You want automatic error handling and logging

#### ✅ Use manual `createChildSpan` when:
- You need fine-grained control over telemetry data
- You want to add dynamic attributes based on business logic results
- You prefer fewer middleware layers
- You want custom error handling and logging

#### 📋 Example Comparison:

```typescript
// Approach 1: Separate telemetry wrapper + business logic
const approach1 = [
  telemetryService.createMiddleware(),
  telemetryService.createBusinessLogicMiddleware('user-operation'), // Telemetry wrapper
  async (context, next) => {
    // Your business logic here
    const user = await userService.getUser(context.request.params.id);
    context.registry.user = user;
    await next();
  }
];

// Approach 2: Combined business logic + telemetry
const approach2 = [
  telemetryService.createMiddleware(),
  async (context, next) => {
    const { span, logger, finish } = telemetryService.createChildSpan(
      context, 'user-operation-complete', { operationType: 'business' }
    );
    
    try {
      // Business logic with detailed telemetry
      const user = await userService.getUserWithTelemetry(context, context.request.params.id);
      span.setTag('user.found', !!user);
      context.registry.user = user;
      await next();
    } finally {
      finish();
    }
  }
];
```

### Custom System Telemetry

```typescript
// Create independent system telemetry
const systemTelemetry = telemetryService.createSystemTelemetry('my-service');

// Start system metrics collection
systemTelemetry.start();

// Stop when shutting down
process.on('SIGTERM', () => {
  systemTelemetry.stop();
});
```

## 🎯 Business Logic Integration Benefits

### Why Use Child Spans for Business Steps?

1. **📊 Detailed Performance Analysis**
   - See exactly which business step is slow
   - Identify bottlenecks in complex operations
   - Monitor individual validation/processing times

2. **🔍 Granular Error Tracking**
   - Know exactly where failures occur in your business flow
   - Separate validation errors from business logic errors
   - Better error attribution and debugging

3. **📈 Business Metrics**
   - Track success/failure rates per business step
   - Monitor validation pass/fail rates
   - Measure business operation performance

4. **🎛️ Flexible Observability**
   - Enable/disable telemetry for specific steps
   - Add custom attributes per business operation
   - Different logging levels for different layers

5. **🗄️ Database Performance Tracking**
   - Monitor individual SQL query performance
   - Track database connection health
   - Identify slow queries and N+1 problems
   - Cache hit/miss ratios and performance

6. **🔄 Cache Layer Monitoring**
   - Track cache hit/miss rates
   - Monitor cache operation latency
   - Identify cache eviction patterns
   - Debug cache-related performance issues

### Best Practices for Business Logic Telemetry

```typescript
// ✅ Good: Separate concerns with different operation types
const validation = telemetryService.createValidationMiddleware('user-input', {
  operationType: 'validation',  // Clear operation type
  layer: 'service',            // Appropriate layer
  attributes: { 
    'validation.type': 'input',
    'validation.required_fields': ['email', 'name']
  }
});

const business = telemetryService.createBusinessLogicMiddleware('user-creation', {
  operationType: 'business',   // Business logic type
  layer: 'service',           // Service layer
  attributes: {
    'business.domain': 'user-management',
    'business.operation': 'create'
  }
});

// ✅ Good: Use descriptive operation names
telemetryService.createChildSpan(context, 'validate-email-uniqueness', {
  operationType: 'validation',
  attributes: { 'validation.scope': 'uniqueness' }
});

// ❌ Avoid: Generic or unclear names
telemetryService.createChildSpan(context, 'step1', {
  // Too generic, hard to understand in traces
});

// ✅ Good: Database operations with detailed attributes
const { span, logger, finish } = telemetryService.createChildSpan(context, 'db-user-select-by-email', {
  operationType: 'database',
  layer: 'data',
  attributes: {
    'db.operation': 'select',
    'db.table': 'users',
    'db.query_type': 'select_by_email',
    'user.email': email
  }
});

// ✅ Good: Cache operations with performance tracking
const { span, logger, finish } = telemetryService.createChildSpan(context, 'cache-user-lookup', {
  operationType: 'cache',
  layer: 'data',
  attributes: {
    'cache.operation': 'get',
    'cache.key': cacheKey,
    'cache.type': 'redis'
  }
});

// ❌ Avoid: Missing context passing to repository
async getUserById(id: string) {
  // Can't create child spans without context
  return await this.database.query('...');
}

// ✅ Good: Context-aware repository methods
async getUserByIdWithContext(context: UnifiedHttpContext, id: string) {
  const { span, logger, finish } = this.telemetryService.createChildSpan(context, 'db-operation');
  try {
    return await this.database.query('...');
  } finally {
    finish();
  }
}
```

### Layer-Based Organization

Organize your business logic spans by layers for better trace analysis:

```typescript
// Presentation Layer - Input validation
const inputValidation = telemetryService.createValidationMiddleware('request-validation', {
  layer: 'presentation',
  operationType: 'validation'
});

// Service Layer - Business logic
const businessLogic = telemetryService.createBusinessLogicMiddleware('business-rules', {
  layer: 'service', 
  operationType: 'business'
});

// Data Layer - Database operations  
const dataAccess = telemetryService.createBusinessLogicMiddleware('data-persistence', {
  layer: 'data',
  operationType: 'database'
});

// Integration Layer - External API calls
const externalIntegration = telemetryService.createBusinessLogicMiddleware('external-service-call', {
  layer: 'integration',
  operationType: 'integration'
});
```

### Repository Pattern with Child Spans

For database operations, create child spans in your repository methods to track individual queries:

```typescript
class UserRepository {
  constructor(private telemetryService: TelemetryMiddlewareService) {}

  async findById(context: UnifiedHttpContext, id: string): Promise<User | null> {
    // Create child span for specific database operation
    const { span, logger, finish } = this.telemetryService.createChildSpan(
      context, 
      'db-user-select-by-id', 
      {
        operationType: 'database',
        layer: 'data',
        attributes: {
          'db.operation': 'select',
          'db.table': 'users',
          'user.id': id
        }
      }
    );

    try {
      logger.info('Executing user lookup query', { userId: id });
      
      // Add database-specific attributes
      span.setTag('db.statement', 'SELECT * FROM users WHERE id = ?');
      
      const startTime = Date.now();
      const user = await this.dbConnection.query('SELECT * FROM users WHERE id = ?', [id]);
      const duration = Date.now() - startTime;
      
      // Add performance metrics
      span.setTag('db.query_duration_ms', duration);
      span.setTag('db.rows_affected', user ? 1 : 0);
      
      return user;
      
    } catch (error) {
      logger.error('Database query failed', error);
      throw error;
    } finally {
      finish(); // Always finish the span
    }
  }
}

// Service layer using repository
class UserService {
  async getUser(context: UnifiedHttpContext, id: string): Promise<User | null> {
    const { span, logger, finish } = this.telemetryService.createChildSpan(
      context,
      'service-get-user',
      {
        operationType: 'business',
        layer: 'service'
      }
    );

    try {
      // This will create child spans for cache and database operations
      let user = await this.cacheService.get(context, `user:${id}`);
      
      if (!user) {
        user = await this.userRepository.findById(context, id); // Child span created here
        if (user) {
          await this.cacheService.set(context, `user:${id}`, user); // Another child span
        }
      }

      return user;
    } finally {
      finish();
    }
  }
}
```

This creates a hierarchical trace structure:
```
Root Span: HTTP GET /users/:id
├── Child Span: service-get-user
│   ├── Child Span: cache-get
│   ├── Child Span: db-user-select-by-id
│   └── Child Span: cache-set
└── Response completion
```

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

const app = express();
app.use(express.json());

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

const fastify = Fastify({ logger: true });

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
