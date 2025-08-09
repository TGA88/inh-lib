# @inh-lib/api-util-fastify

> Comprehensive Fastify utilities collection - Everything you need for building robust Fastify applications

A complete toolkit of utilities, adapters, and helpers for Fastify applications. This package provides a unified set of tools to enhance your Fastify development experience with type safety, middleware composition, and production-ready patterns.

## ✨ Features

- 🚀 **Unified Route Adapter** - Seamlessly integrate with @inh-lib/unified-route pattern
- � **Telemetry Integration** - Complete observability with OpenTelemetry, distributed tracing, and metrics
- �🔒 **Type-Safe** - Full TypeScript support with comprehensive type definitions
- 📦 **Modular Design** - Use only what you need, tree-shakeable utilities
- 🎯 **Zero Dependencies** - Only peer dependencies on Fastify and related libraries
- 🔧 **Production Ready** - Battle-tested utilities for enterprise applications
- 📈 **Performance Focused** - Optimized for Fastify's high-performance architecture

## 📦 Installation

### Option 1: Fastify Plugin Approach (Recommended)

For pure Fastify applications using the plugin pattern:

```bash
npm install @inh-lib/api-util-fastify @inh-lib/unified-telemetry-core fastify
# or
yarn add @inh-lib/api-util-fastify @inh-lib/unified-telemetry-core fastify
# or
pnpm add @inh-lib/api-util-fastify @inh-lib/unified-telemetry-core fastify
```

### Option 2: UnifiedRoute Middleware Approach

For applications using the unified route pattern with middleware composition:

```bash
npm install @inh-lib/api-util-fastify @inh-lib/unified-route @inh-lib/unified-telemetry-middleware @inh-lib/unified-telemetry-core fastify
# or
yarn add @inh-lib/api-util-fastify @inh-lib/unified-route @inh-lib/unified-telemetry-middleware @inh-lib/unified-telemetry-core fastify
# or
pnpm add @inh-lib/api-util-fastify @inh-lib/unified-route @inh-lib/unified-telemetry-middleware @inh-lib/unified-telemetry-core fastify
```

### Peer Dependencies

This package has the following peer dependencies:
- `@inh-lib/unified-telemetry-core` - Core telemetry provider
- `@inh-lib/unified-route` - Unified route pattern (required for Option 2)
- `tslib` - TypeScript runtime library
- `fastify` - Web framework

> **Note**: With npm 7+, yarn 2+, or pnpm, peer dependencies are automatically installed. For earlier versions, install them manually.

## 🎯 Choose Your Approach

| Approach | Best For | Complexity | Dependencies |
|----------|----------|------------|--------------|
| **Option 1: Fastify Plugin** | Pure Fastify apps, simpler setup | Lower | Fewer packages |
| **Option 2: UnifiedRoute** | Multi-framework apps, middleware composition | Higher | More packages |

## 🛠️ Available Utilities

### 1. Unified Route Adapter

Adapter for integrating Fastify with the @inh-lib/unified-route pattern for consistent middleware composition.

```typescript
import { 
  createFastifyContext,
  adaptFastifyRequest,
  adaptFastifyResponse 
} from '@inh-lib/api-util-fastify';
```

**Features:**
- Convert Fastify req/res to unified context
- Type-safe request body handling
- Seamless middleware composition
- Registry pattern support

### 2. Telemetry Integration

Complete observability solution with distributed tracing, metrics, and logging for Fastify applications.

```typescript
// For Fastify plugin approach
import { 
  TelemetryPluginService,
  TELEMETRY_REGISTRY_KEYS,
  DEFAULT_TELEMETRY_PLUGIN_OPTIONS 
} from '@inh-lib/api-util-fastify';

// For UnifiedRoute middleware approach
import { TelemetryMiddlewareService } from '@inh-lib/unified-telemetry-middleware';
```

**Features:**
- OpenTelemetry integration with auto-instrumentation
- Distributed tracing with hierarchical spans
- Structured logging with trace context
- Performance metrics and system monitoring
- Framework-agnostic telemetry provider
- Production-ready observability stack

## 🚀 Quick Start

### Basic Setup with Unified Route Adapter

