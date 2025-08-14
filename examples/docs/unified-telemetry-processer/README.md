# UnifiedTelemetryProcesser

A powerful and type-safe wrapper for adding telemetry, logging, and error handling to your business logic functions with zero boilerplate code.

## 🚀 **Features**

- **Zero Boilerplate**: Automatically handles telemetry spans, logging, and error tracking
- **Type Safe**: Full TypeScript support with proper generics
- **Performance Monitoring**: Built-in execution time tracking
- **Error Handling**: Comprehensive error logging and span recording
- **Flexible**: Works with sync/async functions and multiple parameters
- **Layer Aware**: Follows proper telemetry operation types and layers
- **Circular Safe**: Handles complex objects without JSON serialization issues

## 📦 **Installation**

```bash
npm install @your-org/unified-telemetry-processer
```

**Dependencies:**
- `@inh-lib/unified-telemetry-middleware`
- `@inh-lib/unified-route`

## 🎯 **Quick Start**

### Basic Usage

```typescript
import { createDatabaseProcessor } from '@your-org/unified-telemetry-processer';

// Repository Layer
async findAllUsers(context: UnifiedHttpContext): Promise<User[]> {
    const processor = createDatabaseProcessor(
        this.telemetryService,
        async () => {
            // Your pure business logic
            return await this.db.users.findMany();
        },
        'repository.user.findAll',
        'users' // table name
    );

    return processor.process(context);
}
```

### Service Layer

```typescript
import { createServiceQueryProcessor } from '@your-org/unified-telemetry-processer';

async getUserList(context: UnifiedHttpContext): Promise<User[]> {
    const processor = createServiceQueryProcessor(
        this.telemetryService,
        (ctx) => this.userRepository.findAll(ctx),
        'service.user.list'
    );

    return processor.process(context);
}
```

## 📚 **Usage Examples**

### Database Operations

```typescript
import { createDatabaseProcessor } from '@your-org/unified-telemetry-processer';

class UserRepository {
    async findById(context: UnifiedHttpContext, id: string): Promise<User | null> {
        const processor = createDatabaseProcessor(
            this.telemetryService,
            async (ctx: UnifiedHttpContext, userId: string) => {
                return await this.db.users.findUnique({ where: { id: userId } });
            },
            'repository.user.findById',
            'users'
        );

        return processor.process(context, id);
    }

    async create(context: UnifiedHttpContext, userData: CreateUserDto): Promise<User> {
        const processor = createDatabaseProcessor(
            this.telemetryService,
            async (ctx: UnifiedHttpContext, data: CreateUserDto) => {
                return await this.db.users.create({ data });
            },
            'repository.user.create',
            'users'
        );

        return processor.process(context, userData);
    }
}
```

### Service Layer Operations

```typescript
import { 
    createServiceQueryProcessor, 
    createServiceCommandProcessor 
} from '@your-org/unified-telemetry-processer';

class UserService {
    // Query Operation
    async getUsers(context: UnifiedHttpContext, filters?: UserFilters): Promise<User[]> {
        const processor = createServiceQueryProcessor(
            this.telemetryService,
            async (ctx: UnifiedHttpContext, userFilters?: UserFilters) => {
                const users = await this.userRepository.findMany(ctx, userFilters);
                return users.map(user => this.transformUser(user));
            },
            'service.user.getUsers'
        );

        return processor.process(context, filters);
    }

    // Command Operation  
    async createUser(context: UnifiedHttpContext, userData: CreateUserDto): Promise<User> {
        const processor = createServiceCommandProcessor(
            this.telemetryService,
            async (ctx: UnifiedHttpContext, data: CreateUserDto) => {
                await this.validateUserData(data);
                const user = await this.userRepository.create(ctx, data);
                await this.emailService.sendWelcomeEmail(ctx, user.email);
                return user;
            },
            'service.user.create'
        );

        return processor.process(context, userData);
    }
}
```

### API Layer

```typescript
import { createApiProcessor } from '@your-org/unified-telemetry-processer';

class UserController {
    async handleGetUsers(context: UnifiedHttpContext): Promise<ApiResponse<User[]>> {
        const processor = createApiProcessor(
            this.telemetryService,
            async (ctx: UnifiedHttpContext) => {
                const users = await this.userService.getUsers(ctx);
                return {
                    success: true,
                    data: users,
                    total: users.length
                };
            },
            'api.users.list'
        );

        return processor.process(context);
    }
}
```

### Business Logic Operations

