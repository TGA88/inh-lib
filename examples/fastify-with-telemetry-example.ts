/**
 * ตัวอย่างการใช้งาน Fastify ร่วมกับ Unified Telemetry และ Unified Route
 * 
 * Example: Using Fastify with UnifiedMiddleware, UnifiedRoute, and TelemetryMiddlewareService
 * 
 * Environment Variables:
 * - CUSTOM_OTEL_CONFIG_ENABLED: Set to 'true' to use OtelConfig initialization (custom variable)
 * - ENABLE_TELEMETRY: Set to 'false' to disable telemetry (default: true)
 * - PORT: Server port (default: 3000)
 * - Other OpenTelemetry standard variables (see otel-config.ts)
 */

import Fastify, { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { initializeOtel, type OtelConfig } from './otel-config';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { Resource } from '@opentelemetry/resources';
import { 
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION
} from '@opentelemetry/semantic-conventions';

// Deployment environment constant (using string directly to avoid deprecated SEMRESATTRS_*)
const DEPLOYMENT_ENVIRONMENT = 'deployment.environment';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';

// Unified packages
import type { 
  UnifiedHttpContext, 
  UnifiedMiddleware, 
  UnifiedRouteHandler 
} from '@inh-lib/unified-route';
import { 
  createFastifyContext 
} from '@inh-lib/api-util-fastify';
import { 
  TelemetryMiddlewareService,
  type TelemetryMiddlewareConfig 
} from '@inh-lib/unified-telemetry-middleware';
import { 
  OtelProviderService 
} from '@inh-lib/unified-telemetry-otel';
import type { 
  UnifiedTelemetryProvider 
} from '@inh-lib/unified-telemetry-core';

/**
 * Configuration for the example application
 */
interface AppConfig {
  serviceName: string;
  serviceVersion: string;
  port: number;
  enableTelemetry: boolean;
  useCustomOtelConfig: boolean; // ใหม่: ควบคุมการใช้ OtelConfig
}

/**
 * User data type for type safety
 */
interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

/**
 * Request body types
 */
interface CreateUserRequest {
  name: string;
  email: string;
}

interface UpdateUserRequest {
  name?: string;
  email?: string;
}

/**
 * Response types
 */
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    requestId: string;
    timestamp: string;
  };
}

/**
 * Simple in-memory user store with telemetry support
 */
class UserStore {
  private readonly users: Map<string, User> = new Map();
  private nextId = 1;

  constructor(private readonly telemetryService?: TelemetryMiddlewareService) {}

  async create(userData: CreateUserRequest, context?: UnifiedHttpContext): Promise<User> {
    if (!this.telemetryService || !context) {
      // Fallback without telemetry
      return this.createWithoutTelemetry(userData);
    }

    const { span, logger, finish } = this.telemetryService.createChildSpan(
      context,
      'db.user.create',
      {
        operationType: 'database',
        layer: 'data',
        attributes: {
          'db.operation': 'create',
          'db.table': 'users',
          'user.name': userData.name,
          'user.email': userData.email,
        },
      }
    );

    try {
      logger.info('Creating new user in database', { 
        userName: userData.name, 
        userEmail: userData.email 
      });

      // Simulate database latency
      await new Promise(resolve => setTimeout(resolve, Math.random() * 10));

      const user: User = {
        id: String(this.nextId++),
        name: userData.name,
        email: userData.email,
        createdAt: new Date().toISOString(),
      };

      this.users.set(user.id, user);

      span.setTag('user.id', user.id);
      span.setTag('user.created', true);
      span.setTag('db.rows_affected', 1);
      logger.info('User created successfully in database', { 
        userId: user.id,
        userName: user.name 
      });

      return user;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      span.recordException(err);
      span.setStatus({ code: 'error', message: err.message });
      logger.error('Failed to create user in database', err);
      throw error;
    } finally {
      finish();
    }
  }

