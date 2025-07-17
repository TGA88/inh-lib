import { UnifiedTracer, TracerOptions } from '../tracing/tracer';

export interface UnifiedTraceProvider {
  readonly name: string;
  readonly isInitialized: boolean;
  
  getTracer(name: string, version?: string): UnifiedTracer;
  getTracer(options: TracerOptions): UnifiedTracer;
  getActiveTracer(): UnifiedTracer;
  
  getAllTracers(): TracersList;
  shutdown(): Promise<void>;
}

export interface TracersList {
  readonly tracers: UnifiedTracer[];
}

export interface TraceExporter {
  export(): Promise<TracesExportResult>;
}

export interface TracesExportResult {
  readonly success: boolean;
  readonly error?: Error;
  readonly tracesCount: number;
  readonly timestamp: number;
}

