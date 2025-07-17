// ============================================
// 📁 CHANGELOG.md - VERSION HISTORY
// ============================================
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-01-15

### Added
- 🎉 Initial release of @inh-lib/unified-observability
- 🔗 Unified API for tracing, metrics, and logging
- 📊 Multi-backend support (Jaeger, OpenTelemetry, X-Ray, Prometheus)
- 🎯 Full TypeScript support with strict type checking
- ⚡ Performance optimizations with lazy evaluation
- 🔄 Distributed tracing with automatic context propagation
- 🎨 Framework integrations (Fastify, Express, Hono)
- 📈 Automatic metric and span labeling
- 🛡️ Comprehensive configuration validation
- 🧪 Built-in testing utilities and mocks
- 📖 Complete documentation and examples

### Backend Support
- **Tracing**: Jaeger, OpenTelemetry, AWS X-Ray, Console
- **Metrics**: Prometheus, OpenTelemetry, Console
- **Logging**: INH Logger, Console, Custom adapters

### Framework Integrations
- Fastify plugin with automatic request tracing
- Express middleware
- Hono middleware
- Framework-agnostic design

### Testing
- Mock implementations for all backends
- Internal utility testing support
- Jest configuration and custom matchers
- 90%+ test coverage

## [Unreleased]

### Planned
- 🔮 Additional backend support (Datadog, New Relic)
- 🚀 Performance improvements and benchmarks
- 📊 Enhanced metrics visualizations
- 🎯 More framework integrations
- 🔧 CLI tools for configuration management

---

For migration guides and breaking changes, please refer to the [Migration Guide](docs/MIGRATION.md).

// ============================================
// 📁 CONTRIBUTING.md - CONTRIBUTION GUIDELINES
// ============================================
# Contributing to @inh-lib/unified-observability

We love your input! We want to make contributing to this project as easy and transparent as possible, whether it's:

- Reporting a bug
- Discussing the current state of the code
- Submitting a fix
- Proposing new features
- Becoming a maintainer

## Development Process

We use GitHub to host code, to track issues and feature requests, as well as accept pull requests.

### Pull Requests

1. Fork the repo and create your branch from `main`
2. If you've added code that should be tested, add tests
3. If you've changed APIs, update the documentation
4. Ensure the test suite passes
5. Make sure your code lints
6. Issue that pull request!

### Development Setup

```bash
# Clone your fork
git clone https://github.com/yourusername/unified-observability.git
cd unified-observability

# Install dependencies
npm install

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Build the project
npm run build

# Lint code
npm run lint
npm run lint:fix
```

### Project Structure

```
src/
├── types/           # Core type definitions
├── interfaces/      # Interface definitions  
├── implementations/ # Backend implementations
├── adapters/        # Logger adapters
├── provider/        # Main provider class
├── context/         # Context management
├── internal/        # Internal utilities (for testing)
├── testing/         # Testing utilities
├── integrations/    # Framework integrations
├── validation/      # Configuration validation
├── utils/           # Public utilities
└── index.ts         # Main exports

tests/
├── unit/           # Unit tests
├── integration/    # Integration tests
└── internal/       # Internal utility tests
```

## Code Style

We use ESLint and TypeScript strict mode. Please ensure your code:

- Follows the existing code style
- Includes proper TypeScript types (no `any` types)
- Has comprehensive JSDoc comments for public APIs
- Includes appropriate error handling
- Follows the separation of concerns pattern

### TypeScript Guidelines

```typescript
// ✅ Good - Proper typing
export function createMetricKey(name: string, labels?: UnifiedMetricLabels): string {
  if (!labels || Object.keys(labels).length === 0) {
    return name;
  }
  // ... implementation
}

// ❌ Bad - Using any
export function createMetricKey(name: any, labels?: any): any {
  // ... implementation
}

// ✅ Good - Proper error handling
export function validateConfig(config: UnifiedObservabilityConfig): UnifiedValidationResult {
  try {
    // ... validation logic
  } catch (error) {
    return {
      isValid: false,
      errors: [error instanceof Error ? error.message : String(error)],
      warnings: []
    };
  }
}
```

## Testing

### Unit Tests

Every utility function should have comprehensive unit tests:

```typescript
// tests/internal/metrics-utils.test.ts
import { createMetricKey } from '../../src/internal/metrics-key-utils';

describe('createMetricKey', () => {
  it('should create key without labels', () => {
    expect(createMetricKey('test_metric')).toBe('test_metric');
  });

  it('should create key with labels', () => {
    expect(createMetricKey('test_metric', { env: 'prod' }))
      .toBe('test_metric{env="prod"}');
  });

  it('should handle empty labels', () => {
    expect(createMetricKey('test_metric', {})).toBe('test_metric');
  });
});
```

### Integration Tests

Test complete workflows:

```typescript
// tests/integration/provider.test.ts
describe('Provider Integration', () => {
  it('should handle complete request lifecycle', async () => {
    const provider = createMockProvider();
    const context = provider.createRootContext('TestRequest');
    
    // Test complete flow
    context.info('Request started');
    const childContext = context.createChild('BusinessLogic');
    childContext.info('Processing...');
    context.finish();
    
    // Verify expectations
    expect(context.isFinished()).toBe(true);
  });
});
```

### Test Coverage

We aim for 90%+ test coverage. Run coverage reports:

```bash
npm run test:coverage
```

## Documentation

### API Documentation

All public APIs must have JSDoc comments:

```typescript
/**
 * Creates a unified observability provider with the given configuration.
 * 
 * @param config - The configuration object
 * @returns A configured provider instance
 * @throws {UnifiedConfigurationError} When configuration is invalid
 * 
 * @example
 * ```typescript
 * const provider = UnifiedObservabilityFactory.createProvider({
 *   serviceName: 'my-service',
 *   logging: { backend: 'console' }
 * });
 * ```
 */
export function createProvider(config: UnifiedObservabilityConfig): UnifiedObservabilityProvider {
  // ... implementation
}
```

### README Updates

When adding new features, update the README with:

- Usage examples
- Configuration options
- Integration guides
- Migration notes (if applicable)

## Adding New Backends

### Tracer Implementation

```typescript
// src/implementations/tracers/my-tracer.ts
export class UnifiedMyTracer implements UnifiedTracer {
  constructor(config: UnifiedMyTracerConfig) {
    // Initialize your tracer
  }

  startSpan(operationName: string, parentSpan?: UnifiedSpan, options?: UnifiedSpanOptions): UnifiedSpan {
    // Implementation
  }

  finishSpan(span: UnifiedSpan): void {
    // Implementation
  }

  setTag(span: UnifiedSpan, key: string, value: string | number | boolean): void {
    // Implementation
  }

  // ... other methods
}
```

### Metrics Implementation

```typescript
// src/implementations/metrics/my-metrics.ts
export class UnifiedMyMetrics implements UnifiedMetricsRegistry {
  counter(name: string, help?: string, labelNames?: string[]): UnifiedCounter {
    // Implementation
  }

  gauge(name: string, help?: string, labelNames?: string[]): UnifiedGauge {
    // Implementation
  }

  // ... other methods
}
```

### Configuration Types

```typescript
// src/config/types.ts
export interface UnifiedMyTracerConfig {
  endpoint?: string;
  apiKey?: string;
  timeout?: number;
}

export interface UnifiedMyMetricsConfig {
  endpoint?: string;
  flushInterval?: number;
}
```

### Tests

```typescript
// tests/implementations/my-tracer.test.ts
describe('UnifiedMyTracer', () => {
  it('should create spans correctly', () => {
    const tracer = new UnifiedMyTracer({ endpoint: 'http://localhost' });
    const span = tracer.startSpan('test-operation');
    
    expect(span.operationName).toBe('test-operation');
    expect(span.spanId).toBeDefined();
    expect(span.traceId).toBeDefined();
  });
});
```

## Framework Integration

### Adding New Framework Support

```typescript
// src/integrations/my-framework.ts
export interface UnifiedMyFrameworkOptions {
  provider: UnifiedObservabilityProvider;
  ignorePaths?: string[];
  extractUserContext?: (request: unknown) => Record<string, unknown>;
}

export function createUnifiedMyFrameworkPlugin(options: UnifiedMyFrameworkOptions) {
  return async function unifiedObservabilityPlugin(app: unknown) {
    // Framework-specific implementation
  };
}
```

## Bug Reports

