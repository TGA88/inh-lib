# Fastify Telemetry Plugin for Unified Telemetry Core

## Project Structure

```
src/
├── index.ts                           # Main plugin export
├── services/
│   ├── telemetry-plugin.service.ts    # Main plugin service
│   ├── telemetry-context.service.ts   # Context management service
│   └── telemetry-layer.service.ts     # Layer helpers service
├── constants/
│   └── telemetry.const.ts             # Public constants
└── internal/
    ├── plugins/
    │   └── fastify-telemetry.plugin.ts # Plugin implementation
    ├── middleware/
    │   └── telemetry.middleware.ts     # Request instrumentation
    ├── decorators/
    │   └── request.decorator.ts        # Request decoration
    ├── constants/
    │   └── telemetry.const.ts          # Internal constants
    ├── types/
    │   └── telemetry.types.ts          # Internal types
    ├── logic/
    │   └── telemetry.logic.ts          # Helper functions
    └── utils/
        └── telemetry.utils.ts          # Utility functions
```

## Files Implementation

### src/index.ts
```typescript
/**
 * Fastify Telemetry Plugin for Unified Telemetry Core
 * 
 * This plugin provides OpenTelemetry instrumentation for Fastify applications
 * and converts it to unified telemetry interfaces for consistent usage across layers.
 */

// Service exports only - no types for performance
export { TelemetryPluginService } from './services/telemetry-plugin.service';
export { TelemetryContextService } from './services/telemetry-context.service';
export { TelemetryLayerService } from './services/telemetry-layer.service';
```

### src/constants/telemetry.const.ts
```typescript
/**
 * Public telemetry constants
 * 
 * Constants exposed to consumer projects
 */

export const TELEMETRY_LAYERS = {
  HTTP: 'http',
  SERVICE: 'service', 
  DATA: 'data',
  CORE: 'core',
  INTEGRATION: 'integration',
  CUSTOM: 'custom',
} as const;

export const TELEMETRY_OPERATION_TYPES = {
  HTTP: 'http',
  BUSINESS: 'business',
  DATABASE: 'database',
  UTILITY: 'utility',
  INTEGRATION: 'integration',
  AUTH: 'auth',
  CUSTOM: 'custom',
} as const;
```

### src/services/telemetry-plugin.service.ts
```typescript
import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { 
  UnifiedBaseTelemetryLogger,
  ProviderInitOptions 
} from '@inh-lib/unified-telemetry-core';
import { fastifyTelemetryPlugin } from '../internal/plugins/fastify-telemetry.plugin';
import { createTelemetryPluginOptions } from '../internal/logic/telemetry.logic';

/**
 * Telemetry Plugin Service
 * 
 * Main service for registering telemetry plugin with Fastify
 */
export class TelemetryPluginService {
  /**
   * Register telemetry plugin with Fastify instance
   */
  static async registerPlugin(
    fastify: FastifyInstance,
    providerOptions: ProviderInitOptions,
    baseLogger?: UnifiedBaseTelemetryLogger,
    pluginOptions?: FastifyPluginOptions
  ): Promise<void> {
    const options = createTelemetryPluginOptions(providerOptions, baseLogger, pluginOptions);
    await fastify.register(fastifyTelemetryPlugin, options);
  }

  /**
   * Register plugin with Fastify logger as base logger
   */
  static async registerPluginWithFastifyLogger(
    fastify: FastifyInstance,
    providerOptions: ProviderInitOptions,
    pluginOptions?: FastifyPluginOptions
  ): Promise<void> {
    const fastifyBaseLogger: UnifiedBaseTelemetryLogger = {
      debug: (message: string, attributes?: Record<string, unknown>) => {
        fastify.log.debug(attributes, message);
      },
      info: (message: string, attributes?: Record<string, unknown>) => {
        fastify.log.info(attributes, message);
      },
      warn: (message: string, attributes?: Record<string, unknown>) => {
        fastify.log.warn(attributes, message);
      },
      error: (message: string, attributes?: Record<string, unknown>) => {
        fastify.log.error(attributes, message);
      },
    };

    await this.registerPlugin(fastify, providerOptions, fastifyBaseLogger, pluginOptions);
  }

  /**
   * Register plugin with console logger (development)
   */
  static async registerPluginWithConsole(
    fastify: FastifyInstance,
    providerOptions: ProviderInitOptions,
    pluginOptions?: FastifyPluginOptions
  ): Promise<void> {
    const consoleBaseLogger: UnifiedBaseTelemetryLogger = {
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

    await this.registerPlugin(fastify, providerOptions, consoleBaseLogger, pluginOptions);
  }
}
```

