# BasicMiddleware vs Business Pipeline: ความแตกต่างและการประยุกต์ใช้

## 🌐 **BasicMiddleware (Framework-Agnostic Layer)**

### **ขอบเขตการทำงาน:**
- ทำงานที่ **UnifiedContext Layer** (ไม่ใช่ HTTP Transport Layer)
- Cross-cutting concerns (logging, CORS, auth, error handling)
- **Framework-agnostic** (ทำงานกับ UnifiedContext)
- ทำงานกับ `UnifiedHttpContext` ที่ abstract แล้ว

### **ตัวอย่าง BasicMiddleware:**
```typescript
// ✅ Framework-agnostic Middleware
const loggingMiddleware = async (context: UnifiedHttpContext, next: () => Promise<void>) => {
  console.log(`→ ${context.request.method} ${context.request.url}`);
  await next();
  console.log(`← ${context.response.statusCode}`);
};

const authMiddleware = async (context: UnifiedHttpContext, next: () => Promise<void>) => {
  const token = context.request.headers.authorization;
  if (!token) {
    context.response.status(401).json({ error: 'Unauthorized' });
    return; // หยุดการทำงาน
  }
  await next();
};

// ✅ การใช้งาน - Framework-agnostic
const createUserRoute = compose([loggingMiddleware, authMiddleware])(
  async (context: UnifiedHttpContext) => {
    // Route logic ที่สะอาด
  }
);

// ✅ Works with ANY framework:
// Fastify
fastify.post('/users', async (request, reply) => {
  const context = createFastifyContext(request, reply);  // ← Convert to UnifiedContext
  await createUserRoute(context);                        // ← Framework-agnostic middleware & route
});

// Express
app.post('/users', async (req, res) => {
  const context = createExpressContext(req, res);        // ← Convert to UnifiedContext
  await createUserRoute(context);                        // ← Same middleware & route!
});
```

---

## 🏢 **Business Pipeline (Business Layer)**

### **ขอบเขตการทำงาน:**
- ทำงานที่ **Business Logic Layer**
- Business validation, business rules, main operations, side effects
- Framework-independent (ไม่รู้จัก HTTP เลย)
- ทำงานกับ business data และ domain contexts

### **แนวทางปัจจุบัน (Linear):**
```typescript
// ⚙️ Traditional Linear Approach
export class CreateUserCommand {
  async execute(input: CreateUserInput): Promise<User> {
    // 1. Schema validation
    const validatedInput = await this.validateSchema(input);
    
    // 2. Business validation
    await this.validateBusinessRules(validatedInput);
    
    // 3. Business constraints
    await this.enforceConstraints(validatedInput);
    
    // 4. Main operation
    const user = await this.createUser(validatedInput);
    
    // 5. Side effects
    await this.executeSideEffects(user);
    
    return user;
  }
}
```

### **แนวทาง Business Pipeline:**
```typescript
// 🚀 Business Pipeline Approach
export class CreateUserCommand {
  private pipeline: BusinessPipeline<CreateUserInput, User>;

  constructor(
    userRepository: UserRepository,
    emailService: EmailService
  ) {
    this.pipeline = new BusinessPipeline([
      new SchemaValidationStep(CreateUserSchema),
      new BusinessValidationStep(),
      new ConstraintValidationStep(userRepository),
      new MainOperationStep(userRepository),
      new SideEffectStep(emailService)
    ]);
  }

  async execute(input: CreateUserInput): Promise<User> {
    const businessContext = createBusinessLogicContext({
      userId: input.createdBy,
      metadata: { command: 'CreateUser' }
    });
    
    return await this.pipeline.execute(input, businessContext);
  }
}

// Business Pipeline Implementation
class BusinessPipeline<TInput, TOutput> {
  constructor(private steps: BusinessLogicStep<any, any>[]) {}

  async execute(input: TInput, context: BusinessLogicContext): Promise<TOutput> {
    let currentData = input;

    for (const step of this.steps) {
      try {
        currentData = await step.execute(currentData, context);
      } catch (error) {
        console.error(`Pipeline failed at step: ${step.stepName}`);
        throw error;
      }
    }

    return currentData as TOutput;
  }
}
```

---

## 🤔 **เมื่อไหร่ใช้ BasicMiddleware vs Business Pipeline**

### **✅ ใช้ BasicMiddleware เมื่อ:**
- **Cross-cutting HTTP concerns** (logging, CORS, auth, rate limiting)
- **Simple route logic** (CRUD operations)
- **Shared across multiple routes** (authentication, logging)
- **HTTP-related processing** (headers, request validation, response formatting)

```typescript
// ✅ เหมาะกับ BasicMiddleware
const getUserRoute = compose([
  loggingMiddleware,        // ← Log all requests
  authMiddleware,           // ← Check authentication
  rateLimitMiddleware       // ← Rate limiting
])(async (context: UnifiedHttpContext) => {
  const userId = context.request.params.id;
  const user = await userRepository.findById(userId);
  
  if (!user) {
    context.response.status(404).json({ error: 'User not found' });
    return;
  }
  
  context.response.json(user);
});
```

### **🚀 ใช้ Business Pipeline เมื่อ:**
- **Complex business logic** (multi-step processing)
- **Domain-specific validation** (business rules, constraints)
- **Shared context between steps** (accumulated data, state)
- **Rich business operations** (calculations, integrations, side effects)

