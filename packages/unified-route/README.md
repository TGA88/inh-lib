# @inh-lib/unified-route

A lightweight, type-safe HTTP middleware framework that provides a unified context pattern for building web applications and APIs.

## Features

- 🔒 **Type-safe**: Full TypeScript support with comprehensive type definitions
- 🚀 **Lightweight**: Minimal overhead with clean, simple APIs
- 🔄 **Composable**: Easy middleware composition with async/await support
- 📦 **Unified Context**: Single context object for request/response handling
- 🎯 **Registry System**: Built-in context registry for sharing data between middlewares
- 🛠️ **Utility Functions**: Helper functions for common HTTP operations

## Installation
```
npm install @inh-lib/unified-route
# or
yarn add @inh-lib/unified-route
# or
pnpm add @inh-lib/unified-route
```


## Registry Keys Pattern

```typescript
// Recommended registry key structure for different frameworks
export const FRAMEWORK_REGISTRY_KEYS = {
  // Express.js
  EXPRESS: 'express',
  EXPRESS_SESSION: 'express:session',
  EXPRESS_PASSPORT: 'express:passport',
  
  // Fastify
  FASTIFY: 'fastify',
  FASTIFY_INSTANCE: 'fastifyInstance',
  FASTIFY_AUTH: 'fastify:auth',
  FASTIFY_SESSION: 'fastify:session',
  FASTIFY_MULTIPART: 'fastify:multipart',
  
  // Hono
  HONO: 'hono',
  HONO_ENV: 'hono:env',
  HONO_EXECUTION: 'hono:execution',
  
  // Common
  USER: 'user',
  METADATA: 'metadata',
  CACHE: 'cache',
  DATABASE: 'database'
} as const;

// Type-safe registry access
type RegistryKey = typeof FRAMEWORK_REGISTRY_KEYS[keyof typeof FRAMEWORK_REGISTRY_KEYS];

const getTypedRegistryItem = <T>(
  context: UnifiedHttpContext, 
  key: RegistryKey
): T | Error => {
  return getRegistryItem<T>(context, key);
};bash
npm install @inh-lib/unified-route
# or
yarn add @inh-lib/unified-route
# or
pnpm add @inh-lib/unified-route
```

## Quick Start

```typescript
import { 
  UnifiedHttpContext, 
  UnifiedMiddleware, 
  composeMiddleware,
  sendResponse 
} from '@inh-lib/unified-route';

// Define a middleware
const loggingMiddleware: UnifiedMiddleware = async (context, next) => {
  console.log(`${context.request.method} ${context.request.url}`);
  await next();
};

// Define a route handler
const helloHandler = async (context: UnifiedHttpContext) => {
  sendResponse(context, { message: 'Hello World!' });
};

// Compose middleware with handler
const middlewares = [loggingMiddleware];
const composedHandler = composeMiddleware(middlewares)(helloHandler);

// Use with your HTTP server (Express, Fastify, etc.)
```

## Core Concepts

### UnifiedHttpContext

The central context object that contains request, response, and registry data:

```typescript
interface UnifiedHttpContext {
  request: UnifiedRequestContext;   // Request data (body, params, headers, etc.)
  response: UnifiedResponseContext; // Response methods (json, send, status, etc.)
  registry: Record<string, unknown>; // Shared data storage
}
```

### Middleware

Middlewares are functions that process the context and call the next middleware in the chain:

```typescript
type UnifiedMiddleware = (
  context: UnifiedHttpContext, 
  next: () => Promise<void>
) => Promise<void>;
```

### Route Handler

Route handlers are the final functions that handle the request:

```typescript
type UnifiedRouteHandler = (context: UnifiedHttpContext) => Promise<void>;
```

## API Reference

### Context Utilities

#### Request Helpers
```typescript
// Get request body with type safety
const body = getRequestBody<UserData>(context);

// Get URL parameters
const params = getParams(context);

// Get query parameters
const query = getQuery(context);

// Get request headers
const headers = getHeaders(context);
```

