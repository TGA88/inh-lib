# @inh-lib/unified-telemetry-core Project Structure

## 🔄 **Structure Improvements & Code Quality Rules**

หลังจากรีวิว พบว่า structure เดิมมีจุดที่อาจสับสนได้ และมีข้อกำหนดใหม่:

### 📁 **Structure Changes**
- ✅ **เปลี่ยน `types/` เป็น `interfaces/`** - ชื่อชัดเจนกว่า เพราะเก็บ interface definitions
- ✅ **เปลี่ยน `tests/` เป็น `__tests__/`** - Jest standard convention
- ✅ **เปลี่ยน `logger/` เป็น `loggers/`** - plural form เพราะมี implementations หลายตัว
- ✅ **เอา `core-telemetry-service.ts` ออก** - ไม่จำเป็นเพราะใช้ Provider Injection
- ✅ **เพิ่ม `providers/` folder** - สำหรับ provider implementations

### 🚫 **Code Quality Rules**
- ❌ **ห้ามใช้ `any` type** - ทุก type ต้องระบุชัดเจน
- ❌ **ห้ามใช้ `enum`** - ใช้ union types + constants แทน
- ❌ **ห้าม private methods ใน class** - ใช้ utils functions แทน
- ❌ **ห้าม export utils ใน main index** - utils เป็น internal functions

### 🎯 **Architecture Changes**
- ✅ **Provider Injection Pattern** - ไม่ต้องมี service wrapper
- ✅ **Direct Component Access** - provider.logger.method()
- ✅ **Clean Provider Interface** - ไม่มี helper methods
- ✅ **Utils as Internal Functions** - แทนที่ private methods

## 📁 Directory Structure

```
@inh-lib/unified-telemetry-core/
├── src/
│   ├── interfaces/                    # ✅ Interface definitions
│   │   ├── provider.ts               # UnifiedTelemetryProvider interface
│   │   ├── logger.ts                # UnifiedTelemetryLogger interface + context types
│   │   ├── tracer.ts                # UnifiedTelemetryTracer + Span interfaces
│   │   ├── metrics.ts               # UnifiedTelemetryMetrics interfaces
│   │   ├── config.ts                # UnifiedTelemetryConfig
│   │   └── index.ts                 # Export all interfaces
│   ├── implementations/
│   │   ├── loggers/                 # Logger implementations
│   │   │   ├── default-telemetry-logger.ts    # DefaultUnifiedTelemetryLogger
│   │   │   ├── console-telemetry-logger.ts    # ConsoleUnifiedTelemetryLogger  
│   │   │   ├── noop-telemetry-logger.ts       # NoOpUnifiedTelemetryLogger
│   │   │   └── index.ts                       # Export logger implementations
│   │   ├── providers/               # ✅ Provider implementations
│   │   │   ├── console-provider.ts             # ConsoleProvider
│   │   │   ├── noop-provider.ts               # NoOpProvider  
│   │   │   └── index.ts                       # Export provider implementations
│   │   └── index.ts                 # Export all implementations
│   ├── utils/                       # ✅ Internal utility functions (NOT exported in main index)
│   │   ├── span-helpers.ts          # Span utility functions
│   │   ├── context-helpers.ts       # Context utility functions
│   │   ├── id-generators.ts         # TraceId/SpanId generators
│   │   ├── logger-helpers.ts        # ✅ Logger utility functions (replacing private methods)
│   │   └── index.ts                 # Export utilities (internal use only)
│   └── index.ts                     # ✅ Main package exports (NO utils export)
├── __tests__/                       # Jest convention
│   ├── interfaces/
│   │   └── *.test.ts
│   ├── implementations/
│   │   └── *.test.ts
│   └── integration/
│       └── *.test.ts
├── docs/
│   ├── README.md
│   ├── API.md
│   └── examples/
│       ├── basic-usage.md
│       └── custom-implementation.md
├── package.json
├── tsconfig.json
├── tsconfig.build.json
├── jest.config.js
├── .eslintrc.js
├── .prettierrc
├── .gitignore
└── build/                           # Build output
    ├── interfaces/
    ├── implementations/
    ├── index.js
    └── index.d.ts                   # ✅ NO utils/ in build output
```

## 📄 Key Files Content Overview

