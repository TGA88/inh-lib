import { UnifiedSpan, SpanOptions } from './span';

export interface UnifiedTracer {
  readonly name: string;
  readonly version?: string;
  
  startSpan(name: string, options?: SpanOptions): UnifiedSpan;
  startActiveSpan<T>(
    name: string,
    fn: (span: UnifiedSpan) => T,
    options?: SpanOptions
  ): T;
  startActiveSpan<T>(
    name: string,
    options: SpanOptions,
    fn: (span: UnifiedSpan) => T
  ): T;
  getActiveSpan(): UnifiedSpan | undefined;
  withSpan<T>(span: UnifiedSpan, fn: () => T): T;
}

export interface TracerOptions {
  readonly name: string;
  readonly version?: string;
  readonly schemaUrl?: string;
}