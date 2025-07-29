// =============================================================================
// 📦 COMPLETE PACKAGE ARCHITECTURE OVERVIEW
// =============================================================================

/**
 * แบ่งออกเป็น 3 packages หลัก + Logger Strategy ทั้งหมด
 */

// =============================================================================
// 📦 1. @inh-lib/unified-telemetry-core 
// =============================================================================
// 🎯 PURPOSE: Base abstractions สำหรับทุก layer (ไม่มี HTTP dependencies)
// 🔧 ใช้ใน: DataLayer, ServiceLayer, CoreLayer, HTTP Layer

/**
 * package.json
 */
{
  "name": "@inh-lib/unified-telemetry-core",
  "version": "1.0.0",
  "description": "Core telemetry abstractions - framework and layer agnostic",
  "main": "dist/index.js",
  "dependencies": {
    // ไม่มี HTTP หรือ framework dependencies
    "tslib": "^2.6.0"
  }
}

/**
 * 📁 CORE PACKAGE STRUCTURE
 * src/
 * ├── types/
 * │   ├── core-telemetry.ts          ← Base interfaces
 * │   ├── logger-context.ts          ← Logger context types  
 * │   └── telemetry-config.ts        ← Configuration
 * ├── services/
 * │   ├── core-telemetry-service.ts  ← Main service
 * │   ├── context-logger.ts          ← ✅ CONTEXT-AWARE LOGGER
 * │   ├── logger-factory.ts          ← ✅ LOGGER FACTORY
 * │   └── context-propagation.ts     ← Context management
 * ├── providers/
 * │   └── provider-interfaces.ts     ← Provider abstractions
 * └── index.ts                       ← Public exports
 */

// ================= TYPES =================

// types/core-telemetry.ts
export interface UnifiedTelemetryTracer {
  startSpan(name: string, options?: UnifiedSpanOptions): UnifiedTelemetrySpan;
  getActiveSpan(): UnifiedTelemetrySpan | undefined;
}

export interface UnifiedTelemetrySpan {
  setTag(key: string, value: string | number | boolean): UnifiedTelemetrySpan;
  setStatus(status: UnifiedSpanStatus): UnifiedTelemetrySpan;
  recordException(exception: Error): UnifiedTelemetrySpan;
  addEvent(name: string, attributes?: Record<string, string | number | boolean>): UnifiedTelemetrySpan;
  finish(): void;
}

export interface UnifiedBaseTelemetryLogger {
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
  baseLogger: UnifiedBaseTelemetryLogger;  // ✅ Base logger (ไม่มี context)
  metrics: UnifiedTelemetryMetrics;
  shutdown(): Promise<void>;
}

// types/logger-context.ts
export interface UnifiedLoggerContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  operationType: 'http' | 'business' | 'database' | 'utility';
  operationName: string;
  layer: 'http' | 'service' | 'data' | 'core';
  attributes: Record<string, string | number | boolean>;
  startTime: Date;
}

export interface UnifiedContextLogger {
  debug(message: string, attributes?: Record<string, unknown>): void;
  info(message: string, attributes?: Record<string, unknown>): void;
  warn(message: string, attributes?: Record<string, unknown>): void;
  error(message: string, error?: Error, attributes?: Record<string, unknown>): void;
  
  // Context management
  createChildContext(operationName: string): UnifiedLoggerContext;
  createChildLogger(childContext: UnifiedLoggerContext): UnifiedContextLogger;
}

// ================= SERVICES =================

// services/core-telemetry-service.ts
export class UnifiedCoreTelemetryService {
  constructor(
    private provider: UnifiedTelemetryProvider,
    private config: UnifiedTelemetryConfig
  ) {}

  // ✅ Layer-agnostic operations
  createSpan(operationType: string, operationName: string): UnifiedTelemetrySpan {
    return this.provider.tracer.startSpan(`${operationType}.${operationName}`);
  }

  recordMetric(metricName: string, value: number, labels: Record<string, string>): void {
    const counter = this.provider.metrics.createCounter(metricName);
    counter.add(value, labels);
  }

  // ✅ ใช้ได้ใน DataLayer
  createDatabaseSpan(operation: string, table: string): UnifiedTelemetrySpan {
    return this.createSpan('database', `${operation}_${table}`);
  }

  // ✅ ใช้ได้ใน ServiceLayer  
  createBusinessSpan(operation: string): UnifiedTelemetrySpan {
    return this.createSpan('business', operation);
  }

