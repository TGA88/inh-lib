# @inh-lib/unified-telemetry-middleware

> Telemetry middleware for @inh-lib/unified-route with OpenTelemetry integration

A comprehensive middleware that adds distributed tracing, metrics collection, and resource monitoring to unified-route applications. Built with full OpenTelemetry support and designed for production environments.

## ✨ Features

- **🔧 Seamless Integration** - Works with @inh-lib/unified-route out of the box
- **📊 Complete Observability** - Tracing, metrics, and logging in one middleware
- **🎯 W3C & B3 Support** - Automatic trace context extraction and propagation
- **💾 Resource Monitoring** - CPU and memory tracking per request
- **🚀 Production Ready** - Built for enterprise environments
- **🔒 Type Safe** - Fully typed with excellent TypeScript support
- **⚡ Zero Config** - Works with sensible defaults

## 📦 Installation

```bash
npm install @inh-lib/unified-telemetry-middleware @inh-lib/unified-route @inh-lib/unified-telemetry-core @inh-lib/unified-telemetry-otel
```

### Peer Dependencies

```bash
npm install @opentelemetry/sdk-node @opentelemetry/api
```

## 🚀 Quick Start

### Basic Setup with Express

```typescript
import express from 'express';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OtelProviderService } from '@inh-lib/unified-telemetry-otel';
import { TelemetryMiddlewareService } from '@inh-lib/unified-telemetry-middleware';
import { createExpressAdapter, composeMiddleware } from '@inh-lib/unified-route';

const app = express();

// Initialize OpenTelemetry
const sdk = new NodeSDK({
  serviceName: 'my-service',
  serviceVersion: '1.0.0',
});
sdk.start();

// Create telemetry provider
const telemetryProvider = OtelProviderService.createProviderWithConsole(
  {
    config: {
      serviceName: 'my-service',
      serviceVersion: '1.0.0',
      environment: 'production',
    },
  },
  sdk
);

// Create telemetry middleware service
const telemetryService = new TelemetryMiddlewareService(telemetryProvider, {
  serviceName: 'my-service',
  serviceVersion: '1.0.0',
  enableMetrics: true,
  enableTracing: true,
  enableResourceTracking: true,
  enableTraceExtraction: true,
  enableCorrelationId: true,
  enableSystemMetrics: true,
});

// Create telemetry middleware
const telemetryMiddleware = telemetryService.createMiddleware();

// Your route handlers
const getUserHandler = async (context: UnifiedHttpContext) => {
  // Your business logic here
  sendResponse(context, { user: { id: 1, name: 'John Doe' } });
};

// Compose middlewares
const middlewares = [telemetryMiddleware];
const composedHandler = composeMiddleware(middlewares)(getUserHandler);

// Register routes
app.get('/users/:id', createExpressAdapter(composedHandler));

// Start server
app.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

### Configuration Options

```typescript
interface TelemetryMiddlewareConfig {
  /** Service name for telemetry */
  serviceName: string;
  /** Service version for telemetry */
  serviceVersion?: string;
  /** Enable metrics collection */
  enableMetrics?: boolean;
  /** Enable distributed tracing */
  enableTracing?: boolean;
  /** Enable resource tracking (CPU/Memory) */
  enableResourceTracking?: boolean;
  /** Enable trace extraction from headers */
  enableTraceExtraction?: boolean;
  /** Enable correlation ID generation */
  enableCorrelationId?: boolean;
  /** Enable system metrics monitoring */
  enableSystemMetrics?: boolean;
  /** System metrics update interval in milliseconds */
  systemMetricsInterval?: number;
  /** Custom attributes to add to all spans */
  customAttributes?: Record<string, string | number | boolean>;
}
```

## 📊 Metrics Collected

According to the [metrics dashboard requirements](./metrics-dashboard.README.md), this middleware automatically collects:

### Request Metrics
- **`http_requests_total`** (Counter) - Total HTTP requests
  - Labels: `method`, `route`, `status_code`
- **`http_request_duration_seconds`** (Histogram) - Request duration  
  - Labels: `method`, `route`, `status_code`

### Resource Metrics  
- **`http_request_memory_usage_bytes`** (Histogram) - Memory usage per request
  - Labels: `method`, `route`, `status_code`
- **`http_request_cpu_time_seconds`** (Histogram) - CPU time per request
  - Labels: `method`, `route`, `status_code`

### System Metrics
- **`memory_usage_percent`** (Gauge) - System memory usage
  - Labels: `service`, `instance`
- **`cpu_usage_percent`** (Gauge) - System CPU usage
  - Labels: `service`, `instance`

## 🔍 Trace Context Support

### W3C Trace Context (Default)
```
traceparent: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01
tracestate: rojo=00f067aa0ba902b7,congo=t61rcWkgMzE
```

### B3 Headers
```
X-B3-TraceId: 4bf92f3577b34da6a3ce929d0e0e4736
X-B3-SpanId: 00f067aa0ba902b7
X-B3-Sampled: 1
```

## 🔧 Advanced Usage

### Custom Middleware Chain

```typescript
import { UnifiedMiddleware } from '@inh-lib/unified-route';

