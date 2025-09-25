# 🔍 `instances` ใน UnifiedScope คืออะไร?

## 📖 คำอธิบายพื้นฐาน

`instances` ใน UnifiedScope คือ **Map<string, unknown>** ที่ใช้เก็บ **instance ของ service ที่มี lifetime เป็น 'scoped'**

```typescript
export interface UnifiedScope {
    registry: UnifiedRegistry;
    instances: Map<string, unknown>;    // 👈 ตัวนี้เป็น cache สำหรับ scoped services
    resolving: Set<string>;             // ใช้ป้องกัน circular dependency
    disposed: boolean;                  // flag บอกว่า scope ถูก dispose แล้วหรือยัง
}
```

## 🎯 หน้าที่หลักของ `instances`

### 1. **Cache สำหรับ Scoped Services**
- เก็บ instance ของ service ที่มี `lifetime: 'scoped'`
- ใน scope เดียวกัน service จะถูกสร้างครั้งเดียว แล้วใช้ซ้ำ
- เมื่อ scope ถูก dispose, instances ทั้งหมดจะถูกลบ

### 2. **Performance Optimization**
- ไม่ต้องสร้าง service ใหม่ทุกครั้ง
- ใช้ cached instance แทน

### 3. **Resource Management**
- ตรวจสอบว่า service ใดบ้างถูกสร้างแล้ว
- จัดการ lifecycle ของ disposable services

---

## 🔄 Service Lifetimes แบบต่างๆ

### 1. **Singleton** - ทั้ง Application
```typescript
// ถูกเก็บใน registry.singletons
registry.register('configService', () => new ConfigService(), { 
  lifetime: 'singleton' 
});

// สร้างครั้งเดียว ใช้ตลอด application
const config1 = registry.resolve('configService'); // สร้างใหม่
const config2 = registry.resolve('configService'); // ใช้ตัวเดิม
console.log(config1 === config2); // true
```

### 2. **Transient** - สร้างใหม่ทุกครั้ง
```typescript
// ไม่มี cache เลย
registry.register('loggerService', () => new LoggerService(), { 
  lifetime: 'transient' 
});

// สร้างใหม่ทุกครั้ง
const logger1 = registry.resolve('loggerService'); // สร้างใหม่
const logger2 = registry.resolve('loggerService'); // สร้างใหม่
console.log(logger1 === logger2); // false
```

### 3. **Scoped** - ต่อ Scope (Request)
```typescript
// ✅ ตัวอย่างที่ไม่ใช้ scope parameter (Simple Case)
registry.register('simpleService', (scope) => new SimpleService(), { 
  lifetime: 'scoped' 
});

// ✅ ตัวอย่างที่ใช้ scope parameter (Advanced Case)
registry.register('dbContextService', (scope) => {
  // ใช้ scope เพื่อ resolve dependencies อื่นๆ
  const config = scope.resolve('configService');
  const logger = scope.resolve('requestLogger');
  
  return new DbContextService(config.connectionString, logger);
}, { lifetime: 'scoped' });

const scope = registry.createScope();

// ใน scope เดียวกัน ใช้ตัวเดิม
const db1 = scope.resolve('dbContextService'); // สร้างใหม่ เก็บใน scope.instances
const db2 = scope.resolve('dbContextService'); // ใช้จาก scope.instances
console.log(db1 === db2); // true

// Scope ใหม่ = instance ใหม่
const scope2 = registry.createScope();
const db3 = scope2.resolve('dbContextService'); // สร้างใหม่
console.log(db1 === db3); // false
```

---

## 🔄 Lifetime อื่นๆ ที่ต้องการ Dependencies

### **Singleton with Dependencies**
```typescript
// ❌ ผิด - Singleton ไม่ควรใช้ scope parameter
registry.register('singletonWithDeps', (scope) => {
  const config = scope.resolve('configService');
  return new SingletonService(config);
}, { lifetime: 'singleton' });

// ✅ ถูก - ใช้ registry.resolve() แทน
registry.register('singletonWithDeps', () => {
  const config = registry.resolve('configService'); // ใช้ registry โดยตรง
  return new SingletonService(config);
}, { lifetime: 'singleton' });

// ✅ อีกวิธี - ส่ง registry เข้าไป
registry.register('singletonWithDeps', (registry) => {
  const config = registry.resolve('configService');
  return new SingletonService(config);
}, { lifetime: 'singleton' });
```

