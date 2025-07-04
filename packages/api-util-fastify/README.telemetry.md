# @inh-lib/api-util-fastify - Telemetry Plugin

> Fastify plugin for unified telemetry integration with OpenTelemetry

A comprehensive Fastify plugin that seamlessly integrates with `@inh-lib/unified-telemetry-otel` to provide automatic telemetry (tracing, logging, metrics) for your Fastify applications while converting Fastify context to `UnifiedHttpContext`.

## ✨ Features

- 🔧 **Fastify Plugin** - Easy registration with your Fastify application
- 📊 **Automatic Telemetry** - Auto-tracing, logging, and metrics for HTTP requests
- 🔄 **Context Conversion** - Seamless conversion from Fastify to UnifiedHttpContext
- 🎯 **Enhanced Context** - Direct access to telemetry provider in context
- 🚀 **Type Safe** - Full TypeScript support with comprehensive types
- ⚡ **Zero Config** - Works out of the box with sensible defaults
- 🛡️ **Error Handling** - Automatic error tracking and span management

## 📦 Installation

```bash
npm install @inh-lib/api-util-fastify @inh-lib/unified-telemetry-otel @inh-lib/unified-route
```

## 🚀 Quick Start

### Basic Setup

```typescript
import Fastify from 'fastify';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OtelProviderService } from '@inh-lib/unified-telemetry-otel';
import { TelemetryPluginService } from '@inh-lib/api-util-fastify';

// Setup OpenTelemetry
const sdk = new NodeSDK({
  serviceName: 'my-fastify-service',
  serviceVersion: '1.0.0'
});
sdk.start();

// Create telemetry provider
const telemetryProvider = OtelProviderService.createProviderWithConsole({
  config: {
    serviceName: 'my-fastify-service',
    serviceVersion: '1.0.0',
    environment: 'development'
  }
}, sdk);

// Create Fastify instance
const fastify = Fastify({ logger: true });

// Register telemetry plugin
await fastify.register(TelemetryPluginService.createPlugin({
  telemetryProvider,
  autoTracing: true,
  serviceName: 'my-fastify-service',
  skipRoutes: ['/health', '/metrics']
}));

// Routes automatically get telemetry
fastify.get('/users/:id', async (request, reply) => {
  const context = fastify.telemetry.createEnhancedContext(request, reply);
  
  // Use telemetry directly from context
  const logger = context.telemetry.logger.getBaseLogger();
  logger.info('Getting user', { userId: request.params.id });
  
  return { user: { id: request.params.id } };
});

await fastify.listen({ port: 3000 });
```

## 📚 API Reference

### TelemetryPluginService

#### `createPlugin(options: TelemetryPluginOptions)`

Creates a Fastify plugin with telemetry integration.

**Options:**
- `telemetryProvider: UnifiedTelemetryProvider` - The telemetry provider instance
- `autoTracing?: boolean` - Enable automatic HTTP request tracing (default: `true`)
- `serviceName?: string` - Service name for telemetry (default: `'fastify-service'`)
- `skipRoutes?: string[]` - Routes to skip telemetry (default: `['/health', '/metrics', '/ping']`)

```typescript
import { TelemetryPluginOptions } from '@inh-lib/api-util-fastify/src/telemetry.types';

const options: TelemetryPluginOptions = {
  telemetryProvider,
  autoTracing: true,
  serviceName: 'my-service',
  skipRoutes: ['/health', '/ping']
};

const plugin = TelemetryPluginService.createPlugin(options);
await fastify.register(plugin);
```

#### `createEnhancedContext<TBody>(request, reply, provider)`

Creates an enhanced UnifiedHttpContext with direct telemetry access.

```typescript
const context = TelemetryPluginService.createEnhancedContext<CreateUserRequest>(
  request, 
  reply, 
  telemetryProvider
);

// Direct access to telemetry
context.telemetry.logger.getBaseLogger().info('Message');
context.telemetry.tracer.startSpan('operation');
context.telemetry.metrics.createCounter('requests_total');
```

#### `createContextWithTelemetry<TBody>(request, reply, provider)`

Creates a regular UnifiedHttpContext with telemetry provider in registry.

```typescript
const context = TelemetryPluginService.createContextWithTelemetry<UserData>(
  request, 
  reply, 
  telemetryProvider
);

// Access telemetry from registry
const provider = getRegistryItem(context, TELEMETRY_REGISTRY_KEYS.TELEMETRY_PROVIDER);
```

### Fastify Decorator

When the plugin is registered, it adds a `telemetry` decorator to the Fastify instance:

