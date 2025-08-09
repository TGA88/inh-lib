# Fastify Telemetry Plugin

> Complete observability solution for Fastify applications with OpenTelemetry integration

## Overview

The Fastify Telemetry Plugin provides comprehensive observability for Fastify applications including distributed tracing, metrics collection, structured logging, and system monitoring. It integrates seamlessly with OpenTelemetry standards and provides both automatic and manual instrumentation capabilities.

## Installation

### Option 1: Fastify Plugin Approach (Recommended)

```bash
npm install @inh-lib/api-util-fastify @inh-lib/unified-telemetry-core fastify
```

### Option 2: UnifiedRoute Middleware Approach

```bash
npm install @inh-lib/api-util-fastify @inh-lib/unified-route @inh-lib/unified-telemetry-middleware @inh-lib/unified-telemetry-core fastify
```

## Quick Start

### Fastify Plugin Setup

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

// Start server with telemetry
fastify.listen({ port: 3000 }, (err) => {
  if (err) throw err;
  console.log('🚀 Server with telemetry running on http://localhost:3000');
});
```

## Instance-based Telemetry Methods

The plugin provides convenient telemetry methods directly on the Fastify instance:

```typescript
// Example: Using telemetry methods in routes
app.get('/api/users', async (request, reply) => {
  // Create child spans for specific operations
  const dbSpan = app.telemetry.createChildSpan('database.query', {
    table: 'users',
    operation: 'select'
  });
  
  try {
    // Get current logger with trace context
    const logger = app.telemetry.getCurrentLogger();
    logger.info('Fetching users from database');
    
    // Simulate database operation
    const users = await getUsersFromDatabase();
    
    dbSpan.setTag('result.count', users.length);
    dbSpan.finish();
    
    return { users };
  } catch (error) {
    dbSpan.recordException(error);
    dbSpan.setStatus({ code: 'ERROR', message: error.message });
    dbSpan.finish();
    throw error;
  }
});

// Get current span information
app.get('/api/trace-info', async (request, reply) => {
  const currentSpan = app.telemetry.getCurrentSpan();
  if (currentSpan) {
    return { 
      hasActiveSpan: true,
      spanContext: 'Available'
    };
  }
  return { hasActiveSpan: false };
});

// Available telemetry methods:
// - app.telemetry.createChildSpan(name, attributes?)
// - app.telemetry.getCurrentSpan()
// - app.telemetry.getCurrentLogger()
// - app.telemetry.createEnhancedContext(request, reply)
// - app.telemetry.createContext(request, reply)

### UnifiedRoute Middleware Setup

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

## API Reference

### TelemetryPluginService

#### `createPlugin(options: TelemetryPluginOptions)`

Creates a Fastify plugin with telemetry capabilities.

**Options:**
- `telemetryProvider`: UnifiedTelemetryProvider instance
- `autoTracing`: Enable automatic request tracing (default: true)
- `serviceName`: Service name for telemetry
- `enableResourceTracking`: Enable CPU/memory tracking (default: false)
- `enableSystemMetrics`: Enable system metrics collection (default: false)
- `skipRoutes`: Array of routes to skip telemetry (default: [])

```typescript
const plugin = TelemetryPluginService.createPlugin({
  telemetryProvider,
  autoTracing: true,
  serviceName: 'my-service',
  enableResourceTracking: true,
  enableSystemMetrics: true,
  skipRoutes: ['/health', '/metrics']
});

await fastify.register(plugin);
```

#### Enhanced Context Methods

After registering the plugin, access telemetry through `fastify.telemetry`:

```typescript
// Create enhanced context with telemetry
const context = fastify.telemetry.createEnhancedContext(req, res);

// Create basic context with telemetry in registry
const context = fastify.telemetry.createContext(req, res);
```

### TelemetryMiddlewareService (UnifiedRoute)

#### `new TelemetryMiddlewareService(provider, config)`

Creates a telemetry middleware service for UnifiedRoute pattern.

**Config:**
- `serviceName`: Service name
- `enableTracing`: Enable distributed tracing
- `enableMetrics`: Enable metrics collection
- `enableResourceTracking`: Enable resource monitoring
- `enableSystemMetrics`: Enable system metrics

#### `createMiddleware()`

Creates the main telemetry middleware (must be first in chain).

```typescript
const middleware = telemetryMiddleware.createMiddleware();
```

#### `createBusinessLogicMiddleware(operationName, options?)`

Creates middleware that wraps business logic with telemetry.

```typescript
const businessMiddleware = telemetryMiddleware.createBusinessLogicMiddleware('operation-name', {
  operationType: 'business',
  layer: 'service',
  attributes: { 'custom.attribute': 'value' }
});
```

#### `createChildSpan(context, operationName, options?)`

Creates a manual child span for complex operations.

```typescript
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

#### `getCurrentSpan(context)` & `getCurrentLogger(context)`

Get current active span and logger from context.

```typescript
const currentSpan = telemetryMiddleware.getCurrentSpan(context);
const currentLogger = telemetryMiddleware.getCurrentLogger(context);
```

## Configuration

### Environment Variables

```bash
# Service configuration
SERVICE_NAME=my-fastify-app
SERVICE_VERSION=1.0.0
NODE_ENV=production

