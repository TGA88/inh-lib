# Enhanced Basic Middleware System 🔗

## Table of Contents
1. [The Problem Without Middleware](#the-problem-without-middleware)
2. [Solution: Basic Middleware Pattern](#solution-basic-middleware-pattern)
3. [Essential Built-in Middlewares](#essential-built-in-middlewares)
4. [Advanced Middleware Patterns](#advanced-middleware-patterns)
5. [Middleware Composition Strategies](#middleware-composition-strategies)
6. [Clean Route Functions with Middleware](#clean-route-functions-with-middleware)
7. [Framework Integration](#framework-integration)
8. [Testing Middlewares](#testing-middlewares)
9. [Performance Considerations](#performance-considerations)
10. [Error Handling Strategies](#error-handling-strategies)
11. [Real-World Examples](#real-world-examples)

---

## The Problem Without Middleware

### Code Duplication Hell

```typescript
// 😕 Every route repeats the same boilerplate code
export async function createUserRoute(context: UnifiedHttpContext, command: CreateUserCommand) {
  // 🔄 Logging - repeated in every route
  console.log(`→ ${context.request.method} ${context.request.url} ${new Date().toISOString()}`);
  
  // 🔄 CORS - repeated in every route  
  context.response.header('Access-Control-Allow-Origin', '*');
  context.response.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  context.response.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // 🔄 Security headers - repeated in every route
  context.response.header('X-Content-Type-Options', 'nosniff');
  context.response.header('X-Frame-Options', 'DENY');
  
  // 🔄 Input validation - repeated pattern
  const contentType = context.request.headers['content-type'];
  if (!contentType || !contentType.includes('application/json')) {
    context.response.status(400).json({ error: 'Content-Type must be application/json' });
    return;
  }
  
  // 🔄 Rate limiting check - repeated logic
  const clientIp = context.request.ip;
  if (await isRateLimited(clientIp)) {
    context.response.status(429).json({ error: 'Too many requests' });
    return;
  }
  
  // 🔄 Error handling - repeated in every route
  try {
    const userData = validateRequestBodyOrError(context, CreateUserSchema);
    if (!userData) return;
    
    const result = await command.execute(userData);
    sendResponse(context, result, 201);
  } catch (error) {
    // 🔄 Error response - repeated in every route
    console.error('Request failed:', error);
    
    if (error instanceof ValidationError) {
      context.response.status(400).json({ error: error.message });
    } else if (error instanceof DatabaseError) {
      context.response.status(503).json({ error: 'Service temporarily unavailable' });
    } else {
      context.response.status(500).json({ error: 'Internal server error' });
    }
  }
  
  // 🔄 Response logging - repeated in every route
  console.log(`← ${context.request.method} ${context.request.url} ${context.response.statusCode}`);
}

export async function getUsersRoute(context: UnifiedHttpContext, query: GetUsersQuery) {
  // 🔄 Same exact boilerplate repeated...
  console.log(`→ ${context.request.method} ${context.request.url} ${new Date().toISOString()}`);
  context.response.header('Access-Control-Allow-Origin', '*');
  // ... and so on
}

export async function updateUserRoute(context: UnifiedHttpContext, command: UpdateUserCommand) {
  // 🔄 Yet again, the same boilerplate...
  console.log(`→ ${context.request.method} ${context.request.url} ${new Date().toISOString()}`);
  context.response.header('Access-Control-Allow-Origin', '*');
  // ... continues forever
}
```

### Problems with This Approach

**🚫 Massive Code Duplication:**
- Same 30-50 lines repeated in every route
- Inconsistency when developers forget to add all checks
- Maintenance nightmare when requirements change

**🚫 Testing Complexity:**
- Every route test needs to verify all cross-cutting concerns
- Difficult to test business logic in isolation
- High coupling between infrastructure and domain logic

**🚫 Performance Issues:**
- Repeated regex compilation for each request
- Multiple object allocations for same operations
- No optimization opportunities

**🚫 Inconsistent Behavior:**
- Different error message formats across routes
- Varying security header implementations
- Inconsistent logging formats

---

## ✅ Solution: Basic Middleware Pattern

### Core Middleware Types

```typescript
// foundations/middleware/types.ts
export type UnifiedMiddleware = (
  context: UnifiedHttpContext, 
  next: () => Promise<void>
) => Promise<void>;

export type UnifiedRouteHandler = (context: UnifiedHttpContext) => Promise<void>;

export type UnifiedMiddlewareOptions = {
  order?: number;
  condition?: (context: UnifiedHttpContext) => boolean;
  skipOnError?: boolean;
  timeout?: number;
};

export interface UnifiedMiddlewareContext {
  startTime: number;
  metadata: Record<string, unknown>;
  skipRemainingMiddlewares?: boolean;
}

export interface UnifiedMiddlewareEntry {
  middleware: UnifiedMiddleware;
  options: UnifiedMiddlewareOptions;
}

// Extended context for middleware that need to track response state
export interface MiddlewareResponseState {
  statusCode?: number;
  sent?: boolean;
  headers: Record<string, string>;
}

export interface UnifiedHttpContextWithState extends UnifiedHttpContext {
  __middlewareState?: MiddlewareResponseState;
}
```

### Advanced Middleware Composition

```typescript
// foundations/middleware/utils.ts - Pure functions for testing
export const sortMiddlewaresByOrder = (middlewares: UnifiedMiddlewareEntry[]): UnifiedMiddlewareEntry[] => {
  return middlewares.sort((a, b) => (a.options.order || 0) - (b.options.order || 0));
};

export const shouldSkipMiddleware = (
  options: UnifiedMiddlewareOptions, 
  context: UnifiedHttpContext
): boolean => {
  return options.condition ? !options.condition(context) : false;
};

export const createTimeoutPromise = (timeoutMs: number, middlewareName?: string): Promise<never> => {
  return new Promise<never>((_, reject) => {
    setTimeout(() => {
      const name = middlewareName || 'Unknown middleware';
      reject(new Error(`${name} timeout after ${timeoutMs}ms`));
    }, timeoutMs);
  });
};

export const executeMiddlewareWithTimeout = async (
  middleware: UnifiedMiddleware,
  context: UnifiedHttpContext,
  next: () => Promise<void>,
  timeoutMs?: number
): Promise<void> => {
  if (timeoutMs) {
    const timeoutPromise = createTimeoutPromise(timeoutMs, middleware.name);
    await Promise.race([middleware(context, next), timeoutPromise]);
  } else {
    await middleware(context, next);
  }
};

export const createMiddlewareDispatcher = (
  sortedMiddlewares: UnifiedMiddlewareEntry[],
  handler: UnifiedRouteHandler,
  middlewareContext: UnifiedMiddlewareContext
) => {
  let index = 0;
  
  const dispatch = async (context: UnifiedHttpContext): Promise<void> => {
    if (middlewareContext.skipRemainingMiddlewares) {
      return;
    }

    if (index >= sortedMiddlewares.length) {
      await handler(context);
      return;
    }
    
    const { middleware, options } = sortedMiddlewares[index++];
    
    // Check condition if specified
    if (shouldSkipMiddleware(options, context)) {
      await dispatch(context);
      return;
    }

    // Execute middleware with optional timeout
    await executeMiddlewareWithTimeout(
      middleware, 
      context, 
      () => dispatch(context), 
      options.timeout
    );
  };

  return dispatch;
};

export const attachMiddlewareContext = (
  context: UnifiedHttpContext, 
  middlewareContext: UnifiedMiddlewareContext
): UnifiedHttpContext & { middleware: UnifiedMiddlewareContext } => {
  return Object.assign(context, { middleware: middlewareContext });
};

// Utility functions for response state tracking
export const initializeMiddlewareState = (context: UnifiedHttpContextWithState): void => {
  if (!context.__middlewareState) {
    context.__middlewareState = {
      statusCode: undefined,
      sent: false,
      headers: {}
    };
  }
};

export const trackResponseStatus = (context: UnifiedHttpContextWithState, statusCode: number): void => {
  initializeMiddlewareState(context);
  if (context.__middlewareState) {
    context.__middlewareState.statusCode = statusCode;
  }
};

export const markResponseSent = (context: UnifiedHttpContextWithState): void => {
  initializeMiddlewareState(context);
  if (context.__middlewareState) {
    context.__middlewareState.sent = true;
  }
};

export const getResponseStatus = (context: UnifiedHttpContextWithState): number | undefined => {
  return context.__middlewareState?.statusCode;
};

export const isResponseSent = (context: UnifiedHttpContextWithState): boolean => {
  return context.__middlewareState?.sent || false;
};

// foundations/middleware/composer.ts
export class UnifiedMiddlewareComposer {
  private middlewares: UnifiedMiddlewareEntry[] = [];

  add(middleware: UnifiedMiddleware, options: UnifiedMiddlewareOptions = {}): this {
    this.middlewares.push({ middleware, options });
    return this;
  }

  compose(): (handler: UnifiedRouteHandler) => UnifiedRouteHandler {
    const sortedMiddlewares = sortMiddlewaresByOrder([...this.middlewares]);

    return (handler: UnifiedRouteHandler): UnifiedRouteHandler => {
      return async (context: UnifiedHttpContext) => {
        const middlewareContext: UnifiedMiddlewareContext = {
          startTime: Date.now(),
          metadata: {}
        };

        const enhancedContext = attachMiddlewareContext(context, middlewareContext);
        const dispatch = createMiddlewareDispatcher(sortedMiddlewares, handler, middlewareContext);
        
        await dispatch(enhancedContext);
      };
    };
  }

  // Exposed for testing
  getMiddlewares(): UnifiedMiddlewareEntry[] {
    return [...this.middlewares];
  }

  // Exposed for testing
  getSortedMiddlewares(): UnifiedMiddlewareEntry[] {
    return sortMiddlewaresByOrder([...this.middlewares]);
  }
}

// Simple composition helper for basic use cases
export const composeMiddleware = (middlewares: UnifiedMiddleware[]): (handler: UnifiedRouteHandler) => UnifiedRouteHandler => {
  const composer = new UnifiedMiddlewareComposer();
  middlewares.forEach(middleware => composer.add(middleware));
  return composer.compose();
};
```

---

## Essential Built-in Middlewares

### 📊 Enhanced Request Logging Middleware

```typescript
// foundations/middleware/logging.ts
import { 
  UnifiedMiddleware, 
  UnifiedHttpContextWithState, 
  initializeMiddlewareState, 
  getResponseStatus,
  trackResponseStatus
} from './types';

export interface UnifiedLoggingOptions {
  includeBody?: boolean;
  includeHeaders?: boolean;
  includeUserAgent?: boolean;
  skipPaths?: string[];
  sensitiveHeaders?: string[];
  maxBodyLength?: number;
}

export const createLoggingMiddleware = (options: UnifiedLoggingOptions = {}): UnifiedMiddleware => {
  const {
    includeBody = false,
    includeHeaders = false,
    includeUserAgent = true,
    skipPaths = ['/health', '/metrics'],
    sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'],
    maxBodyLength = 1000
  } = options;

  return async (context, next) => {
    const contextWithState = context as UnifiedHttpContextWithState;
    initializeMiddlewareState(contextWithState);
    
    const startTime = Date.now();
    const { method, url, headers, ip } = context.request;
    
    // Skip logging for health checks and metrics
    if (skipPaths.some(path => url.includes(path))) {
      await next();
      return;
    }

    // Prepare request info
    const requestInfo: Record<string, unknown> = {
      method,
      url,
      ip,
      timestamp: new Date().toISOString()
    };

    if (includeUserAgent) {
      requestInfo.userAgent = headers['user-agent'];
    }

    if (includeHeaders) {
      requestInfo.headers = Object.fromEntries(
        Object.entries(headers).filter(
          ([key]) => !sensitiveHeaders.includes(key.toLowerCase())
        )
      );
    }

    if (includeBody && context.request.body) {
      const bodyString = JSON.stringify(context.request.body);
      requestInfo.body = bodyString.length > maxBodyLength 
        ? bodyString.substring(0, maxBodyLength) + '...[truncated]'
        : bodyString;
    }

    console.log(`→ ${method} ${url}`, requestInfo);

    let error: Error | null = null;
    try {
      // Intercept response.status to track status code
      const originalStatus = context.response.status;
      context.response.status = function(code: number) {
        trackResponseStatus(contextWithState, code);
        return originalStatus.call(this, code);
      };

      await next();
    } catch (err) {
      error = err instanceof Error ? err : new Error(String(err));
      throw err;
    } finally {
      const duration = Date.now() - startTime;
      const statusCode = getResponseStatus(contextWithState) || (error ? 500 : 200);
      
      const responseInfo: Record<string, unknown> = {
        statusCode,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      };

      if (error) {
        responseInfo.error = error.message;
      }

      console.log(`← ${method} ${url} ${statusCode} (${duration}ms)`, responseInfo);
    }
  };
};
```

### 🛡️ Enhanced Error Handling Middleware

```typescript
// foundations/middleware/error-handling.ts
import { 
  UnifiedMiddleware, 
  UnifiedHttpContextWithState, 
  initializeMiddlewareState, 
  isResponseSent,
  trackResponseStatus
} from './types';

export interface UnifiedErrorHandlingOptions {
  includeStack?: boolean;
  logErrors?: boolean;
  customErrorMap?: Map<string, { status: number; message: string }>;
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class DatabaseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DatabaseError';
  }
}

export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export const createErrorHandlingMiddleware = (options: UnifiedErrorHandlingOptions = {}): UnifiedMiddleware => {
  const {
    includeStack = false,
    logErrors = true,
    customErrorMap = new Map()
  } = options;

  return async (context, next) => {
    const contextWithState = context as UnifiedHttpContextWithState;
    initializeMiddlewareState(contextWithState);
    
    try {
      await next();
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      
      if (logErrors) {
        console.error('Request error:', {
          message: err.message,
          stack: err.stack,
          url: context.request.url,
          method: context.request.method,
          timestamp: new Date().toISOString()
        });
      }
      
      if (!isResponseSent(contextWithState)) {
        let status = 500;
        let message = 'Internal server error';

        // Check custom error mappings first
        const customError = customErrorMap.get(err.name);
        if (customError) {
          status = customError.status;
          message = customError.message;
        } else {
          // Built-in error type handling
          switch (err.constructor) {
            case ValidationError:
              status = 400;
              message = err.message;
              break;
            case AuthenticationError:
              status = 401;
              message = err.message;
              break;
            case DatabaseError:
              status = 503;
              message = 'Service temporarily unavailable';
              break;
            default:
              // Keep defaults
              break;
          }
        }

        const errorResponse: Record<string, unknown> = {
          error: message,
          timestamp: new Date().toISOString(),
          path: context.request.url
        };

        if (includeStack && process.env.NODE_ENV === 'development') {
          errorResponse.stack = err.stack;
        }

        trackResponseStatus(contextWithState, status);
        context.response.status(status);
        context.response.json(errorResponse);
      }
    }
  };
};
```

### 🌍 Advanced CORS Middleware

```typescript
// foundations/middleware/cors.ts
export interface UnifiedCorsOptions {
  origin?: string | string[] | ((origin: string) => boolean);
  methods?: string[];
  allowedHeaders?: string[];
  exposedHeaders?: string[];
  credentials?: boolean;
  maxAge?: number;
  preflightContinue?: boolean;
  optionsSuccessStatus?: number;
}

export const createCorsMiddleware = (options: UnifiedCorsOptions = {}): UnifiedMiddleware => {
  const {
    origin = '*',
    methods = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders = ['Content-Type', 'Authorization'],
    exposedHeaders = [],
    credentials = false,
    maxAge = 86400, // 24 hours
    preflightContinue = false,
    optionsSuccessStatus = 204
  } = options;

  return async (context, next) => {
    const requestOrigin = context.request.headers.origin;
    
    // Determine allowed origin
    let allowedOrigin = '*';
    if (typeof origin === 'string') {
      allowedOrigin = origin;
    } else if (Array.isArray(origin)) {
      allowedOrigin = origin.includes(requestOrigin) ? requestOrigin : 'false';
    } else if (typeof origin === 'function') {
      allowedOrigin = origin(requestOrigin) ? requestOrigin : 'false';
    }

    // Set CORS headers
    context.response.header('Access-Control-Allow-Origin', allowedOrigin);
    context.response.header('Access-Control-Allow-Methods', methods.join(','));
    context.response.header('Access-Control-Allow-Headers', allowedHeaders.join(','));
    
    if (exposedHeaders.length > 0) {
      context.response.header('Access-Control-Expose-Headers', exposedHeaders.join(','));
    }
    
    if (credentials) {
      context.response.header('Access-Control-Allow-Credentials', 'true');
    }
    
    if (maxAge) {
      context.response.header('Access-Control-Max-Age', maxAge.toString());
    }

    // Handle preflight requests
    if (context.request.method === 'OPTIONS') {
      context.response.status(optionsSuccessStatus);
      if (!preflightContinue) {
        context.response.send('');
        return; // Don't call next() for OPTIONS unless preflightContinue is true
      }
    }

    await next();
  };
};
```

### 🛡️ Security Headers Middleware

```typescript
// foundations/middleware/security.ts
export interface UnifiedSecurityOptions {
  contentTypeOptions?: boolean;
  frameOptions?: 'DENY' | 'SAMEORIGIN' | string;
  xssProtection?: boolean;
  referrerPolicy?: string;
  contentSecurityPolicy?: string;
  hsts?: {
    maxAge: number;
    includeSubDomains?: boolean;
    preload?: boolean;
  };
}

export const createSecurityMiddleware = (options: UnifiedSecurityOptions = {}): UnifiedMiddleware => {
  const {
    contentTypeOptions = true,
    frameOptions = 'DENY',
    xssProtection = true,
    referrerPolicy = 'strict-origin-when-cross-origin',
    contentSecurityPolicy,
    hsts
  } = options;

  return async (context, next) => {
    // X-Content-Type-Options
    if (contentTypeOptions) {
      context.response.header('X-Content-Type-Options', 'nosniff');
    }

    // X-Frame-Options
    if (frameOptions) {
      context.response.header('X-Frame-Options', frameOptions);
    }

    // X-XSS-Protection
    if (xssProtection) {
      context.response.header('X-XSS-Protection', '1; mode=block');
    }

    // Referrer-Policy
    if (referrerPolicy) {
      context.response.header('Referrer-Policy', referrerPolicy);
    }

    // Content-Security-Policy
    if (contentSecurityPolicy) {
      context.response.header('Content-Security-Policy', contentSecurityPolicy);
    }

    // HTTP Strict Transport Security (only check if context has protocol info)
    if (hsts) {
      // Since UnifiedRequestContext doesn't have protocol, we'll assume HTTPS in production
      if (process.env.NODE_ENV === 'production') {
        let hstsValue = `max-age=${hsts.maxAge}`;
        if (hsts.includeSubDomains) hstsValue += '; includeSubDomains';
        if (hsts.preload) hstsValue += '; preload';
        context.response.header('Strict-Transport-Security', hstsValue);
      }
    }

    await next();
  };
};
```

### ⚡ Rate Limiting Middleware

```typescript
// foundations/middleware/rate-limit.ts
import { 
  UnifiedMiddleware, 
  UnifiedHttpContextWithState, 
  initializeMiddlewareState, 
  getResponseStatus,
  trackResponseStatus
} from './types';

export interface UnifiedRateLimitOptions {
  windowMs: number;
  max: number;
  keyGenerator?: (context: UnifiedHttpContext) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  message?: string;
  headers?: boolean;
}

export const createRateLimitMiddleware = (options: UnifiedRateLimitOptions): UnifiedMiddleware => {
  const {
    windowMs,
    max,
    keyGenerator = (context) => context.request.ip,
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
    message = 'Too many requests',
    headers = true
  } = options;

  const requests = new Map<string, { count: number; resetTime: number }>();

  // Cleanup expired entries periodically
  setInterval(() => {
    const now = Date.now();
    for (const [key, data] of requests.entries()) {
      if (now > data.resetTime) {
        requests.delete(key);
      }
    }
  }, windowMs);

  return async (context, next) => {
    const contextWithState = context as UnifiedHttpContextWithState;
    initializeMiddlewareState(contextWithState);
    
    const key = keyGenerator(context);
    const now = Date.now();
    const resetTime = now + windowMs;

    let requestData = requests.get(key);
    if (!requestData || now > requestData.resetTime) {
      requestData = { count: 0, resetTime };
      requests.set(key, requestData);
    }

    if (headers) {
      context.response.header('X-RateLimit-Limit', max.toString());
      context.response.header('X-RateLimit-Remaining', Math.max(0, max - requestData.count - 1).toString());
      context.response.header('X-RateLimit-Reset', new Date(requestData.resetTime).toISOString());
    }

    if (requestData.count >= max) {
      trackResponseStatus(contextWithState, 429);
      context.response.status(429);
      context.response.json({ error: message });
      return;
    }

    requestData.count++;

    // Intercept response.status to track status code
    const originalStatus = context.response.status;
    context.response.status = function(code: number) {
      trackResponseStatus(contextWithState, code);
      return originalStatus.call(this, code);
    };

    let statusCode: number;
    try {
      await next();
      statusCode = getResponseStatus(contextWithState) || 200;
    } catch (error) {
      statusCode = getResponseStatus(contextWithState) || 500;
      throw error;
    } finally {
      // Optionally skip counting certain requests
      if ((skipSuccessfulRequests && statusCode < 400) ||
          (skipFailedRequests && statusCode >= 400)) {
        requestData.count--;
      }
    }
  };
};
```

---

## Advanced Middleware Patterns

### Conditional Middleware

```typescript
// foundations/middleware/conditional.ts
import { UnifiedMiddleware, UnifiedHttpContext } from './types';

export const createConditionalMiddleware = (
  condition: (context: UnifiedHttpContext) => boolean,
  middleware: UnifiedMiddleware
): UnifiedMiddleware => {
  return async (context, next) => {
    if (condition(context)) {
      await middleware(context, next);
    } else {
      await next();
    }
  };
};

// Usage examples
interface AuthService {
  validateToken(token: string): Promise<{ id: string; email: string; role: string }>;
}

interface AuthenticatedContext extends UnifiedHttpContext {
  user: { id: string; email: string; role: string };
}

export const createAuthMiddleware = (authService: AuthService): UnifiedMiddleware => {
  return createConditionalMiddleware(
    (context) => !context.request.url.startsWith('/public'),
    async (context, next) => {
      const token = context.request.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        context.response.status(401).json({ error: 'Authentication required' });
        return;
      }

      try {
        const user = await authService.validateToken(token);
        (context as AuthenticatedContext).user = user;
        await next();
      } catch (error) {
        context.response.status(401).json({ error: 'Invalid token' });
      }
    }
  );
};
```

### Caching Middleware

```typescript
// foundations/middleware/cache.ts
import { 
  UnifiedMiddleware, 
  UnifiedHttpContextWithState, 
  initializeMiddlewareState, 
  getResponseStatus,
  trackResponseStatus
} from './types';

export interface UnifiedCacheOptions {
  ttl: number; // Time to live in seconds
  keyGenerator?: (context: UnifiedHttpContext) => string;
  skipMethods?: string[];
  vary?: string[];
}

interface CacheEntry {
  data: unknown;
  expires: number;
  etag: string;
}

interface ExtendedResponse {
  send: (data: unknown) => unknown;
  json: (data: unknown) => unknown;
}

export const createCacheMiddleware = (options: UnifiedCacheOptions): UnifiedMiddleware => {
  const {
    ttl,
    keyGenerator = (context) => `${context.request.method}:${context.request.url}`,
    skipMethods = ['POST', 'PUT', 'DELETE', 'PATCH'],
    vary = []
  } = options;

  const cache = new Map<string, CacheEntry>();

  return async (context, next) => {
    const contextWithState = context as UnifiedHttpContextWithState;
    initializeMiddlewareState(contextWithState);
    
    // Skip caching for certain methods
    if (skipMethods.includes(context.request.method)) {
      await next();
      return;
    }

    const key = keyGenerator(context);
    const now = Date.now();
    const cached = cache.get(key);

    // Check if we have valid cached data
    if (cached && now < cached.expires) {
      // Handle ETag validation
      const ifNoneMatch = context.request.headers['if-none-match'];
      if (ifNoneMatch === cached.etag) {
        trackResponseStatus(contextWithState, 304);
        context.response.status(304);
        context.response.header('ETag', cached.etag);
        context.response.send('');
        return;
      }

      // Return cached response
      context.response.header('ETag', cached.etag);
      context.response.header('Cache-Control', `max-age=${Math.floor((cached.expires - now) / 1000)}`);
      context.response.json(cached.data);
      return;
    }

    // Capture response to cache
    const response = context.response as ExtendedResponse;
    const originalSend = response.send;
    const originalJson = response.json;
    const originalStatus = context.response.status;
    let responseData: unknown = null;

    // Intercept status calls
    context.response.status = function(code: number) {
      trackResponseStatus(contextWithState, code);
      return originalStatus.call(this, code);
    };

    response.json = function(data: unknown) {
      responseData = data;
      return originalJson.call(this, data);
    };

    response.send = function(data: unknown) {
      if (typeof data === 'string') {
        try {
          responseData = JSON.parse(data);
        } catch {
          responseData = data;
        }
      } else {
        responseData = data;
      }
      return originalSend.call(this, data);
    };

    await next();

    // Cache successful responses
    const statusCode = getResponseStatus(contextWithState);
    if (responseData && statusCode && statusCode < 400) {
      const etag = `"${require('crypto').createHash('md5').update(JSON.stringify(responseData)).digest('hex')}"`;
      const expires = now + (ttl * 1000);

      cache.set(key, { data: responseData, expires, etag });
      context.response.header('ETag', etag);
      context.response.header('Cache-Control', `max-age=${ttl}`);

      if (vary.length > 0) {
        context.response.header('Vary', vary.join(', '));
      }
    }
  };
};
```

---

## Performance Considerations

### Memory Management

```typescript
// foundations/middleware/memory.ts
export const createMemoryMonitoringMiddleware = (): UnifiedMiddleware => {
  return async (context, next) => {
    const initialMemory = process.memoryUsage();
    
    await next();
    
    const finalMemory = process.memoryUsage();
    const memoryDiff = {
      heapUsed: finalMemory.heapUsed - initialMemory.heapUsed,
      heapTotal: finalMemory.heapTotal - initialMemory.heapTotal,
      external: finalMemory.external - initialMemory.external
    };

    // Log significant memory usage
    if (memoryDiff.heapUsed > 10 * 1024 * 1024) { // 10MB
      console.warn(`High memory usage detected in ${context.request.url}:`, memoryDiff);
    }

    context.response.header('X-Memory-Delta', JSON.stringify(memoryDiff));
  };
};
```

### Request Timing

```typescript
// foundations/middleware/timing.ts
export const createTimingMiddleware = (): UnifiedMiddleware => {
  return async (context, next) => {
    const startTime = process.hrtime.bigint();
    
    await next();
    
    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
    
    context.response.header('X-Response-Time', `${duration.toFixed(2)}ms`);
    
    // Log slow requests
    if (duration > 1000) { // 1 second
      console.warn(`Slow request detected: ${context.request.url} took ${duration.toFixed(2)}ms`);
    }
  };
};
```

---

## Real-World Examples

### Complete E-commerce API Setup

```typescript
// apps/ecommerce-api/src/middleware-setup.ts
import { UnifiedMiddlewareComposer } from '../../foundations/middleware/composer';
import {
  createLoggingMiddleware,
  createCorsMiddleware,
  createSecurityMiddleware,
  createRateLimitMiddleware,
  createAuthMiddleware,
  createCacheMiddleware,
  createTimingMiddleware
} from '../../foundations/middleware';

interface AuthService {
  validateToken(token: string): Promise<{ id: string; email: string; role: string }>;
}

interface AdminService {
  isAdmin(userId: string): Promise<boolean>;
}

interface AuthenticatedContext extends UnifiedHttpContext {
  user: { id: string; email: string; role: string };
}

// Public routes middleware (no auth required)
export const createPublicMiddleware = () => {
  return new UnifiedMiddlewareComposer()
    .add(createTimingMiddleware(), { order: 1 })
    .add(createLoggingMiddleware({ includeUserAgent: true }), { order: 2 })
    .add(createSecurityMiddleware({
      frameOptions: 'SAMEORIGIN',
      contentSecurityPolicy: "default-src 'self'"
    }), { order: 3 })
    .add(createCorsMiddleware({
      origin: ['https://mystore.com', 'https://admin.mystore.com'],
      credentials: true
    }), { order: 4 })
    .add(createRateLimitMiddleware({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100 // limit each IP to 100 requests per windowMs
    }), { order: 5 })
    .add(createCacheMiddleware({
      ttl: 300, // 5 minutes
      skipMethods: ['POST', 'PUT', 'DELETE', 'PATCH']
    }), { order: 6 })
    .compose();
};

// Protected routes middleware (auth required)
export const createProtectedMiddleware = (authService: AuthService) => {
  return new UnifiedMiddlewareComposer()
    .add(createTimingMiddleware(), { order: 1 })
    .add(createLoggingMiddleware({ 
      includeUserAgent: true,
      includeHeaders: true,
      sensitiveHeaders: ['authorization', 'cookie']
    }), { order: 2 })
    .add(createSecurityMiddleware({
      frameOptions: 'DENY',
      hsts: { maxAge: 31536000, includeSubDomains: true }
    }), { order: 3 })
    .add(createCorsMiddleware({
      origin: ['https://admin.mystore.com'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE']
    }), { order: 4 })
    .add(createRateLimitMiddleware({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 1000, // Higher limit for authenticated users
      keyGenerator: (context) => {
        const authenticatedContext = context as AuthenticatedContext;
        return authenticatedContext.user?.id || context.request.ip;
      }
    }), { order: 5 })
    .add(createAuthMiddleware(authService), { order: 6 })
    .compose();
};

// Admin routes middleware (stricter security)
export const createAdminMiddleware = (authService: AuthService, adminService: AdminService) => {
  return new UnifiedMiddlewareComposer()
    .add(createTimingMiddleware(), { order: 1 })
    .add(createLoggingMiddleware({
      includeBody: true,
      includeHeaders: true,
      maxBodyLength: 500
    }), { order: 2 })
    .add(createSecurityMiddleware({
      frameOptions: 'DENY',
      contentSecurityPolicy: "default-src 'none'; script-src 'self'",
      hsts: { maxAge: 31536000, includeSubDomains: true, preload: true }
    }), { order: 3 })
    .add(createCorsMiddleware({
      origin: 'https://admin.mystore.com',
      credentials: true
    }), { order: 4 })
    .add(createRateLimitMiddleware({
      windowMs: 15 * 60 * 1000,
      max: 50, // Stricter limit for admin operations
      keyGenerator: (context) => {
        const authenticatedContext = context as AuthenticatedContext;
        return authenticatedContext.user?.id || context.request.ip;
      }
    }), { order: 5 })
    .add(createAuthMiddleware(authService), { order: 6 })
    .add(async (context, next) => {
      // Admin role check
      const authenticatedContext = context as AuthenticatedContext;
      const user = authenticatedContext.user;
      if (!await adminService.isAdmin(user.id)) {
        context.response.status(403).json({ error: 'Admin access required' });
        return;
      }
      await next();
    }, { order: 7 })
    .compose();
};
```

### Usage in Routes

```typescript
// routes/products/public-routes.ts
export const getProductsRoute = createPublicMiddleware()(
  async (context: UnifiedHttpContext) => {
    const container = getContainer();
    const getProductsQuery = container.get('getProductsQuery');

    const queryParams = validateQueryParamsOrError(context, GetProductsQuerySchema);
    if (!queryParams) return;
    
    const result = await getProductsQuery.execute(queryParams);
    sendResponse(context, result);
  }
);

// routes/products/admin-routes.ts  
export const createProductRoute = createAdminMiddleware(authService, adminService)(
  async (context: UnifiedHttpContext) => {
    const container = getContainer();
    const createProductCommand = container.get('createProductCommand');

    const productData = validateRequestBodyOrError(context, CreateProductSchema);
    if (!productData) return;
    
    const result = await createProductCommand.execute(productData);
    sendResponse(context, result, 201);
  }
);
```

---

## ✅ Benefits Summary

### 🔄 **DRY Principle Achieved:**
- Write cross-cutting concerns once, apply everywhere
- Consistent behavior across all routes
- Easy to modify global behavior in one place

### 🧪 **Superior Testing:**
- Test middleware independently with focused unit tests
- Test route logic without infrastructure boilerplate
- Easy to mock middleware for integration tests

### 📈 **Enhanced Maintainability:**
- Clear separation of concerns
- Easy to add/remove middleware from specific route groups
- Centralized configuration for all cross-cutting concerns

### ⚡ **Better Performance:**
- Composed middleware runs efficiently with minimal overhead
- No runtime overhead from repeated code
- Easy to optimize critical paths by adjusting middleware stacks

### 🔒 **Consistent Security:**
- Uniform security headers across all routes
- Centralized authentication and authorization logic
- Easy to audit and update security measures

### 📊 **Comprehensive Monitoring:**
- Consistent logging format across all requests
- Built-in performance monitoring
- Easy to add metrics collection

This middleware system provides everything needed for enterprise-grade applications while maintaining simplicity and flexibility! 🏗️🚀