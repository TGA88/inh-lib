# 🎯 Unified Registry System - คู่มือการใช้งาน

## 📖 บทนำ

Unified Registry System เป็นระบบจัดการข้อมูลแบบ centralized ที่ช่วยให้คุณสามารถแชร์ข้อมูลระหว่าง middleware และ route handler ได้อย่างปลอดภัยและมีประสิทธิภาพ

## 🏗️ สถาปัตยกรรม

ระบบ Registry มี 2 ระดับ:

### 1. **Basic Registry** (Context Registry)
- ใช้งานง่าย เหมาะสำหรับการแชร์ข้อมูลพื้นฐาน
- ข้อมูลอยู่ใน `context.registry` 
- เหมาะสำหรับ simple data sharing

### 2. **Advanced Registry** (Unified Registry Service)
- ระบบ Dependency Injection แบบเต็มรูปแบบ
- รองรับ Service Lifetime (Singleton, Transient, Scoped)
- ตรวจสอบ Circular Dependencies
- เหมาะสำหรับ complex application architecture

---

## 🚀 Basic Registry - การใช้งานพื้นฐาน

### การเก็บและดึงข้อมูล

```typescript
import { 
  addRegistryItem, 
  getRegistryItem, 
  UnifiedHttpContext,
  UnifiedMiddleware 
} from '@inh-lib/unified-route';

// เก็บข้อมูลใน Registry
const authMiddleware: UnifiedMiddleware = async (context, next) => {
  const user = await authenticateUser(context);
  
  // เพิ่มข้อมูลเข้า registry
  addRegistryItem(context, 'user', user);
  addRegistryItem(context, 'authTime', new Date().toISOString());
  addRegistryItem(context, 'permissions', user.permissions);
  
  await next();
};

// ดึงข้อมูลจาก Registry
const profileHandler = async (context: UnifiedHttpContext) => {
  const user = getRegistryItem<User>(context, 'user');
  
  // ⚠️ สำคัญ: ต้องตรวจสอบ Error เสมอ
  if (user instanceof Error) {
    return sendError(context, 'User not authenticated', 401);
  }
  
  sendResponse(context, { profile: user });
};
```

### Registry Keys Pattern

```typescript
// แนะนำให้สร้าง constants สำหรับ key names
export const REGISTRY_KEYS = {
  // User & Authentication
  USER: 'user',
  USER_PERMISSIONS: 'user:permissions',
  AUTH_TIME: 'auth:time',
  SESSION: 'session',
  
  // Database & Resources
  DATABASE: 'database',
  TRANSACTION: 'db:transaction',
  CACHE: 'cache',
  
  // Request Metadata
  REQUEST_ID: 'request:id',
  CORRELATION_ID: 'correlation:id',
  METADATA: 'metadata',
  
  // Framework Specific
  EXPRESS_SESSION: 'express:session',
  FASTIFY_INSTANCE: 'fastify:instance',
  HONO_ENV: 'hono:env'
} as const;

// Type-safe access
type RegistryKey = typeof REGISTRY_KEYS[keyof typeof REGISTRY_KEYS];

const getTypedRegistryItem = <T>(
  context: UnifiedHttpContext, 
  key: RegistryKey
): T | Error => {
  return getRegistryItem<T>(context, key);
};
```

---

## 🎯 Registry Patterns - รูปแบบการใช้งาน

### 1. 🔐 Authentication & Authorization

```typescript
interface User {
  id: string;
  email: string;
  roles: string[];
  permissions: string[];
}

interface UserPermissions {
  canAccess: (resource: string) => boolean;
  hasRole: (role: string) => boolean;
}

const authMiddleware: UnifiedMiddleware = async (context, next) => {
  const token = context.request.headers.authorization;
  
  if (!token) {
    return sendError(context, 'Authorization required', 401);
  }
  
  try {
    const user = await validateToken(token);
    const permissions: UserPermissions = {
      canAccess: (resource: string) => user.permissions.includes(resource),
      hasRole: (role: string) => user.roles.includes(role)
    };
    
    addRegistryItem(context, REGISTRY_KEYS.USER, user);
    addRegistryItem(context, REGISTRY_KEYS.USER_PERMISSIONS, permissions);
    
  } catch (error) {
    return sendError(context, 'Invalid token', 401);
  }
  
  await next();
};

// ใช้งานใน handler
const adminHandler = async (context: UnifiedHttpContext) => {
  const permissions = getRegistryItem<UserPermissions>(
    context, 
    REGISTRY_KEYS.USER_PERMISSIONS
  );
  
  if (permissions instanceof Error || !permissions.hasRole('admin')) {
    return sendError(context, 'Insufficient permissions', 403);
  }
  
  sendResponse(context, { message: 'Welcome to admin panel' });
};
```

### 2. 🗄️ Database Connection Sharing

```typescript
interface DatabaseConnection {
  query: (sql: string, params?: unknown[]) => Promise<unknown[]>;
  transaction: <T>(callback: (tx: Transaction) => Promise<T>) => Promise<T>;
  close: () => Promise<void>;
}

const databaseMiddleware: UnifiedMiddleware = async (context, next) => {
  const db = await createDatabaseConnection();
  addRegistryItem<DatabaseConnection>(context, REGISTRY_KEYS.DATABASE, db);
  
  try {
    await next();
  } finally {
    // ทำความสะอาดทรัพยากร
    await db.close();
  }
};

const userHandler = async (context: UnifiedHttpContext) => {
  const db = getRegistryItem<DatabaseConnection>(context, REGISTRY_KEYS.DATABASE);
  
  if (db instanceof Error) {
    return sendError(context, 'Database unavailable', 500);
  }
  
  const userId = getParams(context).id;
  const users = await db.query('SELECT * FROM users WHERE id = ?', [userId]);
  
  sendResponse(context, { user: users[0] });
};
```

### 3. 📊 Request Metadata & Logging

```typescript
interface RequestMetadata {
  requestId: string;
  startTime: number;
  userAgent: string;
  ip: string;
  correlationId?: string;
  traceId?: string;
}

const metadataMiddleware: UnifiedMiddleware = async (context, next) => {
  const metadata: RequestMetadata = {
    requestId: generateRequestId(),
    startTime: Date.now(),
    userAgent: context.request.userAgent || 'unknown',
    ip: context.request.ip,
    correlationId: context.request.headers['x-correlation-id'],
    traceId: context.request.headers['x-trace-id']
  };
  
  addRegistryItem(context, REGISTRY_KEYS.METADATA, metadata);
  addRegistryItem(context, REGISTRY_KEYS.REQUEST_ID, metadata.requestId);
  
  // Log request start
  console.log(`[${metadata.requestId}] → ${context.request.method} ${context.request.url}`);
  
  await next();
  
  // Log request completion
  const duration = Date.now() - metadata.startTime;
  console.log(`[${metadata.requestId}] ← ${context.request.method} ${context.request.url} (${duration}ms)`);
};

const someHandler = async (context: UnifiedHttpContext) => {
  const metadata = getRegistryItem<RequestMetadata>(context, REGISTRY_KEYS.METADATA);
  
  if (!(metadata instanceof Error)) {
    console.log(`Processing request ${metadata.requestId}`);
  }
  
  sendResponse(context, { data: 'success' });
};
```

### 4. 🗂️ Caching Layer

```typescript
interface CacheLayer {
  get: <T>(key: string) => Promise<T | null>;
  set: <T>(key: string, value: T, ttl?: number) => Promise<void>;
  delete: (key: string) => Promise<void>;
  exists: (key: string) => Promise<boolean>;
}

const cacheMiddleware: UnifiedMiddleware = async (context, next) => {
  const cache: CacheLayer = {
    get: async <T>(key: string): Promise<T | null> => {
      const result = await redis.get(key);
      return result ? JSON.parse(result) : null;
    },
    
    set: async <T>(key: string, value: T, ttl = 3600): Promise<void> => {
      await redis.setex(key, ttl, JSON.stringify(value));
    },
    
    delete: async (key: string): Promise<void> => {
      await redis.del(key);
    },
    
    exists: async (key: string): Promise<boolean> => {
      return await redis.exists(key) === 1;
    }
  };
  
  addRegistryItem(context, REGISTRY_KEYS.CACHE, cache);
  await next();
};

const cachedDataHandler = async (context: UnifiedHttpContext) => {
  const cache = getRegistryItem<CacheLayer>(context, REGISTRY_KEYS.CACHE);
  
  if (cache instanceof Error) {
    return sendError(context, 'Cache unavailable', 500);
  }
  
  const userId = getParams(context).id;
  const cacheKey = `user:${userId}`;
  
  // ลองดึงจาก cache ก่อน
  let userData = await cache.get<User>(cacheKey);
  
  if (!userData) {
    // ถ้าไม่มีใน cache ให้ดึงจาก database
    userData = await fetchUserFromDatabase(userId);
    // เก็บใน cache สำหรับครั้งต่อไป
    await cache.set(cacheKey, userData, 1800); // 30 minutes
  }
  
  sendResponse(context, { user: userData, cached: !!userData });
};
```

### 5. 🔄 Transaction Management

```typescript
interface Transaction {
  query: (sql: string, params?: unknown[]) => Promise<unknown[]>;
  commit: () => Promise<void>;
  rollback: () => Promise<void>;
}

const transactionMiddleware: UnifiedMiddleware = async (context, next) => {
  const db = getRegistryItem<DatabaseConnection>(context, REGISTRY_KEYS.DATABASE);
  
  if (db instanceof Error) {
    return sendError(context, 'Database unavailable', 500);
  }
  
  await db.transaction(async (tx) => {
    addRegistryItem(context, REGISTRY_KEYS.TRANSACTION, tx);
    
    try {
      await next();
      // Transaction จะ commit อัตโนมัติถ้าไม่มี error
    } catch (error) {
      // Transaction จะ rollback อัตโนมัติถ้ามี error
      throw error;
    }
  });
};

const createUserHandler = async (context: UnifiedHttpContext) => {
  const tx = getRegistryItem<Transaction>(context, REGISTRY_KEYS.TRANSACTION);
  
  if (tx instanceof Error) {
    return sendError(context, 'Transaction not available', 500);
  }
  
  const userData = getRequestBody<CreateUserRequest>(context);
  
  // ใช้ transaction สำหรับการทำงานหลายขั้นตอน
  const [user] = await tx.query(
    'INSERT INTO users (email, name) VALUES (?, ?) RETURNING *',
    [userData.email, userData.name]
  );
  
  await tx.query(
    'INSERT INTO user_preferences (user_id, theme) VALUES (?, ?)',
    [user.id, 'light']
  );
  
  sendResponse(context, { user }, 201);
};
```

