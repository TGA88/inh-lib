@inh-lib/unified-telemetry-http/
├── src/
│   ├── interfaces/                    # ✅ HTTP-specific interfaces
│   │   ├── http-telemetry.ts         # UnifiedHttpContextWithTelemetry
│   │   ├── middleware.ts             # HTTP middleware interfaces  
│   │   └── index.ts                  # Export interfaces
│   ├── implementations/
│   │   ├── middleware/               # ✅ Middleware implementations
│   │   │   ├── http-telemetry-middleware.ts
│   │   │   ├── context-propagation-middleware.ts
│   │   │   └── index.ts
│   │   └── index.ts                  # Export implementations
│   ├── utils/                        # ✅ Internal utilities (NOT exported)
│   │   ├── http-context.utils.ts     # HTTP context utilities
│   │   ├── trace-extraction.utils.ts # Trace ID extraction
│   │   └── index.ts                  # Internal exports only
│   └── index.ts                      # Main exports (NO utils)
├── __tests__/
├── package.json
└── tsconfig.json


{
  "name": "@inh-lib/unified-telemetry-http",
  "dependencies": {
    "@inh-lib/unified-telemetry-core": "^1.0.0",  // ✅ ใช้ core package
    "@inh-lib/unified-route": "^1.0.0"            // ✅ HTTP context
  }
}