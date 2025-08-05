# @inh-lib/unified-telemetry-middleware

## Project Structure

```
src/
├── services/
│   └── telemetry-middleware.service.ts     # Main service class
├── telemetry-middleware.const.ts           # Public constants  
└── index.ts                                # Main exports

internal/
├── adapters/
│   └── telemetry-extractor.adapter.ts      # W3C/B3 trace extraction
├── logic/
│   ├── metrics-collector.logic.ts          # Metrics collection logic
│   ├── resource-tracker.logic.ts           # CPU/Memory tracking
│   └── trace-extractor.logic.ts            # Trace/span extraction
├── types/
│   └── middleware.types.ts                 # Internal type definitions
├── utils/
│   ├── performance.utils.ts                # Performance utilities
│   └── context.utils.ts                    # Context utilities  
└── constants/
    └── telemetry.const.ts                  # Internal constants
```

## Key Features

- ✅ W3C & B3 trace format support
- ✅ Complete metrics collection per metrics-dashboard.README.md
- ✅ Memory & CPU tracking per request
- ✅ Seamless unified-route integration
- ✅ No private methods, uses utils functions
- ✅ Service-based architecture
- ✅ Type-safe (no any types)
- ✅ No enums (uses union types)