```typescript
// ✅ เหมาะกับ Business Pipeline
export class CreateOrderCommand {
  private pipeline: BusinessPipeline<CreateOrderInput, Order>;

  constructor(...services) {
    this.pipeline = new BusinessPipeline([
      new ValidateOrderSchemaStep(schema),          // ← Schema validation
      new ValidateBusinessRulesStep(),              // ← Business rules
      new SecurityCheckStep(securityService),       // ← Fraud detection
      new InventoryCheckStep(inventoryService),     // ← Stock validation
      new PaymentValidationStep(paymentService),    // ← Payment processing
      new CalculateCostsStep(shipping, tax),        // ← Cost calculation
      new CreateOrderStep(repository),              // ← Main operation
      new SideEffectsStep(email, notifications)     // ← Side effects
    ]);
  }

  async execute(input: CreateOrderInput, httpContext: UnifiedHttpContext): Promise<Order> {
    // Convert HTTP context to Business context
    const businessContext = this.createBusinessContext(httpContext);
    return await this.pipeline.execute(input, businessContext);
  }
}
```

---

## 🔄 **สามารถใช้ร่วมกันได้:**

```typescript
// ✅ BasicMiddleware + Business Pipeline
const createOrderRoute = compose([
  loggingMiddleware,        // ← BasicMiddleware: Logging
  authMiddleware,           // ← BasicMiddleware: Authentication
  rateLimitMiddleware       // ← BasicMiddleware: Rate limiting
])(async (context: UnifiedHttpContext) => {
  // ✅ Business Pipeline ใน SimpleRoute
  const createOrderCommand = container.get<CreateOrderCommand>('createOrderCommand');
  const order = await createOrderCommand.execute(context.request.body, context);
  
  context.response.status(201).json(order);
});

// ✅ Framework registration
fastify.post('/api/orders', async (request, reply) => {
  const context = createFastifyContext(request, reply);
  await createOrderRoute(context); // ← Both middleware & pipeline applied
});
```

---

## ⚖️ **เปรียบเทียบข้อดี-ข้อเสีย**

### **BasicMiddleware:**

**✅ ข้อดี:**
- **Simple & Fast** - Minimal overhead
- **HTTP-focused** - Perfect for HTTP concerns
- **Framework-agnostic** - Works with any framework  
- **Easy composition** - Chain multiple middleware
- **Well-understood pattern** - Familiar to developers

**❌ ข้อเสีย:**
- **Limited to HTTP context** - Can't access business context
- **No shared state** - Difficult to pass data between middleware
- **Simple flow only** - Linear processing
- **No business semantics** - Just HTTP processing

### **Business Pipeline:**

**✅ ข้อดี:**
- **Complex business logic** - Multi-step processing
- **Shared context** - Rich data sharing between steps
- **Type-safe** - Full TypeScript support
- **Flexible composition** - Conditional steps, dynamic flow
- **Business semantics** - Clear business meaning
- **Rich observability** - Detailed logging, metrics, tracing

**❌ ข้อเสีย:**
- **Higher complexity** - More setup required
- **Performance overhead** - Context creation, step execution
- **Learning curve** - New patterns to learn
- **Overkill for simple cases** - Too much for basic CRUD

---

## 💡 **คำแนะนำการใช้งาน**

### **🎯 Decision Matrix:**

| **Criteria** | **BasicMiddleware** | **Business Pipeline** |
|--------------|-------------------|---------------------|
| **Route Complexity** | Simple (CRUD) | Complex (Multi-step) |
| **Business Logic** | Minimal | Rich & Complex |
| **Shared State** | Not needed | Required |
| **HTTP Concerns** | Primary focus | Not relevant |
| **Team Size** | Any | Medium to Large |
| **Performance** | ⚡ Fast | 🐌 Some overhead |

### **🏗️ Hybrid Approach (แนะนำ):**

```typescript
// ✅ Simple routes: BasicMiddleware only
const getUserRoute = compose([loggingMiddleware, authMiddleware])(
  async (context: UnifiedHttpContext) => {
    const user = await userRepository.findById(context.request.params.id);
    context.response.json(user);
  }
);

// ✅ Complex routes: BasicMiddleware + Business Pipeline
const createOrderRoute = compose([loggingMiddleware, authMiddleware])(
  async (context: UnifiedHttpContext) => {
    const createOrderCommand = container.get<CreateOrderCommand>('createOrderCommand');
    const order = await createOrderCommand.execute(context.request.body, context);
    context.response.status(201).json(order);
  }
);

// ✅ Mix and match based on complexity
const routes = [
  { path: '/users/:id', handler: getUserRoute },           // ← BasicMiddleware only
  { path: '/orders', handler: createOrderRoute },          // ← BasicMiddleware + Business Pipeline
  { path: '/health', handler: healthCheckRoute }           // ← Minimal middleware
];
```

---

## 🎯 **สรุป: เลือกใช้ตามความเหมาะสม**

| **Use Case** | **Recommended Approach** | **Reasoning** |
|--------------|-------------------------|---------------|
| **Simple CRUD** | BasicMiddleware | Fast, simple, sufficient |
| **Authentication** | BasicMiddleware | HTTP concern, reusable |
| **Logging/Monitoring** | BasicMiddleware | Cross-cutting, HTTP-focused |
| **Complex Business Logic** | Business Pipeline | Rich processing, shared context |
| **Multi-step Operations** | Business Pipeline | Step-by-step, reusable |
| **Domain Processing** | Business Pipeline | Business semantics, type-safe |