---

## ⚡ Advanced Registry - Unified Registry Service

สำหรับ application ที่ซับซ้อนมากขึ้น คุณสามารถใช้ Unified Registry Service ที่มีคุณสมบัติแบบ Dependency Injection

### การตั้งค่าเริ่มต้น

```typescript
import { UnifiedRegistryService } from '@inh-lib/unified-route/unified-registry';

// สร้าง registry service
const registry = UnifiedRegistryService.create();

// ลงทะเบียน services
registry.register('userService', () => new UserService(), { lifetime: 'singleton' });
registry.register('emailService', () => new EmailService(), { lifetime: 'transient' });
registry.register('cacheService', (scope) => new CacheService(scope), { lifetime: 'scoped' });

// ใช้งานใน middleware
const serviceMiddleware: UnifiedMiddleware = async (context, next) => {
  // สร้าง scope สำหรับ request นี้
  const scope = registry.createScope();
  
  // เก็บ scope ใน registry เพื่อให้ handler ใช้ได้
  addRegistryItem(context, 'serviceScope', scope);
  
  try {
    await next();
  } finally {
    // ทำความสะอาด scoped services
    scope.dispose();
  }
};

// ใช้งานใน handler
const userHandler = async (context: UnifiedHttpContext) => {
  const scope = getRegistryItem<UnifiedRegistryScope>(context, 'serviceScope');
  
  if (scope instanceof Error) {
    return sendError(context, 'Service scope not available', 500);
  }
  
  // ใช้ services ผ่าน scope
  const userService = scope.resolve<UserService>('userService');
  const emailService = scope.resolve<EmailService>('emailService');
  
  const user = await userService.getUser(getParams(context).id);
  await emailService.sendWelcomeEmail(user.email);
  
  sendResponse(context, { user });
};
```

### Service Lifetimes

```typescript
// Singleton - สร้างครั้งเดียวใช้ตลอด application
registry.register('configService', () => new ConfigService(), { 
  lifetime: 'singleton' 
});

// Transient - สร้างใหม่ทุกครั้งที่ resolve
registry.register('loggerService', () => new LoggerService(), { 
  lifetime: 'transient' 
});

// Scoped - สร้างครั้งเดียวต่อ scope (request)
registry.register('dbContextService', (scope) => new DbContextService(), { 
  lifetime: 'scoped' 
});
```

---

## ✅ Best Practices

### 1. 🔒 Type Safety

```typescript
// ใช้ Generic types เสมอ
const user = getRegistryItem<User>(context, 'user');

// ตรวจสอบ Error ก่อนใช้งาน
if (user instanceof Error) {
  console.error('Failed to get user:', user.message);
  return sendError(context, 'Internal server error', 500);
}

// หรือใช้ helper function
const getUserSafely = (context: UnifiedHttpContext): User | null => {
  const user = getRegistryItem<User>(context, REGISTRY_KEYS.USER);
  return user instanceof Error ? null : user;
};
```

### 2. 📝 Consistent Naming

```typescript
// ดี - ใช้ constants
const REGISTRY_KEYS = {
  USER: 'user',
  DATABASE: 'database',
  CACHE: 'cache'
} as const;

addRegistryItem(context, REGISTRY_KEYS.USER, user);

// ไม่ดี - ใช้ string literal
addRegistryItem(context, 'usr', user); // typo prone
```

### 3. 🧹 Resource Cleanup

```typescript
const resourceMiddleware: UnifiedMiddleware = async (context, next) => {
  const resources: Disposable[] = [];
  
  try {
    const db = await createDatabase();
    const cache = await createCache();
    
    resources.push(db, cache);
    
    addRegistryItem(context, 'database', db);
    addRegistryItem(context, 'cache', cache);
    
    await next();
  } finally {
    // ทำความสะอาดทรัพยากรทั้งหมด
    await Promise.all(resources.map(r => r.dispose()));
  }
};
```

### 4. ⚠️ Error Handling

```typescript
const safeGetRegistryItem = <T>(
  context: UnifiedHttpContext,
  key: string,
  defaultValue?: T
): T | null => {
  const item = getRegistryItem<T>(context, key);
  
  if (item instanceof Error) {
    console.warn(`Registry item '${key}' not found:`, item.message);
    return defaultValue ?? null;
  }
  
  return item;
};

// การใช้งาน
const user = safeGetRegistryItem<User>(context, REGISTRY_KEYS.USER);
if (!user) {
  return sendError(context, 'User not authenticated', 401);
}
```

### 5. 🔍 Debugging & Monitoring

```typescript
const debugMiddleware: UnifiedMiddleware = async (context, next) => {
  const startTime = Date.now();
  
  // เก็บ debug info
  addRegistryItem(context, 'debug:startTime', startTime);
  addRegistryItem(context, 'debug:endpoint', `${context.request.method} ${context.request.url}`);
  
  await next();
  
  const duration = Date.now() - startTime;
  console.log(`Request completed in ${duration}ms`);
  
  // Log registry contents ใน development
  if (process.env.NODE_ENV === 'development') {
    console.log('Registry contents:', Object.keys(context.registry));
  }
};
```

---

## 🚀 การใช้งานจริง - Complete Example

```typescript
import {
  UnifiedHttpContext,
  UnifiedMiddleware,
  composeMiddleware,
  addRegistryItem,
  getRegistryItem,
  sendResponse,
  sendError
} from '@inh-lib/unified-route';

// Registry Keys
const KEYS = {
  USER: 'user',
  DATABASE: 'database',
  CACHE: 'cache',
  REQUEST_ID: 'requestId',
  METADATA: 'metadata'
} as const;

// Types
interface User {
  id: string;
  email: string;
  roles: string[];
}

interface AppMetadata {
  requestId: string;
  startTime: number;
  userAgent: string;
}

// Middlewares
const metadataMiddleware: UnifiedMiddleware = async (context, next) => {
  const metadata: AppMetadata = {
    requestId: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    startTime: Date.now(),
    userAgent: context.request.userAgent || 'unknown'
  };
  
  addRegistryItem(context, KEYS.METADATA, metadata);
  addRegistryItem(context, KEYS.REQUEST_ID, metadata.requestId);
  
  console.log(`[${metadata.requestId}] Starting request`);
  
  await next();
  
  const duration = Date.now() - metadata.startTime;
  console.log(`[${metadata.requestId}] Completed in ${duration}ms`);
};

const databaseMiddleware: UnifiedMiddleware = async (context, next) => {
  const db = await createDatabaseConnection();
  addRegistryItem(context, KEYS.DATABASE, db);
  
  try {
    await next();
  } finally {
    await db.close();
  }
};

const authMiddleware: UnifiedMiddleware = async (context, next) => {
  const token = context.request.headers.authorization;
  
  if (!token) {
    return sendError(context, 'Authorization required', 401);
  }
  
  try {
    const user = await validateToken(token);
    addRegistryItem(context, KEYS.USER, user);
    await next();
  } catch (error) {
    return sendError(context, 'Invalid token', 401);
  }
};

const cacheMiddleware: UnifiedMiddleware = async (context, next) => {
  const cache = await createCacheConnection();
  addRegistryItem(context, KEYS.CACHE, cache);
  
  try {
    await next();
  } finally {
    await cache.disconnect();
  }
};

// Route Handler
const getUserProfileHandler = async (context: UnifiedHttpContext) => {
  // ดึงข้อมูลจาก registry
  const user = getRegistryItem<User>(context, KEYS.USER);
  const db = getRegistryItem<DatabaseConnection>(context, KEYS.DATABASE);
  const cache = getRegistryItem<CacheConnection>(context, KEYS.CACHE);
  const requestId = getRegistryItem<string>(context, KEYS.REQUEST_ID);
  
  // ตรวจสอบข้อมูลที่จำเป็น
  if (user instanceof Error) {
    return sendError(context, 'User not authenticated', 401);
  }
  
  if (db instanceof Error) {
    return sendError(context, 'Database unavailable', 500);
  }
  
  // ใช้ cache หากมี
  const cacheKey = `profile:${user.id}`;
  if (!(cache instanceof Error)) {
    const cachedProfile = await cache.get(cacheKey);
    if (cachedProfile) {
      console.log(`[${requestId}] Profile served from cache`);
      return sendResponse(context, cachedProfile);
    }
  }
  
  // ดึงข้อมูลจากฐานข้อมูล
  const profile = await db.query(
    'SELECT * FROM user_profiles WHERE user_id = ?',
    [user.id]
  );
  
  // เก็บใน cache หากใช้ได้
  if (!(cache instanceof Error)) {
    await cache.set(cacheKey, profile, 300); // 5 minutes
  }
  
  console.log(`[${requestId}] Profile served from database`);
  sendResponse(context, profile);
};

// Compose everything
const middlewares = [
  metadataMiddleware,
  databaseMiddleware,
  authMiddleware,
  cacheMiddleware
];

const handler = composeMiddleware(middlewares)(getUserProfileHandler);

// ใช้กับ HTTP framework ของคุณ
export { handler };
```

---

## 🔄 การใช้ Basic Registry + Advanced Registry ร่วมกัน

ในแอปพลิเคชันจริง คุณอาจต้องใช้ทั้ง Basic Registry (สำหรับข้อมูลพื้นฐาน) และ Advanced Registry (สำหรับ Dependency Injection) ร่วมกัน

### 🎯 กรณีใช้งานทั่วไป

- **Basic Registry**: เก็บข้อมูล request-specific เช่น user, metadata, request id
- **Advanced Registry**: เก็บ services, repositories, business logic components
- **Mixed Usage**: ใช้ข้อมูลจาก Basic Registry ใน Advanced Registry services

---

## 🏗️ Architecture Pattern - Hybrid Registry

