# Part 3: Framework-Agnostic Architecture

Building business logic that's completely independent of HTTP frameworks, making your code more portable, testable, and maintainable.

## 📚 Series Navigation

- **[Part 1: Getting Started](../README.md)**
- **[Part 2: Schema Validation with Zod](02-zod-validation.md)**
- **[Part 3: Framework-Agnostic Architecture](03-framework-agnostic.md)** ← You are here
- **[Part 4: Enterprise Architecture](04-enterprise-architecture.md)**
- **[Part 5: Configuration & Deployment](05-configuration-deployment.md)**

## Why Framework-Agnostic Architecture?

### The Problem with Framework-Coupled Code

```typescript
// ❌ Tightly coupled to Fastify
fastify.post('/users', async (request, reply) => {
  const { email, firstName } = request.body as CreateUserRequest;
  
  // Business logic mixed with HTTP concerns
  if (!email) {
    reply.status(422).send({ error: 'Email required' });
    return;
  }
  
  // What if we need to switch to Express later?
  // What if we want to test this without HTTP?
  const user = await database.users.create({ email, firstName });
  reply.status(201).send(user);
});
```

### The Solution: Unified Context Pattern

```typescript
// ✅ Framework-agnostic business logic
class UserService {
  async createUser(context: UnifiedHttpContext): Promise<void> {
    const userData = getRequestBody<CreateUserRequest>(context);
    
    if (!userData.email) {
      sendError(context, 'Email required', 422);
      return;
    }
    
    const user = await this.repository.create(userData);
    sendResponse(context, user, 201);
  }
}

// Fastify adapter (thin layer)
fastify.post('/users', async (request, reply) => {
  const context = createFastifyContext(request, reply);
  await userService.createUser(context);
});

// Express adapter (same business logic!)
app.post('/users', async (req, res) => {
  const context = createExpressContext(req, res);
  await userService.createUser(context); // Same service!
});
```

## Core Concepts

### 1. Separation of Concerns

```typescript
// ❌ Mixed concerns - hard to test and maintain
fastify.post('/users', async (request, reply) => {
  // HTTP parsing
  const userData = request.body as CreateUserRequest;
  
  // Validation
  if (!userData.email || !userData.firstName) {
    reply.status(422).send({ error: 'Missing fields' });
    return;
  }
  
  // Authorization
  const token = request.headers.authorization;
  if (!token) {
    reply.status(401).send({ error: 'Unauthorized' });
    return;
  }
  
  // Business logic
  const user = await database.users.create(userData);
  
  // Response formatting
  reply.status(201).send({
    id: user.id,
    email: user.email,
    createdAt: user.createdAt.toISOString(),
  });
});

// ✅ Separated concerns - clean and testable
class UserService {
  constructor(private userRepository: UserRepository) {}

  async createUser(context: UnifiedHttpContext): Promise<void> {
    try {
      // Validation layer
      const userData = this.validateCreateUserRequest(context);
      if (!userData) return; // Error already sent
      
      // Authorization layer
      const user = this.getCurrentUser(context);
      if (!user) {
        sendError(context, 'Unauthorized', 401);
        return;
      }
      
      // Business logic layer
      const newUser = await this.userRepository.create(userData);
      
      // Response layer
      const response = this.formatUserResponse(newUser);
      sendResponse(context, response, 201);
    } catch (error) {
      this.handleError(context, error);
    }
  }

  private validateCreateUserRequest(context: UnifiedHttpContext): CreateUserRequest | null {
    const userData = getRequestBody<CreateUserRequest>(context);
    
    if (!userData.email || !userData.firstName) {
      sendError(context, 'Missing required fields', 422);
      return null;
    }
    
    return userData;
  }

  private getCurrentUser(context: UnifiedHttpContext): AuthenticatedUser | null {
    const headers = getHeaders(context);
    const token = headers.authorization?.replace('Bearer ', '');
    
    if (!token) return null;
    
    // Token validation logic
    return this.authService.validateToken(token);
  }

  private formatUserResponse(user: User): UserResponse {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      createdAt: user.createdAt.toISOString(),
    };
  }

  private handleError(context: UnifiedHttpContext, error: unknown): void {
    console.error('User service error:', error);
    sendError(context, 'Internal server error', 500);
  }
}

// Thin HTTP adapters
fastify.post('/users', async (request, reply) => {
  const context = createFastifyContext(request, reply);
  await userService.createUser(context);
});
```

### 2. Dependency Injection Pattern

#### ปัญหาของการ Hard-Code Dependencies

```typescript
// ❌ BAD: Hard-coded dependencies - ยากต่อการทดสอบและเปลี่ยนแปลง
class UserService {
  private prisma = new PrismaClient(); // ผูกติดกับ Prisma
  private jwtSecret = process.env.JWT_SECRET!; // ผูกติดกับ environment

  async createUser(context: UnifiedHttpContext): Promise<void> {
    // ถ้าต้องการทดสอบ หรือ เปลี่ยนใช้ database อื่น จะทำยังไง?
    const userData = getRequestBody<CreateUserRequest>(context);
    
    const existingUser = await this.prisma.user.findUnique({
      where: { email: userData.email }
    });
    
    if (existingUser) {
      sendError(context, 'Email already exists', 409);
      return;
    }
    
    const user = await this.prisma.user.create({ data: userData });
    sendResponse(context, user, 201);
  }
}
```

#### วิธีแก้ปัญหาด้วย Dependency Injection

```typescript
// ✅ GOOD: Define interfaces first (สัญญาระหว่าง business logic กับ infrastructure)
interface UserRepository {
  create(userData: CreateUserRequest): Promise<User>;
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  update(id: string, userData: Partial<CreateUserRequest>): Promise<User | null>;
  delete(id: string): Promise<boolean>;
}

interface AuthService {
  validateToken(token: string): AuthenticatedUser | null;
  hasPermission(user: AuthenticatedUser, permission: string): boolean;
}

// ✅ GOOD: Service รับ dependencies ผ่าน constructor (Dependency Injection)
class UserService {
  // รับ dependencies จากภายนอก ไม่ได้สร้างเอง
  constructor(
    private userRepository: UserRepository,    // Interface ไม่ใช่ concrete class
    private authService: AuthService           // Interface ไม่ใช่ concrete class
  ) {}

  async createUser(context: UnifiedHttpContext): Promise<void> {
    const userData = getRequestBody<CreateUserRequest>(context);
    
    // ใช้ injected dependency แทนการเรียกโดยตรง
    const existingUser = await this.userRepository.findByEmail(userData.email);
    if (existingUser) {
      sendError(context, 'Email already exists', 409);
      return;
    }
    
    const user = await this.userRepository.create(userData);
    sendResponse(context, user, 201);
  }

  async getUsers(context: UnifiedHttpContext): Promise<void> {
    // ใช้ injected auth service
    const currentUser = this.getCurrentUser(context);
    if (!currentUser || !this.authService.hasPermission(currentUser, 'users:read')) {
      sendError(context, 'Insufficient permissions', 403);
      return;
    }
    
    const query = getQuery(context);
    const users = await this.userRepository.findMany(query);
    sendResponse(context, users);
  }

  private getCurrentUser(context: UnifiedHttpContext): AuthenticatedUser | null {
    const headers = getHeaders(context);
    const token = headers.authorization?.replace('Bearer ', '');
    return token ? this.authService.validateToken(token) : null;
  }
}
```

#### สร้าง Concrete Implementations

```typescript
// Implementation จริงของ UserRepository (Infrastructure Layer)
class PrismaUserRepository implements UserRepository {
  constructor(private prisma: PrismaClient) {}

  async create(userData: CreateUserRequest): Promise<User> {
    return await this.prisma.user.create({ 
      data: {
        ...userData,
        id: this.generateId(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    });
  }

  async findById(id: string): Promise<User | null> {
    return await this.prisma.user.findUnique({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return await this.prisma.user.findUnique({ where: { email } });
  }

  async update(id: string, userData: Partial<CreateUserRequest>): Promise<User | null> {
    try {
      return await this.prisma.user.update({ 
        where: { id }, 
        data: { ...userData, updatedAt: new Date() }
      });
    } catch {
      return null;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      await this.prisma.user.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }
}

// Implementation จริงของ AuthService (Infrastructure Layer)
class JWTAuthService implements AuthService {
  constructor(private jwtSecret: string) {}

  validateToken(token: string): AuthenticatedUser | null {
    try {
      const payload = jwt.verify(token, this.jwtSecret) as any;
      return {
        id: payload.sub,
        email: payload.email,
        roles: payload.roles || [],
      };
    } catch {
      return null;
    }
  }

  hasPermission(user: AuthenticatedUser, permission: string): boolean {
    return user.roles.includes('admin') || user.roles.includes(permission);
  }
}

// สำหรับการทดสอบ - Mock Implementation
class MockUserRepository implements UserRepository {
  private users: User[] = [];

  async create(userData: CreateUserRequest): Promise<User> {
    const user: User = {
      id: (Math.random() * 1000).toString(),
      ...userData,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.push(user);
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.users.find(u => u.email === email) || null;
  }

  // ... other methods
}

class MockAuthService implements AuthService {
  validateToken(token: string): AuthenticatedUser | null {
    if (token === 'valid-token') {
      return { id: '1', email: 'test@example.com', roles: ['user'] };
    }
    return null;
  }

  hasPermission(user: AuthenticatedUser, permission: string): boolean {
    return user.roles.includes('admin');
  }
}
```

#### Dependency Injection Setup (การประกอบชิ้นส่วน)

```typescript
// Production Setup - ใช้ implementations จริง
function createProductionServices() {
  // สร้าง dependencies
  const prisma = new PrismaClient();
  const userRepository = new PrismaUserRepository(prisma);           // Inject Prisma
  const authService = new JWTAuthService(process.env.JWT_SECRET!);   // Inject JWT Secret
  
  // สร้าง service โดย inject dependencies
  const userService = new UserService(userRepository, authService);
  
  return { userService, prisma };
}

// Test Setup - ใช้ mock implementations
function createTestServices() {
  // สร้าง mock dependencies
  const userRepository = new MockUserRepository();                   // Mock Repository
  const authService = new MockAuthService();                         // Mock Auth
  
  // สร้าง service โดย inject mock dependencies
  const userService = new UserService(userRepository, authService);
  
  return { userService };
}

// Development Setup - อาจใช้ mix ของ real และ mock
function createDevelopmentServices() {
  const prisma = new PrismaClient();
  const userRepository = new PrismaUserRepository(prisma);           // Real Database
  const authService = new MockAuthService();                         // Mock Auth (easier for dev)
  
  const userService = new UserService(userRepository, authService);
  
  return { userService, prisma };
}
```

