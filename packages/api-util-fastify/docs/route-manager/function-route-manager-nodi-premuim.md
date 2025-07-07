# Functional RouteManager - No DI Container Required

## 🎯 **Alternative Dependency Management Approaches**

### 1. **Pure Function Parameters (Simplest)**

```typescript
// foundations/unified-route-manager/types.ts
export type Dependencies = {
  readonly logger: Logger;
  readonly userService: UserService;
  readonly authService: AuthService;
  readonly cacheService: CacheService;
};

// Inject dependencies directly as parameters
export const createUserRoute = (deps: Dependencies) => 
  createValidatedRoute(
    {
      method: 'POST',
      path: '/users',
      tags: ['users'],
      auth: { required: false },
      version: 'v1'
    },
    { body: CreateUserSchema },
    async (validatedData, context) => {
      try {
        const user = await deps.userService.createUser(validatedData.body);
        context.response.status(201);
        context.response.json(user);
      } catch (error) {
        deps.logger.error('Failed to create user', { error });
        context.response.status(500);
        context.response.json({ error: 'Internal server error' });
      }
    }
  );

// Usage
const deps: Dependencies = {
  logger: createLogger(),
  userService: createUserService(),
  authService: createAuthService(),
  cacheService: createCacheService()
};

const userRoute = createUserRoute(deps);
```

### 2. **Factory Pattern with Closure (Recommended)**

```typescript
// foundations/unified-route-manager/route-factory.ts
export const createRouteFactory = (dependencies: Dependencies) => {
  const { logger, userService, authService, cacheService } = dependencies;

  return {
    createUserRoute: () => createValidatedRoute(
      {
        method: 'POST',
        path: '/users',
        tags: ['users'],
        auth: { required: false },
        version: 'v1'
      },
      { body: CreateUserSchema },
      async (validatedData, context) => {
        try {
          const user = await userService.createUser(validatedData.body);
          context.response.status(201);
          context.response.json(user);
        } catch (error) {
          logger.error('Failed to create user', { error });
          context.response.status(500);
          context.response.json({ error: 'Internal server error' });
        }
      }
    ),

    getUsersRoute: () => createValidatedRoute(
      {
        method: 'GET',
        path: '/users',
        tags: ['users'],
        auth: { required: true },
        version: 'v1'
      },
      { query: GetUsersQuerySchema },
      async (validatedData, context) => {
        const users = await userService.getUsers(validatedData.query);
        context.response.json(users);
      }
    ),

    getUserByIdRoute: () => createValidatedRoute(
      {
        method: 'GET',
        path: '/users/:id',
        tags: ['users'],
        auth: { required: true },
        version: 'v1'
      },
      { params: UserParamsSchema },
      async (validatedData, context) => {
        const user = await userService.getUserById(validatedData.params.id);
        if (!user) {
          context.response.status(404);
          context.response.json({ error: 'User not found' });
          return;
        }
        context.response.json(user);
      }
    )
  };
};

// Usage
const dependencies: Dependencies = {
  logger: createLogger(),
  userService: createUserService(),
  authService: createAuthService(),
  cacheService: createCacheService()
};

const routeFactory = createRouteFactory(dependencies);
const routes = [
  routeFactory.createUserRoute(),
  routeFactory.getUsersRoute(),
  routeFactory.getUserByIdRoute()
];
```

### 3. **Module Pattern (Most Flexible)**

```typescript
// routes/user/user-routes.ts
export const createUserRoutes = (dependencies: Dependencies) => {
  const { logger, userService, authService } = dependencies;

  const createUser = createValidatedRoute(
    {
      method: 'POST',
      path: '/users',
      tags: ['users'],
      auth: { required: false },
      version: 'v1'
    },
    { body: CreateUserSchema },
    async (validatedData, context) => {
      const user = await userService.createUser(validatedData.body);
      context.response.status(201);
      context.response.json(user);
    }
  );

  const getUsers = createValidatedRoute(
    {
      method: 'GET',
      path: '/users',
      tags: ['users'],
      auth: { required: true },
      version: 'v1'
    },
    { query: GetUsersQuerySchema },
    async (validatedData, context) => {
      const users = await userService.getUsers(validatedData.query);
      context.response.json(users);
    }
  );

  return { createUser, getUsers };
};

// routes/order/order-routes.ts
export const createOrderRoutes = (dependencies: Dependencies) => {
  // Similar pattern for order routes
  return { 
    createOrder: /* ... */,
    getOrders: /* ... */
  };
};
```

### 4. **Simplified RouteManager without DI Container**