```typescript
import { 
  UnifiedRegistryService, 
  UnifiedRegistryScope,
  UnifiedHttpContext,
  UnifiedMiddleware,
  addRegistryItem,
  getRegistryItem
} from '@inh-lib/unified-route';

// === Types & Interfaces ===
interface User {
  id: string;
  email: string;
  roles: string[];
  tenantId?: string;
}

interface RequestMetadata {
  requestId: string;
  correlationId: string;
  startTime: number;
  userAgent: string;
  ip: string;
}

interface DatabaseConnection {
  query: (sql: string, params?: unknown[]) => Promise<unknown[]>;
  close: () => Promise<void>;
}

// Business Services (จะถูกจัดการโดย Advanced Registry)
interface IUserService {
  getUser(id: string): Promise<User | null>;
  updateUser(id: string, data: Partial<User>): Promise<User>;
  getUsersByTenant(tenantId: string): Promise<User[]>;
}

interface INotificationService {
  sendEmail(to: string, subject: string, body: string): Promise<void>;
  sendSms(to: string, message: string): Promise<void>;
}

interface IAuditService {
  logUserAction(action: string, userId: string, metadata?: unknown): Promise<void>;
}

// === Registry Keys ===
const BASIC_KEYS = {
  // Basic Registry Keys - เก็บใน context.registry
  USER: 'user',
  METADATA: 'metadata',
  REQUEST_ID: 'requestId',
  CORRELATION_ID: 'correlationId',
  DATABASE: 'database',
  TENANT_ID: 'tenantId',
  
  // Advanced Registry Reference - เก็บ scope ใน context.registry
  SERVICE_SCOPE: 'serviceScope',
  SERVICE_REGISTRY: 'serviceRegistry'
} as const;

// === Global Advanced Registry Setup ===
const globalRegistry = UnifiedRegistryService.create();

// ลงทะเบียน Services (Singleton - ใช้ตลอด app)
globalRegistry.register('configService', () => ({
  dbConnectionString: process.env.DB_CONNECTION_STRING,
  smtpSettings: {
    host: process.env.SMTP_HOST,
    port: 587,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  },
  appSettings: {
    maxUsersPerTenant: 1000,
    sessionTimeout: 3600
  }
}), { lifetime: 'singleton' });

// User Service - ใช้ context data จาก Basic Registry
globalRegistry.register('userService', () => {
  return {
    async getUser(id: string): Promise<User | null> {
      const db = globalRegistry.resolve('databaseService');
      return await db.getUserById(id);
    },
    
    async updateUser(id: string, data: Partial<User>): Promise<User> {
      const db = globalRegistry.resolve('databaseService');
      const audit = globalRegistry.resolve('auditService');
      
      const updatedUser = await db.updateUser(id, data);
      await audit.logUserAction('user:update', id, data);
      
      return updatedUser;
    },
    
    async getUsersByTenant(tenantId: string): Promise<User[]> {
      const db = globalRegistry.resolve('databaseService');
      return await db.getUsersByTenant(tenantId);
    }
  } as IUserService;
}, { lifetime: 'singleton' });

// Database Service
globalRegistry.register('databaseService', () => {
  const config = globalRegistry.resolve('configService');
  
  return {
    async getUserById(id: string) {
      // Database logic here
      console.log(`Fetching user ${id} from database`);
      return { id, email: `user${id}@example.com`, roles: ['user'] };
    },
    
    async updateUser(id: string, data: Partial<User>) {
      console.log(`Updating user ${id}:`, data);
      return { id, email: `user${id}@example.com`, roles: ['user'], ...data };
    },
    
    async getUsersByTenant(tenantId: string) {
      console.log(`Fetching users for tenant ${tenantId}`);
      return [{ id: '1', email: 'user1@example.com', roles: ['user'], tenantId }];
    }
  };
}, { lifetime: 'singleton' });

// Context-Aware Services (Scoped - ต้องการข้อมูลจาก context)
globalRegistry.register('contextAwareUserService', (scope) => {
  // ดึง services อื่นๆ
  const baseUserService = scope.resolve<IUserService>('userService');
  const auditService = scope.resolve<IAuditService>('auditService');
  
  return {
    // Service ที่รู้จัก context ปัจจุบัน
    async getCurrentUserProfile(context: UnifiedHttpContext) {
      // ใช้ Basic Registry เพื่อดึงข้อมูล user
      const currentUser = getRegistryItem<User>(context, BASIC_KEYS.USER);
      const metadata = getRegistryItem<RequestMetadata>(context, BASIC_KEYS.METADATA);
      
      if (currentUser instanceof Error) {
        throw new Error('User not authenticated');
      }
      
      // ใช้ Advanced Registry service
      const fullProfile = await baseUserService.getUser(currentUser.id);
      
      // Log action with context
      if (!(metadata instanceof Error)) {
        await auditService.logUserAction('profile:view', currentUser.id, {
          requestId: metadata.requestId,
          ip: metadata.ip
        });
      }
      
      return fullProfile;
    },
    
    async updateCurrentUserProfile(context: UnifiedHttpContext, data: Partial<User>) {
      const currentUser = getRegistryItem<User>(context, BASIC_KEYS.USER);
      const metadata = getRegistryItem<RequestMetadata>(context, BASIC_KEYS.METADATA);
      
      if (currentUser instanceof Error) {
        throw new Error('User not authenticated');
      }
      
      const updatedUser = await baseUserService.updateUser(currentUser.id, data);
      
      // Update Basic Registry with new data
      addRegistryItem(context, BASIC_KEYS.USER, updatedUser);
      
      return updatedUser;
    }
  };
}, { lifetime: 'scoped' });

// Notification Service - ใช้ context สำหรับ personalization
globalRegistry.register('notificationService', (scope) => {
  const config = scope.resolve('configService');
  
  return {
    async sendContextualEmail(context: UnifiedHttpContext, subject: string, body: string) {
      const user = getRegistryItem<User>(context, BASIC_KEYS.USER);
      const metadata = getRegistryItem<RequestMetadata>(context, BASIC_KEYS.METADATA);
      
      if (user instanceof Error) {
        throw new Error('User context required for email');
      }
      
      // Personalized email with context
      const personalizedSubject = `[${metadata instanceof Error ? 'System' : metadata.requestId}] ${subject}`;
      const personalizedBody = `Dear ${user.email},\n\n${body}\n\nBest regards,\nYour App`;
      
      console.log(`Sending email to ${user.email}: ${personalizedSubject}`);
      // Actual email sending logic here
    },
    
    async sendEmail(to: string, subject: string, body: string) {
      console.log(`Sending email to ${to}: ${subject}`);
      // Basic email sending
    }
  } as INotificationService;
}, { lifetime: 'scoped' });

// Audit Service
globalRegistry.register('auditService', () => {
  return {
    async logUserAction(action: string, userId: string, metadata?: unknown) {
      console.log(`AUDIT: User ${userId} performed ${action}`, metadata);
      // Store in audit log
    }
  } as IAuditService;
}, { lifetime: 'singleton' });

// === Middlewares ===

// 1. Metadata Middleware (Basic Registry)
const metadataMiddleware: UnifiedMiddleware = async (context, next) => {
  const metadata: RequestMetadata = {
    requestId: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    correlationId: context.request.headers['x-correlation-id'] || `corr_${Date.now()}`,
    startTime: Date.now(),
    userAgent: context.request.userAgent || 'unknown',
    ip: context.request.ip || 'unknown'
  };
  
  // เก็บใน Basic Registry
  addRegistryItem(context, BASIC_KEYS.METADATA, metadata);
  addRegistryItem(context, BASIC_KEYS.REQUEST_ID, metadata.requestId);
  addRegistryItem(context, BASIC_KEYS.CORRELATION_ID, metadata.correlationId);
  
  console.log(`[${metadata.requestId}] → ${context.request.method} ${context.request.url}`);
  
  await next();
  
  const duration = Date.now() - metadata.startTime;
  console.log(`[${metadata.requestId}] ← ${context.request.method} ${context.request.url} (${duration}ms)`);
};

// 2. Database Middleware (Basic Registry)
const databaseMiddleware: UnifiedMiddleware = async (context, next) => {
  const db: DatabaseConnection = {
    query: async (sql: string, params?: unknown[]) => {
      console.log('Executing SQL:', sql, params);
      return []; // Mock result
    },
    close: async () => {
      console.log('Database connection closed');
    }
  };
  
  // เก็บใน Basic Registry
  addRegistryItem(context, BASIC_KEYS.DATABASE, db);
  
  try {
    await next();
  } finally {
    await db.close();
  }
};

// 3. Authentication Middleware (Basic Registry)
const authMiddleware: UnifiedMiddleware = async (context, next) => {
  const token = context.request.headers.authorization;
  
  if (!token) {
    return sendError(context, 'Authorization required', 401);
  }
  
  // Mock user validation
  const user: User = {
    id: 'user123',
    email: 'john@example.com',
    roles: ['user', 'admin'],
    tenantId: 'tenant456'
  };
  
  // เก็บใน Basic Registry
  addRegistryItem(context, BASIC_KEYS.USER, user);
  addRegistryItem(context, BASIC_KEYS.TENANT_ID, user.tenantId);
  
  await next();
};

// 4. Service Scope Middleware (Advanced Registry)
const serviceScopeMiddleware: UnifiedMiddleware = async (context, next) => {
  // สร้าง scope สำหรับ request นี้
  const scope = globalRegistry.createScope();
  
  // เก็บ scope ใน Basic Registry เพื่อให้ handlers ใช้ได้
  addRegistryItem(context, BASIC_KEYS.SERVICE_SCOPE, scope);
  addRegistryItem(context, BASIC_KEYS.SERVICE_REGISTRY, globalRegistry);
  
  try {
    await next();
  } finally {
    // Cleanup scoped services
    scope.dispose();
    
    const metadata = getRegistryItem<RequestMetadata>(context, BASIC_KEYS.METADATA);
    if (!(metadata instanceof Error)) {
      console.log(`[${metadata.requestId}] Service scope disposed`);
    }
  }
};

// === Route Handlers ===

// Handler ที่ใช้ทั้ง Basic และ Advanced Registry
const getUserProfileHandler = async (context: UnifiedHttpContext) => {
  // ดึง Advanced Registry Scope
  const scope = getRegistryItem<UnifiedRegistryScope>(context, BASIC_KEYS.SERVICE_SCOPE);
  
  if (scope instanceof Error) {
    return sendError(context, 'Service scope not available', 500);
  }
  
  try {
    // ใช้ Context-Aware Service ที่รู้จัก Basic Registry
    const contextUserService = scope.resolve('contextAwareUserService');
    
    // Service จะใช้ข้อมูลจาก Basic Registry เอง
    const profile = await contextUserService.getCurrentUserProfile(context);
    
    // ดึงข้อมูลเพิ่มเติมจาก Basic Registry
    const metadata = getRegistryItem<RequestMetadata>(context, BASIC_KEYS.METADATA);
    
    sendResponse(context, {
      profile,
      requestId: metadata instanceof Error ? 'unknown' : metadata.requestId,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error in getUserProfileHandler:', error);
    return sendError(context, 'Failed to get user profile', 500);
  }
};

const updateUserProfileHandler = async (context: UnifiedHttpContext) => {
  const scope = getRegistryItem<UnifiedRegistryScope>(context, BASIC_KEYS.SERVICE_SCOPE);
  
  if (scope instanceof Error) {
    return sendError(context, 'Service scope not available', 500);
  }
  
  try {
    const updateData = getRequestBody<Partial<User>>(context);
    
    // ใช้ Context-Aware Service
    const contextUserService = scope.resolve('contextAwareUserService');
    const notificationService = scope.resolve<INotificationService>('notificationService');
    
    // Update profile (จะอัพเดต Basic Registry ด้วย)
    const updatedUser = await contextUserService.updateCurrentUserProfile(context, updateData);
    
    // Send notification using context
    await notificationService.sendContextualEmail(
      context,
      'Profile Updated',
      'Your profile has been successfully updated.'
    );
    
    sendResponse(context, {
      user: updatedUser,
      message: 'Profile updated successfully'
    });
    
  } catch (error) {
    console.error('Error in updateUserProfileHandler:', error);
    return sendError(context, 'Failed to update user profile', 500);
  }
};

// Handler ที่แสดงการใช้ข้อมูลจากทั้งสอง Registry
const getDashboardHandler = async (context: UnifiedHttpContext) => {
  // Basic Registry data
  const user = getRegistryItem<User>(context, BASIC_KEYS.USER);
  const metadata = getRegistryItem<RequestMetadata>(context, BASIC_KEYS.METADATA);
  const tenantId = getRegistryItem<string>(context, BASIC_KEYS.TENANT_ID);
  
  // Advanced Registry services
  const scope = getRegistryItem<UnifiedRegistryScope>(context, BASIC_KEYS.SERVICE_SCOPE);
  
  if (user instanceof Error || scope instanceof Error) {
    return sendError(context, 'Required data not available', 500);
  }
  
  try {
    const userService = scope.resolve<IUserService>('userService');
    const auditService = scope.resolve<IAuditService>('auditService');
    
    // ใช้ข้อมูลจาก Basic Registry ใน Advanced Registry service
    const tenantUsers = tenantId instanceof Error ? [] : await userService.getUsersByTenant(tenantId);
    
    // Log dashboard access
    await auditService.logUserAction('dashboard:view', user.id, {
      requestId: metadata instanceof Error ? 'unknown' : metadata.requestId,
      tenantId: tenantId instanceof Error ? 'unknown' : tenantId
    });
    
    sendResponse(context, {
      currentUser: user,
      tenantUsers,
      stats: {
        totalUsers: tenantUsers.length,
        requestId: metadata instanceof Error ? 'unknown' : metadata.requestId,
        serverTime: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Error in getDashboardHandler:', error);
    return sendError(context, 'Failed to load dashboard', 500);
  }
};

// === Utility Functions ===

// Helper function เพื่อใช้ Advanced Registry services ใน Business Logic Layer
const withServices = async <T>(
  context: UnifiedHttpContext,
  callback: (services: {
    userService: IUserService;
    notificationService: INotificationService;
    auditService: IAuditService;
  }) => Promise<T>
): Promise<T> => {
  const scope = getRegistryItem<UnifiedRegistryScope>(context, BASIC_KEYS.SERVICE_SCOPE);
  
  if (scope instanceof Error) {
    throw new Error('Service scope not available');
  }
  
  const services = {
    userService: scope.resolve<IUserService>('userService'),
    notificationService: scope.resolve<INotificationService>('notificationService'),
    auditService: scope.resolve<IAuditService>('auditService')
  };
  
  return await callback(services);
};

// Business Logic Layer ที่ใช้ทั้งสอง Registry
const businessLogicExample = async (context: UnifiedHttpContext, userId: string) => {
  // ใช้ Basic Registry
  const currentUser = getRegistryItem<User>(context, BASIC_KEYS.USER);
  const metadata = getRegistryItem<RequestMetadata>(context, BASIC_KEYS.METADATA);
  
  if (currentUser instanceof Error) {
    throw new Error('User authentication required');
  }
  
  // ใช้ Advanced Registry ผ่าน helper
  return await withServices(context, async ({ userService, auditService, notificationService }) => {
    // Business logic ที่ผสมผสานข้อมูลจากทั้งสอง Registry
    const targetUser = await userService.getUser(userId);
    
    if (!targetUser) {
      throw new Error('User not found');
    }
    
    // Log action with context from Basic Registry
    await auditService.logUserAction('user:view', currentUser.id, {
      targetUserId: userId,
      requestId: metadata instanceof Error ? 'unknown' : metadata.requestId
    });
    
    return {
      targetUser,
      accessedBy: currentUser,
      accessTime: new Date().toISOString()
    };
  });
};

// === Complete Example Usage ===

const middlewares = [
  metadataMiddleware,      // Basic Registry - metadata
  databaseMiddleware,     // Basic Registry - database
  authMiddleware,         // Basic Registry - user
  serviceScopeMiddleware  // Advanced Registry - main services
];

const composedHandler = composeMiddleware(middlewares);

// Export handlers
export const getUserProfile = composedHandler(getUserProfileHandler);
export const updateUserProfile = composedHandler(updateUserProfileHandler);
export const getDashboard = composedHandler(getDashboardHandler);

// Export business logic
export { businessLogicExample, withServices };
```

