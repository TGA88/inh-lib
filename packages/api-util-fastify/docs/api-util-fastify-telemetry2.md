# @inh-lib/api-util-fastify Telemetry Plugin

## File Structure

```
src/
├── telemetry/
│   ├── telemetry-plugin.service.ts    # Main service class
│   └── index.ts                       # Export telemetry services
├── telemetry.const.ts                 # Public constants
├── telemetry.types.ts                 # Public types
└── index.ts                           # Main package exports

internal/
├── telemetry/
│   ├── telemetry-plugin.const.ts      # Internal constants
│   ├── telemetry-plugin.types.ts      # Internal types
│   ├── telemetry-plugin.utils.ts      # Utility functions
│   └── telemetry-plugin.logic.ts      # Business logic functions
```

## Files Content:

### src/telemetry.types.ts
```typescript
import { UnifiedTelemetryProvider } from '@inh-lib/unified-telemetry-core';
import { UnifiedHttpContext } from '@inh-lib/unified-route';

export interface TelemetryPluginOptions {
  telemetryProvider: UnifiedTelemetryProvider;
  autoTracing?: boolean;
  serviceName?: string;
  skipRoutes?: string[];
}

export interface EnhancedUnifiedHttpContext extends UnifiedHttpContext {
  telemetry: UnifiedTelemetryProvider;
}

export interface TelemetryDecoratorOptions {
  provider: UnifiedTelemetryProvider;
  autoTracing: boolean;
  serviceName: string;
  skipRoutes: string[];
}
```

### src/telemetry.const.ts
```typescript
export const TELEMETRY_REGISTRY_KEYS = {
  TELEMETRY_PROVIDER: 'telemetry:provider',
  TELEMETRY_SPAN: 'telemetry:span',
  TELEMETRY_LOGGER: 'telemetry:logger',
  TELEMETRY_METRICS: 'telemetry:metrics',
  REQUEST_START_TIME: 'telemetry:request_start_time',
  REQUEST_ID: 'telemetry:request_id'
} as const;

export const DEFAULT_TELEMETRY_PLUGIN_OPTIONS = {
  autoTracing: true,
  serviceName: 'fastify-service',
  skipRoutes: ['/health', '/metrics', '/ping']
} as const;
```

### internal/telemetry/telemetry-plugin.const.ts
```typescript
export const INTERNAL_TELEMETRY_CONSTANTS = {
  PLUGIN_NAME: 'fastify-unified-telemetry',
  SPAN_NAME_PREFIX: 'fastify.request',
  DEFAULT_OPERATION_TYPE: 'http',
  DEFAULT_LAYER: 'http'
} as const;

export const TELEMETRY_SPAN_ATTRIBUTES = {
  HTTP_METHOD: 'http.method',
  HTTP_URL: 'http.url',
  HTTP_ROUTE: 'http.route',
  HTTP_STATUS_CODE: 'http.status_code',
  HTTP_USER_AGENT: 'http.user_agent',
  REQUEST_ID: 'request.id'
} as const;
```

### internal/telemetry/telemetry-plugin.types.ts
```typescript
import { FastifyRequest, FastifyReply } from 'fastify';
import { UnifiedTelemetrySpan } from '@inh-lib/unified-telemetry-core';

export interface InternalPluginState {
  isEnabled: boolean;
  requestCounter: number;
}

export interface RequestTelemetryContext {
  span: UnifiedTelemetrySpan;
  startTime: number;
  requestId: string;
}

export interface InternalTelemetryDecoration {
  startRequestSpan: (request: FastifyRequest, reply: FastifyReply) => UnifiedTelemetrySpan;
  finishRequestSpan: (span: UnifiedTelemetrySpan, reply: FastifyReply) => void;
  shouldSkipRoute: (url: string) => boolean;
}
```

