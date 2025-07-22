
// src/internal/otel-log-internal.utils.ts

import { LogLevel, LogMetadata, LogValue } from '@inh-lib/unified-observe-ability-core';
import { 
  convertUnifiedLogLevelToOtel,
  formatLogMessage,
  getCurrentTraceId,
  getCurrentSpanId
} from '../utils';
import {
  enrichLogMetadataWithTrace,
  sanitizeLogMetadataValues,
  formatLogEntryForConsole,
  shouldOutputToConsole
} from '../utils/otel-log-metadata.utils';

export interface LogEntryInternal {
  readonly level: LogLevel;
  readonly logger: string;
  readonly message: string;
  readonly metadata: LogMetadata;
  readonly timestamp: number;
  readonly traceId?: string;
  readonly spanId?: string;
}

export function processLogEntry(
  level: LogLevel,
  logger: string,
  message: string,
  meta?: LogMetadata
): LogEntryInternal {
  const traceId = getCurrentTraceId();
  const spanId = getCurrentSpanId();
  
  const enrichedMeta = enrichLogMetadataWithTrace(meta, traceId, spanId);
  
  return {
    level,
    logger,
    message,
    metadata: enrichedMeta,
    timestamp: Date.now(),
    traceId: traceId || undefined,
    spanId: spanId || undefined
  };
}

export function shouldLogAtLevel(currentLevel: LogLevel, targetLevel: LogLevel): boolean {
  const currentLevelValue = convertUnifiedLogLevelToOtel(currentLevel);
  const targetLevelValue = convertUnifiedLogLevelToOtel(targetLevel);
  return targetLevelValue >= currentLevelValue;
}

export function outputLogToConsole(entry: LogEntryInternal): void {
  const formattedMessage = formatLogMessage(entry.message, entry.metadata);
  const logString = formatLogEntryForConsole(
    entry.level,
    entry.logger,
    formattedMessage,
    entry.metadata
  );
  
  const { method } = shouldOutputToConsole(entry.level);
  console[method](logString);
}

export function sanitizeAndProcessMetadata(meta?: LogMetadata): LogMetadata {
  if (!meta) {
    return {};
  }

  // Convert LogMetadata to Record<string, unknown> for sanitization
  const metaRecord: Record<string, unknown> = {};
  Object.entries(meta).forEach(([key, value]) => {
    metaRecord[key] = value;
  });

  return sanitizeLogMetadataValues(metaRecord);
}

// Testing utilities
export interface TestableLogEntry {
  readonly level: LogLevel;
  readonly logger: string;
  readonly message: string;
  readonly metadata: Record<string, LogValue>;
  readonly timestamp: number;
  readonly hasTraceContext: boolean;
}

export function createTestableLogEntry(entry: LogEntryInternal): TestableLogEntry {
  return {
    level: entry.level,
    logger: entry.logger,
    message: entry.message,
    metadata: { ...entry.metadata },
    timestamp: entry.timestamp,
    hasTraceContext: !!(entry.traceId && entry.spanId)
  };
}

export class LogCapture {
  private readonly entries: LogEntryInternal[] = [];
  private readonly originalConsole: {
    log: typeof console.log;
    error: typeof console.error;
    warn: typeof console.warn;
    debug: typeof console.debug;
  };

  constructor() {
    this.originalConsole = {
      log: console.log,
      error: console.error,
      warn: console.warn,
      debug: console.debug
    };
  }

  start(): void {
    console.log = this.captureLog.bind(this, 'log');
    console.error = this.captureLog.bind(this, 'error');
    console.warn = this.captureLog.bind(this, 'warn');
    console.debug = this.captureLog.bind(this, 'debug');
  }

  stop(): void {
    console.log = this.originalConsole.log;
    console.error = this.originalConsole.error;
    console.warn = this.originalConsole.warn;
    console.debug = this.originalConsole.debug;
  }

  getCapturedEntries(): LogEntryInternal[] {
    return [...this.entries];
  }

  getEntriesForLogger(loggerName: string): LogEntryInternal[] {
    return this.entries.filter(entry => entry.logger === loggerName);
  }

  getEntriesAtLevel(level: LogLevel): LogEntryInternal[] {
    return this.entries.filter(entry => entry.level === level);
  }

  clear(): void {
    this.entries.length = 0;
  }

  private captureLog(method: string, message: string): void {
    try {
      const parsed = JSON.parse(message);
      if (this.isLogEntry(parsed)) {
        this.entries.push({
          level: parsed.level,
          logger: parsed.logger,
          message: parsed.message,
          metadata: parsed,
          timestamp: new Date(parsed.timestamp).getTime(),
          traceId: parsed.traceId,
          spanId: parsed.spanId
        });
      }
    } catch {
      // Not a structured log entry, ignore
    }
  }

  private isLogEntry(obj: unknown): obj is {
    level: LogLevel;
    logger: string;
    message: string;
    timestamp: string;
    traceId?: string;
    spanId?: string;
  } {
    return (
      typeof obj === 'object' &&
      obj !== null &&
      'level' in obj &&
      'logger' in obj &&
      'message' in obj &&
      'timestamp' in obj
    );
  }
}