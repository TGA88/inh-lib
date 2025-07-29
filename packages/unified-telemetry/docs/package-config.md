{
  "name": "@inh-lib/unified-telemetry",
  "version": "1.0.0",
  "type": "commonjs",
  "description": "Framework-agnostic telemetry library with OpenTelemetry support for unified-route",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "files": [
    "dist/**/*",
    "README.md"
  ],
  "scripts": {
    "build": "tsc",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "lint": "eslint src/**/*.ts",
    "lint:fix": "eslint src/**/*.ts --fix"
  },
  "keywords": [
    "telemetry",
    "opentelemetry",
    "observability",
    "tracing",
    "metrics",
    "logging",
    "framework-agnostic",
    "unified-route"
  ],
  "publishConfig": {
    "access": "public"
  },
  "peerDependencies": {
    "@inh-lib/unified-route": "^1.0.0"
  },
  "devDependencies": {
    "@types/jest": "^29.5.0",
    "@types/node": "^20.0.0",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    "eslint": "^8.0.0",
    "jest": "^29.5.0",
    "ts-jest": "^29.1.0",
    "typescript": "^5.0.0"
  },
  "optionalDependencies": {
    "@opentelemetry/api": "^1.7.0",
    "@opentelemetry/sdk-node": "^0.45.0",
    "@opentelemetry/auto-instrumentations-node": "^0.40.0",
    "@opentelemetry/exporter-otlp-http": "^0.45.0",
    "@opentelemetry/exporter-metrics-otlp-http": "^0.45.0"
  },
  "engines": {
    "node": ">=16.0.0"
  },
  "repository": {
    "type": "git",
    "url": "https://github.com/your-org/unified-telemetry.git"
  },
  "author": "Your Name",
  "license": "MIT"
}