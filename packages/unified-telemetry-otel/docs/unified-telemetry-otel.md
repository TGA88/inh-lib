# OpenTelemetry Adapter for Unified Telemetry Core

## Project Structure

```
src/
├── index.ts                           # Main entry point
├── services/
│   ├── otel-provider.service.ts       # Main provider service
│   ├── otel-logger.service.ts         # Logger service 
│   ├── otel-tracer.service.ts         # Tracer service
│   └── otel-metrics.service.ts        # Metrics service
└── internal/
    ├── adapters/
    │   ├── otel-provider.adapter.ts    # Provider implementation
    │   ├── otel-logger.adapter.ts      # Logger implementation
    │   ├── otel-tracer.adapter.ts      # Tracer implementation
    │   ├── otel-metrics.adapter.ts     # Metrics implementation
    │   └── otel-span.adapter.ts        # Span implementation
    ├── constants/
    │   └── otel.const.ts               # Internal constants
    ├── types/
    │   └── otel.types.ts               # Internal types
    ├── logic/
    │   └── otel.logic.ts               # Helper functions
    └── utils/
        └── otel.utils.ts               # Utility functions
```

## Files Implementation

### src/index.ts
```typescript
/**
 * OpenTelemetry Adapter for Unified Telemetry Core
 * 
 * This package provides OpenTelemetry implementations for the unified telemetry interfaces.
 * Only service classes are exported - no types or internal implementation details.
 */

// Service exports only - no types for performance
export { OtelProviderService } from './services/otel-provider.service';
export { OtelLoggerService } from './services/otel-logger.service';
export { OtelTracerService } from './services/otel-tracer.service';
export { OtelMetricsService } from './services/otel-metrics.service';
```

### src/services/otel-provider.service.ts
```typescript
import { 
  UnifiedTelemetryProvider, 
  UnifiedTelemetryLogger, 
  UnifiedTelemetryTracer, 
  UnifiedTelemetryMetrics,
  UnifiedBaseTelemetryLogger,
  ProviderInitOptions 
} from '@inh-lib/unified-telemetry-core';
import { OtelProviderAdapter } from '../internal/adapters/otel-provider.adapter';

/**
 * OpenTelemetry Provider Service
 * 
 * Main service class for creating OpenTelemetry-backed telemetry providers.
 * This is the primary entry point for consumers of this package.
 */
export class OtelProviderService {
  /**
   * Create a new OpenTelemetry-backed telemetry provider with base logger
   */
  static createProvider(
    options: ProviderInitOptions, 
    baseLogger: UnifiedBaseTelemetryLogger
  ): UnifiedTelemetryProvider {
    return new OtelProviderAdapter(options, baseLogger);
  }

  /**
   * Create a provider with default configuration and base logger
   */
  static createDefaultProvider(
    serviceName: string, 
    serviceVersion: string,
    baseLogger: UnifiedBaseTelemetryLogger
  ): UnifiedTelemetryProvider {
    return new OtelProviderAdapter({
      config: {
        serviceName,
        serviceVersion,
        environment: 'development',
      },
    }, baseLogger);
  }

  /**
   * Create provider with console as base logger (convenience method)
   */
  static createProviderWithConsole(options: ProviderInitOptions): UnifiedTelemetryProvider {
    const consoleLogger: UnifiedBaseTelemetryLogger = {
      debug: (message: string, attributes?: Record<string, unknown>) => {
        console.debug(message, attributes);
      },
      info: (message: string, attributes?: Record<string, unknown>) => {
        console.info(message, attributes);
      },
      warn: (message: string, attributes?: Record<string, unknown>) => {
        console.warn(message, attributes);
      },
      error: (message: string, attributes?: Record<string, unknown>) => {
        console.error(message, attributes);
      },
    };

    return new OtelProviderAdapter(options, consoleLogger);
  }
}
```