---

## 🎭 Real-World Scenario - E-commerce Application

นี่คือตัวอย่างที่สมบูรณ์ของการใช้งานใน E-commerce Application:

```typescript
// === E-commerce Types ===
interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
}

interface ShoppingCart {
  userId: string;
  items: CartItem[];
  total: number;
}

interface CartItem {
  productId: string;
  quantity: number;
  price: number;
}

interface Order {
  id: string;
  userId: string;
  items: CartItem[];
  total: number;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered';
}

// === E-commerce Registry Keys ===
const ECOMMERCE_KEYS = {
  // Basic Registry
  SHOPPING_CART: 'shoppingCart',
  SELECTED_PRODUCTS: 'selectedProducts',
  PAYMENT_INFO: 'paymentInfo',
  
  // Advanced Registry
  ECOMMERCE_SCOPE: 'ecommerceScope'
} as const;

// === E-commerce Services Setup ===
const ecommerceRegistry = UnifiedRegistryService.create();

// Product Service
ecommerceRegistry.register('productService', () => ({
  async getProduct(id: string): Promise<Product | null> {
    console.log(`Fetching product ${id}`);
    return {
      id,
      name: `Product ${id}`,
      price: Math.floor(Math.random() * 1000) + 100,
      category: 'electronics'
    };
  },
  
  async searchProducts(query: string): Promise<Product[]> {
    console.log(`Searching products: ${query}`);
    return [
      { id: '1', name: 'Laptop', price: 999, category: 'electronics' },
      { id: '2', name: 'Phone', price: 599, category: 'electronics' }
    ];
  }
}), { lifetime: 'singleton' });

// Cart Service - ใช้ context data
ecommerceRegistry.register('cartService', (scope) => ({
  async addToCart(context: UnifiedHttpContext, productId: string, quantity: number) {
    // ดึงข้อมูลจาก Basic Registry
    const user = getRegistryItem<User>(context, BASIC_KEYS.USER);
    let cart = getRegistryItem<ShoppingCart>(context, ECOMMERCE_KEYS.SHOPPING_CART);
    
    if (user instanceof Error) {
      throw new Error('User must be authenticated');
    }
    
    // ดึง product จาก Advanced Registry
    const productService = scope.resolve('productService');
    const product = await productService.getProduct(productId);
    
    if (!product) {
      throw new Error('Product not found');
    }
    
    // สร้าง cart ใหม่หากไม่มี
    if (cart instanceof Error) {
      cart = { userId: user.id, items: [], total: 0 };
    }
    
    // เพิ่มสินค้าใน cart
    const existingItem = cart.items.find(item => item.productId === productId);
    
    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      cart.items.push({
        productId,
        quantity,
        price: product.price
      });
    }
    
    // คำนวณยอดรวม
    cart.total = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    // อัพเดต Basic Registry
    addRegistryItem(context, ECOMMERCE_KEYS.SHOPPING_CART, cart);
    
    return cart;
  },
  
  async getCartSummary(context: UnifiedHttpContext) {
    const cart = getRegistryItem<ShoppingCart>(context, ECOMMERCE_KEYS.SHOPPING_CART);
    
    if (cart instanceof Error) {
      return { items: [], total: 0, itemCount: 0 };
    }
    
    return {
      items: cart.items,
      total: cart.total,
      itemCount: cart.items.reduce((sum, item) => sum + item.quantity, 0)
    };
  }
}), { lifetime: 'scoped' });

// Order Service
ecommerceRegistry.register('orderService', (scope) => ({
  async createOrder(context: UnifiedHttpContext): Promise<Order> {
    const user = getRegistryItem<User>(context, BASIC_KEYS.USER);
    const cart = getRegistryItem<ShoppingCart>(context, ECOMMERCE_KEYS.SHOPPING_CART);
    
    if (user instanceof Error || cart instanceof Error) {
      throw new Error('User and cart required');
    }
    
    const order: Order = {
      id: `order_${Date.now()}`,
      userId: user.id,
      items: [...cart.items],
      total: cart.total,
      status: 'pending'
    };
    
    // Clear cart after order
    addRegistryItem(context, ECOMMERCE_KEYS.SHOPPING_CART, { 
      userId: user.id, 
      items: [], 
      total: 0 
    });
    
    // Log order creation
    const auditService = scope.resolve('auditService');
    await auditService.logUserAction('order:create', user.id, {
      orderId: order.id,
      total: order.total
    });
    
    return order;
  }
}), { lifetime: 'scoped' });

// === E-commerce Middlewares ===

const ecommerceScopeMiddleware: UnifiedMiddleware = async (context, next) => {
  const scope = ecommerceRegistry.createScope();
  addRegistryItem(context, ECOMMERCE_KEYS.ECOMMERCE_SCOPE, scope);
  
  try {
    await next();
  } finally {
    scope.dispose();
  }
};

// === E-commerce Handlers ===

const addToCartHandler = async (context: UnifiedHttpContext) => {
  const scope = getRegistryItem<UnifiedRegistryScope>(context, ECOMMERCE_KEYS.ECOMMERCE_SCOPE);
  
  if (scope instanceof Error) {
    return sendError(context, 'Service not available', 500);
  }
  
  try {
    const { productId, quantity } = getRequestBody<{ productId: string; quantity: number }>(context);
    
    const cartService = scope.resolve('cartService');
    const updatedCart = await cartService.addToCart(context, productId, quantity);
    
    sendResponse(context, {
      success: true,
      cart: updatedCart,
      message: 'Product added to cart'
    });
    
  } catch (error) {
    return sendError(context, error.message, 400);
  }
};

const getCartHandler = async (context: UnifiedHttpContext) => {
  const scope = getRegistryItem<UnifiedRegistryScope>(context, ECOMMERCE_KEYS.ECOMMERCE_SCOPE);
  
  if (scope instanceof Error) {
    return sendError(context, 'Service not available', 500);
  }
  
  const cartService = scope.resolve('cartService');
  const cartSummary = await cartService.getCartSummary(context);
  
  sendResponse(context, cartSummary);
};

const checkoutHandler = async (context: UnifiedHttpContext) => {
  const scope = getRegistryItem<UnifiedRegistryScope>(context, ECOMMERCE_KEYS.ECOMMERCE_SCOPE);
  
  if (scope instanceof Error) {
    return sendError(context, 'Service not available', 500);
  }
  
  try {
    const orderService = scope.resolve('orderService');
    const notificationService = scope.resolve<INotificationService>('notificationService');
    
    const order = await orderService.createOrder(context);
    
    // Send confirmation email using context
    await notificationService.sendContextualEmail(
      context,
      'Order Confirmation',
      `Your order ${order.id} has been confirmed. Total: $${order.total}`
    );
    
    sendResponse(context, {
      success: true,
      order,
      message: 'Order created successfully'
    });
    
  } catch (error) {
    return sendError(context, error.message, 400);
  }
};

// === Complete E-commerce Setup ===

const ecommerceMiddlewares = [
  metadataMiddleware,       // Basic: request metadata
  authMiddleware,          // Basic: user authentication  
  serviceScopeMiddleware,  // Advanced: main services
  ecommerceScopeMiddleware // Advanced: ecommerce services
];

const ecommerceHandler = composeMiddleware(ecommerceMiddlewares);

export const addToCart = ecommerceHandler(addToCartHandler);
export const getCart = ecommerceHandler(getCartHandler);
export const checkout = ecommerceHandler(checkoutHandler);
```

