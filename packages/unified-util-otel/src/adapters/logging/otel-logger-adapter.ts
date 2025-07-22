// src/adapters/logging/otel-logger-adapter.ts

import {
  UnifiedLogger,
  LogLevel,
  LogMetadata
} from '@inh-lib/unified-observe-ability-core';
import { combineLogMetadata } from '../../utils/otel-log-metadata.utils';
import {
  processLogEntry,
  shouldLogAtLevel,
  outputLogToConsole,
  sanitizeAndProcessMetadata
} from '../../internal/otel-log-internal.utils';

export class OtelLoggerAdapter implements UnifiedLogger {
  constructor(
    public readonly name: string,
    public readonly level: LogLevel
  ) {}

  trace(message: string, meta?: LogMetadata): void {
    if (this.isLevelEnabled('trace')) {
      this.log('trace', message, meta);
    }
  }

  debug(message: string, meta?: LogMetadata): void {
    if (this.isLevelEnabled('debug')) {
      this.log('debug', message, meta);
    }
  }

  info(message: string, meta?: LogMetadata): void {
    if (this.isLevelEnabled('info')) {
      this.log('info', message, meta);
    }
  }

  warn(message: string, meta?: LogMetadata): void {
    if (this.isLevelEnabled('warn')) {
      this.log('warn', message, meta);
    }
  }

  error(message: string, meta?: LogMetadata): void {
    if (this.isLevelEnabled('error')) {
      this.log('error', message, meta);
    }
  }

  fatal(message: string, meta?: LogMetadata): void {
    if (this.isLevelEnabled('fatal')) {
      this.log('fatal', message, meta);
    }
  }

  child(bindings: LogMetadata): UnifiedLogger {
    return new OtelLoggerChildAdapter(this, bindings);
  }

  isLevelEnabled(level: LogLevel): boolean {
    return shouldLogAtLevel(this.level, level);
  }

  log(level: LogLevel, message: string, meta?: LogMetadata): void {
    const sanitizedMeta = sanitizeAndProcessMetadata(meta);
    const logEntry = processLogEntry(level, this.name, message, sanitizedMeta);
    outputLogToConsole(logEntry);
  }
}

export class OtelLoggerChildAdapter extends OtelLoggerAdapter {
  constructor(
    readonly parent: OtelLoggerAdapter,
    readonly bindings: LogMetadata
  ) {
    super(parent.name, parent.level);
  }

  override log(level: LogLevel, message: string, meta?: LogMetadata): void {
    const combinedMeta = combineLogMetadata(this.bindings, meta);
    this.parent.log(level, message, combinedMeta);
  }
}