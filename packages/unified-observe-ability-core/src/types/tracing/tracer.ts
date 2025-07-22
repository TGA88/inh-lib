import { UnifiedSpan, UnifiedSpanOptions } from './span';

export interface UnifiedTracer {
  readonly name: string;
  readonly version?: string;
  
  startSpan(name: string, options?: UnifiedSpanOptions): UnifiedSpan;
  startActiveSpan<T>(
    name: string,
    fn: (span: UnifiedSpan) => T,
    options?: UnifiedSpanOptions
  ): T;
  startActiveSpan<T>(
    name: string,
    options: UnifiedSpanOptions,
    fn: (span: UnifiedSpan) => T
  ): T;
  getActiveSpan(): UnifiedSpan | undefined;
  withSpan<T>(span: UnifiedSpan, fn: () => T): T;
}

export interface UnifiedTracerOptions {
  readonly name: string;
  readonly version?: string;
  readonly schemaUrl?: string;
}