We use GitHub issues to track public bugs. Report a bug by [opening a new issue](https://github.com/inh-lib/unified-observability/issues/new).

**Great Bug Reports** tend to have:

- A quick summary and/or background
- Steps to reproduce
  - Be specific!
  - Give sample code if you can
- What you expected would happen
- What actually happens
- Notes (possibly including why you think this might be happening, or stuff you tried that didn't work)

## Feature Requests

We welcome feature requests! Please:

1. Check existing issues to avoid duplicates
2. Clearly describe the feature and its benefits
3. Provide usage examples
4. Consider implementation complexity
5. Be prepared to contribute code if possible

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Code of Conduct

This project adheres to the Contributor Covenant [code of conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## Getting Help

- 📖 Read the [documentation](README.md)
- 💬 Join our [discussions](https://github.com/inh-lib/unified-observability/discussions)
- 🐛 Report [issues](https://github.com/inh-lib/unified-observability/issues)
- 📧 Contact maintainers: [maintainers@inh-lib.com](mailto:maintainers@inh-lib.com)

## Recognition

Contributors will be recognized in:
- README.md contributors section
- CHANGELOG.md for significant contributions
- GitHub releases

Thank you for contributing! 🎉

// ============================================
// 📁 LICENSE - MIT LICENSE
// ============================================
MIT License

Copyright (c) 2024 INH Team

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

// ============================================
// 📁 examples/basic-usage.ts - BASIC USAGE EXAMPLE
// ============================================
/**
 * Basic usage example of @inh-lib/unified-observability
 */

import { UnifiedObservabilityFactory } from '@inh-lib/unified-observability';

async function basicUsageExample() {
  // Create provider from environment variables
  const provider = UnifiedObservabilityFactory.createFromEnvironment('basic-example');
  
  // Create root context for main operation
  const mainContext = provider.createRootContext('ProcessData');
  
  mainContext.info('Starting data processing', { 
    timestamp: new Date().toISOString(),
    version: '1.0.0' 
  });
  
  // Add tags for better filtering
  mainContext.setTag('operation.type', 'batch_process');
  mainContext.setTag('data.size', 1000);
  
  // Create metrics
  const processCounter = mainContext.counter('data_processed_total');
  const processingTime = mainContext.histogram('data_processing_duration_ms');
  
  // Process data with timing
  const result = await processingTime.time(async () => {
    // Create child context for database operations
    const dbContext = mainContext.createChild('DatabaseOperation');
    
    dbContext.info('Connecting to database');
    await simulateAsync(100); // Simulate DB connection
    
    dbContext.info('Querying data', { table: 'users', limit: 1000 });
    const data = await simulateAsync(300); // Simulate query
    
    dbContext.info('Data retrieved', { 
      rowCount: 1000,
      queryTime: '300ms' 
    });
    
    // Create child context for processing
    const processContext = mainContext.createChild('DataProcessing');
    
    processContext.info('Starting data transformation');
    
    // Simulate processing each item
    for (let i = 0; i < 1000; i++) {
      if (i % 100 === 0) {
        processContext.debug('Processing progress', { 
          processed: i,
          total: 1000,
          percentage: (i / 1000) * 100 
        });
      }
      
      // Simulate processing time
      await simulateAsync(1);
    }
    
    processContext.info('Data transformation completed', { 
      processed: 1000,
      errors: 0 
    });
    
    return { processed: 1000, errors: 0 };
  });
  
  // Update metrics
  processCounter.add(result.processed, { status: 'success' });
  
  // Log completion
  mainContext.info('Data processing completed', {
    ...result,
    totalDuration: mainContext.getDuration()
  });
  
  // Always finish the context
  mainContext.finish();
  
  // Shutdown provider when application terminates
  await provider.shutdown();
}

// Helper function to simulate async operations
async function simulateAsync(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Run the example
if (require.main === module) {
  basicUsageExample().catch(console.error);
}

// ============================================
// 📁 examples/web-server.ts - WEB SERVER EXAMPLE
// ============================================
/**
 * Complete web server example with observability
 */

import express from 'express';
import { UnifiedObservabilityFactory } from '@inh-lib/unified-observability';

interface User {
  id: string;
  name: string;
  email: string;
}

class UserService {
  private users: User[] = [
    { id: '1', name: 'John Doe', email: 'john@example.com' },
    { id: '2', name: 'Jane Smith', email: 'jane@example.com' }
  ];

  async getUser(id: string, context: any): Promise<User | null> {
    const dbContext = context.createChild('UserDatabase');
    
    dbContext.info('Querying user', { userId: id });
    
    // Simulate database query
    await new Promise(resolve => setTimeout(resolve, 50));
    
    const user = this.users.find(u => u.id === id);
    
    if (user) {
      dbContext.info('User found', { userId: id, userName: user.name });
    } else {
      dbContext.warn('User not found', { userId: id });
    }
    
    return user || null;
  }

  async createUser(userData: Omit<User, 'id'>, context: any): Promise<User> {
    const dbContext = context.createChild('UserDatabase');
    
    dbContext.info('Creating user', { email: userData.email });
    
    // Simulate database insertion
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const newUser: User = {
      id: Math.random().toString(36).substr(2, 9),
      ...userData
    };
    
    this.users.push(newUser);
    
    dbContext.info('User created', { 
      userId: newUser.id,
      email: newUser.email 
    });
    
    return newUser;
  }
}

async function createWebServer() {
  // Initialize observability
  const provider = UnifiedObservabilityFactory.createProvider({
    serviceName: 'user-api',
    serviceVersion: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    tracing: { 
      backend: 'console',
      enabled: true 
    },
    metrics: { 
      backend: 'console',
      enabled: true 
    },
    logging: { 
      backend: 'console',
      level: 'info' 
    }
  });
  
  const app = express();
  const userService = new UserService();
  
  app.use(express.json());
  
  // Observability middleware
  app.use((req, res, next) => {
    const context = provider.createRootContext(`${req.method} ${req.path}`);
    
    // Add request information
    context.setTag('http.method', req.method);
    context.setTag('http.url', req.url);
    context.setTag('http.user_agent', req.get('user-agent') || 'unknown');
    
    context.info('Request started', {
      method: req.method,
      url: req.url,
      userAgent: req.get('user-agent'),
      ip: req.ip
    });
    
    (req as any).observability = context;
    
    // Response logging
    res.on('finish', () => {
      context.setTag('http.status_code', res.statusCode);
      
      const level = res.statusCode >= 500 ? 'error' : 
                   res.statusCode >= 400 ? 'warn' : 'info';
      
      context[level]('Request completed', {
        statusCode: res.statusCode,
        duration: context.getDuration()
      });
      
      context.finish();
    });
    
    next();
  });
  
  // Health check endpoint
  app.get('/health', (req, res) => {
    const context = (req as any).observability;
    context.info('Health check requested');
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
  });
  
  // Get user endpoint
  app.get('/api/users/:id', async (req, res) => {
    const context = (req as any).observability;
    const { id } = req.params;
    
    try {
      const user = await userService.getUser(id, context);
      
      if (user) {
        // Update metrics
        const counter = context.counter('user_requests_total');
        counter.increment({ operation: 'get_user', status: 'success' });
        
        res.json(user);
      } else {
        context.warn('User not found', { userId: id });
        
        const counter = context.counter('user_requests_total');
        counter.increment({ operation: 'get_user', status: 'not_found' });
        
        res.status(404).json({ error: 'User not found' });
      }
    } catch (error) {
      context.error('Error retrieving user', {
        userId: id,
        error: error instanceof Error ? error.message : String(error)
      });
      
      const counter = context.counter('user_requests_total');
      counter.increment({ operation: 'get_user', status: 'error' });
      
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  // Create user endpoint
  app.post('/api/users', async (req, res) => {
    const context = (req as any).observability;
    const { name, email } = req.body;
    
    // Validate input
    if (!name || !email) {
      context.warn('Invalid user data', { name, email });
      return res.status(400).json({ error: 'Name and email are required' });
    }
    
    try {
      const user = await userService.createUser({ name, email }, context);
      
      // Update metrics
      const counter = context.counter('user_requests_total');
      counter.increment({ operation: 'create_user', status: 'success' });
      
      const userGauge = context.gauge('total_users');
      userGauge.increment();
      
      context.info('User created successfully', { 
        userId: user.id,
        email: user.email 
      });
      
      res.status(201).json(user);
    } catch (error) {
      context.error('Error creating user', {
        email,
        error: error instanceof Error ? error.message : String(error)
      });
      
      const counter = context.counter('user_requests_total');
      counter.increment({ operation: 'create_user', status: 'error' });
      
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  // Metrics endpoint
  app.get('/metrics', (req, res) => {
    const context = (req as any).observability;
    context.info('Metrics requested');
    
    if (provider.metrics) {
      res.set('Content-Type', 'text/plain');
      res.send(provider.metrics.getMetrics());
    } else {
      res.status(503).json({ error: 'Metrics not available' });
    }
  });
  
  // Error handling middleware
  app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    const context = (req as any).observability;
    
    if (context) {
      context.error('Unhandled error', {
        error: err.message,
        stack: err.stack
      });
    }
    
    res.status(500).json({ error: 'Internal server error' });
  });
  
  const PORT = process.env.PORT || 3000;
  
  app.listen(PORT, () => {
    const appContext = provider.createRootContext('ApplicationStartup');
    appContext.info('Server started', { 
      port: PORT,
      environment: process.env.NODE_ENV || 'development'
    });
    appContext.finish();
  });
  
  // Graceful shutdown
  process.on('SIGTERM', async () => {
    const shutdownContext = provider.createRootContext('ApplicationShutdown');
    shutdownContext.info('Received SIGTERM, starting graceful shutdown');
    
    await provider.shutdown();
    
    shutdownContext.info('Graceful shutdown completed');
    shutdownContext.finish();
    
    process.exit(0);
  });
}

// Start the server
if (require.main === module) {
  createWebServer().catch(console.error);
}

// ============================================
// 📁 examples/distributed-tracing.ts - DISTRIBUTED TRACING EXAMPLE
// ============================================
/**
 * Distributed tracing example across multiple services
 */

import express from 'express';
import fetch from 'node-fetch';
import { UnifiedObservabilityFactory } from '@inh-lib/unified-observability';

// Service A: Order Service
async function createOrderService() {
  const provider = UnifiedObservabilityFactory.createProvider({
    serviceName: 'order-service',
    serviceVersion: '1.0.0',
    environment: 'development',
    tracing: { backend: 'console', enabled: true },
    metrics: { backend: 'console', enabled: true },
    logging: { backend: 'console', level: 'info' }
  });
  
  const app = express();
  app.use(express.json());
  
  // Middleware to create observability context
  app.use((req, res, next) => {
    // Extract parent context from headers (for distributed tracing)
    const parentContext = provider.tracer?.extract('http_headers', req.headers as Record<string, string>);
    
    // Create root context (will be linked to parent if exists)
    const context = provider.createRootContext(`${req.method} ${req.path}`, parentContext);
    
    context.info('Order service request', {
      method: req.method,
      path: req.path,
      traceId: context.getTraceId(),
      parentTrace: parentContext ? 'yes' : 'no'
    });
    
    (req as any).observability = context;
    
    res.on('finish', () => {
      context.info('Order service response', {
        statusCode: res.statusCode,
        duration: context.getDuration()
      });
      context.finish();
    });
    
    next();
  });
  
  // Process order endpoint
  app.post('/api/orders', async (req, res) => {
    const context = (req as any).observability;
    const { userId, items, totalAmount } = req.body;
    
    try {
      context.info('Processing order', { userId, totalAmount });
      
      // Step 1: Validate order
      const validationContext = context.createChild('ValidateOrder');
      validationContext.info('Validating order data');
      
      if (!userId || !items || !totalAmount) {
        validationContext.warn('Invalid order data');
        return res.status(400).json({ error: 'Missing required fields' });
      }
      
      // Step 2: Call Payment Service
      const paymentContext = context.createChild('PaymentService');
      const paymentResult = await callPaymentService(totalAmount, paymentContext);
      
      if (!paymentResult.success) {
        context.error('Payment failed', { reason: paymentResult.error });
        return res.status(400).json({ error: 'Payment failed' });
      }
      
      // Step 3: Call Inventory Service
      const inventoryContext = context.createChild('InventoryService');
      const inventoryResult = await callInventoryService(items, inventoryContext);
      
      if (!inventoryResult.success) {
        context.error('Inventory check failed', { reason: inventoryResult.error });
        return res.status(400).json({ error: 'Inventory unavailable' });
      }
      
      // Step 4: Create order
      const orderContext = context.createChild('CreateOrder');
      const orderId = await createOrder(userId, items, totalAmount, orderContext);
      
      context.info('Order created successfully', { 
        orderId,
        userId,
        totalAmount 
      });
      
      res.status(201).json({ 
        orderId,
        status: 'created',
        totalAmount 
      });
      
    } catch (error) {
      context.error('Order processing failed', {
        error: error instanceof Error ? error.message : String(error)
      });
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  async function callPaymentService(amount: number, context: any): Promise<{ success: boolean; error?: string }> {
    const headers = context.getTraceHeaders();
    
    context.info('Calling payment service', { amount });
    
    try {
      const response = await fetch('http://localhost:3001/api/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers // Include trace headers
        },
        body: JSON.stringify({ amount })
      });
      
      const result = await response.json();
      
      if (response.ok) {
        context.info('Payment successful', { transactionId: result.transactionId });
        return { success: true };
      } else {
        context.warn('Payment failed', { error: result.error });
        return { success: false, error: result.error };
      }
    } catch (error) {
      context.error('Payment service error', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      return { success: false, error: 'Payment service unavailable' };
    }
  }
  
  async function callInventoryService(items: any[], context: any): Promise<{ success: boolean; error?: string }> {
    const headers = context.getTraceHeaders();
    
    context.info('Calling inventory service', { itemCount: items.length });
    
    try {
      const response = await fetch('http://localhost:3002/api/inventory/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers // Include trace headers
        },
        body: JSON.stringify({ items })
      });
      
      const result = await response.json();
      
      if (response.ok) {
        context.info('Inventory check successful', { available: result.available });
        return { success: result.available };
      } else {
        context.warn('Inventory check failed', { error: result.error });
        return { success: false, error: result.error };
      }
    } catch (error) {
      context.error('Inventory service error', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      return { success: false, error: 'Inventory service unavailable' };
    }
  }
  
  async function createOrder(userId: string, items: any[], totalAmount: number, context: any): Promise<string> {
    context.info('Creating order record', { userId, totalAmount });
    
    // Simulate database operation
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const orderId = `order-${Date.now()}`;
    
    context.info('Order record created', { orderId });
    
    return orderId;
  }
  
  app.listen(3000, () => {
    console.log('Order Service running on port 3000');
  });
}

// Service B: Payment Service
async function createPaymentService() {
  const provider = UnifiedObservabilityFactory.createProvider({
    serviceName: 'payment-service',
    serviceVersion: '1.0.0',
    environment: 'development',
    tracing: { backend: 'console', enabled: true },
    metrics: { backend: 'console', enabled: true },
    logging: { backend: 'console', level: 'info' }
  });
  
  const app = express();
  app.use(express.json());
  
  // Middleware with distributed tracing support
  app.use((req, res, next) => {
    const parentContext = provider.tracer?.extract('http_headers', req.headers as Record<string, string>);
    const context = provider.createRootContext(`${req.method} ${req.path}`, parentContext);
    
    context.info('Payment service request', {
      method: req.method,
      path: req.path,
      hasParentTrace: !!parentContext
    });
    
    (req as any).observability = context;
    
    res.on('finish', () => {
      context.finish();
    });
    
    next();
  });
  
  // Process payment endpoint
  app.post('/api/payments', async (req, res) => {
    const context = (req as any).observability;
    const { amount } = req.body;
    
    try {
      context.info('Processing payment', { amount });
      
      // Simulate payment processing
      const processingContext = context.createChild('PaymentProcessing');
      processingContext.info('Validating payment data');
      
      if (amount <= 0) {
        processingContext.warn('Invalid amount');
        return res.status(400).json({ error: 'Invalid amount' });
      }
      
      // Simulate payment gateway call
      const gatewayContext = context.createChild('PaymentGateway');
      gatewayContext.info('Calling payment gateway');
      
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Simulate random failures
      if (Math.random() < 0.1) {
        gatewayContext.error('Payment gateway error');
        return res.status(500).json({ error: 'Payment gateway error' });
      }
      
      const transactionId = `txn-${Date.now()}`;
      
      gatewayContext.info('Payment processed', { transactionId });
      
      res.json({ 
        success: true,
        transactionId,
        amount 
      });
      
    } catch (error) {
      context.error('Payment processing failed', {
        error: error instanceof Error ? error.message : String(error)
      });
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  app.listen(3001, () => {
    console.log('Payment Service running on port 3001');
  });
}

// Service C: Inventory Service
async function createInventoryService() {
  const provider = UnifiedObservabilityFactory.createProvider({
    serviceName: 'inventory-service',
    serviceVersion: '1.0.0',
    environment: 'development',
    tracing: { backend: 'console', enabled: true },
    metrics: { backend: 'console', enabled: true },
    logging: { backend: 'console', level: 'info' }
  });
  
  const app = express();
  app.use(express.json());
  
  // Middleware with distributed tracing support
  app.use((req, res, next) => {
    const parentContext = provider.tracer?.extract('http_headers', req.headers as Record<string, string>);
    const context = provider.createRootContext(`${req.method} ${req.path}`, parentContext);
    
    (req as any).observability = context;
    
    res.on('finish', () => {
      context.finish();
    });
    
    next();
  });
  
  // Check inventory endpoint
  app.post('/api/inventory/check', async (req, res) => {
    const context = (req as any).observability;
    const { items } = req.body;
    
    try {
      context.info('Checking inventory', { itemCount: items.length });
      
      // Simulate inventory check
      const checkContext = context.createChild('InventoryCheck');
      
      for (const item of items) {
        checkContext.debug('Checking item', { itemId: item.id, quantity: item.quantity });
        
        // Simulate database lookup
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      // Simulate random stock unavailability
      const available = Math.random() > 0.2;
      
      checkContext.info('Inventory check completed', { available });
      
      res.json({ available });
      
    } catch (error) {
      context.error('Inventory check failed', {
        error: error instanceof Error ? error.message : String(error)
      });
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  app.listen(3002, () => {
    console.log('Inventory Service running on port 3002');
  });
}

// Start all services
async function startDistributedSystem() {
  console.log('Starting distributed tracing example...');
  
  await Promise.all([
    createOrderService(),
    createPaymentService(),
    createInventoryService()
  ]);
  
  console.log('All services started!');
  console.log('Test with: curl -X POST http://localhost:3000/api/orders -H "Content-Type: application/json" -d \'{"userId":"user-123","items":[{"id":"item-1","quantity":2}],"totalAmount":99.99}\'');
}

if (require.main === module) {
  startDistributedSystem().catch(console.error);
}

// ============================================
// 📁 tests/internal/logging-utils.test.ts - INTERNAL UTILS TESTS
// ============================================
import { UnifiedMockLogger, createMockContext } from '../../src/testing';
import { enrichLogData, logWithSpan, logError, logFatal } from '../../src/internal';

describe('LoggingUtils', () => {
  let context: ReturnType<typeof createMockContext>;
  let mockLogger: UnifiedMockLogger;

  beforeEach(() => {
    mockLogger = new UnifiedMockLogger();
    context = createMockContext();
    // Replace logger with mock
    (context.provider as any).logger = mockLogger;
  });

  describe('enrichLogData', () => {
    it('should enrich log data with context information', () => {
      const data = { userId: 123 };
      const enriched = enrichLogData(context, data);

      expect(enriched).toMatchObject({
        contextId: context.contextId,
        operationName: context.operationName,
        serviceName: context.provider.serviceName,
        serviceVersion: context.provider.serviceVersion,
        environment: context.provider.environment,
        userId: 123
      });
    });

    it('should include tracing information when span exists', () => {
      const enriched = enrichLogData(context);

      expect(enriched.traceId).toBeDefined();
      expect(enriched.spanId).toBeDefined();
    });

    it('should include duration', () => {
      const enriched = enrichLogData(context);
      expect(typeof enriched.duration).toBe('number');
      expect(enriched.duration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('logWithSpan', () => {
    it('should log to logger and add span log', () => {
      logWithSpan(context, 'info', 'Test message', { data: 'test' });

      const logs = mockLogger.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0]).toMatchObject({
        level: 'info',
        message: 'Test message'
      });
    });

    it('should handle different log levels', () => {
      logWithSpan(context, 'debug', 'Debug message');
      logWithSpan(context, 'warn', 'Warning message');
      logWithSpan(context, 'error', 'Error message');

      const logs = mockLogger.getLogs();
      expect(logs).toHaveLength(3);
      expect(logs[0].level).toBe('debug');
      expect(logs[1].level).toBe('warn');
      expect(logs[2].level).toBe('error');
    });
  });

  describe('logError', () => {
    it('should log error and mark span as error', () => {
      logError(context, 'Error occurred', { errorCode: 500 });

      const logs = mockLogger.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0]).toMatchObject({
        level: 'error',
        message: 'Error occurred'
      });

      // Verify span is marked as error
      if (context.span) {
        expect(context.span.tags.error).toBe(true);
      }
    });
  });

  describe('logFatal', () => {
    it('should log fatal error and mark span with error kind', () => {
      logFatal(context, 'Fatal error', { critical: true });

      const logs = mockLogger.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0]).toMatchObject({
        level: 'fatal',
        message: 'Fatal error'
      });

      // Verify span is marked with fatal error
      if (context.span) {
        expect(context.span.tags.error).toBe(true);
        expect(context.span.tags['error.kind']).toBe('fatal');
      }
    });
  });
});

// ============================================
// 📁 tests/internal/tracing-utils.test.ts - TRACING UTILS TESTS
// ============================================
import { UnifiedMockTracer, createMockProvider } from '../../src/testing';
import { 
  createSpanFromContext, 
  setSpanTag, 
  setSpanError, 
  getTraceHeaders, 
  finishSpan 
} from '../../src/internal';

describe('TracingUtils', () => {
  let provider: ReturnType<typeof createMockProvider>;
  let mockTracer: UnifiedMockTracer;

  beforeEach(() => {
    mockTracer = new UnifiedMockTracer();
    provider = createMockProvider();
    (provider as any).tracer = mockTracer;
  });

  describe('createSpanFromContext', () => {
    it('should create root span when no parent provided', () => {
      const context = provider.createRootContext('TestOperation');
      const span = createSpanFromContext(context, 'TestOperation');

      expect(span).toBeDefined();
      expect(span?.operationName).toBe('TestOperation');
      expect(span?.parentSpanId).toBeUndefined();
    });

    it('should create child span when parent span provided', () => {
      const parentContext = provider.createRootContext('ParentOperation');
      const childContext = provider.createRootContext('ChildOperation');
      
      const span = createSpanFromContext(childContext, 'ChildOperation', parentContext.span);

      expect(span).toBeDefined();
      expect(span?.operationName).toBe('ChildOperation');
      expect(span?.parentSpanId).toBe(parentContext.span?.spanId);
    });

    it('should return undefined when no tracer available', () => {
      (provider as any).tracer = undefined;
      const context = provider.createRootContext('TestOperation');
      const span = createSpanFromContext(context, 'TestOperation');

      expect(span).toBeUndefined();
    });
  });

  describe('setSpanTag', () => {
    it('should set tag on span', () => {
      const context = provider.createRootContext('TestOperation');
      setSpanTag(context, 'test.key', 'test.value');

      expect(context.span?.tags['test.key']).toBe('test.value');
    });

    it('should handle different value types', () => {
      const context = provider.createRootContext('TestOperation');
      
      setSpanTag(context, 'string.key', 'string.value');
      setSpanTag(context, 'number.key', 123);
      setSpanTag(context, 'boolean.key', true);

      expect(context.span?.tags['string.key']).toBe('string.value');
      expect(context.span?.tags['number.key']).toBe(123);
      expect(context.span?.tags['boolean.key']).toBe(true);
    });
  });

  describe('setSpanError', () => {
    it('should set error from Error object', () => {
      const context = provider.createRootContext('TestOperation');
      const error = new Error('Test error');
      
      setSpanError(context, error);

      expect(context.span?.tags.error).toBe(true);
      expect(context.span?.tags['error.message']).toBe('Test error');
    });

    it('should set error from UnifiedErrorInfo', () => {
      const context = provider.createRootContext('TestOperation');
      const errorInfo = {
        message: 'Custom error',
        code: 'ERR_001',
        type: 'ValidationError'
      };
      
      setSpanError(context, errorInfo);

      expect(context.span?.tags.error).toBe(true);
      expect(context.span?.tags['error.message']).toBe('Custom error');
    });
  });

  describe('getTraceHeaders', () => {
    it('should return trace headers', () => {
      const context = provider.createRootContext('TestOperation');
      const headers = getTraceHeaders(context);

      expect(headers).toBeDefined();
      expect(headers['x-trace-id']).toBe(context.span?.traceId);
      expect(headers['x-span-id']).toBe(context.span?.spanId);
    });

    it('should return empty object when no span', () => {
      (provider as any).tracer = undefined;
      const context = provider.createRootContext('TestOperation');
      const headers = getTraceHeaders(context);

      expect(headers).toEqual({});
    });
  });

  describe('finishSpan', () => {
    it('should finish span and set duration tag', () => {
      const context = provider.createRootContext('TestOperation');
      const originalFinish = jest.spyOn(mockTracer, 'finishSpan');
      
      finishSpan(context);

      expect(originalFinish).toHaveBeenCalledWith(context.span);
      expect(context.span?.tags.duration_ms).toBeDefined();
      expect(typeof context.span?.tags.duration_ms).toBe('number');
    });
  });
});

// ============================================
// 📁 tests/internal/validation-utils.test.ts - VALIDATION UTILS TESTS
// ============================================
import { 
  validateLoggingConfig, 
  validateTracingConfig, 
  validateMetricsConfig, 
  validateServiceName 
} from '../../src/internal/validation-utils';

describe('ValidationUtils', () => {
  describe('validateServiceName', () => {
    it('should validate correct service names', () => {
      expect(validateServiceName('my-service')).toEqual([]);
      expect(validateServiceName('MyService')).toEqual([]);
      expect(validateServiceName('my_service_123')).toEqual([]);
    });

    it('should reject empty or invalid service names', () => {
      expect(validateServiceName('')).toContain('serviceName is required and cannot be empty');
      expect(validateServiceName('   ')).toContain('serviceName is required and cannot be empty');
      expect(validateServiceName('123-service')).toContain('serviceName must start with a letter');
      expect(validateServiceName('my service')).toContain('serviceName must start with a letter');
    });

    it('should reject very long service names', () => {
      const longName = 'a'.repeat(101);
      expect(validateServiceName(longName)).toContain('serviceName must be less than 100 characters');
    });
  });

  describe('validateLoggingConfig', () => {
    it('should validate correct logging configs', () => {
      expect(validateLoggingConfig({ backend: 'console' })).toEqual([]);
      expect(validateLoggingConfig({ backend: 'inh', logger: {} })).toEqual([]);
      expect(validateLoggingConfig({ backend: 'custom', logger: {} })).toEqual([]);
    });

    it('should reject invalid backends', () => {
      expect(validateLoggingConfig({ backend: 'invalid' as any })).toContain('Invalid logging backend: invalid');
    });

    it('should require logger for inh backend', () => {
      expect(validateLoggingConfig({ backend: 'inh' })).toContain('logger instance is required when using inh backend');
    });

    it('should require logger for custom backend', () => {
      expect(validateLoggingConfig({ backend: 'custom' })).toContain('logger instance is required when using custom backend');
    });

    it('should validate log levels', () => {
      expect(validateLoggingConfig({ backend: 'console', level: 'invalid' as any })).toContain('Invalid log level: invalid');
      expect(validateLoggingConfig({ backend: 'console', level: 'debug' })).toEqual([]);
    });
  });

  describe('validateTracingConfig', () => {
    it('should validate correct tracing configs', () => {
      expect(validateTracingConfig({ backend: 'jaeger' })).toEqual([]);
      expect(validateTracingConfig({ backend: 'otel' })).toEqual([]);
      expect(validateTracingConfig({ backend: 'xray' })).toEqual([]);
      expect(validateTracingConfig({ backend: 'console' })).toEqual([]);
      expect(validateTracingConfig({ backend: 'none' })).toEqual([]);
    });

    it('should reject invalid backends', () => {
      expect(validateTracingConfig({ backend: 'invalid' as any })).toContain('Invalid tracing backend: invalid');
    });

    it('should validate sampling rates', () => {
      expect(validateTracingConfig({ backend: 'jaeger', samplingRate: 0.5 })).toEqual([]);
      expect(validateTracingConfig({ backend: 'jaeger', samplingRate: -0.1 })).toContain('samplingRate must be between 0 and 1');
      expect(validateTracingConfig({ backend: 'jaeger', samplingRate: 1.1 })).toContain('samplingRate must be between 0 and 1');
    });
  });

  describe('validateMetricsConfig', () => {
    it('should validate correct metrics configs', () => {
      expect(validateMetricsConfig({ backend: 'prometheus' })).toEqual([]);
      expect(validateMetricsConfig({ backend: 'otel' })).toEqual([]);
      expect(validateMetricsConfig({ backend: 'console' })).toEqual([]);
      expect(validateMetricsConfig({ backend: 'none' })).toEqual([]);
    });

    it('should reject invalid backends', () => {
      expect(validateMetricsConfig({ backend: 'invalid' as any })).toContain('Invalid metrics backend: invalid');
    });

    it('should validate metric prefixes', () => {
      expect(validateMetricsConfig({ backend: 'prometheus', prefix: 'my_prefix' })).toEqual([]);
      expect(validateMetricsConfig({ backend: 'prometheus', prefix: 'my-prefix' })).toContain('metrics prefix must be a valid identifier');
      expect(validateMetricsConfig({ backend: 'prometheus', prefix: '123prefix' })).toContain('metrics prefix must be a valid identifier');
    });
  });
});

// ============================================
// 📁 tests/internal/provider-utils.test.ts - PROVIDER UTILS TESTS
// ============================================
import { 
  createTracerFromConfig, 
  createMetricsFromConfig, 
  createLoggerFromConfig,
  createDefaultTags 
} from '../../src/internal/provider-utils';
import { UnifiedMockLogger } from '../../src/testing';

describe('ProviderUtils', () => {
  describe('createDefaultTags', () => {
    it('should create default tags from config', () => {
      const config = {
        serviceName: 'test-service',
        serviceVersion: '2.0.0',
        environment: 'production',
        logging: { backend: 'console' as const },
        defaultTags: { custom: 'value' }
      };

      const tags = createDefaultTags(config);

      expect(tags).toEqual({
        service: 'test-service',
        version: '2.0.0',
        environment: 'production',
        custom: 'value'
      });
    });

    it('should use default values when not provided', () => {
      const config = {
        serviceName: 'test-service',
        logging: { backend: 'console' as const }
      };

      const tags = createDefaultTags(config);

      expect(tags).toEqual({
        service: 'test-service',
        version: '1.0.0',
        environment: 'development'
      });
    });
  });

  describe('createTracerFromConfig', () => {
    it('should return undefined when tracing disabled', () => {
      const config = {
        serviceName: 'test-service',
        tracing: { backend: 'none' as const },
        logging: { backend: 'console' as const }
      };

      const tracer = createTracerFromConfig(config);
      expect(tracer).toBeUndefined();
    });

    it('should return undefined when tracing not configured', () => {
      const config = {
        serviceName: 'test-service',
        logging: { backend: 'console' as const }
      };

      const tracer = createTracerFromConfig(config);
      expect(tracer).toBeUndefined();
    });

    it('should create console tracer', () => {
      const config = {
        serviceName: 'test-service',
        tracing: { backend: 'console' as const },
        logging: { backend: 'console' as const }
      };

      const tracer = createTracerFromConfig(config);
      expect(tracer).toBeDefined();
    });

    it('should handle tracer creation errors', () => {
      const mockLogger = new UnifiedMockLogger();
      const config = {
        serviceName: 'test-service',
        tracing: { backend: 'invalid' as any },
        logging: { backend: 'console' as const }
      };

      const tracer = createTracerFromConfig(config, mockLogger);
      expect(tracer).toBeUndefined();
    });
  });

  describe('createMetricsFromConfig', () => {
    it('should return undefined when metrics disabled', () => {
      const config = {
        serviceName: 'test-service',
        metrics: { backend: 'none' as const },
        logging: { backend: 'console' as const }
      };

      const metrics = createMetricsFromConfig(config, {});
      expect(metrics).toBeUndefined();
    });

    it('should create console metrics', () => {
      const config = {
        serviceName: 'test-service',
        metrics: { backend: 'console' as const },
        logging: { backend: 'console' as const }
      };

      const metrics = createMetricsFromConfig(config, {});
      expect(metrics).toBeDefined();
    });

    it('should handle metrics creation errors', () => {
      const mockLogger = new UnifiedMockLogger();
      const config = {
        serviceName: 'test-service',
        metrics: { backend: 'invalid' as any },
        logging: { backend: 'console' as const }
      };

      const metrics = createMetricsFromConfig(config, {}, mockLogger);
      expect(metrics).toBeUndefined();
    });
  });

  describe('createLoggerFromConfig', () => {
    it('should create console logger', () => {
      const config = {
        serviceName: 'test-service',
        logging: { backend: 'console' as const }
      };

      const logger = createLoggerFromConfig(config);
      expect(logger).toBeDefined();
    });

    it('should create custom logger', () => {
      const customLogger = new UnifiedMockLogger();
      const config = {
        serviceName: 'test-service',
        logging: { backend: 'custom' as const, logger: customLogger }
      };

      const logger = createLoggerFromConfig(config);
      expect(logger).toBeDefined();
    });

    it('should fallback to console on error', () => {
      const config = {
        serviceName: 'test-service',
        logging: { backend: 'invalid' as any }
      };

      const logger = createLoggerFromConfig(config);
      expect(logger).toBeDefined();
    });
  });
});

// ============================================
// 📁 tests/internal/factory-utils.test.ts - FACTORY UTILS TESTS
// ============================================
import { 
  createTracingConfigFromEnv, 
  createMetricsConfigFromEnv, 
  createLoggingConfigFromEnv,
  parseHeaders,
  parseLabels,
  createEnvironmentTags 
} from '../../src/internal/factory-utils';

describe('FactoryUtils', () => {
  beforeEach(() => {
    // Clear environment variables
    delete process.env.TRACING_BACKEND;
    delete process.env.METRICS_BACKEND;
    delete process.env.LOGGING_BACKEND;
    delete process.env.LOG_LEVEL;
    delete process.env.DEPLOYMENT_ID;
    delete process.env.INSTANCE_ID;
  });

  describe('parseHeaders', () => {
    it('should parse header strings correctly', () => {
      const headers = parseHeaders('key1=value1,key2=value2');
      expect(headers).toEqual({
        key1: 'value1',
        key2: 'value2'
      });
    });

    it('should handle spaces in header strings', () => {
      const headers = parseHeaders('key1 = value1 , key2 = value2');
      expect(headers).toEqual({
        key1: 'value1',
        key2: 'value2'
      });
    });

    it('should handle empty header strings', () => {
      const headers = parseHeaders('');
      expect(headers).toEqual({});
    });
  });

  describe('parseLabels', () => {
    it('should parse label strings correctly', () => {
      const labels = parseLabels('env=prod,region=us-east-1');
      expect(labels).toEqual({
        env: 'prod',
        region: 'us-east-1'
      });
    });
  });

  describe('createEnvironmentTags', () => {
    it('should create tags from environment variables', () => {
      process.env.DEPLOYMENT_ID = 'deploy-123';
      process.env.INSTANCE_ID = 'instance-456';
      process.env.HOSTNAME = 'my-pod';
      process.env.NODE_NAME = 'node-1';

      const tags = createEnvironmentTags();

      expect(tags).toEqual({
        'deployment.id': 'deploy-123',
        'instance.id': 'instance-456',
        'pod.name': 'my-pod',
        'node.name': 'node-1'
      });
    });

    it('should use default values when env vars not set', () => {
      const tags = createEnvironmentTags();

      expect(tags).toEqual({
        'deployment.id': 'unknown',
        'instance.id': 'unknown',
        'pod.name': 'unknown',
        'node.name': 'unknown'
      });
    });
  });

  describe('createTracingConfigFromEnv', () => {
    it('should return undefined when no tracing backend', () => {
      const config = createTracingConfigFromEnv();
      expect(config).toBeUndefined();
    });

    it('should create jaeger config from env', () => {
      process.env.TRACING_BACKEND = 'jaeger';
      process.env.JAEGER_ENDPOINT = 'http://localhost:14268';
      process.env.JAEGER_AGENT_HOST = 'jaeger-agent';
      process.env.JAEGER_AGENT_PORT = '6831';

      const config = createTracingConfigFromEnv();

      expect(config).toEqual({
        backend: 'jaeger',
        enabled: true,
        samplingRate: undefined,
        config: {
          endpoint: 'http://localhost:14268',
          agent: {
            host: 'jaeger-agent',
            port: 6831
          }
        }
      });
    });

    it('should create otel config from env', () => {
      process.env.TRACING_BACKEND = 'otel';
      process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT = 'http://localhost:4317';
      process.env.OTEL_EXPORTER_OTLP_HEADERS = 'key1=value1,key2=value2';

      const config = createTracingConfigFromEnv();

      expect(config).toEqual({
        backend: 'otel',
        enabled: true,
        samplingRate: undefined,
        config: {
          endpoint: 'http://localhost:4317',
          headers: {
            key1: 'value1',
            key2: 'value2'
          }
        }
      });
    });

    it('should create xray config from env', () => {
      process.env.TRACING_BACKEND = 'xray';
      process.env.AWS_REGION = 'us-east-1';
      process.env.AWS_XRAY_DAEMON_ADDRESS = 'localhost:2000';

      const config = createTracingConfigFromEnv();

      expect(config).toEqual({
        backend: 'xray',
        enabled: true,
        samplingRate: undefined,
        config: {
          region: 'us-east-1',
          daemon: 'localhost:2000',
          captureAWS: true,
          captureHTTPs: true
        }
      });
    });
  });

  describe('createMetricsConfigFromEnv', () => {
    it('should return undefined when no metrics backend', () => {
      const config = createMetricsConfigFromEnv();
      expect(config).toBeUndefined();
    });

    it('should create prometheus config from env', () => {
      process.env.METRICS_BACKEND = 'prometheus';
      process.env.PROMETHEUS_PREFIX = 'myapp';
      process.env.PROMETHEUS_DEFAULT_LABELS = 'env=prod,region=us-east-1';

      const config = createMetricsConfigFromEnv();

      expect(config).toEqual({
        backend: 'prometheus',
        enabled: true,
        prefix: 'myapp',
        config: {
          prefix: 'myapp',
          defaultLabels: {
            env: 'prod',
            region: 'us-east-1'
          }
        }
      });
    });

    it('should create otel metrics config from env', () => {
      process.env.METRICS_BACKEND = 'otel';
      process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT = 'http://localhost:4317';
      process.env.OTEL_METRICS_EXPORT_INTERVAL = '30000';

      const config = createMetricsConfigFromEnv();

      expect(config).toEqual({
        backend: 'otel',
        enabled: true,
        prefix: undefined,
        config: {
          endpoint: 'http://localhost:4317',
          exportInterval: 30000
        }
      });
    });
  });

  describe('createLoggingConfigFromEnv', () => {
    it('should use default values', () => {
      const config = createLoggingConfigFromEnv();

      expect(config).toEqual({
        backend: 'console',
        level: 'info'
      });
    });

    it('should use environment values', () => {
      process.env.LOGGING_BACKEND = 'inh';
      process.env.LOG_LEVEL = 'debug';

      const config = createLoggingConfigFromEnv();

      expect(config).toEqual({
        backend: 'inh',
        level: 'debug'
      });
    });
  });
});

// ============================================
// 📁 tests/internal/tracer-utils.test.ts - TRACER UTILS TESTS
// ============================================
import { 
  generateXRayTraceId, 
  generateXRaySpanId, 
  generateStandardTraceId, 
  generateStandardSpanId,
  isIndexedXRayTag,
  createXRaySegment 
} from '../../src/internal/tracer-utils';

describe('TracerUtils', () => {
  describe('generateXRayTraceId', () => {
    it('should generate valid X-Ray trace ID', () => {
      const traceId = generateXRayTraceId();
      expect(traceId).toMatch(/^1-[0-9a-f]{8}-[0-9a-f]{24}$/);
    });

    it('should generate unique trace IDs', () => {
      const id1 = generateXRayTraceId();
      const id2 = generateXRayTraceId();
      expect(id1).not.toBe(id2);
    });
  });

  describe('generateXRaySpanId', () => {
    it('should generate valid X-Ray span ID', () => {
      const spanId = generateXRaySpanId();
      expect(spanId).toMatch(/^[0-9a-f]{16}$/);
    });

    it('should generate unique span IDs', () => {
      const id1 = generateXRaySpanId();
      const id2 = generateXRaySpanId();
      expect(id1).not.toBe(id2);
    });
  });

  describe('generateStandardTraceId', () => {
    it('should generate valid standard trace ID', () => {
      const traceId = generateStandardTraceId();
      expect(traceId).toMatch(/^[0-9a-f]{32}$/);
    });

    it('should generate unique trace IDs', () => {
      const id1 = generateStandardTraceId();
      const id2 = generateStandardTraceId();
      expect(id1).not.toBe(id2);
    });
  });

  describe('generateStandardSpanId', () => {
    it('should generate valid standard span ID', () => {
      const spanId = generateStandardSpanId();
      expect(spanId).toMatch(/^[0-9a-f]{16}$/);
    });

    it('should generate unique span IDs', () => {
      const id1 = generateStandardSpanId();
      const id2 = generateStandardSpanId();
      expect(id1).not.toBe(id2);
    });
  });

  describe('isIndexedXRayTag', () => {
    it('should identify indexed tags', () => {
      expect(isIndexedXRayTag('http.method')).toBe(true);
      expect(isIndexedXRayTag('http.status_code')).toBe(true);
      expect(isIndexedXRayTag('error')).toBe(true);
      expect(isIndexedXRayTag('aws.region')).toBe(true);
      expect(isIndexedXRayTag('aws.account_id')).toBe(true);
    });

    it('should identify non-indexed tags', () => {
      expect(isIndexedXRayTag('custom.tag')).toBe(false);
      expect(isIndexedXRayTag('business.logic')).toBe(false);
      expect(isIndexedXRayTag('user.custom')).toBe(false);
    });

    it('should handle AWS and HTTP prefixes', () => {
      expect(isIndexedXRayTag('aws.custom')).toBe(true);
      expect(isIndexedXRayTag('http.custom')).toBe(true);
    });
  });

  describe('createXRaySegment', () => {
    it('should create valid X-Ray segment', () => {
      const span = {
        spanId: 'test-span-id',
        traceId: 'test-trace-id',
        parentSpanId: 'parent-span-id',
        operationName: 'TestOperation',
        startTime: new Date('2024-01-01T00:00:00Z'),
        tags: {},
        logs: [],
        context: { traceId: 'test-trace-id', spanId: 'test-span-id' }
      };

      const segment = createXRaySegment(span, 'test-service');

      expect(segment).toMatchObject({
        name: 'TestOperation',
        id: 'test-span-id',
        trace_id: 'test-trace-id',
        parent_id: 'parent-span-id',
        start_time: 1704067200, // 2024-01-01T00:00:00Z as epoch
        service: {
          name: 'test-service',
          version: expect.any(String)
        },
        aws: {
          region: expect.any(String),
          account_id: expect.any(String)
        },
        annotations: {},
        metadata: {},
        subsegments: []
      });
    });
  });
});

// ============================================
// 📁 tests/internal/metrics-key-utils.test.ts - METRICS KEY UTILS TESTS
// ============================================
import { 
  createMetricKey, 
  sanitizeMetricName, 
  sanitizeLabelName, 
  sanitizeLabelValue, 
  validateMetricName, 
  validateLabelName 
} from '../../src/internal/metrics-key-utils';

describe('MetricsKeyUtils', () => {
  describe('createMetricKey', () => {
    it('should create key without labels', () => {
      const key = createMetricKey('test_metric');
      expect(key).toBe('test_metric');
    });

    it('should create key with labels', () => {
      const key = createMetricKey('test_metric', { env: 'prod', region: 'us-east-1' });
      expect(key).toBe('test_metric{env="prod",region="us-east-1"}');
    });

    it('should sort labels consistently', () => {
      const key1 = createMetricKey('test_metric', { b: '2', a: '1' });
      const key2 = createMetricKey('test_metric', { a: '1', b: '2' });
      expect(key1).toBe(key2);
    });

    it('should handle empty labels', () => {
      const key = createMetricKey('test_metric', {});
      expect(key).toBe('test_metric');
    });
  });

  describe('sanitizeMetricName', () => {
    it('should sanitize metric names', () => {
      expect(sanitizeMetricName('test-metric')).toBe('test_metric');
      expect(sanitizeMetricName('test.metric')).toBe('test_metric');
      expect(sanitizeMetricName('test metric')).toBe('test_metric');
      expect(sanitizeMetricName('test@metric')).toBe('test_metric');
    });

    it('should preserve valid characters', () => {
      expect(sanitizeMetricName('test_metric_123')).toBe('test_metric_123');
      expect(sanitizeMetricName('TestMetric')).toBe('TestMetric');
    });
  });

  describe('sanitizeLabelName', () => {
    it('should sanitize label names', () => {
      expect(sanitizeLabelName('test-label')).toBe('test_label');
      expect(sanitizeLabelName('test.label')).toBe('test_label');
      expect(sanitizeLabelName('test label')).toBe('test_label');
    });
  });

  describe('sanitizeLabelValue', () => {
    it('should sanitize label values', () => {
      expect(sanitizeLabelValue('test\nvalue')).toBe('test_value');
      expect(sanitizeLabelValue('test\rvalue')).toBe('test_value');
      expect(sanitizeLabelValue('test\tvalue')).toBe('test_value');
    });

    it('should preserve other characters', () => {
      expect(sanitizeLabelValue('test-value.123')).toBe('test-value.123');
    });
  });

  describe('validateMetricName', () => {
    it('should validate correct metric names', () => {
      expect(validateMetricName('test_metric')).toBe(true);
      expect(validateMetricName('TestMetric')).toBe(true);
      expect(validateMetricName('test_metric_123')).toBe(true);
      expect(validateMetricName('_test_metric')).toBe(true);
    });

    it('should reject invalid metric names', () => {
      expect(validateMetricName('123metric')).toBe(false);
      expect(validateMetricName('test-metric')).toBe(false);
      expect(validateMetricName('test.metric')).toBe(false);
      expect(validateMetricName('test metric')).toBe(false);
    });
  });

  describe('validateLabelName', () => {
    it('should validate correct label names', () => {
      expect(validateLabelName('test_label')).toBe(true);
      expect(validateLabelName('TestLabel')).toBe(true);
      expect(validateLabelName('test_label_123')).toBe(true);
      expect(validateLabelName('_test_label')).toBe(true);
    });

    it('should reject invalid label names', () => {
      expect(validateLabelName('123label')).toBe(false);
      expect(validateLabelName('test-label')).toBe(false);
      expect(validateLabelName('test.label')).toBe(false);
      expect(validateLabelName('test label')).toBe(false);
    });
  });
});

// ============================================
// 📁 src/types/core.ts - ENHANCED CORE TYPES
// ============================================
export interface UnifiedSpan {
  readonly spanId: string;
  readonly traceId: string;
  readonly parentSpanId?: string;
  readonly operationName: string;
  readonly startTime: Date;
  endTime?: Date;
  tags: Record<string, string | number | boolean>;
  logs: UnifiedSpanLog[];
  readonly context: UnifiedSpanContext;
}

export interface UnifiedSpanContext {
  readonly traceId: string;
  readonly spanId: string;
  readonly traceFlags?: number;
  readonly traceState?: Record<string, string>;
  readonly baggage?: Record<string, string>;
}

export interface UnifiedSpanLog {
  timestamp: Date;
  message: string;
  level?: UnifiedLogLevel;
  fields?: Record<string, unknown>;
}

export type UnifiedLogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface UnifiedMetricLabels {
  [key: string]: string;
}

export interface UnifiedLogData {
  [key: string]: unknown;
}

export type UnifiedTracingBackend = 'jaeger' | 'otel' | 'xray' | 'console' | 'none';
export type UnifiedMetricsBackend = 'prometheus' | 'otel' | 'console' | 'none';
export type UnifiedLoggingBackend = 'inh' | 'console' | 'custom';

export interface UnifiedErrorInfo {
  message: string;
  stack?: string;
  code?: string | number;
  type?: string;
  context?: Record<string, unknown>;
}

// ============================================
// 📁 src/interfaces/tracer.ts - ENHANCED TRACER INTERFACE
// ============================================
export interface UnifiedTracer {
  startSpan(operationName: string, parentSpan?: UnifiedSpan, options?: UnifiedSpanOptions): UnifiedSpan;
  finishSpan(span: UnifiedSpan): void;
  setTag(span: UnifiedSpan, key: string, value: string | number | boolean): void;
  addLog(span: UnifiedSpan, message: string, level?: UnifiedLogLevel, fields?: Record<string, unknown>): void;
  setError(span: UnifiedSpan, error: UnifiedErrorInfo): void;
  inject(span: UnifiedSpan, format: UnifiedInjectFormat, carrier: Record<string, string>): void;
  extract(format: UnifiedInjectFormat, carrier: Record<string, string>): UnifiedSpanContext | undefined;
}

export interface UnifiedSpanOptions {
  tags?: Record<string, string | number | boolean>;
  startTime?: Date;
  ignoreActiveSpan?: boolean;
  childOf?: UnifiedSpan;
  references?: UnifiedSpanReference[];
}

export interface UnifiedSpanReference {
  type: UnifiedReferenceType;
  referencedContext: UnifiedSpanContext;
}

export type UnifiedReferenceType = 'childOf' | 'followsFrom';
export type UnifiedInjectFormat = 'http_headers' | 'text_map' | 'binary';

// ============================================
// 📁 src/interfaces/metrics.ts - ENHANCED METRICS INTERFACES
// ============================================
export interface UnifiedCounter {
  increment(labels?: UnifiedMetricLabels): void;
  add(value: number, labels?: UnifiedMetricLabels): void;
  get(labels?: UnifiedMetricLabels): number;
}

export interface UnifiedGauge {
  set(value: number, labels?: UnifiedMetricLabels): void;
  increment(labels?: UnifiedMetricLabels): void;
  decrement(labels?: UnifiedMetricLabels): void;
  add(value: number, labels?: UnifiedMetricLabels): void;
  get(labels?: UnifiedMetricLabels): number;
}

export interface UnifiedHistogram {
  observe(value: number, labels?: UnifiedMetricLabels): void;
  
  // Function overloading - TypeScript จะเลือก signature ที่ถูกต้องตาม parameter type
  time<T>(fn: () => T, labels?: UnifiedMetricLabels): T;                    // For sync functions
  time<T>(fn: () => Promise<T>, labels?: UnifiedMetricLabels): Promise<T>;  // For async functions
  
  getMetrics(labels?: UnifiedMetricLabels): UnifiedHistogramMetrics;
}

export interface UnifiedHistogramMetrics {
  count: number;
  sum: number;
  buckets: Record<string, number>;
}

export interface UnifiedTimer {
  start(): UnifiedTimerInstance;
  record(durationMs: number, labels?: UnifiedMetricLabels): void;
}

export interface UnifiedTimerInstance {
  stop(): number;
  record(labels?: UnifiedMetricLabels): number;
}

export interface UnifiedMetricsRegistry {
  counter(name: string, help?: string, labelNames?: string[]): UnifiedCounter;
  gauge(name: string, help?: string, labelNames?: string[]): UnifiedGauge;
  histogram(name: string, help?: string, labelNames?: string[], buckets?: number[]): UnifiedHistogram;
  timer(name: string, help?: string, labelNames?: string[]): UnifiedTimer;
  clear(): void;
  getMetrics(): string;
}

// ============================================
// 📁 src/interfaces/logger.ts - ENHANCED LOGGER INTERFACE
// ============================================
export interface UnifiedLogger {
  trace(message: string, data?: UnifiedLogData): void;
  debug(message: string, data?: UnifiedLogData): void;
  info(message: string, data?: UnifiedLogData): void;
  warn(message: string, data?: UnifiedLogData): void;
  error(message: string, data?: UnifiedLogData): void;
  fatal(message: string, data?: UnifiedLogData): void;
  
  // Advanced methods
  child(context: Record<string, unknown>): UnifiedLogger;
  setLevel?(level: UnifiedLogLevel): void;
  getLevel?(): UnifiedLogLevel;
}

// ============================================
// 📁 src/config/types.ts - ENHANCED CONFIGURATION TYPES
// ============================================
export interface UnifiedTracingConfig {
  backend: UnifiedTracingBackend;
  enabled?: boolean;
  samplingRate?: number;
  config?: UnifiedJaegerConfig | UnifiedOtelTracingConfig | UnifiedXRayConfig | Record<string, unknown>;
}

export interface UnifiedMetricsConfig {
  backend: UnifiedMetricsBackend;
  enabled?: boolean;
  prefix?: string;
  config?: UnifiedPrometheusConfig | UnifiedOtelMetricsConfig | Record<string, unknown>;
}

export interface UnifiedLoggingConfig {
  backend: UnifiedLoggingBackend;
  level?: UnifiedLogLevel;
  logger?: unknown;
}

export interface UnifiedObservabilityConfig {
  serviceName: string;
  serviceVersion?: string;
  environment?: string;
  tracing?: UnifiedTracingConfig;
  metrics?: UnifiedMetricsConfig;
  logging: UnifiedLoggingConfig;
  defaultTags?: Record<string, string>;
}

// Backend-specific configurations
export interface UnifiedJaegerConfig {
  endpoint?: string;
  agent?: {
    host?: string;
    port?: number;
  };
  samplingRate?: number;
  flushInterval?: number;
}

export interface UnifiedOtelTracingConfig {
  endpoint?: string;
  headers?: Record<string, string>;
  compression?: 'gzip' | 'none';
  timeout?: number;
}

export interface UnifiedXRayConfig {
  region?: string;
  daemon?: string;
  captureAWS?: boolean;
  captureHTTPs?: boolean;
  captureHTTP?: boolean;
  subsegmentStreamingThreshold?: number;
}

export interface UnifiedPrometheusConfig {
  prefix?: string;
  defaultLabels?: Record<string, string>;
  buckets?: number[];
}

export interface UnifiedOtelMetricsConfig {
  endpoint?: string;
  headers?: Record<string, string>;
  exportInterval?: number;
  timeout?: number;
}

// ============================================
// 📁 src/internal/validation-utils.ts - VALIDATION UTILITIES (not exported to end users)
// ============================================
export function validateLoggingConfig(config: UnifiedLoggingConfig): string[] {
  const errors: string[] = [];

  if (!['inh', 'console', 'custom'].includes(config.backend)) {
    errors.push(`Invalid logging backend: ${config.backend}`);
  }

  if (config.backend === 'inh' && !config.logger) {
    errors.push('logger instance is required when using inh backend');
  }

  if (config.backend === 'custom' && !config.logger) {
    errors.push('logger instance is required when using custom backend');
  }

  if (config.level && !['trace', 'debug', 'info', 'warn', 'error', 'fatal'].includes(config.level)) {
    errors.push(`Invalid log level: ${config.level}`);
  }

  return errors;
}

export function validateTracingConfig(config: UnifiedTracingConfig): string[] {
  const errors: string[] = [];

  if (!['jaeger', 'otel', 'xray', 'console', 'none'].includes(config.backend)) {
    errors.push(`Invalid tracing backend: ${config.backend}`);
  }

  if (config.samplingRate !== undefined) {
    if (config.samplingRate < 0 || config.samplingRate > 1) {
      errors.push('samplingRate must be between 0 and 1');
    }
  }

  return errors;
}

export function validateMetricsConfig(config: UnifiedMetricsConfig): string[] {
  const errors: string[] = [];

  if (!['prometheus', 'otel', 'console', 'none'].includes(config.backend)) {
    errors.push(`Invalid metrics backend: ${config.backend}`);
  }

  if (config.prefix && !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(config.prefix)) {
    errors.push('metrics prefix must be a valid identifier');
  }

  return errors;
}

export function validateServiceName(serviceName: string): string[] {
  const errors: string[] = [];

  if (!serviceName || serviceName.trim().length === 0) {
    errors.push('serviceName is required and cannot be empty');
  }

  if (serviceName.length > 100) {
    errors.push('serviceName must be less than 100 characters');
  }

  if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(serviceName)) {
    errors.push('serviceName must start with a letter and contain only letters, numbers, hyphens, and underscores');
  }

  return errors;
}

// ============================================
// 📁 src/validation/config-validator.ts - CLEAN CONFIGURATION VALIDATION
// ============================================
import { 
  validateLoggingConfig, 
  validateTracingConfig, 
  validateMetricsConfig, 
  validateServiceName 
} from '../internal/validation-utils';

export class UnifiedConfigValidator {
  static validate(config: UnifiedObservabilityConfig): UnifiedValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate service name
    const serviceNameErrors = validateServiceName(config.serviceName);
    errors.push(...serviceNameErrors);

    // Validate logging config
    if (!config.logging) {
      errors.push('logging configuration is required');
    } else {
      const loggingErrors = validateLoggingConfig(config.logging);
      errors.push(...loggingErrors);
    }

    // Validate tracing config
    if (config.tracing) {
      const tracingErrors = validateTracingConfig(config.tracing);
      errors.push(...tracingErrors);
    }

    // Validate metrics config
    if (config.metrics) {
      const metricsErrors = validateMetricsConfig(config.metrics);
      errors.push(...metricsErrors);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}

export interface UnifiedValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// ============================================
// 📁 src/internal/provider-utils.ts - PROVIDER UTILITIES (not exported to end users)
// ============================================
export function createTracerFromConfig(
  config: UnifiedObservabilityConfig,
  logger?: UnifiedLogger
): UnifiedTracer | undefined {
  if (!config.tracing || 
      config.tracing.backend === 'none' || 
      config.tracing.enabled === false) {
    return undefined;
  }

  try {
    switch (config.tracing.backend) {
      case 'jaeger':
        return new UnifiedJaegerTracer({
          serviceName: config.serviceName,
          serviceVersion: config.serviceVersion || '1.0.0',
          environment: config.environment || 'development',
          ...(config.tracing.config as UnifiedJaegerConfig)
        });
        
      case 'otel':
        return new UnifiedOtelTracer({
          serviceName: config.serviceName,
          serviceVersion: config.serviceVersion || '1.0.0',
          environment: config.environment || 'development',
          ...(config.tracing.config as UnifiedOtelTracingConfig)
        });
        
      case 'xray':
        return new UnifiedXRayTracer({
          serviceName: config.serviceName,
          serviceVersion: config.serviceVersion || '1.0.0',
          environment: config.environment || 'development',
          ...(config.tracing.config as UnifiedXRayConfig)
        });
        
      case 'console':
        return new UnifiedConsoleTracer();
        
      default:
        return undefined;
    }
  } catch (error) {
    logger?.warn('Failed to initialize tracer', { 
      backend: config.tracing.backend,
      error: error instanceof Error ? error.message : String(error)
    });
    return undefined;
  }
}

export function createMetricsFromConfig(
  config: UnifiedObservabilityConfig,
  defaultTags: Record<string, string>,
  logger?: UnifiedLogger
): UnifiedMetricsRegistry | undefined {
  if (!config.metrics || 
      config.metrics.backend === 'none' || 
      config.metrics.enabled === false) {
    return undefined;
  }

  try {
    switch (config.metrics.backend) {
      case 'prometheus':
        return new UnifiedPrometheusMetrics({
          serviceName: config.serviceName,
          defaultLabels: defaultTags,
          ...(config.metrics.config as UnifiedPrometheusConfig)
        });
        
      case 'otel':
        return new UnifiedOtelMetrics({
          serviceName: config.serviceName,
          serviceVersion: config.serviceVersion || '1.0.0',
          environment: config.environment || 'development',
          ...(config.metrics.config as UnifiedOtelMetricsConfig)
        });
        
      case 'console':
        return new UnifiedConsoleMetrics();
        
      default:
        return undefined;
    }
  } catch (error) {
    logger?.warn('Failed to initialize metrics', { 
      backend: config.metrics.backend,
      error: error instanceof Error ? error.message : String(error)
    });
    return undefined;
  }
}

export function createLoggerFromConfig(
  config: UnifiedObservabilityConfig
): UnifiedLogger {
  try {
    switch (config.logging.backend) {
      case 'inh':
        return new UnifiedInhLoggerAdapter(config.logging.logger);
        
      case 'console':
        return new UnifiedConsoleLogger(config.logging.level);
        
      case 'custom':
        return new UnifiedCustomLoggerAdapter(config.logging.logger);
        
      default:
        return new UnifiedConsoleLogger();
    }
  } catch (error) {
    console.warn('Failed to initialize logger, falling back to console', error);
    return new UnifiedConsoleLogger();
  }
}

export function createDefaultTags(config: UnifiedObservabilityConfig): Record<string, string> {
  return {
    service: config.serviceName,
    version: config.serviceVersion || '1.0.0',
    environment: config.environment || 'development',
    ...config.defaultTags
  };
}

// ============================================
// 📁 src/internal/factory-utils.ts - FACTORY UTILITIES (not exported to end users)
// ============================================
export function createTracingConfigFromEnv(): UnifiedTracingConfig | undefined {
  const backend = process.env.TRACING_BACKEND as UnifiedTracingBackend;
  if (!backend || backend === 'none') return undefined;

  const baseConfig: UnifiedTracingConfig = {
    backend,
    enabled: process.env.TRACING_ENABLED !== 'false',
    samplingRate: process.env.TRACING_SAMPLING_RATE ? 
      parseFloat(process.env.TRACING_SAMPLING_RATE) : undefined
  };

  switch (backend) {
    case 'jaeger':
      baseConfig.config = {
        endpoint: process.env.JAEGER_ENDPOINT,
        agent: {
          host: process.env.JAEGER_AGENT_HOST || 'localhost',
          port: process.env.JAEGER_AGENT_PORT ? 
            parseInt(process.env.JAEGER_AGENT_PORT) : 6832
        }
      } as UnifiedJaegerConfig;
      break;

    case 'otel':
      baseConfig.config = {
        endpoint: process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT || 
                 process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
        headers: process.env.OTEL_EXPORTER_OTLP_HEADERS ? 
          parseHeaders(process.env.OTEL_EXPORTER_OTLP_HEADERS) : undefined
      } as UnifiedOtelTracingConfig;
      break;

    case 'xray':
      baseConfig.config = {
        region: process.env.AWS_REGION,
        daemon: process.env.AWS_XRAY_DAEMON_ADDRESS,
        captureAWS: process.env.AWS_XRAY_CAPTURE_AWS !== 'false',
        captureHTTPs: process.env.AWS_XRAY_CAPTURE_HTTPS !== 'false'
      } as UnifiedXRayConfig;
      break;
  }

  return baseConfig;
}

export function createMetricsConfigFromEnv(): UnifiedMetricsConfig | undefined {
  const backend = process.env.METRICS_BACKEND as UnifiedMetricsBackend;
  if (!backend || backend === 'none') return undefined;

  const baseConfig: UnifiedMetricsConfig = {
    backend,
    enabled: process.env.METRICS_ENABLED !== 'false',
    prefix: process.env.METRICS_PREFIX
  };

  switch (backend) {
    case 'prometheus':
      baseConfig.config = {
        prefix: process.env.PROMETHEUS_PREFIX,
        defaultLabels: process.env.PROMETHEUS_DEFAULT_LABELS ? 
          parseLabels(process.env.PROMETHEUS_DEFAULT_LABELS) : undefined
      } as UnifiedPrometheusConfig;
      break;

    case 'otel':
      baseConfig.config = {
        endpoint: process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT || 
                 process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
        exportInterval: process.env.OTEL_METRICS_EXPORT_INTERVAL ? 
          parseInt(process.env.OTEL_METRICS_EXPORT_INTERVAL) : undefined
      } as UnifiedOtelMetricsConfig;
      break;
  }

  return baseConfig;
}

export function createLoggingConfigFromEnv(): UnifiedLoggingConfig {
  const backend = (process.env.LOGGING_BACKEND || 'console') as UnifiedLoggingBackend;
  const level = (process.env.LOG_LEVEL || 'info') as UnifiedLogLevel;

  return {
    backend,
    level
  };
}

export function parseHeaders(headersStr: string): Record<string, string> {
  const headers: Record<string, string> = {};
  headersStr.split(',').forEach(header => {
    const [key, value] = header.split('=');
    if (key && value) {
      headers[key.trim()] = value.trim();
    }
  });
  return headers;
}

export function parseLabels(labelsStr: string): Record<string, string> {
  return parseHeaders(labelsStr);
}

export function createEnvironmentTags(): Record<string, string> {
  return {
    'deployment.id': process.env.DEPLOYMENT_ID || 'unknown',
    'instance.id': process.env.INSTANCE_ID || 'unknown',
    'pod.name': process.env.HOSTNAME || process.env.POD_NAME || 'unknown',
    'node.name': process.env.NODE_NAME || 'unknown'
  };
}

// ============================================
// 📁 src/internal/tracer-utils.ts - TRACER UTILITIES (not exported to end users)
// ============================================
export function generateXRayTraceId(): string {
  const epoch = Math.floor(Date.now() / 1000).toString(16);
  const random = Math.random().toString(16).substr(2, 24).padEnd(24, '0');
  return `1-${epoch}-${random}`;
}

export function generateXRaySpanId(): string {
  return Math.random().toString(16).substr(2, 16).padEnd(16, '0');
}

export function generateStandardTraceId(): string {
  return Math.random().toString(16).substr(2, 32).padEnd(32, '0');
}

export function generateStandardSpanId(): string {
  return Math.random().toString(16).substr(2, 16).padEnd(16, '0');
}

export function isIndexedXRayTag(key: string): boolean {
  const indexedKeys = [
    'http.method',
    'http.status_code',
    'error',
    'fault',
    'throttle',
    'user.id',
    'service.name',
    'service.version',
    'aws.region',
    'aws.account_id'
  ];
  return indexedKeys.includes(key) || key.startsWith('aws.') || key.startsWith('http.');
}

export function createXRaySegment(
  span: UnifiedSpan,
  serviceName: string
): Record<string, unknown> {
  return {
    name: span.operationName,
    id: span.spanId,
    trace_id: span.traceId,
    parent_id: span.parentSpanId,
    start_time: span.startTime.getTime() / 1000,
    service: {
      name: serviceName,
      version: process.env.SERVICE_VERSION || '1.0.0'
    },
    aws: {
      region: process.env.AWS_REGION || 'us-east-1',
      account_id: process.env.AWS_ACCOUNT_ID || '123456789012'
    },
    annotations: {},
    metadata: {},
    subsegments: []
  };
}

export function sendToXRayDaemon(segment: Record<string, unknown>): void {
  const xrayDocument = {
    format: 'json',
    version: 1,
    segments: [segment]
  };
  
  console.debug(`[X-RAY] Sending to daemon:`, {
    segmentId: segment.id,
    name: segment.name,
    duration: segment.duration,
    annotations: Object.keys((segment.annotations as Record<string, unknown>) || {}),
    metadata: Object.keys((segment.metadata as Record<string, unknown>) || {}),
    daemon: process.env._X_AMZN_TRACE_ID || 'localhost:2000'
  });
}

// ============================================
// 📁 src/internal/metrics-key-utils.ts - METRICS KEY UTILITIES (not exported to end users)
// ============================================
export function createMetricKey(name: string, labels?: UnifiedMetricLabels): string {
  if (!labels || Object.keys(labels).length === 0) {
    return name;
  }
  
  const labelStr = Object.entries(labels)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}="${v}"`)
    .join(',');
  
  return `${name}{${labelStr}}`;
}

export function sanitizeMetricName(name: string): string {
  return name.replace(/[^a-zA-Z0-9_]/g, '_');
}

export function sanitizeLabelName(name: string): string {
  return name.replace(/[^a-zA-Z0-9_]/g, '_');
}

export function sanitizeLabelValue(value: string): string {
  return value.replace(/[\n\r\t]/g, '_');
}

export function validateMetricName(name: string): boolean {
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name);
}

export function validateLabelName(name: string): boolean {
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name);
}

// ============================================
// 📁 src/provider/provider.ts - CLEAN PROVIDER (using utilities)
// ============================================
import { UnifiedConfigValidator } from '../validation/config-validator';
import { UnifiedConfigurationError } from '../errors/errors';
import { 
  createTracerFromConfig, 
  createMetricsFromConfig, 
  createLoggerFromConfig,
  createDefaultTags
} from '../internal/provider-utils';

export class UnifiedObservabilityProvider {
  readonly serviceName: string;
  readonly serviceVersion: string;
  readonly environment: string;
  readonly tracer?: UnifiedTracer;
  readonly metrics?: UnifiedMetricsRegistry;
  readonly logger: UnifiedLogger;
  readonly defaultTags: Record<string, string>;
  
  private readonly config: UnifiedObservabilityConfig;

  constructor(config: UnifiedObservabilityConfig) {
    // Validate configuration
    const validation = UnifiedConfigValidator.validate(config);
    if (!validation.isValid) {
      throw new UnifiedConfigurationError(`Configuration validation failed: ${validation.errors.join(', ')}`);
    }

    this.config = config;
    this.serviceName = config.serviceName;
    this.serviceVersion = config.serviceVersion || '1.0.0';
    this.environment = config.environment || 'development';
    this.defaultTags = createDefaultTags(config);
    
    // Initialize components using utilities
    this.logger = createLoggerFromConfig(config);
    this.tracer = createTracerFromConfig(config, this.logger);
    this.metrics = createMetricsFromConfig(config, this.defaultTags, this.logger);

    // Log initialization
    this.logger.info('Unified observability provider initialized', {
      serviceName: this.serviceName,
      serviceVersion: this.serviceVersion,
      environment: this.environment,
      tracingEnabled: !!this.tracer,
      metricsEnabled: !!this.metrics
    });
  }

  createRootContext(operationName: string, parentContext?: UnifiedSpanContext): UnifiedObservabilityContext {
    return new UnifiedObservabilityContext(this, operationName, undefined, parentContext);
  }

  createChildContext(operationName: string, parentSpan: UnifiedSpan): UnifiedObservabilityContext {
    return new UnifiedObservabilityContext(this, operationName, parentSpan);
  }

  async shutdown(): Promise<void> {
    this.logger.info('Shutting down unified observability provider', {
      serviceName: this.serviceName
    });

    // Shutdown components in reverse order
    try {
      if (this.metrics && 'shutdown' in this.metrics) {
        await (this.metrics as UnifiedMetricsRegistry & { shutdown(): Promise<void> }).shutdown();
      }
    } catch (error) {
      this.logger.warn('Error shutting down metrics', { 
        error: error instanceof Error ? error.message : String(error)
      });
    }

    try {
      if (this.tracer && 'shutdown' in this.tracer) {
        await (this.tracer as UnifiedTracer & { shutdown(): Promise<void> }).shutdown();
      }
    } catch (error) {
      this.logger.warn('Error shutting down tracer', { 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
}

// ============================================
// 📁 src/factory/factory.ts - CLEAN FACTORY (using utilities)
// ============================================
import { 
  createTracingConfigFromEnv, 
  createMetricsConfigFromEnv, 
  createLoggingConfigFromEnv,
  createEnvironmentTags
} from '../internal/factory-utils';

export class UnifiedObservabilityFactory {
  static createProvider(config: UnifiedObservabilityConfig): UnifiedObservabilityProvider {
    return new UnifiedObservabilityProvider(config);
  }

  static createFromEnvironment(serviceName: string): UnifiedObservabilityProvider {
    const config: UnifiedObservabilityConfig = {
      serviceName,
      serviceVersion: process.env.SERVICE_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      
      tracing: createTracingConfigFromEnv(),
      metrics: createMetricsConfigFromEnv(),
      logging: createLoggingConfigFromEnv(),
      
      defaultTags: createEnvironmentTags()
    };

    return new UnifiedObservabilityProvider(config);
  }
}

// ============================================
// 📁 src/internal/logging-utils.ts - LOGGING UTILITIES (not exported to end users)
// ============================================
export function enrichLogData(
  context: UnifiedObservabilityContext,
  data?: UnifiedLogData
): UnifiedLogData {
  return {
    contextId: context.contextId,
    operationName: context.operationName,
    serviceName: context.provider.serviceName,
    serviceVersion: context.provider.serviceVersion,
    environment: context.provider.environment,
    traceId: context.span?.traceId,
    spanId: context.span?.spanId,
    parentSpanId: context.span?.parentSpanId,
    duration: context.getDuration(),
    ...data
  };
}

export function logWithSpan(
  context: UnifiedObservabilityContext,
  level: UnifiedLogLevel,
  message: string,
  data?: UnifiedLogData
): void {
  const enrichedData = enrichLogData(context, data);
  
  // Log to logger
  context.provider.logger[level](message, enrichedData);
  
  // Add log to span
  if (context.span && context.provider.tracer) {
    context.provider.tracer.addLog(context.span, message, level, enrichedData);
  }
}

export function logError(
  context: UnifiedObservabilityContext,
  message: string,
  data?: UnifiedLogData
): void {
  logWithSpan(context, 'error', message, data);
  
  // Mark span as error
  if (context.span && context.provider.tracer) {
    const errorInfo: UnifiedErrorInfo = {
      message,
      context: data
    };
    context.provider.tracer.setError(context.span, errorInfo);
  }
}

export function logFatal(
  context: UnifiedObservabilityContext,
  message: string,
  data?: UnifiedLogData
): void {
  logWithSpan(context, 'fatal', message, data);
  
  // Mark span as fatal error
  if (context.span && context.provider.tracer) {
    context.provider.tracer.setTag(context.span, 'error', true);
    context.provider.tracer.setTag(context.span, 'error.kind', 'fatal');
  }
}

// ============================================
// 📁 src/internal/tracing-utils.ts - TRACING UTILITIES (not exported to end users)
// ============================================
export function createSpanFromContext(
  context: UnifiedObservabilityContext,
  operationName: string,
  parentSpan?: UnifiedSpan,
  parentContext?: UnifiedSpanContext
): UnifiedSpan | undefined {
  if (!context.provider.tracer) return undefined;

  const options: UnifiedSpanOptions = {
    startTime: context.startTime,
    tags: {
      'operation.name': operationName,
      'context.id': context.contextId,
      ...context.provider.defaultTags
    }
  };

  if (parentContext && !parentSpan) {
    // 🌐 DISTRIBUTED TRACING: Create new span from remote parent context
    return context.provider.tracer.startSpan(operationName, undefined, {
      ...options,
      references: [{
        type: 'childOf',
        referencedContext: parentContext
      }]
    });
  } else if (parentSpan) {
    // 🔗 LOCAL TRACING: Create child span from local parent span
    return context.provider.tracer.startSpan(operationName, parentSpan, options);
  } else {
    // 🎯 ROOT SPAN: Create new trace root
    return context.provider.tracer.startSpan(operationName, undefined, options);
  }
}

export function setSpanTag(
  context: UnifiedObservabilityContext,
  key: string,
  value: string | number | boolean
): void {
  if (context.span && context.provider.tracer) {
    context.provider.tracer.setTag(context.span, key, value);
  }
}

export function setSpanError(
  context: UnifiedObservabilityContext,
  error: Error | UnifiedErrorInfo
): void {
  if (!context.span || !context.provider.tracer) return;

  const errorInfo: UnifiedErrorInfo = error instanceof Error ? {
    message: error.message,
    stack: error.stack,
    type: error.constructor.name
  } : error;

  context.provider.tracer.setError(context.span, errorInfo);
}

export function getTraceHeaders(context: UnifiedObservabilityContext): Record<string, string> {
  if (!context.span || !context.provider.tracer) return {};

  const headers: Record<string, string> = {};
  context.provider.tracer.inject(context.span, 'http_headers', headers);
  return headers;
}

export function finishSpan(context: UnifiedObservabilityContext): void {
  if (context.span && context.provider.tracer) {
    const duration = Date.now() - context.startTime.getTime();
    setSpanTag(context, 'duration_ms', duration);
    context.provider.tracer.finishSpan(context.span);
  }
}

// ============================================
// 📁 src/internal/metrics-utils.ts - METRICS UTILITIES (not exported to end users)
// ============================================
export function createMetricLabels(
  context: UnifiedObservabilityContext,
  additionalLabels?: Record<string, string>
): Record<string, string> {
  return {
    operation: context.operationName,
    ...context.provider.defaultTags,
    ...additionalLabels
  };
}

export function createCounterWrapper(
  context: UnifiedObservabilityContext,
  name: string,
  labels?: Record<string, string>
): UnifiedCounterWrapper {
  if (!context.provider.metrics) {
    return new UnifiedNullCounterWrapper();
  }
  
  const counter = context.provider.metrics.counter(name);
  return new UnifiedCounterWrapper(counter, createMetricLabels(context, labels));
}

export function createGaugeWrapper(
  context: UnifiedObservabilityContext,
  name: string,
  labels?: Record<string, string>
): UnifiedGaugeWrapper {
  if (!context.provider.metrics) {
    return new UnifiedNullGaugeWrapper();
  }
  
  const gauge = context.provider.metrics.gauge(name);
  return new UnifiedGaugeWrapper(gauge, createMetricLabels(context, labels));
}

export function createHistogramWrapper(
  context: UnifiedObservabilityContext,
  name: string,
  labels?: Record<string, string>,
  buckets?: number[]
): UnifiedHistogramWrapper {
  if (!context.provider.metrics) {
    return new UnifiedNullHistogramWrapper();
  }
  
  const histogram = context.provider.metrics.histogram(name, undefined, undefined, buckets);
  return new UnifiedHistogramWrapper(histogram, createMetricLabels(context, labels));
}

export function createTimerWrapper(
  context: UnifiedObservabilityContext,
  name: string,
  labels?: Record<string, string>
): UnifiedTimerWrapper {
  if (!context.provider.metrics) {
    return new UnifiedNullTimerWrapper();
  }
  
  const timer = context.provider.metrics.timer(name);
  return new UnifiedTimerWrapper(timer, createMetricLabels(context, labels));
}

// ============================================
// 📁 src/context/context.ts - CLEAN CONTEXT (separated concerns)
// ============================================
import { v4 as uuid } from 'uuid';
import * as LoggingUtils from '../internal/logging-utils';
import * as TracingUtils from '../internal/tracing-utils';
import * as MetricsUtils from '../internal/metrics-utils';

export class UnifiedObservabilityContext {
  readonly contextId: string;
  readonly operationName: string;
  readonly provider: UnifiedObservabilityProvider;
  readonly span?: UnifiedSpan;
  readonly startTime: Date;
  
  private finished: boolean = false;

  constructor(
    provider: UnifiedObservabilityProvider,
    operationName: string,
    parentSpan?: UnifiedSpan,
    parentContext?: UnifiedSpanContext
  ) {
    this.contextId = uuid();
    this.operationName = operationName;
    this.provider = provider;
    this.startTime = new Date();
    
    // Create span using tracing utils
    this.span = TracingUtils.createSpanFromContext(this, operationName, parentSpan, parentContext);
  }

  // ============================================
  // LOGGING METHODS (delegated to logging utils)
  // ============================================
  
  trace(message: string, data?: UnifiedLogData): void {
    LoggingUtils.logWithSpan(this, 'trace', message, data);
  }

  debug(message: string, data?: UnifiedLogData): void {
    LoggingUtils.logWithSpan(this, 'debug', message, data);
  }

  info(message: string, data?: UnifiedLogData): void {
    LoggingUtils.logWithSpan(this, 'info', message, data);
  }

  warn(message: string, data?: UnifiedLogData): void {
    LoggingUtils.logWithSpan(this, 'warn', message, data);
  }

  error(message: string, data?: UnifiedLogData): void {
    LoggingUtils.logError(this, message, data);
  }

  fatal(message: string, data?: UnifiedLogData): void {
    LoggingUtils.logFatal(this, message, data);
  }

  // ============================================
  // TRACING METHODS (delegated to tracing utils)
  // ============================================
  
  setTag(key: string, value: string | number | boolean): void {
    TracingUtils.setSpanTag(this, key, value);
  }

  addSpanLog(message: string, level?: UnifiedLogLevel, fields?: Record<string, unknown>): void {
    if (this.span && this.provider.tracer) {
      this.provider.tracer.addLog(this.span, message, level, fields);
    }
  }

  setError(error: Error | UnifiedErrorInfo): void {
    TracingUtils.setSpanError(this, error);
  }

  getTraceId(): string | undefined {
    return this.span?.traceId;
  }

  getSpanId(): string | undefined {
    return this.span?.spanId;
  }

  getTraceHeaders(): Record<string, string> {
    return TracingUtils.getTraceHeaders(this);
  }

  // ============================================
  // METRICS METHODS (delegated to metrics utils)
  // ============================================
  
  counter(name: string, labels?: Record<string, string>): UnifiedCounterWrapper {
    return MetricsUtils.createCounterWrapper(this, name, labels);
  }

  gauge(name: string, labels?: Record<string, string>): UnifiedGaugeWrapper {
    return MetricsUtils.createGaugeWrapper(this, name, labels);
  }

  histogram(name: string, labels?: Record<string, string>, buckets?: number[]): UnifiedHistogramWrapper {
    return MetricsUtils.createHistogramWrapper(this, name, labels, buckets);
  }

  timer(name: string, labels?: Record<string, string>): UnifiedTimerWrapper {
    return MetricsUtils.createTimerWrapper(this, name, labels);
  }

  // ============================================
  // CONTEXT MANAGEMENT
  // ============================================
  
  createChild(operationName: string): UnifiedObservabilityContext {
    return new UnifiedObservabilityContext(this.provider, operationName, this.span);
  }

  finish(): void {
    if (this.finished) return;
    this.finished = true;
    TracingUtils.finishSpan(this);
  }

  isFinished(): boolean {
    return this.finished;
  }

  getDuration(): number {
    return Date.now() - this.startTime.getTime();
  }
}

// ============================================
// 📁 src/implementations/metrics.ts - COMPLETE METRICS IMPLEMENTATIONS (using utilities)
// ============================================
import { createMetricKey, sanitizeMetricName, sanitizeLabelName, sanitizeLabelValue } from '../internal/metrics-key-utils';

export class UnifiedPrometheusMetrics implements UnifiedMetricsRegistry {
  private counters = new Map<string, Map<string, number>>();
  private gauges = new Map<string, Map<string, number>>();
  private histograms = new Map<string, Map<string, { count: number; sum: number; buckets: Map<number, number> }>>();
  private timers = new Map<string, Map<string, number[]>>();
  private serviceName: string;
  private defaultLabels: Record<string, string>;

  constructor(config: { serviceName: string; defaultLabels?: Record<string, string> } & UnifiedPrometheusConfig) {
    this.serviceName = config.serviceName;
    this.defaultLabels = config.defaultLabels || {};
    console.log(`Initializing Prometheus metrics registry for ${config.serviceName}`);
  }

  counter(name: string, help?: string, labelNames?: string[]): UnifiedCounter {
    const sanitizedName = sanitizeMetricName(name);
    
    if (!this.counters.has(sanitizedName)) {
      this.counters.set(sanitizedName, new Map());
    }
    
    const counterMap = this.counters.get(sanitizedName)!;
    
    return {
      increment: (labels?: UnifiedMetricLabels) => {
        const key = createMetricKey(sanitizedName, this.sanitizeLabels(labels));
        const current = counterMap.get(key) || 0;
        counterMap.set(key, current + 1);
        console.debug(`[PROMETHEUS] Counter++: ${name}`, labels);
      },
      add: (value: number, labels?: UnifiedMetricLabels) => {
        const key = createMetricKey(sanitizedName, this.sanitizeLabels(labels));
        const current = counterMap.get(key) || 0;
        counterMap.set(key, current + value);
        console.debug(`[PROMETHEUS] Counter+=${value}: ${name}`, labels);
      },
      get: (labels?: UnifiedMetricLabels) => {
        const key = createMetricKey(sanitizedName, this.sanitizeLabels(labels));
        return counterMap.get(key) || 0;
      }
    };
  }

  gauge(name: string, help?: string, labelNames?: string[]): UnifiedGauge {
    const sanitizedName = sanitizeMetricName(name);
    
    if (!this.gauges.has(sanitizedName)) {
      this.gauges.set(sanitizedName, new Map());
    }
    
    const gaugeMap = this.gauges.get(sanitizedName)!;
    
    return {
      set: (value: number, labels?: UnifiedMetricLabels) => {
        const key = createMetricKey(sanitizedName, this.sanitizeLabels(labels));
        gaugeMap.set(key, value);
        console.debug(`[PROMETHEUS] Gauge=${value}: ${name}`, labels);
      },
      increment: (labels?: UnifiedMetricLabels) => {
        const key = createMetricKey(sanitizedName, this.sanitizeLabels(labels));
        const current = gaugeMap.get(key) || 0;
        gaugeMap.set(key, current + 1);
        console.debug(`[PROMETHEUS] Gauge++: ${name}`, labels);
      },
      decrement: (labels?: UnifiedMetricLabels) => {
        const key = createMetricKey(sanitizedName, this.sanitizeLabels(labels));
        const current = gaugeMap.get(key) || 0;
        gaugeMap.set(key, current - 1);
        console.debug(`[PROMETHEUS] Gauge--: ${name}`, labels);
      },
      add: (value: number, labels?: UnifiedMetricLabels) => {
        const key = createMetricKey(sanitizedName, this.sanitizeLabels(labels));
        const current = gaugeMap.get(key) || 0;
        gaugeMap.set(key, current + value);
        console.debug(`[PROMETHEUS] Gauge+=${value}: ${name}`, labels);
      },
      get: (labels?: UnifiedMetricLabels) => {
        const key = createMetricKey(sanitizedName, this.sanitizeLabels(labels));
        return gaugeMap.get(key) || 0;
      }
    };
  }

  histogram(name: string, help?: string, labelNames?: string[], buckets?: number[]): UnifiedHistogram {
    const sanitizedName = sanitizeMetricName(name);
    const defaultBuckets = buckets || [0.005, 0.01, 0.025, 0.05, 0.075, 0.1, 0.25, 0.5, 0.75, 1.0, 2.5, 5.0, 7.5, 10.0];
    
    if (!this.histograms.has(sanitizedName)) {
      this.histograms.set(sanitizedName, new Map());
    }
    
    const histogramMap = this.histograms.get(sanitizedName)!;
    
    return {
      observe: (value: number, labels?: UnifiedMetricLabels) => {
        const key = createMetricKey(sanitizedName, this.sanitizeLabels(labels));
        const current = histogramMap.get(key) || { count: 0, sum: 0, buckets: new Map() };
        
        current.count++;
        current.sum += value;
        
        // Update buckets
        for (const bucket of defaultBuckets) {
          if (value <= bucket) {
            current.buckets.set(bucket, (current.buckets.get(bucket) || 0) + 1);
          }
        }
        
        histogramMap.set(key, current);
        console.debug(`[PROMETHEUS] Histogram=${value}: ${name}`, labels);
      },
      time: <T>(fn: () => T | Promise<T>, labels?: UnifiedMetricLabels): T | Promise<T> => {
        const start = Date.now();
        const result = fn();
        
        if (result instanceof Promise) {
          return result.finally(() => {
            const duration = (Date.now() - start) / 1000; // Convert to seconds
            this.histogram(name).observe(duration, labels);
            console.debug(`[PROMETHEUS] Histogram=${duration}s: ${name}`, labels);
          }) as Promise<T>;
        } else {
          const duration = (Date.now() - start) / 1000; // Convert to seconds
          this.histogram(name).observe(duration, labels);
          console.debug(`[PROMETHEUS] Histogram=${duration}s: ${name}`, labels);
          return result;
        }
      },
      getMetrics: (labels?: UnifiedMetricLabels) => {
        const key = createMetricKey(sanitizedName, this.sanitizeLabels(labels));
        const data = histogramMap.get(key);
        if (!data) {
          return { count: 0, sum: 0, buckets: {} };
        }
        
        const buckets: Record<string, number> = {};
        for (const [bucket, count] of data.buckets) {
          buckets[bucket.toString()] = count;
        }
        
        return {
          count: data.count,
          sum: data.sum,
          buckets
        };
      }
    };
  }

  timer(name: string, help?: string, labelNames?: string[]): UnifiedTimer {
    const sanitizedName = sanitizeMetricName(name);
    
    if (!this.timers.has(sanitizedName)) {
      this.timers.set(sanitizedName, new Map());
    }
    
    const timerMap = this.timers.get(sanitizedName)!;
    
    return {
      start: () => {
        const startTime = Date.now();
        return {
          stop: () => Date.now() - startTime,
          record: (labels?: UnifiedMetricLabels) => {
            const duration = Date.now() - startTime;
            const key = createMetricKey(sanitizedName, this.sanitizeLabels(labels));
            const current = timerMap.get(key) || [];
            current.push(duration);
            timerMap.set(key, current);
            console.debug(`[PROMETHEUS] Timer=${duration}ms: ${name}`, labels);
            return duration;
          }
        };
      },
      record: (durationMs: number, labels?: UnifiedMetricLabels) => {
        const key = createMetricKey(sanitizedName, this.sanitizeLabels(labels));
        const current = timerMap.get(key) || [];
        current.push(durationMs);
        timerMap.set(key, current);
        console.debug(`[PROMETHEUS] Timer=${durationMs}ms: ${name}`, labels);
      }
    };
  }

  clear(): void {
    this.counters.clear();
    this.gauges.clear();
    this.histograms.clear();
    this.timers.clear();
  }

  getMetrics(): string {
    const lines: string[] = [];
    
    // Export counters
    for (const [name, counterMap] of this.counters) {
      lines.push(`# HELP ${name} Counter metric`);
      lines.push(`# TYPE ${name} counter`);
      for (const [key, value] of counterMap) {
        lines.push(`${key} ${value}`);
      }
    }
    
    // Export gauges
    for (const [name, gaugeMap] of this.gauges) {
      lines.push(`# HELP ${name} Gauge metric`);
      lines.push(`# TYPE ${name} gauge`);
      for (const [key, value] of gaugeMap) {
        lines.push(`${key} ${value}`);
      }
    }
    
    // Export histograms
    for (const [name, histogramMap] of this.histograms) {
      lines.push(`# HELP ${name} Histogram metric`);
      lines.push(`# TYPE ${name} histogram`);
      for (const [key, data] of histogramMap) {
        const baseKey = key.replace(/}$/, '');
        lines.push(`${baseKey}_count} ${data.count}`);
        lines.push(`${baseKey}_sum} ${data.sum}`);
        for (const [bucket, count] of data.buckets) {
          lines.push(`${baseKey}_bucket{le="${bucket}"} ${count}`);
        }
      }
    }
    
    return lines.join('\n');
  }

  private sanitizeLabels(labels?: UnifiedMetricLabels): Record<string, string> {
    if (!labels) return this.defaultLabels;
    
    const sanitized: Record<string, string> = { ...this.defaultLabels };
    for (const [key, value] of Object.entries(labels)) {
      sanitized[sanitizeLabelName(key)] = sanitizeLabelValue(value);
    }
    return sanitized;
  }
}

export class UnifiedOtelMetrics implements UnifiedMetricsRegistry {
  private serviceName: string;
  private serviceVersion: string;
  private environment: string;
  private metrics = new Map<string, { type: string; value: number; labels: Record<string, string> }>();

  constructor(config: { serviceName: string; serviceVersion: string; environment: string } & UnifiedOtelMetricsConfig) {
    this.serviceName = config.serviceName;
    this.serviceVersion = config.serviceVersion;
    this.environment = config.environment;
    console.log(`Initializing OpenTelemetry metrics for ${config.serviceName}`);
  }

  counter(name: string, help?: string, labelNames?: string[]): UnifiedCounter {
    console.debug(`[OTEL] Counter created: ${name}`);
    
    return {
      increment: (labels?: UnifiedMetricLabels) => {
        const key = createMetricKey(name, labels);
        const current = this.metrics.get(key) || { type: 'counter', value: 0, labels: labels || {} };
        this.metrics.set(key, { ...current, value: current.value + 1 });
        console.debug(`[OTEL] Counter++: ${name}`, labels);
      },
      add: (value: number, labels?: UnifiedMetricLabels) => {
        const key = createMetricKey(name, labels);
        const current = this.metrics.get(key) || { type: 'counter', value: 0, labels: labels || {} };
        this.metrics.set(key, { ...current, value: current.value + value });
        console.debug(`[OTEL] Counter+=${value}: ${name}`, labels);
      },
      get: (labels?: UnifiedMetricLabels) => {
        const key = createMetricKey(name, labels);
        return this.metrics.get(key)?.value || 0;
      }
    };
  }

  gauge(name: string, help?: string, labelNames?: string[]): UnifiedGauge {
    console.debug(`[OTEL] Gauge created: ${name}`);
    
    return {
      set: (value: number, labels?: UnifiedMetricLabels) => {
        const key = createMetricKey(name, labels);
        this.metrics.set(key, { type: 'gauge', value, labels: labels || {} });
        console.debug(`[OTEL] Gauge=${value}: ${name}`, labels);
      },
      increment: (labels?: UnifiedMetricLabels) => {
        const key = createMetricKey(name, labels);
        const current = this.metrics.get(key) || { type: 'gauge', value: 0, labels: labels || {} };
        this.metrics.set(key, { ...current, value: current.value + 1 });
        console.debug(`[OTEL] Gauge++: ${name}`, labels);
      },
      decrement: (labels?: UnifiedMetricLabels) => {
        const key = createMetricKey(name, labels);
        const current = this.metrics.get(key) || { type: 'gauge', value: 0, labels: labels || {} };
        this.metrics.set(key, { ...current, value: current.value - 1 });
        console.debug(`[OTEL] Gauge--: ${name}`, labels);
      },
      add: (value: number, labels?: UnifiedMetricLabels) => {
        const key = createMetricKey(name, labels);
        const current = this.metrics.get(key) || { type: 'gauge', value: 0, labels: labels || {} };
        this.metrics.set(key, { ...current, value: current.value + value });
        console.debug(`[OTEL] Gauge+=${value}: ${name}`, labels);
      },
      get: (labels?: UnifiedMetricLabels) => {
        const key = createMetricKey(name, labels);
        return this.metrics.get(key)?.value || 0;
      }
    };
  }

  histogram(name: string, help?: string, labelNames?: string[], buckets?: number[]): UnifiedHistogram {
    console.debug(`[OTEL] Histogram created: ${name}`, { buckets });
    
    return {
      observe: (value: number, labels?: UnifiedMetricLabels) => {
        const key = createMetricKey(name, labels);
        this.metrics.set(key, { type: 'histogram', value, labels: labels || {} });
        console.debug(`[OTEL] Histogram=${value}: ${name}`, labels);
      },
      time: <T>(fn: () => T | Promise<T>, labels?: UnifiedMetricLabels): T | Promise<T> => {
        const start = Date.now();
        const result = fn();
        
        if (result instanceof Promise) {
          return result.finally(() => {
            const duration = Date.now() - start;
            this.histogram(name).observe(duration, labels);
            console.debug(`[OTEL] Histogram=${duration}ms: ${name}`, labels);
          }) as Promise<T>;
        } else {
          const duration = Date.now() - start;
          this.histogram(name).observe(duration, labels);
          console.debug(`[OTEL] Histogram=${duration}ms: ${name}`, labels);
          return result;
        }
      },
      getMetrics: (labels?: UnifiedMetricLabels) => {
        const key = createMetricKey(name, labels);
        const value = this.metrics.get(key)?.value || 0;
        return { count: 1, sum: value, buckets: {} };
      }
    };
  }

  timer(name: string, help?: string, labelNames?: string[]): UnifiedTimer {
    console.debug(`[OTEL] Timer created: ${name}`);
    
    return {
      start: () => {
        const startTime = Date.now();
        return {
          stop: () => Date.now() - startTime,
          record: (labels?: UnifiedMetricLabels) => {
            const duration = Date.now() - startTime;
            const key = createMetricKey(name, labels);
            this.metrics.set(key, { type: 'timer', value: duration, labels: labels || {} });
            console.debug(`[OTEL] Timer=${duration}ms: ${name}`, labels);
            return duration;
          }
        };
      },
      record: (durationMs: number, labels?: UnifiedMetricLabels) => {
        const key = createMetricKey(name, labels);
        this.metrics.set(key, { type: 'timer', value: durationMs, labels: labels || {} });
        console.debug(`[OTEL] Timer=${durationMs}ms: ${name}`, labels);
      }
    };
  }

  clear(): void {
    this.metrics.clear();
  }

  getMetrics(): string {
    return Array.from(this.metrics.entries())
      .map(([key, value]) => `${key}=${value.value}`)
      .join('\n');
  }
}

export class UnifiedConsoleMetrics implements UnifiedMetricsRegistry {
  private metrics = new Map<string, { type: string; value: number; labels: Record<string, string> }>();

  counter(name: string, help?: string, labelNames?: string[]): UnifiedCounter {
    return {
      increment: (labels?: UnifiedMetricLabels) => {
        const key = createMetricKey(name, labels);
        const current = this.metrics.get(key) || { type: 'counter', value: 0, labels: labels || {} };
        this.metrics.set(key, { ...current, value: current.value + 1 });
        console.debug(`[METRIC] Counter++: ${name}`, labels);
      },
      add: (value: number, labels?: UnifiedMetricLabels) => {
        const key = createMetricKey(name, labels);
        const current = this.metrics.get(key) || { type: 'counter', value: 0, labels: labels || {} };
        this.metrics.set(key, { ...current, value: current.value + value });
        console.debug(`[METRIC] Counter+=${value}: ${name}`, labels);
      },
      get: (labels?: UnifiedMetricLabels) => {
        const key = createMetricKey(name, labels);
        return this.metrics.get(key)?.value || 0;
      }
    };
  }

  gauge(name: string, help?: string, labelNames?: string[]): UnifiedGauge {
    return {
      set: (value: number, labels?: UnifiedMetricLabels) => {
        const key = createMetricKey(name, labels);
        this.metrics.set(key, { type: 'gauge', value, labels: labels || {} });
        console.debug(`[METRIC] Gauge=${value}: ${name}`, labels);
      },
      increment: (labels?: UnifiedMetricLabels) => {
        const key = createMetricKey(name, labels);
        const current = this.metrics.get(key) || { type: 'gauge', value: 0, labels: labels || {} };
        this.metrics.set(key, { ...current, value: current.value + 1 });
        console.debug(`[METRIC] Gauge++: ${name}`, labels);
      },
      decrement: (labels?: UnifiedMetricLabels) => {
        const key = createMetricKey(name, labels);
        const current = this.metrics.get(key) || { type: 'gauge', value: 0, labels: labels || {} };
        this.metrics.set(key, { ...current, value: current.value - 1 });
        console.debug(`[METRIC] Gauge--: ${name}`, labels);
      },
      add: (value: number, labels?: UnifiedMetricLabels) => {
        const key = createMetricKey(name, labels);
        const current = this.metrics.get(key) || { type: 'gauge', value: 0, labels: labels || {} };
        this.metrics.set(key, { ...current, value: current.value + value });
        console.debug(`[METRIC] Gauge+=${value}: ${name}`, labels);
      },
      get: (labels?: UnifiedMetricLabels) => {
        const key = createMetricKey(name, labels);
        return this.metrics.get(key)?.value || 0;
      }
    };
  }

  histogram(name: string, help?: string, labelNames?: string[], buckets?: number[]): UnifiedHistogram {
    return {
      observe: (value: number, labels?: UnifiedMetricLabels) => {
        const key = createMetricKey(name, labels);
        this.metrics.set(key, { type: 'histogram', value, labels: labels || {} });
        console.debug(`[METRIC] Histogram=${value}: ${name}`, labels);
      },
      time: <T>(fn: () => T | Promise<T>, labels?: UnifiedMetricLabels): T | Promise<T> => {
        const start = Date.now();
        const result = fn();
        
        if (result instanceof Promise) {
          return result.finally(() => {
            const duration = Date.now() - start;
            this.histogram(name).observe(duration, labels);
            console.debug(`[METRIC] Histogram=${duration}ms: ${name}`, labels);
          }) as Promise<T>;
        } else {
          const duration = Date.now() - start;
          this.histogram(name).observe(duration, labels);
          console.debug(`[METRIC] Histogram=${duration}ms: ${name}`, labels);
          return result;
        }
      },
      getMetrics: (labels?: UnifiedMetricLabels) => {
        const key = createMetricKey(name, labels);
        const value = this.metrics.get(key)?.value || 0;
        return { count: 1, sum: value, buckets: {} };
      }
    };
  }

  timer(name: string, help?: string, labelNames?: string[]): UnifiedTimer {
    return {
      start: () => {
        const startTime = Date.now();
        return {
          stop: () => Date.now() - startTime,
          record: (labels?: UnifiedMetricLabels) => {
            const duration = Date.now() - startTime;
            const key = createMetricKey(name, labels);
            this.metrics.set(key, { type: 'timer', value: duration, labels: labels || {} });
            console.debug(`[METRIC] Timer=${duration}ms: ${name}`, labels);
            return duration;
          }
        };
      },
      record: (durationMs: number, labels?: UnifiedMetricLabels) => {
        const key = createMetricKey(name, labels);
        this.metrics.set(key, { type: 'timer', value: durationMs, labels: labels || {} });
        console.debug(`[METRIC] Timer=${durationMs}ms: ${name}`, labels);
      }
    };
  }

  clear(): void {
    this.metrics.clear();
  }

  getMetrics(): string {
    return Array.from(this.metrics.entries())
      .map(([key, value]) => `${key}=${value.value}`)
      .join('\n');
  }
}

// ============================================
// 📁 src/adapters/logger-adapters.ts - COMPLETE LOGGER ADAPTERS
// ============================================
export class UnifiedInhLoggerAdapter implements UnifiedLogger {
  private inhLogger: {
    trace?: (message: string, data?: unknown) => void;
    debug?: (message: string, data?: unknown) => void;
    info?: (message: string, data?: unknown) => void;
    warn?: (message: string, data?: unknown) => void;
    error?: (message: string, data?: unknown) => void;
    fatal?: (message: string, data?: unknown) => void;
    createChild?: (context: Record<string, unknown>) => unknown;
  };

  constructor(inhLogger: unknown) {
    this.inhLogger = inhLogger as typeof this.inhLogger;
  }

  trace(message: string, data?: UnifiedLogData): void {
    if (this.inhLogger.trace) {
      this.inhLogger.trace(message, data);
    } else {
      console.debug(`[TRACE] ${message}`, data);
    }
  }

  debug(message: string, data?: UnifiedLogData): void {
    if (this.inhLogger.debug) {
      this.inhLogger.debug(message, data);
    } else {
      console.debug(`[DEBUG] ${message}`, data);
    }
  }

  info(message: string, data?: UnifiedLogData): void {
    if (this.inhLogger.info) {
      this.inhLogger.info(message, data);
    } else {
      console.info(`[INFO] ${message}`, data);
    }
  }

  warn(message: string, data?: UnifiedLogData): void {
    if (this.inhLogger.warn) {
      this.inhLogger.warn(message, data);
    } else {
      console.warn(`[WARN] ${message}`, data);
    }
  }

  error(message: string, data?: UnifiedLogData): void {
    if (this.inhLogger.error) {
      this.inhLogger.error(message, data);
    } else {
      console.error(`[ERROR] ${message}`, data);
    }
  }

  fatal(message: string, data?: UnifiedLogData): void {
    if (this.inhLogger.fatal) {
      this.inhLogger.fatal(message, data);
    } else {
      console.error(`[FATAL] ${message}`, data);
    }
  }

  child(context: Record<string, unknown>): UnifiedLogger {
    if (this.inhLogger.createChild) {
      const childLogger = this.inhLogger.createChild(context);
      return new UnifiedInhLoggerAdapter(childLogger);
    }
    return this;
  }
}

export class UnifiedConsoleLogger implements UnifiedLogger {
  private level: UnifiedLogLevel;
  private context: Record<string, unknown>;
  private levelOrder: Record<UnifiedLogLevel, number> = {
    trace: 0,
    debug: 1,
    info: 2,
    warn: 3,
    error: 4,
    fatal: 5
  };

  constructor(level: UnifiedLogLevel = 'info', context: Record<string, unknown> = {}) {
    this.level = level;
    this.context = context;
  }

  private shouldLog(level: UnifiedLogLevel): boolean {
    return this.levelOrder[level] >= this.levelOrder[this.level];
  }

  private formatMessage(level: UnifiedLogLevel, message: string, data?: UnifiedLogData): string {
    const timestamp = new Date().toISOString();
    const levelStr = level.toUpperCase().padEnd(5);
    const contextStr = Object.keys(this.context).length > 0 ? 
      ` [${Object.entries(this.context).map(([k, v]) => `${k}=${v}`).join(', ')}]` : '';
    
    return `${timestamp} ${levelStr}${contextStr} ${message}`;
  }

  trace(message: string, data?: UnifiedLogData): void {
    if (this.shouldLog('trace')) {
      console.debug(this.formatMessage('trace', message), data);
    }
  }

  debug(message: string, data?: UnifiedLogData): void {
    if (this.shouldLog('debug')) {
      console.debug(this.formatMessage('debug', message), data);
    }
  }

  info(message: string, data?: UnifiedLogData): void {
    if (this.shouldLog('info')) {
      console.info(this.formatMessage('info', message), data);
    }
  }

  warn(message: string, data?: UnifiedLogData): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message), data);
    }
  }

  error(message: string, data?: UnifiedLogData): void {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage('error', message), data);
    }
  }

  fatal(message: string, data?: UnifiedLogData): void {
    if (this.shouldLog('fatal')) {
      console.error(this.formatMessage('fatal', message), data);
    }
  }

  child(context: Record<string, unknown>): UnifiedLogger {
    return new UnifiedConsoleLogger(this.level, { ...this.context, ...context });
  }

  setLevel(level: UnifiedLogLevel): void {
    this.level = level;
  }

  getLevel(): UnifiedLogLevel {
    return this.level;
  }
}

export class UnifiedCustomLoggerAdapter implements UnifiedLogger {
  private customLogger: {
    trace?: (message: string, data?: unknown) => void;
    debug?: (message: string, data?: unknown) => void;
    info?: (message: string, data?: unknown) => void;
    warn?: (message: string, data?: unknown) => void;
    error?: (message: string, data?: unknown) => void;
    fatal?: (message: string, data?: unknown) => void;
    child?: (context: Record<string, unknown>) => unknown;
    setLevel?: (level: string) => void;
    getLevel?: () => string;
  };

  constructor(customLogger: unknown) {
    this.customLogger = customLogger as typeof this.customLogger;
  }

  trace(message: string, data?: UnifiedLogData): void {
    if (this.customLogger.trace) {
      this.customLogger.trace(message, data);
    } else {
      console.debug(`[TRACE] ${message}`, data);
    }
  }

  debug(message: string, data?: UnifiedLogData): void {
    if (this.customLogger.debug) {
      this.customLogger.debug(message, data);
    } else {
      console.debug(`[DEBUG] ${message}`, data);
    }
  }

  info(message: string, data?: UnifiedLogData): void {
    if (this.customLogger.info) {
      this.customLogger.info(message, data);
    } else {
      console.info(`[INFO] ${message}`, data);
    }
  }

  warn(message: string, data?: UnifiedLogData): void {
    if (this.customLogger.warn) {
      this.customLogger.warn(message, data);
    } else {
      console.warn(`[WARN] ${message}`, data);
    }
  }

  error(message: string, data?: UnifiedLogData): void {
    if (this.customLogger.error) {
      this.customLogger.error(message, data);
    } else {
      console.error(`[ERROR] ${message}`, data);
    }
  }

  fatal(message: string, data?: UnifiedLogData): void {
    if (this.customLogger.fatal) {
      this.customLogger.fatal(message, data);
    } else {
      console.error(`[FATAL] ${message}`, data);
    }
  }

  child(context: Record<string, unknown>): UnifiedLogger {
    if (this.customLogger.child) {
      const childLogger = this.customLogger.child(context);
      return new UnifiedCustomLoggerAdapter(childLogger);
    }
    return this;
  }

  setLevel(level: UnifiedLogLevel): void {
    if (this.customLogger.setLevel) {
      this.customLogger.setLevel(level);
    }
  }

  getLevel(): UnifiedLogLevel {
    if (this.customLogger.getLevel) {
      return this.customLogger.getLevel() as UnifiedLogLevel;
    }
    return 'info';
  }
}

// ============================================
// 📁 src/utils/utils.ts - ENHANCED UTILITY FUNCTIONS
// ============================================
export class UnifiedUtils {
  static generateTraceId(): string {
    return Math.random().toString(16).substr(2, 32).padEnd(32, '0');
  }

  static generateSpanId(): string {
    return Math.random().toString(16).substr(2, 16).padEnd(16, '0');
  }

  static isValidTraceId(traceId: string): boolean {
    return /^[0-9a-f]{32}$/.test(traceId);
  }

  static isValidSpanId(spanId: string): boolean {
    return /^[0-9a-f]{16}$/.test(spanId);
  }

  static parseTraceHeader(header: string): { traceId: string; spanId: string; flags?: number } | undefined {
    // Parse various trace header formats (B3, Jaeger, etc.)
    const b3Match = header.match(/^([0-9a-f]{32})-([0-9a-f]{16})(?:-([01]))?$/);
    if (b3Match) {
      return {
        traceId: b3Match[1]!,
        spanId: b3Match[2]!,
        flags: b3Match[3] ? parseInt(b3Match[3], 10) : undefined
      };
    }

    // Parse X-Ray format
    const xrayMatch = header.match(/Root=([^;]+);Parent=([^;]+)/);
    if (xrayMatch) {
      return {
        traceId: xrayMatch[1]!,
        spanId: xrayMatch[2]!
      };
    }

    return undefined;
  }

  static formatDuration(milliseconds: number): string {
    if (milliseconds < 1000) {
      return `${milliseconds.toFixed(2)}ms`;
    } else if (milliseconds < 60000) {
      return `${(milliseconds / 1000).toFixed(2)}s`;
    } else {
      return `${(milliseconds / 60000).toFixed(2)}m`;
    }
  }

  static formatBytes(bytes: number): string {
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 B';
    
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
  }

  static createTraceUrl(traceId: string, backend: UnifiedTracingBackend): string {
    switch (backend) {
      case 'jaeger':
        return `http://localhost:16686/trace/${traceId}`;
      case 'xray':
        return `https://console.aws.amazon.com/xray/home#/traces/${traceId}`;
      default:
        return '';
    }
  }

  static extractServiceFromOperationName(operationName: string): string {
    // Extract service name from operation names like "UserService.GetUser"
    const parts = operationName.split('.');
    return parts.length > 1 ? parts[0]! : 'unknown';
  }

  static sanitizeServiceName(serviceName: string): string {
    return serviceName.replace(/[^a-zA-Z0-9_-]/g, '_');
  }

  static validateEnvironment(environment: string): boolean {
    const validEnvironments = ['development', 'staging', 'production', 'test'];
    return validEnvironments.includes(environment);
  }

  static createCorrelationId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  static parseLogLevel(level: string): UnifiedLogLevel {
    const normalizedLevel = level.toLowerCase();
    const validLevels: UnifiedLogLevel[] = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'];
    return validLevels.includes(normalizedLevel as UnifiedLogLevel) ? 
      normalizedLevel as UnifiedLogLevel : 'info';
  }

  static isProductionEnvironment(): boolean {
    return process.env.NODE_ENV === 'production';
  }

  static getSystemInfo(): Record<string, unknown> {
    return {
      platform: process.platform,
      nodeVersion: process.version,
      arch: process.arch,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
      pid: process.pid,
      ppid: process.ppid
    };
  }

  static async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  static throttle<T extends (...args: Parameters<T>) => ReturnType<T>>(
    func: T,
    limit: number
  ): T {
    let inThrottle: boolean;
    return ((...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    }) as T;
  }

  static debounce<T extends (...args: Parameters<T>) => ReturnType<T>>(
    func: T,
    delay: number
  ): T {
    let timeoutId: NodeJS.Timeout;
    return ((...args: Parameters<T>) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    }) as T;
  }
}

// ============================================
// 📁 src/errors/errors.ts - ERROR CLASSES
// ============================================
export class UnifiedObservabilityError extends Error {
  constructor(message: string, public readonly code?: string) {
    super(message);
    this.name = 'UnifiedObservabilityError';
  }
}

export class UnifiedConfigurationError extends UnifiedObservabilityError {
  constructor(message: string) {
    super(message, 'CONFIGURATION_ERROR');
    this.name = 'UnifiedConfigurationError';
  }
}

export class UnifiedTracingError extends UnifiedObservabilityError {
  constructor(message: string) {
    super(message, 'TRACING_ERROR');
    this.name = 'UnifiedTracingError';
  }
}

export class UnifiedMetricsError extends UnifiedObservabilityError {
  constructor(message: string) {
    super(message, 'METRICS_ERROR');
    this.name = 'UnifiedMetricsError';
  }
}

// ============================================
// 📁 src/wrappers/metrics-wrappers.ts - METRICS WRAPPERS
// ============================================
export class UnifiedCounterWrapper {
  constructor(
    private counter: UnifiedCounter,
    private defaultLabels: Record<string, string>
  ) {}

  increment(additionalLabels?: UnifiedMetricLabels): void {
    this.counter.increment({ ...this.defaultLabels, ...additionalLabels });
  }

  add(value: number, additionalLabels?: UnifiedMetricLabels): void {
    this.counter.add(value, { ...this.defaultLabels, ...additionalLabels });
  }

  get(additionalLabels?: UnifiedMetricLabels): number {
    return this.counter.get({ ...this.defaultLabels, ...additionalLabels });
  }
}

export class UnifiedGaugeWrapper {
  constructor(
    private gauge: UnifiedGauge,
    private defaultLabels: Record<string, string>
  ) {}

  set(value: number, additionalLabels?: UnifiedMetricLabels): void {
    this.gauge.set(value, { ...this.defaultLabels, ...additionalLabels });
  }

  increment(additionalLabels?: UnifiedMetricLabels): void {
    this.gauge.increment({ ...this.defaultLabels, ...additionalLabels });
  }

  decrement(additionalLabels?: UnifiedMetricLabels): void {
    this.gauge.decrement({ ...this.defaultLabels, ...additionalLabels });
  }

  add(value: number, additionalLabels?: UnifiedMetricLabels): void {
    this.gauge.add(value, { ...this.defaultLabels, ...additionalLabels });
  }

  get(additionalLabels?: UnifiedMetricLabels): number {
    return this.gauge.get({ ...this.defaultLabels, ...additionalLabels });
  }
}

export class UnifiedHistogramWrapper {
  constructor(
    private histogram: UnifiedHistogram,
    private defaultLabels: Record<string, string>
  ) {}

  observe(value: number, additionalLabels?: UnifiedMetricLabels): void {
    this.histogram.observe(value, { ...this.defaultLabels, ...additionalLabels });
  }

  time<T>(fn: () => T, additionalLabels?: UnifiedMetricLabels): T;
  time<T>(fn: () => Promise<T>, additionalLabels?: UnifiedMetricLabels): Promise<T>;
  time<T>(fn: () => T | Promise<T>, additionalLabels?: UnifiedMetricLabels): T | Promise<T> {
    return this.histogram.time(fn, { ...this.defaultLabels, ...additionalLabels });
  }

  getMetrics(additionalLabels?: UnifiedMetricLabels): UnifiedHistogramMetrics {
    return this.histogram.getMetrics({ ...this.defaultLabels, ...additionalLabels });
  }
}

export class UnifiedTimerWrapper {
  constructor(
    private timer: UnifiedTimer,
    private defaultLabels: Record<string, string>
  ) {}

  start(): UnifiedTimerInstance {
    return this.timer.start();
  }

  record(durationMs: number, additionalLabels?: UnifiedMetricLabels): void {
    this.timer.record(durationMs, { ...this.defaultLabels, ...additionalLabels });
  }
}

// Null object pattern for disabled metrics
export class UnifiedNullCounterWrapper extends UnifiedCounterWrapper {
  constructor() {
    super(null as unknown as UnifiedCounter, {});
  }

  increment(): void {}
  add(): void {}
  get(): number { return 0; }
}

export class UnifiedNullGaugeWrapper extends UnifiedGaugeWrapper {
  constructor() {
    super(null as unknown as UnifiedGauge, {});
  }

  set(): void {}
  increment(): void {}
  decrement(): void {}
  add(): void {}
  get(): number { return 0; }
}

export class UnifiedNullHistogramWrapper extends UnifiedHistogramWrapper {
  constructor() {
    super(null as unknown as UnifiedHistogram, {});
  }

  observe(): void {}
  time<T>(fn: () => T | Promise<T>): T | Promise<T> { return fn(); }
  getMetrics(): UnifiedHistogramMetrics { 
    return { count: 0, sum: 0, buckets: {} }; 
  }
}

export class UnifiedNullTimerWrapper extends UnifiedTimerWrapper {
  constructor() {
    super(null as unknown as UnifiedTimer, {});
  }

  start(): UnifiedTimerInstance {
    return {
      stop: () => 0,
      record: () => 0
    };
  }

  record(): void {}
}

// ============================================
// 📁 tsconfig.json - TYPESCRIPT CONFIGURATION
// ============================================
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "removeComments": false,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "moduleResolution": "node",
    "allowSyntheticDefaultImports": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "resolveJsonModule": true,
    "typeRoots": ["./node_modules/@types", "./src/@types"],
    "types": ["node", "jest"],
    "baseUrl": "./src",
    "paths": {
      "@/*": ["*"],
      "@/internal/*": ["internal/*"],
      "@/testing/*": ["testing/*"]
    }
  },
  "include": [
    "src/**/*"
  ],
  "exclude": [
    "node_modules",
    "dist",
    "**/*.test.ts",
    "**/*.spec.ts"
  ]
}

// ============================================
// 📁 jest.config.js - JEST CONFIGURATION
// ============================================
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: [
    '**/__tests__/**/*.ts',
    '**/?(*.)+(spec|test).ts'
  ],
  transform: {
    '^.+\\.ts

// ============================================
// 📁 src/integrations/fastify.ts - FASTIFY INTEGRATION
// ============================================
export interface UnifiedFastifyOptions {
  provider: UnifiedObservabilityProvider;
  ignorePaths?: string[];
  ignoreUserAgent?: RegExp;
  extractUserContext?: (request: unknown) => Record<string, unknown>;
}

export function createUnifiedFastifyPlugin(options: UnifiedFastifyOptions) {
  return async function unifiedObservabilityPlugin(fastify: unknown) {
    const fastifyInstance = fastify as {
      addHook: (hook: string, handler: (request: UnifiedFastifyRequest, reply?: unknown) => Promise<void>) => void;
      decorateRequest: (name: string, value: unknown) => void;
    };

    // Decorate request with observability context
    fastifyInstance.decorateRequest('observability', null);

    // Request hook
    fastifyInstance.addHook('onRequest', async (request: UnifiedFastifyRequest) => {
      const shouldIgnore = options.ignorePaths?.some(path => 
        request.url?.startsWith(path)
      ) || (options.ignoreUserAgent && 
           options.ignoreUserAgent.test(request.headers['user-agent'] || ''));

      if (shouldIgnore) return;

      // Extract parent context from headers
      let parentContext: UnifiedSpanContext | undefined;
      if (options.provider.tracer) {
        parentContext = options.provider.tracer.extract('http_headers', request.headers as Record<string, string>);
      }

      // Create request context
      const operationName = `${request.method} ${request.url}`;
      const context = options.provider.createRootContext(operationName, parentContext);

      // Set request tags
      context.setTag('http.method', request.method || 'unknown');
      context.setTag('http.url', request.url || 'unknown');
      context.setTag('http.user_agent', request.headers['user-agent'] || 'unknown');

      // Extract user context if provided
      if (options.extractUserContext) {
        const userContext = options.extractUserContext(request);
        Object.entries(userContext).forEach(([key, value]) => {
          context.setTag(`user.${key}`, String(value));
        });
      }

      request.observability = context;

      context.info('HTTP request started', {
        method: request.method,
        url: request.url,
        userAgent: request.headers['user-agent']
      });
    });

    // Response hook
    fastifyInstance.addHook('onResponse', async (request: UnifiedFastifyRequest, reply) => {
      const context = request.observability;
      if (!context) return;

      const replyObj = reply as { statusCode: number };
      context.setTag('http.status_code', replyObj.statusCode);

      const level = replyObj.statusCode >= 500 ? 'error' : 
                   replyObj.statusCode >= 400 ? 'warn' : 'info';

      context[level]('HTTP request completed', {
        statusCode: replyObj.statusCode,
        duration: context.getDuration()
      });

      context.finish();
    });
  };
}

interface UnifiedFastifyRequest {
  method?: string;
  url?: string;
  headers: Record<string, string | string[] | undefined>;
  observability?: UnifiedObservabilityContext;
}

// ============================================
// 📁 src/index.ts - MAIN EXPORTS (for end users)
// ============================================
// Core exports
export * from './types/core';
export * from './interfaces/tracer';
export * from './interfaces/metrics';
export * from './interfaces/logger';
export * from './config/types';

// Main classes
export { UnifiedObservabilityProvider } from './provider/provider';
export { UnifiedObservabilityContext } from './context/context';

// Implementations
export * from './implementations/tracers';
export * from './implementations/metrics';
export * from './adapters/logger-adapters';

// Utilities
export { UnifiedConfigValidator } from './validation/config-validator';
export { UnifiedUtils } from './utils/utils';
export * from './errors/errors';

// Integrations
export * from './integrations/fastify';

// Factory
export { UnifiedObservabilityFactory } from './factory/factory';

// Wrappers
export * from './wrappers/metrics-wrappers';

// ============================================
// 📁 src/internal/index.ts - INTERNAL EXPORTS (for testing only)
// ============================================
/**
 * Internal utilities for testing purposes only.
 * These exports are not intended for end users.
 * 
 * @internal
 */

// Logging utilities
export * as LoggingUtils from './logging-utils';

// Tracing utilities  
export * as TracingUtils from './tracing-utils';

// Metrics utilities
export * as MetricsUtils from './metrics-utils';

// Re-export for direct access in tests
export { enrichLogData, logWithSpan, logError, logFatal } from './logging-utils';
export { 
  createSpanFromContext, 
  setSpanTag, 
  setSpanError, 
  getTraceHeaders, 
  finishSpan 
} from './tracing-utils';
export { 
  createMetricLabels, 
  createCounterWrapper, 
  createGaugeWrapper, 
  createHistogramWrapper, 
  createTimerWrapper 
} from './metrics-utils';

// ============================================
// 📁 src/testing/index.ts - TESTING UTILITIES
// ============================================
/**
 * Testing utilities and helpers.
 * These exports are intended for testing purposes.
 * 
 * @internal
 */

// Mock implementations
export class UnifiedMockTracer implements UnifiedTracer {
  private spans: Map<string, UnifiedSpan> = new Map();
  
  startSpan(operationName: string, parentSpan?: UnifiedSpan, options?: UnifiedSpanOptions): UnifiedSpan {
    const span: UnifiedSpan = {
      spanId: UnifiedUtils.generateSpanId(),
      traceId: parentSpan?.traceId || UnifiedUtils.generateTraceId(),
      parentSpanId: parentSpan?.spanId,
      operationName,
      startTime: options?.startTime || new Date(),
      tags: { ...options?.tags },
      logs: [],
      context: {
        traceId: parentSpan?.traceId || UnifiedUtils.generateTraceId(),
        spanId: UnifiedUtils.generateSpanId()
      }
    };
    
    this.spans.set(span.spanId, span);
    return span;
  }

  finishSpan(span: UnifiedSpan): void {
    span.endTime = new Date();
  }

  setTag(span: UnifiedSpan, key: string, value: string | number | boolean): void {
    span.tags[key] = value;
  }

  addLog(span: UnifiedSpan, message: string, level?: UnifiedLogLevel, fields?: Record<string, unknown>): void {
    span.logs.push({
      timestamp: new Date(),
      message,
      level,
      fields
    });
  }

  setError(span: UnifiedSpan, error: UnifiedErrorInfo): void {
    span.tags['error'] = true;
    span.tags['error.message'] = error.message;
  }

  inject(span: UnifiedSpan, format: UnifiedInjectFormat, carrier: Record<string, string>): void {
    carrier['x-trace-id'] = span.traceId;
    carrier['x-span-id'] = span.spanId;
  }

  extract(format: UnifiedInjectFormat, carrier: Record<string, string>): UnifiedSpanContext | undefined {
    const traceId = carrier['x-trace-id'];
    const spanId = carrier['x-span-id'];
    
    if (traceId && spanId) {
      return { traceId, spanId };
    }
    
    return undefined;
  }

  getSpans(): UnifiedSpan[] {
    return Array.from(this.spans.values());
  }

  clear(): void {
    this.spans.clear();
  }
}

export class UnifiedMockMetrics implements UnifiedMetricsRegistry {
  private metrics: Map<string, { type: string; value: number; labels: Record<string, string> }> = new Map();
  
  counter(name: string, help?: string, labelNames?: string[]): UnifiedCounter {
    return {
      increment: (labels?: UnifiedMetricLabels) => {
        const key = this.getKey(name, labels);
        const current = this.metrics.get(key) || { type: 'counter', value: 0, labels: labels || {} };
        this.metrics.set(key, { ...current, value: current.value + 1 });
      },
      add: (value: number, labels?: UnifiedMetricLabels) => {
        const key = this.getKey(name, labels);
        const current = this.metrics.get(key) || { type: 'counter', value: 0, labels: labels || {} };
        this.metrics.set(key, { ...current, value: current.value + value });
      },
      get: (labels?: UnifiedMetricLabels) => {
        const key = this.getKey(name, labels);
        return this.metrics.get(key)?.value || 0;
      }
    };
  }

  gauge(name: string, help?: string, labelNames?: string[]): UnifiedGauge {
    return {
      set: (value: number, labels?: UnifiedMetricLabels) => {
        const key = this.getKey(name, labels);
        this.metrics.set(key, { type: 'gauge', value, labels: labels || {} });
      },
      increment: (labels?: UnifiedMetricLabels) => {
        const key = this.getKey(name, labels);
        const current = this.metrics.get(key) || { type: 'gauge', value: 0, labels: labels || {} };
        this.metrics.set(key, { ...current, value: current.value + 1 });
      },
      decrement: (labels?: UnifiedMetricLabels) => {
        const key = this.getKey(name, labels);
        const current = this.metrics.get(key) || { type: 'gauge', value: 0, labels: labels || {} };
        this.metrics.set(key, { ...current, value: current.value - 1 });
      },
      add: (value: number, labels?: UnifiedMetricLabels) => {
        const key = this.getKey(name, labels);
        const current = this.metrics.get(key) || { type: 'gauge', value: 0, labels: labels || {} };
        this.metrics.set(key, { ...current, value: current.value + value });
      },
      get: (labels?: UnifiedMetricLabels) => {
        const key = this.getKey(name, labels);
        return this.metrics.get(key)?.value || 0;
      }
    };
  }

  histogram(name: string, help?: string, labelNames?: string[], buckets?: number[]): UnifiedHistogram {
    return {
      observe: (value: number, labels?: UnifiedMetricLabels) => {
        const key = this.getKey(name, labels);
        this.metrics.set(key, { type: 'histogram', value, labels: labels || {} });
      },
      time: <T>(fn: () => T | Promise<T>, labels?: UnifiedMetricLabels): T | Promise<T> => {
        const start = Date.now();
        const result = fn();
        
        if (result instanceof Promise) {
          return result.finally(() => {
            this.histogram(name).observe(Date.now() - start, labels);
          }) as Promise<T>;
        } else {
          this.histogram(name).observe(Date.now() - start, labels);
          return result;
        }
      },
      getMetrics: (labels?: UnifiedMetricLabels) => {
        const key = this.getKey(name, labels);
        const value = this.metrics.get(key)?.value || 0;
        return { count: 1, sum: value, buckets: {} };
      }
    };
  }

  timer(name: string, help?: string, labelNames?: string[]): UnifiedTimer {
    return {
      start: () => {
        const startTime = Date.now();
        return {
          stop: () => Date.now() - startTime,
          record: (labels?: UnifiedMetricLabels) => {
            const duration = Date.now() - startTime;
            const key = this.getKey(name, labels);
            this.metrics.set(key, { type: 'timer', value: duration, labels: labels || {} });
            return duration;
          }
        };
      },
      record: (durationMs: number, labels?: UnifiedMetricLabels) => {
        const key = this.getKey(name, labels);
        this.metrics.set(key, { type: 'timer', value: durationMs, labels: labels || {} });
      }
    };
  }

  clear(): void {
    this.metrics.clear();
  }

  getMetrics(): string {
    return Array.from(this.metrics.entries())
      .map(([key, value]) => `${key}=${value.value}`)
      .join('\n');
  }

  private getKey(name: string, labels?: UnifiedMetricLabels): string {
    if (!labels || Object.keys(labels).length === 0) {
      return name;
    }
    
    const labelStr = Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}="${v}"`)
      .join(',');
    
    return `${name}{${labelStr}}`;
  }
}

export class UnifiedMockLogger implements UnifiedLogger {
  private logs: Array<{ level: UnifiedLogLevel; message: string; data?: UnifiedLogData }> = [];

  trace(message: string, data?: UnifiedLogData): void {
    this.logs.push({ level: 'trace', message, data });
  }

  debug(message: string, data?: UnifiedLogData): void {
    this.logs.push({ level: 'debug', message, data });
  }

  info(message: string, data?: UnifiedLogData): void {
    this.logs.push({ level: 'info', message, data });
  }

  warn(message: string, data?: UnifiedLogData): void {
    this.logs.push({ level: 'warn', message, data });
  }

  error(message: string, data?: UnifiedLogData): void {
    this.logs.push({ level: 'error', message, data });
  }

  fatal(message: string, data?: UnifiedLogData): void {
    this.logs.push({ level: 'fatal', message, data });
  }

  child(context: Record<string, unknown>): UnifiedLogger {
    return new UnifiedMockLogger();
  }

  getLogs(): Array<{ level: UnifiedLogLevel; message: string; data?: UnifiedLogData }> {
    return [...this.logs];
  }

  clear(): void {
    this.logs = [];
  }
}

// Test helper functions
export function createMockProvider(config?: Partial<UnifiedObservabilityConfig>): UnifiedObservabilityProvider {
  const mockConfig: UnifiedObservabilityConfig = {
    serviceName: 'test-service',
    serviceVersion: '1.0.0',
    environment: 'test',
    tracing: { backend: 'console', enabled: true },
    metrics: { backend: 'console', enabled: true },
    logging: { backend: 'console', level: 'debug' },
    ...config
  };

  return new UnifiedObservabilityProvider(mockConfig);
}

export function createMockContext(
  provider?: UnifiedObservabilityProvider,
  operationName = 'test-operation'
): UnifiedObservabilityContext {
  const mockProvider = provider || createMockProvider();
  return mockProvider.createRootContext(operationName);
}

// ============================================
// 📁 src/implementations/tracers.ts - CLEAN TRACER IMPLEMENTATIONS (using utilities)
// ============================================
import { 
  generateXRayTraceId, 
  generateXRaySpanId, 
  generateStandardTraceId, 
  generateStandardSpanId,
  isIndexedXRayTag,
  createXRaySegment,
  sendToXRayDaemon
} from '../internal/tracer-utils';

export class UnifiedJaegerTracer implements UnifiedTracer {
  private jaeger: unknown;
  private spans = new Map<string, unknown>();
  private serviceName: string;

  constructor(config: { serviceName: string; serviceVersion: string; environment: string } & UnifiedJaegerConfig) {
    this.serviceName = config.serviceName;
    console.log(`Initializing Jaeger tracer for ${config.serviceName}`);
    // In real implementation, use jaeger-client library
  }

  startSpan(operationName: string, parentSpan?: UnifiedSpan, options?: UnifiedSpanOptions): UnifiedSpan {
    const span: UnifiedSpan = {
      spanId: generateStandardSpanId(),
      traceId: parentSpan?.traceId || generateStandardTraceId(),
      parentSpanId: parentSpan?.spanId,
      operationName,
      startTime: options?.startTime || new Date(),
      tags: { ...options?.tags },
      logs: [],
      context: {
        traceId: parentSpan?.traceId || generateStandardTraceId(),
        spanId: generateStandardSpanId()
      }
    };

    console.debug(`[JAEGER] Started span: ${operationName}`, {
      spanId: span.spanId,
      traceId: span.traceId,
      parentSpanId: span.parentSpanId
    });

    return span;
  }

  finishSpan(span: UnifiedSpan): void {
    span.endTime = new Date();
    const duration = span.endTime.getTime() - span.startTime.getTime();

    console.debug(`[JAEGER] Finished span: ${span.operationName}`, {
      spanId: span.spanId,
      duration: `${duration}ms`,
      tags: span.tags
    });
  }

  setTag(span: UnifiedSpan, key: string, value: string | number | boolean): void {
    span.tags[key] = value;
    console.debug(`[JAEGER] Tag set: ${key}=${value}`, { spanId: span.spanId });
  }

  addLog(span: UnifiedSpan, message: string, level?: UnifiedLogLevel, fields?: Record<string, unknown>): void {
    const log = {
      timestamp: new Date(),
      message,
      level,
      fields
    };
    
    span.logs.push(log);
    console.debug(`[JAEGER] Log added: ${message}`, {
      spanId: span.spanId,
      level,
      fields
    });
  }

  setError(span: UnifiedSpan, error: UnifiedErrorInfo): void {
    span.tags.error = true;
    span.tags['error.message'] = error.message;
    if (error.stack) {
      span.tags['error.stack'] = error.stack;
    }
    if (error.type) {
      span.tags['error.type'] = error.type;
    }
  }

  inject(span: UnifiedSpan, format: UnifiedInjectFormat, carrier: Record<string, string>): void {
    if (format === 'http_headers') {
      carrier['x-trace-id'] = span.traceId;
      carrier['x-span-id'] = span.spanId;
    }
  }

  extract(format: UnifiedInjectFormat, carrier: Record<string, string>): UnifiedSpanContext | undefined {
    if (format === 'http_headers') {
      const traceId = carrier['x-trace-id'];
      const spanId = carrier['x-span-id'];
      
      if (traceId && spanId) {
        return { traceId, spanId };
      }
    }
    
    return undefined;
  }
}

export class UnifiedOtelTracer implements UnifiedTracer {
  private serviceName: string;

  constructor(config: { serviceName: string; serviceVersion: string; environment: string } & UnifiedOtelTracingConfig) {
    this.serviceName = config.serviceName;
    console.log(`Initializing OpenTelemetry tracer for ${config.serviceName}`);
    // In real implementation, use @opentelemetry/api
  }

  startSpan(operationName: string, parentSpan?: UnifiedSpan, options?: UnifiedSpanOptions): UnifiedSpan {
    const span: UnifiedSpan = {
      spanId: generateStandardSpanId(),
      traceId: parentSpan?.traceId || generateStandardTraceId(),
      parentSpanId: parentSpan?.spanId,
      operationName,
      startTime: options?.startTime || new Date(),
      tags: { ...options?.tags },
      logs: [],
      context: {
        traceId: parentSpan?.traceId || generateStandardTraceId(),
        spanId: generateStandardSpanId()
      }
    };

    console.debug(`[OTEL] Started span: ${operationName}`, {
      spanId: span.spanId,
      traceId: span.traceId,
      parentSpanId: span.parentSpanId
    });

    return span;
  }

  finishSpan(span: UnifiedSpan): void {
    span.endTime = new Date();
    const duration = span.endTime.getTime() - span.startTime.getTime();

    console.debug(`[OTEL] Finished span: ${span.operationName}`, {
      spanId: span.spanId,
      duration: `${duration}ms`,
      tags: span.tags
    });
  }

  setTag(span: UnifiedSpan, key: string, value: string | number | boolean): void {
    span.tags[key] = value;
    console.debug(`[OTEL] Tag set: ${key}=${value}`, { spanId: span.spanId });
  }

  addLog(span: UnifiedSpan, message: string, level?: UnifiedLogLevel, fields?: Record<string, unknown>): void {
    const log = {
      timestamp: new Date(),
      message,
      level,
      fields
    };
    
    span.logs.push(log);
    console.debug(`[OTEL] Log added: ${message}`, {
      spanId: span.spanId,
      level,
      fields
    });
  }

  setError(span: UnifiedSpan, error: UnifiedErrorInfo): void {
    span.tags.error = true;
    span.tags['error.message'] = error.message;
    if (error.stack) {
      span.tags['error.stack'] = error.stack;
    }
    if (error.type) {
      span.tags['error.type'] = error.type;
    }
  }

  inject(span: UnifiedSpan, format: UnifiedInjectFormat, carrier: Record<string, string>): void {
    if (format === 'http_headers') {
      carrier['x-trace-id'] = span.traceId;
      carrier['x-span-id'] = span.spanId;
    }
  }

  extract(format: UnifiedInjectFormat, carrier: Record<string, string>): UnifiedSpanContext | undefined {
    if (format === 'http_headers') {
      const traceId = carrier['x-trace-id'];
      const spanId = carrier['x-span-id'];
      
      if (traceId && spanId) {
        return { traceId, spanId };
      }
    }
    
    return undefined;
  }
}

export class UnifiedXRayTracer implements UnifiedTracer {
  private serviceName: string;
  private segments = new Map<string, Record<string, unknown>>();

  constructor(config: { serviceName: string; serviceVersion: string; environment: string } & UnifiedXRayConfig) {
    this.serviceName = config.serviceName;
    console.log(`Initializing AWS X-Ray tracer for ${config.serviceName}`);
    console.log(`X-Ray Configuration:`, {
      region: config.region || process.env.AWS_REGION || 'us-east-1',
      daemon: config.daemon || process.env._X_AMZN_TRACE_ID || 'localhost:2000',
      captureAWS: config.captureAWS ?? true,
      captureHTTPs: config.captureHTTPs ?? true
    });
  }

  startSpan(operationName: string, parentSpan?: UnifiedSpan, options?: UnifiedSpanOptions): UnifiedSpan {
    const span: UnifiedSpan = {
      spanId: generateXRaySpanId(),
      traceId: parentSpan?.traceId || generateXRayTraceId(),
      parentSpanId: parentSpan?.spanId,
      operationName,
      startTime: options?.startTime || new Date(),
      tags: { ...options?.tags },
      logs: [],
      context: {
        traceId: parentSpan?.traceId || generateXRayTraceId(),
        spanId: generateXRaySpanId()
      }
    };

    const xraySegment = createXRaySegment(span, this.serviceName);
    this.segments.set(span.spanId, xraySegment);

    console.debug(`[X-RAY] Started segment: ${operationName}`, {
      segmentId: span.spanId,
      traceId: span.traceId,
      parentId: span.parentSpanId,
      serviceName: this.serviceName
    });

    return span;
  }

  finishSpan(span: UnifiedSpan): void {
    span.endTime = new Date();
    const duration = span.endTime.getTime() - span.startTime.getTime();
    
    const xraySegment = this.segments.get(span.spanId);
    if (xraySegment) {
      xraySegment.end_time = span.endTime.getTime() / 1000;
      xraySegment.duration = duration / 1000;
      
      (xraySegment.metadata as Record<string, unknown>).performance = {
        duration_ms: duration,
        start_time: span.startTime.toISOString(),
        end_time: span.endTime.toISOString()
      };

      console.debug(`[X-RAY] Finished segment: ${span.operationName}`, {
        segmentId: span.spanId,
        duration: `${duration}ms`,
        annotations: xraySegment.annotations,
        metadata: Object.keys(xraySegment.metadata as Record<string, unknown>)
      });

      sendToXRayDaemon(xraySegment);
      this.segments.delete(span.spanId);
    }
  }

  setTag(span: UnifiedSpan, key: string, value: string | number | boolean): void {
    span.tags[key] = value;
    
    const xraySegment = this.segments.get(span.spanId);
    if (xraySegment) {
      if (isIndexedXRayTag(key)) {
        (xraySegment.annotations as Record<string, unknown>)[key] = value;
        console.debug(`[X-RAY] Annotation set: ${key}=${value}`, { segmentId: span.spanId });
      } else {
        if (!(xraySegment.metadata as Record<string, unknown>).custom) {
          (xraySegment.metadata as Record<string, unknown>).custom = {};
        }
        ((xraySegment.metadata as Record<string, unknown>).custom as Record<string, unknown>)[key] = value;
        console.debug(`[X-RAY] Metadata set: ${key}=${value}`, { segmentId: span.spanId });
      }
    }
  }

  addLog(span: UnifiedSpan, message: string, level?: UnifiedLogLevel, fields?: Record<string, unknown>): void {
    const log = {
      timestamp: new Date(),
      message,
      level,
      fields
    };
    
    span.logs.push(log);
    
    const xraySegment = this.segments.get(span.spanId);
    if (xraySegment) {
      if (!(xraySegment.metadata as Record<string, unknown>).logs) {
        (xraySegment.metadata as Record<string, unknown>).logs = [];
      }
      
      ((xraySegment.metadata as Record<string, unknown>).logs as unknown[]).push({
        timestamp: log.timestamp.toISOString(),
        message,
        level,
        fields
      });

      if (level === 'error') {
        xraySegment.error = true;
        xraySegment.fault = true;
        if (fields?.error) {
          xraySegment.cause = {
            exceptions: [{
              message: fields.error,
              type: (fields.error_type as string) || 'Error'
            }]
          };
        }
      }

      console.debug(`[X-RAY] Log added: ${message}`, {
        segmentId: span.spanId,
        level,
        fields
      });
    }
  }

  setError(span: UnifiedSpan, error: UnifiedErrorInfo): void {
    span.tags.error = true;
    span.tags['error.message'] = error.message;
    
    const xraySegment = this.segments.get(span.spanId);
    if (xraySegment) {
      xraySegment.error = true;
      xraySegment.fault = true;
      xraySegment.cause = {
        exceptions: [{
          message: error.message,
          type: error.type || 'Error'
        }]
      };
    }
  }

  inject(span: UnifiedSpan, format: UnifiedInjectFormat, carrier: Record<string, string>): void {
    if (format === 'http_headers') {
      carrier['x-amzn-trace-id'] = `Root=${span.traceId};Parent=${span.spanId}`;
    }
  }

  extract(format: UnifiedInjectFormat, carrier: Record<string, string>): UnifiedSpanContext | undefined {
    if (format === 'http_headers') {
      const traceHeader = carrier['x-amzn-trace-id'];
      if (traceHeader) {
        const rootMatch = traceHeader.match(/Root=([^;]+)/);
        const parentMatch = traceHeader.match(/Parent=([^;]+)/);
        
        if (rootMatch && parentMatch) {
          return { 
            traceId: rootMatch[1]!, 
            spanId: parentMatch[1]! 
          };
        }
      }
    }
    
    return undefined;
  }
}

export class UnifiedConsoleTracer implements UnifiedTracer {
  startSpan(operationName: string, parentSpan?: UnifiedSpan, options?: UnifiedSpanOptions): UnifiedSpan {
    const span: UnifiedSpan = {
      spanId: generateStandardSpanId(),
      traceId: parentSpan?.traceId || generateStandardTraceId(),
      parentSpanId: parentSpan?.spanId,
      operationName,
      startTime: options?.startTime || new Date(),
      tags: { ...options?.tags },
      logs: [],
      context: {
        traceId: parentSpan?.traceId || generateStandardTraceId(),
        spanId: generateStandardSpanId()
      }
    };

    console.debug(`[CONSOLE] Started span: ${operationName}`, {
      spanId: span.spanId,
      traceId: span.traceId,
      parentSpanId: span.parentSpanId
    });

    return span;
  }

  finishSpan(span: UnifiedSpan): void {
    span.endTime = new Date();
    const duration = span.endTime.getTime() - span.startTime.getTime();

    console.debug(`[CONSOLE] Finished span: ${span.operationName}`, {
      spanId: span.spanId,
      duration: `${duration}ms`,
      tags: span.tags
    });
  }

  setTag(span: UnifiedSpan, key: string, value: string | number | boolean): void {
    span.tags[key] = value;
    console.debug(`[CONSOLE] Tag set: ${key}=${value}`, { spanId: span.spanId });
  }

  addLog(span: UnifiedSpan, message: string, level?: UnifiedLogLevel, fields?: Record<string, unknown>): void {
    const log = {
      timestamp: new Date(),
      message,
      level,
      fields
    };
    
    span.logs.push(log);
    console.debug(`[CONSOLE] Log added: ${message}`, {
      spanId: span.spanId,
      level,
      fields
    });
  }

  setError(span: UnifiedSpan, error: UnifiedErrorInfo): void {
    span.tags.error = true;
    span.tags['error.message'] = error.message;
    if (error.stack) {
      span.tags['error.stack'] = error.stack;
    }
    if (error.type) {
      span.tags['error.type'] = error.type;
    }
  }

  inject(span: UnifiedSpan, format: UnifiedInjectFormat, carrier: Record<string, string>): void {
    if (format === 'http_headers') {
      carrier['x-trace-id'] = span.traceId;
      carrier['x-span-id'] = span.spanId;
    }
  }

  extract(format: UnifiedInjectFormat, carrier: Record<string, string>): UnifiedSpanContext | undefined {
    if (format === 'http_headers') {
      const traceId = carrier['x-trace-id'];
      const spanId = carrier['x-span-id'];
      
      if (traceId && spanId) {
        return { traceId, spanId };
      }
    }
    
    return undefined;
  }
}

// ============================================
// 📁 src/testing/index.ts - CLEAN TESTING UTILITIES (using key utils)
// ============================================
import { createMetricKey } from '../internal/metrics-key-utils';
import { generateStandardTraceId, generateStandardSpanId } from '../internal/tracer-utils';

export class UnifiedMockTracer implements UnifiedTracer {
  private spans: Map<string, UnifiedSpan> = new Map();
  
  startSpan(operationName: string, parentSpan?: UnifiedSpan, options?: UnifiedSpanOptions): UnifiedSpan {
    const span: UnifiedSpan = {
      spanId: generateStandardSpanId(),
      traceId: parentSpan?.traceId || generateStandardTraceId(),
      parentSpanId: parentSpan?.spanId,
      operationName,
      startTime: options?.startTime || new Date(),
      tags: { ...options?.tags },
      logs: [],
      context: {
        traceId: parentSpan?.traceId || generateStandardTraceId(),
        spanId: generateStandardSpanId()
      }
    };
    
    this.spans.set(span.spanId, span);
    return span;
  }

  finishSpan(span: UnifiedSpan): void {
    span.endTime = new Date();
  }

  setTag(span: UnifiedSpan, key: string, value: string | number | boolean): void {
    span.tags[key] = value;
  }

  addLog(span: UnifiedSpan, message: string, level?: UnifiedLogLevel, fields?: Record<string, unknown>): void {
    span.logs.push({
      timestamp: new Date(),
      message,
      level,
      fields
    });
  }

  setError(span: UnifiedSpan, error: UnifiedErrorInfo): void {
    span.tags['error'] = true;
    span.tags['error.message'] = error.message;
  }

  inject(span: UnifiedSpan, format: UnifiedInjectFormat, carrier: Record<string, string>): void {
    carrier['x-trace-id'] = span.traceId;
    carrier['x-span-id'] = span.spanId;
  }

  extract(format: UnifiedInjectFormat, carrier: Record<string, string>): UnifiedSpanContext | undefined {
    const traceId = carrier['x-trace-id'];
    const spanId = carrier['x-span-id'];
    
    if (traceId && spanId) {
      return { traceId, spanId };
    }
    
    return undefined;
  }

  getSpans(): UnifiedSpan[] {
    return Array.from(this.spans.values());
  }

  clear(): void {
    this.spans.clear();
  }
}

export class UnifiedMockMetrics implements UnifiedMetricsRegistry {
  private metrics: Map<string, { type: string; value: number; labels: Record<string, string> }> = new Map();
  
  counter(name: string, help?: string, labelNames?: string[]): UnifiedCounter {
    return {
      increment: (labels?: UnifiedMetricLabels) => {
        const key = createMetricKey(name, labels);
        const current = this.metrics.get(key) || { type: 'counter', value: 0, labels: labels || {} };
        this.metrics.set(key, { ...current, value: current.value + 1 });
      },
      add: (value: number, labels?: UnifiedMetricLabels) => {
        const key = createMetricKey(name, labels);
        const current = this.metrics.get(key) || { type: 'counter', value: 0, labels: labels || {} };
        this.metrics.set(key, { ...current, value: current.value + value });
      },
      get: (labels?: UnifiedMetricLabels) => {
        const key = createMetricKey(name, labels);
        return this.metrics.get(key)?.value || 0;
      }
    };
  }

  gauge(name: string, help?: string, labelNames?: string[]): UnifiedGauge {
    return {
      set: (value: number, labels?: UnifiedMetricLabels) => {
        const key = createMetricKey(name, labels);
        this.metrics.set(key, { type: 'gauge', value, labels: labels || {} });
      },
      increment: (labels?: UnifiedMetricLabels) => {
        const key = createMetricKey(name, labels);
        const current = this.metrics.get(key) || { type: 'gauge', value: 0, labels: labels || {} };
        this.metrics.set(key, { ...current, value: current.value + 1 });
      },
      decrement: (labels?: UnifiedMetricLabels) => {
        const key = createMetricKey(name, labels);
        const current = this.metrics.get(key) || { type: 'gauge', value: 0, labels: labels || {} };
        this.metrics.set(key, { ...current, value: current.value - 1 });
      },
      add: (value: number, labels?: UnifiedMetricLabels) => {
        const key = createMetricKey(name, labels);
        const current = this.metrics.get(key) || { type: 'gauge', value: 0, labels: labels || {} };
        this.metrics.set(key, { ...current, value: current.value + value });
      },
      get: (labels?: UnifiedMetricLabels) => {
        const key = createMetricKey(name, labels);
        return this.metrics.get(key)?.value || 0;
      }
    };
  }

  histogram(name: string, help?: string, labelNames?: string[], buckets?: number[]): UnifiedHistogram {
    return {
      observe: (value: number, labels?: UnifiedMetricLabels) => {
        const key = createMetricKey(name, labels);
        this.metrics.set(key, { type: 'histogram', value, labels: labels || {} });
      },
      time: <T>(fn: () => T | Promise<T>, labels?: UnifiedMetricLabels): T | Promise<T> => {
        const start = Date.now();
        const result = fn();
        
        if (result instanceof Promise) {
          return result.finally(() => {
            this.histogram(name).observe(Date.now() - start, labels);
          }) as Promise<T>;
        } else {
          this.histogram(name).observe(Date.now() - start, labels);
          return result;
        }
      },
      getMetrics: (labels?: UnifiedMetricLabels) => {
        const key = createMetricKey(name, labels);
        const value = this.metrics.get(key)?.value || 0;
        return { count: 1, sum: value, buckets: {} };
      }
    };
  }

  timer(name: string, help?: string, labelNames?: string[]): UnifiedTimer {
    return {
      start: () => {
        const startTime = Date.now();
        return {
          stop: () => Date.now() - startTime,
          record: (labels?: UnifiedMetricLabels) => {
            const duration = Date.now() - startTime;
            const key = createMetricKey(name, labels);
            this.metrics.set(key, { type: 'timer', value: duration, labels: labels || {} });
            return duration;
          }
        };
      },
      record: (durationMs: number, labels?: UnifiedMetricLabels) => {
        const key = createMetricKey(name, labels);
        this.metrics.set(key, { type: 'timer', value: durationMs, labels: labels || {} });
      }
    };
  }

  clear(): void {
    this.metrics.clear();
  }

  getMetrics(): string {
    return Array.from(this.metrics.entries())
      .map(([key, value]) => `${key}=${value.value}`)
      .join('\n');
  }
}

export class UnifiedMockLogger implements UnifiedLogger {
  private logs: Array<{ level: UnifiedLogLevel; message: string; data?: UnifiedLogData }> = [];

  trace(message: string, data?: UnifiedLogData): void {
    this.logs.push({ level: 'trace', message, data });
  }

  debug(message: string, data?: UnifiedLogData): void {
    this.logs.push({ level: 'debug', message, data });
  }

  info(message: string, data?: UnifiedLogData): void {
    this.logs.push({ level: 'info', message, data });
  }

  warn(message: string, data?: UnifiedLogData): void {
    this.logs.push({ level: 'warn', message, data });
  }

  error(message: string, data?: UnifiedLogData): void {
    this.logs.push({ level: 'error', message, data });
  }

  fatal(message: string, data?: UnifiedLogData): void {
    this.logs.push({ level: 'fatal', message, data });
  }

  child(context: Record<string, unknown>): UnifiedLogger {
    return new UnifiedMockLogger();
  }

  getLogs(): Array<{ level: UnifiedLogLevel; message: string; data?: UnifiedLogData }> {
    return [...this.logs];
  }

  clear(): void {
    this.logs = [];
  }
}

// Test helper functions
export function createMockProvider(config?: Partial<UnifiedObservabilityConfig>): UnifiedObservabilityProvider {
  const mockConfig: UnifiedObservabilityConfig = {
    serviceName: 'test-service',
    serviceVersion: '1.0.0',
    environment: 'test',
    tracing: { backend: 'console', enabled: true },
    metrics: { backend: 'console', enabled: true },
    logging: { backend: 'console', level: 'debug' },
    ...config
  };

  return new UnifiedObservabilityProvider(mockConfig);
}

export function createMockContext(
  provider?: UnifiedObservabilityProvider,
  operationName = 'test-operation'
): UnifiedObservabilityContext {
  const mockProvider = provider || createMockProvider();
  return mockProvider.createRootContext(operationName);
}

// ============================================
// 📁 src/internal/index.ts - UPDATED INTERNAL EXPORTS (for testing only)
// ============================================
/**
 * Internal utilities for testing purposes only.
 * These exports are not intended for end users.
 * 
 * @internal
 */

// Logging utilities
export * as LoggingUtils from './logging-utils';

// Tracing utilities  
export * as TracingUtils from './tracing-utils';

// Metrics utilities
export * as MetricsUtils from './metrics-utils';

// Validation utilities
export * as ValidationUtils from './validation-utils';

// Provider utilities
export * as ProviderUtils from './provider-utils';

// Factory utilities
export * as FactoryUtils from './factory-utils';

// Tracer utilities
export * as TracerUtils from './tracer-utils';

// Metrics key utilities
export * as MetricsKeyUtils from './metrics-key-utils';

// Re-export for direct access in tests
export { enrichLogData, logWithSpan, logError, logFatal } from './logging-utils';
export { 
  createSpanFromContext, 
  setSpanTag, 
  setSpanError, 
  getTraceHeaders, 
  finishSpan 
} from './tracing-utils';
export { 
  createMetricLabels, 
  createCounterWrapper, 
  createGaugeWrapper, 
  createHistogramWrapper, 
  createTimerWrapper 
} from './metrics-utils';
export { 
  validateLoggingConfig, 
  validateTracingConfig, 
  validateMetricsConfig, 
  validateServiceName 
} from './validation-utils';
export { 
  createTracerFromConfig, 
  createMetricsFromConfig, 
  createLoggerFromConfig,
  createDefaultTags 
} from './provider-utils';
export { 
  createTracingConfigFromEnv, 
  createMetricsConfigFromEnv, 
  createLoggingConfigFromEnv,
  parseHeaders,
  parseLabels,
  createEnvironmentTags 
} from './factory-utils';
export { 
  generateXRayTraceId, 
  generateXRaySpanId, 
  generateStandardTraceId, 
  generateStandardSpanId,
  isIndexedXRayTag,
  createXRaySegment,
  sendToXRayDaemon 
} from './tracer-utils';
export { 
  createMetricKey, 
  sanitizeMetricName, 
  sanitizeLabelName, 
  sanitizeLabelValue, 
  validateMetricName, 
  validateLabelName 
} from './metrics-key-utils';: 'ts-jest'
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/testing/**/*',
    '!src/**/__tests__/**/*',
    '!src/index.ts',
    '!src/internal/index.ts',
    '!src/testing/index.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  moduleNameMapping: {
    '^@/(.*)

// ============================================
// 📁 src/integrations/fastify.ts - FASTIFY INTEGRATION
// ============================================
export interface UnifiedFastifyOptions {
  provider: UnifiedObservabilityProvider;
  ignorePaths?: string[];
  ignoreUserAgent?: RegExp;
  extractUserContext?: (request: unknown) => Record<string, unknown>;
}

export function createUnifiedFastifyPlugin(options: UnifiedFastifyOptions) {
  return async function unifiedObservabilityPlugin(fastify: unknown) {
    const fastifyInstance = fastify as {
      addHook: (hook: string, handler: (request: UnifiedFastifyRequest, reply?: unknown) => Promise<void>) => void;
      decorateRequest: (name: string, value: unknown) => void;
    };

    // Decorate request with observability context
    fastifyInstance.decorateRequest('observability', null);

    // Request hook
    fastifyInstance.addHook('onRequest', async (request: UnifiedFastifyRequest) => {
      const shouldIgnore = options.ignorePaths?.some(path => 
        request.url?.startsWith(path)
      ) || (options.ignoreUserAgent && 
           options.ignoreUserAgent.test(request.headers['user-agent'] || ''));

      if (shouldIgnore) return;

      // Extract parent context from headers
      let parentContext: UnifiedSpanContext | undefined;
      if (options.provider.tracer) {
        parentContext = options.provider.tracer.extract('http_headers', request.headers as Record<string, string>);
      }

      // Create request context
      const operationName = `${request.method} ${request.url}`;
      const context = options.provider.createRootContext(operationName, parentContext);

      // Set request tags
      context.setTag('http.method', request.method || 'unknown');
      context.setTag('http.url', request.url || 'unknown');
      context.setTag('http.user_agent', request.headers['user-agent'] || 'unknown');

      // Extract user context if provided
      if (options.extractUserContext) {
        const userContext = options.extractUserContext(request);
        Object.entries(userContext).forEach(([key, value]) => {
          context.setTag(`user.${key}`, String(value));
        });
      }

      request.observability = context;

      context.info('HTTP request started', {
        method: request.method,
        url: request.url,
        userAgent: request.headers['user-agent']
      });
    });

    // Response hook
    fastifyInstance.addHook('onResponse', async (request: UnifiedFastifyRequest, reply) => {
      const context = request.observability;
      if (!context) return;

      const replyObj = reply as { statusCode: number };
      context.setTag('http.status_code', replyObj.statusCode);

      const level = replyObj.statusCode >= 500 ? 'error' : 
                   replyObj.statusCode >= 400 ? 'warn' : 'info';

      context[level]('HTTP request completed', {
        statusCode: replyObj.statusCode,
        duration: context.getDuration()
      });

      context.finish();
    });
  };
}

interface UnifiedFastifyRequest {
  method?: string;
  url?: string;
  headers: Record<string, string | string[] | undefined>;
  observability?: UnifiedObservabilityContext;
}

// ============================================
// 📁 src/index.ts - MAIN EXPORTS (for end users)
// ============================================
// Core exports
export * from './types/core';
export * from './interfaces/tracer';
export * from './interfaces/metrics';
export * from './interfaces/logger';
export * from './config/types';

// Main classes
export { UnifiedObservabilityProvider } from './provider/provider';
export { UnifiedObservabilityContext } from './context/context';

// Implementations
export * from './implementations/tracers';
export * from './implementations/metrics';
export * from './adapters/logger-adapters';

// Utilities
export { UnifiedConfigValidator } from './validation/config-validator';
export { UnifiedUtils } from './utils/utils';
export * from './errors/errors';

// Integrations
export * from './integrations/fastify';

// Factory
export { UnifiedObservabilityFactory } from './factory/factory';

// Wrappers
export * from './wrappers/metrics-wrappers';

// ============================================
// 📁 src/internal/index.ts - INTERNAL EXPORTS (for testing only)
// ============================================
/**
 * Internal utilities for testing purposes only.
 * These exports are not intended for end users.
 * 
 * @internal
 */

// Logging utilities
export * as LoggingUtils from './logging-utils';

// Tracing utilities  
export * as TracingUtils from './tracing-utils';

// Metrics utilities
export * as MetricsUtils from './metrics-utils';

// Re-export for direct access in tests
export { enrichLogData, logWithSpan, logError, logFatal } from './logging-utils';
export { 
  createSpanFromContext, 
  setSpanTag, 
  setSpanError, 
  getTraceHeaders, 
  finishSpan 
} from './tracing-utils';
export { 
  createMetricLabels, 
  createCounterWrapper, 
  createGaugeWrapper, 
  createHistogramWrapper, 
  createTimerWrapper 
} from './metrics-utils';

// ============================================
// 📁 src/testing/index.ts - TESTING UTILITIES
// ============================================
/**
 * Testing utilities and helpers.
 * These exports are intended for testing purposes.
 * 
 * @internal
 */

// Mock implementations
export class UnifiedMockTracer implements UnifiedTracer {
  private spans: Map<string, UnifiedSpan> = new Map();
  
  startSpan(operationName: string, parentSpan?: UnifiedSpan, options?: UnifiedSpanOptions): UnifiedSpan {
    const span: UnifiedSpan = {
      spanId: UnifiedUtils.generateSpanId(),
      traceId: parentSpan?.traceId || UnifiedUtils.generateTraceId(),
      parentSpanId: parentSpan?.spanId,
      operationName,
      startTime: options?.startTime || new Date(),
      tags: { ...options?.tags },
      logs: [],
      context: {
        traceId: parentSpan?.traceId || UnifiedUtils.generateTraceId(),
        spanId: UnifiedUtils.generateSpanId()
      }
    };
    
    this.spans.set(span.spanId, span);
    return span;
  }

  finishSpan(span: UnifiedSpan): void {
    span.endTime = new Date();
  }

  setTag(span: UnifiedSpan, key: string, value: string | number | boolean): void {
    span.tags[key] = value;
  }

  addLog(span: UnifiedSpan, message: string, level?: UnifiedLogLevel, fields?: Record<string, unknown>): void {
    span.logs.push({
      timestamp: new Date(),
      message,
      level,
      fields
    });
  }

  setError(span: UnifiedSpan, error: UnifiedErrorInfo): void {
    span.tags['error'] = true;
    span.tags['error.message'] = error.message;
  }

  inject(span: UnifiedSpan, format: UnifiedInjectFormat, carrier: Record<string, string>): void {
    carrier['x-trace-id'] = span.traceId;
    carrier['x-span-id'] = span.spanId;
  }

  extract(format: UnifiedInjectFormat, carrier: Record<string, string>): UnifiedSpanContext | undefined {
    const traceId = carrier['x-trace-id'];
    const spanId = carrier['x-span-id'];
    
    if (traceId && spanId) {
      return { traceId, spanId };
    }
    
    return undefined;
  }

  getSpans(): UnifiedSpan[] {
    return Array.from(this.spans.values());
  }

  clear(): void {
    this.spans.clear();
  }
}

export class UnifiedMockMetrics implements UnifiedMetricsRegistry {
  private metrics: Map<string, { type: string; value: number; labels: Record<string, string> }> = new Map();
  
  counter(name: string, help?: string, labelNames?: string[]): UnifiedCounter {
    return {
      increment: (labels?: UnifiedMetricLabels) => {
        const key = this.getKey(name, labels);
        const current = this.metrics.get(key) || { type: 'counter', value: 0, labels: labels || {} };
        this.metrics.set(key, { ...current, value: current.value + 1 });
      },
      add: (value: number, labels?: UnifiedMetricLabels) => {
        const key = this.getKey(name, labels);
        const current = this.metrics.get(key) || { type: 'counter', value: 0, labels: labels || {} };
        this.metrics.set(key, { ...current, value: current.value + value });
      },
      get: (labels?: UnifiedMetricLabels) => {
        const key = this.getKey(name, labels);
        return this.metrics.get(key)?.value || 0;
      }
    };
  }

  gauge(name: string, help?: string, labelNames?: string[]): UnifiedGauge {
    return {
      set: (value: number, labels?: UnifiedMetricLabels) => {
        const key = this.getKey(name, labels);
        this.metrics.set(key, { type: 'gauge', value, labels: labels || {} });
      },
      increment: (labels?: UnifiedMetricLabels) => {
        const key = this.getKey(name, labels);
        const current = this.metrics.get(key) || { type: 'gauge', value: 0, labels: labels || {} };
        this.metrics.set(key, { ...current, value: current.value + 1 });
      },
      decrement: (labels?: UnifiedMetricLabels) => {
        const key = this.getKey(name, labels);
        const current = this.metrics.get(key) || { type: 'gauge', value: 0, labels: labels || {} };
        this.metrics.set(key, { ...current, value: current.value - 1 });
      },
      add: (value: number, labels?: UnifiedMetricLabels) => {
        const key = this.getKey(name, labels);
        const current = this.metrics.get(key) || { type: 'gauge', value: 0, labels: labels || {} };
        this.metrics.set(key, { ...current, value: current.value + value });
      },
      get: (labels?: UnifiedMetricLabels) => {
        const key = this.getKey(name, labels);
        return this.metrics.get(key)?.value || 0;
      }
    };
  }

  histogram(name: string, help?: string, labelNames?: string[], buckets?: number[]): UnifiedHistogram {
    return {
      observe: (value: number, labels?: UnifiedMetricLabels) => {
        const key = this.getKey(name, labels);
        this.metrics.set(key, { type: 'histogram', value, labels: labels || {} });
      },
      time: <T>(fn: () => T | Promise<T>, labels?: UnifiedMetricLabels): T | Promise<T> => {
        const start = Date.now();
        const result = fn();
        
        if (result instanceof Promise) {
          return result.finally(() => {
            this.histogram(name).observe(Date.now() - start, labels);
          }) as Promise<T>;
        } else {
          this.histogram(name).observe(Date.now() - start, labels);
          return result;
        }
      },
      getMetrics: (labels?: UnifiedMetricLabels) => {
        const key = this.getKey(name, labels);
        const value = this.metrics.get(key)?.value || 0;
        return { count: 1, sum: value, buckets: {} };
      }
    };
  }

  timer(name: string, help?: string, labelNames?: string[]): UnifiedTimer {
    return {
      start: () => {
        const startTime = Date.now();
        return {
          stop: () => Date.now() - startTime,
          record: (labels?: UnifiedMetricLabels) => {
            const duration = Date.now() - startTime;
            const key = this.getKey(name, labels);
            this.metrics.set(key, { type: 'timer', value: duration, labels: labels || {} });
            return duration;
          }
        };
      },
      record: (durationMs: number, labels?: UnifiedMetricLabels) => {
        const key = this.getKey(name, labels);
        this.metrics.set(key, { type: 'timer', value: durationMs, labels: labels || {} });
      }
    };
  }

  clear(): void {
    this.metrics.clear();
  }

  getMetrics(): string {
    return Array.from(this.metrics.entries())
      .map(([key, value]) => `${key}=${value.value}`)
      .join('\n');
  }

  private getKey(name: string, labels?: UnifiedMetricLabels): string {
    if (!labels || Object.keys(labels).length === 0) {
      return name;
    }
    
    const labelStr = Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}="${v}"`)
      .join(',');
    
    return `${name}{${labelStr}}`;
  }
}

export class UnifiedMockLogger implements UnifiedLogger {
  private logs: Array<{ level: UnifiedLogLevel; message: string; data?: UnifiedLogData }> = [];

  trace(message: string, data?: UnifiedLogData): void {
    this.logs.push({ level: 'trace', message, data });
  }

  debug(message: string, data?: UnifiedLogData): void {
    this.logs.push({ level: 'debug', message, data });
  }

  info(message: string, data?: UnifiedLogData): void {
    this.logs.push({ level: 'info', message, data });
  }

  warn(message: string, data?: UnifiedLogData): void {
    this.logs.push({ level: 'warn', message, data });
  }

  error(message: string, data?: UnifiedLogData): void {
    this.logs.push({ level: 'error', message, data });
  }

  fatal(message: string, data?: UnifiedLogData): void {
    this.logs.push({ level: 'fatal', message, data });
  }

  child(context: Record<string, unknown>): UnifiedLogger {
    return new UnifiedMockLogger();
  }

  getLogs(): Array<{ level: UnifiedLogLevel; message: string; data?: UnifiedLogData }> {
    return [...this.logs];
  }

  clear(): void {
    this.logs = [];
  }
}

// Test helper functions
export function createMockProvider(config?: Partial<UnifiedObservabilityConfig>): UnifiedObservabilityProvider {
  const mockConfig: UnifiedObservabilityConfig = {
    serviceName: 'test-service',
    serviceVersion: '1.0.0',
    environment: 'test',
    tracing: { backend: 'console', enabled: true },
    metrics: { backend: 'console', enabled: true },
    logging: { backend: 'console', level: 'debug' },
    ...config
  };

  return new UnifiedObservabilityProvider(mockConfig);
}

export function createMockContext(
  provider?: UnifiedObservabilityProvider,
  operationName = 'test-operation'
): UnifiedObservabilityContext {
  const mockProvider = provider || createMockProvider();
  return mockProvider.createRootContext(operationName);
}

// ============================================
// 📁 src/implementations/tracers.ts - CLEAN TRACER IMPLEMENTATIONS (using utilities)
// ============================================
import { 
  generateXRayTraceId, 
  generateXRaySpanId, 
  generateStandardTraceId, 
  generateStandardSpanId,
  isIndexedXRayTag,
  createXRaySegment,
  sendToXRayDaemon
} from '../internal/tracer-utils';

export class UnifiedJaegerTracer implements UnifiedTracer {
  private jaeger: unknown;
  private spans = new Map<string, unknown>();
  private serviceName: string;

  constructor(config: { serviceName: string; serviceVersion: string; environment: string } & UnifiedJaegerConfig) {
    this.serviceName = config.serviceName;
    console.log(`Initializing Jaeger tracer for ${config.serviceName}`);
    // In real implementation, use jaeger-client library
  }

  startSpan(operationName: string, parentSpan?: UnifiedSpan, options?: UnifiedSpanOptions): UnifiedSpan {
    const span: UnifiedSpan = {
      spanId: generateStandardSpanId(),
      traceId: parentSpan?.traceId || generateStandardTraceId(),
      parentSpanId: parentSpan?.spanId,
      operationName,
      startTime: options?.startTime || new Date(),
      tags: { ...options?.tags },
      logs: [],
      context: {
        traceId: parentSpan?.traceId || generateStandardTraceId(),
        spanId: generateStandardSpanId()
      }
    };

    console.debug(`[JAEGER] Started span: ${operationName}`, {
      spanId: span.spanId,
      traceId: span.traceId,
      parentSpanId: span.parentSpanId
    });

    return span;
  }

  finishSpan(span: UnifiedSpan): void {
    span.endTime = new Date();
    const duration = span.endTime.getTime() - span.startTime.getTime();

    console.debug(`[JAEGER] Finished span: ${span.operationName}`, {
      spanId: span.spanId,
      duration: `${duration}ms`,
      tags: span.tags
    });
  }

  setTag(span: UnifiedSpan, key: string, value: string | number | boolean): void {
    span.tags[key] = value;
    console.debug(`[JAEGER] Tag set: ${key}=${value}`, { spanId: span.spanId });
  }

  addLog(span: UnifiedSpan, message: string, level?: UnifiedLogLevel, fields?: Record<string, unknown>): void {
    const log = {
      timestamp: new Date(),
      message,
      level,
      fields
    };
    
    span.logs.push(log);
    console.debug(`[JAEGER] Log added: ${message}`, {
      spanId: span.spanId,
      level,
      fields
    });
  }

  setError(span: UnifiedSpan, error: UnifiedErrorInfo): void {
    span.tags.error = true;
    span.tags['error.message'] = error.message;
    if (error.stack) {
      span.tags['error.stack'] = error.stack;
    }
    if (error.type) {
      span.tags['error.type'] = error.type;
    }
  }

  inject(span: UnifiedSpan, format: UnifiedInjectFormat, carrier: Record<string, string>): void {
    if (format === 'http_headers') {
      carrier['x-trace-id'] = span.traceId;
      carrier['x-span-id'] = span.spanId;
    }
  }

  extract(format: UnifiedInjectFormat, carrier: Record<string, string>): UnifiedSpanContext | undefined {
    if (format === 'http_headers') {
      const traceId = carrier['x-trace-id'];
      const spanId = carrier['x-span-id'];
      
      if (traceId && spanId) {
        return { traceId, spanId };
      }
    }
    
    return undefined;
  }
}

export class UnifiedOtelTracer implements UnifiedTracer {
  private serviceName: string;

  constructor(config: { serviceName: string; serviceVersion: string; environment: string } & UnifiedOtelTracingConfig) {
    this.serviceName = config.serviceName;
    console.log(`Initializing OpenTelemetry tracer for ${config.serviceName}`);
    // In real implementation, use @opentelemetry/api
  }

  startSpan(operationName: string, parentSpan?: UnifiedSpan, options?: UnifiedSpanOptions): UnifiedSpan {
    const span: UnifiedSpan = {
      spanId: generateStandardSpanId(),
      traceId: parentSpan?.traceId || generateStandardTraceId(),
      parentSpanId: parentSpan?.spanId,
      operationName,
      startTime: options?.startTime || new Date(),
      tags: { ...options?.tags },
      logs: [],
      context: {
        traceId: parentSpan?.traceId || generateStandardTraceId(),
        spanId: generateStandardSpanId()
      }
    };

    console.debug(`[OTEL] Started span: ${operationName}`, {
      spanId: span.spanId,
      traceId: span.traceId,
      parentSpanId: span.parentSpanId
    });

    return span;
  }

  finishSpan(span: UnifiedSpan): void {
    span.endTime = new Date();
    const duration = span.endTime.getTime() - span.startTime.getTime();

    console.debug(`[OTEL] Finished span: ${span.operationName}`, {
      spanId: span.spanId,
      duration: `${duration}ms`,
      tags: span.tags
    });
  }

  setTag(span: UnifiedSpan, key: string, value: string | number | boolean): void {
    span.tags[key] = value;
    console.debug(`[OTEL] Tag set: ${key}=${value}`, { spanId: span.spanId });
  }

  addLog(span: UnifiedSpan, message: string, level?: UnifiedLogLevel, fields?: Record<string, unknown>): void {
    const log = {
      timestamp: new Date(),
      message,
      level,
      fields
    };
    
    span.logs.push(log);
    console.debug(`[OTEL] Log added: ${message}`, {
      spanId: span.spanId,
      level,
      fields
    });
  }

  setError(span: UnifiedSpan, error: UnifiedErrorInfo): void {
    span.tags.error = true;
    span.tags['error.message'] = error.message;
    if (error.stack) {
      span.tags['error.stack'] = error.stack;
    }
    if (error.type) {
      span.tags['error.type'] = error.type;
    }
  }

  inject(span: UnifiedSpan, format: UnifiedInjectFormat, carrier: Record<string, string>): void {
    if (format === 'http_headers') {
      carrier['x-trace-id'] = span.traceId;
      carrier['x-span-id'] = span.spanId;
    }
  }

  extract(format: UnifiedInjectFormat, carrier: Record<string, string>): UnifiedSpanContext | undefined {
    if (format === 'http_headers') {
      const traceId = carrier['x-trace-id'];
      const spanId = carrier['x-span-id'];
      
      if (traceId && spanId) {
        return { traceId, spanId };
      }
    }
    
    return undefined;
  }
}

export class UnifiedXRayTracer implements UnifiedTracer {
  private serviceName: string;
  private segments = new Map<string, Record<string, unknown>>();

  constructor(config: { serviceName: string; serviceVersion: string; environment: string } & UnifiedXRayConfig) {
    this.serviceName = config.serviceName;
    console.log(`Initializing AWS X-Ray tracer for ${config.serviceName}`);
    console.log(`X-Ray Configuration:`, {
      region: config.region || process.env.AWS_REGION || 'us-east-1',
      daemon: config.daemon || process.env._X_AMZN_TRACE_ID || 'localhost:2000',
      captureAWS: config.captureAWS ?? true,
      captureHTTPs: config.captureHTTPs ?? true
    });
  }

  startSpan(operationName: string, parentSpan?: UnifiedSpan, options?: UnifiedSpanOptions): UnifiedSpan {
    const span: UnifiedSpan = {
      spanId: generateXRaySpanId(),
      traceId: parentSpan?.traceId || generateXRayTraceId(),
      parentSpanId: parentSpan?.spanId,
      operationName,
      startTime: options?.startTime || new Date(),
      tags: { ...options?.tags },
      logs: [],
      context: {
        traceId: parentSpan?.traceId || generateXRayTraceId(),
        spanId: generateXRaySpanId()
      }
    };

    const xraySegment = createXRaySegment(span, this.serviceName);
    this.segments.set(span.spanId, xraySegment);

    console.debug(`[X-RAY] Started segment: ${operationName}`, {
      segmentId: span.spanId,
      traceId: span.traceId,
      parentId: span.parentSpanId,
      serviceName: this.serviceName
    });

    return span;
  }

  finishSpan(span: UnifiedSpan): void {
    span.endTime = new Date();
    const duration = span.endTime.getTime() - span.startTime.getTime();
    
    const xraySegment = this.segments.get(span.spanId);
    if (xraySegment) {
      xraySegment.end_time = span.endTime.getTime() / 1000;
      xraySegment.duration = duration / 1000;
      
      (xraySegment.metadata as Record<string, unknown>).performance = {
        duration_ms: duration,
        start_time: span.startTime.toISOString(),
        end_time: span.endTime.toISOString()
      };

      console.debug(`[X-RAY] Finished segment: ${span.operationName}`, {
        segmentId: span.spanId,
        duration: `${duration}ms`,
        annotations: xraySegment.annotations,
        metadata: Object.keys(xraySegment.metadata as Record<string, unknown>)
      });

      sendToXRayDaemon(xraySegment);
      this.segments.delete(span.spanId);
    }
  }

  setTag(span: UnifiedSpan, key: string, value: string | number | boolean): void {
    span.tags[key] = value;
    
    const xraySegment = this.segments.get(span.spanId);
    if (xraySegment) {
      if (isIndexedXRayTag(key)) {
        (xraySegment.annotations as Record<string, unknown>)[key] = value;
        console.debug(`[X-RAY] Annotation set: ${key}=${value}`, { segmentId: span.spanId });
      } else {
        if (!(xraySegment.metadata as Record<string, unknown>).custom) {
          (xraySegment.metadata as Record<string, unknown>).custom = {};
        }
        ((xraySegment.metadata as Record<string, unknown>).custom as Record<string, unknown>)[key] = value;
        console.debug(`[X-RAY] Metadata set: ${key}=${value}`, { segmentId: span.spanId });
      }
    }
  }

  addLog(span: UnifiedSpan, message: string, level?: UnifiedLogLevel, fields?: Record<string, unknown>): void {
    const log = {
      timestamp: new Date(),
      message,
      level,
      fields
    };
    
    span.logs.push(log);
    
    const xraySegment = this.segments.get(span.spanId);
    if (xraySegment) {
      if (!(xraySegment.metadata as Record<string, unknown>).logs) {
        (xraySegment.metadata as Record<string, unknown>).logs = [];
      }
      
      ((xraySegment.metadata as Record<string, unknown>).logs as unknown[]).push({
        timestamp: log.timestamp.toISOString(),
        message,
        level,
        fields
      });

      if (level === 'error') {
        xraySegment.error = true;
        xraySegment.fault = true;
        if (fields?.error) {
          xraySegment.cause = {
            exceptions: [{
              message: fields.error,
              type: (fields.error_type as string) || 'Error'
            }]
          };
        }
      }

      console.debug(`[X-RAY] Log added: ${message}`, {
        segmentId: span.spanId,
        level,
        fields
      });
    }
  }

  setError(span: UnifiedSpan, error: UnifiedErrorInfo): void {
    span.tags.error = true;
    span.tags['error.message'] = error.message;
    
    const xraySegment = this.segments.get(span.spanId);
    if (xraySegment) {
      xraySegment.error = true;
      xraySegment.fault = true;
      xraySegment.cause = {
        exceptions: [{
          message: error.message,
          type: error.type || 'Error'
        }]
      };
    }
  }

  inject(span: UnifiedSpan, format: UnifiedInjectFormat, carrier: Record<string, string>): void {
    if (format === 'http_headers') {
      carrier['x-amzn-trace-id'] = `Root=${span.traceId};Parent=${span.spanId}`;
    }
  }

  extract(format: UnifiedInjectFormat, carrier: Record<string, string>): UnifiedSpanContext | undefined {
    if (format === 'http_headers') {
      const traceHeader = carrier['x-amzn-trace-id'];
      if (traceHeader) {
        const rootMatch = traceHeader.match(/Root=([^;]+)/);
        const parentMatch = traceHeader.match(/Parent=([^;]+)/);
        
        if (rootMatch && parentMatch) {
          return { 
            traceId: rootMatch[1]!, 
            spanId: parentMatch[1]! 
          };
        }
      }
    }
    
    return undefined;
  }
}

export class UnifiedConsoleTracer implements UnifiedTracer {
  startSpan(operationName: string, parentSpan?: UnifiedSpan, options?: UnifiedSpanOptions): UnifiedSpan {
    const span: UnifiedSpan = {
      spanId: generateStandardSpanId(),
      traceId: parentSpan?.traceId || generateStandardTraceId(),
      parentSpanId: parentSpan?.spanId,
      operationName,
      startTime: options?.startTime || new Date(),
      tags: { ...options?.tags },
      logs: [],
      context: {
        traceId: parentSpan?.traceId || generateStandardTraceId(),
        spanId: generateStandardSpanId()
      }
    };

    console.debug(`[CONSOLE] Started span: ${operationName}`, {
      spanId: span.spanId,
      traceId: span.traceId,
      parentSpanId: span.parentSpanId
    });

    return span;
  }

  finishSpan(span: UnifiedSpan): void {
    span.endTime = new Date();
    const duration = span.endTime.getTime() - span.startTime.getTime();

    console.debug(`[CONSOLE] Finished span: ${span.operationName}`, {
      spanId: span.spanId,
      duration: `${duration}ms`,
      tags: span.tags
    });
  }

  setTag(span: UnifiedSpan, key: string, value: string | number | boolean): void {
    span.tags[key] = value;
    console.debug(`[CONSOLE] Tag set: ${key}=${value}`, { spanId: span.spanId });
  }

  addLog(span: UnifiedSpan, message: string, level?: UnifiedLogLevel, fields?: Record<string, unknown>): void {
    const log = {
      timestamp: new Date(),
      message,
      level,
      fields
    };
    
    span.logs.push(log);
    console.debug(`[CONSOLE] Log added: ${message}`, {
      spanId: span.spanId,
      level,
      fields
    });
  }

  setError(span: UnifiedSpan, error: UnifiedErrorInfo): void {
    span.tags.error = true;
    span.tags['error.message'] = error.message;
    if (error.stack) {
      span.tags['error.stack'] = error.stack;
    }
    if (error.type) {
      span.tags['error.type'] = error.type;
    }
  }

  inject(span: UnifiedSpan, format: UnifiedInjectFormat, carrier: Record<string, string>): void {
    if (format === 'http_headers') {
      carrier['x-trace-id'] = span.traceId;
      carrier['x-span-id'] = span.spanId;
    }
  }

  extract(format: UnifiedInjectFormat, carrier: Record<string, string>): UnifiedSpanContext | undefined {
    if (format === 'http_headers') {
      const traceId = carrier['x-trace-id'];
      const spanId = carrier['x-span-id'];
      
      if (traceId && spanId) {
        return { traceId, spanId };
      }
    }
    
    return undefined;
  }
}

// ============================================
// 📁 src/testing/index.ts - CLEAN TESTING UTILITIES (using key utils)
// ============================================
import { createMetricKey } from '../internal/metrics-key-utils';
import { generateStandardTraceId, generateStandardSpanId } from '../internal/tracer-utils';

export class UnifiedMockTracer implements UnifiedTracer {
  private spans: Map<string, UnifiedSpan> = new Map();
  
  startSpan(operationName: string, parentSpan?: UnifiedSpan, options?: UnifiedSpanOptions): UnifiedSpan {
    const span: UnifiedSpan = {
      spanId: generateStandardSpanId(),
      traceId: parentSpan?.traceId || generateStandardTraceId(),
      parentSpanId: parentSpan?.spanId,
      operationName,
      startTime: options?.startTime || new Date(),
      tags: { ...options?.tags },
      logs: [],
      context: {
        traceId: parentSpan?.traceId || generateStandardTraceId(),
        spanId: generateStandardSpanId()
      }
    };
    
    this.spans.set(span.spanId, span);
    return span;
  }

  finishSpan(span: UnifiedSpan): void {
    span.endTime = new Date();
  }

  setTag(span: UnifiedSpan, key: string, value: string | number | boolean): void {
    span.tags[key] = value;
  }

  addLog(span: UnifiedSpan, message: string, level?: UnifiedLogLevel, fields?: Record<string, unknown>): void {
    span.logs.push({
      timestamp: new Date(),
      message,
      level,
      fields
    });
  }

  setError(span: UnifiedSpan, error: UnifiedErrorInfo): void {
    span.tags['error'] = true;
    span.tags['error.message'] = error.message;
  }

  inject(span: UnifiedSpan, format: UnifiedInjectFormat, carrier: Record<string, string>): void {
    carrier['x-trace-id'] = span.traceId;
    carrier['x-span-id'] = span.spanId;
  }

  extract(format: UnifiedInjectFormat, carrier: Record<string, string>): UnifiedSpanContext | undefined {
    const traceId = carrier['x-trace-id'];
    const spanId = carrier['x-span-id'];
    
    if (traceId && spanId) {
      return { traceId, spanId };
    }
    
    return undefined;
  }

  getSpans(): UnifiedSpan[] {
    return Array.from(this.spans.values());
  }

  clear(): void {
    this.spans.clear();
  }
}

export class UnifiedMockMetrics implements UnifiedMetricsRegistry {
  private metrics: Map<string, { type: string; value: number; labels: Record<string, string> }> = new Map();
  
  counter(name: string, help?: string, labelNames?: string[]): UnifiedCounter {
    return {
      increment: (labels?: UnifiedMetricLabels) => {
        const key = createMetricKey(name, labels);
        const current = this.metrics.get(key) || { type: 'counter', value: 0, labels: labels || {} };
        this.metrics.set(key, { ...current, value: current.value + 1 });
      },
      add: (value: number, labels?: UnifiedMetricLabels) => {
        const key = createMetricKey(name, labels);
        const current = this.metrics.get(key) || { type: 'counter', value: 0, labels: labels || {} };
        this.metrics.set(key, { ...current, value: current.value + value });
      },
      get: (labels?: UnifiedMetricLabels) => {
        const key = createMetricKey(name, labels);
        return this.metrics.get(key)?.value || 0;
      }
    };
  }

  gauge(name: string, help?: string, labelNames?: string[]): UnifiedGauge {
    return {
      set: (value: number, labels?: UnifiedMetricLabels) => {
        const key = createMetricKey(name, labels);
        this.metrics.set(key, { type: 'gauge', value, labels: labels || {} });
      },
      increment: (labels?: UnifiedMetricLabels) => {
        const key = createMetricKey(name, labels);
        const current = this.metrics.get(key) || { type: 'gauge', value: 0, labels: labels || {} };
        this.metrics.set(key, { ...current, value: current.value + 1 });
      },
      decrement: (labels?: UnifiedMetricLabels) => {
        const key = createMetricKey(name, labels);
        const current = this.metrics.get(key) || { type: 'gauge', value: 0, labels: labels || {} };
        this.metrics.set(key, { ...current, value: current.value - 1 });
      },
      add: (value: number, labels?: UnifiedMetricLabels) => {
        const key = createMetricKey(name, labels);
        const current = this.metrics.get(key) || { type: 'gauge', value: 0, labels: labels || {} };
        this.metrics.set(key, { ...current, value: current.value + value });
      },
      get: (labels?: UnifiedMetricLabels) => {
        const key = createMetricKey(name, labels);
        return this.metrics.get(key)?.value || 0;
      }
    };
  }

  histogram(name: string, help?: string, labelNames?: string[], buckets?: number[]): UnifiedHistogram {
    return {
      observe: (value: number, labels?: UnifiedMetricLabels) => {
        const key = createMetricKey(name, labels);
        this.metrics.set(key, { type: 'histogram', value, labels: labels || {} });
      },
      time: <T>(fn: () => T | Promise<T>, labels?: UnifiedMetricLabels): T | Promise<T> => {
        const start = Date.now();
        const result = fn();
        
        if (result instanceof Promise) {
          return result.finally(() => {
            this.histogram(name).observe(Date.now() - start, labels);
          }) as Promise<T>;
        } else {
          this.histogram(name).observe(Date.now() - start, labels);
          return result;
        }
      },
      getMetrics: (labels?: UnifiedMetricLabels) => {
        const key = createMetricKey(name, labels);
        const value = this.metrics.get(key)?.value || 0;
        return { count: 1, sum: value, buckets: {} };
      }
    };
  }

  timer(name: string, help?: string, labelNames?: string[]): UnifiedTimer {
    return {
      start: () => {
        const startTime = Date.now();
        return {
          stop: () => Date.now() - startTime,
          record: (labels?: UnifiedMetricLabels) => {
            const duration = Date.now() - startTime;
            const key = createMetricKey(name, labels);
            this.metrics.set(key, { type: 'timer', value: duration, labels: labels || {} });
            return duration;
          }
        };
      },
      record: (durationMs: number, labels?: UnifiedMetricLabels) => {
        const key = createMetricKey(name, labels);
        this.metrics.set(key, { type: 'timer', value: durationMs, labels: labels || {} });
      }
    };
  }

  clear(): void {
    this.metrics.clear();
  }

  getMetrics(): string {
    return Array.from(this.metrics.entries())
      .map(([key, value]) => `${key}=${value.value}`)
      .join('\n');
  }
}

export class UnifiedMockLogger implements UnifiedLogger {
  private logs: Array<{ level: UnifiedLogLevel; message: string; data?: UnifiedLogData }> = [];

  trace(message: string, data?: UnifiedLogData): void {
    this.logs.push({ level: 'trace', message, data });
  }

  debug(message: string, data?: UnifiedLogData): void {
    this.logs.push({ level: 'debug', message, data });
  }

  info(message: string, data?: UnifiedLogData): void {
    this.logs.push({ level: 'info', message, data });
  }

  warn(message: string, data?: UnifiedLogData): void {
    this.logs.push({ level: 'warn', message, data });
  }

  error(message: string, data?: UnifiedLogData): void {
    this.logs.push({ level: 'error', message, data });
  }

  fatal(message: string, data?: UnifiedLogData): void {
    this.logs.push({ level: 'fatal', message, data });
  }

  child(context: Record<string, unknown>): UnifiedLogger {
    return new UnifiedMockLogger();
  }

  getLogs(): Array<{ level: UnifiedLogLevel; message: string; data?: UnifiedLogData }> {
    return [...this.logs];
  }

  clear(): void {
    this.logs = [];
  }
}

// Test helper functions
export function createMockProvider(config?: Partial<UnifiedObservabilityConfig>): UnifiedObservabilityProvider {
  const mockConfig: UnifiedObservabilityConfig = {
    serviceName: 'test-service',
    serviceVersion: '1.0.0',
    environment: 'test',
    tracing: { backend: 'console', enabled: true },
    metrics: { backend: 'console', enabled: true },
    logging: { backend: 'console', level: 'debug' },
    ...config
  };

  return new UnifiedObservabilityProvider(mockConfig);
}

export function createMockContext(
  provider?: UnifiedObservabilityProvider,
  operationName = 'test-operation'
): UnifiedObservabilityContext {
  const mockProvider = provider || createMockProvider();
  return mockProvider.createRootContext(operationName);
}

// ============================================
// 📁 src/internal/index.ts - UPDATED INTERNAL EXPORTS (for testing only)
// ============================================
/**
 * Internal utilities for testing purposes only.
 * These exports are not intended for end users.
 * 
 * @internal
 */

// Logging utilities
export * as LoggingUtils from './logging-utils';

// Tracing utilities  
export * as TracingUtils from './tracing-utils';

// Metrics utilities
export * as MetricsUtils from './metrics-utils';

// Validation utilities
export * as ValidationUtils from './validation-utils';

// Provider utilities
export * as ProviderUtils from './provider-utils';

// Factory utilities
export * as FactoryUtils from './factory-utils';

// Tracer utilities
export * as TracerUtils from './tracer-utils';

// Metrics key utilities
export * as MetricsKeyUtils from './metrics-key-utils';

// Re-export for direct access in tests
export { enrichLogData, logWithSpan, logError, logFatal } from './logging-utils';
export { 
  createSpanFromContext, 
  setSpanTag, 
  setSpanError, 
  getTraceHeaders, 
  finishSpan 
} from './tracing-utils';
export { 
  createMetricLabels, 
  createCounterWrapper, 
  createGaugeWrapper, 
  createHistogramWrapper, 
  createTimerWrapper 
} from './metrics-utils';
export { 
  validateLoggingConfig, 
  validateTracingConfig, 
  validateMetricsConfig, 
  validateServiceName 
} from './validation-utils';
export { 
  createTracerFromConfig, 
  createMetricsFromConfig, 
  createLoggerFromConfig,
  createDefaultTags 
} from './provider-utils';
export { 
  createTracingConfigFromEnv, 
  createMetricsConfigFromEnv, 
  createLoggingConfigFromEnv,
  parseHeaders,
  parseLabels,
  createEnvironmentTags 
} from './factory-utils';
export { 
  generateXRayTraceId, 
  generateXRaySpanId, 
  generateStandardTraceId, 
  generateStandardSpanId,
  isIndexedXRayTag,
  createXRaySegment,
  sendToXRayDaemon 
} from './tracer-utils';
export { 
  createMetricKey, 
  sanitizeMetricName, 
  sanitizeLabelName, 
  sanitizeLabelValue, 
  validateMetricName, 
  validateLabelName 
} from './metrics-key-utils';: '<rootDir>/src/$1'
  },
  testTimeout: 10000,
  verbose: true
};

// ============================================
// 📁 tests/setup.ts - TEST SETUP
// ============================================
// Mock console methods to avoid noise in tests
global.console = {
  ...console,
  debug: jest.fn(),
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Mock process.env for consistent testing
const originalEnv = process.env;

beforeEach(() => {
  jest.resetModules();
  process.env = { ...originalEnv };
});

afterEach(() => {
  process.env = originalEnv;
});

// Global test utilities
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidTraceId(): R;
      toBeValidSpanId(): R;
      toHaveBeenCalledWithLogEntry(level: string, message: string): R;
    }
  }
}

