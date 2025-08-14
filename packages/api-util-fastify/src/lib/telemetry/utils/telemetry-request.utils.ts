import { FastifyRequest } from 'fastify';
import { UnifiedTelemetrySpan } from '@inh-lib/unified-telemetry-core';
import { RequestTelemetryContext } from '../internal/types/telemetry-plugin.types';
import { InitializeTelemetryContextResult } from '@inh-lib/unified-telemetry-middleware';
import { ResourceUsageSnapshot } from '../types/telemetry.types';


// Type alias for telemetry span attributes
type TelemetrySpanAttributes = Record<string, string | number | boolean>;
type TelemetrySpanValue = string | number | boolean;

// Extended FastifyRequest type with telemetry context
type FastifyRequestWithTelemetry = FastifyRequest & {
  requestTelemetryContext?: RequestTelemetryContext;
};

/**
 * Utility class for accessing telemetry data from Fastify request context
 * Use these methods when you need to work with the request span created by TelemetryPluginService hooks
 */
export class TelemetryRequestUtils {


    /**
     * create telemetry context from requestTelemetryContext and attach it to request
     * @param request - Fastify request object
     * @param InitializeTelemetryContextResult - Result of initializing telemetry context
     * @returns FastifyRequestWithTelemetry 
     */
   static createTelemetryContext(
     request: FastifyRequest,
     initContext: InitializeTelemetryContextResult
   ): FastifyRequestWithTelemetry | null {
     const reqWithTelemetry = request as FastifyRequestWithTelemetry;
     if (initContext instanceof Error){
        return null;
     }
    
  
      const { timestamp, memory, cpu } = initContext.startMemory;
      const resourceUsageSnapshot: ResourceUsageSnapshot = {
        memoryUsage: {
            heapUsed: memory.heapUsed,
            heapTotal: memory.heapTotal,
            external: memory.external,
            rss: memory.rss,
            arrayBuffers: 0
        },
        cpuUsage: {
         user: cpu.user,
         system: cpu.system,
        },
        timestamp,
      };
      reqWithTelemetry.requestTelemetryContext = {
        span: initContext.span,
        startTime: initContext.startTime,
        requestId: initContext.requestContext.requestId as string,
        logger: initContext.logger,
        resourceSnapshot: resourceUsageSnapshot
      };
      return reqWithTelemetry;
    }
  
        
   
    
  /**
   * Get the span created by TelemetryPluginService hooks for current request
   * @param request - Fastify request object
   * @returns UnifiedTelemetrySpan or null if not found
   */
  static getRequestSpan(request: FastifyRequest): UnifiedTelemetrySpan | null {
    const reqWithTelemetry = request as FastifyRequestWithTelemetry;
    return reqWithTelemetry.requestTelemetryContext?.span || null;
  }
  
  /**
   * Check if request span exists
   * @param request - Fastify request object
   * @returns true if request span exists, false otherwise
   */
  static hasRequestSpan(request: FastifyRequest): boolean {
    return !!this.getRequestSpan(request);
  }
  
  /**
   * Set tag on request span (convenience method)
   * @param request - Fastify request object
   * @param key - Tag key
   * @param value - Tag value
   * @returns true if tag was set, false if no request span
   */
  static setRequestSpanTag(request: FastifyRequest, key: string, value: TelemetrySpanValue): boolean {
    const span = this.getRequestSpan(request);
    if (span) {
      span.setTag(key, value);
      return true;
    }
    return false;
  }
  
  /**
   * Add event to request span (convenience method)
   * @param request - Fastify request object
   * @param name - Event name
   * @param attributes - Event attributes
   * @returns true if event was added, false if no request span
   */
  static addRequestSpanEvent(request: FastifyRequest, name: string, attributes?: TelemetrySpanAttributes): boolean {
    const span = this.getRequestSpan(request);
    if (span) {
      span.addEvent(name, attributes);
      return true;
    }
    return false;
  }
  
  /**
   * Get request ID from telemetry context
   * @param request - Fastify request object
   * @returns Request ID or null if not found
   */
  static getRequestId(request: FastifyRequest): string | null {
    const reqWithTelemetry = request as FastifyRequestWithTelemetry;
    return reqWithTelemetry.requestTelemetryContext?.requestId || null;
  }
  
  /**
   * Get trace ID from request span
   * @param request - Fastify request object
   * @returns Trace ID or null if no request span
   */
  static getTraceId(request: FastifyRequest): string | null {
    const span = this.getRequestSpan(request);
    return span?.getTraceId() || null;
  }
  
  /**
   * Get span ID from request span
   * @param request - Fastify request object
   * @returns Span ID or null if no request span
   */
  static getSpanId(request: FastifyRequest): string | null {
    const span = this.getRequestSpan(request);
    return span?.getSpanId() || null;
  }
}