### src/services/otel-logger.service.ts
```typescript
import { 
  UnifiedTelemetryLogger, 
  UnifiedLoggerContext, 
  UnifiedBaseTelemetryLogger 
} from '@inh-lib/unified-telemetry-core';
import { OtelLoggerAdapter } from '../internal/adapters/otel-logger.adapter';
import { OtelTracerService } from './otel-tracer.service';
import { extractTraceAndSpanFromContext } from '../internal/logic/otel.logic';

/**
 * OpenTelemetry Logger Service
 * 
 * Service class for creating OpenTelemetry-integrated loggers.
 */
export class OtelLoggerService {
  /**
   * Create a logger with OpenTelemetry integration and base logger
   */
  static createLogger(
    baseLogger: UnifiedBaseTelemetryLogger,
    context: UnifiedLoggerContext
  ): UnifiedTelemetryLogger {
    return new OtelLoggerAdapter(baseLogger, context);
  }

  /**
   * Create a root logger for a service using OpenTelemetry tracer for span context
   */
  static createRootLogger(
    baseLogger: UnifiedBaseTelemetryLogger,
    serviceName: string,
    operationName: string
  ): UnifiedTelemetryLogger {
    // Get tracer to extract current context
    const tracer = OtelTracerService.createTracer(serviceName);
    const { traceId, spanId } = extractTraceAndSpanFromContext();

    const context: UnifiedLoggerContext = {
      traceId,
      spanId,
      operationType: 'business',
      operationName,
      layer: 'service',
      attributes: { service: serviceName },
      startTime: new Date(),
      tracer, // Provide tracer for creating child spans
    };

    return this.createLogger(baseLogger, context);
  }

  /**
   * Create logger from active span context
   */
  static createLoggerFromActiveSpan(
    baseLogger: UnifiedBaseTelemetryLogger,
    serviceName: string,
    operationName: string
  ): UnifiedTelemetryLogger {
    const tracer = OtelTracerService.createTracer(serviceName);
    const activeSpan = tracer.getActiveSpan();
    
    let traceId: string;
    let spanId: string;

    if (activeSpan) {
      traceId = activeSpan.getTraceId();
      spanId = activeSpan.getSpanId();
    } else {
      // Fallback to current context
      const context = extractTraceAndSpanFromContext();
      traceId = context.traceId;
      spanId = context.spanId;
    }

    const context: UnifiedLoggerContext = {
      traceId,
      spanId,
      operationType: 'business',
      operationName,
      layer: 'service',
      attributes: { service: serviceName },
      startTime: new Date(),
      tracer,
    };

    return this.createLogger(baseLogger, context);
  }
}
```

### src/services/otel-tracer.service.ts
```typescript
import { UnifiedTelemetryTracer } from '@inh-lib/unified-telemetry-core';
import { OtelTracerAdapter } from '../internal/adapters/otel-tracer.adapter';
import { createOtelTracer } from '../internal/logic/otel.logic';

/**
 * OpenTelemetry Tracer Service
 * 
 * Service class for creating OpenTelemetry tracers.
 */
export class OtelTracerService {
  /**
   * Create a tracer with OpenTelemetry integration
   */
  static createTracer(serviceName: string): UnifiedTelemetryTracer {
    const otelTracer = createOtelTracer(serviceName);
    return new OtelTracerAdapter(otelTracer);
  }
}
```

### src/services/otel-metrics.service.ts
```typescript
import { UnifiedTelemetryMetrics } from '@inh-lib/unified-telemetry-core';
import { OtelMetricsAdapter } from '../internal/adapters/otel-metrics.adapter';
import { createOtelMeter } from '../internal/logic/otel.logic';

/**
 * OpenTelemetry Metrics Service
 * 
 * Service class for creating OpenTelemetry metrics.
 */
export class OtelMetricsService {
  /**
   * Create metrics with OpenTelemetry integration
   */
  static createMetrics(serviceName: string): UnifiedTelemetryMetrics {
    const otelMeter = createOtelMeter(serviceName);
    return new OtelMetricsAdapter(otelMeter);
  }
}
```



