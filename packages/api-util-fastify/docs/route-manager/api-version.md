# API Versioning & Deployment Strategy

## 🎯 **API Versioning Strategies**

### **1. URL Path Versioning (แนะนำ)**

```typescript
// routes/v1/user/user-routes.ts
export const createUserRoutesV1 = (deps: UserDependencies) => {
  const createRoute = createRouteWithDeps(deps);

  const createUser = createRoute(
    {
      method: 'POST',
      path: '/v1/users',           // Version in URL
      tags: ['users', 'v1'],
      summary: 'Create user (v1)',
      version: 'v1',
      auth: { required: false },
    },
    { body: CreateUserSchemaV1 },   // V1 schema
    async (validated, context, deps) => {
      const user = await deps.userService.createUser(validated.body);
      
      // V1 response format
      context.response.status(201);
      context.response.json({
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt
      });
    }
  );

  return { createUser };
};

// routes/v2/user/user-routes.ts
export const createUserRoutesV2 = (deps: UserDependencies) => {
  const createRoute = createRouteWithDeps(deps);

  const createUser = createRoute(
    {
      method: 'POST',
      path: '/v2/users',           // New version
      tags: ['users', 'v2'],
      summary: 'Create user (v2)',
      version: 'v2',
      auth: { required: true },    // V2 requires auth
    },
    { body: CreateUserSchemaV2 },   // Enhanced V2 schema
    async (validated, context, deps) => {
      const user = await deps.userService.createUser(validated.body);
      
      // V2 enhanced response format
      context.response.status(201);
      context.response.json({
        data: {
          id: user.id,
          email: user.email,
          profile: {
            firstName: user.firstName,
            lastName: user.lastName,
            displayName: user.displayName
          },
          preferences: user.preferences,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        },
        meta: {
          version: 'v2',
          apiVersion: '2.0.0'
        }
      });
    }
  );

  return { createUser };
};

// V1 Schema
const CreateUserSchemaV1 = z.object({
  email: z.string().email(),
  name: z.string().min(2)
});

// V2 Enhanced Schema
const CreateUserSchemaV2 = z.object({
  email: z.string().email(),
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  preferences: z.object({
    theme: z.enum(['light', 'dark']).default('light'),
    language: z.string().default('en'),
    notifications: z.boolean().default(true)
  }).optional()
});
```

### **2. Header-based Versioning**

```typescript
// Enhanced route factory with header version support
export const createVersionedRoute = <TDeps extends BaseDependencies>(
  dependencies: TDeps,
  supportedVersions: readonly string[] = ['v1', 'v2']
) => {
  return <TParams = unknown, TBody = unknown, TQuery = unknown>(
    handlers: Record<string, {
      metadata: RouteMetadata;
      schemas: ValidationSchemas<TParams, TBody, TQuery>;
      handler: RouteHandler<TDeps>;
    }>
  ): RouteDefinition => {
    
    const versionedHandler: RouteHandler = async (context) => {
      // Get version from header or default to latest
      const requestedVersion = context.request.headers['api-version'] || 
                              context.request.headers['x-api-version'] ||
                              supportedVersions[supportedVersions.length - 1];

      // Find matching handler
      const versionHandler = handlers[requestedVersion];
      if (!versionHandler) {
        context.response.status(400);
        context.response.json({
          error: 'Unsupported API version',
          supportedVersions,
          requestedVersion
        });
        return;
      }

      // Set response version header
      context.response.header('X-API-Version', requestedVersion);
      
      // Execute versioned handler
      await versionHandler.handler(context);
    };

    // Use metadata from the latest version for registration
    const latestVersion = supportedVersions[supportedVersions.length - 1];
    const latestMetadata = handlers[latestVersion].metadata;

    return {
      metadata: latestMetadata,
      handler: versionedHandler,
      middlewareHandlers: []
    };
  };
};

// Usage
export const createVersionedUserRoute = (deps: UserDependencies) => {
  return createVersionedRoute(deps, ['v1', 'v2'])({
    v1: {
      metadata: {
        method: 'POST',
        path: '/users',
        tags: ['users'],
        version: 'v1'
      },
      schemas: { body: CreateUserSchemaV1 },
      handler: async (context) => {
        // V1 implementation
      }
    },
    v2: {
      metadata: {
        method: 'POST',
        path: '/users',
        tags: ['users'],
        version: 'v2'
      },
      schemas: { body: CreateUserSchemaV2 },
      handler: async (context) => {
        // V2 implementation
      }
    }
  });
};
```

## 🔄 **Version Migration Strategy**

### **1. Graceful Deprecation**

