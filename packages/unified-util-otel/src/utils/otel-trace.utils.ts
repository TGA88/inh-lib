// src/utils/otel-trace.utils.ts

import { 
  SpanKind, 
  SpanStatusCode, 
  trace, 
  context as otelContext,
  Context,
  Span as OtelSpan,
  SpanContext as OtelSpanContext,
  SpanOptions as OtelSpanOptions
} from '@opentelemetry/api';
import { 
  SpanKind as UnifiedSpanKind, 
  SpanStatusCode as UnifiedSpanStatusCode,
  UnifiedSpan,
  SpanOptions,
  SpanContext,
  AttributeValue,
  SpanLink
} from '@inh-lib/unified-observe-ability-core';
import { OtelSpanAdapter } from '../adapters/tracing/otel-span-adapter';

// ==================== Span Kind & Status Conversion ====================

export function convertUnifiedSpanKindToOtel(kind: UnifiedSpanKind): SpanKind {
  switch (kind) {
    case 'INTERNAL':
      return SpanKind.INTERNAL;
    case 'SERVER':
      return SpanKind.SERVER;
    case 'CLIENT':
      return SpanKind.CLIENT;
    case 'PRODUCER':
      return SpanKind.PRODUCER;
    case 'CONSUMER':
      return SpanKind.CONSUMER;
    default:
      return SpanKind.INTERNAL;
  }
}

export function convertUnifiedSpanStatusToOtel(status: UnifiedSpanStatusCode): SpanStatusCode {
  switch (status) {
    case 'OK':
      return SpanStatusCode.OK;
    case 'ERROR':
      return SpanStatusCode.ERROR;
    case 'UNSET':
    default:
      return SpanStatusCode.UNSET;
  }
}

export function convertOtelSpanStatusToUnified(status: SpanStatusCode): UnifiedSpanStatusCode {
  switch (status) {
    case SpanStatusCode.OK:
      return 'OK';
    case SpanStatusCode.ERROR:
      return 'ERROR';
    case SpanStatusCode.UNSET:
    default:
      return 'UNSET';
  }
}

// ==================== Trace & Span ID Utilities ====================

export function getCurrentTraceId(): string {
  const span = trace.getActiveSpan();
  return span?.spanContext().traceId || '';
}

export function getCurrentSpanId(): string {
  const span = trace.getActiveSpan();
  return span?.spanContext().spanId || '';
}

export function isValidTraceId(traceId: string): boolean {
  return /^[0-9a-f]{32}$/i.test(traceId) && traceId !== '00000000000000000000000000000000';
}

export function isValidSpanId(spanId: string): boolean {
  return /^[0-9a-f]{16}$/i.test(spanId) && spanId !== '0000000000000000';
}

export function generateTraceId(): string {
  const buffer = new Uint8Array(16);
  crypto.getRandomValues(buffer);
  return Array.from(buffer, byte => byte.toString(16).padStart(2, '0')).join('');
}

export function generateSpanId(): string {
  const buffer = new Uint8Array(8);
  crypto.getRandomValues(buffer);
  return Array.from(buffer, byte => byte.toString(16).padStart(2, '0')).join('');
}

// ==================== Type Guards ====================

export function isUnifiedSpan(obj: unknown): obj is UnifiedSpan {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'setAttributes' in obj &&
    'spanId' in obj &&
    'traceId' in obj
  );
}

export function isSpanContext(obj: unknown): obj is SpanContext {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'spanId' in obj &&
    'traceId' in obj &&
    'traceFlags' in obj &&
    !('setAttributes' in obj)
  );
}

// ==================== Context Conversion ====================

export function extractOtelSpanFromUnified(span: UnifiedSpan): OtelSpan | undefined {
  if (span instanceof OtelSpanAdapter) {
    return span.otelSpan;
  }
  return undefined;
}

export function createParentContextFromSpan(span: UnifiedSpan): Context | undefined {
  const otelSpan = extractOtelSpanFromUnified(span);
  if (!otelSpan) {
    return undefined;
  }
  
  return trace.setSpan(otelContext.active(), otelSpan);
}