### internal/types/otel.types.ts
```typescript
/**
 * Internal OpenTelemetry types
 * 
 * ⚠️ INTERNAL USE ONLY - Not exported in main index
 */

import { Tracer, Span, Meter } from '@opentelemetry/api';

export interface OtelSpanContext {
  traceId: string;
  spanId: string;
  traceFlags: number;
  isRemote: boolean;
}

export interface OtelInstruments {
  counters: Map<string, unknown>;
  histograms: Map<string, unknown>;
  gauges: Map<string, unknown>;
}

export type OtelTracerInstance = Tracer;
export type OtelSpanInstance = Span;
export type OtelMeterInstance = Meter;
```

### internal/logic/otel.logic.ts
```typescript
/**
 * Internal OpenTelemetry logic functions
 * 
 * ⚠️ INTERNAL USE ONLY - Not exported in main index
 */

import { trace, metrics, context, SpanContext } from '@opentelemetry/api';
import { OtelTracerInstance, OtelMeterInstance } from '../types/otel.types';
import { DEFAULT_TRACER_NAME, DEFAULT_METER_NAME } from '../constants/otel.const';

/**
 * Create OpenTelemetry tracer
 */
export function createOtelTracer(serviceName: string): OtelTracerInstance {
  return trace.getTracer(serviceName || DEFAULT_TRACER_NAME);
}

/**
 * Create OpenTelemetry meter
 */
export function createOtelMeter(serviceName: string): OtelMeterInstance {
  return metrics.getMeter(serviceName || DEFAULT_METER_NAME);
}

/**
 * Extract trace ID and span ID from current OpenTelemetry context
 */
export function extractTraceAndSpanFromContext(): { traceId: string; spanId: string } {
  const activeSpan = trace.getActiveSpan();
  
  if (activeSpan) {
    const spanContext = activeSpan.spanContext();
    return {
      traceId: spanContext.traceId,
      spanId: spanContext.spanId,
    };
  }

  // If no active span, try to get from context
  const currentContext = context.active();
  const spanContext = trace.getSpanContext(currentContext);
  
  if (spanContext) {
    return {
      traceId: spanContext.traceId,
      spanId: spanContext.spanId,
    };
  }

  // Generate new trace/span if none found (fallback)
  return {
    traceId: generateTraceId(),
    spanId: generateSpanId(),
  };
}

/**
 * Generate random trace ID (fallback only)
 */
function generateTraceId(): string {
  return Array.from({ length: 32 }, () => 
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
}

/**
 * Generate random span ID (fallback only)
 */
function generateSpanId(): string {
  return Array.from({ length: 16 }, () => 
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
}

/**
 * Convert unified span kind to OpenTelemetry span kind
 */
export function convertSpanKind(unifiedKind: string): number {
  switch (unifiedKind) {
    case 'internal': return 1;
    case 'server': return 2;
    case 'client': return 3;
    case 'producer': return 4;
    case 'consumer': return 5;
    default: return 1;
  }
}

/**
 * Convert unified span status to OpenTelemetry span status
 */
export function convertSpanStatus(unifiedCode: string): number {
  switch (unifiedCode) {
    case 'unset': return 0;
    case 'ok': return 1;
    case 'error': return 2;
    default: return 0;
  }
}

/**
 * Extract trace ID from OpenTelemetry span context
 */
export function extractTraceIdFromSpan(span: unknown): string {
  // Get span context and extract trace ID
  if (span && typeof span === 'object' && 'spanContext' in span) {
    const spanContext = (span as { spanContext(): SpanContext }).spanContext();
    return spanContext.traceId;
  }
  return 'unknown-trace-id';
}

/**
 * Extract span ID from OpenTelemetry span context
 */
export function extractSpanIdFromSpan(span: unknown): string {
  // Get span context and extract span ID
  if (span && typeof span === 'object' && 'spanContext' in span) {
    const spanContext = (span as { spanContext(): SpanContext }).spanContext();
    return spanContext.spanId;
  }
  return 'unknown-span-id';
}
```

