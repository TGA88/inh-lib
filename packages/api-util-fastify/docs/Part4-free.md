# Part 4: Enterprise Patterns (Free Edition)

Core enterprise patterns: CQRS, Simple Route Modules, Basic DI Container, and Repository Interfaces for complex applications.

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
// 5. Route duplication when same logic needs different validation
```

### Enterprise Patterns Solve These Problems

```typescript
// ✅ Enterprise Solution: Focused, scalable patterns
// 1. CQRS: Separate Commands (write) and Queries (read)
// 2. Simple Route Modules: Reusable route functions with different validation
// 3. Basic DI Container: Automatic dependency management
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
    
    // 5. Send response
    sendResponse(context, user, 201);
  }
}
```

### CQRS Solution: Focused Commands & Queries

```typescript
// ✅ Solution: Separate Commands (write) and Queries (read)

// commands/user/create-user.command.ts - Write operations
export class CreateUserCommand {
  constructor(
    private userRepository: UserRepository,
    private emailService: EmailService,
    private eventBus: EventBus
  ) {}

  async execute(input: CreateUserInput): Promise<User> {
    // Business validation
    await this.validateBusinessRules(input);
    
    // Business logic
    const user = await this.userRepository.create({
      id: generateId(),
      email: input.email,
      firstName: input.firstName,
      lastName: input.lastName,
      createdAt: new Date(),
    });
    
    // Side effects
    await this.emailService.sendWelcome(user.email);
    await this.eventBus.publish('user.created', user);
    
    return user;
  }

  private async validateBusinessRules(input: CreateUserInput): Promise<void> {
    const existing = await this.userRepository.findByEmail(input.email);
    if (existing) {
      throw new Error('Email already exists');
    }
  }
}

// queries/user/get-users.query.ts - Read operations
export class GetUsersQuery {
  constructor(private userRepository: UserRepository) {}

