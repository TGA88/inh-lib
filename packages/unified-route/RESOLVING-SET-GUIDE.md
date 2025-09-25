# 🔄 `resolving: Set<string>` - ป้องกัน Circular Dependency

## 📖 คำอธิบายพื้นฐาน

`resolving: Set<string>` ใน UnifiedScope คือ **Set ที่เก็บชื่อของ service ที่กำลังอยู่ในขั้นตอนการ resolve** เพื่อป้องกัน **Circular Dependency**

```typescript
export interface UnifiedScope {
    registry: UnifiedRegistry;
    instances: Map<string, unknown>;    // Cache สำหรับ scoped services
    resolving: Set<string>;             // 👈 ตัวนี้! เก็บ service tokens ที่กำลัง resolve
    disposed: boolean;                  // Flag บอกว่า scope ถูก dispose แล้วหรือยัง
}
```

## 🚨 Circular Dependency คืออะไร?

**Circular Dependency** เกิดขึ้นเมื่อ service A ต้องการ service B แต่ service B ก็ต้องการ service A กลับคืนมา สร้างวงจรไม่รู้จบ

```typescript
// ❌ ตัวอย่าง Circular Dependency
const registry = UnifiedRegistryService.create();

// Service A ต้องการ Service B
registry.register('serviceA', (scope) => {
  const serviceB = scope.resolve('serviceB'); // 👈 ต้องการ B
  return new ServiceA(serviceB);
}, { lifetime: 'scoped' });

// Service B ต้องการ Service A 
registry.register('serviceB', (scope) => {
  const serviceA = scope.resolve('serviceA'); // 👈 ต้องการ A ← วงจร!
  return new ServiceB(serviceA);
}, { lifetime: 'scoped' });

// เมื่อ resolve จะเกิด infinite loop:
// resolve('serviceA') → resolve('serviceB') → resolve('serviceA') → resolve('serviceB') → ...
```

---

## 🛡️ วิธีการป้องกัน Circular Dependency

### การทำงานของ `resolving` Set

```typescript
// ใน resolveInternalServiceFromScope()
export const resolveInternalServiceFromScope = <T>(scope: InternalScope, token: string): T => {
    // 1. ตรวจสอบว่า token นี้กำลังถูก resolve อยู่หรือไม่
    if (scope.resolving.has(token)) {
        // 🚨 เจอ Circular Dependency!
        const resolvingTokens = Array.from(scope.resolving);
        const errorMessage = buildInternalCircularDependencyMessage(resolvingTokens, token);
        throw new Error(errorMessage);
    }

    // 2. เพิ่ม token เข้า resolving set
    scope.resolving.add(token);
    
    // 3. Log chain ของการ resolve
    const resolutionChain = Array.from(scope.resolving).join(' -> ');
    console.debug(`Resolving '${token}' (chain: ${resolutionChain})`);
    
    try {
        // 4. ลองสร้าง service
        return executeInternalLifetimeResolutionWithScope<T>(scope, service);
    } finally {
        // 5. เสร็จแล้ว ลบ token ออกจาก resolving set
        scope.resolving.delete(token);
    }
};
```

### ตัวอย่างการทำงานจริง

```typescript
const registry = UnifiedRegistryService.create();

// Service A depends on Service B
registry.register('userService', (scope) => {
  console.log('Creating UserService...');
  const logger = scope.resolve('loggerService'); // ← ต้องการ LoggerService
  return new UserService(logger);
}, { lifetime: 'scoped' });

// Service B depends on Service A (Circular!)
registry.register('loggerService', (scope) => {
  console.log('Creating LoggerService...');
  const user = scope.resolve('userService'); // ← ต้องการ UserService ← วงจร!
  return new LoggerService(user);
}, { lifetime: 'scoped' });

// การ resolve
const scope = registry.createScope();

try {
  const user = scope.resolve('userService');
} catch (error) {
  console.error(error.message);
  // Output: "Circular dependency detected: userService -> loggerService -> userService"
}
```

---

## 🔍 ขั้นตอนการตรวจสอบแบบละเอียด

### Step by Step Analysis

