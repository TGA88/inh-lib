# Part 4: Enterprise Patterns

Core enterprise patterns: CQRS, DI Container, Route Libraries, and Repository Interfaces for complex applications.

## 📚 Series Navigation

- [Part 1: Getting Started](../README.md)
- [Part 2: Schema Validation with Zod](02-zod-validation.md)
- [Part 3: Framework-Agnostic Architecture](03-framework-agnostic.md)
- [Part 4: Enterprise Patterns](04-enterprise-patterns.md) ← You are here
- [Part 5: Package Architecture & Configuration](05-package-architecture.md)
- [Part 6: Testing Strategies](06-testing-strategies.md)
- [Part 7: Build & Deployment](07-build-deployment.md)
- [Part 8: Logging & Production](08-logging-production.md)

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

### Command Implementation Example

```typescript
// api-service/user/commands/create-user.command.ts
export interface CreateUserInput {
  email: string;
  firstName: string;
  lastName: string;
  age?: number;
}

export class CreateUserCommand {
  constructor(
    private userRepository: UserRepository,
    private emailService: EmailService,
    private eventBus: EventBus
  ) {}

  async execute(input: CreateUserInput): Promise<User> {
    // 1. Business validation
    this.validateBusinessRules(input);
    
    // 2. Check constraints
    await this.checkEmailUniqueness(input.email);
    
    // 3. Create user
    const user = await this.userRepository.create({
      ...input,
      id: crypto.randomUUID(),
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    
    // 4. Side effects
    await this.sendWelcomeEmail(user);
    await this.publishUserCreatedEvent(user);
    
    return user;
  }

  private validateBusinessRules(input: CreateUserInput): void {
    if (!this.isValidEmail(input.email)) {
      throw new ValidationError('Invalid email format');
    }
    
    if (input.age && input.age < 13) {
      throw new BusinessRuleError('Users must be at least 13 years old');
    }
  }

  private async checkEmailUniqueness(email: string): Promise<void> {
    const existing = await this.userRepository.findByEmail(email);
    if (existing) {
      throw new ConflictError('Email already exists');
    }
  }

  private async sendWelcomeEmail(user: User): Promise<void> {
    await this.emailService.send({
      to: user.email,
      subject: 'Welcome!',
      template: 'welcome',
      data: { firstName: user.firstName }
    });
  }

  private async publishUserCreatedEvent(user: User): Promise<void> {
    await this.eventBus.publish('user.created', {
      userId: user.id,
      email: user.email,
      timestamp: new Date()
    });
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
}
```

### Query Implementation Example

```typescript
// api-service/user/queries/get-users.query.ts
export interface GetUsersInput {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: 'email' | 'firstName' | 'lastName' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export interface GetUsersResult {
  users: User[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class GetUsersQuery {
  constructor(
    private userRepository: UserRepository,
    private cacheService: CacheService
  ) {}

  async execute(input: GetUsersInput = {}): Promise<GetUsersResult> {
    // 1. Normalize input
    const options = this.normalizeInput(input);
    
    // 2. Check cache
    const cacheKey = this.buildCacheKey(options);
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;
    
    // 3. Query data
    const result = await this.userRepository.findMany(options);
    
    // 4. Build response
    const response = this.buildResponse(result, options);
    
    // 5. Cache result
    await this.cacheService.set(cacheKey, response, 300); // 5 minutes
    
    return response;
  }

  private normalizeInput(input: GetUsersInput) {
    return {
      page: Math.max(1, input.page || 1),
      limit: Math.min(100, Math.max(1, input.limit || 10)),
      search: input.search?.trim(),
      sortBy: input.sortBy || 'createdAt',
      sortOrder: input.sortOrder || 'desc',
    };
  }

  private buildCacheKey(options: any): string {
    return `users:list:${JSON.stringify(options)}`;
  }

  private buildResponse(result: any, options: any): GetUsersResult {
    return {
      users: result.users,
      total: result.total,
      page: options.page,
      limit: options.limit,
      totalPages: Math.ceil(result.total / options.limit),
    };
  }
}
```

## DI Container Pattern

