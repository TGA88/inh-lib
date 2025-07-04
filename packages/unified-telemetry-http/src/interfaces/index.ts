// HTTP Telemetry Interfaces
export * from './http-telemetry';

// Middleware Interfaces  
export * from './middleware';

// Re-export key types for convenience
export type {
  UnifiedHttpContextWithTelemetry,
  HttpTelemetryContext,
  HttpTelemetryMetadata,
  HttpTelemetryOptions,
} from './http-telemetry';

export type {
  HttpTelemetryMiddleware,
  ContextPropagationMiddleware,
  HttpTelemetryMiddlewareConfig,
  ContextPropagationMiddlewareConfig,
  HttpTelemetryMiddlewareFactory,
} from './middleware';

// Re-export constants
export { 
  HTTP_SPAN_ATTRIBUTES,
  HTTP_OPERATION_TYPE,
} from './http-telemetry';

export { 
  MIDDLEWARE_PHASE,
  MIDDLEWARE_PRIORITY,
} from './middleware';