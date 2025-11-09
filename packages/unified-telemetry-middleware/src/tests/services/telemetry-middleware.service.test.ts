/**
 * Test suite for TelemetryMiddlewareService
 */

import { TelemetryMiddlewareService } from '../../services/telemetry-middleware.service';
import {  NoOpUnifiedTelemetryProvider } from '@inh-lib/unified-telemetry-core';
import type { UnifiedHttpContext, UnifiedMiddleware } from '@inh-lib/unified-route';
import { composeMiddleware, getRegistryItem, addRegistryItem } from '@inh-lib/unified-route';




// Mock context factory
const createMockContext = (overrides: Partial<UnifiedHttpContext> & { request?: Partial<UnifiedHttpContext['request']>; response?: Partial<UnifiedHttpContext['response']> } = {}): UnifiedHttpContext => {
  const reqOverrides = (overrides.request ?? {}) as Partial<UnifiedHttpContext['request']>;
  const resOverrides = (overrides.response ?? {}) as Partial<UnifiedHttpContext['response']>;

  return {
    request: {
      body: reqOverrides.body ?? {},
      params: reqOverrides.params ?? {},
      query: reqOverrides.query ?? {},
      headers: reqOverrides.headers ?? {},
      method: reqOverrides.method ?? 'GET',
      url: reqOverrides.url ?? '/test',
      route: reqOverrides.route ?? '/test', // ensure route is always a string
      ip: reqOverrides.ip ?? '127.0.0.1',
      userAgent: reqOverrides.userAgent ?? 'test-agent',
    },
    response: {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      send: jest.fn(),
      header: jest.fn().mockReturnThis(),
      redirect: jest.fn(),
      ...resOverrides,
      sent: resOverrides.sent ?? false,
    },
    registry: {},
    ...overrides,
  };
};

