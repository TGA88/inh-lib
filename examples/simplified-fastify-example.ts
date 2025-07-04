/**
 * Simplified Fastify with Telemetry Example
 * ตัวอย่างการใช้งาน Fastify แบบง่าย ๆ พร้อม concept ของ telemetry
 * ไม่ต้องพึ่งพา external packages
 */

import Fastify, { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

/**
 * Mock types และ interfaces เพื่อแสดง concept
 */

// Mock UnifiedHttpContext
interface UnifiedHttpContext {
  request: {
    method: string;
    url: string;
    headers: Record<string, string | string[] | undefined>;
    params: Record<string, string>;
    query: Record<string, string | string[]>;
    body: unknown;
    ip?: string;
    userAgent?: string;
  };
  response: {
    status: (code: number) => UnifiedResponseContext;
    json: <T>(data: T) => void;
    send: (data: string) => void;
    header: (name: string, value: string) => UnifiedResponseContext;
    redirect: (url: string) => void;
  };
  registry: Record<string, unknown>;
}

interface UnifiedResponseContext {
  status: (code: number) => UnifiedResponseContext;
  json: <T>(data: T) => void;
  send: (data: string) => void;
  header: (name: string, value: string) => UnifiedResponseContext;
  redirect: (url: string) => void;
}

// Mock middleware types
type UnifiedMiddleware = (
  context: UnifiedHttpContext,
  next: () => Promise<void>
) => Promise<void>;

type UnifiedRouteHandler = (context: UnifiedHttpContext) => Promise<void>;

// Mock telemetry types
interface MockTelemetrySpan {
  setTag(key: string, value: string | number | boolean): MockTelemetrySpan;
  setStatus(status: { code: string; message?: string }): MockTelemetrySpan;
  recordException(error: Error): MockTelemetrySpan;
  addEvent(name: string, attributes?: Record<string, unknown>): MockTelemetrySpan;
  finish(): void;
  getTraceId(): string;
  getSpanId(): string;
}

interface MockTelemetryLogger {
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, error?: Error, meta?: Record<string, unknown>): void;
  finishSpan(): void;
}

/**
 * Data types
 */
interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

interface CreateUserRequest {
  name: string;
  email: string;
}

interface UpdateUserRequest {
  name?: string;
  email?: string;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    requestId: string;
    timestamp: string;
    traceId?: string;
  };
}

/**
 * Mock Telemetry Service (จำลองการทำงาน)
 */
class MockTelemetryService {
  private readonly traceId = () => `trace-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  private readonly spanId = () => `span-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

  createMiddleware(): UnifiedMiddleware {
    return async (context: UnifiedHttpContext, next: () => Promise<void>) => {
      const startTime = Date.now();
      const traceId = this.traceId();
      const spanId = this.spanId();

      // Store telemetry data in context
      context.registry['telemetry'] = {
        traceId,
        spanId,
        startTime,
      };

      console.log(`🔍 [${traceId}] HTTP ${context.request.method} ${context.request.url} started`);

      try {
        await next();
        const duration = Date.now() - startTime;
        console.log(`✅ [${traceId}] HTTP request completed in ${duration}ms`);
      } catch (error) {
        const duration = Date.now() - startTime;
        console.log(`❌ [${traceId}] HTTP request failed in ${duration}ms:`, error);
        throw error;
      }
    };
  }