### src/services/telemetry-context.service.ts
```typescript
import { FastifyRequest } from 'fastify';
import { UnifiedLoggerContext } from '@inh-lib/unified-telemetry-core';
import { 
  extractContextFromRequest,
  createLayerContext,
  enrichContextWithRequest
} from '../internal/logic/telemetry.logic';

/**
 * Telemetry Context Service
 * 
 * Service for managing telemetry context across layers
 */
export class TelemetryContextService {
  /**
   * Get telemetry context from Fastify request
   */
  static getContextFromRequest(request: FastifyRequest): UnifiedLoggerContext | undefined {
    return extractContextFromRequest(request);
  }

  /**
   * Create context for specific layer
   */
  static createContextForLayer(
    baseContext: UnifiedLoggerContext,
    layer: string,
    operationName: string,
    operationType?: string,
    attributes?: Record<string, string | number | boolean>
  ): UnifiedLoggerContext {
    return createLayerContext(baseContext, layer, operationName, operationType, attributes);
  }

  /**
   * Create HTTP layer context from request
   */
  static createHttpContext(
    request: FastifyRequest,
    operationName: string
  ): UnifiedLoggerContext {
    const baseContext = this.getContextFromRequest(request);
    if (!baseContext) {
      throw new Error('Telemetry context not found in request. Ensure telemetry plugin is registered.');
    }

    return enrichContextWithRequest(baseContext, request, operationName);
  }

  /**
   * Create service layer context
   */
  static createServiceContext(
    baseContext: UnifiedLoggerContext,
    operationName: string,
    attributes?: Record<string, string | number | boolean>
  ): UnifiedLoggerContext {
    return createLayerContext(baseContext, 'service', operationName, 'business', attributes);
  }

  /**
   * Create data layer context
   */
  static createDataContext(
    baseContext: UnifiedLoggerContext,
    operationName: string,
    attributes?: Record<string, string | number | boolean>
  ): UnifiedLoggerContext {
    return createLayerContext(baseContext, 'data', operationName, 'database', attributes);
  }

  /**
   * Create integration layer context
   */
  static createIntegrationContext(
    baseContext: UnifiedLoggerContext,
    operationName: string,
    attributes?: Record<string, string | number | boolean>
  ): UnifiedLoggerContext {
    return createLayerContext(baseContext, 'integration', operationName, 'integration', attributes);
  }
}
```