### 🔧 **package.json**
```json
{
  "name": "@inh-lib/unified-telemetry-core",
  "version": "1.0.0",
  "description": "Core telemetry abstractions - framework and layer agnostic",
  "main": "build/index.js",
  "types": "build/index.d.ts",
  "files": [
    "build/"
  ],
  "scripts": {
    "build": "tsc -p tsconfig.build.json",
    "test": "jest",
    "test:watch": "jest --watch",
    "lint": "eslint src/ --ext .ts",
    "clean": "rimraf build/",
    "prepublishOnly": "npm run clean && npm run build"
  },
  "keywords": [
    "telemetry",
    "logging",
    "tracing", 
    "metrics",
    "observability",
    "typescript"
  ],
  "dependencies": {
    "tslib": "^2.6.0"
  },
  "devDependencies": {
    "@types/jest": "^29.5.0",
    "@types/node": "^20.0.0",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    "eslint": "^8.45.0",
    "jest": "^29.6.0",
    "prettier": "^3.0.0",
    "rimraf": "^5.0.0",
    "ts-jest": "^29.1.0",
    "typescript": "^5.1.0"
  },
  "peerDependencies": {},
  "repository": {
    "type": "git",
    "url": "https://github.com/inh-lib/unified-telemetry-core"
  },
  "license": "MIT"
}
```

### 🏗️ **src/interfaces/provider.ts**
```typescript
/**
 * Core telemetry provider interface
 * Pure component holder - no helper methods
 */
export interface UnifiedTelemetryProvider {
  logger: UnifiedTelemetryLogger;
  tracer: UnifiedTelemetryTracer;
  metrics: UnifiedTelemetryMetrics;
  shutdown(): Promise<void>;
}
```

### 📝 **src/interfaces/logger.ts**
```typescript
/**
 * Main telemetry logger interface with tracing integration
 */
export interface UnifiedTelemetryLogger {
  // Core logging methods
  debug(message: string, attributes?: Record<string, unknown>): void;
  info(message: string, attributes?: Record<string, unknown>): void;
  warn(message: string, attributes?: Record<string, unknown>): void;
  error(message: string, error?: Error, attributes?: Record<string, unknown>): void;
  
  // Span integration
  addSpanEvent(name: string, attributes?: Record<string, string | number | boolean>): void;
  setSpanAttribute(key: string, value: string | number | boolean): void;
  attachSpan(span: UnifiedTelemetrySpan): void;
  finishSpan(): void;
  getSpanId(): string;
  
  // Context management
  createChildLogger(operationName: string, attributes?: Record<string, string | number | boolean>): UnifiedTelemetryLogger;
  createChildContext(operationName: string): UnifiedLoggerContext;
  getTraceId(): string;
}

/**
 * Logger context for tracing integration
 */
export interface UnifiedLoggerContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  operationType: 'http' | 'business' | 'database' | 'utility' | 'integration' | 'auth';
  operationName: string;
  layer: 'http' | 'service' | 'data' | 'core' | 'integration';
  attributes: Record<string, string | number | boolean>;
  startTime: Date;
}

/**
 * Base logger interface for provider implementations
 */
export interface UnifiedBaseTelemetryLogger {
  debug(message: string, attributes?: Record<string, unknown>): void;
  info(message: string, attributes?: Record<string, unknown>): void;
  warn(message: string, attributes?: Record<string, unknown>): void;
  error(message: string, attributes?: Record<string, unknown>): void;
}
```

### 🔍 **src/interfaces/tracer.ts**
```typescript
/**
 * Telemetry tracer interface
 */
export interface UnifiedTelemetryTracer {
  startSpan(name: string, options?: UnifiedSpanOptions): UnifiedTelemetrySpan;
  getActiveSpan(): UnifiedTelemetrySpan | undefined;
  getCurrentTraceId(): string | undefined;
  getCurrentSpanId(): string | undefined;
}

/**
 * Telemetry span interface
 */
export interface UnifiedTelemetrySpan {
  setTag(key: string, value: string | number | boolean): UnifiedTelemetrySpan;
  setStatus(status: UnifiedSpanStatus): UnifiedTelemetrySpan;
  recordException(exception: Error): UnifiedTelemetrySpan;
  addEvent(name: string, attributes?: Record<string, string | number | boolean>): UnifiedTelemetrySpan;
  finish(): void;
  getTraceId(): string;
  getSpanId(): string;
}

// Supporting types
export interface UnifiedSpanOptions {
  kind?: UnifiedSpanKind;
  attributes?: Record<string, string | number | boolean>;
  startTime?: Date;
}

// ✅ เปลี่ยนจาก enum เป็น union types + constants
export type UnifiedSpanKind = 'internal' | 'server' | 'client' | 'producer' | 'consumer';

export const SPAN_KIND = {
  INTERNAL: 'internal' as const,
  SERVER: 'server' as const,
  CLIENT: 'client' as const,
  PRODUCER: 'producer' as const,
  CONSUMER: 'consumer' as const,
} as const;

export interface UnifiedSpanStatus {
  code: UnifiedSpanStatusCode;
  message?: string;
}

// ✅ เปลี่ยนจาก enum เป็น union types + constants
export type UnifiedSpanStatusCode = 'unset' | 'ok' | 'error';

export const SPAN_STATUS_CODE = {
  UNSET: 'unset' as const,
  OK: 'ok' as const,
  ERROR: 'error' as const,
} as const;
```

