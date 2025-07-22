// src/adapters/tracing/otel-span-adapter.ts

import { Span, SpanStatus, Attributes } from '@opentelemetry/api';
import {
  UnifiedSpan,
  SpanStatus as UnifiedSpanStatus,
  SpanKind,
  AttributeValue
} from '@inh-lib/unified-observe-ability-core';
import {
  convertUnifiedSpanStatusToOtel,
  convertOtelSpanStatusToUnified
} from '../../utils/otel-trace.utils';

export class OtelSpanAdapter implements UnifiedSpan {
  readonly parentSpanId?: string;
  readonly isRecording: boolean;

  constructor(
    readonly otelSpan: Span,
    public name: string,
    public readonly kind: SpanKind,
    public readonly startTime: number,
    parentSpanId?: string
  ) {
    this.parentSpanId = parentSpanId;
    this.isRecording = otelSpan.isRecording();
  }

  get traceId(): string {
    return this.otelSpan.spanContext().traceId;
  }

  get spanId(): string {
    return this.otelSpan.spanContext().spanId;
  }

  get spanContext() {
    const context = this.otelSpan.spanContext();
    return {
      traceId: context.traceId,
      spanId: context.spanId,
      traceFlags: context.traceFlags,
      isValid: true,
      isRemote: false
    };
  }

  setAttributes(attributes: Record<string, AttributeValue>): UnifiedSpan {
    const otelAttributes = convertAttributesToOtel(attributes);
    this.otelSpan.setAttributes(otelAttributes);
    return this;
  }

  setAttribute(key: string, value: AttributeValue): UnifiedSpan {
    this.otelSpan.setAttribute(key, value);
    return this;
  }

  setStatus(status: UnifiedSpanStatus): UnifiedSpan {
    const otelStatus: SpanStatus = {
      code: convertUnifiedSpanStatusToOtel(status.code),
      message: status.message
    };
    this.otelSpan.setStatus(otelStatus);
    return this;
  }

  setName(name: string): UnifiedSpan {
    this.name = name;
    this.otelSpan.updateName(name);
    return this;
  }

  addEvent(
    name: string, 
    attributes?: Record<string, AttributeValue>, 
    timestamp?: number
  ): UnifiedSpan {
    const otelAttributes = attributes ? convertAttributesToOtel(attributes) : undefined;
    this.otelSpan.addEvent(name, otelAttributes, timestamp);
    return this;
  }

  addLink(spanContext: any, attributes?: Record<string, AttributeValue>): UnifiedSpan {
    // Links are typically added during span creation in OpenTelemetry
    // This method is included for interface compatibility
    console.warn('Adding links after span creation is not supported in OpenTelemetry');
    return this;
  }

  end(endTime?: number): void {
    this.otelSpan.end(endTime);
  }
}

function convertAttributesToOtel(attributes: Record<string, AttributeValue>): Attributes {
  const otelAttributes: Attributes = {};
  
  Object.entries(attributes).forEach(([key, value]) => {
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      otelAttributes[key] = value;
    } else {
      otelAttributes[key] = String(value);
    }
  });

  return otelAttributes;
}