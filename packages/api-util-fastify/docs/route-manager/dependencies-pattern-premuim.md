# Specific Dependencies Pattern for Different Routes

## 🎯 **Problem: Different Routes Need Different Dependencies**

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

## 🔧 **Solution 1: Generic Dependencies Pattern (Recommended)**

```typescript
// foundations/unified-route-manager/dependency-types.ts

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

export interface ReportDependencies extends BaseDependencies {
  readonly reportService: ReportService;
  readonly fileService: FileService;
  readonly s3Service: S3Service;
}

export interface OrderDependencies extends BaseDependencies {
  readonly orderService: OrderService;
  readonly inventoryService: InventoryService;
  readonly shippingService: ShippingService;
}

// Generic route factory
export const createRouteWithDeps = <TDeps extends BaseDependencies>(
  dependencies: TDeps
) => {
  return <TParams = unknown, TBody = unknown, TQuery = unknown>(
    metadata: RouteMetadata,
    schemas: ValidationSchemas<TParams, TBody, TQuery>,
    handler: (
      validated: ValidatedData<TParams, TBody, TQuery>,
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

### **Usage Example:**

```typescript
// routes/user/user-routes.ts
export const createUserRoutes = (deps: UserDependencies) => {
  const createRoute = createRouteWithDeps(deps);

  const createUser = createRoute(
    {
      method: 'POST',
      path: '/users',
      tags: ['users'],
      auth: { required: false },
      version: 'v1'
    },
    { body: CreateUserSchema },
    async (validated, context, deps) => {
      // deps is typed as UserDependencies
      const user = await deps.userService.createUser(validated.body);
      await deps.emailService.sendWelcomeEmail(user.email);
      deps.logger.info('User created', { userId: user.id });
      
      context.response.status(201);
      context.response.json(user);
    }
  );

  const getUsers = createRoute(
    {
      method: 'GET',
      path: '/users',
      tags: ['users'],
      auth: { required: true },
      version: 'v1'
    },
    { query: GetUsersQuerySchema },
    async (validated, context, deps) => {
      // Cache check
      const cacheKey = `users:${JSON.stringify(validated.query)}`;
      const cached = await deps.cacheService.get(cacheKey);
      
      if (cached) {
        context.response.json(cached);
        return;
      }

      const users = await deps.userService.getUsers(validated.query);
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
      auth: { required: true },
      version: 'v1'
    },
    { body: ProcessPaymentSchema },
    async (validated, context, deps) => {
      // deps is typed as PaymentDependencies
      const payment = await deps.paymentService.processPayment(validated.body);
      
      // Log for audit
      await deps.auditService.logPayment(payment);
      
      // Send notification
      await deps.notificationService.notifyPaymentSuccess(payment);
      
      deps.logger.info('Payment processed', { paymentId: payment.id });
      
      context.response.status(201);
      context.response.json(payment);
    }
  );

  return { processPayment };
};
```

## 🔧 **Solution 2: Modular Dependencies with Service Registry**

```typescript
// foundations/unified-route-manager/service-registry.ts
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

