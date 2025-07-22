
// src/utils/otel-log.utils.ts

import { LogLevel } from '@inh-lib/unified-observe-ability-core';

export function convertUnifiedLogLevelToOtel(level: LogLevel): number {
  switch (level) {
    case 'trace':
      return 1;
    case 'debug':
      return 5;
    case 'info':
      return 9;
    case 'warn':
      return 13;
    case 'error':
      return 17;
    case 'fatal':
      return 21;
    default:
      return 9; // info
  }
}

export function convertOtelLogLevelToUnified(level: number): LogLevel {
  if (level <= 1) return 'trace';
  if (level <= 5) return 'debug';
  if (level <= 9) return 'info';
  if (level <= 13) return 'warn';
  if (level <= 17) return 'error';
  return 'fatal';
}

export function formatLogMessage(message: string, meta?: Record<string, unknown>): string {
  if (!meta || Object.keys(meta).length === 0) {
    return message;
  }

  const metaString = Object.entries(meta)
    .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
    .join(' ');

  return `${message} ${metaString}`;
}

export function sanitizeLogMetadata(meta: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};

  Object.entries(meta).forEach(([key, value]) => {
    // Remove circular references and non-serializable values
    try {
      JSON.stringify(value);
      sanitized[key] = value;
    } catch {
      sanitized[key] = '[Non-serializable value]';
    }
  });

  return sanitized;
}
