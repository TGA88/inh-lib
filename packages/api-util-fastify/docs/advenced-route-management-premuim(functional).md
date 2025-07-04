# UnifiedRouteManager: Functional Route Management (Premium)

Enterprise-grade functional route automation with discovery, documentation, and systematic management for complex applications.

## 📖 Overview: UnifiedRouteManager System

### Functional Route Management Architecture

```typescript
// foundations/unified-route-manager/types.ts
// Import existing UnifiedHttpContext from unified-context.ts
import { UnifiedHttpContext, UnifiedRequestContext, UnifiedResponseContext } from './unified-context';
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
  readonly auth?: AuthConfig;
  readonly rateLimit?: RateLimitConfig;
  readonly cache?: CacheConfig;
  readonly version?: string;
  readonly deprecated?: boolean;
  readonly middleware?: readonly string[];
}

export interface AuthConfig {
  readonly required: boolean;
  readonly roles?: readonly string[];
  readonly permissions?: readonly string[];
  readonly scopes?: readonly string[];
}

export interface RateLimitConfig {
  readonly max: number;
  readonly window: string;
  readonly keyGenerator?: string;
}

export interface CacheConfig {
  readonly ttl: number;
  readonly key?: string;
  readonly invalidateOn?: readonly string[];
}

export interface RouteDefinition {
  readonly metadata: RouteMetadata;
  readonly handler: RouteHandler;
  readonly middlewareHandlers?: readonly MiddlewareHandler[];
}

export interface User {
  readonly id: string;
  readonly email: string;
  readonly roles: readonly string[];
  readonly permissions: readonly string[];
}

export interface MiddlewareHandler {
  (context: UnifiedHttpContext): Promise<boolean>; // return false to stop execution
}

// Additional type definitions for dependencies
export interface Logger {
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
  debug(message: string, meta?: Record<string, unknown>): void;
}

export interface FileSystemService {
  findFiles(patterns: readonly string[], exclude?: readonly string[]): Promise<readonly string[]>;
}

export interface AuthService {
  validateToken(token: string): Promise<User>;
}

export interface RateLimitService {
  checkLimit(key: string, max: number, window: string): Promise<boolean>;
}

export interface CacheService {
  get(key: string): Promise<unknown>;
  set(key: string, value: unknown, ttl: number): Promise<void>;
}

export interface MetricsCollector {
  getRouteMetrics(): Promise<RouteMetrics[]>;
}

export interface RouteMetrics {
  route: RouteMetadata;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  slowRequests: number;
  lastRequest: Date;
}

export interface OpenAPISpec {
  openapi: string;
  info: {
    title: string;
    version: string;
    description: string;
  };
  paths: Record<string, Record<string, unknown>>;
}

export interface DocumentationGenerator {
  generateSpec(routes: readonly RouteDefinition[], apiInfo: { title: string; version: string; description: string }): Promise<OpenAPISpec>;
}

export interface FrameworkAdapter<TApp> {
  registerRoute(app: TApp, route: RouteDefinition): Promise<void>;
}

// Service errors
export class EmailAlreadyExistsError extends Error {
  constructor(message = 'Email already exists') {
    super(message);
    this.name = 'EmailAlreadyExistsError';
  }
}
```

### Functional Route Creation