```typescript
// foundations/unified-route-manager/deprecation.ts
export interface DeprecationConfig {
  readonly version: string;
  readonly deprecatedAt: Date;
  readonly sunsetAt: Date;
  readonly migrationGuide: string;
  readonly alternativeEndpoint?: string;
}

export const createDeprecatedRoute = <TDeps extends BaseDependencies>(
  dependencies: TDeps,
  deprecationConfig: DeprecationConfig
) => {
  return (
    metadata: RouteMetadata,
    schemas: ValidationSchemas,
    handler: RouteHandler<TDeps>
  ): RouteDefinition => {
    
    const deprecatedHandler: RouteHandler = async (context) => {
      // Add deprecation headers
      context.response.header('X-API-Deprecated', 'true');
      context.response.header('X-API-Sunset', deprecationConfig.sunsetAt.toISOString());
      context.response.header('X-API-Migration-Guide', deprecationConfig.migrationGuide);
      
      if (deprecationConfig.alternativeEndpoint) {
        context.response.header('X-API-Alternative', deprecationConfig.alternativeEndpoint);
      }

      // Log deprecation usage
      dependencies.logger.warn('Deprecated API endpoint accessed', {
        path: context.request.url,
        version: deprecationConfig.version,
        userAgent: context.request.headers['user-agent'],
        ip: context.request.ip
      });

      // Execute original handler
      await handler(context);
    };

    return {
      metadata: {
        ...metadata,
        deprecated: true,
        description: `${metadata.description || ''} [DEPRECATED - Use ${deprecationConfig.alternativeEndpoint || 'newer version'}]`
      },
      handler: deprecatedHandler,
      middlewareHandlers: []
    };
  };
};

// routes/v1/user/deprecated-routes.ts
export const createDeprecatedUserRoutesV1 = (deps: UserDependencies) => {
  const createDeprecatedRoute = createDeprecatedRoute(deps, {
    version: 'v1',
    deprecatedAt: new Date('2024-01-01'),
    sunsetAt: new Date('2024-12-31'),
    migrationGuide: 'https://api-docs.com/migration/v1-to-v2',
    alternativeEndpoint: '/v2/users'
  });

  const createUser = createDeprecatedRoute(
    {
      method: 'POST',
      path: '/v1/users',
      tags: ['users', 'deprecated'],
      summary: 'Create user (deprecated)',
      version: 'v1'
    },
    { body: CreateUserSchemaV1 },
    async (context) => {
      // V1 implementation with deprecation warnings
    }
  );

  return { createUser };
};
```

### **2. Versioned Service Layer**

```typescript
// services/user/versioned-user-service.ts
export interface UserServiceV1 {
  createUser(data: CreateUserRequestV1): Promise<UserResponseV1>;
  getUsers(query: GetUsersQueryV1): Promise<UserListResponseV1>;
}

export interface UserServiceV2 {
  createUser(data: CreateUserRequestV2): Promise<UserResponseV2>;
  getUsers(query: GetUsersQueryV2): Promise<UserListResponseV2>;
  updateUserPreferences(id: string, prefs: UserPreferences): Promise<UserResponseV2>;
}

// Service adapter for backward compatibility
export const createUserServiceAdapter = (
  userServiceV2: UserServiceV2
): UserServiceV1 => ({
  createUser: async (data: CreateUserRequestV1): Promise<UserResponseV1> => {
    // Convert V1 request to V2 format
    const v2Data: CreateUserRequestV2 = {
      email: data.email,
      firstName: data.name.split(' ')[0] || data.name,
      lastName: data.name.split(' ').slice(1).join(' ') || '',
      preferences: {
        theme: 'light',
        language: 'en',
        notifications: true
      }
    };

    const v2Result = await userServiceV2.createUser(v2Data);

    // Convert V2 response back to V1 format
    return {
      id: v2Result.data.id,
      email: v2Result.data.email,
      name: `${v2Result.data.profile.firstName} ${v2Result.data.profile.lastName}`,
      createdAt: v2Result.data.createdAt
    };
  },

  getUsers: async (query: GetUsersQueryV1): Promise<UserListResponseV1> => {
    const v2Result = await userServiceV2.getUsers({
      ...query,
      // Add V2 specific defaults
      sortBy: 'createdAt',
      includeProfile: false
    });

    // Convert V2 response to V1 format
    return {
      users: v2Result.data.map(user => ({
        id: user.id,
        email: user.email,
        name: `${user.profile.firstName} ${user.profile.lastName}`,
        createdAt: user.createdAt
      })),
      pagination: v2Result.pagination
    };
  }
});
```

## 🚀 **Deployment Strategies**

### **1. Blue-Green Deployment with Versioning**