#### การใช้งานในแต่ละ Environment

```typescript
// main.ts - Production
async function startProductionServer() {
  const { userService } = createProductionServices();
  
  const fastify: FastifyInstance = require('fastify')({ logger: true });
  
  // Framework adapters ยังคงเป็น thin layer
  fastify.post('/users', async (request, reply) => {
    const context = createFastifyContext(request, reply);
    await userService.createUser(context);   // Same service, different dependencies!
  });
  
  await fastify.listen({ port: 3000 });
}

// test.ts - Testing
describe('UserService', () => {
  let userService: UserService;
  
  beforeEach(() => {
    const { userService: service } = createTestServices();
    userService = service;
  });
  
  it('should create user', async () => {
    const mockContext = createMockContext({
      body: { email: 'test@example.com', firstName: 'John', lastName: 'Doe' }
    });
    
    await userService.createUser(mockContext);
    
    // Test ผ่านได้เพราะใช้ Mock Dependencies!
    expect(mockContext.response.status).toHaveBeenCalledWith(201);
  });
});
```

#### ประโยชน์ของ Dependency Injection

1. **🧪 Testability**: ใช้ mock dependencies ในการทดสอบ
2. **🔄 Flexibility**: เปลี่ยน implementation ได้ง่าย (Prisma → MongoDB → Redis)
3. **🏗️ Loose Coupling**: Service ไม่ขึ้นกับ concrete implementation
4. **🎯 Single Responsibility**: แต่ละ class มีหน้าที่เดียว
5. **🔧 Configuration**: สามารถ configure dependencies ตาม environment ได้

#### Advanced DI Container (สำหรับโปรเจคใหญ่)

DI Container อยู่ใน **Infrastructure Layer** และใช้เป็น **Application Entry Point**

```typescript
// infrastructure/di/container.ts - Infrastructure Layer
export enum ServiceLifecycle {
  SINGLETON = 'singleton',    // สร้างครั้งเดียว ใช้ร่วมกัน
  TRANSIENT = 'transient',    // สร้างใหม่ทุกครั้งที่เรียก
}

export interface ServiceDefinition<T> {
  factory: () => T;
  lifecycle: ServiceLifecycle;
  instance?: T;
}

export class DIContainer {
  private services = new Map<string, ServiceDefinition<any>>();
  
  // ลงทะเบียน service
  register<T>(
    name: string, 
    factory: () => T, 
    lifecycle: ServiceLifecycle = ServiceLifecycle.SINGLETON
  ): void {
    this.services.set(name, { factory, lifecycle });
  }
  
  // ดึง service มาใช้
  get<T>(name: string): T {
    const definition = this.services.get(name);
    if (!definition) {
      throw new Error(`Service '${name}' not registered`);
    }
    
    // Singleton: ใช้ instance เดิม
    if (definition.lifecycle === ServiceLifecycle.SINGLETON) {
      if (!definition.instance) {
        definition.instance = definition.factory();
      }
      return definition.instance;
    }
    
    // Transient: สร้างใหม่ทุกครั้ง
    return definition.factory();
  }
  
  // สำหรับ cleanup resources
  async dispose(): Promise<void> {
    for (const [name, definition] of this.services.entries()) {
      if (definition.instance && typeof definition.instance.dispose === 'function') {
        await definition.instance.dispose();
      }
    }
    this.services.clear();
  }
  
  // สำหรับ health check
  getRegisteredServices(): string[] {
    return Array.from(this.services.keys());
  }
}
```

#### การใช้งาน DI Container ในแต่ละ Layer

```typescript
// config/container.config.ts - Configuration Layer
export interface AppConfig {
  database: {
    url: string;
    ssl: boolean;
  };
  auth: {
    jwtSecret: string;
    jwtExpiresIn: string;
  };
  environment: 'development' | 'staging' | 'production' | 'test';
}

export function loadConfig(): AppConfig {
  return {
    database: {
      url: process.env.DATABASE_URL || 'postgresql://localhost:5432/mydb',
      ssl: process.env.NODE_ENV === 'production',
    },
    auth: {
      jwtSecret: process.env.JWT_SECRET || 'default-secret',
      jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
    },
    environment: (process.env.NODE_ENV as any) || 'development',
  };
}

// infrastructure/di/service-registry.ts - Infrastructure Layer
export class ServiceRegistry {
  static registerProductionServices(container: DIContainer, config: AppConfig): void {
    // === Infrastructure Services (Singleton) ===
    container.register('config', () => config, ServiceLifecycle.SINGLETON);
    
    container.register('prisma', () => {
      const prisma = new PrismaClient({
        datasources: { db: { url: config.database.url } },
        log: config.environment === 'development' ? ['query'] : ['error'],
      });
      return prisma;
    }, ServiceLifecycle.SINGLETON);
    
    // === Repository Layer (Singleton) ===
    container.register('userRepository', () => 
      new PrismaUserRepository(container.get('prisma')), 
      ServiceLifecycle.SINGLETON
    );
    
    container.register('orderRepository', () => 
      new PrismaOrderRepository(container.get('prisma')), 
      ServiceLifecycle.SINGLETON
    );
    
    // === Auth Services (Singleton) ===
    container.register('authService', () => 
      new JWTAuthService(config.auth.jwtSecret), 
      ServiceLifecycle.SINGLETON
    );
    
    container.register('permissionService', () => 
      new RoleBasedPermissionService(), 
      ServiceLifecycle.SINGLETON
    );
    
    // === Business Services (Singleton) ===
    container.register('userService', () => 
      new UserService(
        container.get('userRepository'),
        container.get('authService')
      ), 
      ServiceLifecycle.SINGLETON
    );
    
    container.register('orderService', () => 
      new OrderService(
        container.get('orderRepository'),
        container.get('userRepository'),
        container.get('authService')
      ), 
      ServiceLifecycle.SINGLETON
    );
    
    // === Middleware (Transient - เพราะมี context แต่ละ request) ===
    container.register('authMiddleware', () => 
      createAuthMiddleware(container.get('authService')), 
      ServiceLifecycle.TRANSIENT
    );
    
    container.register('rateLimitMiddleware', () => 
      createRateLimitMiddleware(100, 15 * 60 * 1000), 
      ServiceLifecycle.TRANSIENT
    );
  }
  
  static registerTestServices(container: DIContainer): void {
    // === Mock Services for Testing ===
    container.register('userRepository', () => 
      new MockUserRepository(), 
      ServiceLifecycle.SINGLETON
    );
    
    container.register('authService', () => 
      new MockAuthService(), 
      ServiceLifecycle.SINGLETON
    );
    
    container.register('userService', () => 
      new UserService(
        container.get('userRepository'),
        container.get('authService')
      ), 
      ServiceLifecycle.SINGLETON
    );
  }
  
  static registerDevelopmentServices(container: DIContainer, config: AppConfig): void {
    // === Mix of Real and Mock Services ===
    container.register('prisma', () => new PrismaClient(), ServiceLifecycle.SINGLETON);
    
    container.register('userRepository', () => 
      new PrismaUserRepository(container.get('prisma')), 
      ServiceLifecycle.SINGLETON
    );
    
    // ใช้ Mock Auth ใน Development เพื่อความสะดวก
    container.register('authService', () => 
      new MockAuthService(), 
      ServiceLifecycle.SINGLETON
    );
    
    container.register('userService', () => 
      new UserService(
        container.get('userRepository'),
        container.get('authService')
      ), 
      ServiceLifecycle.SINGLETON
    );
  }
}
```

#### การใช้งานใน Application Entry Point

```typescript
// main.ts - Application Entry Point
import { DIContainer } from './infrastructure/di/container';
import { ServiceRegistry } from './infrastructure/di/service-registry';
import { loadConfig } from './config/container.config';
import { createFastifyApp } from './adapters/fastify/app';

async function main() {
  const config = loadConfig();
  const container = new DIContainer();
  
  // ลงทะเบียน services ตาม environment
  switch (config.environment) {
    case 'production':
    case 'staging':
      ServiceRegistry.registerProductionServices(container, config);
      break;
    case 'development':
      ServiceRegistry.registerDevelopmentServices(container, config);
      break;
    case 'test':
      ServiceRegistry.registerTestServices(container);
      break;
  }
  
  // สร้าง Fastify app โดยส่ง container เข้าไป
  const app = await createFastifyApp(container);
  
  // Graceful shutdown
  const shutdown = async () => {
    console.log('Shutting down...');
    try {
      await app.close();
      await container.dispose(); // ทำความสะอาด resources
      console.log('Shutdown complete');
      process.exit(0);
    } catch (error) {
      console.error('Shutdown error:', error);
      process.exit(1);
    }
  };
  
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
  
  // Start server
  try {
    await app.listen({ port: 3000, host: '0.0.0.0' });
    console.log(`🚀 Server running on port 3000 (${config.environment})`);
    console.log(`📦 Registered services: ${container.getRegisteredServices().join(', ')}`);
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

main().catch(console.error);
```

#### การใช้งานใน Fastify Adapter

```typescript
// adapters/fastify/app.ts - HTTP Adapter Layer
import { FastifyInstance } from 'fastify';
import { DIContainer } from '../../infrastructure/di/container';
import { createFastifyContext } from '@inh-lib/api-util-fastify';

export async function createFastifyApp(container: DIContainer): Promise<FastifyInstance> {
  const fastify: FastifyInstance = require('fastify')({ logger: true });
  
  // === Plugin Registration ===
  await fastify.register(require('@fastify/cors'), {
    origin: true,
    credentials: true,
  });
  
  // === Health Check ===
  fastify.get('/health', async (request, reply) => {
    try {
      // ใช้ DI Container เพื่อเช็ค health ของ services
      const prisma = container.get('prisma');
      await prisma.$queryRaw`SELECT 1`;
      
      return {
        status: 'healthy',
        services: container.getRegisteredServices(),
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      reply.status(503);
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  });
  
  // === Route Registration ===
  // User routes
  fastify.post('/users', async (request, reply) => {
    const context = createFastifyContext(request, reply);
    const userService = container.get('userService');        // ดึงจาก DI Container
    await userService.createUser(context);
  });
  
  fastify.get('/users', async (request, reply) => {
    const context = createFastifyContext(request, reply);
    const userService = container.get('userService');        // ดึงจาก DI Container
    const authMiddleware = container.get('authMiddleware');   // ดึง middleware จาก DI Container
    
    // Apply middleware
    await authMiddleware(context);
    if (context.response['statusCode'] !== 200) return; // Middleware failed
    
    await userService.getUsers(context);
  });
  
  fastify.get('/users/:id', async (request, reply) => {
    const context = createFastifyContext(request, reply);
    const userService = container.get('userService');
    await userService.getUserById(context);
  });
  
  // Order routes
  fastify.post('/orders', async (request, reply) => {
    const context = createFastifyContext(request, reply);
    const orderService = container.get('orderService');      // ดึง order service
    await orderService.createOrder(context);
  });
  
  return fastify;
}
```