#### Response Helpers
```typescript
// Send JSON response
sendResponse(context, { data: 'example' }, 200);

// Send error response
sendError(context, 'Something went wrong', 400);
```

#### Registry Helpers
```typescript
// Add data to registry
addRegistryItem(context, 'user', userObject);

// Get data from registry
const user = getRegistryItem<User>(context, 'user');
if (user instanceof Error) {
  // Handle error
} else {
  // Use user data
}
```

### Middleware Composition

```typescript
// Compose multiple middlewares
const middlewares = [
  authMiddleware,
  loggingMiddleware,
  validationMiddleware
];

const composedHandler = composeMiddleware(middlewares)(routeHandler);
```

## Registry System

The registry system allows you to store and share data between middlewares and route handlers within the same request lifecycle. This is particularly useful for storing user information, database connections, or any computed values that need to be accessed by downstream middlewares.

### Basic Registry Usage

```typescript
import { addRegistryItem, getRegistryItem, UnifiedHttpContext } from '@inh-lib/unified-route';

// Store data in registry
const authMiddleware: UnifiedMiddleware = async (context, next) => {
  const user = await authenticateUser(context);
  
  // Add user to registry
  addRegistryItem(context, 'user', user);
  addRegistryItem(context, 'authTime', new Date().toISOString());
  
  await next();
};

// Retrieve data from registry
const profileHandler = async (context: UnifiedHttpContext) => {
  const user = getRegistryItem<User>(context, 'user');
  
  if (user instanceof Error) {
    return sendError(context, 'User not authenticated', 401);
  }
  
  sendResponse(context, { profile: user });
};
```

### Registry Patterns

#### 1. Database Connection Sharing

```typescript
interface DatabaseConnection {
  query: (sql: string, params?: unknown[]) => Promise<unknown[]>;
  close: () => Promise<void>;
}

const databaseMiddleware: UnifiedMiddleware = async (context, next) => {
  const db = await createDatabaseConnection();
  addRegistryItem<DatabaseConnection>(context, 'db', db);
  
  try {
    await next();
  } finally {
    await db.close();
  }
};

const getUserHandler = async (context: UnifiedHttpContext) => {
  const db = getRegistryItem<DatabaseConnection>(context, 'db');
  if (db instanceof Error) {
    return sendError(context, 'Database unavailable', 500);
  }
  
  const userId = getParams(context).id;
  const users = await db.query('SELECT * FROM users WHERE id = ?', [userId]);
  
  sendResponse(context, { user: users[0] });
};
```

#### 2. Request Metadata Tracking

```typescript
interface RequestMetadata {
  startTime: number;
  requestId: string;
  userAgent: string;
  correlationId?: string;
}

const metadataMiddleware: UnifiedMiddleware = async (context, next) => {
  const metadata: RequestMetadata = {
    startTime: Date.now(),
    requestId: generateRequestId(),
    userAgent: context.request.userAgent || 'unknown',
    correlationId: context.request.headers['x-correlation-id']
  };
  
  addRegistryItem(context, 'metadata', metadata);
  await next();
  
  // Log request completion with metadata
  const duration = Date.now() - metadata.startTime;
  console.log(`Request ${metadata.requestId} completed in ${duration}ms`);
};

const someHandler = async (context: UnifiedHttpContext) => {
  const metadata = getRegistryItem<RequestMetadata>(context, 'metadata');
  
  if (!(metadata instanceof Error)) {
    console.log(`Processing request ${metadata.requestId}`);
  }
  
  sendResponse(context, { data: 'success' });
};
```

#### 3. Permission and Role Management

```typescript
interface UserPermissions {
  roles: string[];
  permissions: string[];
  canAccess: (resource: string) => boolean;
}

const permissionMiddleware: UnifiedMiddleware = async (context, next) => {
  const user = getRegistryItem<User>(context, 'user');
  
  if (user instanceof Error) {
    return sendError(context, 'Authentication required', 401);
  }
  
  const permissions: UserPermissions = {
    roles: user.roles,
    permissions: user.permissions,
    canAccess: (resource: string) => user.permissions.includes(resource)
  };
  
  addRegistryItem(context, 'permissions', permissions);
  await next();
};

const adminHandler = async (context: UnifiedHttpContext) => {
  const permissions = getRegistryItem<UserPermissions>(context, 'permissions');
  
  if (permissions instanceof Error || !permissions.canAccess('admin')) {
    return sendError(context, 'Insufficient permissions', 403);
  }
  
  sendResponse(context, { message: 'Welcome to admin panel' });
};
```

