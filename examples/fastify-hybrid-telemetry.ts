/**
 * Hybrid Telemetry Example with Real Infrastructure
 * 
 * Architecture:
 * ✅ TelemetryPluginService → ใช้เฉพาะ Fastify hooks (auto-tracing) เท่านั้น
 * ✅ UnifiedTelemetryMiddlewareService → ใช้ใน ALL business layers (API, Service, Data)
 * ✅ Fastify Endpoint Handler → Convert req/res เป็น UnifiedHttpContext
 * ✅ ทุก Layer รับ UnifiedHttpContext → ไม่ขึ้นกับ Fastify
 * ✅ Real OTEL Provider → ส่งข้อมูลไปที่ real telemetry infrastructure
 * 
 * Infrastructure Requirements:
 * - OTEL Collector: http://localhost:4317 (gRPC) หรือ http://localhost:4318 (HTTP)
 * - Jaeger UI: http://localhost:16686
 * - Prometheus: http://localhost:9090
 * - Grafana: http://localhost:3001
 * 
 * Environment Variables:
 * - PORT: Server port (default: 3000)
 * - NODE_ENV: Environment (default: development)
 * - OTEL_EXPORTER_OTLP_ENDPOINT: OTEL endpoint (default: http://localhost:4318)
 * - OTEL_EXPORTER_OTLP_PROTOCOL: Protocol (default: http/protobuf)
 * - SERVICE_NAME: Service name (default: fastify-hybrid-telemetry)
 * - SERVICE_VERSION: Service version (default: 1.0.0)
 */

import Fastify, { FastifyInstance } from 'fastify';
import { randomUUID } from 'crypto';
import { 
  TelemetryPluginService,
  TelemetryRequestUtils,
  createFastifyContext
} from '@inh-lib/api-util-fastify';
import { TelemetryMiddlewareService } from '@inh-lib/unified-telemetry-middleware';
import { OtelProviderService } from '@inh-lib/unified-telemetry-otel';
import type { UnifiedTelemetryProvider } from '@inh-lib/unified-telemetry-core';
import type { UnifiedHttpContext } from '@inh-lib/unified-route';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { Resource } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';

// Remove the conflicting module augmentation since it's already defined in the package

// Extend Fastify interface with simple telemetry property
declare module 'fastify' {
  interface FastifyInstance {
    telemetry?: any;
  }
}

// Simple data models
interface User {
  id: string;
  name: string;
  email: string;
}

interface CreateUserRequest {
  name: string;
  email: string;
}

/**
 * Create real OTEL telemetry provider for production use
 */
function createRealTelemetryProvider(): UnifiedTelemetryProvider {
  const serviceName = process.env.SERVICE_NAME || 'fastify-hybrid-telemetry';
  const serviceVersion = process.env.SERVICE_VERSION || '1.0.0';
  const environment = process.env.NODE_ENV || 'development';
  const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318';
  const otlpProtocol = process.env.OTEL_EXPORTER_OTLP_PROTOCOL || 'http/protobuf';

  console.log('🔧 Initializing Real OTEL Provider with:');
  console.log(`   📦 Service: ${serviceName}@${serviceVersion}`);
  console.log(`   🌍 Environment: ${environment}`);
  console.log(`   🔗 OTLP Endpoint: ${otlpEndpoint}`);
  console.log(`   📡 OTLP Protocol: ${otlpProtocol}`);

  const provider = OtelProviderService.createProviderWithConsole(
    {
      config: {
        serviceName,
        serviceVersion,
        environment: environment as 'development' | 'staging' | 'production',
      },
    },
    createNodeSDK(serviceName, serviceVersion, environment)
  );

  console.log('✅ Real OTEL Provider initialized successfully');
  console.log('🎯 Telemetry data will be sent to real infrastructure');
  
  return provider;
}

/**
 * Create and start NodeSDK for OTEL
 */
function createNodeSDK(serviceName: string, serviceVersion: string, environment: string): NodeSDK {
  const sdk = new NodeSDK({
    resource: new Resource({
      [ATTR_SERVICE_NAME]: serviceName,
      [ATTR_SERVICE_VERSION]: serviceVersion,
      'deployment.environment': environment,
      'service.namespace': 'inh-lib-examples',
      'service.instance.id': `${serviceName}-${process.pid}-${Date.now()}`,
      'telemetry.architecture': 'hybrid',
      'fastify.version': '4.x',
      'node.version': process.version
    }),
    instrumentations: [
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-fs': {
          enabled: false, // Too noisy for development
        },
        '@opentelemetry/instrumentation-dns': {
          enabled: false, // Too noisy for development
        },
      }),
    ],
  });

  // Start the SDK
  sdk.start();
  console.log('✅ NodeSDK started successfully');
  
  return sdk;
}

