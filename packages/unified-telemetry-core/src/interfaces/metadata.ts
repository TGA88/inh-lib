import { UnifiedTelemetryLogger } from "./logger";
import { UnifiedTelemetryMetrics } from "./metrics";
import { UnifiedTelemetryTracer } from "./tracer";

export interface UnifiedTelemetryContextMetadata {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  operationType: 'http' | 'business' | 'database' | 'utility' | 'integration' | 'auth' | 'custom' ;
  operationName: string;
  layer: 'http' | 'service' | 'data' | 'core' | 'integration' | 'custom';
  attributes: Record<string, string | number | boolean>;
  startTime: Date;
}
export interface UnifiedTelemetryContext {
metrics: UnifiedTelemetryMetrics;
tracer: UnifiedTelemetryTracer;
logger: UnifiedTelemetryLogger;
metadata: UnifiedTelemetryContextMetadata;
}