// Custom Jest matchers
expect.extend({
  toBeValidTraceId(received: string) {
    const pass = /^[0-9a-f]{32}$/.test(received);
    return {
      message: () => `expected ${received} to be a valid trace ID`,
      pass
    };
  },

  toBeValidSpanId(received: string) {
    const pass = /^[0-9a-f]{16}$/.test(received);
    return {
      message: () => `expected ${received} to be a valid span ID`,
      pass
    };
  },

  toHaveBeenCalledWithLogEntry(received: jest.Mock, level: string, message: string) {
    const calls = received.mock.calls;
    const pass = calls.some(call => 
      call[0]?.level === level && call[0]?.message === message
    );
    return {
      message: () => `expected mock to have been called with log entry (${level}, ${message})`,
      pass
    };
  }
});

// ============================================
// 📁 tests/integration/provider.test.ts - INTEGRATION TESTS
// ============================================
import { UnifiedObservabilityProvider, UnifiedObservabilityFactory } from '../../src';
import { UnifiedMockLogger, UnifiedMockTracer, UnifiedMockMetrics } from '../../src/testing';

describe('UnifiedObservabilityProvider Integration', () => {
  describe('Full lifecycle', () => {
    it('should create provider and handle complete request lifecycle', async () => {
      const provider = UnifiedObservabilityFactory.createProvider({
        serviceName: 'test-service',
        serviceVersion: '1.0.0',
        environment: 'test',
        tracing: { backend: 'console', enabled: true },
        metrics: { backend: 'console', enabled: true },
        logging: { backend: 'console', level: 'debug' }
      });

      // Create request context
      const requestContext = provider.createRootContext('ProcessRequest');
      
      // Add request tags
      requestContext.setTag('http.method', 'POST');
      requestContext.setTag('http.url', '/api/orders');
      requestContext.setTag('user.id', '123');

      // Log request start
      requestContext.info('Request started', {
        method: 'POST',
        url: '/api/orders',
        userId: '123'
      });

      // Create metrics
      const requestCounter = requestContext.counter('http_requests_total', {
        method: 'POST',
        endpoint: '/api/orders'
      });
      const requestDuration = requestContext.histogram('http_request_duration_seconds', {
        method: 'POST',
        endpoint: '/api/orders'
      });

      // Simulate request processing
      const result = await requestDuration.time(async () => {
        // Create child context for business logic
        const businessContext = requestContext.createChild('ProcessOrder');
        
        businessContext.info('Processing order', { orderId: 'order-123' });
        
        // Create database context
        const dbContext = businessContext.createChild('Database');
        dbContext.debug('Querying database', { table: 'orders' });
        
        // Simulate database operation
        await new Promise(resolve => setTimeout(resolve, 50));
        
        dbContext.info('Database query completed', { 
          duration: 50,
          rowsAffected: 1 
        });
        
        businessContext.info('Order processed successfully', { 
          orderId: 'order-123',
          status: 'completed' 
        });
        
        return { orderId: 'order-123', status: 'completed' };
      });

      // Update metrics
      requestCounter.increment({ status: 'success' });
      
      // Log request completion
      requestContext.info('Request completed', {
        status: 'success',
        duration: requestContext.getDuration(),
        result
      });

      // Finish tracing
      requestContext.finish();

      // Verify context relationships
      expect(requestContext.getTraceId()).toBeDefined();
      expect(requestContext.getSpanId()).toBeDefined();
      expect(requestContext.isFinished()).toBe(true);
      expect(requestContext.getDuration()).toBeGreaterThan(0);

      // Shutdown provider
      await provider.shutdown();
    });

    it('should handle error scenarios gracefully', async () => {
      const provider = UnifiedObservabilityFactory.createProvider({
        serviceName: 'test-service',
        logging: { backend: 'console', level: 'error' },
        tracing: { backend: 'console', enabled: true },
        metrics: { backend: 'console', enabled: true }
      });

      const context = provider.createRootContext('ErrorTest');
      
      try {
        // Simulate error in business logic
        const businessContext = context.createChild('BusinessLogic');
        businessContext.info('Starting business operation');
        
        // Simulate an error
        throw new Error('Business logic error');
      } catch (error) {
        context.error('Operation failed', {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        });
        
        // Set error on span
        context.setError(error as Error);
        
        // Update error metrics
        const errorCounter = context.counter('errors_total', {
          operation: 'ErrorTest',
          error_type: 'business_error'
        });
        errorCounter.increment();
      } finally {
        context.finish();
      }

      // Verify error was handled
      expect(context.isFinished()).toBe(true);
      
      await provider.shutdown();
    });

    it('should work with disabled components', async () => {
      const provider = UnifiedObservabilityFactory.createProvider({
        serviceName: 'test-service',
        logging: { backend: 'console', level: 'info' },
        // No tracing or metrics configured
      });

      const context = provider.createRootContext('DisabledTest');
      
      // These should not throw errors
      context.info('Test message');
      context.setTag('test.tag', 'value');
      context.counter('test_counter').increment();
      context.gauge('test_gauge').set(100);
      context.histogram('test_histogram').observe(50);
      context.timer('test_timer').record(1000);
      
      const headers = context.getTraceHeaders();
      expect(headers).toEqual({});
      
      context.finish();
      await provider.shutdown();
    });
  });

  describe('Environment-based configuration', () => {
    beforeEach(() => {
      // Clear environment
      delete process.env.TRACING_BACKEND;
      delete process.env.METRICS_BACKEND;
      delete process.env.LOG_LEVEL;
      delete process.env.SERVICE_VERSION;
      delete process.env.NODE_ENV;
    });

    it('should create provider from environment variables', () => {
      process.env.TRACING_BACKEND = 'console';
      process.env.METRICS_BACKEND = 'console';
      process.env.LOG_LEVEL = 'debug';
      process.env.SERVICE_VERSION = '2.0.0';
      process.env.NODE_ENV = 'production';

      const provider = UnifiedObservabilityFactory.createFromEnvironment('env-test-service');

      expect(provider.serviceName).toBe('env-test-service');
      expect(provider.serviceVersion).toBe('2.0.0');
      expect(provider.environment).toBe('production');
      expect(provider.tracer).toBeDefined();
      expect(provider.metrics).toBeDefined();
    });

    it('should use defaults when environment variables not set', () => {
      const provider = UnifiedObservabilityFactory.createFromEnvironment('default-service');

      expect(provider.serviceName).toBe('default-service');
      expect(provider.serviceVersion).toBe('1.0.0');
      expect(provider.environment).toBe('development');
      expect(provider.tracer).toBeUndefined();
      expect(provider.metrics).toBeUndefined();
    });
  });
});