```typescript
// deployment/version-manager.ts
export interface VersionConfig {
  readonly activeVersions: readonly string[];
  readonly defaultVersion: string;
  readonly routingRules: Record<string, VersionRoutingRule>;
}

export interface VersionRoutingRule {
  readonly percentage: number;  // Traffic percentage
  readonly userSegments?: readonly string[];
  readonly features?: readonly string[];
}

export const createVersionManager = (config: VersionConfig) => {
  return {
    getVersionForRequest: (context: UnifiedHttpContext): string => {
      const requestedVersion = context.request.headers['api-version'];
      
      // If specific version requested and supported
      if (requestedVersion && config.activeVersions.includes(requestedVersion)) {
        return requestedVersion;
      }

      // Route based on rules (A/B testing, gradual rollout)
      const userId = context.request.headers['x-user-id'];
      if (userId) {
        // Hash-based routing for consistent user experience
        const hash = createHash('md5').update(userId).digest('hex');
        const hashValue = parseInt(hash.substring(0, 8), 16);
        const percentage = hashValue % 100;

        // Route to v2 if user falls in rollout percentage
        const v2Rule = config.routingRules['v2'];
        if (v2Rule && percentage < v2Rule.percentage) {
          return 'v2';
        }
      }

      return config.defaultVersion;
    },

    isVersionActive: (version: string): boolean => {
      return config.activeVersions.includes(version);
    }
  };
};

// app.ts - Deployment setup
const setupVersionedApplication = async () => {
  const versionConfig: VersionConfig = {
    activeVersions: ['v1', 'v2'],
    defaultVersion: 'v1',
    routingRules: {
      v2: {
        percentage: 20,  // 20% traffic to v2
        userSegments: ['beta-testers', 'premium-users'],
        features: ['advanced-filtering']
      }
    }
  };

  const versionManager = createVersionManager(versionConfig);

  // Create versioned dependencies
  const depsV1: UserDependencies = {
    logger: createLogger(),
    userService: createUserServiceAdapter(userServiceV2), // Backward compatibility
    emailService: createEmailService(),
    cacheService: createCacheService()
  };

  const depsV2: UserDependencies = {
    logger: createLogger(),
    userService: userServiceV2,
    emailService: createEnhancedEmailService(),
    cacheService: createRedisCache()
  };

  // Create versioned routes
  const userRoutesV1 = createUserRoutesV1(depsV1);
  const userRoutesV2 = createUserRoutesV2(depsV2);

  // Register all versions
  const allRoutes = [
    ...Object.values(userRoutesV1),
    ...Object.values(userRoutesV2)
  ];

  const app = fastify();
  const adapter = createFastifyAdapter();

  for (const route of allRoutes) {
    await adapter.registerRoute(app, route);
  }

  return app;
};
```

### **2. Feature Flags Integration**

```typescript
// foundations/unified-route-manager/feature-flags.ts
export interface FeatureFlagService {
  isEnabled(flag: string, context?: { userId?: string; version?: string }): Promise<boolean>;
  getVariant(flag: string, context?: { userId?: string }): Promise<string>;
}

export const createFeatureAwareRoute = <TDeps extends BaseDependencies>(
  dependencies: TDeps & { featureFlags: FeatureFlagService }
) => {
  return (
    metadata: RouteMetadata,
    schemas: ValidationSchemas,
    handlers: {
      default: RouteHandler<TDeps>;
      experimental?: RouteHandler<TDeps>;
      variants?: Record<string, RouteHandler<TDeps>>;
    }
  ): RouteDefinition => {
    
    const featureAwareHandler: RouteHandler = async (context) => {
      const userId = context.request.headers['x-user-id'];
      
      // Check for experimental features
      if (handlers.experimental) {
        const isExperimentalEnabled = await dependencies.featureFlags.isEnabled(
          'experimental-features',
          { userId, version: metadata.version }
        );
        
        if (isExperimentalEnabled) {
          return handlers.experimental(context);
        }
      }

      // Check for A/B test variants
      if (handlers.variants) {
        const variant = await dependencies.featureFlags.getVariant(
          `${metadata.path}-variant`,
          { userId }
        );
        
        if (variant && handlers.variants[variant]) {
          return handlers.variants[variant](context);
        }
      }

      // Default handler
      return handlers.default(context);
    };

    return {
      metadata,
      handler: featureAwareHandler,
      middlewareHandlers: []
    };
  };
};

// Usage
export const createExperimentalUserRoute = (deps: UserDependencies & { featureFlags: FeatureFlagService }) => {
  const createRoute = createFeatureAwareRoute(deps);

  return createRoute(
    {
      method: 'POST',
      path: '/v2/users',
      tags: ['users', 'experimental'],
      version: 'v2'
    },
    { body: CreateUserSchemaV2 },
    {
      default: async (context) => {
        // Standard v2 implementation
        const user = await deps.userService.createUser(context.request.body);
        context.response.json({ data: user });
      },
      experimental: async (context) => {
        // Experimental features (AI-powered user onboarding)
        const user = await deps.userService.createUser(context.request.body);
        const aiRecommendations = await deps.aiService.generateOnboardingSteps(user);
        
        context.response.json({
          data: user,
          onboarding: aiRecommendations,
          experimental: true
        });
      },
      variants: {
        'enhanced-validation': async (context) => {
          // A/B test: Enhanced validation
          const validationResult = await deps.advancedValidator.validate(context.request.body);
          if (!validationResult.isValid) {
            context.response.status(422);
            context.response.json({ errors: validationResult.suggestions });
            return;
          }
          
          const user = await deps.userService.createUser(context.request.body);
          context.response.json({ data: user, validationLevel: 'enhanced' });
        }
      }
    }
  );
};
```