```typescript
import Fastify from 'fastify';
import { 
  createFastifyContext,
  adaptFastifyRequest,
  adaptFastifyResponse 
} from '@inh-lib/api-util-fastify';
import { 
  UnifiedMiddleware, 
  composeMiddleware,
  sendResponse,
  addRegistryItem,
  getRegistryItem 
} from '@inh-lib/unified-route';

const fastify = Fastify({ logger: true });

// Define unified middlewares
const loggingMiddleware: UnifiedMiddleware = async (context, next) => {
  console.log(`${context.request.method} ${context.request.url}`);
  await next();
};

const authMiddleware: UnifiedMiddleware = async (context, next) => {
  const token = context.request.headers.authorization;
  if (!token) {
    context.response.status(401).json({ error: 'Unauthorized' });
    return;
  }
  
  // Simulate authentication
  const user = { id: 1, name: 'John Doe', email: 'john@example.com' };
  addRegistryItem(context, 'user', user);
  await next();
};

// Route handler using unified context
const getUserHandler = async (context: UnifiedHttpContext) => {
  const user = getRegistryItem<User>(context, 'user');
  if (user instanceof Error) {
    return sendError(context, 'User not found', 404);
  }
  
  const userId = context.request.params.id;
  sendResponse(context, { 
    user: { ...user, requestedId: userId },
    timestamp: new Date().toISOString()
  });
};

// Compose middlewares
const middlewares = [loggingMiddleware, authMiddleware];
const composedHandler = composeMiddleware(middlewares)(getUserHandler);

// Register Fastify route with adapter
fastify.get<{ Params: { id: string } }>('/users/:id', async (request, reply) => {
  const context = createFastifyContext<{ userId?: string }>(request, reply);
  await composedHandler(context);
});

// Start server
const start = async () => {
  try {
    await fastify.listen({ port: 3000 });
    console.log('🚀 Server running on http://localhost:3000');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
```

### Telemetry Integration Setup

Enable comprehensive observability for your Fastify application with distributed tracing, metrics, and logging.

```typescript
import Fastify from 'fastify';
import { TelemetryPluginService } from '@inh-lib/api-util-fastify';
import { UnifiedTelemetryProvider } from '@inh-lib/unified-telemetry-core';
import { OpenTelemetryProvider } from '@inh-lib/unified-telemetry-otel';

// Initialize telemetry provider
const telemetryProvider: UnifiedTelemetryProvider = new OpenTelemetryProvider({
  serviceName: 'my-fastify-app',
  serviceVersion: '1.0.0',
  enableTracing: true,
  enableMetrics: true,
  enableLogging: true
});

// Create Fastify app
const fastify = Fastify({ logger: true });

// Register telemetry plugin
await fastify.register(TelemetryPluginService.createPlugin({
  telemetryProvider,
  autoTracing: true,
  serviceName: 'my-fastify-app',
  enableResourceTracking: true,
  enableSystemMetrics: true
}));

// Route with enhanced telemetry context
fastify.get('/api/users/:id', async (req, res) => {
  // Create enhanced context with telemetry
  const context = fastify.telemetry.createEnhancedContext(req, res);
  
  // Access telemetry from context
  const logger = context.telemetry.logger;
  const span = context.telemetry.span;
  
  // Business logic with automatic telemetry
  logger?.info('Fetching user', { userId: context.request.params.id });
  span?.setAttributes({ 'user.id': context.request.params.id });
  
  try {
    // Simulate business logic
    const user = await getUserById(context.request.params.id);
    
    if (user) {
      span?.setAttributes({ 'user.found': true });
      logger?.info('User found successfully', { user: user.name });
      res.send({ user });
    } else {
      span?.setAttributes({ 'user.found': false });
      logger?.warn('User not found');
      res.status(404).send({ error: 'User not found' });
    }
  } catch (error) {
    span?.recordException(error);
    logger?.error('Error fetching user', { error: error.message });
    res.status(500).send({ error: 'Internal server error' });
  }
});

// Start server with telemetry
fastify.listen({ port: 3000 }, (err) => {
  if (err) throw err;
  console.log('🚀 Server running with telemetry on http://localhost:3000');
});
```

#### 🔍 **Key Telemetry Features**

**Automatic Tracing:**
- HTTP request/response spans
- Database query tracing  
- External API call tracing
- Error tracking and monitoring

**Performance Metrics:**
- Request duration and throughput
- Memory usage and CPU utilization
- Custom business metrics
- System resource monitoring

**Structured Logging:**
- Trace context correlation
- Automatic log-to-span linking
- Configurable log levels
- JSON structured output

#### 🎯 **Advanced Telemetry with UnifiedRoute Pattern**

For applications using the unified route pattern with telemetry middleware:

```typescript
import { TelemetryMiddlewareService } from '@inh-lib/unified-telemetry-middleware';
import { composeMiddleware } from '@inh-lib/unified-route';
import { createFastifyContext } from '@inh-lib/api-util-fastify';

// Setup telemetry middleware service
const telemetryMiddleware = new TelemetryMiddlewareService(telemetryProvider, {
  serviceName: 'my-fastify-app',
  enableTracing: true,
  enableMetrics: true,
  enableResourceTracking: true
});

// Route with unified pattern
fastify.get('/api/complex-operation/:id', async (req, res) => {
  const context = createFastifyContext(req, res);
  
  // Create composed middleware with telemetry
  const composedHandler = composeMiddleware([
    // Main telemetry middleware (required first)
    telemetryMiddleware.createMiddleware(),
    
    // Business operation middleware with child span
    telemetryMiddleware.createBusinessLogicMiddleware('complex-business-operation', {
      operationType: 'business',
      layer: 'service',
      attributes: { 'operation.complexity': 'high' }
    }),
    
    // Main business logic
    async (context, next) => {
      // Manual child span for specific operation
      const { span, logger, finish } = telemetryMiddleware.createChildSpan(
        context, 
        'data-processing',
        { 
          operationType: 'business',
          layer: 'service',
          attributes: { 'process.type': 'data-transformation' }
        }
      );

      try {
        logger.info('Starting data processing');
        span.setTag('operation.step', 'data-processing');
        
        // Complex business logic
        const result = await processComplexOperation(context.request.params.id);
        
        span.setTag('result.count', result.length);
        logger.info('Data processing completed', { resultCount: result.length });
        
        context.response.json({ success: true, data: result });
        
      } catch (error) {
        span.recordException(error);
        logger.error('Data processing failed', error);
        throw error;
      } finally {
        finish(); // Always finish the span
      }
      
      await next();
    }
  ]);
  
  // Execute with telemetry
  await composedHandler(context);
});
```

#### 🎯 **Direct Fastify Usage (without UnifiedRoute)**

For Fastify-only applications using the plugin approach:

```typescript
// Register telemetry plugin
await fastify.register(TelemetryPluginService.createPlugin({
  telemetryProvider,
  autoTracing: true,
  serviceName: 'my-fastify-app'
}));

// Route with plugin-provided context
fastify.get('/api/users/:id', async (req, res) => {
  // Get enhanced context from plugin
  const context = fastify.telemetry.createEnhancedContext(req, res);
  
  // Access telemetry directly from enhanced context
  const span = context.telemetry.span;
  const logger = context.telemetry.logger;
  
  try {
    logger?.info('Fetching user', { userId: req.params.id });
    span?.setAttributes({ 'user.id': req.params.id });
    
    const user = await getUserById(req.params.id);
    
    if (user) {
      span?.setAttributes({ 'user.found': true });
      logger?.info('User found', { userName: user.name });
      res.send({ user });
    } else {
      span?.setAttributes({ 'user.found': false });
      logger?.warn('User not found');
      res.status(404).send({ error: 'User not found' });
    }
  } catch (error) {
    span?.recordException(error);
    logger?.error('Error fetching user', { error: error.message });
    res.status(500).send({ error: 'Internal server error' });
  }
});
  
  span.setTag('operation.result', 'success');
  logger.info('Complex operation completed successfully');
  
  return result;
} catch (error) {
  span.recordException(error);
  span.setStatus({ code: 'error', message: error.message });
  logger.error('Complex operation failed', error);
  throw error;
} finally {
  finish(); // Important: Always finish manual spans
}
```

## 📊 Telemetry API Reference

### TelemetryPluginService

Core service for Fastify telemetry integration.

#### Constructor
```typescript
new TelemetryPluginService(options: TelemetryPluginOptions)
```

**Options:**
```typescript
interface TelemetryPluginOptions {
  telemetryProvider: UnifiedTelemetryProvider;
  autoTracing?: boolean;              // Enable automatic HTTP tracing (default: true)
  serviceName?: string;               // Service name for telemetry (default: 'fastify-app')
  skipRoutes?: string[];              // Routes to skip telemetry (default: [])
  enableResourceTracking?: boolean;   // Enable resource usage tracking (default: false)
  enableSystemMetrics?: boolean;      // Enable system metrics collection (default: false)
  systemMetricsInterval?: number;     // System metrics collection interval in ms (default: 10000)
}
```

#### Methods

### TelemetryPluginService API Reference

#### Plugin Creation
```typescript
import { TelemetryPluginService } from '@inh-lib/api-util-fastify';

// Create telemetry plugin for Fastify
const plugin = TelemetryPluginService.createPlugin({
  telemetryProvider,
  autoTracing: true,
  serviceName: 'my-service',
  enableResourceTracking: true,
  enableSystemMetrics: true
});

await fastify.register(plugin);
```

