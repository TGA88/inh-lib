# @inh-lib/unified-telemetry-otel

> OpenTelemetry adapter for Unified Telemetry Core - Production-ready OpenTelemetry integration

A comprehensive OpenTelemetry adapter that implements the unified telemetry interfaces with full OpenTelemetry SDK integration. Provides seamless distributed tracing, metrics collection, and structured logging with OpenTelemetry backends.

## ✨ Features

- **🔧 Full OpenTelemetry Integration** - Complete implementation using OpenTelemetry Node SDK
- **📊 Three Pillars Support** - Tracing, Metrics, and Logging with OpenTelemetry standards
- **🏗️ Service-Based Architecture** - Clean service classes without exposing internal types
- **🚀 Production Ready** - Built for enterprise environments with proper resource management
- **🔒 Type Safe** - Fully typed with excellent TypeScript support
- **⚡ Zero Config** - Works out of the box with sensible defaults
- **🛡️ Resource Management** - Proper SDK shutdown and cleanup

## 📦 Installation

```bash
npm install @inh-lib/unified-telemetry-otel @inh-lib/unified-telemetry-core
```

### Peer Dependencies

```bash
npm install @opentelemetry/sdk-node @opentelemetry/api
```

## 🚀 Quick Start

### Basic Setup with NodeSDK

```typescript
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OtelProviderService } from '@inh-lib/unified-telemetry-otel';
import { UnifiedBaseTelemetryLogger } from '@inh-lib/unified-telemetry-core';

// Initialize OpenTelemetry SDK
const sdk = new NodeSDK({
  serviceName: 'my-service',
  serviceVersion: '1.0.0',
  traceExporter: new ConsoleSpanExporter(), // Replace with your exporter
  metricReader: new PeriodicExportingMetricReader({
    exporter: new ConsoleMetricExporter(), // Replace with your exporter
  }),
});

// Start the SDK
sdk.start();

// Create base logger
const baseLogger: UnifiedBaseTelemetryLogger = {
  debug: (msg, attrs) => console.debug(msg, attrs),
  info: (msg, attrs) => console.info(msg, attrs),
  warn: (msg, attrs) => console.warn(msg, attrs),
  error: (msg, attrs) => console.error(msg, attrs),
};

// Create unified telemetry provider
const provider = OtelProviderService.createProvider(
  {
    config: {
      serviceName: 'my-service',
      serviceVersion: '1.0.0',
      environment: 'production',
    },
  },
  baseLogger,
  sdk
);

// Get telemetry components
const { logger, tracer, metrics } = provider;
```

### Simplified Setup with Console Logger

```typescript
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OtelProviderService } from '@inh-lib/unified-telemetry-otel';

const sdk = new NodeSDK({
  serviceName: 'my-service',
  serviceVersion: '1.0.0',
});
sdk.start();

// Create provider with built-in console logger
const provider = OtelProviderService.createProviderWithConsole(
  {
    config: {
      serviceName: 'my-service',
      serviceVersion: '1.0.0',
      environment: 'development',
    },
  },
  sdk
);

const { logger, tracer, metrics } = provider;
```

## 🏗️ Architecture

### Service Layer Design

The adapter follows a clean service-based architecture:

```
@inh-lib/unified-telemetry-otel/
├── services/                 # Public API - Service classes only
│   ├── otel-provider.service.ts
│   ├── otel-tracer.service.ts
│   └── otel-metrics.service.ts
└── internal/                 # Private implementation
    ├── adapters/             # Interface implementations
    ├── logic/               # Business logic
    ├── types/               # Internal types
    ├── utils/               # Utilities
    └── constants/           # Constants
```

**Key Principles:**
- Only service classes are exported - no internal types or implementations
- Clean separation between public API and internal logic
- Full OpenTelemetry SDK integration with proper resource management

### Component Mapping

| Unified Telemetry Interface | OpenTelemetry Implementation |
|----------------------------|------------------------------|
| `UnifiedTelemetryProvider` | `OtelProviderAdapter` + NodeSDK |
| `UnifiedTelemetryTracer` | `OtelTracerAdapter` + OTel Tracer |
| `UnifiedTelemetryMetrics` | `OtelMetricsAdapter` + OTel Meter |
| `UnifiedTelemetrySpan` | `OtelSpanAdapter` + OTel Span |

## 🔧 Advanced Usage

### HTTP Request Tracing

```typescript
import { UNIFIED_SPAN_KIND } from '@inh-lib/unified-telemetry-core';

async function handleRequest(req: Request, res: Response) {
  // Start HTTP span
  const span = tracer.startSpan(`${req.method} ${req.path}`, {
    kind: UNIFIED_SPAN_KIND.SERVER,
    attributes: {
      'http.method': req.method,
      'http.url': req.url,
      'http.route': req.route?.path,
    }
  });

  // Create contextual logger
  const requestLogger = logger.getLogger({
    span,
    options: {
      operationType: 'http',
      operationName: `${req.method} ${req.path}`,
      layer: 'http',
      autoAddSpanEvents: true,
    }
  });

  try {
    requestLogger.info('Processing HTTP request', {
      method: req.method,
      path: req.path,
      userAgent: req.headers['user-agent'],
    });

    // Your request logic here
    const result = await processRequest(req);

    span.setTag('http.status_code', 200);
    requestLogger.info('Request completed successfully');

    res.json(result);
  } catch (error) {
    span.setStatus({ 
      code: 'error', 
      message: error.message 
    });
    
    requestLogger.error('Request failed', error, {
      errorType: error.constructor.name,
    });

    res.status(500).json({ error: 'Internal server error' });
  } finally {
    requestLogger.finishSpan();
  }
}
```