## 📊 **Monitoring & Analytics**

```typescript
// monitoring/version-analytics.ts
export interface VersionMetrics {
  readonly version: string;
  readonly requestCount: number;
  readonly errorRate: number;
  readonly averageResponseTime: number;
  readonly deprecationWarnings: number;
}

export const createVersionMonitoring = (
  metricsCollector: MetricsCollector,
  logger: Logger
) => {
  return {
    trackVersionUsage: async (
      version: string,
      path: string,
      responseTime: number,
      statusCode: number
    ): Promise<void> => {
      await metricsCollector.increment(`api.version.${version}.requests`);
      await metricsCollector.histogram(`api.version.${version}.response_time`, responseTime);
      
      if (statusCode >= 400) {
        await metricsCollector.increment(`api.version.${version}.errors`);
      }

      logger.info('API version usage', {
        version,
        path,
        responseTime,
        statusCode
      });
    },

    getVersionMetrics: async (): Promise<VersionMetrics[]> => {
      // Aggregate metrics for all versions
      return metricsCollector.getVersionMetrics();
    }
  };
};

// Middleware for version tracking
export const createVersionTrackingMiddleware = (
  monitoring: ReturnType<typeof createVersionMonitoring>
): MiddlewareHandler => {
  return async (context: UnifiedHttpContext): Promise<boolean> => {
    const startTime = Date.now();
    const version = context.request.headers['api-version'] || 'v1';
    
    // Track the request
    context.response.header('X-Response-Time-Start', startTime.toString());
    
    // Add response hook
    const originalJson = context.response.json;
    context.response.json = function(data: unknown) {
      const responseTime = Date.now() - startTime;
      const statusCode = context.response.status || 200;
      
      monitoring.trackVersionUsage(version, context.request.url, responseTime, statusCode);
      
      return originalJson.call(this, data);
    };

    return true;
  };
};
```

## 🎯 **Best Practices Summary**

### ✅ **Versioning Strategy**
```typescript
// 1. Use URL path versioning for clarity
/v1/users  // Clear, cacheable, easy to route
/v2/users  // Side-by-side deployment

// 2. Maintain backward compatibility
const serviceV1 = createUserServiceAdapter(serviceV2);

// 3. Gradual rollout with feature flags
const isV2Enabled = await featureFlags.isEnabled('api-v2', { userId });

// 4. Clear deprecation timeline
const deprecationConfig = {
  deprecatedAt: new Date('2024-01-01'),
  sunsetAt: new Date('2024-12-31'),
  migrationGuide: 'https://docs.api.com/migration'
};
```

### ✅ **Deployment Approach**
1. **Blue-Green**: Deploy both versions simultaneously
2. **Canary**: Gradual traffic shift (10% → 50% → 100%)
3. **Feature Flags**: Fine-grained control
4. **Monitoring**: Track version usage and performance

### ✅ **Migration Path**
```typescript
// Phase 1: Deploy v2 alongside v1 (0% traffic)
activeVersions: ['v1', 'v2'], defaultVersion: 'v1'

// Phase 2: Gradual rollout (20% traffic to v2)
routingRules: { v2: { percentage: 20 } }

// Phase 3: Majority traffic (80% to v2)
routingRules: { v2: { percentage: 80 } }

// Phase 4: Full migration (100% to v2)
activeVersions: ['v2'], defaultVersion: 'v2'

// Phase 5: Deprecate v1
deprecationConfig: { sunsetAt: '2024-12-31' }
```

## 🚀 **Production Checklist**

- ✅ Version-specific monitoring and alerting
- ✅ Automated testing for all supported versions  
- ✅ Clear migration documentation
- ✅ Rollback strategy for failed deployments
- ✅ Performance benchmarking between versions
- ✅ Security review for new API versions
- ✅ Client SDK updates and version support