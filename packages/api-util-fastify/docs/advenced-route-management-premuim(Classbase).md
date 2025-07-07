# UnifiedRoute: Advanced Route Management (Premium)

Enterprise-grade route automation with discovery, documentation, and systematic management for complex applications.

> 💎 **Premium Content** - This guide covers advanced route management patterns for enterprise development teams building complex applications with 50+ routes.

## 📚 Prerequisites

This guide assumes you've read:
- [Part 3: Framework-Agnostic Architecture](03-framework-agnostic.md)
- [Part 4: Enterprise Patterns (Free)](04-enterprise-patterns-free.md)

## 📖 Overview: UnifiedRoute System

### Beyond Simple Route Modules

```typescript
// ✅ Simple Route Modules (Free) - Manual but clear
export async function createUserRoute(context: UnifiedHttpContext, command: CreateUserCommand) {
  const userData = validateRequestBodyOrError(context, CreateUserSchema);
  if (!userData) return;
  
  const result = await command.execute(userData);
  sendResponse(context, result, 201);
}

// Manual registration
fastify.post('/users', async (request, reply) => {
  const context = createFastifyContext(request, reply);
  await createUserRoute(context, createUserCommand);
});

// ❌ Problems when scaling to 50+ routes:
// 1. Manual registration becomes tedious and error-prone
// 2. No systematic documentation generation
// 3. Difficult to apply consistent middleware across routes
// 4. Hard to manage API versioning and deprecation
// 5. No centralized security policy management
// 6. Performance monitoring per route is manual
```

```typescript
// 🚀 UnifiedRoute System (Premium) - Systematic automation
@UnifiedRoute({
  method: 'POST',
  path: '/users',
  tags: ['users'],
  auth: { required: false },
  rateLimit: { max: 100, window: '1h' },
  version: 'v1'
})
export class CreateUserRoute implements RouteHandler {
  constructor(private createUserCommand: CreateUserCommand) {}

  async handle(context: UnifiedHttpContext): Promise<void> {
    const userData = validateRequestBodyOrError(context, CreateUserSchema);
    if (!userData) return;
    
    const result = await this.createUserCommand.execute(userData);
    sendResponse(context, result, 201);
  }
}

// Automatic discovery and registration
const routeSystem = new UnifiedRouteSystem();
await routeSystem.discover('./routes/**/*.ts');
await routeSystem.register(app);
await routeSystem.generateOpenAPI('./docs/api.json');
```

## Core UnifiedRoute Architecture

### Route Handler Interface

```typescript
// foundations/unified-route/interfaces.ts
export interface RouteHandler {
  handle(context: UnifiedHttpContext): Promise<void>;
}

export interface RouteMetadata {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  tags?: string[];
  summary?: string;
  description?: string;
  auth?: AuthConfig;
  rateLimit?: RateLimitConfig;
  cache?: CacheConfig;
  version?: string;
  deprecated?: boolean;
  middleware?: string[];
}

export interface AuthConfig {
  required: boolean;
  roles?: string[];
  permissions?: string[];
  scopes?: string[];
}

export interface RateLimitConfig {
  max: number;
  window: string;
  keyGenerator?: string;
}

export interface CacheConfig {
  ttl: number;
  key?: string;
  invalidateOn?: string[];
}

export interface RouteDefinition {
  metadata: RouteMetadata;
  handler: RouteHandler;
  middlewareHandlers?: MiddlewareHandler[];
  constructor: new (...args: any[]) => RouteHandler;
}
```

### UnifiedRoute Decorator

```typescript
// foundations/unified-route/decorator.ts
export function UnifiedRoute(metadata: RouteMetadata) {
  return function <T extends new (...args: any[]) => RouteHandler>(constructor: T) {
    // Store metadata on the constructor
    Reflect.defineMetadata('route:metadata', metadata, constructor);
    
    // Register with global route registry
    RouteRegistry.getInstance().register({
      metadata,
      handler: null as any, // Will be instantiated later
      constructor,
      middlewareHandlers: []
    });
    
    return constructor;
  };
}

// Global route registry
export class RouteRegistry {
  private static instance: RouteRegistry;
  private routes: RouteDefinition[] = [];

  static getInstance(): RouteRegistry {
    if (!RouteRegistry.instance) {
      RouteRegistry.instance = new RouteRegistry();
    }
    return RouteRegistry.instance;
  }

  register(route: RouteDefinition): void {
    this.routes.push(route);
  }

  getRoutes(): RouteDefinition[] {
    return [...this.routes];
  }

  clear(): void {
    this.routes = [];
  }
}
```

## Automatic Route Discovery

### File System Scanner

```typescript
// foundations/unified-route/discovery.ts
export class RouteDiscovery {
  constructor(
    private logger: Logger,
    private container: DIContainer
  ) {}

  async discover(patterns: string[]): Promise<RouteDefinition[]> {
    const files = await this.scanFiles(patterns);
    const routes: RouteDefinition[] = [];

    for (const file of files) {
      try {
        const discovered = await this.loadRouteFile(file);
        routes.push(...discovered);
      } catch (error) {
        this.logger.warn(`Failed to load route file: ${file}`, { error: error.message });
      }
    }

    this.logger.info(`Discovered ${routes.length} routes from ${files.length} files`);
    return routes;
  }

  private async scanFiles(patterns: string[]): Promise<string[]> {
    const glob = require('glob');
    const files: string[] = [];

    for (const pattern of patterns) {
      const matches = await new Promise<string[]>((resolve, reject) => {
        glob(pattern, (err: any, matches: string[]) => {
          if (err) reject(err);
          else resolve(matches);
        });
      });
      
      files.push(...matches);
    }

    return [...new Set(files)]; // Remove duplicates
  }

  private async loadRouteFile(filePath: string): Promise<RouteDefinition[]> {
    // Dynamic import of the route file
    const module = await import(filePath);
    const routes: RouteDefinition[] = [];

    // Find all exported classes with route metadata
    for (const [exportName, exportValue] of Object.entries(module)) {
      if (typeof exportValue === 'function') {
        const metadata = Reflect.getMetadata('route:metadata', exportValue);
        
        if (metadata) {
          // Instantiate the route handler with DI
          const handler = this.instantiateHandler(exportValue as any);
          
          routes.push({
            metadata,
            handler,
            constructor: exportValue as any,
            middlewareHandlers: []
          });
        }
      }
    }

    return routes;
  }

  private instantiateHandler(constructor: new (...args: any[]) => RouteHandler): RouteHandler {
    // Use reflection to get constructor parameters
    const paramTypes = Reflect.getMetadata('design:paramtypes', constructor) || [];
    const dependencies = paramTypes.map((type: any) => {
      // Get dependency from container
      const serviceName = this.getServiceName(type);
      return this.container.get(serviceName);
    });

    return new constructor(...dependencies);
  }

  private getServiceName(type: any): string {
    // Map class types to service names
    const typeMap = new Map([
      ['CreateUserCommand', 'createUserCommand'],
      ['GetUsersQuery', 'getUsersQuery'],
      ['UpdateUserCommand', 'updateUserCommand'],
      ['DeleteUserCommand', 'deleteUserCommand'],
      // Add more mappings as needed
    ]);

    return typeMap.get(type.name) || type.name.toLowerCase();
  }
}
```