  async findById(id: string, context?: UnifiedHttpContext): Promise<User | null> {
    if (!this.telemetryService || !context) {
      // Fallback without telemetry
      return this.findByIdWithoutTelemetry(id);
    }

    const { span, logger, finish } = this.telemetryService.createChildSpan(
      context,
      'db.user.findById',
      {
        operationType: 'database',
        layer: 'data',
        attributes: {
          'db.operation': 'findById',
          'db.table': 'users',
          'user.id': id,
        },
      }
    );

    try {
      logger.info('Finding user by ID in database', { userId: id });

      // Simulate database latency
      await new Promise(resolve => setTimeout(resolve, Math.random() * 5));

      const user = this.users.get(id) || null;

      span.setTag('user.found', !!user);
      span.setTag('db.rows_returned', user ? 1 : 0);
      
      if (user) {
        span.setTag('user.name', user.name);
        logger.info('User found in database', { 
          userId: id, 
          userName: user.name 
        });
      } else {
        logger.warn('User not found in database', { userId: id });
      }

      return user;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      span.recordException(err);
      span.setStatus({ code: 'error', message: err.message });
      logger.error('Failed to find user in database', err, { userId: id });
      throw error;
    } finally {
      finish();
    }
  }

  async findAll(context?: UnifiedHttpContext): Promise<User[]> {
    if (!this.telemetryService || !context) {
      // Fallback without telemetry
      return this.findAllWithoutTelemetry();
    }

    const { span, logger, finish } = this.telemetryService.createChildSpan(
      context,
      'db.user.findAll',
      {
        operationType: 'database',
        layer: 'data',
        attributes: {
          'db.operation': 'findAll',
          'db.table': 'users',
        },
      }
    );

    try {
      logger.info('Fetching all users from database');

      // Simulate database latency
      await new Promise(resolve => setTimeout(resolve, Math.random() * 15));

      const users = Array.from(this.users.values());

      span.setTag('users.count', users.length);
      span.setTag('db.rows_returned', users.length);
      span.setTag('db.query_type', 'findAll');
      logger.info('Successfully fetched all users from database', { 
        count: users.length 
      });

      return users;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      span.recordException(err);
      span.setStatus({ code: 'error', message: err.message });
      logger.error('Failed to fetch users from database', err);
      throw error;
    } finally {
      finish();
    }
  }

  async update(id: string, userData: UpdateUserRequest, context?: UnifiedHttpContext): Promise<User | null> {
    if (!this.telemetryService || !context) {
      // Fallback without telemetry
      return this.updateWithoutTelemetry(id, userData);
    }

    const { span, logger, finish } = this.telemetryService.createChildSpan(
      context,
      'db.user.update',
      {
        operationType: 'database',
        layer: 'data',
        attributes: {
          'db.operation': 'update',
          'db.table': 'users',
          'user.id': id,
          'user.update.name': userData.name || 'unchanged',
          'user.update.email': userData.email || 'unchanged',
        },
      }
    );

    try {
      logger.info('Updating user in database', { 
        userId: id, 
        updateData: userData 
      });

      // Simulate database latency
      await new Promise(resolve => setTimeout(resolve, Math.random() * 8));

      const existing = this.users.get(id);
      if (!existing) {
        span.setTag('user.found', false);
        span.setTag('db.rows_affected', 0);
        logger.warn('User not found for update in database', { userId: id });
        return null;
      }

      const updated: User = { ...existing, ...userData };
      this.users.set(id, updated);

      span.setTag('user.found', true);
      span.setTag('user.updated', true);
      span.setTag('db.rows_affected', 1);
      span.setTag('user.name', updated.name);
      logger.info('User updated successfully in database', { 
        userId: id,
        userName: updated.name,
        updatedFields: Object.keys(userData)
      });

      return updated;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      span?.recordException(err);
      span?.setStatus({ code: 'error', message: err.message });
      logger?.error('Failed to update user in database', err, { userId: id });
      throw error;
    } finally {
      finish();
    }
  }