### internal/telemetry/telemetry-plugin.utils.ts
```typescript
import { randomUUID } from 'crypto';
import { FastifyRequest } from 'fastify';

export const generateRequestId = (): string => {
  return randomUUID();
};

export const extractRoutePattern = (request: FastifyRequest): string => {
  return request.routerPath || request.url;
};

export const extractUserAgent = (request: FastifyRequest): string => {
  return request.headers['user-agent'] || 'unknown';
};

export const shouldSkipTelemetry = (url: string, skipRoutes: string[]): boolean => {
  return skipRoutes.some(route => url.startsWith(route));
};

export const createSpanName = (method: string, route: string): string => {
  return `${method} ${route}`;
};

export const getStatusCodeCategory = (statusCode: number): string => {
  if (statusCode >= 200 && statusCode < 300) return 'success';
  if (statusCode >= 300 && statusCode < 400) return 'redirect';
  if (statusCode >= 400 && statusCode < 500) return 'client_error';
  if (statusCode >= 500) return 'server_error';
  return 'unknown';
};
```

### internal/telemetry/telemetry-plugin.logic.ts
```typescript
import { FastifyRequest, FastifyReply } from 'fastify';
import { UnifiedTelemetryProvider, UnifiedTelemetrySpan, UNIFIED_SPAN_KIND } from '@inh-lib/unified-telemetry-core';
import { INTERNAL_TELEMETRY_CONSTANTS, TELEMETRY_SPAN_ATTRIBUTES } from './telemetry-plugin.const';
import { 
  generateRequestId, 
  extractRoutePattern, 
  extractUserAgent, 
  createSpanName,
  getStatusCodeCategory 
} from './telemetry-plugin.utils';

export const createRequestSpan = (
  provider: UnifiedTelemetryProvider,
  request: FastifyRequest
): { span: UnifiedTelemetrySpan; requestId: string } => {
  const requestId = generateRequestId();
  const route = extractRoutePattern(request);
  const spanName = createSpanName(request.method, route);
  
  const span = provider.tracer.startSpan(spanName, {
    kind: UNIFIED_SPAN_KIND.SERVER,
    attributes: {
      [TELEMETRY_SPAN_ATTRIBUTES.HTTP_METHOD]: request.method,
      [TELEMETRY_SPAN_ATTRIBUTES.HTTP_URL]: request.url,
      [TELEMETRY_SPAN_ATTRIBUTES.HTTP_ROUTE]: route,
      [TELEMETRY_SPAN_ATTRIBUTES.HTTP_USER_AGENT]: extractUserAgent(request),
      [TELEMETRY_SPAN_ATTRIBUTES.REQUEST_ID]: requestId
    }
  });

  return { span, requestId };
};

export const finishRequestSpan = (
  span: UnifiedTelemetrySpan,
  reply: FastifyReply
): void => {
  const statusCode = reply.statusCode;
  const statusCategory = getStatusCodeCategory(statusCode);
  
  span.setTag(TELEMETRY_SPAN_ATTRIBUTES.HTTP_STATUS_CODE, statusCode);
  span.setTag('http.status_category', statusCategory);
  
  if (statusCode >= 400) {
    span.setStatus({
      code: statusCode >= 500 ? 'error' : 'ok',
      message: `HTTP ${statusCode}`
    });
  }
  
  span.finish();
};

export const createRequestLogger = (
  provider: UnifiedTelemetryProvider,
  span: UnifiedTelemetrySpan,
  request: FastifyRequest
) => {
  const route = extractRoutePattern(request);
  
  return provider.logger.getLogger({
    span,
    options: {
      operationType: INTERNAL_TELEMETRY_CONSTANTS.DEFAULT_OPERATION_TYPE,
      operationName: `${request.method} ${route}`,
      layer: INTERNAL_TELEMETRY_CONSTANTS.DEFAULT_LAYER,
      autoAddSpanEvents: true,
      attributes: {
        'request.method': request.method,
        'request.url': request.url
      }
    }
  });
};

export const recordRequestMetrics = (
  provider: UnifiedTelemetryProvider,
  request: FastifyRequest,
  reply: FastifyReply,
  duration: number
): void => {
  const route = extractRoutePattern(request);
  const statusCode = reply.statusCode.toString();
  
  // Record request counter
  const requestCounter = provider.metrics.createCounter(
    'http_requests_total',
    'Total HTTP requests'
  );
  
  requestCounter.add(1, {
    method: request.method,
    route,
    status: statusCode
  });
  
  // Record request duration
  const requestDuration = provider.metrics.createHistogram(
    'http_request_duration_ms',
    'HTTP request duration in milliseconds'
  );
  
  requestDuration.record(duration, {
    method: request.method,
    route,
    status: statusCode
  });
};
```

