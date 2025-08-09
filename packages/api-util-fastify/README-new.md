# @inh-lib/api-util-fastify

> Comprehensive Fastify utilities collection - Everything you need for building robust Fastify applications

A complete toolkit of utilities, adapters, and helpers for Fastify applications. This package provides a unified set of tools to enhance your Fastify development experience with type safety, middleware composition, and production-ready patterns.

## ✨ Features

- 🚀 **Unified Route Adapter** - Seamlessly integrate with @inh-lib/unified-route pattern
- 📊 **Telemetry Integration** - Complete observability with OpenTelemetry, distributed tracing, and metrics
- 🔒 **Type-Safe** - Full TypeScript support with comprehensive type definitions
- 📦 **Modular Design** - Use only what you need, tree-shakeable utilities
- 🎯 **Zero Dependencies** - Only peer dependencies on Fastify and related libraries
- 🔧 **Production Ready** - Battle-tested utilities for enterprise applications
- 📈 **Performance Focused** - Optimized for Fastify's high-performance architecture

## 📦 Installation

### Option 1: Fastify Plugin Approach (Recommended)

For pure Fastify applications using the plugin pattern:

```bash
npm install @inh-lib/api-util-fastify @inh-lib/unified-telemetry-core fastify
```

### Option 2: UnifiedRoute Middleware Approach

For applications using the unified route pattern with middleware composition:

```bash
npm install @inh-lib/api-util-fastify @inh-lib/unified-route @inh-lib/unified-telemetry-middleware @inh-lib/unified-telemetry-core fastify
```

### Peer Dependencies

This package has the following peer dependencies:
- `@inh-lib/unified-telemetry-core` - Core telemetry provider
- `@inh-lib/unified-route` - Unified route pattern (required for Option 2)
- `tslib` - TypeScript runtime library
- `fastify` - Web framework

> **Note**: With npm 7+, yarn 2+, or pnpm, peer dependencies are automatically installed. For earlier versions, install them manually.

## 🎯 Choose Your Approach

| Approach | Best For | Complexity | Dependencies |
|----------|----------|------------|--------------|
| **Option 1: Fastify Plugin** | Pure Fastify apps, simpler setup | Lower | Fewer packages |
| **Option 2: UnifiedRoute** | Multi-framework apps, middleware composition | Higher | More packages |

## 🛠️ Available Utilities

### 1. Unified Route Adapter

Adapter for integrating Fastify with the @inh-lib/unified-route pattern for consistent middleware composition.

```typescript
import { 
  createFastifyContext,
  adaptFastifyRequest,
  adaptFastifyResponse 
} from '@inh-lib/api-util-fastify';
```

**Features:**
- Convert Fastify req/res to unified context
- Type-safe request body handling
- Seamless middleware composition
- Registry pattern support

📖 **[Read the complete Unified Fastify Adapter Guide →](./docs/unified-fastify-adapter.md)**

### 2. Telemetry Integration

Complete observability solution with distributed tracing, metrics, and logging for Fastify applications.

```typescript
// For Fastify plugin approach
import { 
  TelemetryPluginService,
  TELEMETRY_REGISTRY_KEYS,
  DEFAULT_TELEMETRY_PLUGIN_OPTIONS 
} from '@inh-lib/api-util-fastify';

// For UnifiedRoute middleware approach
import { TelemetryMiddlewareService } from '@inh-lib/unified-telemetry-middleware';
```

**Features:**
- OpenTelemetry integration with auto-instrumentation
- Distributed tracing with hierarchical spans
- Structured logging with trace context
- Performance metrics and system monitoring
- Framework-agnostic telemetry provider
- Production-ready observability stack

📖 **[Read the complete Telemetry Plugin Guide →](./docs/telemetry-plugin.md)**

## 🚀 Quick Start

### Fastify Plugin Approach

```typescript
import Fastify from 'fastify';
import { TelemetryPluginService } from '@inh-lib/api-util-fastify';

const fastify = Fastify({ logger: true });

// Register telemetry plugin
await fastify.register(TelemetryPluginService.createPlugin({
  telemetryProvider,
  autoTracing: true,
  serviceName: 'my-fastify-app'
}));

// Route with automatic telemetry
fastify.get('/api/users/:id', async (req, res) => {
  const context = fastify.telemetry.createEnhancedContext(req, res);
  const logger = context.telemetry.logger;
  
  logger?.info('Processing request', { userId: req.params.id });
  res.send({ message: 'Hello from Fastify with Telemetry!' });
});

fastify.listen({ port: 3000 });
```

### UnifiedRoute Middleware Approach

```typescript
import Fastify from 'fastify';
import { createFastifyContext } from '@inh-lib/api-util-fastify';
import { composeMiddleware } from '@inh-lib/unified-route';
import { TelemetryMiddlewareService } from '@inh-lib/unified-telemetry-middleware';

const fastify = Fastify({ logger: true });
const telemetryMiddleware = new TelemetryMiddlewareService(provider, config);

fastify.get('/api/users/:id', async (req, res) => {
  const context = createFastifyContext(req, res);
  
  const handler = composeMiddleware([
    telemetryMiddleware.createMiddleware(),
    async (context, next) => {
      const logger = telemetryMiddleware.getCurrentLogger(context);
      logger?.info('Processing unified request');
      
      context.response.json({ message: 'Hello from UnifiedRoute!' });
      await next();
    }
  ]);
  
  await handler(context);
});

fastify.listen({ port: 3000 });
```

## 📚 Documentation

### Core Guides
- **[Unified Fastify Adapter Guide](./docs/unified-fastify-adapter.md)** - Complete guide for framework adapter
- **[Telemetry Plugin Guide](./docs/telemetry-plugin.md)** - Complete observability setup and usage

### API References
- [Available Exports](./src/index.ts) - All exported functions and types
- [Type Definitions](./src/lib/) - TypeScript interfaces and types

### Related Packages
- [@inh-lib/unified-route](../unified-route/README.md) - Framework-agnostic route patterns
- [@inh-lib/unified-telemetry-core](../unified-telemetry-core/README.md) - Core telemetry interfaces
- [@inh-lib/unified-telemetry-middleware](../unified-telemetry-middleware/README.md) - Telemetry middleware

## 🔧 Development

### Prerequisites
- Node.js >= 16
- TypeScript >= 4.8
- Fastify >= 4.x

### Building
```bash
npm run build
```

### Testing
```bash
npm run test
```

### Linting
```bash
npm run lint
```

## 📄 License

MIT © [TGA88](https://github.com/TGA88)

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](../../CONTRIBUTING.md) for details.

## 📞 Support

- 📖 [Documentation](./docs/)
- 🐛 [Issues](https://github.com/TGA88/inh-lib/issues)
- 💬 [Discussions](https://github.com/TGA88/inh-lib/discussions)
