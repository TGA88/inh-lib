# @inh-lib/unified-telemetry-provider Directory Structure

```
@inh-lib/unified-telemetry-provider/
├── src/
│   ├── services/
│   │   ├── provider-factory.ts
│   │   ├── telemetry-service.ts
│   │   ├── provider-manager.ts
│   │   └── index.ts
│   ├── constants/                      # ✅ PUBLIC: Constants ที่ export ใน main
│   │   ├── provider-types.const.ts     # PROVIDER_TYPE constants (for consumer)
│   │   ├── provider-status.const.ts    # PROVIDER_STATUS constants (for consumer)
│   │   ├── provider-capabilities.const.ts # PROVIDER_CAPABILITIES constants (for consumer)
│   │   └── index.ts
│   ├── types/                          # ✅ PUBLIC: Types ที่ export ใน main
│   │   ├── provider-config.types.ts    # Provider configuration types (for consumer)
│   │   ├── provider-result.types.ts    # Provider result types (for consumer)
│   │   └── index.ts
│   ├── internal/                       # ❌ INTERNAL: Module ภายในเท่านั้น
│   │   ├── providers/                  # ✅ MOVED: Provider implementations (internal only)
│   │   │   ├── opentelemetry/
│   │   │   │   ├── opentelemetry-provider.ts
│   │   │   │   ├── opentelemetry-logger.ts
│   │   │   │   ├── opentelemetry-tracer.ts
│   │   │   │   ├── opentelemetry-metrics.ts
│   │   │   │   └── index.ts
│   │   │   ├── console/
│   │   │   │   ├── console-provider.ts
│   │   │   │   ├── console-logger.ts
│   │   │   │   ├── console-tracer.ts
│   │   │   │   ├── console-metrics.ts
│   │   │   │   └── index.ts
│   │   │   ├── noop/
│   │   │   │   ├── noop-provider.ts
│   │   │   │   ├── noop-logger.ts
│   │   │   │   ├── noop-tracer.ts
│   │   │   │   ├── noop-metrics.ts
│   │   │   │   └── index.ts
│   │   │   └── index.ts
│   │   ├── constants/                  # ❌ INTERNAL: Constants สำหรับ module ภายใน
│   │   │   ├── error-codes.const.ts    # Internal error codes
│   │   │   ├── default-configs.const.ts # Internal default configurations
│   │   │   ├── sdk-status.const.ts     # Internal SDK status constants
│   │   │   └── index.ts
│   │   ├── types/                      # ❌ INTERNAL: Types สำหรับ module ภายใน
│   │   │   ├── provider-state.types.ts # Internal provider state types
│   │   │   ├── config-validation.types.ts # Internal config validation types
│   │   │   ├── error-handling.types.ts # Internal error types
│   │   │   └── index.ts
│   │   ├── utils/                      # ❌ INTERNAL: Utilities
│   │   │   ├── opentelemetry.utils.ts
│   │   │   ├── console.utils.ts
│   │   │   ├── context.utils.ts
│   │   │   ├── span.utils.ts
│   │   │   ├── provider.utils.ts
│   │   │   ├── configuration.utils.ts
│   │   │   └── index.ts
│   │   └── index.ts                    # Internal exports (NOT exported in main)
│   └── index.ts                        # Main exports (NO internal, NO re-exports)
├── __tests__/
│   ├── services/
│   │   ├── provider-factory.test.ts
│   │   ├── telemetry-service.test.ts
│   │   └── provider-manager.test.ts
│   ├── constants/                      # ✅ PUBLIC: Test public constants
│   │   ├── provider-types.const.test.ts
│   │   ├── provider-status.const.test.ts
│   │   └── provider-capabilities.const.test.ts
│   ├── types/                          # ✅ PUBLIC: Test public types
│   │   ├── provider-config.types.test.ts
│   │   └── provider-result.types.test.ts
│   ├── internal/                       # ❌ INTERNAL: Test internal code
│   │   ├── providers/
│   │   │   ├── opentelemetry/
│   │   │   │   ├── opentelemetry-provider.test.ts
│   │   │   │   ├── opentelemetry-logger.test.ts
│   │   │   │   ├── opentelemetry-tracer.test.ts
│   │   │   │   └── opentelemetry-metrics.test.ts
│   │   │   ├── console/
│   │   │   │   ├── console-provider.test.ts
│   │   │   │   ├── console-logger.test.ts
│   │   │   │   ├── console-tracer.test.ts
│   │   │   │   └── console-metrics.test.ts
│   │   │   ├── noop/
│   │   │   │   ├── noop-provider.test.ts
│   │   │   │   ├── noop-logger.test.ts
│   │   │   │   ├── noop-tracer.test.ts
│   │   │   │   └── noop-metrics.test.ts
│   │   │   └── provider-switching.test.ts
│   │   ├── constants/
│   │   │   ├── error-codes.const.test.ts
│   │   │   ├── default-configs.const.test.ts
│   │   │   └── sdk-status.const.test.ts
│   │   ├── types/
│   │   │   ├── provider-state.types.test.ts
│   │   │   ├── config-validation.types.test.ts
│   │   │   └── error-handling.types.test.ts
│   │   └── utils/
│   │       ├── opentelemetry.utils.test.ts
│   │       ├── console.utils.test.ts
│   │       ├── context.utils.test.ts
│   │       ├── span.utils.test.ts
│   │       ├── provider.utils.test.ts
│   │       └── configuration.utils.test.ts
│   ├── integration/
│   │   ├── provider-lifecycle.test.ts
│   │   ├── cross-provider-compatibility.test.ts
│   │   ├── error-handling.test.ts
│   │   ├── configuration-loading.test.ts
│   │   ├── graceful-fallback.test.ts
│   │   └── performance.test.ts
│   ├── fixtures/
│   │   ├── mock-configs.ts
│   │   ├── test-data.ts
│   │   └── test-helpers.ts
│   └── setup/
│       ├── test-setup.ts
│       └── jest-environment.ts
├── docs/
│   ├── README.md
│   ├── API.md
│   ├── PROVIDERS.md
│   ├── CONFIGURATION.md
│   └── examples/
│       ├── basic-usage.md
│       ├── opentelemetry-setup.md
│       ├── custom-provider.md
│       └── testing-guide.md
├── config/
│   ├── jest.config.js
│   ├── tsconfig.json
│   ├── tsconfig.build.json
│   └── eslint.config.js
├── package.json
├── .gitignore
├── .npmignore
└── build/                              # Build output (NO internal/ folder)
    ├── services/
    ├── constants/                      # Public constants only
    ├── types/                          # Public types only
    ├── index.js
    └── index.d.ts
```

