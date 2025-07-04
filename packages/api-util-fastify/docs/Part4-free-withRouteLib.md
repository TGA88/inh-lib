# Part 4: Enterprise Patterns (Free Edition)

Core enterprise patterns: CQRS, DI Container, Route Libraries, and Repository Interfaces for complex applications.

## 📚 Series Navigation

- [Part 1: Getting Started](../README.md)
- [Part 2: Schema Validation with Zod](02-zod-validation.md)
- [Part 3: Framework-Agnostic Architecture](03-framework-agnostic.md)
- [Part 4: Enterprise Patterns](04-enterprise-patterns.md) ← You are here
- [Part 5: Package Architecture & Configuration](05-package-architecture.md)

## Why Enterprise Patterns?

### When Simple Service Pattern Isn't Enough

```typescript
// ✅ Simple Service Pattern (Part 3) - Works great for smaller apps
class UserService {
  constructor(private userRepository: UserRepository) {}
  
  async createUser(context: UnifiedHttpContext): Promise<void> {
    const userData = getRequestBody(context);
    const user = await this.userRepository.create(userData);
    sendResponse(context, user, 201);
  }
}

// ❌ Problems when scaling up:
// 1. Methods become 100+ lines with complex business logic
// 2. Too many dependencies to manage manually
// 3. Mixed read/write concerns with different optimization needs
// 4. Hard to test complex business operations
```

### Enterprise Patterns Solve These Problems

```typescript
// ✅ Enterprise Solution: Focused, scalable patterns
// 1. CQRS: Separate Commands (write) and Queries (read)
// 2. DI Container: Automatic dependency management
// 3. Route Libraries: Systematic route organization
// 4. Repository Interfaces: Clean data access abstraction
```

**Use Enterprise Patterns when:**
- 👥 Team size: 5+ developers
- 📦 Domains: 5+ business domains  
- 🧠 Business logic: Complex rules beyond CRUD
- ⏱️ Timeline: 6+ months development
- 🔧 Maintenance: 2+ years

## CQRS Pattern (Command Query Responsibility Segregation)

### Why CQRS?

```typescript
// ❌ Problem: One service method doing too much
class UserService {
  async createUser(context: UnifiedHttpContext): Promise<void> {
    // 1. Parse request
    const userData = getRequestBody(context);
    
    // 2. Complex validation (20+ lines)
    if (!userData.email) throw new Error('Email required');
    if (!isValidEmail(userData.email)) throw new Error('Invalid email');
    // ... more validation
    
    // 3. Business rules (20+ lines)
    const existing = await this.userRepository.findByEmail(userData.email);
    if (existing) throw new Error('Email exists');
    // ... more business logic
    
    // 4. Side effects (10+ lines)
    const user = await this.userRepository.create(userData);
    await this.emailService.sendWelcome(user.email);
    await this.eventBus.publish('user.created', user);
    
    // 5. Response formatting
    sendResponse(context, user, 201);
    
    // Total: 60+ lines, multiple responsibilities!
  }
}
```

```typescript
// ✅ Solution: CQRS separates concerns
// Commands handle write operations with business logic
class CreateUserCommand {
  constructor(
    private userRepository: UserRepository,
    private emailService: EmailService,
    private eventBus: EventBus
  ) {}

  async execute(input: CreateUserInput): Promise<User> {
    // Focused only on user creation business logic
    this.validateBusinessRules(input);
    await this.checkEmailUniqueness(input.email);
    
    const user = await this.userRepository.create(input);
    
    // Side effects
    await this.emailService.sendWelcome(user.email);
    await this.eventBus.publish('user.created', user);
    
    return user;
  }
}

// Queries handle read operations with optimizations
class GetUsersQuery {
  constructor(
    private userRepository: UserRepository,
    private cacheService: CacheService
  ) {}

  async execute(input: GetUsersInput): Promise<GetUsersResult> {
    // Focused only on data retrieval with caching
    const cacheKey = this.buildCacheKey(input);
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;
    
    const result = await this.userRepository.findMany(input);
    await this.cacheService.set(cacheKey, result, 300);
    
    return result;
  }
}

// Routes orchestrate Commands and Queries
class UserRoutes {
  constructor(
    private createUserCommand: CreateUserCommand,
    private getUsersQuery: GetUsersQuery
  ) {}
  
  async createUser(context: UnifiedHttpContext): Promise<void> {
    const input = getRequestBody<CreateUserInput>(context);
    const result = await this.createUserCommand.execute(input);
    sendResponse(context, result, 201);
  }
  
  async getUsers(context: UnifiedHttpContext): Promise<void> {
    const input = getQuery(context);
    const result = await this.getUsersQuery.execute(input);
    sendResponse(context, result);
  }
}
```