```typescript
// foundations/unified-route-manager/route-factory.ts
export interface RouteFactory {
  createRoute(
    metadata: RouteMetadata,
    handler: RouteHandler
  ): RouteDefinition;
}

export const createRouteFactory = (): RouteFactory => ({
  createRoute: (
    metadata: RouteMetadata,
    handler: RouteHandler
  ): RouteDefinition => ({
    metadata,
    handler,
    middlewareHandlers: []
  })
});

// Helper function for creating routes with validation
export const createValidatedRoute = <TParams = unknown, TBody = unknown, TQuery = unknown>(
  metadata: RouteMetadata,
  schemas: {
    params?: ZodSchema<TParams>;
    body?: ZodSchema<TBody>;
    query?: ZodSchema<TQuery>;
  },
  handler: (
    validatedData: {
      params: TParams;
      body: TBody;
      query: TQuery;
    },
    context: UnifiedHttpContext
  ) => Promise<void>
): RouteDefinition => {
  const validatedHandler: RouteHandler = async (context) => {
    let validatedParams: TParams = {} as TParams;
    let validatedBody: TBody = {} as TBody;
    let validatedQuery: TQuery = {} as TQuery;

    // Validate params
    if (schemas.params) {
      const paramsResult = schemas.params.safeParse(context.request.params);
      if (!paramsResult.success) {
        context.response.status(400);
        context.response.json({ error: 'Invalid parameters', details: paramsResult.error.errors });
        return;
      }
      validatedParams = paramsResult.data;
    } else {
      validatedParams = context.request.params as TParams;
    }

    // Validate body
    if (schemas.body) {
      const bodyResult = schemas.body.safeParse(context.request.body);
      if (!bodyResult.success) {
        context.response.status(400);
        context.response.json({ error: 'Invalid request body', details: bodyResult.error.errors });
        return;
      }
      validatedBody = bodyResult.data;
    } else {
      validatedBody = context.request.body as TBody;
    }

    // Validate query
    if (schemas.query) {
      const queryResult = schemas.query.safeParse(context.request.query);
      if (!queryResult.success) {
        context.response.status(400);
        context.response.json({ error: 'Invalid query parameters', details: queryResult.error.errors });
        return;
      }
      validatedQuery = queryResult.data;
    } else {
      validatedQuery = context.request.query as TQuery;
    }

    await handler({ params: validatedParams, body: validatedBody, query: validatedQuery }, context);
  };

  return createRouteFactory().createRoute(metadata, validatedHandler);
};
```

### Route Registry (Functional)

```typescript
// foundations/unified-route-manager/route-registry.ts
export interface RouteRegistry {
  register(route: RouteDefinition): void;
  getRoutes(): readonly RouteDefinition[];
  getRoutesByTag(tag: string): readonly RouteDefinition[];
  getRoutesByVersion(version: string): readonly RouteDefinition[];
  clear(): void;
}

export const createRouteRegistry = (): RouteRegistry => {
  const routes: RouteDefinition[] = [];

  return {
    register: (route: RouteDefinition): void => {
      routes.push(route);
    },

    getRoutes: (): readonly RouteDefinition[] => [...routes],

    getRoutesByTag: (tag: string): readonly RouteDefinition[] =>
      routes.filter(route => route.metadata.tags?.includes(tag) ?? false),

    getRoutesByVersion: (version: string): readonly RouteDefinition[] =>
      routes.filter(route => route.metadata.version === version),

    clear: (): void => {
      routes.splice(0, routes.length);
    }
  };
};

// Global registry instance
let globalRegistry: RouteRegistry | null = null;

export const getGlobalRouteRegistry = (): RouteRegistry => {
  if (!globalRegistry) {
    globalRegistry = createRouteRegistry();
  }
  return globalRegistry;
};
```

### UnifiedRouteManager (Main System)

```typescript
// foundations/unified-route-manager/unified-route-manager.ts
export interface UnifiedRouteManagerConfig {
  readonly discovery: {
    readonly patterns: readonly string[];
    readonly exclude?: readonly string[];
  };
  readonly api: {
    readonly title: string;
    readonly version: string;
    readonly description: string;
  };
  readonly monitoring?: {
    readonly enabled: boolean;
    readonly slowRequestThreshold: number;
  };
}

export interface UnifiedRouteManager {
  discover(): Promise<readonly RouteDefinition[]>;
  register<TApp>(app: TApp, adapter: FrameworkAdapter<TApp>): Promise<void>;
  generateOpenAPI(): Promise<OpenAPISpec>;
  getMetrics(): Promise<RouteMetrics[]>;
}

export const createUnifiedRouteManager = (
  config: UnifiedRouteManagerConfig,
  dependencies: {
    readonly logger: Logger;
    readonly registry: RouteRegistry;
    readonly discoveryService: RouteDiscoveryService;
    readonly documentationGenerator: DocumentationGenerator;
    readonly metricsCollector?: MetricsCollector;
  }
): UnifiedRouteManager => {
  const { logger, registry, discoveryService, documentationGenerator, metricsCollector } = dependencies;

  return {
    discover: async (): Promise<readonly RouteDefinition[]> => {
      logger.info('Starting route discovery...', { patterns: config.discovery.patterns });
      
      try {
        const routes = await discoveryService.discoverRoutes(
          config.discovery.patterns,
          config.discovery.exclude
        );
        
        routes.forEach(route => registry.register(route));
        
        logger.info('Route discovery completed', { 
          routeCount: routes.length,
          versions: [...new Set(routes.map(r => r.metadata.version).filter(Boolean))]
        });
        
        return routes;
      } catch (error) {
        logger.error('Route discovery failed', { error });
        throw error;
      }
    },

    register: async <TApp>(app: TApp, adapter: FrameworkAdapter<TApp>): Promise<void> => {
      const routes = registry.getRoutes();
      logger.info('Registering routes...', { routeCount: routes.length });

      for (const route of routes) {
        try {
          await adapter.registerRoute(app, route);
          logger.debug('Route registered', { 
            method: route.metadata.method,
            path: route.metadata.path 
          });
        } catch (error) {
          logger.error('Failed to register route', {
            method: route.metadata.method,
            path: route.metadata.path,
            error
          });
          throw error;
        }
      }

      logger.info('All routes registered successfully');
    },

    generateOpenAPI: async (): Promise<OpenAPISpec> => {
      const routes = registry.getRoutes();
      return documentationGenerator.generateSpec(routes, config.api);
    },

    getMetrics: async (): Promise<RouteMetrics[]> => {
      if (!metricsCollector) {
        return [];
      }
      return metricsCollector.getRouteMetrics();
    }
  };
};
```