  createChildSpan(
    context: UnifiedHttpContext,
    operationName: string,
    options?: { operationType?: string; layer?: string; attributes?: Record<string, unknown> }
  ): { span: MockTelemetrySpan; logger: MockTelemetryLogger; finish: () => void } {
    const telemetry = context.registry['telemetry'] as { traceId: string; spanId: string } | undefined;
    const traceId = telemetry?.traceId || this.traceId();
    const spanId = this.spanId();
    const startTime = Date.now();

    console.log(`🎯 [${traceId}:${spanId}] ${operationName} started (${options?.operationType}/${options?.layer})`);

    const span: MockTelemetrySpan = {
      setTag: (key: string, value: string | number | boolean) => {
        console.log(`🏷️  [${traceId}:${spanId}] Tag: ${key}=${value}`);
        return span;
      },
      setStatus: (status: { code: string; message?: string }) => {
        console.log(`📊 [${traceId}:${spanId}] Status: ${status.code} ${status.message || ''}`);
        return span;
      },
      recordException: (error: Error) => {
        console.log(`💥 [${traceId}:${spanId}] Exception:`, error.message);
        return span;
      },
      addEvent: (name: string, attributes?: Record<string, unknown>) => {
        console.log(`📝 [${traceId}:${spanId}] Event: ${name}`, attributes);
        return span;
      },
      finish: () => {
        const duration = Date.now() - startTime;
        console.log(`🏁 [${traceId}:${spanId}] ${operationName} finished in ${duration}ms`);
      },
      getTraceId: () => traceId,
      getSpanId: () => spanId,
    };

    const logger: MockTelemetryLogger = {
      info: (message: string, meta?: Record<string, unknown>) => {
        console.log(`ℹ️  [${traceId}:${spanId}] ${message}`, meta || '');
      },
      warn: (message: string, meta?: Record<string, unknown>) => {
        console.log(`⚠️  [${traceId}:${spanId}] ${message}`, meta || '');
      },
      error: (message: string, error?: Error, meta?: Record<string, unknown>) => {
        console.log(`🚨 [${traceId}:${spanId}] ${message}`, error?.message || '', meta || '');
      },
      finishSpan: () => span.finish(),
    };

    return {
      span,
      logger,
      finish: () => span.finish(),
    };
  }

  getCurrentLogger(context: UnifiedHttpContext): MockTelemetryLogger | null {
    const telemetry = context.registry['telemetry'] as { traceId: string; spanId: string } | undefined;
    if (!telemetry) return null;

    return {
      info: (message: string, meta?: Record<string, unknown>) => {
        console.log(`ℹ️  [${telemetry.traceId}] ${message}`, meta || '');
      },
      warn: (message: string, meta?: Record<string, unknown>) => {
        console.log(`⚠️  [${telemetry.traceId}] ${message}`, meta || '');
      },
      error: (message: string, error?: Error, meta?: Record<string, unknown>) => {
        console.log(`🚨 [${telemetry.traceId}] ${message}`, error?.message || '', meta || '');
      },
      finishSpan: () => {},
    };
  }

  createBusinessLogicMiddleware(operationName: string): UnifiedMiddleware {
    return async (context: UnifiedHttpContext, next: () => Promise<void>) => {
      const { span, logger, finish } = this.createChildSpan(context, operationName, {
        operationType: 'business',
        layer: 'service',
      });

      logger.info(`${operationName} started`);

      try {
        await next();
        span.setStatus({ code: 'ok' });
        logger.info(`${operationName} completed successfully`);
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        span.recordException(err);
        span.setStatus({ code: 'error', message: err.message });
        logger.error(`${operationName} failed`, err);
        throw error;
      } finally {
        finish();
      }
    };
  }
}

/**
 * Simple User Store with Telemetry Support
 */
class UserStore {
  private readonly users: Map<string, User> = new Map();
  private nextId = 1;

  constructor(private readonly telemetryService: MockTelemetryService) {}

