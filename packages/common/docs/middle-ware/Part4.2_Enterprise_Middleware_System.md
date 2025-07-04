# Part 4.2: Enterprise Middleware System 🔗

## 📖 **Course Overview**

**Goal**: สร้าง enterprise-grade middleware system ที่สามารถจัดการ cross-cutting concerns อย่างเป็นระบบ พร้อมด้วย comprehensive logging, schema validation, และ framework independence

**Learning Outcome**: 
- เขียน reusable middleware ที่ทำงานได้กับทุก HTTP framework
- ใช้ schema validation middleware เพื่อลด boilerplate code 90%
- สร้าง individual route classes ที่มี custom middleware ต่าง ๆ กัน
- ใช้ logger injection เพื่อ complete observability
- เขียน comprehensive tests สำหรับ middleware และ routes
- ออกแบบ middleware architecture ที่ scalable สำหรับ enterprise applications

**Time Investment**: 2-3 สัปดาห์ (8-12 ชั่วโมง total)
- **Week 1**: อ่านทฤษฎี + ลองเขียน basic middleware (3-4 ชม.)
- **Week 2**: ลงมือสร้าง validation middleware + route classes (4-5 ชม.) 
- **Week 3**: เขียน tests + ปรับแต่ง production setup (2-3 ชม.)

---

## 📋 **Table of Contents**