---

## 🔄 **ความแตกต่างหลัก: BasicMiddleware vs Business Pipeline**

### **🌐 BasicMiddleware (UnifiedContext Layer)**
- **ขอบเขต**: Cross-cutting HTTP concerns
- **ตำแหน่ง**: หลัง Framework conversion เป็น UnifiedContext
- **ความรับผิดชอบ**: HTTP-related processing (auth, logging, CORS)
- **ข้อมูลที่ใช้**: HTTP request/response, headers, user context
- **การทำงาน**: ทำงานกับ UnifiedHttpContext
- **Framework Dependency**: ❌ Framework-agnostic

### **🏢 Business Pipeline (Business Layer)**
- **ขอบเขต**: Complex business logic processing
- **ตำแหน่ง**: ใน Command/Query execution
- **ความรับผิดชอบ**: Business validation, rules, operations, side effects
- **ข้อมูลที่ใช้**: Business data, domain models, business context
- **การทำงาน**: ทำงานกับ business objects และ shared context
- **HTTP Dependency**: ❌ ไม่รู้จัก HTTP เลย

---

## 🚀 **Integration Flow ที่ถูกต้อง:**

```
HTTP Request
    ↓
🌐 Framework (Fastify/Express) - HTTP Transport only
    ↓
🔄 UnifiedContext - Framework → Generic conversion
    ↓
🔗 BasicMiddleware - Framework-agnostic HTTP concerns
    ↓
🛣️ SimpleRoute - Framework-agnostic route logic
    ↓
💼 Command - Business operation
    ↓
🔄 Business Pipeline - Complex business logic processing
    ↓
📊 Response
```

**Bottom Line:** **BasicMiddleware** จัดการ HTTP concerns ผ่าน UnifiedContext ส่วน **Business Pipeline** จัดการ complex business logic ที่ไม่รู้จัก HTTP เลย - สามารถใช้ร่วมกันได้และเลือกใช้ตามความซับซ้อนของงาน!

## 🌐 **BasicMiddleware (Framework-Agnostic Layer)**

### **ขอบเขตการทำงาน:**
- ทำงานที่ **UnifiedContext Layer** (ไม่ใช่ HTTP Transport Layer)
- Cross-cutting concerns (logging, CORS, auth, error handling)
- **Framework-agnostic** (ทำงานกับ UnifiedContext)
- ทำงานกับ `UnifiedHttpContext` ที่ abstract แล้ว

### **ตัวอย่าง BasicMiddleware:**
```typescript
// ✅ Framework-agnostic Middleware
const loggingMiddleware = async (context: UnifiedHttpContext, next: () => Promise<void>) => {
  console.log(`→ ${context.request.method} ${context.request.url}`);
  await next();
  console.log(`← ${context.response.statusCode}`);
};

const authMiddleware = async (context: UnifiedHttpContext, next: () => Promise<void>) => {
  const token = context.request.headers.authorization;
  if (!token) {
    context.response.status(401).json({ error: 'Unauthorized' });
    return; // หยุดการทำงาน
  }
  await next();
};

// ✅ การใช้งาน - Framework-agnostic
const createUserRoute = compose([loggingMiddleware, authMiddleware])(
  async (context: UnifiedHttpContext) => {
    // Route logic ที่สะอาด
  }
);

// ✅ Works with ANY framework:
// Fastify
fastify.post('/users', async (request, reply) => {
  const context = createFastifyContext(request, reply);  // ← Convert to UnifiedContext
  await createUserRoute(context);                        // ← Framework-agnostic middleware & route
});

// Express
app.post('/users', async (req, res) => {
  const context = createExpressContext(req, res);        // ← Convert to UnifiedContext
  await createUserRoute(context);                        // ← Same middleware & route!
});
```

---

## 🏢 **Validation Pipeline (Business Layer)**

### **ขอบเขตการทำงาน:**
- ทำงานที่ **Business Logic Layer**
- Domain-specific validation และ business rules
- Framework-independent (ไม่รู้จัก HTTP เลย)
- ทำงานกับ business data และ domain contexts

### **แนวทางปัจจุบัน (Linear):**
```typescript
// ⚙️ Traditional Linear Approach
export class CreateUserCommand {
  async execute(input: CreateUserInput): Promise<User> {
    // 1. Schema validation
    const validatedInput = await this.validateSchema(input);
    
    // 2. Business validation
    await this.validateBusinessRules(validatedInput);
    
    // 3. Business constraints
    await this.enforceConstraints(validatedInput);
    
    // 4. Main operation
    const user = await this.createUser(validatedInput);
    
    // 5. Side effects
    await this.executeSideEffects(user);
    
    return user;
  }
}
```