#### Enhanced Context Creation
```typescript
// After registering plugin, access via fastify.telemetry
const context = fastify.telemetry.createEnhancedContext(req, res);

// Enhanced context includes telemetry property
const span = context.telemetry.span;
const logger = context.telemetry.logger;
```

### TelemetryMiddlewareService API Reference (for UnifiedRoute)

```typescript
import { TelemetryMiddlewareService } from '@inh-lib/unified-telemetry-middleware';

const telemetryMiddleware = new TelemetryMiddlewareService(provider, config);
```

#### Main Middleware
```typescript
// Base telemetry middleware (required first)
const middleware = telemetryMiddleware.createMiddleware();
```

#### Business Logic Middleware
```typescript
// Automatic span creation for business operations
const businessMiddleware = telemetryMiddleware.createBusinessLogicMiddleware('operation-name', {
  operationType: 'business',
  layer: 'service',
  attributes: { 'custom.attribute': 'value' }
});
```

#### Manual Span Creation
```typescript
// Create child span manually
const { span, logger, finish } = telemetryMiddleware.createChildSpan(
  context, 
  'operation-name',
  { 
    operationType: 'business',
    layer: 'service',
    attributes: { 'step': 'data-processing' }
  }
);

try {
  // Your logic here
  logger.info('Operation started');
  span.setTag('custom.tag', 'value');
} finally {
  finish(); // Always finish span
}
```

#### Current Context Access
```typescript
// Get current span and logger
const currentSpan = telemetryMiddleware.getCurrentSpan(context);
const currentLogger = telemetryMiddleware.getCurrentLogger(context);
```

### EnhancedUnifiedHttpContext

Extended context with telemetry provider access (when using TelemetryPluginService).

```typescript
interface EnhancedUnifiedHttpContext extends UnifiedHttpContext {
  telemetry: UnifiedTelemetryProvider;
}

// Example usage
const context = fastify.telemetry.createEnhancedContext(req, res);
const span = context.telemetry.span;
const logger = context.telemetry.logger;
```
```

### Registry Keys

Pre-defined keys for telemetry data storage.

```typescript
import { TELEMETRY_REGISTRY_KEYS } from '@inh-lib/api-util-fastify';

// Available keys:
TELEMETRY_REGISTRY_KEYS.PERFORMANCE_DATA    // 'telemetry:performance'
TELEMETRY_REGISTRY_KEYS.TRACE_ID           // 'telemetry:traceId'
TELEMETRY_REGISTRY_KEYS.SPAN_ID            // 'telemetry:spanId'
TELEMETRY_REGISTRY_KEYS.REQUEST_START_TIME // 'telemetry:requestStartTime'
```

start();
```

## 📚 Unified Route Adapter API

### Core Functions

#### `createFastifyContext<TBody>(req, res)`

Creates a complete unified HTTP context from Fastify request and response objects.

```typescript
function createFastifyContext<TBody = Record<string, unknown>>(
  req: FastifyRequest,
  res: FastifyReply
): UnifiedHttpContext & { request: UnifiedRequestContext & { body: TBody } }
```

**Parameters:**
- `req: FastifyRequest` - Fastify request object
- `res: FastifyReply` - Fastify reply object
- `TBody` - Optional generic type for request body

**Returns:** Complete unified context with typed request body

**Example:**
```typescript
fastify.post<{ Body: CreateUserRequest }>('/users', async (request, reply) => {
  const context = createFastifyContext<CreateUserRequest>(request, reply);
  // context.request.body is now typed as CreateUserRequest
  await createUserHandler(context);
});
```

#### `adaptFastifyRequest<TBody>(req)`

Converts a Fastify request to a unified request context.

```typescript
function adaptFastifyRequest<TBody = Record<string, unknown>>(
  req: FastifyRequest
): UnifiedRequestContext & { body: TBody }
```

#### `adaptFastifyResponse(res)`

Converts a Fastify reply to a unified response context.

```typescript
function adaptFastifyResponse(res: FastifyReply): UnifiedResponseContext
```

### Context Structure

The adapted context follows the unified context pattern:

```typescript
interface UnifiedHttpContext {
  request: {
    body: TBody;                              // Parsed request body
    params: Record<string, string>;           // URL parameters
    query: Record<string, string | string[]>; // Query string parameters
    headers: Record<string, string>;          // Request headers
    method: string;                           // HTTP method
    url: string;                              // Request URL
    ip: string;                               // Client IP address
    userAgent?: string;                       // User-Agent header
  };
  response: {
    status(code: number): UnifiedResponseContext;     // Set status code
    json<T>(data: T): void;                          // Send JSON response
    send(data: string): void;                        // Send text response
    header(name: string, value: string): UnifiedResponseContext; // Set header
    redirect(url: string): void;                     // Redirect response
  };
  registry: Record<string, unknown>;          // Shared data storage
}
```

## 🎯 Advanced Usage Examples

### Typed Request Bodies

```typescript
import { createFastifyContext } from '@inh-lib/api-util-fastify';

interface CreateUserRequest {
  name: string;
  email: string;
  role: 'admin' | 'user';
}

interface UpdateUserRequest {
  name?: string;
  email?: string;
}

// POST route with typed body
fastify.post<{ Body: CreateUserRequest }>('/users', async (request, reply) => {
  const context = createFastifyContext<CreateUserRequest>(request, reply);
  
  // TypeScript knows the shape of context.request.body
  const { name, email, role } = context.request.body;
  
  await createUserHandler(context);
});

// PUT route with typed body
fastify.put<{ Params: { id: string }, Body: UpdateUserRequest }>(
  '/users/:id', 
  async (request, reply) => {
    const context = createFastifyContext<UpdateUserRequest>(request, reply);
    
    // Both params and body are type-safe
    const userId = context.request.params.id;
    const updates = context.request.body;
    
    await updateUserHandler(context);
  }
);
```

### Database Integration Middleware

```typescript
import { Pool } from 'pg';
import { UnifiedMiddleware, addRegistryItem, getRegistryItem } from '@inh-lib/unified-route';

interface DatabaseConnection {
  query: (text: string, params?: unknown[]) => Promise<any>;
}

const databaseMiddleware: UnifiedMiddleware = async (context, next) => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  const db: DatabaseConnection = {
    query: async (text: string, params?: unknown[]) => {
      const client = await pool.connect();
      try {
        const result = await client.query(text, params);
        return result.rows;
      } finally {
        client.release();
      }
    }
  };
  
  addRegistryItem(context, 'db', db);
  
  try {
    await next();
  } finally {
    await pool.end();
  }
};

// Use in route
fastify.get('/users/:id', async (request, reply) => {
  const context = createFastifyContext(request, reply);
  const handler = composeMiddleware([databaseMiddleware])(async (ctx) => {
    const db = getRegistryItem<DatabaseConnection>(ctx, 'db');
    if (db instanceof Error) {
      return sendError(ctx, 'Database unavailable', 500);
    }
    
    const users = await db.query('SELECT * FROM users WHERE id = $1', [ctx.request.params.id]);
    sendResponse(ctx, { user: users[0] });
  });
  
  await handler(context);
});
```

### Authentication & Authorization

```typescript
import { UnifiedMiddleware } from '@inh-lib/unified-route';
import { createFastifyContext } from '@inh-lib/api-util-fastify';

interface User {
  id: number;
  name: string;
  email: string;
  roles: string[];
}

interface AuthMiddlewareOptions {
  requiredRole?: string;
  optional?: boolean;
}

const createAuthMiddleware = (options: AuthMiddlewareOptions = {}): UnifiedMiddleware => {
  return async (context, next) => {
    const token = context.request.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      if (options.optional) {
        return await next();
      }
      return context.response.status(401).json({ error: 'Token required' });
    }
    
    try {
      const user = await validateJWT(token); // Your JWT validation
      
      if (options.requiredRole && !user.roles.includes(options.requiredRole)) {
        return context.response.status(403).json({ error: 'Insufficient permissions' });
      }
      
      addRegistryItem(context, 'user', user);
      await next();
    } catch (error) {
      context.response.status(401).json({ error: 'Invalid token' });
    }
  };
};

// Public route (no auth)
fastify.get('/public', async (request, reply) => {
  const context = createFastifyContext(request, reply);
  await publicHandler(context);
});

// Protected route (auth required)
fastify.get('/profile', async (request, reply) => {
  const context = createFastifyContext(request, reply);
  const handler = composeMiddleware([
    createAuthMiddleware()
  ])(profileHandler);
  await handler(context);
});

// Admin only route
fastify.delete('/users/:id', async (request, reply) => {
  const context = createFastifyContext(request, reply);
  const handler = composeMiddleware([
    createAuthMiddleware({ requiredRole: 'admin' })
  ])(deleteUserHandler);
  await handler(context);
});
```

### Error Handling Patterns