### Understanding Validation Layers in CQRS

**🎯 ความแตกต่างหลัก:** การแยกการ validate เป็นหลายชั้นตามความรับผิดชอบ

```typescript
// 🏗️ Layer Architecture Overview:
// 
// HTTP Layer (Routes)     →  Schema Validation (Zod)
//     ↓ 
// Command/Query Layer     →  Business Validation + Business Rules
//     ↓
// Repository Layer        →  Side Effects
```

#### Layer 1: Schema Validation (HTTP Layer)

```typescript
// ✅ HTTP Layer: ใช้ Zod สำหรับ type safety และ format validation
import { z } from 'zod';

const CreateUserSchema = z.object({
  email: z.string().email('Invalid email format'),
  firstName: z.string().min(1, 'First name required').max(50),
  lastName: z.string().min(1, 'Last name required').max(50), 
  age: z.number().int().min(1).max(150).optional(),
});

// Route Handler - Schema validation เท่านั้น
fastify.post('/users', async (request, reply) => {
  const context = createFastifyContext(request, reply);
  
  // Schema Validation: ตรวจสอบ type, format, required fields
  const userData = validateRequestBodyOrError(context, CreateUserSchema);
  if (!userData) return; // Zod handles validation errors
  
  // ส่งต่อให้ Command (data clean แล้ว)
  const createUserCommand = container.get('createUserCommand');
  const result = await createUserCommand.execute(userData);
  
  sendResponse(context, result, 201);
});
```

**Schema Validation หน้าที่:**
- ✅ ตรวจสอบ **data types** (string, number, boolean)
- ✅ ตรวจสอบ **format** (email, URL, phone)
- ✅ ตรวจสอบ **required fields**
- ✅ ตรวจสอบ **basic constraints** (min, max length)

#### Layer 2: Business Validation (Command Layer)

```typescript
// ✅ Command Layer: Business logic และ validation ที่ซับซ้อน
export class CreateUserCommand {
  async execute(input: CreateUserInput): Promise<User> {
    // Business Validation: กฎทางธุรกิจที่ตรวจสอบจาก input เดียวได้
    await this.validateBusinessRules(input);
    
    // Business Rules: ข้อจำกัดที่ต้องเช็คกับระบบ
    await this.enforceBusinessConstraints(input);
    
    // Main operation
    const user = await this.createUserEntity(input);
    
    // Side Effects
    await this.executeSideEffects(user);
    
    return user;
  }

  // Business Validation = กฎธุรกิจซับซ้อนที่ทำใน Zod ไม่ได้
  private async validateBusinessRules(input: CreateUserInput): Promise<void> {
    const errors: string[] = [];
    
    // ตัวอย่าง: Password strength calculation
    if (input.password) {
      const strength = this.calculatePasswordStrength(input.password);
      if (strength < 70) {
        errors.push('Password is too weak');
      }
    }
    
    // ตัวอย่าง: Cross-field validation
    if (input.birthDate && input.age) {
      const calculatedAge = this.calculateAgeFromBirthDate(input.birthDate);
      if (Math.abs(calculatedAge - input.age) > 1) {
        errors.push('Age does not match birth date');
      }
    }
    
    // ตัวอย่าง: Company policy validation
    if (input.username && this.isReservedUsername(input.username)) {
      errors.push('Username is reserved');
    }
    
    if (errors.length > 0) {
      throw new BusinessValidationError('Business validation failed', errors);
    }
  }
}
```

**Business Validation หน้าที่:**
- ✅ **Complex algorithms** (password strength, content filtering)
- ✅ **Cross-field validation** (ตรวจสอบความสัมพันธ์ระหว่างฟิลด์)
- ✅ **Business-specific rules** (company policies, domain rules)
- ✅ **Contextual validation** (ขึ้นอยู่กับสถานการณ์)

#### Layer 3: Business Rules (Command Layer)