  async delete(id: string, context?: UnifiedHttpContext): Promise<boolean> {
    if (!this.telemetryService || !context) {
      // Fallback without telemetry
      return this.deleteWithoutTelemetry(id);
    }

    const { span, logger, finish } = this.telemetryService.createChildSpan(
      context,
      'db.user.delete',
      {
        operationType: 'database',
        layer: 'data',
        attributes: {
          'db.operation': 'delete',
          'db.table': 'users',
          'user.id': id,
        },
      }
    );

    try {
      logger?.info('Deleting user from database', { userId: id });

      // Simulate database latency
      await new Promise(resolve => setTimeout(resolve, Math.random() * 6));

      const existed = this.users.has(id);
      const deleted = this.users.delete(id);

      span?.setTag('user.existed', existed);
      span?.setTag('user.deleted', deleted);
      span?.setTag('db.rows_affected', deleted ? 1 : 0);

      if (deleted) {
        logger?.info('User deleted successfully from database', { userId: id });
      } else {
        logger?.warn('User not found for deletion in database', { userId: id });
      }

      return deleted;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      span?.recordException(err);
      span?.setStatus({ code: 'error', message: err.message });
      logger?.error('Failed to delete user from database', err, { userId: id });
      throw error;
    } finally {
      finish();
    }
  }

  // Fallback methods without telemetry
  private async createWithoutTelemetry(userData: CreateUserRequest): Promise<User> {
    const user: User = {
      id: String(this.nextId++),
      name: userData.name,
      email: userData.email,
      createdAt: new Date().toISOString(),
    };
    this.users.set(user.id, user);
    return user;
  }

  private async findByIdWithoutTelemetry(id: string): Promise<User | null> {
    return this.users.get(id) || null;
  }

  private async findAllWithoutTelemetry(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  private async updateWithoutTelemetry(id: string, userData: UpdateUserRequest): Promise<User | null> {
    const existing = this.users.get(id);
    if (!existing) return null;

    const updated: User = { ...existing, ...userData };
    this.users.set(id, updated);
    return updated;
  }

  private async deleteWithoutTelemetry(id: string): Promise<boolean> {
    return this.users.delete(id);
  }
}

/**
 * Enhanced Fastify adapter with telemetry support
 */
class FastifyTelemetryAdapter {
  constructor(
    private readonly telemetryService: TelemetryMiddlewareService
  ) {}

  /**
   * Convert UnifiedMiddleware to Fastify hook
   */
  convertMiddleware(middleware: UnifiedMiddleware) {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      const context = createFastifyContext(request, reply);
      
      let nextCalled = false;
      const next = async () => {
        nextCalled = true;
      };

      await middleware(context, next);
      
      // If middleware didn't call next(), it handled the response
      return nextCalled;
    };
  }

  /**
   * Convert UnifiedRouteHandler to Fastify handler
   */
  convertHandler<TBody = Record<string, unknown>>(
    handler: UnifiedRouteHandler,
    middlewares: UnifiedMiddleware[] = []
  ) {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      const context = createFastifyContext<TBody>(request, reply);
      
      try {
        // Apply middlewares first
        for (const middleware of middlewares) {
          let nextCalled = false;
          const next = async () => {
            nextCalled = true;
          };

          await middleware(context, next);
          
          // If middleware didn't call next(), stop processing
          if (!nextCalled) {
            return;
          }
        }
        
        // Execute the main handler
        const result = await handler(context);
        
        // If handler returns data, send it
        if (result !== undefined) {
          return result;
        }
      } catch (error) {
        // Let Fastify handle the error
        const logger = this.telemetryService?.getCurrentLogger?.(context);
        if (logger) {
          const err = error instanceof Error ? error : new Error(String(error));
          logger.error('Handler execution failed', err);
        }
        throw error;
      }
    };
  }

  /**
   * Create business logic middleware for specific operations
   */
  createBusinessMiddleware(
    operationName: string,
    options?: {
      logStart?: boolean;
      logEnd?: boolean;
    }
  ): UnifiedMiddleware {
    return this.telemetryService.createBusinessLogicMiddleware(operationName, {
      operationType: 'business',
      layer: 'service',
      logStart: options?.logStart,
      logEnd: options?.logEnd,
    });
  }

  /**
   * Create validation middleware
   */
  createValidationMiddleware(validationName: string): UnifiedMiddleware {
    return this.telemetryService.createValidationMiddleware(validationName, {
      layer: 'service',
      logValidationDetails: true,
    });
  }
}

