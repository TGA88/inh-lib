# UnifiedRouteManager Part 1: Foundation & Core

> 🏗️ **Foundation Layer** - Building the core infrastructure for enterprise route management

## 📖 **Part 1 Overview**

**Goal**: สร้าง functional route management system ที่ทำงานได้พื้นฐาน

**Learning Outcome**: มี route system ที่สามารถ register routes, handle requests, validate input, และจัดการ middleware ได้

**Time Investment**: 1-2 สัปดาห์ (2-3 ชม. อ่าน + 4-6 ชม. ลงมือทำ)

---

## 🎯 **Part 1 Contents**

1. **🚀 Route Management** - Core route discovery และ registration
2. **🔌 Framework Integration** - Multi-framework support 
3. **🔗 Middleware System** - Functional middleware composition
4. **🛡️ Validation Layer** - Type-safe request validation
5. **🏗️ Dependency Management** - Domain-specific dependency injection

---

## 1. 🚀 **Route Management**

### **Core Types & Interfaces**

```typescript
// foundations/route-management/types.ts
import { UnifiedHttpContext } from '../unified-context';
import { ZodSchema } from 'zod';

export interface RouteHandler {
  (context: UnifiedHttpContext): Promise<void>;
}

export interface RouteMetadata {
  readonly method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  readonly path: string;
  readonly tags?: readonly string[];
  readonly summary?: string;
  readonly description?: string;
}

export interface RouteDefinition {
  readonly metadata: RouteMetadata;
  readonly handler: RouteHandler;
  readonly id: string;
}

export interface ValidationSchemas {
  readonly params?: ZodSchema;
  readonly body?: ZodSchema;
  readonly query?: ZodSchema;
}

export interface ValidatedData {
  readonly params: unknown;
  readonly body: unknown;
  readonly query: unknown;
}
```

### **Route Factory**

```typescript
// foundations/route-management/route-factory.ts
export const createRoute = (
  metadata: RouteMetadata,
  handler: RouteHandler
): RouteDefinition => ({
  metadata,
  handler,
  id: generateRouteId(metadata)
});

export const createValidatedRoute = (
  metadata: RouteMetadata,
  schemas: ValidationSchemas,
  handler: (
    validated: ValidatedData,
    context: UnifiedHttpContext
  ) => Promise<void>
): RouteDefinition => {
  
  const validatedHandler: RouteHandler = async (context) => {
    // Validate params
    let validatedParams: unknown = context.request.params;
    if (schemas.params) {
      const result = schemas.params.safeParse(context.request.params);
      if (!result.success) {
        context.response.status(400);
        context.response.json({
          error: 'Invalid parameters',
          details: result.error.errors
        });
        return;
      }
      validatedParams = result.data;
    }

    // Validate body
    let validatedBody: unknown = context.request.body;
    if (schemas.body) {
      const result = schemas.body.safeParse(context.request.body);
      if (!result.success) {
        context.response.status(400);
        context.response.json({
          error: 'Invalid request body',
          details: result.error.errors
        });
        return;
      }
      validatedBody = result.data;
    }

    // Validate query
    let validatedQuery: unknown = context.request.query;
    if (schemas.query) {
      const result = schemas.query.safeParse(context.request.query);
      if (!result.success) {
        context.response.status(400);
        context.response.json({
          error: 'Invalid query parameters',
          details: result.error.errors
        });
        return;
      }
      validatedQuery = result.data;
    }

    // Execute handler with validated data
    await handler(
      {
        params: validatedParams,
        body: validatedBody,
        query: validatedQuery
      },
      context
    );
  };

  return createRoute(metadata, validatedHandler);
};

const generateRouteId = (metadata: RouteMetadata): string => {
  return `${metadata.method}:${metadata.path}`;
};
```

### **Route Registry**

```typescript
// foundations/route-management/route-registry.ts
export interface RouteRegistry {
  register(route: RouteDefinition): void;
  getRoutes(): readonly RouteDefinition[];
  getRoute(id: string): RouteDefinition | undefined;
  getRoutesByTag(tag: string): readonly RouteDefinition[];
  clear(): void;
}

export const createRouteRegistry = (): RouteRegistry => {
  const routes = new Map<string, RouteDefinition>();

  return {
    register: (route: RouteDefinition): void => {
      if (routes.has(route.id)) {
        throw new Error(`Route already registered: ${route.id}`);
      }
      routes.set(route.id, route);
    },

    getRoutes: (): readonly RouteDefinition[] => {
      return Array.from(routes.values());
    },

    getRoute: (id: string): RouteDefinition | undefined => {
      return routes.get(id);
    },

    getRoutesByTag: (tag: string): readonly RouteDefinition[] => {
      return Array.from(routes.values()).filter(route =>
        route.metadata.tags?.includes(tag) ?? false
      );
    },

    clear: (): void => {
      routes.clear();
    }
  };
};
```

### **Route Discovery Service**

```typescript
// foundations/route-management/route-discovery.ts
export interface RouteDiscoveryService {
  discoverRoutes(patterns: readonly string[]): Promise<readonly RouteDefinition[]>;
}

export interface FileSystemService {
  findFiles(patterns: readonly string[]): Promise<readonly string[]>;
  loadModule(filePath: string): Promise<Record<string, unknown>>;
}

export const createRouteDiscoveryService = (
  fileSystem: FileSystemService
): RouteDiscoveryService => ({
  
  discoverRoutes: async (patterns: readonly string[]): Promise<readonly RouteDefinition[]> => {
    const files = await fileSystem.findFiles(patterns);
    const routes: RouteDefinition[] = [];

    for (const file of files) {
      try {
        const moduleExports = await fileSystem.loadModule(file);
        const discoveredRoutes = extractRouteDefinitions(moduleExports);
        routes.push(...discoveredRoutes);
      } catch (error) {
        console.warn(`Failed to load route file: ${file}`, error);
      }
    }

    return routes;
  }
});

const extractRouteDefinitions = (moduleExports: Record<string, unknown>): RouteDefinition[] => {
  const routes: RouteDefinition[] = [];

  for (const [key, value] of Object.entries(moduleExports)) {
    if (isRouteDefinition(value)) {
      routes.push(value);
    }
  }

  return routes;
};

const isRouteDefinition = (value: unknown): value is RouteDefinition => {
  return (
    typeof value === 'object' &&
    value !== null &&
    'metadata' in value &&
    'handler' in value &&
    'id' in value &&
    typeof (value as RouteDefinition).handler === 'function'
  );
};
```

---

## 2. 🔌 **Framework Integration**

### **Framework Adapter Interface**

```typescript
// foundations/framework-integration/adapter.ts
export interface FrameworkAdapter<TApp> {
  registerRoute(app: TApp, route: RouteDefinition): Promise<void>;
  createContext(request: unknown, response: unknown): UnifiedHttpContext;
  startServer(app: TApp, port: number): Promise<void>;
}

export interface FrameworkAdapterFactory {
  <TApp>(frameworkType: FrameworkType): FrameworkAdapter<TApp>;
}

export type FrameworkType = 'fastify' | 'express' | 'koa' | 'hono';
```

