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

## 🔗 การเชื่อมต่อกับ HTTP Frameworks

### Express.js Integration

```typescript
import express from 'express';

const createExpressAdapter = (handler: (context: UnifiedHttpContext) => Promise<void>) => {
  return async (req: express.Request, res: express.Response) => {
    const context: UnifiedHttpContext = {
      request: {
        body: req.body || {},
        params: req.params || {},
        query: req.query as Record<string, string | string[]>,
        headers: req.headers as Record<string, string>,
        method: req.method,
        url: req.url,
        route: req.route?.path || req.url,
        ip: req.ip || 'unknown',
        userAgent: req.get('User-Agent')
      },
      response: {
        status: (code: number) => { res.status(code); return context.response; },
        json: <T>(data: T) => res.json(data),
        send: (data: string) => res.send(data),
        header: (name: string, value: string) => { res.set(name, value); return context.response; },
        redirect: (url: string) => res.redirect(url)
      },
      registry: {}
    };
    
    await handler(context);
  };
};

// ใช้งาน
app.get('/api/users/:id', createExpressAdapter(handler));
```

### Fastify Integration

```typescript
import Fastify from 'fastify';

const createFastifyAdapter = (handler: (context: UnifiedHttpContext) => Promise<void>) => {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const context: UnifiedHttpContext = {
      request: {
        body: request.body as Record<string, unknown> || {},
        params: request.params as Record<string, string> || {},
        query: request.query as Record<string, string | string[]> || {},
        headers: request.headers as Record<string, string>,
        method: request.method,
        url: request.url,
        route: request.routerPath || request.url,
        ip: request.ip,
        userAgent: request.headers['user-agent']
      },
      response: {
        status: (code: number) => { reply.status(code); return context.response; },
        json: <T>(data: T) => reply.send(data),
        send: (data: string) => reply.send(data),
        header: (name: string, value: string) => { reply.header(name, value); return context.response; },
        redirect: (url: string) => reply.redirect(url)
      },
      registry: {}
    };
    
    await handler(context);
  };
};

// ใช้งาน
fastify.get('/api/users/:id', createFastifyAdapter(handler));
```

---

## 📚 สรุป

Unified Registry System ช่วยให้คุณ:

✅ **แชร์ข้อมูลได้อย่างปลอดภัย** ระหว่าง middleware และ handler  
✅ **จัดการทรัพยากรได้อย่างมีประสิทธิภาพ** เช่น database connections, cache  
✅ **เขียนโค้ดที่ maintainable** ด้วย type safety และ consistent patterns  
✅ **รองรับ architecture แบบซับซ้อน** ด้วย dependency injection  
✅ **ทำงานร่วมกับ framework ต่างๆ ได้** Express, Fastify, Hono  

เริ่มต้นด้วย Basic Registry สำหรับ use case ง่ายๆ แล้วค่อยเปลี่ยนไปใช้ Advanced Registry เมื่อ application มีความซับซ้อนมากขึ้น!

---

## 🤝 การสนับสนุน

หากคุณมีคำถามหรือต้องการความช่วยเหลือ สามารถ:
- เปิด Issue ใน GitHub Repository
- ดู Examples ใน `/examples` folder
- ศึกษา API Documentation เพิ่มเติม

Happy Coding! 🚀
