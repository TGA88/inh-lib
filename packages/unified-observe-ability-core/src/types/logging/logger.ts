import { LogLevel, LogFormat } from '../../constants';

export interface UnifiedLogger {
  readonly name: string;
  readonly level: LogLevel;
  
  trace(message: string, meta?: LogMetadata): void;
  debug(message: string, meta?: LogMetadata): void;
  info(message: string, meta?: LogMetadata): void;
  warn(message: string, meta?: LogMetadata): void;
  error(message: string, meta?: LogMetadata): void;
  fatal(message: string, meta?: LogMetadata): void;
  
  child(bindings: LogMetadata): UnifiedLogger;
  isLevelEnabled(level: LogLevel): boolean;
}

export interface LoggerOptions {
  readonly name: string;
  readonly level?: LogLevel;
  readonly format?: LogFormat;
  readonly includeStack?: boolean;
  readonly bindings?: LogMetadata;
}

export interface LogMetadata {
  readonly [key: string]: LogValue;
}

export type LogValue = string | number | boolean | Date | Error | Record<string, unknown> | LogValue[];

export interface LogEntry {
  readonly level: LogLevel;
  readonly message: string;
  readonly timestamp: number;
  readonly logger: string;
  readonly metadata?: LogMetadata;
  readonly traceId?: string;
  readonly spanId?: string;
}