### **Fastify Adapter**

```typescript
// foundations/framework-integration/fastify-adapter.ts
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

export const createFastifyAdapter = (): FrameworkAdapter<FastifyInstance> => ({
  
  registerRoute: async (app: FastifyInstance, route: RouteDefinition): Promise<void> => {
    const { method, path } = route.metadata;
    
    app.route({
      method: method as any,
      url: path,
      handler: async (request: FastifyRequest, reply: FastifyReply) => {
        const context = createFastifyContext(request, reply);
        await route.handler(context);
      }
    });
  },

  createContext: (request: FastifyRequest, reply: FastifyReply): UnifiedHttpContext => {
    return createFastifyContext(request, reply);
  },

  startServer: async (app: FastifyInstance, port: number): Promise<void> => {
    await app.listen({ port });
  }
});

const createFastifyContext = (
  request: FastifyRequest,
  reply: FastifyReply
): UnifiedHttpContext => ({
  request: {
    body: request.body as Record<string, unknown>,
    params: request.params as Record<string, string>,
    query: request.query as Record<string, string | string[]>,
    headers: request.headers as Record<string, string>,
    method: request.method,
    url: request.url,
    ip: request.ip
  },
  response: {
    status: (code: number) => {
      reply.status(code);
      return reply as any;
    },
    json: <T>(data: T) => {
      reply.send(data);
    },
    send: (data: string) => {
      reply.send(data);
    },
    header: (name: string, value: string) => {
      reply.header(name, value);
      return reply as any;
    },
    redirect: (url: string) => {
      reply.redirect(url);
    }
  }
});
```

### **Hono Adapter**

```typescript
// foundations/framework-integration/hono-adapter.ts
import { Hono, Context } from 'hono';

export const createHonoAdapter = (): FrameworkAdapter<Hono> => ({
  
  registerRoute: async (app: Hono, route: RouteDefinition): Promise<void> => {
    const { method, path } = route.metadata;
    const honoMethod = method.toLowerCase() as keyof Hono;
    
    if (typeof app[honoMethod] === 'function') {
      (app[honoMethod] as Function)(path, async (c: Context) => {
        const context = createHonoContext(c);
        await route.handler(context);
      });
    }
  },

  createContext: (c: Context): UnifiedHttpContext => {
    return createHonoContext(c);
  },

  startServer: async (app: Hono, port: number): Promise<void> => {
    // Hono can run on different runtimes
    if (typeof Bun !== 'undefined') {
      // Bun runtime
      Bun.serve({
        port,
        fetch: app.fetch
      });
    } else if (typeof Deno !== 'undefined') {
      // Deno runtime
      Deno.serve({ port }, app.fetch);
    } else {
      // Node.js runtime with serve-static or similar
      const { serve } = await import('@hono/node-server');
      serve({
        fetch: app.fetch,
        port
      });
    }
  }
});

const createHonoContext = (c: Context): UnifiedHttpContext => ({
  request: {
    body: c.req.json ? await c.req.json() : {},
    params: c.req.param(),
    query: Object.fromEntries(new URL(c.req.url).searchParams.entries()),
    headers: Object.fromEntries(c.req.raw.headers.entries()),
    method: c.req.method,
    url: c.req.url,
    ip: c.env?.CF_CONNECTING_IP || c.req.header('x-forwarded-for') || 'unknown'
  },
  response: {
    status: (code: number) => {
      c.status(code);
      return c as any;
    },
    json: <T>(data: T) => {
      return c.json(data);
    },
    send: (data: string) => {
      return c.text(data);
    },
    header: (name: string, value: string) => {
      c.header(name, value);
      return c as any;
    },
    redirect: (url: string) => {
      return c.redirect(url);
    }
  }
});

// Type-safe Hono context creator for better DX
export const createTypedHonoContext = async (c: Context): Promise<UnifiedHttpContext> => {
  let body = {};
  
  // Handle different content types
  const contentType = c.req.header('content-type');
  if (contentType?.includes('application/json')) {
    try {
      body = await c.req.json();
    } catch {
      body = {};
    }
  } else if (contentType?.includes('application/x-www-form-urlencoded')) {
    const formData = await c.req.formData();
    body = Object.fromEntries(formData.entries());
  }

  return {
    request: {
      body,
      params: c.req.param(),
      query: Object.fromEntries(new URL(c.req.url).searchParams.entries()),
      headers: Object.fromEntries(c.req.raw.headers.entries()),
      method: c.req.method,
      url: c.req.url,
      ip: c.env?.CF_CONNECTING_IP || c.req.header('x-forwarded-for') || 'unknown'
    },
    response: {
      status: (code: number) => {
        c.status(code);
        return c as any;
      },
      json: <T>(data: T) => {
        return c.json(data);
      },
      send: (data: string) => {
        return c.text(data);
      },
      header: (name: string, value: string) => {
        c.header(name, value);
        return c as any;
      },
      redirect: (url: string) => {
        return c.redirect(url);
      }
    }
  };
};
```

### **Framework Factory**

```typescript
// foundations/framework-integration/framework-factory.ts
export const createFrameworkAdapter = <TApp>(
  frameworkType: FrameworkType
): FrameworkAdapter<TApp> => {
  switch (frameworkType) {
    case 'fastify':
      return createFastifyAdapter() as FrameworkAdapter<TApp>;
    case 'hono':
      return createHonoAdapter() as FrameworkAdapter<TApp>;
    case 'express':
      return createExpressAdapter() as FrameworkAdapter<TApp>;
    case 'koa':
      return createKoaAdapter() as FrameworkAdapter<TApp>;
    default:
      throw new Error(`Unsupported framework: ${frameworkType}`);
  }
};

// Framework detection helper
export const detectFramework = (app: unknown): FrameworkType => {
  if (app && typeof app === 'object') {
    // Detect Fastify
    if ('register' in app && 'listen' in app && 'route' in app) {
      return 'fastify';
    }
    
    // Detect Hono
    if ('route' in app && 'fetch' in app && 'get' in app && 'post' in app) {
      return 'hono';
    }
    
    // Detect Express
    if ('use' in app && 'listen' in app && 'get' in app && !('fetch' in app)) {
      return 'express';
    }
    
    // Detect Koa
    if ('use' in app && 'callback' in app && 'context' in app) {
      return 'koa';
    }
  }
  
  throw new Error('Unable to detect framework type');
};

// Multi-framework route registration helper
export const registerRouteWithAutoDetection = async <TApp>(
  app: TApp,
  route: RouteDefinition
): Promise<void> => {
  const frameworkType = detectFramework(app);
  const adapter = createFrameworkAdapter<TApp>(frameworkType);
  await adapter.registerRoute(app, route);
};
```

---

## 3. 🔗 **Middleware System**

### **Middleware Types**