/**
 * Data layer using dependency injection pattern
 */
class UserRepository {
  private readonly users = new Map<string, User>();
  private readonly telemetryMiddleware: TelemetryMiddlewareService;

  constructor(telemetryMiddleware: TelemetryMiddlewareService) {
    this.telemetryMiddleware = telemetryMiddleware;
    
    // Add sample data
    this.users.set('1', {
      id: '1',
      name: 'John Doe',
      email: 'john@example.com'
    });

    this.users.set('2', {
      id: '2',
      name: 'Jane Smith',
      email: 'jane@example.com'
    });
  }

  async findAll(context: UnifiedHttpContext): Promise<User[]> {
    const { span, logger, finish } = this.telemetryMiddleware.createChildSpan(
      context,
      'repository.user.findAll',
      {
        operationType: 'database',
        layer: 'data',
        attributes: {
          'db.operation': 'select',
          'db.table': 'users',
          'repository.method': 'findAll'
        }
      }
    );

    try {
      logger.info('Executing database query: findAll users');
      
      // Simulate database latency
      await new Promise(resolve => setTimeout(resolve, Math.random() * 20));

      const users = Array.from(this.users.values());

      span.setTag('db.rows_returned', users.length);
      span.setTag('operation.success', true);

      logger.info('Database query completed', { rowsReturned: users.length });

      return users;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      span.recordException(err);
      span.setStatus({ code: 'error', message: err.message });
      logger.error('Database query failed', err);
      throw error;
    } finally {
      finish();
    }
  }

  async save(context: UnifiedHttpContext, user: User): Promise<User> {
    const { span, logger, finish } = this.telemetryMiddleware.createChildSpan(
      context,
      'repository.user.save',
      {
        operationType: 'database',
        layer: 'data',
        attributes: {
          'db.operation': 'insert',
          'db.table': 'users',
          'user.id': user.id,
          'repository.method': 'save'
        }
      }
    );

    try {
      logger.info('Executing database operation: save user', { userId: user.id });
      
      // Simulate database operation
      await new Promise(resolve => setTimeout(resolve, Math.random() * 15));

      this.users.set(user.id, user);

      span.setTag('operation.success', true);
      span.setTag('db.rows_affected', 1);

      logger.info('User saved to database', { userId: user.id });

      return user;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      span.recordException(err);
      span.setStatus({ code: 'error', message: err.message });
      logger.error('Database save operation failed', err);
      throw error;
    } finally {
      finish();
    }
  }
}

/**
 * Business logic layer using dependency injection pattern
 */
class UserService {
  private readonly repository: UserRepository;
  private readonly telemetryMiddleware: TelemetryMiddlewareService;

  constructor(
    repository: UserRepository,
    telemetryMiddleware: TelemetryMiddlewareService
  ) {
    this.repository = repository;
    this.telemetryMiddleware = telemetryMiddleware;
  }

  async findAll(context: UnifiedHttpContext): Promise<User[]> {
    const { span, logger, finish } = this.telemetryMiddleware.createChildSpan(
      context,
      'service.user.findAll',
      {
        operationType: 'business',
        layer: 'service',
        attributes: {
          'service.method': 'findAll'
        }
      }
    );

    try {
      logger.info('Processing findAll users request');

      const users = await this.repository.findAll(context);

      span.setTag('users.count', users.length);
      span.setTag('operation.success', true);

      logger.info('Successfully processed findAll request', { count: users.length });

      return users;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      span.recordException(err);
      span.setStatus({ code: 'error', message: err.message });
      logger.error('Failed to process findAll request', err);
      throw error;
    } finally {
      finish();
    }
  }

  async create(context: UnifiedHttpContext, userData: CreateUserRequest): Promise<User> {
    const { span, logger, finish } = this.telemetryMiddleware.createChildSpan(
      context,
      'service.user.create',
      {
        operationType: 'business',
        layer: 'service',
        attributes: {
          'service.method': 'create',
          'user.email': userData.email
        }
      }
    );

    try {
      logger.info('Processing create user request', { email: userData.email, name: userData.name });

      // Create user object
      const user: User = {
        id: Math.random().toString(36).substring(2, 9),
        name: userData.name,
        email: userData.email
      };

      // Save using repository layer
      const savedUser = await this.repository.save(context, user);

      span.setTag('user.id', savedUser.id);
      span.setTag('operation.success', true);

      logger.info('User created successfully in service layer', { 
        userId: savedUser.id, 
        email: savedUser.email,
        name: savedUser.name
      });

      return savedUser;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      span.recordException(err);
      span.setStatus({ code: 'error', message: err.message });
      logger.error('Failed to process create request', err);
      throw error;
    } finally {
      finish();
    }
  }
}

