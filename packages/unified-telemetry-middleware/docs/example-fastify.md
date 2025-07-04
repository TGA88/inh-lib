/**
 * Fastify integration example with unified-telemetry-middleware
 */

import Fastify, { FastifyRequest, FastifyReply } from 'fastify';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { ConsoleSpanExporter } from '@opentelemetry/sdk-tracing-base';
import { PeriodicExportingMetricReader, ConsoleMetricExporter } from '@opentelemetry/sdk-metrics';
import { OtelProviderService } from '@inh-lib/unified-telemetry-otel';
import { TelemetryMiddlewareService } from '@inh-lib/unified-telemetry-middleware';
import { 
  UnifiedHttpContext, 
  UnifiedMiddleware,
  composeMiddleware,
  sendResponse,
  sendError,
  getRequestBody,
  addRegistryItem,
  getRegistryItem,
} from '@inh-lib/unified-route';
import type { UnifiedTelemetrySpan, UnifiedTelemetryLogger } from '@inh-lib/unified-telemetry-core';

// Initialize OpenTelemetry SDK
const sdk = new NodeSDK({
  serviceName: 'fastify-example',
  serviceVersion: '1.0.0',
  traceExporter: new ConsoleSpanExporter(),
  metricReader: new PeriodicExportingMetricReader({
    exporter: new ConsoleMetricExporter(),
    exportIntervalMillis: 10000,
  }),
});

// Start OpenTelemetry
sdk.start();
console.log('OpenTelemetry started successfully');

// Create telemetry provider
const telemetryProvider = OtelProviderService.createProviderWithConsole(
  {
    config: {
      serviceName: 'fastify-example',
      serviceVersion: '1.0.0',
      environment: 'development',
    },
  },
  sdk
);

// Create telemetry middleware service
const telemetryService = new TelemetryMiddlewareService(telemetryProvider, {
  serviceName: 'fastify-example',
  serviceVersion: '1.0.0',
  enableMetrics: true,
  enableTracing: true,
  enableResourceTracking: true,
  enableTraceExtraction: true,
  enableCorrelationId: true,
  enableSystemMetrics: true,
  customAttributes: {
    'service.framework': 'fastify',
    'deployment.env': 'development',
  },
});

// Create Fastify instance
const fastify = Fastify({ 
  logger: {
    level: 'info',
    transport: {
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    },
  },
});

// Create telemetry middleware
const telemetryMiddleware = telemetryService.createMiddleware();

// Rate limiting middleware example
const rateLimitMiddleware: UnifiedMiddleware = async (context, next) => {
  const ip = context.request.ip || 'unknown';
  const logger = getRegistryItem<UnifiedTelemetryLogger>(context, 'telemetry:logger');
  
  // Simple in-memory rate limiting (use Redis in production)
  const requests = (global as any).requestCounts || new Map();
  const key = `${ip}:${Math.floor(Date.now() / 60000)}`; // per minute
  const count = requests.get(key) || 0;
  
  if (count >= 100) { // 100 requests per minute
    if (!(logger instanceof Error)) {
      logger.warn('Rate limit exceeded', { ip, count });
    }
    return sendError(context, 'Rate limit exceeded', 429);
  }
  
  requests.set(key, count + 1);
  (global as any).requestCounts = requests;
  
  if (!(logger instanceof Error)) {
    logger.debug('Rate limit check passed', { ip, count: count + 1 });
  }
  
  await next();
};

// Database simulation middleware
const dbMiddleware: UnifiedMiddleware = async (context, next) => {
  const logger = getRegistryItem<UnifiedTelemetryLogger>(context, 'telemetry:logger');
  
  // Simulate database connection
  const mockDb = {
    users: {
      findById: async (id: string) => {
        await new Promise(resolve => setTimeout(resolve, Math.random() * 50));
        return {
          id,
          name: `User ${id}`,
          email: `user${id}@example.com`,
          createdAt: new Date().toISOString(),
        };
      },
      create: async (userData: any) => {
        await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
        return {
          id: `user_${Date.now()}`,
          ...userData,
          createdAt: new Date().toISOString(),
        };
      },
    },
  };
  
  addRegistryItem(context, 'db', mockDb);
  
  if (!(logger instanceof Error)) {
    logger.debug('Database connection established');
  }
  
  await next();
};

// Route handlers
const getUserHandler = async (context: UnifiedHttpContext) => {
  const db = getRegistryItem<any>(context, 'db');
  const logger = getRegistryItem<UnifiedTelemetryLogger>(context, 'telemetry:logger');
  const span = getRegistryItem<UnifiedTelemetrySpan>(context, 'telemetry:span');
  
  if (db instanceof Error) {
    return sendError(context, 'Database not available', 500);
  }
  
  const userId = context.request.params.id;
  
  if (!(span instanceof Error)) {
    span.setTag('db.operation', 'findById');
    span.setTag('user.id', userId);
  }
  
  if (!(logger instanceof Error)) {
    logger.info('Fetching user from database', { userId });
  }
  
  try {
    const user = await db.users.findById(userId);
    
    if (!(logger instanceof Error)) {
      logger.info('User fetched successfully', { userId, userName: user.name });
    }
    
    sendResponse(context, { user });
  } catch (error) {
    if (!(logger instanceof Error)) {
      logger.error('Failed to fetch user', error, { userId });
    }
    
    if (!(span instanceof Error)) {
      span.recordException(error as Error);
      span.setStatus({ code: 'error', message: (error as Error).message });
    }
    
    sendError(context, 'Failed to fetch user', 500);
  }
};