```typescript
// foundations/middleware/types.ts
export interface MiddlewareHandler {
  (context: UnifiedHttpContext): Promise<boolean>; // return false to stop execution
}

export interface MiddlewareDefinition {
  readonly name: string;
  readonly handler: MiddlewareHandler;
  readonly priority: number; // Lower numbers run first
}

export interface MiddlewareRegistry {
  register(middleware: MiddlewareDefinition): void;
  get(name: string): MiddlewareHandler | undefined;
  getAll(): readonly MiddlewareDefinition[];
  compose(middlewares: readonly string[]): MiddlewareHandler;
}
```

### **Middleware Registry**

```typescript
// foundations/middleware/middleware-registry.ts
export const createMiddlewareRegistry = (): MiddlewareRegistry => {
  const middlewares = new Map<string, MiddlewareDefinition>();

  return {
    register: (middleware: MiddlewareDefinition): void => {
      middlewares.set(middleware.name, middleware);
    },

    get: (name: string): MiddlewareHandler | undefined => {
      return middlewares.get(name)?.handler;
    },

    getAll: (): readonly MiddlewareDefinition[] => {
      return Array.from(middlewares.values())
        .sort((a, b) => a.priority - b.priority);
    },

    compose: (middlewareNames: readonly string[]): MiddlewareHandler => {
      const handlers = middlewareNames
        .map(name => middlewares.get(name))
        .filter((middleware): middleware is MiddlewareDefinition => !!middleware)
        .sort((a, b) => a.priority - b.priority)
        .map(middleware => middleware.handler);

      return composeMiddlewares(handlers);
    }
  };
};

const composeMiddlewares = (handlers: readonly MiddlewareHandler[]): MiddlewareHandler => {
  return async (context: UnifiedHttpContext): Promise<boolean> => {
    for (const handler of handlers) {
      const shouldContinue = await handler(context);
      if (!shouldContinue) {
        return false; // Stop execution
      }
    }
    return true; // Continue to route handler
  };
};
```

### **Built-in Middlewares**

```typescript
// foundations/middleware/built-in.ts
export const createCorsMiddleware = (
  options: {
    readonly origin?: string | readonly string[];
    readonly methods?: readonly string[];
    readonly allowedHeaders?: readonly string[];
  } = {}
): MiddlewareDefinition => ({
  name: 'cors',
  priority: 10,
  handler: async (context: UnifiedHttpContext): Promise<boolean> => {
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
      return false; // Stop execution for OPTIONS
    }

    return true;
  }
});

export const createRequestLoggingMiddleware = (): MiddlewareDefinition => ({
  name: 'request-logging',
  priority: 5,
  handler: async (context: UnifiedHttpContext): Promise<boolean> => {
    const startTime = Date.now();
    
    console.log(`→ ${context.request.method} ${context.request.url}`, {
      ip: context.request.ip,
      userAgent: context.request.headers['user-agent']
    });

    // Add response hook
    const originalJson = context.response.json;
    context.response.json = function<T>(data: T) {
      const duration = Date.now() - startTime;
      console.log(`← ${context.request.method} ${context.request.url} (${duration}ms)`);
      return originalJson.call(this, data);
    };

    return true;
  }
});

export const createErrorHandlingMiddleware = (): MiddlewareDefinition => ({
  name: 'error-handling',
  priority: 1, // Run first
  handler: async (context: UnifiedHttpContext): Promise<boolean> => {
    try {
      return true; // Continue to next middleware/handler
    } catch (error) {
      console.error('Request error:', error);
      
      context.response.status(500);
      context.response.json({
        error: 'Internal server error',
        timestamp: new Date().toISOString()
      });
      
      return false; // Stop execution
    }
  }
});
```

### **Middleware Composition Helper**

```typescript
// foundations/middleware/composer.ts
export const withMiddleware = (
  route: RouteDefinition,
  middlewareNames: readonly string[],
  registry: MiddlewareRegistry
): RouteDefinition => {
  const composedMiddleware = registry.compose(middlewareNames);
  
  const enhancedHandler: RouteHandler = async (context) => {
    const shouldContinue = await composedMiddleware(context);
    if (shouldContinue) {
      await route.handler(context);
    }
  };

  return {
    ...route,
    handler: enhancedHandler
  };
};
```

---

## 4. 🛡️ **Validation Layer**

### **Schema Validators**

```typescript
// foundations/validation/schema-validator.ts
import { z, ZodSchema } from 'zod';

export interface ValidationResult<T> {
  readonly success: boolean;
  readonly data?: T;
  readonly errors?: readonly ValidationError[];
}

export interface ValidationError {
  readonly field: string;
  readonly message: string;
  readonly code: string;
}

export interface SchemaValidator {
  validate<T>(schema: ZodSchema<T>, data: unknown): ValidationResult<T>;
  validateRequest(
    context: UnifiedHttpContext,
    schemas: ValidationSchemas
  ): Promise<ValidationResult<ValidatedData>>;
}

export const createSchemaValidator = (): SchemaValidator => ({
  
  validate: <T>(schema: ZodSchema<T>, data: unknown): ValidationResult<T> => {
    const result = schema.safeParse(data);
    
    if (result.success) {
      return {
        success: true,
        data: result.data
      };
    }

    return {
      success: false,
      errors: result.error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
        code: err.code
      }))
    };
  },

  validateRequest: async (
    context: UnifiedHttpContext,
    schemas: ValidationSchemas
  ): Promise<ValidationResult<ValidatedData>> => {
    const errors: ValidationError[] = [];
    let validatedParams: unknown = context.request.params;
    let validatedBody: unknown = context.request.body;
    let validatedQuery: unknown = context.request.query;

    // Validate params
    if (schemas.params) {
      const result = schemas.params.safeParse(context.request.params);
      if (!result.success) {
        errors.push(...result.error.errors.map(err => ({
          field: `params.${err.path.join('.')}`,
          message: err.message,
          code: err.code
        })));
      } else {
        validatedParams = result.data;
      }
    }

    // Validate body
    if (schemas.body) {
      const result = schemas.body.safeParse(context.request.body);
      if (!result.success) {
        errors.push(...result.error.errors.map(err => ({
          field: `body.${err.path.join('.')}`,
          message: err.message,
          code: err.code
        })));
      } else {
        validatedBody = result.data;
      }
    }

    // Validate query
    if (schemas.query) {
      const result = schemas.query.safeParse(context.request.query);
      if (!result.success) {
        errors.push(...result.error.errors.map(err => ({
          field: `query.${err.path.join('.')}`,
          message: err.message,
          code: err.code
        })));
      } else {
        validatedQuery = result.data;
      }
    }

    if (errors.length > 0) {
      return { success: false, errors };
    }

    return {
      success: true,
      data: {
        params: validatedParams,
        body: validatedBody,
        query: validatedQuery
      }
    };
  }
});
```

### **Common Validation Schemas**

