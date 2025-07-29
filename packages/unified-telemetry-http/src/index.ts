// ✅ Interfaces - Public API
export * from './interfaces';

// ✅ Implementations - Public API
export * from './implementations';

// ❌ Utils - NOT exported (internal use only)
// export * from './utils';  // NO! Internal functions only

// ✅ Re-export key interfaces for convenience
export type {
  UnifiedHttpContextWithTelemetry,
  HttpTelemetryContext,
  HttpTelemetryMetadata,
  HttpTelemetryOptions,
  HttpTelemetryMiddleware,
  ContextPropagationMiddleware,
  HttpTelemetryMiddlewareConfig,
  ContextPropagationMiddlewareConfig,
  HttpTelemetryMiddlewareFactory,
} from './interfaces';

// ✅ Re-export key implementations for convenience
export {
  UnifiedHttpTelemetryMiddleware,
  UnifiedContextPropagationMiddleware,
  createHttpTelemetryMiddleware,
  createContextPropagationMiddleware,
  createCombinedHttpTelemetryMiddleware,
} from './implementations';

// ✅ Re-export constants for HTTP telemetry
export { 
  HTTP_SPAN_ATTRIBUTES,
  HTTP_OPERATION_TYPE,
  MIDDLEWARE_PHASE,
  MIDDLEWARE_PRIORITY,
} from './interfaces';

// ✅ Re-export types for type safety
export type {
  HttpOperationType,
  MiddlewarePhase,
  MiddlewarePriority,
} from './interfaces';