```typescript
// Business Rules = ข้อจำกัดที่ต้องตรวจสอบกับระบบ/database
private async enforceBusinessConstraints(input: CreateUserInput): Promise<void> {
  // กฎ: Email ต้องไม่ซ้ำในระบบ
  const existingUser = await this.userRepository.findByEmail(input.email);
  if (existingUser) {
    throw new BusinessRuleViolationError('Email address already exists');
  }
  
  // กฎ: จำกัดจำนวน registrations ต่อวัน
  const todayCount = await this.userRepository.countTodayRegistrations();
  if (todayCount > 1000) {
    throw new BusinessRuleViolationError('Daily registration limit exceeded');
  }
  
  // กฎ: ตรวจสอบ blacklist
  const isBlacklisted = await this.securityService.isEmailBlacklisted(input.email);
  if (isBlacklisted) {
    throw new BusinessRuleViolationError('Email is blacklisted');
  }
}
```

**Business Rules หน้าที่:**
- ✅ **Uniqueness constraints** (email ซ้ำไหม)
- ✅ **System limits** (rate limiting, quotas)
- ✅ **External validations** (blacklists, third-party checks)
- ✅ **State-dependent rules** (depends on current system state)

#### Layer 4: Side Effects (Command Layer)

```typescript
// Side Effects = การกระทำเพิ่มเติมหลังจากสำเร็จ
private async executeSideEffects(user: User): Promise<void> {
  // Side Effect 1: ส่ง welcome email
  await this.sendWelcomeEmail(user);
  
  // Side Effect 2: สร้าง default preferences
  await this.createDefaultPreferences(user.id);
  
  // Side Effect 3: บันทึก audit log
  await this.logUserRegistration(user);
  
  // Side Effect 4: Publish event
  await this.publishUserCreatedEvent(user);
  
  // Side Effect 5: Update analytics
  await this.updateUserStatistics();
}

private async sendWelcomeEmail(user: User): Promise<void> {
  try {
    await this.emailService.send({
      to: user.email,
      template: 'welcome',
      data: { firstName: user.firstName }
    });
  } catch (error) {
    // ไม่ throw error เพราะเป็น side effect
    console.error('Failed to send welcome email:', error);
  }
}
```

**Side Effects หน้าที่:**
- ✅ **Email notifications** (welcome emails, confirmations)
- ✅ **Data creation** (default settings, related records)
- ✅ **Event publishing** (microservices communication)
- ✅ **Analytics/Logging** (audit trails, metrics)
- ✅ **External integrations** (third-party services)

### 📋 Summary: Validation Layers

| Layer | Location | Purpose | Examples | Tools |
|-------|----------|---------|----------|-------|
| **Schema Validation** | HTTP Routes | Type/Format validation | Email format, required fields | Zod, Joi |
| **Business Validation** | Commands/Queries | Complex business rules | Password strength, cross-field | Custom logic |
| **Business Rules** | Commands/Queries | System constraints | Uniqueness, limits, blacklists | Database checks |
| **Side Effects** | Commands | Additional actions | Emails, events, logging | Background tasks |

### Complete CQRS Example

```typescript
// Complete Command with all layers
export class CreateUserCommand {
  constructor(
    private userRepository: UserRepository,
    private emailService: EmailService,
    private eventBus: EventBus,
    private securityService: SecurityService
  ) {}

  async execute(input: CreateUserInput): Promise<User> {
    try {
      // Layer 2: Business Validation
      await this.validateBusinessRules(input);
      
      // Layer 3: Business Rules
      await this.enforceBusinessConstraints(input);
      
      // Main Operation
      const user = await this.userRepository.create({
        ...input,
        id: crypto.randomUUID(),
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      
      // Layer 4: Side Effects
      await this.executeSideEffects(user);
      
      return user;
    } catch (error) {
      // Error handling
      if (error instanceof BusinessValidationError) {
        throw error; // Re-throw business errors
      }
      
      console.error('CreateUserCommand failed:', error);
      throw new Error('Failed to create user');
    }
  }

  // Implementation of validation methods...
  private async validateBusinessRules(input: CreateUserInput): Promise<void> {
    // Complex validation logic here
  }

  private async enforceBusinessConstraints(input: CreateUserInput): Promise<void> {
    // System constraint checks here
  }

  private async executeSideEffects(user: User): Promise<void> {
    // Side effects here
  }
}
```