#### 4. Caching Layer

```typescript
interface CacheLayer {
  get: <T>(key: string) => Promise<T | null>;
  set: <T>(key: string, value: T, ttl?: number) => Promise<void>;
  delete: (key: string) => Promise<void>;
}

const cacheMiddleware: UnifiedMiddleware = async (context, next) => {
  const cache: CacheLayer = {
    get: async <T>(key: string): Promise<T | null> => {
      // Implementation depends on your cache system (Redis, in-memory, etc.)
      return await redis.get(key);
    },
    set: async <T>(key: string, value: T, ttl = 3600): Promise<void> => {
      await redis.setex(key, ttl, JSON.stringify(value));
    },
    delete: async (key: string): Promise<void> => {
      await redis.del(key);
    }
  };
  
  addRegistryItem(context, 'cache', cache);
  await next();
};

const cachedDataHandler = async (context: UnifiedHttpContext) => {
  const cache = getRegistryItem<CacheLayer>(context, 'cache');
  
  if (cache instanceof Error) {
    return sendError(context, 'Cache unavailable', 500);
  }
  
  const cacheKey = `user:${getParams(context).id}`;
  let userData = await cache.get<User>(cacheKey);
  
  if (!userData) {
    userData = await fetchUserFromDatabase(getParams(context).id);
    await cache.set(cacheKey, userData, 1800); // Cache for 30 minutes
  }
  
  sendResponse(context, { user: userData });
};
```

### Registry Best Practices

1. **Type Safety**: Always use generic types when working with registry items
```typescript
const user = getRegistryItem<User>(context, 'user');
// Always check for Error before using
if (user instanceof Error) {
  // Handle error case
}
```

2. **Consistent Naming**: Use consistent keys across your application
```typescript
// Good
const REGISTRY_KEYS = {
  USER: 'user',
  DATABASE: 'db',
  CACHE: 'cache',
  METADATA: 'metadata'
} as const;

addRegistryItem(context, REGISTRY_KEYS.USER, user);
```

3. **Error Handling**: Always handle the Error return type from `getRegistryItem`
```typescript
const user = getRegistryItem<User>(context, 'user');
if (user instanceof Error) {
  console.error('Failed to get user from registry:', user.message);
  return sendError(context, 'Internal server error', 500);
}
```

4. **Resource Cleanup**: Clean up resources stored in the registry when needed
```typescript
const cleanupMiddleware: UnifiedMiddleware = async (context, next) => {
  try {
    await next();
  } finally {
    const db = getRegistryItem<DatabaseConnection>(context, 'db');
    if (!(db instanceof Error)) {
      await db.close();
    }
  }
};
```

## Examples

### Authentication Middleware

```typescript
const authMiddleware: UnifiedMiddleware = async (context, next) => {
  const token = context.request.headers.authorization;
  
  if (!token) {
    return sendError(context, 'Authorization required', 401);
  }
  
  try {
    const user = await validateToken(token);
    addRegistryItem(context, 'user', user);
    await next();
  } catch (error) {
    sendError(context, 'Invalid token', 401);
  }
};
```

### Request Logging Middleware

```typescript
const requestLogger: UnifiedMiddleware = async (context, next) => {
  const start = Date.now();
  
  console.log(`→ ${context.request.method} ${context.request.url}`);
  
  await next();
  
  const duration = Date.now() - start;
  console.log(`← ${context.request.method} ${context.request.url} (${duration}ms)`);
};
```

### Error Handling Middleware

```typescript
const errorHandler: UnifiedMiddleware = async (context, next) => {
  try {
    await next();
  } catch (error) {
    console.error('Request error:', error);
    sendError(context, 'Internal server error', 500);
  }
};
```