  // ✅ ใช้ได้ใน CoreLayer
  createUtilitySpan(operation: string): UnifiedTelemetrySpan {
    return this.createSpan('utility', operation);
  }
}

// ✅ services/context-logger.ts - MAIN LOGGER IMPLEMENTATION
export class UnifiedContextLogger implements UnifiedContextLogger {
  constructor(
    private baseLogger: UnifiedBaseTelemetryLogger,
    private context: UnifiedLoggerContext
  ) {}

  debug(message: string, attributes?: Record<string, unknown>): void {
    this.baseLogger.debug(message, this.enrichAttributes(attributes));
  }

  info(message: string, attributes?: Record<string, unknown>): void {
    this.baseLogger.info(message, this.enrichAttributes(attributes));
  }

  warn(message: string, attributes?: Record<string, unknown>): void {
    this.baseLogger.warn(message, this.enrichAttributes(attributes));
  }

  error(message: string, error?: Error, attributes?: Record<string, unknown>): void {
    const errorAttrs = error ? {
      error: error.message,
      errorType: error.constructor.name,
      stack: error.stack,
    } : {};

    this.baseLogger.error(message, this.enrichAttributes({
      ...errorAttrs,
      ...attributes,
    }));
  }

  createChildContext(operationName: string): UnifiedLoggerContext {
    return {
      ...this.context,
      parentSpanId: this.context.spanId,
      spanId: this.generateSpanId(),
      operationName,
      startTime: new Date(),
    };
  }

  createChildLogger(childContext: UnifiedLoggerContext): UnifiedContextLogger {
    return new UnifiedContextLogger(this.baseLogger, childContext);
  }

  private enrichAttributes(attributes?: Record<string, unknown>): Record<string, unknown> {
    return {
      // Trace context
      traceId: this.context.traceId,
      spanId: this.context.spanId,
      parentSpanId: this.context.parentSpanId,
      
      // Operation context
      layer: this.context.layer,
      operationType: this.context.operationType,
      operationName: this.context.operationName,
      
      // Timing
      timestamp: new Date().toISOString(),
      operationDuration: Date.now() - this.context.startTime.getTime(),
      
      // Context attributes
      ...this.context.attributes,
      
      // Method attributes (highest priority)
      ...attributes,
    };
  }

  private generateSpanId(): string {
    return Math.random().toString(36).substr(2, 16);
  }
}

// ✅ services/logger-factory.ts - LOGGER FACTORY
export class UnifiedLoggerFactory {
  constructor(
    private telemetryService: UnifiedCoreTelemetryService,
    private provider: UnifiedTelemetryProvider
  ) {}

  // ✅ สำหรับ DataLayer
  createDataLogger(
    traceId: string,
    operation: string,
    table: string,
    additionalAttributes?: Record<string, string | number | boolean>
  ): UnifiedContextLogger {
    const context: UnifiedLoggerContext = {
      traceId,
      spanId: this.generateSpanId(),
      operationType: 'database',
      operationName: operation,
      layer: 'data',
      attributes: {
        'db.table': table,
        ...additionalAttributes,
      },
      startTime: new Date(),
    };

    return new UnifiedContextLogger(this.provider.baseLogger, context);
  }

  // ✅ สำหรับ ServiceLayer
  createServiceLogger(
    traceId: string,
    operation: string,
    entityType: string,
    additionalAttributes?: Record<string, string | number | boolean>
  ): UnifiedContextLogger {
    const context: UnifiedLoggerContext = {
      traceId,
      spanId: this.generateSpanId(),
      operationType: 'business',
      operationName: operation,
      layer: 'service',
      attributes: {
        'business.entity': entityType,
        ...additionalAttributes,
      },
      startTime: new Date(),
    };

    return new UnifiedContextLogger(this.provider.baseLogger, context);
  }

  // ✅ สำหรับ CoreLayer
  createCoreLogger(
    traceId: string,
    operation: string,
    utilityType: string,
    additionalAttributes?: Record<string, string | number | boolean>
  ): UnifiedContextLogger {
    const context: UnifiedLoggerContext = {
      traceId,
      spanId: this.generateSpanId(),
      operationType: 'utility',
      operationName: operation,
      layer: 'core',
      attributes: {
        'utility.type': utilityType,
        ...additionalAttributes,
      },
      startTime: new Date(),
    };

    return new UnifiedContextLogger(this.provider.baseLogger, context);
  }

  private generateSpanId(): string {
    return Math.random().toString(36).substr(2, 16);
  }
}