## Basic DI Container Pattern

### Why DI Container?

```typescript
// ❌ Problem: Manual dependency management becomes difficult
function createUserService() {
  const prisma = new PrismaClient();
  const userRepository = new PrismaUserRepository(prisma);
  const emailService = new EmailService(process.env.EMAIL_API_KEY!);
  const cacheService = new RedisCache(process.env.REDIS_URL!);
  const eventBus = new EventBus();
  
  const createUserCommand = new CreateUserCommand(
    userRepository, 
    emailService, 
    eventBus
  );
  
  const getUsersQuery = new GetUsersQuery(
    userRepository, 
    cacheService
  );
  
  return new UserRoutes(createUserCommand, getUsersQuery);
}
```

```typescript
// ✅ Solution: DI Container manages dependencies automatically
class DIContainer {
  private services = new Map();
  
  register<T>(name: string, factory: () => T): void {
    this.services.set(name, { factory, instance: null });
  }
  
  get<T>(name: string): T {
    const service = this.services.get(name);
    if (!service.instance) {
      service.instance = service.factory();
    }
    return service.instance;
  }
}

// Setup once
const container = new DIContainer();
container.register('userRoutes', () => /* all dependencies resolved automatically */);

// Use anywhere
const userRoutes = container.get('userRoutes'); // ✨ Magic!
```

### Basic DI Container Implementation

```typescript
// foundations/di-container.ts
export class DIContainer {
  private services = new Map<string, ServiceDefinition>();
  private instances = new Map<string, any>();

  register<T>(
    name: string, 
    factory: (container: DIContainer) => T,
    singleton: boolean = true
  ): void {
    this.services.set(name, { factory, singleton });
  }

  get<T>(name: string): T {
    // Return cached instance if singleton
    if (this.instances.has(name)) {
      return this.instances.get(name);
    }

    const service = this.services.get(name);
    if (!service) {
      throw new Error(`Service '${name}' not registered`);
    }

    // Create instance
    const instance = service.factory(this);

    // Cache if singleton
    if (service.singleton) {
      this.instances.set(name, instance);
    }

    return instance;
  }

  // For testing - clear all instances
  clearInstances(): void {
    this.instances.clear();
  }
}

interface ServiceDefinition {
  factory: (container: DIContainer) => any;
  singleton: boolean;
}
```

### Basic DI Container Setup

```typescript
// foundations/container-setup.ts
export function setupContainer(): DIContainer {
  const container = new DIContainer();

  // Infrastructure
  container.register('config', () => ({
    database: { url: process.env.DATABASE_URL! },
    email: { apiKey: process.env.EMAIL_API_KEY! },
    redis: { url: process.env.REDIS_URL! },
  }));

  container.register('prisma', (c) => {
    const config = c.get('config');
    return new PrismaClient({
      datasources: { db: { url: config.database.url } }
    });
  });

  // Repositories
  container.register('userRepository', (c) =>
    new PrismaUserRepository(c.get('prisma'))
  );

  // Services
  container.register('emailService', (c) => {
    const config = c.get('config');
    return new EmailService(config.email.apiKey);
  });

  container.register('cacheService', (c) => {
    const config = c.get('config');
    return new CacheService(config.redis.url);
  });

  container.register('eventBus', () => new EventBus());

  // Commands
  container.register('createUserCommand', (c) =>
    new CreateUserCommand(
      c.get('userRepository'),
      c.get('emailService'),
      c.get('eventBus')
    )
  );

  // Queries
  container.register('getUsersQuery', (c) =>
    new GetUsersQuery(
      c.get('userRepository'),
      c.get('cacheService')
    )
  );

  // Routes
  container.register('userRoutes', (c) =>
    new UserRoutes(
      c.get('createUserCommand'),
      c.get('getUsersQuery')
    )
  );

  return container;
}

// For testing
export function setupTestContainer(): DIContainer {
  const container = new DIContainer();

  // Mock implementations for testing
  container.register('userRepository', () => new MockUserRepository());
  container.register('emailService', () => new MockEmailService());
  container.register('cacheService', () => new MockCacheService());
  container.register('eventBus', () => new MockEventBus());

  // Same commands/queries but with mock dependencies
  container.register('createUserCommand', (c) =>
    new CreateUserCommand(
      c.get('userRepository'),
      c.get('emailService'),
      c.get('eventBus')
    )
  );

  container.register('userRoutes', (c) =>
    new UserRoutes(
      c.get('createUserCommand'),
      c.get('getUsersQuery')
    )
  );

  return container;
}
```

