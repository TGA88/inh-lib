// =============================================================================
// PACKAGE ARCHITECTURE DESIGN
// =============================================================================

/**
 * แยก @inh-lib/unified-telemetry เป็น 3 packages เพื่อ clean separation
 */

// =============================================================================
// 1. @inh-lib/unified-telemetry-core - Base abstractions (Layer-agnostic)
// =============================================================================

// package.json
{
  "name": "@inh-lib/unified-telemetry-core",
  "description": "Core telemetry abstractions for any layer - no HTTP dependencies",
  "dependencies": {
    // ไม่มี framework dependencies
  }
}

// types/core-telemetry.ts - Pure abstractions
export interface UnifiedTelemetryTracer {
  startSpan(name: string, options?: UnifiedSpanOptions): UnifiedTelemetrySpan;
  getActiveSpan(): UnifiedTelemetrySpan | undefined;
}

export interface UnifiedTelemetryLogger {
  debug(message: string, attributes?: Record<string, unknown>): void;
  info(message: string, attributes?: Record<string, unknown>): void;
  warn(message: string, attributes?: Record<string, unknown>): void;
  error(message: string, attributes?: Record<string, unknown>): void;
}

export interface UnifiedTelemetryMetrics {
  createCounter(name: string, description?: string): UnifiedTelemetryCounter;
  createHistogram(name: string, description?: string): UnifiedTelemetryHistogram;
  createGauge(name: string, description?: string): UnifiedTelemetryGauge;
}

export interface UnifiedTelemetryProvider {
  tracer: UnifiedTelemetryTracer;
  logger: UnifiedTelemetryLogger;
  metrics: UnifiedTelemetryMetrics;
  shutdown(): Promise<void>;
}

// services/core-telemetry-service.ts - Layer-agnostic service
export class UnifiedCoreTelemtryService {
  constructor(
    private provider: UnifiedTelemetryProvider,
    private config: UnifiedTelemetryConfig
  ) {}

  // ✅ ใช้ได้ใน DataLayer - ไม่ติด HTTP concepts
  createDatabaseSpan(operation: string, table: string): UnifiedTelemetrySpan {
    return this.provider.tracer.startSpan(`database.${operation}`, {
      attributes: {
        'db.operation': operation,
        'db.table': table,
      },
    });
  }

  // ✅ ใช้ได้ใน ServiceLayer - Business logic tracing
  createBusinessSpan(operation: string, context?: Record<string, unknown>): UnifiedTelemetrySpan {
    return this.provider.tracer.startSpan(`business.${operation}`, {
      attributes: context,
    });
  }

  // ✅ ใช้ได้ใน CoreLayer - Utility operations
  createUtilitySpan(operation: string): UnifiedTelemetrySpan {
    return this.provider.tracer.startSpan(`utility.${operation}`);
  }

  recordException(span: UnifiedTelemetrySpan, error: Error): void {
    span.recordException(error);
    span.setStatus({ code: UnifiedSpanStatusCode.ERROR, message: error.message });
  }

  recordDatabaseMetrics(operation: string, duration: number, table: string): void {
    const histogram = this.provider.metrics.createHistogram(
      'database_operation_duration_ms',
      'Database operation duration'
    );
    histogram.record(duration, { operation, table });
  }

  recordBusinessMetrics(operation: string, result: 'success' | 'failure'): void {
    const counter = this.provider.metrics.createCounter(
      'business_operations_total',
      'Total business operations'
    );
    counter.add(1, { operation, result });
  }
}

// =============================================================================
// 2. @inh-lib/unified-telemetry-http - HTTP-specific features
// =============================================================================

// package.json
{
  "name": "@inh-lib/unified-telemetry-http",
  "description": "HTTP middleware and web framework telemetry",
  "dependencies": {
    "@inh-lib/unified-telemetry-core": "^1.0.0",
    "@inh-lib/unified-route": "^1.0.0"
  }
}

// middleware/unified-http-telemetry-middleware.ts
import { UnifiedCoreTelemtryService } from '@inh-lib/unified-telemetry-core';
import { UnifiedMiddleware } from '@inh-lib/unified-route';

export class UnifiedHttpTelemetryMiddleware {
  constructor(
    private coreService: UnifiedCoreTelemtryService,
    private options: UnifiedHttpTelemetryOptions = {}
  ) {}

  createMiddleware(): UnifiedMiddleware {
    return async (context, next) => {
      // HTTP-specific telemetry logic
      const httpSpan = this.coreService.provider.tracer.startSpan(
        `http.${context.request.method} ${context.request.url}`,
        {
          kind: UnifiedSpanKind.SERVER,
          attributes: {
            'http.method': context.request.method,
            'http.url': context.request.url,
          },
        }
      );

      // Extend context with HTTP telemetry
      const contextWithTelemetry = context as UnifiedHttpContextWithTelemetry;
      contextWithTelemetry.telemetry = {
        span: httpSpan,
        logger: this.coreService.provider.logger,
        metrics: this.coreService.provider.metrics,
        coreService: this.coreService, // ให้ access ถึง core service
      };

      try {
        await next();
        httpSpan.setStatus({ code: UnifiedSpanStatusCode.OK });
      } catch (error) {
        this.coreService.recordException(httpSpan, error as Error);
        throw error;
      } finally {
        httpSpan.finish();
      }
    };
  }
}