```typescript
// foundations/unified-route-manager/route-manager.ts
export interface RouteManagerConfig {
  readonly discovery: {
    readonly patterns: readonly string[];
    readonly exclude?: readonly string[];
  };
  readonly api: {
    readonly title: string;
    readonly version: string;
    readonly description: string;
  };
}

export const createUnifiedRouteManager = (
  config: RouteManagerConfig,
  dependencies: Dependencies
) => {
  const registry = createRouteRegistry();
  const discoveryService = createRouteDiscoveryService(dependencies);
  const documentationGenerator = createDocumentationGenerator();

  return {
    discover: async (): Promise<readonly RouteDefinition[]> => {
      dependencies.logger.info('Starting route discovery...', { 
        patterns: config.discovery.patterns 
      });
      
      try {
        const routes = await discoveryService.discoverRoutes(
          config.discovery.patterns,
          config.discovery.exclude
        );
        
        routes.forEach(route => registry.register(route));
        
        dependencies.logger.info('Route discovery completed', { 
          routeCount: routes.length 
        });
        
        return routes;
      } catch (error) {
        dependencies.logger.error('Route discovery failed', { error });
        throw error;
      }
    },

    register: async <TApp>(app: TApp, adapter: FrameworkAdapter<TApp>): Promise<void> => {
      const routes = registry.getRoutes();
      dependencies.logger.info('Registering routes...', { routeCount: routes.length });

      for (const route of routes) {
        try {
          await adapter.registerRoute(app, route);
        } catch (error) {
          dependencies.logger.error('Failed to register route', {
            method: route.metadata.method,
            path: route.metadata.path,
            error
          });
          throw error;
        }
      }

      dependencies.logger.info('All routes registered successfully');
    },

    generateOpenAPI: async (): Promise<OpenAPISpec> => {
      const routes = registry.getRoutes();
      return documentationGenerator.generateSpec(routes, config.api);
    }
  };
};
```

### 5. **Simple Setup - App.ts**

```typescript
// app.ts
import { createUnifiedRouteManager } from './foundations/unified-route-manager';
import { createUserRoutes } from './routes/user/user-routes';
import { createOrderRoutes } from './routes/order/order-routes';

const setupApplication = async () => {
  // Create dependencies manually (or use a simple factory)
  const dependencies: Dependencies = {
    logger: createLogger({ level: 'info' }),
    userService: createUserService(createUserRepository()),
    authService: createAuthService({ secret: process.env.JWT_SECRET }),
    cacheService: createCacheService({ ttl: 300 })
  };

  // Create routes
  const userRoutes = createUserRoutes(dependencies);
  const orderRoutes = createOrderRoutes(dependencies);
  
  // Setup route manager
  const routeManager = createUnifiedRouteManager(
    {
      discovery: {
        patterns: ['./routes/**/*.route.ts']
      },
      api: {
        title: 'My API',
        version: '1.0.0',
        description: 'Functional route management'
      }
    },
    dependencies
  );

  // Register with framework
  const app = fastify();
  const adapter = createFastifyAdapter();
  
  await routeManager.discover();
  await routeManager.register(app, adapter);

  return app;
};

setupApplication()
  .then(app => app.listen({ port: 3000 }))
  .catch(console.error);
```

## 🎯 **Benefits of No DI Container**

### ✅ **Simplicity**
```typescript
// No complex DI setup needed
const dependencies = {
  logger: createLogger(),
  userService: createUserService()
};

// Direct dependency injection
const routes = createUserRoutes(dependencies);
```

### ✅ **Better Testing**
```typescript
describe('createUserRoute', () => {
  it('should create user successfully', async () => {
    // Easy mocking
    const mockDependencies: Dependencies = {
      logger: createMockLogger(),
      userService: {
        createUser: jest.fn().mockResolvedValue({ id: '1', email: 'test@test.com' })
      },
      authService: createMockAuthService(),
      cacheService: createMockCacheService()
    };

    const route = createUserRoute(mockDependencies);
    
    // Test the route
    const mockContext = createMockContext({
      body: { email: 'test@test.com', name: 'Test' }
    });

    await route.handler(mockContext);

    expect(mockDependencies.userService.createUser).toHaveBeenCalled();
    expect(mockContext.response.status).toHaveBeenCalledWith(201);
  });
});
```

### ✅ **Type Safety**
```typescript
// Compile-time dependency checking
const createUserRoute = (deps: Dependencies) => {
  // TypeScript ensures all required dependencies are provided
  const { logger, userService } = deps; // ✅ Type safe
  
  return createValidatedRoute(/* ... */);
};
```

### ✅ **Performance**
- No reflection or complex object graph resolution
- Direct function calls
- Minimal runtime overhead
- Tree-shaking friendly

## 🔄 **Optional: Lightweight DI Pattern**

If you still want some DI-like behavior but simpler:

```typescript
// Simple service locator pattern
export const createServiceRegistry = (config: AppConfig) => {
  const services = new Map<string, unknown>();

  // Lazy initialization
  const get = <T>(key: string, factory: () => T): T => {
    if (!services.has(key)) {
      services.set(key, factory());
    }
    return services.get(key) as T;
  };

  return {
    logger: () => get('logger', () => createLogger(config.logger)),
    userService: () => get('userService', () => createUserService(
      get('userRepository', () => createUserRepository(config.database))
    )),
    authService: () => get('authService', () => createAuthService(config.auth))
  };
};

// Usage
const services = createServiceRegistry(appConfig);

const dependencies: Dependencies = {
  logger: services.logger(),
  userService: services.userService(),
  authService: services.authService(),
  cacheService: services.cacheService()
};
```

## 🎪 **Summary: Why No DI Container?**

| Aspect | DI Container | Pure Functions |
|--------|-------------|----------------|
| **Complexity** | High setup | Simple parameters |
| **Testing** | Complex mocking | Direct injection |
| **Type Safety** | Runtime resolution | Compile-time |
| **Performance** | Reflection overhead | Direct calls |
| **Debugging** | Complex stack traces | Clear call paths |

**Bottom Line:** ใน functional style, pure functions + factory patterns มักจะง่ายและ maintainable กว่า complex DI containers!