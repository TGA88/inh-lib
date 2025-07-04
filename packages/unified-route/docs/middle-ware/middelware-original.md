
## 5. Basic Middleware System 🔗

### The Problem Without Middleware

```typescript
// 😕 Code duplication across every route
export async function createUserRoute(context: UnifiedHttpContext, command: CreateUserCommand) {
  // 🔄 Logging - repeated in every route
  console.log(`→ ${context.request.method} ${context.request.url}`);
  
  // 🔄 CORS - repeated in every route  
  context.response.header('Access-Control-Allow-Origin', '*');
  context.response.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  
  // 🔄 Error handling - repeated in every route
  try {
    const userData = validateRequestBodyOrError(context, CreateUserSchema);
    if (!userData) return;
    
    const result = await command.execute(userData);
    sendResponse(context, result, 201);
  } catch (error) {
    // 🔄 Error response - repeated in every route
    console.error('Request failed:', error);
    context.response.status(500).json({ error: 'Internal server error' });
  }
}

export async function getUsersRoute(context: UnifiedHttpContext, query: GetUsersQuery) {
  // 🔄 Same logging, CORS, error handling repeated...
  console.log(`→ ${context.request.method} ${context.request.url}`);
  context.response.header('Access-Control-Allow-Origin', '*');
  
  try {
    // Route logic...
  } catch (error) {
    // Same error handling...
  }
}
```

### ✅ Solution: Basic Middleware Pattern

```typescript
// foundations/middleware/types.ts
export type Middleware = (
  context: UnifiedHttpContext, 
  next: () => Promise<void>
) => Promise<void>;

export type RouteHandler = (context: UnifiedHttpContext) => Promise<void>;

// Simple middleware composition
export const composeMiddleware = (middlewares: Middleware[]) => {
  return (handler: RouteHandler): RouteHandler => {
    return async (context: UnifiedHttpContext) => {
      let index = 0;
      
      const dispatch = async (): Promise<void> => {
        if (index >= middlewares.length) {
          await handler(context);
          return;
        }
        
        const middleware = middlewares[index++];
        await middleware(context, dispatch);
      };
      
      await dispatch();
    };
  };
};
```

### Essential Built-in Middlewares

```typescript
// foundations/middleware/built-in.ts

// 📊 Request Logging Middleware
export const createLoggingMiddleware = (): Middleware => {
  return async (context, next) => {
    const startTime = Date.now();
    const { method, url } = context.request;
    
    console.log(`→ ${method} ${url}`, {
      ip: context.request.ip,
      userAgent: context.request.headers['user-agent']
    });

    await next();

    const duration = Date.now() - startTime;
    console.log(`← ${method} ${url} ${context.response.statusCode || 200} (${duration}ms)`);
  };
};

// 🌍 CORS Middleware
export const createCorsMiddleware = (options: {
  origin?: string | string[];
  methods?: string[];
  allowedHeaders?: string[];
} = {}): Middleware => {
  return async (context, next) => {
    const origin = Array.isArray(options.origin) 
      ? options.origin.join(',') 
      : options.origin || '*';
    
    context.response.header('Access-Control-Allow-Origin', origin);
    context.response.header(
      'Access-Control-Allow-Methods', 
      (options.methods || ['GET', 'POST', 'PUT', 'DELETE']).join(',')
    );
    context.response.header(
      'Access-Control-Allow-Headers',
      (options.allowedHeaders || ['Content-Type', 'Authorization']).join(',')
    );

    // Handle preflight requests
    if (context.request.method === 'OPTIONS') {
      context.response.status(200);
      context.response.send('');
      return; // Don't call next() for OPTIONS
    }

    await next();
  };
};

// 🛡️ Error Handling Middleware
export const createErrorHandlingMiddleware = (): Middleware => {
  return async (context, next) => {
    try {
      await next();
    } catch (error) {
      console.error('Request error:', error);
      
      if (!context.response.sent) {
        context.response.status(500);
        context.response.json({
          error: 'Internal server error',
          timestamp: new Date().toISOString(),
          path: context.request.url
        });
      }
    }
  };
};

// ⏱️ Timeout Middleware
export const createTimeoutMiddleware = (timeoutMs: number = 30000): Middleware => {
  return async (context, next) => {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), timeoutMs);
    });

    await Promise.race([next(), timeoutPromise]);
  };
};

// 📏 Request Size Limit Middleware
export const createBodySizeLimitMiddleware = (maxSizeBytes: number): Middleware => {
  return async (context, next) => {
    const contentLength = context.request.headers['content-length'];
    
    if (contentLength && parseInt(contentLength) > maxSizeBytes) {
      context.response.status(413);
      context.response.json({ error: 'Request body too large' });
      return;
    }

    await next();
  };
};
```

### Middleware Composition Helpers