#### การใช้งานใน Testing

```typescript
// __tests__/setup/test-container.ts - Test Setup
export function createTestContainer(): DIContainer {
  const container = new DIContainer();
  ServiceRegistry.registerTestServices(container);
  return container;
}

// __tests__/integration/user.api.test.ts - Integration Test
describe('User API Integration', () => {
  let app: FastifyInstance;
  let container: DIContainer;
  
  beforeAll(async () => {
    container = createTestContainer();
    app = await createFastifyApp(container);
  });
  
  afterAll(async () => {
    await app.close();
    await container.dispose();
  });
  
  beforeEach(() => {
    // Reset mock data
    const userRepository = container.get('userRepository') as MockUserRepository;
    userRepository.clear();
  });
  
  it('should create user via API', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/users',
      payload: {
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
      },
    });
    
    expect(response.statusCode).toBe(201);
    
    // ตรวจสอบในระบบ mock
    const userRepository = container.get('userRepository') as MockUserRepository;
    const users = await userRepository.findAll();
    expect(users).toHaveLength(1);
  });
});

// __tests__/unit/user.service.test.ts - Unit Test
describe('UserService Unit Tests', () => {
  let userService: UserService;
  let container: DIContainer;
  
  beforeEach(() => {
    container = createTestContainer();
    userService = container.get('userService');
  });
  
  it('should create user', async () => {
    const mockContext = createMockContext({
      body: { email: 'test@example.com', firstName: 'John', lastName: 'Doe' }
    });
    
    await userService.createUser(mockContext);
    
    expect(mockContext.response.status).toHaveBeenCalledWith(201);
  });
});
```

#### ประโยชน์ของ DI Container

1. **🎯 Centralized Configuration**: จัดการ dependencies ในที่เดียว
2. **🔄 Environment Switching**: เปลี่ยน implementation ตาม environment
3. **♻️ Lifecycle Management**: ควบคุม singleton/transient lifecycle
4. **🧪 Easy Testing**: Mock services ได้ง่าย
5. **🔍 Service Discovery**: รู้ว่ามี services อะไรลงทะเบียนไว้บ้าง
6. **🧹 Resource Cleanup**: จัดการ dispose resources อัตโนมัติ

#### เมื่อไหร่ควรใช้ DI Container?

✅ **ใช้เมื่อ:**
- โปรเจคมี services เยอะ (10+ services)
- ต้องการ environment-specific configuration
- ทีมงานใหญ่ ต้องการ standardize การจัดการ dependencies
- มี complex dependency graph

❌ **ไม่ควรใช้เมื่อ:**
- โปรเจคเล็ก (< 5 services)
- ทีมงานเล็ก แค่ 1-2 คน
- ต้องการความเรียบง่าย
- Manual DI ก็เพียงพอแล้ว

**สรุป DI แบบง่ายๆ:**
- แทนที่จะให้ Service สร้าง dependencies เอง → ส่งเข้าไปให้แทน
- ใช้ Interface แทน Concrete Class
- สามารถเปลี่ยน Implementation ได้ตาม environment
- ทำให้ทดสอบง่ายขึ้นมาก!

## Complete CRUD Example

### Framework-Agnostic Service

```typescript
// types/user.types.ts
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  age?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserRequest {
  email: string;
  firstName: string;
  lastName: string;
  age?: number;
}

export interface UpdateUserRequest {
  email?: string;
  firstName?: string;
  lastName?: string;
  age?: number;
}

export interface GetUsersQuery {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: 'email' | 'firstName' | 'lastName' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedUsers {
  data: User[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// services/user.service.ts
import { UnifiedHttpContext, getRequestBody, getParams, getQuery, sendResponse, sendError } from '@inh-lib/api-util-fastify';

export class UserService {
  constructor(private userRepository: UserRepository) {}

  async createUser(context: UnifiedHttpContext): Promise<void> {
    try {
      const userData = getRequestBody<CreateUserRequest>(context);
      
      // Validation
      const validationError = this.validateCreateUserData(userData);
      if (validationError) {
        sendError(context, validationError, 422);
        return;
      }
      
      // Business rules
      const existingUser = await this.userRepository.findByEmail(userData.email);
      if (existingUser) {
        sendError(context, 'Email already exists', 409);
        return;
      }
      
      // Create user
      const user = await this.userRepository.create(userData);
      sendResponse(context, user, 201);
    } catch (error) {
      this.handleError(context, error, 'Failed to create user');
    }
  }

  async getUsers(context: UnifiedHttpContext): Promise<void> {
    try {
      const query = getQuery(context);
      
      const options: GetUsersQuery = {
        page: Number(query.page) || 1,
        limit: Math.min(Number(query.limit) || 10, 100), // Max 100 per page
        search: typeof query.search === 'string' ? query.search : undefined,
        sortBy: this.validateSortBy(query.sortBy),
        sortOrder: query.sortOrder === 'desc' ? 'desc' : 'asc',
      };
      
      const result = await this.userRepository.findMany(options);
      
      const response: PaginatedUsers = {
        data: result.users,
        pagination: {
          page: options.page!,
          limit: options.limit!,
          total: result.total,
          totalPages: Math.ceil(result.total / options.limit!),
        },
      };
      
      sendResponse(context, response);
    } catch (error) {
      this.handleError(context, error, 'Failed to fetch users');
    }
  }

  async getUserById(context: UnifiedHttpContext): Promise<void> {
    try {
      const params = getParams(context);
      const userId = params['id'];
      
      if (!userId) {
        sendError(context, 'User ID is required', 400);
        return;
      }
      
      const user = await this.userRepository.findById(userId);
      
      if (!user) {
        sendError(context, 'User not found', 404);
        return;
      }
      
      sendResponse(context, user);
    } catch (error) {
      this.handleError(context, error, 'Failed to fetch user');
    }
  }

  async updateUser(context: UnifiedHttpContext): Promise<void> {
    try {
      const params = getParams(context);
      const userId = params['id'];
      const updateData = getRequestBody<UpdateUserRequest>(context);
      
      if (!userId) {
        sendError(context, 'User ID is required', 400);
        return;
      }
      
      // Validation
      const validationError = this.validateUpdateUserData(updateData);
      if (validationError) {
        sendError(context, validationError, 422);
        return;
      }
      
      // Check if email is being changed and is already taken
      if (updateData.email) {
        const existingUser = await this.userRepository.findByEmail(updateData.email);
        if (existingUser && existingUser.id !== userId) {
          sendError(context, 'Email already exists', 409);
          return;
        }
      }
      
      const user = await this.userRepository.update(userId, updateData);
      
      if (!user) {
        sendError(context, 'User not found', 404);
        return;
      }
      
      sendResponse(context, user);
    } catch (error) {
      this.handleError(context, error, 'Failed to update user');
    }
  }

  async deleteUser(context: UnifiedHttpContext): Promise<void> {
    try {
      const params = getParams(context);
      const userId = params['id'];
      
      if (!userId) {
        sendError(context, 'User ID is required', 400);
        return;
      }
      
      const deleted = await this.userRepository.delete(userId);
      
      if (!deleted) {
        sendError(context, 'User not found', 404);
        return;
      }
      
      sendResponse(context, { message: 'User deleted successfully' });
    } catch (error) {
      this.handleError(context, error, 'Failed to delete user');
    }
  }

  // Private helper methods
  private validateCreateUserData(userData: CreateUserRequest): string | null {
    if (!userData.email) return 'Email is required';
    if (!userData.firstName) return 'First name is required';
    if (!userData.lastName) return 'Last name is required';
    if (!this.isValidEmail(userData.email)) return 'Invalid email format';
    if (userData.age !== undefined && (userData.age < 13 || userData.age > 120)) {
      return 'Age must be between 13 and 120';
    }
    return null;
  }

  private validateUpdateUserData(updateData: UpdateUserRequest): string | null {
    if (updateData.email && !this.isValidEmail(updateData.email)) {
      return 'Invalid email format';
    }
    if (updateData.firstName !== undefined && !updateData.firstName) {
      return 'First name cannot be empty';
    }
    if (updateData.lastName !== undefined && !updateData.lastName) {
      return 'Last name cannot be empty';
    }
    if (updateData.age !== undefined && (updateData.age < 13 || updateData.age > 120)) {
      return 'Age must be between 13 and 120';
    }
    return null;
  }

  private validateSortBy(sortBy: unknown): 'email' | 'firstName' | 'lastName' | 'createdAt' {
    const validSorts = ['email', 'firstName', 'lastName', 'createdAt'];
    return validSorts.includes(sortBy as string) 
      ? (sortBy as 'email' | 'firstName' | 'lastName' | 'createdAt')
      : 'createdAt';
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private handleError(context: UnifiedHttpContext, error: unknown, message: string): void {
    console.error(`${message}:`, error);
    sendError(context, message, 500);
  }
}
```

### Repository Interface & Implementation

```typescript
// repositories/user.repository.ts
export interface UserRepository {
  create(userData: CreateUserRequest): Promise<User>;
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findMany(options: GetUsersQuery): Promise<{ users: User[]; total: number }>;
  update(id: string, userData: UpdateUserRequest): Promise<User | null>;
  delete(id: string): Promise<boolean>;
}

// repositories/prisma-user.repository.ts
import { PrismaClient } from '@prisma/client';

export class PrismaUserRepository implements UserRepository {
  constructor(private prisma: PrismaClient) {}

  async create(userData: CreateUserRequest): Promise<User> {
    const user = await this.prisma.user.create({
      data: {
        ...userData,
        id: this.generateId(),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    
    return this.mapPrismaUserToUser(user);
  }

  async findById(id: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });
    
    return user ? this.mapPrismaUserToUser(user) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });
    
    return user ? this.mapPrismaUserToUser(user) : null;
  }

  async findMany(options: GetUsersQuery): Promise<{ users: User[]; total: number }> {
    const page = options.page || 1;
    const limit = options.limit || 10;
    const skip = (page - 1) * limit;
    
    const where = this.buildWhereClause(options.search);
    const orderBy = this.buildOrderBy(options.sortBy, options.sortOrder);
    
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);
    
    return {
      users: users.map(this.mapPrismaUserToUser),
      total,
    };
  }

  async update(id: string, userData: UpdateUserRequest): Promise<User | null> {
    try {
      const user = await this.prisma.user.update({
        where: { id },
        data: {
          ...userData,
          updatedAt: new Date(),
        },
      });
      
      return this.mapPrismaUserToUser(user);
    } catch (error) {
      // User not found or other error
      return null;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      await this.prisma.user.delete({ where: { id } });
      return true;
    } catch (error) {
      return false;
    }
  }

  private buildWhereClause(search?: string) {
    if (!search) return {};
    
    return {
      OR: [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ],
    };
  }

  private buildOrderBy(sortBy?: string, sortOrder?: string) {
    const field = sortBy || 'createdAt';
    const order = sortOrder || 'asc';
    return { [field]: order };
  }

  private mapPrismaUserToUser(prismaUser: any): User {
    return {
      id: prismaUser.id,
      email: prismaUser.email,
      firstName: prismaUser.firstName,
      lastName: prismaUser.lastName,
      age: prismaUser.age || undefined,
      createdAt: prismaUser.createdAt,
      updatedAt: prismaUser.updatedAt,
    };
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }
}
```