### Complete Example

```typescript
import { 
  UnifiedHttpContext,
  UnifiedMiddleware,
  composeMiddleware,
  getRequestBody,
  sendResponse,
  sendError,
  addRegistryItem,
  getRegistryItem
} from '@inh-lib/unified-route';

// Middlewares
const authMiddleware: UnifiedMiddleware = async (context, next) => {
  const user = await authenticateUser(context);
  addRegistryItem(context, 'user', user);
  await next();
};

const validationMiddleware: UnifiedMiddleware = async (context, next) => {
  const body = getRequestBody(context);
  if (!isValidRequest(body)) {
    return sendError(context, 'Invalid request data', 400);
  }
  await next();
};

// Route handler
const createUserHandler = async (context: UnifiedHttpContext) => {
  const currentUser = getRegistryItem<User>(context, 'user');
  const userData = getRequestBody<CreateUserRequest>(context);
  
  if (currentUser instanceof Error) {
    return sendError(context, 'User not found', 401);
  }
  
  const newUser = await createUser(userData);
  sendResponse(context, { user: newUser }, 201);
};

// Compose everything
const middlewares = [authMiddleware, validationMiddleware];
const handler = composeMiddleware(middlewares)(createUserHandler);

// Use with your HTTP framework
```

## Integration with HTTP Frameworks

### Express.js

```typescript
import express from 'express';
import { 
  UnifiedHttpContext, 
  UnifiedMiddleware, 
  composeMiddleware,
  sendResponse,
  sendError,
  addRegistryItem,
  getRegistryItem 
} from '@inh-lib/unified-route';

const app = express();

// Define some middlewares
const loggingMiddleware: UnifiedMiddleware = async (context, next) => {
  console.log(`${context.request.method} ${context.request.url}`);
  await next();
};

const authMiddleware: UnifiedMiddleware = async (context, next) => {
  const token = context.request.headers.authorization;
  if (!token) {
    return sendError(context, 'Unauthorized', 401);
  }
  // Simulate user authentication
  const user = { id: 1, name: 'John Doe' };
  addRegistryItem(context, 'user', user);
  await next();
};

// Define route handler
const getUserHandler = async (context: UnifiedHttpContext) => {
  const user = getRegistryItem<{ id: number; name: string }>(context, 'user');
  if (user instanceof Error) {
    return sendError(context, 'User not found', 404);
  }
  sendResponse(context, { user });
};

// Compose middlewares with handler
const middlewares = [loggingMiddleware, authMiddleware];
const composedHandler = composeMiddleware(middlewares)(getUserHandler);

// Adapter function to convert Express req/res to UnifiedHttpContext
const createExpressAdapter = (handler: (context: UnifiedHttpContext) => Promise<void>) => {
  return async (req: express.Request, res: express.Response) => {
    const context: UnifiedHttpContext = {
      request: {
        body: req.body,
        params: req.params,
        query: req.query,
        headers: req.headers as Record<string, string>,
        method: req.method,
        url: req.url,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      },
      response: {
        status: (code: number) => { res.status(code); return context.response; },
        json: <T>(data: T) => res.json(data),
        send: (data: string) => res.send(data),
        header: (name: string, value: string) => { res.set(name, value); return context.response; },
        redirect: (url: string) => res.redirect(url)
      },
      registry: {}
    };
    
    await handler(context);
  };
};

// Register routes using the composed handler
app.get('/users/:id', createExpressAdapter(composedHandler));
```

### Fastify