### **แนวทาง Pipeline (เสนอใหม่):**
```typescript
// 🚀 Pipeline Approach
export class CreateUserCommand {
  private pipeline: BusinessPipeline<CreateUserInput, User>;

  constructor(
    userRepository: UserRepository,
    emailService: EmailService
  ) {
    this.pipeline = new BusinessPipeline([
      new SchemaValidationStep(CreateUserSchema),
      new BusinessValidationStep(),
      new ConstraintValidationStep(userRepository),
      new MainOperationStep(userRepository),
      new SideEffectStep(emailService)
    ]);
  }

  async execute(input: CreateUserInput): Promise<User> {
    return await this.pipeline.execute(input);
  }
}

// Pipeline Step Interface
interface PipelineStep<TInput, TOutput> {
  execute(input: TInput, context: PipelineContext): Promise<TOutput>;
  onError?(error: Error, context: PipelineContext): Promise<void>;
}

// Business Pipeline Implementation
class BusinessPipeline<TInput, TOutput> {
  constructor(private steps: PipelineStep<any, any>[]) {}

  async execute(input: TInput): Promise<TOutput> {
    let currentData = input;
    const context: PipelineContext = {
      correlationId: crypto.randomUUID(),
      timestamp: new Date(),
      metadata: {}
    };

    for (const step of this.steps) {
      try {
        currentData = await step.execute(currentData, context);
      } catch (error) {
        if (step.onError) {
          await step.onError(error, context);
        }
        throw error;
      }
    }

    return currentData as TOutput;
  }
}
```

---

## ⚖️ **เปรียบเทียบข้อดี-ข้อเสีย**

### **✅ ข้อดีของ Pipeline Pattern:**

1. **🔄 Reusability**
   ```typescript
   // ใช้ step เดียวกันข้าม commands
   const schemaValidation = new SchemaValidationStep(UserSchema);
   
   // ใช้ใน CreateUserCommand
   const createPipeline = new BusinessPipeline([
     schemaValidation, // ← Reuse
     new BusinessValidationStep(),
     new CreateOperationStep()
   ]);
   
   // ใช้ใน UpdateUserCommand  
   const updatePipeline = new BusinessPipeline([
     schemaValidation, // ← Reuse
     new UpdateValidationStep(),
     new UpdateOperationStep()
   ]);
   ```

2. **🧪 Better Testability**
   ```typescript
   // ทดสอบ step แยกกัน
   describe('SchemaValidationStep', () => {
     it('should validate user schema', async () => {
       const step = new SchemaValidationStep(UserSchema);
       const result = await step.execute(validInput, mockContext);
       expect(result).toEqual(validInput);
     });
   });
   ```

3. **🔀 Flexibility & Composition**
   ```typescript
   // เปลี่ยน order หรือ conditional steps
   const steps = [
     new SchemaValidationStep(schema),
     ...(isAdmin ? [new AdminValidationStep()] : []),
     new BusinessValidationStep(),
     new MainOperationStep()
   ];
   ```

4. **📊 Observability**
   ```typescript
   // ง่ายต่อการ track performance แต่ละ step
   class TimingPipeline extends BusinessPipeline {
     async execute(input: TInput): Promise<TOutput> {
       for (const step of this.steps) {
         const start = Date.now();
         await step.execute(currentData, context);
         console.log(`${step.constructor.name}: ${Date.now() - start}ms`);
       }
     }
   }
   ```

### **❌ ข้อเสียของ Pipeline Pattern:**

1. **🏗️ Increased Complexity**
   ```typescript
   // Simple case กลายเป็นซับซ้อน
   
   // เดิม (5 บรรทัด)
   class SimpleCommand {
     async execute(input: Input): Promise<Output> {
       const validated = validate(input);
       return await this.repository.create(validated);
     }
   }
   
   // Pipeline (15+ บรรทัด + interfaces + steps)
   class PipelineCommand {
     constructor() {
       this.pipeline = new BusinessPipeline([...]);
     }
     // + step definitions
     // + interfaces
     // + error handling
   }
   ```

2. **⚡ Performance Overhead**
   ```typescript
   // Pipeline จำเป็นต้อง:
   // - สร้าง context objects
   // - Loop ผ่าน steps
   // - Clone/transform data ระหว่าง steps
   // - Error handling infrastructure
   
   // Linear approach: โดยตรง
   // Pipeline approach: +20-50% overhead
   ```

3. **📚 Learning Curve**
   ```typescript
   // Developer ต้องเรียนรู้:
   // - Pipeline interfaces
   // - Step creation patterns  
   // - Context passing
   // - Error handling strategies
   // - Composition patterns
   ```

4. **🔍 Type Safety Challenges**
   ```typescript
   // ยากในการรักษา type safety ข้าม steps
   interface PipelineStep<TInput, TOutput> {
     execute(input: TInput, context: PipelineContext): Promise<TOutput>;
   }
   
   // ปัญหา: Step 1 output ต้องเป็น Step 2 input
   // TypeScript ไม่สามารถ enforce chain type safety ได้ดี
   ```

---

## 💡 **คำแนะนำการใช้งาน**

### **🎯 ใช้ Linear Approach เมื่อ:**
- **Simple Commands** (≤ 3 validation steps)
- **Stable Logic** (ไม่มีการเปลี่ยนแปลง flow บ่อย)
- **Team < 5 developers**
- **Performance Critical** operations

### **🚀 ใช้ Pipeline Approach เมื่อ:**
- **Complex Commands** (≥ 5 validation steps)
- **Dynamic Logic** (conditional steps, different flows)
- **High Reusability** needs (shared steps across commands)
- **Team ≥ 10 developers**
- **Enterprise Requirements** (audit trails, monitoring)

