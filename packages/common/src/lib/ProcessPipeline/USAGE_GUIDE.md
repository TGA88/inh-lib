# ProcessPipeline Usage Guide

A comprehensive guide to using the ProcessPipeline library for building robust, maintainable data processing workflows.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Core Concepts](#core-concepts)
3. [Pipeline Architecture Guide](#pipeline-architecture-guide)
4. [Naming Convention](#naming-convention)
5. [API Reference](#api-reference)
6. [Common Patterns](#common-patterns)
7. [Best Practices](#best-practices)
8. [Advanced Usage](#advanced-usage)
9. [Error Handling](#error-handling)
10. [Testing](#testing)
11. [Performance Considerations](#performance-considerations)
12. [Troubleshooting](#troubleshooting)

## Quick Start

### Installation & Basic Usage

```typescript
import { ProcessPipeline } from './core/process-pipeline';
import { ProcessStepFn, ProcessActionFn } from './types/process-pipeline';
import { complete, fail } from './utils/process-helpers';
import { UnifiedPreHandlerFn, UnifiedHandlerFn, UnifiedRoutePipeline } from '@inh-lib/unified-route';

// Define your input/output types
interface UserInput {
  email: string;
  age: number;
}

interface UserOutput {
  id: string;
  email: string;
  isAdult: boolean;
}

// Create middleware functions
const validateEmailStep: ProcessStepFn<UserInput, UserOutput> = (ctx) => {
  if (!ctx.input.email.includes('@')) {
    fail(ctx, 'Invalid email format');
  }
};

const processUserAction: ProcessActionFn<UserInput, UserOutput> = (ctx) => {
  complete(ctx, {
    id: `user-${Date.now()}`,
    email: ctx.input.email,
    isAdult: ctx.input.age >= 18
  });
};

// Build and execute pipeline
const userBizPipeline = new ProcessPipeline<UserInput, UserOutput>()
  .use(validateEmailStep)
  .setHandler(processUserAction);

// Execute
const result = await userBizPipeline.execute({
  email: 'user@example.com',
  age: 25
});

if (result.success) {
  console.log('User processed:', result.output);
} else {
  console.error('Processing failed:', result.error?.message);
}
```

## Core Concepts

### Pipeline Architecture

The ProcessPipeline follows a middleware pattern where data flows through a series of processing stages:

```
Input → Middleware 1 → Middleware 2 → ... → Handler → Output
```

### Key Components

1. **Pipeline**: The main orchestrator that manages middleware execution
2. **Middleware**: Functions that process, validate, or transform data
3. **Handler**: The final function that produces the output
4. **Context**: Shared state container that flows through the pipeline
5. **Helpers**: Utility functions for controlling pipeline flow

### Context Object

Every middleware receives a context object containing:

```typescript
interface ProcessContext<TInput, TOutput> {
  input: TInput;           // Original input data
  state: Record<string, unknown>; // Shared state between middlewares
  completed: boolean;      // Whether pipeline has completed
  failed: boolean;         // Whether pipeline has failed
  output?: TOutput;        // Final output (set by handler)
  error?: ProcessError;    // Error information if failed
}
```

## Pipeline Architecture Guide

### Overview

ระบบ Pipeline แบ่งเป็น 2 ประเภทหลัก:
1. **UnifiedRoutePipeline** - สำหรับจัดการ HTTP Request/Response
2. **ProcessPipeline** - สำหรับจัดการ Business Logic

### Comparison Table

| Feature | UnifiedRoutePipeline | ProcessPipeline |
|---------|---------------------|-----------------|
| **จุดประสงค์** | HTTP Request/Response | Business Logic |
| **Break Condition** | `response.sent === true` | `ctx.failed === true` |
| **Auto 404** | ✅ Yes | ❌ No |
| **Return Value** | `void` (send response) | `ProcessResult<T>` |
| **Nested Usage** | ❌ ไม่เหมาะ | ✅ เหมาะมาก |
| **Use in PreHandler** | ❌ ไม่ได้ | ✅ ได้ |
| **Context Type** | `UnifiedHttpContext` | `ProcessContext<TInput, TOutput>` |
| **State Management** | `registry: Record<string, unknown>` | `state: Record<string, unknown>` |
| **Error Handling** | Send HTTP error response | Return error in result |
| **Reusability** | ❌ ต้องผูกกับ HTTP | ✅ ใช้ได้ทุกที่ |

### 1. UnifiedRoutePipeline

#### Purpose
จัดการ HTTP Request/Response lifecycle สำหรับ web frameworks (Fastify, Express, etc.)

#### Key Features
- **Auto 404 Response**: ส่ง 404 อัตโนมัติถ้าไม่มี handler
- **Response Control**: หยุดการทำงานเมื่อ `response.sent === true`
- **HTTP Context**: เข้าถึง request/response objects โดยตรง

#### Use Cases
- API endpoints
- Web route handling
- HTTP middleware chains
- Authentication/authorization layers

#### Example
```typescript
const userApiPipeline = new UnifiedRoutePipeline();

const authPreHandler: UnifiedPreHandlerFn = (ctx) => {
  if (!ctx.request.headers['authorization']) {
    ctx.response.status(401).json({ error: 'Unauthorized' });
    return; // Stops pipeline execution
  }
  ctx.registry['userId'] = extractUserId(ctx.request);
};

const getUserHandler: UnifiedHandlerFn = (ctx) => {
  const userId = ctx.registry['userId'] as string;
  const user = userService.getById(userId);
  ctx.response.json(user);
};

userApiPipeline
  .addPreHandler(authPreHandler)
  .setHandler(getUserHandler);
```

### 2. ProcessPipeline

#### Purpose
จัดการ Business Logic processing แบบ pure functions

#### Key Features
- **Return Results**: คืนค่า `ProcessResult<T>` เสมอ
- **Reusable**: ใช้ได้ในทุกที่ ไม่ผูกกับ HTTP
- **Nestable**: เรียกใช้ pipeline อื่นได้ภายใน middleware
- **Type Safe**: Strong typing สำหรับ input/output

#### Use Cases
- Business logic validation
- Data transformation
- Complex calculations
- Reusable processing workflows
- Service layer operations

#### Example
```typescript
const userValidationBizPipeline = new ProcessPipeline<UserInput, UserOutput>()
  .use(validateEmailStep)
  .use(validatePasswordStep)
  .setHandler(createUserAction);

// Can be used anywhere
const result = await userValidationBizPipeline.execute(userData);
if (result.success) {
  console.log('User created:', result.output);
} else {
  console.error('Validation failed:', result.error?.message);
}
```

### Integration Pattern

```typescript
// Business pipeline (reusable)
const paymentBizPipeline = new ProcessPipeline<PaymentInput, PaymentOutput>()
  .use(validateAmountStep)
  .use(processPaymentStep)
  .setHandler(completePaymentAction);

// HTTP pipeline (web layer)
const paymentApiPipeline = new UnifiedRoutePipeline();

const processPaymentHandler: UnifiedHandlerFn = async (ctx) => {
  // Use business pipeline within HTTP handler
  const result = await paymentBizPipeline.execute({
    amount: ctx.request.body.amount,
    method: ctx.request.body.method
  });

  if (result.success) {
    ctx.response.json(result.output);
  } else {
    ctx.response.status(400).json({ error: result.error?.message });
  }
};

paymentApiPipeline.setHandler(processPaymentHandler);
```

## Naming Convention

Following consistent naming conventions helps maintain clean, readable, and maintainable code across your application.

### Pipeline Variable Names

#### ProcessPipeline (Business Logic)
Use **`bizPipeline`** suffix for business logic processing:

```typescript
// ✅ Good: Business logic pipelines
const userBizPipeline = new ProcessPipeline<UserInput, UserOutput>();
const paymentBizPipeline = new ProcessPipeline<PaymentInput, PaymentOutput>();
const orderBizPipeline = new ProcessPipeline<OrderInput, OrderOutput>();
const validationBizPipeline = new ProcessPipeline<ValidationInput, ValidationOutput>();
```

#### UnifiedRoutePipeline (HTTP/API Layer)
Use **`apiPipeline`** suffix for HTTP route handling:

```typescript
// ✅ Good: HTTP/API pipelines
const userApiPipeline = new UnifiedRoutePipeline();
const paymentApiPipeline = new UnifiedRoutePipeline();
const orderApiPipeline = new UnifiedRoutePipeline();
const authApiPipeline = new UnifiedRoutePipeline();
```

### Function Names

#### ProcessPipeline Functions
- **ProcessStepFn** → suffix with **"Step"**
- **ProcessActionFn** → suffix with **"Action"**

```typescript
// ✅ ProcessStepFn examples
const validateEmailStep: ProcessStepFn<UserInput, UserOutput> = (ctx) => { };
const fetchUserDataStep: ProcessStepFn<UserInput, UserOutput> = (ctx) => { };
const calculateTotalStep: ProcessStepFn<OrderInput, OrderOutput> = (ctx) => { };

// ✅ ProcessActionFn examples  
const createUserAction: ProcessActionFn<UserInput, UserOutput> = (ctx) => { };
const processPaymentAction: ProcessActionFn<PaymentInput, PaymentOutput> = (ctx) => { };
const completeOrderAction: ProcessActionFn<OrderInput, OrderOutput> = (ctx) => { };
```

#### UnifiedRoutePipeline Functions
- **UnifiedPreHandlerFn** → suffix with **"PreHandler"**
- **UnifiedHandlerFn** → suffix with **"Handler"**

```typescript
// ✅ UnifiedPreHandlerFn examples
const authPreHandler: UnifiedPreHandlerFn = (ctx) => { };
const validationPreHandler: UnifiedPreHandlerFn = (ctx) => { };
const loggingPreHandler: UnifiedPreHandlerFn = (ctx) => { };

// ✅ UnifiedHandlerFn examples
const getUserHandler: UnifiedHandlerFn = (ctx) => { };
const processPaymentHandler: UnifiedHandlerFn = (ctx) => { };
const createOrderHandler: UnifiedHandlerFn = (ctx) => { };
```

### Integration Example

```typescript
// Business logic pipeline
const paymentBizPipeline = new ProcessPipeline<PaymentInput, PaymentOutput>()
  .use(validateAmountStep)
  .use(processCreditCardStep)
  .setHandler(completePaymentAction);

// HTTP API pipeline
const paymentApiPipeline = new UnifiedRoutePipeline();

const authPreHandler: UnifiedPreHandlerFn = (ctx) => {
  // Authentication logic
  if (!ctx.request.headers['authorization']) {
    ctx.response.status(401).json({ error: 'Unauthorized' });
    return;
  }
  ctx.registry['userId'] = extractUserId(ctx.request.headers['authorization']);
};

const processPaymentHandler: UnifiedHandlerFn = async (ctx) => {
  // Call business pipeline from HTTP handler
  const result = await paymentBizPipeline.execute({
    amount: ctx.request.body.amount,
    method: ctx.request.body.method,
    userId: ctx.registry['userId'] as string
  });

  if (result.success) {
    ctx.response.json({ success: true, payment: result.output });
  } else {
    ctx.response.status(400).json({ error: result.error?.message });
  }
};

paymentApiPipeline
  .addPreHandler(authPreHandler)
  .setHandler(processPaymentHandler);

// HTTP API pipeline
const paymentApiPipeline = new UnifiedRoutePipeline();

const authPreHandler: UnifiedPreHandlerFn = (ctx) => {
  // Authentication logic
  if (!ctx.request.headers['authorization']) {
    ctx.response.status(401).json({ error: 'Unauthorized' });
    return;
  }
  ctx.registry['userId'] = extractUserId(ctx.request.headers['authorization']);
};

const processPaymentHandler: UnifiedHandlerFn = async (ctx) => {
  // Call business pipeline from HTTP handler
  const result = await paymentBizPipeline.execute({
    amount: ctx.request.body.amount,
    method: ctx.request.body.method,
    userId: ctx.registry['userId'] as string
  });

  if (result.success) {
    ctx.response.json({ success: true, payment: result.output });
  } else {
    ctx.response.status(400).json({ error: result.error?.message });
  }
};

paymentApiPipeline
  .addPreHandler(authPreHandler)
  .setHandler(processPaymentHandler);
```

### Why This Convention?

1. **Clear Separation**: `bizPipeline` vs `apiPipeline` clearly indicates the layer
2. **Short & Readable**: Only 3-4 extra characters, easy to type and read
3. **Industry Standard**: Commonly used in enterprise applications
4. **Scalable**: Works well with large codebases and teams
5. **Consistent**: Same pattern across all domain objects

## API Reference

### ProcessPipeline Class

#### Constructor

```typescript
new ProcessPipeline<TInput, TOutput>()
```

Creates a new pipeline instance with specified input and output types.

#### Methods

##### `use(middleware: ProcessStepFn<TInput, TOutput>): ProcessPipeline<TInput, TOutput>`

Adds a middleware function to the pipeline.

```typescript
const userBizPipeline = new ProcessPipeline<string, number>()
  .use((ctx) => {
    // Validation middleware
    if (!ctx.input) {
      fail(ctx, 'Input is required');
    }
  })
  .use((ctx) => {
    // Transformation middleware
    ctx.state['processedAt'] = new Date();
  });
```

##### `setHandler(handler: ProcessActionFn<TInput, TOutput>): ProcessPipeline<TInput, TOutput>`

Sets the final handler that produces the output.

```typescript
userBizPipeline.setHandler((ctx) => {
  complete(ctx, parseInt(ctx.input));
});
```

##### `execute(input: TInput): Promise<ProcessResult<TOutput>>`

Executes the pipeline with the given input.

```typescript
const result = await userBizPipeline.execute("123");
// result: { success: true, output: 123 } | { success: false, error: ProcessError }
```

### Helper Functions

#### `complete<TOutput>(ctx: ProcessContext<unknown, TOutput>, output: TOutput): void`

Marks the pipeline as completed with the specified output.

```typescript
const handlerAction: ProcessActionFn<UserInput, UserOutput> = (ctx) => {
  complete(ctx, {
    id: generateId(),
    name: ctx.input.name
  });
};
```

#### `fail(ctx: ProcessContext<unknown, unknown>, message: string): void`

Marks the pipeline as failed with an error message.

```typescript
const validatorStep: ProcessStepFn<UserInput, UserOutput> = (ctx) => {
  if (!ctx.input.email) {
    fail(ctx, 'Email is required');
  }
};
```

#### `isCompleted(ctx: ProcessContext<unknown, unknown>): boolean`

Checks if the pipeline has completed successfully.

#### `isFailed(ctx: ProcessContext<unknown, unknown>): boolean`

Checks if the pipeline has failed.

## Common Patterns

### 1. Validation Pipeline

```typescript
interface UserData {
  email: string;
  password: string;
  age: number;
}

const validateEmailStep: ProcessStepFn<UserData, UserData> = (ctx) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(ctx.input.email)) {
    fail(ctx, 'Invalid email format');
  }
};

const validatePasswordStep: ProcessStepFn<UserData, UserData> = (ctx) => {
  if (ctx.input.password.length < 8) {
    fail(ctx, 'Password must be at least 8 characters');
  }
};

const validateAgeStep: ProcessStepFn<UserData, UserData> = (ctx) => {
  if (ctx.input.age < 13) {
    fail(ctx, 'User must be at least 13 years old');
  }
};

const userValidationBizPipeline = new ProcessPipeline<UserData, UserData>()
  .use(validateEmailStep)
  .use(validatePasswordStep)
  .use(validateAgeStep)
  .setHandler((ctx) => complete(ctx, ctx.input));
```

### 2. Data Transformation Pipeline

```typescript
interface RawData {
  firstName: string;
  lastName: string;
  birthDate: string;
}

interface ProcessedData {
  fullName: string;
  age: number;
  category: string;
}

const combineNamesStep: ProcessStepFn<RawData, ProcessedData> = (ctx) => {
  ctx.state['fullName'] = `${ctx.input.firstName} ${ctx.input.lastName}`;
};

const calculateAgeStep: ProcessStepFn<RawData, ProcessedData> = (ctx) => {
  const birth = new Date(ctx.input.birthDate);
  const today = new Date();
  const age = today.getFullYear() - birth.getFullYear();
  ctx.state['age'] = age;
};

const categorizeUserStep: ProcessStepFn<RawData, ProcessedData> = (ctx) => {
  const age = ctx.state['age'] as number;
  ctx.state['category'] = age < 18 ? 'minor' : age < 65 ? 'adult' : 'senior';
};

const dataTransformBizPipeline = new ProcessPipeline<RawData, ProcessedData>()
  .use(combineNamesStep)
  .use(calculateAgeStep)
  .use(categorizeUserStep)
  .setHandler((ctx) => complete(ctx, {
    fullName: ctx.state['fullName'] as string,
    age: ctx.state['age'] as number,
    category: ctx.state['category'] as string
  }));
```

### 3. Async Processing Pipeline

```typescript
interface OrderInput {
  productId: string;
  quantity: number;
  userId: string;
}

interface OrderOutput {
  orderId: string;
  total: number;
  estimatedDelivery: Date;
}

const fetchProductStep: ProcessStepFn<OrderInput, OrderOutput> = async (ctx) => {
  try {
    const product = await productService.getById(ctx.input.productId);
    ctx.state['product'] = product;
  } catch (error) {
    fail(ctx, `Product not found: ${ctx.input.productId}`);
  }
};

const checkInventoryStep: ProcessStepFn<OrderInput, OrderOutput> = async (ctx) => {
  const product = ctx.state['product'] as Product;
  const available = await inventoryService.getAvailable(product.id);
  
  if (available < ctx.input.quantity) {
    fail(ctx, 'Insufficient inventory');
  }
};

const calculateTotalStep: ProcessStepFn<OrderInput, OrderOutput> = (ctx) => {
  const product = ctx.state['product'] as Product;
  ctx.state['total'] = product.price * ctx.input.quantity;
};

const createOrderAction: ProcessActionFn<OrderInput, OrderOutput> = async (ctx) => {
  const order = await orderService.create({
    userId: ctx.input.userId,
    productId: ctx.input.productId,
    quantity: ctx.input.quantity,
    total: ctx.state['total'] as number
  });

  complete(ctx, {
    orderId: order.id,
    total: order.total,
    estimatedDelivery: order.estimatedDelivery
  });
};

const orderProcessingBizPipeline = new ProcessPipeline<OrderInput, OrderOutput>()
  .use(fetchProductStep)
  .use(checkInventoryStep)
  .use(calculateTotalStep)
  .setHandler(createOrderAction);
```

### 4. Conditional Processing

```typescript
interface PaymentInput {
  amount: number;
  method: 'credit' | 'debit' | 'paypal';
  userId: string;
}

const validateAmountStep: ProcessStepFn<PaymentInput, PaymentOutput> = (ctx) => {
  if (ctx.input.amount <= 0) {
    fail(ctx, 'Amount must be positive');
  }
};

const processCreditCardStep: ProcessStepFn<PaymentInput, PaymentOutput> = async (ctx) => {
  if (ctx.input.method !== 'credit') return; // Skip if not credit card
  
  const result = await creditCardService.charge(ctx.input.amount, ctx.input.userId);
  ctx.state['paymentResult'] = result;
};

const processPayPalStep: ProcessStepFn<PaymentInput, PaymentOutput> = async (ctx) => {
  if (ctx.input.method !== 'paypal') return; // Skip if not PayPal
  
  const result = await paypalService.charge(ctx.input.amount, ctx.input.userId);
  ctx.state['paymentResult'] = result;
};

const paymentProcessingBizPipeline = new ProcessPipeline<PaymentInput, PaymentOutput>()
  .use(validateAmountStep)
  .use(processCreditCardStep)
  .use(processPayPalStep)
  .setHandler((ctx) => {
    const result = ctx.state['paymentResult'] as PaymentResult;
    complete(ctx, {
      transactionId: result.transactionId,
      status: result.status
    });
  });
```

### 5. HTTP Integration with UnifiedRoute

```typescript
// HTTP Pre-handlers and Handlers
const authPreHandler: UnifiedPreHandlerFn = (ctx) => {
  const token = ctx.request.headers['authorization'];

  if (!token) {
    ctx.response.status(401).json({ error: 'Unauthorized' });
    return;
  }

  ctx.registry['userId'] = 'user-123';
};

const processPaymentHandler: UnifiedHandlerFn = async (ctx) => {
  const amount = ctx.request.body['amount'] as number;
  const currency = ctx.request.body['currency'] as string;
  const paymentMethod = ctx.request.body['paymentMethod'] as string;

  // ✅ Call business pipeline
  const result = await paymentProcessingBizPipeline.execute({
    amount,
    currency,
    paymentMethod
  });

  if (!result.success) {
    ctx.response.status(400).json({
      error: 'Payment failed',
      message: result.error?.message
    });
    return;
  }

  ctx.response.status(200).json({
    success: true,
    payment: result.output
  });
};

// Setup HTTP pipeline
const paymentApiPipeline = new UnifiedRoutePipeline();
paymentApiPipeline
  .addPreHandler(authPreHandler)
  .setHandler(processPaymentHandler);
```

## Best Practices

### 1. Keep Middleware Focused

Each middleware should have a single responsibility:

```typescript
// ✅ Good: Single responsibility
const validateEmailStep: ProcessStepFn<UserInput, UserOutput> = (ctx) => {
  if (!isValidEmail(ctx.input.email)) {
    fail(ctx, 'Invalid email');
  }
};

// ❌ Bad: Multiple responsibilities
const validateAndProcessUserAction: ProcessActionFn<UserInput, UserOutput> = (ctx) => {
  // Validation
  if (!isValidEmail(ctx.input.email)) {
    fail(ctx, 'Invalid email');
  }
  
  // Processing
  const hashedPassword = hashPassword(ctx.input.password);
  ctx.state['hashedPassword'] = hashedPassword;
  
  // Database operation
  const user = saveUser(ctx.input);
  complete(ctx, user);
};
```

### 2. Use Descriptive Names

```typescript
// ✅ Good: Clear intent
const validateRequiredFieldsStep: ProcessStepFn<UserInput, UserOutput> = (ctx) => {
  // ...
};

const hashUserPasswordStep: ProcessStepFn<UserInput, UserOutput> = (ctx) => {
  // ...
};

// ❌ Bad: Unclear purpose
const process1Step: ProcessStepFn<UserInput, UserOutput> = (ctx) => {
  // ...
};

const doStuffStep: ProcessStepFn<UserInput, UserOutput> = (ctx) => {
  // ...
};
```

### 3. Handle Errors Gracefully

```typescript
const fetchUserDataStep: ProcessStepFn<UserInput, UserOutput> = async (ctx) => {
  try {
    const userData = await userService.getById(ctx.input.userId);
    ctx.state['userData'] = userData;
  } catch (error) {
    if (error instanceof NotFoundError) {
      fail(ctx, 'User not found');
    } else {
      fail(ctx, 'Failed to fetch user data');
    }
  }
};
```

### 4. Use Type-Safe State Management

```typescript
// Define state interface for better type safety
interface ProcessState {
  userData?: User;
  hashedPassword?: string;
  validationResults?: ValidationResult[];
}

// Use type assertion with caution
const middlewareStep: ProcessStepFn<UserInput, UserOutput> = (ctx) => {
  const state = ctx.state as ProcessState;
  state.userData = fetchedUser;
};
```

### 5. Compose Pipelines

```typescript
// Create reusable sub-pipelines
const userValidationBizPipeline = new ProcessPipeline<UserInput, UserInput>()
  .use(validateEmailStep)
  .use(validatePasswordStep)
  .setHandler((ctx) => complete(ctx, ctx.input));

// Compose in main pipeline
const userRegistrationBizPipeline = new ProcessPipeline<UserInput, UserOutput>()
  .use(async (ctx) => {
    const validationResult = await userValidationBizPipeline.execute(ctx.input);
    if (!validationResult.success) {
      fail(ctx, validationResult.error?.message || 'Validation failed');
    }
  })
  .use(hashPasswordStep)
  .use(saveUserStep)
  .setHandler(createUserResponseAction);
```

## Advanced Usage

### 1. Pipeline Factories

Create reusable pipeline factories for common patterns:

```typescript
class PipelineFactory {
  static createValidationBizPipeline<T>(
    validators: ProcessStepFn<T, T>[]
  ): ProcessPipeline<T, T> {
    const bizPipeline = new ProcessPipeline<T, T>();
    
    validators.forEach(validator => bizPipeline.use(validator));
    
    return bizPipeline.setHandler((ctx) => complete(ctx, ctx.input));
  }

  static createCRUDBizPipeline<TInput, TOutput>(
    entityService: EntityService<TInput, TOutput>
  ): ProcessPipeline<TInput, TOutput> {
    return new ProcessPipeline<TInput, TOutput>()
      .use(validateEntityStep)
      .use(async (ctx) => {
        try {
          const result = await entityService.create(ctx.input);
          complete(ctx, result);
        } catch (error) {
          fail(ctx, `Failed to create entity: ${error.message}`);
        }
      });
  }
}
```

### 2. Middleware Decorators

Create decorators for common middleware patterns:

```typescript
function withRetry<TInput, TOutput>(
  maxAttempts: number = 3
) {
  return function(
    middleware: ProcessStepFn<TInput, TOutput>
  ): ProcessStepFn<TInput, TOutput> {
    return async (ctx) => {
      let attempts = 0;
      let lastError: Error | undefined;

      while (attempts < maxAttempts) {
        try {
          await middleware(ctx);
          return;
        } catch (error) {
          lastError = error as Error;
          attempts++;
          
          if (attempts >= maxAttempts) {
            fail(ctx, `Failed after ${maxAttempts} attempts: ${lastError.message}`);
          }
        }
      }
    };
  };
}

// Usage
const resilientApiCallStep = withRetry(3)(async (ctx) => {
  const result = await apiService.call(ctx.input);
  ctx.state['apiResult'] = result;
});
```

### 3. Pipeline Monitoring

Add monitoring and metrics collection:

```typescript
function withMetrics<TInput, TOutput>(
  metricName: string
) {
  return function(
    middleware: ProcessStepFn<TInput, TOutput>
  ): ProcessStepFn<TInput, TOutput> {
    return async (ctx) => {
      const startTime = Date.now();
      
      try {
        await middleware(ctx);
        metricsService.recordSuccess(metricName, Date.now() - startTime);
      } catch (error) {
        metricsService.recordFailure(metricName, Date.now() - startTime);
        throw error;
      }
    };
  };
}
```

## Error Handling

### Error Types

The ProcessPipeline uses structured error handling:

```typescript
interface ProcessError {
  message: string;
  code?: string;
  details?: Record<string, unknown>;
}
```

### Custom Error Handling

```typescript
const customErrorHandlerStep: ProcessStepFn<UserInput, UserOutput> = (ctx) => {
  try {
    // Processing logic
    processUser(ctx.input);
  } catch (error) {
    if (error instanceof ValidationError) {
      fail(ctx, {
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: { field: error.field, value: error.value }
      });
    } else if (error instanceof DatabaseError) {
      fail(ctx, {
        message: 'Database operation failed',
        code: 'DB_ERROR',
        details: { query: error.query }
      });
    } else {
      fail(ctx, 'An unexpected error occurred');
    }
  }
};
```

### Error Recovery

```typescript
const withErrorRecoveryStep: ProcessStepFn<UserInput, UserOutput> = async (ctx) => {
  try {
    const result = await primaryService.process(ctx.input);
    ctx.state['result'] = result;
  } catch (error) {
    console.warn('Primary service failed, trying fallback', error);
    
    try {
      const fallbackResult = await fallbackService.process(ctx.input);
      ctx.state['result'] = fallbackResult;
      ctx.state['usedFallback'] = true;
    } catch (fallbackError) {
      fail(ctx, 'Both primary and fallback services failed');
    }
  }
};
```

## Testing

### Unit Testing Middleware

```typescript
describe('validateEmailStep middleware', () => {
  it('should pass for valid email', () => {
    const ctx = createMockContext({ email: 'test@example.com' });
    
    validateEmailStep(ctx);
    
    expect(isFailed(ctx)).toBe(false);
  });

  it('should fail for invalid email', () => {
    const ctx = createMockContext({ email: 'invalid-email' });
    
    validateEmailStep(ctx);
    
    expect(isFailed(ctx)).toBe(true);
    expect(ctx.error?.message).toBe('Invalid email format');
  });
});

function createMockContext<T>(input: T): ProcessContext<T, unknown> {
  return {
    input,
    state: {},
    completed: false,
    failed: false
  };
}
```

### Integration Testing

```typescript
describe('user registration pipeline', () => {
  it('should successfully register valid user', async () => {
    const input = {
      email: 'test@example.com',
      password: 'strongpassword123',
      age: 25
    };

    const result = await userRegistrationBizPipeline.execute(input);

    expect(result.success).toBe(true);
    expect(result.output?.email).toBe(input.email);
    expect(result.output?.id).toBeDefined();
  });

  it('should fail for invalid input', async () => {
    const input = {
      email: 'invalid-email',
      password: '123', // Too short
      age: 12 // Too young
    };

    const result = await userRegistrationBizPipeline.execute(input);

    expect(result.success).toBe(false);
    expect(result.error?.message).toContain('Invalid email');
  });
});
```

## Performance Considerations

### 1. Async Middleware Optimization

```typescript
// ✅ Good: Parallel execution where possible
const fetchUserDataParallelStep: ProcessStepFn<UserInput, UserOutput> = async (ctx) => {
  const [userData, preferences, permissions] = await Promise.all([
    userService.getById(ctx.input.userId),
    preferencesService.getByUserId(ctx.input.userId),
    permissionsService.getByUserId(ctx.input.userId)
  ]);

  ctx.state['userData'] = userData;
  ctx.state['preferences'] = preferences;
  ctx.state['permissions'] = permissions;
};

// ❌ Bad: Sequential execution
const fetchUserDataSequentialStep: ProcessStepFn<UserInput, UserOutput> = async (ctx) => {
  const userData = await userService.getById(ctx.input.userId);
  const preferences = await preferencesService.getByUserId(ctx.input.userId);
  const permissions = await permissionsService.getByUserId(ctx.input.userId);

  ctx.state['userData'] = userData;
  ctx.state['preferences'] = preferences;
  ctx.state['permissions'] = permissions;
};
```

### 2. Early Exit Optimization

```typescript
const expensiveValidationStep: ProcessStepFn<UserInput, UserOutput> = async (ctx) => {
  // Quick checks first
  if (!ctx.input.email) {
    fail(ctx, 'Email is required');
    return; // Early exit
  }

  if (!ctx.input.password) {
    fail(ctx, 'Password is required');
    return; // Early exit
  }

  // Expensive operations only if basic validation passes
  const isEmailTaken = await userService.isEmailTaken(ctx.input.email);
  if (isEmailTaken) {
    fail(ctx, 'Email already registered');
  }
};
```

### 3. State Management Optimization

```typescript
// ✅ Good: Minimal state storage
const efficientMiddlewareStep: ProcessStepFn<UserInput, UserOutput> = (ctx) => {
  ctx.state['userId'] = generateUserId(); // Only store what's needed
};

// ❌ Bad: Storing unnecessary data
const inefficientMiddlewareStep: ProcessStepFn<UserInput, UserOutput> = (ctx) => {
  ctx.state['fullUserObject'] = { ...ctx.input, /* lots of extra data */ };
  ctx.state['timestamp'] = new Date();
  ctx.state['randomData'] = Array(1000).fill(0); // Unnecessary
};
```

## Troubleshooting

### Common Issues

#### 1. Pipeline Not Completing

**Problem**: Pipeline executes but never completes or fails.

**Solution**: Ensure every middleware path calls either `complete()` or `fail()`:

```typescript
// ❌ Bug: Missing complete/fail call
const buggyMiddlewareStep: ProcessStepFn<Input, Output> = (ctx) => {
  if (ctx.input.isValid) {
    // Processing logic but no complete() call
    processData(ctx.input);
  }
  // Missing else branch
};

// ✅ Fix: Always call complete/fail
const fixedMiddlewareStep: ProcessStepFn<Input, Output> = (ctx) => {
  if (ctx.input.isValid) {
    const result = processData(ctx.input);
    complete(ctx, result);
  } else {
    fail(ctx, 'Invalid input');
  }
};
```

#### 2. State Not Persisting

**Problem**: State changes in one middleware are not visible in subsequent middlewares.

**Solution**: Ensure you're modifying the state object directly:

```typescript
// ❌ Bug: Creating new state object
const buggyStateMiddlewareStep: ProcessStepFn<Input, Output> = (ctx) => {
  ctx.state = { newValue: 'test' }; // Replaces entire state
};

// ✅ Fix: Modifying existing state
const fixedStateMiddlewareStep: ProcessStepFn<Input, Output> = (ctx) => {
  ctx.state['newValue'] = 'test'; // Adds to existing state
};
```

#### 3. Type Errors with State

**Problem**: TypeScript errors when accessing state properties.

**Solution**: Use proper type assertions or define state interfaces:

```typescript
// ❌ Problem: Type errors
const typedMiddlewareStep: ProcessStepFn<Input, Output> = (ctx) => {
  const userData = ctx.state.userData; // Type error
};

// ✅ Solution: Type assertion
const fixedMiddlewareStep: ProcessStepFn<Input, Output> = (ctx) => {
  const userData = ctx.state['userData'] as UserData;
};

// ✅ Better: Define state interface
interface MyState {
  userData?: UserData;
  processed?: boolean;
}

const betterMiddlewareStep: ProcessStepFn<Input, Output> = (ctx) => {
  const state = ctx.state as MyState;
  const userData = state.userData;
};
```

#### 4. Async Issues

**Problem**: Async operations not completing before pipeline continues.

**Solution**: Ensure async middlewares are properly awaited:

```typescript
// ❌ Bug: Not awaiting async operation
const buggyAsyncMiddlewareStep: ProcessStepFn<Input, Output> = (ctx) => {
  fetchDataAsync(ctx.input).then(result => {
    ctx.state['result'] = result;
  }); // Not awaited
};

// ✅ Fix: Proper async handling
const fixedAsyncMiddlewareStep: ProcessStepFn<Input, Output> = async (ctx) => {
  const result = await fetchDataAsync(ctx.input);
  ctx.state['result'] = result;
};
```

### Debugging Tips

#### 1. Add Debug Logging

```typescript
const debugMiddlewareStep: ProcessStepFn<Input, Output> = (ctx) => {
  console.log('Debug: Input:', ctx.input);
  console.log('Debug: State before:', ctx.state);
  
  // Your processing logic
  processData(ctx);
  
  console.log('Debug: State after:', ctx.state);
  console.log('Debug: Completed:', ctx.completed);
  console.log('Debug: Failed:', ctx.failed);
};
```

#### 2. State Inspection

```typescript
const inspectStateStep: ProcessStepFn<Input, Output> = (ctx) => {
  console.log('Current state keys:', Object.keys(ctx.state));
  console.log('State values:', JSON.stringify(ctx.state, null, 2));
};
```

#### 3. Pipeline Flow Tracking

```typescript
const createTrackingMiddleware = (name: string) => {
  return (ctx: ProcessContext<Input, Output>) => {
    console.log(`Entering middleware: ${name}`);
    console.log(`Context state: completed=${ctx.completed}, failed=${ctx.failed}`);
  };
};

const debugBizPipeline = new ProcessPipeline<Input, Output>()
  .use(createTrackingMiddleware('validation'))
  .use(validateInputStep)
  .use(createTrackingMiddleware('processing'))
  .use(processDataStep)
  .use(createTrackingMiddleware('completion'))
  .setHandler(completeProcessingAction);
```

---

## Examples

For complete working examples, see:

- [Example 1: User Registration Pipeline](./examples/example1.md)
- [Example 2: HTTP Handler Integration](./examples/example2.md)
- [Example 3: Business Logic Integration](./examples/example3.md)

## Related Documentation

- [Unit Tests Documentation](./__test__/README.md)
- [Type Definitions](./types/process-pipeline.ts)
- [Core Implementation](./core/process-pipeline.ts)
- [Helper Functions](./utils/process-helpers.ts)

---

*This guide provides comprehensive coverage of the ProcessPipeline library. For additional questions or advanced use cases, please refer to the source code and unit tests.*