# @inh-lib/unified-telemetry

Framework-agnostic telemetry library with OpenTelemetry support for unified-route. Provides consistent observability across different HTTP frameworks while maintaining full framework independence.

## Features

- **Framework Agnostic**: Works with any HTTP framework through unified-route adapters
- **OpenTelemetry Integration**: Built-in support for OpenTelemetry with configurable exporters
- **Comprehensive Observability**: Tracing, metrics, and structured logging
- **Type Safe**: Full TypeScript support with strict type checking
- **Configurable**: Flexible configuration options for different environments
- **Performance Optimized**: Minimal overhead with smart filtering and sampling
- **Extensible**: Abstract interfaces allow custom telemetry implementations

## Installation

```bash
npm install @inh-lib/unified-telemetry @inh-lib/unified-route
```

For OpenTelemetry support (optional):
```bash
npm install @opentelemetry/api @opentelemetry/sdk-node @opentelemetry/auto-instrumentations-node
```

## Quick Start

### 1. Basic Setup

```typescript
import { 
  UnifiedTelemetryService, 
  UnifiedTelemetryMiddleware, 
  UnifiedOpenTelemetryProvider,
  UnifiedTelemetryConfig,
  UnifiedLogLevel 
} from '@inh-lib/unified-telemetry';

const config: UnifiedTelemetryConfig = {
  serviceName: 'my-api-service',
  serviceVersion: '1.0.0',
  environment: 'production',
  tracing: { enabled: true },
  metrics: { enabled: true },
  logging: { enabled: true, level: UnifiedLogLevel.INFO },
};

// Initialize telemetry
const provider = await UnifiedOpenTelemetryProvider.create(config);
const telemetryService = new UnifiedTelemetryService(provider, config);

// Create middleware
const telemetryMiddleware = UnifiedTelemetryMiddleware.create(telemetryService);
```

### 2. Framework Integration

**With Fastify:**
```typescript
import { composeMiddleware } from '@inh-lib/unified-route';
import { createFastifyContext } from '@inh-lib/unified-fastify-adapter';

const middlewareStack = composeMiddleware([telemetryMiddleware]);

const handler = middlewareStack(async (context) => {
  // Your route logic with automatic telemetry
  context.response.status(200).json({ success: true });
});

fastify.get('/api/users', async (request, reply) => {
  const context = createFastifyContext(request, reply);
  await handler(context);
});
```

**With Express:**
```typescript
// Similar pattern with Express adapter
const handler = middlewareStack(async (context) => {
  context.response.status(200).json({ success: true });
});
```

### 3. Advanced Usage

```typescript
import { UnifiedHttpContextWithTelemetry } from '@inh-lib/unified-telemetry';

const handler = middlewareStack(async (context: UnifiedHttpContextWithTelemetry) => {
  const { telemetry } = context;

  // Add custom span events
  telemetry.span.addEvent('user.lookup.started', {
    'user.id': context.request.params.userId,
  });

  // Set custom attributes
  telemetry.span.setTag('user.role', 'admin');

  // Log custom messages
  telemetry.logger.info('Processing user request', {
    userId: context.request.params.userId,
    operation: 'get_user_profile',
  });

  // Record custom metrics
  const userCounter = telemetry.metrics.createCounter(
    'users_processed_total',
    'Total users processed'
  );
  userCounter.add(1, { operation: 'profile_fetch' });

  // Your business logic here
});
```

## Configuration

### UnifiedTelemetryConfig

```typescript
interface UnifiedTelemetryConfig {
  serviceName: string;
  serviceVersion?: string;
  environment?: string;
  tracing?: UnifiedTracingConfig;
  metrics?: UnifiedMetricsConfig;
  logging?: UnifiedLoggingConfig;
}
```

### Tracing Configuration

```typescript
interface UnifiedTracingConfig {
  enabled: boolean;
  endpoint?: string;        // OTLP endpoint
  sampleRate?: number;      // 0.0 to 1.0
  headers?: Record<string, string>;
}
```

### Middleware Options

