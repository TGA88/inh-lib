# @inh-lib/api-util-fastify

> Comprehensive Fastify utilities collection - Everything you need for building robust Fastify applications

A complete toolkit of utilities, adapters, and helpers for Fastify applications. This package provides a unified set of tools to enhance your Fastify development experience with type safety, middleware composition, and production-ready patterns.

## ✨ Features

- 🚀 **Unified Route Adapter** - Seamlessly integrate with @inh-lib/unified-route pattern
- 🔒 **Type-Safe** - Full TypeScript support with comprehensive type definitions
- 📦 **Modular Design** - Use only what you need, tree-shakeable utilities
- 🎯 **Zero Dependencies** - Only peer dependencies on Fastify and related libraries
- 🔧 **Production Ready** - Battle-tested utilities for enterprise applications
- 📈 **Performance Focused** - Optimized for Fastify's high-performance architecture

## 📦 Installation

```bash
npm install @inh-lib/api-util-fastify fastify
# or
yarn add @inh-lib/api-util-fastify fastify
# or
pnpm add @inh-lib/api-util-fastify fastify
```

## 🛠️ Available Utilities

### 1. Unified Route Adapter

Adapter for integrating Fastify with the @inh-lib/unified-route pattern for consistent middleware composition.

```typescript
import { 
  createFastifyContext,
  adaptFastifyRequest,
  adaptFastifyResponse 
} from '@inh-lib/api-util-fastify/unified-adapter';
```

**Features:**
- Convert Fastify req/res to unified context
- Type-safe request body handling
- Seamless middleware composition
- Registry pattern support

### 2. Common Middlewares *(Coming Soon)*

Pre-built middleware collection for common Fastify use cases.

```typescript
import { 
  authMiddleware,
  corsMiddleware,
  rateLimitMiddleware 
} from '@inh-lib/api-util-fastify/middlewares';
```

### 3. Validation Helpers *(Coming Soon)*

Type-safe validation utilities with popular schema libraries.

```typescript
import { 
  createJoiValidator,
  createZodValidator,
  createAjvValidator 
} from '@inh-lib/api-util-fastify/validation';
```

### 4. Error Handling *(Coming Soon)*

Standardized error handling patterns for Fastify applications.

```typescript
import { 
  errorHandlerPlugin,
  createErrorResponse,
  HttpError 
} from '@inh-lib/api-util-fastify/errors';
```

## 🚀 Quick Start

### Basic Setup with Unified Route Adapter

```typescript
import Fastify from 'fastify';
import { 
  createFastifyContext,
  adaptFastifyRequest,
  adaptFastifyResponse 
} from '@inh-lib/api-util-fastify/unified-adapter';
import { 
  UnifiedMiddleware, 
  composeMiddleware,
  sendResponse,
  addRegistryItem,
  getRegistryItem 
} from '@inh-lib/unified-route';

const fastify = Fastify({ logger: true });

// Define unified middlewares
const loggingMiddleware: UnifiedMiddleware = async (context, next) => {
  console.log(`${context.request.method} ${context.request.url}`);
  await next();
};

const authMiddleware: UnifiedMiddleware = async (context, next) => {
  const token = context.request.headers.authorization;
  if (!token) {
    context.response.status(401).json({ error: 'Unauthorized' });
    return;
  }
  
  // Simulate authentication
  const user = { id: 1, name: 'John Doe', email: 'john@example.com' };
  addRegistryItem(context, 'user', user);
  await next();
};

// Route handler using unified context
const getUserHandler = async (context: UnifiedHttpContext) => {
  const user = getRegistryItem<User>(context, 'user');
  if (user instanceof Error) {
    return sendError(context, 'User not found', 404);
  }
  
  const userId = context.request.params.id;
  sendResponse(context, { 
    user: { ...user, requestedId: userId },
    timestamp: new Date().toISOString()
  });
};

// Compose middlewares
const middlewares = [loggingMiddleware, authMiddleware];
const composedHandler = composeMiddleware(middlewares)(getUserHandler);

// Register Fastify route with adapter
fastify.get<{ Params: { id: string } }>('/users/:id', async (request, reply) => {
  const context = createFastifyContext<{ userId?: string }>(request, reply);
  await composedHandler(context);
});

// Start server
const start = async () => {
  try {
    await fastify.listen({ port: 3000 });
    console.log('🚀 Server running on http://localhost:3000');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
```

## 📚 Unified Route Adapter API

### Core Functions

#### `createFastifyContext<TBody>(req, res)`

Creates a complete unified HTTP context from Fastify request and response objects.

```typescript
function createFastifyContext<TBody = Record<string, unknown>>(
  req: FastifyRequest,
  res: FastifyReply
): UnifiedHttpContext & { request: UnifiedRequestContext & { body: TBody } }
```