### Why DI Container?

```typescript
// ❌ Problem: Manual dependency management becomes nightmare
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
  
  // ... 50+ more dependencies!
  
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

### DI Container Implementation

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

### DI Container Setup

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

  // Same commands/queries but with mock dependencies
  container.register('createUserCommand', (c) =>
    new CreateUserCommand(
      c.get('userRepository'),
      c.get('emailService'),
      c.get('eventBus')
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

### Prisma Repository Implementation

```typescript
// api-data-prisma/user/prisma-user.repository.ts
export class PrismaUserRepository implements UserRepository {
  constructor(private prisma: PrismaClient) {}

  async create(userData: CreateUserInput): Promise<User> {
    const prismaUser = await this.prisma.user.create({
      data: {
        id: crypto.randomUUID(),
        ...userData,
        status: UserStatus.ACTIVE,
        verified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    
    return this.toDomainUser(prismaUser);
  }

  async findById(id: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    return user ? this.toDomainUser(user) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    return user ? this.toDomainUser(user) : null;
  }

  async findMany(options: FindUsersOptions): Promise<FindUsersResult> {
    const page = options.page || 1;
    const limit = Math.min(options.limit || 10, 100);
    const skip = (page - 1) * limit;
    
    const where = this.buildWhereClause(options);
    const orderBy = this.buildOrderBy(options);
    
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({ where, orderBy, skip, take: limit }),
      this.prisma.user.count({ where })
    ]);

    return {
      users: users.map(user => this.toDomainUser(user)),
      total
    };
  }

  async update(id: string, userData: UpdateUserInput): Promise<User | null> {
    try {
      const updated = await this.prisma.user.update({
        where: { id },
        data: { ...userData, updatedAt: new Date() }
      });
      return this.toDomainUser(updated);
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

  async count(filters: UserFilters): Promise<number> {
    const where = this.buildFilterClause(filters);
    return await this.prisma.user.count({ where });
  }

  private buildWhereClause(options: FindUsersOptions) {
    const where: any = {};
    
    if (options.search) {
      where.OR = [
        { firstName: { contains: options.search, mode: 'insensitive' } },
        { lastName: { contains: options.search, mode: 'insensitive' } },
        { email: { contains: options.search, mode: 'insensitive' } }
      ];
    }
    
    if (options.filters) {
      Object.assign(where, this.buildFilterClause(options.filters));
    }
    
    return where;
  }

  private buildFilterClause(filters: UserFilters) {
    const where: any = {};
    
    if (filters.ageMin !== undefined || filters.ageMax !== undefined) {
      where.age = {};
      if (filters.ageMin !== undefined) where.age.gte = filters.ageMin;
      if (filters.ageMax !== undefined) where.age.lte = filters.ageMax;
    }
    
    if (filters.verified !== undefined) where.verified = filters.verified;
    if (filters.status !== undefined) where.status = filters.status;
    
    return where;
  }

  private buildOrderBy(options: FindUsersOptions) {
    const sortBy = options.sortBy || 'createdAt';
    const sortOrder = options.sortOrder || 'desc';
    return { [sortBy]: sortOrder };
  }

  private toDomainUser(prismaUser: any): User {
    return {
      id: prismaUser.id,
      email: prismaUser.email,
      firstName: prismaUser.firstName,
      lastName: prismaUser.lastName,
      age: prismaUser.age,
      status: prismaUser.status as UserStatus,
      verified: prismaUser.verified,
      createdAt: prismaUser.createdAt,
      updatedAt: prismaUser.updatedAt,
    };
  }
}
```

### In-Memory Repository Implementation (Testing)

```typescript
// api-data-memory/user/memory-user.repository.ts
export class MemoryUserRepository implements UserRepository {
  private users: User[] = [];
  private nextId = 1;

  async create(userData: CreateUserInput): Promise<User> {
    const user: User = {
      id: (this.nextId++).toString(),
      ...userData,
      status: UserStatus.ACTIVE,
      verified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    this.users.push(user);
    return { ...user };
  }

  async findById(id: string): Promise<User | null> {
    const user = this.users.find(u => u.id === id);
    return user ? { ...user } : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const user = this.users.find(u => u.email === email);
    return user ? { ...user } : null;
  }

  async findMany(options: FindUsersOptions): Promise<FindUsersResult> {
    let filtered = [...this.users];
    
    // Apply search
    if (options.search) {
      const search = options.search.toLowerCase();
      filtered = filtered.filter(user =>
        user.firstName.toLowerCase().includes(search) ||
        user.lastName.toLowerCase().includes(search) ||
        user.email.toLowerCase().includes(search)
      );
    }
    
    // Apply filters
    if (options.filters) {
      filtered = this.applyFilters(filtered, options.filters);
    }
    
    // Apply sorting
    filtered = this.applySorting(filtered, options);
    
    // Apply pagination
    const page = options.page || 1;
    const limit = options.limit || 10;
    const startIndex = (page - 1) * limit;
    const paginatedUsers = filtered.slice(startIndex, startIndex + limit);
    
    return {
      users: paginatedUsers.map(u => ({ ...u })),
      total: filtered.length
    };
  }

  async update(id: string, userData: UpdateUserInput): Promise<User | null> {
    const index = this.users.findIndex(u => u.id === id);
    if (index === -1) return null;
    
    this.users[index] = {
      ...this.users[index],
      ...userData,
      updatedAt: new Date(),
    };
    
    return { ...this.users[index] };
  }

  async delete(id: string): Promise<boolean> {
    const index = this.users.findIndex(u => u.id === id);
    if (index === -1) return false;
    
    this.users.splice(index, 1);
    return true;
  }

  async count(filters: UserFilters): Promise<number> {
    const filtered = this.applyFilters([...this.users], filters);
    return filtered.length;
  }

  // Test helpers
  clear(): void {
    this.users = [];
    this.nextId = 1;
  }

  seed(users: Partial<User>[]): User[] {
    const seededUsers = users.map(userData => ({
      id: (this.nextId++).toString(),
      email: `user${this.nextId}@test.com`,
      firstName: 'Test',
      lastName: 'User',
      status: UserStatus.ACTIVE,
      verified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...userData,
    } as User));
    
    this.users.push(...seededUsers);
    return seededUsers.map(u => ({ ...u }));
  }

  private applyFilters(users: User[], filters: UserFilters): User[] {
    return users.filter(user => {
      if (filters.ageMin !== undefined && (!user.age || user.age < filters.ageMin)) return false;
      if (filters.ageMax !== undefined && (!user.age || user.age > filters.ageMax)) return false;
      if (filters.verified !== undefined && user.verified !== filters.verified) return false;
      if (filters.status !== undefined && user.status !== filters.status) return false;
      return true;
    });
  }

  private applySorting(users: User[], options: FindUsersOptions): User[] {
    const sortBy = options.sortBy || 'createdAt';
    const sortOrder = options.sortOrder || 'desc';
    
    return users.sort((a, b) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];
      
      let comparison = 0;
      if (aVal < bVal) comparison = -1;
      if (aVal > bVal) comparison = 1;
      
      return sortOrder === 'desc' ? -comparison : comparison;
    });
  }
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

## What's Next?

In **Part 5**, we'll explore package architecture and configuration management for enterprise applications:

- [Part 5: Package Architecture & Configuration](05-package-architecture.md) - Mono-repo structure, package organization, and configuration management
- [Part 6: Testing Strategies](06-testing-strategies.md) - Unit, integration, and E2E testing with enterprise patterns  
- [Part 7: Build & Deployment](07-build-deployment.md) - Docker, Kubernetes, CI/CD pipelines
- [Part 8: Logging & Production](08-logging-production.md) - Production logging, monitoring, and security

## Summary

Enterprise Patterns for @inh-lib/api-util-fastify provides:

✅ **CQRS Pattern** - Separate Commands (write) and Queries (read) for focused operations  
✅ **DI Container** - Automatic dependency management with lifecycle control  
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

The enterprise patterns provide a scalable foundation that grows with your application and team, while maintaining the framework-agnostic benefits from earlier parts of this series! 🏗️🚀