// ============================================
// 📁 tests/integration/context.test.ts - CONTEXT INTEGRATION TESTS
// ============================================
import { createMockProvider, createMockContext } from '../../src/testing';

describe('UnifiedObservabilityContext Integration', () => {
  describe('Context hierarchy', () => {
    it('should maintain proper parent-child relationships', () => {
      const provider = createMockProvider();
      const rootContext = provider.createRootContext('RootOperation');
      const childContext = rootContext.createChild('ChildOperation');
      const grandChildContext = childContext.createChild('GrandChildOperation');

      // Verify hierarchy
      expect(rootContext.span?.parentSpanId).toBeUndefined();
      expect(childContext.span?.parentSpanId).toBe(rootContext.span?.spanId);
      expect(grandChildContext.span?.parentSpanId).toBe(childContext.span?.spanId);

      // Verify trace ID consistency
      expect(rootContext.getTraceId()).toBe(childContext.getTraceId());
      expect(childContext.getTraceId()).toBe(grandChildContext.getTraceId());

      // Verify unique span IDs
      expect(rootContext.getSpanId()).not.toBe(childContext.getSpanId());
      expect(childContext.getSpanId()).not.toBe(grandChildContext.getSpanId());
    });

    it('should support multiple children from same parent', () => {
      const provider = createMockProvider();
      const parentContext = provider.createRootContext('ParentOperation');
      
      const child1 = parentContext.createChild('Child1');
      const child2 = parentContext.createChild('Child2');
      const child3 = parentContext.createChild('Child3');

      // All children should have same parent
      expect(child1.span?.parentSpanId).toBe(parentContext.span?.spanId);
      expect(child2.span?.parentSpanId).toBe(parentContext.span?.spanId);
      expect(child3.span?.parentSpanId).toBe(parentContext.span?.spanId);

      // All children should have same trace ID
      expect(child1.getTraceId()).toBe(parentContext.getTraceId());
      expect(child2.getTraceId()).toBe(parentContext.getTraceId());
      expect(child3.getTraceId()).toBe(parentContext.getTraceId());

      // All children should have unique span IDs
      expect(child1.getSpanId()).not.toBe(child2.getSpanId());
      expect(child2.getSpanId()).not.toBe(child3.getSpanId());
      expect(child1.getSpanId()).not.toBe(child3.getSpanId());
    });
  });

  describe('Logging integration', () => {
    it('should enrich logs with context information', () => {
      const provider = createMockProvider();
      const context = provider.createRootContext('LogTest');

      // Mock the logger to capture log calls
      const mockLogger = provider.logger as any;
      const infoSpy = jest.spyOn(mockLogger, 'info');

      context.info('Test message', { userId: 123 });

      expect(infoSpy).toHaveBeenCalledWith('Test message', expect.objectContaining({
        contextId: context.contextId,
        operationName: 'LogTest',
        serviceName: provider.serviceName,
        serviceVersion: provider.serviceVersion,
        environment: provider.environment,
        traceId: context.getTraceId(),
        spanId: context.getSpanId(),
        userId: 123
      }));
    });

    it('should add logs to span', () => {
      const provider = createMockProvider();
      const context = provider.createRootContext('SpanLogTest');

      context.info('Test info message');
      context.warn('Test warning message');
      context.error('Test error message');

      expect(context.span?.logs).toHaveLength(3);
      expect(context.span?.logs[0]).toMatchObject({
        message: 'Test info message',
        level: 'info'
      });
      expect(context.span?.logs[1]).toMatchObject({
        message: 'Test warning message',
        level: 'warn'
      });
      expect(context.span?.logs[2]).toMatchObject({
        message: 'Test error message',
        level: 'error'
      });
    });
  });

  describe('Metrics integration', () => {
    it('should auto-label metrics with context information', () => {
      const provider = createMockProvider();
      const context = provider.createRootContext('MetricsTest');

      const counter = context.counter('test_counter', { custom: 'value' });
      counter.increment();

      expect(counter.get()).toBe(1);

      const gauge = context.gauge('test_gauge');
      gauge.set(100);
      gauge.increment();

      expect(gauge.get()).toBe(101);

      const histogram = context.histogram('test_histogram');
      histogram.observe(50);
      histogram.observe(75);

      const metrics = histogram.getMetrics();
      expect(metrics.count).toBe(1);
      expect(metrics.sum).toBe(75); // Last observed value in mock
    });

    it('should handle disabled metrics gracefully', () => {
      const provider = createMockProvider({
        metrics: { backend: 'none' }
      });
      const context = provider.createRootContext('DisabledMetricsTest');

      // These should not throw
      const counter = context.counter('test_counter');
      counter.increment();
      expect(counter.get()).toBe(0);

      const gauge = context.gauge('test_gauge');
      gauge.set(100);
      expect(gauge.get()).toBe(0);

      const histogram = context.histogram('test_histogram');
      histogram.observe(50);
      expect(histogram.getMetrics()).toEqual({ count: 0, sum: 0, buckets: {} });

      const timer = context.timer('test_timer');
      const instance = timer.start();
      expect(instance.stop()).toBe(0);
    });
  });

  describe('Tracing integration', () => {
    it('should support distributed tracing headers', () => {
      const provider = createMockProvider();
      const context = provider.createRootContext('DistributedTest');

      const headers = context.getTraceHeaders();
      expect(headers).toEqual({
        'x-trace-id': context.getTraceId(),
        'x-span-id': context.getSpanId()
      });
    });

    it('should create spans with proper timing', () => {
      const provider = createMockProvider();
      const context = provider.createRootContext('TimingTest');

      const startTime = Date.now();
      
      // Simulate some work
      for (let i = 0; i < 1000; i++) {
        Math.random();
      }
      
      context.finish();
      
      const endTime = Date.now();
      const duration = context.getDuration();

      expect(duration).toBeGreaterThanOrEqual(0);
      expect(duration).toBeLessThan(endTime - startTime + 100); // Allow some tolerance
      expect(context.span?.endTime).toBeDefined();
    });
  });
});