**Parameters:**
- `req: FastifyRequest` - Fastify request object
- `res: FastifyReply` - Fastify reply object
- `TBody` - Optional generic type for request body

**Returns:** Complete unified context with typed request body

**Example:**
```typescript
fastify.post<{ Body: CreateUserRequest }>('/users', async (request, reply) => {
  const context = createFastifyContext<CreateUserRequest>(request, reply);
  // context.request.body is now typed as CreateUserRequest
  await createUserHandler(context);
});
```

#### `adaptFastifyRequest<TBody>(req)`

Converts a Fastify request to a unified request context.

```typescript
function adaptFastifyRequest<TBody = Record<string, unknown>>(
  req: FastifyRequest
): UnifiedRequestContext & { body: TBody }
```

#### `adaptFastifyResponse(res)`

Converts a Fastify reply to a unified response context.

```typescript
function adaptFastifyResponse(res: FastifyReply): UnifiedResponseContext
```

### Context Structure

The adapted context follows the unified context pattern:

```typescript
interface UnifiedHttpContext {
  request: {
    body: TBody;                              // Parsed request body
    params: Record<string, string>;           // URL parameters
    query: Record<string, string | string[]>; // Query string parameters
    headers: Record<string, string>;          // Request headers
    method: string;                           // HTTP method
    url: string;                              // Request URL
    ip: string;                               // Client IP address
    userAgent?: string;                       // User-Agent header
  };
  response: {
    status(code: number): UnifiedResponseContext;     // Set status code
    json<T>(data: T): void;                          // Send JSON response
    send(data: string): void;                        // Send text response
    header(name: string, value: string): UnifiedResponseContext; // Set header
    redirect(url: string): void;                     // Redirect response
  };
  registry: Record<string, unknown>;          // Shared data storage
}
```

## 🎯 Advanced Usage Examples

### Typed Request Bodies

```typescript
import { createFastifyContext } from '@inh-lib/api-util-fastify/unified-adapter';

interface CreateUserRequest {
  name: string;
  email: string;
  role: 'admin' | 'user';
}

interface UpdateUserRequest {
  name?: string;
  email?: string;
}

// POST route with typed body
fastify.post<{ Body: CreateUserRequest }>('/users', async (request, reply) => {
  const context = createFastifyContext<CreateUserRequest>(request, reply);
  
  // TypeScript knows the shape of context.request.body
  const { name, email, role } = context.request.body;
  
  await createUserHandler(context);
});

// PUT route with typed body
fastify.put<{ Params: { id: string }, Body: UpdateUserRequest }>(
  '/users/:id', 
  async (request, reply) => {
    const context = createFastifyContext<UpdateUserRequest>(request, reply);
    
    // Both params and body are type-safe
    const userId = context.request.params.id;
    const updates = context.request.body;
    
    await updateUserHandler(context);
  }
);
```

### Database Integration Middleware

```typescript
import { Pool } from 'pg';
import { UnifiedMiddleware, addRegistryItem, getRegistryItem } from '@inh-lib/unified-route';

interface DatabaseConnection {
  query: (text: string, params?: unknown[]) => Promise<any>;
}

const databaseMiddleware: UnifiedMiddleware = async (context, next) => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  const db: DatabaseConnection = {
    query: async (text: string, params?: unknown[]) => {
      const client = await pool.connect();
      try {
        const result = await client.query(text, params);
        return result.rows;
      } finally {
        client.release();
      }
    }
  };
  
  addRegistryItem(context, 'db', db);
  
  try {
    await next();
  } finally {
    await pool.end();
  }
};

// Use in route
fastify.get('/users/:id', async (request, reply) => {
  const context = createFastifyContext(request, reply);
  const handler = composeMiddleware([databaseMiddleware])(async (ctx) => {
    const db = getRegistryItem<DatabaseConnection>(ctx, 'db');
    if (db instanceof Error) {
      return sendError(ctx, 'Database unavailable', 500);
    }
    
    const users = await db.query('SELECT * FROM users WHERE id = $1', [ctx.request.params.id]);
    sendResponse(ctx, { user: users[0] });
  });
  
  await handler(context);
});
```

### Authentication & Authorization