```typescript
// foundations/middleware/composers.ts

// 🏗️ Common middleware stacks
export const withCommonMiddleware = composeMiddleware([
  createErrorHandlingMiddleware(),
  createLoggingMiddleware(),
  createCorsMiddleware(),
  createTimeoutMiddleware()
]);

export const withApiMiddleware = composeMiddleware([
  createErrorHandlingMiddleware(),
  createLoggingMiddleware(),
  createCorsMiddleware(),
  createBodySizeLimitMiddleware(1024 * 1024) // 1MB limit
]);

export const withPublicMiddleware = composeMiddleware([
  createErrorHandlingMiddleware(),
  createCorsMiddleware(),
  createTimeoutMiddleware(10000) // Shorter timeout for public
]);

// 🎯 Apply middleware to routes
export const createProtectedRoute = (handler: RouteHandler): RouteHandler => {
  return withCommonMiddleware(handler);
};

export const createPublicRoute = (handler: RouteHandler): RouteHandler => {
  return withPublicMiddleware(handler);
};

export const createApiRoute = (handler: RouteHandler): RouteHandler => {
  return withApiMiddleware(handler);
};
```

### Clean Route Functions with Middleware

```typescript
// routes/user/public-routes.ts - Clean, focused route logic
export const createUserRoute = createPublicRoute(async (context: UnifiedHttpContext) => {
  // Get command from DI container
  const container = getContainer();
  const createUserCommand = container.get('createUserCommand');

  // ✅ Only business logic - no boilerplate!
  const userData = validateRequestBodyOrError(context, CreateUserSchema);
  if (!userData) return;
  
  const result = await createUserCommand.execute(userData);
  sendResponse(context, result, 201);
});

export const getUsersRoute = createPublicRoute(async (context: UnifiedHttpContext) => {
  const container = getContainer();
  const getUsersQuery = container.get('getUsersQuery');

  // ✅ Clean query logic
  const queryParams = validateQueryParamsOrError(context, GetUsersQuerySchema);
  if (!queryParams) return;
  
  const result = await getUsersQuery.execute(queryParams);
  sendResponse(context, result);
});

// routes/user/admin-routes.ts - Different middleware stack
export const createAdminUserRoute = createApiRoute(async (context: UnifiedHttpContext) => {
  // Enhanced middleware stack for admin routes
  const container = getContainer();
  const createUserCommand = container.get('createUserCommand');

  const userData = validateRequestBodyOrError(context, AdminUserCreationSchema);
  if (!userData) return;
  
  const result = await createUserCommand.execute(userData);
  sendResponse(context, result, 201);
});
```

### Framework Integration

```typescript
// apps/user-service/src/main.ts - Framework registration with middleware
import { FastifyInstance } from 'fastify';
import { createFastifyContext } from '@inh-lib/api-util-fastify';

async function registerRoutes(fastify: FastifyInstance) {
  // ✅ Routes with built-in middleware - no manual setup needed
  fastify.post('/users', async (request, reply) => {
    const context = createFastifyContext(request, reply);
    await createUserRoute(context); // Middleware applied automatically
  });

  fastify.get('/users', async (request, reply) => {
    const context = createFastifyContext(request, reply);
    await getUsersRoute(context); // Middleware applied automatically
  });

  // Admin routes with different middleware
  fastify.post('/admin/users', async (request, reply) => {
    const context = createFastifyContext(request, reply);
    await createAdminUserRoute(context); // API middleware applied
  });
}
```

### Testing Middlewares

```typescript
// __tests__/middleware/logging.test.ts
import { createLoggingMiddleware } from '../../foundations/middleware/built-in';
import { createMockContext } from '../helpers/mock-context';

describe('Logging Middleware', () => {
  it('should log request and response', async () => {
    const logSpy = jest.spyOn(console, 'log');
    const middleware = createLoggingMiddleware();
    const context = createMockContext({ method: 'GET', url: '/test' });
    
    let nextCalled = false;
    const next = async () => { nextCalled = true; };

    await middleware(context, next);

    expect(nextCalled).toBe(true);
    expect(logSpy).toHaveBeenCalledWith('→ GET /test', expect.any(Object));
    expect(logSpy).toHaveBeenCalledWith('← GET /test 200 (0ms)', expect.any(Object));
  });

  it('should handle errors gracefully', async () => {
    const errorMiddleware = createErrorHandlingMiddleware();
    const context = createMockContext();
    
    const next = async () => { throw new Error('Test error'); };

    await errorMiddleware(context, next);

    expect(context.response.status).toHaveBeenCalledWith(500);
    expect(context.response.json).toHaveBeenCalledWith({
      error: 'Internal server error',
      timestamp: expect.any(String),
      path: expect.any(String)
    });
  });
});
```

### ✅ Middleware Benefits for Enterprise Applications

**🔄 DRY Principle:**
- Write cross-cutting concerns once, apply everywhere
- Consistent behavior across all routes
- Easy to modify global behavior

**🧪 Better Testing:**
- Test middleware independently
- Test route logic without boilerplate
- Mock middleware for unit tests

**📈 Maintainability:**
- Clear separation of concerns
- Easy to add/remove middleware
- Centralized configuration

**⚡ Performance:**
- Composed middleware runs efficiently
- No runtime overhead from repeated code
- Easy to optimize critical paths

**🔒 Security:**
- Consistent security headers
- Centralized authentication logic
- Easy to audit security measures

## Complete Example: Putting It All Together