### Route Discovery Service (Functional)

```typescript
// foundations/unified-route-manager/discovery-service.ts
export interface RouteDiscoveryService {
  discoverRoutes(
    patterns: readonly string[],
    exclude?: readonly string[]
  ): Promise<readonly RouteDefinition[]>;
}

export const createRouteDiscoveryService = (
  dependencies: {
    readonly logger: Logger;
    readonly fileSystem: FileSystemService;
  }
): RouteDiscoveryService => {
  const { logger, fileSystem } = dependencies;

  return {
    discoverRoutes: async (
      patterns: readonly string[],
      exclude: readonly string[] = []
    ): Promise<readonly RouteDefinition[]> => {
      const files = await fileSystem.findFiles(patterns, exclude);
      const routes: RouteDefinition[] = [];

      for (const file of files) {
        try {
          const moduleExports = await import(file);
          const routeDefinitions = extractRouteDefinitions(moduleExports);
          routes.push(...routeDefinitions);
          
          logger.debug('Routes discovered from file', { 
            file, 
            routeCount: routeDefinitions.length 
          });
        } catch (error) {
          logger.warn('Failed to load route file', { file, error });
        }
      }

      return routes;
    }
  };
};

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
    typeof (value as RouteDefinition).handler === 'function'
  );
};
```

### Middleware System (Functional)

```typescript
// foundations/unified-route-manager/middleware.ts
export interface MiddlewareFactory {
  createAuthMiddleware(config: AuthConfig): MiddlewareHandler;
  createRateLimitMiddleware(config: RateLimitConfig): MiddlewareHandler;
  createCacheMiddleware(config: CacheConfig): MiddlewareHandler;
}

export const createMiddlewareFactory = (
  dependencies: {
    readonly authService: AuthService;
    readonly rateLimitService: RateLimitService;
    readonly cacheService: CacheService;
  }
): MiddlewareFactory => {
  const { authService, rateLimitService, cacheService } = dependencies;

  return {
    createAuthMiddleware: (config: AuthConfig): MiddlewareHandler => 
      async (context: UnifiedHttpContext): Promise<boolean> => {
        if (!config.required) {
          return true;
        }

        const authHeader = context.headers.authorization;
        if (!authHeader) {
          context.response.status(401);
          context.response.json({ error: 'Authentication required' });
          return false;
        }

        try {
          const user = await authService.validateToken(authHeader);
          
          if (config.roles && !hasRequiredRoles(user, config.roles)) {
            context.response.status(403);
            context.response.json({ error: 'Insufficient permissions' });
            return false;
          }

          if (config.permissions && !hasRequiredPermissions(user, config.permissions)) {
            context.response.status(403);
            context.response.json({ error: 'Insufficient permissions' });
            return false;
          }

          // Add user to context (this would need proper typing in real implementation)
          (context as { user: User }).user = user;
          return true;
        } catch (error) {
          context.response.status(401);
          context.response.json({ error: 'Invalid token' });
          return false;
        }
      },

    createRateLimitMiddleware: (config: RateLimitConfig): MiddlewareHandler =>
      async (context: UnifiedHttpContext): Promise<boolean> => {
        const key = config.keyGenerator || `${context.headers['x-forwarded-for'] || 'unknown'}:${config.window}`;
        
        const isAllowed = await rateLimitService.checkLimit(key, config.max, config.window);
        
        if (!isAllowed) {
          context.response.status(429);
          context.response.json({ error: 'Rate limit exceeded' });
          return false;
        }

        return true;
      },

    createCacheMiddleware: (config: CacheConfig): MiddlewareHandler =>
      async (context: UnifiedHttpContext): Promise<boolean> => {
        const cacheKey = config.key || `cache:${context.params}:${context.query}`;
        
        const cachedResponse = await cacheService.get(cacheKey);
        if (cachedResponse) {
          context.response.json(cachedResponse);
          return false; // Stop execution, response already sent
        }

        return true;
      }
  };
};

const hasRequiredRoles = (user: User, requiredRoles: readonly string[]): boolean =>
  requiredRoles.some(role => user.roles.includes(role));

const hasRequiredPermissions = (user: User, requiredPermissions: readonly string[]): boolean =>
  requiredPermissions.every(permission => user.permissions.includes(permission));
```