```typescript
// foundations/validation/common-schemas.ts
import { z } from 'zod';

// UUID parameter validation
export const UuidParamsSchema = z.object({
  id: z.string().uuid('Invalid UUID format')
});

// Pagination query validation
export const PaginationQuerySchema = z.object({
  page: z.coerce.number().min(1, 'Page must be at least 1').default(1),
  limit: z.coerce.number().min(1).max(100, 'Limit must be between 1 and 100').default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
});

// Search query validation
export const SearchQuerySchema = z.object({
  search: z.string().min(1, 'Search term cannot be empty').optional(),
  filter: z.record(z.string()).optional()
});

// Common response schemas
export const ErrorResponseSchema = z.object({
  error: z.string(),
  details: z.array(z.object({
    field: z.string(),
    message: z.string(),
    code: z.string()
  })).optional(),
  timestamp: z.string().datetime()
});

export const SuccessResponseSchema = <T>(dataSchema: z.ZodSchema<T>) => z.object({
  data: dataSchema,
  meta: z.object({
    timestamp: z.string().datetime(),
    version: z.string().optional()
  }).optional()
});

// Utility functions
export const createPaginatedResponseSchema = <T>(itemSchema: z.ZodSchema<T>) => z.object({
  data: z.array(itemSchema),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
    hasNext: z.boolean(),
    hasPrev: z.boolean()
  })
});
```

### **Validation Middleware**

```typescript
// foundations/validation/validation-middleware.ts
export const createValidationMiddleware = (
  schemas: ValidationSchemas,
  validator: SchemaValidator = createSchemaValidator()
): MiddlewareDefinition => ({
  name: 'validation',
  priority: 20,
  handler: async (context: UnifiedHttpContext): Promise<boolean> => {
    const result = await validator.validateRequest(context, schemas);
    
    if (!result.success) {
      context.response.status(400);
      context.response.json({
        error: 'Validation failed',
        details: result.errors,
        timestamp: new Date().toISOString()
      });
      return false; // Stop execution
    }

    // Attach validated data to context for route handler
    (context as any).validated = result.data;
    return true;
  }
});

// Helper to get validated data from context
export const getValidatedData = (context: UnifiedHttpContext): ValidatedData => {
  return (context as any).validated || {
    params: context.request.params,
    body: context.request.body,
    query: context.request.query
  };
};
```

---

## 5. 🏗️ **Dependency Management**

### **The Problem: Different Routes Need Different Dependencies**

```typescript
// ❌ One-size-fits-all dependencies (ไม่ดี)
interface Dependencies {
  userService: UserService;
  authService: AuthService;
  paymentService: PaymentService;  // ไม่ได้ใช้ในทุก route
  emailService: EmailService;      // ไม่ได้ใช้ในทุก route
  s3Service: S3Service;           // ไม่ได้ใช้ในทุก route
  reportService: ReportService;    // ไม่ได้ใช้ในทุก route
}

// CreateUser route ใช้เฉพาะ userService, emailService
// GetUsers route ใช้เฉพาะ userService, cacheService
// Payment route ใช้เฉพาะ paymentService, logger
```

### **Solution: Domain-Specific Dependencies**

```typescript
// foundations/dependency-management/types.ts

// Base dependencies ที่ทุก route ต้องการ
export interface BaseDependencies {
  readonly logger: Logger;
}

// Specific dependencies สำหรับแต่ละ domain
export interface UserDependencies extends BaseDependencies {
  readonly userService: UserService;
  readonly emailService: EmailService;
  readonly cacheService: CacheService;
}

export interface PaymentDependencies extends BaseDependencies {
  readonly paymentService: PaymentService;
  readonly notificationService: NotificationService;
  readonly auditService: AuditService;
}

export interface OrderDependencies extends BaseDependencies {
  readonly orderService: OrderService;
  readonly inventoryService: InventoryService;
  readonly shippingService: ShippingService;
}

export interface ReportDependencies extends BaseDependencies {
  readonly reportService: ReportService;
  readonly fileService: FileService;
  readonly s3Service: S3Service;
}

// Logger interface
export interface Logger {
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
  debug(message: string, meta?: Record<string, unknown>): void;
}
```

### **Dependency-Aware Route Factory**

```typescript
// foundations/dependency-management/route-factory.ts

export const createRouteWithDeps = <TDeps extends BaseDependencies>(
  dependencies: TDeps
) => {
  return <TParams = unknown, TBody = unknown, TQuery = unknown>(
    metadata: RouteMetadata,
    schemas: ValidationSchemas,
    handler: (
      validated: ValidatedData,
      context: UnifiedHttpContext,
      deps: TDeps
    ) => Promise<void>
  ): RouteDefinition => {
    return createValidatedRoute(
      metadata,
      schemas,
      async (validated, context) => {
        await handler(validated, context, dependencies);
      }
    );
  };
};

// Type-safe dependency injection helper
export const withDependencies = <TDeps extends BaseDependencies>(
  dependencies: TDeps,
  routeCreator: (deps: TDeps) => RouteDefinition
): RouteDefinition => {
  return routeCreator(dependencies);
};
```

### **Service Registry Pattern**

```typescript
// foundations/dependency-management/service-registry.ts

export interface ServiceRegistry {
  // Core services
  readonly logger: Logger;
  
  // User domain
  readonly userService: UserService;
  readonly emailService: EmailService;
  
  // Payment domain
  readonly paymentService: PaymentService;
  readonly notificationService: NotificationService;
  
  // Infrastructure
  readonly cacheService: CacheService;
  readonly fileService: FileService;
  readonly s3Service: S3Service;
}

// Helper function to pick specific services
export const pick = <T, K extends keyof T>(
  obj: T,
  keys: readonly K[]
): Pick<T, K> => {
  const result = {} as Pick<T, K>;
  keys.forEach(key => {
    result[key] = obj[key];
  });
  return result;
};

// Route factory with selective dependencies
export const createRouteWithServices = <TKeys extends keyof ServiceRegistry>(
  registry: ServiceRegistry,
  serviceKeys: readonly TKeys[]
) => {
  const dependencies = pick(registry, serviceKeys);
  
  return (
    metadata: RouteMetadata,
    schemas: ValidationSchemas,
    handler: (
      validated: ValidatedData,
      context: UnifiedHttpContext,
      services: Pick<ServiceRegistry, TKeys>
    ) => Promise<void>
  ): RouteDefinition => {
    return createValidatedRoute(
      metadata,
      schemas,
      async (validated, context) => {
        await handler(validated, context, dependencies);
      }
    );
  };
};
```

### **Hook-based Dependencies (React-like)**