### **Transient with Dependencies**
```typescript
// ❌ ผิด - Transient ไม่มี scope parameter
registry.register('transientWithDeps', (scope) => {
  const logger = scope.resolve('loggerService');
  return new TransientService(logger);
}, { lifetime: 'transient' });

// ✅ ถูก - ใช้ registry.resolve() ใน factory
registry.register('transientWithDeps', () => {
  const logger = registry.resolve('loggerService'); // ดึงจาก registry
  return new TransientService(logger);
}, { lifetime: 'transient' });

// ✅ หรือ ส่ง registry เข้าไป
registry.register('transientWithDeps', (reg) => {
  const logger = reg.resolve('loggerService');
  return new TransientService(logger);
}, { lifetime: 'transient' });
```

---

## 💡 ตัวอย่างการทำงานจริง

### HTTP Request Lifecycle

```typescript
// ตั้งค่า registry
const registry = UnifiedRegistryService.create();

// Register services
registry.register('userService', () => new UserService(), { lifetime: 'singleton' });
registry.register('requestLogger', (scope) => new RequestLogger(), { lifetime: 'scoped' });
registry.register('dbConnection', (scope) => new DbConnection(), { lifetime: 'scoped' });

// HTTP Middleware
const scopeMiddleware: UnifiedMiddleware = async (context, next) => {
  // สร้าง scope ใหม่สำหรับ request นี้
  const scope = registry.createScope();
  
  console.log('Scope created - instances:', scope.getStatistics().instanceTokens); 
  // Output: instances: [] (ยังว่าง)
  
  addRegistryItem(context, 'serviceScope', scope);
  
  try {
    await next();
  } finally {
    console.log('Before dispose - instances:', scope.getStatistics().instanceTokens);
    // Output: instances: ['requestLogger', 'dbConnection'] (มี 2 services)
    
    scope.dispose(); // ลบ instances ทั้งหมด
    
    console.log('After dispose - instances:', scope.getStatistics().instanceTokens);
    // Output: instances: [] (ถูกลบหมดแล้ว)
  }
};

// Route Handler
const getUserHandler = async (context: UnifiedHttpContext) => {
  const scope = getRegistryItem<UnifiedRegistryScope>(context, 'serviceScope');
  
  if (scope instanceof Error) {
    return sendError(context, 'Scope not available', 500);
  }
  
  // ครั้งแรก - สร้าง instance ใหม่ เก็บใน scope.instances
  const logger = scope.resolve<RequestLogger>('requestLogger');
  console.log('Logger created, stored in scope.instances');
  
  // ครั้งที่สอง - ใช้จาก scope.instances
  const logger2 = scope.resolve<RequestLogger>('requestLogger');
  console.log('Logger reused from scope.instances');
  console.log(logger === logger2); // true
  
  // Service อื่นก็เหมือนกัน
  const db = scope.resolve<DbConnection>('dbConnection');
  console.log('DB connection created, stored in scope.instances');
  
  const user = await getUserFromDb(db, getParams(context).id);
  logger.info('User fetched', { userId: user.id });
  
  sendResponse(context, { user });
};
```

### การติดตาม instances

```typescript
// สร้าง scope
const scope = registry.createScope();

console.log('=== Initial State ===');
console.log('Instances count:', scope.getStatistics().instancesCreated); // 0
console.log('Instance tokens:', scope.getStatistics().instanceTokens);   // []

// Resolve service ครั้งแรก
const logger1 = scope.resolve<RequestLogger>('requestLogger');

console.log('=== After first resolve ===');
console.log('Instances count:', scope.getStatistics().instancesCreated); // 1
console.log('Instance tokens:', scope.getStatistics().instanceTokens);   // ['requestLogger']

// Resolve service เดิมอีกครั้ง
const logger2 = scope.resolve<RequestLogger>('requestLogger');

console.log('=== After second resolve ===');
console.log('Instances count:', scope.getStatistics().instancesCreated); // 1 (ไม่เพิ่ม)
console.log('Instance tokens:', scope.getStatistics().instanceTokens);   // ['requestLogger']
console.log('Same instance?', logger1 === logger2);                      // true

// Resolve service ใหม่
const db = scope.resolve<DbConnection>('dbConnection');

console.log('=== After resolving different service ===');
console.log('Instances count:', scope.getStatistics().instancesCreated); // 2
console.log('Instance tokens:', scope.getStatistics().instanceTokens);   // ['requestLogger', 'dbConnection']

// Dispose scope
scope.dispose();

console.log('=== After dispose ===');
console.log('Instances count:', scope.getStatistics().instancesCreated); // 0
console.log('Instance tokens:', scope.getStatistics().instanceTokens);   // []
console.log('Disposed?', scope.disposed);                                // true
```