### **🏗️ Hybrid Approach (แนะนำ):**
```typescript
// ใช้ Pipeline สำหรับ complex commands
export class ComplexOrderCommand {
  private pipeline = new BusinessPipeline([
    new SchemaValidationStep(),
    new InventoryValidationStep(),
    new PaymentValidationStep(),
    new TaxCalculationStep(),
    new OrderCreationStep(),
    new EmailNotificationStep(),
    new AuditStep()
  ]);

  async execute(input: CreateOrderInput): Promise<Order> {
    return await this.pipeline.execute(input);
  }
}

// ใช้ Linear สำหรับ simple commands
export class SimpleUserCommand {
  async execute(input: CreateUserInput): Promise<User> {
    const validated = validate(input, UserSchema);
    await this.checkEmailUniqueness(validated.email);
    return await this.userRepository.create(validated);
  }
}
```

---

## 🎯 **สรุป: เลือกใช้ตามความเหมาะสม**

| **Criteria** | **Linear** | **Pipeline** |
|--------------|------------|--------------|
| **Command Complexity** | Simple (≤3 steps) | Complex (≥5 steps) |
| **Step Reusability** | Low | High |
| **Performance** | ⚡ Fast | 🐌 Overhead |
| **Maintainability** | 📝 Simple | 🏗️ Structured |
| **Team Size** | Small (≤5) | Large (≥10) |
| **Learning Curve** | ✅ Easy | 📚 Moderate |

---

## 🔄 **ความแตกต่างหลัก: BasicMiddleware vs Validation Pipeline**

### **🌐 BasicMiddleware (UnifiedContext Layer)**
- **ขอบเขต**: Cross-cutting concerns (logging, auth, CORS, error handling)
- **ตำแหน่ง**: หลัง Framework conversion เป็น UnifiedContext
- **ความรับผิดชอบ**: HTTP-related concerns แต่ framework-agnostic
- **ข้อมูลที่ใช้**: HTTP request/response, headers, user context
- **การทำงาน**: ทำงานกับ UnifiedHttpContext
- **Framework Dependency**: ❌ Framework-agnostic (ทำงานกับ UnifiedContext)

### **🏢 Validation Pipeline (Business Layer)**
- **ขอบเขต**: Business logic validation และ processing
- **ตำแหน่ง**: ใน Command/Query execution
- **ความรับผิดชอบ**: Domain validation, business rules, data processing
- **ข้อมูลที่ใช้**: Business data, domain models, business context
- **การทำงาน**: ทำงานกับ business objects และ domain context
- **HTTP Dependency**: ❌ ไม่รู้จัก HTTP เลย

---

## 🚀 **Integration Flow ที่ถูกต้อง:**

```
HTTP Request
    ↓
🌐 Framework (Fastify/Express) - HTTP Transport only
    ↓
🔄 UnifiedContext - Framework → Generic conversion
    ↓
🔗 BasicMiddleware - Framework-agnostic cross-cutting concerns
    ↓
🛣️ SimpleRoute - Framework-agnostic route logic
    ↓
💼 Command - Business operation
    ↓
🔄 Validation Pipeline - Business logic processing
    ↓
📊 Response
```

**Bottom Line:** BasicMiddleware และ Validation Pipeline ทำงานในชั้นที่ต่างกัน แต่ทั้งคู่เป็น framework-agnostic! BasicMiddleware จัดการ HTTP concerns ผ่าน UnifiedContext ส่วน Validation Pipeline จัดการ business logic ที่ไม่รู้จัก HTTP เลย

---

## 🏢 **Validation Pipeline (Business Layer)**

### **ขอบเขตการทำงาน:**
- ทำงานที่ **Business Logic Layer**
- Domain-specific validation และ business rules
- Framework-independent
- ทำงานกับ business data และ domain contexts

### **แนวทางปัจจุบัน (Linear):**
```typescript
// ⚙️ Traditional Linear Approach
export class CreateUserCommand {
  async execute(input: CreateUserInput): Promise<User> {
    // 1. Schema validation
    const validatedInput = await this.validateSchema(input);
    
    // 2. Business validation
    await this.validateBusinessRules(validatedInput);
    
    // 3. Business constraints
    await this.enforceConstraints(validatedInput);
    
    // 4. Main operation
    const user = await this.createUser(validatedInput);
    
    // 5. Side effects
    await this.executeSideEffects(user);
    
    return user;
  }
}
```

### **แนวทาง Pipeline (เสนอใหม่):**
```typescript
// 🚀 Pipeline Approach
export class CreateUserCommand {
  private pipeline: BusinessPipeline<CreateUserInput, User>;

  constructor(
    userRepository: UserRepository,
    emailService: EmailService
  ) {
    this.pipeline = new BusinessPipeline([
      new SchemaValidationStep(CreateUserSchema),
      new BusinessValidationStep(),
      new ConstraintValidationStep(userRepository),
      new MainOperationStep(userRepository),
      new SideEffectStep(emailService)
    ]);
  }

  async execute(input: CreateUserInput): Promise<User> {
    return await this.pipeline.execute(input);
  }
}

// Pipeline Step Interface
interface PipelineStep<TInput, TOutput> {
  execute(input: TInput, context: PipelineContext): Promise<TOutput>;
  onError?(error: Error, context: PipelineContext): Promise<void>;
}

// Business Pipeline Implementation
class BusinessPipeline<TInput, TOutput> {
  constructor(private steps: PipelineStep<any, any>[]) {}

  async execute(input: TInput): Promise<TOutput> {
    let currentData = input;
    const context: PipelineContext = {
      correlationId: crypto.randomUUID(),
      timestamp: new Date(),
      metadata: {}
    };

    for (const step of this.steps) {
      try {
        currentData = await step.execute(currentData, context);
      } catch (error) {
        if (step.onError) {
          await step.onError(error, context);
        }
        throw error;
      }
    }

    return currentData as TOutput;
  }
}
```