```typescript
// foundations/dependency-management/hooks.ts

// Dependency hooks for different domains
export const useUserServices = (registry: ServiceRegistry) => ({
  logger: registry.logger,
  userService: registry.userService,
  emailService: registry.emailService,
  cacheService: registry.cacheService
});

export const usePaymentServices = (registry: ServiceRegistry) => ({
  logger: registry.logger,
  paymentService: registry.paymentService,
  notificationService: registry.notificationService,
  auditService: registry.auditService
});

export const useReportServices = (registry: ServiceRegistry) => ({
  logger: registry.logger,
  reportService: registry.reportService,
  fileService: registry.fileService,
  s3Service: registry.s3Service
});

// Route factory with hooks
export const createRouteWithHook = <TDeps>(
  useHook: (registry: ServiceRegistry) => TDeps,
  registry: ServiceRegistry
) => {
  const dependencies = useHook(registry);
  
  return (
    metadata: RouteMetadata,
    schemas: ValidationSchemas,
    handler: (
      validated: ValidatedData,
      context: UnifiedHttpContext,
      deps: TDeps
    ) => Promise<void>
  ): RouteDefinition => {
    return createValidatedRoute(
      metadata,
      schemas,
      async (validated, context) => {
        await handler(validated, context, dependencies);
      }
    );
  };
};
```

### **Real-World Examples**

```typescript
// routes/user/user-routes.ts
export const createUserRoutes = (deps: UserDependencies) => {
  const createRoute = createRouteWithDeps(deps);

  const createUser = createRoute(
    {
      method: 'POST',
      path: '/users',
      tags: ['users'],
      summary: 'Create a new user',
      version: 'v1'
    },
    { body: CreateUserSchema },
    async (validated, context, deps) => {
      // deps is typed as UserDependencies
      const userData = validated.body as CreateUserData;
      
      try {
        const user = await deps.userService.createUser(userData);
        await deps.emailService.sendWelcomeEmail(user.email);
        deps.logger.info('User created', { userId: user.id });
        
        context.response.status(201);
        context.response.json({ data: user });
      } catch (error) {
        deps.logger.error('User creation failed', { error: error.message });
        throw error;
      }
    }
  );

  const getUsers = createRoute(
    {
      method: 'GET',
      path: '/users',
      tags: ['users'],
      summary: 'List users',
      version: 'v1'
    },
    { query: PaginationQuerySchema },
    async (validated, context, deps) => {
      const query = validated.query as PaginationQuery;
      
      // Check cache first
      const cacheKey = `users:${JSON.stringify(query)}`;
      const cached = await deps.cacheService.get(cacheKey);
      
      if (cached) {
        context.response.json(cached);
        return;
      }

      const users = await deps.userService.getUsers(query);
      await deps.cacheService.set(cacheKey, users, 300);
      
      context.response.json(users);
    }
  );

  return { createUser, getUsers };
};

// routes/payment/payment-routes.ts
export const createPaymentRoutes = (deps: PaymentDependencies) => {
  const createRoute = createRouteWithDeps(deps);

  const processPayment = createRoute(
    {
      method: 'POST',
      path: '/payments',
      tags: ['payments'],
      summary: 'Process payment',
      version: 'v1'
    },
    { body: ProcessPaymentSchema },
    async (validated, context, deps) => {
      // deps is typed as PaymentDependencies
      const paymentData = validated.body as ProcessPaymentData;
      
      try {
        const payment = await deps.paymentService.processPayment(paymentData);
        
        // Log for audit
        await deps.auditService.logPayment(payment);
        
        // Send notification
        await deps.notificationService.notifyPaymentSuccess(payment);
        
        deps.logger.info('Payment processed', { paymentId: payment.id });
        
        context.response.status(201);
        context.response.json({ data: payment });
      } catch (error) {
        deps.logger.error('Payment processing failed', { error: error.message });
        throw error;
      }
    }
  );

  return { processPayment };
};
```

### **Service Registry Usage**

```typescript
// Using service registry with selective dependencies
export const createUserRoute = (registry: ServiceRegistry) => {
  const createRoute = createRouteWithServices(
    registry,
    ['logger', 'userService', 'emailService'] as const  // Only needed services
  );

  return createRoute(
    {
      method: 'POST',
      path: '/users',
      tags: ['users'],
      summary: 'Create user'
    },
    { body: CreateUserSchema },
    async (validated, context, services) => {
      // services is typed as Pick<ServiceRegistry, 'logger' | 'userService' | 'emailService'>
      const user = await services.userService.createUser(validated.body);
      await services.emailService.sendWelcomeEmail(user.email);
      services.logger.info('User created', { userId: user.id });
      
      context.response.status(201);
      context.response.json({ data: user });
    }
  );
};

// Using hooks pattern
export const createPaymentRoute = (registry: ServiceRegistry) => {
  const createRoute = createRouteWithHook(usePaymentServices, registry);

  return createRoute(
    {
      method: 'POST',
      path: '/payments',
      tags: ['payments'],
      summary: 'Process payment'
    },
    { body: ProcessPaymentSchema },
    async (validated, context, deps) => {
      // deps has only payment-related services
      const payment = await deps.paymentService.processPayment(validated.body);
      await deps.notificationService.notifyPaymentSuccess(payment);
      // deps.userService ❌ Not available (type error)
      
      context.response.status(201);
      context.response.json({ data: payment });
    }
  );
};
```

### **Application Setup with Dependencies**

```typescript
// app-with-dependencies.ts
const setupApplicationWithDependencies = async () => {
  // 1. Create service registry
  const serviceRegistry: ServiceRegistry = {
    logger: createLogger({ level: 'info' }),
    userService: createUserService(),
    emailService: createEmailService(),
    paymentService: createPaymentService(),
    notificationService: createNotificationService(),
    cacheService: createCacheService(),
    fileService: createFileService(),
    s3Service: createS3Service(),
    auditService: createAuditService()
  };

  // 2. Create domain-specific dependencies
  const userDeps: UserDependencies = {
    logger: serviceRegistry.logger,
    userService: serviceRegistry.userService,
    emailService: serviceRegistry.emailService,
    cacheService: serviceRegistry.cacheService
  };

  const paymentDeps: PaymentDependencies = {
    logger: serviceRegistry.logger,
    paymentService: serviceRegistry.paymentService,
    notificationService: serviceRegistry.notificationService,
    auditService: serviceRegistry.auditService
  };

  // 3. Create routes with specific dependencies
  const userRoutes = createUserRoutes(userDeps);
  const paymentRoutes = createPaymentRoutes(paymentDeps);

  // 4. Setup route manager
  const registry = createRouteRegistry();
  const middlewareRegistry = createMiddlewareRegistry();
  
  // Register middleware
  middlewareRegistry.register(createErrorHandlingMiddleware());
  middlewareRegistry.register(createRequestLoggingMiddleware());
  middlewareRegistry.register(createCorsMiddleware());

  const routeManager = createRouteManager(
    {
      discovery: { patterns: ['./routes/**/*.route.ts'] },
      middleware: { global: ['error-handling', 'request-logging', 'cors'] }
    },
    {
      registry,
      discoveryService: createRouteDiscoveryService(createFileSystemService()),
      middlewareRegistry
    }
  );

  // 5. Register routes
  Object.values(userRoutes).forEach(route => routeManager.register(route));
  Object.values(paymentRoutes).forEach(route => routeManager.register(route));

  // 6. Setup framework
  const app = new Hono();
  await routeManager.setupFramework(app, 'hono');

  return app;
};
```

### **Testing with Specific Dependencies**

