// src/adapters/tracing/otel-tracer-adapter.ts

import { Tracer } from '@opentelemetry/api';
import {
  UnifiedTracer,
  UnifiedSpan,
  SpanOptions
} from '@inh-lib/unified-observe-ability-core';
import {
  createUnifiedSpan,
  executeWithActiveSpan,
  parseStartActiveSpanArguments,
  getCurrentActiveSpanAsUnified,
  withSpanContext,
  TracerExecutionContext
} from '../../internal/otel-trace-internal.utils';

export class OtelTracerAdapter implements UnifiedTracer {
  constructor(
    readonly otelTracer: Tracer,
    public readonly name: string,
    public readonly version?: string
  ) {}

  startSpan(name: string, options?: SpanOptions): UnifiedSpan {
    const result = createUnifiedSpan(this.otelTracer, name, options);
    
    if (!result.isValid) {
      // Log errors but return the span anyway (might be a no-op span)
      console.warn(`Span creation warnings for "${name}":`, result.errors);
    }
    
    return result.span;
  }

  startActiveSpan<T>(
    name: string,
    fn: (span: UnifiedSpan) => T
  ): T;
  startActiveSpan<T>(
    name: string,
    options: SpanOptions,
    fn: (span: UnifiedSpan) => T
  ): T;
  startActiveSpan<T>(
    name: string,
    optionsOrFn: SpanOptions | ((span: UnifiedSpan) => T),
    fn?: (span: UnifiedSpan) => T
  ): T {
    const { actualOptions, actualFn } = parseStartActiveSpanArguments(
      name,
      optionsOrFn,
      fn
    );

    const span = this.startSpan(name, actualOptions);
    
    const context: TracerExecutionContext<T> = {
      tracerName: this.name,
      spanName: name,
      options: actualOptions,
      fn: actualFn
    };

    return executeWithActiveSpan(context, span);
  }

  getActiveSpan(): UnifiedSpan | undefined {
    return getCurrentActiveSpanAsUnified();
  }

  withSpan<T>(span: UnifiedSpan, fn: () => T): T {
    return withSpanContext(span, fn);
  }
}