### **Part 1: Foundation & Problem Analysis**
- [The Problem Without Middleware](#the-problem-without-middleware)
- [Solution: Simple Middleware Pattern](#-solution-simple-middleware-pattern)
- [Core Types & Middleware Composer](#simple-middleware-composer)

### **Part 2: Essential Built-in Middlewares**
- [📊 Logging Middleware](#-logging-middleware)
- [🌍 CORS Middleware](#-cors-middleware)
- [🛡️ Error Handling Middleware](#️-error-handling-middleware)
- [⚡ Rate Limiting Middleware](#-rate-limiting-middleware)
- [🛡️ Schema Validation Middleware](#️-schema-validation-middleware)
- [🗄️ Cache Middleware](#️-cache-middleware)

### **Part 3: Schema-Driven Development**
- [Zod Schemas & Type Safety](#zod-schemas)
- [Validation Schemas Configuration](#schemas--validation)
- [Middleware Stacks & Composition](#middleware-stacks)

### **Part 4: Clean Architecture Implementation**
- [Setup with Fastify Logger](#setup-with-fastify-logger)
- [Clean Route Classes (Individual Routes)](#clean-route-classes-using-schema-validation-middleware)
- [HTTP Route Handlers with Custom Middleware](#http-route-handlers-with-schema-validation-middleware)
- [Framework Integration](#framework-integration)

### **Part 5: Testing & Quality Assurance**
- [Testing Schema Validation Middleware](#testing-schema-validation-middleware)
- [Testing Route Classes](#testing-route-classes-with-schema-validation)
- [Testing Individual Middlewares](#testing-middleware)
- [Integration Testing Strategies](#testing-individual-route-classes)

### **Part 6: Enterprise Benefits & Best Practices**
- [Benefits of Logger in Every Middleware](#-benefits-of-logger-in-every-middleware)
- [Benefits of Schema Validation Middleware](#-benefits-of-schema-validation-middleware)
- [Individual Route Classes Benefits](#-benefits-of-individual-route-classes-with-complete-logging)
- [Production Considerations](#-complete-architecture-benefits)

### **Part 7: Framework Independence**
- [Cross-Framework Compatibility](#framework-independence-maintained-with-universal-logging)
- [Logger Injection Benefits](#benefits-of-logger-injection)
- [Production Deployment](#-universal-middleware-logging)

---

## The Problem Without Middleware

```typescript
// 😕 Code duplication across every route
export async function createUserRoute(context: UnifiedHttpContext, command: CreateUserCommand) {
  // 🔄 Logging - repeated in every route
  console.log(`→ ${context.request.method} ${context.request.url}`);
  
  // 🔄 CORS - repeated in every route  
  context.response.header('Access-Control-Allow-Origin', '*');
  
  // 🔄 Error handling - repeated in every route
  try {
    const userData = validateRequestBodyOrError(context, CreateUserSchema);
    if (!userData) return;
    
    const result = await command.execute(userData);
    sendResponse(context, result, 201);
  } catch (error) {
    console.error('Request failed:', error);
    context.response.status(500).json({ error: 'Internal server error' });
  }
}
```

---

## ✅ Solution: Simple Middleware Pattern

### Core Types

```typescript
// foundations/middleware/types.ts
export type UnifiedMiddleware = (
  context: UnifiedHttpContext, 
  next: () => Promise<void>
) => Promise<void>;

export type UnifiedRouteHandler = (context: UnifiedHttpContext) => Promise<void>;
```

### Simple Middleware Composer

```typescript
// foundations/middleware/composer.ts
export const composeMiddleware = (middlewares: UnifiedMiddleware[]) => {
  return (handler: UnifiedRouteHandler): UnifiedRouteHandler => {
    return async (context: UnifiedHttpContext) => {
      let index = 0;
      
      const next = async (): Promise<void> => {
        if (index >= middlewares.length) {
          await handler(context);
          return;
        }
        
        const middleware = middlewares[index++];
        await middleware(context, next);
      };
      
      await next();
    };
  };
};
```

---

## Essential Middlewares

### 📊 Logging Middleware

```typescript
// foundations/middleware/logging.ts
export interface Logger {
  info(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  debug(message: string, meta?: Record<string, unknown>): void;
}

export const createLoggingMiddleware = (logger: Logger): UnifiedMiddleware => {
  return async (context, next) => {
    const start = Date.now();
    const { method, url } = context.request;
    
    logger.info(`→ ${method} ${url}`, {
      method,
      url,
      ip: context.request.ip,
      userAgent: context.request.headers['user-agent']
    });
    
    try {
      await next();
      const duration = Date.now() - start;
      logger.info(`← ${method} ${url} 200 (${duration}ms)`, {
        method,
        url,
        statusCode: 200,
        duration
      });
    } catch (error) {
      const duration = Date.now() - start;
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`← ${method} ${url} 500 (${duration}ms)`, {
        method,
        url,
        statusCode: 500,
        duration,
        error: message
      });
      throw error;
    }
  };
};
```

### 🌍 CORS Middleware

```typescript
// foundations/middleware/cors.ts
export const createCorsMiddleware = (logger: Logger, origins = '*') => {
  return async (context: UnifiedHttpContext, next: () => Promise<void>) => {
    const requestOrigin = context.request.headers.origin;
    
    // Log CORS request
    logger.debug('CORS request', {
      origin: requestOrigin,
      method: context.request.method,
      url: context.request.url
    });

    context.response.header('Access-Control-Allow-Origin', origins);
    context.response.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE');
    context.response.header('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    
    if (context.request.method === 'OPTIONS') {
      logger.info('CORS preflight request handled', {
        origin: requestOrigin,
        url: context.request.url
      });
      
      context.response.status(200);
      context.response.send('');
      return;
    }
    
    // Check for CORS violations if origins is restricted
    if (origins !== '*' && requestOrigin && !origins.includes(requestOrigin)) {
      logger.warn('CORS violation detected', {
        requestOrigin,
        allowedOrigins: origins,
        url: context.request.url,
        ip: context.request.ip
      });
    }
    
    await next();
  };
};
```

### 🛡️ Error Handling Middleware

```typescript
// foundations/middleware/error-handling.ts
export const createErrorMiddleware = (logger: Logger): UnifiedMiddleware => {
  return async (context, next) => {
    try {
      await next();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Internal server error';
      
      logger.error('Request error', {
        url: context.request.url,
        method: context.request.method,
        error: message,
        stack: error instanceof Error ? error.stack : undefined
      });
      
      context.response.status(500);
      context.response.json({ 
        error: 'Internal server error',
        path: context.request.url 
      });
    }
  };
};
```

### 🛡️ Schema Validation Middleware

```typescript
// foundations/middleware/validation.ts
import { z } from 'zod';

export interface ValidationSchemas {
  body?: z.ZodSchema;
  query?: z.ZodSchema;
  params?: z.ZodSchema;
}

export interface ValidatedData {
  body?: unknown;
  query?: unknown;
  params?: unknown;
}

// Extend UnifiedHttpContext to include validated data
declare module '@inh-lib/common' {
  interface UnifiedHttpContext {
    validated?: ValidatedData;
  }
}

export const createValidationMiddleware = (logger: Logger, schemas: ValidationSchemas): UnifiedMiddleware => {
  return async (context, next) => {
    const { method, url } = context.request;
    
    logger.debug('Starting validation', {
      method,
      url,
      schemas: Object.keys(schemas)
    });

    try {
      const validated: ValidatedData = {};

      // Validate request body
      if (schemas.body) {
        logger.debug('Validating request body', { method, url });
        
        const bodyResult = schemas.body.safeParse(context.request.body);
        if (!bodyResult.success) {
          logger.warn('Body validation failed', {
            method,
            url,
            errors: bodyResult.error.errors,
            receivedData: context.request.body
          });
          
          context.response.status(400);
          context.response.json({
            error: 'Validation failed',
            field: 'body',
            details: bodyResult.error.errors
          });
          return;
        }
        validated.body = bodyResult.data;
        
        logger.debug('Body validation passed', {
          method,
          url,
          validatedFields: Object.keys(bodyResult.data as Record<string, unknown>)
        });
      }

      // Validate query parameters
      if (schemas.query) {
        logger.debug('Validating query parameters', { method, url });
        
        const queryResult = schemas.query.safeParse(context.request.query);
        if (!queryResult.success) {
          logger.warn('Query validation failed', {
            method,
            url,
            errors: queryResult.error.errors,
            receivedQuery: context.request.query
          });
          
          context.response.status(400);
          context.response.json({
            error: 'Validation failed',
            field: 'query',
            details: queryResult.error.errors
          });
          return;
        }
        validated.query = queryResult.data;
        
        logger.debug('Query validation passed', {
          method,
          url,
          validatedQuery: queryResult.data
        });
      }

      // Validate path parameters
      if (schemas.params) {
        logger.debug('Validating path parameters', { method, url });
        
        const paramsResult = schemas.params.safeParse(context.request.params);
        if (!paramsResult.success) {
          logger.warn('Params validation failed', {
            method,
            url,
            errors: paramsResult.error.errors,
            receivedParams: context.request.params
          });
          
          context.response.status(400);
          context.response.json({
            error: 'Validation failed',
            field: 'params',
            details: paramsResult.error.errors
          });
          return;
        }
        validated.params = paramsResult.data;
        
        logger.debug('Params validation passed', {
          method,
          url,
          validatedParams: paramsResult.data
        });
      }

      // Attach validated data to context
      context.validated = validated;
      
      logger.info('All validation passed', {
        method,
        url,
        validatedFields: Object.keys(validated)
      });
      
      await next();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      
      logger.error('Validation middleware error', {
        method,
        url,
        error: message,
        stack: error instanceof Error ? error.stack : undefined
      });
      
      context.response.status(500);
      context.response.json({
        error: 'Validation middleware error',
        details: message
      });
    }
  };
};

// Helper function to get validated data with type safety
export const getValidated = <T>(context: UnifiedHttpContext, field: keyof ValidatedData): T => {
  if (!context.validated || !context.validated[field]) {
    throw new Error(`Validated ${field} not found`);
  }
  return context.validated[field] as T;
};
```
```

### ⚡ Rate Limiting Middleware

```typescript
// foundations/middleware/rate-limit.ts
const requests = new Map<string, { count: number; resetTime: number }>();

export const createRateLimitMiddleware = (logger: Logger, max = 100, windowMs = 15 * 60 * 1000) => {
  return async (context: UnifiedHttpContext, next: () => Promise<void>) => {
    const key = context.request.ip;
    const now = Date.now();
    
    let data = requests.get(key);
    if (!data || now > data.resetTime) {
      data = { count: 0, resetTime: now + windowMs };
      requests.set(key, data);
      
      logger.debug('Rate limit window reset', {
        ip: key,
        resetTime: new Date(data.resetTime).toISOString()
      });
    }
    
    // Log approaching rate limit
    if (data.count >= max * 0.8) { // 80% of limit
      logger.warn('Rate limit approaching', {
        ip: key,
        count: data.count,
        limit: max,
        url: context.request.url,
        userAgent: context.request.headers['user-agent']
      });
    }
    
    if (data.count >= max) {
      logger.error('Rate limit exceeded', {
        ip: key,
        count: data.count,
        limit: max,
        url: context.request.url,
        userAgent: context.request.headers['user-agent'],
        resetTime: new Date(data.resetTime).toISOString()
      });
      
      context.response.status(429);
      context.response.json({ 
        error: 'Too many requests',
        resetTime: new Date(data.resetTime).toISOString()
      });
      return;
    }
    
    data.count++;
    
    // Log rate limit headers being set
    logger.debug('Rate limit check passed', {
      ip: key,
      count: data.count,
      limit: max,
      remaining: max - data.count
    });
    
    await next();
  };
};
```

### 🗄️ Cache Middleware

```typescript
// foundations/middleware/cache.ts
export interface UnifiedCacheOptions {
  ttl: number; // Time to live in seconds
  keyGenerator?: (context: UnifiedHttpContext) => string;
  skipMethods?: string[];
}

interface CacheEntry {
  data: unknown;
  expires: number;
  etag: string;
}

export const createCacheMiddleware = (logger: Logger, options: UnifiedCacheOptions): UnifiedMiddleware => {
  const {
    ttl,
    keyGenerator = (context) => `${context.request.method}:${context.request.url}`,
    skipMethods = ['POST', 'PUT', 'DELETE', 'PATCH']
  } = options;

  const cache = new Map<string, CacheEntry>();

  return async (context, next) => {
    const { method, url } = context.request;
    
    // Skip caching for certain methods
    if (skipMethods.includes(method)) {
      logger.debug('Cache skipped for method', { method, url });
      await next();
      return;
    }

    const key = keyGenerator(context);
    const now = Date.now();
    const cached = cache.get(key);

    // Check if we have valid cached data
    if (cached && now < cached.expires) {
      const timeLeft = Math.floor((cached.expires - now) / 1000);
      
      // Handle ETag validation
      const ifNoneMatch = context.request.headers['if-none-match'];
      if (ifNoneMatch === cached.etag) {
        logger.info('Cache hit - ETag match (304)', {
          method,
          url,
          key,
          etag: cached.etag,
          timeLeft
        });
        
        context.response.status(304);
        context.response.header('ETag', cached.etag);
        context.response.send('');
        return;
      }

      // Return cached response
      logger.info('Cache hit - returning cached data', {
        method,
        url,
        key,
        timeLeft,
        etag: cached.etag
      });
      
      context.response.header('ETag', cached.etag);
      context.response.header('Cache-Control', `max-age=${timeLeft}`);
      context.response.json(cached.data);
      return;
    }

    // Cache miss - log and proceed
    if (cached) {
      logger.debug('Cache expired', {
        method,
        url,
        key,
        expiredTime: new Date(cached.expires).toISOString()
      });
    } else {
      logger.debug('Cache miss - no cached data', {
        method,
        url,
        key
      });
    }

    // Capture response to cache
    const originalJson = context.response.json;
    let responseData: unknown = null;

    context.response.json = function(data: unknown) {
      responseData = data;
      return originalJson.call(this, data);
    };

    await next();

    // Cache successful responses
    if (responseData && (!context.response.statusCode || context.response.statusCode < 400)) {
      const etag = `"${require('crypto').createHash('md5').update(JSON.stringify(responseData)).digest('hex')}"`;
      const expires = now + (ttl * 1000);

      cache.set(key, { data: responseData, expires, etag });
      
      logger.info('Response cached', {
        method,
        url,
        key,
        etag,
        ttl,
        expiresAt: new Date(expires).toISOString(),
        dataSize: JSON.stringify(responseData).length
      });
      
      context.response.header('ETag', etag);
      context.response.header('Cache-Control', `max-age=${ttl}`);
    } else {
      logger.debug('Response not cached', {
        method,
        url,
        key,
        reason: responseData ? 'error response' : 'no response data',
        statusCode: context.response.statusCode
      });
    }
  };
};
```

### Zod Schemas

```typescript
// routes/user/schemas.ts
import { z } from 'zod';

export const CreateUserSchema = z.object({
  email: z.string().email('Invalid email format'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  age: z.number().min(18, 'Must be at least 18 years old').optional()
});

export const UpdateUserSchema = z.object({
  email: z.string().email().optional(),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  age: z.number().min(18).optional()
}).refine(data => Object.keys(data).length > 0, {
  message: 'At least one field must be provided'
});

export const GetUsersQuerySchema = z.object({
  page: z.string().transform(val => parseInt(val)).refine(val => val > 0).optional(),
  limit: z.string().transform(val => parseInt(val)).refine(val => val > 0 && val <= 100).optional(),
  search: z.string().optional()
});

export const UserParamsSchema = z.object({
  id: z.string().uuid('Invalid user ID format')
});

// Type exports for use in routes
export type CreateUserData = z.infer<typeof CreateUserSchema>;
export type UpdateUserData = z.infer<typeof UpdateUserSchema>;
export type GetUsersQuery = z.infer<typeof GetUsersQuerySchema>;
export type UserParams = z.infer<typeof UserParamsSchema>;
```

```typescript
// foundations/middleware/stacks.ts
export const createCommonMiddleware = (logger: Logger) => composeMiddleware([
  createErrorMiddleware(logger),
  createLoggingMiddleware(logger),
  createCorsMiddleware()
]);

export const createApiMiddleware = (logger: Logger) => composeMiddleware([
  createErrorMiddleware(logger),
  createLoggingMiddleware(logger),
  createCorsMiddleware(),
  createRateLimitMiddleware(1000) // Higher limit for API
]);

export const createPublicMiddleware = (logger: Logger) => composeMiddleware([
  createErrorMiddleware(logger),
  createCorsMiddleware(),
  createRateLimitMiddleware(100) // Lower limit for public
]);
```

---

## Usage Examples

### Setup with Fastify Logger

```typescript
// apps/user-service/src/middleware-setup.ts
import { FastifyInstance } from 'fastify';

export const setupMiddleware = (app: FastifyInstance) => {
  // Use Fastify's built-in logger
  const logger = app.log;
  
  return {
    withPublic: createPublicMiddleware(logger),
    withApi: createApiMiddleware(logger),
    withCommon: createCommonMiddleware(logger)
  };
};
```

### Clean Route Classes (Using Schema Validation Middleware)

```typescript
// routes/user/create-user-route.ts
import { getValidated, CreateUserData } from '../schemas';

export class CreateUserRoute {
  constructor(
    private createUserCommand: CreateUserCommand,
    private logger: Logger
  ) {}

  async handle(context: UnifiedHttpContext): Promise<void> {
    const { method, url, ip } = context.request;
    
    this.logger.info('Creating user', { 
      method, url, ip,
      userAgent: context.request.headers['user-agent']
    });

    // Get validated data from middleware (no manual validation needed!)
    const userData = getValidated<CreateUserData>(context, 'body');
    
    try {
      const result = await this.createUserCommand.execute(userData);
      
      this.logger.info('User created successfully', { 
        method, url, 
        userId: result.id,
        email: userData.email
      });
      
      sendResponse(context, result, 201);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      
      this.logger.error('User creation failed', { 
        method, url, ip,
        email: userData.email,
        error: message
      });
      
      throw error;
    }
  }
}
```

```typescript
// routes/user/get-users-route.ts  
import { getValidated, GetUsersQuery } from '../schemas';

export class GetUsersRoute {
  constructor(
    private getUsersQuery: GetUsersQuery,
    private logger: Logger
  ) {}

  async handle(context: UnifiedHttpContext): Promise<void> {
    const { method, url, ip } = context.request;
    
    this.logger.info('Getting users', { method, url, ip });

    // Get validated query parameters from middleware
    const queryParams = getValidated<GetUsersQuery>(context, 'query');
    
    try {
      const result = await this.getUsersQuery.execute(queryParams);
      
      this.logger.info('Users retrieved successfully', { 
        method, url, 
        count: result.length,
        page: queryParams.page,
        limit: queryParams.limit
      });
      
      sendResponse(context, result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      
      this.logger.error('Get users failed', { 
        method, url, ip,
        error: message,
        query: queryParams
      });
      
      throw error;
    }
  }
}
```

```typescript
// routes/user/update-user-route.ts
import { getValidated, UpdateUserData, UserParams } from '../schemas';

export class UpdateUserRoute {
  constructor(
    private updateUserCommand: UpdateUserCommand,
    private logger: Logger
  ) {}

  async handle(context: UnifiedHttpContext): Promise<void> {
    const { method, url, ip } = context.request;
    
    // Get validated data from middleware
    const userData = getValidated<UpdateUserData>(context, 'body');
    const params = getValidated<UserParams>(context, 'params');
    
    this.logger.info('Updating user', { 
      method, url, ip, 
      userId: params.id,
      userAgent: context.request.headers['user-agent']
    });
    
    try {
      const result = await this.updateUserCommand.execute({ 
        id: params.id, 
        ...userData 
      });
      
      this.logger.info('User updated successfully', { 
        method, url, 
        userId: params.id,
        updatedFields: Object.keys(userData)
      });
      
      sendResponse(context, result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      
      this.logger.error('User update failed', { 
        method, url, ip, 
        userId: params.id,
        error: message
      });
      
      throw error;
    }
  }
}
```

```typescript
// routes/user/delete-user-route.ts
import { getValidated, UserParams } from '../schemas';

export class DeleteUserRoute {
  constructor(
    private deleteUserCommand: DeleteUserCommand,
    private logger: Logger
  ) {}

  async handle(context: UnifiedHttpContext): Promise<void> {
    const { method, url, ip } = context.request;
    
    // Get validated params from middleware
    const params = getValidated<UserParams>(context, 'params');
    
    this.logger.warn('Deleting user - ADMIN ACTION', { 
      method, url, ip, 
      userId: params.id,
      userAgent: context.request.headers['user-agent']
    });

    try {
      await this.deleteUserCommand.execute({ id: params.id });
      
      this.logger.warn('User deleted successfully', { 
        method, url, 
        userId: params.id
      });
      
      sendResponse(context, { success: true }, 204);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      
      this.logger.error('User deletion failed', { 
        method, url, ip, 
        userId: params.id,
        error: message
      });
      
      throw error;
    }
  }
}
```

### HTTP Route Handlers with Schema Validation Middleware

```typescript
// apps/user-service/src/routes/user-handlers.ts
import { UnifiedHttpContext } from '@inh-lib/common';
import { 
  CreateUserRoute, 
  GetUsersRoute, 
  UpdateUserRoute, 
  DeleteUserRoute 
} from '../../../routes/user';
import {
  CreateUserSchema,
  GetUsersQuerySchema,
  UpdateUserSchema,
  UserParamsSchema
} from '../../../routes/user/schemas';
import { 
  createValidationMiddleware,
  createErrorMiddleware,
  createLoggingMiddleware,
  createCorsMiddleware,
  createRateLimitMiddleware,
  createCacheMiddleware,
  composeMiddleware
} from '../../../foundations/middleware';

export const createUserHandlers = (
  routes: {
    createUser: CreateUserRoute;
    getUsers: GetUsersRoute;
    updateUser: UpdateUserRoute;
    deleteUser: DeleteUserRoute;
  },
  logger: Logger
) => ({
  
  // Public route with body validation
  createUser: composeMiddleware([
    createErrorMiddleware(logger),
    createCorsMiddleware(logger),
    createRateLimitMiddleware(logger, 100),
    createValidationMiddleware(logger, { 
      body: CreateUserSchema 
    }) // Validate request body automatically
  ])(
    async (context: UnifiedHttpContext) => {
      await routes.createUser.handle(context);
    }
  ),

  // Public route with query validation and caching
  getUsers: composeMiddleware([
    createErrorMiddleware(logger),
    createCorsMiddleware(logger),
    createValidationMiddleware(logger, { 
      query: GetUsersQuerySchema 
    }), // Validate query parameters
    createCacheMiddleware(logger, { ttl: 300 }), // 5 minutes cache
    createRateLimitMiddleware(logger, 200) // Higher limit for read operations
  ])(
    async (context: UnifiedHttpContext) => {
      await routes.getUsers.handle(context);
    }
  ),

  // Protected route with body and params validation
  updateUser: composeMiddleware([
    createErrorMiddleware(logger),
    createLoggingMiddleware(logger),
    createCorsMiddleware(logger),
    createValidationMiddleware(logger, { 
      body: UpdateUserSchema,
      params: UserParamsSchema 
    }), // Validate both body and params
    createRateLimitMiddleware(logger, 50),
    async (context, next) => {
      // Authentication middleware
      const token = context.request.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        logger.warn('Authentication failed - no token', {
          url: context.request.url,
          ip: context.request.ip
        });
        context.response.status(401).json({ error: 'Authentication required' });
        return;
      }
      
      logger.debug('Authentication passed', {
        url: context.request.url,
        ip: context.request.ip
      });
      
      await next();
    }
  ])(
    async (context: UnifiedHttpContext) => {
      await routes.updateUser.handle(context);
    }
  ),

  // Admin only route with params validation
  deleteUser: composeMiddleware([
    createErrorMiddleware(logger),
    createLoggingMiddleware(logger),
    createCorsMiddleware(logger, 'https://admin.yourdomain.com'),
    createValidationMiddleware(logger, { 
      params: UserParamsSchema 
    }), // Validate params (user ID)
    createRateLimitMiddleware(logger, 10),
    async (context, next) => {
      // Admin authentication middleware
      const token = context.request.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        logger.error('Admin authentication failed - no token', {
          url: context.request.url,
          ip: context.request.ip,
          userAgent: context.request.headers['user-agent']
        });
        context.response.status(401).json({ error: 'Admin authentication required' });
        return;
      }
      
      logger.info('Admin authentication passed', {
        url: context.request.url,
        ip: context.request.ip
      });
      
      await next();
    },
    async (context, next) => {
      // Additional audit logging for admin actions
      logger.warn('ADMIN ACTION: User deletion attempt', {
        url: context.request.url,
        ip: context.request.ip,
        userAgent: context.request.headers['user-agent'],
        userId: context.request.params.id
      });
      await next();
    }
  ])(
    async (context: UnifiedHttpContext) => {
      await routes.deleteUser.handle(context);
    }
  )
  
});

// Alternative: Reusable validation middleware combinations
export const createValidationStacks = (logger: Logger) => ({
  
  userCreation: composeMiddleware([
    createErrorMiddleware(logger),
    createValidationMiddleware(logger, { body: CreateUserSchema }),
    createCorsMiddleware(logger),
    createRateLimitMiddleware(logger, 100)
  ]),

  userQuery: composeMiddleware([
    createErrorMiddleware(logger),
    createValidationMiddleware(logger, { query: GetUsersQuerySchema }),
    createCorsMiddleware(logger),
    createCacheMiddleware(logger, { ttl: 300 })
  ]),

  userUpdate: composeMiddleware([
    createErrorMiddleware(logger),
    createLoggingMiddleware(logger),
    createValidationMiddleware(logger, { 
      body: UpdateUserSchema, 
      params: UserParamsSchema 
    }),
    createRateLimitMiddleware(logger, 50)
  ]),

  adminAction: composeMiddleware([
    createErrorMiddleware(logger),
    createLoggingMiddleware(logger),
    createValidationMiddleware(logger, { params: UserParamsSchema }),
    createRateLimitMiddleware(logger, 10)
  ])

});

// Usage with validation stacks
export const createSimpleUserHandlers = (
  routes: any,
  logger: Logger
) => {
  const stacks = createValidationStacks(logger);
  
  return {
    createUser: stacks.userCreation(routes.createUser.handle.bind(routes.createUser)),
    getUsers: stacks.userQuery(routes.getUsers.handle.bind(routes.getUsers)),
    updateUser: stacks.userUpdate(routes.updateUser.handle.bind(routes.updateUser)),
    deleteUser: stacks.adminAction(routes.deleteUser.handle.bind(routes.deleteUser))
  };
};
```

### Framework Integration

```typescript
// apps/user-service/src/main.ts
import Fastify from 'fastify';
import { createFastifyContext } from '@inh-lib/unified-fastify-adapter';
import { setupMiddleware } from './middleware-setup';
import { 
  CreateUserRoute, 
  GetUsersRoute, 
  UpdateUserRoute, 
  DeleteUserRoute 
} from '../../../routes/user';
import { createUserHandlers } from './routes/user-handlers';
import { getContainer } from './di-container';

async function startServer() {
  const app = Fastify({ 
    logger: {
      level: 'info',
      prettyPrint: process.env.NODE_ENV === 'development'
    }
  });

  // Get logger for all middleware
  const logger = app.log;
  
  // Setup individual route classes with dependencies
  const container = getContainer();
  const routes = {
    createUser: new CreateUserRoute(
      container.get('createUserCommand'),
      logger
    ),
    getUsers: new GetUsersRoute(
      container.get('getUsersQuery'),
      logger
    ),
    updateUser: new UpdateUserRoute(
      container.get('updateUserCommand'),
      logger
    ),
    deleteUser: new DeleteUserRoute(
      container.get('deleteUserCommand'),
      logger
    )
  };
  
  // Create HTTP handlers with logger for all middleware
  const userHandlers = createUserHandlers(routes, logger);

  // Register routes with different middleware stacks
  app.post('/users', async (request, reply) => {
    const context = createFastifyContext(request, reply);
    await userHandlers.createUser(context); // Public middleware + validation
  });

  app.get('/users', async (request, reply) => {
    const context = createFastifyContext(request, reply);
    await userHandlers.getUsers(context); // Public + Caching + Validation middleware
  });

  app.put('/users/:id', async (request, reply) => {
    const context = createFastifyContext(request, reply);
    await userHandlers.updateUser(context); // Auth + Validation middleware
  });

  app.delete('/users/:id', async (request, reply) => {
    const context = createFastifyContext(request, reply);
    await userHandlers.deleteUser(context); // Admin + Audit + Validation middleware
  });

  await app.listen({ port: 3000 });
  app.log.info('Server started on http://localhost:3000');
}

startServer().catch(console.error);
```

---

## Testing

### Testing Schema Validation Middleware

```typescript
// __tests__/middleware/validation.test.ts
import { createValidationMiddleware, getValidated } from '../../foundations/middleware/validation';
import { z } from 'zod';

describe('Schema Validation Middleware', () => {
  const TestBodySchema = z.object({
    email: z.string().email(),
    name: z.string().min(1)
  });

  const TestQuerySchema = z.object({
    page: z.string().transform(val => parseInt(val))
  });

  const TestParamsSchema = z.object({
    id: z.string().uuid()
  });

  it('should validate request body successfully', async () => {
    const middleware = createValidationMiddleware({
      body: TestBodySchema
    });

    const context = {
      request: {
        body: { email: 'test@example.com', name: 'John' },
        query: {},
        params: {}
      },
      response: {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      }
    } as any;

    const next = jest.fn();
    await middleware(context, next);

    expect(next).toHaveBeenCalled();
    expect(context.validated?.body).toEqual({
      email: 'test@example.com',
      name: 'John'
    });
  });

  it('should return validation error for invalid body', async () => {
    const middleware = createValidationMiddleware({
      body: TestBodySchema
    });

    const context = {
      request: {
        body: { email: 'invalid-email', name: '' },
        query: {},
        params: {}
      },
      response: {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      }
    } as any;

    const next = jest.fn();
    await middleware(context, next);

    expect(next).not.toHaveBeenCalled();
    expect(context.response.status).toHaveBeenCalledWith(400);
    expect(context.response.json).toHaveBeenCalledWith({
      error: 'Validation failed',
      field: 'body',
      details: expect.any(Array)
    });
  });

  it('should validate multiple fields', async () => {
    const middleware = createValidationMiddleware({
      body: TestBodySchema,
      query: TestQuerySchema,
      params: TestParamsSchema
    });

    const context = {
      request: {
        body: { email: 'test@example.com', name: 'John' },
        query: { page: '1' },
        params: { id: '123e4567-e89b-12d3-a456-426614174000' }
      },
      response: {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      }
    } as any;

    const next = jest.fn();
    await middleware(context, next);

    expect(next).toHaveBeenCalled();
    expect(context.validated?.body).toEqual({
      email: 'test@example.com',
      name: 'John'
    });
    expect(context.validated?.query).toEqual({ page: 1 });
    expect(context.validated?.params).toEqual({
      id: '123e4567-e89b-12d3-a456-426614174000'
    });
  });

  it('should handle getValidated helper', () => {
    const context = {
      validated: {
        body: { email: 'test@example.com', name: 'John' }
      }
    } as any;

    const data = getValidated<{ email: string; name: string }>(context, 'body');
    expect(data).toEqual({ email: 'test@example.com', name: 'John' });
  });

  it('should throw error if validated data not found', () => {
    const context = { validated: {} } as any;

    expect(() => {
      getValidated(context, 'body');
    }).toThrow('Validated body not found');
  });
});
```

### Testing Route Classes with Schema Validation

```typescript
// __tests__/routes/create-user-route.test.ts
describe('CreateUserRoute with Schema Validation', () => {
  let createUserRoute: CreateUserRoute;
  let mockCreateUserCommand: jest.Mocked<CreateUserCommand>;
  let mockLogger: jest.Mocked<Logger>;
  let mockContext: UnifiedHttpContext;

  beforeEach(() => {
    mockCreateUserCommand = { execute: jest.fn() };
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn()
    };
    
    createUserRoute = new CreateUserRoute(mockCreateUserCommand, mockLogger);
    
    // Mock context with validated data (from validation middleware)
    mockContext = {
      request: {
        method: 'POST',
        url: '/users',
        headers: { 'user-agent': 'test-agent' },
        params: {},
        query: {},
        ip: '127.0.0.1'
      },
      response: {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        send: jest.fn(),
        header: jest.fn().mockReturnThis(),
        redirect: jest.fn()
      },
      // Pre-validated data from middleware
      validated: {
        body: {
          email: 'test@example.com',
          firstName: 'John',
          lastName: 'Doe'
        }
      }
    } as any;
  });

  it('should create user using validated data', async () => {
    const expectedResult = {
      id: '123',
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      createdAt: new Date()
    };

    mockCreateUserCommand.execute.mockResolvedValue(expectedResult);

    await createUserRoute.handle(mockContext);

    // Verify command was called with validated data
    expect(mockCreateUserCommand.execute).toHaveBeenCalledWith({
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe'
    });

    // Verify logging
    expect(mockLogger.info).toHaveBeenCalledWith('Creating user', {
      method: 'POST',
      url: '/users',
      ip: '127.0.0.1',
      userAgent: 'test-agent'
    });

    expect(mockLogger.info).toHaveBeenCalledWith('User created successfully', {
      method: 'POST',
      url: '/users',
      userId: '123',
      email: 'test@example.com'
    });
  });

  it('should throw error if validated data is missing', async () => {
    // Context without validated data
    mockContext.validated = undefined;

    await expect(createUserRoute.handle(mockContext)).rejects.toThrow('Validated body not found');
  });
});
```

### Testing Middleware

```typescript
// __tests__/middleware/logging.test.ts
describe('Logging Middleware', () => {
  const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should log requests with logger', async () => {
    const middleware = createLoggingMiddleware(mockLogger);
    
    const context = {
      request: { method: 'GET', url: '/test', ip: '127.0.0.1', headers: {} },
      response: {}
    } as UnifiedHttpContext;
    
    const next = jest.fn();
    await middleware(context, next);
    
    expect(mockLogger.info).toHaveBeenCalledWith('→ GET /test', expect.any(Object));
    expect(mockLogger.info).toHaveBeenCalledWith('← GET /test 200 (0ms)', expect.any(Object));
    expect(next).toHaveBeenCalled();
  });

  it('should log errors with logger', async () => {
    const middleware = createLoggingMiddleware(mockLogger);
    
    const context = {
      request: { method: 'GET', url: '/test', ip: '127.0.0.1', headers: {} },
      response: {}
    } as UnifiedHttpContext;
    
    const error = new Error('Test error');
    const next = jest.fn().mockRejectedValue(error);
    
    await expect(middleware(context, next)).rejects.toThrow('Test error');
    
    expect(mockLogger.error).toHaveBeenCalledWith(
      '← GET /test 500 (0ms)', 
      expect.objectContaining({
        error: 'Test error'
      })
    );
  });
});

// __tests__/middleware/cors.test.ts
describe('CORS Middleware', () => {
  const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should log CORS preflight requests', async () => {
    const middleware = createCorsMiddleware(mockLogger, '*');
    
    const context = {
      request: { 
        method: 'OPTIONS', 
        url: '/test', 
        headers: { origin: 'https://example.com' } 
      },
      response: {
        header: jest.fn(),
        status: jest.fn().mockReturnThis(),
        send: jest.fn()
      }
    } as any;
    
    const next = jest.fn();
    await middleware(context, next);
    
    expect(mockLogger.info).toHaveBeenCalledWith('CORS preflight request handled', {
      origin: 'https://example.com',
      url: '/test'
    });
    expect(next).not.toHaveBeenCalled(); // OPTIONS should not call next
  });

  it('should log CORS violations', async () => {
    const middleware = createCorsMiddleware(mockLogger, 'https://allowed.com');
    
    const context = {
      request: { 
        method: 'GET', 
        url: '/test', 
        headers: { origin: 'https://evil.com' },
        ip: '192.168.1.1'
      },
      response: {
        header: jest.fn()
      }
    } as any;
    
    const next = jest.fn();
    await middleware(context, next);
    
    expect(mockLogger.warn).toHaveBeenCalledWith('CORS violation detected', {
      requestOrigin: 'https://evil.com',
      allowedOrigins: 'https://allowed.com',
      url: '/test',
      ip: '192.168.1.1'
    });
  });
});

// __tests__/middleware/rate-limit.test.ts
describe('Rate Limit Middleware', () => {
  const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should log rate limit violations', async () => {
    const middleware = createRateLimitMiddleware(mockLogger, 2, 60000); // 2 requests per minute
    
    const context = {
      request: { 
        method: 'GET', 
        url: '/test', 
        ip: '127.0.0.1',
        headers: { 'user-agent': 'test-bot' }
      },
      response: {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      }
    } as any;
    
    const next = jest.fn();
    
    // First two requests should pass
    await middleware(context, next);
    await middleware(context, next);
    
    // Third request should be rate limited
    await middleware(context, next);
    
    expect(mockLogger.error).toHaveBeenCalledWith('Rate limit exceeded', expect.objectContaining({
      ip: '127.0.0.1',
      count: 2,
      limit: 2
    }));
  });

  it('should log rate limit warnings when approaching limit', async () => {
    const middleware = createRateLimitMiddleware(mockLogger, 5, 60000); // 5 requests per minute
    
    const context = {
      request: { 
        method: 'GET', 
        url: '/test', 
        ip: '127.0.0.1',
        headers: { 'user-agent': 'test-bot' }
      },
      response: { status: jest.fn(), json: jest.fn() }
    } as any;
    
    const next = jest.fn();
    
    // Make 4 requests (80% of limit)
    for (let i = 0; i < 4; i++) {
      await middleware(context, next);
    }
    
    expect(mockLogger.warn).toHaveBeenCalledWith('Rate limit approaching', expect.objectContaining({
      count: 4,
      limit: 5
    }));
  });
});
```

---

## ✅ Benefits of Logger in Every Middleware

### 🔍 **Complete Observability:**
- **CORS Middleware**: Log preflight requests, violations, and origin tracking
- **Rate Limiting**: Track approaching limits, violations, and IP patterns
- **Validation**: Monitor validation failures, schema mismatches, and attack patterns
- **Caching**: Cache hit/miss ratios, performance metrics, and expiration tracking
- **Authentication**: Failed login attempts, token validation issues, and security events

### 📊 **Comprehensive Logging Examples:**

```typescript
// CORS Logging
logger.warn('CORS violation detected', {
  requestOrigin: 'https://evil.com',
  allowedOrigins: 'https://allowed.com',
  url: '/api/users',
  ip: '192.168.1.100'
});

// Rate Limiting Logging  
logger.error('Rate limit exceeded', {
  ip: '127.0.0.1',
  count: 150,
  limit: 100,
  url: '/api/users',
  resetTime: '2025-01-15T10:30:00Z'
});

// Validation Logging
logger.warn('Body validation failed', {
  method: 'POST',
  url: '/api/users',
  errors: [
    { path: 'email', message: 'Invalid email format' },
    { path: 'age', message: 'Must be at least 18' }
  ],
  receivedData: { email: 'invalid', age: 15 }
});

// Cache Logging
logger.info('Cache hit - returning cached data', {
  method: 'GET',
  url: '/api/users',
  key: 'GET:/api/users?page=1',
  timeLeft: 180,
  etag: '"abc123"'
});
```

### 🛡️ **Security Benefits:**
```typescript
// Track attack patterns
logger.error('Multiple validation failures from same IP', {
  ip: '192.168.1.100',
  failureCount: 25,
  timeWindow: '5 minutes',
  patterns: ['SQL injection attempts', 'XSS payloads']
});

// Monitor suspicious behavior
logger.warn('Rapid rate limit violations', {
  ip: '10.0.0.50',
  violationCount: 10,
  timeWindow: '1 minute',
  suspiciousPatterns: true
});
```

### 📈 **Performance Monitoring:**
```typescript
// Cache performance
logger.info('Cache performance metrics', {
  hitRate: '85%',
  totalRequests: 1000,
  cacheHits: 850,
  cacheMisses: 150,
  averageResponseTime: '12ms'
});

// Rate limiting patterns
logger.info('Rate limiting statistics', {
  period: 'last hour',
  totalRequests: 5000,
  limitedRequests: 125,
  topOffendingIPs: ['192.168.1.100', '10.0.0.50']
});
```

### 🔧 **Production Debugging:**
```typescript
// Correlation IDs across middleware
const correlationId = context.request.headers['x-correlation-id'];

logger.info('Request flow', {
  correlationId,
  middleware: 'validation',
  stage: 'body-validation',
  schema: 'CreateUserSchema',
  success: true
});

logger.info('Request flow', {
  correlationId,
  middleware: 'rate-limiting',
  stage: 'ip-check',
  remaining: 75,
  success: true
});
```

### 📊 **Metrics Collection:**
```typescript
// Business intelligence data
logger.info('API usage patterns', {
  endpoint: '/api/users',
  method: 'POST',
  userAgent: 'mobile-app-v2.1',
  region: 'Asia/Bangkok',
  responseTime: '45ms',
  validationPassed: true,
  cacheHit: false
});
```

---

## ✅ Benefits of Schema Validation Middleware

### 🔄 **DRY Principle for Validation:**
- Write validation schemas once, reuse everywhere
- No more `validateRequestBodyOrError` in every route
- Consistent validation error handling across all routes

### 🛡️ **Type Safety & Runtime Safety:**
```typescript
// Before: Manual validation in every route
const userData = validateRequestBodyOrError(context, CreateUserSchema);
if (!userData) return; // Error handling repeated everywhere

// After: Automatic validation in middleware
const userData = getValidated<CreateUserData>(context, 'body'); // Type-safe & guaranteed valid
```

### 🧪 **Simplified Testing:**
```typescript
// Test routes with pre-validated data
mockContext.validated = {
  body: { email: 'test@example.com', firstName: 'John' }
};
// No need to test validation logic in route tests
```

### 📊 **Better Error Consistency:**
```typescript
// Consistent validation error format across all routes
{
  error: 'Validation failed',
  field: 'body', // or 'query', 'params'
  details: [...] // Zod error details
}
```

### ⚡ **Performance Benefits:**
- Validation happens once in middleware, not repeated in routes
- Early validation prevents unnecessary business logic execution
- Validated data is cached in context for route handler use

### 🔧 **Flexible Validation:**
```typescript
// Validate different combinations per route
createValidationMiddleware(logger, { body: CreateUserSchema })
createValidationMiddleware(logger, { query: GetUsersQuerySchema })
createValidationMiddleware(logger, { 
  body: UpdateUserSchema, 
  params: UserParamsSchema 
})
```

---

## ✅ Benefits of Individual Route Classes

### 🎯 Custom Middleware per Route

- **CreateUser**: Public middleware + body validation
- **GetUsers**: Caching + query validation (performance)  
- **UpdateUser**: Authentication + body/params validation (security)
- **DeleteUser**: Admin auth + params validation + audit logging

### 🧩 Single Responsibility

```typescript
// Each class has one clear purpose
class CreateUserRoute { /* Only handles user creation + validation */ }
class DeleteUserRoute { /* Only handles user deletion + validation */ }
```

### 🧪 Superior Testing

```typescript
// Test individual routes with pre-validated data
describe('CreateUserRoute', () => {
  // Focus only on business logic, validation is handled by middleware
});

describe('ValidationMiddleware', () => {
  // Focus only on validation logic
});
```

### 🔧 Flexible Composition

```typescript
// Mix and match validation + other middleware per route
createUser: composeMiddleware([
  createValidationMiddleware({ body: CreateUserSchema }),
  createCorsMiddleware(),
  createRateLimitMiddleware(100)
])(route.handle)

deleteUser: composeMiddleware([
  createValidationMiddleware({ params: UserParamsSchema }),
  createAuthMiddleware(),
  createAuditMiddleware(),
  createRateLimitMiddleware(10)
])(route.handle)
```

### 📊 Schema-Driven Development

```typescript
// Schemas define the contract
export const CreateUserSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1)
});

// Types are automatically inferred
export type CreateUserData = z.infer<typeof CreateUserSchema>;

// Validation is automatic
createValidationMiddleware({ body: CreateUserSchema })

// Routes get type-safe validated data
const userData = getValidated<CreateUserData>(context, 'body');
```

### ⚡ Zero Boilerplate Validation

```typescript
// Before: Validation boilerplate in every route
async handle(context: UnifiedHttpContext) {
  const userData = validateRequestBodyOrError(context, CreateUserSchema);
  if (!userData) {
    this.logger.warn('Validation failed');
    return;
  }
  // ... business logic
}

// After: Clean business logic only
async handle(context: UnifiedHttpContext) {
  const userData = getValidated<CreateUserData>(context, 'body');
  // ... business logic (validation guaranteed by middleware)
}
```

### 🔒 Security Levels with Validation

- **Public Routes**: Basic validation + CORS + rate limiting
- **User Routes**: Authentication + comprehensive validation
- **Admin Routes**: Admin auth + strict validation + audit

### 🏗️ Easy Schema Evolution

```typescript
// Update schema in one place
export const CreateUserSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  age: z.number().min(18).optional() // Add new field
});

// All routes using this schema automatically get new validation
// No code changes needed in route handlers
```

## 🎯 Architecture Comparison

| Aspect | Manual Validation | Schema Validation Middleware |
|--------|------------------|------------------------------|
| **Code Duplication** | High (validation in every route) | Zero (validation in middleware) |
| **Type Safety** | Manual type casting | Automatic type inference |
| **Error Consistency** | Varies per route | Consistent format |
| **Testing** | Must test validation everywhere | Test validation once |
| **Maintenance** | Update validation in multiple places | Update schema once |
| **Performance** | Validation overhead per route | Optimized middleware validation |

## 🚀 Real-World Example

```typescript
// E-commerce API with comprehensive validation
createProduct: composeMiddleware([
  createValidationMiddleware({ 
    body: CreateProductSchema,
    query: PaginationSchema
  }),
  createAuthMiddleware(),
  createRateLimitMiddleware(50)
])(route.handle)

updateProduct: composeMiddleware([
  createValidationMiddleware({ 
    body: UpdateProductSchema,
    params: ProductParamsSchema
  }),
  createVendorAuthMiddleware(),
  createAuditMiddleware()
])(route.handle)
```

This schema validation middleware approach eliminates validation boilerplate while maintaining maximum flexibility and type safety!

### Framework Independence Maintained

```typescript
// Same route classes work across frameworks
// Fastify
app.post('/users', async (req, reply) => {
  const context = createFastifyContext(req, reply);
  await createUserRoute.handle(context);
});

// Express  
app.post('/users', async (req, res) => {
  const context = createExpressContext(req, res);
  await createUserRoute.handle(context);
});

// Hono
app.post('/users', async (c) => {
  const context = createHonoContext(c);
  await createUserRoute.handle(context);
});
```

---

## Benefits of Logger Injection

### 🔧 Flexibility

- Use any logger (Fastify, Winston, Pino, etc.)
- Different log levels per environment
- Custom log formatting and destinations

### 🧪 Better Testing

- Easy to mock logger in tests
- Can verify log calls
- No console.log pollution in tests

### 📈 Production Ready

- Structured logging with metadata
- Proper log levels (info, error, warn, debug)
- Integration with existing logging infrastructure

### ⚡ Framework Integration

- Works seamlessly with Fastify's built-in logger
- Leverages existing logging configuration
- Consistent logging across the application

### 🚀 Key Changes

**Before (Hardcoded):**
```typescript
console.log(`→ ${method} ${url}`);
console.error('Request error:', error);
```

**After (Injected):**
```typescript
const middleware = createLoggingMiddleware(app.log); // Use Fastify logger
logger.info(`→ ${method} ${url}`, { method, url, ip });
logger.error('Request error', { url, method, error });
```

**Fastify Integration:**
```typescript
const app = Fastify({ logger: true });
const middleware = setupMiddleware(app); // Uses app.log automatically
```

This approach gives you professional logging while keeping the code simple and testable!