---

## 🔧 Best Practices สำหรับการใช้ Hybrid Registry

### 1. **ชัดเจนเรื่อง Responsibility**

```typescript
// ✅ ดี - แยกหน้าที่ชัดเจน
const RESPONSIBILITIES = {
  // Basic Registry - Request-specific data
  BASIC: [
    'user authentication data',
    'request metadata', 
    'database connections',
    'temporary request state'
  ],
  
  // Advanced Registry - Business services  
  ADVANCED: [
    'business logic services',
    'repositories',
    'external integrations',
    'complex dependency graphs'
  ]
};
```

### 2. **Service ที่รู้จัก Context**

```typescript
// ✅ ดี - Service ที่รับ context เป็น parameter
interface IContextAwareService {
  processWithContext(context: UnifiedHttpContext, data: unknown): Promise<unknown>;
}

globalRegistry.register('contextAwareService', (scope) => ({
  async processWithContext(context: UnifiedHttpContext, data: unknown) {
    // ใช้ข้อมูลจาก Basic Registry
    const user = getRegistryItem<User>(context, BASIC_KEYS.USER);
    const metadata = getRegistryItem<RequestMetadata>(context, BASIC_KEYS.METADATA);
    
    // ใช้ services จาก Advanced Registry
    const businessService = scope.resolve('businessService');
    
    return await businessService.process(data, {
      userId: user instanceof Error ? 'anonymous' : user.id,
      requestId: metadata instanceof Error ? 'unknown' : metadata.requestId
    });
  }
}), { lifetime: 'scoped' });
```

### 3. **Helper Functions**

```typescript
// Helper เพื่อลดการ duplicate code
const withContextAndServices = async <T>(
  context: UnifiedHttpContext,
  callback: (ctx: {
    user: User;
    metadata: RequestMetadata;
    services: UnifiedRegistryScope;
  }) => Promise<T>
): Promise<T> => {
  const user = getRegistryItem<User>(context, BASIC_KEYS.USER);
  const metadata = getRegistryItem<RequestMetadata>(context, BASIC_KEYS.METADATA);
  const services = getRegistryItem<UnifiedRegistryScope>(context, BASIC_KEYS.SERVICE_SCOPE);
  
  if (user instanceof Error) throw new Error('User not authenticated');
  if (metadata instanceof Error) throw new Error('Request metadata missing');
  if (services instanceof Error) throw new Error('Services not available');
  
  return await callback({ user, metadata, services });
};

// การใช้งาน
const someHandler = async (context: UnifiedHttpContext) => {
  try {
    const result = await withContextAndServices(context, async ({ user, metadata, services }) => {
      const userService = services.resolve<IUserService>('userService');
      // Business logic here
      return await userService.getUser(user.id);
    });
    
    sendResponse(context, result);
  } catch (error) {
    return sendError(context, error.message, 500);
  }
};
```

---

## 🚀 Complete Setup Guide - Fastify + Fastify CLI

นี่คือคู่มือการตั้งค่าที่สมบูรณ์สำหรับ Fastify พร้อม UnifiedRoute ทั้งระบบ โดยเน้นที่การดูแลรักษาในระยะยาว

### 📁 Project Structure

```
my-fastify-app/
├── src/
│   ├── app.ts                    # Main Fastify application
│   ├── server.ts                 # Server entry point
│   ├── config/
│   │   ├── index.ts             # Configuration management
│   │   └── registry.ts          # Registry services setup
│   ├── middleware/
│   │   ├── index.ts             # Middleware exports
│   │   ├── auth.middleware.ts   # Authentication
│   │   ├── cors.middleware.ts   # CORS handling
│   │   ├── logging.middleware.ts # Request logging
│   │   └── registry.middleware.ts # Registry setup
│   ├── routes/
│   │   ├── index.ts             # Route registration
│   │   ├── auth/
│   │   │   ├── index.ts         # Auth routes
│   │   │   └── auth.controller.ts
│   │   ├── users/
│   │   │   ├── index.ts         # User routes
│   │   │   └── users.controller.ts
│   │   └── health/
│   │       ├── index.ts         # Health check routes
│   │       └── health.controller.ts
│   ├── services/
│   │   ├── index.ts             # Service exports
│   │   ├── user.service.ts      # User business logic
│   │   ├── auth.service.ts      # Authentication service
│   │   └── notification.service.ts
│   ├── types/
│   │   ├── index.ts             # Type exports
│   │   ├── api.types.ts         # API request/response types
│   │   └── registry.types.ts    # Registry-related types
│   └── utils/
│       ├── index.ts             # Utility exports
│       ├── adapters.ts          # Fastify <-> UnifiedRoute adapters
│       └── helpers.ts           # Common helper functions
├── package.json
├── tsconfig.json
└── README.md
```

---

### 📦 Dependencies Setup

```json
// package.json
{
  "name": "my-fastify-app",
  "version": "1.0.0",
  "scripts": {
    "dev": "fastify start -l info app.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "test": "jest"
  },
  "dependencies": {
    "@fastify/cors": "^8.0.0",
    "@fastify/helmet": "^10.0.0",
    "@fastify/rate-limit": "^7.0.0",
    "@fastify/swagger": "^8.0.0",
    "@fastify/swagger-ui": "^1.0.0",
    "@inh-lib/unified-route": "^1.0.0",
    "fastify": "^4.0.0",
    "fastify-cli": "^5.0.0",
    "fastify-plugin": "^4.0.0"
  },
  "devDependencies": {
    "@types/node": "^18.0.0",
    "typescript": "^5.0.0",
    "tsx": "^3.0.0"
  }
}
```

---

### 🔧 Configuration Management

```typescript
// src/config/index.ts
export interface AppConfig {
  server: {
    port: number;
    host: string;
    environment: 'development' | 'production' | 'test';
  };
  database: {
    connectionString: string;
    poolSize: number;
    timeout: number;
  };
  auth: {
    jwtSecret: string;
    jwtExpiry: string;
    bcryptRounds: number;
  };
  external: {
    smtpHost: string;
    smtpPort: number;
    smtpUser: string;
    smtpPass: string;
  };
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    prettyPrint: boolean;
  };
}

export const config: AppConfig = {
  server: {
    port: parseInt(process.env.PORT || '3000', 10),
    host: process.env.HOST || '0.0.0.0',
    environment: (process.env.NODE_ENV as any) || 'development'
  },
  database: {
    connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/myapp',
    poolSize: parseInt(process.env.DB_POOL_SIZE || '10', 10),
    timeout: parseInt(process.env.DB_TIMEOUT || '30000', 10)
  },
  auth: {
    jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
    jwtExpiry: process.env.JWT_EXPIRY || '1h',
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12', 10)
  },
  external: {
    smtpHost: process.env.SMTP_HOST || 'localhost',
    smtpPort: parseInt(process.env.SMTP_PORT || '587', 10),
    smtpUser: process.env.SMTP_USER || '',
    smtpPass: process.env.SMTP_PASS || ''
  },
  logging: {
    level: (process.env.LOG_LEVEL as any) || 'info',
    prettyPrint: process.env.NODE_ENV === 'development'
  }
};

export default config;
```

---

### 🏗️ Registry Services Setup

