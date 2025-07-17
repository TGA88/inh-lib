import { AttributeValue } from '../../utils/type.utils';
import { SpanStatusCode, SpanKind } from '../../constants';
import { SpanContext } from './context';

export interface UnifiedSpan {
  readonly traceId: string;
  readonly spanId: string;
  readonly parentSpanId?: string;
  readonly name: string;
  readonly kind: SpanKind;
  readonly startTime: number;
  readonly isRecording: boolean;
  readonly spanContext: SpanContext;
  
  setAttributes(attributes: Record<string, AttributeValue>): UnifiedSpan;
  setAttribute(key: string, value: AttributeValue): UnifiedSpan;
  setStatus(status: SpanStatus): UnifiedSpan;
  setName(name: string): UnifiedSpan;
  addEvent(name: string, attributes?: Record<string, AttributeValue>, timestamp?: number): UnifiedSpan;
  addLink(spanContext: SpanContext, attributes?: Record<string, AttributeValue>): UnifiedSpan;
  end(endTime?: number): void;
}

export interface SpanOptions {
  readonly kind?: SpanKind;
  readonly startTime?: number;
  readonly parent?: UnifiedSpan | SpanContext;
  readonly attributes?: Record<string, AttributeValue>;
  readonly links?: SpanLink[];
}

export interface SpanStatus {
  readonly code: SpanStatusCode;
  readonly message?: string;
}

export interface SpanEvent {
  readonly name: string;
  readonly timestamp: number;
  readonly attributes?: Record<string, AttributeValue>;
}

export interface SpanLink {
  readonly context: SpanContext;
  readonly attributes?: Record<string, AttributeValue>;
}

export interface SpanProcessor {
  onStart(span: UnifiedSpan): void;
  onEnd(span: UnifiedSpan): void;
  shutdown(): Promise<void>;
  forceFlush(): Promise<void>;
}

export interface SpanExporter {
  export(spans: UnifiedSpan[]): Promise<SpanExportResult>;
  shutdown(): Promise<void>;
}

export interface SpanExportResult {
  readonly success: boolean;
  readonly error?: Error;
  readonly spansExported: number;
  readonly timestamp: number;
}