const createUserHandler = async (context: UnifiedHttpContext) => {
  const db = getRegistryItem<any>(context, 'db');
  const logger = getRegistryItem<UnifiedTelemetryLogger>(context, 'telemetry:logger');
  const span = getRegistryItem<UnifiedTelemetrySpan>(context, 'telemetry:span');
  const body = getRequestBody(context);
  
  if (db instanceof Error) {
    return sendError(context, 'Database not available', 500);
  }
  
  // Validation
  if (!body.name || !body.email) {
    if (!(logger instanceof Error)) {
      logger.warn('User creation validation failed', { body });
    }
    return sendError(context, 'Name and email are required', 400);
  }
  
  if (!(span instanceof Error)) {
    span.setTag('db.operation', 'create');
    span.setTag('user.email', body.email);
  }
  
  if (!(logger instanceof Error)) {
    logger.info('Creating new user', { email: body.email, name: body.name });
  }
  
  try {
    const newUser = await db.users.create({
      name: body.name,
      email: body.email,
    });
    
    if (!(logger instanceof Error)) {
      logger.info('User created successfully', { userId: newUser.id });
    }
    
    sendResponse(context, { user: newUser }, 201);
  } catch (error) {
    if (!(logger instanceof Error)) {
      logger.error('Failed to create user', error, { email: body.email });
    }
    
    if (!(span instanceof Error)) {
      span.recordException(error as Error);
      span.setStatus({ code: 'error', message: (error as Error).message });
    }
    
    sendError(context, 'Failed to create user', 500);
  }
};

const metricsHandler = async (context: UnifiedHttpContext) => {
  const logger = getRegistryItem<UnifiedTelemetryLogger>(context, 'telemetry:logger');
  
  if (!(logger instanceof Error)) {
    logger.info('Metrics endpoint accessed');
  }
  
  // In a real application, you'd export Prometheus metrics here
  const metrics = {
    message: 'Metrics would be exported here in Prometheus format',
    timestamp: new Date().toISOString(),
    service: 'fastify-example',
  };
  
  context.response.header('Content-Type', 'text/plain');
  context.response.send('# Metrics endpoint - configure with Prometheus exporter');
};

// Fastify adapter function
const createFastifyAdapter = (handler: (context: UnifiedHttpContext) => Promise<void>) => {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const context: UnifiedHttpContext = {
      request: {
        body: request.body as Record<string, unknown> || {},
        params: request.params as Record<string, string> || {},
        query: request.query as Record<string, string | string[]> || {},
        headers: request.headers as Record<string, string>,
        method: request.method,
        url: request.url,
        ip: request.ip,
        userAgent: request.headers['user-agent'],
      },
      response: {
        status: (code: number) => { reply.status(code); return context.response; },
        json: <T>(data: T) => reply.send(data),
        send: (data: string) => reply.send(data),
        header: (name: string, value: string) => { reply.header(name, value); return context.response; },
        redirect: (url: string) => reply.redirect(url),
      },
      registry: {},
    };

    try {
      await handler(context);
    } catch (error) {
      request.log.error('Unhandled error in request:', error);
      if (!reply.sent) {
        reply.status(500).send({ error: 'Internal server error' });
      }
    }
  };
};

// Register routes with different middleware combinations
fastify.get('/health', createFastifyAdapter(
  composeMiddleware([telemetryMiddleware])((context) => {
    sendResponse(context, {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'fastify-example',
      version: '1.0.0',
    });
  })
));

fastify.get('/users/:id', createFastifyAdapter(
  composeMiddleware([
    telemetryMiddleware,
    rateLimitMiddleware,
    dbMiddleware,
  ])(getUserHandler)
));

fastify.post('/users', createFastifyAdapter(
  composeMiddleware([
    telemetryMiddleware,
    rateLimitMiddleware,
    dbMiddleware,
  ])(createUserHandler)
));

fastify.get('/metrics', createFastifyAdapter(
  composeMiddleware([telemetryMiddleware])(metricsHandler)
));

// Error handler
fastify.setErrorHandler((error, request, reply) => {
  request.log.error('Fastify error handler:', error);
  
  if (!reply.sent) {
    reply.status(500).send({
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

// Start server
const start = async () => {
  try {
    const PORT = process.env.PORT || 3001;
    await fastify.listen({ port: Number(PORT), host: '0.0.0.0' });
    
    console.log(`Fastify server running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
    console.log(`Get user: http://localhost:${PORT}/users/123`);
    console.log(`Create user: POST http://localhost:${PORT}/users`);
    console.log(`Metrics: http://localhost:${PORT}/metrics`);
  } catch (error) {
    fastify.log.error('Error starting server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
const shutdown = async () => {
  console.log('Shutting down gracefully...');
  
  try {
    // Close Fastify server
    await fastify.close();
    console.log('Fastify server closed');

    // Shutdown telemetry
    await telemetryService.shutdown();
    console.log('Telemetry shutdown completed');

    // Shutdown OpenTelemetry SDK
    await sdk.shutdown();
    console.log('OpenTelemetry SDK shutdown completed');

    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  fastify.log.error('Uncaught exception:', error);
  shutdown();
});

process.on('unhandledRejection', (reason, promise) => {
  fastify.log.error('Unhandled rejection at:', promise, 'reason:', reason);
  shutdown();
});

// Start the server
start();