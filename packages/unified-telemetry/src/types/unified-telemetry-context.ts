// types/unified-telemetry-context.ts
import { UnifiedHttpContext } from '@inh-lib/unified-route';
import { UnifiedTelemetryContext } from './unified-telemetry';

export interface UnifiedHttpContextWithTelemetry extends UnifiedHttpContext {
  telemetry: UnifiedTelemetryContext;
}

export interface UnifiedTelemetryMiddlewareOptions {
  includeRequestBody?: boolean;
  includeResponseBody?: boolean;
  includeHeaders?: boolean;
  excludeHeaders?: string[];
  customAttributes?: (context: UnifiedHttpContext) => Record<string, string | number | boolean>;
  sensitiveDataMask?: string;
  skipHealthChecks?: boolean;
  healthCheckPaths?: string[];
}