## Route Libraries Pattern

### Why Route Libraries?

```typescript
// ❌ Problem: Route registration becomes messy
fastify.post('/users', createUserHandler);
fastify.get('/users', getUsersHandler);
fastify.get('/users/:id', getUserByIdHandler);
fastify.put('/users/:id', updateUserHandler);
fastify.delete('/users/:id', deleteUserHandler);

fastify.post('/orders', createOrderHandler);
fastify.get('/orders', getOrdersHandler);
// ... 100+ more routes manually registered
```

```typescript
// ✅ Solution: Organized route libraries
class UserRouteLibrary {
  getRoutes(): RouteDefinition[] {
    return [
      {
        method: 'POST',
        path: '/users',
        handler: this.userRoutes.createUser,
        middleware: [authMiddleware],
      },
      {
        method: 'GET', 
        path: '/users',
        handler: this.userRoutes.getUsers,
        middleware: [authMiddleware, rateLimitMiddleware],
      },
      // ... all user routes organized
    ];
  }
}

// Auto-register all routes
const routeLibrary = new UserRouteLibrary();
registerRoutes(fastify, routeLibrary.getRoutes());
```

### Route Library Implementation

```typescript
// foundations/route-library.ts
export interface RouteDefinition {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  handler: RouteHandler;
  middleware?: RouteHandler[];
  auth?: {
    required: boolean;
    roles?: string[];
  };
}

export type RouteHandler = (context: UnifiedHttpContext) => Promise<void>;

export interface RouteLibrary {
  getRoutes(): RouteDefinition[];
}

export function registerRoutes(
  fastify: FastifyInstance,
  routes: RouteDefinition[],
  globalMiddleware: RouteHandler[] = []
): void {
  routes.forEach(route => {
    const method = route.method.toLowerCase() as any;
    
    fastify[method](route.path, async (request: any, reply: any) => {
      const context = createFastifyContext(request, reply);
      
      try {
        // Apply global middleware
        for (const middleware of globalMiddleware) {
          await middleware(context);
          if (reply.sent) return;
        }
        
        // Apply route-specific middleware
        if (route.middleware) {
          for (const middleware of route.middleware) {
            await middleware(context);
            if (reply.sent) return;
          }
        }
        
        // Execute handler
        await route.handler(context);
      } catch (error) {
        console.error('Route error:', error);
        if (!reply.sent) {
          sendError(context, 'Internal server error', 500);
        }
      }
    });
  });
}
```

### Domain Route Libraries

```typescript
// api-service/user/route-libraries/user-routes.library.ts
export class UserRouteLibrary implements RouteLibrary {
  constructor(private userRoutes: UserRoutes) {}

  getRoutes(): RouteDefinition[] {
    return [
      // Commands (Write operations)
      {
        method: 'POST',
        path: '/users',
        handler: (context) => this.userRoutes.createUser(context),
        auth: { required: false }, // Public registration
      },
      {
        method: 'PUT',
        path: '/users/:id',
        handler: (context) => this.userRoutes.updateUser(context),
        auth: { required: true },
      },
      {
        method: 'DELETE',
        path: '/users/:id',
        handler: (context) => this.userRoutes.deleteUser(context),
        auth: { required: true, roles: ['admin'] },
      },

      // Queries (Read operations)
      {
        method: 'GET',
        path: '/users',
        handler: (context) => this.userRoutes.getUsers(context),
        auth: { required: true },
        middleware: [rateLimitMiddleware(100, '1h')], // 100 requests per hour
      },
      {
        method: 'GET',
        path: '/users/:id', 
        handler: (context) => this.userRoutes.getUserById(context),
        auth: { required: true },
      },
    ];
  }
}
```

## Repository Interfaces & Implementations

### Why Repository Pattern?

```typescript
// ❌ Problem: Commands/Queries directly coupled to database
class CreateUserCommand {
  constructor(private prisma: PrismaClient) {} // ❌ Tied to Prisma
  
  async execute(input: CreateUserInput): Promise<User> {
    // ❌ Can't test without real database
    const user = await this.prisma.user.create({ data: input });
    return user;
  }
}
```