```typescript
// src/config/registry.ts
import { UnifiedRegistryService } from '@inh-lib/unified-route';
import { config } from './index.js';
import { 
  IUserService, 
  IAuthService, 
  INotificationService,
  IDatabaseService,
  ICacheService 
} from '../types/registry.types.js';

// สร้าง Global Registry
export const globalRegistry = UnifiedRegistryService.create();

// === Singleton Services ===

// Configuration Service
globalRegistry.register('configService', () => config, { 
  lifetime: 'singleton' 
});

// Database Service
globalRegistry.register('databaseService', () => {
  return {
    async connect() {
      console.log('Database connected');
      // Real database connection logic
    },
    
    async query<T>(sql: string, params?: unknown[]): Promise<T[]> {
      console.log('Executing query:', sql, params);
      // Real query execution
      return [] as T[];
    },
    
    async close() {
      console.log('Database connection closed');
    }
  } as IDatabaseService;
}, { lifetime: 'singleton' });

// Cache Service (Redis)
globalRegistry.register('cacheService', () => {
  return {
    async get<T>(key: string): Promise<T | null> {
      console.log('Cache GET:', key);
      // Real Redis get
      return null;
    },
    
    async set<T>(key: string, value: T, ttl?: number): Promise<void> {
      console.log('Cache SET:', key, 'TTL:', ttl);
      // Real Redis set
    },
    
    async del(key: string): Promise<void> {
      console.log('Cache DEL:', key);
      // Real Redis delete
    },
    
    async exists(key: string): Promise<boolean> {
      console.log('Cache EXISTS:', key);
      return false;
    }
  } as ICacheService;
}, { lifetime: 'singleton' });

// === Business Services ===

// User Service
globalRegistry.register('userService', () => {
  const db = globalRegistry.resolve<IDatabaseService>('databaseService');
  const cache = globalRegistry.resolve<ICacheService>('cacheService');
  
  return {
    async getUser(id: string) {
      // Try cache first
      const cached = await cache.get(`user:${id}`);
      if (cached) return cached;
      
      // Fetch from database
      const users = await db.query('SELECT * FROM users WHERE id = ?', [id]);
      const user = users[0];
      
      if (user) {
        await cache.set(`user:${id}`, user, 300); // 5 minutes
      }
      
      return user;
    },
    
    async createUser(userData: any) {
      const result = await db.query(
        'INSERT INTO users (email, name) VALUES (?, ?) RETURNING *',
        [userData.email, userData.name]
      );
      
      const user = result[0];
      
      // Update cache
      await cache.set(`user:${user.id}`, user, 300);
      
      return user;
    },
    
    async updateUser(id: string, userData: any) {
      const result = await db.query(
        'UPDATE users SET name = ?, updated_at = NOW() WHERE id = ? RETURNING *',
        [userData.name, id]
      );
      
      const user = result[0];
      
      // Update cache
      await cache.set(`user:${id}`, user, 300);
      
      return user;
    },
    
    async deleteUser(id: string) {
      await db.query('DELETE FROM users WHERE id = ?', [id]);
      await cache.del(`user:${id}`);
    }
  } as IUserService;
}, { lifetime: 'singleton' });

// Auth Service
globalRegistry.register('authService', () => {
  const config = globalRegistry.resolve('configService');
  const userService = globalRegistry.resolve<IUserService>('userService');
  
  return {
    async validateToken(token: string) {
      console.log('Validating token:', token);
      // JWT validation logic
      return { id: 'user123', email: 'john@example.com', roles: ['user'] };
    },
    
    async login(email: string, password: string) {
      console.log('Login attempt:', email);
      // Password validation + JWT generation
      return {
        user: { id: 'user123', email, roles: ['user'] },
        token: 'jwt-token-here',
        expiresAt: new Date(Date.now() + 3600000) // 1 hour
      };
    },
    
    async register(userData: any) {
      const user = await userService.createUser(userData);
      return {
        user,
        token: 'jwt-token-here',
        expiresAt: new Date(Date.now() + 3600000)
      };
    }
  } as IAuthService;
}, { lifetime: 'singleton' });

// === Scoped Services (Request-specific) ===

// Notification Service (context-aware)
globalRegistry.register('notificationService', (scope) => {
  const config = scope.resolve('configService');
  
  return {
    async sendEmail(to: string, subject: string, body: string, context?: any) {
      const contextInfo = context ? `[${context.requestId}]` : '[System]';
      console.log(`${contextInfo} Sending email to ${to}: ${subject}`);
      
      // Real email sending logic using config.external.smtp*
      return { success: true, messageId: `msg_${Date.now()}` };
    },
    
    async sendSms(to: string, message: string, context?: any) {
      const contextInfo = context ? `[${context.requestId}]` : '[System]';
      console.log(`${contextInfo} Sending SMS to ${to}: ${message}`);
      
      return { success: true, messageId: `sms_${Date.now()}` };
    }
  } as INotificationService;
}, { lifetime: 'scoped' });

// Request Logger Service
globalRegistry.register('requestLoggerService', (scope) => {
  return {
    info(message: string, meta?: any) {
      console.log(`[REQUEST] INFO: ${message}`, meta);
    },
    
    error(message: string, error?: Error, meta?: any) {
      console.error(`[REQUEST] ERROR: ${message}`, { error: error?.stack, ...meta });
    },
    
    warn(message: string, meta?: any) {
      console.warn(`[REQUEST] WARN: ${message}`, meta);
    }
  };
}, { lifetime: 'scoped' });

// Audit Service
globalRegistry.register('auditService', () => {
  const db = globalRegistry.resolve<IDatabaseService>('databaseService');
  
  return {
    async logUserAction(action: string, userId: string, metadata?: any) {
      await db.query(
        'INSERT INTO audit_logs (action, user_id, metadata, created_at) VALUES (?, ?, ?, NOW())',
        [action, userId, JSON.stringify(metadata)]
      );
      
      console.log(`AUDIT: User ${userId} performed ${action}`, metadata);
    }
  } as IAuditService;
}, { lifetime: 'singleton' });

export default globalRegistry;
```

---

### 🔗 Types Definition

```typescript
// src/types/registry.types.ts
export interface IUserService {
  getUser(id: string): Promise<any>;
  createUser(userData: any): Promise<any>;
  updateUser(id: string, userData: any): Promise<any>;
  deleteUser(id: string): Promise<void>;
}

export interface IAuthService {
  validateToken(token: string): Promise<any>;
  login(email: string, password: string): Promise<any>;
  register(userData: any): Promise<any>;
}

export interface INotificationService {
  sendEmail(to: string, subject: string, body: string, context?: any): Promise<any>;
  sendSms(to: string, message: string, context?: any): Promise<any>;
}

export interface IDatabaseService {
  connect(): Promise<void>;
  query<T>(sql: string, params?: unknown[]): Promise<T[]>;
  close(): Promise<void>;
}

export interface ICacheService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  del(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
}

// src/types/api.types.ts
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
  metadata?: {
    requestId: string;
    timestamp: string;
    version: string;
  };
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface CreateUserRequest {
  email: string;
  name: string;
  role?: string;
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
}

// src/types/index.ts
export * from './api.types.js';
export * from './registry.types.js';

export interface User {
  id: string;
  email: string;
  name: string;
  roles: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface RequestMetadata {
  requestId: string;
  correlationId: string;
  startTime: number;
  userAgent: string;
  ip: string;
  method: string;
  url: string;
}
```

---

### 🔌 Fastify Adapters

```typescript
// src/utils/adapters.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { UnifiedHttpContext, UnifiedMiddleware } from '@inh-lib/unified-route';

export interface FastifyUnifiedContext extends UnifiedHttpContext {
  fastify: {
    request: FastifyRequest;
    reply: FastifyReply;
  };
}

// Adapter สำหรับแปลง Fastify Request/Reply เป็น UnifiedHttpContext
export const createUnifiedContext = (
  request: FastifyRequest,
  reply: FastifyReply
): FastifyUnifiedContext => {
  const context: FastifyUnifiedContext = {
    request: {
      body: (request.body as Record<string, unknown>) || {},
      params: (request.params as Record<string, string>) || {},
      query: (request.query as Record<string, string | string[]>) || {},
      headers: request.headers as Record<string, string>,
      method: request.method,
      url: request.url,
      route: request.routerPath || request.url,
      ip: request.ip,
      userAgent: request.headers['user-agent']
    },
    response: {
      status: (code: number) => {
        reply.status(code);
        return context.response;
      },
      json: <T>(data: T) => {
        reply.send(data);
      },
      send: (data: string) => {
        reply.send(data);
      },
      header: (name: string, value: string) => {
        reply.header(name, value);
        return context.response;
      },
      redirect: (url: string) => {
        reply.redirect(url);
      }
    },
    registry: {},
    fastify: {
      request,
      reply
    }
  };

  return context;
};

// Adapter สำหรับ UnifiedMiddleware ใน Fastify
export const createFastifyMiddleware = (middleware: UnifiedMiddleware) => {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const context = createUnifiedContext(request, reply);
    
    let nextCalled = false;
    const next = async () => {
      nextCalled = true;
    };

    await middleware(context, next);
    
    // หาก middleware ไม่เรียก next() แสดงว่าจบการทำงานแล้ว
    if (!nextCalled && !reply.sent) {
      // Middleware handle response แล้ว หรือ error
      return;
    }
  };
};

// Adapter สำหรับ Route Handler
export const createFastifyHandler = (
  handler: (context: UnifiedHttpContext) => Promise<void>,
  middlewares?: UnifiedMiddleware[]
) => {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const context = createUnifiedContext(request, reply);
    
    try {
      // Execute middlewares
      if (middlewares && middlewares.length > 0) {
        for (const middleware of middlewares) {
          let nextCalled = false;
          await middleware(context, async () => {
            nextCalled = true;
          });
          
          if (!nextCalled) {
            // Middleware stopped the chain
            return;
          }
        }
      }
      
      // Execute main handler
      await handler(context);
      
    } catch (error) {
      console.error('Handler error:', error);
      
      if (!reply.sent) {
        reply.status(500).send({
          success: false,
          message: 'Internal server error',
          requestId: context.registry['requestId'] || 'unknown'
        });
      }
    }
  };
};

// Helper สำหรับ API Response
export const sendApiResponse = <T>(
  context: UnifiedHttpContext,
  data: T,
  status = 200,
  message?: string
) => {
  const requestId = context.registry['requestId'] || 'unknown';
  
  context.response.status(status).json({
    success: status < 400,
    data,
    message,
    metadata: {
      requestId,
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    }
  });
};

export const sendApiError = (
  context: UnifiedHttpContext,
  message: string,
  status = 500,
  errors?: string[]
) => {
  const requestId = context.registry['requestId'] || 'unknown';
  
  context.response.status(status).json({
    success: false,
    message,
    errors,
    metadata: {
      requestId,
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    }
  });
};
```

---

### 🛡️ Middleware Implementation