---

## ⚖️ **เปรียบเทียบข้อดี-ข้อเสีย**

### **✅ ข้อดีของ Pipeline Pattern:**

1. **🔄 Reusability**
   ```typescript
   // ใช้ step เดียวกันข้าม commands
   const schemaValidation = new SchemaValidationStep(UserSchema);
   
   // ใช้ใน CreateUserCommand
   const createPipeline = new BusinessPipeline([
     schemaValidation, // ← Reuse
     new BusinessValidationStep(),
     new CreateOperationStep()
   ]);
   
   // ใช้ใน UpdateUserCommand  
   const updatePipeline = new BusinessPipeline([
     schemaValidation, // ← Reuse
     new UpdateValidationStep(),
     new UpdateOperationStep()
   ]);
   ```

2. **🧪 Better Testability**
   ```typescript
   // ทดสอบ step แยกกัน
   describe('SchemaValidationStep', () => {
     it('should validate user schema', async () => {
       const step = new SchemaValidationStep(UserSchema);
       const result = await step.execute(validInput, mockContext);
       expect(result).toEqual(validInput);
     });
   });
   ```

3. **🔀 Flexibility & Composition**
   ```typescript
   // เปลี่ยน order หรือ conditional steps
   const steps = [
     new SchemaValidationStep(schema),
     ...(isAdmin ? [new AdminValidationStep()] : []),
     new BusinessValidationStep(),
     new MainOperationStep()
   ];
   ```

4. **📊 Observability**
   ```typescript
   // ง่ายต่อการ track performance แต่ละ step
   class TimingPipeline extends BusinessPipeline {
     async execute(input: TInput): Promise<TOutput> {
       for (const step of this.steps) {
         const start = Date.now();
         await step.execute(currentData, context);
         console.log(`${step.constructor.name}: ${Date.now() - start}ms`);
       }
     }
   }
   ```

### **❌ ข้อเสียของ Pipeline Pattern:**

1. **🏗️ Increased Complexity**
   ```typescript
   // Simple case กลายเป็นซับซ้อน
   
   // เดิม (5 บรรทัด)
   class SimpleCommand {
     async execute(input: Input): Promise<Output> {
       const validated = validate(input);
       return await this.repository.create(validated);
     }
   }
   
   // Pipeline (15+ บรรทัด + interfaces + steps)
   class PipelineCommand {
     constructor() {
       this.pipeline = new BusinessPipeline([...]);
     }
     // + step definitions
     // + interfaces
     // + error handling
   }
   ```

2. **⚡ Performance Overhead**
   ```typescript
   // Pipeline จำเป็นต้อง:
   // - สร้าง context objects
   // - Loop ผ่าน steps
   // - Clone/transform data ระหว่าง steps
   // - Error handling infrastructure
   
   // Linear approach: โดยตรง
   // Pipeline approach: +20-50% overhead
   ```

3. **📚 Learning Curve**
   ```typescript
   // Developer ต้องเรียนรู้:
   // - Pipeline interfaces
   // - Step creation patterns  
   // - Context passing
   // - Error handling strategies
   // - Composition patterns
   ```

4. **🔍 Type Safety Challenges**
   ```typescript
   // ยากในการรักษา type safety ข้าม steps
   interface PipelineStep<TInput, TOutput> {
     execute(input: TInput, context: PipelineContext): Promise<TOutput>;
   }
   
   // ปัญหา: Step 1 output ต้องเป็น Step 2 input
   // TypeScript ไม่สามารถ enforce chain type safety ได้ดี
   ```

---

## 💡 **คำแนะนำการใช้งาน**

### **🎯 ใช้ Linear Approach เมื่อ:**
- **Simple Commands** (≤ 3 validation steps)
- **Stable Logic** (ไม่มีการเปลี่ยนแปลง flow บ่อย)
- **Team < 5 developers**
- **Performance Critical** operations

### **🚀 ใช้ Pipeline Approach เมื่อ:**
- **Complex Commands** (≥ 5 validation steps)
- **Dynamic Logic** (conditional steps, different flows)
- **High Reusability** needs (shared steps across commands)
- **Team ≥ 10 developers**
- **Enterprise Requirements** (audit trails, monitoring)

### **🏗️ Hybrid Approach (แนะนำ):**
```typescript
// ใช้ Pipeline สำหรับ complex commands
export class ComplexOrderCommand {
  private pipeline = new BusinessPipeline([
    new SchemaValidationStep(),
    new InventoryValidationStep(),
    new PaymentValidationStep(),
    new TaxCalculationStep(),
    new OrderCreationStep(),
    new EmailNotificationStep(),
    new AuditStep()
  ]);

  async execute(input: CreateOrderInput): Promise<Order> {
    return await this.pipeline.execute(input);
  }
}

// ใช้ Linear สำหรับ simple commands
export class SimpleUserCommand {
  async execute(input: CreateUserInput): Promise<User> {
    const validated = validate(input, UserSchema);
    await this.checkEmailUniqueness(validated.email);
    return await this.userRepository.create(validated);
  }
}
```