// Authentication middleware
const authMiddleware: UnifiedMiddleware = async (context, next) => {
  const token = context.request.headers.authorization;
  if (!token) {
    return sendError(context, 'Unauthorized', 401);
  }
  
  const user = await validateToken(token);
  addRegistryItem(context, 'user', user);
  await next();
};

// Validation middleware  
const validationMiddleware: UnifiedMiddleware = async (context, next) => {
  const body = getRequestBody(context);
  if (!isValidRequest(body)) {
    return sendError(context, 'Invalid request', 400);
  }
  await next();
};

// Compose with telemetry
const middlewares = [
  telemetryMiddleware,     // Should be first for complete coverage
  authMiddleware,
  validationMiddleware,
];

const composedHandler = composeMiddleware(middlewares)(routeHandler);
```

### Accessing Telemetry in Handlers

```typescript
import { getRegistryItem } from '@inh-lib/unified-route';
import type { UnifiedTelemetrySpan, UnifiedTelemetryLogger } from '@inh-lib/unified-telemetry-core';

const userHandler = async (context: UnifiedHttpContext) => {
  // Get telemetry span for custom attributes
  const span = getRegistryItem<UnifiedTelemetrySpan>(context, 'telemetry:span');
  if (!(span instanceof Error)) {
    span.setTag('user.tier', 'premium');
    span.setTag('business.operation', 'get_user_profile');
  }

  // Get telemetry logger for contextual logging
  const logger = getRegistryItem<UnifiedTelemetryLogger>(context, 'telemetry:logger');
  if (!(logger instanceof Error)) {
    logger.info('Processing user request', {
      userId: context.request.params.id,
      source: 'user_handler',
    });
  }

  // Your business logic
  const user = await getUserById(context.request.params.id);
  sendResponse(context, { user });
};
```

### Propagating Traces to External Services

```typescript
import { TelemetryMiddlewareService } from '@inh-lib/unified-telemetry-middleware';

