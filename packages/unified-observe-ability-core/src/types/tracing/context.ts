export interface TraceContext {
  readonly traceId: string;
  readonly spanId: string;
  readonly traceFlags: number;
  readonly isValid: boolean;
}

export interface SpanContext extends TraceContext {
  readonly isRemote?: boolean;
  readonly traceState?: string;
  readonly baggage?: Record<string, string>;
}

export interface ContextManager {
  active(): SpanContext | undefined;
  with<T>(context: SpanContext, fn: () => T): T;
  bind<T extends (...args: unknown[]) => unknown>(context: SpanContext, target: T): T;
  disable(): ContextManager;
  enable(): ContextManager;
}

export interface ContextScope {
  readonly active: SpanContext | undefined;
  enter(): void;
  exit(): void;
}

// Utility functions for context operations
export interface ContextUtils {
  createSpanContext(
    traceId: string,
    spanId: string,
    traceFlags?: number,
    isRemote?: boolean,
    traceState?: string
  ): SpanContext;
  
  isValidContext(context: SpanContext | undefined): context is SpanContext;
  
  extractBaggage(context: SpanContext): Record<string, string>;
  
  setBaggage(context: SpanContext, baggage: Record<string, string>): SpanContext;
}