```typescript
import { UnifiedMiddleware } from '@inh-lib/unified-route';

class ValidationError extends Error {
  constructor(public details: any[]) {
    super('Validation failed');
  }
}

class AuthenticationError extends Error {
  constructor() {
    super('Authentication failed');
  }
}

const errorHandlingMiddleware: UnifiedMiddleware = async (context, next) => {
  try {
    await next();
  } catch (error) {
    console.error('Request error:', error);
    
    if (error instanceof ValidationError) {
      context.response.status(400).json({
        error: 'Validation failed',
        details: error.details
      });
    } else if (error instanceof AuthenticationError) {
      context.response.status(401).json({
        error: 'Authentication failed'
      });
    } else {
      context.response.status(500).json({
        error: 'Internal server error',
        requestId: generateRequestId()
      });
    }
  }
};

// Apply error handling to all routes
const withErrorHandling = (handler: UnifiedRouteHandler) => {
  return composeMiddleware([errorHandlingMiddleware])(handler);
};

fastify.post('/users', async (request, reply) => {
  const context = createFastifyContext<CreateUserRequest>(request, reply);
  await withErrorHandling(createUserHandler)(context);
});
```

### Production Telemetry Patterns

Real-world patterns for production-grade telemetry integration.

```typescript
import { TelemetryPluginService } from '@inh-lib/api-util-fastify';
import { OpenTelemetryProvider } from '@inh-lib/unified-telemetry-otel';

// Production telemetry configuration
const telemetryProvider = new OpenTelemetryProvider({
  serviceName: process.env.SERVICE_NAME || 'fastify-app',
  serviceVersion: process.env.SERVICE_VERSION || '1.0.0',
  environment: process.env.NODE_ENV || 'development',
  
  // Tracing configuration
  enableTracing: process.env.ENABLE_TRACING === 'true',
  tracingEndpoint: process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT,
  
  // Metrics configuration  
  enableMetrics: process.env.ENABLE_METRICS === 'true',
  metricsEndpoint: process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT,
  prometheusPort: parseInt(process.env.PROMETHEUS_PORT || '9464'),
  
  // Sampling configuration
  tracingSampleRate: parseFloat(process.env.TRACING_SAMPLE_RATE || '0.1'),
});

// Setup telemetry middleware for UnifiedRoute pattern
const telemetryMiddleware = new TelemetryMiddlewareService(telemetryProvider, {
  serviceName: process.env.SERVICE_NAME || 'fastify-app',
  enableTracing: true,
  enableMetrics: true,
  enableResourceTracking: process.env.NODE_ENV === 'production',
  enableSystemMetrics: true,
  systemMetricsInterval: 30000, // 30 seconds
});

// Database operation with telemetry
class UserService {
  constructor(private telemetry: TelemetryMiddlewareService) {}

  async findById(id: string, context: UnifiedHttpContext): Promise<User | null> {
    const { span, logger, finish } = this.telemetry.createChildSpan(
      context,
      'db.user.findById',
      {
        operationType: 'business', // Changed from 'database' to valid type
        layer: 'data',
        attributes: {
          'db.operation': 'user.findById',
          'user.id': id
        }
      }
    );

    try {
      logger.info('Querying user by ID', { userId: id });

      // Simulate database query
      const user = await db.query('SELECT * FROM users WHERE id = ?', [id]);
      
      if (user) {
        span.setTag('user.found', true);
        span.setTag('user.role', user.role);
        logger.info('User found successfully', { 
          userId: id, 
          userRole: user.role 
        });
      } else {
        span.setTag('user.found', false);
        logger.warn('User not found', { userId: id });
      }

      return user;
    } catch (error) {
      span.recordException(error);
      span.setStatus({ code: 'error', message: error.message });
      logger.error('Database query failed', error, { userId: id });
      throw error;
    } finally {
      finish();
    }
  }
}

// Business logic middleware with comprehensive telemetry
const createBusinessLogicWithTelemetry = (telemetryMiddleware: TelemetryMiddlewareService) => 
  (operationName: string) => 
    async (context: UnifiedHttpContext, next: () => Promise<void>) => {
      const logger = telemetryMiddleware.getCurrentLogger(context);
      const span = telemetryMiddleware.getCurrentSpan(context);

      if (!logger || !span) {
        console.warn('Telemetry not available, proceeding without tracing');
        await next();
        return;
    }

    // Add business context to telemetry
    span.setTag('business.operation', operationName);
    span.setTag('business.layer', 'service');
    span.setTag('request.authenticated', !!context.registry.user);
    
    // Performance monitoring
    const startTime = Date.now();
    const startMemory = process.memoryUsage().heapUsed;

    try {
      logger.info(`Starting business operation: ${operationName}`);
      
      await next();
      
      // Success metrics
      const duration = Date.now() - startTime;
      const memoryDelta = process.memoryUsage().heapUsed - startMemory;
      
      span.setTag('operation.duration_ms', duration);
      span.setTag('operation.memory_delta_bytes', memoryDelta);
      span.setTag('operation.status', 'success');
      
      logger.info(`Business operation completed successfully`, {
        operation: operationName,
        duration,
        memoryDelta
      });
      
    } catch (error) {
      // Error tracking
      const duration = Date.now() - startTime;
      
      span.setTag('operation.duration_ms', duration);
      span.setTag('operation.status', 'error');
      span.setTag('error.type', error.constructor.name);
      span.recordException(error);
      span.setStatus({ code: 'error', message: error.message });
      
      logger.error(`Business operation failed`, error, {
        operation: operationName,
        duration,
        errorType: error.constructor.name
      });
      
      throw error;
    }
  };

// Complete route with production telemetry
const userService = new UserService(telemetryMiddleware);
const businessLogicWithTelemetry = createBusinessLogicWithTelemetry(telemetryMiddleware);

fastify.get('/api/users/:id', async (request, reply) => {
  const context = createFastifyContext(request, reply);
  
  const handler = composeMiddleware([
    telemetryMiddleware.createMiddleware(),
    telemetryMiddleware.createBusinessLogicMiddleware('get-user'),
    businessLogicWithTelemetry('user-lookup'),
    
    async (context, next) => {
      const userService = new UserService();
      const userId = context.request.params.id;
      
      const user = await userService.findById(userId, context);
      
      if (user) {
        sendResponse(context, { 
          user,
          retrievedAt: new Date().toISOString()
        });
      } else {
        sendError(context, 'User not found', 404);
      }
      
      await next();
    }
  ]);
  
  await handler(context);
});
```