# OpenTelemetry configuration
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317
OTEL_RESOURCE_ATTRIBUTES=service.name=my-fastify-app,service.version=1.0.0

# Tracing configuration
TRACING_SAMPLE_RATE=0.1
ENABLE_TRACING=true
ENABLE_METRICS=true
ENABLE_LOGGING=true

# Resource tracking
ENABLE_RESOURCE_TRACKING=true
ENABLE_SYSTEM_METRICS=true
SYSTEM_METRICS_INTERVAL=30000
```

### Production Configuration

```typescript
const telemetryProvider = new OpenTelemetryProvider({
  serviceName: process.env.SERVICE_NAME || 'fastify-app',
  serviceVersion: process.env.SERVICE_VERSION || '1.0.0',
  enableTracing: process.env.ENABLE_TRACING === 'true',
  enableMetrics: process.env.ENABLE_METRICS === 'true',
  enableLogging: process.env.ENABLE_LOGGING === 'true',
  tracing: {
    endpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
    sampleRate: parseFloat(process.env.TRACING_SAMPLE_RATE || '0.1'),
  },
  metrics: {
    endpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
    interval: 30000,
  },
  logging: {
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  }
});
```

## Features

### Distributed Tracing
- Automatic HTTP request tracing
- Parent-child span relationships
- Trace context propagation
- Custom span attributes
- Exception recording

### Metrics Collection
- HTTP request metrics (count, duration, status codes)
- Resource utilization (CPU, memory)
- System metrics (overall system health)
- Custom business metrics

### Structured Logging
- Automatic request/response logging
- Trace correlation
- Contextual metadata
- Configurable log levels
- JSON structured output

### Resource Tracking
- Per-request CPU usage
- Memory consumption monitoring
- Request duration tracking
- System resource metrics

## Advanced Usage

### Custom Metrics

```typescript
// Record custom metrics manually
telemetryMiddleware.recordCustomMetrics(
  'POST',
  '/api/users',
  201,
  0.150, // duration in seconds
  1024 * 1024, // memory bytes
  0.05 // CPU seconds
);
```

### System Telemetry

```typescript
// Create independent system telemetry
const systemTelemetry = telemetryMiddleware.createSystemTelemetry('my-service');

// Start system monitoring
systemTelemetry.start();

// Stop when shutting down
process.on('SIGTERM', () => {
  systemTelemetry.stop();
});
```

### Trace Headers for Outgoing Requests

```typescript
// Get trace headers for external API calls
const traceHeaders = telemetryMiddleware.getTraceHeaders(context);

const response = await fetch('https://api.external.com/data', {
  headers: {
    ...traceHeaders,
    'Content-Type': 'application/json'
  }
});
```

## Testing

### Unit Testing with Telemetry

```typescript
import { TelemetryPluginService } from '@inh-lib/api-util-fastify';
import { MockTelemetryProvider } from '@inh-lib/unified-telemetry-core/testing';

describe('Telemetry Integration', () => {
  let fastify: FastifyInstance;
  let mockProvider: MockTelemetryProvider;

  beforeEach(async () => {
    mockProvider = new MockTelemetryProvider();
    fastify = Fastify();
    
    await fastify.register(TelemetryPluginService.createPlugin({
      telemetryProvider: mockProvider,
      autoTracing: true,
      serviceName: 'test-service'
    }));
    
    fastify.get('/test', async (req, res) => {
      const context = fastify.telemetry.createEnhancedContext(req, res);
      const span = context.telemetry.span;
      
      span?.setAttributes({ 'test.attribute': 'value' });
      res.send({ status: 'ok' });
    });
  });

  afterEach(async () => {
    await fastify.close();
  });

  test('should create span for request', async () => {
    const response = await fastify.inject({
      method: 'GET',
      url: '/test'
    });

    expect(response.statusCode).toBe(200);
    expect(mockProvider.getSpans()).toHaveLength(1);
    expect(mockProvider.getSpans()[0].attributes['test.attribute']).toBe('value');
  });
});
```

## Troubleshooting

### Common Issues

1. **Plugin not registered**: Ensure the plugin is registered before defining routes
2. **Missing telemetry context**: Check that telemetry middleware is first in the chain
3. **Span not finished**: Always call `finish()` in finally blocks
4. **Memory leaks**: Ensure proper cleanup of telemetry resources

### Debug Mode

```typescript
// Enable debug logging
const telemetryProvider = new OpenTelemetryProvider({
  // ... other config
  logging: {
    level: 'debug'
  }
});
```

### Performance Considerations

- Use sampling for high-traffic applications
- Consider resource tracking impact in production
- Monitor telemetry overhead
- Use appropriate log levels

---

## Related Documentation

- [Unified Fastify Adapter](./unified-fastify-adapter.md)
- [Main README](../README.md)
- [@inh-lib/unified-telemetry-core Documentation](../../unified-telemetry-core/README.md)
- [@inh-lib/unified-telemetry-middleware Documentation](../../unified-telemetry-middleware/README.md)