### src/services/telemetry-layer.service.ts
```typescript
import { FastifyRequest } from 'fastify';
import { UnifiedTelemetryLogger } from '@inh-lib/unified-telemetry-core';
import { TelemetryContextService } from './telemetry-context.service';
import { createLoggerForLayer } from '../internal/logic/telemetry.logic';

/**
 * Telemetry Layer Service
 * 
 * Service for creating telemetry components for specific layers
 */
export class TelemetryLayerService {
  /**
   * Create logger for HTTP layer (routes)
   */
  static createHttpLogger(
    request: FastifyRequest,
    operationName: string,
    attributes?: Record<string, string | number | boolean>
  ): UnifiedTelemetryLogger {
    const context = TelemetryContextService.createHttpContext(request, operationName);
    const enrichedContext = attributes 
      ? { ...context, attributes: { ...context.attributes, ...attributes } }
      : context;
    
    return createLoggerForLayer(request, enrichedContext);
  }

  /**
   * Create logger for service layer
   */
  static createServiceLogger(
    request: FastifyRequest,
    operationName: string,
    attributes?: Record<string, string | number | boolean>
  ): UnifiedTelemetryLogger {
    const baseContext = TelemetryContextService.getContextFromRequest(request);
    if (!baseContext) {
      throw new Error('Telemetry context not found in request');
    }

    const context = TelemetryContextService.createServiceContext(baseContext, operationName, attributes);
    return createLoggerForLayer(request, context);
  }

  /**
   * Create logger for data layer
   */
  static createDataLogger(
    request: FastifyRequest,
    operationName: string,
    attributes?: Record<string, string | number | boolean>
  ): UnifiedTelemetryLogger {
    const baseContext = TelemetryContextService.getContextFromRequest(request);
    if (!baseContext) {
      throw new Error('Telemetry context not found in request');
    }

    const context = TelemetryContextService.createDataContext(baseContext, operationName, attributes);
    return createLoggerForLayer(request, context);
  }

  /**
   * Create logger for integration layer
   */
  static createIntegrationLogger(
    request: FastifyRequest,
    operationName: string,
    attributes?: Record<string, string | number | boolean>
  ): UnifiedTelemetryLogger {
    const baseContext = TelemetryContextService.getContextFromRequest(request);
    if (!baseContext) {
      throw new Error('Telemetry context not found in request');
    }

    const context = TelemetryContextService.createIntegrationContext(baseContext, operationName, attributes);
    return createLoggerForLayer(request, context);
  }

  /**
   * Create logger for custom layer
   */
  static createCustomLogger(
    request: FastifyRequest,
    layer: string,
    operationName: string,
    operationType?: string,
    attributes?: Record<string, string | number | boolean>
  ): UnifiedTelemetryLogger {
    const baseContext = TelemetryContextService.getContextFromRequest(request);
    if (!baseContext) {
      throw new Error('Telemetry context not found in request');
    }

    const context = TelemetryContextService.createContextForLayer(
      baseContext, 
      layer, 
      operationName, 
      operationType, 
      attributes
    );
    return createLoggerForLayer(request, context);
  }
}
```

### internal/constants/telemetry.const.ts
```typescript
/**
 * Internal telemetry constants
 * 
 * ⚠️ INTERNAL USE ONLY - Not exported in main index
 */

export const PLUGIN_NAME = 'fastify-unified-telemetry';
export const PLUGIN_VERSION = '1.0.0';

export const REQUEST_CONTEXT_KEY = 'telemetryContext';
export const REQUEST_PROVIDER_KEY = 'telemetryProvider';

export const DEFAULT_HTTP_ATTRIBUTES = {
  COMPONENT: 'http-server',
  HTTP_FLAVOR: '1.1',
} as const;

export const SPAN_NAMES = {
  HTTP_REQUEST: 'http-request',
  ROUTE_HANDLER: 'route-handler',
  MIDDLEWARE: 'middleware',
} as const;

export const LOG_EVENTS = {
  REQUEST_START: 'request.start',
  REQUEST_END: 'request.end',
  ERROR: 'error',
  VALIDATION_ERROR: 'validation.error',
} as const;
```

### internal/types/telemetry.types.ts
```typescript
/**
 * Internal telemetry types
 * 
 * ⚠️ INTERNAL USE ONLY - Not exported in main index
 */

import { FastifyPluginOptions } from 'fastify';
import { 
  UnifiedTelemetryProvider,
  UnifiedLoggerContext,
  UnifiedBaseTelemetryLogger,
  ProviderInitOptions
} from '@inh-lib/unified-telemetry-core';

export interface TelemetryPluginOptions extends FastifyPluginOptions {
  providerOptions: ProviderInitOptions;
  baseLogger?: UnifiedBaseTelemetryLogger;
  enableRequestLogging?: boolean;
  enableErrorLogging?: boolean;
  enableMetrics?: boolean;
  skipRoutes?: string[];
  customAttributes?: Record<string, string | number | boolean>;
}

export interface FastifyTelemetryContext {
  provider: UnifiedTelemetryProvider;
  context: UnifiedLoggerContext;
  requestId: string;
  startTime: Date;
}

export interface HttpRequestAttributes {
  method: string;
  url: string;
  userAgent?: string;
  remoteAddress?: string;
  routePath?: string;
  statusCode?: number;
  contentLength?: number;
  responseTime?: number;
}

export interface LayerContextOptions {
  layer: string;
  operationName: string;
  operationType?: string;
  attributes?: Record<string, string | number | boolean>;
}
```