```typescript
// ✅ Solution: Repository interfaces decouple data access
interface UserRepository {
  create(userData: CreateUserInput): Promise<User>;
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
}

class CreateUserCommand {
  constructor(private userRepository: UserRepository) {} // ✅ Interface, not implementation
  
  async execute(input: CreateUserInput): Promise<User> {
    // ✅ Can test with mock repository
    const existing = await this.userRepository.findByEmail(input.email);
    if (existing) throw new ConflictError('Email exists');
    
    return await this.userRepository.create(input);
  }
}
```

### Core Repository Interfaces

```typescript
// api-core/user/user.repository.ts
export interface UserRepository {
  // Commands (write operations)
  create(userData: CreateUserInput): Promise<User>;
  update(id: string, userData: UpdateUserInput): Promise<User | null>;
  delete(id: string): Promise<boolean>;
  
  // Queries (read operations)
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findMany(options: FindUsersOptions): Promise<FindUsersResult>;
  count(filters: UserFilters): Promise<number>;
}

export interface FindUsersOptions {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: 'email' | 'firstName' | 'lastName' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
  filters?: UserFilters;
}

export interface UserFilters {
  ageMin?: number;
  ageMax?: number;
  verified?: boolean;
  status?: UserStatus;
}

export interface FindUsersResult {
  users: User[];
  total: number;
}

// Domain types
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  age?: number;
  status: UserStatus;
  verified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive', 
  SUSPENDED = 'suspended'
}
```

## Migration Strategy: Simple → Enterprise

### When to Migrate Each Pattern

```typescript
// Stage 1: CQRS - When business logic becomes complex
// Before: Everything in one method (50+ lines)
class UserService {
  async createUser(context: UnifiedHttpContext) {
    // 50+ lines of complex validation, business rules, side effects
  }
}

// After: Focused Commands & Queries
class CreateUserCommand {
  async execute(input: CreateUserInput): Promise<User> {
    // Focused business logic only
  }
}

// Stage 2: DI Container - When dependencies become numerous
// Before: Manual wiring becomes painful
const userService = new UserService(repo, email, cache, events, audit, logger);

// After: Container-managed
const container = new DIContainer();
const userService = container.get('userService'); // All dependencies resolved

// Stage 3: Route Libraries - When routes become numerous  
// Before: Manual registration (20+ routes)
fastify.post('/users', handler1);
fastify.get('/users', handler2);
// ... 20+ more routes

// After: Systematic organization
const routeLibrary = new UserRouteLibrary();
registerRoutes(fastify, routeLibrary.getRoutes());

// Stage 4: Repository Interfaces - For testing & flexibility
// Before: Direct database coupling
class CreateUserCommand {
  constructor(private prisma: PrismaClient) {} // Hard to test
}

// After: Interface-based approach
class CreateUserCommand {
  constructor(private userRepository: UserRepository) {} // Easy to test with mocks
}
```

## Decision Framework: When to Use Enterprise Patterns

### 🏃‍♂️ **Simple Service Pattern** (Part 3) - Use when:
- Team size: 1-5 developers  
- Domains: < 5 business domains
- Business logic: Simple CRUD operations
- Timeline: < 6 months development
- Maintenance: < 2 years

### 🏗️ **Enterprise Patterns** (Part 4) - Use when:
- Team size: 5+ developers
- Domains: 5+ business domains  
- Business logic: Complex business rules
- Timeline: 6+ months development
- Maintenance: 2+ years

```typescript
// Quick decision check
function shouldUseEnterprisePatterns(project: ProjectProfile): boolean {
  return project.teamSize > 5 || 
         project.domains > 5 || 
         project.businessLogic === 'complex';
}
```

## Complete Example: Putting It All Together

### Application Setup

