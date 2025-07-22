
// src/adapters/logging/otel-log-provider-adapter.ts

import {
  UnifiedLogProvider,
  UnifiedLogger,
  LoggerOptions,
  LoggersList
} from '@inh-lib/unified-observe-ability-core';
import { OtelLoggerAdapter } from './otel-logger-adapter';

export class OtelLogProviderAdapter implements UnifiedLogProvider {
  public readonly name = 'opentelemetry-logging';
  public readonly isInitialized: boolean = true;

  readonly loggers: Map<string, OtelLoggerAdapter> = new Map();

  constructor(readonly serviceName: string) {}

  getLogger(options: LoggerOptions): UnifiedLogger;
  getLogger(name: string): UnifiedLogger;
  getLogger(nameOrOptions: string | LoggerOptions): UnifiedLogger {
    let loggerName: string;
    let loggerOptions: LoggerOptions;

    if (typeof nameOrOptions === 'string') {
      loggerName = nameOrOptions;
      loggerOptions = {
        name: nameOrOptions,
        level: 'info'
      };
    } else {
      loggerName = nameOrOptions.name;
      loggerOptions = nameOrOptions;
    }

    if (this.loggers.has(loggerName)) {
      return this.loggers.get(loggerName)!;
    }

    const logger = new OtelLoggerAdapter(
      loggerOptions.name,
      loggerOptions.level || 'info'
    );

    this.loggers.set(loggerName, logger);
    return logger;
  }

  getAllLoggers(): LoggersList {
    return {
      loggers: Array.from(this.loggers.values())
    };
  }

  async shutdown(): Promise<void> {
    // Cleanup if needed
    this.loggers.clear();
  }
}