## CQRS Pattern (Command Query Responsibility Segregation)

CQRS เป็นการแยก operations ออกเป็น 2 ประเภท:
- **Commands**: การเปลี่ยนแปลงข้อมูล (Create, Update, Delete)
- **Queries**: การอ่านข้อมูล (Read)

### ทำไมต้องใช้ CQRS?

```typescript
// ❌ ปัญหา: Service ทำหน้าที่หลายอย่างรวมกัน
class UserService {
  // Read operations
  async getUsers() { /* complex query logic */ }
  async getUserById() { /* simple read */ }
  async searchUsers() { /* complex search with filters */ }
  
  // Write operations  
  async createUser() { /* validation + business rules + save */ }
  async updateUser() { /* check permissions + validate + update */ }
  async deleteUser() { /* cascade delete + cleanup */ }
  
  // Mixed concerns ทำให้ยากต่อการ maintain และ scale
}

// ✅ แก้ปัญหาด้วย CQRS: แยกความรับผิดชอบ
class UserCommands {
  // เฉพาะ write operations
  async createUser() { /* business logic for creation */ }
  async updateUser() { /* business logic for updates */ }
  async deleteUser() { /* business logic for deletion */ }
}

class UserQueries {
  // เฉพาะ read operations
  async getUsers() { /* optimized for reading */ }
  async getUserById() { /* simple lookup */ }
  async searchUsers() { /* complex search logic */ }
}
```

### Command Handlers

```typescript
// commands/user/create-user.command.ts
export interface CreateUserCommandInput {
  email: string;
  firstName: string;
  lastName: string;
  age?: number;
}

export class CreateUserCommand {
  constructor(
    private userRepository: UserRepository,
    private eventBus?: EventBus // Optional: for domain events
  ) {}

  async execute(input: CreateUserCommandInput): Promise<User> {
    // 1. Business validation
    if (!this.isValidEmail(input.email)) {
      throw new ValidationError('Invalid email format');
    }
    
    // 2. Business rules
    const existingUser = await this.userRepository.findByEmail(input.email);
    if (existingUser) {
      throw new ConflictError('Email already exists');
    }
    
    // 3. Domain logic
    const user = this.createUserEntity(input);
    
    // 4. Persistence
    const savedUser = await this.userRepository.save(user);
    
    // 5. Domain events (optional)
    if (this.eventBus) {
      await this.eventBus.publish(new UserCreatedEvent(savedUser));
    }
    
    return savedUser;
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  private createUserEntity(input: CreateUserCommandInput): User {
    return {
      id: this.generateId(),
      email: input.email,
      firstName: input.firstName,
      lastName: input.lastName,
      age: input.age,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  private generateId(): string {
    return crypto.randomUUID();
  }
}

// commands/user/update-user.command.ts
export interface UpdateUserCommandInput {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  age?: number;
}

export class UpdateUserCommand {
  constructor(private userRepository: UserRepository) {}

  async execute(input: UpdateUserCommandInput): Promise<User> {
    // 1. Check existence
    const existingUser = await this.userRepository.findById(input.id);
    if (!existingUser) {
      throw new NotFoundError('User not found');
    }
    
    // 2. Business validation
    if (input.email && input.email !== existingUser.email) {
      const emailTaken = await this.userRepository.findByEmail(input.email);
      if (emailTaken) {
        throw new ConflictError('Email already exists');
      }
    }
    
    // 3. Apply changes
    const updatedUser: User = {
      ...existingUser,
      ...input,
      updatedAt: new Date(),
    };
    
    // 4. Persistence
    return await this.userRepository.save(updatedUser);
  }
}

// commands/user/delete-user.command.ts
export interface DeleteUserCommandInput {
  id: string;
}

export class DeleteUserCommand {
  constructor(
    private userRepository: UserRepository,
    private orderRepository: OrderRepository // สำหรับ cascade operations
  ) {}

  async execute(input: DeleteUserCommandInput): Promise<void> {
    // 1. Check existence
    const user = await this.userRepository.findById(input.id);
    if (!user) {
      throw new NotFoundError('User not found');
    }
    
    // 2. Business rules - check for dependencies
    const userOrders = await this.orderRepository.findByUserId(input.id);
    if (userOrders.length > 0) {
      throw new ConflictError('Cannot delete user with existing orders');
    }
    
    // 3. Delete
    await this.userRepository.delete(input.id);
  }
}
```

### Query Handlers

```typescript
// queries/user/get-users.query.ts
export interface GetUsersQueryInput {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: 'email' | 'firstName' | 'lastName' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
  filters?: {
    ageMin?: number;
    ageMax?: number;
    isActive?: boolean;
  };
}

export interface GetUsersQueryResult {
  users: User[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class GetUsersQuery {
  constructor(private userRepository: UserRepository) {}

  async execute(input: GetUsersQueryInput = {}): Promise<GetUsersQueryResult> {
    const page = input.page || 1;
    const limit = Math.min(input.limit || 10, 100); // Max 100 per page
    
    const queryOptions = {
      page,
      limit,
      search: input.search,
      sortBy: input.sortBy || 'createdAt',
      sortOrder: input.sortOrder || 'desc',
      filters: input.filters,
    };
    
    const result = await this.userRepository.findMany(queryOptions);
    
    return {
      users: result.users,
      total: result.total,
      page,
      limit,
      totalPages: Math.ceil(result.total / limit),
    };
  }
}

// queries/user/get-user-by-id.query.ts
export interface GetUserByIdQueryInput {
  id: string;
  includeProfile?: boolean;
  includeOrders?: boolean;
}

export class GetUserByIdQuery {
  constructor(
    private userRepository: UserRepository,
    private orderRepository: OrderRepository
  ) {}

  async execute(input: GetUserByIdQueryInput): Promise<User | null> {
    const user = await this.userRepository.findById(input.id);
    
    if (!user) {
      return null;
    }
    
    // Optional: Include related data based on query parameters
    if (input.includeOrders) {
      const orders = await this.orderRepository.findByUserId(input.id);
      (user as any).orders = orders;
    }
    
    return user;
  }
}

// queries/user/search-users.query.ts
export interface SearchUsersQueryInput {
  searchTerm: string;
  searchFields?: ('email' | 'firstName' | 'lastName')[];
  page?: number;
  limit?: number;
}

export class SearchUsersQuery {
  constructor(private userRepository: UserRepository) {}

  async execute(input: SearchUsersQueryInput): Promise<GetUsersQueryResult> {
    const searchFields = input.searchFields || ['email', 'firstName', 'lastName'];
    const page = input.page || 1;
    const limit = Math.min(input.limit || 10, 50);
    
    const result = await this.userRepository.search({
      term: input.searchTerm,
      fields: searchFields,
      page,
      limit,
    });
    
    return {
      users: result.users,
      total: result.total,
      page,
      limit,
      totalPages: Math.ceil(result.total / limit),
    };
  }
}
```

### CQRS Route Handlers

```typescript
// routes/user.routes.ts - CQRS Version
import { UnifiedHttpContext, getRequestBody, getParams, getQuery, sendResponse, sendError } from '@inh-lib/api-util-fastify';

export class UserRoutes {
  constructor(
    private createUserCommand: CreateUserCommand,
    private updateUserCommand: UpdateUserCommand,
    private deleteUserCommand: DeleteUserCommand,
    private getUsersQuery: GetUsersQuery,
    private getUserByIdQuery: GetUserByIdQuery,
    private searchUsersQuery: SearchUsersQuery
  ) {}

  // === COMMAND HANDLERS (Write Operations) ===
  async createUser(context: UnifiedHttpContext): Promise<void> {
    try {
      const input = getRequestBody<CreateUserCommandInput>(context);
      
      const user = await this.createUserCommand.execute(input);
      
      sendResponse(context, user, 201);
    } catch (error) {
      this.handleCommandError(context, error);
    }
  }

  async updateUser(context: UnifiedHttpContext): Promise<void> {
    try {
      const params = getParams(context);
      const updateData = getRequestBody<Omit<UpdateUserCommandInput, 'id'>>(context);
      
      const input: UpdateUserCommandInput = {
        id: params['id'],
        ...updateData,
      };
      
      const user = await this.updateUserCommand.execute(input);
      
      sendResponse(context, user);
    } catch (error) {
      this.handleCommandError(context, error);
    }
  }

  async deleteUser(context: UnifiedHttpContext): Promise<void> {
    try {
      const params = getParams(context);
      
      await this.deleteUserCommand.execute({ id: params['id'] });
      
      sendResponse(context, { message: 'User deleted successfully' });
    } catch (error) {
      this.handleCommandError(context, error);
    }
  }

  // === QUERY HANDLERS (Read Operations) ===
  async getUsers(context: UnifiedHttpContext): Promise<void> {
    try {
      const query = getQuery(context);
      
      const input: GetUsersQueryInput = {
        page: query.page ? Number(query.page) : undefined,
        limit: query.limit ? Number(query.limit) : undefined,
        search: query.search as string,
        sortBy: query.sortBy as any,
        sortOrder: query.sortOrder as 'asc' | 'desc',
        filters: {
          ageMin: query.ageMin ? Number(query.ageMin) : undefined,
          ageMax: query.ageMax ? Number(query.ageMax) : undefined,
          isActive: query.isActive === 'true' ? true : query.isActive === 'false' ? false : undefined,
        },
      };
      
      const result = await this.getUsersQuery.execute(input);
      
      sendResponse(context, result);
    } catch (error) {
      this.handleQueryError(context, error);
    }
  }

  async getUserById(context: UnifiedHttpContext): Promise<void> {
    try {
      const params = getParams(context);
      const query = getQuery(context);
      
      const input: GetUserByIdQueryInput = {
        id: params['id'],
        includeProfile: query.includeProfile === 'true',
        includeOrders: query.includeOrders === 'true',
      };
      
      const user = await this.getUserByIdQuery.execute(input);
      
      if (!user) {
        sendError(context, 'User not found', 404);
        return;
      }
      
      sendResponse(context, user);
    } catch (error) {
      this.handleQueryError(context, error);
    }
  }

  async searchUsers(context: UnifiedHttpContext): Promise<void> {
    try {
      const query = getQuery(context);
      
      if (!query.q) {
        sendError(context, 'Search term is required', 400);
        return;
      }
      
      const input: SearchUsersQueryInput = {
        searchTerm: query.q as string,
        searchFields: query.fields ? (query.fields as string).split(',') as any : undefined,
        page: query.page ? Number(query.page) : undefined,
        limit: query.limit ? Number(query.limit) : undefined,
      };
      
      const result = await this.searchUsersQuery.execute(input);
      
      sendResponse(context, result);
    } catch (error) {
      this.handleQueryError(context, error);
    }
  }

  // === ERROR HANDLERS ===
  private handleCommandError(context: UnifiedHttpContext, error: unknown): void {
    if (error instanceof ValidationError) {
      sendError(context, error.message, 422);
    } else if (error instanceof ConflictError) {
      sendError(context, error.message, 409);
    } else if (error instanceof NotFoundError) {
      sendError(context, error.message, 404);
    } else {
      console.error('Command error:', error);
      sendError(context, 'Internal server error', 500);
    }
  }

  private handleQueryError(context: UnifiedHttpContext, error: unknown): void {
    console.error('Query error:', error);
    sendError(context, 'Failed to fetch data', 500);
  }
}

// Custom Error Classes
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}
```