// services/unified-http-telemetry-service.ts
export class UnifiedHttpTelemetryService extends UnifiedCoreTelemtryService {
  // HTTP-specific methods
  extractRequestTelemetryData(context: UnifiedHttpContext): UnifiedRequestTelemetryData {
    // HTTP-specific extraction logic
  }

  recordHttpMetrics(method: string, statusCode: number, duration: number): void {
    const counter = this.provider.metrics.createCounter(
      'http_requests_total',
      'Total HTTP requests'
    );
    counter.add(1, { method, status_code: statusCode.toString() });

    const histogram = this.provider.metrics.createHistogram(
      'http_request_duration_ms',
      'HTTP request duration'
    );
    histogram.record(duration, { method });
  }
}

// =============================================================================
// 3. @inh-lib/unified-telemetry-providers - Provider implementations
// =============================================================================

// package.json
{
  "name": "@inh-lib/unified-telemetry-providers",
  "description": "Telemetry provider implementations (OpenTelemetry, etc.)",
  "dependencies": {
    "@inh-lib/unified-telemetry-core": "^1.0.0"
  },
  "optionalDependencies": {
    "@opentelemetry/api": "^1.7.0",
    "@opentelemetry/sdk-node": "^0.45.0"
  }
}

// providers/opentelemetry-provider.ts
import { 
  UnifiedTelemetryProvider,
  UnifiedTelemetryConfig 
} from '@inh-lib/unified-telemetry-core';

export class UnifiedOpenTelemetryProvider implements UnifiedTelemetryProvider {
  // OpenTelemetry implementation
  static async create(config: UnifiedTelemetryConfig): Promise<UnifiedOpenTelemetryProvider> {
    // Implementation
  }
}

// providers/console-provider.ts - For development
export class UnifiedConsoleTelemetryProvider implements UnifiedTelemetryProvider {
  // Console-based implementation for development/testing
}

// providers/noop-provider.ts - For disabled telemetry
export class UnifiedNoOpTelemetryProvider implements UnifiedTelemetryProvider {
  // No-op implementation for when telemetry is disabled
}

// =============================================================================
// USAGE EXAMPLES IN DIFFERENT LAYERS
// =============================================================================

// ✅ DataLayer - Clean, no HTTP dependencies
// data-layer/repositories/user-repository.ts
import { 
  UnifiedCoreTelemtryService,
  UnifiedTelemetrySpan 
} from '@inh-lib/unified-telemetry-core';

export class UserRepository {
  constructor(private telemetry: UnifiedCoreTelemtryService) {}

  async findById(id: string): Promise<User | null> {
    const span = this.telemetry.createDatabaseSpan('findById', 'users');
    span.setTag('user.id', id);

    try {
      const startTime = Date.now();
      const user = await this.database.findUserById(id);
      const duration = Date.now() - startTime;

      this.telemetry.recordDatabaseMetrics('findById', duration, 'users');
      span.setTag('user.found', !!user);

      return user;
    } catch (error) {
      this.telemetry.recordException(span, error as Error);
      throw error;
    } finally {
      span.finish();
    }
  }
}

// ✅ ServiceLayer - Business logic telemetry
// service-layer/commands/create-user-command.ts
import { UnifiedCoreTelemtryService } from '@inh-lib/unified-telemetry-core';

export class CreateUserCommandHandler {
  constructor(
    private telemetry: UnifiedCoreTelemtryService,
    private userRepository: UserRepository
  ) {}

  async handle(command: CreateUserCommand): Promise<User> {
    const span = this.telemetry.createBusinessSpan('create_user', {
      'command.user_email': command.email,
      'command.user_role': command.role,
    });

    try {
      // Business logic with telemetry
      span.addEvent('validation.started');
      this.validateCommand(command);
      span.addEvent('validation.completed');

      span.addEvent('user.creation.started');
      const user = await this.userRepository.create(command);
      span.addEvent('user.creation.completed');

      this.telemetry.recordBusinessMetrics('create_user', 'success');
      return user;
    } catch (error) {
      this.telemetry.recordBusinessMetrics('create_user', 'failure');
      this.telemetry.recordException(span, error as Error);
      throw error;
    } finally {
      span.finish();
    }
  }
}

// ✅ CoreLayer - Utility telemetry
// core-layer/utils/encryption-util.ts
import { UnifiedCoreTelemtryService } from '@inh-lib/unified-telemetry-core';

export class EncryptionUtil {
  constructor(private telemetry: UnifiedCoreTelemtryService) {}