```typescript
import Fastify, { FastifyRequest, FastifyReply } from 'fastify';
import { UnifiedHttpContext, UnifiedMiddleware, composeMiddleware } from '@inh-lib/unified-route';

const fastify = Fastify({ logger: true });

// Define some middlewares
const loggingMiddleware: UnifiedMiddleware = async (context, next) => {
  console.log(`${context.request.method} ${context.request.url}`);
  await next();
};

const authMiddleware: UnifiedMiddleware = async (context, next) => {
  const token = context.request.headers.authorization;
  if (!token) {
    return sendError(context, 'Unauthorized', 401);
  }
  // Simulate user authentication
  const user = { id: 1, name: 'John Doe' };
  addRegistryItem(context, 'user', user);
  await next();
};

// Define route handler
const getUserHandler = async (context: UnifiedHttpContext) => {
  const user = getRegistryItem<{ id: number; name: string }>(context, 'user');
  if (user instanceof Error) {
    return sendError(context, 'User not found', 404);
  }
  sendResponse(context, { user });
};

// Compose middlewares with handler
const middlewares = [loggingMiddleware, authMiddleware];
const composedHandler = composeMiddleware(middlewares)(getUserHandler);

// Adapter function to convert Fastify request/reply to UnifiedHttpContext
const createFastifyAdapter = (handler: (context: UnifiedHttpContext) => Promise<void>) => {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const context: UnifiedHttpContext = {
      request: {
        body: request.body as Record<string, unknown> || {},
        params: request.params as Record<string, string> || {},
        query: request.query as Record<string, string | string[]> || {},
        headers: request.headers as Record<string, string>,
        method: request.method,
        url: request.url,
        ip: request.ip,
        userAgent: request.headers['user-agent']
      },
      response: {
        status: (code: number) => { reply.status(code); return context.response; },
        json: <T>(data: T) => reply.send(data),
        send: (data: string) => reply.send(data),
        header: (name: string, value: string) => { reply.header(name, value); return context.response; },
        redirect: (url: string) => reply.redirect(url)
      },
      registry: {}
    };
    
    await handler(context);
  };
};

// Register routes using the composed handler
fastify.get('/users/:id', createFastifyAdapter(composedHandler));

// Start server
const start = async () => {
  try {
    await fastify.listen({ port: 3000 });
    console.log('Server listening on port 3000');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};
start();
```

### Hono