## 📦 Key Dependencies Structure

### package.json dependencies
```json
{
  "dependencies": {
    "@inh-lib/unified-telemetry-core": "^1.0.0",
    "tslib": "^2.6.0"
  },
  "optionalDependencies": {
    "@opentelemetry/api": "^1.9.0",
    "@opentelemetry/sdk-node": "^0.203.0",
    "@opentelemetry/auto-instrumentations-node": "^0.203.0",
    "@opentelemetry/resources": "^1.26.0",
    "@opentelemetry/semantic-conventions": "^1.27.0",
    "@opentelemetry/exporter-otlp-http": "^0.203.0",
    "@opentelemetry/instrumentation-http": "^0.203.0",
    "@opentelemetry/exporter-prometheus": "^0.203.0",
    "@opentelemetry/exporter-jaeger": "^1.26.0"
  },
  "devDependencies": {
    "@types/jest": "^29.5.0",
    "@types/node": "^20.0.0",
    "jest": "^29.6.0",
    "ts-jest": "^29.1.0",
    "typescript": "^5.1.0"
  }
}
```

## 📤 Main Index Exports (src/index.ts)

```typescript
// =============================================================================
// 🛠️ SERVICE CLASSES (สำหรับ consumer ใช้)
// =============================================================================

// ✅ ProviderFactory - สร้าง provider ตาม config (MAIN ENTRY POINT)
export { ProviderFactory } from './services/provider-factory';

// ✅ TelemetryService - รวม utils functions ไว้ให้ consumer ใช้
export { TelemetryService } from './services/telemetry-service';

// ✅ ProviderManager - จัดการ lifecycle ของ providers
export { ProviderManager } from './services/provider-manager';

// =============================================================================
// 🎯 CONSTANTS & ENUMS REPLACEMENT
// =============================================================================

// 🎯 PUBLIC CONSTANTS (จาก ./constants/ folder)  
export { PROVIDER_TYPE } from './constants/provider-types.const';
export type { ProviderType } from './constants/provider-types.const';

export { PROVIDER_STATUS } from './constants/provider-status.const';
export type { ProviderStatus } from './constants/provider-status.const';

export { PROVIDER_CAPABILITIES } from './constants/provider-capabilities.const';
export type { ProviderCapability } from './constants/provider-capabilities.const';


// =============================================================================
// 📋 TYPE DEFINITIONS
// =============================================================================

// 📋 TYPES SECTION (มาหลัง - เฉพาะ pure interfaces)
export type {
  ProviderConfig,           // ✅ Pure interface
  OpenTelemetryConfig,      // ✅ Pure interface
  ConsoleConfig,            // ✅ Pure interface
  NoOpConfig,              // ✅ Pure interface
  ProviderFactoryConfig    // ✅ Pure interface
} from './types/provider-config.types';

export type {
  ProviderInitResult,      // ✅ Pure interface
  ProviderMetadata        // ✅ Pure interface
} from './types/provider-result.types';

// =============================================================================
// ❌ WHAT IS NOT EXPORTED
// =============================================================================

// ❌ Provider implementations - Force consumers to use ProviderFactory
// ❌ export { OpenTelemetryProvider } from './providers/opentelemetry';
// ❌ export { ConsoleProvider } from './providers/console';  
// ❌ export { NoOpProvider } from './providers/noop';

// ❌ Utils functions - Internal use only
// ❌ export * from './utils';

// ❌ Internal implementation details
// ❌ export { OpenTelemetrySDKSetup } from './providers/opentelemetry/internal';
```

## 🎯 Key Architectural Decisions

### 1. Export Strategy
- **✅ Services Only**: Export service classes that expose utils functions to consumers
- **✅ Types & Constants**: Export type definitions and constants for consumer use
- **❌ No Direct Providers**: Force consumers to use ProviderFactory for better abstraction
- **❌ No Utils Export**: Keep utils as internal functions, accessed through services

### 2. Provider Separation
- Each provider (opentelemetry/console/noop) is self-contained
- Common interfaces from unified-telemetry-core
- Provider-specific utilities in separate utils files

### 3. Service Layer
- ProviderFactory: Creates providers based on configuration (MAIN ENTRY POINT)
- TelemetryService: Exposes common telemetry operations to consumers
- ProviderManager: Handles lifecycle and provider switching

### 4. Utils Pattern
- Utils files with .utils.ts extension (not exported in main index)
- Replace private methods in classes
- Provider-specific utils for each implementation

### 5. Types Structure
- Provider-specific configuration types
- Factory configuration types
- Service configuration types

### 6. Testing Structure
- Comprehensive unit tests for each component
- Integration tests for provider interactions
- Performance tests for overhead measurement
- Error handling and fallback scenarios