  async execute(input: GetUsersInput): Promise<GetUsersResult> {
    const users = await this.userRepository.findMany({
      where: {
        ...(input.search && { 
          OR: [
            { firstName: { contains: input.search } },
            { lastName: { contains: input.search } },
            { email: { contains: input.search } }
          ]
        }),
        ...(input.status && { status: input.status })
      },
      skip: (input.page - 1) * input.limit,
      take: input.limit,
      orderBy: { [input.sort]: input.order }
    });

    const total = await this.userRepository.count({
      where: { /* same where conditions */ }
    });

    return {
      users,
      pagination: {
        page: input.page,
        limit: input.limit,
        total,
        pages: Math.ceil(total / input.limit)
      }
    };
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

## Simple Route Modules

### Why Simple Route Modules?

```typescript
// ❌ Problem: Duplicate route logic
fastify.post('/register', async (request, reply) => {
  // Same business logic as admin creation
  const userData = validateRequestBodyOrError(context, PublicUserSchema);
  if (!userData) return;
  
  const result = await createUserCommand.execute(userData);
  sendResponse(context, result, 201);
});

fastify.post('/admin/users', async (request, reply) => {
  // Same business logic as public registration
  const userData = validateRequestBodyOrError(context, AdminUserSchema);
  if (!userData) return;
  
  const result = await createUserCommand.execute(userData); // Same command!
  sendResponse(context, result, 201);
});
```

```typescript
// ✅ Solution: Framework-agnostic route functions with reusable commands
// routes/user/public-routes.ts - Framework-agnostic functions
export async function createPublicUserRoute(
  context: UnifiedHttpContext,
  createUserCommand: CreateUserCommand
): Promise<void> {
  // Public registration - minimal validation
  const userData = validateRequestBodyOrError(context, PublicUserRegistrationSchema);
  if (!userData) return;
  
  const result = await createUserCommand.execute(userData);
  sendResponse(context, { message: 'Registration successful' }, 201);
}

export async function getPublicUsersRoute(
  context: UnifiedHttpContext,
  getUsersQuery: GetUsersQuery
): Promise<void> {
  // Public listing - limited data
  const query = validateQueryOrError(context, PublicUserQuerySchema);
  if (!query) return;
  
  const result = await getUsersQuery.execute(query);
  sendResponse(context, result);
}
```

### Framework-Agnostic Route Functions

```typescript
// routes/user/admin-routes.ts - Framework-agnostic
export async function createAdminUserRoute(
  context: UnifiedHttpContext,
  createUserCommand: CreateUserCommand
): Promise<void> {
  // Admin creation - more fields and permissions
  const userData = validateRequestBodyOrError(context, AdminUserCreationSchema);
  if (!userData) return;
  
  const result = await createUserCommand.execute(userData); // Same command!
  sendResponse(context, result, 201);
}

export async function getAdminUsersRoute(
  context: UnifiedHttpContext,
  getUsersQuery: GetUsersQuery
): Promise<void> {
  // Admin listing - full data access
  const query = validateQueryOrError(context, AdminUserQuerySchema);
  if (!query) return;
  
  const result = await getUsersQuery.execute(query); // Same query!
  sendResponse(context, result);
}

// routes/user/api-routes.ts - External API routes
export async function createApiUserRoute(
  context: UnifiedHttpContext,
  createUserCommand: CreateUserCommand
): Promise<void> {
  // API creation - different format, rate limiting
  const userData = validateRequestBodyOrError(context, ApiUserCreationSchema);
  if (!userData) return;
  
  const result = await createUserCommand.execute(userData); // Same command!
  sendResponse(context, result, 201);
}
```

### Different Schemas for Same Commands

```typescript
// schemas/user-schemas.ts

// Public registration - minimal fields
export const PublicUserRegistrationSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
});

// Admin creation - more fields + permissions
export const AdminUserCreationSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  role: z.enum(['admin', 'manager', 'employee']),
  department: z.string().min(1),
  permissions: z.array(z.string()),
  status: z.enum(['active', 'inactive']).default('active'),
});

// API creation - external system format
export const ApiUserCreationSchema = z.object({
  user_email: z.string().email().transform(val => ({ email: val })),
  user_name: z.object({
    first: z.string().min(1),
    last: z.string().min(1),
  }).transform(val => ({ firstName: val.first, lastName: val.last })),
  external_id: z.string().min(1),
});

// Query schemas with different access levels
export const PublicUserQuerySchema = z.object({
  page: z.string().transform(Number).default('1'),
  limit: z.string().transform(Number).max(10).default('5'), // Limited for public
});

export const AdminUserQuerySchema = z.object({
  page: z.string().transform(Number).default('1'),
  limit: z.string().transform(Number).max(100).default('20'), // More for admin
  search: z.string().optional(),
  department: z.string().optional(),
  role: z.string().optional(),
  status: z.enum(['active', 'inactive', 'suspended']).optional(),
});
```

### API Versioning with Simple Route Modules

The power of Simple Route Modules really shines when managing API versions. You can reuse the same Commands/Queries with different route versions, or gradually migrate business logic while maintaining backward compatibility.

#### Scenario 1: New Route Version + Same Command/Query + Different Validation

```typescript
// routes/user/v1-routes.ts - Original version
export async function createUserV1Route(
  context: UnifiedHttpContext,
  createUserCommand: CreateUserCommand // Same command
): Promise<void> {
  // V1: Basic validation only
  const userData = validateRequestBodyOrError(context, CreateUserV1Schema);
  if (!userData) return;
  
  const result = await createUserCommand.execute(userData);
  sendResponse(context, result, 201);
}

// routes/user/v2-routes.ts - Enhanced version
export async function createUserV2Route(
  context: UnifiedHttpContext,
  createUserCommand: CreateUserCommand // Same command!
): Promise<void> {
  // V2: Enhanced validation + preprocessing
  const userData = validateRequestBodyOrError(context, CreateUserV2Schema);
  if (!userData) return;
  
  // V2: Additional preprocessing
  if (userData.company) {
    userData.companyDomain = extractDomainFromCompany(userData.company);
  }
  
  if (userData.phoneNumber) {
    userData.phoneNumber = normalizePhoneNumber(userData.phoneNumber);
  }
  
  // Same business logic through same command
  const result = await createUserCommand.execute(userData);
  
  // V2: Enhanced response format
  sendResponse(context, {
    user: result,
    apiVersion: 'v2',
    features: ['enhanced-validation', 'company-domain-extraction']
  }, 201);
}

// schemas/user-v1.schemas.ts - V1 schemas
export const CreateUserV1Schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
});

// schemas/user-v2.schemas.ts - V2 enhanced schemas
export const CreateUserV2Schema = z.object({
  email: z.string().email(),
  password: z.string().min(12), // Stronger password requirement
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  company: z.string().min(1).optional(), // New field
  phoneNumber: z.string().optional(), // New field
  preferredLanguage: z.enum(['en', 'th', 'ja']).default('en'), // New field
  marketingConsent: z.boolean().default(false), // New field
});
```

#### Scenario 2: Same Preprocessing + New Command/Query Version

```typescript
// Shared preprocessing function
async function preprocessOrderData(orderData: any): Promise<any> {
  // Common preprocessing logic
  const processed = {
    ...orderData,
    normalizedCustomerId: normalizeCustomerId(orderData.customerId),
    calculatedTaxes: await calculateTaxes(orderData.items, orderData.location),
    validatedInventory: await validateInventoryAvailability(orderData.items)
  };
  
  return processed;
}

// routes/order/v1-routes.ts - Original business logic
export async function createOrderV1Route(
  context: UnifiedHttpContext,
  createOrderCommand: CreateOrderCommand // V1 command
): Promise<void> {
  const orderData = validateRequestBodyOrError(context, CreateOrderSchema);
  if (!orderData) return;
  
  // Same preprocessing logic
  const processedData = await preprocessOrderData(orderData);
  
  // V1 business logic
  const result = await createOrderCommand.execute(processedData);
  sendResponse(context, result, 201);
}

// routes/order/v2-routes.ts - Enhanced business logic
export async function createOrderV2Route(
  context: UnifiedHttpContext,
  createOrderV2Command: CreateOrderV2Command // V2 command with new features!
): Promise<void> {
  const orderData = validateRequestBodyOrError(context, CreateOrderSchema);
  if (!orderData) return;
  
  // Same preprocessing logic
  const processedData = await preprocessOrderData(orderData);
  
  // V2 business logic with enhanced features
  const result = await createOrderV2Command.execute(processedData);
  sendResponse(context, result, 201);
}

// commands/order/create-order.command.ts - Original command
export class CreateOrderCommand {
  async execute(input: CreateOrderInput): Promise<Order> {
    // V1: Basic order creation
    const order = await this.orderRepository.create(input);
    await this.emailService.sendOrderConfirmation(order);
    
    return order;
  }
}

// commands/order/create-order-v2.command.ts - Enhanced command
export class CreateOrderV2Command {
  async execute(input: CreateOrderInput): Promise<Order> {
    // V2: Enhanced order creation with new features
    const order = await this.orderRepository.create(input);
    
    // V2: Enhanced features
    await this.inventoryService.reserveItems(order.items);
    await this.loyaltyService.awardPoints(order.customerId, order.total);
    await this.emailService.sendOrderConfirmation(order);
    await this.smsService.sendOrderSMS(order.customer.phone, order.id);
    
    // V2: Advanced analytics
    await this.analyticsService.trackOrderCreated(order, 'v2');
    
    return order;
  }
}
```

#### Scenario 3: Infrastructure Migration with Same Route

```typescript
// routes/product/product-routes.ts - Same route function, different implementation
export async function getProductsRoute(
  context: UnifiedHttpContext,
  getProductsQuery: GetProductsQuery // Same interface, different implementation
): Promise<void> {
  const query = validateQueryOrError(context, GetProductsQuerySchema);
  if (!query) return;
  
  const result = await getProductsQuery.execute(query);
  sendResponse(context, result);
}

// apps/main.ts - Configuration-based dependency injection
async function createApp(): Promise<FastifyInstance> {
  const container = setupContainer();
  const fastify = require('fastify')({ logger: true });

  // Get query implementation based on environment/config
  const getProductsQuery = container.get('getProductsQuery'); // Could be SQL or NoSQL

  // Same URL, same route function
  fastify.get('/products', async (request, reply) => {
    const context = createFastifyContext(request, reply);
    await getProductsRoute(context, getProductsQuery); // Same route!
  });

  return fastify;
}

// foundations/container-setup.ts - Feature flag or environment-based setup
export function setupContainer(): BasicDIContainer {
  const container = new BasicDIContainer();

  // Configuration-based implementation selection
  if (process.env.DATABASE_TYPE === 'mongodb') {
    // NoSQL implementation
    container.registerSingleton('productRepository', () => 
      new MongoProductRepository(container.get('mongoClient'))
    );
    container.register('getProductsQuery', () => 
      new GetProductsNoSQLQuery(container.get('productRepository'))
    );
  } else {
    // SQL implementation (default)
    container.registerSingleton('productRepository', () => 
      new PrismaProductRepository(container.get('prisma'))
    );
    container.register('getProductsQuery', () => 
      new GetProductsSQLQuery(container.get('productRepository'))
    );
  }

  return container;
}

// Both implementations satisfy the same interface
export interface GetProductsQuery {
  execute(input: GetProductsInput): Promise<GetProductsResult>;
}

export class GetProductsSQLQuery implements GetProductsQuery {
  constructor(private repository: PrismaProductRepository) {}

  async execute(input: GetProductsInput): Promise<GetProductsResult> {
    // SQL implementation
    return this.repository.findMany(input);
  }
}

export class GetProductsNoSQLQuery implements GetProductsQuery {
  constructor(private repository: MongoProductRepository) {}

  async execute(input: GetProductsInput): Promise<GetProductsResult> {
    // NoSQL implementation with same result format
    return this.repository.findMany(input);
  }
}
```

### Benefits of API Versioning with Simple Route Modules

**✅ Code Reuse:**
- Same Commands/Queries with different validation schemas
- Same preprocessing logic with different business logic
- Gradual migration without breaking existing clients

**✅ Backward Compatibility:**
- Keep old routes working while adding new features
- Clear deprecation path for legacy endpoints
- Independent testing of each version

**✅ Clear Separation:**
- Route-level concerns (validation, preprocessing) vs Business logic (commands/queries)
- Version-specific logic contained in specific route modules
- Easy to remove deprecated versions when ready

**✅ Development Flexibility:**
- Add new validation rules without changing business logic
- Enhance business logic without affecting validation
- Mix and match components across versions

### Apps Layer: Thin Framework Adapters

```typescript
// apps/user-service/src/main.ts - Fastify adapter layer
import { FastifyInstance } from 'fastify';
import { createFastifyContext } from '@inh-lib/api-util-fastify';
import { 
  createPublicUserRoute, 
  getPublicUsersRoute 
} from '@workspace/routes/user/public-routes';
import { 
  createAdminUserRoute, 
  getAdminUsersRoute 
} from '@workspace/routes/user/admin-routes';
import {
  createUserV1Route,
  createUserV2Route
} from '@workspace/routes/user/versioned-routes';

async function createApp(): Promise<FastifyInstance> {
  const container = setupContainer();
  const fastify: FastifyInstance = require('fastify')({ logger: true });

  // Get commands/queries from container
  const createUserCommand = container.get('createUserCommand');
  const getUsersQuery = container.get('getUsersQuery');

  // 🎯 Apps layer: Thin adapters only!
  
  // Public routes
  fastify.post('/register', async (request, reply) => {
    const context = createFastifyContext(request, reply);
    await createPublicUserRoute(context, createUserCommand);
  });

  fastify.get('/users', async (request, reply) => {
    const context = createFastifyContext(request, reply);
    await getPublicUsersRoute(context, getUsersQuery);
  });

  // Admin routes
  fastify.post('/admin/users', async (request, reply) => {
    const context = createFastifyContext(request, reply);
    await createAdminUserRoute(context, createUserCommand);
  });

  fastify.get('/admin/users', async (request, reply) => {
    const context = createFastifyContext(request, reply);
    await getAdminUsersRoute(context, getUsersQuery);
  });

  // Versioned API routes
  fastify.post('/v1/users', async (request, reply) => {
    const context = createFastifyContext(request, reply);
    await createUserV1Route(context, createUserCommand);
  });

  fastify.post('/v2/users', async (request, reply) => {
    const context = createFastifyContext(request, reply);
    await createUserV2Route(context, createUserCommand);
  });

  // Health check
  fastify.get('/health', async (request, reply) => {
    try {
      const prisma = container.get('prisma');
      await prisma.$queryRaw`SELECT 1`;
      return { status: 'healthy', timestamp: new Date() };
    } catch (error) {
      reply.status(503);
      return { status: 'unhealthy', error: error.message };
    }
  });
  
  return fastify;
}

async function main() {
  const app = await createApp();
  
  try {
    await app.listen({ port: 3000, host: '0.0.0.0' });
    console.log('🚀 Enterprise app running on port 3000');
    console.log('✅ CQRS: Commands & Queries separated');
    console.log('✅ Simple Route Modules: Framework-agnostic route functions');
    console.log('✅ API Versioning: Multiple versions with code reuse');
    console.log('✅ Basic DI Container: Dependencies managed automatically');
    console.log('✅ Repository Pattern: Data access abstracted');
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main().catch(console.error);
```

## Basic DI Container

### Why Dependency Injection?

```typescript
// ❌ Problem: Manual dependency management
class CreateUserCommand {
  constructor(
    private userRepository: UserRepository,
    private emailService: EmailService,
    private eventBus: EventBus,
    private logger: Logger,
    private hashService: HashService
  ) {}
}

// Manual wiring - gets complex quickly
const userRepository = new PrismaUserRepository(prisma);
const emailService = new EmailService(config.email);
const eventBus = new EventBus(config.eventBus);
const logger = new Logger();
const hashService = new HashService();

const createUserCommand = new CreateUserCommand(
  userRepository,
  emailService, 
  eventBus,
  logger,
  hashService
);
```

### Basic DI Container Solution

```typescript
// ✅ Solution: Automatic dependency resolution

// foundations/di-container.ts
export class BasicDIContainer {
  private instances = new Map<string, any>();
  private factories = new Map<string, () => any>();

  register<T>(name: string, factory: () => T): void {
    this.factories.set(name, factory);
  }

  registerSingleton<T>(name: string, factory: () => T): void {
    this.register(name, () => {
      if (!this.instances.has(name)) {
        this.instances.set(name, factory());
      }
      return this.instances.get(name);
    });
  }

  get<T>(name: string): T {
    const factory = this.factories.get(name);
    if (!factory) {
      throw new Error(`No registration found for: ${name}`);
    }
    return factory();
  }

  clear(): void {
    this.instances.clear();
    this.factories.clear();
  }
}

// foundations/container-setup.ts - Centralized configuration
export function setupContainer(): BasicDIContainer {
  const container = new BasicDIContainer();

  // Infrastructure - Singletons
  container.registerSingleton('prisma', () => 
    new PrismaClient({
      datasources: { db: { url: process.env.DATABASE_URL } }
    })
  );

  container.registerSingleton('logger', () => 
    new Logger({ level: process.env.LOG_LEVEL || 'info' })
  );

  container.registerSingleton('eventBus', () => 
    new EventBus({ 
      redis: { url: process.env.REDIS_URL }
    })
  );

  // Services - Singletons
  container.registerSingleton('emailService', () => 
    new EmailService({
      apiKey: process.env.EMAIL_API_KEY,
      logger: container.get('logger')
    })
  );

  container.registerSingleton('hashService', () => 
    new HashService({ rounds: 12 })
  );

  // Repositories - Singletons
  container.registerSingleton('userRepository', () => 
    new PrismaUserRepository(container.get('prisma'))
  );

  // Commands - New instances (can be singletons too)
  container.register('createUserCommand', () => 
    new CreateUserCommand(
      container.get('userRepository'),
      container.get('emailService'),
      container.get('eventBus'),
      container.get('logger'),
      container.get('hashService')
    )
  );

  // Queries - New instances
  container.register('getUsersQuery', () => 
    new GetUsersQuery(
      container.get('userRepository'),
      container.get('logger')
    )
  );

  return container;
}
```

## Repository Interfaces

### Why Repository Pattern?

```typescript
// ❌ Problem: Direct database coupling
class CreateUserCommand {
  constructor(private prisma: PrismaClient) {}

  async execute(input: CreateUserInput): Promise<User> {
    // Tightly coupled to Prisma
    const user = await this.prisma.user.create({
      data: {
        id: generateId(),
        email: input.email,
        firstName: input.firstName,
        lastName: input.lastName,
        createdAt: new Date(),
      }
    });
    
    return user;
  }
}
```

### Repository Interface Solution

```typescript
// ✅ Solution: Abstract data access

// repositories/user.repository.ts - Interface
export interface UserRepository {
  create(user: CreateUserData): Promise<User>;
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findMany(options: FindUsersOptions): Promise<User[]>;
  count(options: CountUsersOptions): Promise<number>;
  update(id: string, data: UpdateUserData): Promise<User>;
  delete(id: string): Promise<void>;
}

export interface FindUsersOptions {
  where?: {
    email?: string;
    status?: UserStatus;
    createdAt?: {
      gte?: Date;
      lte?: Date;
    };
    OR?: Array<{
      firstName?: { contains: string };
      lastName?: { contains: string };
      email?: { contains: string };
    }>;
  };
  skip?: number;
  take?: number;
  orderBy?: {
    [key: string]: 'asc' | 'desc';
  };
}

// repositories/prisma-user.repository.ts - Implementation
export class PrismaUserRepository implements UserRepository {
  constructor(private prisma: PrismaClient) {}

  async create(user: CreateUserData): Promise<User> {
    return this.prisma.user.create({
      data: user
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id }
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email }
    });
  }

  async findMany(options: FindUsersOptions): Promise<User[]> {
    return this.prisma.user.findMany({
      where: options.where,
      skip: options.skip,
      take: options.take,
      orderBy: options.orderBy
    });
  }

  async count(options: CountUsersOptions): Promise<number> {
    return this.prisma.user.count({
      where: options.where
    });
  }

  async update(id: string, data: UpdateUserData): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.user.delete({
      where: { id }
    });
  }
}
```

## Complete Example: Putting It All Together

### Project Structure

```
src/
├── routes/                          # 🚀 Framework-agnostic route functions
│   ├── user/
│   │   ├── public-routes.ts         # Public user operations
│   │   ├── admin-routes.ts          # Admin user operations
│   │   ├── api-routes.ts            # External API operations
│   │   └── versioned-routes.ts      # API version management
│   ├── order/
│   │   ├── customer-routes.ts       # Customer order operations
│   │   └── admin-routes.ts          # Admin order operations
│   └── shared/
│       └── middleware.ts            # Framework-agnostic middleware
├── commands/                        # 📝 Write operations (CQRS)
│   ├── user/
│   │   ├── create-user.command.ts
│   │   ├── update-user.command.ts
│   │   └── delete-user.command.ts
│   └── order/
│       ├── create-order.command.ts
│       ├── create-order-v2.command.ts
│       └── update-order.command.ts
├── queries/                         # 📖 Read operations (CQRS)
│   ├── user/
│   │   ├── get-users.query.ts
│   │   ├── get-users-v2.query.ts
│   │   └── get-user.query.ts
│   └── order/
│       ├── get-orders.query.ts
│       └── get-order.query.ts
├── repositories/                    # 🗄️ Data access interfaces
│   ├── user.repository.ts           # Interface
│   ├── prisma-user.repository.ts    # Implementation
│   ├── order.repository.ts          # Interface
│   └── prisma-order.repository.ts   # Implementation
├── schemas/                         # 📋 Validation schemas
│   ├── user-schemas.ts
│   ├── user-v1.schemas.ts
│   ├── user-v2.schemas.ts
│   └── order-schemas.ts
├── foundations/                     # 🏗️ Core infrastructure
│   ├── di-container.ts
│   └── container-setup.ts
└── __tests__/                       # 🧪 Tests
    ├── commands/
    ├── queries/
    ├── routes/
    └── integration/
```

### Application Setup

```typescript
// main.ts - Complete enterprise application setup
import { FastifyInstance } from 'fastify';
import { setupContainer } from './foundations/container-setup';
import { 
  createPublicUserRoute, 
  getPublicUsersRoute 
} from './routes/user/public-routes';
import { 
  createAdminUserRoute, 
  getAdminUsersRoute 
} from './routes/user/admin-routes';
import {
  createUserV1Route,
  createUserV2Route
} from './routes/user/versioned-routes';

async function createApp(): Promise<FastifyInstance> {
  // 1. Setup DI Container with all dependencies
  const container = setupContainer();
  
  // 2. Create Fastify instance
  const fastify: FastifyInstance = require('fastify')({ logger: true });
  
  // 3. Setup middleware
  await fastify.register(require('@fastify/cors'), { origin: true });
  
  // 4. Get commands/queries from container
  const createUserCommand = container.get('createUserCommand');
  const getUsersQuery = container.get('getUsersQuery');
  
  // 5. Register routes - just thin adapters
  
  // Public API
  fastify.post('/register', async (request, reply) => {
    const context = createFastifyContext(request, reply);
    await createPublicUserRoute(context, createUserCommand);
  });

  fastify.get('/users', async (request, reply) => {
    const context = createFastifyContext(request, reply);
    await getPublicUsersRoute(context, getUsersQuery);
  });

  // Admin API
  fastify.post('/admin/users', async (request, reply) => {
    const context = createFastifyContext(request, reply);
    await createAdminUserRoute(context, createUserCommand);
  });

  fastify.get('/admin/users', async (request, reply) => {
    const context = createFastifyContext(request, reply);
    await getAdminUsersRoute(context, getUsersQuery);
  });

  // Versioned API
  fastify.post('/v1/users', async (request, reply) => {
    const context = createFastifyContext(request, reply);
    await createUserV1Route(context, createUserCommand);
  });

  fastify.post('/v2/users', async (request, reply) => {
    const context = createFastifyContext(request, reply);
    await createUserV2Route(context, createUserCommand);
  });

  // Health check
  fastify.get('/health', async (request, reply) => {
    try {
      const prisma = container.get('prisma');
      await prisma.$queryRaw`SELECT 1`;
      return { status: 'healthy', timestamp: new Date() };
    } catch (error) {
      reply.status(503);
      return { status: 'unhealthy', error: error.message };
    }
  });
  
  return fastify;
}

async function main() {
  const app = await createApp();
  
  try {
    await app.listen({ port: 3000, host: '0.0.0.0' });
    console.log('🚀 Enterprise app running on port 3000');
    console.log('✅ CQRS: Commands & Queries separated');
    console.log('✅ Simple Route Modules: Framework-agnostic route functions');
    console.log('✅ API Versioning: Multiple versions with code reuse');
    console.log('✅ Basic DI Container: Dependencies managed automatically');
    console.log('✅ Repository Pattern: Data access abstracted');
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main().catch(console.error);
```

## Migration Strategy: Simple → Enterprise

### When to Migrate Each Pattern

```typescript
// Stage 1: CQRS - When business logic becomes complex (5+ service methods with 20+ lines each)
// Before: Everything in one method (50+ lines)
class UserService {
  async createUser(context: UnifiedHttpContext) {
    // 50+ lines of complex validation, business rules, side effects
  }
}

// After: Focused Commands & Queries
class CreateUserCommand {
  async execute(input: CreateUserInput): Promise<User> {
    // Focused business logic only (10-20 lines)
  }
}

// Stage 2: Simple Route Modules - When you need route reuse (same command, different validation)
// Before: Duplicate logic in multiple routes
fastify.post('/register', handler1);
fastify.post('/admin/users', handler2); // Same logic, different validation

// After: Reusable route functions
await createUserRoute(context, command); // Different schemas per context

// Stage 3: Basic DI Container - When dependencies become numerous (5+ constructor params)
// Before: Manual wiring
const createUserCommand = new CreateUserCommand(repo, email, event, log, hash);

// After: Automatic resolution
const createUserCommand = container.get('createUserCommand');

// Stage 4: Repository Interfaces - When you need database flexibility or better testing
// Before: Direct database coupling
class CreateUserCommand {
  constructor(private prisma: PrismaClient) {}
}

// After: Interface abstraction
class CreateUserCommand {
  constructor(private userRepository: UserRepository) {}
}
```

### Gradual Adoption

```typescript
// Week 1-2: Start with CQRS for new features
export class CreatePostCommand { /* ... */ }
export class GetPostsQuery { /* ... */ }

// Week 3-4: Convert existing complex service methods
// Old: 50-line service method → New: Focused command + query

// Week 5-6: Add route modules for code reuse
export async function createUserRoute(context, command) { /* ... */ }

// Week 7-8: Implement basic DI container
const container = setupContainer();
const command = container.get('createUserCommand');
```

### Decision Framework

```typescript
function shouldUseEnterprisePatterns(project: ProjectProfile): boolean {
  return project.teamSize > 5 || 
         project.serviceCount > 10 || 
         project.businessLogic === 'complex' ||
         project.maintenanceYears > 2;
}
```

### 📊 **Pattern Adoption Roadmap**

| Week | Pattern | Focus | Team Size |
|------|---------|-------|-----------|
| **1-2** | CQRS | Separate read/write concerns | 3+ devs |
| **3-4** | Simple Route Modules | Reusable route functions | 5+ devs |
| **5-6** | Basic DI Container | Dependency management | 5+ devs |
| **7-8** | Repository Interfaces | Data access abstraction | 5+ devs |

## Benefits of Enterprise Patterns (Free Edition)

### ✅ **CQRS Pattern Benefits:**
- **Focused Logic**: Each command/query has single responsibility
- **Better Testing**: Small, focused units are easier to test
- **Performance**: Different optimization strategies for reads vs writes
- **Scalability**: Can scale read/write operations independently

### ✅ **Simple Route Modules Benefits:**
- **Framework Independence**: Same route functions work with any HTTP framework
- **Code Reuse**: Same commands/queries with different validation schemas
- **API Versioning**: Easy management of multiple API versions
- **Easy Testing**: Test route logic without HTTP framework
- **Clear Organization**: Route functions organized by domain and access level

### ✅ **Basic DI Container Benefits:**
- **Automatic Dependency Resolution**: No manual wiring
- **Singleton Management**: Shared instances where appropriate
- **Testing Support**: Easy to substitute mock implementations
- **Configuration Centralization**: All dependencies defined in one place

### ✅ **Repository Pattern Benefits:**
- **Database Independence**: Switch databases without changing business logic
- **Easy Testing**: Mock repositories for unit tests
- **Query Abstraction**: Complex queries hidden behind simple interfaces
- **Separation of Concerns**: Data access separated from business logic

## What's Next?

### 🆓 **Free Edition Covers:**
- ✅ **CQRS Pattern**: Separate commands and queries
- ✅ **Simple Route Modules**: Framework-agnostic route functions with API versioning
- ✅ **Basic DI Container**: Automatic dependency resolution
- ✅ **Repository Interfaces**: Clean data access abstraction

### 💎 **Premium Features** (Advanced Route Management):
- 🚀 **UnifiedRoute System**: Automatic route discovery and registration
- 📚 **OpenAPI Generation**: Automatic documentation from route decorators
- 🔒 **Systematic Security**: Declarative auth, rate limiting, CORS management
- 📊 **Performance Monitoring**: Built-in route performance tracking
- 🏗️ **Advanced DI Features**: Conditional registration, environment-specific config
- 🧪 **Auto-Test Generation**: Automated test scaffolding from route definitions

The free enterprise patterns provide everything needed for complex applications with multiple developers and long-term maintenance requirements! 🏗️🚀

---

> 💡 **Next Steps**: The foundation knowledge in this free edition gives you everything needed to implement enterprise patterns correctly. For advanced systematic route management, sophisticated DI features, and cutting-edge validation pipelines, explore our premium content series.

> 📧 **Questions?** Join our community discussions or reach out for guidance on implementing these patterns in your specific use case.