### Convention-Based Discovery

```typescript
// Alternative: Convention-based discovery
export class ConventionBasedDiscovery {
  async discover(baseDir: string): Promise<RouteDefinition[]> {
    const routes: RouteDefinition[] = [];
    
    // Scan for route files following naming conventions
    const routeFiles = await this.scanConventionFiles(baseDir);
    
    for (const file of routeFiles) {
      const route = await this.createRouteFromConvention(file);
      if (route) routes.push(route);
    }
    
    return routes;
  }

  private async scanConventionFiles(baseDir: string): Promise<ConventionRouteFile[]> {
    // Look for files matching patterns:
    // - users.get.ts -> GET /users
    // - users.post.ts -> POST /users  
    // - users.[id].get.ts -> GET /users/:id
    // - users.[id].put.ts -> PUT /users/:id
    
    const files = await glob(`${baseDir}/**/*.{get,post,put,delete,patch}.ts`);
    
    return files.map(file => this.parseConventionFile(file));
  }

  private parseConventionFile(filePath: string): ConventionRouteFile {
    const parts = path.basename(filePath, '.ts').split('.');
    const method = parts.pop()!.toUpperCase() as HttpMethod;
    const pathParts = parts.join('.').split('.');
    
    // Convert [id] to :id for path parameters
    const routePath = '/' + pathParts
      .map(part => part.startsWith('[') && part.endsWith(']') 
        ? ':' + part.slice(1, -1) 
        : part)
      .join('/');

    return {
      filePath,
      method,
      path: routePath,
      handlerName: this.generateHandlerName(method, pathParts)
    };
  }

  private async createRouteFromConvention(file: ConventionRouteFile): Promise<RouteDefinition | null> {
    const module = await import(file.filePath);
    const handler = module.default || module[file.handlerName];
    
    if (!handler || typeof handler.handle !== 'function') {
      return null;
    }

    return {
      metadata: {
        method: file.method,
        path: file.path,
        tags: [file.path.split('/')[1]], // First path segment as tag
      },
      handler,
      constructor: handler.constructor,
      middlewareHandlers: []
    };
  }
}

interface ConventionRouteFile {
  filePath: string;
  method: HttpMethod;
  path: string;
  handlerName: string;
}

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
```

## UnifiedRoute System Core

### Main Route System

```typescript
// foundations/unified-route/system.ts
export class UnifiedRouteSystem {
  private routes: RouteDefinition[] = [];
  private middlewareRegistry = new MiddlewareRegistry();
  private openAPIGenerator = new OpenAPIGenerator();
  private performanceMonitor = new RoutePerformanceMonitor();

  constructor(
    private container: DIContainer,
    private logger: Logger,
    private config: UnifiedRouteConfig
  ) {}

  async discover(patterns: string[]): Promise<void> {
    this.logger.info('Starting route discovery', { patterns });
    
    const discovery = new RouteDiscovery(this.logger, this.container);
    this.routes = await discovery.discover(patterns);
    
    // Apply global middleware
    await this.applyGlobalMiddleware();
    
    // Validate routes
    this.validateRoutes();
    
    this.logger.info(`Route discovery completed`, { 
      routeCount: this.routes.length,
      methods: this.getMethodSummary()
    });
  }

  async register(app: any): Promise<void> {
    this.logger.info('Registering routes with application');
    
    const adapter = this.createFrameworkAdapter(app);
    
    for (const route of this.routes) {
      try {
        await this.registerRoute(adapter, route);
      } catch (error) {
        this.logger.error(`Failed to register route ${route.metadata.method} ${route.metadata.path}`, {
          error: error.message
        });
        throw error;
      }
    }
    
    this.logger.info('Route registration completed', {
      registeredRoutes: this.routes.length
    });
  }

  async generateOpenAPI(outputPath?: string): Promise<OpenAPISpec> {
    const spec = await this.openAPIGenerator.generate(this.routes, {
      title: this.config.api.title,
      version: this.config.api.version,
      description: this.config.api.description
    });

    if (outputPath) {
      await fs.writeFile(outputPath, JSON.stringify(spec, null, 2));
      this.logger.info(`OpenAPI specification generated: ${outputPath}`);
    }

    return spec;
  }

  getRoutes(): RouteDefinition[] {
    return [...this.routes];
  }

  getMetrics(): RouteSystemMetrics {
    return {
      totalRoutes: this.routes.length,
      byMethod: this.getMethodSummary(),
      byVersion: this.getVersionSummary(),
      byTag: this.getTagSummary(),
      performance: this.performanceMonitor.getOverallMetrics()
    };
  }

  private async applyGlobalMiddleware(): Promise<void> {
    const globalMiddleware = this.config.middleware?.global || [];
    
    for (const route of this.routes) {
      // Add global middleware to each route
      route.middlewareHandlers = [
        ...globalMiddleware.map(name => this.middlewareRegistry.get(name)),
        ...(route.middlewareHandlers || [])
      ].filter(Boolean);
    }
  }

  private validateRoutes(): void {
    const pathMap = new Map<string, RouteDefinition>();
    
    for (const route of this.routes) {
      const key = `${route.metadata.method}:${route.metadata.path}`;
      
      if (pathMap.has(key)) {
        throw new Error(`Duplicate route: ${key}`);
      }
      
      pathMap.set(key, route);
      
      // Validate path parameters
      this.validatePathParameters(route);
    }
  }

  private validatePathParameters(route: RouteDefinition): void {
    const pathParams = route.metadata.path.match(/:([^/]+)/g) || [];
    
    for (const param of pathParams) {
      const paramName = param.substring(1);
      
      // Validate parameter name
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(paramName)) {
        throw new Error(`Invalid parameter name: ${param} in route ${route.metadata.path}`);
      }
    }
  }

  private createFrameworkAdapter(app: any): FrameworkAdapter {
    // Detect framework type and create appropriate adapter
    if (app.register && app.listen) {
      return new FastifyAdapter(app);
    } else if (app.use && app.listen) {
      return new ExpressAdapter(app);
    } else {
      throw new Error('Unsupported framework');
    }
  }

  private async registerRoute(adapter: FrameworkAdapter, route: RouteDefinition): Promise<void> {
    // Create unified handler that wraps the route handler
    const unifiedHandler = this.createUnifiedHandler(route);
    
    // Register with framework
    await adapter.register(route.metadata, unifiedHandler);
    
    // Setup performance monitoring
    this.performanceMonitor.trackRoute(route);
  }

  private createUnifiedHandler(route: RouteDefinition): FrameworkHandler {
    return async (req: any, res: any) => {
      const startTime = Date.now();
      const context = this.createUnifiedContext(req, res);
      
      try {
        // Execute middleware chain
        for (const middleware of route.middlewareHandlers || []) {
          await middleware.handle(context);
        }
        
        // Execute main handler
        await route.handler.handle(context);
        
        // Record metrics
        this.performanceMonitor.recordSuccess(route, Date.now() - startTime);
        
      } catch (error) {
        this.performanceMonitor.recordError(route, Date.now() - startTime);
        this.logger.error(`Route handler error: ${route.metadata.method} ${route.metadata.path}`, {
          error: error.message,
          stack: error.stack
        });
        
        // Send error response
        this.handleRouteError(context, error);
      }
    };
  }

  private createUnifiedContext(req: any, res: any): UnifiedHttpContext {
    // Framework detection and context creation
    if (req.server && req.server.name === 'fastify') {
      return createFastifyContext(req, res);
    } else {
      return createExpressContext(req, res);
    }
  }

  private handleRouteError(context: UnifiedHttpContext, error: unknown): void {
    if (error instanceof ValidationError) {
      sendError(context, error.message, 422);
    } else if (error instanceof AuthorizationError) {
      sendError(context, 'Access denied', 403);
    } else {
      sendError(context, 'Internal server error', 500);
    }
  }

  private getMethodSummary(): Record<string, number> {
    return this.routes.reduce((acc, route) => {
      acc[route.metadata.method] = (acc[route.metadata.method] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private getVersionSummary(): Record<string, number> {
    return this.routes.reduce((acc, route) => {
      const version = route.metadata.version || 'unversioned';
      acc[version] = (acc[version] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private getTagSummary(): Record<string, number> {
    const tagCounts: Record<string, number> = {};
    
    for (const route of this.routes) {
      for (const tag of route.metadata.tags || []) {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      }
    }
    
    return tagCounts;
  }
}

// Configuration interface
export interface UnifiedRouteConfig {
  api: {
    title: string;
    version: string;
    description: string;
  };
  middleware?: {
    global?: string[];
  };
  monitoring?: {
    enabled: boolean;
    slowThreshold: number;
  };
}

// Metrics interface
export interface RouteSystemMetrics {
  totalRoutes: number;
  byMethod: Record<string, number>;
  byVersion: Record<string, number>;
  byTag: Record<string, number>;
  performance: PerformanceMetrics;
}
```