### CQRS with DI Container

```typescript
// infrastructure/di/cqrs-service-registry.ts
export class CQRSServiceRegistry {
  static registerCQRSServices(container: DIContainer, config: AppConfig): void {
    // === Base Services ===
    container.register('userRepository', () => 
      new PrismaUserRepository(container.get('prisma')), 
      ServiceLifecycle.SINGLETON
    );
    
    container.register('orderRepository', () => 
      new PrismaOrderRepository(container.get('prisma')), 
      ServiceLifecycle.SINGLETON
    );
    
    // === COMMAND HANDLERS ===
    container.register('createUserCommand', () => 
      new CreateUserCommand(container.get('userRepository')), 
      ServiceLifecycle.SINGLETON
    );
    
    container.register('updateUserCommand', () => 
      new UpdateUserCommand(container.get('userRepository')), 
      ServiceLifecycle.SINGLETON
    );
    
    container.register('deleteUserCommand', () => 
      new DeleteUserCommand(
        container.get('userRepository'),
        container.get('orderRepository')
      ), 
      ServiceLifecycle.SINGLETON
    );
    
    // === QUERY HANDLERS ===
    container.register('getUsersQuery', () => 
      new GetUsersQuery(container.get('userRepository')), 
      ServiceLifecycle.SINGLETON
    );
    
    container.register('getUserByIdQuery', () => 
      new GetUserByIdQuery(
        container.get('userRepository'),
        container.get('orderRepository')
      ), 
      ServiceLifecycle.SINGLETON
    );
    
    container.register('searchUsersQuery', () => 
      new SearchUsersQuery(container.get('userRepository')), 
      ServiceLifecycle.SINGLETON
    );
    
    // === ROUTE HANDLERS ===
    container.register('userRoutes', () => 
      new UserRoutes(
        container.get('createUserCommand'),
        container.get('updateUserCommand'),
        container.get('deleteUserCommand'),
        container.get('getUsersQuery'),
        container.get('getUserByIdQuery'),
        container.get('searchUsersQuery')
      ), 
      ServiceLifecycle.SINGLETON
    );
  }
}

// adapters/fastify/cqrs-app.ts
export async function createCQRSFastifyApp(container: DIContainer): Promise<FastifyInstance> {
  const fastify: FastifyInstance = require('fastify')({ logger: true });
  
  const userRoutes = container.get('userRoutes') as UserRoutes;
  
  // === USER ROUTES ===
  // Commands (Write)
  fastify.post('/users', async (request, reply) => {
    const context = createFastifyContext(request, reply);
    await userRoutes.createUser(context);
  });
  
  fastify.put('/users/:id', async (request, reply) => {
    const context = createFastifyContext(request, reply);
    await userRoutes.updateUser(context);
  });
  
  fastify.delete('/users/:id', async (request, reply) => {
    const context = createFastifyContext(request, reply);
    await userRoutes.deleteUser(context);
  });
  
  // Queries (Read)
  fastify.get('/users', async (request, reply) => {
    const context = createFastifyContext(request, reply);
    await userRoutes.getUsers(context);
  });
  
  fastify.get('/users/:id', async (request, reply) => {
    const context = createFastifyContext(request, reply);
    await userRoutes.getUserById(context);
  });
  
  fastify.get('/users/search', async (request, reply) => {
    const context = createFastifyContext(request, reply);
    await userRoutes.searchUsers(context);
  });
  
  return fastify;
}
```

### Benefits of CQRS Pattern

1. **🎯 Separation of Concerns**: Read และ Write logic แยกกันชัดเจน
2. **🚀 Performance**: Optimize queries และ commands แยกกัน
3. **🧪 Testing**: Test commands และ queries แยกกัน
4. **📈 Scalability**: Scale read และ write operations แยกกัน
5. **🔧 Maintainability**: เปลี่ยนแปลง business logic ง่ายขึ้น
6. **👥 Team Work**: ทีมแยกทำ read/write features ได้

## Route Library Patterns

สร้าง library ของ routes ที่สามารถนำกลับมาใช้ได้และจัดการได้ง่าย

### Route Definition Registry

```typescript
// route-library/types.ts
export interface RouteDefinition {
  method: HttpMethod;
  path: string;
  handler: RouteHandler;
  middleware?: RouteHandler[];
  schema?: RouteSchema;
  tags?: string[];
  auth?: AuthRequirement;
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
export type RouteHandler = (context: UnifiedHttpContext) => Promise<void>;

export interface RouteSchema {
  body?: any;
  params?: any;
  query?: any;
  response?: Record<number, any>;
}

export interface AuthRequirement {
  required: boolean;
  roles?: string[];
  permissions?: string[];
}

// route-library/registry.ts
export class RouteRegistry {
  private routes = new Map<string, RouteDefinition>();
  private groups = new Map<string, RouteDefinition[]>();
  
  register(id: string, route: RouteDefinition): void {
    this.routes.set(id, route);
  }
  
  registerGroup(groupName: string, routes: RouteDefinition[]): void {
    routes.forEach((route, index) => {
      const id = `${groupName}-${index}`;
      this.register(id, route);
    });
    this.groups.set(groupName, routes);
  }
  
  get(id: string): RouteDefinition | undefined {
    return this.routes.get(id);
  }
  
  getGroup(groupName: string): RouteDefinition[] {
    return this.groups.get(groupName) || [];
  }
  
  getAllRoutes(): RouteDefinition[] {
    return Array.from(this.routes.values());
  }
  
  getRoutesByTag(tag: string): RouteDefinition[] {
    return this.getAllRoutes().filter(route => 
      route.tags?.includes(tag)
    );
  }
  
  getProtectedRoutes(): RouteDefinition[] {
    return this.getAllRoutes().filter(route => 
      route.auth?.required === true
    );
  }
}
```

### Domain Route Libraries

```typescript
// route-library/domains/user-routes.library.ts
export class UserRoutesLibrary {
  constructor(private userRoutes: UserRoutes) {}
  
  getRouteDefinitions(): RouteDefinition[] {
    return [
      // Commands (Write Operations)
      {
        method: 'POST',
        path: '/users',
        handler: (context) => this.userRoutes.createUser(context),
        schema: {
          body: CreateUserSchema,
          response: { 201: UserResponseSchema, 422: ErrorResponseSchema }
        },
        tags: ['users', 'commands'],
        auth: { required: false }
      },
      {
        method: 'PUT',
        path: '/users/:id',
        handler: (context) => this.userRoutes.updateUser(context),
        schema: {
          params: UserParamsSchema,
          body: UpdateUserSchema,
          response: { 200: UserResponseSchema, 404: ErrorResponseSchema }
        },
        tags: ['users', 'commands'],
        auth: { required: true, permissions: ['users:update'] }
      },
      {
        method: 'DELETE',
        path: '/users/:id',
        handler: (context) => this.userRoutes.deleteUser(context),
        schema: {
          params: UserParamsSchema,
          response: { 200: SuccessResponseSchema, 404: ErrorResponseSchema }
        },
        tags: ['users', 'commands'],
        auth: { required: true, permissions: ['users:delete'] }
      },
      
      // Queries (Read Operations)
      {
        method: 'GET',
        path: '/users',
        handler: (context) => this.userRoutes.getUsers(context),
        schema: {
          query: GetUsersQuerySchema,
          response: { 200: PaginatedUsersResponseSchema }
        },
        tags: ['users', 'queries'],
        auth: { required: true, permissions: ['users:read'] }
      },
      {
        method: 'GET',
        path: '/users/:id',
        handler: (context) => this.userRoutes.getUserById(context),
        schema: {
          params: UserParamsSchema,
          query: GetUserByIdQuerySchema,
          response: { 200: UserResponseSchema, 404: ErrorResponseSchema }
        },
        tags: ['users', 'queries'],
        auth: { required: true, permissions: ['users:read'] }
      },
      {
        method: 'GET',
        path: '/users/search',
        handler: (context) => this.userRoutes.searchUsers(context),
        schema: {
          query: SearchUsersQuerySchema,
          response: { 200: PaginatedUsersResponseSchema }
        },
        tags: ['users', 'queries', 'search'],
        auth: { required: true, permissions: ['users:read'] }
      }
    ];
  }
}

// route-library/domains/order-routes.library.ts
export class OrderRoutesLibrary {
  constructor(private orderRoutes: OrderRoutes) {}
  
  getRouteDefinitions(): RouteDefinition[] {
    return [
      {
        method: 'POST',
        path: '/orders',
        handler: (context) => this.orderRoutes.createOrder(context),
        tags: ['orders', 'commands'],
        auth: { required: true, permissions: ['orders:create'] }
      },
      {
        method: 'GET',
        path: '/orders',
        handler: (context) => this.orderRoutes.getOrders(context),
        tags: ['orders', 'queries'],
        auth: { required: true, permissions: ['orders:read'] }
      },
      {
        method: 'GET',
        path: '/orders/:id',
        handler: (context) => this.orderRoutes.getOrderById(context),
        tags: ['orders', 'queries'],
        auth: { required: true, permissions: ['orders:read'] }
      }
    ];
  }
}
```