### internal/logic/telemetry.logic.ts
```typescript
/**
 * Internal telemetry logic functions
 * 
 * ⚠️ INTERNAL USE ONLY - Not exported in main index
 */

import { FastifyRequest, FastifyPluginOptions } from 'fastify';
import { 
  UnifiedLoggerContext,
  UnifiedBaseTelemetryLogger,
  UnifiedTelemetryLogger,
  ProviderInitOptions
} from '@inh-lib/unified-telemetry-core';
import { OtelProviderService } from '@inh-lib/unified-telemetry-otel-adapter';
import { TelemetryPluginOptions, FastifyTelemetryContext, HttpRequestAttributes } from '../types/telemetry.types';
import { REQUEST_CONTEXT_KEY, REQUEST_PROVIDER_KEY } from '../constants/telemetry.const';
import { generateRequestId, extractHttpAttributes } from '../utils/telemetry.utils';

/**
 * Create telemetry plugin options
 */
export function createTelemetryPluginOptions(
  providerOptions: ProviderInitOptions,
  baseLogger?: UnifiedBaseTelemetryLogger,
  pluginOptions?: FastifyPluginOptions
): TelemetryPluginOptions {
  return {
    ...pluginOptions,
    providerOptions,
    baseLogger,
    enableRequestLogging: true,
    enableErrorLogging: true,
    enableMetrics: true,
    skipRoutes: ['/health', '/metrics'],
  };
}

/**
 * Create telemetry provider from options
 */
export function createTelemetryProvider(options: TelemetryPluginOptions): any {
  if (options.baseLogger) {
    return OtelProviderService.createProvider(options.providerOptions, options.baseLogger);
  }
  return OtelProviderService.createProviderWithConsole(options.providerOptions);
}

/**
 * Create initial context for HTTP request
 */
export function createInitialHttpContext(
  request: FastifyRequest,
  serviceName: string
): UnifiedLoggerContext {
  const requestId = generateRequestId();
  const httpAttributes = extractHttpAttributes(request);
  
  return {
    traceId: requestId, // Will be overridden by OpenTelemetry
    spanId: requestId, // Will be overridden by OpenTelemetry
    operationType: 'http',
    operationName: `${request.method} ${request.routeOptions?.url || request.url}`,
    layer: 'http',
    attributes: {
      service: serviceName,
      requestId,
      ...httpAttributes,
    },
    startTime: new Date(),
  };
}

/**
 * Extract context from Fastify request
 */
export function extractContextFromRequest(request: FastifyRequest): UnifiedLoggerContext | undefined {
  const telemetryContext = request[REQUEST_CONTEXT_KEY as keyof FastifyRequest] as FastifyTelemetryContext;
  return telemetryContext?.context;
}

/**
 * Create context for specific layer
 */
export function createLayerContext(
  baseContext: UnifiedLoggerContext,
  layer: string,
  operationName: string,
  operationType?: string,
  attributes?: Record<string, string | number | boolean>
): UnifiedLoggerContext {
  return {
    ...baseContext,
    parentSpanId: baseContext.spanId,
    spanId: generateRequestId(), // Will be overridden by OpenTelemetry
    operationType: operationType || baseContext.operationType,
    operationName,
    layer: layer as UnifiedLoggerContext['layer'],
    attributes: {
      ...baseContext.attributes,
      ...attributes,
    },
    startTime: new Date(),
  };
}

/**
 * Enrich context with request information
 */
export function enrichContextWithRequest(
  baseContext: UnifiedLoggerContext,
  request: FastifyRequest,
  operationName: string
): UnifiedLoggerContext {
  const httpAttributes = extractHttpAttributes(request);
  
  return {
    ...baseContext,
    operationName,
    attributes: {
      ...baseContext.attributes,
      ...httpAttributes,
    },
  };
}

/**
 * Create logger for layer using request context
 */
export function createLoggerForLayer(
  request: FastifyRequest,
  context: UnifiedLoggerContext
): UnifiedTelemetryLogger {
  const telemetryContext = request[REQUEST_CONTEXT_KEY as keyof FastifyRequest] as FastifyTelemetryContext;
  if (!telemetryContext) {
    throw new Error('Telemetry context not found in request');
  }

  // Create child logger from provider
  return telemetryContext.provider.logger.createChildLogger(
    context.operationName,
    context.attributes
  );
}

/**
 * Should skip telemetry for route
 */
export function shouldSkipRoute(routePath: string, skipRoutes: string[]): boolean {
  return skipRoutes.some(route => {
    if (route.includes('*')) {
      const pattern = route.replace(/\*/g, '.*');
      return new RegExp(`^${pattern}$`).test(routePath);
    }
    return routePath === route;
  });
}

/**
 * Create span attributes for HTTP request
 */
export function createHttpSpanAttributes(
  request: FastifyRequest,
  statusCode?: number
): Record<string, string | number | boolean> {
  const attributes = extractHttpAttributes(request);
  
  if (statusCode !== undefined) {
    attributes.statusCode = statusCode;
  }

  return {
    'http.method': attributes.method,
    'http.url': attributes.url,
    'http.route': attributes.routePath || 'unknown',
    'http.status_code': attributes.statusCode || 0,
    'user_agent.original': attributes.userAgent || 'unknown',
    'client.address': attributes.remoteAddress || 'unknown',
  };
}
```

