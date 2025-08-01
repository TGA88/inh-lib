# @inh-lib/unified-telemetry-core

> Core telemetry abstractions - framework and layer agnostic

A comprehensive TypeScript library providing unified telemetry capabilities with structured logging, distributed tracing, and metrics collection. Built with type safety and simplicity in mind.

## ✨ Features

- **🎯 Framework Agnostic** - Works with any TypeScript/JavaScript framework or runtime
- **📊 Three Pillars of Observability** - Logging, Tracing, and Metrics in one unified API
- **🔒 Type Safe** - No `any` types, fully typed interfaces with excellent IntelliSense
- **🚀 Zero Dependencies** - No external HTTP or framework dependencies
- **🔧 Pluggable Providers** - Easy to extend with custom implementations
- **📈 Production Ready** - Includes both development (Console) and production (NoOp) providers
- **🎛️ Union Types** - Uses modern union types instead of enums for better tree-shaking

## 📦 Installation

```bash
npm install @inh-lib/unified-telemetry-core
```

## 🚀 Quick Start

### Basic Setup

```typescript
import { 
  ConsoleUnifiedTelemetryProvider,
  UnifiedTelemetryProvider,
  DEFAULT_TELEMETRY_CONFIG 
} from '@inh-lib/unified-telemetry-core';

// Initialize provider
const provider: UnifiedTelemetryProvider = new ConsoleUnifiedTelemetryProvider({
  ...DEFAULT_TELEMETRY_CONFIG,
  serviceName: 'my-service',
  serviceVersion: '1.0.0',
  environment: 'development'
});

// Get components
const { logger, tracer, metrics } = provider;
```

### Structured Logging with Tracing

```typescript
// Start a span for tracing
const span = tracer.startSpan('user-registration', {
  kind: UNIFIED_SPAN_KIND.SERVER,
  attributes: { 'user.id': '12345' }
});

// Create logger with context
const telemetryLogger = logger.getLogger({
  span,
  options: {
    operationType: 'business',
    operationName: 'registerUser',
    layer: 'service',
    autoAddSpanEvents: true
  }
});

// Log with automatic trace correlation
telemetryLogger.info('Starting user registration', { 
  email: 'user@example.com' 
});

// Handle errors with exception tracking
try {
  // ... business logic
} catch (error) {
  telemetryLogger.error('Registration failed', error, { 
    reason: 'validation_error' 
  });
  span.setStatus({ code: UNIFIED_SPAN_STATUS_CODE.ERROR, message: error.message });
}

// Finish span
telemetryLogger.finishSpan();
```

### Metrics Collection

```typescript
// Create metrics
const requestCounter = metrics.createCounter(
  'http_requests_total', 
  'Total HTTP requests received'
);

const responseTime = metrics.createHistogram(
  'http_request_duration_ms',
  'HTTP request duration in milliseconds'
);

const activeConnections = metrics.createGauge(
  'active_connections',
  'Number of active connections'
);

// Record metrics
requestCounter.add(1, { method: 'POST', route: '/api/users' });
responseTime.record(150, { method: 'POST', status: '200' });
activeConnections.set(42);
```

## 🏗️ Architecture

### Core Components

The library is built around three main components:

1. **Provider** (`UnifiedTelemetryProvider`) - Factory for creating telemetry components
2. **Logger** (`UnifiedTelemetryLogger`) - Structured logging with trace context
3. **Tracer** (`UnifiedTelemetryTracer`) - Distributed tracing spans
4. **Metrics** (`UnifiedTelemetryMetrics`) - Application metrics collection

### Layer-based Architecture

The library supports a layered architecture approach:

- **HTTP Layer** - Web requests, API endpoints
- **Service Layer** - Business logic, domain services  
- **Data Layer** - Database operations, data access
- **Core Layer** - Utilities, shared functionality
- **Integration Layer** - External service calls
- **Custom Layer** - Application-specific operations

### Operation Types

Each telemetry operation can be categorized:

- `http` - HTTP requests and responses
- `business` - Business logic operations
- `database` - Database queries and transactions
- `utility` - Helper functions and utilities
- `integration` - External API calls
- `auth` - Authentication and authorization
- `custom` - Application-specific operations

## 📚 API Reference

### Providers

#### ConsoleUnifiedTelemetryProvider

Development provider that outputs all telemetry to console.