### internal/utils/otel.utils.ts
```typescript
/**
 * Internal OpenTelemetry utilities
 * 
 * ⚠️ INTERNAL USE ONLY - Not exported in main index
 */

import { TRACE_HEADERS } from '../constants/otel.const';

/**
 * Extract trace ID from HTTP headers
 */
export function extractTraceIdFromHeaders(headers: Record<string, string>): string | undefined {
  for (const header of TRACE_HEADERS) {
    const value = headers[header];
    if (value) {
      if (header === 'traceparent') {
        const parts = value.split('-');
        if (parts.length >= 2) {
          return parts[1];
        }
      }
      return value;
    }
  }
  return undefined;
}

/**
 * Validate OpenTelemetry configuration
 */
export function validateOtelConfig(config: Record<string, unknown>): boolean {
  return config.serviceName !== undefined && config.serviceVersion !== undefined;
}
```

### internal/adapters/otel-provider.adapter.ts
```typescript
/**
 * OpenTelemetry Provider Adapter
 * 
 * ⚠️ INTERNAL USE ONLY - Not exported in main index
 */

import { 
  UnifiedTelemetryProvider, 
  UnifiedTelemetryLogger, 
  UnifiedTelemetryTracer, 
  UnifiedTelemetryMetrics,
  UnifiedBaseTelemetryLogger,
  ProviderInitOptions 
} from '@inh-lib/unified-telemetry-core';
import { OtelLoggerAdapter } from './otel-logger.adapter';
import { OtelTracerAdapter } from './otel-tracer.adapter';
import { OtelMetricsAdapter } from './otel-metrics.adapter';
import { createOtelTracer, createOtelMeter, extractTraceAndSpanFromContext } from '../logic/otel.logic';

export class OtelProviderAdapter implements UnifiedTelemetryProvider {
  readonly logger: UnifiedTelemetryLogger;
  readonly tracer: UnifiedTelemetryTracer;
  readonly metrics: UnifiedTelemetryMetrics;

  constructor(options: ProviderInitOptions, baseLogger: UnifiedBaseTelemetryLogger) {
    const { config } = options;
    
    // Create OpenTelemetry instances
    const otelTracer = createOtelTracer(config.serviceName);
    const otelMeter = createOtelMeter(config.serviceName);

    // Extract trace and span context from OpenTelemetry
    const { traceId, spanId } = extractTraceAndSpanFromContext();

    // Create root logger context
    const rootContext = {
      traceId,
      spanId,
      operationType: 'business' as const,
      operationName: 'root',
      layer: 'service' as const,
      attributes: {
        service: config.serviceName,
        version: config.serviceVersion,
        environment: config.environment,
        ...options.customAttributes,
      },
      startTime: new Date(),
      tracer: new OtelTracerAdapter(otelTracer), // Provide tracer for creating child spans
    };

    // Create adapters
    this.logger = new OtelLoggerAdapter(baseLogger, rootContext);
    this.tracer = new OtelTracerAdapter(otelTracer);
    this.metrics = new OtelMetricsAdapter(otelMeter);
  }

  async shutdown(): Promise<void> {
    // Shutdown OpenTelemetry providers
    // Implementation depends on OpenTelemetry SDK setup
  }
}
```

