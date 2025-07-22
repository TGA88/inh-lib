import { UnifiedLogger, UnifiedLoggerOptions } from '../logging/logger';

export interface UnifiedLogProvider {
  readonly name: string;
  readonly isInitialized: boolean;
  
  getLogger(options: UnifiedLoggerOptions): UnifiedLogger;
  getLogger(name: string): UnifiedLogger;
  
  getAllLoggers(): UnifiedLoggersList;
  shutdown(): Promise<void>;
}

export interface UnifiedLoggersList {
  readonly loggers: UnifiedLogger[];
}

export interface UnifiedLogExporter {
  export(): Promise<UnifiedLogsExportResult>;
}

export interface UnifiedLogsExportResult {
  readonly success: boolean;
  readonly error?: Error;
  readonly logsCount: number;
  readonly timestamp: number;
}