### internal/utils/telemetry.utils.ts
```typescript
/**
 * Internal telemetry utilities
 * 
 * ⚠️ INTERNAL USE ONLY - Not exported in main index
 */

import { FastifyRequest } from 'fastify';
import { HttpRequestAttributes } from '../types/telemetry.types';

/**
 * Generate unique request ID
 */
export function generateRequestId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${random}`;
}

/**
 * Extract HTTP attributes from Fastify request
 */
export function extractHttpAttributes(request: FastifyRequest): HttpRequestAttributes {
  return {
    method: request.method,
    url: request.url,
    userAgent: request.headers['user-agent'],
    remoteAddress: request.ip,
    routePath: request.routeOptions?.url,
  };
}

/**
 * Calculate response time in milliseconds
 */
export function calculateResponseTime(startTime: Date): number {
  return Date.now() - startTime.getTime();
}

/**
 * Sanitize route path for metrics
 */
export function sanitizeRoutePath(routePath: string): string {
  return routePath
    .replace(/\/:\w+/g, '/{id}') // Replace :id with {id}
    .replace(/\/\*/g, '/{wildcard}') // Replace /* with {wildcard}
    .replace(/[^a-zA-Z0-9\/\-_{}]/g, '_'); // Replace special chars
}

/**
 * Extract trace ID from request headers
 */
export function extractTraceIdFromHeaders(request: FastifyRequest): string | undefined {
  const headers = [
    'x-trace-id',
    'x-request-id',
    'traceparent',
    'x-correlation-id'
  ];

  for (const header of headers) {
    const value = request.headers[header] as string;
    if (value) {
      if (header === 'traceparent') {
        const parts = value.split('-');
        if (parts.length >= 2) {
          return parts[1];
        }
      }
      return value;
    }
  }

  return undefined;
}

/**
 * Check if request should be logged
 */
export function shouldLogRequest(request: FastifyRequest, skipRoutes: string[]): boolean {
  const routePath = request.routeOptions?.url || request.url;
  return !skipRoutes.some(route => {
    if (route.includes('*')) {
      const pattern = route.replace(/\*/g, '.*');
      return new RegExp(`^${pattern}$`).test(routePath);
    }
    return routePath === route;
  });
}