// ================= PUBLIC EXPORTS =================

// index.ts - CORE PACKAGE EXPORTS
export * from './types/core-telemetry';
export * from './types/logger-context'; 
export * from './types/telemetry-config';

export { UnifiedCoreTelemetryService } from './services/core-telemetry-service';
export { UnifiedContextLogger } from './services/context-logger';          // ✅ MAIN LOGGER
export { UnifiedLoggerFactory } from './services/logger-factory';          // ✅ LOGGER FACTORY

// =============================================================================
// 📦 2. @inh-lib/unified-telemetry-http
// =============================================================================
// 🎯 PURPOSE: HTTP middleware และ web framework integrations
// 🔧 ใช้ใน: HTTP Layer เท่านั้น

/**
 * package.json
 */
{
  "name": "@inh-lib/unified-telemetry-http", 
  "version": "1.0.0",
  "description": "HTTP middleware and web framework telemetry integration",
  "main": "dist/index.js",
  "dependencies": {
    "@inh-lib/unified-telemetry-core": "^1.0.0",  // ✅ ใช้ core package
    "@inh-lib/unified-route": "^1.0.0"
  }
}

/**
 * 📁 HTTP PACKAGE STRUCTURE
 * src/
 * ├── middleware/
 * │   ├── http-telemetry-middleware.ts    ← HTTP middleware
 * │   └── context-propagation-middleware.ts ← Context propagation
 * ├── services/
 * │   └── http-telemetry-service.ts       ← HTTP-specific service
 * ├── types/
 * │   └── http-telemetry.ts              ← HTTP-specific types
 * └── index.ts                           ← Public exports
 */

// middleware/http-telemetry-middleware.ts
import { 
  UnifiedCoreTelemetryService,
  UnifiedLoggerFactory,
  UnifiedContextLogger 
} from '@inh-lib/unified-telemetry-core';
import { UnifiedMiddleware, UnifiedHttpContext } from '@inh-lib/unified-route';

export class UnifiedHttpTelemetryMiddleware {
  constructor(
    private coreService: UnifiedCoreTelemetryService,
    private loggerFactory: UnifiedLoggerFactory
  ) {}

  createMiddleware(): UnifiedMiddleware {
    return async (context: UnifiedHttpContext, next) => {
      const traceId = this.extractTraceId(context);
      
      // ✅ สร้าง HTTP logger จาก factory
      const httpLogger = this.createHttpLogger(traceId, context);
      
      // ✅ Extend context with telemetry
      const contextWithTelemetry = context as UnifiedHttpContextWithTelemetry;
      contextWithTelemetry.telemetry = {
        traceId,
        logger: httpLogger,
        coreService: this.coreService,
        loggerFactory: this.loggerFactory,
      };

      httpLogger.info('HTTP request started', {
        method: context.request.method,
        url: context.request.url,
        userAgent: context.request.userAgent,
        ip: context.request.ip,
      });

      try {
        await next();
        httpLogger.info('HTTP request completed');
      } catch (error) {
        httpLogger.error('HTTP request failed', error as Error);
        throw error;
      }
    };
  }

  private createHttpLogger(traceId: string, context: UnifiedHttpContext): UnifiedContextLogger {
    // ✅ ใช้ logger factory จาก core
    return this.loggerFactory.createServiceLogger(  // HTTP ก็คือ service layer ระดับหนึ่ง
      traceId,
      `${context.request.method}_${context.request.url}`,
      'HttpRequest',
      {
        'http.method': context.request.method,
        'http.url': context.request.url,
        'http.user_agent': context.request.userAgent || '',
      }
    );
  }

  private extractTraceId(context: UnifiedHttpContext): string {
    return context.request.headers['x-trace-id'] || 
           context.request.headers['traceparent']?.split('-')[1] ||
           this.generateTraceId();
  }

  private generateTraceId(): string {
    return Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  }
}

// types/http-telemetry.ts
export interface UnifiedHttpContextWithTelemetry extends UnifiedHttpContext {
  telemetry: {
    traceId: string;
    logger: UnifiedContextLogger;                    // ✅ HTTP logger
    coreService: UnifiedCoreTelemetryService;        // ✅ Core service access
    loggerFactory: UnifiedLoggerFactory;             // ✅ Factory สำหรับ downstream layers
  };
}

// index.ts - HTTP PACKAGE EXPORTS  
export { UnifiedHttpTelemetryMiddleware } from './middleware/http-telemetry-middleware';
export * from './types/http-telemetry';

