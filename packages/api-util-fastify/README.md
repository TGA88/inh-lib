# @inh-lib/api-util-fastify

A comprehensive telemetry and unified HTTP context utility library for Fastify applications, providing automatic tracing, metrics collection, and resource monitoring.

## Features

- 🔍 **Automatic Request Tracing** - Seamless distributed tracing for all HTTP requests
- 📊 **Comprehensive Metrics** - HTTP request metrics, resource usage, and system metrics
- 🔄 **Unified HTTP Context** - Standardized request/response abstraction across frameworks
- 💾 **Resource Tracking** - Memory and CPU usage monitoring per request
- 🏷️ **Request Utilities** - Easy access to telemetry data within request lifecycle
- ⚡ **Performance Optimized** - Minimal overhead with configurable features
- 🎯 **Type Safe** - Full TypeScript support with comprehensive type definitions

## Installation
```bash
npm install @inh-lib/api-util-fastify
```

## Combining Unified Handlers with Telemetry

For unified handlers that need telemetry access, use a mixed approach with proper typing:

```typescript
import { 
  createUnifiedFastifyHandler,
  createUnifiedContext,
  FastifyTelemetryLoggerAdapter,
  TelemetryRequestUtils 
} from '@inh-lib/api-util-fastify';
import { 
  UnifiedRouteHandler,
  addRegistryItem,
  getRegistryItem,
  getRequestBody,
  sendResponse,
  sendError
} from '@inh-lib/unified-route';
import { FastifyRequest, FastifyReply } from 'fastify';

// Extended interface for requests with telemetry context
interface FastifyRequestWithTelemetry extends FastifyRequest {
  businessLogicContext?: UnifiedHttpContext;
}

// Method 1: Create a hybrid handler that accepts both contexts
const processOrderHandler = async (
  request: FastifyRequestWithTelemetry, 
  reply: FastifyReply
) => {
  // Create unified context for framework-agnostic code
  const context = createUnifiedContext(request, reply);
  
  // Use telemetry utils directly with FastifyRequest
  TelemetryRequestUtils.setRequestSpanTag(
    request, 
    'operation.type', 
    'order-processing'
  );
  
  TelemetryRequestUtils.addRequestSpanEvent(
    request,
    'order.validation.started'
  );
  
  // Business logic with unified context
  const orderData = getRequestBody<OrderRequest>(context);
  const orderId = generateOrderId();
  addRegistryItem(context, 'orderId', orderId);
  
  try {
    const result = await processOrder(orderData);
    
    const registryOrderId = getRegistryItem(context, 'orderId');
    
    TelemetryRequestUtils.addRequestSpanEvent(
      request,
      'order.processed.successfully',
      { 
        orderId: registryOrderId instanceof Error ? 'unknown' : registryOrderId, 
        amount: result.total 
      }
    );
    
    sendResponse(context, {
      ...result,
      orderId: registryOrderId instanceof Error ? null : registryOrderId
    }, 201);
      
  } catch (error) {
    const registryOrderId = getRegistryItem(context, 'orderId');
    
    TelemetryRequestUtils.addRequestSpanEvent(
      request,
      'order.processing.failed',
      { 
        orderId: registryOrderId instanceof Error ? 'unknown' : registryOrderId, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    );
    
    sendError(context, 'Order processing failed', 500);
  }
};

// Register as normal Fastify route
fastify.post('/orders', processOrderHandler);

// Method 2: Pure unified handler (for framework portability)
const pureUnifiedHandler: UnifiedRouteHandler = async (context) => {
  // Business logic only - no direct telemetry access
  const orderData = getRequestBody<OrderRequest>(context);
  const orderId = generateOrderId();
  addRegistryItem(context, 'orderId', orderId);
  
  const result = await processOrder(orderData);
  
  const registryOrderId = getRegistryItem(context, 'orderId');
  
  sendResponse(context, {
    ...result,
    orderId: registryOrderId instanceof Error ? null : registryOrderId
  }, 201);
};

// Wrap with telemetry-aware adapter
fastify.post('/orders-unified', createUnifiedFastifyHandler(pureUnifiedHandler));
```

## Complete Integration Example

Here's a complete example showing how to set up everything together with proper TypeScript types:

```typescript
import Fastify, { FastifyRequest, FastifyReply } from 'fastify';
import {
  TelemetryPluginService,
  FastifyTelemetryLoggerAdapter,
  createUnifiedFastifyHandler,
  createUnifiedContext,
  TelemetryRequestUtils
} from '@inh-lib/api-util-fastify';
import { UnifiedTelemetryProvider } from '@inh-lib/unified-telemetry-core';
import { 
  UnifiedRouteHandler, 
  UnifiedHttpContext,
  addRegistryItem,
  getRegistryItem,
  getRequestBody,
  getParams,
  sendResponse,
  sendError
} from '@inh-lib/unified-route';

// Define proper interfaces
interface OrderRequest {
  items: Array<{ id: string; quantity: number; price: number }>;
  customerId: string;
  shippingAddress: string;
}

interface FastifyRequestWithContext extends FastifyRequest {
  businessLogicContext?: UnifiedHttpContext;
}

// 1. Setup Fastify with logger
const fastify = Fastify({
  logger: {
    level: 'info',
    transport: { target: 'pino-pretty' }
  }
});

// 2. Create telemetry provider with Fastify logger adapter
const telemetryProvider = new UnifiedTelemetryProvider({
  serviceName: 'order-service',
  logger: new FastifyTelemetryLoggerAdapter(fastify.log)
});

// 3. Register telemetry plugin
await fastify.register(
  TelemetryPluginService.createPlugin({
    telemetryProvider,
    serviceName: 'order-service',
    autoTracing: true,
    enableResourceTracking: true,
    skipRoutes: ['/health', '/metrics']
  })
);

// 4. Define unified route handlers
const healthCheckHandler: UnifiedRouteHandler = async (context) => {
  sendResponse(context, { status: 'healthy', timestamp: Date.now() });
};

const createOrderHandler: UnifiedRouteHandler = async (context) => {
  // Business logic with proper typing using utility functions
  const orderData = getRequestBody<OrderRequest>(context);
  const orderId = `order-${Date.now()}`;
  const startTime = Date.now();
  
  addRegistryItem(context, 'orderId', orderId);
  addRegistryItem(context, 'startTime', startTime);
  
  // Validate request
  if (!orderData.items || orderData.items.length === 0) {
    return sendError(context, 'Order must contain at least one item', 400);
  }
  
  try {
    const order = await createOrder(orderData);
    
    const registryOrderId = getRegistryItem(context, 'orderId');
    const registryStartTime = getRegistryItem(context, 'startTime');
    
    sendResponse(context, {
      ...order,
      orderId: registryOrderId instanceof Error ? null : registryOrderId,
      processingTime: registryStartTime instanceof Error ? 0 : Date.now() - (registryStartTime as number)
    }, 201);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const registryOrderId = getRegistryItem(context, 'orderId');
    
    sendError(context, `Failed to create order: ${errorMessage}`, 500);
  }
};

// 5. Hybrid handler with telemetry access
const getOrderWithTelemetry = async (
  request: FastifyRequestWithContext, 
  reply: FastifyReply
) => {
  const context = createUnifiedContext(request, reply);
  
  // Add telemetry tags
  TelemetryRequestUtils.setRequestSpanTag(request, 'order.operation', 'fetch');
  TelemetryRequestUtils.addRequestSpanEvent(request, 'order.fetch.started');
  
  const params = getParams(context);
  const orderId = params.id;
  
  try {
    const order = await getOrder(orderId);
    
    if (order) {
      TelemetryRequestUtils.addRequestSpanEvent(request, 'order.found', {
        orderId,
        orderStatus: order.status
      });
      
      sendResponse(context, order);
    } else {
      TelemetryRequestUtils.addRequestSpanEvent(request, 'order.not_found', {
        orderId
      });
      
      sendError(context, 'Order not found', 404);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    TelemetryRequestUtils.addRequestSpanEvent(request, 'order.fetch.failed', {
      orderId,
      error: errorMessage
    });
    
    sendError(context, 'Failed to fetch order', 500);
  }
};

// 6. Register routes with proper typing
fastify.get('/health', createUnifiedFastifyHandler(healthCheckHandler));
fastify.post('/orders', createUnifiedFastifyHandler(createOrderHandler));
fastify.get('/orders/:id', getOrderWithTelemetry);

// 7. Traditional Fastify route with telemetry utils
fastify.get<{ Params: { id: string } }>('/orders/:id/status', async (request, reply) => {
  TelemetryRequestUtils.setRequestSpanTag(request, 'order.operation', 'status-check');
  
  const { id: orderId } = request.params;
  
  try {
    const status = await getOrderStatus(orderId);
    
    TelemetryRequestUtils.addRequestSpanEvent(request, 'order.status.retrieved', {
      orderId,
      status: status.current
    });
    
    return status;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    TelemetryRequestUtils.addRequestSpanEvent(request, 'order.status.failed', {
      orderId,
      error: errorMessage
    });
    
    return reply.status(404).send({ error: 'Order not found', orderId });
  }
});

// Alternative using unified context with utility functions
fastify.get<{ Params: { id: string } }>('/orders/:id/details', async (request, reply) => {
  const context = createUnifiedContext(request, reply);
  
  TelemetryRequestUtils.setRequestSpanTag(request, 'order.operation', 'details-fetch');
  
  const params = getParams(context);
  const orderId = params.id;
  
  try {
    const orderDetails = await getOrderDetails(orderId);
    
    TelemetryRequestUtils.addRequestSpanEvent(request, 'order.details.retrieved', {
      orderId,
      hasDetails: !!orderDetails
    });
    
    sendResponse(context, orderDetails);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    TelemetryRequestUtils.addRequestSpanEvent(request, 'order.details.failed', {
      orderId,
      error: errorMessage
    });
    
    sendError(context, 'Failed to fetch order details', 500);
  }
});

// 8. Start server
await fastify.listen({ port: 3000, host: '0.0.0.0' });
console.log('🚀 Server running on http://localhost:3000');

// Helper functions (implement according to your business logic)
async function createOrder(orderData: OrderRequest) {
  // Implementation here
  return { id: `order-${Date.now()}`, ...orderData, status: 'created' };
}

async function getOrder(orderId: string) {
  // Implementation here
  return { id: orderId, status: 'processing' };
}

async function getOrderStatus(orderId: string) {
  // Implementation here
  return { orderId, current: 'shipped', updatedAt: new Date() };
}

async function getOrderDetails(orderId: string) {
  // Implementation here
  return { 
    id: orderId, 
    status: 'processing',
    items: [{ id: 'item1', name: 'Product A', quantity: 2 }],
    total: 49.99,
    createdAt: new Date(Date.now() - 86400000), // Yesterday
    estimatedDelivery: new Date(Date.now() + 3 * 86400000) // 3 days from now
  };
}
```