### src/telemetry/telemetry-plugin.service.ts
```typescript
import { FastifyInstance, FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import { UnifiedHttpContext } from '@inh-lib/unified-route';
import { UnifiedTelemetryProvider } from '@inh-lib/unified-telemetry-core';
import { createFastifyContext } from '../unified-adapter';
import { addRegistryItem } from '@inh-lib/unified-route';

import { TelemetryPluginOptions, EnhancedUnifiedHttpContext, TelemetryDecoratorOptions } from '../telemetry.types';
import { TELEMETRY_REGISTRY_KEYS, DEFAULT_TELEMETRY_PLUGIN_OPTIONS } from '../telemetry.const';

import { INTERNAL_TELEMETRY_CONSTANTS } from '../../internal/telemetry/telemetry-plugin.const';
import { shouldSkipTelemetry } from '../../internal/telemetry/telemetry-plugin.utils';
import { 
  createRequestSpan, 
  finishRequestSpan, 
  createRequestLogger,
  recordRequestMetrics 
} from '../../internal/telemetry/telemetry-plugin.logic';

export class TelemetryPluginService {
  static createPlugin(options: TelemetryPluginOptions): FastifyPluginAsync {
    const pluginOptions: TelemetryDecoratorOptions = {
      provider: options.telemetryProvider,
      autoTracing: options.autoTracing ?? DEFAULT_TELEMETRY_PLUGIN_OPTIONS.autoTracing,
      serviceName: options.serviceName ?? DEFAULT_TELEMETRY_PLUGIN_OPTIONS.serviceName,
      skipRoutes: options.skipRoutes ?? DEFAULT_TELEMETRY_PLUGIN_OPTIONS.skipRoutes
    };

    const plugin: FastifyPluginAsync = async (fastify: FastifyInstance) => {
      // Decorate fastify instance with telemetry utilities
      fastify.decorate('telemetry', {
        provider: pluginOptions.provider,
        createEnhancedContext: (request: FastifyRequest, reply: FastifyReply): EnhancedUnifiedHttpContext => {
          return TelemetryPluginService.createEnhancedContext(request, reply, pluginOptions.provider);
        }
      });

      // Add hooks for automatic telemetry
      if (pluginOptions.autoTracing) {
        TelemetryPluginService.registerTelemetryHooks(fastify, pluginOptions);
      }
    };

    return fp(plugin, {
      name: INTERNAL_TELEMETRY_CONSTANTS.PLUGIN_NAME,
      fastify: '4.x'
    });
  }

  static createEnhancedContext(
    request: FastifyRequest,
    reply: FastifyReply,
    telemetryProvider: UnifiedTelemetryProvider
  ): EnhancedUnifiedHttpContext {
    const baseContext = createFastifyContext(request, reply);
    
    // Add telemetry provider to registry
    addRegistryItem(baseContext, TELEMETRY_REGISTRY_KEYS.TELEMETRY_PROVIDER, telemetryProvider);
    
    // Create enhanced context with telemetry property
    const enhancedContext: EnhancedUnifiedHttpContext = {
      ...baseContext,
      telemetry: telemetryProvider
    };

    return enhancedContext;
  }

  static registerTelemetryHooks(
    fastify: FastifyInstance,
    options: TelemetryDecoratorOptions
  ): void {
    // onRequest hook - start telemetry
    fastify.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
      if (shouldSkipTelemetry(request.url, options.skipRoutes)) {
        return;
      }

      const startTime = Date.now();
      const { span, requestId } = createRequestSpan(options.provider, request);
      
      // Store telemetry context in request
      request.requestContext = request.requestContext || {};
      request.requestContext.telemetry = {
        span,
        startTime,
        requestId,
        logger: createRequestLogger(options.provider, span, request)
      };

      // Add request ID to reply headers
      reply.header('x-request-id', requestId);
    });

    // onResponse hook - finish telemetry
    fastify.addHook('onResponse', async (request: FastifyRequest, reply: FastifyReply) => {
      const telemetryContext = request.requestContext?.telemetry;
      
      if (!telemetryContext) {
        return;
      }

      const { span, startTime, logger } = telemetryContext;
      const duration = Date.now() - startTime;

      // Log request completion
      logger.info('Request completed', {
        duration,
        statusCode: reply.statusCode,
        method: request.method,
        url: request.url
      });

      // Record metrics
      recordRequestMetrics(options.provider, request, reply, duration);

      // Finish span
      finishRequestSpan(span, reply);
      logger.finishSpan();
    });

    // onError hook - handle errors
    fastify.addHook('onError', async (request: FastifyRequest, reply: FastifyReply, error: Error) => {
      const telemetryContext = request.requestContext?.telemetry;
      
      if (!telemetryContext) {
        return;
      }

      const { span, logger } = telemetryContext;

      // Log error
      logger.error('Request failed', error, {
        method: request.method,
        url: request.url,
        errorName: error.name,
        errorMessage: error.message
      });

      // Record exception in span
      span.recordException(error);
      span.setStatus({
        code: 'error',
        message: error.message
      });
    });
  }

  static createContextWithTelemetry<TBody = Record<string, unknown>>(
    request: FastifyRequest,
    reply: FastifyReply,
    telemetryProvider: UnifiedTelemetryProvider
  ): EnhancedUnifiedHttpContext & { request: { body: TBody } } {
    const context = TelemetryPluginService.createEnhancedContext(request, reply, telemetryProvider);
    
    return {
      ...context,
      request: {
        ...context.request,
        body: request.body as TBody
      }
    };
  }
}
```