// =============================================================================
// 📦 3. @inh-lib/unified-telemetry-providers
// =============================================================================
// 🎯 PURPOSE: Provider implementations (OpenTelemetry, Console, NoOp)
// 🔧 ใช้ใน: Application setup เท่านั้น

/**
 * package.json
 */
{
  "name": "@inh-lib/unified-telemetry-providers",
  "version": "1.0.0", 
  "description": "Telemetry provider implementations",
  "main": "dist/index.js",
  "dependencies": {
    "@inh-lib/unified-telemetry-core": "^1.0.0"
  },
  "optionalDependencies": {
    "@opentelemetry/api": "^1.7.0",
    "@opentelemetry/sdk-node": "^0.45.0"
  }
}

/**
 * 📁 PROVIDERS PACKAGE STRUCTURE  
 * src/
 * ├── opentelemetry/
 * │   └── opentelemetry-provider.ts       ← OpenTelemetry implementation
 * ├── console/
 * │   └── console-provider.ts             ← Console logger implementation  
 * ├── noop/
 * │   └── noop-provider.ts                ← No-op implementation
 * └── index.ts                            ← Public exports
 */

// opentelemetry/opentelemetry-provider.ts
import { UnifiedTelemetryProvider } from '@inh-lib/unified-telemetry-core';

export class UnifiedOpenTelemetryProvider implements UnifiedTelemetryProvider {
  // OpenTelemetry implementation
}

// console/console-provider.ts  
export class UnifiedConsoleProvider implements UnifiedTelemetryProvider {
  // Console-based implementation สำหรับ development
}

// index.ts - PROVIDERS PACKAGE EXPORTS
export { UnifiedOpenTelemetryProvider } from './opentelemetry/opentelemetry-provider';
export { UnifiedConsoleProvider } from './console/console-provider';

// =============================================================================
// 🏗️ USAGE IN DIFFERENT LAYERS
// =============================================================================

// ================= DATA LAYER USAGE =================

// DataLayer - user-repository.ts
import { 
  UnifiedCoreTelemetryService,
  UnifiedLoggerFactory,
  UnifiedContextLogger 
} from '@inh-lib/unified-telemetry-core';

export class UserRepository {
  constructor(
    private coreService: UnifiedCoreTelemetryService,
    private loggerFactory: UnifiedLoggerFactory
  ) {}

  async findById(traceId: string, userId: string): Promise<User | null> {
    // ✅ สร้าง data layer logger
    const logger = this.loggerFactory.createDataLogger(
      traceId, 
      'findById', 
      'users',
      { 'user.id': userId }
    );

    logger.info('Starting user lookup', { userId });

    try {
      const user = await this.performDatabaseQuery(userId);
      
      if (user) {
        logger.info('User found successfully', { 
          userId, 
          userEmail: user.email 
        });
      } else {
        logger.warn('User not found', { userId });
      }

      return user;
    } catch (error) {
      logger.error('Database query failed', error as Error, { userId });
      throw error;
    }
  }

  async create(traceId: string, userData: CreateUserData): Promise<User> {
    // ✅ สร้าง data layer logger
    const logger = this.loggerFactory.createDataLogger(
      traceId,
      'create', 
      'users',
      { 'user.email': userData.email }
    );

    logger.info('Starting user creation', { email: userData.email });

    try {
      // ✅ สร้าง child logger สำหรับ validation
      const validationContext = logger.createChildContext('validateUserData');
      const validationLogger = logger.createChildLogger(validationContext);
      
      validationLogger.debug('Validating user data');
      await this.validateUserData(userData);
      validationLogger.info('User data validation completed');

      // ✅ สร้าง child logger สำหรับ insertion  
      const insertContext = logger.createChildContext('insertUser');
      const insertLogger = logger.createChildLogger(insertContext);
      
      insertLogger.debug('Inserting user into database');
      const user = await this.insertUser(userData);
      insertLogger.info('User inserted successfully', { userId: user.id });

      logger.info('User creation completed', { userId: user.id });
      return user;
    } catch (error) {
      logger.error('User creation failed', error as Error);
      throw error;
    }
  }

  private async performDatabaseQuery(userId: string): Promise<User | null> {
    // Database logic
    return null;
  }

  private async validateUserData(userData: CreateUserData): Promise<void> {
    // Validation logic
  }

  private async insertUser(userData: CreateUserData): Promise<User> {
    // Insert logic
    return { id: '123', ...userData };
  }
}

// ================= SERVICE LAYER USAGE =================