```typescript
import { UnifiedMiddleware } from '@inh-lib/unified-route';
import { createFastifyContext } from '@inh-lib/api-util-fastify/unified-adapter';

interface User {
  id: number;
  name: string;
  email: string;
  roles: string[];
}

interface AuthMiddlewareOptions {
  requiredRole?: string;
  optional?: boolean;
}

const createAuthMiddleware = (options: AuthMiddlewareOptions = {}): UnifiedMiddleware => {
  return async (context, next) => {
    const token = context.request.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      if (options.optional) {
        return await next();
      }
      return context.response.status(401).json({ error: 'Token required' });
    }
    
    try {
      const user = await validateJWT(token); // Your JWT validation
      
      if (options.requiredRole && !user.roles.includes(options.requiredRole)) {
        return context.response.status(403).json({ error: 'Insufficient permissions' });
      }
      
      addRegistryItem(context, 'user', user);
      await next();
    } catch (error) {
      context.response.status(401).json({ error: 'Invalid token' });
    }
  };
};

// Public route (no auth)
fastify.get('/public', async (request, reply) => {
  const context = createFastifyContext(request, reply);
  await publicHandler(context);
});

// Protected route (auth required)
fastify.get('/profile', async (request, reply) => {
  const context = createFastifyContext(request, reply);
  const handler = composeMiddleware([
    createAuthMiddleware()
  ])(profileHandler);
  await handler(context);
});

// Admin only route
fastify.delete('/users/:id', async (request, reply) => {
  const context = createFastifyContext(request, reply);
  const handler = composeMiddleware([
    createAuthMiddleware({ requiredRole: 'admin' })
  ])(deleteUserHandler);
  await handler(context);
});
```

### Error Handling Patterns

```typescript
import { UnifiedMiddleware } from '@inh-lib/unified-route';

class ValidationError extends Error {
  constructor(public details: any[]) {
    super('Validation failed');
  }
}

class AuthenticationError extends Error {
  constructor() {
    super('Authentication failed');
  }
}

const errorHandlingMiddleware: UnifiedMiddleware = async (context, next) => {
  try {
    await next();
  } catch (error) {
    console.error('Request error:', error);
    
    if (error instanceof ValidationError) {
      context.response.status(400).json({
        error: 'Validation failed',
        details: error.details
      });
    } else if (error instanceof AuthenticationError) {
      context.response.status(401).json({
        error: 'Authentication failed'
      });
    } else {
      context.response.status(500).json({
        error: 'Internal server error',
        requestId: generateRequestId()
      });
    }
  }
};

// Apply error handling to all routes
const withErrorHandling = (handler: UnifiedRouteHandler) => {
  return composeMiddleware([errorHandlingMiddleware])(handler);
};

fastify.post('/users', async (request, reply) => {
  const context = createFastifyContext<CreateUserRequest>(request, reply);
  await withErrorHandling(createUserHandler)(context);
});
```

## 🧪 Testing

### Unit Testing with Jest

```typescript
import { 
  createFastifyContext, 
  adaptFastifyRequest, 
  adaptFastifyResponse 
} from '@inh-lib/api-util-fastify/unified-adapter';
import { FastifyRequest, FastifyReply } from 'fastify';

// Mock Fastify objects for testing
const createMockFastifyRequest = (overrides = {}): FastifyRequest => ({
  body: {},
  params: {},
  query: {},
  headers: {},
  method: 'GET',
  url: '/test',
  ip: '127.0.0.1',
  ...overrides
} as FastifyRequest);

const createMockFastifyReply = (): FastifyReply => {
  const reply = {
    statusCode: 200,
    headers: {},
    status: jest.fn().mockReturnThis(),
    send: jest.fn(),
    header: jest.fn().mockReturnThis(),
    redirect: jest.fn()
  };
  
  return reply as unknown as FastifyReply;
};

describe('@inh-lib/api-util-fastify', () => {
  describe('unified-adapter', () => {
    it('should adapt fastify request to unified request context', () => {
      const mockRequest = createMockFastifyRequest({
        body: { name: 'John' },
        params: { id: '123' },
        query: { filter: 'active' },
        headers: { 'content-type': 'application/json' },
        method: 'POST',
        url: '/users/123',
        ip: '192.168.1.1'
      });

      const result = adaptFastifyRequest(mockRequest);

      expect(result).toEqual({
        body: { name: 'John' },
        params: { id: '123' },
        query: { filter: 'active' },
        headers: { 'content-type': 'application/json' },
        method: 'POST',
        url: '/users/123',
        ip: '192.168.1.1',
        userAgent: undefined
      });
    });

    it('should create unified context from fastify request and reply', () => {
      const mockRequest = createMockFastifyRequest({
        body: { email: 'test@example.com' },
        params: { id: '456' }
      });
      const mockReply = createMockFastifyReply();

      const context = createFastifyContext(mockRequest, mockReply);

      expect(context.request.body).toEqual({ email: 'test@example.com' });
      expect(context.request.params).toEqual({ id: '456' });
      expect(context.registry).toEqual({});
      expect(typeof context.response.status).toBe('function');
      expect(typeof context.response.json).toBe('function');
    });
  });
});
```

### Integration Testing