export function convertUnifiedSpanContextToOtel(spanContext: SpanContext): OtelSpanContext {
  return {
    traceId: spanContext.traceId,
    spanId: spanContext.spanId,
    traceFlags: spanContext.traceFlags,
    isRemote: spanContext.isRemote || false
  };
}

export function convertSpanLinksForOtel(
  links: SpanLink[]
): Array<{ context: OtelSpanContext; attributes?: Record<string, string | number | boolean> }> {
  return links.map(link => {
    const otelContext = convertUnifiedSpanContextToOtel(link.context);
    return {
      context: otelContext,
      attributes: link.attributes ? convertAttributesForOtelLink(link.attributes) : undefined
    };
  });
}

function convertAttributesForOtelLink(
  attributes: Record<string, string | number | boolean>
): Record<string, string | number | boolean> {
  const result: Record<string, string | number | boolean> = {};
  
  Object.entries(attributes).forEach(([key, value]) => {
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      result[key] = value;
    } else {
      result[key] = String(value);
    }
  });
  
  return result;
}

// ==================== Span Options Building ====================

export function extractParentSpanId(parent?: UnifiedSpan | SpanContext): string | undefined {
  if (!parent) {
    return undefined;
  }

  if ('spanId' in parent) {
    return parent.spanId;
  }

  return undefined;
}

export function extractParentSpanContext(parent?: UnifiedSpan | SpanContext): UnifiedSpan | undefined {
  if (!parent) {
    return undefined;
  }

  if (isUnifiedSpan(parent)) {
    return parent;
  }

  // It's a SpanContext, we can't extract a span from it
  return undefined;
}

interface ExtendedSpanOptions extends SpanOptions {
  readonly parent?: UnifiedSpan | SpanContext;
}

export function buildOtelSpanOptions(
  name: string,
  options?: ExtendedSpanOptions
): { options: OtelSpanOptions; parentContext?: Context } {
  const otelOptions: OtelSpanOptions = {};
  let parentContext: Context | undefined;

  if (!options) {
    return { options: otelOptions };
  }

  if (options.kind) {
    otelOptions.kind = convertUnifiedSpanKindToOtel(options.kind);
  }

  if (options.startTime) {
    otelOptions.startTime = options.startTime;
  }

  if (options.attributes) {
    otelOptions.attributes = convertAttributesForOtel(options.attributes);
  }

  if (options.parent && isUnifiedSpan(options.parent)) {
    // It's a UnifiedSpan, we need to set it as parent context
    parentContext = createParentContextFromSpan(options.parent);
  }

  if (options.links) {
    otelOptions.links = convertSpanLinksForOtel(options.links);
  }

  return { options: otelOptions, parentContext };
}

export function convertAttributesForOtel(attributes: Record<string, AttributeValue>): Record<string, string | number | boolean> {
  const otelAttributes: Record<string, string | number | boolean> = {};
  
  Object.entries(attributes).forEach(([key, value]) => {
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      otelAttributes[key] = value;
    } else {
      otelAttributes[key] = String(value);
    }
  });

  return otelAttributes;
}

// ==================== Validation ====================

export function createSpanName(baseName: string, kind?: UnifiedSpanKind): string {
  if (!kind || kind === 'INTERNAL') {
    return baseName;
  }

  return `${kind.toLowerCase()}.${baseName}`;
}

export function validateSpanName(name: string): boolean {
  return typeof name === 'string' && name.length > 0 && name.length <= 256;
}

export function validateSpanOptions(options?: ExtendedSpanOptions): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!options) {
    return { isValid: true, errors };
  }

  if (options.startTime !== undefined) {
    if (typeof options.startTime !== 'number' || options.startTime < 0) {
      errors.push('startTime must be a non-negative number');
    }
  }

  if (options.attributes) {
    Object.entries(options.attributes).forEach(([key, value]) => {
      if (typeof key !== 'string' || key.length === 0) {
        errors.push('Attribute keys must be non-empty strings');
      }
      if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') {
        errors.push(`Attribute value for key "${key}" must be string, number, or boolean`);
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}