## Framework Adapters

### Fastify Adapter

```typescript
// foundations/unified-route/adapters/fastify.adapter.ts
export class FastifyAdapter implements FrameworkAdapter {
  constructor(private app: FastifyInstance) {}

  async register(metadata: RouteMetadata, handler: FrameworkHandler): Promise<void> {
    const method = metadata.method.toLowerCase() as 'get' | 'post' | 'put' | 'delete' | 'patch';
    
    const options: any = {
      schema: this.buildFastifySchema(metadata),
      preHandler: this.buildPreHandlers(metadata)
    };

    this.app[method](metadata.path, options, async (request, reply) => {
      await handler(request, reply);
    });
  }

  private buildFastifySchema(metadata: RouteMetadata): any {
    const schema: any = {};
    
    if (metadata.summary) {
      schema.description = metadata.summary;
    }
    
    if (metadata.tags) {
      schema.tags = metadata.tags;
    }
    
    // Add more schema building logic here
    return schema;
  }

  private buildPreHandlers(metadata: RouteMetadata): any[] {
    const preHandlers: any[] = [];
    
    // Add authentication handler
    if (metadata.auth?.required) {
      preHandlers.push(async (request: any, reply: any) => {
        // Authentication logic
        const token = request.headers.authorization?.replace('Bearer ', '');
        if (!token) {
          reply.status(401).send({ error: 'Authentication required' });
          return;
        }
        
        // Validate token and set user
        request.user = await this.validateToken(token);
      });
    }
    
    // Add rate limiting
    if (metadata.rateLimit) {
      preHandlers.push(async (request: any, reply: any) => {
        const rateLimiter = new RateLimiter(metadata.rateLimit!);
        const allowed = await rateLimiter.check(request.ip);
        
        if (!allowed) {
          reply.status(429).send({ error: 'Rate limit exceeded' });
          return;
        }
      });
    }
    
    return preHandlers;
  }

  private async validateToken(token: string): Promise<any> {
    // Token validation logic
    return { id: '1', email: 'user@example.com' };
  }
}
```

### Express Adapter

```typescript
// foundations/unified-route/adapters/express.adapter.ts
export class ExpressAdapter implements FrameworkAdapter {
  constructor(private app: Express) {}

  async register(metadata: RouteMetadata, handler: FrameworkHandler): Promise<void> {
    const method = metadata.method.toLowerCase();
    const middleware = this.buildMiddleware(metadata);
    
    (this.app as any)[method](metadata.path, ...middleware, async (req: any, res: any) => {
      await handler(req, res);
    });
  }

  private buildMiddleware(metadata: RouteMetadata): any[] {
    const middleware: any[] = [];
    
    // Authentication middleware
    if (metadata.auth?.required) {
      middleware.push(async (req: any, res: any, next: any) => {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
          return res.status(401).json({ error: 'Authentication required' });
        }
        
        req.user = await this.validateToken(token);
        next();
      });
    }
    
    // Rate limiting middleware
    if (metadata.rateLimit) {
      middleware.push(async (req: any, res: any, next: any) => {
        const rateLimiter = new RateLimiter(metadata.rateLimit!);
        const allowed = await rateLimiter.check(req.ip);
        
        if (!allowed) {
          return res.status(429).json({ error: 'Rate limit exceeded' });
        }
        
        next();
      });
    }
    
    return middleware;
  }

  private async validateToken(token: string): Promise<any> {
    // Token validation logic
    return { id: '1', email: 'user@example.com' };
  }
}

// Framework adapter interface
export interface FrameworkAdapter {
  register(metadata: RouteMetadata, handler: FrameworkHandler): Promise<void>;
}

export type FrameworkHandler = (req: any, res: any) => Promise<void>;
```

## OpenAPI Generation

### OpenAPI Generator