// ============================================
// 📁 .eslintrc.js - ESLINT CONFIGURATION
// ============================================
module.exports = {
  parser: '@typescript-eslint/parser',
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
    '@typescript-eslint/recommended-requiring-type-checking'
  ],
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    project: './tsconfig.json'
  },
  rules: {
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/prefer-nullish-coalescing': 'error',
    '@typescript-eslint/prefer-optional-chain': 'error',
    '@typescript-eslint/no-unnecessary-type-assertion': 'error',
    '@typescript-eslint/no-non-null-assertion': 'warn',
    'prefer-const': 'error',
    'no-var': 'error',
    'object-shorthand': 'error',
    'prefer-template': 'error'
  },
  env: {
    node: true,
    jest: true
  },
  ignorePatterns: ['dist/', 'node_modules/', '*.js']
};

// ============================================
// 📁 .gitignore - GIT IGNORE
// ============================================
# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Build outputs
dist/
build/
*.tsbuildinfo

# IDE files
.vscode/
.idea/
*.swp
*.swo
*~

# OS files
.DS_Store
Thumbs.db

# Environment files
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Test coverage
coverage/
*.lcov

# Temporary files
tmp/
temp/

# Logs
logs/
*.log

# Runtime data
pids/
*.pid
*.seed
*.pid.lock

