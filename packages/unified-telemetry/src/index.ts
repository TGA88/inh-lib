// index.ts
// Types - public interfaces
export * from './types/unified-telemetry';
export * from './types/unified-telemetry-context';

// Services - main classes
export { UnifiedTelemetryService } from './services/unified-telemetry-service';

// Middleware - main classes
export { UnifiedTelemetryMiddleware } from './middleware/unified-telemetry-middleware';

// Implementations - concrete implementations
export { UnifiedOpenTelemetryProvider } from './implementations/unified-opentelemetry-provider';

// Note: utils functions are not exported as they are internal
// and should only be used within the service methods