### Dynamic Route Loading

```typescript
// route-library/loader.ts
export class RouteLoader {
  constructor(
    private registry: RouteRegistry,
    private authMiddleware: RouteHandler,
    private permissionMiddleware: (permissions: string[]) => RouteHandler
  ) {}
  
  loadDomainRoutes(
    domain: string, 
    routeLibrary: { getRouteDefinitions(): RouteDefinition[] }
  ): void {
    const routes = routeLibrary.getRouteDefinitions();
    
    // Add auth middleware to protected routes
    const processedRoutes = routes.map(route => {
      if (route.auth?.required) {
        const middleware = [this.authMiddleware];
        
        // Add permission middleware if required
        if (route.auth.permissions?.length) {
          middleware.push(this.permissionMiddleware(route.auth.permissions));
        }
        
        return {
          ...route,
          middleware: [...(route.middleware || []), ...middleware]
        };
      }
      
      return route;
    });
    
    this.registry.registerGroup(domain, processedRoutes);
  }
  
  loadAllDomains(domains: Record<string, { getRouteDefinitions(): RouteDefinition[] }>): void {
    Object.entries(domains).forEach(([domainName, routeLibrary]) => {
      this.loadDomainRoutes(domainName, routeLibrary);
    });
  }
}

// route-library/framework-adapters/fastify-adapter.ts
export class FastifyRouteAdapter {
  constructor(private fastify: FastifyInstance) {}
  
  registerRoute(route: RouteDefinition): void {
    const method = route.method.toLowerCase() as any;
    
    // Build Fastify route config
    const routeConfig: any = {};
    
    // Add schema if provided
    if (route.schema) {
      routeConfig.schema = {
        body: route.schema.body,
        params: route.schema.params,
        querystring: route.schema.query,
        response: route.schema.response,
        tags: route.tags,
      };
    }
    
    // Register route
    this.fastify[method](route.path, routeConfig, async (request: any, reply: any) => {
      const context = createFastifyContext(request, reply);
      
      try {
        // Apply middleware
        if (route.middleware) {
          for (const middleware of route.middleware) {
            await middleware(context);
            // Check if middleware sent a response (error occurred)
            if (reply.sent) return;
          }
        }
        
        // Execute handler
        await route.handler(context);
      } catch (error) {
        console.error(`Route error [${route.method} ${route.path}]:`, error);
        sendError(context, 'Internal server error', 500);
      }
    });
  }
  
  registerRoutes(routes: RouteDefinition[]): void {
    routes.forEach(route => this.registerRoute(route));
  }
  
  registerFromRegistry(registry: RouteRegistry): void {
    const allRoutes = registry.getAllRoutes();
    this.registerRoutes(allRoutes);
  }
}
```

### Complete Route Library Setup

```typescript
// main.ts - Complete setup with Route Libraries
async function createAppWithRouteLibraries() {
  const config = loadConfig();
  const container = new DIContainer();
  
  // Register CQRS services
  CQRSServiceRegistry.registerCQRSServices(container, config);
  
  // Setup route registry and loader
  const registry = new RouteRegistry();
  const authMiddleware = container.get('authMiddleware');
  const permissionMiddleware = container.get('permissionMiddleware');
  const loader = new RouteLoader(registry, authMiddleware, permissionMiddleware);
  
  // Create domain route libraries
  const domains = {
    users: new UserRoutesLibrary(container.get('userRoutes')),
    orders: new OrderRoutesLibrary(container.get('orderRoutes')),
    notifications: new NotificationRoutesLibrary(container.get('notificationRoutes')),
  };
  
  // Load all domain routes
  loader.loadAllDomains(domains);
  
  // Create Fastify app
  const fastify: FastifyInstance = require('fastify')({ logger: true });
  
  // Setup Fastify adapter and register all routes
  const adapter = new FastifyRouteAdapter(fastify);
  adapter.registerFromRegistry(registry);
  
  // Add route introspection endpoints
  fastify.get('/routes', async (request, reply) => {
    const allRoutes = registry.getAllRoutes().map(route => ({
      method: route.method,
      path: route.path,
      tags: route.tags,
      auth: route.auth,
    }));
    
    return { routes: allRoutes };
  });
  
  fastify.get('/routes/tags/:tag', async (request, reply) => {
    const { tag } = request.params as any;
    const routes = registry.getRoutesByTag(tag).map(route => ({
      method: route.method,
      path: route.path,
      tags: route.tags,
    }));
    
    return { tag, routes };
  });
  
  return fastify;
}

// Usage
async function main() {
  const app = await createAppWithRouteLibraries();
  
  await app.listen({ port: 3000 });
  console.log('🚀 Server with Route Libraries running on port 3000');
  console.log('📚 Route introspection available at:');
  console.log('   GET /routes - All routes');
  console.log('   GET /routes/tags/users - User routes');
  console.log('   GET /routes/tags/commands - Command routes');
  console.log('   GET /routes/tags/queries - Query routes');
}
```

### Benefits of Route Library Patterns

1. **📚 Reusability**: นำ route definitions กลับมาใช้ได้ในหลาย applications
2. **🏗️ Organization**: จัดกลุ่ม routes ตาม domain และ functionality
3. **🔍 Introspection**: ดู routes ที่มีทั้งหมดได้ง่าย
4. **🔐 Consistent Auth**: จัดการ authentication/authorization แบบ centralized
5. **📋 Documentation**: Schema และ tags สำหรับ auto-generated docs
6. **🧪 Testing**: Test route definitions แยกจาก framework
7. **🚀 Performance**: Lazy loading และ conditional route registration

## Framework Adapters

### Fastify Adapter

```typescript
// adapters/fastify-user.routes.ts
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { createFastifyContext } from '@inh-lib/api-util-fastify';
import { UserService } from '../services/user.service';

export function registerUserRoutes(fastify: FastifyInstance, userService: UserService) {
  // All routes are thin adapters - no business logic here!
  
  fastify.post<{ Body: CreateUserRequest }>('/users', async (request: FastifyRequest, reply: FastifyReply) => {
    const context = createFastifyContext(request, reply);
    await userService.createUser(context);
  });

  fastify.get('/users', async (request: FastifyRequest, reply: FastifyReply) => {
    const context = createFastifyContext(request, reply);
    await userService.getUsers(context);
  });

  fastify.get<{ Params: { id: string } }>('/users/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const context = createFastifyContext(request, reply);
    await userService.getUserById(context);
  });

  fastify.put<{ 
    Params: { id: string }; 
    Body: UpdateUserRequest 
  }>('/users/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const context = createFastifyContext(request, reply);
    await userService.updateUser(context);
  });

  fastify.delete<{ Params: { id: string } }>('/users/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const context = createFastifyContext(request, reply);
    await userService.deleteUser(context);
  });
}

// Setup application
const prisma = new PrismaClient();
const userRepository = new PrismaUserRepository(prisma);
const userService = new UserService(userRepository);

const fastify: FastifyInstance = require('fastify')({ logger: true });

// Register routes
registerUserRoutes(fastify, userService);

// Start server
const start = async () => {
  try {
    await fastify.listen({ port: 3000 });
    console.log('Fastify server listening on port 3000');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
```

### Express Adapter (Future)

```typescript
// adapters/express-user.routes.ts (when Express adapter is available)
import { Express, Request, Response } from 'express';
import { createExpressContext } from '@inh-lib/api-util-express';
import { UserService } from '../services/user.service';

export function registerUserRoutes(app: Express, userService: UserService) {
  // Same business logic, different framework adapter!
  
  app.post('/users', async (req: Request, res: Response) => {
    const context = createExpressContext(req, res);
    await userService.createUser(context); // Same service method!
  });

  app.get('/users', async (req: Request, res: Response) => {
    const context = createExpressContext(req, res);
    await userService.getUsers(context);
  });

  app.get('/users/:id', async (req: Request, res: Response) => {
    const context = createExpressContext(req, res);
    await userService.getUserById(context);
  });

  app.put('/users/:id', async (req: Request, res: Response) => {
    const context = createExpressContext(req, res);
    await userService.updateUser(context);
  });

  app.delete('/users/:id', async (req: Request, res: Response) => {
    const context = createExpressContext(req, res);
    await userService.deleteUser(context);
  });
}

// Setup Express application
const express = require('express');
const app = express();

app.use(express.json());

const prisma = new PrismaClient();
const userRepository = new PrismaUserRepository(prisma);
const userService = new UserService(userRepository); // Same service!

// Register routes
registerUserRoutes(app, userService);

// Start server
app.listen(3000, () => {
  console.log('Express server listening on port 3000');
});
```

### Koa Adapter (Future)

```typescript
// adapters/koa-user.routes.ts (when Koa adapter is available)
import Router from 'koa-router';
import { Context } from 'koa';
import { createKoaContext } from '@inh-lib/api-util-koa';
import { UserService } from '../services/user.service';

export function createUserRouter(userService: UserService): Router {
  const router = new Router();

  // Same business logic, different framework adapter!
  
  router.post('/users', async (ctx: Context) => {
    const context = createKoaContext(ctx);
    await userService.createUser(context); // Same service method!
  });

  router.get('/users', async (ctx: Context) => {
    const context = createKoaContext(ctx);
    await userService.getUsers(context);
  });

  router.get('/users/:id', async (ctx: Context) => {
    const context = createKoaContext(ctx);
    await userService.getUserById(context);
  });

  router.put('/users/:id', async (ctx: Context) => {
    const context = createKoaContext(ctx);
    await userService.updateUser(context);
  });

  router.delete('/users/:id', async (ctx: Context) => {
    const context = createKoaContext(ctx);
    await userService.deleteUser(context);
  });

  return router;
}

// Setup Koa application
const Koa = require('koa');
const bodyParser = require('koa-bodyparser');

const app = new Koa();
app.use(bodyParser());

const prisma = new PrismaClient();
const userRepository = new PrismaUserRepository(prisma);
const userService = new UserService(userRepository); // Same service!

// Register routes
const userRouter = createUserRouter(userService);
app.use(userRouter.routes());
app.use(userRouter.allowedMethods());

// Start server
app.listen(3000, () => {
  console.log('Koa server listening on port 3000');
});
```

## Advanced Patterns

### Route Factory Pattern

