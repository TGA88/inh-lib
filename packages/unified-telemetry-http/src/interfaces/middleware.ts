import { 
  UnifiedMiddleware, 
  UnifiedHttpContext 
} from '@inh-lib/unified-route';
import { UnifiedTelemetryProvider } from '@inh-lib/unified-telemetry-core';
import {  
  HttpTelemetryOptions 
} from './http-telemetry';

/**
 * HTTP Telemetry Middleware Interface
 * Defines the contract for HTTP telemetry middleware implementations
 */
export interface HttpTelemetryMiddleware {
  /**
   * Create a middleware function that adds telemetry to HTTP context
   */
  createMiddleware(): UnifiedMiddleware;
}

/**
 * Context Propagation Middleware Interface
 * Handles trace context propagation across HTTP requests
 */
export interface ContextPropagationMiddleware {
  /**
   * Create middleware for extracting and propagating trace context
   */
  createMiddleware(): UnifiedMiddleware;
}

/**
 * HTTP Telemetry Middleware Configuration
 */
export interface HttpTelemetryMiddlewareConfig {
  /**
   * Telemetry provider instance
   */
  provider: UnifiedTelemetryProvider;
  
  /**
   * Telemetry options
   */
  options?: HttpTelemetryOptions;
  
  /**
   * Service name for span naming
   */
  serviceName?: string;
  
  /**
   * Whether to create root span for each request
   * @default true
   */
  createRootSpan?: boolean;
  
  /**
   * Custom span name function
   */
  spanNameGenerator?: (context: UnifiedHttpContext) => string;
  
  /**
   * Custom attributes function
   */
  attributesGenerator?: (context: UnifiedHttpContext) => Record<string, string | number | boolean>;
}

/**
 * Context Propagation Middleware Configuration
 */
export interface ContextPropagationMiddlewareConfig {
  /**
   * Telemetry provider instance
   */
  provider: UnifiedTelemetryProvider;
  
  /**
   * Headers to extract trace context from
   * @default ['x-trace-id', 'traceparent', 'x-request-id', 'x-correlation-id']
   */
  traceHeaders?: string[];
  
  /**
   * Headers to inject trace context into (for outgoing requests)
   * @default ['x-trace-id']
   */
  injectHeaders?: string[];
  
  /**
   * Whether to generate new trace ID if none found
   * @default true  
   */
  generateTraceId?: boolean;
  
  /**
   * Custom trace ID validation function
   */
  validateTraceId?: (traceId: string) => boolean;
}

/**
 * Middleware Factory Interface
 * Factory for creating various HTTP telemetry middlewares
 */
export interface HttpTelemetryMiddlewareFactory {
  /**
   * Create HTTP telemetry middleware
   */
  createHttpTelemetryMiddleware(config: HttpTelemetryMiddlewareConfig): HttpTelemetryMiddleware;
  
  /**
   * Create context propagation middleware
   */
  createContextPropagationMiddleware(config: ContextPropagationMiddlewareConfig): ContextPropagationMiddleware;
}

/**
 * Middleware execution phase
 * ✅ Using union types instead of enum
 */
export type MiddlewarePhase = 'before' | 'after' | 'error';

export const MIDDLEWARE_PHASE = {
  BEFORE: 'before' as const,
  AFTER: 'after' as const,
  ERROR: 'error' as const,
} as const;

/**
 * Middleware priority levels
 * ✅ Using union types instead of enum
 */
export type MiddlewarePriority = 'high' | 'normal' | 'low';

export const MIDDLEWARE_PRIORITY = {
  HIGH: 'high' as const,
  NORMAL: 'normal' as const,
  LOW: 'low' as const,
} as const;