// ServiceLayer - create-user-command-handler.ts
import { 
  UnifiedCoreTelemetryService,
  UnifiedLoggerFactory,
  UnifiedContextLogger 
} from '@inh-lib/unified-telemetry-core';

export class CreateUserCommandHandler {
  constructor(
    private userRepository: UserRepository,
    private coreService: UnifiedCoreTelemetryService,
    private loggerFactory: UnifiedLoggerFactory
  ) {}

  async handle(traceId: string, command: CreateUserCommand): Promise<User> {
    // ✅ สร้าง service layer logger
    const logger = this.loggerFactory.createServiceLogger(
      traceId,
      'createUser',
      'User',
      { 
        'command.type': 'CreateUserCommand',
        'user.email': command.email 
      }
    );

    logger.info('Processing create user command', { 
      email: command.email 
    });

    try {
      // Business validation
      const validationContext = logger.createChildContext('validateCommand');
      const validationLogger = logger.createChildLogger(validationContext);
      
      validationLogger.debug('Starting command validation');
      await this.validateCommand(validationLogger, command);
      validationLogger.info('Command validation completed');

      // ✅ เรียก repository โดยส่ง traceId เดียวกัน
      logger.debug('Delegating to repository layer');
      const user = await this.userRepository.create(traceId, {
        email: command.email,
        name: command.name,
        role: command.role
      });

      logger.info('User creation completed successfully', { 
        userId: user.id 
      });

      return user;
    } catch (error) {
      logger.error('Create user command failed', error as Error);
      throw error;
    }
  }

  private async validateCommand(logger: UnifiedContextLogger, command: CreateUserCommand): Promise<void> {
    logger.debug('Validating email format');
    if (!command.email.includes('@')) {
      logger.warn('Invalid email format', { email: command.email });
      throw new Error('Invalid email');
    }
    logger.debug('Command validation successful');
  }
}

// ================= CORE LAYER USAGE =================

// CoreLayer - encryption-util.ts
import { 
  UnifiedCoreTelemetryService,
  UnifiedLoggerFactory 
} from '@inh-lib/unified-telemetry-core';

export class EncryptionUtil {
  constructor(
    private coreService: UnifiedCoreTelemetryService,
    private loggerFactory: UnifiedLoggerFactory
  ) {}

  async encryptPassword(traceId: string, password: string): Promise<string> {
    // ✅ สร้าง core layer logger
    const logger = this.loggerFactory.createCoreLogger(
      traceId,
      'encryptPassword',
      'security',
      { 'password.length': password.length }
    );

    logger.info('Starting password encryption');

    try {
      logger.debug('Generating salt');
      const salt = await this.generateSalt();
      
      logger.debug('Performing encryption');
      const encrypted = await this.performEncryption(password, salt);

      logger.info('Password encryption completed successfully');
      return encrypted;
    } catch (error) {
      logger.error('Password encryption failed', error as Error);
      throw error;
    }
  }

  private async generateSalt(): Promise<string> {
    return 'salt_' + Math.random();
  }

  private async performEncryption(password: string, salt: string): Promise<string> {
    return `encrypted_${password}_${salt}`;
  }
}

// ================= HTTP LAYER USAGE =================

// HTTP Layer - user-routes.ts
import { UnifiedHttpTelemetryMiddleware } from '@inh-lib/unified-telemetry-http';
import { composeMiddleware } from '@inh-lib/unified-route';

export class UserRoutes {
  constructor(
    private createUserHandler: CreateUserCommandHandler,
    private httpMiddleware: UnifiedHttpTelemetryMiddleware
  ) {}

  setupRoutes() {
    const middlewareStack = composeMiddleware([
      this.httpMiddleware.createMiddleware()
    ]);

    return middlewareStack(async (context: UnifiedHttpContextWithTelemetry) => {
      // ✅ มี telemetry context พร้อมใช้
      const { telemetry } = context;
      
      telemetry.logger.info('Processing create user endpoint');

      try {
        const command = new CreateUserCommand(context.request.body);
        
        // ✅ ส่ง traceId ไป service layer
        const user = await this.createUserHandler.handle(
          telemetry.traceId, 
          command
        );

        telemetry.logger.info('User created successfully via HTTP', { 
          userId: user.id 
        });

        context.response.status(201).json({
          success: true,
          data: user,
          meta: { traceId: telemetry.traceId }
        });

      } catch (error) {
        telemetry.logger.error('HTTP endpoint failed', error as Error);
        
        context.response.status(500).json({
          success: false,
          error: 'Internal server error',
          meta: { traceId: telemetry.traceId }
        });
      }
    });
  }
}