# nyc test coverage
.nyc_output/

# ESLint cache
.eslintcache

# Optional npm cache directory
.npm

# Optional eslint cache
.eslintcache

# Microbundle cache
.rpt2_cache/
.rts2_cache_cjs/
.rts2_cache_es/
.rts2_cache_umd/

# Optional REPL history
.node_repl_history

# Output of 'npm pack'
*.tgz

# Yarn Integrity file
.yarn-integrity

# parcel-bundler cache (https://parceljs.org/)
.cache
.parcel-cache

# Next.js build output
.next

# Nuxt.js build / generate output
.nuxt
dist

# Gatsby files
.cache/
public

# Storybook build outputs
.out
.storybook-out

# Temporary folders
tmp/
temp/

// ============================================
// 📁 src/integrations/fastify.ts - FASTIFY INTEGRATION
// ============================================
export interface UnifiedFastifyOptions {
  provider: UnifiedObservabilityProvider;
  ignorePaths?: string[];
  ignoreUserAgent?: RegExp;
  extractUserContext?: (request: unknown) => Record<string, unknown>;
}

export function createUnifiedFastifyPlugin(options: UnifiedFastifyOptions) {
  return async function unifiedObservabilityPlugin(fastify: unknown) {
    const fastifyInstance = fastify as {
      addHook: (hook: string, handler: (request: UnifiedFastifyRequest, reply?: unknown) => Promise<void>) => void;
      decorateRequest: (name: string, value: unknown) => void;
    };

    // Decorate request with observability context
    fastifyInstance.decorateRequest('observability', null);

    // Request hook
    fastifyInstance.addHook('onRequest', async (request: UnifiedFastifyRequest) => {
      const shouldIgnore = options.ignorePaths?.some(path => 
        request.url?.startsWith(path)
      ) || (options.ignoreUserAgent && 
           options.ignoreUserAgent.test(request.headers['user-agent'] || ''));

      if (shouldIgnore) return;

      // Extract parent context from headers
      let parentContext: UnifiedSpanContext | undefined;
      if (options.provider.tracer) {
        parentContext = options.provider.tracer.extract('http_headers', request.headers as Record<string, string>);
      }

      // Create request context
      const operationName = `${request.method} ${request.url}`;
      const context = options.provider.createRootContext(operationName, parentContext);

      // Set request tags
      context.setTag('http.method', request.method || 'unknown');
      context.setTag('http.url', request.url || 'unknown');
      context.setTag('http.user_agent', request.headers['user-agent'] || 'unknown');

      // Extract user context if provided
      if (options.extractUserContext) {
        const userContext = options.extractUserContext(request);
        Object.entries(userContext).forEach(([key, value]) => {
          context.setTag(`user.${key}`, String(value));
        });
      }

      request.observability = context;

      context.info('HTTP request started', {
        method: request.method,
        url: request.url,
        userAgent: request.headers['user-agent']
      });
    });

    // Response hook
    fastifyInstance.addHook('onResponse', async (request: UnifiedFastifyRequest, reply) => {
      const context = request.observability;
      if (!context) return;

      const replyObj = reply as { statusCode: number };
      context.setTag('http.status_code', replyObj.statusCode);

      const level = replyObj.statusCode >= 500 ? 'error' : 
                   replyObj.statusCode >= 400 ? 'warn' : 'info';

      context[level]('HTTP request completed', {
        statusCode: replyObj.statusCode,
        duration: context.getDuration()
      });

      context.finish();
    });
  };
}