/**
 * Get content length from request or response
 */
export function getContentLength(headers: Record<string, string | string[] | undefined>): number | undefined {
  const contentLength = headers['content-length'];
  if (typeof contentLength === 'string') {
    const length = parseInt(contentLength, 10);
    return isNaN(length) ? undefined : length;
  }
  return undefined;
}

/**
 * Extract error information for logging
 */
export function extractErrorInfo(error: Error): Record<string, string | number | boolean> {
  return {
    errorName: error.name,
    errorMessage: error.message,
    errorStack: error.stack || 'No stack trace available',
  };
}
```

### internal/plugins/fastify-telemetry.plugin.ts
```typescript
/**
 * Fastify Telemetry Plugin Implementation
 * 
 * ⚠️ INTERNAL USE ONLY - Not exported in main index
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import { TelemetryPluginOptions, FastifyTelemetryContext } from '../types/telemetry.types';
import { 
  createTelemetryProvider,
  createInitialHttpContext,
  shouldSkipRoute,
  createHttpSpanAttributes
} from '../logic/telemetry.logic';
import { REQUEST_CONTEXT_KEY, REQUEST_PROVIDER_KEY, PLUGIN_NAME } from '../constants/telemetry.const';
import { 
  calculateResponseTime,
  sanitizeRoutePath,
  extractErrorInfo
} from '../utils/telemetry.utils';

async function fastifyTelemetryPluginImpl(
  fastify: FastifyInstance,
  options: TelemetryPluginOptions
): Promise<void> {
  // Create telemetry provider
  const provider = createTelemetryProvider(options);

  // Register provider as decorator
  fastify.decorate(REQUEST_PROVIDER_KEY, provider);

  // Add request hook to initialize telemetry context
  fastify.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    const routePath = request.routeOptions?.url || request.url;
    
    // Skip telemetry for specified routes
    if (shouldSkipRoute(routePath, options.skipRoutes || [])) {
      return;
    }

    // Create initial context
    const context = createInitialHttpContext(request, options.providerOptions.config.serviceName);
    
    // Start HTTP span
    const span = provider.tracer.startSpan(`${request.method} ${routePath}`, {
      kind: 'server',
      attributes: createHttpSpanAttributes(request),
    });

    // Create telemetry context
    const telemetryContext: FastifyTelemetryContext = {
      provider,
      context,
      requestId: context.attributes.requestId as string,
      startTime: new Date(),
    };

    // Attach context to request
    (request as Record<string, unknown>)[REQUEST_CONTEXT_KEY] = telemetryContext;

    // Attach span to logger
    provider.logger.attachSpan(span);

    // Log request start
    if (options.enableRequestLogging) {
      provider.logger.info('HTTP request started', {
        method: request.method,
        url: request.url,
        userAgent: request.headers['user-agent'],
        remoteAddress: request.ip,
      });
    }
  });

  // Add response hook to finalize telemetry
  fastify.addHook('onResponse', async (request: FastifyRequest, reply: FastifyReply) => {
    const telemetryContext = (request as Record<string, unknown>)[REQUEST_CONTEXT_KEY] as FastifyTelemetryContext;
    
    if (!telemetryContext) {
      return;
    }

    const responseTime = calculateResponseTime(telemetryContext.startTime);
    const routePath = sanitizeRoutePath(request.routeOptions?.url || request.url);

    // Update span with response information
    const span = provider.tracer.getActiveSpan();
    if (span) {
      span.setTag('http.status_code', reply.statusCode);
      span.setTag('http.response_time', responseTime);
      
      if (reply.statusCode >= 400) {
        span.setStatus({ code: 'error', message: `HTTP ${reply.statusCode}` });
      } else {
        span.setStatus({ code: 'ok' });
      }
      
      span.finish();
    }

    // Log request completion
    if (options.enableRequestLogging) {
      provider.logger.info('HTTP request completed', {
        statusCode: reply.statusCode,
        responseTime,
        contentLength: reply.getHeader('content-length'),
      });
    }

    // Record metrics
    if (options.enableMetrics) {
      const requestCounter = provider.metrics.createCounter('http_requests_total');
      const responseTimeHistogram = provider.metrics.createHistogram('http_request_duration_ms');

      requestCounter.add(1, {
        method: request.method,
        route: routePath,
        status_code: reply.statusCode.toString(),
      });

      responseTimeHistogram.record(responseTime, {
        method: request.method,
        route: routePath,
      });
    }
  });

  // Add error hook for error logging
  fastify.addHook('onError', async (request: FastifyRequest, reply: FastifyReply, error: Error) => {
    const telemetryContext = (request as Record<string, unknown>)[REQUEST_CONTEXT_KEY] as FastifyTelemetryContext;
    
    if (!telemetryContext) {
      return;
    }

    // Update span with error
    const span = provider.tracer.getActiveSpan();
    if (span) {
      span.recordException(error);
      span.setStatus({ code: 'error', message: error.message });
    }

    // Log error
    if (options.enableErrorLogging) {
      const errorInfo = extractErrorInfo(error);
      provider.logger.error('HTTP request error', error, {
        ...errorInfo,
        statusCode: reply.statusCode,
      });
    }

    // Record error metrics
    if (options.enableMetrics) {
      const errorCounter = provider.metrics.createCounter('http_errors_total');
      errorCounter.add(1, {
        method: request.method,
        route: sanitizeRoutePath(request.routeOptions?.url || request.url),
        error_type: error.name,
      });
    }
  });

  // Graceful shutdown
  fastify.addHook('onClose', async () => {
    await provider.shutdown();
  });
}

export const fastifyTelemetryPlugin = fp(fastifyTelemetryPluginImpl, {
  name: PLUGIN_NAME,
  fastify: '4.x',
});
```

### internal/decorators/request.decorator.ts
```typescript
/**
 * Request decorators for telemetry
 * 
 * ⚠️ INTERNAL USE ONLY - Not exported in main index
 */