```typescript
// สมมติเรามี circular dependency: A → B → A

console.log('=== Step by Step Circular Detection ===');

const scope = registry.createScope();
console.log('Initial resolving set:', Array.from(scope.resolving)); // []

// 1. เริ่ม resolve('serviceA')
console.log('\n1. resolve("serviceA")');
// scope.resolving.has('serviceA') → false (ไม่มี)
// scope.resolving.add('serviceA')
console.log('   resolving set:', Array.from(scope.resolving)); // ['serviceA']

// 2. ServiceA ต้องการ ServiceB → resolve('serviceB')
console.log('\n2. resolve("serviceB") from serviceA');
// scope.resolving.has('serviceB') → false (ไม่มี)
// scope.resolving.add('serviceB')
console.log('   resolving set:', Array.from(scope.resolving)); // ['serviceA', 'serviceB']

// 3. ServiceB ต้องการ ServiceA → resolve('serviceA') อีกครั้ง
console.log('\n3. resolve("serviceA") from serviceB');
// scope.resolving.has('serviceA') → true (มีอยู่แล้ว!) 🚨
console.log('   🚨 CIRCULAR DETECTED!');
console.log('   Current chain:', Array.from(scope.resolving).join(' -> ')); // serviceA -> serviceB
console.log('   Trying to add:', 'serviceA', '← Already exists!');

// throw Error: "Circular dependency detected: serviceA -> serviceB -> serviceA"
```

---

## 💡 ตัวอย่างการใช้งานจริง

### 1. **Valid Dependencies (ไม่มี Circular)**

```typescript
const registry = UnifiedRegistryService.create();

// ✅ Linear dependency chain: Controller → Service → Repository
registry.register('repository', () => new UserRepository(), { lifetime: 'scoped' });

registry.register('userService', (scope) => {
  const repo = scope.resolve('repository'); // ← ไม่มีปัญหา
  return new UserService(repo);
}, { lifetime: 'scoped' });

registry.register('userController', (scope) => {
  const service = scope.resolve('userService'); // ← ไม่มีปัญหา
  return new UserController(service);
}, { lifetime: 'scoped' });

// การ resolve
const scope = registry.createScope();

console.log('=== Valid Resolution ===');
// resolve('userController'):
// 1. resolving: ['userController']
// 2. resolve('userService') → resolving: ['userController', 'userService'] 
// 3. resolve('repository') → resolving: ['userController', 'userService', 'repository']
// 4. repository created → resolving: ['userController', 'userService']
// 5. userService created → resolving: ['userController']
// 6. userController created → resolving: []

const controller = scope.resolve('userController'); // ✅ สำเร็จ
console.log('Controller created successfully!');
```

### 2. **Circular Dependencies (มีปัญหา)**

```typescript
// ❌ การออกแบบที่ผิด
registry = UnifiedRegistryService.create();

registry.register('orderService', (scope) => {
  const inventory = scope.resolve('inventoryService'); // ต้องการ inventory
  const payment = scope.resolve('paymentService');     // ต้องการ payment
  return new OrderService(inventory, payment);
}, { lifetime: 'scoped' });

registry.register('inventoryService', (scope) => {
  const order = scope.resolve('orderService'); // ← ต้องการ order กลับมา! 🚨
  return new InventoryService(order);
}, { lifetime: 'scoped' });

registry.register('paymentService', (scope) => {
  const order = scope.resolve('orderService'); // ← ต้องการ order กลับมา! 🚨
  return new PaymentService(order);
}, { lifetime: 'scoped' });

// การ resolve
const scope2 = registry.createScope();

try {
  const order = scope2.resolve('orderService');
} catch (error) {
  console.error('❌ Circular dependency detected:');
  console.error(error.message);
  // "Circular dependency detected: orderService -> inventoryService -> orderService"
}
```

### 3. **วิธีแก้ไข Circular Dependencies**

```typescript
// ✅ วิธีแก้ไขที่ถูกต้อง: ใช้ Events หรือ Interfaces

// แทนที่จะ inject service โดยตรง ให้ใช้ Event Bus
registry.register('eventBus', () => new EventBus(), { lifetime: 'singleton' });

registry.register('orderService', (scope) => {
  const eventBus = scope.resolve('eventBus');
  const service = new OrderService(eventBus);
  
  // Subscribe to events แทนการ inject services
  eventBus.on('inventory.updated', service.handleInventoryUpdate.bind(service));
  eventBus.on('payment.completed', service.handlePaymentComplete.bind(service));
  
  return service;
}, { lifetime: 'scoped' });

registry.register('inventoryService', (scope) => {
  const eventBus = scope.resolve('eventBus');
  const service = new InventoryService(eventBus);
  
  // Publish events แทนการเรียก order service โดยตรง
  service.on('itemReserved', (data) => {
    eventBus.emit('inventory.updated', data);
  });
  
  return service;
}, { lifetime: 'scoped' });

// ✅ ไม่มี circular dependency!
const scope3 = registry.createScope();
const order = scope3.resolve('orderService'); // สำเร็จ!
```

---

## 🔧 เครื่องมือช่วยดีบัก

### 1. **ติดตาม Resolving Chain**

```typescript
// เพิ่ม debugging middleware
const debuggingScope = registry.createScope();

// Override resolve method เพื่อ log
const originalResolve = debuggingScope.resolve.bind(debuggingScope);
debuggingScope.resolve = function<T>(token: string): T {
  console.log(`🔍 Resolving: ${token}`);
  console.log(`   Current chain: [${this.resolving.join(' → ')}]`);
  
  if (this.resolving.length > 5) {
    console.warn('⚠️ Deep resolution chain detected - possible circular dependency');
  }
  
  return originalResolve(token);
};

// ใช้งาน
debuggingScope.resolve('userService');
```