  async create(userData: CreateUserRequest, context?: UnifiedHttpContext): Promise<User> {
    // Create span for database operation
    const span = this.createDatabaseSpan('user.create', context, {
      'user.name': userData.name,
      'user.email': userData.email,
    });

    try {
      span.logger.info('Creating new user in database', { 
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

      span.span.setTag('user.id', user.id);
      span.span.setTag('user.created', true);
      span.logger.info('User created successfully in database', { 
        userId: user.id,
        userName: user.name 
      });

      return user;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      span.span.recordException(err);
      span.span.setStatus({ code: 'error', message: err.message });
      span.logger.error('Failed to create user in database', err);
      throw error;
    } finally {
      span.finish();
    }
  }

  async findById(id: string, context?: UnifiedHttpContext): Promise<User | null> {
    const span = this.createDatabaseSpan('user.findById', context, {
      'user.id': id,
    });

    try {
      span.logger.info('Finding user by ID in database', { userId: id });

      // Simulate database latency
      await new Promise(resolve => setTimeout(resolve, Math.random() * 5));

      const user = this.users.get(id) || null;

      span.span.setTag('user.found', !!user);
      if (user) {
        span.span.setTag('user.name', user.name);
        span.logger.info('User found in database', { 
          userId: id, 
          userName: user.name 
        });
      } else {
        span.logger.warn('User not found in database', { userId: id });
      }

      return user;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      span.span.recordException(err);
      span.span.setStatus({ code: 'error', message: err.message });
      span.logger.error('Failed to find user in database', err, { userId: id });
      throw error;
    } finally {
      span.finish();
    }
  }

  async findAll(context?: UnifiedHttpContext): Promise<User[]> {
    const span = this.createDatabaseSpan('user.findAll', context);

    try {
      span.logger.info('Fetching all users from database');

      // Simulate database latency
      await new Promise(resolve => setTimeout(resolve, Math.random() * 15));

      const users = Array.from(this.users.values());

      span.span.setTag('users.count', users.length);
      span.span.setTag('query.type', 'findAll');
      span.logger.info('Successfully fetched all users from database', { 
        count: users.length 
      });

      return users;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      span.span.recordException(err);
      span.span.setStatus({ code: 'error', message: err.message });
      span.logger.error('Failed to fetch users from database', err);
      throw error;
    } finally {
      span.finish();
    }
  }

  async update(id: string, userData: UpdateUserRequest, context?: UnifiedHttpContext): Promise<User | null> {
    const span = this.createDatabaseSpan('user.update', context, {
      'user.id': id,
      'user.update.name': userData.name || 'unchanged',
      'user.update.email': userData.email || 'unchanged',
    });

    try {
      span.logger.info('Updating user in database', { 
        userId: id, 
        updateData: userData 
      });

      // Simulate database latency
      await new Promise(resolve => setTimeout(resolve, Math.random() * 8));

      const existing = this.users.get(id);
      if (!existing) {
        span.span.setTag('user.found', false);
        span.logger.warn('User not found for update in database', { userId: id });
        return null;
      }

      const updated: User = { ...existing, ...userData };
      this.users.set(id, updated);

      span.span.setTag('user.found', true);
      span.span.setTag('user.updated', true);
      span.span.setTag('user.name', updated.name);
      span.logger.info('User updated successfully in database', { 
        userId: id,
        userName: updated.name,
        updatedFields: Object.keys(userData)
      });

      return updated;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      span.span.recordException(err);
      span.span.setStatus({ code: 'error', message: err.message });
      span.logger.error('Failed to update user in database', err, { userId: id });
      throw error;
    } finally {
      span.finish();
    }
  }

  async delete(id: string, context?: UnifiedHttpContext): Promise<boolean> {
    const span = this.createDatabaseSpan('user.delete', context, {
      'user.id': id,
    });

    try {
      span.logger.info('Deleting user from database', { userId: id });

      // Simulate database latency
      await new Promise(resolve => setTimeout(resolve, Math.random() * 6));

      const existed = this.users.has(id);
      const deleted = this.users.delete(id);

      span.span.setTag('user.existed', existed);
      span.span.setTag('user.deleted', deleted);

      if (deleted) {
        span.logger.info('User deleted successfully from database', { userId: id });
      } else {
        span.logger.warn('User not found for deletion in database', { userId: id });
      }

      return deleted;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      span.span.recordException(err);
      span.span.setStatus({ code: 'error', message: err.message });
      span.logger.error('Failed to delete user from database', err, { userId: id });
      throw error;
    } finally {
      span.finish();
    }
  }

  /**
   * Helper method to create database operation spans
   */
  private createDatabaseSpan(
    operation: string, 
    context?: UnifiedHttpContext,
    attributes?: Record<string, string>
  ): { span: MockTelemetrySpan; logger: MockTelemetryLogger; finish: () => void } {
    const operationName = `db.${operation}`;
    
    if (context) {
      // If we have context, create child span
      return this.telemetryService.createChildSpan(context, operationName, {
        operationType: 'database',
        layer: 'data',
        attributes: {
          'db.operation': operation,
          'db.table': 'users',
          'db.type': 'in-memory',
          ...attributes,
        },
      });
    } else {
      // If no context, create standalone span (for direct method calls)
      const traceId = `trace-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
      const spanId = `span-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
      const startTime = Date.now();

      console.log(`🎯 [${traceId}:${spanId}] ${operationName} started (database/data)`);

      const span: MockTelemetrySpan = {
        setTag: (key: string, value: string | number | boolean) => {
          console.log(`🏷️  [${traceId}:${spanId}] Tag: ${key}=${value}`);
          return span;
        },
        setStatus: (status: { code: string; message?: string }) => {
          console.log(`📊 [${traceId}:${spanId}] Status: ${status.code} ${status.message || ''}`);
          return span;
        },
        recordException: (error: Error) => {
          console.log(`💥 [${traceId}:${spanId}] Exception:`, error.message);
          return span;
        },
        addEvent: (name: string, attrs?: Record<string, unknown>) => {
          console.log(`📝 [${traceId}:${spanId}] Event: ${name}`, attrs);
          return span;
        },
        finish: () => {
          const duration = Date.now() - startTime;
          console.log(`🏁 [${traceId}:${spanId}] ${operationName} finished in ${duration}ms`);
        },
        getTraceId: () => traceId,
        getSpanId: () => spanId,
      };

      const logger: MockTelemetryLogger = {
        info: (message: string, meta?: Record<string, unknown>) => {
          console.log(`ℹ️  [${traceId}:${spanId}] ${message}`, meta || '');
        },
        warn: (message: string, meta?: Record<string, unknown>) => {
          console.log(`⚠️  [${traceId}:${spanId}] ${message}`, meta || '');
        },
        error: (message: string, error?: Error, meta?: Record<string, unknown>) => {
          console.log(`🚨 [${traceId}:${spanId}] ${message}`, error?.message || '', meta || '');
        },
        finishSpan: () => span.finish(),
      };

      return {
        span,
        logger,
        finish: () => span.finish(),
      };
    }
  }
}

/**
 * Mock Fastify Adapter
 */
class MockFastifyAdapter {
  constructor(private readonly telemetryService: MockTelemetryService) {}

  createFastifyContext(request: FastifyRequest, reply: FastifyReply): UnifiedHttpContext {
    return {
      request: {
        method: request.method,
        url: request.url,
        headers: request.headers as Record<string, string>,
        params: request.params as Record<string, string>,
        query: request.query as Record<string, string | string[]>,
        body: request.body,
        ip: request.ip,
        userAgent: request.headers['user-agent'],
      },
      response: {
        status: (code: number) => {
          reply.status(code);
          return this.createResponseContext(reply);
        },
        json: <T>(data: T) => {
          reply.send(data);
        },
        send: (data: string) => {
          reply.send(data);
        },
        header: (name: string, value: string) => {
          reply.header(name, value);
          return this.createResponseContext(reply);
        },
        redirect: (url: string) => {
          reply.redirect(url);
        },
      },
      registry: {},
    };
  }

  private createResponseContext(reply: FastifyReply): UnifiedResponseContext {
    return {
      status: (code: number) => {
        reply.status(code);
        return this.createResponseContext(reply);
      },
      json: <T>(data: T) => {
        reply.send(data);
      },
      send: (data: string) => {
        reply.send(data);
      },
      header: (name: string, value: string) => {
        reply.header(name, value);
        return this.createResponseContext(reply);
      },
      redirect: (url: string) => {
        reply.redirect(url);
      },
    };
  }

  convertHandler(handler: UnifiedRouteHandler, middlewares: UnifiedMiddleware[] = []) {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      const context = this.createFastifyContext(request, reply);

      try {
        // Apply middlewares
        for (const middleware of middlewares) {
          let nextCalled = false;
          const next = async () => {
            nextCalled = true;
          };

          await middleware(context, next);
          if (!nextCalled) return; // Middleware handled the response
        }

        // Execute handler
        await handler(context);
      } catch (error) {
        const logger = this.telemetryService.getCurrentLogger(context);
        if (logger) {
          const err = error instanceof Error ? error : new Error(String(error));
          logger.error('Handler execution failed', err);
        }
        throw error;
      }
    };
  }
}

/**
 * Main Application
 */
class SimplifiedFastifyApp {
  private readonly fastify: FastifyInstance;
  private readonly telemetryService: MockTelemetryService;
  private readonly adapter: MockFastifyAdapter;
  private readonly userStore: UserStore;