---

## 🎯 **สรุป: เลือกใช้ตามความเหมาะสม**

| **Criteria** | **Linear** | **Pipeline** |
|--------------|------------|--------------|
| **Command Complexity** | Simple (≤3 steps) | Complex (≥5 steps) |
| **Step Reusability** | Low | High |
| **Performance** | ⚡ Fast | 🐌 Overhead |
| **Maintainability** | 📝 Simple | 🏗️ Structured |
| **Team Size** | Small (≤5) | Large (≥10) |
| **Learning Curve** | ✅ Easy | 📚 Moderate |

**Bottom Line:** Pipeline pattern ดีสำหรับ enterprise applications ที่ซับซ้อน แต่ Linear approach ยังเหมาะสำหรับ simple cases ในชีวิตประจำวัน!

---

## 🔄 **Special Case: Repetitive Step Patterns**

### **ปัญหาที่พบบ่อย - Step Pattern ซ้ำกัน**

```typescript
// ❌ Linear Approach - Code Duplication ใน Every Command
export class CreateUserCommand {
  async execute(input: CreateUserInput): Promise<User> {
    // 1. Schema Validation - เหมือนกันทุก command (เพียงแต่ schema ต่าง)
    const parsed = CreateUserSchema.parse(input);
    
    // 2. Business Validation - structure เหมือนกัน แต่ logic ต่าง
    if (parsed.age < 18) throw new Error('Must be 18+');
    if (parsed.password.length < 8) throw new Error('Password too short');
    
    // 3. Business Rules - structure เหมือนกัน แต่ constraints ต่าง  
    const existingUser = await this.userRepo.findByEmail(parsed.email);
    if (existingUser) throw new Error('Email exists');
    
    // 4. Main Operation - ต่างกันตาม domain
    const user = await this.userRepo.create(parsed);
    
    // 5. Side Effects - ต่างกันตาม business needs
    await this.emailService.sendWelcome(user.email);
    await this.auditService.log('user_created', user.id);
    
    return user;
  }
}

export class CreateOrderCommand {
  async execute(input: CreateOrderInput): Promise<Order> {
    // 1. Schema Validation - เหมือนกันทุก command (เพียงแต่ schema ต่าง)
    const parsed = CreateOrderSchema.parse(input);
    
    // 2. Business Validation - structure เหมือนกัน แต่ logic ต่าง
    if (parsed.items.length === 0) throw new Error('No items');
    if (parsed.total < 0) throw new Error('Invalid total');
    
    // 3. Business Rules - structure เหมือนกัน แต่ constraints ต่าง
    const inventory = await this.inventoryRepo.checkStock(parsed.items);
    if (!inventory.available) throw new Error('Out of stock');
    
    // 4. Main Operation - ต่างกันตาม domain
    const order = await this.orderRepo.create(parsed);
    
    // 5. Side Effects - ต่างกันตาม business needs
    await this.inventoryService.reserve(order.items);
    await this.emailService.sendConfirmation(order.customerEmail);
    
    return order;
  }
}

// 🔄 Pattern ซ้ำในทุก Command:
// - Try-catch error handling
// - Logging patterns  
// - Performance tracking
// - Context passing
```

### **✅ Pipeline Solution - Template Pattern + Reusability**

```typescript
// 🏗️ Abstract Step Templates
abstract class ValidationStep<TInput, TOutput = TInput> {
  abstract execute(input: TInput, context: CommandContext): Promise<TOutput>;
  
  // Template method - เหมือนกันทุก step
  protected createError(message: string, field?: string): ValidationError {
    return new ValidationError(message, field, this.constructor.name);
  }
  
  protected log(message: string, context: CommandContext): void {
    console.log(`[${this.constructor.name}] ${message}`, { 
      correlationId: context.correlationId 
    });
  }
}

// 📋 Schema Validation - 100% Reusable
class SchemaValidationStep<T> extends ValidationStep<unknown, T> {
  constructor(private schema: z.ZodSchema<T>) {
    super();
  }
  
  async execute(input: unknown, context: CommandContext): Promise<T> {
    this.log('Validating schema', context);
    
    try {
      return this.schema.parse(input);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw this.createError(`Schema validation failed: ${error.message}`);
      }
      throw error;
    }
  }
}

// 🏢 Business Validation Template
abstract class BusinessValidationStep<T> extends ValidationStep<T> {
  async execute(input: T, context: CommandContext): Promise<T> {
    this.log('Validating business rules', context);
    
    await this.validateBusinessLogic(input, context);
    return input;
  }
  
  // แต่ละ command implement เอง
  protected abstract validateBusinessLogic(input: T, context: CommandContext): Promise<void>;
}

// 🔒 Business Constraints Template  
abstract class BusinessConstraintsStep<T> extends ValidationStep<T> {
  async execute(input: T, context: CommandContext): Promise<T> {
    this.log('Checking business constraints', context);
    
    await this.checkConstraints(input, context);
    return input;
  }
  
  // แต่ละ command implement เอง
  protected abstract checkConstraints(input: T, context: CommandContext): Promise<void>;
}

// 💼 Main Operation Template
abstract class MainOperationStep<TInput, TOutput> extends ValidationStep<TInput, TOutput> {
  async execute(input: TInput, context: CommandContext): Promise<TOutput> {
    this.log('Executing main operation', context);
    
    const result = await this.performOperation(input, context);
    
    this.log('Main operation completed', context);
    return result;
  }
  
  // แต่ละ command implement เอง
  protected abstract performOperation(input: TInput, context: CommandContext): Promise<TOutput>;
}

// 🎭 Side Effects Template
abstract class SideEffectsStep<T> extends ValidationStep<T> {
  async execute(input: T, context: CommandContext): Promise<T> {
    this.log('Executing side effects', context);
    
    // Side effects ไม่ควร fail main operation
    try {
      await this.performSideEffects(input, context);
    } catch (error) {
      console.error('Side effect failed (non-blocking):', error);
    }
    
    return input;
  }
  
  // แต่ละ command implement เอง
  protected abstract performSideEffects(input: T, context: CommandContext): Promise<void>;
}
```

