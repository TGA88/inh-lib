# Failure Feature Guide

The Failure Feature เป็นระบบจัดการ Error และ Exception ที่ออกแบบมาเพื่อให้การจัดการข้อผิดพลาดเป็นไปอย่างมีประสิทธิภาพและสม่ำเสมอในแอปพลิเคชัน

## Table of Contents

1. [Overview](#overview)
2. [Core Components](#core-components)
3. [Quick Start](#quick-start)
4. [BaseFailure](#basefailure)
5. [CommonFailures](#commonfailures)
6. [HttpStatusCode](#httpstatuscode)
7. [ResponseBuilder](#responsebuilder)
8. [Result Integration](#result-integration)
9. [Advanced Usage](#advanced-usage)
10. [Best Practices](#best-practices)
11. [Testing](#testing)
12. [Common Patterns](#common-patterns)
13. [Troubleshooting](#troubleshooting)

## Overview

Failure Feature ประกอบด้วยส่วนประกอบหลัก 4 ส่วน:

- **BaseFailure**: Abstract base class สำหรับ custom error types
- **CommonFailures**: Pre-built failure classes สำหรับกรณีการใช้งานทั่วไป
- **HttpStatusCode**: HTTP status code constants และ utilities
- **ResponseBuilder**: Helper class สำหรับสร้าง HTTP responses

### Key Benefits

- ✅ **Type Safety**: Full TypeScript support
- ✅ **Consistency**: มาตรฐานเดียวกันในการจัดการ errors
- ✅ **Traceability**: รองรับ trace ID สำหรับ debugging
- ✅ **HTTP Integration**: ผสมผสานกับ HTTP status codes
- ✅ **Result Pattern**: ทำงานร่วมกับ Result monad
- ✅ **Logging Support**: Compatible กับ Winston, Pino, Bunyan

## Core Components

### File Structure
```
Failure/
├── BaseFailure.ts       # Abstract base class
├── CommonFailures.ts    # Pre-built failure types
├── HttpStatusCode.ts    # HTTP status constants
└── ResponseBuilder.ts   # Response utilities
```

## Quick Start

### Basic Usage

```typescript
import { CommonFailures, ResponseBuilder } from '@inh-lib/common';

// สร้าง error
const error = new CommonFailures.ValidationFail('Email is required');

// สร้าง response
const response = ResponseBuilder.error(error);

console.log(response);
// {
//   statusCode: 422,
//   isSuccess: false,
//   codeResult: 'VALIDATION_FAIL',
//   message: 'Email is required',
//   dataResult: null
// }
```

### With Express.js

```typescript
import { Request, Response } from 'express';
import { CommonFailures, ResponseBuilder } from '@inh-lib/common';

app.post('/users', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      const error = new CommonFailures.ValidationFail('Email is required');
      const response = ResponseBuilder.error(error);
      return res.status(response.statusCode).json(response);
    }
    
    // Create user logic...
    const user = await createUser({ email });
    
    const response = ResponseBuilder.created(user, 'User created successfully');
    return res.status(response.statusCode).json(response);
    
  } catch (error) {
    const response = ResponseBuilder.fromError(error);
    return res.status(response.statusCode).json(response);
  }
});
```

## BaseFailure

BaseFailure เป็น abstract base class สำหรับสร้าง custom error types

### Properties

```typescript
class BaseFailure extends Error {
  readonly code: string;          // Error code
  readonly statusCode: number;    // HTTP status code
  readonly details?: unknown;     // Additional error details
  traceId?: string;              // Trace ID for debugging
}
```

### Methods

#### `withTraceId(traceId: string): this`
เพิ่ม trace ID เพื่อช่วยในการ debug

```typescript
const error = new CommonFailures.ValidationFail('Invalid data');
error.withTraceId('trace-123');
```

#### `toDataResult(): unknown`
ดึงค่า dataResult จาก details (ถ้ามี)

```typescript
const error = new CommonFailures.ValidationFail('Invalid data', {
  dataResult: { submittedData: { email: 'invalid' } }
});

console.log(error.toDataResult());
// { submittedData: { email: 'invalid' } }
```

#### `toResponse<T>(dataResult?: T): DataResponse<T>`
แปลงเป็น DataResponse object

```typescript
const error = new CommonFailures.NotFoundFail('User not found');
const response = error.toResponse({ attemptedId: '123' });

console.log(response);
// {
//   statusCode: 404,
//   isSuccess: false,
//   codeResult: 'NOT_FOUND',
//   message: 'User not found',
//   dataResult: { attemptedId: '123' }
// }
```

#### `toJSON(): object`
สำหรับ logging systems (Winston, Pino, Bunyan)

```typescript
const error = new CommonFailures.InternalFail('Database error');
console.log(JSON.stringify(error)); // ใช้ toJSON() โดยอัตโนมัติ
```

### Creating Custom Failures

```typescript
import { BaseFailure } from '@inh-lib/common';

class BusinessLogicFail extends BaseFailure {
  constructor(message?: string, details?: unknown) {
    super(
      'BUSINESS_LOGIC_ERROR',
      message || 'Business logic validation failed',
      422,
      details
    );
  }
}

// Usage
const error = new BusinessLogicFail('Insufficient balance', {
  currentBalance: 100,
  requestedAmount: 150
});
```

## CommonFailures

Pre-built failure classes สำหรับกรณีการใช้งานทั่วไป

### Available Failures

| Class | Code | Status | Default Message |
|-------|------|---------|-----------------|
| `ParseFail` | PARSE_FAIL | 422 | Failed to parse request data |
| `ValidationFail` | VALIDATION_FAIL | 422 | Validation failed |
| `GetFail` | GET_FAIL | 400 | Failed to retrieve data |
| `CreateFail` | CREATE_FAIL | 400 | Failed to create resource |
| `UpdateFail` | UPDATE_FAIL | 400 | Failed to update resource |
| `DeleteFail` | DELETE_FAIL | 400 | Failed to delete resource |
| `NotFoundFail` | NOT_FOUND | 404 | Resource not found |
| `UnauthorizedFail` | UNAUTHORIZED | 401 | Unauthorized access |
| `ForbiddenFail` | FORBIDDEN | 403 | Access forbidden |
| `ConflictFail` | CONFLICT | 409 | Resource conflict |
| `InternalFail` | INTERNAL_ERROR | 500 | Internal server error |
| `ServiceUnavailableFail` | SERVICE_UNAVAILABLE | 503 | Service temporarily unavailable |
| `BadRequestFail` | BAD_REQUEST | 400 | Bad request |

### Usage Examples

```typescript
import { CommonFailures } from '@inh-lib/common';

// Basic usage
const validationError = new CommonFailures.ValidationFail();
const notFoundError = new CommonFailures.NotFoundFail('User');
const internalError = new CommonFailures.InternalFail('Database connection failed');

// With custom message and details
const detailedError = new CommonFailures.ValidationFail(
  'Invalid user data',
  {
    fields: ['email', 'password'],
    values: { email: 'invalid-email', password: '' }
  }
);

// Grouped usage (alternative syntax)
const error = new CommonFailures.ParseFail('JSON parse error');
```

### Real-world Examples

#### User Management

```typescript
// Registration validation
export async function registerUser(userData: any) {
  if (!userData.email) {
    throw new CommonFailures.ValidationFail('Email is required');
  }
  
  if (!userData.email.includes('@')) {
    throw new CommonFailures.ValidationFail('Invalid email format');
  }
  
  const existingUser = await findUserByEmail(userData.email);
  if (existingUser) {
    throw new CommonFailures.ConflictFail('Email already registered');
  }
  
  try {
    return await createUser(userData);
  } catch (error) {
    throw new CommonFailures.CreateFail('Failed to create user account');
  }
}

// Login validation
export async function loginUser(email: string, password: string) {
  if (!email || !password) {
    throw new CommonFailures.ValidationFail('Email and password are required');
  }
  
  const user = await findUserByEmail(email);
  if (!user) {
    throw new CommonFailures.UnauthorizedFail('Invalid credentials');
  }
  
  const isValidPassword = await verifyPassword(password, user.passwordHash);
  if (!isValidPassword) {
    throw new CommonFailures.UnauthorizedFail('Invalid credentials');
  }
  
  return user;
}
```

#### API Data Retrieval

```typescript
export async function getUserById(id: string) {
  if (!id) {
    throw new CommonFailures.ValidationFail('User ID is required');
  }
  
  try {
    const user = await userRepository.findById(id);
    if (!user) {
      throw new CommonFailures.NotFoundFail(`User with ID ${id}`);
    }
    return user;
  } catch (error) {
    if (error instanceof CommonFailures.NotFoundFail) {
      throw error; // Re-throw known errors
    }
    throw new CommonFailures.GetFail('Failed to retrieve user data');
  }
}
```

## HttpStatusCode

HTTP status code constants และ utility functions

### Constants

```typescript
import { HttpStatusCode } from '@inh-lib/common';

// Success codes
HttpStatusCode.OK                    // 200
HttpStatusCode.CREATED               // 201
HttpStatusCode.ACCEPTED              // 202
HttpStatusCode.NO_CONTENT            // 204

// Client error codes
HttpStatusCode.BAD_REQUEST           // 400
HttpStatusCode.UNAUTHORIZED          // 401
HttpStatusCode.FORBIDDEN             // 403
HttpStatusCode.NOT_FOUND             // 404
HttpStatusCode.CONFLICT              // 409
HttpStatusCode.UNPROCESSABLE_ENTITY  // 422

// Server error codes
HttpStatusCode.INTERNAL_SERVER_ERROR // 500
HttpStatusCode.SERVICE_UNAVAILABLE   // 503
```

### Utility Functions

#### `getStatusCodeName(code: HttpStatusCodeValue): string`
ดึงชื่อ constant จาก status code value

```typescript
import { getStatusCodeName, HttpStatusCode } from '@inh-lib/common';

console.log(getStatusCodeName(200)); // "OK"
console.log(getStatusCodeName(404)); // "NOT_FOUND"
console.log(getStatusCodeName(999)); // "UNKNOWN"
```

#### `createStatusInfo(key: HttpStatusCodeKey): StatusCodeInfo`
สร้าง status info object

```typescript
import { createStatusInfo } from '@inh-lib/common';

const info = createStatusInfo('CREATED');
console.log(info);
// {
//   statusCode: 201,
//   codeResult: "CREATED"
// }
```

#### `isSuccessStatus(code: HttpStatusCodeValue): boolean`
ตรวจสอบว่าเป็น success status code หรือไม่

```typescript
import { isSuccessStatus, HttpStatusCode } from '@inh-lib/common';

console.log(isSuccessStatus(200)); // true
console.log(isSuccessStatus(201)); // true
console.log(isSuccessStatus(400)); // false
console.log(isSuccessStatus(500)); // false
```

### Usage with ResponseBuilder

```typescript
import { ResponseBuilder, HttpStatusCode } from '@inh-lib/common';

// Generic response method
const response = ResponseBuilder.respond(
  HttpStatusCode.ACCEPTED,
  { jobId: '123' },
  'Job submitted for processing'
);

console.log(response);
// {
//   statusCode: 202,
//   isSuccess: true,
//   codeResult: "ACCEPTED",
//   message: "Job submitted for processing",
//   dataResult: { jobId: '123' }
// }
```

## ResponseBuilder

Helper class สำหรับสร้าง HTTP responses ที่สม่ำเสมอ

### Success Response Methods

#### `respond<T>(statusCode, data, message?, traceId?): DataResponse<T>`
Generic response method

```typescript
import { ResponseBuilder, HttpStatusCode } from '@inh-lib/common';

const response = ResponseBuilder.respond(
  HttpStatusCode.OK,
  { users: [] },
  'Users retrieved successfully',
  'trace-123'
);
```

#### `success<T>(data, message?, traceId?): DataResponse<T>`
200 OK response

```typescript
const response = ResponseBuilder.success(
  { id: 1, name: 'John' },
  'User found'
);
```

#### `created<T>(data, message?, traceId?): DataResponse<T>`
201 Created response

```typescript
const response = ResponseBuilder.created(
  { id: 1, name: 'John' },
  'User created successfully'
);
```

#### `accepted<T>(data, message?, traceId?): DataResponse<T>`
202 Accepted response (สำหรับ async operations)

```typescript
const response = ResponseBuilder.accepted(
  { jobId: 'job-123' },
  'Request accepted for processing'
);
```

#### `noContent(message?, traceId?): DataResponse<null>`
204 No Content response

```typescript
const response = ResponseBuilder.noContent('Resource deleted successfully');
```

#### `partialContent<T>(data, message?, traceId?): DataResponse<T>`
206 Partial Content response

```typescript
const response = ResponseBuilder.partialContent(
  { users: [], page: 1, hasMore: true },
  'Partial user list'
);
```

### Error Response Methods

#### `error<T>(failure, dataResult?): DataResponse<T>`
สร้าง error response จาก BaseFailure

```typescript
const failure = new CommonFailures.ValidationFail('Invalid email');
const response = ResponseBuilder.error(failure);
```

#### `fromError<T>(error, traceId?, dataResult?): DataResponse<T>`
สร้าง error response จาก unknown error

```typescript
try {
  // Some operation
} catch (error) {
  const response = ResponseBuilder.fromError(error, 'trace-123');
  return res.status(response.statusCode).json(response);
}
```

### Express.js Integration

```typescript
import { Request, Response } from 'express';
import { ResponseBuilder, CommonFailures } from '@inh-lib/common';

// Success response
app.get('/users/:id', async (req: Request, res: Response) => {
  try {
    const user = await getUserById(req.params.id);
    const response = ResponseBuilder.success(user, 'User retrieved successfully');
    return res.status(response.statusCode).json(response);
  } catch (error) {
    const response = ResponseBuilder.fromError(error);
    return res.status(response.statusCode).json(response);
  }
});

// Created response
app.post('/users', async (req: Request, res: Response) => {
  try {
    const user = await createUser(req.body);
    const response = ResponseBuilder.created(user, 'User created successfully');
    return res.status(response.statusCode).json(response);
  } catch (error) {
    const response = ResponseBuilder.fromError(error);
    return res.status(response.statusCode).json(response);
  }
});

// No content response
app.delete('/users/:id', async (req: Request, res: Response) => {
  try {
    await deleteUser(req.params.id);
    const response = ResponseBuilder.noContent('User deleted successfully');
    return res.status(response.statusCode).json(response);
  } catch (error) {
    const response = ResponseBuilder.fromError(error);
    return res.status(response.statusCode).json(response);
  }
});
```

## Result Integration

Failure Feature ทำงานร่วมกับ Result pattern อย่างไร

### Helper Functions

#### `failureToResult<T>(failure: BaseFailure): Result<T, BaseFailure>`
แปลง Failure เป็น Result

```typescript
import { failureToResult, CommonFailures } from '@inh-lib/common';

const validateEmail = (email: string): Result<string, BaseFailure> => {
  if (!email || !email.includes('@')) {
    return failureToResult(
      new CommonFailures.ValidationFail('Invalid email format')
    );
  }
  return Result.ok(email);
};
```

#### `resultToResponse<T, E>(result, options?): DataResponse<T | E | null>`
แปลง Result เป็น DataResponse

```typescript
import { resultToResponse } from '@inh-lib/common';

const result = validateEmail('user@example.com');

const response = resultToResponse(result, {
  successMessage: 'Email validated successfully',
  traceId: 'validation-001'
});
```

### Chain Operations

```typescript
const processUser = (userData: any): Result<User, BaseFailure> => {
  return Result.ok(userData)
    .chain(data => validateName(data.name))
    .chain(name => validateEmail(userData.email).map(() => name))
    .chain(name => createUser({ name, email: userData.email }));
};

// Usage
const result = processUser({ name: 'John', email: 'john@example.com' });
const response = resultToResponse(result, {
  successMessage: 'User processed successfully',
  errorDataResult: userData,
  traceId: 'process-user-001'
});
```

### Async Operations

```typescript
const fetchAndValidateUser = async (id: string): Promise<Result<User, BaseFailure>> => {
  const userResult = await fetchUser(id);
  
  return userResult.chain(user => validateUser(user));
};

// Usage
const result = await fetchAndValidateUser('123');
const response = resultToResponse(result, {
  successMessage: 'User fetched and validated',
  traceId: 'fetch-validate-001'
});
```

## Advanced Usage

### Custom Error Details

```typescript
// Validation error with field details
const validationError = new CommonFailures.ValidationFail(
  'Multiple validation errors',
  {
    fields: {
      email: ['Required', 'Must be valid email'],
      password: ['Required', 'Must be at least 8 characters']
    },
    submittedData: { email: '', password: '123' }
  }
);

// Business logic error with context
const businessError = new CommonFailures.ConflictFail(
  'Insufficient funds',
  {
    accountBalance: 100,
    requestedAmount: 150,
    currency: 'USD',
    accountId: 'acc-123'
  }
);
```

### Trace ID Management

```typescript
// Middleware สำหรับเพิ่ม trace ID
const traceMiddleware = (req: Request, res: Response, next: NextFunction) => {
  req.traceId = `trace-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  next();
};

// ใช้ trace ID ใน error handling
app.get('/users/:id', async (req: Request, res: Response) => {
  try {
    const user = await getUserById(req.params.id);
    const response = ResponseBuilder.success(user, 'User found', req.traceId);
    return res.json(response);
  } catch (error) {
    if (error instanceof BaseFailure) {
      error.withTraceId(req.traceId);
    }
    const response = ResponseBuilder.fromError(error, req.traceId);
    return res.status(response.statusCode).json(response);
  }
});
```

### Batch Operations

```typescript
interface BatchResult<T> {
  successes: T[];
  failures: Array<{
    index: number;
    error: BaseFailure;
    originalItem: unknown;
  }>;
}

const processBatch = async <T>(
  items: unknown[],
  processor: (item: unknown) => Promise<T>
): Promise<BatchResult<T>> => {
  const results = await Promise.allSettled(
    items.map(processor)
  );
  
  const successes: T[] = [];
  const failures: BatchResult<T>['failures'] = [];
  
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      successes.push(result.value);
    } else {
      const error = result.reason instanceof BaseFailure 
        ? result.reason 
        : new CommonFailures.InternalFail('Unknown error');
      
      failures.push({
        index,
        error,
        originalItem: items[index]
      });
    }
  });
  
  return { successes, failures };
};
```

### Error Aggregation

```typescript
class AggregatedFailure extends BaseFailure {
  constructor(errors: BaseFailure[]) {
    const message = `Multiple errors occurred: ${errors.length} error(s)`;
    super(
      'AGGREGATED_ERROR',
      message,
      400,
      {
        errors: errors.map(e => ({
          code: e.code,
          message: e.message,
          details: e.details
        })),
        count: errors.length
      }
    );
  }
}

// Usage
const errors = [
  new CommonFailures.ValidationFail('Invalid email'),
  new CommonFailures.ValidationFail('Invalid phone number')
];

const aggregatedError = new AggregatedFailure(errors);
```

## Best Practices

### 1. Use Appropriate Failure Types

```typescript
// ✅ Good: Use specific failure types
throw new CommonFailures.NotFoundFail('User not found');
throw new CommonFailures.ValidationFail('Invalid email format');

// ❌ Avoid: Using generic errors
throw new Error('Something went wrong');
```

### 2. Include Meaningful Details

```typescript
// ✅ Good: Include helpful context
throw new CommonFailures.ValidationFail('Invalid user data', {
  fields: ['email', 'age'],
  values: { email: 'invalid', age: -5 },
  rules: { email: 'valid email format', age: 'positive number' }
});

// ❌ Avoid: Minimal context
throw new CommonFailures.ValidationFail('Invalid data');
```

### 3. Use Trace IDs Consistently

```typescript
// ✅ Good: Include trace ID for debugging
const processRequest = async (data: any, traceId: string) => {
  try {
    return await processData(data);
  } catch (error) {
    if (error instanceof BaseFailure) {
      error.withTraceId(traceId);
    }
    throw error;
  }
};
```

### 4. Handle Unknown Errors Gracefully

```typescript
// ✅ Good: Convert unknown errors to structured format
const handleError = (error: unknown, traceId?: string) => {
  if (error instanceof BaseFailure) {
    return ResponseBuilder.error(error);
  }
  
  return ResponseBuilder.fromError(error, traceId);
};
```

### 5. Create Domain-Specific Failures

```typescript
// ✅ Good: Create specific failure types for your domain
class PaymentFailure extends BaseFailure {
  constructor(reason: string, details?: unknown) {
    super('PAYMENT_FAILED', reason, 402, details);
  }
}

class AccountLockFailure extends BaseFailure {
  constructor(accountId: string, reason: string) {
    super(
      'ACCOUNT_LOCKED',
      `Account ${accountId} is locked: ${reason}`,
      423,
      { accountId, reason }
    );
  }
}
```

### 6. Use Result Pattern for Complex Operations

```typescript
// ✅ Good: Use Result pattern for operations that might fail
const validateAndCreateUser = (userData: any): Result<User, BaseFailure> => {
  return Result.ok(userData)
    .chain(validateUserData)
    .chain(checkEmailUniqueness)
    .chain(createUserRecord);
};
```

## Testing

### Unit Testing Failures

```typescript
import { CommonFailures, ResponseBuilder } from '@inh-lib/common';

describe('CommonFailures', () => {
  it('should create ValidationFail with correct properties', () => {
    const error = new CommonFailures.ValidationFail('Invalid email');
    
    expect(error.code).toBe('VALIDATION_FAIL');
    expect(error.message).toBe('Invalid email');
    expect(error.statusCode).toBe(422);
    expect(error instanceof Error).toBe(true);
  });
  
  it('should support trace ID', () => {
    const error = new CommonFailures.NotFoundFail('User not found');
    error.withTraceId('trace-123');
    
    expect(error.traceId).toBe('trace-123');
  });
  
  it('should convert to response correctly', () => {
    const error = new CommonFailures.ConflictFail('Email exists');
    const response = error.toResponse({ email: 'test@example.com' });
    
    expect(response).toEqual({
      statusCode: 409,
      isSuccess: false,
      codeResult: 'CONFLICT',
      message: 'Email exists',
      dataResult: { email: 'test@example.com' },
      traceId: undefined
    });
  });
});
```

### Testing ResponseBuilder

```typescript
describe('ResponseBuilder', () => {
  it('should create success response', () => {
    const response = ResponseBuilder.success({ id: 1 }, 'Success');
    
    expect(response).toEqual({
      statusCode: 200,
      isSuccess: true,
      codeResult: 'SUCCESS',
      message: 'Success',
      dataResult: { id: 1 },
      traceId: undefined
    });
  });
  
  it('should handle unknown errors', () => {
    const unknownError = new Error('Something went wrong');
    const response = ResponseBuilder.fromError(unknownError, 'trace-123');
    
    expect(response.statusCode).toBe(500);
    expect(response.isSuccess).toBe(false);
    expect(response.traceId).toBe('trace-123');
  });
});
```

### Integration Testing

```typescript
describe('Error handling integration', () => {
  it('should handle complete error flow', async () => {
    const mockRequest = { body: { email: 'invalid-email' } };
    const mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    
    await userController.createUser(mockRequest, mockResponse);
    
    expect(mockResponse.status).toHaveBeenCalledWith(422);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 422,
        isSuccess: false,
        codeResult: 'VALIDATION_FAIL'
      })
    );
  });
});
```

## Common Patterns

### 1. API Error Handling Pattern

```typescript
const apiErrorHandler = (error: unknown, req: Request, res: Response) => {
  console.error('API Error:', error);
  
  const traceId = req.headers['x-trace-id'] as string || generateTraceId();
  
  const response = ResponseBuilder.fromError(error, traceId);
  
  // Log error details
  if (response.statusCode >= 500) {
    logger.error('Server error', { error, traceId });
  } else {
    logger.warn('Client error', { error, traceId });
  }
  
  return res.status(response.statusCode).json(response);
};
```

### 2. Validation Pattern

```typescript
const validateRequired = (value: any, fieldName: string): Result<any, BaseFailure> => {
  if (value === undefined || value === null || value === '') {
    return failureToResult(
      new CommonFailures.ValidationFail(`${fieldName} is required`)
    );
  }
  return Result.ok(value);
};

const validateEmail = (email: string): Result<string, BaseFailure> => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return failureToResult(
      new CommonFailures.ValidationFail('Invalid email format')
    );
  }
  return Result.ok(email);
};

// Combined validation
const validateUserInput = (input: any): Result<ValidatedUser, BaseFailure> => {
  return Result.combine([
    validateRequired(input.name, 'name'),
    validateRequired(input.email, 'email').chain(validateEmail),
    validateRequired(input.age, 'age')
  ]).map(([name, email, age]) => ({ name, email, age }));
};
```

### 3. Resource Management Pattern

```typescript
class ResourceManager {
  async getResource(id: string): Promise<Resource> {
    const resource = await this.repository.findById(id);
    if (!resource) {
      throw new CommonFailures.NotFoundFail(`Resource ${id} not found`);
    }
    return resource;
  }
  
  async createResource(data: CreateResourceData): Promise<Resource> {
    try {
      return await this.repository.create(data);
    } catch (error) {
      if (error.code === 'DUPLICATE_KEY') {
        throw new CommonFailures.ConflictFail('Resource already exists');
      }
      throw new CommonFailures.CreateFail('Failed to create resource');
    }
  }
  
  async updateResource(id: string, data: UpdateResourceData): Promise<Resource> {
    const existing = await this.getResource(id); // May throw NotFoundFail
    
    try {
      return await this.repository.update(id, data);
    } catch (error) {
      throw new CommonFailures.UpdateFail('Failed to update resource');
    }
  }
}
```

### 4. Service Layer Pattern

```typescript
class UserService {
  async registerUser(userData: RegisterUserData): Promise<Result<User, BaseFailure>> {
    return Result.ok(userData)
      .chain(this.validateUserData)
      .chain(this.checkEmailUniqueness)
      .chainAsync(this.createUserAccount)
      .chainAsync(this.sendWelcomeEmail);
  }
  
  private validateUserData = (data: RegisterUserData): Result<RegisterUserData, BaseFailure> => {
    // Validation logic
    if (!data.email) {
      return failureToResult(new CommonFailures.ValidationFail('Email is required'));
    }
    return Result.ok(data);
  };
  
  private checkEmailUniqueness = async (data: RegisterUserData): Promise<Result<RegisterUserData, BaseFailure>> => {
    const existing = await this.userRepository.findByEmail(data.email);
    if (existing) {
      return failureToResult(new CommonFailures.ConflictFail('Email already registered'));
    }
    return Result.ok(data);
  };
}
```

## Troubleshooting

### Common Issues

#### 1. instanceof ไม่ทำงาน

```typescript
// ❌ Problem: instanceof returns false
if (error instanceof BaseFailure) {
  // This might not work in some cases
}

// ✅ Solution: Check error properties
if (error && typeof error === 'object' && 'code' in error && 'statusCode' in error) {
  // Handle as BaseFailure
}
```

#### 2. Error Stack Traces หาย

```typescript
// ✅ Solution: Preserve stack trace
class CustomFailure extends BaseFailure {
  constructor(message: string) {
    super('CUSTOM_ERROR', message, 400);
    
    // Preserve original stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, CustomFailure);
    }
  }
}
```

#### 3. JSON Serialization Issues

```typescript
// ❌ Problem: Circular references or non-serializable data
const error = new CommonFailures.ValidationFail('Error', {
  circularRef: someObjectWithCircularRef
});

// ✅ Solution: Clean data before adding to details
const cleanDetails = {
  field: 'email',
  value: userData.email,
  // Avoid circular references
};

const error = new CommonFailures.ValidationFail('Error', cleanDetails);
```

#### 4. Async Error Handling

```typescript
// ❌ Problem: Unhandled promise rejections
const processAsync = async () => {
  throw new CommonFailures.InternalFail('Async error');
};

processAsync(); // Unhandled rejection

// ✅ Solution: Always handle async errors
const processAsync = async () => {
  try {
    // async operations
  } catch (error) {
    const response = ResponseBuilder.fromError(error);
    // Handle appropriately
  }
};
```

### Debugging Tips

#### 1. Enable Detailed Logging

```typescript
const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  )
});

