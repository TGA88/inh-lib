import { UnifiedLogger, LoggerOptions } from '../logging/logger';

export interface UnifiedLogProvider {
  readonly name: string;
  readonly isInitialized: boolean;
  
  getLogger(options: LoggerOptions): UnifiedLogger;
  getLogger(name: string): UnifiedLogger;
  
  getAllLoggers(): LoggersList;
  shutdown(): Promise<void>;
}

export interface LoggersList {
  readonly loggers: UnifiedLogger[];
}

export interface LogExporter {
  export(): Promise<LogsExportResult>;
}

export interface LogsExportResult {
  readonly success: boolean;
  readonly error?: Error;
  readonly logsCount: number;
  readonly timestamp: number;
}