```typescript
// foundations/unified-route/openapi.generator.ts
export class OpenAPIGenerator {
  constructor(private schemaRegistry: SchemaRegistry) {}

  async generate(routes: RouteDefinition[], apiInfo: APIInfo): Promise<OpenAPISpec> {
    const spec: OpenAPISpec = {
      openapi: '3.0.3',
      info: {
        title: apiInfo.title,
        version: apiInfo.version,
        description: apiInfo.description
      },
      paths: {},
      components: {
        schemas: {},
        securitySchemes: this.generateSecuritySchemes()
      }
    };

    // Generate paths from routes
    for (const route of routes) {
      this.addRouteToSpec(spec, route);
    }

    // Generate schemas
    spec.components.schemas = this.generateSchemas(routes);

    return spec;
  }

  private addRouteToSpec(spec: OpenAPISpec, route: RouteDefinition): void {
    const path = route.metadata.path;
    const method = route.metadata.method.toLowerCase();

    // Initialize path object if it doesn't exist
    if (!spec.paths[path]) {
      spec.paths[path] = {};
    }

    // Create operation object
    const operation: OpenAPIOperation = {
      tags: route.metadata.tags,
      summary: route.metadata.summary,
      description: route.metadata.description,
      operationId: this.generateOperationId(route),
      parameters: this.generateParameters(route),
      responses: this.generateResponses(route),
    };

    // Add request body for POST/PUT/PATCH
    if (['post', 'put', 'patch'].includes(method)) {
      operation.requestBody = this.generateRequestBody(route);
    }

    // Add security requirements
    if (route.metadata.auth?.required) {
      operation.security = this.generateSecurity(route.metadata.auth);
    }

    // Add deprecation notice
    if (route.metadata.deprecated) {
      operation.deprecated = true;
    }

    spec.paths[path][method] = operation;
  }

  private generateOperationId(route: RouteDefinition): string {
    const method = route.metadata.method.toLowerCase();
    const pathParts = route.metadata.path
      .split('/')
      .filter(part => part && !part.startsWith(':'))
      .map(part => part.charAt(0).toUpperCase() + part.slice(1));

    return method + pathParts.join('');
  }

  private generateParameters(route: RouteDefinition): OpenAPIParameter[] {
    const parameters: OpenAPIParameter[] = [];

    // Extract path parameters
    const pathParams = route.metadata.path.match(/:([^/]+)/g) || [];
    for (const param of pathParams) {
      const paramName = param.substring(1);
      parameters.push({
        name: paramName,
        in: 'path',
        required: true,
        schema: { type: 'string' },
        description: `${paramName} identifier`
      });
    }

    // Add query parameters for GET requests
    if (route.metadata.method === 'GET') {
      parameters.push(
        {
          name: 'page',
          in: 'query',
          required: false,
          schema: { type: 'integer', minimum: 1, default: 1 },
          description: 'Page number for pagination'
        },
        {
          name: 'limit',
          in: 'query',
          required: false,
          schema: { type: 'integer', minimum: 1, maximum: 100, default: 10 },
          description: 'Number of items per page'
        }
      );
    }

    return parameters;
  }

  private generateRequestBody(route: RouteDefinition): OpenAPIRequestBody {
    const schemaName = this.getRequestSchemaName(route);
    
    return {
      required: true,
      content: {
        'application/json': {
          schema: {
            $ref: `#/components/schemas/${schemaName}`
          }
        }
      }
    };
  }

  private generateResponses(route: RouteDefinition): Record<string, OpenAPIResponse> {
    const responses: Record<string, OpenAPIResponse> = {};

    // Success response
    const successCode = route.metadata.method === 'POST' ? '201' : '200';
    const responseSchemaName = this.getResponseSchemaName(route);
    
    responses[successCode] = {
      description: 'Successful operation',
      content: {
        'application/json': {
          schema: {
            $ref: `#/components/schemas/${responseSchemaName}`
          }
        }
      }
    };

    // Error responses
    if (route.metadata.auth?.required) {
      responses['401'] = {
        description: 'Unauthorized',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' }
          }
        }
      };
    }

    responses['422'] = {
      description: 'Validation Error',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/ValidationErrorResponse' }
        }
      }
    };

    responses['500'] = {
      description: 'Internal Server Error',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/ErrorResponse' }
        }
      }
    };

    return responses;
  }

  private generateSchemas(routes: RouteDefinition[]): Record<string, OpenAPISchema> {
    const schemas: Record<string, OpenAPISchema> = {};

    // Standard error schemas
    schemas.ErrorResponse = {
      type: 'object',
      properties: {
        error: { type: 'string' },
        timestamp: { type: 'string', format: 'date-time' }
      },
      required: ['error', 'timestamp']
    };

    schemas.ValidationErrorResponse = {
      type: 'object',
      properties: {
        error: { type: 'string' },
        code: { type: 'string' },
        details: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              field: { type: 'string' },
              message: { type: 'string' },
              code: { type: 'string' }
            }
          }
        },
        timestamp: { type: 'string', format: 'date-time' }
      },
      required: ['error', 'timestamp']
    };

    // Generate schemas from registered Zod schemas
    for (const route of routes) {
      const requestSchemaName = this.getRequestSchemaName(route);
      const responseSchemaName = this.getResponseSchemaName(route);

      // Get schema from registry
      const requestSchema = this.schemaRegistry.get(requestSchemaName);
      const responseSchema = this.schemaRegistry.get(responseSchemaName);

      if (requestSchema) {
        schemas[requestSchemaName] = this.zodToOpenAPISchema(requestSchema);
      }

      if (responseSchema) {
        schemas[responseSchemaName] = this.zodToOpenAPISchema(responseSchema);
      }
    }

    return schemas;
  }

  private zodToOpenAPISchema(zodSchema: any): OpenAPISchema {
    // Convert Zod schema to OpenAPI schema
    // This is a simplified implementation
    return {
      type: 'object',
      properties: {
        // Add property mapping logic here
      }
    };
  }

  private getRequestSchemaName(route: RouteDefinition): string {
    const pathSegments = route.metadata.path.split('/').filter(Boolean);
    const resource = pathSegments[0] || 'default';
    const action = route.metadata.method.toLowerCase();
    
    return `${resource}${action.charAt(0).toUpperCase() + action.slice(1)}Request`;
  }

  private getResponseSchemaName(route: RouteDefinition): string {
    const pathSegments = route.metadata.path.split('/').filter(Boolean);
    const resource = pathSegments[0] || 'default';
    const action = route.metadata.method.toLowerCase();
    
    return `${resource}${action.charAt(0).toUpperCase() + action.slice(1)}Response`;
  }

  private generateSecuritySchemes(): Record<string, OpenAPISecurityScheme> {
    return {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      },
      apiKey: {
        type: 'apiKey',
        in: 'header',
        name: 'X-API-Key'
      }
    };
  }

  private generateSecurity(authConfig: AuthConfig): OpenAPISecurityRequirement[] {
    return [
      { bearerAuth: authConfig.scopes || [] }
    ];
  }
}

// OpenAPI interfaces
interface OpenAPISpec {
  openapi: string;
  info: APIInfo;
  paths: Record<string, Record<string, OpenAPIOperation>>;
  components: {
    schemas: Record<string, OpenAPISchema>;
    securitySchemes: Record<string, OpenAPISecurityScheme>;
  };
}

interface APIInfo {
  title: string;
  version: string;
  description: string;
}

interface OpenAPIOperation {
  tags?: string[];
  summary?: string;
  description?: string;
  operationId: string;
  parameters?: OpenAPIParameter[];
  requestBody?: OpenAPIRequestBody;
  responses: Record<string, OpenAPIResponse>;
  security?: OpenAPISecurityRequirement[];
  deprecated?: boolean;
}

interface OpenAPIParameter {
  name: string;
  in: 'path' | 'query' | 'header';
  required: boolean;
  schema: OpenAPISchema;
  description?: string;
}

interface OpenAPIRequestBody {
  required: boolean;
  content: Record<string, { schema: OpenAPISchema }>;
}

interface OpenAPIResponse {
  description: string;
  content?: Record<string, { schema: OpenAPISchema }>;
}

interface OpenAPISchema {
  type?: string;
  properties?: Record<string, OpenAPISchema>;
  required?: string[];
  items?: OpenAPISchema;
  $ref?: string;
  format?: string;
  minimum?: number;
  maximum?: number;
  default?: any;
}