import { FastifyRequest } from 'fastify';
import { UnifiedLoggerContext, UnifiedTelemetryLogger } from '@inh-lib/unified-telemetry-core';
import { FastifyTelemetryContext } from '../types/telemetry.types';
import { REQUEST_CONTEXT_KEY } from '../constants/telemetry.const';

declare module 'fastify' {
  interface FastifyRequest {
    getTelemetryContext(): UnifiedLoggerContext | undefined;
    createTelemetryLogger(operationName: string, layer?: string): UnifiedTelemetryLogger;
    createHttpLogger(operationName: string): UnifiedTelemetryLogger;
    createServiceLogger(operationName: string): UnifiedTelemetryLogger;
    createDataLogger(operationName: string): UnifiedTelemetryLogger;
    createIntegrationLogger(operationName: string): UnifiedTelemetryLogger;
  }
}

/**
 * Add telemetry methods to Fastify request
 */
export function decorateRequest(): void {
  // Implementation would be added to the plugin registration
  // These are TypeScript declarations for better DX
}
```

### internal/middleware/telemetry.middleware.ts
```typescript
/**
 * Telemetry middleware utilities
 * 
 * ⚠️ INTERNAL USE ONLY - Not exported in main index
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { UnifiedTelemetryLogger } from '@inh-lib/unified-telemetry-core';
import { TelemetryLayerService } from '../../services/telemetry-layer.service';

/**
 * Create middleware logger for route handlers
 */
export function createMiddlewareLogger(
  request: FastifyRequest,
  middlewareName: string
): UnifiedTelemetryLogger {
  return TelemetryLayerService.createCustomLogger(
    request,
    'http',
    `middleware:${middlewareName}`,
    'http',
    { middleware: middlewareName }
  );
}

/**
 * Create auth middleware logger
 */
export function createAuthLogger(
  request: FastifyRequest,
  authType: string
): UnifiedTelemetryLogger {
  return TelemetryLayerService.createCustomLogger(
    request,
    'http',
    `auth:${authType}`,
    'auth',
    { authType }
  );
}