### 2. **วิเคราะห์ Dependency Graph**

```typescript
// สร้าง dependency analyzer
class DependencyAnalyzer {
  static analyzeRegistry(registry: UnifiedRegistryService): Map<string, string[]> {
    const dependencies = new Map<string, string[]>();
    const serviceTokens = registry.getServiceTokens();
    
    for (const token of serviceTokens) {
      const deps = this.extractDependencies(registry, token);
      dependencies.set(token, deps);
    }
    
    return dependencies;
  }
  
  static extractDependencies(registry: UnifiedRegistryService, token: string): string[] {
    // Mock implementation - ในการใช้งานจริงต้องวิเคราะห์ factory function
    const mockDeps: Record<string, string[]> = {
      'orderService': ['inventoryService', 'paymentService'],
      'inventoryService': ['orderService'], // ← circular!
      'paymentService': ['orderService']    // ← circular!
    };
    
    return mockDeps[token] || [];
  }
  
  static detectCircularDependencies(dependencies: Map<string, string[]>): string[] {
    const cycles: string[] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    
    function dfs(token: string, path: string[]): void {
      if (recursionStack.has(token)) {
        const cycleStart = path.indexOf(token);
        const cycle = [...path.slice(cycleStart), token].join(' → ');
        cycles.push(cycle);
        return;
      }
      
      if (visited.has(token)) return;
      
      visited.add(token);
      recursionStack.add(token);
      
      const deps = dependencies.get(token) || [];
      for (const dep of deps) {
        dfs(dep, [...path, token]);
      }
      
      recursionStack.delete(token);
    }
    
    for (const token of dependencies.keys()) {
      if (!visited.has(token)) {
        dfs(token, []);
      }
    }
    
    return cycles;
  }
}

// ใช้งาน
const deps = DependencyAnalyzer.analyzeRegistry(registry);
const cycles = DependencyAnalyzer.detectCircularDependencies(deps);

console.log('🔍 Dependency Analysis:');
for (const [service, dependencies] of deps) {
  console.log(`  ${service} → [${dependencies.join(', ')}]`);
}

console.log('\n🚨 Circular Dependencies Found:');
cycles.forEach(cycle => console.log(`  ${cycle}`));
```

---

## 📊 สรุป: การทำงานของ `resolving` Set

### 🟢 **เมื่อเริ่ม resolve service**
1. ตรวจสอบ `scope.resolving.has(token)`
2. ถ้ามีแล้ว → 🚨 Circular Dependency! → throw Error
3. ถ้าไม่มี → เพิ่ม `scope.resolving.add(token)`

### 🟢 **ระหว่าง resolve**
1. `scope.resolving` เก็บ chain ของ services ที่กำลัง resolve
2. Log chain เพื่อ debugging
3. ถ้า service dependency ต้องการ service อื่น → เริ่ม resolve ใหม่

### 🟢 **เมื่อ resolve เสร็จ**
1. ลบ token ออกจาก `scope.resolving.delete(token)`
2. Return instance ที่สร้างเสร็จแล้ว

### 🔴 **เมื่อเจอ Circular Dependency**
1. `scope.resolving.has(token)` return `true`
2. สร้าง error message พร้อม resolution chain
3. Throw Error ทันที ไม่ให้เกิด infinite loop

---

## 🎯 **Key Takeaways**

1. **`resolving` = Tracker สำหรับ resolution chain**
2. **ป้องกัน infinite loop จาก circular dependencies**
3. **เก็บ temporary state ระหว่างการ resolve**
4. **ช่วยในการ debugging dependency issues**
5. **Auto cleanup เมื่อ resolve เสร็จ (finally block)**

ตัวอย่างง่ายๆ:
```typescript
// 1. resolve('A') → resolving: ['A']
// 2. A ต้องการ B → resolve('B') → resolving: ['A', 'B']  
// 3. B ต้องการ A → resolve('A') → resolving.has('A') = true → 🚨 Error!
//
// แต่ถ้าไม่มี circular:
// 1. resolve('A') → resolving: ['A']
// 2. A ต้องการ B → resolve('B') → resolving: ['A', 'B']
// 3. B สร้างเสร็จ → resolving: ['A'] (ลบ B ออก)
// 4. A สร้างเสร็จ → resolving: [] (ลบ A ออก)
```

ตอนนี้เข้าใจแล้วมั้ยครับว่า `resolving` Set ทำหน้าที่อะไรและป้องกัน circular dependency ได้อย่างไร? 😊