```typescript
// Testing is much easier with specific dependencies
describe('User Routes', () => {
  let mockUserDeps: UserDependencies;
  let userRoutes: ReturnType<typeof createUserRoutes>;

  beforeEach(() => {
    mockUserDeps = {
      logger: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn()
      },
      userService: {
        createUser: jest.fn(),
        getUsers: jest.fn(),
        getUserById: jest.fn()
      },
      emailService: {
        sendWelcomeEmail: jest.fn()
      },
      cacheService: {
        get: jest.fn(),
        set: jest.fn()
      }
    };

    userRoutes = createUserRoutes(mockUserDeps);
  });

  it('should create user successfully', async () => {
    const mockUser = { id: '1', email: 'test@example.com', name: 'Test User' };
    (mockUserDeps.userService.createUser as jest.Mock).mockResolvedValue(mockUser);

    const mockContext = createMockContext({
      body: { email: 'test@example.com', name: 'Test User' }
    });

    await userRoutes.createUser.handler(mockContext);

    expect(mockUserDeps.userService.createUser).toHaveBeenCalled();
    expect(mockUserDeps.emailService.sendWelcomeEmail).toHaveBeenCalledWith('test@example.com');
    expect(mockContext.response.status).toHaveBeenCalledWith(201);
  });

  it('should use cache for user list', async () => {
    const cachedUsers = [{ id: '1', name: 'Cached User' }];
    (mockUserDeps.cacheService.get as jest.Mock).mockResolvedValue(cachedUsers);

    const mockContext = createMockContext({
      query: { page: '1', limit: '20' }
    });

    await userRoutes.getUsers.handler(mockContext);

    expect(mockUserDeps.cacheService.get).toHaveBeenCalled();
    expect(mockUserDeps.userService.getUsers).not.toHaveBeenCalled(); // Should use cache
    expect(mockContext.response.json).toHaveBeenCalledWith(cachedUsers);
  });
});
```

### **Benefits of Specific Dependencies**

### ✅ **Type Safety**
```typescript
// Compile-time dependency checking
const createUser = createRoute(metadata, schemas, async (data, ctx, deps) => {
  await deps.userService.createUser(data.body);  // ✅ Available
  await deps.paymentService.process(payment);    // ❌ Type error!
});
```

### ✅ **Better Testing**
```typescript
// Mock only what you need
const mockUserDeps: UserDependencies = {
  logger: createMockLogger(),
  userService: { createUser: jest.fn() },
  emailService: { sendWelcomeEmail: jest.fn() },
  cacheService: { get: jest.fn(), set: jest.fn() }
  // No need to mock paymentService, etc.
};
```

### ✅ **Clear Domain Boundaries**
- User routes ใช้ UserDependencies
- Payment routes ใช้ PaymentDependencies  
- Report routes ใช้ ReportDependencies
- ไม่มี cross-domain dependencies

### ✅ **Bundle Optimization**
- Tree-shaking ทำงานได้ดีกว่า
- ไม่ import services ที่ไม่ได้ใช้
- Smaller bundle size per route

### ✅ **Development Experience**
```typescript
// IntelliSense shows only relevant services
const createUserRoute = (deps: UserDependencies) => {
  deps. // Shows: logger, userService, emailService, cacheService
  // ❌ No paymentService, reportService clutter
};
```

### **Basic Route Manager**

```typescript
// foundations/route-manager.ts
export interface RouteManagerConfig {
  readonly discovery: {
    readonly patterns: readonly string[];
  };
  readonly middleware: {
    readonly global?: readonly string[];
  };
}

export interface RouteManager {
  register(route: RouteDefinition): void;
  discover(): Promise<void>;
  setupFramework<TApp>(app: TApp, frameworkType: FrameworkType): Promise<void>;
  getRoutes(): readonly RouteDefinition[];
}

export const createRouteManager = (
  config: RouteManagerConfig,
  dependencies: {
    readonly registry: RouteRegistry;
    readonly discoveryService: RouteDiscoveryService;
    readonly middlewareRegistry: MiddlewareRegistry;
  }
): RouteManager => {
  const { registry, discoveryService, middlewareRegistry } = dependencies;

  return {
    register: (route: RouteDefinition): void => {
      registry.register(route);
    },

    discover: async (): Promise<void> => {
      const routes = await discoveryService.discoverRoutes(config.discovery.patterns);
      routes.forEach(route => registry.register(route));
    },

    setupFramework: async <TApp>(app: TApp, frameworkType: FrameworkType): Promise<void> => {
      const adapter = createFrameworkAdapter<TApp>(frameworkType);
      const routes = registry.getRoutes();

      for (const route of routes) {
        // Apply global middleware if configured
        let finalRoute = route;
        if (config.middleware.global) {
          finalRoute = withMiddleware(route, config.middleware.global, middlewareRegistry);
        }

        await adapter.registerRoute(app, finalRoute);
      }
    },

    getRoutes: (): readonly RouteDefinition[] => {
      return registry.getRoutes();
    }
  };
};
```

### **Complete Example Setup**