interface OpenAPISecurityScheme {
  type: 'http' | 'apiKey' | 'oauth2';
  scheme?: string;
  bearerFormat?: string;
  in?: string;
  name?: string;
}

type OpenAPISecurityRequirement = Record<string, string[]>;
```

## Real-World Route Examples

### User Management Routes

```typescript
// routes/user/create-user.route.ts
import { UnifiedRoute } from '@inh-lib/unified-route';
import { UnifiedHttpContext, validateRequestBodyOrError, sendResponse } from '@inh-lib/api-util-fastify';

@UnifiedRoute({
  method: 'POST',
  path: '/users',
  tags: ['users'],
  summary: 'Create a new user',
  description: 'Creates a new user account with the provided information',
  auth: { required: false },
  rateLimit: { max: 100, window: '1h' },
  version: 'v1'
})
export class CreateUserRoute implements RouteHandler {
  constructor(private createUserCommand: CreateUserCommand) {}

  async handle(context: UnifiedHttpContext): Promise<void> {
    const userData = validateRequestBodyOrError(context, CreateUserSchema);
    if (!userData) return;

    try {
      const user = await this.createUserCommand.execute(userData);
      sendResponse(context, user, 201);
    } catch (error) {
      if (error.message === 'Email already exists') {
        sendError(context, 'Email address is already registered', 409);
      } else {
        throw error;
      }
    }
  }
}

// routes/user/get-users.route.ts
@UnifiedRoute({
  method: 'GET',
  path: '/users',
  tags: ['users'],
  summary: 'List users',
  description: 'Retrieves a paginated list of users',
  auth: { required: true, roles: ['admin', 'user'] },
  cache: { ttl: 300 }, // 5 minutes
  version: 'v1'
})
export class GetUsersRoute implements RouteHandler {
  constructor(private getUsersQuery: GetUsersQuery) {}

  async handle(context: UnifiedHttpContext): Promise<void> {
    const query = validateQueryOrError(context, GetUsersQuerySchema);
    if (!query) return;

    const result = await this.getUsersQuery.execute(query);
    sendResponse(context, result);
  }
}

// routes/user/get-user-by-id.route.ts
@UnifiedRoute({
  method: 'GET',
  path: '/users/:id',
  tags: ['users'],
  summary: 'Get user by ID',
  description: 'Retrieves a specific user by their unique identifier',
  auth: { required: true },
  version: 'v1'
})
export class GetUserByIdRoute implements RouteHandler {
  constructor(private getUserQuery: GetUserQuery) {}

  async handle(context: UnifiedHttpContext): Promise<void> {
    const params = validateParamsOrError(context, UserParamsSchema);
    if (!params) return;

    const user = await this.getUserQuery.execute(params.id);
    
    if (!user) {
      sendError(context, 'User not found', 404);
      return;
    }

    sendResponse(context, user);
  }
}

// routes/user/update-user.route.ts
@UnifiedRoute({
  method: 'PUT',
  path: '/users/:id',
  tags: ['users'],
  summary: 'Update user',
  description: 'Updates an existing user with new information',
  auth: { required: true, permissions: ['users:write'] },
  version: 'v1'
})
export class UpdateUserRoute implements RouteHandler {
  constructor(private updateUserCommand: UpdateUserCommand) {}

  async handle(context: UnifiedHttpContext): Promise<void> {
    const params = validateParamsOrError(context, UserParamsSchema);
    if (!params) return;

    const updateData = validateRequestBodyOrError(context, UpdateUserSchema);
    if (!updateData) return;

    const user = await this.updateUserCommand.execute(params.id, updateData);
    
    if (!user) {
      sendError(context, 'User not found', 404);
      return;
    }

    sendResponse(context, user);
  }
}

// routes/user/delete-user.route.ts
@UnifiedRoute({
  method: 'DELETE',
  path: '/users/:id',
  tags: ['users'],
  summary: 'Delete user',
  description: 'Permanently deletes a user account',
  auth: { required: true, roles: ['admin'] },
  version: 'v1'
})
export class DeleteUserRoute implements RouteHandler {
  constructor(private deleteUserCommand: DeleteUserCommand) {}

  async handle(context: UnifiedHttpContext): Promise<void> {
    const params = validateParamsOrError(context, UserParamsSchema);
    if (!params) return;

    const deleted = await this.deleteUserCommand.execute(params.id);
    
    if (!deleted) {
      sendError(context, 'User not found', 404);
      return;
    }

    sendResponse(context, { message: 'User deleted successfully' });
  }
}
```

### Order Management Routes

```typescript
// routes/order/create-order.route.ts
@UnifiedRoute({
  method: 'POST',
  path: '/orders',
  tags: ['orders'],
  summary: 'Create new order',
  description: 'Creates a new order with items and payment information',
  auth: { required: true },
  rateLimit: { max: 50, window: '1h' },
  version: 'v1'
})
export class CreateOrderRoute implements RouteHandler {
  constructor(private createOrderCommand: CreateOrderCommand) {}

  async handle(context: UnifiedHttpContext): Promise<void> {
    const orderData = validateRequestBodyOrError(context, CreateOrderSchema);
    if (!orderData) return;

    try {
      const order = await this.createOrderCommand.execute(orderData);
      sendResponse(context, order, 201);
    } catch (error) {
      if (error.message === 'Insufficient inventory') {
        sendError(context, 'Some items are out of stock', 409);
      } else if (error.message === 'Payment failed') {
        sendError(context, 'Payment processing failed', 402);
      } else {
        throw error;
      }
    }
  }
}

// routes/order/get-orders.route.ts
@UnifiedRoute({
  method: 'GET',
  path: '/orders',
  tags: ['orders'],
  summary: 'List orders',
  description: 'Retrieves orders with optional filtering',
  auth: { required: true },
  cache: { ttl: 60 }, // 1 minute
  version: 'v1'
})
export class GetOrdersRoute implements RouteHandler {
  constructor(private getOrdersQuery: GetOrdersQuery) {}

  async handle(context: UnifiedHttpContext): Promise<void> {
    const query = validateQueryOrError(context, GetOrdersQuerySchema);
    if (!query) return;

    // Add user context for filtering
    const user = getCurrentUser(context);
    if (user && !user.roles.includes('admin')) {
      query.userId = user.id; // Users can only see their own orders
    }

    const result = await this.getOrdersQuery.execute(query);
    sendResponse(context, result);
  }
}
```

### API Versioning Example

```typescript
// routes/user/v2/get-users.route.ts - Version 2 with enhanced features
@UnifiedRoute({
  method: 'GET',
  path: '/v2/users',
  tags: ['users', 'v2'],
  summary: 'List users (v2)',
  description: 'Enhanced user listing with advanced filtering and sorting',
  auth: { required: true },
  cache: { ttl: 300 },
  version: 'v2'
})
export class GetUsersV2Route implements RouteHandler {
  constructor(private getUsersQuery: GetUsersQuery) {}

