# @inh-lib/unified-util-otel

## Package Structure

```
src/
├── adapters/
│   ├── metrics/
│   │   ├── index.ts
│   │   ├── otel-counter-adapter.ts
│   │   ├── otel-histogram-adapter.ts
│   │   ├── otel-gauge-adapter.ts
│   │   └── otel-metric-provider-adapter.ts
│   ├── tracing/
│   │   ├── index.ts
│   │   ├── otel-tracer-adapter.ts
│   │   ├── otel-span-adapter.ts
│   │   └── otel-trace-provider-adapter.ts
│   └── logging/
│       ├── index.ts
│       ├── otel-logger-adapter.ts
│       └── otel-log-provider-adapter.ts
├── factories/
│   ├── index.ts
│   ├── otel-metric-provider-factory.ts
│   ├── otel-trace-provider-factory.ts
│   └── otel-log-provider-factory.ts
├── configuration/
│   ├── index.ts
│   ├── otel-config-mapper.ts
│   └── otel-resource-builder.ts
├── utils/
│   ├── index.ts
│   ├── otel-metric.utils.ts
│   ├── otel-trace.utils.ts
│   ├── otel-log.utils.ts
│   ├── otel-resource.utils.ts
│   ├── otel-exporter.utils.ts
│   └── otel-validation.utils.ts
├── internal/
│   ├── index.ts
│   ├── otel-registry.ts
│   ├── otel-exporter-manager.ts
│   ├── otel-instrumentation-manager.ts
│   └── test-utils.ts
├── types/
│   ├── index.ts
│   ├── otel-config.types.ts
│   └── otel-internal.types.ts
└── index.ts
```

## Dependencies

```json
{
  "dependencies": {
    "@inh-lib/unified-observe-ability-core": "^1.0.0",
    "@opentelemetry/api": "^1.7.0",
    "@opentelemetry/sdk-metrics": "^1.18.2",
    "@opentelemetry/sdk-trace-node": "^1.18.2",
    "@opentelemetry/resources": "^1.18.2",
    "@opentelemetry/semantic-conventions": "^1.18.2",
    "@opentelemetry/exporter-prometheus": "^0.45.1",
    "@opentelemetry/exporter-jaeger": "^1.18.2",
    "@opentelemetry/exporter-otlp-http": "^0.26.0",
    "@opentelemetry/instrumentation": "^0.45.1",
    "@opentelemetry/instrumentation-http": "^0.45.1"
  },
  "optionalDependencies": {
    "@opentelemetry/sdk-node": "^0.45.1",
    "@opentelemetry/auto-instrumentations-node": "^0.39.4",
    "@opentelemetry/instrumentation-express": "^0.34.0",
    "@opentelemetry/instrumentation-fastify": "^0.33.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    "eslint": "^8.45.0",
    "jest": "^29.5.0",
    "ts-jest": "^29.1.0",
    "typescript": "^5.0.0"
  }
}
```