```typescript
const provider = new ConsoleUnifiedTelemetryProvider({
  serviceName: 'my-service',
  serviceVersion: '1.0.0',
  environment: 'development',
  enableLogging: true,
  enableTracing: true,
  enableMetrics: true
});
```

#### NoOpUnifiedTelemetryProvider

Production-ready provider that discards all telemetry (useful for testing or when telemetry is disabled).

```typescript
const provider = new NoOpUnifiedTelemetryProvider({
  serviceName: 'my-service',
  serviceVersion: '1.0.0',
  environment: 'production'
});
```

### Logger Context Options

```typescript
interface UnifiedLoggerOptions {
  operationType: 'http' | 'business' | 'database' | 'utility' | 'integration' | 'auth' | 'custom';
  operationName: string;
  layer: 'http' | 'service' | 'data' | 'core' | 'integration' | 'custom';
  autoAddSpanEvents?: boolean; // Automatically add span events for all log levels
  attributes?: Record<string, string | number | boolean>; // Additional attributes
}
```

### Span Options

```typescript
interface UnifiedSpanOptions {
  kind?: UnifiedSpanKind; // 'internal' | 'server' | 'client' | 'producer' | 'consumer'
  attributes?: Record<string, string | number | boolean>;
  startTime?: Date;
}
```

## 🔌 Implementing Custom Providers

The library is designed to be easily extended with custom providers. All core interfaces follow industry standards and can be mapped to popular telemetry backends like OpenTelemetry, Jaeger, Prometheus, etc.

### Core Interfaces Overview

#### UnifiedTelemetryProvider
Main factory interface that provides access to all telemetry components.

```typescript
interface UnifiedTelemetryProvider {
  readonly logger: UnifiedTelemetryLoggerService;
  readonly tracer: UnifiedTelemetryTracer;
  readonly metrics: UnifiedTelemetryMetrics;
  shutdown(): Promise<void>;
}
```

**Implementation Requirements:**
- Must provide instances of logger service, tracer, and metrics
- `shutdown()` must cleanup resources and flush pending data
- Should handle configuration through constructor

#### UnifiedTelemetryTracer
Distributed tracing interface compatible with OpenTelemetry spans.

```typescript
interface UnifiedTelemetryTracer {
  startSpan(name: string, options?: UnifiedSpanOptions): UnifiedTelemetrySpan;
  getActiveSpan(): UnifiedTelemetrySpan | undefined;
}

interface UnifiedTelemetrySpan {
  setTag(key: string, value: string | number | boolean): UnifiedTelemetrySpan;
  setStatus(status: UnifiedSpanStatus): UnifiedTelemetrySpan;
  recordException(exception: Error): UnifiedTelemetrySpan;
  addEvent(name: string, attributes?: Record<string, string | number | boolean>): UnifiedTelemetrySpan;
  finish(): void;
  getTraceId(): string;
  getSpanId(): string;
  getStartTime(): Date;
}
```

**OpenTelemetry Mapping:**
```typescript
// OpenTelemetry Implementation Example
import { trace, Span } from '@opentelemetry/api';

class OTelUnifiedTracer implements UnifiedTelemetryTracer {
  private tracer = trace.getTracer('my-service');

  startSpan(name: string, options?: UnifiedSpanOptions): UnifiedTelemetrySpan {
    const otelSpan = this.tracer.startSpan(name, {
      kind: this.mapSpanKind(options?.kind),
      attributes: options?.attributes,
      startTime: options?.startTime
    });
    
    return new OTelUnifiedSpan(otelSpan);
  }

  getActiveSpan(): UnifiedTelemetrySpan | undefined {
    const activeSpan = trace.getActiveSpan();
    return activeSpan ? new OTelUnifiedSpan(activeSpan) : undefined;
  }

  private mapSpanKind(kind?: UnifiedSpanKind): SpanKind {
    switch (kind) {
      case 'server': return SpanKind.SERVER;
      case 'client': return SpanKind.CLIENT;
      case 'producer': return SpanKind.PRODUCER;
      case 'consumer': return SpanKind.CONSUMER;
      default: return SpanKind.INTERNAL;
    }
  }
}
```

#### UnifiedTelemetryMetrics
Metrics interface compatible with Prometheus and OpenTelemetry metrics.

```typescript
interface UnifiedTelemetryMetrics {
  createCounter(name: string, description?: string): UnifiedTelemetryCounter;
  createHistogram(name: string, description?: string): UnifiedTelemetryHistogram;
  createGauge(name: string, description?: string): UnifiedTelemetryGauge;
}
```