```typescript
// main.ts - Complete enterprise application setup
import { FastifyInstance } from 'fastify';
import { setupContainer } from './foundations/container-setup';
import { UserRouteLibrary } from './api-service/user/route-libraries/user-routes.library';
import { registerRoutes } from './foundations/route-library';

async function createApp(): Promise<FastifyInstance> {
  // 1. Setup DI Container with all dependencies
  const container = setupContainer();
  
  // 2. Create Fastify instance
  const fastify: FastifyInstance = require('fastify')({ logger: true });
  
  // 3. Setup middleware
  await fastify.register(require('@fastify/cors'), { origin: true });
  
  // 4. Get route handlers from container
  const userRoutes = container.get('userRoutes');
  
  // 5. Setup route libraries
  const userRouteLibrary = new UserRouteLibrary(userRoutes);
  
  // 6. Register all routes systematically
  registerRoutes(fastify, userRouteLibrary.getRoutes());
  
  // 7. Health check
  fastify.get('/health', async (request, reply) => {
    return { status: 'healthy', timestamp: new Date() };
  });
  
  return fastify;
}

async function main() {
  const app = await createApp();
  
  try {
    await app.listen({ port: 3000, host: '0.0.0.0' });
    console.log('🚀 Enterprise app running on port 3000');
    console.log('✅ CQRS: Commands & Queries separated');
    console.log('✅ DI Container: Dependencies managed automatically');
    console.log('✅ Route Libraries: Routes organized systematically');
    console.log('✅ Repository Pattern: Data access abstracted');
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main().catch(console.error);
```

## What's Next?

### 🆓 Free Content Continues

- **[Part 5: Package Architecture & Configuration](05-package-architecture.md)** - Mono-repo structure and package organization
- **[Part 6: Testing Strategies](06-testing-strategies.md)** - Testing enterprise patterns comprehensively

### 💎 Premium Content Available

For teams needing **advanced validation strategies** and **sophisticated enterprise patterns**:

**[🚀 Advanced Validation Patterns (Premium)](advanced-validation-patterns-premium.md)**
- Sophisticated Validation Architecture & Pipelines
- Performance-Optimized Validation with Caching
- Custom Validation Decorators & Middleware
- Enterprise-Grade Error Handling & User Experience
- Advanced Testing Patterns for Complex Validation
- Multi-tenant Validation & Audit Requirements

**[🏗️ Advanced DI Container Patterns (Premium)](advanced-di-container-premium.md)**
- Service Lifecycles (Singleton, Scoped, Transient)
- Environment-Specific & Conditional Registration
- Module-Based Architecture with Health Checks
- Request-Scoped Services & HTTP Integration
- Service Decorators (Logging, Caching, Retry, Monitoring)

## Summary

Enterprise Patterns (Free Edition) for @inh-lib/api-util-fastify provides:

✅ **CQRS Pattern** - Separate Commands (write) and Queries (read) for focused operations  
✅ **Validation Layers** - Clear separation between Schema, Business, Rules, and Side Effects  
✅ **Basic DI Container** - Automatic dependency management for enterprise applications  
✅ **Route Libraries** - Systematic route organization with middleware composition  
✅ **Repository Interfaces** - Clean data access abstraction for testing & flexibility  
✅ **Decision Framework** - Know when to use enterprise vs simple patterns  
✅ **Gradual Migration** - Start simple, add patterns as complexity grows

### Key Decision Points:

🎯 **Use Enterprise Patterns when you have:**
- 5+ developers working together
- 5+ business domains  
- Complex business logic beyond CRUD
- 6+ months development timeline
- 2+ years maintenance lifecycle

🏃‍♂️ **Stick with Simple Patterns when you have:**
- Small team (< 5 developers)
- Simple CRUD operations
- Short timeline (< 6 months) 
- Limited maintenance needs

### Foundation Knowledge Included:

🧠 **Understanding Validation Layers** - The critical foundation for proper CQRS implementation:
- **Schema Validation** (HTTP Layer with Zod) vs **Business Validation** (Command Layer with custom logic)
- **Business Rules** (system constraints) vs **Side Effects** (additional actions)
- Clear examples of what belongs in each layer
- Common mistakes and how to avoid them

The enterprise patterns provide a scalable foundation that grows with your application and team, while maintaining the framework-agnostic benefits from earlier parts of this series! 🏗️🚀

---

> 💡 **Next Steps**: The foundation knowledge in this free edition gives you everything needed to implement enterprise patterns correctly. For advanced optimization, sophisticated validation pipelines, and cutting-edge DI container features, explore our premium content series.

> 📧 **Questions?** Join our community discussions or reach out for guidance on implementing these patterns in your specific use case.