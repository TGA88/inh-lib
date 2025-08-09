# Unified Fastify Adapter

> Framework adapter for integrating Fastify with @inh-lib/unified-route pattern

## Overview

The Unified Fastify Adapter provides seamless integration between Fastify applications and the unified route pattern, enabling consistent middleware composition across different web frameworks.

## Installation

```bash
npm install @inh-lib/api-util-fastify @inh-lib/unified-route fastify
```

## API Reference

### `createFastifyContext<TBody>(req, res)`

Creates a unified context from Fastify request/response objects.

```typescript
import { createFastifyContext } from '@inh-lib/api-util-fastify';

const context = createFastifyContext<MyRequestBody>(req, res);
```

### `adaptFastifyRequest<TBody>(req)`

Converts Fastify request to unified request context.

```typescript
import { adaptFastifyRequest } from '@inh-lib/api-util-fastify';

const unifiedRequest = adaptFastifyRequest<MyRequestBody>(req);
```

### `adaptFastifyResponse(res)`

Converts Fastify response to unified response context.

```typescript
import { adaptFastifyResponse } from '@inh-lib/api-util-fastify';

const unifiedResponse = adaptFastifyResponse(res);
```

## Quick Start

```typescript
import Fastify from 'fastify';
import { createFastifyContext } from '@inh-lib/api-util-fastify';
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

## Type Safety

The adapter provides full TypeScript support with generic type parameters:

```typescript
interface CreateUserRequest {
  name: string;
  email: string;
  role: 'admin' | 'user';
}

// Type-safe context creation
const context = createFastifyContext<CreateUserRequest>(req, res);
// context.request.body is now typed as CreateUserRequest
```

## Registry Pattern

Use the unified registry pattern for sharing data between middlewares:

```typescript
import { addRegistryItem, getRegistryItem } from '@inh-lib/unified-route';

// Add data to registry
addRegistryItem(context, 'user', user);
addRegistryItem(context, 'permissions', permissions);

// Retrieve data from registry
const user = getRegistryItem<User>(context, 'user');
const permissions = getRegistryItem<Permission[]>(context, 'permissions');
```

## Error Handling

```typescript
const errorHandlerMiddleware: UnifiedMiddleware = async (context, next) => {
  try {
    await next();
  } catch (error) {
    console.error('Request failed:', error);
    context.response.status(500).json({ 
      error: 'Internal Server Error',
      message: error.message 
    });
  }
};
```

## Testing

```typescript
import { 
  createFastifyContext, 
  adaptFastifyRequest, 
  adaptFastifyResponse 
} from '@inh-lib/api-util-fastify';
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

const createMockFastifyReply = (): FastifyReply => ({
  status: jest.fn().mockReturnThis(),
  send: jest.fn(),
  header: jest.fn().mockReturnThis(),
  redirect: jest.fn(),
} as unknown as FastifyReply);

describe('Unified Fastify Adapter', () => {
  test('should create unified context', () => {
    const req = createMockFastifyRequest({ 
      body: { name: 'test' },
      params: { id: '123' }
    });
    const res = createMockFastifyReply();
    
    const context = createFastifyContext(req, res);
    
    expect(context.request.body).toEqual({ name: 'test' });
    expect(context.request.params).toEqual({ id: '123' });
    expect(context.response).toBeDefined();
  });
});
```

## Best Practices

1. **Use Type Parameters**: Always specify request body types for better type safety
2. **Registry Management**: Use descriptive keys for registry items
3. **Error Boundaries**: Implement error handling middleware
4. **Middleware Order**: Place authentication and logging middleware early in the chain
5. **Resource Cleanup**: Ensure proper cleanup of resources in middleware

## Common Patterns

### Authentication Middleware
```typescript
const createAuthMiddleware = (secretKey: string): UnifiedMiddleware => 
  async (context, next) => {
    const token = context.request.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return context.response.status(401).json({ error: 'Token required' });
    }
    
    try {
      const user = verifyToken(token, secretKey);
      addRegistryItem(context, 'user', user);
      await next();
    } catch (error) {
      return context.response.status(401).json({ error: 'Invalid token' });
    }
  };
```

### Validation Middleware
```typescript
const createValidationMiddleware = <T>(schema: Schema<T>): UnifiedMiddleware =>
  async (context, next) => {
    try {
      const validatedBody = schema.parse(context.request.body);
      addRegistryItem(context, 'validatedBody', validatedBody);
      await next();
    } catch (error) {
      return context.response.status(400).json({ 
        error: 'Validation failed',
        details: error.message 
      });
    }
  };
```

---

## Related Documentation

- [Telemetry Plugin Guide](./telemetry-plugin.md)
- [Main README](../README.md)
- [@inh-lib/unified-route Documentation](../../unified-route/README.md)