// Log failures with full context
const handleError = (error: unknown) => {
  if (error instanceof BaseFailure) {
    logger.error('Application error', {
      code: error.code,
      message: error.message,
      statusCode: error.statusCode,
      details: error.details,
      traceId: error.traceId,
      stack: error.stack
    });
  }
};
```

#### 2. Trace ID Correlation

```typescript
// Generate consistent trace IDs
const generateTraceId = () => {
  return `${Date.now()}-${process.pid}-${Math.random().toString(36).substr(2, 9)}`;
};

// Use trace ID throughout request lifecycle
const middleware = (req: Request, res: Response, next: NextFunction) => {
  req.traceId = req.headers['x-trace-id'] as string || generateTraceId();
  res.setHeader('x-trace-id', req.traceId);
  next();
};
```

#### 3. Error Context Preservation

```typescript
// Preserve original error context
const wrapError = (originalError: unknown, context: string): BaseFailure => {
  if (originalError instanceof BaseFailure) {
    // Add context to existing failure
    const newDetails = {
      ...originalError.details,
      context,
      wrappedAt: new Date().toISOString()
    };
    
    const wrapped = new (originalError.constructor as any)(
      originalError.message,
      newDetails
    );
    
    if (originalError.traceId) {
      wrapped.withTraceId(originalError.traceId);
    }
    
    return wrapped;
  }
  
  return new CommonFailures.InternalFail(
    `Error in ${context}`,
    { originalError, context }
  );
};
```

---

## Summary

Failure Feature ให้เครื่องมือที่ครบถ้วนสำหรับการจัดการ errors อย่างมีประสิทธิภาพ:

- **BaseFailure**: Foundation สำหรับ custom error types
- **CommonFailures**: Pre-built errors สำหรับกรณีทั่วไป
- **HttpStatusCode**: HTTP status constants และ utilities  
- **ResponseBuilder**: Helper สำหรับสร้าง consistent responses
- **Result Integration**: ทำงานร่วมกับ Result pattern

ใช้ Failure Feature เพื่อสร้างระบบ error handling ที่มีความสม่ำเสมอ, debuggable และ maintainable ในแอปพลิเคชันของคุณ