/**
 * Main application class
 */
class FastifyTelemetryApp {
  private fastify?: FastifyInstance;
  private telemetryProvider?: UnifiedTelemetryProvider;
  private telemetryService?: TelemetryMiddlewareService;
  private adapter?: FastifyTelemetryAdapter;
  private readonly userStore: UserStore;

  constructor(private readonly config: AppConfig) {
    this.userStore = new UserStore();
  }

  /**
   * Initialize the application
   */
  async initialize(): Promise<void> {
    this.createFastifyInstance();
    this.initializeTelemetry();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  /**
   * Create Fastify instance
   */
  private createFastifyInstance(): void {
    this.fastify = Fastify({ 
      logger: true,
      requestIdHeader: 'x-request-id',
      genReqId: () => `req-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
    });
  }

  /**
   * Initialize telemetry system
   */
  private initializeTelemetry(): void {
    if (!this.config.enableTelemetry) {
      // Use noop provider for development without telemetry
      console.log('🔕 Telemetry disabled');
      return;
    }

    // ตรวจสอบว่าจะใช้ Custom OtelConfig หรือไม่
    if (this.config.useCustomOtelConfig) {
      console.log('🔧 Using Custom OtelConfig configuration');
      
      // Initialize OpenTelemetry with environment-based configuration
      const sdk = initializeOtel({
        serviceName: this.config.serviceName,
        serviceVersion: this.config.serviceVersion,
        environment: process.env.NODE_ENV || 'development',
        enableConsoleExporter: process.env.OTEL_DEBUG === 'true',
      });

      // Create telemetry provider using OtelConfig
      this.telemetryProvider = OtelProviderService.createProviderWithConsole(
        {
          config: {
            serviceName: this.config.serviceName,
            serviceVersion: this.config.serviceVersion,
            environment: process.env.NODE_ENV || 'development',
          },
        },
        sdk
      );
    } else {
      console.log('🔧 Using basic telemetry configuration (without OtelConfig)');
      
      // Create basic NodeSDK for basic telemetry
      const basicSdk = new NodeSDK({
        resource: new Resource({
          [ATTR_SERVICE_NAME]: this.config.serviceName,
          [ATTR_SERVICE_VERSION]: this.config.serviceVersion,
          [DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development',
        }),
        instrumentations: [
          getNodeAutoInstrumentations({
            // Disable some instrumentations if not needed
            '@opentelemetry/instrumentation-fs': {
              enabled: false, // Usually too noisy
            },
            '@opentelemetry/instrumentation-dns': {
              enabled: false, // Usually too noisy
            },
            // Enable HTTP instrumentation for API calls
            '@opentelemetry/instrumentation-http': {
              enabled: true,
            },
            // Enable Fastify instrumentation
            '@opentelemetry/instrumentation-fastify': {
              enabled: true,
            }
          }),
        ],
      });
      
      // Initialize the basic SDK
      basicSdk.start();
      
      // Create console logger for basic telemetry
      const consoleLogger = {
        debug: (message: string, attributes?: Record<string, unknown>) => {
          console.debug(message, attributes);
        },
        info: (message: string, attributes?: Record<string, unknown>) => {
          console.info(message, attributes);
        },
        warn: (message: string, attributes?: Record<string, unknown>) => {
          console.warn(message, attributes);
        },
        error: (message: string, attributes?: Record<string, unknown>) => {
          console.error(message, attributes);
        },
      };
      
      // Create basic telemetry provider without OtelConfig
      this.telemetryProvider = OtelProviderService.createProvider(
        {
          config: {
            serviceName: this.config.serviceName,
            serviceVersion: this.config.serviceVersion,
            environment: process.env.NODE_ENV || 'development',
          },
        },
        consoleLogger,
        basicSdk
      );
    }

    // Create telemetry middleware service
    const telemetryConfig: TelemetryMiddlewareConfig = {
      serviceName: this.config.serviceName,
      serviceVersion: this.config.serviceVersion,
      enableMetrics: true,
      enableTracing: true,
      enableResourceTracking: true,
      enableCorrelationId: true,
      enableSystemMetrics: true,
      systemMetricsInterval: 5000,
    };

    this.telemetryService = new TelemetryMiddlewareService(
      this.telemetryProvider,
      telemetryConfig
    );

    this.adapter = new FastifyTelemetryAdapter(this.telemetryService);

    // Update UserStore with telemetry service
    (this.userStore as any).telemetryService = this.telemetryService;
  }

  /**
   * Setup API routes
   */
  private setupRoutes(): void {
    if (!this.fastify) {
      throw new Error('Fastify instance not initialized');
    }

    // Add global telemetry middleware
    this.fastify.addHook('onRequest', async (request, reply) => {
      if (!this.telemetryService || !this.adapter) return;
      
      const middleware = this.telemetryService.createMiddleware();
      const converted = this.adapter.convertMiddleware(middleware);
      await converted(request, reply);
    });

    // Health check endpoint
    this.fastify.get('/health', async () => {
      return { 
        status: 'healthy', 
        service: this.config.serviceName,
        version: this.config.serviceVersion,
        timestamp: new Date().toISOString(),
      };
    });

    // Add Prometheus metrics endpoint (if enabled)
    this.setupMetricsEndpoint();

    // Only setup telemetry-enabled routes if adapter is available
    if (this.adapter) {
      this.setupTelemetryRoutes();
    } else {
      this.setupBasicRoutes();
    }
  }

  /**
   * Setup routes with telemetry support
   */
  private setupTelemetryRoutes(): void {
    if (!this.adapter || !this.fastify) return;

    // Get all users
    this.fastify.get('/api/users', 
      this.adapter.convertHandler(this.getAllUsersHandler(), [
        this.adapter.createBusinessMiddleware('get-all-users'),
      ])
    );

    // Get user by ID
    this.fastify.get<{ Params: { id: string } }>('/api/users/:id', 
      this.adapter.convertHandler(this.getUserByIdHandler(), [
        this.adapter.createValidationMiddleware('validate-user-id'),
        this.adapter.createBusinessMiddleware('get-user-by-id'),
      ])
    );

    // Create user
    this.fastify.post<{ Body: CreateUserRequest }>('/api/users', 
      this.adapter.convertHandler(this.createUserHandler(), [
        this.adapter.createValidationMiddleware('validate-create-user'),
        this.adapter.createBusinessMiddleware('create-user'),
      ])
    );

    // Update user
    this.fastify.put<{ Params: { id: string }, Body: UpdateUserRequest }>('/api/users/:id', 
      this.adapter.convertHandler(this.updateUserHandler(), [
        this.adapter.createValidationMiddleware('validate-update-user'),
        this.adapter.createBusinessMiddleware('update-user'),
      ])
    );

    // Delete user
    this.fastify.delete<{ Params: { id: string } }>('/api/users/:id', 
      this.adapter.convertHandler(this.deleteUserHandler(), [
        this.adapter.createValidationMiddleware('validate-user-id'),
        this.adapter.createBusinessMiddleware('delete-user'),
      ])
    );
  }

  /**
   * Setup basic routes without telemetry (fallback)
   */
  private setupBasicRoutes(): void {
    if (!this.fastify) return;
    this.fastify.get('/api/users', async () => {
      const users = await this.userStore.findAll();
      return { success: true, data: users };
    });

    this.fastify.get<{ Params: { id: string } }>('/api/users/:id', async (request, reply) => {
      const user = await this.userStore.findById(request.params.id);
      if (!user) {
        return reply.status(404).send({ success: false, error: 'User not found' });
      }
      return { success: true, data: user };
    });

    this.fastify.post<{ Body: CreateUserRequest }>('/api/users', async (request, reply) => {
      const { name, email } = request.body;
      if (!name || !email) {
        return reply.status(400).send({ success: false, error: 'Name and email are required' });
      }
      const user = await this.userStore.create({ name, email });
      return reply.status(201).send({ success: true, data: user });
    });

    this.fastify.put<{ Params: { id: string }, Body: UpdateUserRequest }>('/api/users/:id', async (request, reply) => {
      const user = await this.userStore.update(request.params.id, request.body);
      if (!user) {
        return reply.status(404).send({ success: false, error: 'User not found' });
      }
      return { success: true, data: user };
    });

    this.fastify.delete<{ Params: { id: string } }>('/api/users/:id', async (request, reply) => {
      const deleted = await this.userStore.delete(request.params.id);
      if (!deleted) {
        return reply.status(404).send({ success: false, error: 'User not found' });
      }
      return { success: true, data: { deleted: true } };
    });
  }

  /**
   * Route handlers using UnifiedRouteHandler pattern
   */
  private getAllUsersHandler(): UnifiedRouteHandler {
    return async (context: UnifiedHttpContext) => {
      const logger = this.telemetryService.getCurrentLogger(context);
      
      logger?.info('Fetching all users');
      
      const { span, logger: childLogger, finish } = this.telemetryService.createChildSpan(
        context, 
        'fetch-users-from-store',
        {
          operationType: 'database',
          layer: 'data',
        }
      );

      try {
        const users = await this.userStore.findAll(context);
        
        span.setTag('users.count', users.length);
        childLogger.info(`Found ${users.length} users`);
        
        const response: ApiResponse<User[]> = {
          success: true,
          data: users,
          meta: {
            requestId: context.request.headers['x-request-id'] as string || 'unknown',
            timestamp: new Date().toISOString(),
          },
        };
        
        context.response.json(response);
      } finally {
        finish();
      }
    };
  }

  private getUserByIdHandler(): UnifiedRouteHandler {
    return async (context: UnifiedHttpContext) => {
      const logger = this.telemetryService.getCurrentLogger(context);
      const userId = context.request.params.id;
      
      logger?.info('Fetching user by ID', { userId });
      
      if (!userId) {
        const errorResponse: ApiResponse<never> = {
          success: false,
          error: 'User ID is required',
        };
        return context.response.status(400).json(errorResponse);
      }

      const { span, logger: childLogger, finish } = this.telemetryService.createChildSpan(
        context,
        'find-user-by-id',
        {
          operationType: 'database',
          layer: 'data',
          attributes: { 'user.id': userId },
        }
      );

      try {
        const user = await this.userStore.findById(userId, context);
        
        if (!user) {
          span.setTag('user.found', false);
          childLogger.warn('User not found', { userId });
          
          const errorResponse: ApiResponse<never> = {
            success: false,
            error: 'User not found',
          };
          return context.response.status(404).json(errorResponse);
        }

        span.setTag('user.found', true);
        childLogger.info('User found successfully', { userId, userName: user.name });
        
        const response: ApiResponse<User> = {
          success: true,
          data: user,
          meta: {
            requestId: context.request.headers['x-request-id'] as string || 'unknown',
            timestamp: new Date().toISOString(),
          },
        };
        
        context.response.json(response);
      } finally {
        finish();
      }
    };
  }

  private createUserHandler(): UnifiedRouteHandler {
    return async (context: UnifiedHttpContext) => {
      const logger = this.telemetryService.getCurrentLogger(context);
      const userData = context.request.body as unknown as CreateUserRequest;
      
      logger?.info('Creating new user', { 
        userName: userData.name, 
        userEmail: userData.email 
      });

      // Validation
      if (!userData.name || !userData.email) {
        const errorResponse: ApiResponse<never> = {
          success: false,
          error: 'Name and email are required',
        };
        return context.response.status(400).json(errorResponse);
      }

      const { span, logger: childLogger, finish } = this.telemetryService.createChildSpan(
        context,
        'create-user-in-store',
        {
          operationType: 'database',
          layer: 'data',
          attributes: { 
            'user.name': userData.name,
            'user.email': userData.email,
          },
        }
      );

      try {
        const newUser = await this.userStore.create(userData, context);
        
        span.setTag('user.created', true);
        span.setTag('user.id', newUser.id);
        childLogger.info('User created successfully', { 
          userId: newUser.id, 
          userName: newUser.name 
        });
        
        const response: ApiResponse<User> = {
          success: true,
          data: newUser,
          meta: {
            requestId: context.request.headers['x-request-id'] as string || 'unknown',
            timestamp: new Date().toISOString(),
          },
        };
        
        context.response.status(201).json(response);
      } finally {
        finish();
      }
    };
  }

  private updateUserHandler(): UnifiedRouteHandler {
    return async (context: UnifiedHttpContext) => {
      const logger = this.telemetryService.getCurrentLogger(context);
      const userId = context.request.params.id;
      const updateData = context.request.body as UpdateUserRequest;
      
      logger?.info('Updating user', { userId });

      if (!userId) {
        const errorResponse: ApiResponse<never> = {
          success: false,
          error: 'User ID is required',
        };
        return context.response.status(400).json(errorResponse);
      }

      const { span, logger: childLogger, finish } = this.telemetryService.createChildSpan(
        context,
        'update-user-in-store',
        {
          operationType: 'database',
          layer: 'data',
          attributes: { 'user.id': userId },
        }
      );

      try {
        const updatedUser = await this.userStore.update(userId, updateData, context);
        
        if (!updatedUser) {
          span.setTag('user.found', false);
          childLogger.warn('User not found for update', { userId });
          
          const errorResponse: ApiResponse<never> = {
            success: false,
            error: 'User not found',
          };
          return context.response.status(404).json(errorResponse);
        }

        span.setTag('user.updated', true);
        childLogger.info('User updated successfully', { 
          userId, 
          userName: updatedUser.name 
        });
        
        const response: ApiResponse<User> = {
          success: true,
          data: updatedUser,
          meta: {
            requestId: context.request.headers['x-request-id'] as string || 'unknown',
            timestamp: new Date().toISOString(),
          },
        };
        
        context.response.json(response);
      } finally {
        finish();
      }
    };
  }

  private deleteUserHandler(): UnifiedRouteHandler {
    return async (context: UnifiedHttpContext) => {
      const logger = this.telemetryService.getCurrentLogger(context);
      const userId = context.request.params.id;
      
      logger?.info('Deleting user', { userId });

      if (!userId) {
        const errorResponse: ApiResponse<never> = {
          success: false,
          error: 'User ID is required',
        };
        return context.response.status(400).json(errorResponse);
      }

      const { span, logger: childLogger, finish } = this.telemetryService.createChildSpan(
        context,
        'delete-user-from-store',
        {
          operationType: 'database',
          layer: 'data',
          attributes: { 'user.id': userId },
        }
      );

      try {
        const deleted = await this.userStore.delete(userId, context);
        
        if (!deleted) {
          span.setTag('user.found', false);
          childLogger.warn('User not found for deletion', { userId });
          
          const errorResponse: ApiResponse<never> = {
            success: false,
            error: 'User not found',
          };
          return context.response.status(404).json(errorResponse);
        }

        span.setTag('user.deleted', true);
        childLogger.info('User deleted successfully', { userId });
        
        const response: ApiResponse<{ deleted: boolean }> = {
          success: true,
          data: { deleted: true },
          meta: {
            requestId: context.request.headers['x-request-id'] as string || 'unknown',
            timestamp: new Date().toISOString(),
          },
        };
        
        context.response.json(response);
      } finally {
        finish();
      }
    };
  }

  /**
   * Setup Prometheus metrics endpoint
   */
  private setupMetricsEndpoint(): void {
    if (!this.fastify) return;
    
    const prometheusPort = parseInt(process.env.PROMETHEUS_METRICS_PORT || '9464', 10);
    const enablePrometheus = process.env.OTEL_ENABLE_PROMETHEUS !== 'false';
    
    if (!enablePrometheus) {
      console.log('🔕 Prometheus metrics endpoint disabled');
      return;
    }

    // Import prometheus registry dynamically to avoid issues if not enabled
    try {
      const promClient = require('prom-client');
      
      this.fastify.get('/metrics', async (request, reply) => {
        try {
          const metrics = await promClient.register.metrics();
          reply.type('text/plain').send(metrics);
        } catch (error) {
          reply.status(500).send('Error collecting metrics');
        }
      });

      console.log(`📊 Prometheus metrics endpoint available at port ${prometheusPort}/metrics`);
    } catch (error) {
      console.warn('⚠️ Prometheus client not available, metrics endpoint disabled');
    }
  }

  /**
   * Setup error handling
   */
  private setupErrorHandling(): void {
    if (!this.fastify) return;

    this.fastify.setErrorHandler(async (error, request, reply) => {
      const logger = this.fastify?.log;
      
      logger?.error({
        error: error.message,
        stack: error.stack,
        requestId: request.id,
        method: request.method,
        url: request.url,
      }, 'Unhandled error occurred');

      const errorResponse: ApiResponse<never> = {
        success: false,
        error: 'Internal Server Error',
        meta: {
          requestId: request.id,
          timestamp: new Date().toISOString(),
        },
      };

      reply.status(500).send(errorResponse);
    });
  }

  /**
   * Start the server
   */
  async start(): Promise<void> {
    if (!this.fastify) {
      throw new Error('Fastify instance not initialized. Call initialize() first.');
    }

    try {
      await this.fastify.listen({
        port: this.config.port,
        host: '0.0.0.0',
      });

      console.log(`✅ Server running on port ${this.config.port}`);
      console.log(`🔍 Telemetry ${this.config.enableTelemetry ? 'enabled' : 'disabled'}`);
      console.log(`📊 Health check: http://localhost:${this.config.port}/health`);
      console.log(`👥 Users API: http://localhost:${this.config.port}/api/users`);
    } catch (error) {
      this.fastify?.log?.error(error);
      process.exit(1);
    }
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    try {
      if (this.telemetryService) {
        await this.telemetryService.shutdown();
      }
      if (this.fastify) {
        await this.fastify.close();
      }
      console.log('🛑 Server shutdown completed');
    } catch (error) {
      console.error('Error during shutdown:', error);
      process.exit(1);
    }
  }
}

/**
 * Application entry point
 */
async function main(): Promise<void> {
  const config: AppConfig = {
    serviceName: 'fastify-telemetry-example',
    serviceVersion: '1.0.0',
    port: parseInt(process.env.PORT || '3000', 10),
    enableTelemetry: process.env.ENABLE_TELEMETRY !== 'false',
    useCustomOtelConfig: process.env.CUSTOM_OTEL_CONFIG_ENABLED === 'true',
  };

  const app = new FastifyTelemetryApp(config);

  // Initialize the application
  await app.initialize();

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n🔄 Received SIGINT, shutting down gracefully...');
    await app.shutdown();
  });

  process.on('SIGTERM', async () => {
    console.log('\n🔄 Received SIGTERM, shutting down gracefully...');
    await app.shutdown();
  });

  await app.start();
}

// Run the application
if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Failed to start application:', error);
    process.exit(1);
  });
}

export { 
  FastifyTelemetryApp, 
  FastifyTelemetryAdapter,
  type AppConfig,
  type User,
  type CreateUserRequest,
  type UpdateUserRequest,
  type ApiResponse,
};