### src/telemetry/index.ts
```typescript
export { TelemetryPluginService } from './telemetry-plugin.service';
```

### src/index.ts
```typescript
export { TelemetryPluginService } from './telemetry/telemetry-plugin.service';
```

## Usage Example:

```typescript
import Fastify from 'fastify';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OtelProviderService } from '@inh-lib/unified-telemetry-otel';
import { TelemetryPluginService } from '@inh-lib/api-util-fastify';

// Setup OpenTelemetry
const sdk = new NodeSDK({
  serviceName: 'my-fastify-service',
  serviceVersion: '1.0.0'
});
sdk.start();

// Create telemetry provider
const telemetryProvider = OtelProviderService.createProviderWithConsole({
  config: {
    serviceName: 'my-fastify-service',
    serviceVersion: '1.0.0',
    environment: 'development'
  }
}, sdk);

// Create Fastify instance
const fastify = Fastify({ logger: true });

// Register telemetry plugin
await fastify.register(TelemetryPluginService.createPlugin({
  telemetryProvider,
  autoTracing: true,
  serviceName: 'my-fastify-service',
  skipRoutes: ['/health']
}));

// Route with automatic telemetry
fastify.get('/users/:id', async (request, reply) => {
  const context = fastify.telemetry.createEnhancedContext(request, reply);
  
  // Use telemetry
  const logger = context.telemetry.logger.getLogger({
    span: context.registry['telemetry:span'],
    options: {
      operationType: 'business',
      operationName: 'getUser',
      layer: 'service'
    }
  });
  
  logger.info('Getting user', { userId: request.params.id });
  
  return { user: { id: request.params.id } };
});

// Start server
await fastify.listen({ port: 3000 });
```