```typescript
import { Hono, Context } from 'hono';
import { 
  UnifiedHttpContext, 
  UnifiedMiddleware, 
  composeMiddleware,
  sendResponse,
  sendError,
  addRegistryItem,
  getRegistryItem 
} from '@inh-lib/unified-route';

const app = new Hono();

// Hono middleware to add custom properties
app.use('*', async (c, next) => {
  // Add custom properties to Hono context
  c.set('requestId', `req_${Date.now()}`);
  c.set('startTime', Date.now());
  await next();
});

// Define unified middlewares
const loggingMiddleware: UnifiedMiddleware = async (context, next) => {
  const honoData = getRegistryItem<{ requestId: string }>(context, 'hono');
  const requestId = honoData instanceof Error ? 'unknown' : honoData.requestId;
  console.log(`[${requestId}] ${context.request.method} ${context.request.url}`);
  await next();
};

const authMiddleware: UnifiedMiddleware = async (context, next) => {
  const token = context.request.headers.authorization;
  if (!token) {
    return sendError(context, 'Unauthorized', 401);
  }
  
  // Get Hono-specific data
  const honoData = getRegistryItem<{ 
    env?: Record<string, unknown>;
    executionCtx?: ExecutionContext; 
  }>(context, 'hono');
  
  // Simulate user authentication
  const user = { 
    id: 1, 
    name: 'John Doe', 
    email: 'john@example.com',
    environment: honoData instanceof Error ? 'unknown' : honoData.env?.ENVIRONMENT || 'development'
  };
  
  addRegistryItem(context, 'user', user);
  await next();
};

// Define route handler
const getUserHandler = async (context: UnifiedHttpContext) => {
  const user = getRegistryItem<{ 
    id: number; 
    name: string; 
    email: string;
    environment: string;
  }>(context, 'user');
  
  if (user instanceof Error) {
    return sendError(context, 'User not found', 404);
  }
  
  const honoTiming = getRegistryItem<{ startTime: number }>(context, 'hono');
  const processingTime = honoTiming instanceof Error ? 0 : Date.now() - honoTiming.startTime;
  
  sendResponse(context, { 
    user, 
    meta: { processingTime: `${processingTime}ms` }
  });
};

// Compose middlewares with handler
const middlewares = [loggingMiddleware, authMiddleware];
const composedHandler = composeMiddleware(middlewares)(getUserHandler);

// Enhanced adapter that extracts Hono-specific data to registry
const createHonoAdapter = (handler: (context: UnifiedHttpContext) => Promise<void>) => {
  return async (c: Context) => {
    const url = new URL(c.req.url);
    const body = c.req.method !== 'GET' ? await c.req.json().catch(() => ({})) : {};
    
    const context: UnifiedHttpContext = {
      request: {
        body: body as Record<string, unknown>,
        params: c.req.param() || {},
        query: Object.fromEntries(url.searchParams.entries()),
        headers: Object.fromEntries(
          Object.entries(c.req.header()).map(([key, value]) => [key, String(value)])
        ),
        method: c.req.method,
        url: c.req.url,
        ip: c.env?.CF_CONNECTING_IP as string || c.req.header('x-forwarded-for') || 'unknown',
        userAgent: c.req.header('user-agent')
      },
      response: {
        status: (code: number) => { 
          c.status(code); 
          return context.response; 
        },
        json: <T>(data: T) => c.json(data),
        send: (data: string) => c.text(data),
        header: (name: string, value: string) => { 
          c.header(name, value); 
          return context.response; 
        },
        redirect: (url: string) => c.redirect(url)
      },
      registry: {}
    };
    
    // Store Hono-specific extensions in registry
    const honoExtensions = {
      requestId: c.get('requestId'),
      startTime: c.get('startTime'),
      env: c.env,
      executionCtx: c.executionCtx,
      // Additional Hono context properties
      finalized: c.finalized,
      error: c.error
    };
    
    addRegistryItem(context, 'hono', honoExtensions);
    
    await handler(context);
  };
};

// Register routes using the composed handler
app.get('/users/:id', createHonoAdapter(composedHandler));

// Example accessing Hono environment variables
app.get('/env', createHonoAdapter(async (context: UnifiedHttpContext) => {
  const honoData = getRegistryItem<{
    env: Record<string, unknown>;
  }>(context, 'hono');
  
  if (honoData instanceof Error) {
    return sendError(context, 'Environment data not available', 500);
  }
  
  // Safe way to expose environment variables (filter sensitive data)
  const publicEnv = Object.entries(honoData.env)
    .filter(([key]) => key.startsWith('PUBLIC_'))
    .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});
  
  sendResponse(context, { environment: publicEnv });
}));

// For Node.js
export default {
  port: 3000,
  fetch: app.fetch,
};

// For Cloudflare Workers
// export default app;
```

### Generic Adapter Pattern

You can also create a generic adapter pattern for other frameworks:

```typescript
import { UnifiedHttpContext } from '@inh-lib/unified-route';

interface AdapterConfig<TRequest, TResponse> {
  extractRequest: (req: TRequest) => UnifiedHttpContext['request'];
  bindResponse: (res: TResponse, context: UnifiedHttpContext) => UnifiedHttpContext['response'];
}

const createGenericAdapter = <TRequest, TResponse>(
  config: AdapterConfig<TRequest, TResponse>,
  handler: (context: UnifiedHttpContext) => Promise<void>
) => {
  return async (req: TRequest, res: TResponse) => {
    const context: UnifiedHttpContext = {
      request: config.extractRequest(req),
      response: config.bindResponse(res, {} as UnifiedHttpContext),
      registry: {}
    };
    
    await handler(context);
  };
};
```

## Project Structure

```
@inh-lib/unified-route/
├── types/
│   ├── unified-context.ts      # Context type definitions
│   └── unified-middleware.ts   # Middleware type definitions
├── logic/
│   ├── unified-context.logic.ts    # Context utility functions
│   └── unified-middleware.logic.ts # Middleware composition logic
└── index.ts                    # Main exports
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Changelog

### v1.0.0
- Initial release
- Basic middleware composition
- Unified context pattern
- Registry system
- TypeScript support