// Dependency injection helpers
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
  
  return <TParams = unknown, TBody = unknown, TQuery = unknown>(
    metadata: RouteMetadata,
    schemas: ValidationSchemas<TParams, TBody, TQuery>,
    handler: (
      validated: ValidatedData<TParams, TBody, TQuery>,
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

### **Usage:**

```typescript
// routes/user/create-user.route.ts
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
      auth: { required: false },
      version: 'v1'
    },
    { body: CreateUserSchema },
    async (validated, context, services) => {
      // services is typed as Pick<ServiceRegistry, 'logger' | 'userService' | 'emailService'>
      const user = await services.userService.createUser(validated.body);
      await services.emailService.sendWelcomeEmail(user.email);
      services.logger.info('User created', { userId: user.id });
      
      context.response.status(201);
      context.response.json(user);
    }
  );
};

// routes/payment/process-payment.route.ts
export const processPaymentRoute = (registry: ServiceRegistry) => {
  const createRoute = createRouteWithServices(
    registry,
    ['logger', 'paymentService', 'notificationService'] as const
  );

  return createRoute(
    {
      method: 'POST',
      path: '/payments',
      tags: ['payments'],
      auth: { required: true },
      version: 'v1'
    },
    { body: ProcessPaymentSchema },
    async (validated, context, services) => {
      // services is typed as Pick<ServiceRegistry, 'logger' | 'paymentService' | 'notificationService'>
      const payment = await services.paymentService.processPayment(validated.body);
      await services.notificationService.notifyPaymentSuccess(payment);
      services.logger.info('Payment processed', { paymentId: payment.id });
      
      context.response.status(201);
      context.response.json(payment);
    }
  );
};
```

## 🔧 **Solution 3: Hook-based Dependencies (React-like)**

```typescript
// foundations/unified-route-manager/hooks.ts
export const useDependencies = <TDeps>(dependencies: TDeps) => dependencies;

export const useUserServices = (registry: ServiceRegistry) => 
  useDependencies({
    logger: registry.logger,
    userService: registry.userService,
    emailService: registry.emailService,
    cacheService: registry.cacheService
  });

export const usePaymentServices = (registry: ServiceRegistry) =>
  useDependencies({
    logger: registry.logger,
    paymentService: registry.paymentService,
    notificationService: registry.notificationService,
    auditService: registry.auditService
  });

// Route factory with hooks
export const createRouteWithHook = <TDeps>(
  useHook: (registry: ServiceRegistry) => TDeps,
  registry: ServiceRegistry
) => {
  const dependencies = useHook(registry);
  
  return <TParams = unknown, TBody = unknown, TQuery = unknown>(
    metadata: RouteMetadata,
    schemas: ValidationSchemas<TParams, TBody, TQuery>,
    handler: (
      validated: ValidatedData<TParams, TBody, TQuery>,
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

### **Usage:**

```typescript
// routes/user/user-routes.ts
export const createUserRoutes = (registry: ServiceRegistry) => {
  const createRoute = createRouteWithHook(useUserServices, registry);

  const createUser = createRoute(
    { method: 'POST', path: '/users', /* ... */ },
    { body: CreateUserSchema },
    async (validated, context, deps) => {
      // deps has only user-related services
      const user = await deps.userService.createUser(validated.body);
      await deps.emailService.sendWelcomeEmail(user.email);
      // deps.paymentService ❌ Not available (type error)
    }
  );

  return { createUser };
};
```

## 🔧 **Solution 4: Function Composition Pattern**

```typescript
// foundations/unified-route-manager/composition.ts
export const withUserServices = (handler: RouteHandlerWithDeps<UserDependencies>) =>
  (userDeps: UserDependencies) => handler;

export const withPaymentServices = (handler: RouteHandlerWithDeps<PaymentDependencies>) =>
  (paymentDeps: PaymentDependencies) => handler;

type RouteHandlerWithDeps<TDeps> = (
  validated: ValidatedData,
  context: UnifiedHttpContext,
  deps: TDeps
) => Promise<void>;

// Compose route with specific dependencies
export const composeRoute = <TDeps>(
  metadata: RouteMetadata,
  schemas: ValidationSchemas,
  withServices: (handler: RouteHandlerWithDeps<TDeps>) => (deps: TDeps) => RouteHandlerWithDeps<TDeps>,
  handler: RouteHandlerWithDeps<TDeps>
) => (deps: TDeps): RouteDefinition => {
  const composedHandler = withServices(handler)(deps);
  
  return createValidatedRoute(
    metadata,
    schemas,
    async (validated, context) => {
      await composedHandler(validated, context, deps);
    }
  );
};
```

## 🎯 **Recommended Approach: Solution 1 + Service Registry**

```typescript
// app.ts - Setup
const setupApplication = async () => {
  // Create all services
  const serviceRegistry: ServiceRegistry = {
    logger: createLogger(),
    userService: createUserService(),
    emailService: createEmailService(),
    paymentService: createPaymentService(),
    notificationService: createNotificationService(),
    cacheService: createCacheService(),
    fileService: createFileService(),
    s3Service: createS3Service()
  };

  // Create domain-specific dependencies
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

  // Create routes
  const userRoutes = createUserRoutes(userDeps);
  const paymentRoutes = createPaymentRoutes(paymentDeps);

  // Register routes
  const allRoutes = [
    ...Object.values(userRoutes),
    ...Object.values(paymentRoutes)
  ];

  const app = fastify();
  const adapter = createFastifyAdapter();

  for (const route of allRoutes) {
    await adapter.registerRoute(app, route);
  }

  return app;
};
```

## ✨ **Benefits of Specific Dependencies**

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

## 🎪 **Summary**

**แนะนำ Solution 1** เพราะ:
- 🎯 Type safe dependencies
- 🧪 Easy testing
- 📦 Clear domain separation  
- ⚡ Better performance
- 🔧 Simple to understand