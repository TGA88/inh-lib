import {
  UnifiedTelemetryProvider,
  UnifiedTelemetryLogger 
} from '@inh-lib/unified-telemetry-core';

import { UnifiedHttpContext } from '@inh-lib/unified-route';
/**
 * HTTP Context extended with Telemetry Integration
 * 
 * ✅ เก็บ traceId สำหรับ guarantee (เพราะ tracer.getCurrentTraceId() อาจ undefined ในบาง provider)
 * ✅ เก็บ provider สำหรับ direct access ไปยัง logger, tracer, metrics
 * ✅ Interface เล็ก แต่ครบครัน
 */
export interface UnifiedHttpContextWithTelemetry extends UnifiedHttpContext {
  telemetry: {
    /**
     * Trace ID specific to this HTTP request
     * ✅ Essential - guaranteed value (provider.tracer.getCurrentTraceId() อาจ return undefined)
     * ✅ Request-scoped - เฉพาะสำหรับ HTTP request นี้
     */
    traceId: string;
    
    /**
     * Telemetry provider with direct access to all components
     * ✅ Essential - access point to logger, tracer, metrics
     */
    provider: UnifiedTelemetryProvider;
  };
}

/**
 * Convenience type for HTTP telemetry context
 */
export type HttpTelemetryContext = UnifiedHttpContextWithTelemetry['telemetry'];

/**
 * HTTP Request telemetry metadata
 * Used for capturing HTTP-specific telemetry information
 */
export interface HttpTelemetryMetadata {
  method: string;
  url: string;
  userAgent?: string;
  ip: string;
  contentLength?: number;
  startTime: Date;
  statusCode?: number;
  responseSize?: number;
  duration?: number;
}

/**
 * HTTP telemetry configuration options
 */
export interface HttpTelemetryOptions {
  /**
   * Whether to capture request headers
   * @default false
   */
  captureHeaders?: boolean;
  
  /**
   * Whether to capture request body (be careful with sensitive data)
   * @default false
   */
  captureRequestBody?: boolean;
  
  /**
   * Whether to capture response body (be careful with sensitive data)
   * @default false
   */
  captureResponseBody?: boolean;
  
  /**
   * Headers to exclude from telemetry (security)
   */
  excludeHeaders?: string[];
  
  /**
   * URL patterns to exclude from telemetry
   */
  excludeUrls?: RegExp[];
  
  /**
   * Custom trace ID header name
   * @default 'x-trace-id'
   */
  traceIdHeader?: string;
  
  /**
   * Whether to generate new trace ID if not provided
   * @default true
   */
  generateTraceId?: boolean;
}

/**
 * HTTP telemetry span attributes constants
 * ✅ Using constants instead of enum as per requirements
 */
export const HTTP_SPAN_ATTRIBUTES = {
  METHOD: 'http.method',
  URL: 'http.url', 
  STATUS_CODE: 'http.status_code',
  USER_AGENT: 'http.user_agent',
  REQUEST_SIZE: 'http.request.size',
  RESPONSE_SIZE: 'http.response.size',
  CLIENT_IP: 'http.client_ip',
  ROUTE: 'http.route',
  SCHEME: 'http.scheme',
  HOST: 'http.host',
  TARGET: 'http.target',
} as const;

/**
 * HTTP telemetry operation types
 * ✅ Using union types instead of enum
 */
export type HttpOperationType = 'request' | 'response' | 'middleware' | 'error';

export const HTTP_OPERATION_TYPE = {
  REQUEST: 'request' as const,
  RESPONSE: 'response' as const,
  MIDDLEWARE: 'middleware' as const,
  ERROR: 'error' as const,
} as const;