const externalApiHandler = async (context: UnifiedHttpContext) => {
  // Get trace headers for outgoing requests
  const traceHeaders = telemetryService.getTraceHeaders(context);
  
  // Make external API call with trace propagation
  const response = await fetch('https://external-api.com/data', {
    headers: {
      ...traceHeaders,  // Propagates W3C or B3 headers
      'Content-Type': 'application/json',
    },
  });
  
  const data = await response.json();
  sendResponse(context, { data });
};
```

### Manual Metrics Recording

```typescript
// Record custom metrics outside of middleware
telemetryService.recordCustomMetrics(
  'POST',           // method
  '/api/users',     // route  
  201,              // statusCode
  0.150,            // durationSeconds
  1024 * 1024,      // memoryBytes (optional)
  0.005             // cpuSeconds (optional)
);
```

### Graceful Shutdown

```typescript
// Graceful shutdown handler
process.on('SIGTERM', async () => {
  console.log('Shutting down gracefully...');
  
  try {
    // Shutdown telemetry (flushes pending data)
    await telemetryService.shutdown();
    console.log('Telemetry shutdown completed');
    
    // Shutdown server
    await server.close();
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
});
```

## 🔗 Integration Examples

### Fastify

```typescript
import Fastify from 'fastify';
import { createFastifyAdapter } from '@inh-lib/unified-route';

const fastify = Fastify({ logger: true });

// Register routes with telemetry
fastify.get('/users/:id', createFastifyAdapter(
  composeMiddleware([telemetryMiddleware])(getUserHandler)
));

await fastify.listen({ port: 3000 });
```

### Hono (Cloudflare Workers)

```typescript
import { Hono } from 'hono';
import { createHonoAdapter } from '@inh-lib/unified-route';

const app = new Hono();

// Register routes with telemetry
app.get('/users/:id', createHonoAdapter(
  composeMiddleware([telemetryMiddleware])(getUserHandler)
));

export default app;
```

## 📊 Dashboard Integration

This middleware is designed to work with the complete dashboard architecture outlined in [metrics-dashboard.README.md](./metrics-dashboard.README.md):

- **Performance Overview Dashboard** - Request rates, response times, resource usage
- **Top 10 Performance Dashboard** - Identify problematic routes
- **Error Analysis Dashboard** - Error rates and patterns
- **Individual Trace Analysis** - Root cause investigation
- **Database Performance Dashboard** - Query performance metrics

## 🧪 Testing

```typescript
import { NoOpUnifiedTelemetryProvider } from '@inh-lib/unified-telemetry-core';
import { TelemetryMiddlewareService } from '@inh-lib/unified-telemetry-middleware';

describe('My Handler', () => {
  let telemetryService: TelemetryMiddlewareService;
  let telemetryMiddleware: UnifiedMiddleware;

  beforeEach(() => {
    // Use NoOp provider for testing
    const provider = new NoOpUnifiedTelemetryProvider({
      serviceName: 'test-service',
      serviceVersion: '1.0.0',
      environment: 'test',
    });

    telemetryService = new TelemetryMiddlewareService(provider, {
      serviceName: 'test-service',
    });

    telemetryMiddleware = telemetryService.createMiddleware();
  });

  afterEach(async () => {
    await telemetryService.shutdown();
  });

  it('should handle requests with telemetry', async () => {
    const context = createMockContext();
    const handler = composeMiddleware([telemetryMiddleware])(mockHandler);
    
    await handler(context);
    
    // Assertions...
  });
});
```

## 🚀 Production Deployment

### Environment Variables

```bash
# OpenTelemetry configuration
OTEL_SERVICE_NAME=my-service
OTEL_SERVICE_VERSION=1.0.0
OTEL_RESOURCE_ATTRIBUTES=deployment.environment=production

# Telemetry configuration
TELEMETRY_ENABLE_METRICS=true
TELEMETRY_ENABLE_TRACING=true
TELEMETRY_ENABLE_RESOURCE_TRACKING=true
TELEMETRY_SYSTEM_METRICS_INTERVAL=10000
```

### Docker Configuration

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy application
COPY . .

# Expose application and metrics ports
EXPOSE 3000 9090

# Set telemetry environment variables
ENV OTEL_SERVICE_NAME=my-service
ENV OTEL_SERVICE_VERSION=1.0.0

CMD ["node", "dist/index.js"]
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup

```bash
# Clone the repository
git clone https://github.com/your-org/unified-telemetry-middleware.git
cd unified-telemetry-middleware

# Install dependencies
npm install

# Run tests
npm test

# Build the library
npm run build
```

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🔗 Related Packages

- [`@inh-lib/unified-route`](https://github.com/your-org/unified-route) - HTTP middleware framework
- [`@inh-lib/unified-telemetry-core`](https://github.com/your-org/unified-telemetry-core) - Core telemetry abstractions
- [`@inh-lib/unified-telemetry-otel`](https://github.com/your-org/unified-telemetry-otel) - OpenTelemetry adapter

## 🐛 Issues & Support

- 🐛 [Report a Bug](https://github.com/your-org/unified-telemetry-middleware/issues/new?template=bug_report.md)
- 💡 [Request a Feature](https://github.com/your-org/unified-telemetry-middleware/issues/new?template=feature_request.md)
- 📖 [Documentation](https://your-org.github.io/unified-telemetry-middleware/)

---

Made with ❤️ by the INH Team