  async encryptData(data: string): Promise<string> {
    const span = this.telemetry.createUtilitySpan('encrypt_data');
    span.setTag('data.size', data.length);

    try {
      const startTime = Date.now();
      const encrypted = await this.performEncryption(data);
      const duration = Date.now() - startTime;

      // Record utility metrics
      const histogram = this.telemetry.provider.metrics.createHistogram(
        'encryption_duration_ms',
        'Data encryption duration'
      );
      histogram.record(duration, { operation: 'encrypt' });

      return encrypted;
    } catch (error) {
      this.telemetry.recordException(span, error as Error);
      throw error;
    } finally {
      span.finish();
    }
  }
}

// ✅ HTTP Layer - Web framework integration
// http-layer/routes/user-routes.ts
import { UnifiedHttpTelemetryService } from '@inh-lib/unified-telemetry-http';
import { UnifiedHttpTelemetryMiddleware } from '@inh-lib/unified-telemetry-http';

export class UserRoutes {
  constructor(
    private httpTelemetry: UnifiedHttpTelemetryService,
    private createUserHandler: CreateUserCommandHandler
  ) {}

  setupRoutes(): UnifiedRouteHandler[] {
    const middleware = new UnifiedHttpTelemetryMiddleware(this.httpTelemetry);
    const middlewareStack = composeMiddleware([middleware.createMiddleware()]);

    return [
      middlewareStack(async (context: UnifiedHttpContextWithTelemetry) => {
        // ✅ มี access ทั้ง HTTP telemetry และ core telemetry
        const { telemetry } = context;

        // HTTP-specific telemetry
        telemetry.span.addEvent('http.request.processing');

        // Business operation via core service
        const command = new CreateUserCommand(context.request.body);
        const user = await this.createUserHandler.handle(command);

        context.response.status(201).json({ user });
      }),
    ];
  }
}

// =============================================================================
// DEPENDENCY INJECTION SETUP
// =============================================================================

// setup/telemetry-setup.ts
import { UnifiedCoreTelemtryService } from '@inh-lib/unified-telemetry-core';
import { UnifiedHttpTelemetryService } from '@inh-lib/unified-telemetry-http';
import { UnifiedOpenTelemetryProvider } from '@inh-lib/unified-telemetry-providers';

export class TelemetryContainer {
  private coreService: UnifiedCoreTelemtryService;
  private httpService: UnifiedHttpTelemetryService;

  async initialize(config: UnifiedTelemetryConfig): Promise<void> {
    // 1. Create provider
    const provider = await UnifiedOpenTelemetryProvider.create(config);

    // 2. Create core service (ใช้ได้ทุก layer)
    this.coreService = new UnifiedCoreTelemtryService(provider, config);

    // 3. Create HTTP service (ใช้เฉพาะ HTTP layer)
    this.httpService = new UnifiedHttpTelemetryService(provider, config);
  }

  // ✅ DataLayer และ ServiceLayer ใช้ core service
  getCoreService(): UnifiedCoreTelemtryService {
    return this.coreService;
  }

  // ✅ HTTP Layer ใช้ HTTP service  
  getHttpService(): UnifiedHttpTelemetryService {
    return this.httpService;
  }
}

// usage-example.ts
const telemetryContainer = new TelemetryContainer();
await telemetryContainer.initialize(config);

// ✅ Clean separation - แต่ละ layer ได้แค่สิ่งที่ต้องการ
const userRepository = new UserRepository(telemetryContainer.getCoreService());
const createUserHandler = new CreateUserCommandHandler(
  telemetryContainer.getCoreService(),
  userRepository
);
const userRoutes = new UserRoutes(
  telemetryContainer.getHttpService(),
  createUserHandler
);

// =============================================================================
// PACKAGE DEPENDENCIES OVERVIEW
// =============================================================================

/**
 * DataLayer packages:
 * ✅ @inh-lib/unified-telemetry-core ← Clean, no HTTP deps
 * ✅ @inh-lib/unified-telemetry-providers ← Provider implementations
 * ❌ @inh-lib/unified-telemetry-http ← ไม่ต้องใช้
 * 
 * ServiceLayer packages:
 * ✅ @inh-lib/unified-telemetry-core ← Business logic telemetry
 * ✅ @inh-lib/unified-telemetry-providers ← Provider implementations  
 * ❌ @inh-lib/unified-telemetry-http ← ไม่ต้องใช้
 * 
 * CoreLayer packages:
 * ✅ @inh-lib/unified-telemetry-core ← Utility telemetry
 * ✅ @inh-lib/unified-telemetry-providers ← Provider implementations
 * ❌ @inh-lib/unified-telemetry-http ← ไม่ต้องใช้
 * 
 * HTTP Layer packages:
 * ✅ @inh-lib/unified-telemetry-core ← Base functionality
 * ✅ @inh-lib/unified-telemetry-http ← HTTP middleware & services
 * ✅ @inh-lib/unified-telemetry-providers ← Provider implementations
 */