**Prometheus Integration Example:**
```typescript
import * as prometheus from 'prom-client';

class PrometheusUnifiedMetrics implements UnifiedTelemetryMetrics {
  private registry = new prometheus.Registry();

  createCounter(name: string, description?: string): UnifiedTelemetryCounter {
    const counter = new prometheus.Counter({
      name,
      help: description || name,
      labelNames: ['method', 'status', 'route'] // common labels
    });
    
    this.registry.registerMetric(counter);
    return new PrometheusUnifiedCounter(counter);
  }

  createHistogram(name: string, description?: string): UnifiedTelemetryHistogram {
    const histogram = new prometheus.Histogram({
      name,
      help: description || name,
      labelNames: ['method', 'status', 'route'],
      buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10] // default buckets
    });
    
    this.registry.registerMetric(histogram);
    return new PrometheusUnifiedHistogram(histogram);
  }

  // ... similar for gauge
}
```

#### UnifiedTelemetryLoggerService
Logger service factory for creating contextual loggers.

```typescript
interface UnifiedTelemetryLoggerService {
  getLogger(context: UnifiedLoggerContext): UnifiedTelemetryLogger;
  getBaseLogger(): UnifiedBaseTelemetryLogger;
}

interface UnifiedLoggerContext {
  options: UnifiedLoggerOptions;
  span: UnifiedTelemetrySpan;
}
```

### Complete OpenTelemetry Provider Example

```typescript
import { 
  UnifiedTelemetryProvider,
  UnifiedTelemetryConfig,
  UnifiedLoggerContext,
  UnifiedTelemetryLogger,
  UnifiedBaseTelemetryLogger
} from '@inh-lib/unified-telemetry-core';

import { NodeTracerProvider } from '@opentelemetry/sdk-node';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

export class OpenTelemetryUnifiedProvider implements UnifiedTelemetryProvider {
  public readonly logger: UnifiedTelemetryLoggerService;
  public readonly tracer: UnifiedTelemetryTracer;
  public readonly metrics: UnifiedTelemetryMetrics;
  
  private tracerProvider: NodeTracerProvider;

  constructor(config: UnifiedTelemetryConfig) {
    // Initialize OpenTelemetry
    this.tracerProvider = new NodeTracerProvider({
      resource: new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: config.serviceName,
        [SemanticResourceAttributes.SERVICE_VERSION]: config.serviceVersion,
        [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: config.environment,
      }),
    });

    // Initialize components
    this.tracer = new OTelUnifiedTracer(this.tracerProvider);
    this.metrics = new OTelUnifiedMetrics(config);
    this.logger = new OTelUnifiedLoggerService(config);

    // Register the tracer provider
    this.tracerProvider.register();
  }

  async shutdown(): Promise<void> {
    await this.tracerProvider.shutdown();
  }
}

class OTelUnifiedLoggerService implements UnifiedTelemetryLoggerService {
  constructor(private config: UnifiedTelemetryConfig) {}

  getLogger(context: UnifiedLoggerContext): UnifiedTelemetryLogger {
    // Create structured logger that correlates with OpenTelemetry spans
    return new OTelStructuredLogger(context, this.config);
  }

  getBaseLogger(): UnifiedBaseTelemetryLogger {
    // Return simple logger without telemetry features
    return new SimpleStructuredLogger(this.config);
  }
}

class OTelStructuredLogger implements UnifiedTelemetryLogger {
  constructor(
    private context: UnifiedLoggerContext,
    private config: UnifiedTelemetryConfig
  ) {}

  info(message: string, attributes?: Record<string, unknown>): void {
    // Structured logging with trace correlation
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: 'info',
      message,
      service: this.config.serviceName,
      version: this.config.serviceVersion,
      traceId: this.context.span.getTraceId(),
      spanId: this.context.span.getSpanId(),
      operation: this.context.options.operationName,
      layer: this.context.options.layer,
      ...attributes
    };

    console.log(JSON.stringify(logEntry));

    // Add event to OpenTelemetry span
    if (this.context.options.autoAddSpanEvents) {
      this.context.span.addEvent('log.info', { message, ...attributes });
    }
  }

  // ... implement other methods
}
```

### Integration Patterns

#### 1. Backend Integration Matrix