  async handle(context: UnifiedHttpContext): Promise<void> {
    const query = validateQueryOrError(context, GetUsersV2QuerySchema);
    if (!query) return;

    // V2 features: advanced filtering, sorting, field selection
    const result = await this.getUsersQuery.execute({
      ...query,
      includeProfile: query.include?.includes('profile'),
      includeStats: query.include?.includes('stats'),
      sortBy: query.sortBy || 'createdAt',
      sortOrder: query.sortOrder || 'desc'
    });

    // V2 response format with metadata
    sendResponse(context, {
      data: result.users,
      pagination: result.pagination,
      metadata: {
        version: 'v2',
        filters: query.filters,
        includedFields: query.include
      }
    });
  }
}

// Deprecated v1 route
@UnifiedRoute({
  method: 'GET',
  path: '/users',
  tags: ['users', 'deprecated'],
  summary: 'List users (deprecated)',
  description: 'Legacy user listing endpoint. Use /v2/users instead.',
  auth: { required: true },
  deprecated: true,
  version: 'v1'
})
export class GetUsersV1Route implements RouteHandler {
  constructor(private getUsersQuery: GetUsersQuery) {}

  async handle(context: UnifiedHttpContext): Promise<void> {
    // Add deprecation header
    setHeader(context, 'X-API-Deprecated', 'true');
    setHeader(context, 'X-API-Sunset', '2024-12-31');
    
    // Legacy implementation
    const query = validateQueryOrError(context, GetUsersV1QuerySchema);
    if (!query) return;

    const result = await this.getUsersQuery.execute(query);
    sendResponse(context, result);
  }
}
```

## Performance Monitoring

### Route Performance Monitor

```typescript
// foundations/unified-route/monitoring.ts
export class RoutePerformanceMonitor {
  private metrics = new Map<string, RouteMetrics>();
  private slowRequestThreshold: number;

  constructor(
    private logger: Logger,
    private metricsCollector: MetricsCollector,
    config: { slowRequestThreshold: number } = { slowRequestThreshold: 1000 }
  ) {
    this.slowRequestThreshold = config.slowRequestThreshold;
  }

  trackRoute(route: RouteDefinition): void {
    const key = this.getRouteKey(route);
    
    if (!this.metrics.has(key)) {
      this.metrics.set(key, {
        route: route.metadata,
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
        slowRequests: 0,
        lastRequest: new Date(),
        responseTimes: []
      });
    }
  }

  recordSuccess(route: RouteDefinition, responseTime: number): void {
    const key = this.getRouteKey(route);
    const metrics = this.metrics.get(key);
    
    if (metrics) {
      metrics.totalRequests++;
      metrics.successfulRequests++;
      metrics.lastRequest = new Date();
      
      // Update response time metrics
      this.updateResponseTimeMetrics(metrics, responseTime);
      
      // Check for slow requests
      if (responseTime > this.slowRequestThreshold) {
        metrics.slowRequests++;
        this.logger.warn('Slow request detected', {
          route: `${route.metadata.method} ${route.metadata.path}`,
          responseTime: `${responseTime}ms`,
          threshold: `${this.slowRequestThreshold}ms`
        });
      }
      
      // Send metrics to collector
      this.metricsCollector.recordRouteSuccess(key, responseTime);
    }
  }

  recordError(route: RouteDefinition, responseTime: number): void {
    const key = this.getRouteKey(route);
    const metrics = this.metrics.get(key);
    
    if (metrics) {
      metrics.totalRequests++;
      metrics.failedRequests++;
      metrics.lastRequest = new Date();
      
      this.updateResponseTimeMetrics(metrics, responseTime);
      this.metricsCollector.recordRouteError(key, responseTime);
    }
  }

  getRouteMetrics(route: RouteDefinition): RouteMetrics | undefined {
    return this.metrics.get(this.getRouteKey(route));
  }

  getAllMetrics(): RouteMetrics[] {
    return Array.from(this.metrics.values());
  }

  getOverallMetrics(): PerformanceMetrics {
    const allMetrics = this.getAllMetrics();
    
    return {
      totalRoutes: allMetrics.length,
      totalRequests: allMetrics.reduce((sum, m) => sum + m.totalRequests, 0),
      successRate: this.calculateOverallSuccessRate(allMetrics),
      averageResponseTime: this.calculateOverallAverageResponseTime(allMetrics),
      slowRequestsCount: allMetrics.reduce((sum, m) => sum + m.slowRequests, 0),
      activeRoutes: allMetrics.filter(m => m.totalRequests > 0).length
    };
  }

  generatePerformanceReport(): PerformanceReport {
    const allMetrics = this.getAllMetrics();
    
    return {
      timestamp: new Date(),
      overall: this.getOverallMetrics(),
      slowestRoutes: this.getTopSlowRoutes(allMetrics, 10),
      mostActiveRoutes: this.getTopActiveRoutes(allMetrics, 10),
      errorProneRoutes: this.getTopErrorRoutes(allMetrics, 10),
      recommendations: this.generateRecommendations(allMetrics)
    };
  }

  private updateResponseTimeMetrics(metrics: RouteMetrics, responseTime: number): void {
    metrics.responseTimes.push(responseTime);
    
    // Keep only last 100 response times for memory efficiency
    if (metrics.responseTimes.length > 100) {
      metrics.responseTimes.shift();
    }
    
    // Recalculate average
    metrics.averageResponseTime = metrics.responseTimes.reduce((sum, time) => sum + time, 0) / metrics.responseTimes.length;
  }

  private getRouteKey(route: RouteDefinition): string {
    return `${route.metadata.method}:${route.metadata.path}`;
  }

  private calculateOverallSuccessRate(metrics: RouteMetrics[]): number {
    const totalRequests = metrics.reduce((sum, m) => sum + m.totalRequests, 0);
    const successfulRequests = metrics.reduce((sum, m) => sum + m.successfulRequests, 0);
    
    return totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0;
  }

  private calculateOverallAverageResponseTime(metrics: RouteMetrics[]): number {
    const totalTime = metrics.reduce((sum, m) => sum + (m.averageResponseTime * m.totalRequests), 0);
    const totalRequests = metrics.reduce((sum, m) => sum + m.totalRequests, 0);
    
    return totalRequests > 0 ? totalTime / totalRequests : 0;
  }

  private getTopSlowRoutes(metrics: RouteMetrics[], limit: number): RouteMetrics[] {
    return metrics
      .filter(m => m.totalRequests > 0)
      .sort((a, b) => b.averageResponseTime - a.averageResponseTime)
      .slice(0, limit);
  }

  private getTopActiveRoutes(metrics: RouteMetrics[], limit: number): RouteMetrics[] {
    return metrics
      .sort((a, b) => b.totalRequests - a.totalRequests)
      .slice(0, limit);
  }

  private getTopErrorRoutes(metrics: RouteMetrics[], limit: number): RouteMetrics[] {
    return metrics
      .filter(m => m.failedRequests > 0)
      .sort((a, b) => (b.failedRequests / b.totalRequests) - (a.failedRequests / a.totalRequests))
      .slice(0, limit);
  }

