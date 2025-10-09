import { FastifyInstance, FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import { addRegistryItem, UnifiedHttpContext } from '@inh-lib/unified-route';
import { TELEMETRY_CONTEXT_KEYS, UnifiedTelemetryProvider } from '@inh-lib/unified-telemetry-core';
import {
  TelemetryMiddlewareService,
  TELEMETRY_OPERATION_TYPES,
  TELEMETRY_LAYERS
} from '@inh-lib/unified-telemetry-middleware';

import { createUnifiedContext } from '../../unified-fastify-adapter';

import { TelemetryPluginOptions, TelemetryDecoratorOptions } from '../types/telemetry.types';
import { DEFAULT_TELEMETRY_PLUGIN_OPTIONS } from '../constants/telemetry.const';

import { INTERNAL_TELEMETRY_CONSTANTS } from '../internal/constants/telemetry-plugin.const';
import { shouldSkipTelemetry } from '../internal/utils/telemetry-plugin.utils';
import { TelemetryRequestUtils } from '../utils/telemetry-request.utils';
import { RequestTelemetryContext } from '../internal/types/telemetry-plugin.types';


// Type alias for telemetry span attributes (using middleware types)
type TelemetrySpanAttributes = Record<string, string | number | boolean>;
type TelemetryOperationType = (typeof TELEMETRY_OPERATION_TYPES)[keyof typeof TELEMETRY_OPERATION_TYPES];
type TelemetryLayer = (typeof TELEMETRY_LAYERS)[keyof typeof TELEMETRY_LAYERS];

// Simplified telemetry decorator interface with only essential methods
export interface TelemetryDecorator {
  /** Direct access to telemetry provider */
  provider: UnifiedTelemetryProvider;

  /** Full middleware service access for advanced usage */
  unifiedTelemetryService: TelemetryMiddlewareService;

  // /** 
  //  * Get or create span with smart fallback strategies
  //  * Covers 90% of telemetry use cases in Fastify hooks
  //  * 
  //  * Strategy: Active Span → Extract from Headers → Create Fallback
  //  */
  // getOrCreateSpan: (
  //   headers?: Record<string, string>,
  //   options?: {
  //     operationName?: string;
  //     createNewIfNotFound?: boolean;
  //     operationType?: TelemetryOperationType;
  //     layer?: TelemetryLayer;
  //     attributes?: TelemetrySpanAttributes;
  //   }
  // ) => {
  //   span: UnifiedTelemetrySpan;
  //   logger: object; // UnifiedTelemetryLogger
  //   finish: () => void;
  // } | null;
}



declare module 'fastify' {
  interface FastifyInstance {
    telemetry?: TelemetryDecorator;
  }
  interface FastifyRequest {
    // startRequestMeasurement?: UnifiedResourceMeasurement;
    unifiedAppContext?: UnifiedHttpContext;
    businessLogicContext?: UnifiedHttpContext;
    requestTelemetryContext?: RequestTelemetryContext;
  }
}

export class TelemetryPluginService {
  static createPlugin(options: TelemetryPluginOptions): FastifyPluginAsync {
    const pluginOptions: TelemetryDecoratorOptions = {
      provider: options.telemetryProvider,
      middlewareService: options.telemetryMiddleware,
      autoTracing: options.autoTracing ?? DEFAULT_TELEMETRY_PLUGIN_OPTIONS.autoTracing,
      serviceName: options.serviceName ?? DEFAULT_TELEMETRY_PLUGIN_OPTIONS.serviceName,
      skipRoutes: options.skipRoutes ?? [...DEFAULT_TELEMETRY_PLUGIN_OPTIONS.skipRoutes],
      enableResourceTracking: options.enableResourceTracking ?? DEFAULT_TELEMETRY_PLUGIN_OPTIONS.enableResourceTracking,
      enableSystemMetrics: options.enableSystemMetrics ?? DEFAULT_TELEMETRY_PLUGIN_OPTIONS.enableSystemMetrics,
      systemMetricsInterval: options.systemMetricsInterval ?? INTERNAL_TELEMETRY_CONSTANTS.SYSTEM_METRICS_INTERVAL
    };


    // Create TelemetryMiddlewareService instance with plugin options
    const middlewareService = pluginOptions.middlewareService ?? new TelemetryMiddlewareService(
      pluginOptions.provider,
      {
        serviceName: pluginOptions.serviceName,
        enableMetrics: true,
        enableTracing: pluginOptions.autoTracing,
        enableResourceTracking: pluginOptions.enableResourceTracking,
        enableSystemMetrics: pluginOptions.enableSystemMetrics,
        systemMetricsInterval: pluginOptions.systemMetricsInterval,
        enableTraceExtraction: true,
        enableCorrelationId: true,
      }
    );

    const plugin: FastifyPluginAsync = async (fastify: FastifyInstance) => {
      // Decorate fastify instance with simplified telemetry API
      fastify.decorate('telemetry', {
        // Core properties
        provider: pluginOptions.provider,
        unifiedTelemetryService: middlewareService,

        // // Main method - covers 90% of use cases
        // getOrCreateSpan: (
        //   headers?: Record<string, string>,
        //   options?: {
        //     operationName?: string;
        //     createNewIfNotFound?: boolean;
        //     operationType?: TelemetryOperationType;
        //     layer?: TelemetryLayer;
        //     attributes?: TelemetrySpanAttributes;
        //   }
        // ) => {
        //   return executeGetOrCreateSpan(middlewareService, headers, options);
        // },
      });

      // System metrics are now handled by TelemetryMiddlewareService
      // No need for separate collection logic

      // Add hooks for automatic telemetry
      if (pluginOptions.autoTracing) {
        TelemetryPluginService.registerUnifiedTelemetryHooks(fastify, pluginOptions, middlewareService);
      }

      // Cleanup on close
      fastify.addHook('onClose', async () => {
        await middlewareService.shutdown();
      });
    };

    return fp(plugin, {
      name: INTERNAL_TELEMETRY_CONSTANTS.PLUGIN_NAME,
      fastify: '4.x'
    });
  }

  static registerUnifiedTelemetryHooks(
    fastify: FastifyInstance,
    options: TelemetryDecoratorOptions,
    middlewareService: TelemetryMiddlewareService
  ): void {
    // onRequest hook - start telemetry using middleware
    fastify.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
      const logger = request.log;
      logger.debug('TelemetryPluginService - onRequest hook triggered');
      if (shouldSkipTelemetry(request.url, options.skipRoutes)) {
        logger.debug(`Skipping telemetry for route: ${request.url}`);
        return;
      }

      // const startMeasurement = ResourceTrackingService.startTracking();
      // request.startRequestMeasurement = startMeasurement;

      logger.debug(request.body,'OnRequest:request.body');
      logger.debug(request.headers,'OnRequest:request.headers');
      logger.debug(request.params,'OnRequest:request.params');
      logger.debug(request.query,'OnRequest:request.query');

      logger.debug('Creating UnifiedHttpContext for request');
      request.unifiedAppContext = createUnifiedContext(request, reply);
      logger.debug( request.unifiedAppContext,'OnRequest:request.unifiedAppContext');

      // Initialize root span in UnifiedHttpContext
      logger.debug('Initializing telemetry context in UnifiedHttpContext');
      middlewareService.initializeContext(request.unifiedAppContext);
      const initContext = middlewareService.getInitializeContext(request.unifiedAppContext);
  
      logger.debug('Attaching telemetry context to Fastify request');
      const res = TelemetryRequestUtils.createTelemetryContext(request, initContext);
      if (res) {
        request.requestTelemetryContext = res.requestTelemetryContext;
        
        request.log = request.log.child({
        traceId: res.requestTelemetryContext?.span.getTraceId(),
        spanId: res.requestTelemetryContext?.span.getSpanId(),
        requestId: res.requestTelemetryContext?.requestId

      });
   

      }
      logger.debug('Telemetry context attached successfully');

      logger.debug('Adding telemetryMiddleware to UnifiedHttpContext registry');
      addRegistryItem(request.unifiedAppContext, TELEMETRY_CONTEXT_KEYS.MIDDLEWARE_SERVICE, middlewareService);
      
      logger.debug('Adding telemetryProvider to UnifiedHttpContext registry');
      addRegistryItem(request.unifiedAppContext, TELEMETRY_CONTEXT_KEYS.PROVIDER, options.provider);


      logger.debug(request,'TelemetryPluginService - onRequest: FastifyRequest');
      logger.debug(request.unifiedAppContext.request,'TelemetryPluginService - onRequest: UnifiedRequest');

    });
    // preHandler hook - start to update route info in UnifiedHttpContext
    fastify.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
      const logger = request.log;
      logger.debug('TelemetryPluginService - preHandler hook triggered');
      if (request.unifiedAppContext) {

        logger.debug('Updating route info in UnifiedHttpContext');
        const routeInfo = { method: request.method, route: request.routeOptions.url as string, url: request.url };
        middlewareService.updateRouteInfo(request.unifiedAppContext, routeInfo.method, routeInfo.route, routeInfo.url);


        logger.debug(request.headers,'TelemetryPluginService - preHandler hook triggered: FastifyRequest.headers');
        logger.debug(request.body,'TelemetryPluginService - preHandler hook triggered: FastifyRequest.body');
        logger.debug(request.params,'TelemetryPluginService - preHandler hook triggered: FastifyRequest.params');
        logger.debug(request.query,'TelemetryPluginService - preHandler hook triggered: FastifyRequest.query');
        logger.debug(request.unifiedAppContext.request,'TelemetryPluginService - preHandler hook triggered: Request');
        const nCtx = createUnifiedContext(request,reply)
        request.unifiedAppContext.request = nCtx.request;
        logger.debug(request.unifiedAppContext.request,'TelemetryPluginService - preHandler hook triggered: Updated UnifiedRequest');
      }

    });

    // onResponse hook - finish telemetry using middleware
    fastify.addHook('onResponse', async (request: FastifyRequest, reply: FastifyReply) => {
      const logger = request.log;
      logger.debug('TelemetryPluginService - onResponse hook triggered');
      if (request.unifiedAppContext) {
        // Finalize telemetry for the request
        logger.debug('Finalizing telemetry for request in UnifiedHttpContext');
        await middlewareService.finalizeContext(request.unifiedAppContext, reply.statusCode);
      }
      // const startMeasurement = request.startRequestMeasurement
      // if (!startMeasurement) {
      //   return;
      // }
      // const labels = {
      //   method: request.method,
      //   routePath: request.routerPath // routePath will be set by Fastify at pre-handler stage
      // };
      // const endMeasurement: UnifiedStopResourceMeasurementResult = ResourceTrackingService.stopTracking(startMeasurement);
      // middlewareService.recordCustomMetrics(labels['method'], labels['routePath'], reply.statusCode, endMeasurement['durationMs'], endMeasurement['memoryUsageBytes'], endMeasurement['cpuTimeSeconds']);

      // The middleware should have already finished telemetry in its finally block
      // Nothing extra needed here since middleware handles completion
    });

    // onError hook - let middleware handle errors
    fastify.addHook('onError', async (request: FastifyRequest, reply: FastifyReply) => {
      const logger = request.log;
      logger.debug('TelemetryPluginService - onError hook triggered');
      // Middleware should handle error recording in its catch block
      // Error will propagate through middleware's try-catch
      if (request.unifiedAppContext) {
        logger.debug('Finalizing telemetry for Error request in UnifiedHttpContext');
        // Finalize telemetry for the request
        await middlewareService.finalizeContext(request.unifiedAppContext, reply.statusCode);
      }
    });
  }
}