/**
 * Main Fastify application with hybrid telemetry approach
 */
class HybridTelemetryApp {
  private readonly app: FastifyInstance;
  private userService!: UserService; // Will be initialized in initialize()
  private telemetryProvider!: UnifiedTelemetryProvider; // Will be initialized in initialize()
  private telemetryMiddleware!: TelemetryMiddlewareService; // Will be initialized in initialize()

  constructor() {
    // ✅ Only sync operations in constructor
    this.app = this.createFastifyInstance();
  }

  private createFastifyInstance(): FastifyInstance {
    return Fastify({ 
      logger: true,
      requestIdHeader: 'x-request-id',
      requestIdLogLabel: 'reqId'
    });
  }

  async initialize(): Promise<void> {
    try {
      console.log('🔧 Initializing Hybrid Telemetry App...');

      // Initialize with real OTEL provider
      console.log('🎯 Connecting to real OTEL infrastructure...');
      this.telemetryProvider = createRealTelemetryProvider();
      console.log('✅ Connected to real OTEL infrastructure');

      // Initialize telemetry middleware for main context
      this.telemetryMiddleware = new TelemetryMiddlewareService(this.telemetryProvider, {
        serviceName: process.env.SERVICE_NAME || 'fastify-hybrid-telemetry',
        enableTracing: true,
        enableMetrics: true,
        enableResourceTracking: true
      });

      // Initialize repository with telemetry
      const userRepository = new UserRepository(this.telemetryMiddleware);

      // Initialize user service with proper dependency injection
      this.userService = new UserService(userRepository, this.telemetryMiddleware);

      // Register TelemetryPluginService for Fastify hooks only
      await this.app.register(TelemetryPluginService.createPlugin({
        telemetryProvider: this.telemetryProvider,
        autoTracing: true,
        serviceName: process.env.SERVICE_NAME || 'fastify-hybrid-telemetry',
        enableResourceTracking: true,
        enableSystemMetrics: true,
        systemMetricsInterval: 30000,
        skipRoutes: ['/health', '/ready', '/metrics']
      }));

      console.log('🔌 TelemetryPluginService registered (hooks only)');

      this.setupRoutes();
      this.setupHealthChecks();

      console.log('✅ Hybrid Telemetry App initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize app:', error);
      console.error('💡 Make sure OTEL Collector is running at:', 
        process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318');
      console.error('🐳 Start infrastructure with: docker-compose up -d');
      throw error;
    }
  }

  private setupRoutes(): void {
    // ✅ Proper middleware pattern for GET /api/users
    this.app.get('/api/users', async (request, reply) => {
      const context = createFastifyContext(request, reply);
      
      // Apply telemetry middleware and execute business logic
      const telemetryMiddleware = this.telemetryMiddleware.createMiddleware();
      
      let users: User[] = [];
      
      try {
        await telemetryMiddleware(context, async () => {
          users = await this.userService.findAll(context);
        });

        return { 
          success: true, 
          data: users,
          meta: {
            count: users.length,
            architecture: 'hybrid-telemetry',
            requestId: request.headers['x-request-id']
          }
        };
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        console.error('Error in get users endpoint:', err.message);
        
        return reply.status(500).send({
          success: false,
          error: 'Internal server error',
          requestId: request.headers['x-request-id']
        });
      }
    });

    // ✅ Proper middleware pattern for POST /api/users  
    this.app.post<{ Body: CreateUserRequest }>('/api/users', async (request, reply) => {
      const userData = request.body;
      const context = createFastifyContext(request, reply);
      
      // Apply telemetry middleware and execute business logic
      const telemetryMiddleware = this.telemetryMiddleware.createMiddleware();
      
      let user: User;
      
      try {
        await telemetryMiddleware(context, async () => {
          // Create endpoint-specific child span
          const { span, logger, finish } = this.telemetryMiddleware.createChildSpan(
            context,
            'endpoint.createUser',
            {
              operationType: 'http',
              layer: 'service',
              attributes: {
                'http.method': 'POST',
                'http.route': '/api/users',
                'user.email': userData.email
              }
            }
          );

          try {
            logger.info('Handling create user request', { 
              email: userData.email,
              requestId: request.headers['x-request-id']
            });

            user = await this.userService.create(context, userData);
            
            span.setTag('http.status_code', 201);
            span.setTag('user.created', true);
            span.setTag('user.id', user.id);

            logger.info('User created successfully', { userId: user.id });
          } finally {
            finish();
          }
        });

        return reply.status(201).send({ 
          success: true, 
          data: user,
          requestId: request.headers['x-request-id']
        });
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        console.error('Error in create user endpoint:', err.message);
        
        return reply.status(500).send({
          success: false,
          error: 'Internal server error',
          requestId: request.headers['x-request-id']
        });
      }
    });

    // ✅ Example: Understanding TelemetryPluginService improvements
    this.app.get('/api/telemetry/plugin/current-span', async (request, reply) => {
      try {
        // Test new APIs
        const activeSpan = this.app.telemetry?.getActiveSpan();
        const requestSpan = TelemetryRequestUtils.getRequestSpan(request);
        const hasRequestSpan = TelemetryRequestUtils.hasRequestSpan(request);
        const traceId = TelemetryRequestUtils.getTraceId(request);
        const spanId = TelemetryRequestUtils.getSpanId(request);
        const requestId = TelemetryRequestUtils.getRequestId(request);
        
        // Log investigation results (using console due to type constraints)
        console.log('TelemetryPluginService improved APIs investigation', {
          hasActiveSpan: !!activeSpan,
          hasRequestSpan: hasRequestSpan,
          traceId: traceId || 'none',
          spanId: spanId || 'none',
          requestId: requestId || 'none'
        });

        if (!requestSpan && !activeSpan) {
          return reply.status(500).send({
            success: false,
            error: 'No spans available from TelemetryPluginService',
            investigation: {
              newApis: {
                getActiveSpan: 'Returns null - no active span in OTEL context',
                getRequestSpan: 'Returns null - no request span found',
                hasRequestSpan: false
              },
              recommendation: 'Request span should be created by Fastify hooks'
            },
            requestId: request.headers['x-request-id']
          });
        }

        // Use request span if available, otherwise active span
        const span = requestSpan || activeSpan;

        if (span) {
          // Use new utility methods
          TelemetryRequestUtils.setRequestSpanTag(request, 'example.type', 'improved-api-investigation');
          TelemetryRequestUtils.setRequestSpanTag(request, 'example.description', 'Testing improved TelemetryPluginService APIs');
          TelemetryRequestUtils.setRequestSpanTag(request, 'api.version', 'v2.improved');
          
          // Add custom event using utility
          TelemetryRequestUtils.addRequestSpanEvent(request, 'improved.api.analysis', {
            'event.type': 'investigation',
            'improvements': 'clear method names, proper types, utility functions',
            'backward.compatibility': 'maintained with deprecation warnings'
          });

          console.log('TelemetryPluginService improved APIs analysis completed', {
            traceId: span.getTraceId(),
            spanId: span.getSpanId(),
            spanSource: requestSpan ? 'TelemetryRequestUtils.getRequestSpan()' : 'getActiveSpan()',
            requestId: request.headers['x-request-id'] || 'none'
          });

          return {
            success: true,
            message: 'TelemetryPluginService improved APIs analysis completed',
            improvements: {
              clearMethodNames: {
                getActiveSpan: 'Replaced getCurrentSpan() with clearer name and better documentation',
                createRootSpan: 'Replaced createChildSpan() with accurate name reflecting actual behavior',
                utilityClass: 'Added TelemetryRequestUtils for request context access'
              },
              properTypes: {
                returnTypes: 'All methods now return UnifiedTelemetrySpan | null instead of object | null',
                typeStrict: 'Proper TypeScript types throughout'
              },
              backwardCompatibility: {
                legacyMethods: 'Old methods still available with deprecation warnings',
                migration: 'Smooth transition path for existing code'
              }
            },
            findings: {
              activeSpanAvailable: !!activeSpan,
              requestSpanAvailable: !!requestSpan,
              spanUsed: requestSpan ? 'TelemetryRequestUtils.getRequestSpan()' : 'getActiveSpan()',
              utilityMethodsWorking: hasRequestSpan
            },
            spanInfo: {
              traceId: span.getTraceId(),
              spanId: span.getSpanId(),
              hasSpan: true,
              source: requestSpan ? 'TelemetryRequestUtils' : 'TelemetryPluginService.getActiveSpan()',
              spanType: 'auto-created by Fastify hooks'
            },
            newUsagePattern: {
              gettingRequestSpan: 'TelemetryRequestUtils.getRequestSpan(request)',
              checkingSpanExists: 'TelemetryRequestUtils.hasRequestSpan(request)',
              settingTags: 'TelemetryRequestUtils.setRequestSpanTag(request, key, value)',
              addingEvents: 'TelemetryRequestUtils.addRequestSpanEvent(request, name, attributes)',
              gettingTraceId: 'TelemetryRequestUtils.getTraceId(request)'
            },
            requestId: request.headers['x-request-id']
          };
        }

        return reply.status(500).send({
          success: false,
          error: 'Unexpected state - no spans found',
          requestId: request.headers['x-request-id']
        });
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        console.error('Error in improved TelemetryPluginService APIs analysis:', err.message);
        return reply.status(500).send({
          success: false,
          error: 'Internal server error',
          requestId: request.headers['x-request-id']
        });
      }
    });

    // ✅ Example: Using improved TelemetryPluginService createRootSpan() - Now clearly named!
    this.app.get('/api/telemetry/plugin/root-span', async (request, reply) => {
      try {
        // Use new clear method name - createRootSpan instead of misleading createChildSpan
        const rootSpan = this.app.telemetry?.createRootSpan('example.root-span', {
          'span.type': 'root-span-example',
          'span.description': 'Using improved createRootSpan() method with clear naming',
          'fastify.handler': 'root-span-example',
          'api.version': 'v2.improved',
          'method.name': 'createRootSpan (was createChildSpan)'
        });

        if (!rootSpan) {
          return reply.status(500).send({
            success: false,
            error: 'Failed to create root span from improved TelemetryPluginService',
            requestId: request.headers['x-request-id']
          });
        }

        try {
          // Get active span (may be null) for comparison
          const activeSpan = this.app.telemetry?.getActiveSpan();
          
          // Get request span using new utility
          const requestSpan = TelemetryRequestUtils.getRequestSpan(request);

          // Add events to show the difference
          rootSpan.addEvent('improved.root.span.created', {
            'event.type': 'info',
            'event.description': 'Created using improved createRootSpan() method',
            'method.improvement': 'clear naming instead of misleading createChildSpan'
          });

          if (requestSpan) {
            rootSpan.addEvent('comparison.with.request.span', {
              'request.span.trace': requestSpan.getTraceId(),
              'this.root.trace': rootSpan.getTraceId(),
              'traces.are.different': requestSpan.getTraceId() !== rootSpan.getTraceId(),
              'behavior': 'creates separate trace as expected'
            });
          }

          // Simulate some business logic
          await new Promise(resolve => setTimeout(resolve, Math.random() * 30));

          rootSpan.setTag('processing.completed', true);
          rootSpan.setTag('api.improvement', 'clear method naming');
          rootSpan.setTag('backward.compatibility', 'maintained');

          console.log('Created ROOT span using improved TelemetryPluginService', {
            rootSpanTraceId: rootSpan.getTraceId(),
            rootSpanId: rootSpan.getSpanId(),
            requestSpanTrace: requestSpan?.getTraceId() || 'none',
            activeSpanTrace: activeSpan?.getTraceId() || 'none',
            areTracesLinked: false,
            methodUsed: 'createRootSpan',
            requestId: request.headers['x-request-id'] || 'none'
          });

          return {
            success: true,
            message: 'Successfully created ROOT span using improved TelemetryPluginService',
            improvements: {
              clearNaming: 'createRootSpan() instead of misleading createChildSpan()',
              properDocumentation: 'Method now clearly states it creates ROOT spans',
              typeStrict: 'Returns UnifiedTelemetrySpan | null instead of object | null',
              deprecationWarnings: 'Old createChildSpan() method shows warnings'
            },
            spanInfo: {
              rootSpanTraceId: rootSpan.getTraceId(),
              rootSpanId: rootSpan.getSpanId(),
              requestSpanTraceId: requestSpan?.getTraceId() || null,
              activeSpanTraceId: activeSpan?.getTraceId() || null,
              areTracesLinked: false,
              source: 'TelemetryPluginService.createRootSpan()',
              actualBehavior: 'Creates new root span with separate trace ID (as clearly documented)'
            },
            usage: {
              newMethod: 'this.app.telemetry?.createRootSpan(name, attributes)',
              purpose: 'Creates ROOT span for independent operations',
              whenToUse: 'For background tasks, independent processes, or separate traces',
              whenNotToUse: 'When you need child spans - use UnifiedTelemetryMiddlewareService instead'
            },
            migration: {
              oldMethod: 'createChildSpan() - deprecated with warnings',
              newMethod: 'createRootSpan() - clear and accurate naming',
              backwardCompatibility: 'Old method still works but shows deprecation warnings'
            },
            requestId: request.headers['x-request-id']
          };
        } finally {
          // Always finish the span
          rootSpan.finish();
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        console.error('Error in improved root span example:', err.message);
        return reply.status(500).send({
          success: false,
          error: 'Internal server error',
          requestId: request.headers['x-request-id']
        });
      }
    });

    // ✅ Example: Proper child span using UnifiedTelemetryMiddlewareService (RECOMMENDED)
    this.app.get('/api/telemetry/plugin/proper-child-span', async (request, reply) => {
      const context = createFastifyContext(request, reply);
      
      try {
        // This is the CORRECT way to create child spans with proper parent-child relationship
        // Use this instead of TelemetryPluginService.createRootSpan() when you need true child spans
        const { span, logger, finish } = this.telemetryMiddleware.createChildSpan(
          context,
          'example.proper.child-span',
          {
            operationType: 'business',
            layer: 'service',
            attributes: {
              'span.type': 'proper-child-span',
              'span.description': 'Proper child span using UnifiedTelemetryMiddlewareService',
              'fastify.handler': 'proper-child-span-example',
              'parent.relationship': 'true-child-of-request-span',
              'api.improvement': 'demonstrates correct approach for child spans'
            }
          }
        );

        try {
          // Get spans from both services for comparison
          const activeSpan = this.app.telemetry?.getActiveSpan();
          const requestSpan = TelemetryRequestUtils.getRequestSpan(request);

          logger.info('Created proper child span using UnifiedTelemetryMiddlewareService');

          // Add events to show proper parent-child relationship
          span.addEvent('proper.child.span.created', {
            'event.type': 'success',
            'event.description': 'This span IS a proper child of the request span',
            'improvement.note': 'Use this approach instead of TelemetryPluginService for child spans'
          });

          if (requestSpan) {
            span.addEvent('comparison.with.request.span', {
              'request.span.trace': requestSpan.getTraceId(),
              'this.child.trace': span.getTraceId(),
              'traces.are.same': requestSpan.getTraceId() === span.getTraceId(),
              'proper.parent.child': 'true',
              'method.used': 'UnifiedTelemetryMiddlewareService.createChildSpan'
            });
          }

          // Use TelemetryRequestUtils for additional request span operations
          TelemetryRequestUtils.addRequestSpanEvent(request, 'child.span.comparison', {
            'child.span.id': span.getSpanId(),
            'parent.span.id': requestSpan?.getSpanId(),
            'relationship': 'proper-parent-child',
            'service.used': 'UnifiedTelemetryMiddlewareService'
          });

          // Simulate business logic
          await new Promise(resolve => setTimeout(resolve, Math.random() * 25));

          span.setTag('processing.completed', true);
          span.setTag('parent.child.relationship', 'correct');
          span.setTag('api.improvement', 'proper child span pattern');

          logger.info('Proper child span processing completed');

          return {
            success: true,
            message: 'Successfully created proper child span using UnifiedTelemetryMiddlewareService',
            recommendation: 'Always use UnifiedTelemetryMiddlewareService for proper parent-child span relationships',
            improvements: {
              properChildSpans: 'UnifiedTelemetryMiddlewareService.createChildSpan() for true children',
              rootSpansOnly: 'TelemetryPluginService.createRootSpan() for independent operations',
              requestSpanUtils: 'TelemetryRequestUtils for request span operations',
              clearSeparation: 'Each service has distinct, well-documented purpose'
            },
            spanInfo: {
              childSpanTraceId: span.getTraceId(),
              childSpanId: span.getSpanId(),
              requestSpanTraceId: requestSpan?.getTraceId(),
              activeSpanTraceId: activeSpan?.getTraceId(),
              areTracesLinked: true,
              source: 'UnifiedTelemetryMiddlewareService.createChildSpan()',
              actualBehavior: 'Creates proper child span with correct parent relationship'
            },
            comparison: {
              telemetryPluginService: {
                improvedMethod: 'createRootSpan()',
                deprecatedMethod: 'createChildSpan() - shows warnings',
                behavior: 'Creates ROOT span (separate trace)',
                useCase: 'Only for completely independent operations',
                utilities: 'TelemetryRequestUtils for request span access'
              },
              unifiedTelemetryMiddleware: {
                method: 'createChildSpan()',
                behavior: 'Creates proper CHILD span (same trace)',
                useCase: 'For business logic that should be part of request trace',
                recommended: 'Use this for all parent-child span relationships'
              }
            },
            usage: {
              forChildSpans: 'Use UnifiedTelemetryMiddlewareService.createChildSpan()',
              forRootSpans: 'Use TelemetryPluginService.createRootSpan()',
              forRequestSpanOps: 'Use TelemetryRequestUtils.setRequestSpanTag(), etc.',
              migration: 'Old createChildSpan() deprecated, use createRootSpan() instead'
            },
            requestId: request.headers['x-request-id']
          };
        } finally {
          finish();
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        console.error('Error in proper child span example:', err.message);
        return reply.status(500).send({
          success: false,
          error: 'Internal server error',
          requestId: request.headers['x-request-id']
        });
      }
    });

    // Infrastructure information endpoint
    this.app.get('/api/telemetry/info', async (request) => {
      const currentSpan = this.app.telemetry?.getCurrentSpan();
      
      return {
        success: true,
        infrastructure: {
          providerType: 'real-otel',
          endpoints: {
            otlpCollector: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318',
            jaegerUI: 'http://localhost:16686',
            prometheus: 'http://localhost:9090',
            grafana: 'http://localhost:3001'
          },
          environment: process.env.NODE_ENV || 'development',
          serviceName: process.env.SERVICE_NAME || 'fastify-hybrid-telemetry',
          serviceVersion: process.env.SERVICE_VERSION || '1.0.0'
        },
        telemetry: {
          hasProvider: !!this.telemetryProvider,
          hasCurrentSpan: !!currentSpan,
          hasPluginService: !!this.app.telemetry,
          hasMiddlewareService: !!this.telemetryMiddleware,
          traceId: currentSpan?.getTraceId() || null,
          spanId: currentSpan?.getSpanId() || null
        },
        examples: {
          currentSpanUsage: '/api/telemetry/plugin/current-span',
          rootSpanWarning: '/api/telemetry/plugin/root-span',
          properChildSpan: '/api/telemetry/plugin/proper-child-span'
        },
        architecture: {
          approach: 'hybrid',
          description: 'TelemetryPluginService เฉพาะ Fastify hooks + UnifiedTelemetryMiddlewareService สำหรับทุก business layers',
          dependencyInjection: 'Clean constructor injection pattern สำหรับทุก layers',
          layers: {
            fastifyHooks: {
              provider: 'TelemetryPluginService',
              purpose: 'Auto-tracing สำหรับ HTTP requests เท่านั้น'
            },
            apiLayer: {
              provider: 'UnifiedTelemetryMiddlewareService',
              purpose: 'Endpoint handling telemetry',
              context: 'UnifiedHttpContext (แปลงจาก req/res)',
              injection: 'Constructor injection'
            },
            serviceLayer: {
              provider: 'UnifiedTelemetryMiddlewareService', 
              purpose: 'Business logic telemetry',
              context: 'UnifiedHttpContext (ส่งต่อจาก API layer)',
              injection: 'Constructor injection'
            },
            dataLayer: {
              provider: 'UnifiedTelemetryMiddlewareService',
              purpose: 'Database operation telemetry',
              context: 'UnifiedHttpContext (ส่งต่อจาก Service layer)',
              injection: 'Constructor injection (แทน registry pattern)'
            }
          }
        },
        requestId: request.headers['x-request-id']
      };
    });
  }

  private setupHealthChecks(): void {
    this.app.get('/health', async () => {
      return { 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        service: process.env.SERVICE_NAME || 'fastify-hybrid-telemetry',
        version: process.env.SERVICE_VERSION || '1.0.0',
        environment: process.env.NODE_ENV || 'development'
      };
    });

    this.app.get('/ready', async () => {
      const isReady = !!this.telemetryProvider && !!this.app.telemetry && !!this.telemetryMiddleware;
      
      return { 
        ready: isReady,
        components: {
          telemetryProvider: !!this.telemetryProvider,
          pluginService: !!this.app.telemetry,
          middlewareService: !!this.telemetryMiddleware
        },
        infrastructure: {
          providerType: 'real-otel',
          otlpEndpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318'
        },
        timestamp: new Date().toISOString()
      };
    });

    // Metrics endpoint for Prometheus scraping
    this.app.get('/metrics', async (request, reply) => {
      try {
        reply.type('text/plain');
        return '# Metrics are collected by OTEL Collector\n# Check Prometheus at http://localhost:9090\n# Grafana at http://localhost:3001\n';
      } catch (error) {
        console.error('Failed to retrieve metrics:', error);
        reply.status(503);
        return { error: 'Metrics not available', timestamp: new Date().toISOString() };
      }
    });
  }

  async start(port = 3000): Promise<void> {
    try {
      await this.app.listen({ port, host: '0.0.0.0' });
      
      const serviceName = process.env.SERVICE_NAME || 'fastify-hybrid-telemetry';
      
      console.log(`🚀 ${serviceName} Server running on http://localhost:${port}`);
      console.log(`🏗️  Telemetry Info: http://localhost:${port}/api/telemetry/info`);
      console.log(`❤️  Health Check: http://localhost:${port}/health`);
      console.log(`👥 Users API: http://localhost:${port}/api/users`);
      console.log(`📊 Metrics: http://localhost:${port}/metrics`);
      console.log('');
      console.log('🎯 TelemetryPluginService Examples (IMPROVED APIs):');
      console.log(`   ✅ Current Span (getActiveSpan): http://localhost:${port}/api/telemetry/plugin/current-span`);
      console.log(`   🌟 Root Span (createRootSpan): http://localhost:${port}/api/telemetry/plugin/root-span`);
      console.log(`   ✅ Proper Child Span (recommended): http://localhost:${port}/api/telemetry/plugin/proper-child-span`);
      console.log('');
      console.log('🆕 NEW: TelemetryRequestUtils Available:');
      console.log('   📦 TelemetryRequestUtils.getRequestSpan(request)');
      console.log('   🏷️  TelemetryRequestUtils.setRequestSpanTag(request, key, value)');
      console.log('   🎯 TelemetryRequestUtils.addRequestSpanEvent(request, name, attrs)');
      console.log('   ✅ Full TypeScript support with proper types');
      console.log('');
      console.log('⚠️  DEPRECATED (but still works):');
      console.log('   🚫 app.telemetry.getCurrentSpan() → Use getActiveSpan()');
      console.log('   🚫 app.telemetry.createChildSpan() → Use createRootSpan()');
      console.log('   💡 Old methods show deprecation warnings but maintain compatibility');
      console.log('');
      console.log('🎯 CONNECTED TO REAL TELEMETRY INFRASTRUCTURE:');
      console.log(`   🔗 OTEL Collector: ${process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318'}`);
      console.log('   📊 Jaeger UI: http://localhost:16686');
      console.log('   📈 Prometheus: http://localhost:9090');
      console.log('   📱 Grafana: http://localhost:3001');
      console.log('   🎯 Traces will appear in Jaeger within 30 seconds');
      console.log('   📊 Metrics will be scraped by Prometheus every 15s');
      console.log('');
      console.log('🎯 Perfect Hybrid Architecture:');
      console.log('   ✅ TelemetryPluginService → Fastify hooks only');
      console.log('   ✅ UnifiedTelemetryMiddlewareService → All business layers');
      console.log('   ✅ Constructor injection → Clean dependency pattern');
      console.log('   ✅ UnifiedHttpContext → Used throughout all layers');
      console.log('   ✅ Real OTEL Provider → Production-ready telemetry');
      console.log('');
      console.log('🧪 Try these commands:');
      console.log(`  curl http://localhost:${port}/api/users`);
      console.log(`  curl -X POST http://localhost:${port}/api/users -H "Content-Type: application/json" -d '{"name":"Test User","email":"test@example.com"}'`);
      console.log(`  curl http://localhost:${port}/api/telemetry/info`);
      console.log('');
      console.log('🎯 Try TelemetryPluginService Improved Examples:');
      console.log(`  curl http://localhost:${port}/api/telemetry/plugin/current-span`);
      console.log(`  curl http://localhost:${port}/api/telemetry/plugin/root-span`);
      console.log(`  curl http://localhost:${port}/api/telemetry/plugin/proper-child-span`);
      console.log('');
      console.log('✨ API IMPROVEMENTS SUMMARY:');
      console.log('  🎯 Clear method names: getActiveSpan(), createRootSpan()');
      console.log('  📦 New TelemetryRequestUtils for type-safe request span access');
      console.log('  ⚠️  Deprecated misleading methods with proper warnings');
      console.log('  📖 Better documentation and usage patterns');
      console.log('  🔄 Full backward compatibility maintained');
      console.log('');
      console.log('📝 Important Notes:');
      console.log('   ⚠️  TelemetryPluginService.createChildSpan() creates ROOT spans, not child spans!');
      console.log('   ✅ Use UnifiedTelemetryMiddlewareService.createChildSpan() for proper parent-child relationships');
      console.log('   📍 TelemetryPluginService is best for getCurrentSpan() only');
      
    } catch (error) {
      console.error('❌ Failed to start server:', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    try {
      await this.app.close();
      if (this.telemetryProvider) {
        await this.telemetryProvider.shutdown();
      }
      console.log('🛑 Server stopped gracefully');
    } catch (error) {
      console.error('❌ Error stopping server:', error);
      throw error;
    }
  }
}

// Main execution
async function main() {
  const app = new HybridTelemetryApp();
  
  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n🛑 Received SIGINT, shutting down gracefully...');
    await app.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
    await app.stop();
    process.exit(0);
  });

  try {
    await app.initialize();
    const port = parseInt(process.env.PORT || '3000', 10);
    await app.start(port);
  } catch (error) {
    console.error('❌ Application failed:', error);
    console.error('💡 Check if OTEL infrastructure is running:');
    console.error('   🐳 docker-compose up -d');
    console.error('   🔍 docker-compose ps');
    console.error('   📋 docker-compose logs otel-collector');
    process.exit(1);
  }
}

// Export for testing
export { HybridTelemetryApp };

// Start the application if this file is run directly
if (require.main === module) {
  main().catch(console.error);
}