### Database Operations with Tracing

```typescript
async function getUserById(id: string) {
  const span = tracer.startSpan('db.users.findById', {
    kind: UNIFIED_SPAN_KIND.CLIENT,
    attributes: {
      'db.system': 'postgresql',
      'db.operation': 'SELECT',
      'db.table': 'users',
      'user.id': id,
    }
  });

  const dbLogger = logger.getLogger({
    span,
    options: {
      operationType: 'database',
      operationName: 'getUserById',
      layer: 'data',
      autoAddSpanEvents: true,
    }
  });

  try {
    dbLogger.info('Querying user by ID', { userId: id });
    
    const startTime = Date.now();
    const user = await db.users.findById(id);
    const duration = Date.now() - startTime;
    
    span.setTag('db.rows_affected', user ? 1 : 0);
    span.setTag('db.duration_ms', duration);
    
    dbLogger.info('Database query completed', { 
      found: !!user,
      durationMs: duration,
    });
    
    return user;
  } catch (error) {
    dbLogger.error('Database query failed', error, {
      query: 'SELECT * FROM users WHERE id = $1',
      userId: id,
    });
    throw error;
  } finally {
    dbLogger.finishSpan();
  }
}
```

### Metrics Collection

```typescript
// Create application metrics
const requestCounter = metrics.createCounter(
  'http_requests_total',
  'Total number of HTTP requests'
);

const requestDuration = metrics.createHistogram(
  'http_request_duration_ms',
  'HTTP request duration in milliseconds'
);

const activeConnections = metrics.createGauge(
  'active_connections',
  'Number of active connections'
);

// Record metrics in middleware
function metricsMiddleware(req: Request, res: Response, next: Function) {
  const startTime = Date.now();

  // Increment request counter
  requestCounter.add(1, {
    method: req.method,
    route: req.route?.path || 'unknown',
  });

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    // Record response time
    requestDuration.record(duration, {
      method: req.method,
      status: res.statusCode.toString(),
      route: req.route?.path || 'unknown',
    });
  });

  next();
}

// Update gauge periodically
setInterval(() => {
  const connections = getCurrentActiveConnections();
  activeConnections.set(connections);
}, 5000);
```

## 🔌 OpenTelemetry Exporters Integration

### Jaeger Setup

```typescript
import { NodeSDK } from '@opentelemetry/sdk-node';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';

const sdk = new NodeSDK({
  serviceName: 'my-service',
  traceExporter: new JaegerExporter({
    endpoint: 'http://jaeger:14268/api/traces',
  }),
});
```

### Prometheus Metrics

```typescript
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus');
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';

const sdk = new NodeSDK({
  serviceName: 'my-service',
  metricReader: new PrometheusExporter({
    port: 9090,
    endpoint: '/metrics',
  }),
});
```

### OTLP (OpenTelemetry Protocol)

```typescript
import { OTLPTraceExporter } from '@opentelemetry/exporter-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-otlp-http';

const sdk = new NodeSDK({
  serviceName: 'my-service',
  traceExporter: new OTLPTraceExporter({
    url: 'http://otel-collector:4318/v1/traces',
    headers: {
      'Authorization': 'Bearer your-token',
    },
  }),
  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({
      url: 'http://otel-collector:4318/v1/metrics',
    }),
  }),
});
```

## 🧪 Testing

Use the NoOp provider from the core library for testing:

```typescript
import { NoOpUnifiedTelemetryProvider } from '@inh-lib/unified-telemetry-core';

describe('My Service', () => {
  let provider: UnifiedTelemetryProvider;

  beforeEach(() => {
    // Use NoOp provider to avoid telemetry in tests
    provider = new NoOpUnifiedTelemetryProvider({
      serviceName: 'test-service',
      serviceVersion: '1.0.0',
      environment: 'test',
    });
  });

  afterEach(async () => {
    await provider.shutdown();
  });

  it('should handle telemetry calls gracefully', () => {
    const span = provider.tracer.startSpan('test-operation');
    const logger = provider.logger.getLogger({
      span,
      options: {
        operationType: 'business',
        operationName: 'testOperation',
        layer: 'service',
      }
    });

    // All calls are no-ops, won't affect test output
    logger.info('Test message');
    logger.finishSpan();
  });
});
```

## 🔧 Configuration

### Environment Variables

```bash
# OpenTelemetry standard environment variables
OTEL_SERVICE_NAME=my-service
OTEL_SERVICE_VERSION=1.0.0
OTEL_RESOURCE_ATTRIBUTES=deployment.environment=production

# Exporter configuration
OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4317
OTEL_EXPORTER_OTLP_HEADERS=x-api-key=your-api-key

# Sampling configuration
OTEL_TRACES_SAMPLER=parentbased_traceidratio
OTEL_TRACES_SAMPLER_ARG=0.1
```

