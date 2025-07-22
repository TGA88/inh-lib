import { UnifiedLogLevel, UnifiedLogFormat } from '../../constants';

export interface UnifiedLogger {
  readonly name: string;
  readonly level: UnifiedLogLevel;
  
  trace(message: string, meta?: UnifiedLogMetadata): void;
  debug(message: string, meta?: UnifiedLogMetadata): void;
  info(message: string, meta?: UnifiedLogMetadata): void;
  warn(message: string, meta?: UnifiedLogMetadata): void;
  error(message: string, meta?: UnifiedLogMetadata): void;
  fatal(message: string, meta?: UnifiedLogMetadata): void;
  
  child(bindings: UnifiedLogMetadata): UnifiedLogger;
  isLevelEnabled(level: UnifiedLogLevel): boolean;
}

export interface UnifiedLoggerOptions {
  readonly name: string;
  readonly level?: UnifiedLogLevel;
  readonly format?: UnifiedLogFormat;
  readonly includeStack?: boolean;
  readonly bindings?: UnifiedLogMetadata;
}

export interface UnifiedLogMetadata {
  readonly [key: string]: UnifiedLogValue;
}

export type UnifiedLogValue = string | number | boolean | Date | Error | Record<string, unknown> | UnifiedLogValue[];

export interface UnifiedLogEntry {
  readonly level: UnifiedLogLevel;
  readonly message: string;
  readonly timestamp: number;
  readonly logger: string;
  readonly metadata?: UnifiedLogMetadata;
  readonly traceId?: string;
  readonly spanId?: string;
}