### 📊 **src/interfaces/metrics.ts**
```typescript
/**
 * Telemetry metrics interface
 */
export interface UnifiedTelemetryMetrics {
  createCounter(name: string, description?: string): UnifiedTelemetryCounter;
  createHistogram(name: string, description?: string): UnifiedTelemetryHistogram;
  createGauge(name: string, description?: string): UnifiedTelemetryGauge;
}

/**
 * Counter metric interface
 */
export interface UnifiedTelemetryCounter {
  add(value: number, labels?: Record<string, string>): void;
}

/**
 * Histogram metric interface
 */
export interface UnifiedTelemetryHistogram {
  record(value: number, labels?: Record<string, string>): void;
}

/**
 * Gauge metric interface
 */
export interface UnifiedTelemetryGauge {
  set(value: number, labels?: Record<string, string>): void;
}
```

### ⚙️ **src/interfaces/config.ts**
```typescript
/**
 * Telemetry configuration
 * ✅ No 'any' types - all types are explicit
 */
export interface UnifiedTelemetryConfig {
  serviceName: string;
  serviceVersion: string;
  environment: 'development' | 'staging' | 'production';
  instanceId?: string;
  
  // Optional feature flags
  enableLogging?: boolean;
  enableTracing?: boolean;
  enableMetrics?: boolean;
  
  // Optional configuration
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  sampleRate?: number;
  
  // ✅ Provider-specific config - typed as Record instead of any
  providerConfig?: Record<string, string | number | boolean | Record<string, unknown>>;
}

/**
 * Provider initialization options
 */
export interface ProviderInitOptions {
  config: UnifiedTelemetryConfig;
  customAttributes?: Record<string, string | number | boolean>;
}
```

### 🏭 **src/implementations/loggers/default-telemetry-logger.ts**
```typescript
import { 
  UnifiedTelemetryLogger, 
  UnifiedLoggerContext, 
  UnifiedBaseTelemetryLogger,
  UnifiedTelemetrySpan 
} from '../../interfaces';
import {
  enrichLogAttributes,
  createChildLoggerContext,
  generateSpanId
} from '../../utils/logger-helpers';

/**
 * Default implementation of UnifiedTelemetryLogger
 * ✅ No private methods - uses utils functions instead
 */
export class DefaultUnifiedTelemetryLogger implements UnifiedTelemetryLogger {
  constructor(
    private baseLogger: UnifiedBaseTelemetryLogger,
    private context: UnifiedLoggerContext,
    private span?: UnifiedTelemetrySpan
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
    const errorAttrs = error ? {
      error: error.message,
      errorType: error.constructor.name,
      stack: error.stack,
    } : {};

    this.logWithSpan('error', message, { ...errorAttrs, ...attributes });
    
    if (this.span) {
      if (error) {
        this.span.recordException(error);
      }
      this.span.addEvent('error', { message, ...errorAttrs, ...attributes });
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

  createChildLogger(operationName: string, attributes?: Record<string, string | number | boolean>): UnifiedTelemetryLogger {
    // ✅ Using utils function instead of private method
    const childContext = createChildLoggerContext(this.context, operationName, attributes);
    return new DefaultUnifiedTelemetryLogger(this.baseLogger, childContext);
  }

  createChildContext(operationName: string): UnifiedLoggerContext {
    // ✅ Using utils function instead of private method
    return createChildLoggerContext(this.context, operationName);
  }

  // ✅ No private methods - moved logic to utils functions
  logWithSpan(level: string, message: string, attributes?: Record<string, unknown>): void {
    // ✅ Using utils function for enriching attributes
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
        ...attributes,
      });
    }
  }
}
```

### 🔧 **src/utils/logger-helpers.ts** 
```typescript
import { UnifiedLoggerContext } from '../interfaces';

/**
 * ✅ Utility functions replacing private methods in logger classes
 * These functions are NOT exported in main index - internal use only
 */

/**
 * Enrich log attributes with context information
 */
export function enrichLogAttributes(
  context: UnifiedLoggerContext, 
  attributes?: Record<string, unknown>
): Record<string, unknown> {
  return {
    // Trace context
    traceId: context.traceId,
    spanId: context.spanId,
    parentSpanId: context.parentSpanId,
    
    // Operation context
    layer: context.layer,
    operationType: context.operationType,
    operationName: context.operationName,
    
    // Timing
    timestamp: new Date().toISOString(),
    operationDuration: Date.now() - context.startTime.getTime(),
    
    // Context attributes
    ...context.attributes,
    
    // Method attributes (highest priority)
    ...attributes,
  };
}

/**
 * Create child logger context
 */
export function createChildLoggerContext(
  parentContext: UnifiedLoggerContext,
  operationName: string,
  additionalAttributes?: Record<string, string | number | boolean>
): UnifiedLoggerContext {
  return {
    ...parentContext,
    parentSpanId: parentContext.spanId,
    spanId: generateSpanId(),
    operationName,
    startTime: new Date(),
    attributes: {
      ...parentContext.attributes,
      ...additionalAttributes,
    },
  };
}

/**
 * Generate span ID
 */
export function generateSpanId(): string {
  return Array.from({ length: 16 }, () => 
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
}
```