### internal/adapters/otel-logger.adapter.ts
```typescript
/**
 * OpenTelemetry Logger Adapter
 * 
 * ⚠️ INTERNAL USE ONLY - Not exported in main index
 */

import { 
  UnifiedTelemetryLogger, 
  UnifiedLoggerContext, 
  UnifiedTelemetrySpan,
  UnifiedBaseTelemetryLogger,
  enrichLogAttributes,
  createChildLoggerContext,
  extractErrorInfo
} from '@inh-lib/unified-telemetry-core';

export class OtelLoggerAdapter implements UnifiedTelemetryLogger {
  private span?: UnifiedTelemetrySpan;

  constructor(
    private readonly baseLogger: UnifiedBaseTelemetryLogger,
    private readonly context: UnifiedLoggerContext
  ) {}

  debug(message: string, attributes?: Record<string, unknown>): void {
    this.logWithSpan('debug', message, attributes);
  }

  info(message: string, attributes?: Record<string, unknown>): void {
    this.logWithSpan('info', message, attributes);
  }

  warn(message: string, attributes?: Record<string, unknown>): void {
    this.logWithSpan('warn', message, attributes);
    
    if (this.span) {
      this.span.addEvent('warning', { message, ...attributes });
    }
  }

  error(message: string, error?: Error, attributes?: Record<string, unknown>): void {
    const errorAttrs = error ? extractErrorInfo(error) : {};
    const combinedAttrs = { ...errorAttrs, ...attributes };

    this.logWithSpan('error', message, combinedAttrs);
    
    if (this.span) {
      if (error) {
        this.span.recordException(error);
      }
      this.span.addEvent('error', { message, ...combinedAttrs });
    }
  }

  addSpanEvent(name: string, attributes?: Record<string, string | number | boolean>): void {
    if (this.span) {
      this.span.addEvent(name, attributes);
    }
  }

  setSpanAttribute(key: string, value: string | number | boolean): void {
    if (this.span) {
      this.span.setTag(key, value);
    }
  }

  attachSpan(span: UnifiedTelemetrySpan): void {
    this.span = span;
  }

  finishSpan(): void {
    if (this.span) {
      this.span.finish();
    }
  }

  getSpanId(): string {
    return this.context.spanId;
  }

  getTraceId(): string {
    return this.context.traceId;
  }

  createChildLogger(
    operationName: string, 
    attributes?: Record<string, string | number | boolean>
  ): UnifiedTelemetryLogger {
    const childContext = createChildLoggerContext(this.context, operationName, attributes);
    return new OtelLoggerAdapter(this.baseLogger, childContext);
  }

  createChildContext(operationName: string): UnifiedLoggerContext {
    return createChildLoggerContext(this.context, operationName);
  }

  logWithSpan(level: string, message: string, attributes?: Record<string, unknown>): void {
    const enrichedAttrs = enrichLogAttributes(this.context, attributes);
    
    switch (level) {
      case 'debug':
        this.baseLogger.debug(message, enrichedAttrs);
        break;
      case 'info':
        this.baseLogger.info(message, enrichedAttrs);
        break;
      case 'warn':
        this.baseLogger.warn(message, enrichedAttrs);
        break;
      case 'error':
        this.baseLogger.error(message, enrichedAttrs);
        break;
    }

    if (this.span) {
      this.span.addEvent(`log.${level}`, {
        message,
        ...(attributes as Record<string, string | number | boolean>),
      });
    }
  }
}
```

### internal/adapters/otel-tracer.adapter.ts
```typescript
/**
 * OpenTelemetry Tracer Adapter
 * 
 * ⚠️ INTERNAL USE ONLY - Not exported in main index
 */

import { 
  UnifiedTelemetryTracer, 
  UnifiedTelemetrySpan, 
  UnifiedSpanOptions 
} from '@inh-lib/unified-telemetry-core';
import { OtelSpanAdapter } from './otel-span.adapter';
import { OtelTracerInstance } from '../types/otel.types';
import { convertSpanKind } from '../logic/otel.logic';

export class OtelTracerAdapter implements UnifiedTelemetryTracer {
  constructor(private readonly otelTracer: OtelTracerInstance) {}

  startSpan(name: string, options?: UnifiedSpanOptions): UnifiedTelemetrySpan {
    const spanKind = options?.kind ? convertSpanKind(options.kind) : 1;
    
    const otelSpan = this.otelTracer.startSpan(name, {
      kind: spanKind,
      attributes: options?.attributes,
      startTime: options?.startTime,
    });

    return new OtelSpanAdapter(otelSpan);
  }

  getActiveSpan(): UnifiedTelemetrySpan | undefined {
    // Get active span from OpenTelemetry context
    // Implementation depends on OpenTelemetry API
    return undefined;
  }
}
```

