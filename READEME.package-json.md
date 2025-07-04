    ``` json
    "optionalDependencies": {
    // use by project api-fastify-util
    "fastify-plugin": "^4.0.0",

     // Core OpenTelemetry
    "@opentelemetry/api": "^1.9.0",
    "@opentelemetry/sdk-node": "^0.50.0",
    "@opentelemetry/auto-instrumentations-node": "^0.45.0",

     // SDK packages
    "@opentelemetry/sdk-metrics": "^1.23.0",
    "@opentelemetry/sdk-trace-node": "^1.23.0",
    "@opentelemetry/resources": "^1.23.0",
    "@opentelemetry/semantic-conventions": "^1.23.0",

    // Exporters (most commonly used)
    "@opentelemetry/exporter-prometheus": "^0.50.0",
    "@opentelemetry/exporter-jaeger": "^1.23.0",
    "@opentelemetry/exporter-metrics-otlp-http": "^0.203.0",
    "@opentelemetry/exporter-trace-otlp-http": "^0.203.0",

     // Instrumentations (core ones)
    "@opentelemetry/instrumentation": "^0.50.0",
    "@opentelemetry/instrumentation-http": "^0.50.0",
    "@opentelemetry/instrumentation-fastify": "^0.39.0"
  },
  ```