```typescript
declare module 'fastify' {
  interface FastifyInstance {
    telemetry: {
      provider: UnifiedTelemetryProvider;
      createEnhancedContext: <TBody>(req, res) => EnhancedUnifiedHttpContext;
      createContext: <TBody>(req, res) => UnifiedHttpContext;
    };
  }
}

// Usage
const context = fastify.telemetry.createEnhancedContext(request, reply);
```

## 🔧 Advanced Usage

### With Unified Route Middleware

```typescript
import { 
  UnifiedMiddleware, 
  composeMiddleware,
  sendResponse,
  sendError,
  addRegistryItem,
  getRegistryItem 
} from '@inh-lib/unified-route';

// Authentication middleware
const authMiddleware: UnifiedMiddleware = async (context, next) => {
  const token = context.request.headers.authorization;
  
  if (!token) {
    return sendError(context, 'Authorization required', 401);
  }
  
  // Use telemetry from enhanced context
  if ('telemetry' in context) {
    const logger = context.telemetry.logger.getBaseLogger();
    logger.info('Authenticating user', { token: token.substring(0, 10) + '...' });
  }
  
  const user = await authenticateUser(token);
  addRegistryItem(context, 'user', user);
  await next();
};

// Route with middleware composition
fastify.get<{ Params: { id: string } }>('/users/:id', async (request, reply) => {
  const context = fastify.telemetry.createEnhancedContext(request, reply);
  
  const handler = composeMiddleware([authMiddleware])(async (ctx) => {
    const user = getRegistryItem(ctx, 'user');
    const userId = ctx.request.params.id;
    
    sendResponse(ctx, { user, requestedId: userId });
  });
  
  await handler(context);
});
```

### Custom Telemetry in Routes

```typescript
interface CreateOrderRequest {
  items: Array<{ id: string; quantity: number }>;
  customerId: string;
}

fastify.post<{ Body: CreateOrderRequest }>('/orders', async (request, reply) => {
  const context = fastify.telemetry.createEnhancedContext<CreateOrderRequest>(request, reply);
  const { items, customerId } = context.request.body;
  
  // Create custom span
  const span = context.telemetry.tracer.startSpan('order.create', {
    kind: 'internal',
    attributes: {
      'order.items_count': items.length,
      'order.customer_id': customerId
    }
  });
  
  // Create contextual logger
  const logger = context.telemetry.logger.getLogger({
    span,
    options: {
      operationType: 'business',
      operationName: 'createOrder',
      layer: 'service',
      autoAddSpanEvents: true
    }
  });
  
  try {
    logger.info('Creating order', { customerId, itemCount: items.length });
    
    // Business logic here
    const order = await createOrder({ items, customerId });
    
    // Record metrics
    const orderCounter = context.telemetry.metrics.createCounter(
      'orders_created_total',
      'Total orders created'
    );
    orderCounter.add(1, { customer_type: 'premium' });
    
    logger.info('Order created successfully', { orderId: order.id });
    
    return { order };
  } catch (error) {
    logger.error('Failed to create order', error);
    span.setStatus({ code: 'error', message: error.message });
    throw error;
  } finally {
    logger.finishSpan();
  }
});
```

### Database Integration Example

```typescript
import { Pool } from 'pg';

const databaseMiddleware: UnifiedMiddleware = async (context, next) => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  // Use telemetry if available
  let logger;
  if ('telemetry' in context) {
    logger = context.telemetry.logger.getBaseLogger();
    logger.info('Database connection established');
  }
  
  const db = {
    query: async (text: string, params?: unknown[]) => {
      const span = 'telemetry' in context 
        ? context.telemetry.tracer.startSpan('db.query', {
            kind: 'client',
            attributes: { 'db.statement': text }
          })
        : null;
      
      try {
        const result = await pool.query(text, params);
        span?.setTag('db.rows_affected', result.rowCount);
        return result.rows;
      } catch (error) {
        span?.recordException(error);
        throw error;
      } finally {
        span?.finish();
      }
    }
  };
  
  addRegistryItem(context, 'db', db);
  
  try {
    await next();
  } finally {
    await pool.end();
    logger?.info('Database connection closed');
  }
};
```

## 🏗️ Plugin Architecture

### Automatic Features

When `autoTracing: true` (default), the plugin automatically:

1. **Request Tracing**: Creates spans for all HTTP requests
2. **Request Logging**: Logs request start and completion
3. **Metrics Collection**: Records request count and duration
4. **Error Handling**: Captures and logs errors with spans
5. **Request ID**: Adds `x-request-id` header to responses

