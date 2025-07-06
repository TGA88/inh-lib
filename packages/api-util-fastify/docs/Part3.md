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
```

```typescript
// ✅ Separated concerns - clean and testable
class UserService {
  constructor(private userRepository: UserRepository) {}

  async createUser(context: UnifiedHttpContext): Promise<void> {
    try {
      // Validation layer
      const userData = this.validateCreateUserRequest(context);
      if (!userData) return; // Error already sent
      
      // Authorization layer
      const currentUser = this.getCurrentUser(context);
      if (!currentUser) {
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

## Complete CRUD Example

### Type Definitions

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
```

### Repository Interface

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
```

### Framework-Agnostic Service

```typescript
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

### Repository Implementation

```typescript
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
    
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
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

## Framework Adapters

### Fastify Adapter

```typescript
// adapters/fastify/user.routes.ts
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { createFastifyContext } from '@inh-lib/api-util-fastify';
import { UserService } from '../../services/user.service';

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
```

### Express Adapter (Future)

```typescript
// adapters/express/user.routes.ts (when Express adapter is available)
import { Express, Request, Response } from 'express';
import { createExpressContext } from '@inh-lib/api-util-express';
import { UserService } from '../../services/user.service';

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

  async findByEmail(email: string): Promise<User | null> {
    return this.users.find(u => u.email === email) || null;
  }

  async findById(id: string): Promise<User | null> {
    return this.users.find(u => u.id === id) || null;
  }

  async findMany(options: GetUsersQuery): Promise<{ users: User[]; total: number }> {
    let filteredUsers = [...this.users];
    
    if (options.search) {
      const search = options.search.toLowerCase();
      filteredUsers = filteredUsers.filter(user =>
        user.firstName.toLowerCase().includes(search) ||
        user.lastName.toLowerCase().includes(search) ||
        user.email.toLowerCase().includes(search)
      );
    }
    
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
    });

    it('should handle duplicate email', async () => {
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
    });
  });

  describe('getUsers', () => {
    beforeEach(() => {
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
      const call = mockContext.response.json.mock.calls[0][0];
      expect(call.data).toHaveLength(2);
      expect(call.pagination).toEqual({
        page: 1,
        limit: 2,
        total: 3,
        totalPages: 2,
      });
    });

    it('should filter users by search', async () => {
      const mockContext = createMockContext({
        query: { search: 'alice' },
      });

      await userService.getUsers(mockContext);

      const call = mockContext.response.json.mock.calls[0][0];
      expect(call.data).toHaveLength(1);
      expect(call.data[0].firstName).toBe('Alice');
    });
  });
});
```

### Integration Testing

```typescript
// __tests__/integration/user.api.test.ts
import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { createTestApp } from '../helpers/test-app';

describe('User API Integration Tests', () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
  });

  beforeEach(async () => {
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

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

    // Verify in database
    const dbUser = await prisma.user.findUnique({
      where: { email: userData.email },
    });
    expect(dbUser).toBeTruthy();
  });

  it('should get users via HTTP', async () => {
    // Seed test data
    await prisma.user.createMany({
      data: [
        { id: '1', email: 'user1@test.com', firstName: 'User', lastName: 'One' },
        { id: '2', email: 'user2@test.com', firstName: 'User', lastName: 'Two' },
      ],
    });

    const response = await app.inject({
      method: 'GET',
      url: '/users?page=1&limit=10',
    });

    expect(response.statusCode).toBe(200);
    
    const result = JSON.parse(response.payload);
    expect(result.data).toHaveLength(2);
    expect(result.pagination.total).toBe(2);
  });
});

// __tests__/helpers/test-app.ts
import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { PrismaUserRepository } from '../../repositories/prisma-user.repository';
import { UserService } from '../../services/user.service';
import { registerUserRoutes } from '../../adapters/fastify/user.routes';

export async function createTestApp(): Promise<{ app: FastifyInstance; prisma: PrismaClient }> {
  const prisma = new PrismaClient({
    datasources: { db: { url: process.env.TEST_DATABASE_URL } },
  });
  
  const fastify: FastifyInstance = require('fastify')({ logger: false });
  
  // Setup dependencies
  const userRepository = new PrismaUserRepository(prisma);
  const userService = new UserService(userRepository);
  
  // Register routes
  registerUserRoutes(fastify, userService);
  
  await fastify.ready();
  return { app: fastify, prisma };
}
```

## Project Structure

### Simple Framework-Agnostic Structure

```
src/
├── types/                          # Type definitions
│   ├── user.types.ts
│   ├── auth.types.ts
│   └── index.ts
├── services/                       # Framework-agnostic services
│   ├── user.service.ts
│   ├── auth.service.ts
│   └── index.ts
├── repositories/                   # Data access
│   ├── interfaces/
│   │   ├── user.repository.ts
│   │   └── index.ts
│   ├── prisma/
│   │   ├── prisma-user.repository.ts
│   │   └── index.ts
│   └── memory/                     # For testing
│       ├── memory-user.repository.ts
│       └── index.ts
├── adapters/                       # Framework adapters
│   ├── fastify/
│   │   ├── user.routes.ts
│   │   ├── auth.routes.ts
│   │   └── app.ts
│   ├── express/                    # Future
│   │   └── user.routes.ts
│   └── koa/                        # Future
│       └── user.routes.ts
├── middleware/                     # Framework-agnostic middleware
│   ├── auth.middleware.ts
│   └── index.ts
├── utils/                          # Utility functions
│   ├── validation.utils.ts
│   └── index.ts
├── __tests__/
│   ├── services/
│   │   └── user.service.test.ts
│   ├── integration/
│   │   └── user.api.test.ts
│   └── helpers/
│       └── test-app.ts
└── main.ts                         # Application entry point
```

## Application Setup

### Simple Setup Example

```typescript
// main.ts
import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { PrismaUserRepository } from './repositories/prisma/prisma-user.repository';
import { UserService } from './services/user.service';
import { registerUserRoutes } from './adapters/fastify/user.routes';

async function createApp(): Promise<FastifyInstance> {
  // Initialize database
  const prisma = new PrismaClient();
  
  // Initialize repositories with dependency injection
  const userRepository = new PrismaUserRepository(prisma);
  
  // Initialize services with dependency injection
  const userService = new UserService(userRepository);
  
  // Initialize Fastify
  const fastify: FastifyInstance = require('fastify')({ logger: true });
  
  // Add CORS
  await fastify.register(require('@fastify/cors'), {
    origin: true,
    credentials: true,
  });
  
  // Register routes (thin adapters)
  registerUserRoutes(fastify, userService);
  
  // Health check
  fastify.get('/health', async (request, reply) => {
    try {
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
  
  // Graceful shutdown
  const shutdown = async () => {
    console.log('Shutting down gracefully...');
    await app.close();
    process.exit(0);
  };
  
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
  
  // Start server
  try {
    await app.listen({ port: 3000, host: '0.0.0.0' });
    console.log('🚀 Server running on port 3000');
    console.log('📖 All business logic is framework-agnostic!');
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main().catch(console.error);
```

## Benefits of Framework-Agnostic Architecture

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

## Migration Strategy

### From Framework-Coupled to Framework-Agnostic

```typescript
// Step 1: Extract business logic to service class
// Before: Everything in route handler
fastify.post('/users', async (request, reply) => {
  const userData = request.body;
  const user = await prisma.user.create({ data: userData });
  reply.send(user);
});

// After: Business logic in service
class UserService {
  constructor(private userRepository: UserRepository) {}
  
  async createUser(context: UnifiedHttpContext): Promise<void> {
    const userData = getRequestBody(context);
    const user = await this.userRepository.create(userData);
    sendResponse(context, user, 201);
  }
}

fastify.post('/users', async (request, reply) => {
  const context = createFastifyContext(request, reply);
  await userService.createUser(context);
});

// Step 2: Add dependency injection
// Before: Direct database access
class UserService {
  private prisma = new PrismaClient();
}

// After: Injected repository
class UserService {
  constructor(private userRepository: UserRepository) {}
}

// Step 3: Add framework adapters
// Now you can easily support multiple frameworks!
```

## What's Next?

You now have a solid foundation for building framework-agnostic web services! In the next part, we'll explore enterprise-scale architecture patterns:

**[Part 4: Enterprise Architecture](04-enterprise-architecture.md)** - Learn advanced patterns like CQRS, Route Libraries, DI Containers, and mono-repo architecture for large-scale applications.

## Summary

Framework-Agnostic Architecture provides:

✅ **Framework Independence** - Switch HTTP frameworks without changing business logic  
✅ **Better Testing** - Test without HTTP mocking, faster unit tests  
✅ **Code Reuse** - Share business logic across applications  
✅ **Clean Separation** - HTTP concerns separated from business logic  
✅ **Easy Migration** - Gradual adoption, no big-bang rewrites  
✅ **Type Safety** - End-to-end TypeScript support  

The key is using the Unified Context pattern to abstract away HTTP framework specifics while keeping your business logic pure and testable! 🎉