import { UnifiedAttributeValue } from '../../utils/type.utils';
import { UnifiedSpanStatusCode, UnifiedSpanKind } from '../../constants';
import { UnifiedSpanContext } from './context';

export interface UnifiedSpan {
  readonly traceId: string;
  readonly spanId: string;
  readonly parentSpanId?: string;
  readonly name: string;
  readonly kind: UnifiedSpanKind;
  readonly startTime: number;
  readonly isRecording: boolean;
  readonly spanContext: UnifiedSpanContext;
  
  setAttributes(attributes: Record<string, UnifiedAttributeValue>): UnifiedSpan;
  setAttribute(key: string, value: UnifiedAttributeValue): UnifiedSpan;
  setStatus(status: UnifiedSpanStatus): UnifiedSpan;
  setName(name: string): UnifiedSpan;
  addEvent(name: string, attributes?: Record<string, UnifiedAttributeValue>, timestamp?: number): UnifiedSpan;
  addLink(spanContext: UnifiedSpanContext, attributes?: Record<string, UnifiedAttributeValue>): UnifiedSpan;
  end(endTime?: number): void;
}

export interface UnifiedSpanOptions {
  readonly kind?: UnifiedSpanKind;
  readonly startTime?: number;
  readonly parent?: UnifiedSpan | UnifiedSpanContext;
  readonly attributes?: Record<string, UnifiedAttributeValue>;
  readonly links?: UnifiedSpanLink[];
}

export interface UnifiedSpanStatus {
  readonly code: UnifiedSpanStatusCode;
  readonly message?: string;
}

export interface UnifiedSpanEvent {
  readonly name: string;
  readonly timestamp: number;
  readonly attributes?: Record<string, UnifiedAttributeValue>;
}

export interface UnifiedSpanLink {
  readonly context: UnifiedSpanContext;
  readonly attributes?: Record<string, UnifiedAttributeValue>;
}

export interface UnifiedSpanProcessor {
  onStart(span: UnifiedSpan): void;
  onEnd(span: UnifiedSpan): void;
  shutdown(): Promise<void>;
  forceFlush(): Promise<void>;
}

export interface UnifiedSpanExporter {
  export(spans: UnifiedSpan[]): Promise<UnifiedSpanExportResult>;
  shutdown(): Promise<void>;
}

export interface UnifiedSpanExportResult {
  readonly success: boolean;
  readonly error?: Error;
  readonly spansExported: number;
  readonly timestamp: number;
}