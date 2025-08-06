/**
 * Enhanced Fastify Example with Full Telemetry Integration
 * รวม OpenTelemetry + Prometheus + Structured Logging
 */

import Fastify, { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { setupTelemetryForApp, defaultOtelConfig } from './otel-config';
import { createWriteStream } from 'fs';
import { join } from 'path';
import pino from 'pino';

// Initialize OpenTelemetry first (before any imports)
const otelSDK = setupTelemetryForApp();

// Import telemetry APIs after SDK initialization
import { trace, metrics, context } from '@opentelemetry/api';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { MeterProvider } from '@opentelemetry/sdk-metrics';

/**
 * Application interfaces
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
    duration?: number;
  };
}

/**
 * Metrics setup
 */
const meter = metrics.getMeter('fastify-telemetry-example', '1.0.0');

// Custom metrics
const httpRequestsTotal = meter.createCounter('http_requests_total', {
  description: 'Total number of HTTP requests',
});

const httpRequestDuration = meter.createHistogram('http_request_duration_seconds', {
  description: 'Duration of HTTP requests in seconds',
  unit: 's',
});

const usersTotal = meter.createUpDownCounter('users_total', {
  description: 'Total number of users in the system',
});

const databaseOperationsTotal = meter.createCounter('database_operations_total', {
  description: 'Total number of database operations',
});

const databaseOperationDuration = meter.createHistogram('database_operation_duration_seconds', {
  description: 'Duration of database operations in seconds',
  unit: 's',
});

/**
 * Structured logger setup
 */
const logStream = createWriteStream(join(__dirname, 'logs', 'app.log'), { flags: 'a' });
const logger = pino({
  level: 'info',
  formatters: {
    level: (label) => ({ level: label }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  base: {
    service: defaultOtelConfig.serviceName,
    version: defaultOtelConfig.serviceVersion,
    environment: defaultOtelConfig.environment,
  },
}, logStream);

/**
 * Enhanced User Store with comprehensive telemetry
 */
class TelemetryUserStore {
  private readonly users: Map<string, User> = new Map();
  private nextId = 1;
  private readonly tracer = trace.getTracer('user-store', '1.0.0');

  async create(userData: CreateUserRequest, parentSpan?: any): Promise<User> {
    // Use context API for proper span parenting
    const activeContext = parentSpan ? trace.setSpan(context.active(), parentSpan) : context.active();
    
    const span = this.tracer.startSpan('user.create', {
      attributes: {
        'operation.name': 'create_user',
        'user.name': userData.name,
        'user.email': userData.email,
      },
    }, activeContext);

    const startTime = Date.now();

    try {
      // Log the operation
      logger.info({
        operation: 'user.create',
        traceId: span.spanContext().traceId,
        spanId: span.spanContext().spanId,
        userData: { name: userData.name, email: userData.email },
      }, 'Creating new user');

      // Simulate database latency
      await new Promise(resolve => setTimeout(resolve, Math.random() * 20));

      const user: User = {
        id: String(this.nextId++),
        name: userData.name,
        email: userData.email,
        createdAt: new Date().toISOString(),
      };

      this.users.set(user.id, user);

      // Update metrics
      databaseOperationsTotal.add(1, { operation: 'create', table: 'users' });
      usersTotal.add(1);

      // Update span attributes
      span.setAttributes({
        'user.id': user.id,
        'operation.success': true,
        'db.rows_affected': 1,
      });

      logger.info({
        operation: 'user.create',
        traceId: span.spanContext().traceId,
        spanId: span.spanContext().spanId,
        userId: user.id,
        userName: user.name,
      }, 'User created successfully');

      return user;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      span.recordException(err);
      span.setStatus({ code: 2, message: err.message }); // SpanStatusCode.ERROR

      logger.error({
        operation: 'user.create',
        traceId: span.spanContext().traceId,
        spanId: span.spanContext().spanId,
        error: err.message,
        stack: err.stack,
      }, 'Failed to create user');

      throw error;
    } finally {
      const duration = (Date.now() - startTime) / 1000;
      databaseOperationDuration.record(duration, { operation: 'create', table: 'users' });
      span.end();
    }
  }

  async findById(id: string, parentSpan?: any): Promise<User | null> {
    // Use context API for proper span parenting
    const activeContext = parentSpan ? trace.setSpan(context.active(), parentSpan) : context.active();
    
    const span = this.tracer.startSpan('user.findById', {
      attributes: {
        'operation.name': 'find_user_by_id',
        'user.id': id,
      },
    }, activeContext);

    const startTime = Date.now();

    try {
      logger.info({
        operation: 'user.findById',
        traceId: span.spanContext().traceId,
        spanId: span.spanContext().spanId,
        userId: id,
      }, 'Finding user by ID');

      await new Promise(resolve => setTimeout(resolve, Math.random() * 10));

      const user = this.users.get(id) || null;

      databaseOperationsTotal.add(1, { operation: 'findById', table: 'users' });

      span.setAttributes({
        'user.found': !!user,
        'operation.success': true,
        'db.rows_returned': user ? 1 : 0,
      });

      if (user) {
        logger.info({
          operation: 'user.findById',
          traceId: span.spanContext().traceId,
          spanId: span.spanContext().spanId,
          userId: id,
          userName: user.name,
        }, 'User found');
      } else {
        logger.warn({
          operation: 'user.findById',
          traceId: span.spanContext().traceId,
          spanId: span.spanContext().spanId,
          userId: id,
        }, 'User not found');
      }

      return user;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      span.recordException(err);
      span.setStatus({ code: 2, message: err.message });

      logger.error({
        operation: 'user.findById',
        traceId: span.spanContext().traceId,
        spanId: span.spanContext().spanId,
        userId: id,
        error: err.message,
      }, 'Failed to find user');

      throw error;
    } finally {
      const duration = (Date.now() - startTime) / 1000;
      databaseOperationDuration.record(duration, { operation: 'findById', table: 'users' });
      span.end();
    }
  }

  async findAll(parentSpan?: any): Promise<User[]> {
    // Use context API for proper span parenting
    const activeContext = parentSpan ? trace.setSpan(context.active(), parentSpan) : context.active();
    
    const span = this.tracer.startSpan('user.findAll', {
      attributes: {
        'operation.name': 'find_all_users',
      },
    }, activeContext);

    const startTime = Date.now();

    try {
      logger.info({
        operation: 'user.findAll',
        traceId: span.spanContext().traceId,
        spanId: span.spanContext().spanId,
      }, 'Finding all users');

      await new Promise(resolve => setTimeout(resolve, Math.random() * 15));

      const users = Array.from(this.users.values());

      databaseOperationsTotal.add(1, { operation: 'findAll', table: 'users' });

      span.setAttributes({
        'users.count': users.length,
        'operation.success': true,
        'db.rows_returned': users.length,
      });

      logger.info({
        operation: 'user.findAll',
        traceId: span.spanContext().traceId,
        spanId: span.spanContext().spanId,
        userCount: users.length,
      }, 'Found all users');

      return users;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      span.recordException(err);
      span.setStatus({ code: 2, message: err.message });

      logger.error({
        operation: 'user.findAll',
        traceId: span.spanContext().traceId,
        spanId: span.spanContext().spanId,
        error: err.message,
      }, 'Failed to find all users');

      throw error;
    } finally {
      const duration = (Date.now() - startTime) / 1000;
      databaseOperationDuration.record(duration, { operation: 'findAll', table: 'users' });
      span.end();
    }
  }

  // Similar implementations for update and delete...
  // (truncated for brevity, but would follow the same pattern)
}

/**
 * Enhanced Fastify Application
 */
class TelemetryFastifyApp {
  private fastify?: FastifyInstance;
  private userStore: TelemetryUserStore;
  private tracer = trace.getTracer('fastify-app', '1.0.0');

  constructor(private config: { serviceName: string; port: number }) {
    this.userStore = new TelemetryUserStore();
  }

  async initialize(): Promise<void> {
    this.createFastifyInstance();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  private createFastifyInstance(): void {
    this.fastify = Fastify({
      logger: {
        stream: logStream,
        serializers: {
          req: (req) => ({
            method: req.method,
            url: req.url,
            headers: req.headers,
            hostname: req.hostname,
            remoteAddress: req.ip,
          }),
          res: (res) => ({
            statusCode: res.statusCode,
            headers: res.getHeaders && res.getHeaders(),
          }),
        },
      },
      requestIdHeader: 'x-request-id',
      genReqId: () => `req-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
    });
  }

  private setupMiddleware(): void {
    if (!this.fastify) return;

    // Request timing and tracing middleware
    this.fastify.addHook('onRequest', async (request, reply) => {
      const startTime = Date.now();
      request.startTime = startTime;

      // Create span for the request
      const span = this.tracer.startSpan(`${request.method} ${request.url}`, {
        attributes: {
          'http.method': request.method,
          'http.url': request.url,
          'http.user_agent': request.headers['user-agent'] || '',
          'http.request_id': request.id,
        },
      });

      request.span = span;
      request.traceId = span.spanContext().traceId;
    });

    // Response timing middleware
    this.fastify.addHook('onSend', async (request, reply, payload) => {
      const duration = (Date.now() - request.startTime) / 1000;
      const statusCode = reply.statusCode;

      // Update metrics
      httpRequestsTotal.add(1, {
        method: request.method,
        status: statusCode.toString(),
        route: request.routerPath || request.url,
      });

      httpRequestDuration.record(duration, {
        method: request.method,
        status: statusCode.toString(),
        route: request.routerPath || request.url,
      });

      // Update span
      if (request.span) {
        request.span.setAttributes({
          'http.status_code': statusCode,
          'http.response.size': payload ? Buffer.byteLength(payload.toString()) : 0,
        });

        if (statusCode >= 400) {
          request.span.setStatus({ code: 2, message: `HTTP ${statusCode}` });
        }

        request.span.end();
      }

      // Log the request
      logger.info({
        method: request.method,
        url: request.url,
        statusCode,
        duration,
        traceId: request.traceId,
        requestId: request.id,
        userAgent: request.headers['user-agent'],
        ip: request.ip,
      }, 'HTTP request completed');

      return payload;
    });
  }

  private setupRoutes(): void {
    if (!this.fastify) return;

    // Health check with metrics
    this.fastify.get('/health', async (request, reply) => {
      // Use context API for proper span parenting
      const activeContext = request.span ? trace.setSpan(context.active(), request.span) : context.active();
      
      const span = this.tracer.startSpan('health_check', {}, activeContext);
      
      try {
        const health = {
          status: 'healthy',
          service: this.config.serviceName,
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          version: process.version,
        };

        span.setAttributes({
          'health.status': 'healthy',
          'health.uptime': process.uptime(),
        });

        return health;
      } finally {
        span.end();
      }
    });

    // Metrics endpoint (for Prometheus scraping)
    this.fastify.get('/metrics', async (request, reply) => {
      // This will be handled by the Prometheus exporter
      reply.redirect('/metrics');
    });

    // Users API endpoints with telemetry
    this.fastify.get('/api/users', async (request, reply) => {
      // Use context API for proper span parenting
      const activeContext = request.span ? trace.setSpan(context.active(), request.span) : context.active();
      
      const span = this.tracer.startSpan('get_all_users', {}, activeContext);

      try {
        const users = await this.userStore.findAll(span);

        const response: ApiResponse<User[]> = {
          success: true,
          data: users,
          meta: {
            requestId: request.id,
            timestamp: new Date().toISOString(),
            traceId: request.traceId,
          },
        };

        return response;
      } finally {
        span.end();
      }
    });

    this.fastify.get<{ Params: { id: string } }>('/api/users/:id', async (request, reply) => {
      const { id } = request.params;
      
      // Use context API for proper span parenting
      const activeContext = request.span ? trace.setSpan(context.active(), request.span) : context.active();
      
      const span = this.tracer.startSpan('get_user_by_id', {}, activeContext);

      try {
        span.setAttributes({ 'user.id': id });

        const user = await this.userStore.findById(id, span);

        if (!user) {
          return reply.status(404).send({
            success: false,
            error: 'User not found',
            meta: {
              requestId: request.id,
              timestamp: new Date().toISOString(),
              traceId: request.traceId,
            },
          });
        }

        const response: ApiResponse<User> = {
          success: true,
          data: user,
          meta: {
            requestId: request.id,
            timestamp: new Date().toISOString(),
            traceId: request.traceId,
          },
        };

        return response;
      } finally {
        span.end();
      }
    });

    this.fastify.post<{ Body: CreateUserRequest }>('/api/users', async (request, reply) => {
      const userData = request.body;

      // Use context API for proper span parenting
      const activeContext = request.span ? trace.setSpan(context.active(), request.span) : context.active();
      
      const span = this.tracer.startSpan('create_user', {}, activeContext);

      try {
        if (!userData.name || !userData.email) {
          return reply.status(400).send({
            success: false,
            error: 'Name and email are required',
            meta: {
              requestId: request.id,
              timestamp: new Date().toISOString(),
              traceId: request.traceId,
            },
          });
        }

        span.setAttributes({
          'user.name': userData.name,
          'user.email': userData.email,
        });

        const user = await this.userStore.create(userData, span);

        const response: ApiResponse<User> = {
          success: true,
          data: user,
          meta: {
            requestId: request.id,
            timestamp: new Date().toISOString(),
            traceId: request.traceId,
          },
        };

        return reply.status(201).send(response);
      } finally {
        span.end();
      }
    });

    // Additional endpoints would follow similar pattern...
  }

  private setupErrorHandling(): void {
    if (!this.fastify) return;

    this.fastify.setErrorHandler(async (error, request, reply) => {
      const traceId = request.traceId || 'unknown';

      logger.error({
        error: (error as Error).message,
        stack: (error as Error).stack,
        traceId,
        requestId: request.id,
        method: request.method,
        url: request.url,
      }, 'Unhandled error occurred');

      if (request.span) {
        request.span.recordException(error as Error);
        request.span.setStatus({ code: 2, message: (error as Error).message });
      }

      const errorResponse: ApiResponse<never> = {
        success: false,
        error: 'Internal Server Error',
        meta: {
          requestId: request.id,
          timestamp: new Date().toISOString(),
          traceId,
        },
      };

      reply.status(500).send(errorResponse);
    });
  }

  async start(): Promise<void> {
    if (!this.fastify) {
      throw new Error('Fastify instance not initialized');
    }

    try {
      await this.fastify.listen({
        port: this.config.port,
        host: '0.0.0.0',
      });

      console.log('🚀 ==========================================');
      console.log(`✅ Server running on port ${this.config.port}`);
      console.log(`📊 Metrics: http://localhost:${defaultOtelConfig.prometheusPort}/metrics`);
      console.log(`🔍 Health: http://localhost:${this.config.port}/health`);
      console.log(`👥 API: http://localhost:${this.config.port}/api/users`);
      console.log('🚀 ==========================================');
    } catch (error) {
      logger.error({ error: (error as Error).message }, 'Failed to start server');
      process.exit(1);
    }
  }

  async shutdown(): Promise<void> {
    try {
      if (this.fastify) {
        await this.fastify.close();
      }
      await otelSDK.shutdown();
      console.log('🛑 Server and telemetry shutdown completed');
    } catch (error) {
      console.error('Error during shutdown:', error);
      process.exit(1);
    }
  }
}

// Application entry point
async function main(): Promise<void> {
  const config = {
    serviceName: defaultOtelConfig.serviceName,
    port: parseInt(process.env.PORT || '3001', 10),
  };

  const app = new TelemetryFastifyApp(config);

  // Graceful shutdown
  const gracefulShutdown = async () => {
    console.log('\n🔄 Shutting down gracefully...');
    await app.shutdown();
  };

  process.on('SIGINT', gracefulShutdown);
  process.on('SIGTERM', gracefulShutdown);

  await app.initialize();
  await app.start();
}

// Extend FastifyRequest interface for TypeScript
declare module 'fastify' {
  interface FastifyRequest {
    startTime: number;
    span?: any;
    traceId?: string;
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Failed to start application:', error);
    process.exit(1);
  });
}

export { TelemetryFastifyApp };