```typescript
import Fastify from 'fastify';
import { createFastifyContext } from '@inh-lib/api-util-fastify/unified-adapter';
import { composeMiddleware } from '@inh-lib/unified-route';

describe('Fastify Integration', () => {
  let fastify: FastifyInstance;

  beforeEach(async () => {
    fastify = Fastify();
    
    // Register test routes
    fastify.post('/users', async (request, reply) => {
      const context = createFastifyContext(request, reply);
      await testHandler(context);
    });

    await fastify.ready();
  });

  afterEach(async () => {
    await fastify.close();
  });

  it('should handle POST request with unified context', async () => {
    const response = await fastify.inject({
      method: 'POST',
      url: '/users',
      payload: { name: 'John Doe', email: 'john@example.com' },
      headers: { 'content-type': 'application/json' }
    });

    expect(response.statusCode).toBe(201);
    expect(JSON.parse(response.body)).toEqual({
      success: true,
      user: { name: 'John Doe', email: 'john@example.com' }
    });
  });
});
```

## 📁 Package Structure

```
@inh-lib/api-util-fastify/
├── unified-adapter/           # Unified Route Adapter
│   ├── index.ts              # Main exports
│   ├── context.ts            # Context creation utilities
│   ├── request.ts            # Request adaptation
│   └── response.ts           # Response adaptation
├── middlewares/              # Common Middlewares (Coming Soon)
│   ├── auth.ts              # Authentication middleware
│   ├── cors.ts              # CORS middleware
│   └── rate-limit.ts        # Rate limiting middleware
├── validation/               # Validation Helpers (Coming Soon)
│   ├── joi.ts               # Joi validation
│   ├── zod.ts               # Zod validation
│   └── ajv.ts               # AJV validation
├── errors/                   # Error Handling (Coming Soon)
│   ├── handlers.ts          # Error handlers
│   ├── types.ts             # Error types
│   └── responses.ts         # Error responses
└── index.ts                  # Package exports
```

## 🔧 Configuration

### TypeScript Configuration

Add these compiler options to your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "outDir": "./dist"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### ESLint Configuration

```json
{
  "extends": [
    "@typescript-eslint/recommended",
    "prettier"
  ],
  "rules": {
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-unused-vars": "error"
  }
}
```

## 🚀 Performance Considerations

- **Zero Overhead**: Utilities are lightweight wrappers with minimal performance impact
- **Memory Efficient**: No unnecessary object cloning, references to original Fastify objects where possible
- **Type Safety**: Full TypeScript support without runtime type checking overhead
- **Fastify Optimized**: Designed to work with Fastify's high-performance architecture
- **Tree Shakeable**: Import only the utilities you need

## 🗺️ Roadmap

### Immediate (v1.x)
- [x] Unified Route Adapter
- [ ] Common Middlewares (Auth, CORS, Rate Limiting)
- [ ] Validation Helpers (Joi, Zod, AJV)
- [ ] Error Handling Utilities

### Future (v2.x)
- [ ] Fastify Plugin Utilities
- [ ] Testing Helpers
- [ ] Performance Monitoring Utils
- [ ] OpenAPI/Swagger Integration
- [ ] GraphQL Utilities

### Long Term (v3.x)
- [ ] Advanced Caching Utilities
- [ ] WebSocket Helpers
- [ ] Microservice Patterns
- [ ] Health Check Utilities

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Setup

```bash
# Clone the repository
git clone https://github.com/your-org/api-util-fastify.git
cd api-util-fastify

# Install dependencies
npm install

# Run tests
npm test

# Build the project
npm run build

# Run type checking
npm run type-check

# Run linting
npm run lint
```

### Code Style Guidelines

- Use TypeScript with strict mode enabled
- No `any` types allowed
- Prefer composition over inheritance
- Write comprehensive tests for all public APIs
- Follow semantic versioning for releases
- Document all public APIs with JSDoc

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🔗 Related Packages

- [@inh-lib/unified-route](https://github.com/your-org/unified-route) - Core unified HTTP context framework
- [@inh-lib/unified-telemetry-core](https://github.com/your-org/unified-telemetry-core) - Telemetry and observability
- [@inh-lib/unified-telemetry-otel](https://github.com/your-org/unified-telemetry-otel) - OpenTelemetry integration
- [fastify](https://fastify.io/) - Fast and low overhead web framework for Node.js

## 📞 Support

- 🐛 [Report Issues](https://github.com/your-org/api-util-fastify/issues)
- 💡 [Feature Requests](https://github.com/your-org/api-util-fastify/issues/new?template=feature_request.md)
- 📖 [Documentation](https://your-org.github.io/api-util-fastify/)
- 💬 [Discussions](https://github.com/your-org/api-util-fastify/discussions)

---

Made with ❤️ for the Fastify and TypeScript community