| Backend | Provider Class | Tracer | Metrics | Logger |
|---------|---------------|---------|---------|---------|
| OpenTelemetry | `OpenTelemetryUnifiedProvider` | ✅ Direct mapping | ✅ OTel Metrics API | ✅ Structured + Span correlation |
| Jaeger | `JaegerUnifiedProvider` | ✅ Jaeger Client | ➖ Prometheus sidecar | ✅ JSON structured |
| Datadog | `DatadogUnifiedProvider` | ✅ DD Trace | ✅ DD Metrics | ✅ DD Logs API |
| AWS X-Ray | `XRayUnifiedProvider` | ✅ X-Ray SDK | ✅ CloudWatch | ✅ CloudWatch Logs |
| Console/Local | `ConsoleUnifiedProvider` | ✅ Console output | ✅ Console output | ✅ Console output |

#### 2. Configuration Mapping

```typescript
// Generic config
const unifiedConfig: UnifiedTelemetryConfig = {
  serviceName: 'my-service',
  serviceVersion: '1.0.0',
  environment: 'production',
  enableTracing: true,
  enableMetrics: true,
  enableLogging: true,
  sampleRate: 0.1
};

// OpenTelemetry specific
const otelProvider = new OpenTelemetryUnifiedProvider({
  ...unifiedConfig,
  providerConfig: {
    jaegerEndpoint: 'http://jaeger:14268/api/traces',
    prometheusPort: 9090,
    logFormat: 'json'
  }
});

// Datadog specific  
const datadogProvider = new DatadogUnifiedProvider({
  ...unifiedConfig,
  providerConfig: {
    datadogApiKey: process.env.DD_API_KEY,
    datadogSite: 'datadoghq.com',
    enableRuntimeMetrics: true
  }
});
```

#### 3. Migration Strategy

```typescript
// Step 1: Start with Console provider for development
const devProvider = new ConsoleUnifiedProvider(config);

// Step 2: Switch to production provider
const prodProvider = process.env.NODE_ENV === 'production'
  ? new OpenTelemetryUnifiedProvider(config)
  : new ConsoleUnifiedProvider(config);

// Step 3: A/B test different providers
const provider = createProvider(config.telemetryBackend, config);

function createProvider(backend: string, config: UnifiedTelemetryConfig) {
  switch (backend) {
    case 'otel': return new OpenTelemetryUnifiedProvider(config);
    case 'datadog': return new DatadogUnifiedProvider(config);
    case 'jaeger': return new JaegerUnifiedProvider(config);
    default: return new ConsoleUnifiedProvider(config);
  }
}
```

### Implementation Checklist

When implementing a new provider, ensure:

- [ ] **UnifiedTelemetryProvider** - Factory creates all components
- [ ] **UnifiedTelemetryTracer** - Maps span lifecycle correctly
- [ ] **UnifiedTelemetrySpan** - Supports tags, events, status, exceptions
- [ ] **UnifiedTelemetryMetrics** - Counter, Histogram, Gauge implementations
- [ ] **UnifiedTelemetryLogger** - Structured logging with trace correlation
- [ ] **Configuration** - Handles provider-specific config in `providerConfig`
- [ ] **Resource Management** - Proper shutdown and cleanup
- [ ] **Error Handling** - Graceful degradation on backend failures
- [ ] **Type Safety** - No `any` types, proper TypeScript support
- [ ] **Testing** - Unit tests with mock backends

## 🔧 Advanced Usage

### HTTP Request Tracing

```typescript
import { UNIFIED_SPAN_KIND } from '@inh-lib/unified-telemetry-core';

function handleHttpRequest(req: Request) {
  // Start HTTP span
  const span = tracer.startSpan(`${req.method} ${req.path}`, {
    kind: UNIFIED_SPAN_KIND.SERVER,
    attributes: {
      'http.method': req.method,
      'http.url': req.url,
      'http.user_agent': req.headers['user-agent']
    }
  });

  // Create HTTP layer logger
  const httpLogger = logger.getLogger({
    span,
    options: {
      operationType: 'http',
      operationName: `${req.method} ${req.path}`,
      layer: 'http',
      autoAddSpanEvents: true,
      attributes: {
        'request.id': req.id,
        'user.id': req.user?.id
      }
    }
  });

  httpLogger.info('Processing HTTP request', {
    method: req.method,
    path: req.path
  });

  // ... handle request

  httpLogger.finishSpan();
}
```

### Database Operations