### Programmatic Configuration

```typescript
import { NodeSDK } from '@opentelemetry/sdk-node';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

const sdk = new NodeSDK({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'my-service',
    [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
    [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: 'production',
    [SemanticResourceAttributes.SERVICE_INSTANCE_ID]: process.env.HOSTNAME,
  }),
  instrumentations: [
    // Add auto-instrumentation
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-fs': {
        enabled: false, // Disable noisy instrumentation
      },
    }),
  ],
});
```

## 🚀 Production Deployment

### Graceful Shutdown

```typescript
import { OtelProviderService } from '@inh-lib/unified-telemetry-otel';

const provider = OtelProviderService.createProvider(options, baseLogger, sdk);

// Graceful shutdown handler
process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  
  try {
    // Shutdown telemetry provider (flushes pending data)
    await provider.shutdown();
    console.log('Telemetry shutdown completed');
    
    // Shutdown other services
    await server.close();
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
});
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

# Expose metrics port
EXPOSE 3000 9090

# Set OpenTelemetry environment variables
ENV OTEL_SERVICE_NAME=my-service
ENV OTEL_SERVICE_VERSION=1.0.0
ENV OTEL_RESOURCE_ATTRIBUTES=deployment.environment=production

CMD ["node", "dist/index.js"]
```

### Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-service
  template:
    metadata:
      labels:
        app: my-service
    spec:
      containers:
      - name: my-service
        image: my-service:latest
        ports:
        - containerPort: 3000
        - containerPort: 9090  # Metrics port
        env:
        - name: OTEL_SERVICE_NAME
          value: "my-service"
        - name: OTEL_SERVICE_VERSION
          value: "1.0.0"
        - name: OTEL_RESOURCE_ATTRIBUTES
          value: "deployment.environment=production,k8s.cluster.name=prod-cluster"
        - name: OTEL_EXPORTER_OTLP_ENDPOINT
          value: "http://otel-collector:4317"
        resources:
          requests:
            memory: "256Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "500m"
```

## 📊 Observability Best Practices

### 1. Structured Logging with Context

```typescript
// Always include relevant context
logger.info('User authentication successful', {
  userId: user.id,
  method: 'oauth',
  provider: 'google',
  sessionId: session.id,
  ip: req.ip,
});
```

### 2. Meaningful Span Names

```typescript
// Good: Specific and actionable
const span = tracer.startSpan('POST /api/users/create');
const span = tracer.startSpan('db.users.insert');
const span = tracer.startSpan('payment.charge.create');

// Bad: Too generic
const span = tracer.startSpan('request');
const span = tracer.startSpan('database');
```

### 3. Rich Span Attributes

```typescript
const span = tracer.startSpan('payment.process', {
  kind: UNIFIED_SPAN_KIND.INTERNAL,
  attributes: {
    'payment.method': 'credit_card',
    'payment.amount': order.total,
    'payment.currency': 'USD',
    'user.id': user.id,
    'order.id': order.id,
  }
});
```

### 4. Error Handling and Observability

```typescript
try {
  await processPayment(order);
} catch (error) {
  // Record exception in span
  span.recordException(error);
  span.setStatus({ code: 'error', message: error.message });
  
  // Log with full context
  logger.error('Payment processing failed', error, {
    orderId: order.id,
    userId: user.id,
    paymentMethod: order.paymentMethod,
    amount: order.total,
    errorCode: error.code,
  });
  
  throw error;
}
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup

```bash
# Clone the repository
git clone https://github.com/your-org/unified-telemetry-otel.git
cd unified-telemetry-otel

# Install dependencies
npm install

# Run tests
npm test

# Build the library
npm run build

# Run linting
npm run lint
```

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🗺️ Roadmap

- [ ] Auto-instrumentation integration
- [ ] Advanced sampling strategies
- [ ] Custom resource detection
- [ ] Performance benchmarks
- [ ] More exporter examples
- [ ] Kubernetes deployment guides

## 🐛 Issues & Support

- 🐛 [Report a Bug](https://github.com/your-org/unified-telemetry-otel/issues/new?template=bug_report.md)
- 💡 [Request a Feature](https://github.com/your-org/unified-telemetry-otel/issues/new?template=feature_request.md)
- 📖 [Documentation](https://your-org.github.io/unified-telemetry-otel/)
- 💬 [Discussions](https://github.com/your-org/unified-telemetry-otel/discussions)

## 🔗 Related Packages

- [`@inh-lib/unified-telemetry-core`](https://github.com/your-org/unified-telemetry-core) - Core telemetry abstractions
- [`@opentelemetry/sdk-node`](https://github.com/open-telemetry/opentelemetry-js) - OpenTelemetry Node.js SDK
- [`@opentelemetry/auto-instrumentations-node`](https://github.com/open-telemetry/opentelemetry-js-contrib) - Auto-instrumentation

---

Made with ❤️ by the INH Team