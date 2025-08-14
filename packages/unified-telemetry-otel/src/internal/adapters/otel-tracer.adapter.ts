
//src/internal/adapters/otel-tracer.adapter.ts

/**
 * OpenTelemetry Tracer Adapter
 * 
 * ⚠️ INTERNAL USE ONLY - Not exported in main index
 */
import { trace, context, Context } from '@opentelemetry/api';
import { 
  UnifiedTelemetryTracer, 
  UnifiedTelemetrySpan, 
  UnifiedSpanOptions 
} from '@inh-lib/unified-telemetry-core';
import { OtelSpanAdapter } from './otel-span.adapter';
import { OtelTracerInstance } from '../types/otel.types';
import { convertSpanKind, createContextFromSpanIds } from '../logic/otel.logic';


export class OtelTracerAdapter implements UnifiedTelemetryTracer {

  constructor(private readonly otelTracer: OtelTracerInstance) {}

  startSpan(name: string, options?: UnifiedSpanOptions): UnifiedTelemetrySpan {
    const spanKind = options?.kind ? convertSpanKind(options.kind) : 1;
    
    let parentContext: Context | undefined;

    if (options?.parent) {
      const parentSpanId = options.parent.getSpanId();
      const traceId = options.parent.getTraceId();
      parentContext = createContextFromSpanIds(
       traceId,
       parentSpanId
      );
    }
    const otelSpan = this.otelTracer.startSpan(name, {
      kind: spanKind,
      attributes: options?.attributes,
      startTime: options?.startTime,
    }, parentContext);
    

    return new OtelSpanAdapter(otelSpan, options?.startTime || new Date(), options?.parent);
  }

getActiveSpan(): UnifiedTelemetrySpan | undefined {
  // Method 1: If OtelTracerInstance has getActiveSpan method
  if ('getActiveSpan' in this.otelTracer && typeof this.otelTracer.getActiveSpan === 'function') {
    const activeSpan = this.otelTracer.getActiveSpan();
    
    if (!activeSpan?.isRecording()) {
      return undefined;
    }

    

    return new OtelSpanAdapter(activeSpan, new Date());
  }

  // Method 2: Use OpenTelemetry context API with tracer
  const activeContext = context.active();
  const activeSpan = trace.getSpan(activeContext);
  
  if (!activeSpan?.isRecording()) {
    return undefined;
  }

  return new OtelSpanAdapter(activeSpan, new Date() );
}
}