```typescript
// factories/route.factory.ts
import { UnifiedHttpContext } from '@inh-lib/api-util-fastify';

export interface RouteHandler {
  (context: UnifiedHttpContext): Promise<void>;
}

export interface RouteDefinition {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  handler: RouteHandler;
  middleware?: RouteHandler[];
}

// Create reusable route definitions
export function createUserRouteDefinitions(userService: UserService): RouteDefinition[] {
  return [
    {
      method: 'POST',
      path: '/users',
      handler: (context) => userService.createUser(context),
    },
    {
      method: 'GET',
      path: '/users',
      handler: (context) => userService.getUsers(context),
    },
    {
      method: 'GET',
      path: '/users/:id',
      handler: (context) => userService.getUserById(context),
    },
    {
      method: 'PUT',
      path: '/users/:id',
      handler: (context) => userService.updateUser(context),
    },
    {
      method: 'DELETE',
      path: '/users/:id',
      handler: (context) => userService.deleteUser(context),
    },
  ];
}

// Framework adapters
export function registerFastifyRoutes(fastify: FastifyInstance, routes: RouteDefinition[]) {
  routes.forEach(route => {
    const method = route.method.toLowerCase() as 'get' | 'post' | 'put' | 'delete' | 'patch';
    
    fastify[method](route.path, async (request: FastifyRequest, reply: FastifyReply) => {
      const context = createFastifyContext(request, reply);
      
      // Apply middleware if any
      if (route.middleware) {
        for (const middleware of route.middleware) {
          await middleware(context);
        }
      }
      
      // Execute handler
      await route.handler(context);
    });
  });
}

// Usage
const userService = new UserService(userRepository);
const routeDefinitions = createUserRouteDefinitions(userService);

// Register with any framework
registerFastifyRoutes(fastify, routeDefinitions);
// registerExpressRoutes(express, routeDefinitions);  // When available
// registerKoaRoutes(koaRouter, routeDefinitions);   // When available
```

### Middleware Pattern

```typescript
// middleware/auth.middleware.ts
export function createAuthMiddleware(authService: AuthService): RouteHandler {
  return async (context: UnifiedHttpContext): Promise<void> => {
    const headers = getHeaders(context);
    const token = headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      sendError(context, 'Authentication required', 401);
      return;
    }
    
    const user = authService.validateToken(token);
    if (!user) {
      sendError(context, 'Invalid token', 401);
      return;
    }
    
    // Add user to context for downstream handlers
    (context as any).user = user;
  };
}

// middleware/rate-limit.middleware.ts
export function createRateLimitMiddleware(
  requests: number = 100,
  windowMs: number = 15 * 60 * 1000 // 15 minutes
): RouteHandler {
  const clients = new Map<string, { count: number; resetTime: number }>();
  
  return async (context: UnifiedHttpContext): Promise<void> => {
    const clientIp = getClientIP(context);
    const now = Date.now();
    
    const client = clients.get(clientIp) || { count: 0, resetTime: now + windowMs };
    
    if (now > client.resetTime) {
      client.count = 0;
      client.resetTime = now + windowMs;
    }
    
    client.count++;
    clients.set(clientIp, client);
    
    if (client.count > requests) {
      sendError(context, 'Rate limit exceeded', 429);
      return;
    }
  };
}

function getClientIP(context: UnifiedHttpContext): string {
  const headers = getHeaders(context);
  return headers['x-forwarded-for'] || headers['x-real-ip'] || '127.0.0.1';
}

// Usage with route definitions
const authMiddleware = createAuthMiddleware(authService);
const rateLimitMiddleware = createRateLimitMiddleware(100, 15 * 60 * 1000);

export function createProtectedUserRouteDefinitions(userService: UserService): RouteDefinition[] {
  return [
    {
      method: 'POST',
      path: '/users',
      handler: (context) => userService.createUser(context),
      middleware: [rateLimitMiddleware], // Public endpoint with rate limiting
    },
    {
      method: 'GET',
      path: '/users',
      handler: (context) => userService.getUsers(context),
      middleware: [authMiddleware], // Protected endpoint
    },
    {
      method: 'GET',
      path: '/users/:id',
      handler: (context) => userService.getUserById(context),
      middleware: [authMiddleware], // Protected endpoint
    },
    {
      method: 'PUT',
      path: '/users/:id',
      handler: (context) => userService.updateUser(context),
      middleware: [authMiddleware], // Protected endpoint
    },
    {
      method: 'DELETE',
      path: '/users/:id',
      handler: (context) => userService.deleteUser(context),
      middleware: [authMiddleware], // Protected endpoint
    },
  ];
}
```

## Testing Framework-Agnostic Code

### Service Testing (No HTTP Required)

```typescript
// __tests__/services/user.service.test.ts
import { UserService } from '../services/user.service';
import { createMockContext } from '@inh-lib/api-util-fastify/testing';

// Mock repository
class MockUserRepository implements UserRepository {
  private users: User[] = [];
  private nextId = 1;

  async create(userData: CreateUserRequest): Promise<User> {
    const user: User = {
      id: (this.nextId++).toString(),
      ...userData,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.push(user);
    return user;
  }

  async findById(id: string): Promise<User | null> {
    return this.users.find(user => user.id === id) || null;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.users.find(user => user.email === email) || null;
  }

  async findMany(options: GetUsersQuery): Promise<{ users: User[]; total: number }> {
    let filteredUsers = [...this.users];
    
    // Apply search filter
    if (options.search) {
      const search = options.search.toLowerCase();
      filteredUsers = filteredUsers.filter(user =>
        user.firstName.toLowerCase().includes(search) ||
        user.lastName.toLowerCase().includes(search) ||
        user.email.toLowerCase().includes(search)
      );
    }
    
    // Apply pagination
    const page = options.page || 1;
    const limit = options.limit || 10;
    const startIndex = (page - 1) * limit;
    const paginatedUsers = filteredUsers.slice(startIndex, startIndex + limit);
    
    return {
      users: paginatedUsers,
      total: filteredUsers.length,
    };
  }

  async update(id: string, userData: UpdateUserRequest): Promise<User | null> {
    const userIndex = this.users.findIndex(user => user.id === id);
    if (userIndex === -1) return null;
    
    this.users[userIndex] = {
      ...this.users[userIndex],
      ...userData,
      updatedAt: new Date(),
    };
    
    return this.users[userIndex];
  }

  async delete(id: string): Promise<boolean> {
    const userIndex = this.users.findIndex(user => user.id === id);
    if (userIndex === -1) return false;
    
    this.users.splice(userIndex, 1);
    return true;
  }

  // Test helpers
  clear() {
    this.users = [];
    this.nextId = 1;
  }

  seedUser(userData: Partial<User>): User {
    const user: User = {
      id: (this.nextId++).toString(),
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...userData,
    };
    this.users.push(user);
    return user;
  }
}

describe('UserService', () => {
  let userService: UserService;
  let mockRepository: MockUserRepository;

  beforeEach(() => {
    mockRepository = new MockUserRepository();
    userService = new UserService(mockRepository);
  });

  describe('createUser', () => {
    it('should create user successfully', async () => {
      const mockContext = createMockContext({
        body: {
          email: 'test@example.com',
          firstName: 'John',
          lastName: 'Doe',
          age: 25,
        },
      });

      await userService.createUser(mockContext);

      expect(mockContext.response.status).toHaveBeenCalledWith(201);
      expect(mockContext.response.json).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'test@example.com',
          firstName: 'John',
          lastName: 'Doe',
          age: 25,
        })
      );
    });

    it('should handle validation errors', async () => {
      const mockContext = createMockContext({
        body: {
          email: 'invalid-email',
          firstName: '',
          // Missing lastName
        },
      });

      await userService.createUser(mockContext);

      expect(mockContext.response.status).toHaveBeenCalledWith(422);
      expect(mockContext.response.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('required'),
        })
      );
    });

    it('should handle duplicate email', async () => {
      // Seed existing user
      mockRepository.seedUser({ email: 'existing@example.com' });

      const mockContext = createMockContext({
        body: {
          email: 'existing@example.com',
          firstName: 'Jane',
          lastName: 'Doe',
        },
      });

      await userService.createUser(mockContext);

      expect(mockContext.response.status).toHaveBeenCalledWith(409);
      expect(mockContext.response.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Email already exists',
        })
      );
    });
  });

  describe('getUsers', () => {
    beforeEach(() => {
      // Seed test data
      mockRepository.seedUser({ firstName: 'Alice', email: 'alice@example.com' });
      mockRepository.seedUser({ firstName: 'Bob', email: 'bob@example.com' });
      mockRepository.seedUser({ firstName: 'Charlie', email: 'charlie@example.com' });
    });

    it('should return paginated users', async () => {
      const mockContext = createMockContext({
        query: { page: '1', limit: '2' },
      });

      await userService.getUsers(mockContext);

      expect(mockContext.response.status).toHaveBeenCalledWith(200);
      expect(mockContext.response.json).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({ firstName: 'Alice' }),
          expect.objectContaining({ firstName: 'Bob' }),
        ]),
        pagination: {
          page: 1,
          limit: 2,
          total: 3,
          totalPages: 2,
        },
      });
    });

    it('should filter users by search', async () => {
      const mockContext = createMockContext({
        query: { search: 'alice' },
      });

      await userService.getUsers(mockContext);

      expect(mockContext.response.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: [expect.objectContaining({ firstName: 'Alice' })],
          pagination: expect.objectContaining({ total: 1 }),
        })
      );
    });
  });

  describe('getUserById', () => {
    it('should return user when found', async () => {
      const user = mockRepository.seedUser({ firstName: 'John' });

      const mockContext = createMockContext({
        params: { id: user.id },
      });

      await userService.getUserById(mockContext);

      expect(mockContext.response.status).toHaveBeenCalledWith(200);
      expect(mockContext.response.json).toHaveBeenCalledWith(
        expect.objectContaining({ id: user.id, firstName: 'John' })
      );
    });

    it('should return 404 when user not found', async () => {
      const mockContext = createMockContext({
        params: { id: 'non-existent' },
      });

      await userService.getUserById(mockContext);

      expect(mockContext.response.status).toHaveBeenCalledWith(404);
      expect(mockContext.response.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'User not found' })
      );
    });
  });

  describe('updateUser', () => {
    it('should update user successfully', async () => {
      const user = mockRepository.seedUser({ firstName: 'John' });

      const mockContext = createMockContext({
        params: { id: user.id },
        body: { firstName: 'Jane' },
      });

      await userService.updateUser(mockContext);

      expect(mockContext.response.status).toHaveBeenCalledWith(200);
      expect(mockContext.response.json).toHaveBeenCalledWith(
        expect.objectContaining({ id: user.id, firstName: 'Jane' })
      );
    });

    it('should handle email conflicts during update', async () => {
      const user1 = mockRepository.seedUser({ email: 'user1@example.com' });
      const user2 = mockRepository.seedUser({ email: 'user2@example.com' });

      const mockContext = createMockContext({
        params: { id: user1.id },
        body: { email: 'user2@example.com' }, // Try to use existing email
      });

      await userService.updateUser(mockContext);

      expect(mockContext.response.status).toHaveBeenCalledWith(409);
      expect(mockContext.response.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Email already exists' })
      );
    });
  });

  describe('deleteUser', () => {
    it('should delete user successfully', async () => {
      const user = mockRepository.seedUser({ firstName: 'John' });

      const mockContext = createMockContext({
        params: { id: user.id },
      });

      await userService.deleteUser(mockContext);

      expect(mockContext.response.status).toHaveBeenCalledWith(200);
      expect(mockContext.response.json).toHaveBeenCalledWith({
        message: 'User deleted successfully',
      });

      // Verify user is actually deleted
      const deletedUser = await mockRepository.findById(user.id);
      expect(deletedUser).toBeNull();
    });

    it('should return 404 when user not found', async () => {
      const mockContext = createMockContext({
        params: { id: 'non-existent' },
      });

      await userService.deleteUser(mockContext);

      expect(mockContext.response.status).toHaveBeenCalledWith(404);
      expect(mockContext.response.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'User not found' })
      );
    });
  });
});
```

