/**
 * Debug test for middleware integration
 */

import { TelemetryMiddlewareService } from '../../services/telemetry-middleware.service';
import { NoOpUnifiedTelemetryProvider } from '@inh-lib/unified-telemetry-core';
import type { UnifiedHttpContext } from '@inh-lib/unified-route';
import { getRegistryItem } from '@inh-lib/unified-route';

// Mock context factory
const createMockContext = (overrides: Partial<UnifiedHttpContext> = {}): UnifiedHttpContext => ({
  request: {
    body: {},
    params: {},
    query: {},
    headers: {},
    method: 'GET',
    url: '/test',
    ip: '127.0.0.1',
    userAgent: 'test-agent',
    ...overrides.request,
  },
  response: {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
    send: jest.fn(),
    header: jest.fn().mockReturnThis(),
    redirect: jest.fn(),
    ...overrides.response,
  },
  registry: {},
  ...overrides,
});

describe('Debug middleware integration', () => {
  let telemetryService: TelemetryMiddlewareService;
  let telemetryProvider: NoOpUnifiedTelemetryProvider;

  beforeEach(() => {
    telemetryProvider = new NoOpUnifiedTelemetryProvider({
      serviceName: 'test-service',
      serviceVersion: '1.0.0',
      environment: 'development',
    });

    telemetryService = new TelemetryMiddlewareService(telemetryProvider, {
      serviceName: 'test-service',
      serviceVersion: '1.0.0',
      enableMetrics: true,
      enableTracing: true,
      enableResourceTracking: true,
      enableTraceExtraction: true,
      enableCorrelationId: true,
      enableSystemMetrics: false,
    });
  });

  afterEach(async () => {
    await telemetryService.shutdown();
  });

  it('should debug middleware trace extraction', async () => {
    const context = createMockContext({
      request: {
        body: {},
        params: {},
        query: {},
        method: 'GET',
        url: '/test',
        ip: '127.0.0.1',
        userAgent: 'test-agent',
        headers: {
          'traceparent': '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01',
          'tracestate': 'rojo=00f067aa0ba902b7',
        },
      },
    });
    
    console.log('Before middleware - context headers:', context.request.headers);

    const middleware = telemetryService.createMiddleware();
    const nextMock = jest.fn().mockResolvedValue(undefined);

    console.log('Registry before middleware:', context.registry);

    await middleware(context, nextMock);

    console.log('Registry after middleware:', context.registry);

    // Check individual registry items
    const span = getRegistryItem(context, 'telemetry:span');
    const logger = getRegistryItem(context, 'telemetry:logger');
    const startTime = getRegistryItem(context, 'telemetry:startTime');
    const traceId = getRegistryItem(context, 'telemetry:traceId');
    const spanId = getRegistryItem(context, 'telemetry:spanId');
    const requestId = getRegistryItem(context, 'telemetry:requestId');

    console.log('Registry items:');
    console.log('  span:', span instanceof Error ? 'ERROR: ' + span.message : 'OK');
    console.log('  logger:', logger instanceof Error ? 'ERROR: ' + logger.message : 'OK');
    console.log('  startTime:', startTime instanceof Error ? 'ERROR: ' + startTime.message : startTime);
    console.log('  traceId:', traceId instanceof Error ? 'ERROR: ' + traceId.message : traceId);
    console.log('  spanId:', spanId instanceof Error ? 'ERROR: ' + spanId.message : spanId);
    console.log('  requestId:', requestId instanceof Error ? 'ERROR: ' + requestId.message : requestId);

    expect(nextMock).toHaveBeenCalledTimes(1);
  });
});