interface UnifiedFastifyRequest {
  method?: string;
  url?: string;
  headers: Record<string, string | string[] | undefined>;
  observability?: UnifiedObservabilityContext;
}

// ============================================
// 📁 src/index.ts - MAIN EXPORTS (for end users)
// ============================================
// Core exports
export * from './types/core';
export * from './interfaces/tracer';
export * from './interfaces/metrics';
export * from './interfaces/logger';
export * from './config/types';

// Main classes
export { UnifiedObservabilityProvider } from './provider/provider';
export { UnifiedObservabilityContext } from './context/context';

// Implementations
export * from './implementations/tracers';
export * from './implementations/metrics';
export * from './adapters/logger-adapters';

// Utilities
export { UnifiedConfigValidator } from './validation/config-validator';
export { UnifiedUtils } from './utils/utils';
export * from './errors/errors';

// Integrations
export * from './integrations/fastify';

// Factory
export { UnifiedObservabilityFactory } from './factory/factory';

// Wrappers
export * from './wrappers/metrics-wrappers';

// ============================================
// 📁 src/internal/index.ts - INTERNAL EXPORTS (for testing only)
// ============================================
/**
 * Internal utilities for testing purposes only.
 * These exports are not intended for end users.
 * 
 * @internal
 */

// Logging utilities
export * as LoggingUtils from './logging-utils';

// Tracing utilities  
export * as TracingUtils from './tracing-utils';

// Metrics utilities
export * as MetricsUtils from './metrics-utils';

// Re-export for direct access in tests
export { enrichLogData, logWithSpan, logError, logFatal } from './logging-utils';
export { 
  createSpanFromContext, 
  setSpanTag, 
  setSpanError, 
  getTraceHeaders, 
  finishSpan 
} from './tracing-utils';
export { 
  createMetricLabels, 
  createCounterWrapper, 
  createGaugeWrapper, 
  createHistogramWrapper, 
  createTimerWrapper 
} from './metrics-utils';

// ============================================
// 📁 src/testing/index.ts - TESTING UTILITIES
// ============================================
/**
 * Testing utilities and helpers.
 * These exports are intended for testing purposes.
 * 
 * @internal
 */

// Mock implementations
export class UnifiedMockTracer implements UnifiedTracer {
  private spans: Map<string, UnifiedSpan> = new Map();
  
  startSpan(operationName: string, parentSpan?: UnifiedSpan, options?: UnifiedSpanOptions): UnifiedSpan {
    const span: UnifiedSpan = {
      spanId: UnifiedUtils.generateSpanId(),
      traceId: parentSpan?.traceId || UnifiedUtils.generateTraceId(),
      parentSpanId: parentSpan?.spanId,
      operationName,
      startTime: options?.startTime || new Date(),
      tags: { ...options?.tags },
      logs: [],
      context: {
        traceId: parentSpan?.traceId || UnifiedUtils.generateTraceId(),
        spanId: UnifiedUtils.generateSpanId()
      }
    };
    
    this.spans.set(span.spanId, span);
    return span;
  }

  finishSpan(span: UnifiedSpan): void {
    span.endTime = new Date();
  }

  setTag(span: UnifiedSpan, key: string, value: string | number | boolean): void {
    span.tags[key] = value;
  }

  addLog(span: UnifiedSpan, message: string, level?: UnifiedLogLevel, fields?: Record<string, unknown>): void {
    span.logs.push({
      timestamp: new Date(),
      message,
      level,
      fields
    });
  }