## 🧪 Testing

### Unit Testing with Jest

```typescript
import { 
  createFastifyContext, 
  adaptFastifyRequest, 
  adaptFastifyResponse 
} from '@inh-lib/api-util-fastify';
import { FastifyRequest, FastifyReply } from 'fastify';

// Mock Fastify objects for testing
const createMockFastifyRequest = (overrides = {}): FastifyRequest => ({
  body: {},
  params: {},
  query: {},
  headers: {},
  method: 'GET',
  url: '/test',
  ip: '127.0.0.1',
  ...overrides
} as FastifyRequest);

const createMockFastifyReply = (): FastifyReply => {
  const reply = {
    statusCode: 200,
    headers: {},
    status: jest.fn().mockReturnThis(),
    send: jest.fn(),
    header: jest.fn().mockReturnThis(),
    redirect: jest.fn()
  };
  
  return reply as unknown as FastifyReply;
};

describe('@inh-lib/api-util-fastify', () => {
  describe('unified-adapter', () => {
    it('should adapt fastify request to unified request context', () => {
      const mockRequest = createMockFastifyRequest({
        body: { name: 'John' },
        params: { id: '123' },
        query: { filter: 'active' },
        headers: { 'content-type': 'application/json' },
        method: 'POST',
        url: '/users/123',
        ip: '192.168.1.1'
      });

      const result = adaptFastifyRequest(mockRequest);

      expect(result).toEqual({
        body: { name: 'John' },
        params: { id: '123' },
        query: { filter: 'active' },
        headers: { 'content-type': 'application/json' },
        method: 'POST',
        url: '/users/123',
        ip: '192.168.1.1',
        userAgent: undefined
      });
    });

    it('should create unified context from fastify request and reply', () => {
      const mockRequest = createMockFastifyRequest({
        body: { email: 'test@example.com' },
        params: { id: '456' }
      });
      const mockReply = createMockFastifyReply();

      const context = createFastifyContext(mockRequest, mockReply);

      expect(context.request.body).toEqual({ email: 'test@example.com' });
      expect(context.request.params).toEqual({ id: '456' });
      expect(context.registry).toEqual({});
      expect(typeof context.response.status).toBe('function');
      expect(typeof context.response.json).toBe('function');
    });
  });
});
```

### Integration Testing