---

## 🛠️ ใช้งานจริงในสถานการณ์ต่างๆ

### 1. **Database Transaction per Request**

```typescript
class DatabaseTransaction {
  private isActive = false;
  
  constructor(private connectionPool: ConnectionPool) {}
  
  async begin() {
    this.isActive = true;
    // เริ่ม transaction
  }
  
  async commit() {
    // commit transaction
    this.isActive = false;
  }
  
  async rollback() {
    // rollback transaction  
    this.isActive = false;
  }
  
  dispose() {
    if (this.isActive) {
      this.rollback();
    }
  }
}

// Register
registry.register('dbTransaction', (scope) => {
  const connectionPool = scope.resolve('connectionPool');
  return new DatabaseTransaction(connectionPool);
}, { lifetime: 'scoped', disposable: true });

// ใช้งาน
const transactionMiddleware: UnifiedMiddleware = async (context, next) => {
  const scope = registry.createScope();
  addRegistryItem(context, 'scope', scope);
  
  try {
    // Auto-begin transaction when resolved
    const tx = scope.resolve<DatabaseTransaction>('dbTransaction');
    await tx.begin();
    
    await next();
    
    // Auto-commit if successful
    await tx.commit();
  } catch (error) {
    // Auto-rollback on error
    const tx = scope.resolve<DatabaseTransaction>('dbTransaction');
    await tx.rollback();
    throw error;
  } finally {
    scope.dispose(); // จะเรียก tx.dispose() อัตโนมัติ
  }
};
```

### 2. **Request-specific Logger**

```typescript
class RequestLogger {
  constructor(
    private baseLogger: Logger,
    private requestId: string,
    private userId?: string
  ) {}
  
  info(message: string, meta?: any) {
    this.baseLogger.info(message, {
      requestId: this.requestId,
      userId: this.userId,
      ...meta
    });
  }
  
  error(message: string, error?: Error) {
    this.baseLogger.error(message, {
      requestId: this.requestId,
      userId: this.userId,
      error: error?.stack
    });
  }
  
  dispose() {
    // flush logs หรือ cleanup
  }
}

// Register
registry.register('requestLogger', (scope) => {
  const baseLogger = scope.resolve('baseLogger');
  const requestId = generateRequestId();
  
  // user อาจจะมีหรือไม่มี depends on authentication
  const user = scope.resolve('currentUser').catch(() => null);
  
  return new RequestLogger(baseLogger, requestId, user?.id);
}, { lifetime: 'scoped', disposable: true });
```

### 3. **Caching Layer per Request**

```typescript
class RequestCache {
  private cache = new Map<string, any>();
  private hitCount = 0;
  private missCount = 0;
  
  get<T>(key: string): T | undefined {
    if (this.cache.has(key)) {
      this.hitCount++;
      return this.cache.get(key);
    }
    this.missCount++;
    return undefined;
  }
  
  set<T>(key: string, value: T): void {
    this.cache.set(key, value);
  }
  
  getStats() {
    return {
      hitCount: this.hitCount,
      missCount: this.missCount,
      hitRate: this.hitCount / (this.hitCount + this.missCount)
    };
  }
  
  dispose() {
    console.log('Request cache stats:', this.getStats());
    this.cache.clear();
  }
}

// Register
registry.register('requestCache', () => new RequestCache(), { 
  lifetime: 'scoped', 
  disposable: true 
});
```

---

## 🔧 Factory Function กับ Scope Parameter

### คำถาม: Factory Function รับ `scope` เข้าไปทำอะไร?

**Factory Function** มี 2 รูปแบบ:

### 1. **Factory ไม่ใช้ Scope Parameter**
```typescript
// ❌ ตัวอย่างที่ทำให้สับสน - รับ scope แต่ไม่ใช้
registry.register('simpleService', (scope) => {
  // ไม่ได้ใช้ scope parameter เลย!
  return new SimpleService();
}, { lifetime: 'scoped' });

// ✅ ถ้าไม่ใช้ scope ให้เขียนแบบนี้แทน
registry.register('simpleService', () => {
  return new SimpleService();
}, { lifetime: 'scoped' });
```