/**
 * Create validation middleware logger
 */
export function createValidationLogger(
  request: FastifyRequest,
  validationType: string
): UnifiedTelemetryLogger {
  return TelemetryLayerService.createCustomLogger(
    request,
    'http',
    `validation:${validationType}`,
    'utility',
    { validationType }
  );
}

/**
 * Middleware wrapper for automatic telemetry
 */
export function withTelemetry<T extends unknown[]>(
  middlewareName: string,
  handler: (request: FastifyRequest, reply: FastifyReply, logger: UnifiedTelemetryLogger, ...args: T) => Promise<void>
) {
  return async (request: FastifyRequest, reply: FastifyReply, ...args: T): Promise<void> => {
    const logger = createMiddlewareLogger(request, middlewareName);
    
    logger.info(`${middlewareName} middleware started`);
    
    try {
      await handler(request, reply, logger, ...args);
      logger.info(`${middlewareName} middleware completed`);
    } catch (error) {
      logger.error(`${middlewareName} middleware failed`, error as Error);
      throw error;
    }
  };
}
```

## Usage Examples

### 1. Register Plugin with Fastify
```typescript
import Fastify from 'fastify';
import { TelemetryPluginService } from '@inh-lib/api-util-fastify';

const fastify = Fastify({ logger: true });

// Register with Fastify logger
await TelemetryPluginService.registerPluginWithFastifyLogger(fastify, {
  config: {
    serviceName: 'my-api-service',
    serviceVersion: '1.0.0',
    environment: 'production',
  },
});
```

### 2. Use in Route Handlers
```typescript
import { TelemetryLayerService } from '@inh-lib/api-util-fastify';

fastify.get('/users/:id', async (request, reply) => {
  // Create HTTP layer logger
  const httpLogger = TelemetryLayerService.createHttpLogger(
    request, 
    'get-user',
    { userId: request.params.id }
  );
  
  httpLogger.info('Getting user', { userId: request.params.id });
  
  // Create service layer logger
  const serviceLogger = TelemetryLayerService.createServiceLogger(
    request,
    'user-service.getUser'
  );
  
  serviceLogger.info('Calling user service');
  
  // Create data layer logger
  const dataLogger = TelemetryLayerService.createDataLogger(
    request,
    'user-repository.findById'
  );
  
  dataLogger.info('Querying user database');
  
  return { user: { id: request.params.id } };
});
```

### 3. Use with Middleware
```typescript
import { withTelemetry } from '@inh-lib/api-util-fastify/internal/middleware/telemetry.middleware';

const authMiddleware = withTelemetry('auth', async (request, reply, logger) => {
  logger.info('Authenticating request');
  
  const token = request.headers.authorization;
  if (!token) {
    logger.warn('No authorization token provided');
    throw new Error('Unauthorized');
  }
  
  logger.info('Authentication successful');
});

fastify.addHook('preHandler', authMiddleware);
```

### 4. Use Context Service
```typescript
import { TelemetryContextService } from '@inh-lib/api-util-fastify';

fastify.get('/orders', async (request, reply) => {
  // Get base context
  const baseContext = TelemetryContextService.getContextFromRequest(request);
  
  // Create specific layer contexts
  const serviceContext = TelemetryContextService.createServiceContext(
    baseContext,
    'order-service.getOrders'
  );
  
  const dataContext = TelemetryContextService.createDataContext(
    baseContext,
    'order-repository.findAll'
  );
  
  // Use contexts as needed
  return { orders: [] };
});
```

### package.json
```json
{
  "name": "@inh-lib/api-util-fastify",
  "version": "1.0.0",
  "description": "Fastify utilities with unified telemetry instrumentation",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "test": "jest"
  },
  "dependencies": {
    "@inh-lib/unified-telemetry-core": "^1.0.0",
    "@inh-lib/unified-telemetry-otel-adapter": "^1.0.0",
    "fastify": "^4.0.0",
    "fastify-plugin": "^4.0.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/node": "^18.0.0"
  },
  "files": [
    "dist/**/*"
  ]
}
```