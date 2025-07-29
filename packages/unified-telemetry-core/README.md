# @inh-lib/unified-telemetry-core

Core telemetry abstractions for unified observability - framework and layer agnostic.

## 🎯 Features

- **Pure Abstractions** - No framework dependencies, works with any architecture
- **Type-Safe** - Full TypeScript support with no `any` types
- **Layer Agnostic** - Works across HTTP, Service, Data, and Core layers  
- **Provider Pattern** - Pluggable implementations (Console, NoOp, OpenTelemetry)
- **Unified API** - Single interface for logging, tracing, and metrics
- **Zero Dependencies** - Core package has no external dependencies

## 📦 Installation

```bash
npm install @inh-lib/unified-telemetry-core
```

## 🚀 Quick Start

### Basic Usage

```typescript
import { 
  ConsoleUnifiedTelemetryProvider,
  UnifiedTelemetryConfig,
  SPAN_KIND 
} from '@inh-lib/unified-telemetry-core';

// Create configuration
const config: UnifiedTelemetryConfig = {
  serviceName: 'my-service',
  serviceVersion: '1.0.0',
  environment: 'development'
};

// Create provider
const telemetry = new ConsoleUnifiedTelemetryProvider(config);

// Use logging
const logger = telemetry.logger;
logger.info('Application started', { port: 3000 });

// Create child logger
const childLogger = logger.createChildLogger('user_operation', {
  userId: 'user-123'
});
childLogger.info('Processing user request');

// Use tracing
const span = telemetry.tracer.startSpan('process_request', {
  kind: SPAN_KIND.SERVER,
  attributes: { 'http.method': 'POST' }
});

span.setTag('user.id', 'user-123');
span.addEvent('validation_started');
span.finish();

// Use metrics
const counter = telemetry.metrics.createCounter('requests_total');
counter.add(1, { method: 'POST', status: '200' });

const histogram = telemetry.metrics.createHistogram('request_duration_ms');
histogram.record(150, { endpoint: '/api/users' });
```

### Provider Injection Pattern

```typescript
// HTTP Layer
export class UserRoutes {
  constructor(
    private telemetry: UnifiedTelemetryProvider,
    private userService: UserService
  ) {}

  async createUser(request: Request): Promise<Response> {
    const logger = this.telemetry.logger.createChildLogger('http.createUser', {
      method: request.method,
      url: request.url
    });

    logger.info('Processing create user request');

    try {
      // Pass telemetry to service layer
      const user = await this.userService.createUser(this.telemetry, request.body);
      
      logger.info('User created successfully', { userId: user.id });
      return { success: true, data: user };
    } catch (error) {
      logger.error('Failed to create user', error);
      throw error;
    }
  }
}

// Service Layer  
export class UserService {
  constructor(private userRepository: UserRepository) {}

  async createUser(
    telemetry: UnifiedTelemetryProvider, 
    userData: CreateUserData
  ): Promise<User> {
    // Create service layer logger
    const logger = telemetry.logger.createChildLogger('service.createUser', {
      operation: 'createUser',
      entity: 'User'
    });

    // Create service span
    const span = telemetry.tracer.startSpan('service.createUser');
    logger.attachSpan(span);

    logger.info('Creating user', { email: userData.email });

    try {
      // Pass telemetry to data layer
      const user = await this.userRepository.create(telemetry, userData);
      
      // Record metrics
      const counter = telemetry.metrics.createCounter('users_created_total');
      counter.add(1, { method: 'service' });

      logger.info('User creation completed', { userId: user.id });
      return user;
    } catch (error) {
      logger.error('User creation failed', error);
      throw error;
    } finally {
      span.finish();
    }
  }
}

// Data Layer
export class UserRepository {
  async create(
    telemetry: UnifiedTelemetryProvider,
    userData: CreateUserData
  ): Promise<User> {
    // Create data layer logger
    const logger = telemetry.logger.createChildLogger('data.createUser', {
      operation: 'create',
      table: 'users'
    });

    // Create database span
    const span = telemetry.tracer.startSpan('db.users.insert');
    logger.attachSpan(span);

    logger.info('Inserting user into database');

    try {
      const user = await this.performInsert(userData);
      
      // Record database metrics
      const histogram = telemetry.metrics.createHistogram('db_operation_duration_ms');
      histogram.record(50, { operation: 'insert', table: 'users' });

      logger.info('User inserted successfully', { userId: user.id });
      return user;
    } catch (error) {
      logger.error('Database insertion failed', error);
      throw error;
    } finally {
      span.finish();
    }
  }
}
```

## 🏗️ Architecture

### Provider Pattern
```typescript
interface UnifiedTelemetryProvider {
  logger: UnifiedTelemetryLogger;    // Structured logging with trace context
  tracer: UnifiedTelemetryTracer;    // Distributed tracing
  metrics: UnifiedTelemetryMetrics;  // Application metrics
  shutdown(): Promise<void>;
}
```

### Layer Usage
- **HTTP Layer**: Request/response logging, HTTP metrics
- **Service Layer**: Business logic tracing, operation metrics  
- **Data Layer**: Database query logging, performance metrics
- **Core Layer**: Utility operations, system metrics

## 📋 Available Providers

### ConsoleUnifiedTelemetryProvider
Perfect for development and debugging:
```typescript
const telemetry = new ConsoleUnifiedTelemetryProvider(config);
```

### NoOpUnifiedTelemetryProvider  
For disabling telemetry or testing:
```typescript
const telemetry = new NoOpUnifiedTelemetryProvider();
```

## 🔧 Configuration

```typescript
interface UnifiedTelemetryConfig {
  serviceName: string;
  serviceVersion: string;
  environment: 'development' | 'staging' | 'production';
  instanceId?: string;
  
  // Feature flags
  enableLogging?: boolean;
  enableTracing?: boolean; 
  enableMetrics?: boolean;
  
  // Configuration
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  sampleRate?: number;
  
  // Provider-specific config
  providerConfig?: Record<string, string | number | boolean | Record<string, unknown>>;
}
```

## 🎨 Design Principles

- **No `any` types** - Full type safety
- **No `enum`** - Uses union types + constants
- **No private methods** - Uses utility functions
- **Provider injection** - Single telemetry instance per app
- **Layer agnostic** - Works in any architecture layer
- **Framework agnostic** - No HTTP or framework dependencies

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm test:watch
```

## 🏗️ Development

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run type checking
npm run type-check

# Run linting
npm run lint

# Run linting with fix
npm run lint:fix
```

## 📄 License

MIT

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines and submit pull requests to our repository.

## 🔗 Related Packages

- `@inh-lib/unified-telemetry-http` - HTTP middleware and web framework integrations
- `@inh-lib/unified-telemetry-providers` - Additional provider implementations (OpenTelemetry, etc.)

---

**Made with ❤️ by INH Lib Team**