```typescript
// src/middleware/registry.middleware.ts
import { UnifiedMiddleware, addRegistryItem, getRegistryItem } from '@inh-lib/unified-route';
import { globalRegistry } from '../config/registry.js';
import { RequestMetadata } from '../types/index.js';

// Registry Keys
export const REGISTRY_KEYS = {
  USER: 'user',
  METADATA: 'metadata',
  REQUEST_ID: 'requestId',
  CORRELATION_ID: 'correlationId',
  DATABASE: 'database',
  SERVICE_SCOPE: 'serviceScope',
  REQUEST_LOGGER: 'requestLogger'
} as const;

// Metadata Middleware
export const metadataMiddleware: UnifiedMiddleware = async (context, next) => {
  const metadata: RequestMetadata = {
    requestId: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    correlationId: context.request.headers['x-correlation-id'] || `corr_${Date.now()}`,
    startTime: Date.now(),
    userAgent: context.request.userAgent || 'unknown',
    ip: context.request.ip || 'unknown',
    method: context.request.method,
    url: context.request.url
  };
  
  addRegistryItem(context, REGISTRY_KEYS.METADATA, metadata);
  addRegistryItem(context, REGISTRY_KEYS.REQUEST_ID, metadata.requestId);
  addRegistryItem(context, REGISTRY_KEYS.CORRELATION_ID, metadata.correlationId);
  
  console.log(`[${metadata.requestId}] → ${metadata.method} ${metadata.url}`);
  
  await next();
  
  const duration = Date.now() - metadata.startTime;
  console.log(`[${metadata.requestId}] ← ${metadata.method} ${metadata.url} (${duration}ms)`);
};

// Service Scope Middleware
export const serviceScopeMiddleware: UnifiedMiddleware = async (context, next) => {
  const scope = globalRegistry.createScope();
  const requestLogger = scope.resolve('requestLoggerService');
  
  addRegistryItem(context, REGISTRY_KEYS.SERVICE_SCOPE, scope);
  addRegistryItem(context, REGISTRY_KEYS.REQUEST_LOGGER, requestLogger);
  
  const metadata = getRegistryItem<RequestMetadata>(context, REGISTRY_KEYS.METADATA);
  const requestId = metadata instanceof Error ? 'unknown' : metadata.requestId;
  
  requestLogger.info('Service scope created', { requestId });
  
  try {
    await next();
  } finally {
    scope.dispose();
    requestLogger.info('Service scope disposed', { requestId });
  }
};

// src/middleware/auth.middleware.ts
import { UnifiedMiddleware, getRegistryItem, addRegistryItem } from '@inh-lib/unified-route';
import { sendApiError } from '../utils/adapters.js';
import { REGISTRY_KEYS } from './registry.middleware.js';
import { IAuthService } from '../types/registry.types.js';

export const authMiddleware: UnifiedMiddleware = async (context, next) => {
  const token = context.request.headers.authorization;
  
  if (!token) {
    return sendApiError(context, 'Authorization token required', 401);
  }
  
  try {
    const scope = getRegistryItem(context, REGISTRY_KEYS.SERVICE_SCOPE);
    
    if (scope instanceof Error) {
      return sendApiError(context, 'Service scope not available', 500);
    }
    
    const authService = scope.resolve<IAuthService>('authService');
    const user = await authService.validateToken(token.replace('Bearer ', ''));
    
    addRegistryItem(context, REGISTRY_KEYS.USER, user);
    
    const requestLogger = getRegistryItem(context, REGISTRY_KEYS.REQUEST_LOGGER);
    if (!(requestLogger instanceof Error)) {
      requestLogger.info('User authenticated', { userId: user.id, email: user.email });
    }
    
    await next();
    
  } catch (error) {
    const requestLogger = getRegistryItem(context, REGISTRY_KEYS.REQUEST_LOGGER);
    if (!(requestLogger instanceof Error)) {
      requestLogger.error('Authentication failed', error);
    }
    
    return sendApiError(context, 'Invalid or expired token', 401);
  }
};

// Optional auth middleware
export const optionalAuthMiddleware: UnifiedMiddleware = async (context, next) => {
  const token = context.request.headers.authorization;
  
  if (token) {
    try {
      const scope = getRegistryItem(context, REGISTRY_KEYS.SERVICE_SCOPE);
      
      if (!(scope instanceof Error)) {
        const authService = scope.resolve<IAuthService>('authService');
        const user = await authService.validateToken(token.replace('Bearer ', ''));
        addRegistryItem(context, REGISTRY_KEYS.USER, user);
      }
    } catch (error) {
      // Ignore auth errors in optional middleware
      console.warn('Optional auth failed:', error.message);
    }
  }
  
  await next();
};

// src/middleware/cors.middleware.ts
import { UnifiedMiddleware } from '@inh-lib/unified-route';

export const corsMiddleware: UnifiedMiddleware = async (context, next) => {
  // Add CORS headers
  context.response
    .header('Access-Control-Allow-Origin', '*')
    .header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
    .header('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Correlation-ID');
  
  // Handle preflight
  if (context.request.method === 'OPTIONS') {
    return context.response.status(204).send('');
  }
  
  await next();
};

// src/middleware/index.ts
export * from './registry.middleware.js';
export * from './auth.middleware.js';
export * from './cors.middleware.js';
```

---

### 🎯 Route Controllers

```typescript
// src/routes/users/users.controller.ts
import { 
  UnifiedHttpContext, 
  getRegistryItem, 
  getRequestBody,
  getParams 
} from '@inh-lib/unified-route';
import { sendApiResponse, sendApiError } from '../../utils/adapters.js';
import { REGISTRY_KEYS } from '../../middleware/index.js';
import { 
  IUserService, 
  INotificationService,
  IAuditService 
} from '../../types/registry.types.js';
import { 
  CreateUserRequest, 
  UpdateUserRequest, 
  User 
} from '../../types/index.js';

export const getUserController = async (context: UnifiedHttpContext) => {
  const scope = getRegistryItem(context, REGISTRY_KEYS.SERVICE_SCOPE);
  const currentUser = getRegistryItem<User>(context, REGISTRY_KEYS.USER);
  
  if (scope instanceof Error) {
    return sendApiError(context, 'Service scope not available', 500);
  }
  
  try {
    const { id } = getParams(context);
    const userService = scope.resolve<IUserService>('userService');
    const auditService = scope.resolve<IAuditService>('auditService');
    
    const user = await userService.getUser(id);
    
    if (!user) {
      return sendApiError(context, 'User not found', 404);
    }
    
    // Log action
    if (!(currentUser instanceof Error)) {
      await auditService.logUserAction('user:view', currentUser.id, {
        targetUserId: id,
        requestId: context.registry[REGISTRY_KEYS.REQUEST_ID]
      });
    }
    
    sendApiResponse(context, { user }, 200, 'User retrieved successfully');
    
  } catch (error) {
    console.error('Error in getUserController:', error);
    return sendApiError(context, 'Failed to retrieve user', 500);
  }
};

export const createUserController = async (context: UnifiedHttpContext) => {
  const scope = getRegistryItem(context, REGISTRY_KEYS.SERVICE_SCOPE);
  const currentUser = getRegistryItem<User>(context, REGISTRY_KEYS.USER);
  
  if (scope instanceof Error) {
    return sendApiError(context, 'Service scope not available', 500);
  }
  
  try {
    const userData = getRequestBody<CreateUserRequest>(context);
    
    // Validate input
    if (!userData.email || !userData.name) {
      return sendApiError(context, 'Email and name are required', 400);
    }
    
    const userService = scope.resolve<IUserService>('userService');
    const notificationService = scope.resolve<INotificationService>('notificationService');
    const auditService = scope.resolve<IAuditService>('auditService');
    
    const user = await userService.createUser(userData);
    
    // Send welcome email
    await notificationService.sendEmail(
      user.email,
      'Welcome!',
      `Hello ${user.name}, welcome to our platform!`,
      { requestId: context.registry[REGISTRY_KEYS.REQUEST_ID] }
    );
    
    // Log action
    if (!(currentUser instanceof Error)) {
      await auditService.logUserAction('user:create', currentUser.id, {
        createdUserId: user.id,
        requestId: context.registry[REGISTRY_KEYS.REQUEST_ID]
      });
    }
    
    sendApiResponse(context, { user }, 201, 'User created successfully');
    
  } catch (error) {
    console.error('Error in createUserController:', error);
    return sendApiError(context, 'Failed to create user', 500);
  }
};

export const updateUserController = async (context: UnifiedHttpContext) => {
  const scope = getRegistryItem(context, REGISTRY_KEYS.SERVICE_SCOPE);
  const currentUser = getRegistryItem<User>(context, REGISTRY_KEYS.USER);
  
  if (scope instanceof Error) {
    return sendApiError(context, 'Service scope not available', 500);
  }
  
  try {
    const { id } = getParams(context);
    const updateData = getRequestBody<UpdateUserRequest>(context);
    
    const userService = scope.resolve<IUserService>('userService');
    const auditService = scope.resolve<IAuditService>('auditService');
    
    const user = await userService.updateUser(id, updateData);
    
    if (!user) {
      return sendApiError(context, 'User not found', 404);
    }
    
    // Log action
    if (!(currentUser instanceof Error)) {
      await auditService.logUserAction('user:update', currentUser.id, {
        updatedUserId: id,
        changes: updateData,
        requestId: context.registry[REGISTRY_KEYS.REQUEST_ID]
      });
    }
    
    sendApiResponse(context, { user }, 200, 'User updated successfully');
    
  } catch (error) {
    console.error('Error in updateUserController:', error);
    return sendApiError(context, 'Failed to update user', 500);
  }
};

export const deleteUserController = async (context: UnifiedHttpContext) => {
  const scope = getRegistryItem(context, REGISTRY_KEYS.SERVICE_SCOPE);
  const currentUser = getRegistryItem<User>(context, REGISTRY_KEYS.USER);
  
  if (scope instanceof Error) {
    return sendApiError(context, 'Service scope not available', 500);
  }
  
  try {
    const { id } = getParams(context);
    
    const userService = scope.resolve<IUserService>('userService');
    const auditService = scope.resolve<IAuditService>('auditService');
    
    await userService.deleteUser(id);
    
    // Log action
    if (!(currentUser instanceof Error)) {
      await auditService.logUserAction('user:delete', currentUser.id, {
        deletedUserId: id,
        requestId: context.registry[REGISTRY_KEYS.REQUEST_ID]
      });
    }
    
    sendApiResponse(context, null, 200, 'User deleted successfully');
    
  } catch (error) {
    console.error('Error in deleteUserController:', error);
    return sendApiError(context, 'Failed to delete user', 500);
  }
};
```

---

### 📡 Route Registration