```typescript
import { createLogicProcessor, TELEMETRY_LAYERS } from '@your-org/unified-telemetry-processer';

class OrderService {
    // Complex business logic with service layer
    async calculateOrderTotal(context: UnifiedHttpContext, order: Order): Promise<OrderTotal> {
        const processor = createLogicProcessor(
            this.telemetryService,
            async (ctx: UnifiedHttpContext, orderData: Order) => {
                // Complex business calculations
                const baseAmount = orderData.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
                const discountAmount = await this.calculateDiscounts(orderData);
                const taxAmount = await this.calculateTax(baseAmount - discountAmount, orderData.address);
                const shippingAmount = await this.calculateShipping(orderData);
                
                return {
                    baseAmount,
                    discountAmount,
                    taxAmount,
                    shippingAmount,
                    totalAmount: baseAmount - discountAmount + taxAmount + shippingAmount
                };
            },
            'logic.order.calculateTotal',
            TELEMETRY_LAYERS.SERVICE // Business logic at service layer
        );

        return processor.process(context, order);
    }

    // Data transformation logic at core layer
    async transformUserProfile(context: UnifiedHttpContext, rawProfile: RawUserProfile): Promise<UserProfile> {
        const processor = createLogicProcessor(
            this.telemetryService,
            async (ctx: UnifiedHttpContext, profile: RawUserProfile) => {
                // Data transformation and validation logic
                const normalizedEmail = profile.email.toLowerCase().trim();
                const formattedPhone = this.formatPhoneNumber(profile.phone);
                const preferences = await this.parseUserPreferences(profile.settings);
                
                return {
                    id: profile.user_id,
                    email: normalizedEmail,
                    phone: formattedPhone,
                    fullName: `${profile.first_name} ${profile.last_name}`,
                    preferences,
                    createdAt: new Date(profile.created_at),
                    lastLoginAt: profile.last_login ? new Date(profile.last_login) : null
                };
            },
            'logic.user.transformProfile',
            TELEMETRY_LAYERS.CORE // Pure transformation logic at core layer
        );

        return processor.process(context, rawProfile);
    }

    // Validation logic
    async validateBusinessRules(context: UnifiedHttpContext, orderData: CreateOrderRequest): Promise<ValidationResult> {
        const processor = createLogicProcessor(
            this.telemetryService,
            async (ctx: UnifiedHttpContext, data: CreateOrderRequest) => {
                const errors: string[] = [];
                
                // Business rule validations
                if (data.items.length === 0) {
                    errors.push('Order must contain at least one item');
                }
                
                const totalAmount = data.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
                if (totalAmount < 0) {
                    errors.push('Order total cannot be negative');
                }
                
                const user = await this.userRepository.findById(ctx, data.userId);
                if (!user?.isActive) {
                    errors.push('User account is not active');
                }
                
                // Check inventory
                for (const item of data.items) {
                    const stock = await this.inventoryService.getStock(ctx, item.productId);
                    if (stock < item.quantity) {
                        errors.push(`Insufficient stock for product ${item.productId}`);
                    }
                }
                
                return {
                    isValid: errors.length === 0,
                    errors,
                    validatedData: errors.length === 0 ? data : null
                };
            },
            'logic.order.validateBusinessRules',
            TELEMETRY_LAYERS.SERVICE
        );

        return processor.process(context, orderData);
    }
}
```

### Integration Layer

```typescript
import { createIntegrationProcessor } from '@your-org/unified-telemetry-processer';

class ExternalApiService {
    async fetchUserProfile(context: UnifiedHttpContext, userId: string): Promise<ExternalProfile> {
        const processor = createIntegrationProcessor(
            this.telemetryService,
            async (ctx: UnifiedHttpContext, id: string) => {
                const response = await fetch(`https://api.external.com/users/${id}`, {
                    headers: { 'Authorization': `Bearer ${this.apiToken}` }
                });
                
                if (!response.ok) {
                    throw new Error(`External API error: ${response.statusText}`);
                }
                
                return await response.json();
            },
            'integration.external-api.fetchUserProfile'
        );

        return processor.process(context, userId);
    }
}
```

### Custom Operations

```typescript
import { UnifiedTelemetryProcesser, TELEMETRY_OPERATION_TYPES, TELEMETRY_LAYERS } from '@your-org/unified-telemetry-processer';