```typescript
const telemetryMiddleware = UnifiedTelemetryMiddleware.create(telemetryService, {
  includeRequestBody: false,     // Security: don't log request bodies
  includeResponseBody: false,    // Performance: don't log response bodies
  includeHeaders: true,
  excludeHeaders: ['authorization', 'cookie'],
  sensitiveDataMask: '[REDACTED]',
  skipHealthChecks: true,
  healthCheckPaths: ['/health', '/ping'],
  customAttributes: (context) => ({
    'user.id': context.request.headers['x-user-id'] || 'anonymous',
  }),
});
```

## OpenTelemetry Integration

### With OTLP Exporter

```typescript
const config: UnifiedTelemetryConfig = {
  serviceName: 'my-service',
  tracing: {
    enabled: true,
    endpoint: 'http://jaeger:4318/v1/traces',
    headers: { 'Authorization': 'Bearer token' },
  },
  metrics: {
    enabled: true,
    endpoint: 'http://prometheus:4318/v1/metrics',
  },
};
```

### With Custom Implementation

```typescript
import { UnifiedTelemetryProvider } from '@inh-lib/unified-telemetry';

class CustomTelemetryProvider implements UnifiedTelemetryProvider {
  // Implement your custom telemetry logic
}

const customProvider = new CustomTelemetryProvider();
const telemetryService = new UnifiedTelemetryService(customProvider, config);
```

## Automatic Instrumentation

The middleware automatically captures:

- **HTTP Requests**: Method, URL, headers, status codes
- **Response Times**: Request duration and timing
- **Error Tracking**: Exceptions and error status codes
- **Trace Context**: Distributed tracing across services
- **Standard Metrics**: Request counts, latencies, error rates

## Manual Telemetry

For custom operations outside HTTP requests:

```typescript
const mockContext = createMockContext();
const telemetryContext = telemetryService.startRequestTelemetry(mockContext);

try {
  telemetryContext.span.addEvent('custom.operation.started');
  await performCustomOperation();
  telemetryService.finishRequestTelemetry(telemetryContext, 200);
} catch (error) {
  telemetryService.recordException(telemetryContext, error);
  telemetryService.finishRequestTelemetry(telemetryContext, 500);
}
```

## Framework Support

Currently supported through adapters:

- ✅ **Fastify** - via `@inh-lib/unified-fastify-adapter`
- ✅ **Express** - via custom adapter
- ✅ **Koa** - via custom adapter
- ✅ **Hapi** - via custom adapter
- ✅ **Any framework** - with custom adapter

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Framework     │────│  Unified Route   │────│   Telemetry     │
│   (Fastify,     │    │   Adapter        │    │   Middleware    │
│   Express, etc) │    │                  │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                                         │
                                                         ▼
                                               ┌─────────────────┐
                                               │ Telemetry       │
                                               │ Service         │
                                               └─────────────────┘
                                                         │
                                                         ▼
                                               ┌─────────────────┐
                                               │ OpenTelemetry   │
                                               │ Provider        │
                                               └─────────────────┘
```

## Performance Considerations

- **Minimal Overhead**: Efficient span creation and attribute setting
- **Smart Filtering**: Skip health checks and static resources
- **Configurable Sampling**: Control trace volume in high-traffic scenarios
- **Async Operations**: Non-blocking telemetry operations
- **Memory Efficient**: Proper cleanup and resource management

## Security Features

- **Sensitive Data Masking**: Automatic masking of sensitive fields
- **Header Filtering**: Configurable header exclusion
- **Body Exclusion**: Option to exclude request/response bodies
- **Custom Sanitization**: User-defined data sanitization

## Testing

```bash
npm test
npm run test:coverage
npm run test:watch
```

## Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -am 'Add my feature'`
4. Push to the branch: `git push origin feature/my-feature`
5. Submit a pull request

## License

MIT

## Related Packages

- [`@inh-lib/unified-route`](https://npmjs.com/package/@inh-lib/unified-route) - Core routing abstraction
- [`@inh-lib/unified-fastify-adapter`](https://npmjs.com/package/@inh-lib/unified-fastify-adapter) - Fastify adapter