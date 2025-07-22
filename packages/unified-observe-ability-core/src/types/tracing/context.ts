export interface UnifiedTraceContext {
  readonly traceId: string;
  readonly spanId: string;
  readonly traceFlags: number;
  readonly isValid: boolean;
}

export interface UnifiedSpanContext extends UnifiedTraceContext {
  readonly isRemote?: boolean;
  readonly traceState?: string;
  readonly baggage?: Record<string, string>;
}

export interface UnifiedContextManager {
  active(): UnifiedSpanContext | undefined;
  with<T>(context: UnifiedSpanContext, fn: () => T): T;
  bind<T extends (...args: unknown[]) => unknown>(context: UnifiedSpanContext, target: T): T;
  disable(): UnifiedContextManager;
  enable(): UnifiedContextManager;
}

export interface UnifiedContextScope {
  readonly active: UnifiedSpanContext | undefined;
  enter(): void;
  exit(): void;
}

// Utility functions for context operations
export interface UnifiedContextUtils {
  createUnifiedSpanContext(
    traceId: string,
    spanId: string,
    traceFlags?: number,
    isRemote?: boolean,
    traceState?: string
  ): UnifiedSpanContext;
  
  isValidContext(context: UnifiedSpanContext | undefined): context is UnifiedSpanContext;
  
  extractBaggage(context: UnifiedSpanContext): Record<string, string>;
  
  setBaggage(context: UnifiedSpanContext, baggage: Record<string, string>): UnifiedSpanContext;
}