### Integration Testing

```typescript
// __tests__/integration/user.integration.test.ts
import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { createApp } from '../helpers/test-app';

describe('User API Integration Tests', () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;

  beforeAll(async () => {
    // Setup test database
    prisma = new PrismaClient({
      datasources: { db: { url: process.env.TEST_DATABASE_URL } },
    });
    
    // Create test app
    app = await createApp(prisma);
  });

  beforeEach(async () => {
    // Clean database before each test
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  describe('POST /users', () => {
    it('should create user via HTTP', async () => {
      const userData = {
        email: 'integration@test.com',
        firstName: 'Integration',
        lastName: 'Test',
        age: 25,
      };

      const response = await app.inject({
        method: 'POST',
        url: '/users',
        payload: userData,
      });

      expect(response.statusCode).toBe(201);
      
      const user = JSON.parse(response.payload);
      expect(user).toMatchObject(userData);
      expect(user.id).toBeDefined();
      expect(user.createdAt).toBeDefined();

      // Verify in database
      const dbUser = await prisma.user.findUnique({
        where: { email: userData.email },
      });
      expect(dbUser).toBeTruthy();
    });

    it('should handle validation errors via HTTP', async () => {
      const invalidData = {
        email: 'invalid-email',
        firstName: '',
        // Missing lastName
      };

      const response = await app.inject({
        method: 'POST',
        url: '/users',
        payload: invalidData,
      });

      expect(response.statusCode).toBe(422);
      
      const error = JSON.parse(response.payload);
      expect(error.error).toContain('required');
    });
  });

  describe('GET /users', () => {
    beforeEach(async () => {
      // Seed test data
      await prisma.user.createMany({
        data: [
          { id: '1', email: 'user1@test.com', firstName: 'User', lastName: 'One' },
          { id: '2', email: 'user2@test.com', firstName: 'User', lastName: 'Two' },
          { id: '3', email: 'user3@test.com', firstName: 'User', lastName: 'Three' },
        ],
      });
    });

    it('should return paginated users via HTTP', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/users?page=1&limit=2',
      });

      expect(response.statusCode).toBe(200);
      
      const result = JSON.parse(response.payload);
      expect(result.data).toHaveLength(2);
      expect(result.pagination).toMatchObject({
        page: 1,
        limit: 2,
        total: 3,
        totalPages: 2,
      });
    });

    it('should filter users by search via HTTP', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/users?search=One',
      });

      expect(response.statusCode).toBe(200);
      
      const result = JSON.parse(response.payload);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].lastName).toBe('One');
    });
  });

  describe('GET /users/:id', () => {
    it('should return user by ID via HTTP', async () => {
      const user = await prisma.user.create({
        data: {
          id: 'test-id',
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
        },
      });

      const response = await app.inject({
        method: 'GET',
        url: `/users/${user.id}`,
      });

      expect(response.statusCode).toBe(200);
      
      const result = JSON.parse(response.payload);
      expect(result.id).toBe(user.id);
      expect(result.email).toBe(user.email);
    });

    it('should return 404 for non-existent user via HTTP', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/users/non-existent',
      });

      expect(response.statusCode).toBe(404);
      
      const error = JSON.parse(response.payload);
      expect(error.error).toBe('User not found');
    });
  });
});

// __tests__/helpers/test-app.ts
import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { PrismaUserRepository } from '../../repositories/prisma-user.repository';
import { UserService } from '../../services/user.service';
import { registerUserRoutes } from '../../adapters/fastify-user.routes';

export async function createApp(prisma: PrismaClient): Promise<FastifyInstance> {
  const fastify: FastifyInstance = require('fastify')({ logger: false });
  
  // Setup dependencies
  const userRepository = new PrismaUserRepository(prisma);
  const userService = new UserService(userRepository);
  
  // Register routes
  registerUserRoutes(fastify, userService);
  
  await fastify.ready();
  return fastify;
}
```

## Project Structure

### Recommended File Organization

```
src/
├── types/                          # Shared type definitions
│   ├── user.types.ts
│   ├── auth.types.ts
│   └── common.types.ts
├── services/                       # Framework-agnostic business logic
│   ├── user.service.ts
│   ├── auth.service.ts
│   ├── notification.service.ts
│   └── index.ts
├── repositories/                   # Data access interfaces & implementations
│   ├── interfaces/
│   │   ├── user.repository.ts
│   │   ├── auth.repository.ts
│   │   └── index.ts
│   ├── prisma/
│   │   ├── prisma-user.repository.ts
│   │   ├── prisma-auth.repository.ts
│   │   └── index.ts
│   └── memory/                     # For testing
│       ├── memory-user.repository.ts
│       └── index.ts
├── adapters/                       # Framework-specific HTTP adapters
│   ├── fastify/
│   │   ├── user.routes.ts
│   │   ├── auth.routes.ts
│   │   └── index.ts
│   ├── express/                    # Future support
│   │   └── user.routes.ts
│   └── koa/                        # Future support
│       └── user.routes.ts
├── middleware/                     # Framework-agnostic middleware
│   ├── auth.middleware.ts
│   ├── rate-limit.middleware.ts
│   ├── logging.middleware.ts
│   └── index.ts
├── factories/                      # Factory patterns
│   ├── route.factory.ts
│   ├── service.factory.ts
│   └── index.ts
├── schemas/                        # Zod validation schemas
│   ├── user/
│   │   ├── create-user.schema.ts
│   │   ├── update-user.schema.ts
│   │   └── index.ts
│   ├── shared/
│   │   ├── common.schema.ts
│   │   ├── pagination.schema.ts
│   │   └── index.ts
│   └── index.ts
├── utils/                          # Utility functions
│   ├── validation.utils.ts
│   ├── error.utils.ts
│   ├── testing.utils.ts
│   └── index.ts
├── config/                         # Configuration management
│   ├── database.config.ts
│   ├── server.config.ts
│   └── index.ts
├── __tests__/                      # Test files
│   ├── services/
│   │   ├── user.service.test.ts
│   │   └── auth.service.test.ts
│   ├── repositories/
│   │   └── prisma-user.repository.test.ts
│   ├── integration/
│   │   ├── user.integration.test.ts
│   │   └── auth.integration.test.ts
│   ├── helpers/
│   │   ├── test-app.ts
│   │   ├── test-database.ts
│   │   └── mock-data.ts
│   └── __mocks__/
│       └── prisma.ts
└── main.ts                         # Application entry point
```

## Benefits Summary

### ✅ **Complete Framework Independence**
- Business logic has zero framework dependencies
- Switch from Fastify to Express/Koa by changing only the adapter layer
- No vendor lock-in to any specific HTTP framework

### ✅ **Superior Testability**
- Test business logic without any HTTP framework mocking
- Unit tests run faster (no HTTP server startup)
- Easy to mock dependencies at interface boundaries

### ✅ **Maximum Code Reuse**
- Same business logic works across multiple frameworks
- Share services between different applications
- API clients can use the same interfaces

### ✅ **Clean Architecture**
- Clear separation between HTTP concerns and business logic
- Framework updates don't affect business code
- Easy to understand and maintain codebase

### ✅ **Type Safety Throughout**
- End-to-end TypeScript support
- Compile-time verification of interfaces
- Runtime validation with Zod schemas

### ✅ **Easy Migration Path**
- Gradual migration from framework-coupled code
- Start with one service and expand incrementally
- No big-bang rewrites required

## What's Next?

You now have a solid foundation for building framework-agnostic web services! In the next part, we'll explore how to scale this architecture for enterprise applications:

**[Part 4: Enterprise Architecture](04-enterprise-architecture.md)** - Learn how to organize large-scale applications with mono-repo architecture, CQRS patterns, and microservice deployment strategies.

## Real-World Example

Let's see how this all comes together in a complete example:

```typescript
// Real application with multiple services working together
import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';

// Services
import { UserService } from './services/user.service';
import { AuthService } from './services/auth.service';
import { NotificationService } from './services/notification.service';

// Repositories
import { PrismaUserRepository } from './repositories/prisma/prisma-user.repository';
import { JWTAuthService } from './repositories/prisma/jwt-auth.service';
import { EmailNotificationService } from './repositories/prisma/email-notification.service';

// Adapters
import { registerUserRoutes } from './adapters/fastify/user.routes';
import { registerAuthRoutes } from './adapters/fastify/auth.routes';
import { registerNotificationRoutes } from './adapters/fastify/notification.routes';

async function createApp(): Promise<FastifyInstance> {
  // Initialize database
  const prisma = new PrismaClient();
  
  // Initialize repositories
  const userRepository = new PrismaUserRepository(prisma);
  const authService = new JWTAuthService(process.env.JWT_SECRET!);
  const notificationService = new EmailNotificationService();
  
  // Initialize services with dependency injection
  const userService = new UserService(userRepository);
  const authServiceWithRepo = new AuthService(userRepository, authService);
  const notificationServiceWithDeps = new NotificationService(notificationService);
  
  // Initialize Fastify
  const fastify: FastifyInstance = require('fastify')({ logger: true });
  
  // Register all routes (thin adapters)
  registerUserRoutes(fastify, userService);
  registerAuthRoutes(fastify, authServiceWithRepo);
  registerNotificationRoutes(fastify, notificationServiceWithDeps);
  
  return fastify;
}

// Start application
async function main() {
  const app = await createApp();
  
  try {
    await app.listen({ port: 3000 });
    console.log('🚀 Server running on port 3000');
    console.log('📖 All business logic is framework-agnostic!');
    console.log('🔄 Can switch to Express/Koa anytime!');
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
```

This architecture gives you the flexibility to grow and evolve your application while maintaining clean, testable, and portable code! 🎉