```typescript
// app-fastify.ts - Fastify Example
import fastify from 'fastify';
import { z } from 'zod';

const setupFastifyApplication = async () => {
  // 1. Create dependencies
  const registry = createRouteRegistry();
  const middlewareRegistry = createMiddlewareRegistry();
  const fileSystem = createFileSystemService(); // Implementation needed
  const discoveryService = createRouteDiscoveryService(fileSystem);

  // 2. Register built-in middleware
  middlewareRegistry.register(createErrorHandlingMiddleware());
  middlewareRegistry.register(createRequestLoggingMiddleware());
  middlewareRegistry.register(createCorsMiddleware());

  // 3. Create route manager
  const routeManager = createRouteManager(
    {
      discovery: {
        patterns: ['./routes/**/*.route.ts']
      },
      middleware: {
        global: ['error-handling', 'request-logging', 'cors']
      }
    },
    { registry, discoveryService, middlewareRegistry }
  );

  // 4. Create example routes manually (before discovery)
  const getUsersRoute = createValidatedRoute(
    {
      method: 'GET',
      path: '/users',
      tags: ['users'],
      summary: 'Get all users'
    },
    {
      query: PaginationQuerySchema
    },
    async (validated, context) => {
      // Mock data for example
      const users = [
        { id: '1', name: 'John Doe', email: 'john@example.com' },
        { id: '2', name: 'Jane Smith', email: 'jane@example.com' }
      ];

      const { page, limit } = validated.query as z.infer<typeof PaginationQuerySchema>;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedUsers = users.slice(startIndex, endIndex);

      context.response.status(200);
      context.response.json({
        data: paginatedUsers,
        pagination: {
          page,
          limit,
          total: users.length,
          totalPages: Math.ceil(users.length / limit),
          hasNext: endIndex < users.length,
          hasPrev: page > 1
        }
      });
    }
  );

  const createUserRoute = createValidatedRoute(
    {
      method: 'POST',
      path: '/users',
      tags: ['users'],
      summary: 'Create a new user'
    },
    {
      body: z.object({
        name: z.string().min(2, 'Name must be at least 2 characters'),
        email: z.string().email('Invalid email format')
      })
    },
    async (validated, context) => {
      const userData = validated.body as { name: string; email: string };
      
      // Mock user creation
      const newUser = {
        id: Date.now().toString(),
        ...userData,
        createdAt: new Date().toISOString()
      };

      context.response.status(201);
      context.response.json({ data: newUser });
    }
  );

  // 5. Register routes
  routeManager.register(getUsersRoute);
  routeManager.register(createUserRoute);

  // 6. Discover additional routes from filesystem
  await routeManager.discover();

  // 7. Setup framework
  const app = fastify({ logger: true });
  await routeManager.setupFramework(app, 'fastify');

  // 8. Add health check
  app.get('/health', async () => ({
    status: 'healthy',
    framework: 'fastify',
    timestamp: new Date().toISOString(),
    routes: routeManager.getRoutes().length
  }));

  return app;
};

// app-hono.ts - Hono Example (Recommended for new projects)
import { Hono } from 'hono';
import { z } from 'zod';

const setupHonoApplication = async () => {
  // 1. Create dependencies (same as Fastify)
  const registry = createRouteRegistry();
  const middlewareRegistry = createMiddlewareRegistry();
  const fileSystem = createFileSystemService();
  const discoveryService = createRouteDiscoveryService(fileSystem);

  // 2. Register built-in middleware
  middlewareRegistry.register(createErrorHandlingMiddleware());
  middlewareRegistry.register(createRequestLoggingMiddleware());
  middlewareRegistry.register(createCorsMiddleware({
    origin: ['http://localhost:3000', 'https://yourdomain.com'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));

  // 3. Create route manager
  const routeManager = createRouteManager(
    {
      discovery: {
        patterns: ['./routes/**/*.route.ts']
      },
      middleware: {
        global: ['error-handling', 'request-logging', 'cors']
      }
    },
    { registry, discoveryService, middlewareRegistry }
  );

  // 4. Create example routes (same handlers, different registration)
  const getUsersRoute = createValidatedRoute(
    {
      method: 'GET',
      path: '/users',
      tags: ['users'],
      summary: 'Get all users with pagination'
    },
    {
      query: PaginationQuerySchema.extend({
        search: z.string().optional()
      })
    },
    async (validated, context) => {
      const { page, limit, search } = validated.query as {
        page: number;
        limit: number;
        search?: string;
      };

      // Mock data with search capability
      let users = [
        { id: '1', name: 'John Doe', email: 'john@example.com', role: 'user' },
        { id: '2', name: 'Jane Smith', email: 'jane@example.com', role: 'admin' },
        { id: '3', name: 'Bob Johnson', email: 'bob@example.com', role: 'user' },
        { id: '4', name: 'Alice Brown', email: 'alice@example.com', role: 'user' }
      ];

      // Apply search filter
      if (search) {
        users = users.filter(user => 
          user.name.toLowerCase().includes(search.toLowerCase()) ||
          user.email.toLowerCase().includes(search.toLowerCase())
        );
      }

      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedUsers = users.slice(startIndex, endIndex);

      context.response.status(200);
      context.response.json({
        data: paginatedUsers,
        pagination: {
          page,
          limit,
          total: users.length,
          totalPages: Math.ceil(users.length / limit),
          hasNext: endIndex < users.length,
          hasPrev: page > 1
        },
        meta: {
          search: search || null,
          timestamp: new Date().toISOString()
        }
      });
    }
  );

  const createUserRoute = createValidatedRoute(
    {
      method: 'POST',
      path: '/users',
      tags: ['users'],
      summary: 'Create a new user account'
    },
    {
      body: z.object({
        name: z.string()
          .min(2, 'Name must be at least 2 characters')
          .max(50, 'Name must be less than 50 characters'),
        email: z.string()
          .email('Invalid email format')
          .toLowerCase(),
        role: z.enum(['user', 'admin']).default('user'),
        preferences: z.object({
          theme: z.enum(['light', 'dark']).default('light'),
          notifications: z.boolean().default(true)
        }).optional()
      })
    },
    async (validated, context) => {
      const userData = validated.body as {
        name: string;
        email: string;
        role: 'user' | 'admin';
        preferences?: {
          theme: 'light' | 'dark';
          notifications: boolean;
        };
      };
      
      // Check if email already exists (mock)
      const existingUsers = ['john@example.com', 'jane@example.com'];
      if (existingUsers.includes(userData.email)) {
        context.response.status(409);
        context.response.json({
          error: 'Email already registered',
          code: 'EMAIL_EXISTS',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Create new user (mock)
      const newUser = {
        id: `user_${Date.now()}`,
        ...userData,
        preferences: userData.preferences || {
          theme: 'light',
          notifications: true
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      context.response.status(201);
      context.response.json({
        data: newUser,
        meta: {
          message: 'User created successfully',
          timestamp: new Date().toISOString()
        }
      });
    }
  );

  // Additional route: Get user by ID
  const getUserByIdRoute = createValidatedRoute(
    {
      method: 'GET',
      path: '/users/:id',
      tags: ['users'],
      summary: 'Get user by ID'
    },
    {
      params: UuidParamsSchema.extend({
        id: z.string().min(1, 'User ID is required')
      })
    },
    async (validated, context) => {
      const { id } = validated.params as { id: string };
      
      // Mock user lookup
      const users = [
        { id: '1', name: 'John Doe', email: 'john@example.com', role: 'user' },
        { id: '2', name: 'Jane Smith', email: 'jane@example.com', role: 'admin' }
      ];
      
      const user = users.find(u => u.id === id);
      
      if (!user) {
        context.response.status(404);
        context.response.json({
          error: 'User not found',
          code: 'USER_NOT_FOUND',
          timestamp: new Date().toISOString()
        });
        return;
      }

      context.response.status(200);
      context.response.json({
        data: user,
        meta: {
          timestamp: new Date().toISOString()
        }
      });
    }
  );

  // 5. Register routes
  routeManager.register(getUsersRoute);
  routeManager.register(createUserRoute);
  routeManager.register(getUserByIdRoute);

  // 6. Discover additional routes from filesystem
  await routeManager.discover();

  // 7. Setup Hono framework
  const app = new Hono();
  await routeManager.setupFramework(app, 'hono');

  // 8. Add health check with more details
  app.get('/health', (c) => {
    return c.json({
      status: 'healthy',
      framework: 'hono',
      runtime: typeof Bun !== 'undefined' ? 'bun' : 
               typeof Deno !== 'undefined' ? 'deno' : 'node',
      timestamp: new Date().toISOString(),
      routes: routeManager.getRoutes().length,
      uptime: process.uptime?.() || 0
    });
  });

  // 9. Add API info endpoint
  app.get('/api/info', (c) => {
    const routes = routeManager.getRoutes();
    return c.json({
      title: 'UnifiedRouteManager API',
      version: '1.0.0',
      routes: routes.map(route => ({
        method: route.metadata.method,
        path: route.metadata.path,
        tags: route.metadata.tags,
        summary: route.metadata.summary
      })),
      totalRoutes: routes.length
    });
  });

  return app;
};

// Start servers
const startFastifyServer = async () => {
  const app = await setupFastifyApplication();
  await app.listen({ port: 3000 });
  console.log('🚀 Fastify server running on http://localhost:3000');
};

const startHonoServer = async () => {
  const app = await setupHonoApplication();
  
  // Start server based on runtime
  if (typeof Bun !== 'undefined') {
    // Bun runtime
    Bun.serve({
      port: 3001,
      fetch: app.fetch
    });
    console.log('🔥 Hono server running on http://localhost:3001 (Bun)');
  } else if (typeof Deno !== 'undefined') {
    // Deno runtime
    Deno.serve({ port: 3001 }, app.fetch);
    console.log('🦕 Hono server running on http://localhost:3001 (Deno)');
  } else {
    // Node.js runtime
    const { serve } = await import('@hono/node-server');
    serve({
      fetch: app.fetch,
      port: 3001
    });
    console.log('🟢 Hono server running on http://localhost:3001 (Node.js)');
  }
};

// Choose which server to start
const framework = process.env.FRAMEWORK || 'hono'; // Default to Hono

if (framework === 'fastify') {
  startFastifyServer().catch(console.error);
} else {
  startHonoServer().catch(console.error);
}
```