class BusinessLogicService {
    async complexCalculation(context: UnifiedHttpContext, input: CalculationInput): Promise<CalculationResult> {
        const processor = new UnifiedTelemetryProcesser(
            this.telemetryService,
            async (ctx: UnifiedHttpContext, data: CalculationInput) => {
                // Complex business logic
                const step1 = await this.performStep1(data);
                const step2 = await this.performStep2(step1);
                return this.finalizeCalculation(step2);
            },
            'logic.business.complexCalculation',
            {
                operationType: TELEMETRY_OPERATION_TYPES.LOGIC,
                layer: TELEMETRY_LAYERS.CORE,
                attributes: {
                    'calculation.type': input.type,
                    'calculation.complexity': input.complexity
                }
            }
        );

        return processor.process(context, input);
    }
}
```

## 🛠 **API Reference**

### Helper Functions

#### `createDatabaseProcessor<Args, R>(service, fn, operationName, tableName?)`
Creates a processor for database operations with `database` operation type and `data` layer.

#### `createServiceQueryProcessor<Args, R>(service, fn, operationName)`
Creates a processor for service query operations with `query` operation type and `service` layer.

#### `createServiceCommandProcessor<Args, R>(service, fn, operationName)`
Creates a processor for service command operations with `command` operation type and `service` layer.

#### `createApiProcessor<Args, R>(service, fn, operationName)`
Creates a processor for API operations with `endpoint` operation type and `api` layer.

#### `createIntegrationProcessor<Args, R>(service, fn, operationName)`
Creates a processor for integration operations with `integration` operation type and `integration` layer.

#### `createLogicProcessor<Args, R>(service, fn, operationName, layer?)`
Creates a processor for business logic operations with `logic` operation type and configurable layer.

### UnifiedTelemetryProcesser Class

```typescript
class UnifiedTelemetryProcesser<Args extends readonly [UnifiedHttpContext, ...unknown[]], R> {
    constructor(
        telemetryService: TelemetryMiddlewareService,
        fn: ProcessorFunction<Args, R>,
        operationName: string,
        options?: ProcessorOptions
    )

    async process(...args: Args): Promise<R>
}
```

### Types

```typescript
interface ProcessorOptions {
    operationType?: TelemetryOperationType;
    layer?: TelemetryLayerType;
    attributes?: TelemetryAttributes;
}

type ProcessorFunction<Args, R> = (...args: Args) => R | Promise<R>;
```

## ⚙️ **Configuration**

### Operation Types
- `endpoint` - API endpoint operations
- `middleware` - Middleware operations  
- `command` - Write operations in service layer
- `query` - Read operations in service layer
- `database` - Database operations
- `logic` - Business logic operations
- `integration` - External API/service calls
- `auth` - Authentication operations
- `custom` - User-defined operations

### Layers
- `http` - Framework HTTP layer
- `api` - Unified Route layer
- `service` - Service layer
- `data` - Data layer
- `core` - Core logic layer
- `integration` - Integration layer
- `custom` - User-defined layer

### Best Practices

#### ✅ **Do's**
```typescript
// ✅ Use appropriate helper functions
const processor = createDatabaseProcessor(service, fn, 'repo.user.find', 'users');

// ✅ Keep business logic pure
const processor = createServiceQueryProcessor(
    service,
    async (ctx, filters) => {
        // Pure business logic without telemetry code
        return await this.repository.findMany(ctx, filters);
    },
    'service.user.query'
);

// ✅ Use descriptive operation names
'repository.user.findById'
'service.order.calculateTotal'
'integration.payment.processPayment'

// ✅ Separate concerns
const processor = createServiceCommandProcessor(
    service,
    async (ctx, data) => {
        await this.validate(data);      // Business logic
        const result = await this.save(ctx, data);  // Business logic
        await this.notify(ctx, result); // Business logic
        return result;
    },
    'service.user.create'
);
```

#### ❌ **Don'ts**
```typescript
// ❌ Don't add telemetry code inside your business logic
const processor = createServiceQueryProcessor(
    service,
    async (ctx) => {
        logger.info('Starting query'); // ❌ Redundant
        const span = tracer.createSpan(); // ❌ Redundant
        try {
            return await this.repository.find(ctx);
        } finally {
            span.finish(); // ❌ Redundant
        }
    },
    'service.user.query'
);

// ❌ Don't use generic operation names
'process'
'handle'
'execute'

// ❌ Don't mix multiple concerns in one processor
const processor = createServiceCommandProcessor(
    service,
    async (ctx, data) => {
        // Business logic + HTTP handling + Database calls all mixed
        const response = await fetch('...');
        const dbResult = await db.save(data);
        return res.json(dbResult);
    },
    'mixed.concerns' // ❌ Bad
);
```

## 🔍 **Troubleshooting**

### Common Issues

#### Issue: "Provided fn is not a function"
```typescript
// ❌ Problem
const processor = createDatabaseProcessor(
    service,
    this.repository.findAll, // ❌ `this` context lost
    'repo.user.findAll'
);