describe('TelemetryMiddlewareService', () => {
  let telemetryService: TelemetryMiddlewareService;
  let telemetryProvider: NoOpUnifiedTelemetryProvider;
  let telemetryMiddleware: UnifiedMiddleware;

  beforeEach(() => {
    // Create NoOp provider for testing
    telemetryProvider = new NoOpUnifiedTelemetryProvider({
      serviceName: 'test-service',
      serviceVersion: '1.0.0',
      environment: 'development',
    });

    // Create telemetry service
    telemetryService = new TelemetryMiddlewareService(telemetryProvider, {
      serviceName: 'test-service',
      serviceVersion: '1.0.0',
      enableMetrics: true,
      enableTracing: true,
      enableResourceTracking: true,
      enableTraceExtraction: true,
      enableCorrelationId: true,
      enableSystemMetrics: false, // Disable for testing
      enableRegistryCleanup: false, // Disable cleanup for testing
      
    });

    // Create middleware
    telemetryMiddleware = telemetryService.createMiddleware();
  });

  afterEach(async () => {
    await telemetryService.shutdown();
  });

  describe('createMiddleware', () => {
    it('should create middleware function', () => {
      expect(typeof telemetryMiddleware).toBe('function');
    });

    it('should execute next middleware successfully', async () => {
      const context = createMockContext();
      const nextMock = jest.fn().mockResolvedValue(undefined);

      await telemetryMiddleware(context, nextMock);

      expect(nextMock).toHaveBeenCalledTimes(1);
    });

    it('should add telemetry data to registry', async () => {
      const context = createMockContext();
      const nextMock = jest.fn().mockResolvedValue(undefined);

      await telemetryMiddleware(context, nextMock);

      // Check that telemetry data was added to registry
      const span = getRegistryItem(context, 'telemetry:span');
      const logger = getRegistryItem(context, 'telemetry:logger');
      const startTime = getRegistryItem(context, 'telemetry:startTime');
      const traceId = getRegistryItem(context, 'telemetry:traceId');
      const spanId = getRegistryItem(context, 'telemetry:spanId');

      expect(!(span instanceof Error)).toBe(true);
      expect(!(logger instanceof Error)).toBe(true);
      expect(!(startTime instanceof Error)).toBe(true);
      expect(!(traceId instanceof Error)).toBe(true);
      expect(!(spanId instanceof Error)).toBe(true);
    });

    it('should handle middleware errors gracefully', async () => {
      // Create a service with cleanup enabled for this specific test
      const cleanupService = new TelemetryMiddlewareService(telemetryProvider, {
        serviceName: 'test-service',
        enableMetrics: true,
        enableTracing: true,
        enableResourceTracking: true,
        enableTraceExtraction: true,
        enableCorrelationId: true,
        enableSystemMetrics: false,
        enableRegistryCleanup: true, // Enable cleanup for this test
      });
      
      const cleanupMiddleware = cleanupService.createMiddleware();
      const context = createMockContext();
      const error = new Error('Test middleware error');
      const nextMock = jest.fn().mockRejectedValue(error);

      await cleanupMiddleware(context, nextMock);
      expect(context.response.json).toHaveBeenCalledTimes(1);
      expect(context.response.status).toHaveBeenCalledWith(500);

      // Registry should be cleaned up (items set to undefined)
      const span = getRegistryItem(context, 'telemetry:span');
      const logger = getRegistryItem(context, 'telemetry:logger');
      
      // After cleanup, these should either be Error (not found) or undefined
      expect(span instanceof Error || span === undefined).toBe(true);
      expect(logger instanceof Error || logger === undefined).toBe(true);
      
      await cleanupService.shutdown();
    });

    it('should extract W3C trace context from headers', async () => {
      const context = createMockContext({
        request: {
          body: {},
          params: {},
          query: {},
          method: 'GET',
          url: '/test',
          route: '/test',
          ip: '127.0.0.1',
          userAgent: 'test-agent',
          headers: {
            'traceparent': '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01',
            'tracestate': 'rojo=00f067aa0ba902b7',
          },
        },
      });
      const nextMock = jest.fn().mockResolvedValue(undefined);

      await telemetryMiddleware(context, nextMock);

      const traceId = getRegistryItem<string>(context, 'telemetry:traceId');
      expect(!(traceId instanceof Error) && traceId).toBe('4bf92f3577b34da6a3ce929d0e0e4736');
    });

    it('should extract B3 trace context from headers', async () => {
      const context = createMockContext({
        request: {
          body: {},
          params: {},
          query: {},
          method: 'GET',
          url: '/test',
          route: '/test',
          ip: '127.0.0.1',
          userAgent: 'test-agent',
          headers: {
            'x-b3-traceid': '4bf92f3577b34da6a3ce929d0e0e4736',
            'x-b3-spanid': '00f067aa0ba902b7',
            'x-b3-sampled': '1',
          },
        },
      });
      const nextMock = jest.fn().mockResolvedValue(undefined);

      await telemetryMiddleware(context, nextMock);

      const traceId = getRegistryItem<string>(context, 'telemetry:traceId');
      expect(!(traceId instanceof Error) && traceId).toBe('4bf92f3577b34da6a3ce929d0e0e4736');
    });

    it('should generate correlation ID when not present', async () => {
      const context = createMockContext();
      const nextMock = jest.fn().mockResolvedValue(undefined);

      await telemetryMiddleware(context, nextMock);

      const requestId = getRegistryItem<string>(context, 'telemetry:requestId');
      expect(!(requestId instanceof Error)).toBe(true);
      if (!(requestId instanceof Error)) {
        expect(requestId).toMatch(/^req_\d+_[a-z0-9]+$/);
      }
    });
  });

  describe('middleware composition', () => {
    it('should work with multiple middlewares', async () => {
      const context = createMockContext();
      
      const middleware1: UnifiedMiddleware = async (ctx, next) => {
        addRegistryItem(ctx, 'middleware1', 'executed');
        await next();
      };

      const middleware2: UnifiedMiddleware = async (ctx, next) => {
        addRegistryItem(ctx, 'middleware2', 'executed');
        await next();
      };

      const handler = async (ctx: UnifiedHttpContext) => {
        addRegistryItem(ctx, 'handler', 'executed');
      };

      const composed = composeMiddleware([
        telemetryMiddleware,
        middleware1,
        middleware2,
      ])(handler);

      await composed(context);

      const middleware1Result = getRegistryItem(context, 'middleware1');
      const middleware2Result = getRegistryItem(context, 'middleware2');
      const handlerResult = getRegistryItem(context, 'handler');

      expect(!(middleware1Result instanceof Error) && middleware1Result).toBe('executed');
      expect(!(middleware2Result instanceof Error) && middleware2Result).toBe('executed');
      expect(!(handlerResult instanceof Error) && handlerResult).toBe('executed');
    });
  });

  describe('getTraceHeaders', () => {
    it('should return empty object when no trace context', () => {
      const context = createMockContext();
      const headers = telemetryService.getTraceHeaders(context);
      expect(headers).toEqual({});
    });

    it('should return trace headers when context exists', async () => {
      const context = createMockContext({
        request: {
          body: {},
          params: {},
          query: {},
          method: 'GET',
          url: '/test',
          route: '/test',
          ip: '127.0.0.1',
          userAgent: 'test-agent',
          headers: {
            'traceparent': '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01',
          },
        },
      });
      const nextMock = jest.fn().mockResolvedValue(undefined);
      

      // Execute middleware to setup context
      await telemetryMiddleware(context, nextMock);

      const headers = telemetryService.getTraceHeaders(context);
      expect(headers).toHaveProperty('traceparent');
    });
  });

  describe('recordCustomMetrics', () => {
    it('should record custom metrics without throwing', () => {
      expect(() => {
        telemetryService.recordCustomMetrics(
          'POST',
          '/api/users',
          201,
          0.15,
          1024,
          0.005
        );
      }).not.toThrow();
    });
  });

  describe('configuration options', () => {
    it('should respect disabled metrics configuration', () => {
      const disabledService = new TelemetryMiddlewareService(telemetryProvider, {
        serviceName: 'test-service',
        enableMetrics: false,
        enableTracing: false,
        enableResourceTracking: false,
        enableTraceExtraction: false,
        enableCorrelationId: false,
      });

      const middleware = disabledService.createMiddleware();
      expect(typeof middleware).toBe('function');
    });

    it('should include custom attributes', () => {
      const customService = new TelemetryMiddlewareService(telemetryProvider, {
        serviceName: 'test-service',
        customAttributes: {
          'deployment.env': 'test',
          'service.framework': 'express',
        },
      });

      const middleware = customService.createMiddleware();
      expect(typeof middleware).toBe('function');
    });
  });

  describe('error handling', () => {
    it('should handle span creation errors gracefully', async () => {
      // Mock provider that throws errors
      const errorProvider = {
        ...telemetryProvider,
        tracer: {
          ...telemetryProvider.tracer,
          startSpan: jest.fn(() => {
            throw new Error('Span creation failed');
          }),
        },
        shutdown: jest.fn().mockResolvedValue(undefined),
      } as NoOpUnifiedTelemetryProvider;

      const errorService = new TelemetryMiddlewareService(errorProvider, {
        serviceName: 'test-service',
        enableRegistryCleanup: false, // Disable cleanup to check registry
      });

      const middleware = errorService.createMiddleware();
      const context = createMockContext();
      const nextMock = jest.fn().mockResolvedValue(undefined);

      // Should not throw even if span creation fails
      await expect(middleware(context, nextMock)).resolves.not.toThrow();
      
      // Should still execute next middleware
      expect(nextMock).toHaveBeenCalledTimes(1);
      
      // Should have stored some telemetry data even with failed span creation
      const span = getRegistryItem(context, 'telemetry:span');
      const logger = getRegistryItem(context, 'telemetry:logger');
      
      // These should exist (no-op implementations) but not be errors
      expect(!(span instanceof Error)).toBe(true);
      expect(!(logger instanceof Error)).toBe(true);
      
      await errorService.shutdown();
    });
  });

  describe('resource tracking', () => {
    const simulateWork = () => new Promise(resolve => setTimeout(resolve, 10));

    it('should track resource usage when enabled', async () => {
      const context = createMockContext();
      const nextMock = jest.fn().mockImplementation(async () => {
        // Simulate some work
        await simulateWork();
      });

      await telemetryMiddleware(context, nextMock);

      // Should have recorded start memory measurement
      const startMemory = getRegistryItem(context, 'telemetry:startMemory');
      expect(!(startMemory instanceof Error)).toBe(true);
    });

    it('should not track resources when disabled', async () => {
      const noResourceService = new TelemetryMiddlewareService(telemetryProvider, {
        serviceName: 'test-service',
        enableResourceTracking: false,
      });

      const middleware = noResourceService.createMiddleware();
        const context = createMockContext();
     
      const nextMock = jest.fn().mockResolvedValue(undefined);
  
      await middleware(context, nextMock);

    
      // Should still work but with minimal resource tracking
      const span = getRegistryItem(context, 'telemetry:span');
      expect(!(span instanceof Error)).toBe(true);

      // Ensure the temporary service is shut down to avoid leaking handles/timers
      await noResourceService.shutdown();
    });
  });
});