### **🚀 Concrete Implementations**

```typescript
// ✅ User Command Implementation
class CreateUserBusinessValidation extends BusinessValidationStep<CreateUserInput> {
  protected async validateBusinessLogic(input: CreateUserInput): Promise<void> {
    if (input.age < 18) throw this.createError('Must be 18+', 'age');
    if (input.password.length < 8) throw this.createError('Password too short', 'password');
  }
}

class CreateUserConstraints extends BusinessConstraintsStep<CreateUserInput> {
  constructor(private userRepo: UserRepository) { super(); }
  
  protected async checkConstraints(input: CreateUserInput): Promise<void> {
    const existing = await this.userRepo.findByEmail(input.email);
    if (existing) throw this.createError('Email already exists', 'email');
  }
}

class CreateUserOperation extends MainOperationStep<CreateUserInput, User> {
  constructor(private userRepo: UserRepository) { super(); }
  
  protected async performOperation(input: CreateUserInput): Promise<User> {
    return await this.userRepo.create({
      ...input,
      id: crypto.randomUUID(),
      createdAt: new Date()
    });
  }
}

class CreateUserSideEffects extends SideEffectsStep<User> {
  constructor(
    private emailService: EmailService,
    private auditService: AuditService
  ) { super(); }
  
  protected async performSideEffects(user: User): Promise<void> {
    await Promise.all([
      this.emailService.sendWelcome(user.email),
      this.auditService.log('user_created', user.id)
    ]);
  }
}

// 🎯 Final Command - Clean & Declarative
export class CreateUserCommand {
  private pipeline: CommandPipeline<CreateUserInput, User>;
  
  constructor(
    userRepository: UserRepository,
    emailService: EmailService,
    auditService: AuditService
  ) {
    this.pipeline = new CommandPipeline([
      new SchemaValidationStep(CreateUserSchema),           // ← 100% Reusable
      new CreateUserBusinessValidation(),                   // ← Custom logic
      new CreateUserConstraints(userRepository),            // ← Custom logic  
      new CreateUserOperation(userRepository),              // ← Custom logic
      new CreateUserSideEffects(emailService, auditService) // ← Custom logic
    ]);
  }
  
  async execute(input: CreateUserInput): Promise<User> {
    return await this.pipeline.execute(input, {
      correlationId: crypto.randomUUID(),
      timestamp: new Date(),
      userId: input.userId
    });
  }
}
```

### **🎯 ผลประโยชน์เมื่อ Steps มี Pattern ซ้ำกัน**

| **ประโยชน์** | **Linear** | **Pipeline** |
|-------------|------------|--------------|
| **Code Reuse** | ❌ ซ้ำกันทุก command | ✅ Template + SchemaValidation 100% reuse |
| **Consistency** | ❌ แต่ละ command implement ต่างกัน | ✅ Pattern เหมือนกันทุก command |
| **Error Handling** | ❌ ซ้ำกันทุก command | ✅ Built-in ใน base classes |
| **Logging** | ❌ ซ้ำกันทุก command | ✅ Template method pattern |
| **Testing** | ❌ Test แต่ละ command แยก | ✅ Test ทีละ step + integration |
| **Onboarding** | ❌ เรียนรู้ทีละ command | ✅ เรียนรู้ pattern ครั้งเดียว |
| **Maintenance** | ❌ แก้ไขหลายที่ | ✅ แก้ไข base class |

### **💡 สรุป: Pipeline Perfect สำหรับ Repetitive Patterns!**

เมื่อ steps มี **pattern ซ้ำกัน** แต่ **เนื้อหาต่างกัน** → **Pipeline Pattern เหมาะที่สุด!**

**เพราะได้ทั้ง:**
- ✅ **Template Pattern** - Structure เหมือนกัน
- ✅ **Code Reuse** - Schema validation 100% reuse  
- ✅ **Consistency** - Error handling, logging เหมือนกัน
- ✅ **Easy Testing** - Test ทีละ step
- ✅ **Easy Onboarding** - เรียนรู้ pattern ครั้งเดียว

**ในกรณีนี้ Pipeline > Linear แน่นอน!** 🚀