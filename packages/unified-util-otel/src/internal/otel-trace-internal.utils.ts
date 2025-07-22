// src/internal/otel-trace-internal.utils.ts

import { Tracer, trace, context as otelContext } from '@opentelemetry/api';
import {
  UnifiedSpan,
  SpanOptions,
  AttributeValue
} from '@inh-lib/unified-observe-ability-core';
import { OtelSpanAdapter } from '../adapters/tracing/otel-span-adapter';
import {
  buildOtelSpanOptions,
  extractParentSpanId,
  validateSpanName,
  validateSpanOptions,
  extractOtelSpanFromUnified
} from '../utils/otel-trace.utils';

// ==================== Extended Types ====================

interface ExtendedSpanOptions extends SpanOptions {
  readonly parent?: UnifiedSpan | import('@inh-lib/unified-observe-ability-core').SpanContext;
}

// ==================== Execution Context ====================

export interface TracerExecutionContext<T> {
  readonly tracerName: string;
  readonly spanName: string;
  readonly options?: ExtendedSpanOptions;
  readonly fn: (span: UnifiedSpan) => T;
}

export interface SpanCreationResult {
  readonly span: UnifiedSpan;
  readonly parentSpanId?: string;
  readonly isValid: boolean;
  readonly errors: string[];
}

// ==================== Span Creation ====================

export function createUnifiedSpan(
  otelTracer: Tracer,
  name: string,
  options?: ExtendedSpanOptions
): SpanCreationResult {
  const errors: string[] = [];

  // Validate span name
  if (!validateSpanName(name)) {
    errors.push('Invalid span name: must be non-empty string with max 256 characters');
  }

  // Validate span options
  const optionsValidation = validateSpanOptions(options);
  if (!optionsValidation.isValid) {
    errors.push(...optionsValidation.errors);
  }

  if (errors.length > 0) {
    // Create a no-op span for invalid input
    const noOpSpan = createNoOpSpan(name);
    return {
      span: noOpSpan,
      isValid: false,
      errors
    };
  }

  const { options: otelOptions, parentContext } = buildOtelSpanOptions(name, options);
  const otelSpan = parentContext 
    ? otelTracer.startSpan(name, otelOptions, parentContext)
    : otelTracer.startSpan(name, otelOptions);
  const parentSpanId = extractParentSpanId(options?.parent);

  const unifiedSpan = new OtelSpanAdapter(
    otelSpan,
    name,
    options?.kind || 'INTERNAL',
    options?.startTime || Date.now(),
    parentSpanId
  );

  return {
    span: unifiedSpan,
    parentSpanId,
    isValid: true,
    errors: []
  };
}

// ==================== Active Span Execution ====================

export function executeWithActiveSpan<T>(
  context: TracerExecutionContext<T>,
  span: UnifiedSpan
): T {
  const otelSpan = extractOtelSpanFromUnified(span);
  
  if (!otelSpan) {
    // Fallback execution without setting active span
    try {
      return context.fn(span);
    } finally {
      span.end();
    }
  }

  const spanContext = trace.setSpan(otelContext.active(), otelSpan);
  
  return otelContext.with(spanContext, () => {
    try {
      return context.fn(span);
    } finally {
      span.end();
    }
  });
}

export function parseStartActiveSpanArguments<T>(
  name: string,
  optionsOrFn: ExtendedSpanOptions | ((span: UnifiedSpan) => T),
  fn?: (span: UnifiedSpan) => T
): {
  actualOptions?: ExtendedSpanOptions;
  actualFn: (span: UnifiedSpan) => T;
} {
  if (typeof optionsOrFn === 'function') {
    return {
      actualOptions: undefined,
      actualFn: optionsOrFn
    };
  }

  if (!fn) {
    throw new Error('Function parameter is required when options are provided');
  }

  return {
    actualOptions: optionsOrFn,
    actualFn: fn
  };
}

export function getCurrentActiveSpanAsUnified(): UnifiedSpan | undefined {
  const otelSpan = trace.getActiveSpan();
  if (!otelSpan) {
    return undefined;
  }

  return new OtelSpanAdapter(
    otelSpan,
    'active-span',
    'INTERNAL',
    Date.now()
  );
}

export function withSpanContext<T>(span: UnifiedSpan, fn: () => T): T {
  const otelSpan = extractOtelSpanFromUnified(span);
  
  if (!otelSpan) {
    throw new Error('Span must be an OtelSpanAdapter instance for context propagation');
  }

  const spanContext = trace.setSpan(otelContext.active(), otelSpan);
  return otelContext.with(spanContext, fn);
}

// ==================== No-Op Span ====================

function createNoOpSpan(name: string): UnifiedSpan {
  return {
    traceId: '00000000000000000000000000000000',
    spanId: '0000000000000000',
    parentSpanId: undefined,
    name,
    kind: 'INTERNAL',
    startTime: Date.now(),
    isRecording: false,
    spanContext: {
      traceId: '00000000000000000000000000000000',
      spanId: '0000000000000000',
      traceFlags: 0,
      isValid: false
    },
    setAttributes: () => {
      return createNoOpSpan(name);
    },
    setAttribute: () => {
      return createNoOpSpan(name);
    },
    setStatus: () => {
      return createNoOpSpan(name);
    },
    setName: () => {
      return createNoOpSpan(name);
    },
    addEvent: () => {
      return createNoOpSpan(name);
    },
    addLink: () => {
      return createNoOpSpan(name);
    },
    end: () => {
      // No-op
    }
  };
}

// ==================== Testing Utilities ====================

export interface TestableSpanCreation {
  readonly spanName: string;
  readonly kind: string;
  readonly hasParent: boolean;
  readonly parentSpanId?: string;
  readonly attributeCount: number;
  readonly linkCount: number;
  readonly startTime: number;
  readonly isRecording: boolean;
}

export function createTestableSpanInfo(
  result: SpanCreationResult,
  options?: ExtendedSpanOptions
): TestableSpanCreation {
  return {
    spanName: result.span.name,
    kind: result.span.kind,
    hasParent: !!result.parentSpanId,
    parentSpanId: result.parentSpanId,
    attributeCount: options?.attributes ? Object.keys(options.attributes).length : 0,
    linkCount: options?.links ? options.links.length : 0,
    startTime: result.span.startTime,
    isRecording: result.span.isRecording
  };
}

export class TracerCapture {
  private readonly createdSpans: TestableSpanCreation[] = [];
  private readonly activeSpanStack: UnifiedSpan[] = [];

  recordSpanCreation(result: SpanCreationResult, options?: ExtendedSpanOptions): void {
    const info = createTestableSpanInfo(result, options);
    this.createdSpans.push(info);
  }

  pushActiveSpan(span: UnifiedSpan): void {
    this.activeSpanStack.push(span);
  }

  popActiveSpan(): UnifiedSpan | undefined {
    return this.activeSpanStack.pop();
  }

  getCreatedSpans(): TestableSpanCreation[] {
    return [...this.createdSpans];
  }

  getActiveSpanStack(): UnifiedSpan[] {
    return [...this.activeSpanStack];
  }

  getSpansWithName(name: string): TestableSpanCreation[] {
    return this.createdSpans.filter(span => span.spanName === name);
  }

  getSpansWithKind(kind: string): TestableSpanCreation[] {
    return this.createdSpans.filter(span => span.kind === kind);
  }

  clear(): void {
    this.createdSpans.length = 0;
    this.activeSpanStack.length = 0;
  }
}