  private generateRecommendations(metrics: RouteMetrics[]): PerformanceRecommendation[] {
    const recommendations: PerformanceRecommendation[] = [];
    
    // Find routes that need caching
    for (const metric of metrics) {
      if (metric.route.method === 'GET' && 
          metric.averageResponseTime > 500 && 
          !metric.route.cache) {
        recommendations.push({
          type: 'caching',
          route: `${metric.route.method} ${metric.route.path}`,
          description: 'Consider adding caching to improve response time',
          impact: 'high',
          effort: 'low'
        });
      }
      
      // Find routes with high error rates
      if (metric.totalRequests > 10) {
        const errorRate = (metric.failedRequests / metric.totalRequests) * 100;
        if (errorRate > 10) {
          recommendations.push({
            type: 'error_handling',
            route: `${metric.route.method} ${metric.route.path}`,
            description: `High error rate (${errorRate.toFixed(1)}%). Review error handling and validation.`,
            impact: 'high',
            effort: 'medium'
          });
        }
      }
      
      // Find routes that need rate limiting
      if (!metric.route.rateLimit && metric.totalRequests > 100) {
        recommendations.push({
          type: 'rate_limiting',
          route: `${metric.route.method} ${metric.route.path}`,
          description: 'High traffic route without rate limiting. Consider adding rate limits.',
          impact: 'medium',
          effort: 'low'
        });
      }
    }
    
    return recommendations;
  }
}

// Interfaces
export interface RouteMetrics {
  route: RouteMetadata;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  slowRequests: number;
  lastRequest: Date;
  responseTimes: number[];
}

export interface PerformanceMetrics {
  totalRoutes: number;
  totalRequests: number;
  successRate: number;
  averageResponseTime: number;
  slowRequestsCount: number;
  activeRoutes: number;
}

export interface PerformanceReport {
  timestamp: Date;
  overall: PerformanceMetrics;
  slowestRoutes: RouteMetrics[];
  mostActiveRoutes: RouteMetrics[];
  errorProneRoutes: RouteMetrics[];
  recommendations: PerformanceRecommendation[];
}

export interface PerformanceRecommendation {
  type: 'caching' | 'rate_limiting' | 'error_handling' | 'optimization';
  route: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  effort: 'low' | 'medium' | 'high';
}

export interface MetricsCollector {
  recordRouteSuccess(routeKey: string, responseTime: number): void;
  recordRouteError(routeKey: string, responseTime: number): void;
}
```

## Complete Implementation Example

### Production Setup

```typescript
// main.ts - Complete UnifiedRoute implementation
import { FastifyInstance } from 'fastify';
import { UnifiedRouteSystem } from '@inh-lib/unified-route';
import { setupContainer } from './container-setup';

