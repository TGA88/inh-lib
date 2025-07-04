import { FastifyInstance, FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import { UnifiedHttpContext, addRegistryItem } from '@inh-lib/unified-route';
import { UnifiedTelemetryProvider } from '@inh-lib/unified-telemetry-core';
import { createFastifyContext } from '../../unified-fastify-adapter';

import { TelemetryPluginOptions, EnhancedUnifiedHttpContext, TelemetryDecoratorOptions } from '../types/telemetry.types';
import { TELEMETRY_REGISTRY_KEYS, DEFAULT_TELEMETRY_PLUGIN_OPTIONS } from '../constants/telemetry.const';

import { INTERNAL_TELEMETRY_CONSTANTS } from '../internal/constants/telemetry-plugin.const';
import { InternalPluginState } from '../internal/types/telemetry-plugin.types';
import { shouldSkipTelemetry, captureResourceSnapshot, calculateResourceMetrics } from '../internal/utils/telemetry-plugin.utils';

import { 
  createRequestSpan, 
  finishRequestSpan, 
  createRequestLogger,
  recordComprehensiveRequestMetrics,
  recordSystemMetrics,
  logRequestStart,
  logRequestEnd,
  logRequestError,
  recordDatabaseMetrics,
  recordDatabaseConnectionMetrics
} from '../internal/logic/telemetry-plugin.logic';

declare module 'fastify' {
  interface FastifyInstance {
    telemetry: {
      provider: UnifiedTelemetryProvider;
      createEnhancedContext: <TBody = Record<string, unknown>>(
        request: FastifyRequest, 
        reply: FastifyReply
      ) => EnhancedUnifiedHttpContext & { request: { body: TBody } };
      createContext: <TBody = Record<string, unknown>>(
        request: FastifyRequest, 
        reply: FastifyReply
      ) => UnifiedHttpContext & { request: { body: TBody } };
    };
  }
}

export class TelemetryPluginService {
  static createPlugin(options: TelemetryPluginOptions): FastifyPluginAsync {
    const pluginOptions: TelemetryDecoratorOptions = {
      provider: options.telemetryProvider,
      autoTracing: options.autoTracing ?? DEFAULT_TELEMETRY_PLUGIN_OPTIONS.autoTracing,
      serviceName: options.serviceName ?? DEFAULT_TELEMETRY_PLUGIN_OPTIONS.serviceName,
      skipRoutes: options.skipRoutes ?? [...DEFAULT_TELEMETRY_PLUGIN_OPTIONS.skipRoutes],
      enableResourceTracking: options.enableResourceTracking ?? DEFAULT_TELEMETRY_PLUGIN_OPTIONS.enableResourceTracking,
      enableSystemMetrics: options.enableSystemMetrics ?? DEFAULT_TELEMETRY_PLUGIN_OPTIONS.enableSystemMetrics,
      systemMetricsInterval: options.systemMetricsInterval ?? INTERNAL_TELEMETRY_CONSTANTS.SYSTEM_METRICS_INTERVAL
    };

    const plugin: FastifyPluginAsync = async (fastify: FastifyInstance) => {
      // Internal plugin state
      const pluginState: InternalPluginState = {
        isEnabled: true,
        requestCounter: 0
      };

      // Decorate fastify instance with telemetry utilities
      fastify.decorate('telemetry', {
        provider: pluginOptions.provider,
        createEnhancedContext: <TBody = Record<string, unknown>>(
          request: FastifyRequest, 
          reply: FastifyReply
        ): EnhancedUnifiedHttpContext & { request: { body: TBody } } => {
          return TelemetryPluginService.createEnhancedContext<TBody>(request, reply, pluginOptions.provider);
        },
        createContext: <TBody = Record<string, unknown>>(
          request: FastifyRequest, 
          reply: FastifyReply
        ): UnifiedHttpContext & { request: { body: TBody } } => {
          return TelemetryPluginService.createContextWithTelemetry<TBody>(request, reply, pluginOptions.provider);
        }
      });

      // Start system metrics collection
      if (pluginOptions.enableSystemMetrics) {
        TelemetryPluginService.startSystemMetricsCollection(
          pluginState,
          pluginOptions.provider,
          pluginOptions.serviceName,
          pluginOptions.systemMetricsInterval
        );
      }

      // Add hooks for automatic telemetry
      if (pluginOptions.autoTracing) {
        TelemetryPluginService.registerTelemetryHooks(fastify, pluginOptions);
      }

      // Cleanup on close
      fastify.addHook('onClose', async () => {
        TelemetryPluginService.stopSystemMetricsCollection(pluginState);
      });
    };

    return fp(plugin, {
      name: INTERNAL_TELEMETRY_CONSTANTS.PLUGIN_NAME,
      fastify: '4.x'
    });
  }

  static createEnhancedContext<TBody = Record<string, unknown>>(
    request: FastifyRequest,
    reply: FastifyReply,
    telemetryProvider: UnifiedTelemetryProvider
  ): EnhancedUnifiedHttpContext & { request: { body: TBody } } {
    const baseContext = createFastifyContext<TBody>(request, reply);
    
    // Add telemetry provider to registry
    addRegistryItem(baseContext, TELEMETRY_REGISTRY_KEYS.TELEMETRY_PROVIDER, telemetryProvider);
    
    // Create enhanced context with telemetry property
    const enhancedContext: EnhancedUnifiedHttpContext & { request: { body: TBody } } = {
      ...baseContext,
      telemetry: telemetryProvider
    };

    return enhancedContext;
  }

  static createContextWithTelemetry<TBody = Record<string, unknown>>(
    request: FastifyRequest,
    reply: FastifyReply,
    telemetryProvider: UnifiedTelemetryProvider
  ): UnifiedHttpContext & { request: { body: TBody } } {
    const baseContext = createFastifyContext<TBody>(request, reply);
    
    // Add telemetry provider to registry
    addRegistryItem(baseContext, TELEMETRY_REGISTRY_KEYS.TELEMETRY_PROVIDER, telemetryProvider);
    
    return baseContext;
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
      let resourceSnapshot = undefined;
      
      // Capture resource snapshot if enabled
      if (options.enableResourceTracking) {
        resourceSnapshot = captureResourceSnapshot();
      }

      const { span, requestId } = createRequestSpan(options.provider, request, resourceSnapshot);
      const logger = createRequestLogger(options.provider, span, request);
      
      // Store telemetry context in request
      request.requestContext = request.requestContext || {};
      request.requestContext.telemetry = {
        span,
        startTime,
        requestId,
        logger,
        resourceSnapshot
      };

      // Add request ID to reply headers
      reply.header('x-request-id', requestId);

      // Log request start
      logRequestStart(logger, request, requestId, resourceSnapshot);
    });

    // onResponse hook - finish telemetry
    fastify.addHook('onResponse', async (request: FastifyRequest, reply: FastifyReply) => {
      const telemetryContext = request.requestContext?.telemetry;
      
      if (!telemetryContext) {
        return;
      }

      const { span, startTime, requestId, logger, resourceSnapshot } = telemetryContext;
      let resourceMetrics = undefined;

      // Calculate resource metrics if tracking enabled
      if (options.enableResourceTracking && resourceSnapshot) {
        const endSnapshot = captureResourceSnapshot();
        resourceMetrics = calculateResourceMetrics(resourceSnapshot, endSnapshot);
      } else {
        // Basic duration tracking even without resource tracking
        resourceMetrics = {
          duration: Date.now() - startTime,
          memoryDelta: 0,
          cpuTimeMs: 0,
          heapUsed: 0,
          heapTotal: 0
        };
      }

      // Log request completion
      logRequestEnd(logger, request, reply, requestId, resourceMetrics);

      // Record comprehensive metrics
      recordComprehensiveRequestMetrics(
        options.provider,
        request,
        reply,
        resourceMetrics,
        options.serviceName
      );

      // Finish span with resource metrics
      finishRequestSpan(span, reply, resourceMetrics);
      logger.finishSpan();
    });

    // onError hook - handle errors
    fastify.addHook('onError', async (request: FastifyRequest, reply: FastifyReply, error: Error) => {
      const telemetryContext = request.requestContext?.telemetry;
      
      if (!telemetryContext) {
        return;
      }

      const { span, requestId, logger } = telemetryContext;

      // Log error
      logRequestError(logger, request, error, requestId);

      // Record exception in span
      span.recordException(error);
      span.setStatus({
        code: 'error',
        message: error.message
      });
    });
  }

  static startSystemMetricsCollection(
    pluginState: InternalPluginState,
    provider: UnifiedTelemetryProvider,
    serviceName: string,
    interval: number
  ): void {
    // Start system metrics collection interval
    pluginState.systemMetricsInterval = setInterval(async () => {
      await recordSystemMetrics(provider, serviceName);
    }, interval);

    console.log(`[TelemetryPlugin] System metrics collection started (interval: ${interval}ms)`);
  }

  static stopSystemMetricsCollection(pluginState: InternalPluginState): void {
    if (pluginState.systemMetricsInterval) {
      clearInterval(pluginState.systemMetricsInterval);
      pluginState.systemMetricsInterval = undefined;
      console.log('[TelemetryPlugin] System metrics collection stopped');
    }
  }

  static createStandaloneContext<TBody = Record<string, unknown>>(
    request: FastifyRequest,
    reply: FastifyReply,
    telemetryProvider: UnifiedTelemetryProvider
  ): EnhancedUnifiedHttpContext & { request: { body: TBody } } {
    return TelemetryPluginService.createEnhancedContext<TBody>(request, reply, telemetryProvider);
  }

  // Utility methods for manual telemetry
  static recordDatabaseOperation(
    provider: UnifiedTelemetryProvider,
    command: string,
    database: string,
    table: string,
    duration: number,
    success = true
  ): void {
    recordDatabaseMetrics(provider, command, database, table, duration, success);
  }

  static recordConnectionPoolMetrics(
    provider: UnifiedTelemetryProvider,
    database: string,
    poolName: string,
    usagePercent: number,
    memoryUsage: number
  ): void {
    
    recordDatabaseConnectionMetrics(provider, database, poolName, usagePercent, memoryUsage);
  }
}