### **Framework Comparison Example**

```typescript
// comparison.ts - Side by side comparison
import fastify from 'fastify';
import { Hono } from 'hono';

// Same route definition works for both frameworks
const sharedRoute = createValidatedRoute(
  {
    method: 'GET',
    path: '/api/status',
    tags: ['system'],
    summary: 'Get API status'
  },
  {},
  async (validated, context) => {
    context.response.status(200);
    context.response.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      framework: context.request.headers['x-framework'] || 'unknown'
    });
  }
);

// Framework setup comparison
const setupComparison = async () => {
  const registry = createRouteRegistry();
  registry.register(sharedRoute);

  // Fastify setup
  const fastifyApp = fastify();
  const fastifyAdapter = createFastifyAdapter();
  await fastifyAdapter.registerRoute(fastifyApp, sharedRoute);

  // Hono setup  
  const honoApp = new Hono();
  const honoAdapter = createHonoAdapter();
  await honoAdapter.registerRoute(honoApp, sharedRoute);

  console.log('✅ Same route definition works for both frameworks!');
  
  return { fastifyApp, honoApp };
};
```

---

## 📝 Part 1 Summary

### What You've Built

**✅ 1. Route Management System**
- Route factory และ registry patterns
- Automatic route discovery (file-based scanning)
- Type-safe route definitions
- Route metadata management

**✅ 2. Multi-Framework Support**  
- **Fastify** adapter (production-ready, high performance)
- **Hono** adapter (modern, edge-ready, excellent TypeScript support)
- Unified HTTP context abstraction
- Framework-agnostic route handlers
- Auto-detection และ framework factory

**✅ 3. Middleware System**
- Functional middleware composition
- Built-in middlewares (CORS, logging, error handling)
- Priority-based middleware ordering
- Middleware registry และ composition helpers

**✅ 4. Validation Layer**
- Zod schema integration
- Request/response validation (params, body, query)
- Type-safe validated data
- Common validation schemas (UUID, pagination, search)
- Validation middleware

**✅ 5. Dependency Management**
- **Domain-Specific Dependencies** (UserDependencies, PaymentDependencies)
- **Service Registry Pattern** - centralized service management
- **Hook-based Dependencies** - React-like dependency injection  
- **Type-Safe DI** - compile-time validation, ไม่มี `any` types
- **Easy Testing** - mock เฉพาะ dependencies ที่ต้องการ

### 🔥 Why Hono is Recommended for New Projects

| Feature | Fastify | Hono | Winner |
|---------|---------|------|--------|
| **Performance** | Excellent | Excellent+ | 🔥 Hono |
| **TypeScript** | Good | Excellent | 🔥 Hono |
| **Bundle Size** | Medium | Small | 🔥 Hono |
| **Runtime Support** | Node.js | Node.js, Bun, Deno, Cloudflare Workers | 🔥 Hono |
| **Ecosystem** | Mature | Growing | ⚖️ Fastify |
| **Learning Curve** | Medium | Easy | 🔥 Hono |

### 🚀 Hono Advantages

```typescript
// 1. Edge Runtime Ready
// Works on Cloudflare Workers, Bun, Deno out of the box

// 2. Excellent TypeScript Support
app.get('/users/:id', (c) => {
  const id = c.req.param('id'); // Type-safe params
  return c.json({ id }); // Type-safe response
});

// 3. Minimal Bundle Size
// ~37KB vs Fastify's ~1MB

// 4. Modern API Design
// Clean, intuitive API similar to Express but better

// 5. Built-in Validation & Middleware
import { validator } from 'hono/validator';
app.post('/users', validator('json', userSchema), handler);
```

### Migration Path: Fastify → Hono

```typescript
// Same route definition works for both!
const userRoute = createValidatedRoute(
  { method: 'GET', path: '/users' },
  { query: schema },
  async (validated, context) => {
    // Framework-agnostic handler
    context.response.json(await getUsers(validated.query));
  }
);

// Just change the framework setup
// From: setupFramework(app, 'fastify')
// To:   setupFramework(app, 'hono')
```

### Next Steps

**Part 2: Security & Development** จะเพิ่ม:
- 🔒 Authentication และ authorization middleware
- 📚 OpenAPI documentation generation สำหรับทั้ง Fastify และ Hono
- 🧪 Auto-test generation
- 🔄 API versioning strategies

### **Learning Outcome**

ตอนนี้คุณมี **functional route management system** ที่:
- ✅ ทำงานกับ **Fastify** (production-proven)
- ✅ ทำงานกับ **Hono** (modern, future-ready)
- ✅ มี **type safety** ครบถ้วน
- ✅ สามารถ **validate requests** อัตโนมัติ
- ✅ จัดการ **middleware** ได้ยืดหยุ่น
- ✅ **ใช้ dependencies ที่เฉพาะเจาะจง** สำหรับแต่ละ route (ไม่มี bloated dependencies)
- ✅ **ทดสอบง่าย** ด้วย specific dependency mocking
- ✅ พร้อม **migrate** ระหว่าง frameworks ได้ง่าย

**Foundation แข็งแรงพร้อมสำหรับ Part 2!** 🎯

### **🎪 Quick Start Commands**

```bash
# Fastify (current production)
FRAMEWORK=fastify npm start
# 🚀 Server running on http://localhost:3000

# Hono (recommended for new projects) 
FRAMEWORK=hono npm start  
# 🔥 Server running on http://localhost:3001

# Test both
curl http://localhost:3000/health  # Fastify
curl http://localhost:3001/health  # Hono
curl http://localhost:3001/api/info # Route information
```

**Same routes, different frameworks, consistent experience!** 🌟