### 2. **Factory ใช้ Scope Parameter** (ใช้งานจริง)
```typescript
// ✅ ใช้ scope เพื่อ resolve dependencies
registry.register('userService', (scope) => {
  // ใช้ scope.resolve() เพื่อดึง dependencies อื่นๆ
  const repository = scope.resolve('userRepository');
  const logger = scope.resolve('requestLogger');
  const cache = scope.resolve('requestCache');
  
  return new UserService(repository, logger, cache);
}, { lifetime: 'scoped' });
```

---

## 📋 สรุป: การใช้ Dependencies ใน Lifetime ต่างๆ

### 🎯 **แนวทางสำหรับแต่ละ Lifetime:**

| Lifetime | Factory Parameter | การ Resolve Dependencies | Use Case |
|----------|-------------------|-------------------------|----------|
| **Singleton** | `()` | `registry.resolve()` | App-wide services, configs, pools |
| **Transient** | `()` | `registry.resolve()` | Lightweight, stateless objects |
| **Scoped** | `(scope)` | `scope.resolve()` | Request-specific, need cleanup |

### ✅ **Pattern ที่แนะนำ:**

#### Singleton with Dependencies
```typescript
// ✅ ดี - ใช้ registry.resolve()
registry.register('emailService', () => {
  const config = registry.resolve('appConfig');
  const logger = registry.resolve('baseLogger');
  return new EmailService(config, logger);
}, { lifetime: 'singleton' });
```

#### Transient with Dependencies  
```typescript
// ✅ ดี - ใช้ registry.resolve()
registry.register('apiClient', () => {
  const httpClient = registry.resolve('httpClient'); // singleton
  return new ApiClient(httpClient);
}, { lifetime: 'transient' });
```

#### Scoped with Dependencies
```typescript
// ✅ ดี - ใช้ scope.resolve()
registry.register('userService', (scope) => {
  const repository = scope.resolve('userRepository'); // scoped
  const logger = scope.resolve('requestLogger');      // scoped
  return new UserService(repository, logger);
}, { lifetime: 'scoped' });
```

### ❌ **ข้อผิดพลาดที่พบบ่อย:**

```typescript
// ❌ ผิด - Singleton ใช้ scope parameter
registry.register('singletonService', (scope) => {
  const dep = scope.resolve('dependency');
  return new SingletonService(dep);
}, { lifetime: 'singleton' });

// ❌ ผิด - Singleton พึ่งพา Scoped service
registry.register('globalService', () => {
  const requestService = registry.resolve('requestService'); // scoped!
  return new GlobalService(requestService);
}, { lifetime: 'singleton' });

// ❌ ผิด - รับ parameter แต่ไม่ใช้
registry.register('simpleService', (scope) => new SimpleService(), { 
  lifetime: 'scoped' 
});
```

### 🔧 **Quick Reference:**

- **ต้องการ dependencies + singleton**: ใช้ `registry.resolve()`
- **ต้องการ dependencies + transient**: ใช้ `registry.resolve()`  
- **ต้องการ dependencies + scoped**: ใช้ `scope.resolve()`
- **ไม่ต้องการ dependencies**: ไม่ต้องมี parameter

### 🌟 **สรุปคำถามของคุณ:**

**คำถาม**: ถ้า lifetime ไม่ใช่ scope และใน factory function ต้องการใช้ instance อื่นจาก registry ต้องทำอย่างไร?

**คำตอบ**: 
1. **Singleton**: ใช้ `registry.resolve('serviceName')` ใน factory function
2. **Transient**: ใช้ `registry.resolve('serviceName')` ใน factory function  
3. **Scoped**: ใช้ `scope.resolve('serviceName')` ใน factory function (รับ scope parameter)

**เหตุผล**: 
- Singleton และ Transient ไม่มีแนวคิดของ "scope" จึงต้องใช้ registry โดยตรง
- Scoped มีแนวคิดของ "scope lifecycle" จึงใช้ scope parameter เพื่อแชร์ instances ภายใน scope เดียวกัน

ตอนนี้เข้าใจแล้วมั้ยครับว่าแต่ละ lifetime ใช้ dependencies อย่างไร? 😊