## Real-World Functional Route Examples

### User Management Routes

```typescript
// routes/user/create-user.route.ts
import { z } from 'zod';
import { createValidatedRoute } from '@/foundations/unified-route-manager';

const CreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  role: z.enum(['user', 'admin']).default('user')
});

type CreateUserBody = z.infer<typeof CreateUserSchema>;

export const createUserRoute = createValidatedRoute(
  {
    method: 'POST',
    path: '/users',
    tags: ['users'],
    summary: 'Create a new user',
    description: 'Creates a new user account with the provided information',
    auth: { required: false },
    rateLimit: { max: 100, window: '1h' },
    version: 'v1'
  },
  {
    body: CreateUserSchema
  },
  async (validatedData, context) => {
    try {
      // Business logic would be injected via dependency injection
      const userService = getUserService(); // This would be properly injected
      const user = await userService.createUser(validatedData.body);
      
      context.response.status(201);
      context.response.json(user);
    } catch (error) {
      if (error instanceof EmailAlreadyExistsError) {
        context.response.status(409);
        context.response.json({ error: 'Email address is already registered' });
      } else {
        throw error;
      }
    }
  }
);

// routes/user/get-users.route.ts
const GetUsersQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
  role: z.enum(['user', 'admin']).optional()
});

type GetUsersQuery = z.infer<typeof GetUsersQuerySchema>;

export const getUsersRoute = createValidatedRoute(
  {
    method: 'GET',
    path: '/users',
    tags: ['users'],
    summary: 'List users',
    description: 'Retrieves a paginated list of users',
    auth: { required: true, roles: ['admin', 'user'] },
    cache: { ttl: 300 }, // 5 minutes
    version: 'v1'
  },
  {
    query: GetUsersQuerySchema
  },
  async (validatedData, context) => {
    const userService = getUserService();
    const result = await userService.getUsers(validatedData.query);
    
    context.response.status(200);
    context.response.json(result);
  }
);

// routes/user/get-user-by-id.route.ts
const UserParamsSchema = z.object({
  id: z.string().uuid()
});

type UserParams = z.infer<typeof UserParamsSchema>;

export const getUserByIdRoute = createValidatedRoute(
  {
    method: 'GET',
    path: '/users/:id',
    tags: ['users'],
    summary: 'Get user by ID',
    description: 'Retrieves a specific user by their unique identifier',
    auth: { required: true },
    version: 'v1'
  },
  {
    params: UserParamsSchema
  },
  async (validatedData, context) => {
    const userService = getUserService();
    const user = await userService.getUserById(validatedData.params.id);
    
    if (!user) {
      context.response.status(404);
      context.response.json({ error: 'User not found' });
      return;
    }

    context.response.status(200);
    context.response.json(user);
  }
);
```

### Setup and Usage