### 🔧 **src/utils/id-generators.ts**
```typescript
/**
 * Utility functions for generating trace and span IDs
 */
export function generateTraceId(): string {
  return Array.from({ length: 32 }, () => 
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
}

export function generateSpanId(): string {
  return Array.from({ length: 16 }, () => 
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
}
```

### 📤 **src/index.ts** (Main Export)
```typescript
// ✅ Interfaces - Public API
export * from './interfaces';

// ✅ Implementations - Public API
export * from './implementations';

// ❌ Utils - NOT exported (internal use only)
// export * from './utils';

// ✅ Re-export key interfaces for convenience
export type {
  UnifiedTelemetryProvider,
  UnifiedTelemetryLogger,
  UnifiedTelemetryTracer,
  UnifiedTelemetryMetrics,
  UnifiedTelemetryConfig
} from './interfaces';

// ✅ Export constants for span kinds and status codes
export { SPAN_KIND, SPAN_STATUS_CODE } from './interfaces/tracer';
```

### 🔒 **src/utils/index.ts** (Internal Export Only)
```typescript
// ✅ These utilities are for internal use only
// NOT exported in main index.ts

export * from './span-helpers';
export * from './context-helpers';
export * from './id-generators';
export * from './logger-helpers';

// Note: These functions are used internally by implementations
// but not exposed as public API to package consumers
```

## 🎯 **Key Design Principles**

### ✅ **1. Pure Abstractions**
- No framework dependencies
- No HTTP concepts  
- Layer-agnostic interfaces
- **NO core-telemetry-service** - Direct provider usage

### ✅ **2. Clear Separation**
- **Interfaces** vs **Implementations** (แยก interfaces ออกจาก types)
- **Public API** vs **Internal Utils** (utils ไม่ export ใน main index)
- Core vs Provider-specific code

### ✅ **3. Better Naming Conventions**
- `interfaces/` แทน `types/` - ชัดเจนกว่า
- `__tests__/` - Jest standard convention
- `loggers/` - plural form สำหรับ multiple implementations
- `build/` - common build output directory

### ✅ **4. Code Quality Rules**
- **No `any` types** - ทุก type ต้องชัดเจน
- **No `enum`** - ใช้ union types + constants แทน
- **No private methods** - ใช้ utils functions แทน
- **Utils เป็น internal** - ไม่ export ใน main index

### ✅ **5. Architecture Simplification**
- **Provider Injection Pattern** - ไม่ต้องมี service layer
- **Direct Component Access** - provider.logger.method()
- **Clean Interfaces** - ไม่มี helper methods ใน provider

### ✅ **6. Extensibility**
- Interface-based design
- Multiple implementations supported
- Plugin-friendly architecture

### ✅ **7. TypeScript First**
- Full type safety
- Excellent IDE support
- Self-documenting APIs

### ✅ **8. Testing**
- Comprehensive unit tests
- Integration tests
- Mock-friendly design

## 🚀 **Usage After Build**

```typescript
// Consumer code - Direct provider usage (NO core-telemetry-service)
import { 
  UnifiedTelemetryProvider,
  UnifiedTelemetryLogger,
  DefaultUnifiedTelemetryLogger,
  SPAN_KIND,
  SPAN_STATUS_CODE
} from '@inh-lib/unified-telemetry-core';

// ✅ Type-safe, clean APIs
const logger: UnifiedTelemetryLogger = provider.logger;
const childLogger = logger.createChildLogger('operation');

// ✅ Direct component access
const span = provider.tracer.startSpan('operation', {
  kind: SPAN_KIND.SERVER
});

const counter = provider.metrics.createCounter('requests_total');
counter.add(1, { method: 'POST' });

// ✅ No private methods - clean public interface
// ✅ No 'any' types - full type safety
// ✅ No enums - union types with constants
```

## 📦 **Build Output Structure**

The `build/` folder will mirror the `src/` structure:
- Compiled JavaScript files
- TypeScript declaration files
- Source maps (optional)
- Package metadata

This structure provides:
- 🎯 **Clear separation of concerns**
- 🔧 **Easy maintenance and testing**  
- 📦 **Clean public API** (no utils export)
- 🚀 **Excellent developer experience**
- 🏗️ **Scalable architecture** (no service layer complexity)
- 🔒 **Type safety** (no any types)
- 📏 **Code quality** (no private methods, no enums)
- ⚡ **Direct provider access** (no wrapper layers)