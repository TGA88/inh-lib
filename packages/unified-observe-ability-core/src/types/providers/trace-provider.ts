import { UnifiedTracer, UnifiedTracerOptions } from '../tracing/tracer';

export interface UnifiedTraceProvider {
  readonly name: string;
  readonly isInitialized: boolean;
  
  getTracer(name: string, version?: string): UnifiedTracer;
  getTracer(options: UnifiedTracerOptions): UnifiedTracer;
  getActiveTracer(): UnifiedTracer;
  
  getAllTracers(): UnifiedTracersList;
  shutdown(): Promise<void>;
}

export interface UnifiedTracersList {
  readonly tracers: UnifiedTracer[];
}

export interface UnifiedTraceExporter {
  export(): Promise<UnifiedTracesExportResult>;
}

export interface UnifiedTracesExportResult {
  readonly success: boolean;
  readonly error?: Error;
  readonly tracesCount: number;
  readonly timestamp: number;
}