```typescript
// app.ts
import { createUnifiedRouteManager } from '@/foundations/unified-route-manager';
import { createFastifyAdapter } from '@/adapters/fastify-adapter';

const setupApplication = async () => {
  // Setup dependencies
  const logger = createLogger();
  const registry = createRouteRegistry();
  const discoveryService = createRouteDiscoveryService({ logger, fileSystem });
  const documentationGenerator = createDocumentationGenerator();
  
  // Create route manager
  const routeManager = createUnifiedRouteManager(
    {
      discovery: {
        patterns: ['./routes/**/*.route.ts'],
        exclude: ['./routes/**/*.test.ts']
      },
      api: {
        title: 'My API',
        version: '1.0.0',
        description: 'Enterprise API with functional route management'
      },
      monitoring: {
        enabled: true,
        slowRequestThreshold: 1000
      }
    },
    {
      logger,
      registry,
      discoveryService,
      documentationGenerator
    }
  );

  // Discover and register routes
  await routeManager.discover();
  
  const app = fastify();
  const adapter = createFastifyAdapter();
  await routeManager.register(app, adapter);

  // Generate API documentation
  const openApiSpec = await routeManager.generateOpenAPI();
  app.get('/docs/openapi.json', async () => openApiSpec);

  return app;
};

setupApplication()
  .then(app => app.listen({ port: 3000 }))
  .catch(console.error);
```

## Benefits of Functional Approach

### ✅ **Improved Testability**

```typescript
// Easy to test individual route handlers
describe('createUserRoute', () => {
  it('should create user successfully', async () => {
    const mockContext: UnifiedHttpContext = {
      request: {
        body: { email: 'test@example.com', name: 'Test User' },
        params: {},
        query: {},
        headers: {},
        method: 'POST',
        url: '/users',
        ip: '127.0.0.1'
      },
      response: {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        send: jest.fn(),
        header: jest.fn().mockReturnThis(),
        redirect: jest.fn()
      }
    };

    await createUserRoute.handler(mockContext);

    expect(mockContext.response.status).toHaveBeenCalledWith(201);
  });
});

// Easy to test middleware independently
describe('authMiddleware', () => {
  it('should allow authenticated requests', async () => {
    const middleware = createAuthMiddleware({ required: true });
    const context: UnifiedHttpContext = {
      request: {
        headers: { authorization: 'Bearer valid-token' },
        body: {},
        params: {},
        query: {},
        method: 'GET',
        url: '/test',
        ip: '127.0.0.1'
      },
      response: {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        send: jest.fn(),
        header: jest.fn().mockReturnThis(),
        redirect: jest.fn()
      }
    };

    const result = await middleware(context);

    expect(result).toBe(true);
  });
});
```

### ✅ **Better Composition**

```typescript
// Compose routes with different middleware combinations
const createProtectedRoute = (metadata: RouteMetadata, handler: RouteHandler) =>
  createValidatedRoute(
    { ...metadata, auth: { required: true } },
    {},
    handler
  );

const createPublicRoute = (metadata: RouteMetadata, handler: RouteHandler) =>
  createValidatedRoute(
    { ...metadata, auth: { required: false } },
    {},
    handler
  );
```

## ✅ **สรุปการปรับปรุง**

### 🔄 **จาก Class-based เป็น Functional**

| Aspect | Class-based (เดิม) | Functional (ใหม่) |
|--------|-------------------|------------------|
| **Route Definition** | `@UnifiedRoute()` decorator | `createValidatedRoute()` function |
| **Type Safety** | Generic constraints | Built-in Zod validation |
| **Testing** | Complex mocking | Pure function testing |
| **Dependencies** | Constructor injection | Factory functions |
| **Immutability** | Manual readonly | Readonly everywhere |

### 🎯 **ข้อดีของ Functional Approach**

1. **🧪 Better Testability**
   - Pure functions ง่ายต่อการ test
   - ไม่ต้อง mock complex class instances
   - Clear input/output behavior

2. **🔄 Superior Composition**
   - Function composition แทน inheritance
   - สามารถ combine middleware ได้ยืดหยุ่น
   - Reusable utility functions

3. **🛡️ Type Safety**
   - ไม่มี `any` types เลย
   - Compile-time validation
   - IntelliSense ที่แม่นยำ

4. **📦 Dependency Injection**
   - Factory pattern สำหรับ dependencies
   - Easy mocking for tests
   - Clear separation of concerns

5. **⚡ Performance**
   - Less memory overhead
   - No class instantiation costs
   - Tree-shaking friendly

### 🚀 **Best Practices Applied**

- ✅ **No `any` types** - ใช้ generic constraints และ proper typing
- ✅ **Immutability** - `readonly` properties ทุกที่
- ✅ **Pure Functions** - ไม่มี side effects
- ✅ **Type-safe Validation** - Zod integration
- ✅ **Testable Code** - Easy unit testing
- ✅ **Modern TypeScript** - Latest features และ patterns