// ✅ Solution
const processor = createDatabaseProcessor(
    service,
    (ctx) => this.repository.findAll(ctx), // ✅ Wrap in arrow function
    'repo.user.findAll'
);

// ✅ Or bind the context
const processor = createDatabaseProcessor(
    service,
    this.repository.findAll.bind(this.repository), // ✅ Bind this
    'repo.user.findAll'
);
```

#### Issue: Circular JSON Structure Error
```typescript
// ❌ ตัวอย่างข้อมูลที่ทำให้เกิด Circular Reference Error

// 1. Simple circular reference
const user = { id: '123', name: 'John', profile: null };
const profile = { bio: 'Engineer', user: user };
user.profile = profile; // ← Circular: user.profile.user.profile.user...

try {
    JSON.stringify(user);
} catch (error) {
    console.log(error.message);
    // "Converting circular structure to JSON
    //  --> starting at object with constructor 'Object'
    //  |     property 'profile' -> object with constructor 'Object'
    //  --- property 'user' closes the circle"
}

// 2. Real-world: UnifiedHttpContext with telemetry objects
const mockSpan = { id: 'span-123', tracer: null, context: null };
const mockTracer = { spans: [mockSpan], provider: null };
const mockProvider = { tracers: [mockTracer] };

// Create circular references
mockSpan.tracer = mockTracer;
mockSpan.context = { span: mockSpan }; // ← Circular
mockTracer.provider = mockProvider;

const context: UnifiedHttpContext = {
    requestId: 'req-123',
    telemetryService: {
        tracer: mockTracer,
        currentSpan: mockSpan
    },
    request: {
        context: null // ← Will point back to main context
    }
};
context.request.context = context; // ← Circular reference

// ❌ This causes the error in old processor versions
const processor = createDatabaseProcessor(
    telemetryService,
    async () => [],
    'test.operation'
);

// The error occurs when processor tries to stringify arguments:
// JSON.stringify([context, otherParams]) // ← Error here!

// ✅ UnifiedTelemetryProcesser automatically handles this safely
const safeProcessor = createDatabaseProcessor(
    telemetryService,
    async () => [],
    'test.operation'  
);

await safeProcessor.process(context); // ← Works perfectly!
```

**How UnifiedTelemetryProcesser solves this:**
- Automatically detects circular references
- Safely handles complex objects in attributes
- Uses `[Circular Object]`, `[Large Object]`, or `[Object]` placeholders
- Never attempts to stringify the entire context or complex arguments

```typescript
// ✅ Safe attribute handling (built into UnifiedTelemetryProcesser)
const safeAttributes = {
    'processer.operation': 'test.operation',
    'processer.args_count': 2,  // Count instead of full args
    'processer.context_id': context.requestId,  // Extract safe values
    'processer.args_types': 'object,string'  // Types instead of values
};
```

#### Issue: TypeScript Type Errors
```typescript
// ❌ Problem: Type mismatch
const processor = createDatabaseProcessor(
    service,
    async (ctx: SomeOtherContext) => { // ❌ Wrong context type
        return [];
    },
    'repo.query'
);

// ✅ Solution: Use correct types
const processor = createDatabaseProcessor(
    service,
    async (ctx: UnifiedHttpContext) => { // ✅ Correct context type
        return [];
    },
    'repo.query'
);
```

## 📊 **Performance Considerations**

- **Minimal Overhead**: The processor adds ~1-2ms overhead for telemetry operations
- **Memory Efficient**: Safe attribute handling prevents memory leaks from circular references
- **Async Optimized**: Designed for async/await patterns with proper Promise handling
- **Span Management**: Automatic span lifecycle management prevents resource leaks

## 🤝 **Contributing**

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development setup, testing guidelines, and contribution workflow.

## 📄 **License**

MIT License - see [LICENSE](./LICENSE) file for details.

## 🔗 **Related Projects**

- [@inh-lib/unified-telemetry-middleware](https://github.com/your-org/unified-telemetry-middleware)
- [@inh-lib/unified-route](https://github.com/your-org/unified-route)

## 📞 **Support**

- 📧 Email: support@your-org.com
- 💬 Slack: #unified-telemetry
- 🐛 Issues: [GitHub Issues](https://github.com/your-org/unified-telemetry-processer/issues)