// =============================================================================
// 🎯 COMPLETE SETUP EXAMPLE
// =============================================================================

// setup/application-setup.ts
import { 
  UnifiedCoreTelemetryService,
  UnifiedLoggerFactory,
  UnifiedTelemetryConfig 
} from '@inh-lib/unified-telemetry-core';
import { UnifiedHttpTelemetryMiddleware } from '@inh-lib/unified-telemetry-http';
import { UnifiedOpenTelemetryProvider } from '@inh-lib/unified-telemetry-providers';

export class ApplicationSetup {
  private coreService: UnifiedCoreTelemetryService;
  private loggerFactory: UnifiedLoggerFactory;
  private httpMiddleware: UnifiedHttpTelemetryMiddleware;

  async initialize(): Promise<void> {
    const config: UnifiedTelemetryConfig = {
      serviceName: 'user-management-api',
      serviceVersion: '1.0.0',
      environment: 'production',
    };

    // 1. ✅ สร้าง Provider
    const provider = await UnifiedOpenTelemetryProvider.create(config);

    // 2. ✅ สร้าง Core Service (ใช้ได้ทุก layer)
    this.coreService = new UnifiedCoreTelemetryService(provider, config);

    // 3. ✅ สร้าง Logger Factory (ใช้ได้ทุก layer)
    this.loggerFactory = new UnifiedLoggerFactory(this.coreService, provider);

    // 4. ✅ สร้าง HTTP Middleware (HTTP layer เท่านั้น)
    this.httpMiddleware = new UnifiedHttpTelemetryMiddleware(
      this.coreService,
      this.loggerFactory
    );
  }

  // ✅ Factory methods สำหรับแต่ละ layer
  createDataLayerServices() {
    return {
      userRepository: new UserRepository(this.coreService, this.loggerFactory),
    };
  }

  createServiceLayerServices(dataServices: any) {
    return {
      createUserHandler: new CreateUserCommandHandler(
        dataServices.userRepository,
        this.coreService,
        this.loggerFactory
      ),
    };
  }

  createCoreLayerServices() {
    return {
      encryptionUtil: new EncryptionUtil(this.coreService, this.loggerFactory),
    };
  }

  createHttpLayerServices() {
    return {
      httpMiddleware: this.httpMiddleware,
    };
  }
}

// =============================================================================
// 📊 PACKAGE DEPENDENCY SUMMARY
// =============================================================================

/**
 * 📦 PACKAGE DEPENDENCIES BY LAYER:
 * 
 * 🗂️ DataLayer packages:
 * ✅ @inh-lib/unified-telemetry-core        ← Logger + Core Service
 * ✅ @inh-lib/unified-telemetry-providers   ← Provider implementations
 * ❌ @inh-lib/unified-telemetry-http        ← ไม่ต้องใช้
 * 
 * 🗂️ ServiceLayer packages:  
 * ✅ @inh-lib/unified-telemetry-core        ← Logger + Core Service
 * ✅ @inh-lib/unified-telemetry-providers   ← Provider implementations
 * ❌ @inh-lib/unified-telemetry-http        ← ไม่ต้องใช้
 * 
 * 🗂️ CoreLayer packages:
 * ✅ @inh-lib/unified-telemetry-core        ← Logger + Core Service  
 * ✅ @inh-lib/unified-telemetry-providers   ← Provider implementations
 * ❌ @inh-lib/unified-telemetry-http        ← ไม่ต้องใช้
 * 
 * 🗂️ HTTP Layer packages:
 * ✅ @inh-lib/unified-telemetry-core        ← Logger + Core Service
 * ✅ @inh-lib/unified-telemetry-http        ← HTTP Middleware  
 * ✅ @inh-lib/unified-telemetry-providers   ← Provider implementations
 * 
 * 🎯 LOGGER LOCATION:
 * ✅ UnifiedContextLogger       → @inh-lib/unified-telemetry-core
 * ✅ UnifiedLoggerFactory      → @inh-lib/unified-telemetry-core  
 * ✅ Layer-specific loggers    → สร้างจาก LoggerFactory ใน core package
 */

// Types
interface CreateUserData {
  email: string;
  name: string; 
  role: string;
}

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

class CreateUserCommand {
  constructor(public readonly data: CreateUserData) {}
  get email() { return this.data.email; }
  get name() { return this.data.name; }
  get role() { return this.data.role; }
}