  setError(span: UnifiedSpan, error: UnifiedErrorInfo): void {
    span.tags['error'] = true;
    span.tags['error.message'] = error.message;
  }

  inject(span: UnifiedSpan, format: UnifiedInjectFormat, carrier: Record<string, string>): void {
    carrier['x-trace-id'] = span.traceId;
    carrier['x-span-id'] = span.spanId;
  }

  extract(format: UnifiedInjectFormat, carrier: Record<string, string>): UnifiedSpanContext | undefined {
    const traceId = carrier['x-trace-id'];
    const spanId = carrier['x-span-id'];
    
    if (traceId && spanId) {
      return { traceId, spanId };
    }
    
    return undefined;
  }

  getSpans(): UnifiedSpan[] {
    return Array.from(this.spans.values());
  }

  clear(): void {
    this.spans.clear();
  }
}

export class UnifiedMockMetrics implements UnifiedMetricsRegistry {
  private metrics: Map<string, { type: string; value: number; labels: Record<string, string> }> = new Map();
  
  counter(name: string, help?: string, labelNames?: string[]): UnifiedCounter {
    return {
      increment: (labels?: UnifiedMetricLabels) => {
        const key = this.getKey(name, labels);
        const current = this.metrics.get(key) || { type: 'counter', value: 0, labels: labels || {} };
        this.metrics.set(key, { ...current, value: current.value + 1 });
      },
      add: (value: number, labels?: UnifiedMetricLabels) => {
        const key = this.getKey(name, labels);
        const current = this.metrics.get(key) || { type: 'counter', value: 0, labels: labels || {} };
        this.metrics.set(key, { ...current, value: current.value + value });
      },
      get: (labels?: UnifiedMetricLabels) => {
        const key = this.getKey(name, labels);
        return this.metrics.get(key)?.value || 0;
      }
    };
  }

  gauge(name: string, help?: string, labelNames?: string[]): UnifiedGauge {
    return {
      set: (value: number, labels?: UnifiedMetricLabels) => {
        const key = this.getKey(name, labels);
        this.metrics.set(key, { type: 'gauge', value, labels: labels || {} });
      },
      increment: (labels?: UnifiedMetricLabels) => {
        const key = this.getKey(name, labels);
        const current = this.metrics.get(key) || { type: 'gauge', value: 0, labels: labels || {} };
        this.metrics.set(key, { ...current, value: current.value + 1 });
      },
      decrement: (labels?: UnifiedMetricLabels) => {
        const key = this.getKey(name, labels);
        const current = this.metrics.get(key) || { type: 'gauge', value: 0, labels: labels || {} };
        this.metrics.set(key, { ...current, value: current.value - 1 });
      },
      add: (value: number, labels?: UnifiedMetricLabels) => {
        const key = this.getKey(name, labels);
        const current = this.metrics.get(key) || { type: 'gauge', value: 0, labels: labels || {} };
        this.metrics.set(key, { ...current, value: current.value + value });
      },
      get: (labels?: UnifiedMetricLabels) => {
        const key = this.getKey(name, labels);
        return this.metrics.get(key)?.value || 0;
      }
    };
  }

  histogram(name: string, help?: string, labelNames?: string[], buckets?: number[]): UnifiedHistogram {
    return {
      observe: (value: number, labels?: UnifiedMetricLabels) => {
        const key = this.getKey(name, labels);
        this.metrics.set(key, { type: 'histogram', value, labels: labels || {} });
      },
      time: <T>(fn: () => T | Promise<T>, labels?: UnifiedMetricLabels): T | Promise<T> => {
        const start = Date.now();
        const result = fn();
        
        if (result instanceof Promise) {
          return result.finally(() => {
            this.histogram(name).observe(Date.now() - start, labels);
          }) as Promise<T>;
        } else {
          this.histogram(name).observe(Date.now() - start, labels);
          return result;
        }
      },
      getMetrics: (labels?: UnifiedMetricLabels) => {
        const key = this.getKey(name, labels);
        const value = this.metrics.get(key)?.value || 0;
        return { count: 1, sum: value, buckets: {} };
      }
    };
  }

  timer(name: string, help?: string, labelNames?: string[]): UnifiedTimer {
    return {
      start: () => {
        const startTime = Date.now();
        return {
          stop: () => Date.now() - startTime,
          record: (labels?: UnifiedMetricLabels) => {
            const duration = Date.now() - startTime;
            const key = this.getKey(name, labels);
            this.metrics.set(key, { type: 'timer', value: duration, labels: labels || {} });
            return duration;
          }
        };
      },
      record: (durationMs: number, labels?: UnifiedMetricLabels) => {
        const key = this.getKey(name, labels);
        this.metrics.set(key, { type: 'timer', value: durationMs, labels: labels || {} });
      }
    };
  }

  clear(): void {
    this.metrics.clear();
  }

  getMetrics(): string {
    return Array.from(this.metrics.entries())
      .map(([key, value]) => `${key}=${value.value}`)
      .join('\n');
  }

  private getKey(name: string, labels?: UnifiedMetricLabels): string {
    if (!labels || Object.keys(labels).length === 0) {
      return name;
    }
    
    const labelStr = Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}="${v}"`)
      .join(',');
    
    return `${name}{${labelStr}}`;
  }
}

export class UnifiedMockLogger implements UnifiedLogger {
  private logs: Array<{ level: UnifiedLogLevel; message: string; data?: UnifiedLogData }> = [];

  trace(message: string, data?: UnifiedLogData): void {
    this.logs.push({ level: 'trace', message, data });
  }

  debug(message: string, data?: UnifiedLogData): void {
    this.logs.push({ level: 'debug', message, data });
  }

  info(message: string, data?: UnifiedLogData): void {
    this.logs.push({ level: 'info', message, data });
  }

  warn(message: string, data?: UnifiedLogData): void {
    this.logs.push({ level: 'warn', message, data });
  }

  error(message: string, data?: UnifiedLogData): void {
    this.logs.push({ level: 'error', message, data });
  }

  fatal(message: string, data?: UnifiedLogData): void {
    this.logs.push({ level: 'fatal', message, data });
  }

  child(context: Record<string, unknown>): UnifiedLogger {
    return new UnifiedMockLogger();
  }

  getLogs(): Array<{ level: UnifiedLogLevel; message: string; data?: UnifiedLogData }> {
    return [...this.logs];
  }

  clear(): void {
    this.logs = [];
  }
}

// Test helper functions
export function createMockProvider(config?: Partial<UnifiedObservabilityConfig>): UnifiedObservabilityProvider {
  const mockConfig: UnifiedObservabilityConfig = {
    serviceName: 'test-service',
    serviceVersion: '1.0.0',
    environment: 'test',
    tracing: { backend: 'console', enabled: true },
    metrics: { backend: 'console', enabled: true },
    logging: { backend: 'console', level: 'debug' },
    ...config
  };

  return new UnifiedObservabilityProvider(mockConfig);
}

export function createMockContext(
  provider?: UnifiedObservabilityProvider,
  operationName = 'test-operation'
): UnifiedObservabilityContext {
  const mockProvider = provider || createMockProvider();
  return mockProvider.createRootContext(operationName);
}

// ============================================
// 📁 src/implementations/tracers.ts - CLEAN TRACER IMPLEMENTATIONS (using utilities)
// ============================================
import { 
  generateXRayTraceId, 
  generateXRaySpanId, 
  generateStandardTraceId, 
  generateStandardSpanId,
  isIndexedXRayTag,
  createXRaySegment,
  sendToXRayDaemon
} from '../internal/tracer-utils';

export class UnifiedJaegerTracer implements UnifiedTracer {
  private jaeger: unknown;
  private spans = new Map<string, unknown>();
  private serviceName: string;

  constructor(config: { serviceName: string; serviceVersion: string; environment: string } & UnifiedJaegerConfig) {
    this.serviceName = config.serviceName;
    console.log(`Initializing Jaeger tracer for ${config.serviceName}`);
    // In real implementation, use jaeger-client library
  }

  startSpan(operationName: string, parentSpan?: UnifiedSpan, options?: UnifiedSpanOptions): UnifiedSpan {
    const span: UnifiedSpan = {
      spanId: generateStandardSpanId(),
      traceId: parentSpan?.traceId || generateStandardTraceId(),
      parentSpanId: parentSpan?.spanId,
      operationName,
      startTime: options?.startTime || new Date(),
      tags: { ...options?.tags },
      logs: [],
      context: {
        traceId: parentSpan?.traceId || generateStandardTraceId(),
        spanId: generateStandardSpanId()
      }
    };

    console.debug(`[JAEGER] Started span: ${operationName}`, {
      spanId: span.spanId,
      traceId: span.traceId,
      parentSpanId: span.parentSpanId
    });

    return span;
  }

  finishSpan(span: UnifiedSpan): void {
    span.endTime = new Date();
    const duration = span.endTime.getTime() - span.startTime.getTime();

    console.debug(`[JAEGER] Finished span: ${span.operationName}`, {
      spanId: span.spanId,
      duration: `${duration}ms`,
      tags: span.tags
    });
  }

  setTag(span: UnifiedSpan, key: string, value: string | number | boolean): void {
    span.tags[key] = value;
    console.debug(`[JAEGER] Tag set: ${key}=${value}`, { spanId: span.spanId });
  }

  addLog(span: UnifiedSpan, message: string, level?: UnifiedLogLevel, fields?: Record<string, unknown>): void {
    const log = {
      timestamp: new Date(),
      message,
      level,
      fields
    };
    
    span.logs.push(log);
    console.debug(`[JAEGER] Log added: ${message}`, {
      spanId: span.spanId,
      level,
      fields
    });
  }

  setError(span: UnifiedSpan, error: UnifiedErrorInfo): void {
    span.tags.error = true;
    span.tags['error.message'] = error.message;
    if (error.stack) {
      span.tags['error.stack'] = error.stack;
    }
    if (error.type) {
      span.tags['error.type'] = error.type;
    }
  }

  inject(span: UnifiedSpan, format: UnifiedInjectFormat, carrier: Record<string, string>): void {
    if (format === 'http_headers') {
      carrier['x-trace-id'] = span.traceId;
      carrier['x-span-id'] = span.spanId;
    }
  }

  extract(format: UnifiedInjectFormat, carrier: Record<string, string>): UnifiedSpanContext | undefined {
    if (format === 'http_headers') {
      const traceId = carrier['x-trace-id'];
      const spanId = carrier['x-span-id'];
      
      if (traceId && spanId) {
        return { traceId, spanId };
      }
    }
    
    return undefined;
  }
}

export class UnifiedOtelTracer implements UnifiedTracer {
  private serviceName: string;

  constructor(config: { serviceName: string; serviceVersion: string; environment: string } & UnifiedOtelTracingConfig) {
    this.serviceName = config.serviceName;
    console.log(`Initializing OpenTelemetry tracer for ${config.serviceName}`);
    // In real implementation, use @opentelemetry/api
  }

  startSpan(operationName: string, parentSpan?: UnifiedSpan, options?: UnifiedSpanOptions): UnifiedSpan {
    const span: UnifiedSpan = {
      spanId: generateStandardSpanId(),
      traceId: parentSpan?.traceId || generateStandardTraceId(),
      parentSpanId: parentSpan?.spanId,
      operationName,
      startTime: options?.startTime || new Date(),
      tags: { ...options?.tags },
      logs: [],
      context: {
        traceId: parentSpan?.traceId || generateStandardTraceId(),
        spanId: generateStandardSpanId()
      }
    };

    console.debug(`[OTEL] Started span: ${operationName}`, {
      spanId: span.spanId,
      traceId: span.traceId,
      parentSpanId: span.parentSpanId
    });

    return span;
  }

  finishSpan(span: UnifiedSpan): void {
    span.endTime = new Date();
    const duration = span.endTime.getTime() - span.startTime.getTime();

    console.debug(`[OTEL] Finished span: ${span.operationName}`, {
      spanId: span.spanId,
      duration: `${duration}ms`,
      tags: span.tags
    });
  }

  setTag(span: UnifiedSpan, key: string, value: string | number | boolean): void {
    span.tags[key] = value;
    console.debug(`[OTEL] Tag set: ${key}=${value}`, { spanId: span.spanId });
  }

  addLog(span: UnifiedSpan, message: string, level?: UnifiedLogLevel, fields?: Record<string, unknown>): void {
    const log = {
      timestamp: new Date(),
      message,
      level,
      fields
    };
    
    span.logs.push(log);
    console.debug(`[OTEL] Log added: ${message}`, {
      spanId: span.spanId,
      level,
      fields
    });
  }

  setError(span: UnifiedSpan, error: UnifiedErrorInfo): void {
    span.tags.error = true;
    span.tags['error.message'] = error.message;
    if (error.stack) {
      span.tags['error.stack'] = error.stack;
    }
    if (error.type) {
      span.tags['error.type'] = error.type;
    }
  }

  inject(span: UnifiedSpan, format: UnifiedInjectFormat, carrier: Record<string, string>): void {
    if (format === 'http_headers') {
      carrier['x-trace-id'] = span.traceId;
      carrier['x-span-id'] = span.spanId;
    }
  }

  extract(format: UnifiedInjectFormat, carrier: Record<string, string>): UnifiedSpanContext | undefined {
    if (format === 'http_headers') {
      const traceId = carrier['x-trace-id'];
      const spanId = carrier['x-span-id'];
      
      if (traceId && spanId) {
        return { traceId, spanId };
      }
    }
    
    return undefined;
  }
}

export class UnifiedXRayTracer implements UnifiedTracer {
  private serviceName: string;
  private segments = new Map<string, Record<string, unknown>>();

  constructor(config: { serviceName: string; serviceVersion: string; environment: string } & UnifiedXRayConfig) {
    this.serviceName = config.serviceName;
    console.log(`Initializing AWS X-Ray tracer for ${config.serviceName}`);
    console.log(`X-Ray Configuration:`, {
      region: config.region || process.env.AWS_REGION || 'us-east-1',
      daemon: config.daemon || process.env._X_AMZN_TRACE_ID || 'localhost:2000',
      captureAWS: config.captureAWS ?? true,
      captureHTTPs: config.captureHTTPs ?? true
    });
  }

  startSpan(operationName: string, parentSpan?: UnifiedSpan, options?: UnifiedSpanOptions): UnifiedSpan {
    const span: UnifiedSpan = {
      spanId: generateXRaySpanId(),
      traceId: parentSpan?.traceId || generateXRayTraceId(),
      parentSpanId: parentSpan?.spanId,
      operationName,
      startTime: options?.startTime || new Date(),
      tags: { ...options?.tags },
      logs: [],
      context: {
        traceId: parentSpan?.traceId || generateXRayTraceId(),
        spanId: generateXRaySpanId()
      }
    };

    const xraySegment = createXRaySegment(span, this.serviceName);
    this.segments.set(span.spanId, xraySegment);

    console.debug(`[X-RAY] Started segment: ${operationName}`, {
      segmentId: span.spanId,
      traceId: span.traceId,
      parentId: span.parentSpanId,
      serviceName: this.serviceName
    });

    return span;
  }

  finishSpan(span: UnifiedSpan): void {
    span.endTime = new Date();
    const duration = span.endTime.getTime() - span.startTime.getTime();
    
    const xraySegment = this.segments.get(span.spanId);
    if (xraySegment) {
      xraySegment.end_time = span.endTime.getTime() / 1000;
      xraySegment.duration = duration / 1000;
      
      (xraySegment.metadata as Record<string, unknown>).performance = {
        duration_ms: duration,
        start_time: span.startTime.toISOString(),
        end_time: span.endTime.toISOString()
      };

      console.debug(`[X-RAY] Finished segment: ${span.operationName}`, {
        segmentId: span.spanId,
        duration: `${duration}ms`,
        annotations: xraySegment.annotations,
        metadata: Object.keys(xraySegment.metadata as Record<string, unknown>)
      });

      sendToXRayDaemon(xraySegment);
      this.segments.delete(span.spanId);
    }
  }

  setTag(span: UnifiedSpan, key: string, value: string | number | boolean): void {
    span.tags[key] = value;
    
    const xraySegment = this.segments.get(span.spanId);
    if (xraySegment) {
      if (isIndexedXRayTag(key)) {
        (xraySegment.annotations as Record<string, unknown>)[key] = value;
        console.debug(`[X-RAY] Annotation set: ${key}=${value}`, { segmentId: span.spanId });
      } else {
        if (!(xraySegment.metadata as Record<string, unknown>).custom) {
          (xraySegment.metadata as Record<string, unknown>).custom = {};
        }
        ((xraySegment.metadata as Record<string, unknown>).custom as Record<string, unknown>)[key] = value;
        console.debug(`[X-RAY] Metadata set: ${key}=${value}`, { segmentId: span.spanId });
      }
    }
  }

  addLog(span: UnifiedSpan, message: string, level?: UnifiedLogLevel, fields?: Record<string, unknown>): void {
    const log = {
      timestamp: new Date(),
      message,
      level,
      fields
    };
    
    span.logs.push(log);
    
    const xraySegment = this.segments.get(span.spanId);
    if (xraySegment) {
      if (!(xraySegment.metadata as Record<string, unknown>).logs) {
        (xraySegment.metadata as Record<string, unknown>).logs = [];
      }
      
      ((xraySegment.metadata as Record<string, unknown>).logs as unknown[]).push({
        timestamp: log.timestamp.toISOString(),
        message,
        level,
        fields
      });

      if (level === 'error') {
        xraySegment.error = true;
        xraySegment.fault = true;
        if (fields?.error) {
          xraySegment.cause = {
            exceptions: [{
              message: fields.error,
              type: (fields.error_type as string) || 'Error'
            }]
          };
        }
      }

      console.debug(`[X-RAY] Log added: ${message}`, {
        segmentId: span.spanId,
        level,
        fields
      });
    }
  }

  setError(span: UnifiedSpan, error: UnifiedErrorInfo): void {
    span.tags.error = true;
    span.tags['error.message'] = error.message;
    
    const xraySegment = this.segments.get(span.spanId);
    if (xraySegment) {
      xraySegment.error = true;
      xraySegment.fault = true;
      xraySegment.cause = {
        exceptions: [{
          message: error.message,
          type: error.type || 'Error'
        }]
      };
    }
  }

  inject(span: UnifiedSpan, format: UnifiedInjectFormat, carrier: Record<string, string>): void {
    if (format === 'http_headers') {
      carrier['x-amzn-trace-id'] = `Root=${span.traceId};Parent=${span.spanId}`;
    }
  }

  extract(format: UnifiedInjectFormat, carrier: Record<string, string>): UnifiedSpanContext | undefined {
    if (format === 'http_headers') {
      const traceHeader = carrier['x-amzn-trace-id'];
      if (traceHeader) {
        const rootMatch = traceHeader.match(/Root=([^;]+)/);
        const parentMatch = traceHeader.match(/Parent=([^;]+)/);
        
        if (rootMatch && parentMatch) {
          return { 
            traceId: rootMatch[1]!, 
            spanId: parentMatch[1]! 
          };
        }
      }
    }
    
    return undefined;
  }
}

export class UnifiedConsoleTracer implements UnifiedTracer {
  startSpan(operationName: string, parentSpan?: UnifiedSpan, options?: UnifiedSpanOptions): UnifiedSpan {
    const span: UnifiedSpan = {
      spanId: generateStandardSpanId(),
      traceId: parentSpan?.traceId || generateStandardTraceId(),
      parentSpanId: parentSpan?.spanId,
      operationName,
      startTime: options?.startTime || new Date(),
      tags: { ...options?.tags },
      logs: [],
      context: {
        traceId: parentSpan?.traceId || generateStandardTraceId(),
        spanId: generateStandardSpanId()
      }
    };

    console.debug(`[CONSOLE] Started span: ${operationName}`, {
      spanId: span.spanId,
      traceId: span.traceId,
      parentSpanId: span.parentSpanId
    });

    return span;
  }

  finishSpan(span: UnifiedSpan): void {
    span.endTime = new Date();
    const duration = span.endTime.getTime() - span.startTime.getTime();

    console.debug(`[CONSOLE] Finished span: ${span.operationName}`, {
      spanId: span.spanId,
      duration: `${duration}ms`,
      tags: span.tags
    });
  }

  setTag(span: UnifiedSpan, key: string, value: string | number | boolean): void {
    span.tags[key] = value;
    console.debug(`[CONSOLE] Tag set: ${key}=${value}`, { spanId: span.spanId });
  }

  addLog(span: UnifiedSpan, message: string, level?: UnifiedLogLevel, fields?: Record<string, unknown>): void {
    const log = {
      timestamp: new Date(),
      message,
      level,
      fields
    };
    
    span.logs.push(log);
    console.debug(`[CONSOLE] Log added: ${message}`, {
      spanId: span.spanId,
      level,
      fields
    });
  }

  setError(span: UnifiedSpan, error: UnifiedErrorInfo): void {
    span.tags.error = true;
    span.tags['error.message'] = error.message;
    if (error.stack) {
      span.tags['error.stack'] = error.stack;
    }
    if (error.type) {
      span.tags['error.type'] = error.type;
    }
  }

  inject(span: UnifiedSpan, format: UnifiedInjectFormat, carrier: Record<string, string>): void {
    if (format === 'http_headers') {
      carrier['x-trace-id'] = span.traceId;
      carrier['x-span-id'] = span.spanId;
    }
  }

  extract(format: UnifiedInjectFormat, carrier: Record<string, string>): UnifiedSpanContext | undefined {
    if (format === 'http_headers') {
      const traceId = carrier['x-trace-id'];
      const spanId = carrier['x-span-id'];
      
      if (traceId && spanId) {
        return { traceId, spanId };
      }
    }
    
    return undefined;
  }
}

// ============================================
// 📁 src/testing/index.ts - CLEAN TESTING UTILITIES (using key utils)
// ============================================
import { createMetricKey } from '../internal/metrics-key-utils';
import { generateStandardTraceId, generateStandardSpanId } from '../internal/tracer-utils';

export class UnifiedMockTracer implements UnifiedTracer {
  private spans: Map<string, UnifiedSpan> = new Map();
  
  startSpan(operationName: string, parentSpan?: UnifiedSpan, options?: UnifiedSpanOptions): UnifiedSpan {
    const span: UnifiedSpan = {
      spanId: generateStandardSpanId(),
      traceId: parentSpan?.traceId || generateStandardTraceId(),
      parentSpanId: parentSpan?.spanId,
      operationName,
      startTime: options?.startTime || new Date(),
      tags: { ...options?.tags },
      logs: [],
      context: {
        traceId: parentSpan?.traceId || generateStandardTraceId(),
        spanId: generateStandardSpanId()
      }
    };
    
    this.spans.set(span.spanId, span);
    return span;
  }

  finishSpan(span: UnifiedSpan): void {
    span.endTime = new Date();
  }

  setTag(span: UnifiedSpan, key: string, value: string | number | boolean): void {
    span.tags[key] = value;
  }

  addLog(span: UnifiedSpan, message: string, level?: UnifiedLogLevel, fields?: Record<string, unknown>): void {
    span.logs.push({
      timestamp: new Date(),
      message,
      level,
      fields
    });
  }

  setError(span: UnifiedSpan, error: UnifiedErrorInfo): void {
    span.tags['error'] = true;
    span.tags['error.message'] = error.message;
  }

  inject(span: UnifiedSpan, format: UnifiedInjectFormat, carrier: Record<string, string>): void {
    carrier['x-trace-id'] = span.traceId;
    carrier['x-span-id'] = span.spanId;
  }

  extract(format: UnifiedInjectFormat, carrier: Record<string, string>): UnifiedSpanContext | undefined {
    const traceId = carrier['x-trace-id'];
    const spanId = carrier['x-span-id'];
    
    if (traceId && spanId) {
      return { traceId, spanId };
    }
    
    return undefined;
  }

  getSpans(): UnifiedSpan[] {
    return Array.from(this.spans.values());
  }

  clear(): void {
    this.spans.clear();
  }
}

export class UnifiedMockMetrics implements UnifiedMetricsRegistry {
  private metrics: Map<string, { type: string; value: number; labels: Record<string, string> }> = new Map();
  
  counter(name: string, help?: string, labelNames?: string[]): UnifiedCounter {
    return {
      increment: (labels?: UnifiedMetricLabels) => {
        const key = createMetricKey(name, labels);
        const current = this.metrics.get(key) || { type: 'counter', value: 0, labels: labels || {} };
        this.metrics.set(key, { ...current, value: current.value + 1 });
      },
      add: (value: number, labels?: UnifiedMetricLabels) => {
        const key = createMetricKey(name, labels);
        const current = this.metrics.get(key) || { type: 'counter', value: 0, labels: labels || {} };
        this.metrics.set(key, { ...current, value: current.value + value });
      },
      get: (labels?: UnifiedMetricLabels) => {
        const key = createMetricKey(name, labels);
        return this.metrics.get(key)?.value || 0;
      }
    };
  }

  gauge(name: string, help?: string, labelNames?: string[]): UnifiedGauge {
    return {
      set: (value: number, labels?: UnifiedMetricLabels) => {
        const key = createMetricKey(name, labels);
        this.metrics.set(key, { type: 'gauge', value, labels: labels || {} });
      },
      increment: (labels?: UnifiedMetricLabels) => {
        const key = createMetricKey(name, labels);
        const current = this.metrics.get(key) || { type: 'gauge', value: 0, labels: labels || {} };
        this.metrics.set(key, { ...current, value: current.value + 1 });
      },
      decrement: (labels?: UnifiedMetricLabels) => {
        const key = createMetricKey(name, labels);
        const current = this.metrics.get(key) || { type: 'gauge', value: 0, labels: labels || {} };
        this.metrics.set(key, { ...current, value: current.value - 1 });
      },
      add: (value: number, labels?: UnifiedMetricLabels) => {
        const key = createMetricKey(name, labels);
        const current = this.metrics.get(key) || { type: 'gauge', value: 0, labels: labels || {} };
        this.metrics.set(key, { ...current, value: current.value + value });
      },
      get: (labels?: UnifiedMetricLabels) => {
        const key = createMetricKey(name, labels);
        return this.metrics.get(key)?.value || 0;
      }
    };
  }

  histogram(name: string, help?: string, labelNames?: string[], buckets?: number[]): UnifiedHistogram {
    return {
      observe: (value: number, labels?: UnifiedMetricLabels) => {
        const key = createMetricKey(name, labels);
        this.metrics.set(key, { type: 'histogram', value, labels: labels || {} });
      },
      time: <T>(fn: () => T | Promise<T>, labels?: UnifiedMetricLabels): T | Promise<T> => {
        const start = Date.now();
        const result = fn();
        
        if (result instanceof Promise) {
          return result.finally(() => {
            this.histogram(name).observe(Date.now() - start, labels);
          }) as Promise<T>;
        } else {
          this.histogram(name).observe(Date.now() - start, labels);
          return result;
        }
      },
      getMetrics: (labels?: UnifiedMetricLabels) => {
        const key = createMetricKey(name, labels);
        const value = this.metrics.get(key)?.value || 0;
        return { count: 1, sum: value, buckets: {} };
      }
    };
  }

  timer(name: string, help?: string, labelNames?: string[]): UnifiedTimer {
    return {
      start: () => {
        const startTime = Date.now();
        return {
          stop: () => Date.now() - startTime,
          record: (labels?: UnifiedMetricLabels) => {
            const duration = Date.now() - startTime;
            const key = createMetricKey(name, labels);
            this.metrics.set(key, { type: 'timer', value: duration, labels: labels || {} });
            return duration;
          }
        };
      },
      record: (durationMs: number, labels?: UnifiedMetricLabels) => {
        const key = createMetricKey(name, labels);
        this.metrics.set(key, { type: 'timer', value: durationMs, labels: labels || {} });
      }
    };
  }

  clear(): void {
    this.metrics.clear();
  }

  getMetrics(): string {
    return Array.from(this.metrics.entries())
      .map(([key, value]) => `${key}=${value.value}`)
      .join('\n');
  }
}

export class UnifiedMockLogger implements UnifiedLogger {
  private logs: Array<{ level: UnifiedLogLevel; message: string; data?: UnifiedLogData }> = [];

  trace(message: string, data?: UnifiedLogData): void {
    this.logs.push({ level: 'trace', message, data });
  }

  debug(message: string, data?: UnifiedLogData): void {
    this.logs.push({ level: 'debug', message, data });
  }

  info(message: string, data?: UnifiedLogData): void {
    this.logs.push({ level: 'info', message, data });
  }

  warn(message: string, data?: UnifiedLogData): void {
    this.logs.push({ level: 'warn', message, data });
  }

  error(message: string, data?: UnifiedLogData): void {
    this.logs.push({ level: 'error', message, data });
  }

  fatal(message: string, data?: UnifiedLogData): void {
    this.logs.push({ level: 'fatal', message, data });
  }

  child(context: Record<string, unknown>): UnifiedLogger {
    return new UnifiedMockLogger();
  }

  getLogs(): Array<{ level: UnifiedLogLevel; message: string; data?: UnifiedLogData }> {
    return [...this.logs];
  }

  clear(): void {
    this.logs = [];
  }
}

// Test helper functions
export function createMockProvider(config?: Partial<UnifiedObservabilityConfig>): UnifiedObservabilityProvider {
  const mockConfig: UnifiedObservabilityConfig = {
    serviceName: 'test-service',
    serviceVersion: '1.0.0',
    environment: 'test',
    tracing: { backend: 'console', enabled: true },
    metrics: { backend: 'console', enabled: true },
    logging: { backend: 'console', level: 'debug' },
    ...config
  };

  return new UnifiedObservabilityProvider(mockConfig);
}

export function createMockContext(
  provider?: UnifiedObservabilityProvider,
  operationName = 'test-operation'
): UnifiedObservabilityContext {
  const mockProvider = provider || createMockProvider();
  return mockProvider.createRootContext(operationName);
}

// ============================================
// 📁 src/internal/index.ts - UPDATED INTERNAL EXPORTS (for testing only)
// ============================================
/**
 * Internal utilities for testing purposes only.
 * These exports are not intended for end users.
 * 
 * @internal
 */

// Logging utilities
export * as LoggingUtils from './logging-utils';

// Tracing utilities  
export * as TracingUtils from './tracing-utils';

// Metrics utilities
export * as MetricsUtils from './metrics-utils';

// Validation utilities
export * as ValidationUtils from './validation-utils';

// Provider utilities
export * as ProviderUtils from './provider-utils';

// Factory utilities
export * as FactoryUtils from './factory-utils';

// Tracer utilities
export * as TracerUtils from './tracer-utils';

// Metrics key utilities
export * as MetricsKeyUtils from './metrics-key-utils';

// Re-export for direct access in tests
export { enrichLogData, logWithSpan, logError, logFatal } from './logging-utils';
export { 
  createSpanFromContext, 
  setSpanTag, 
  setSpanError, 
  getTraceHeaders, 
  finishSpan 
} from './tracing-utils';
export { 
  createMetricLabels, 
  createCounterWrapper, 
  createGaugeWrapper, 
  createHistogramWrapper, 
  createTimerWrapper 
} from './metrics-utils';
export { 
  validateLoggingConfig, 
  validateTracingConfig, 
  validateMetricsConfig, 
  validateServiceName 
} from './validation-utils';
export { 
  createTracerFromConfig, 
  createMetricsFromConfig, 
  createLoggerFromConfig,
  createDefaultTags 
} from './provider-utils';
export { 
  createTracingConfigFromEnv, 
  createMetricsConfigFromEnv, 
  createLoggingConfigFromEnv,
  parseHeaders,
  parseLabels,
  createEnvironmentTags 
} from './factory-utils';
export { 
  generateXRayTraceId, 
  generateXRaySpanId, 
  generateStandardTraceId, 
  generateStandardSpanId,
  isIndexedXRayTag,
  createXRaySegment,
  sendToXRayDaemon 
} from './tracer-utils';
export { 
  createMetricKey, 
  sanitizeMetricName, 
  sanitizeLabelName, 
  sanitizeLabelValue, 
  validateMetricName, 
  validateLabelName 
} from './metrics-key-utils';