async function createApp(): Promise<FastifyInstance> {
  // 1. Setup DI Container
  const container = setupContainer();
  
  // 2. Create Fastify instance
  const fastify: FastifyInstance = require('fastify')({ 
    logger: true,
    // Increase body limit for file uploads
    bodyLimit: 10 * 1024 * 1024 // 10MB
  });
  
  // 3. Register plugins
  await fastify.register(require('@fastify/cors'), {
    origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true
  });
  
  await fastify.register(require('@fastify/rate-limit'), {
    global: false // We'll handle rate limiting per route
  });
  
  // 4. Setup UnifiedRoute system
  const routeConfig: UnifiedRouteConfig = {
    api: {
      title: 'Enterprise API',
      version: '1.0.0',
      description: 'Enterprise-grade API with automatic route management'
    },
    middleware: {
      global: ['logging', 'cors', 'security']
    },
    monitoring: {
      enabled: true,
      slowThreshold: 1000
    }
  };
  
  const routeSystem = new UnifiedRouteSystem(
    container,
    container.get('logger'),
    routeConfig
  );
  
  // 5. Discover and register routes
  await routeSystem.discover([
    './routes/**/*.route.ts',
    './routes/**/*.route.js'
  ]);
  
  await routeSystem.register(fastify);
  
  // 6. Generate OpenAPI documentation
  await routeSystem.generateOpenAPI('./docs/openapi.json');
  
  // 7. Health check with route metrics
  fastify.get('/health', async (request, reply) => {
    try {
      const prisma = container.get('prisma');
      await prisma.$queryRaw`SELECT 1`;
      
      const metrics = routeSystem.getMetrics();
      
      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        database: 'connected',
        routes: {
          total: metrics.totalRoutes,
          byMethod: metrics.byMethod,
          byVersion: metrics.byVersion
        },
        performance: metrics.performance
      };
    } catch (error) {
      reply.status(503);
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        database: 'disconnected',
        error: error.message
      };
    }
  });
  
  // 8. Performance monitoring endpoint
  fastify.get('/metrics', async (request, reply) => {
    const monitor = container.get('routePerformanceMonitor');
    const report = monitor.generatePerformanceReport();
    
    return report;
  });
  
  // 9. Documentation endpoint
  fastify.get('/docs', async (request, reply) => {
    const openApiSpec = await routeSystem.generateOpenAPI();
    
    // Serve Swagger UI
    reply.type('text/html');
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>API Documentation</title>
          <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui.css" />
        </head>
        <body>
          <div id="swagger-ui"></div>
          <script src="https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui-bundle.js"></script>
          <script>
            SwaggerUIBundle({
              url: '/openapi.json',
              dom_id: '#swagger-ui',
              presets: [
                SwaggerUIBundle.presets.apis,
                SwaggerUIBundle.presets.standalone
              ]
            });
          </script>
        </body>
      </html>
    `;
  });
  
  // 10. Serve OpenAPI spec
  fastify.get('/openapi.json', async (request, reply) => {
    const spec = await routeSystem.generateOpenAPI();
    return spec;
  });
  
  return fastify;
}

async function main() {
  const app = await createApp();
  
  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`Received ${signal}, shutting down gracefully...`);
    try {
      await app.close();
      console.log('Application shut down complete');
      process.exit(0);
    } catch (error) {
      console.error('Error during shutdown:', error);
      process.exit(1);
    }
  };
  
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  
  // Start server
  try {
    const port = Number(process.env.PORT) || 3000;
    const host = process.env.HOST || '0.0.0.0';
    
    await app.listen({ port, host });
    
    console.log(`🚀 Server running on ${host}:${port}`);
    console.log(`📊 Metrics available at http://${host}:${port}/metrics`);
    console.log(`📚 Documentation available at http://${host}:${port}/docs`);
    console.log(`🔍 OpenAPI spec at http://${host}:${port}/openapi.json`);
    console.log(`💚 Health check at http://${host}:${port}/health`);
    
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main().catch(console.error);
```

### Development Workflow

```typescript
// scripts/dev-tools.ts - Development utilities
export class DevRouteTools {
  constructor(private routeSystem: UnifiedRouteSystem) {}

  async listRoutes(): Promise<void> {
    const routes = this.routeSystem.getRoutes();
    
    console.log('\n📋 Discovered Routes:');
    console.log('='.repeat(80));
    
    const grouped = this.groupRoutesByTag(routes);
    
    for (const [tag, tagRoutes] of grouped) {
      console.log(`\n🏷️  ${tag.toUpperCase()}`);
      console.log('-'.repeat(40));
      
      for (const route of tagRoutes) {
        const method = route.metadata.method.padEnd(6);
        const path = route.metadata.path.padEnd(30);
        const auth = route.metadata.auth?.required ? '🔒' : '🔓';
        const cache = route.metadata.cache ? '⚡' : '  ';
        const version = route.metadata.version || 'v1';
        
        console.log(`  ${method} ${path} ${auth}${cache} ${version} - ${route.metadata.summary || 'No description'}`);
      }
    }
    
    console.log(`\n📊 Total: ${routes.length} routes`);
  }

  async validateRoutes(): Promise<void> {
    const routes = this.routeSystem.getRoutes();
    const issues: string[] = [];
    
    console.log('\n🔍 Validating Routes...');
    
    // Check for missing summaries
    for (const route of routes) {
      if (!route.metadata.summary) {
        issues.push(`Missing summary: ${route.metadata.method} ${route.metadata.path}`);
      }
      
      if (!route.metadata.tags || route.metadata.tags.length === 0) {
        issues.push(`Missing tags: ${route.metadata.method} ${route.metadata.path}`);
      }
      
      // Check for missing auth on sensitive paths
      if (route.metadata.path.includes('admin') && !route.metadata.auth?.required) {
        issues.push(`Admin route without auth: ${route.metadata.method} ${route.metadata.path}`);
      }
    }
    
    if (issues.length === 0) {
      console.log('✅ All routes are valid!');
    } else {
      console.log('❌ Found issues:');
      issues.forEach(issue => console.log(`  - ${issue}`));
    }
  }

  async generateRouteTests(): Promise<void> {
    const routes = this.routeSystem.getRoutes();
    
    console.log('\n🧪 Generating test templates...');
    
    for (const route of routes) {
      const testContent = this.generateTestTemplate(route);
      const fileName = `__tests__/routes/${route.metadata.path.replace(/[/:]/g, '-')}.${route.metadata.method.toLowerCase()}.test.ts`;
      
      // Write test file (pseudo code)
      console.log(`Generated: ${fileName}`);
    }
  }

  private groupRoutesByTag(routes: RouteDefinition[]): Map<string, RouteDefinition[]> {
    const grouped = new Map<string, RouteDefinition[]>();
    
    for (const route of routes) {
      const tags = route.metadata.tags || ['untagged'];
      
      for (const tag of tags) {
        if (!grouped.has(tag)) {
          grouped.set(tag, []);
        }
        grouped.get(tag)!.push(route);
      }
    }
    
    return grouped;
  }

  private generateTestTemplate(route: RouteDefinition): string {
    return `
// Auto-generated test template for ${route.metadata.method} ${route.metadata.path}
import { ${route.constructor.name} } from '../routes/${route.metadata.path}';
import { createMockContext } from '@inh-lib/api-util-fastify/testing';

describe('${route.constructor.name}', () => {
  let route: ${route.constructor.name};

  beforeEach(() => {
    // Setup mocks and dependencies
    route = new ${route.constructor.name}(/* mock dependencies */);
  });

  it('should handle valid request', async () => {
    const mockContext = createMockContext({
      ${route.metadata.method === 'POST' || route.metadata.method === 'PUT' ? 'body: {},' : ''}
      ${route.metadata.path.includes(':') ? 'params: {},' : ''}
    });

    await route.handle(mockContext);

    expect(mockContext.response.status).toHaveBeenCalledWith(200);
  });

  it('should handle validation errors', async () => {
    const mockContext = createMockContext({
      body: {} // Invalid data
    });

    await route.handle(mockContext);

    expect(mockContext.response.status).toHaveBeenCalledWith(422);
  });

  ${route.metadata.auth?.required ? `
  it('should require authentication', async () => {
    const mockContext = createMockContext({
      headers: {} // No auth header
    });

    await route.handle(mockContext);

    expect(mockContext.response.status).toHaveBeenCalledWith(401);
  });
  ` : ''}
});
    `.trim();
  }
}

// Usage in development
if (require.main === module) {
  async function runDevTools() {
    const container = setupContainer();
    const routeSystem = new UnifiedRouteSystem(container, container.get('logger'), {
      api: { title: 'Dev API', version: '1.0.0', description: 'Development' }
    });
    
    await routeSystem.discover(['./routes/**/*.route.ts']);
    
    const tools = new DevRouteTools(routeSystem);
    
    const command = process.argv[2];
    switch (command) {
      case 'list':
        await tools.listRoutes();
        break;
      case 'validate':
        await tools.validateRoutes();
        break;
      case 'generate-tests':
        await tools.generateRouteTests();
        break;
      default:
        console.log('Available commands: list, validate, generate-tests');
    }
  }
  
  runDevTools().catch(console.error);
}
```

## Summary

### 🚀 **UnifiedRoute System Benefits**

**Compared to Simple Route Modules (Free):**

| Feature | Simple Route Modules | UnifiedRoute System |
|---------|---------------------|-------------------|
| **Route Registration** | Manual | Automatic Discovery |
| **Documentation** | Manual | Auto-generated OpenAPI |
| **Middleware** | Manual per route | Systematic composition |
| **Monitoring** | Manual implementation | Built-in performance tracking |
| **Versioning** | Manual path prefixes | Systematic version management |
| **Security** | Manual middleware | Declarative auth config |
| **Testing** | Manual test creation | Auto-generated test templates |

### ✅ **When to Use UnifiedRoute System:**

- **50+ routes** in your application
- **Multiple API versions** to manage
- **Team size: 10+ developers**
- **Documentation requirements** (OpenAPI/Swagger)
- **Performance monitoring** needs
- **Systematic middleware management**
- **Enterprise compliance** requirements

### 🔧 **Implementation Complexity:**

```typescript
// Simple Route Modules (Free) - 5 minutes setup
export async function createUserRoute(context: UnifiedHttpContext, command: CreateUserCommand) {
  // Route logic
}

// UnifiedRoute System (Premium) - 2 hours setup, massive productivity gains
@UnifiedRoute({
  method: 'POST',
  path: '/users',
  auth: { required: false },
  tags: ['users']
})
export class CreateUserRoute implements RouteHandler {
  // Same route logic + automatic discovery, docs, monitoring
}
```

### 🎯 **ROI for Enterprise Teams:**

**Investment:** 2-4 weeks initial setup  
**Returns:**
- **90% faster** new route development
- **Automatic documentation** saves 40+ hours/month
- **Built-in monitoring** prevents performance issues
- **Systematic testing** improves code quality
- **API versioning** supports product evolution

### 💡 **Key Decision Points:**

**Use Simple Route Modules when:**
- < 50 routes
- Small team (< 10 developers)
- Simple documentation needs
- Manual monitoring acceptable

**Use UnifiedRoute System when:**
- 50+ routes 
- Large team (10+ developers)
- Enterprise documentation requirements
- Performance monitoring essential
- API versioning needed

---

> 💎 **UnifiedRoute System** provides enterprise-grade route management that scales with your application and team. The systematic approach to discovery, documentation, and monitoring makes it essential for large-scale applications.

> 📧 **Questions?** This system represents the pinnacle of route management for Node.js applications. For implementation support or custom enterprise features, reach out to our team.