### internal/adapters/otel-span.adapter.ts
```typescript
/**
 * OpenTelemetry Span Adapter
 * 
 * ⚠️ INTERNAL USE ONLY - Not exported in main index
 */

import { 
  UnifiedTelemetrySpan, 
  UnifiedSpanStatus 
} from '@inh-lib/unified-telemetry-core';
import { OtelSpanInstance } from '../types/otel.types';
import { convertSpanStatus, extractTraceIdFromSpan, extractSpanIdFromSpan } from '../logic/otel.logic';

export class OtelSpanAdapter implements UnifiedTelemetrySpan {
  constructor(private readonly otelSpan: OtelSpanInstance) {}

  setTag(key: string, value: string | number | boolean): UnifiedTelemetrySpan {
    this.otelSpan.setAttribute(key, value);
    return this;
  }

  setStatus(status: UnifiedSpanStatus): UnifiedTelemetrySpan {
    const otelStatusCode = convertSpanStatus(status.code);
    this.otelSpan.setStatus({
      code: otelStatusCode,
      message: status.message,
    });
    return this;
  }

  recordException(exception: Error): UnifiedTelemetrySpan {
    this.otelSpan.recordException(exception);
    return this;
  }

  addEvent(name: string, attributes?: Record<string, string | number | boolean>): UnifiedTelemetrySpan {
    this.otelSpan.addEvent(name, attributes);
    return this;
  }

  finish(): void {
    this.otelSpan.end();
  }

  getTraceId(): string {
    return extractTraceIdFromSpan(this.otelSpan);
  }

  getSpanId(): string {
    return extractSpanIdFromSpan(this.otelSpan);
  }
}
```

### internal/adapters/otel-metrics.adapter.ts
```typescript
/**
 * OpenTelemetry Metrics Adapter
 * 
 * ⚠️ INTERNAL USE ONLY - Not exported in main index
 */

import { 
  UnifiedTelemetryMetrics, 
  UnifiedTelemetryCounter, 
  UnifiedTelemetryHistogram, 
  UnifiedTelemetryGauge 
} from '@inh-lib/unified-telemetry-core';
import { OtelMeterInstance, OtelInstruments } from '../types/otel.types';

export class OtelMetricsAdapter implements UnifiedTelemetryMetrics {
  private instruments: OtelInstruments = {
    counters: new Map(),
    histograms: new Map(),
    gauges: new Map(),
  };

  constructor(private readonly otelMeter: OtelMeterInstance) {}

  createCounter(name: string, description?: string): UnifiedTelemetryCounter {
    const counter = this.otelMeter.createCounter(name, { description });
    this.instruments.counters.set(name, counter);
    
    return {
      add: (value: number, labels?: Record<string, string>) => {
        counter.add(value, labels);
      },
    };
  }

  createHistogram(name: string, description?: string): UnifiedTelemetryHistogram {
    const histogram = this.otelMeter.createHistogram(name, { description });
    this.instruments.histograms.set(name, histogram);
    
    return {
      record: (value: number, labels?: Record<string, string>) => {
        histogram.record(value, labels);
      },
    };
  }

  createGauge(name: string, description?: string): UnifiedTelemetryGauge {
    const gauge = this.otelMeter.createUpDownCounter(name, { description });
    this.instruments.gauges.set(name, gauge);
    
    let currentValue = 0;
    
    return {
      set: (value: number, labels?: Record<string, string>) => {
        const delta = value - currentValue;
        gauge.add(delta, labels);
        currentValue = value;
      },
    };
  }
}
```

### package.json
```json
{
  "name": "@inh-lib/unified-telemetry-otel-adapter",
  "version": "1.0.0",
  "description": "OpenTelemetry adapter for unified telemetry core",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "test": "jest"
  },
  "dependencies": {
    "@inh-lib/unified-telemetry-core": "^1.0.0",
    "@opentelemetry/api": "^1.4.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/node": "^18.0.0"
  },
  "files": [
    "dist/**/*"
  ]
}
```

## Usage Examples