  constructor(private readonly config: { serviceName: string; port: number; enableTelemetry: boolean }) {
    this.fastify = Fastify({
      logger: true,
      requestIdHeader: 'x-request-id',
      genReqId: () => `req-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
    });

    this.telemetryService = new MockTelemetryService();
    this.adapter = new MockFastifyAdapter(this.telemetryService);
    this.userStore = new UserStore(this.telemetryService);

    this.setupGlobalTelemetry();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  private setupGlobalTelemetry(): void {
    if (!this.config.enableTelemetry) {
      console.log('🔕 Telemetry disabled');
      return;
    }

    // Global telemetry middleware
    this.fastify.addHook('onRequest', async (request, reply) => {
      const context = this.adapter.createFastifyContext(request, reply);
      const middleware = this.telemetryService.createMiddleware();

      const next = async () => {
        // Continue processing
      };

      await middleware(context, next);
    });
  }

  private setupRoutes(): void {
    // Health check
    this.fastify.get('/health', async () => ({
      status: 'healthy',
      service: this.config.serviceName,
      timestamp: new Date().toISOString(),
    }));

    // Users API with telemetry
    this.fastify.get('/api/users', 
      this.adapter.convertHandler(this.getAllUsersHandler(), [
        this.telemetryService.createBusinessLogicMiddleware('get-all-users'),
      ])
    );

    this.fastify.get<{ Params: { id: string } }>('/api/users/:id',
      this.adapter.convertHandler(this.getUserByIdHandler(), [
        this.telemetryService.createBusinessLogicMiddleware('get-user-by-id'),
      ])
    );

    this.fastify.post<{ Body: CreateUserRequest }>('/api/users',
      this.adapter.convertHandler(this.createUserHandler(), [
        this.telemetryService.createBusinessLogicMiddleware('create-user'),
      ])
    );

    this.fastify.put<{ Params: { id: string }, Body: UpdateUserRequest }>('/api/users/:id',
      this.adapter.convertHandler(this.updateUserHandler(), [
        this.telemetryService.createBusinessLogicMiddleware('update-user'),
      ])
    );

    this.fastify.delete<{ Params: { id: string } }>('/api/users/:id',
      this.adapter.convertHandler(this.deleteUserHandler(), [
        this.telemetryService.createBusinessLogicMiddleware('delete-user'),
      ])
    );
  }

  private getAllUsersHandler(): UnifiedRouteHandler {
    return async (context: UnifiedHttpContext) => {
      const logger = this.telemetryService.getCurrentLogger(context);
      logger?.info('Fetching all users');

      const { span, logger: childLogger, finish } = this.telemetryService.createChildSpan(
        context,
        'fetch-users-from-store',
        { operationType: 'database', layer: 'data' }
      );

      try {
        const users = await this.userStore.findAll(context);
        span.setTag('users.count', users.length);
        childLogger.info(`Found ${users.length} users`);

        const telemetry = context.registry['telemetry'] as { traceId?: string } | undefined;
        const response: ApiResponse<User[]> = {
          success: true,
          data: users,
          meta: {
            requestId: context.request.headers['x-request-id'] as string || 'unknown',
            timestamp: new Date().toISOString(),
            traceId: telemetry?.traceId,
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

      const { span, logger: childLogger, finish } = this.telemetryService.createChildSpan(
        context,
        'find-user-by-id',
        { 
          operationType: 'database', 
          layer: 'data',
          attributes: { 'user.id': userId }
        }
      );

      try {
        const user = await this.userStore.findById(userId, context);

        if (!user) {
          span.setTag('user.found', false);
          childLogger.warn('User not found', { userId });
          return context.response.status(404).json({
            success: false,
            error: 'User not found',
          });
        }

        span.setTag('user.found', true);
        childLogger.info('User found successfully', { userId, userName: user.name });

        const telemetry = context.registry['telemetry'] as { traceId?: string } | undefined;
        context.response.json({
          success: true,
          data: user,
          meta: {
            requestId: context.request.headers['x-request-id'] as string || 'unknown',
            timestamp: new Date().toISOString(),
            traceId: telemetry?.traceId,
          },
        });
      } finally {
        finish();
      }
    };
  }

  private createUserHandler(): UnifiedRouteHandler {
    return async (context: UnifiedHttpContext) => {
      const logger = this.telemetryService.getCurrentLogger(context);
      const userData = context.request.body as CreateUserRequest;

      logger?.info('Creating new user', { userName: userData.name, userEmail: userData.email });

      if (!userData.name || !userData.email) {
        return context.response.status(400).json({
          success: false,
          error: 'Name and email are required',
        });
      }

      const { span, logger: childLogger, finish } = this.telemetryService.createChildSpan(
        context,
        'create-user-in-store',
        {
          operationType: 'database',
          layer: 'data',
          attributes: { 'user.name': userData.name, 'user.email': userData.email }
        }
      );

      try {
        const newUser = await this.userStore.create(userData, context);
        span.setTag('user.created', true);
        span.setTag('user.id', newUser.id);
        childLogger.info('User created successfully', { userId: newUser.id, userName: newUser.name });

        const telemetry = context.registry['telemetry'] as { traceId?: string } | undefined;
        context.response.status(201).json({
          success: true,
          data: newUser,
          meta: {
            requestId: context.request.headers['x-request-id'] as string || 'unknown',
            timestamp: new Date().toISOString(),
            traceId: telemetry?.traceId,
          },
        });
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

      const { span, logger: childLogger, finish } = this.telemetryService.createChildSpan(
        context,
        'update-user-in-store',
        { 
          operationType: 'database', 
          layer: 'data',
          attributes: { 'user.id': userId }
        }
      );

      try {
        const updatedUser = await this.userStore.update(userId, updateData, context);

        if (!updatedUser) {
          span.setTag('user.found', false);
          childLogger.warn('User not found for update', { userId });
          return context.response.status(404).json({
            success: false,
            error: 'User not found',
          });
        }

        span.setTag('user.updated', true);
        childLogger.info('User updated successfully', { userId, userName: updatedUser.name });

        const telemetry = context.registry['telemetry'] as { traceId?: string } | undefined;
        context.response.json({
          success: true,
          data: updatedUser,
          meta: {
            requestId: context.request.headers['x-request-id'] as string || 'unknown',
            timestamp: new Date().toISOString(),
            traceId: telemetry?.traceId,
          },
        });
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

      const { span, logger: childLogger, finish } = this.telemetryService.createChildSpan(
        context,
        'delete-user-from-store',
        { 
          operationType: 'database', 
          layer: 'data',
          attributes: { 'user.id': userId }
        }
      );

      try {
        const deleted = await this.userStore.delete(userId, context);

        if (!deleted) {
          span.setTag('user.found', false);
          childLogger.warn('User not found for deletion', { userId });
          return context.response.status(404).json({
            success: false,
            error: 'User not found',
          });
        }

        span.setTag('user.deleted', true);
        childLogger.info('User deleted successfully', { userId });

        const telemetry = context.registry['telemetry'] as { traceId?: string } | undefined;
        context.response.json({
          success: true,
          data: { deleted: true },
          meta: {
            requestId: context.request.headers['x-request-id'] as string || 'unknown',
            timestamp: new Date().toISOString(),
            traceId: telemetry?.traceId,
          },
        });
      } finally {
        finish();
      }
    };
  }

  private setupErrorHandling(): void {
    this.fastify.setErrorHandler(async (error, request, reply) => {
      console.error(`❌ [${request.id}] Unhandled error:`, error.message);

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

  async start(): Promise<void> {
    try {
      await this.fastify.listen({
        port: this.config.port,
        host: '0.0.0.0',
      });

      console.log('🚀 ===========================================');
      console.log(`✅ Server running on port ${this.config.port}`);
      console.log(`🔍 Telemetry ${this.config.enableTelemetry ? 'enabled' : 'disabled'}`);
      console.log(`📊 Health check: http://localhost:${this.config.port}/health`);
      console.log(`👥 Users API: http://localhost:${this.config.port}/api/users`);
      console.log('🚀 ===========================================');
    } catch (error) {
      console.error('❌ Failed to start server:', error);
      process.exit(1);
    }
  }

  async shutdown(): Promise<void> {
    try {
      await this.fastify.close();
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
  const config = {
    serviceName: 'simplified-fastify-telemetry',
    port: parseInt(process.env.PORT || '3000', 10),
    enableTelemetry: process.env.ENABLE_TELEMETRY !== 'false',
  };

  const app = new SimplifiedFastifyApp(config);

  // Graceful shutdown
  const gracefulShutdown = async () => {
    console.log('\n🔄 Shutting down gracefully...');
    await app.shutdown();
  };

  process.on('SIGINT', gracefulShutdown);
  process.on('SIGTERM', gracefulShutdown);

  await app.start();
}

// Run the application
if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Failed to start application:', error);
    process.exit(1);
  });
}

export { SimplifiedFastifyApp };