## Quick Start

### Basic Telemetry Setup

```typescript
import Fastify from 'fastify';
import { TelemetryPluginService } from '@inh-lib/api-util-fastify';
import { UnifiedTelemetryProvider } from '@inh-lib/unified-telemetry-core';

const fastify = Fastify({ logger: true });

// Initialize your telemetry provider
const telemetryProvider = new UnifiedTelemetryProvider({
  serviceName: 'my-fastify-app',
  // ... your telemetry config
});

// Register the telemetry plugin
await fastify.register(
  TelemetryPluginService.createPlugin({
    telemetryProvider,
    serviceName: 'my-fastify-app',
    autoTracing: true,
    enableResourceTracking: true,
    enableSystemMetrics: true
  })
);

// Your routes will now have automatic telemetry
fastify.get('/api/users/:id', async (request, reply) => {
  // Telemetry is automatically tracked
  const { id } = request.params;
  return { userId: id };
});

await fastify.listen({ port: 3000 });
```

### Using Unified Route Handlers

The `createUnifiedFastifyHandler` allows you to write framework-agnostic route handlers that work across different HTTP frameworks:

```typescript
import { 
  createUnifiedFastifyHandler, 
  createUnifiedContext 
} from '@inh-lib/api-util-fastify';
import { UnifiedRouteHandler } from '@inh-lib/unified-route';

// Define a unified route handler - framework agnostic
const getUserHandler: UnifiedRouteHandler = async (context) => {
  const { request, response, registry } = context;
  
  // Access request data in a unified way
  const userId = request.params.id as string;
  const authHeader = request.headers.authorization;
  
  // Use registry for dependency injection or shared data
  const requestId = `user-${userId}-${Date.now()}`;
  context.addRegistryItem('requestId', requestId);
  
  try {
    const user = await getUserById(userId);
    
    // Unified response methods
    response
      .status(200)
      .header('X-Request-ID', context.getRegistryItem('requestId'))
      .json({ 
        user,
        requestId: context.getRegistryItem('requestId')
      });
  } catch (error) {
    response
      .status(404)
      .json({ 
        error: 'User not found',
        requestId: context.getRegistryItem('requestId')
      });
  }
};

// Register with Fastify using the adapter
fastify.get('/users/:id', createUnifiedFastifyHandler(getUserHandler));

// Complex example with typed body
interface CreateUserRequest {
  name: string;
  email: string;
  role: 'user' | 'admin';
}

const createUserHandler: UnifiedRouteHandler = async (context) => {
  const { request, response } = context;
  
  // Access typed body (when using with TypeScript)
  const userData = request.body as CreateUserRequest;
  
  // Validate request
  if (!userData.name || !userData.email) {
    return response
      .status(400)
      .json({ error: 'Name and email are required' });
  }
  
  // Business logic
  const newUser = await createUser(userData);
  
  // Return created user
  response
    .status(201)
    .header('Location', `/users/${newUser.id}`)
    .json({ user: newUser });
};

fastify.post('/users', createUnifiedFastifyHandler(createUserHandler));

// The handler can be reused across different frameworks!
// Works with Express, Koa, or any framework with an adapter
```

### Using FastifyTelemetryLoggerAdapter

The `FastifyTelemetryLoggerAdapter` integrates Fastify's logger with the unified telemetry system:

```typescript
import { FastifyTelemetryLoggerAdapter } from '@inh-lib/api-util-fastify';
import { UnifiedTelemetryProvider } from '@inh-lib/unified-telemetry-core';

// Setup in your application initialization
const fastify = Fastify({ 
  logger: {
    level: 'info',
    transport: {
      target: 'pino-pretty'
    }
  }
});

// Create telemetry provider with Fastify logger adapter
const telemetryProvider = new UnifiedTelemetryProvider({
  serviceName: 'my-service',
  logger: new FastifyTelemetryLoggerAdapter(fastify.log)
});

// Now telemetry logs will use Fastify's logger
await fastify.register(
  TelemetryPluginService.createPlugin({
    telemetryProvider,
    serviceName: 'my-service'
  })
);
```

#### Advanced Logger Integration

```typescript
import { 
  createUnifiedContext,
  TelemetryRequestUtils
} from '@inh-lib/api-util-fastify';
import {
  getParams,
  sendResponse,
  sendError
} from '@inh-lib/unified-route';

// Custom logger setup with telemetry
const fastify = Fastify({
  logger: {
    level: 'debug',
    serializers: {
      // Custom serializers for telemetry data
      span: (span) => ({
        traceId: span.getTraceId(),
        spanId: span.getSpanId()
      }),
      telemetryAttributes: (attrs) => attrs
    }
  }
});

const telemetryLoggerAdapter = new FastifyTelemetryLoggerAdapter(fastify.log);

// Use in route handlers
fastify.get('/api/data', async (request, reply) => {
  const context = createUnifiedContext(request, reply);
  const span = TelemetryRequestUtils.getRequestSpan(request);
  
  if (span) {
    // Create logger for this span
    const spanLogger = telemetryProvider.logger.getLogger({
      span,
      options: {
        operationType: 'business',
        operationName: 'fetch-user-data',
        layer: 'service',
        autoAddSpanEvents: true
      }
    });
    
    const params = getParams(context);
    const userId = params.id;
    
    spanLogger.info('Starting data fetch', { 
      userId,
      source: 'database' 
    });
    
    try {
      const data = await fetchUserData(userId);
      
      spanLogger.info('Data fetch completed', { 
        recordCount: data.length,
        duration: Date.now() - request.requestTelemetryContext?.startTime! 
      });
      
      sendResponse(context, data);
    } catch (error) {
      spanLogger.error('Data fetch failed', error, {
        userId,
        errorType: error instanceof Error ? error.constructor.name : 'Unknown'
      });
      
      sendError(context, 'Failed to fetch data', 500);
    }
  }
});
```

#### Logger Adapter Methods

The adapter provides these logging methods that integrate with telemetry:

```typescript
const adapter = new FastifyTelemetryLoggerAdapter(fastify.log);

// Log levels with telemetry attributes
adapter.debug('Debug message', { component: 'auth', action: 'validate' });
adapter.info('Request processed', { userId: '123', duration: 45 });
adapter.warn('Rate limit approaching', { current: 95, limit: 100 });
adapter.error('Database connection failed', { host: 'db-server', timeout: 5000 });
```

## Configuration

### TelemetryPluginOptions

```typescript
interface TelemetryPluginOptions {
  /** Unified telemetry provider instance */
  telemetryProvider: UnifiedTelemetryProvider;
  
  /** Enable automatic request tracing (default: true) */
  autoTracing?: boolean;
  
  /** Service name for telemetry (default: 'fastify-service') */
  serviceName?: string;
  
  /** Routes to skip telemetry (default: ['/health', '/metrics', '/ping']) */
  skipRoutes?: string[];
  
  /** Enable resource tracking per request (default: true) */
  enableResourceTracking?: boolean;
  
  /** Enable system metrics collection (default: true) */
  enableSystemMetrics?: boolean;
  
  /** System metrics collection interval in ms (default: 5000) */
  systemMetricsInterval?: number;
}
```

### Advanced Configuration

```typescript
await fastify.register(
  TelemetryPluginService.createPlugin({
    telemetryProvider,
    serviceName: 'my-service',
    autoTracing: true,
    skipRoutes: ['/health', '/metrics', '/docs'],
    enableResourceTracking: true,
    enableSystemMetrics: true,
    systemMetricsInterval: 10000 // 10 seconds
  })
);
```

## Telemetry Request Utilities

Access telemetry data within your route handlers using `TelemetryRequestUtils`:

```typescript
import { 
  TelemetryRequestUtils,
  createUnifiedContext
} from '@inh-lib/api-util-fastify';
import { 
  getRequestBody,
  getParams,
  addRegistryItem,
  getRegistryItem,
  sendResponse 
} from '@inh-lib/unified-route';

fastify.get('/api/process', async (request, reply) => {
  // Get the current request span
  const span = TelemetryRequestUtils.getRequestSpan(request);
  
  // Add custom tags
  TelemetryRequestUtils.setRequestSpanTag(request, 'operation', 'data-processing');
  TelemetryRequestUtils.setRequestSpanTag(request, 'user.tier', 'premium');
  
  // Add events
  TelemetryRequestUtils.addRequestSpanEvent(request, 'processing.started', {
    recordCount: 1000
  });
  
  // Get request and trace IDs
  const requestId = TelemetryRequestUtils.getRequestId(request);
  const traceId = TelemetryRequestUtils.getTraceId(request);
  
  // Your business logic
  const result = await processData();
  
  TelemetryRequestUtils.addRequestSpanEvent(request, 'processing.completed', {
    resultCount: result.length
  });
  
  return { 
    requestId,
    traceId,
    result 
  };
});

// Example using unified context with telemetry
fastify.post('/api/orders', async (request, reply) => {
  const context = createUnifiedContext(request, reply);
  
  // Add telemetry data
  TelemetryRequestUtils.setRequestSpanTag(request, 'operation.type', 'order-creation');
  
  // Use unified utilities
  const orderData = getRequestBody(context);
  const orderId = generateOrderId();
  
  addRegistryItem(context, 'orderId', orderId);
  addRegistryItem(context, 'startTime', Date.now());
  
  TelemetryRequestUtils.addRequestSpanEvent(request, 'order.validation.started', {
    orderId
  });
  
  try {
    const order = await createOrder(orderData);
    
    TelemetryRequestUtils.addRequestSpanEvent(request, 'order.created', {
      orderId,
      customerId: order.customerId
    });
    
    const registryOrderId = getRegistryItem(context, 'orderId');
    
    sendResponse(context, {
      ...order,
      orderId: registryOrderId instanceof Error ? null : registryOrderId
    }, 201);
  } catch (error) {
    TelemetryRequestUtils.addRequestSpanEvent(request, 'order.creation.failed', {
      orderId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    throw error;
  }
});
```

### Available Utility Methods

```typescript
// Span management
TelemetryRequestUtils.getRequestSpan(request)          // Get current span
TelemetryRequestUtils.hasRequestSpan(request)          // Check if span exists
TelemetryRequestUtils.setRequestSpanTag(request, key, value)  // Add tag
TelemetryRequestUtils.addRequestSpanEvent(request, name, attrs) // Add event

// Request context
TelemetryRequestUtils.getRequestId(request)            // Get request ID
TelemetryRequestUtils.getTraceId(request)              // Get trace ID  
TelemetryRequestUtils.getSpanId(request)               // Get span ID
```

## Unified HTTP Context

The library provides a unified abstraction over Fastify's request/response objects that works consistently across different HTTP frameworks:

### Manual Context Creation

```typescript
import { createUnifiedContext } from '@inh-lib/api-util-fastify';

fastify.addHook('preHandler', async (request, reply) => {
  // Create unified context manually
  const context = createUnifiedContext(request, reply);
  
  // Store in request for later use
  request.businessLogicContext = context;
  
  // Access unified request properties
  console.log(context.request.method);    // HTTP method
  console.log(context.request.url);       // Request URL
  console.log(context.request.headers);   // Headers object
  console.log(context.request.params);    // Route parameters
  console.log(context.request.query);     // Query parameters
  console.log(context.request.body);      // Request body
  console.log(context.request.ip);        // Client IP
  console.log(context.request.userAgent); // User agent
  console.log(context.request.route);     // Route pattern
  
  // Use unified response methods
  context.response
    .status(200)
    .header('Custom-Header', 'value')
    .json({ message: 'success' });
});
```

### Typed Context Usage

```typescript
interface UserRequestBody {
  name: string;
  email: string;
}

fastify.post<{ Body: UserRequestBody }>('/users', async (request, reply) => {
  // Create typed unified context
  const context = createUnifiedContext<UserRequestBody>(request, reply);
  
  // Body is now typed
  const { name, email } = context.request.body; // TypeScript knows the shape
  
  // Use registry for shared data
  const startTime = Date.now();
  const userId = generateUserId();
  
  context.addRegistryItem('startTime', startTime);
  context.addRegistryItem('userId', userId);
  
  // Chain response methods
  return context.response
    .status(201)
    .header('X-User-ID', context.getRegistryItem('userId'))
    .json({ 
      id: context.getRegistryItem('userId'),
      name,
      email,
      createdAt: context.getRegistryItem('startTime')
    });
});
```

### Context Registry Methods

The unified context provides a registry system for sharing data across the request lifecycle:

```typescript
// Add items to registry
context.addRegistryItem('key', value);
context.addRegistryItem('user', { id: 1, name: 'John' });
context.addRegistryItem('startTime', Date.now());

// Get items from registry
const user = context.getRegistryItem('user');
const startTime = context.getRegistryItem('startTime') as number;

// Registry is type-safe when you cast the result
interface User {
  id: number;
  name: string;
}

const typedUser = context.getRegistryItem('user') as User;
```

### Context in Middleware

📖 **Complete Guide Available**

For detailed examples, patterns, and best practices for all three methods, see:

**[→ Context in Middleware - Complete Guide](https://github.com/TGA88/inh-lib/blob/main/packages/api-util-fastify/CONTEXT-IN-MIDDLEWARE.Readme.md)**

```typescript
// Custom middleware using unified context
const authenticationMiddleware = async (request: FastifyRequest, reply: FastifyReply) => {
  const context = createUnifiedContext(request, reply);
  
  const authHeader = context.request.headers.authorization;
  
  if (!authHeader) {
    return context.response
      .status(401)
      .json({ error: 'Authorization header required' });
  }
  
  try {
    const user = await validateToken(authHeader);
    context.addRegistryItem('currentUser', user);
    context.addRegistryItem('isAuthenticated', true);
  } catch (error) {
    return context.response
      .status(401)
      .json({ error: 'Invalid token' });
  }
};

// Use in routes
fastify.addHook('preHandler', authenticationMiddleware);

fastify.get('/protected', async (request, reply) => {
  const context = request.businessLogicContext;
  
  const isAuthenticated = context?.getRegistryItem('isAuthenticated');
  if (!isAuthenticated) {
    return reply.status(401).send({ error: 'Unauthorized' });
  }
  
  return { 
    message: 'Protected data',
    user: context.getRegistryItem('currentUser')
  };
});
```

## Metrics Collected

### HTTP Request Metrics
- `http_requests_total` - Total number of HTTP requests
- `http_request_duration_seconds` - Request duration histogram
- `http_request_memory_usage_bytes` - Memory usage per request
- `http_request_cpu_time_seconds` - CPU time per request

### System Metrics
- `memory_usage_percent` - System memory usage percentage
- `cpu_usage_percent` - System CPU usage percentage

### Request Attributes
All requests are automatically tagged with:
- HTTP method, URL, route, status code
- User agent, client IP, content type
- Request ID, memory usage, CPU time
- Duration categories (fast/medium/slow)

## Advanced Usage

### Custom Telemetry in Routes

```typescript
import { 
  createUnifiedContext,
  TelemetryRequestUtils
} from '@inh-lib/api-util-fastify';
import {
  getParams,
  sendResponse,
  sendError
} from '@inh-lib/unified-route';

fastify.get('/api/complex-operation', async (request, reply) => {
  const context = createUnifiedContext(request, reply);
  const span = TelemetryRequestUtils.getRequestSpan(request);
  
  if (span) {
    // Create child span for specific operation
    const childSpan = fastify.telemetry?.provider.tracer.startSpan(
      'database-query',
      { parent: span }
    );
    
    try {
      childSpan.setTag('query.type', 'user-lookup');
      
      const params = getParams(context);
      const userId = params.id;
      
      const result = await database.query('SELECT * FROM users WHERE id = ?', [userId]);
      childSpan.setTag('query.results', result.length);
      
      sendResponse(context, result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      sendError(context, errorMessage, 500);
    } finally {
      childSpan.finish();
    }
  }
});
```

### Accessing the Telemetry Provider

```typescript
import { 
  createUnifiedContext,
  TelemetryRequestUtils
} from '@inh-lib/api-util-fastify';
import {
  getQuery,
  sendResponse
} from '@inh-lib/unified-route';

// The telemetry provider is available on the Fastify instance
fastify.get('/custom-metrics', async (request, reply) => {
  const context = createUnifiedContext(request, reply);
  const { provider } = fastify.telemetry!;
  
  // Create custom metrics
  const customCounter = provider.metrics.createCounter(
    'custom_operations_total',
    'Total custom operations'
  );
  
  const query = getQuery(context);
  const operation = Array.isArray(query.operation) ? query.operation[0] : query.operation || 'default';
  
  customCounter.add(1, { operation });
  
  sendResponse(context, { status: 'recorded', operation });
});
```

### Resource Tracking

```typescript
import { 
  createUnifiedContext,
  TelemetryRequestUtils
} from '@inh-lib/api-util-fastify';
import {
  addRegistryItem,
  getRegistryItem
} from '@inh-lib/unified-route';

// Resource tracking is automatic, but you can access the data
fastify.addHook('onResponse', async (request, reply) => {
  if (request.requestTelemetryContext?.resourceSnapshot) {
    const { resourceSnapshot } = request.requestTelemetryContext;
    
    console.log('Request memory usage:', {
      heapUsed: resourceSnapshot.memoryUsage.heapUsed,
      cpuTime: resourceSnapshot.cpuUsage.user + resourceSnapshot.cpuUsage.system
    });
  }
});

// Custom resource tracking in handlers
fastify.get('/resource-intensive', async (request, reply) => {
  const context = createUnifiedContext(request, reply);
  
  addRegistryItem(context, 'operationStart', Date.now());
  
  // Simulate resource-intensive operation
  await heavyComputation();
  
  const startTime = getRegistryItem(context, 'operationStart');
  const duration = startTime instanceof Error ? 0 : Date.now() - (startTime as number);
  
  return {
    message: 'Operation completed',
    duration: `${duration}ms`
  };
});
```

## Integration with Other Libraries

### Using with Fastify Plugins

```typescript
import { 
  createUnifiedContext,
  TelemetryRequestUtils
} from '@inh-lib/api-util-fastify';
import { 
  getRequestBody,
  getParams,
  addRegistryItem,
  sendResponse
} from '@inh-lib/unified-route';

// Custom plugin with telemetry
const myPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', async (request, reply) => {
    // Add custom telemetry tags
    TelemetryRequestUtils.setRequestSpanTag(request, 'plugin', 'my-plugin');
  });
  
  fastify.get('/plugin-route', async (request, reply) => {
    const context = createUnifiedContext(request, reply);
    
    TelemetryRequestUtils.addRequestSpanEvent(request, 'plugin.action');
    
    addRegistryItem(context, 'pluginData', { 
      timestamp: Date.now(),
      source: 'my-plugin' 
    });
    
    sendResponse(context, { 
      message: 'from plugin',
      pluginInfo: 'Custom plugin response'
    });
  });
  
  // Route with body processing
  fastify.post('/plugin-data', async (request, reply) => {
    const context = createUnifiedContext(request, reply);
    
    const body = getRequestBody(context);
    const params = getParams(context);
    
    TelemetryRequestUtils.addRequestSpanEvent(request, 'plugin.data.processed', {
      bodySize: JSON.stringify(body).length,
      hasParams: Object.keys(params).length > 0
    });
    
    sendResponse(context, {
      processed: true,
      receivedData: body,
      params
    });
  });
};

await fastify.register(myPlugin);
```

## Configuration Constants

```typescript
import { 
  DEFAULT_TELEMETRY_PLUGIN_OPTIONS,
  TELEMETRY_REGISTRY_KEYS 
} from '@inh-lib/api-util-fastify';

// Access default configuration
console.log(DEFAULT_TELEMETRY_PLUGIN_OPTIONS.serviceName); // 'fastify-service'
console.log(DEFAULT_TELEMETRY_PLUGIN_OPTIONS.skipRoutes);  // ['/health', '/metrics', '/ping']

// Registry keys for advanced usage
console.log(TELEMETRY_REGISTRY_KEYS.TELEMETRY_PROVIDER);   // 'telemetry:provider'
```

## Error Handling

The library automatically handles errors and adds them to telemetry:

```typescript
import { 
  createUnifiedContext,
  createUnifiedFastifyHandler,
  TelemetryRequestUtils 
} from '@inh-lib/api-util-fastify';
import {
  getRequestBody,
  sendError,
  sendResponse
} from '@inh-lib/unified-route';
import { UnifiedRouteHandler } from '@inh-lib/unified-route';

fastify.get('/error-prone', async (request, reply) => {
  // Errors are automatically captured in telemetry
  throw new Error('Something went wrong');
});

// Custom error handling with telemetry
fastify.setErrorHandler(async (error, request, reply) => {
  const context = createUnifiedContext(request, reply);
  const span = TelemetryRequestUtils.getRequestSpan(request);
  
  if (span) {
    span.setTag('error', true);
    span.setTag('error.type', error.constructor.name);
    span.addEvent('error.occurred', {
      message: error.message,
      stack: error.stack
    });
  }
  
  sendError(context, error.message, 500);
});

// Handling errors in unified handlers
const errorProneHandler: UnifiedRouteHandler = async (context) => {
  try {
    const body = getRequestBody(context);
    
    if (!body || Object.keys(body).length === 0) {
      return sendError(context, 'Request body is required', 400);
    }
    
    const result = await riskyOperation(body);
    sendResponse(context, result);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    sendError(context, `Operation failed: ${errorMessage}`, 500);
  }
};

fastify.post('/risky-operation', createUnifiedFastifyHandler(errorProneHandler));
```

## Best Practices

### Performance Considerations

- Routes in `skipRoutes` have minimal overhead
- Resource tracking adds ~1-2ms per request
- System metrics collection runs in background
- All telemetry operations are non-blocking
- Unified context creation is lightweight (~0.1ms)

### Memory Management

- Registry data is automatically cleaned up after request completion
- Avoid storing large objects in registry for long-running requests
- Use registry for metadata and small objects only
- Large data should be passed through function parameters

### Registry Best Practices

#### ✅ **Good Registry Usage**
```typescript
// Store lightweight metadata
addRegistryItem(context, 'userId', user.id);
addRegistryItem(context, 'role', 'admin');
addRegistryItem(context, 'timestamp', Date.now());

// Store configuration flags
addRegistryItem(context, 'features', { darkMode: true, notifications: false });
```

#### ❌ **Avoid Heavy Registry Usage**
```typescript
// DON'T store large objects
addRegistryItem(context, 'fullUserProfile', largeUserObject); // Heavy
addRegistryItem(context, 'cachedData', massiveDataArray); // Very heavy
```

### Error Handling Patterns

```typescript
// Always check for Error return from getRegistryItem
const user = getRegistryItem<User>(context, 'user');
if (user instanceof Error) {
  console.error('User not found in registry:', user.message);
  return sendError(context, 'Authentication required', 401);
}

// Use user data safely
console.log('User name:', user.name);
```

## API Reference

### Main Exports

```typescript
// Plugin and Services
export { TelemetryPluginService } from './lib/telemetry/services/telemetry-plugin.service';

// Utilities
export { TelemetryRequestUtils } from './lib/telemetry/utils/telemetry-request.utils';

// Adapters and Context
export { 
  createUnifiedFastifyHandler,
  createUnifiedContext,
  FastifyTelemetryLoggerAdapter 
} from './lib/unified-fastify-adapter';

// Constants
export { 
  TELEMETRY_REGISTRY_KEYS, 
  DEFAULT_TELEMETRY_PLUGIN_OPTIONS 
} from './lib/telemetry/constants/telemetry.const';

// Unified Route utilities (from @inh-lib/unified-route)
import {
  // Request helpers
  getRequestBody,
  getParams,
  getQuery,
  getHeaders,
  // Response helpers
  sendResponse,
  sendError,
  // Registry helpers
  addRegistryItem,
  getRegistryItem,
  // Types
  UnifiedRouteHandler,
  UnifiedHttpContext
} from '@inh-lib/unified-route';

// Types (import separately)
import type { 
  TelemetryPluginOptions,
  EnhancedUnifiedHttpContext,
  ResourceUsageSnapshot,
  RequestResourceMetrics,
  TelemetryDecorator
} from '@inh-lib/api-util-fastify';
```

### Core Functions

| Function | Purpose | Use Case |
|----------|---------|----------|
| `TelemetryPluginService.createPlugin()` | Creates Fastify telemetry plugin | Automatic request tracing and metrics |
| `createUnifiedFastifyHandler()` | Wraps unified route handlers | Framework-agnostic route handlers |
| `createUnifiedContext()` | Creates unified HTTP context | Manual context creation in hooks |
| `FastifyTelemetryLoggerAdapter()` | Adapts Fastify logger for telemetry | Integrate Fastify logging with telemetry |
| `TelemetryRequestUtils.*` | Telemetry utilities for requests | Access spans, tags, events in routes |

### Unified Route Utility Functions

| Function | Return Type | Purpose |
|----------|-------------|---------|
| `getRequestBody<T>(context)` | `T` | Get typed request body |
| `getParams(context)` | `Record<string, string>` | Get route parameters |
| `getQuery(context)` | `Record<string, string \| string[]>` | Get query parameters |
| `getHeaders(context)` | `Record<string, string>` | Get request headers |
| `sendResponse(context, data, status?)` | `void` | Send JSON response |
| `sendError(context, message, status?)` | `void` | Send error response |
| `addRegistryItem(context, key, value)` | `void` | Add item to registry |
| `getRegistryItem<T>(context, key)` | `T \| Error` | Get item from registry |

### Usage Examples

```typescript
// Request data access
const orderData = getRequestBody<OrderRequest>(context);
const userId = getParams(context).id;
const filters = getQuery(context);
const authToken = getHeaders(context).authorization;

// Response handling
sendResponse(context, { success: true }, 200);
sendError(context, 'Validation failed', 400);

// Registry management
addRegistryItem(context, 'user', userObject);
const user = getRegistryItem<User>(context, 'user');

if (user instanceof Error) {
  console.error('User not found in registry:', user.message);
} else {
  console.log('User found:', user.name);
}
```

## TypeScript Support

The library provides comprehensive TypeScript definitions:

```typescript
import type { 
  TelemetryPluginOptions,
  EnhancedUnifiedHttpContext,
  ResourceUsageSnapshot,
  RequestResourceMetrics 
} from '@inh-lib/api-util-fastify';
```

## License

MIT License

## Contributing

Issues and pull requests are welcome! Please ensure all tests pass and follow the existing code style.