```typescript
// src/routes/users/index.ts
import { FastifyInstance } from 'fastify';
import { composeMiddleware } from '@inh-lib/unified-route';
import { createFastifyHandler } from '../../utils/adapters.js';
import {
  metadataMiddleware,
  serviceScopeMiddleware,
  authMiddleware,
  corsMiddleware
} from '../../middleware/index.js';
import {
  getUserController,
  createUserController,
  updateUserController,
  deleteUserController
} from './users.controller.js';

// Middleware สำหรับ users routes
const userMiddlewares = [
  corsMiddleware,
  metadataMiddleware,
  serviceScopeMiddleware,
  authMiddleware // Require authentication
];

// Users Routes
export default async function userRoutes(fastify: FastifyInstance) {
  // GET /users/:id
  fastify.get('/users/:id', createFastifyHandler(
    composeMiddleware(userMiddlewares)(getUserController)
  ));
  
  // POST /users
  fastify.post('/users', createFastifyHandler(
    composeMiddleware(userMiddlewares)(createUserController)
  ));
  
  // PUT /users/:id
  fastify.put('/users/:id', createFastifyHandler(
    composeMiddleware(userMiddlewares)(updateUserController)
  ));
  
  // DELETE /users/:id
  fastify.delete('/users/:id', createFastifyHandler(
    composeMiddleware(userMiddlewares)(deleteUserController)
  ));
}

// src/routes/auth/auth.controller.ts
import { UnifiedHttpContext, getRequestBody, getRegistryItem } from '@inh-lib/unified-route';
import { sendApiResponse, sendApiError } from '../../utils/adapters.js';
import { REGISTRY_KEYS } from '../../middleware/index.js';
import { IAuthService } from '../../types/registry.types.js';
import { LoginRequest, RegisterRequest } from '../../types/index.js';

export const loginController = async (context: UnifiedHttpContext) => {
  const scope = getRegistryItem(context, REGISTRY_KEYS.SERVICE_SCOPE);
  
  if (scope instanceof Error) {
    return sendApiError(context, 'Service scope not available', 500);
  }
  
  try {
    const { email, password } = getRequestBody<LoginRequest>(context);
    
    if (!email || !password) {
      return sendApiError(context, 'Email and password are required', 400);
    }
    
    const authService = scope.resolve<IAuthService>('authService');
    const result = await authService.login(email, password);
    
    sendApiResponse(context, result, 200, 'Login successful');
    
  } catch (error) {
    console.error('Login error:', error);
    return sendApiError(context, 'Invalid credentials', 401);
  }
};

export const registerController = async (context: UnifiedHttpContext) => {
  const scope = getRegistryItem(context, REGISTRY_KEYS.SERVICE_SCOPE);
  
  if (scope instanceof Error) {
    return sendApiError(context, 'Service scope not available', 500);
  }
  
  try {
    const userData = getRequestBody<RegisterRequest>(context);
    
    if (!userData.email || !userData.password || !userData.name) {
      return sendApiError(context, 'Email, password, and name are required', 400);
    }
    
    const authService = scope.resolve<IAuthService>('authService');
    const result = await authService.register(userData);
    
    sendApiResponse(context, result, 201, 'Registration successful');
    
  } catch (error) {
    console.error('Registration error:', error);
    return sendApiError(context, 'Registration failed', 500);
  }
};

// src/routes/auth/index.ts
import { FastifyInstance } from 'fastify';
import { composeMiddleware } from '@inh-lib/unified-route';
import { createFastifyHandler } from '../../utils/adapters.js';
import {
  metadataMiddleware,
  serviceScopeMiddleware,
  corsMiddleware
} from '../../middleware/index.js';
import { loginController, registerController } from './auth.controller.js';

const authMiddlewares = [
  corsMiddleware,
  metadataMiddleware,
  serviceScopeMiddleware
  // No authMiddleware - these are public endpoints
];

export default async function authRoutes(fastify: FastifyInstance) {
  fastify.post('/auth/login', createFastifyHandler(
    composeMiddleware(authMiddlewares)(loginController)
  ));
  
  fastify.post('/auth/register', createFastifyHandler(
    composeMiddleware(authMiddlewares)(registerController)
  ));
}

// src/routes/health/index.ts
import { FastifyInstance } from 'fastify';
import { createFastifyHandler } from '../../utils/adapters.js';
import { metadataMiddleware, corsMiddleware } from '../../middleware/index.js';
import { composeMiddleware } from '@inh-lib/unified-route';

const healthController = async (context) => {
  const metadata = context.registry['metadata'];
  
  context.response.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    requestId: metadata?.requestId || 'unknown'
  });
};

export default async function healthRoutes(fastify: FastifyInstance) {
  fastify.get('/health', createFastifyHandler(
    composeMiddleware([corsMiddleware, metadataMiddleware])(healthController)
  ));
}

// src/routes/index.ts
import { FastifyInstance } from 'fastify';
import authRoutes from './auth/index.js';
import userRoutes from './users/index.js';
import healthRoutes from './health/index.js';

export default async function routes(fastify: FastifyInstance) {
  // Register all route modules
  await fastify.register(authRoutes);
  await fastify.register(userRoutes);
  await fastify.register(healthRoutes);
}
```

---

### 🚀 Main Application Setup

```typescript
// src/app.ts
import Fastify, { FastifyInstance } from 'fastify';
import { config } from './config/index.js';
import { globalRegistry } from './config/registry.js';
import routes from './routes/index.js';

// Create Fastify instance
const fastify: FastifyInstance = Fastify({
  logger: {
    level: config.logging.level,
    prettyPrint: config.logging.prettyPrint
  }
});

// Register plugins
await fastify.register(import('@fastify/helmet'));
await fastify.register(import('@fastify/cors'), {
  origin: true,
  credentials: true
});

// Rate limiting
await fastify.register(import('@fastify/rate-limit'), {
  max: 100,
  timeWindow: '1 minute'
});

// Swagger documentation (development only)
if (config.server.environment === 'development') {
  await fastify.register(import('@fastify/swagger'), {
    swagger: {
      info: {
        title: 'My Fastify App',
        description: 'API documentation',
        version: '1.0.0'
      },
      host: `${config.server.host}:${config.server.port}`,
      schemes: ['http', 'https'],
      consumes: ['application/json'],
      produces: ['application/json']
    }
  });

  await fastify.register(import('@fastify/swagger-ui'), {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: false
    }
  });
}

// Initialize services
fastify.addHook('onReady', async () => {
  try {
    const dbService = globalRegistry.resolve('databaseService');
    await dbService.connect();
    fastify.log.info('Database connected successfully');
  } catch (error) {
    fastify.log.error('Failed to connect to database:', error);
    process.exit(1);
  }
});

// Cleanup on shutdown
fastify.addHook('onClose', async () => {
  try {
    const dbService = globalRegistry.resolve('databaseService');
    await dbService.close();
    fastify.log.info('Database connection closed');
  } catch (error) {
    fastify.log.error('Error closing database connection:', error);
  }
});

// Global error handler
fastify.setErrorHandler(async (error, request, reply) => {
  fastify.log.error('Unhandled error:', error);
  
  const statusCode = error.statusCode || 500;
  const response = {
    success: false,
    message: statusCode === 500 ? 'Internal server error' : error.message,
    requestId: request.headers['x-request-id'] || 'unknown',
    timestamp: new Date().toISOString()
  };
  
  reply.status(statusCode).send(response);
});

// Register routes
await fastify.register(routes);

export default fastify;

// src/server.ts
import fastify from './app.js';
import { config } from './config/index.js';

const start = async () => {
  try {
    await fastify.listen({
      port: config.server.port,
      host: config.server.host
    });
    
    console.log(`🚀 Server running at http://${config.server.host}:${config.server.port}`);
    
    if (config.server.environment === 'development') {
      console.log(`📚 API docs available at http://${config.server.host}:${config.server.port}/docs`);
    }
    
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Received SIGINT, shutting down gracefully...');
  await fastify.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
  await fastify.close();
  process.exit(0);
});

start();
```

---

### 📜 Scripts & Configuration

```json
// package.json scripts เพิ่มเติม
{
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "dev:fastify": "fastify start -l info -P src/app.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "test": "jest",
    "test:watch": "jest --watch",
    "lint": "eslint src/**/*.ts",
    "lint:fix": "eslint src/**/*.ts --fix",
    "type-check": "tsc --noEmit"
  }
}
```

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "node",
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "allowJs": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "declaration": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

---

### 🎯 การใช้งานและการทดสอบ

```bash
# Install dependencies
npm install

# Development
npm run dev

# Production build
npm run build
npm start

# Testing endpoints
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","password":"secret","name":"John Doe"}'

curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","password":"secret"}'

curl -X GET http://localhost:3000/users/user123 \
  -H "Authorization: Bearer your-jwt-token"

curl -X GET http://localhost:3000/health
```

---

## 🔧 Maintenance & Best Practices

### 1. **Modular Architecture**
- แยก concerns ชัดเจน (config, services, middleware, controllers)
- ใช้ dependency injection ผ่าน registry
- Type safety ตลอดทั้งระบบ

### 2. **Error Handling**
- Central error handling ใน Fastify
- Consistent API response format
- Request tracking ผ่าน correlation ID

### 3. **Logging & Monitoring**
- Request/response logging
- Audit trail สำหรับ user actions
- Performance monitoring

### 4. **Testing Strategy**
```typescript
// tests/users.test.ts
describe('User API', () => {
  let app: FastifyInstance;
  
  beforeAll(async () => {
    app = await createTestApp();
  });
  
  afterAll(async () => {
    await app.close();
  });
  
  it('should create user', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/users',
      headers: {
        'authorization': 'Bearer test-token'
      },
      payload: {
        email: 'test@example.com',
        name: 'Test User'
      }
    });
    
    expect(response.statusCode).toBe(201);
    expect(response.json().success).toBe(true);
  });
});
```

### 5. **Environment Management**
```bash
# .env.development
NODE_ENV=development
PORT=3000
HOST=0.0.0.0
DATABASE_URL=postgresql://localhost:5432/myapp_dev
JWT_SECRET=dev-secret-key
LOG_LEVEL=debug

# .env.production
NODE_ENV=production
PORT=8080
HOST=0.0.0.0
DATABASE_URL=postgresql://prod-db:5432/myapp
JWT_SECRET=secure-prod-secret
LOG_LEVEL=info
```

นี่คือ setup ที่สมบูรณ์แบบสำหรับ Fastify + UnifiedRoute ที่เน้นการดูแลรักษาในระยะยาวครับ! 🚀