```typescript
import Fastify from 'fastify';
import { createFastifyContext } from '@inh-lib/api-util-fastify';
import { composeMiddleware } from '@inh-lib/unified-route';

describe('Fastify Integration', () => {
  let fastify: FastifyInstance;

  beforeEach(async () => {
    fastify = Fastify();
    
    // Register test routes
    fastify.post('/users', async (request, reply) => {
      const context = createFastifyContext(request, reply);
      await testHandler(context);
    });

    await fastify.ready();
  });

  afterEach(async () => {
    await fastify.close();
  });

  it('should handle POST request with unified context', async () => {
    const response = await fastify.inject({
      method: 'POST',
      url: '/users',
      payload: { name: 'John Doe', email: 'john@example.com' },
      headers: { 'content-type': 'application/json' }
    });

    expect(response.statusCode).toBe(201);
    expect(JSON.parse(response.body)).toEqual({
      success: true,
      user: { name: 'John Doe', email: 'john@example.com' }
    });
  });
});
```

## 📁 Package Structure

```
@inh-lib/api-util-fastify/
├── unified-adapter/           # Unified Route Adapter
│   ├── index.ts              # Main exports
│   ├── context.ts            # Context creation utilities
│   ├── request.ts            # Request adaptation
│   └── response.ts           # Response adaptation
├── middlewares/              # Common Middlewares (Coming Soon)
│   ├── auth.ts              # Authentication middleware
│   ├── cors.ts              # CORS middleware
│   └── rate-limit.ts        # Rate limiting middleware
├── validation/               # Validation Helpers (Coming Soon)
│   ├── joi.ts               # Joi validation
│   ├── zod.ts               # Zod validation
│   └── ajv.ts               # AJV validation
├── errors/                   # Error Handling (Coming Soon)
│   ├── handlers.ts          # Error handlers
│   ├── types.ts             # Error types
│   └── responses.ts         # Error responses
└── index.ts                  # Package exports
```

## 🔧 Configuration

### TypeScript Configuration

Add these compiler options to your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "outDir": "./dist"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### ESLint Configuration

```json
{
  "extends": [
    "@typescript-eslint/recommended",
    "prettier"
  ],
  "rules": {
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-unused-vars": "error"
  }
}
```

## 🚀 Performance Considerations

- **Zero Overhead**: Utilities are lightweight wrappers with minimal performance impact
- **Memory Efficient**: No unnecessary object cloning, references to original Fastify objects where possible
- **Type Safety**: Full TypeScript support without runtime type checking overhead
- **Fastify Optimized**: Designed to work with Fastify's high-performance architecture
- **Tree Shakeable**: Import only the utilities you need

## 🗺️ Roadmap

### Immediate (v1.x)
- [x] Unified Route Adapter
- [ ] Common Middlewares (Auth, CORS, Rate Limiting)
- [ ] Validation Helpers (Joi, Zod, AJV)
- [ ] Error Handling Utilities

### Future (v2.x)
- [ ] Fastify Plugin Utilities
- [ ] Testing Helpers
- [ ] Performance Monitoring Utils
- [ ] OpenAPI/Swagger Integration
- [ ] GraphQL Utilities

### Long Term (v3.x)
- [ ] Advanced Caching Utilities
- [ ] WebSocket Helpers
- [ ] Microservice Patterns
- [ ] Health Check Utilities

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Setup

```bash
# Clone the repository
git clone https://github.com/your-org/api-util-fastify.git
cd api-util-fastify

# Install dependencies
npm install

# Run tests
npm test

# Build the project
npm run build

# Run type checking
npm run type-check

# Run linting
npm run lint
```

### Code Style Guidelines

- Use TypeScript with strict mode enabled
- No `any` types allowed
- Prefer composition over inheritance
- Write comprehensive tests for all public APIs
- Follow semantic versioning for releases
- Document all public APIs with JSDoc

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🔗 Related Packages

- [@inh-lib/unified-route](https://github.com/your-org/unified-route) - Core unified HTTP context framework
- [@inh-lib/unified-telemetry-core](https://github.com/your-org/unified-telemetry-core) - Telemetry and observability
- [@inh-lib/unified-telemetry-otel](https://github.com/your-org/unified-telemetry-otel) - OpenTelemetry integration
- [fastify](https://fastify.io/) - Fast and low overhead web framework for Node.js

## 📞 Support

- 🐛 [Report Issues](https://github.com/your-org/api-util-fastify/issues)
- 💡 [Feature Requests](https://github.com/your-org/api-util-fastify/issues/new?template=feature_request.md)
- 📖 [Documentation](https://your-org.github.io/api-util-fastify/)
- 💬 [Discussions](https://github.com/your-org/api-util-fastify/discussions)

---

Made with ❤️ for the Fastify and TypeScript community