### Hook Integration

The plugin registers Fastify hooks:

- **onRequest**: Start span, create logger, add request ID
- **onResponse**: Log completion, record metrics, finish span  
- **onError**: Log errors, record exceptions in span

### Registry Keys

```typescript
import { TELEMETRY_REGISTRY_KEYS } from '@inh-lib/api-util-fastify';

// Available registry keys
TELEMETRY_REGISTRY_KEYS.TELEMETRY_PROVIDER  // 'telemetry:provider'
TELEMETRY_REGISTRY_KEYS.TELEMETRY_SPAN      // 'telemetry:span'
TELEMETRY_REGISTRY_KEYS.TELEMETRY_LOGGER    // 'telemetry:logger'
TELEMETRY_REGISTRY_KEYS.REQUEST_ID          // 'telemetry:request_id'
```

## 🧪 Testing

### Unit Testing

```typescript
import { NoOpUnifiedTelemetryProvider } from '@inh-lib/unified-telemetry-core';
import { TelemetryPluginService } from '@inh-lib/api-util-fastify';

describe('API Tests', () => {
  let fastify: FastifyInstance;
  let telemetryProvider: NoOpUnifiedTelemetryProvider;

  beforeEach(async () => {
    fastify = Fastify();
    
    // Use NoOp provider for testing
    telemetryProvider = new NoOpUnifiedTelemetryProvider({
      serviceName: 'test-service',
      serviceVersion: '1.0.0',
      environment: 'test'
    });

    await fastify.register(TelemetryPluginService.createPlugin({
      telemetryProvider,
      autoTracing: false // Disable auto-tracing in tests
    }));
  });

  afterEach(async () => {
    await fastify.close();
    await telemetryProvider.shutdown();
  });

  it('should create enhanced context', async () => {
    fastify.get('/test', async (request, reply) => {
      const context = fastify.telemetry.createEnhancedContext(request, reply);
      expect(context.telemetry).toBeDefined();
      return { success: true };
    });

    const response = await fastify.inject({ method: 'GET', url: '/test' });
    expect(response.statusCode).toBe(200);
  });
});
```

## 🔧 Configuration

### Environment Variables

```bash
# Service configuration
SERVICE_NAME=my-fastify-service
SERVICE_VERSION=1.0.0
ENVIRONMENT=production

# OpenTelemetry configuration
OTEL_SERVICE_NAME=my-fastify-service
OTEL_EXPORTER_OTLP_ENDPOINT=http://jaeger:14268/api/traces
```

### TypeScript Configuration

```json
{
  "compilerOptions": {
    "moduleResolution": "node",
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

## 📊 Observability Features

### Automatic Metrics

The plugin automatically records:

- `http_requests_total` - Counter of HTTP requests by method, route, status
- `http_request_duration_ms` - Histogram of request durations
- `http_requests_active` - Gauge of currently active requests

### Automatic Logging

Structured logs include:

- Request start/end with timing
- Error logging with stack traces  
- Request IDs for correlation
- HTTP method, URL, status codes
- User agent and client IP

### Automatic Tracing

Spans include:

- HTTP method and route as span name
- Request attributes (method, URL, user agent)
- Response attributes (status code, duration)
- Error information and exceptions
- Proper span status based on HTTP status

## 🚀 Production Deployment

### Docker Example

```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .

ENV NODE_ENV=production
ENV SERVICE_NAME=my-fastify-service
ENV OTEL_SERVICE_NAME=my-fastify-service

EXPOSE 3000
CMD ["node", "dist/index.js"]
```

### Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: fastify-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: fastify-service
  template:
    metadata:
      labels:
        app: fastify-service
    spec:
      containers:
      - name: app
        image: fastify-service:latest
        ports:
        - containerPort: 3000
        env:
        - name: SERVICE_NAME
          value: "fastify-service"
        - name: OTEL_EXPORTER_OTLP_ENDPOINT
          value: "http://jaeger-collector:14268/api/traces"
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Write tests for your changes
4. Ensure all tests pass (`npm test`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🔗 Related Packages

- [@inh-lib/unified-route](https://github.com/your-org/unified-route) - Unified HTTP context and middleware
- [@inh-lib/unified-telemetry-core](https://github.com/your-org/unified-telemetry-core) - Core telemetry abstractions
- [@inh-lib/unified-telemetry-otel](https://github.com/your-org/unified-telemetry-otel) - OpenTelemetry implementation

---

Made with ❤️ for the Fastify and OpenTelemetry community