### 1. Using with Pino Logger
```typescript
import pino from 'pino';
import { OtelProviderService } from '@inh-lib/unified-telemetry-otel-adapter';
import { UnifiedBaseTelemetryLogger } from '@inh-lib/unified-telemetry-core';

// Create Pino logger
const pinoLogger = pino({ level: 'info' });

// Create base logger adapter for Pino
const baseLogger: UnifiedBaseTelemetryLogger = {
  debug: (message: string, attributes?: Record<string, unknown>) => {
    pinoLogger.debug(attributes, message);
  },
  info: (message: string, attributes?: Record<string, unknown>) => {
    pinoLogger.info(attributes, message);
  },
  warn: (message: string, attributes?: Record<string, unknown>) => {
    pinoLogger.warn(attributes, message);
  },
  error: (message: string, attributes?: Record<string, unknown>) => {
    pinoLogger.error(attributes, message);
  },
};

// Create provider with Pino
const provider = OtelProviderService.createProvider({
  config: {
    serviceName: 'my-service',
    serviceVersion: '1.0.0',
    environment: 'production',
  },
}, baseLogger);

// Use logger (will include trace/span IDs from OpenTelemetry)
provider.logger.info('Service started', { port: 3000 });
```

### 2. Using with Winston Logger
```typescript
import winston from 'winston';
import { OtelProviderService } from '@inh-lib/unified-telemetry-otel-adapter';
import { UnifiedBaseTelemetryLogger } from '@inh-lib/unified-telemetry-core';

// Create Winston logger
const winstonLogger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()],
});

// Create base logger adapter for Winston
const baseLogger: UnifiedBaseTelemetryLogger = {
  debug: (message: string, attributes?: Record<string, unknown>) => {
    winstonLogger.debug(message, attributes);
  },
  info: (message: string, attributes?: Record<string, unknown>) => {
    winstonLogger.info(message, attributes);
  },
  warn: (message: string, attributes?: Record<string, unknown>) => {
    winstonLogger.warn(message, attributes);
  },
  error: (message: string, attributes?: Record<string, unknown>) => {
    winstonLogger.error(message, attributes);
  },
};

// Create provider with Winston
const provider = OtelProviderService.createProvider({
  config: {
    serviceName: 'my-service',
    serviceVersion: '1.0.0',
    environment: 'production',
  },
}, baseLogger);
```

### 3. Using with Console (Quick Start)
```typescript
import { OtelProviderService } from '@inh-lib/unified-telemetry-otel-adapter';

// Create provider with console logger (convenience method)
const provider = OtelProviderService.createProviderWithConsole({
  config: {
    serviceName: 'my-service',
    serviceVersion: '1.0.0',
    environment: 'development',
  },
});

// Use logger, tracer, and metrics
provider.logger.info('Service started', { port: 3000 });

const span = provider.tracer.startSpan('process-request');
span.setTag('user.id', '123');
span.finish();

const counter = provider.metrics.createCounter('requests_total');
counter.add(1, { method: 'GET' });
```

### 4. Creating Logger from Active Span
```typescript
import { OtelLoggerService } from '@inh-lib/unified-telemetry-otel-adapter';

// Create logger that will automatically use current OpenTelemetry span context
const logger = OtelLoggerService.createLoggerFromActiveSpan(
  baseLogger,
  'my-service',
  'handle-request'
);

// This log will include traceId and spanId from active OpenTelemetry span
logger.info('Processing request', { userId: '123' });
```

### 5. Using with Fastify Logger
```typescript
import Fastify from 'fastify';
import { OtelProviderService } from '@inh-lib/unified-telemetry-otel-adapter';

const fastify = Fastify({ logger: true });

// Create base logger adapter for Fastify
const baseLogger: UnifiedBaseTelemetryLogger = {
  debug: (message: string, attributes?: Record<string, unknown>) => {
    fastify.log.debug(attributes, message);
  },
  info: (message: string, attributes?: Record<string, unknown>) => {
    fastify.log.info(attributes, message);
  },
  warn: (message: string, attributes?: Record<string, unknown>) => {
    fastify.log.warn(attributes, message);
  },
  error: (message: string, attributes?: Record<string, unknown>) => {
    fastify.log.error(attributes, message);
  },
};

// Create provider with Fastify logger
const provider = OtelProviderService.createProvider({
  config: {
    serviceName: 'fastify-service',
    serviceVersion: '1.0.0',
    environment: 'production',
  },
}, baseLogger);
```