```typescript
async function getUserById(id: string) {
  const span = tracer.startSpan('db.users.findById', {
    kind: UNIFIED_SPAN_KIND.CLIENT,
    attributes: {
      'db.operation': 'SELECT',
      'db.table': 'users',
      'user.id': id
    }
  });

  const dbLogger = logger.getLogger({
    span,
    options: {
      operationType: 'database',
      operationName: 'getUserById',
      layer: 'data',
      autoAddSpanEvents: true
    }
  });

  try {
    dbLogger.info('Querying user by ID', { userId: id });
    
    const user = await db.users.findById(id);
    
    span.setTag('db.rows_affected', user ? 1 : 0);
    dbLogger.info('Query completed', { found: !!user });
    
    return user;
  } catch (error) {
    dbLogger.error('Database query failed', error);
    throw error;
  } finally {
    dbLogger.finishSpan();
  }
}
```

### Custom Metrics Dashboard

```typescript
class ServiceMetrics {
  private requestCounter = metrics.createCounter(
    'service_requests_total',
    'Total requests processed by service'
  );

  private errorCounter = metrics.createCounter(
    'service_errors_total', 
    'Total errors encountered by service'
  );

  private processingTime = metrics.createHistogram(
    'service_processing_duration_ms',
    'Time spent processing requests'
  );

  recordRequest(operation: string, success: boolean, duration: number) {
    this.requestCounter.add(1, { 
      operation, 
      status: success ? 'success' : 'error' 
    });

    if (!success) {
      this.errorCounter.add(1, { operation });
    }

    this.processingTime.record(duration, { operation });
  }
}
```

## 🧪 Testing

The library provides a NoOp implementation perfect for testing:

```typescript
import { NoOpUnifiedTelemetryProvider } from '@inh-lib/unified-telemetry-core';

describe('My Service', () => {
  let provider: UnifiedTelemetryProvider;

  beforeEach(() => {
    // Use NoOp provider in tests
    provider = new NoOpUnifiedTelemetryProvider();
  });

  afterEach(async () => {
    await provider.shutdown();
  });

  it('should process requests', () => {
    const span = provider.tracer.startSpan('test-operation');
    const logger = provider.logger.getLogger({
      span,
      options: {
        operationType: 'business',
        operationName: 'testOperation',
        layer: 'service'
      }
    });

    // All telemetry calls are no-ops, won't affect test output
    logger.info('Processing test data');
    logger.finishSpan();
  });
});
```

## 🔌 Extending with Custom Providers

Create your own provider by implementing the interfaces:

```typescript
import { 
  UnifiedTelemetryProvider,
  UnifiedTelemetryTracer,
  UnifiedTelemetryMetrics,
  UnifiedTelemetryLoggerService,
  UnifiedTelemetryConfig
} from '@inh-lib/unified-telemetry-core';

export class CustomTelemetryProvider implements UnifiedTelemetryProvider {
  public readonly logger: UnifiedTelemetryLoggerService;
  public readonly tracer: UnifiedTelemetryTracer;
  public readonly metrics: UnifiedTelemetryMetrics;

  constructor(config: UnifiedTelemetryConfig) {
    this.tracer = new CustomTracer(config);
    this.logger = new CustomLoggerService(config);
    this.metrics = new CustomMetrics(config);
  }

  async shutdown(): Promise<void> {
    // Implement cleanup logic
  }
}
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup

```bash
# Clone the repository
git clone https://github.com/your-org/unified-telemetry-core.git

# Install dependencies
npm install

# Run tests
npm test

# Build the library
npm run build
```

### Code Style

- ✅ No `any` types allowed
- ✅ Use union types instead of enums
- ✅ Prefer composition over inheritance
- ✅ Internal utilities are not exported
- ✅ All public APIs must be fully typed

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🗺️ Roadmap

- [ ] OpenTelemetry provider implementation
- [ ] Jaeger provider implementation  
- [ ] Prometheus metrics provider
- [ ] Structured logging with JSON output
- [ ] Async context propagation
- [ ] Performance benchmarks
- [ ] More comprehensive examples

## 🐛 Issues & Support

- 🐛 [Report a Bug](https://github.com/your-org/unified-telemetry-core/issues/new?template=bug_report.md)
- 💡 [Request a Feature](https://github.com/your-org/unified-telemetry-core/issues/new?template=feature_request.md)
- 📖 [Documentation](https://your-org.github.io/unified-telemetry-core/)
- 💬 [Discussions](https://github.com/your-org/unified-telemetry-core/discussions)

---

Made with ❤️ by the INH Team