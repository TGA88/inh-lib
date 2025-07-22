// src/utils/otel-log-metadata.utils.ts

import { LogMetadata, LogValue } from '@inh-lib/unified-observe-ability-core';

export function createLogMetadata(source?: LogMetadata): LogMetadata {
  if (!source) {
    return {};
  }

  const result: Record<string, LogValue> = {};
  Object.entries(source).forEach(([key, value]) => {
    result[key] = value;
  });

  return result as LogMetadata;
}

export function enrichLogMetadataWithTrace(
  meta: LogMetadata | undefined,
  traceId: string,
  spanId: string
): LogMetadata {
  const result: Record<string, LogValue> = {};

  // Copy existing metadata
  if (meta) {
    Object.entries(meta).forEach(([key, value]) => {
      result[key] = value;
    });
  }

  // Add trace context
  if (traceId) {
    result['traceId'] = traceId;
  }

  if (spanId) {
    result['spanId'] = spanId;
  }

  return result as LogMetadata;
}

export function combineLogMetadata(
  base: LogMetadata,
  additional?: LogMetadata
): LogMetadata {
  const result: Record<string, LogValue> = {};

  // Copy base metadata
  Object.entries(base).forEach(([key, value]) => {
    result[key] = value;
  });

  // Copy additional metadata, overriding base values
  if (additional) {
    Object.entries(additional).forEach(([key, value]) => {
      result[key] = value;
    });
  }

  return result as LogMetadata;
}

export function sanitizeLogValue(value: unknown): LogValue {
  if (value === null || value === undefined) {
    return 'null';
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  if (value instanceof Date) {
    return value;
  }

  if (value instanceof Error) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(item => sanitizeLogValue(item)) as LogValue[];
  }

  if (typeof value === 'object') {
    try {
      // Test if value is serializable
      JSON.stringify(value);
      return value as Record<string, unknown>;
    } catch {
      return '[Non-serializable object]';
    }
  }

  return String(value);
}

export function sanitizeLogMetadataValues(meta: Record<string, unknown>): LogMetadata {
  const result: Record<string, LogValue> = {};

  Object.entries(meta).forEach(([key, value]) => {
    result[key] = sanitizeLogValue(value);
  });

  return result as LogMetadata;
}

export function formatLogEntryForConsole(
  level: string,
  logger: string,
  message: string,
  meta: LogMetadata
): string {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    logger,
    message,
    ...meta
  };

  return JSON.stringify(logEntry);
}

export function shouldOutputToConsole(level: string): {
  method: 'error' | 'warn' | 'debug' | 'log';
} {
  switch (level) {
    case 'fatal':
    case 'error':
      return { method: 'error' };
    case 'warn':
      return { method: 'warn' };
    case 'trace':
    case 'debug':
      return { method: 'debug' };
    default:
      return { method: 'log' };
  }
}