# ResponseBuilder Usage Examples

## 📋 สารบัญ
1. [ภาพรวม](#ภาพรวม)
2. [การใช้งานพื้นฐาน](#การใช้งานพื้นฐาน)
3. [การใช้งานกับ Result](#การใช้งานกับ-result)
4. [Express.js Controllers](#expressjs-controllers)
5. [Error Handling Patterns](#error-handling-patterns)
6. [Batch Processing](#batch-processing)
7. [Async Chain Operations](#async-chain-operations)
8. [Best Practices](#best-practices)

## 🎯 ภาพรวม

**ResponseBuilder** เป็น utility class ที่ช่วยในการสร้าง standardized API responses โดยรองรับ:
- ✅ Success responses (200, 201)
- ❌ Error responses จาก BaseFailure
- 🔄 แปลง Result เป็น DataResponse
- 🏷️ TraceId สำหรับ tracking

## 🚀 การใช้งานพื้นฐาน

### 1. Success Responses

```typescript
import { ResponseBuilder } from './ResponseBuilder';

interface User {
  id: string;
  name: string;
  email: string;
}

const user: User = {
  id: '1',
  name: 'John Doe',
  email: 'john@example.com'
};

// ✅ Success Response (200)
const successResponse = ResponseBuilder.success(
  user, 
  'User retrieved successfully',
  'trace-001'
);

console.log(successResponse);
/*
Output:
{
  statusCode: 200,
  isSuccess: true,
  traceId: 'trace-001',
  codeResult: 'SUCCESS',
  message: 'User retrieved successfully',
  dataResult: {
    id: '1',
    name: 'John Doe',
    email: 'john@example.com'
  }
}
*/

// ✅ Created Response (201)
const createdResponse = ResponseBuilder.created(
  user,
  'User created successfully',
  'trace-002'
);

console.log(createdResponse);
/*
Output:
{
  statusCode: 201,
  isSuccess: true,
  traceId: 'trace-002',
  codeResult: 'SUCCESS',
  message: 'User created successfully',
  dataResult: { ... }
}
*/
```

### 2. Error Responses

```typescript
import { CommonFailures } from './Failure';

// ✅ Error จาก BaseFailure
const validationError = new CommonFailures.ValidationFail(
  'Email is required',
  { field: 'email' }
);

const errorResponse = ResponseBuilder.error(validationError);

console.log(errorResponse);
/*
Output:
{
  statusCode: 400,
  isSuccess: false,
  codeResult: 'VALIDATION_FAIL',
  message: 'Email is required',
  dataResult: null,
  errorDetail: { field: 'email' }
}
*/

// ✅ Error จาก unknown error
const unknownError = new Error('Database connection failed');
const errorFromUnknown = ResponseBuilder.fromError(unknownError, 'trace-003');

console.log(errorFromUnknown);
/*
Output:
{
  statusCode: 500,
  isSuccess: false,
  traceId: 'trace-003',
  codeResult: 'INTERNAL_FAIL',
  message: 'Database connection failed',
  dataResult: null,
  errorDetail: { originalError: 'Error' }
}
*/
```

## 🔗 การใช้งานกับ Result

### 1. Basic Result to Response

```typescript
import { Result } from '../ResultV2';
import { resultToResponse } from './ResponseBuilder';

interface UserData {
  id: string;
  name: string;
  email: string;
}

// Mock validation function
const validateUser = (data: unknown): Result<UserData, BaseFailure> => {
  if (!data || typeof data !== 'object') {
    return Result.fail(new CommonFailures.ValidationFail('Invalid user data'));
  }

  const user = data as Partial<UserData>;
  if (!user.name || !user.email) {
    return Result.fail(new CommonFailures.ValidationFail('Name and email are required'));
  }

  return Result.ok(user as UserData);
};

// การใช้งาน
const processUserData = (inputData: unknown, traceId?: string) => {
  const result = validateUser(inputData);
  
  return resultToResponse(result, {
    successMessage: 'User data validated successfully',
    traceId
  });
};

// ✅ Success case
const validData = { id: '1', name: 'John', email: 'john@example.com' };
const successCase = processUserData(validData, 'trace-success-001');

// ❌ Error case  
const invalidData = { name: 'John' }; // missing email
const errorCase = processUserData(invalidData, 'trace-error-001');
```

### 2. Complex Result Chain

```typescript
const processUserWithChain = (userData: unknown, traceId?: string) => {
  const result = Result.ok(userData)
    .chain(data => validateUser(data))
    .chain(user => {
      // Additional validation
      if (user.email.includes('@')) {
        return Result.ok(user);
      }
      return Result.fail(new CommonFailures.ValidationFail('Invalid email format'));
    })
    .map(user => ({
      ...user,
      id: `user_${Date.now()}`,
      createdAt: new Date()
    }));

  return resultToResponse(result, {
    successMessage: 'User processed and created successfully',
    errorDataResult: userData,
    traceId
  });
};

// การทดสอบ
const testData = { name: 'Jane', email: 'jane@example.com' };
const chainResult = processUserWithChain(testData, 'chain-001');
```

## 🌐 Express.js Controllers

### 1. GET Controller

```typescript
import { Request, Response } from 'express';

interface GetUserRequest extends Request {
  params: { id: string };
}

// ✅ GET User Controller
export const getUserController = async (req: GetUserRequest, res: Response) => {
  const userId = req.params.id;
  const traceId = `get_user_${Date.now()}`;

  const result = await Result.fromAsync(
    async () => {
      // Simulate database call
      if (!userId) {
        throw new Error('User ID is required');
      }
      
      if (userId === 'notfound') {
        throw new Error('User not found');
      }

      // Mock user data
      return {
        id: userId,
        name: 'John Doe',
        email: 'john@example.com',
        createdAt: new Date()
      };
    },
    (error: unknown) => {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (errorMessage.includes('not found')) {
        return new CommonFailures.NotFoundFail(errorMessage);
      }
      return new CommonFailures.GetFail(errorMessage);
    }
  );

  const response = resultToResponse(result, {
    successMessage: 'User retrieved successfully',
    traceId
  });

  return res.status(response.statusCode).json(response);
};

// การใช้งาน
// GET /users/123 -> Success
// GET /users/notfound -> 404 Error
// GET /users/ -> 400 Error
```

### 2. POST Controller

```typescript
interface CreateUserRequest extends Request {
  body: {
    name?: string;
    email?: string;
    age?: number;
  };
}

// ✅ POST User Controller
export const createUserController = async (req: CreateUserRequest, res: Response) => {
  const userData = req.body;
  const traceId = `create_user_${Date.now()}`;

  const result = Result.from(
    () => {
      // Validation
      if (!userData.name || !userData.email) {
        throw new Error('Name and email are required');
      }

      if (userData.age && userData.age < 0) {
        throw new Error('Age must be positive');
      }

      // Create user
      return {
        id: `user_${Date.now()}`,
        name: userData.name,
        email: userData.email,
        age: userData.age || null,
        createdAt: new Date()
      };
    },
    (error: unknown) => {
      const errorMessage = error instanceof Error ? error.message : 'Validation failed';
      return new CommonFailures.ValidationFail(errorMessage);
    }
  );

  const response = resultToResponse(result, {
    successMessage: 'User created successfully',
    traceId
  });

  return res.status(response.statusCode).json(response);
};
```

### 3. PUT Controller

```typescript
interface UpdateUserRequest extends Request {
  params: { id: string };
  body: Partial<{
    name: string;
    email: string;
    age: number;
  }>;
}

// ✅ PUT User Controller
export const updateUserController = async (req: UpdateUserRequest, res: Response) => {
  const userId = req.params.id;
  const updateData = req.body;
  const traceId = `update_user_${Date.now()}`;

  const result = await Result.ok({ userId, updateData })
    .chain(async ({ userId, updateData }) => {
      // Fetch existing user
      return Result.fromAsync(
        async () => {
          if (userId === 'notfound') {
            throw new Error('User not found');
          }
          return {
            id: userId,
            name: 'John Doe',
            email: 'john@example.com',
            age: 25
          };
        },
        (error: unknown) => new CommonFailures.NotFoundFail(
          error instanceof Error ? error.message : 'User not found'
        )
      );
    })
    .then(result => result.map(existingUser => {
      // Apply updates
      return {
        ...existingUser,
        ...updateData,
        updatedAt: new Date()
      };
    }));

  const response = resultToResponse(result, {
    successMessage: 'User updated successfully',
    traceId
  });

  return res.status(response.statusCode).json(response);
};
```

## ⚠️ Error Handling Patterns

### 1. Different Error Types

```typescript
const handleDifferentErrors = (errorType: string, traceId?: string) => {
  try {
    switch (errorType) {
      case 'validation':
        return Result.fail(new CommonFailures.ValidationFail('Invalid input data'));
      
      case 'notfound':
        return Result.fail(new CommonFailures.NotFoundFail('Resource not found'));
      
      case 'unauthorized':
        return Result.fail(new CommonFailures.UnauthorizedFail('Access denied'));
      
      case 'internal':
        throw new Error('Internal server error');
      
      default:
        return Result.ok('Success');
    }
  } catch (error) {
    return Result.fail(
      new CommonFailures.InternalFail(
        error instanceof Error ? error.message : 'Unknown error'
      )
    );
  }
};

// การทดสอบ error types ต่างๆ
const testErrorHandling = () => {
  const errors = ['validation', 'notfound', 'unauthorized', 'internal', 'success'];
  
  return errors.map(errorType => {
    const result = handleDifferentErrors(errorType, `trace-${errorType}`);
    return resultToResponse(result, {
      successMessage: `Handled ${errorType} successfully`,
      traceId: `trace-${errorType}`
    });
  });
};
```

### 2. Error Recovery Patterns

```typescript
const withErrorRecovery = async (operation: () => Promise<unknown>) => {
  const traceId = `recovery_${Date.now()}`;

  const result = await Result.fromAsync(
    operation,
    (error: unknown) => {
      if (error instanceof Error) {
        // Try to categorize the error
        if (error.message.includes('network')) {
          return new CommonFailures.GetFail('Network error occurred');
        }
        if (error.message.includes('timeout')) {
          return new CommonFailures.GetFail('Request timeout');
        }
        if (error.message.includes('not found')) {
          return new CommonFailures.NotFoundFail('Resource not found');
        }
      }
      
      return new CommonFailures.InternalFail('Unexpected error occurred');
    }
  );

  return resultToResponse(result, {
    successMessage: 'Operation completed successfully',
    errorDataResult: { attempted: true, timestamp: new Date() },
    traceId
  });
};

// การใช้งาน
const testRecovery = async () => {
  // Simulate different types of errors
  const networkError = () => Promise.reject(new Error('network connection failed'));
  const timeoutError = () => Promise.reject(new Error('timeout exceeded'));
  const notFoundError = () => Promise.reject(new Error('resource not found'));
  const success = () => Promise.resolve({ data: 'success' });

  const results = await Promise.all([
    withErrorRecovery(networkError),
    withErrorRecovery(timeoutError),
    withErrorRecovery(notFoundError),
    withErrorRecovery(success)
  ]);

  return results;
};
```

## 📊 Batch Processing

### 1. Processing Multiple Items

```typescript
interface BatchItem {
  id: string;
  data: string;
}

interface BatchResult {
  processed: BatchItem[];
  failed: string[];
  summary: {
    total: number;
    success: number;
    failed: number;
  };
}

const processItem = async (item: BatchItem): Promise<Result<BatchItem, BaseFailure>> => {
  return Result.fromAsync(
    async () => {
      if (!item.id) {
        throw new Error('ID is required');
      }
      
      if (item.data === 'error') {
        throw new Error('Processing failed for this item');
      }
      
      // Simulate processing
      await new Promise(resolve => setTimeout(resolve, 10));
      
      return {
        ...item,
        data: `processed_${item.data}`,
        processedAt: new Date()
      };
    },
    (error: unknown) => new CommonFailures.ValidationFail(
      error instanceof Error ? error.message : 'Processing failed',
      { itemId: item.id }
    )
  );
};

const processBatch = async (items: BatchItem[], traceId?: string) => {
  const results = await Promise.all(
    items.map(item => processItem(item))
  );

  const processed: BatchItem[] = [];
  const failed: string[] = [];

  results.forEach((result, index) => {
    if (result.isSuccess) {
      processed.push(result.getValue());
    } else {
      failed.push(items[index].id);
    }
  });

  const batchResult: BatchResult = {
    processed,
    failed,
    summary: {
      total: items.length,
      success: processed.length,
      failed: failed.length
    }
  };

  // ถ้ามี item ที่ล้มเหลว ให้ return error
  if (failed.length > 0) {
    const errorResult = Result.fail(
      new CommonFailures.ValidationFail(
        `${failed.length} out of ${items.length} items failed to process`,
        { failedItems: failed, batchResult }
      )
    );

    return resultToResponse(errorResult, {
      errorDataResult: batchResult,
      traceId
    });
  }

  // ทุก item สำเร็จ
  const successResult = Result.ok(batchResult);
  return resultToResponse(successResult, {
    successMessage: `Successfully processed ${items.length} items`,
    traceId
  });
};

// การทดสอบ batch processing
const testBatchProcessing = async () => {
  const successItems: BatchItem[] = [
    { id: '1', data: 'item1' },
    { id: '2', data: 'item2' },
    { id: '3', data: 'item3' }
  ];

  const mixedItems: BatchItem[] = [
    { id: '1', data: 'item1' },
    { id: '2', data: 'error' }, // This will fail
    { id: '3', data: 'item3' }
  ];

  const successBatch = await processBatch(successItems, 'batch-success');
  const mixedBatch = await processBatch(mixedItems, 'batch-mixed');

  return { successBatch, mixedBatch };
};
```

## 🔄 Async Chain Operations

### 1. User Profile Processing

```typescript
interface UserProfile {
  id: string;
  name: string;
  email: string;
  preferences?: Record<string, unknown>;
  permissions?: string[];
  lastLogin?: Date;
}

// Mock async functions
const fetchUser = async (id: string): Promise<Result<UserProfile, BaseFailure>> => {
  return Result.fromAsync(
    async () => {
      if (id === 'invalid') {
        throw new Error('User not found');
      }
      
      // Simulate database call
      await new Promise(resolve => setTimeout(resolve, 50));
      
      return {
        id,
        name: 'John Doe',
        email: 'john@example.com'
      };
    },
    (error: unknown) => new CommonFailures.NotFoundFail(
      error instanceof Error ? error.message : 'User not found'
    )
  );
};

const enrichWithPreferences = async (user: UserProfile): Promise<Result<UserProfile, BaseFailure>> => {
  return Result.fromAsync(
    async () => {
      // Simulate preferences fetch
      await new Promise(resolve => setTimeout(resolve, 30));
      
      const preferences = {
        theme: 'dark',
        language: 'en',
        notifications: true
      };
      
      return { ...user, preferences };
    },
    () => new CommonFailures.GetFail('Failed to fetch user preferences')
  );
};

const enrichWithPermissions = async (user: UserProfile): Promise<Result<UserProfile, BaseFailure>> => {
  return Result.fromAsync(
    async () => {
      // Simulate permissions fetch
      await new Promise(resolve => setTimeout(resolve, 20));
      
      const permissions = ['read', 'write', 'delete'];
      return { ...user, permissions };
    },
    () => new CommonFailures.GetFail('Failed to fetch user permissions')
  );
};

const updateLastLogin = async (user: UserProfile): Promise<Result<UserProfile, BaseFailure>> => {
  return Result.fromAsync(
    async () => {
      // Simulate database update
      await new Promise(resolve => setTimeout(resolve, 40));
      
      return { ...user, lastLogin: new Date() };
    },
    () => new CommonFailures.UpdateFail('Failed to update last login')
  );
};

// ✅ Complete async chain
const getFullUserProfile = async (userId: string, traceId?: string) => {
  let result = await fetchUser(userId);
  result = await result.chainAsync(enrichWithPreferences);
  result = await result.chainAsync(enrichWithPermissions);
  result = await result.chainAsync(updateLastLogin);

  return resultToResponse(result, {
    successMessage: 'User profile retrieved and updated successfully',
    traceId
  });
};

// การทดสอบ async chain
const testAsyncChain = async () => {
  const successProfile = await getFullUserProfile('user123', 'profile-success');
  const errorProfile = await getFullUserProfile('invalid', 'profile-error');
  
  return { successProfile, errorProfile };
};
```

### 2. Multi-step Data Processing

```typescript
interface ProcessingSteps {
  validate: (data: unknown) => Result<ProcessingData, BaseFailure>;
  transform: (data: ProcessingData) => Promise<Result<ProcessingData, BaseFailure>>;
  enrich: (data: ProcessingData) => Promise<Result<ProcessingData, BaseFailure>>;
  save: (data: ProcessingData) => Promise<Result<ProcessingData, BaseFailure>>;
}

interface ProcessingData {
  id: string;
  originalData: unknown;
  validatedData?: unknown;
  transformedData?: unknown;
  enrichedData?: unknown;
  savedAt?: Date;
}

const createProcessingPipeline = (): ProcessingSteps => ({
  validate: (data: unknown) => {
    if (!data || typeof data !== 'object') {
      return Result.fail(new CommonFailures.ValidationFail('Invalid input data'));
    }
    
    return Result.ok({
      id: `process_${Date.now()}`,
      originalData: data,
      validatedData: data
    });
  },

  transform: async (data: ProcessingData) => {
    return Result.fromAsync(
      async () => {
        await new Promise(resolve => setTimeout(resolve, 30));
        
        return {
          ...data,
          transformedData: {
            ...data.validatedData,
            transformed: true,
            transformedAt: new Date()
          }
        };
      },
      () => new CommonFailures.ValidationFail('Data transformation failed')
    );
  },

  enrich: async (data: ProcessingData) => {
    return Result.fromAsync(
      async () => {
        await new Promise(resolve => setTimeout(resolve, 40));
        
        return {
          ...data,
          enrichedData: {
            ...data.transformedData,
            metadata: {
              processedBy: 'system',
              version: '1.0.0',
              enrichedAt: new Date()
            }
          }
        };
      },
      () => new CommonFailures.ValidationFail('Data enrichment failed')
    );
  },

  save: async (data: ProcessingData) => {
    return Result.fromAsync(
      async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        
        return {
          ...data,
          savedAt: new Date()
        };
      },
      () => new CommonFailures.CreateFail('Failed to save processed data')
    );
  }
});

const processDataPipeline = async (inputData: unknown, traceId?: string) => {
  const pipeline = createProcessingPipeline();
  
  let result = pipeline.validate(inputData);
  result = await result.chainAsync(pipeline.transform);
  result = await result.chainAsync(pipeline.enrich);
  result = await result.chainAsync(pipeline.save);

  return resultToResponse(result, {
    successMessage: 'Data processing pipeline completed successfully',
    errorDataResult: { inputData, pipeline: 'failed' },
    traceId
  });
};

// การทดสอบ pipeline
const testDataPipeline = async () => {
  const validData = { name: 'test', value: 123 };
  const invalidData = null;
  
  const successPipeline = await processDataPipeline(validData, 'pipeline-success');
  const errorPipeline = await processDataPipeline(invalidData, 'pipeline-error');
  
  return { successPipeline, errorPipeline };
};
```

## 🎯 Best Practices

### 1. ✅ Consistent Error Handling

```typescript
// ✅ Good: Consistent error types
const handleUserOperation = (operation: string, data: unknown, traceId?: string) => {
  const result = Result.from(
    () => {
      switch (operation) {
        case 'create':
          if (!data) throw new Error('Data is required for creation');
          return { action: 'created', data };
        
        case 'update':
          if (!data) throw new Error('Data is required for update');
          return { action: 'updated', data };
        
        default:
          throw new Error(`Unknown operation: ${operation}`);
      }
    },
    (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Operation failed';
      
      if (message.includes('required')) {
        return new CommonFailures.ValidationFail(message);
      }
      
      if (message.includes('Unknown')) {
        return new CommonFailures.BadRequestFail(message);
      }
      
      return new CommonFailures.InternalFail(message);
    }
  );

  return resultToResponse(result, {
    successMessage: `${operation} operation completed successfully`,
    traceId
  });
};
```

### 2. ✅ Structured Logging with TraceId

```typescript
// ✅ Good: Structured logging with traceId
const createUserWithLogging = async (userData: unknown, traceId?: string) => {
  const startTime = Date.now();
  
  const result = await Result.ok(userData)
    .tap(() => console.log(`[${traceId}] Starting user creation`))
    .chain(data => {
      console.log(`[${traceId}] Validating user data`);
      return validateUser(data);
    })
    .then(result => result.chainAsync(async (user) => {
      console.log(`[${traceId}] Saving user to database`);
      return saveUserToDatabase(user);
    }))
    .then(result => result.tap(user => {
      const duration = Date.now() - startTime;
      console.log(`[${traceId}] User created successfully in ${duration}ms`, { userId: user.id });
    }))
    .then(result => result.tapError(error => {
      const duration = Date.now() - startTime;
      console.error(`[${traceId}] User creation failed after ${duration}ms`, { error: error.message });
    }));

  return resultToResponse(result, {
    successMessage: 'User created successfully',
    traceId
  });
};
```

### 3. ✅ Type-safe Response Handling

```typescript
// ✅ Good: Type-safe response definitions
interface ApiResponse<T> {
  data?: T;
  error?: string;
  traceId?: string;
}

const handleApiResponse = <T>(
  result: Result<T, BaseFailure>,
  traceId?: string
): ApiResponse<T> => {
  const response = resultToResponse(result, { traceId });
  
  return {
    data: response.isSuccess ? response.dataResult : undefined,
    error: response.isSuccess ? undefined : response.message,
    traceId: response.traceId
  };
};

// การใช้งาน
const processApiRequest = async <T>(
  operation: () => Promise<Result<T, BaseFailure>>,
  traceId?: string
): Promise<ApiResponse<T>> => {
  try {
    const result = await operation();
    return handleApiResponse(result, traceId);
  } catch (error) {
    const errorResult = Result.fail(
      new CommonFailures.InternalFail(
        error instanceof Error ? error.message : 'Unexpected error'
      )
    );
    return handleApiResponse(errorResult, traceId);
  }
};
```

### 4. ✅ Standardized Controller Pattern

```typescript
// ✅ Good: Standardized controller pattern
interface ControllerContext {
  traceId: string;
  userId?: string;
  requestId: string;
}

type ControllerHandler<TRequest, TResponse> = (
  request: TRequest,
  context: ControllerContext
) => Promise<DataResponse<TResponse>>;

const createController = <TRequest, TResponse>(
  handler: (request: TRequest, context: ControllerContext) => Promise<Result<TResponse, BaseFailure>>
): ControllerHandler<TRequest, TResponse> => {
  return async (request: TRequest, context: ControllerContext) => {
    try {
      const result = await handler(request, context);
      return resultToResponse(result, {
        successMessage: 'Request processed successfully',
        traceId: context.traceId
      });
    } catch (error) {
      const errorResult = Result.fail(
        new CommonFailures.InternalFail(
          error instanceof Error ? error.message : 'Controller error'
        )
      );
      
      return resultToResponse(errorResult, {
        traceId: context.traceId
      });
    }
  };
};

// การใช้งาน
const getUserHandler = createController(
  async (request: { userId: string }, context: ControllerContext) => {
    return await fetchUser(request.userId)
      .tap(user => console.log(`[${context.traceId}] Retrieved user: ${user.id}`));
  }
);
```

---

## 🎉 สรุป

**ResponseBuilder** ช่วยให้การสร้าง API responses เป็นมาตรฐานและง่ายต่อการจัดการ:

### ✅ ข้อดี
- **Standardized Format** - รูปแบบ response ที่สม่ำเสมอ
- **Type Safety** - TypeScript support เต็มรูปแบบ
- **Error Handling** - จัดการ error แบบมีโครงสร้าง
- **Tracing Support** - รองรับ traceId สำหรับ debugging
- **Result Integration** - ทำงานร่วมกับ Result monad ได้ดี

### 🎯 Best Practices
1. ใช้ traceId สำหรับทุก request
2. สร้าง error types ที่ชัดเจน
3. ใช้ Result chain สำหรับ complex operations
4. Log การทำงานด้วย structured logging
5. Handle errors อย่างสม่ำเสมอ

ResponseBuilder ช่วยให้ API development มีประสิทธิภาพและเชื่อถือได้มากขึ้น! 🚀

## 🔧 Helper Functions Usage Examples

### 1. `failureToResult` Helper Function

Helper function นี้ช่วยแปลง `BaseFailure` เป็น `Result<T, BaseFailure>` เพื่อใช้ใน Result chains

```typescript
import { failureToResult, CommonFailures } from './ResponseBuilder';

// ✅ ตัวอย่างการใช้งาน failureToResult
const validateEmail = (email: string): Result<string, BaseFailure> => {
  if (!email?.includes('@')) {
    const failure = new CommonFailures.ValidationFail('Invalid email format', {
      field: 'email',
      value: email
    });
    return failureToResult<string>(failure);
  }
  return Result.ok(email);
};

const findUser = (userId: string): Result<{ id: string; name: string }, BaseFailure> => {
  if (userId === 'notfound') {
    const failure = new CommonFailures.NotFoundFail(`User with ID ${userId} not found`, {
      userId,
      resource: 'user'
    });
    return failureToResult(failure);
  }
  
  return Result.ok({ id: userId, name: 'John Doe' });
};

// ✅ การใช้ใน Result chain
const processUserRegistration = (userData: { email: string; userId: string }) => {
  return Result.ok(userData)
    .chain(data => validateEmail(data.email).map(() => data))
    .chain(data => findUser(data.userId).map(() => data))
    .map(data => ({
      ...data,
      registeredAt: new Date(),
      status: 'active'
    }));
};

// การทดสอบ
const successCase = processUserRegistration({ 
  email: 'john@example.com', 
  userId: 'user123' 
});

const emailErrorCase = processUserRegistration({ 
  email: 'invalid-email', 
  userId: 'user123' 
});

const userNotFoundCase = processUserRegistration({ 
  email: 'john@example.com', 
  userId: 'notfound' 
});
```

### 2. `resultToResponse` Helper Function

Helper function นี้แปลง `Result<T, BaseFailure>` เป็น `DataResponse<T>` พร้อม options ต่างๆ

```typescript
import { resultToResponse, ResultToResponseOptions } from './ResponseBuilder';

// ✅ Basic usage
const basicExample = () => {
  const result = Result.ok({ id: '1', name: 'John' });
  
  return resultToResponse(result, {
    successMessage: 'User retrieved successfully',
    traceId: 'trace-001'
  });
};

// ✅ Error case with custom data
const errorWithDataExample = () => {
  const failure = new CommonFailures.ValidationFail('Validation failed', {
    fields: ['name', 'email']
  });
  const result = Result.fail<never, BaseFailure>(failure);
  
  return resultToResponse(result, {
    errorDataResult: { 
      submittedData: { name: '', email: 'invalid' },
      validationRules: { name: 'required', email: 'valid email format' }
    },
    traceId: 'validation-error-001'
  });
};

// ✅ Complex validation with multiple steps
interface UserRegistrationData {
  name: string;
  email: string;
  password: string;
  age: number;
}

const validateUserRegistration = (data: Partial<UserRegistrationData>): Result<UserRegistrationData, BaseFailure> => {
  // Name validation
  if (!data.name || data.name.trim().length === 0) {
    return failureToResult(new CommonFailures.ValidationFail('Name is required'));
  }

  // Email validation
  if (!data.email?.includes('@')) {
    return failureToResult(new CommonFailures.ValidationFail('Valid email is required'));
  }

  // Password validation
  if (!data.password || data.password.length < 8) {
    return failureToResult(new CommonFailures.ValidationFail('Password must be at least 8 characters'));
  }

  // Age validation
  if (!data.age || data.age < 18) {
    return failureToResult(new CommonFailures.ValidationFail('Age must be 18 or older'));
  }

  return Result.ok(data as UserRegistrationData);
};

const registerUser = (userData: Partial<UserRegistrationData>, traceId?: string) => {
  const result = validateUserRegistration(userData)
    .map(validData => ({
      ...validData,
      id: `user_${Date.now()}`,
      createdAt: new Date()
    }));

  return resultToResponse(result, {
    successMessage: 'User registered successfully',
    errorDataResult: userData,
    traceId
  });
};

// การทดสอบ registration
const validRegistration = registerUser({
  name: 'John Doe',
  email: 'john@example.com',
  password: 'securepassword123',
  age: 25
}, 'register-success-001');

const invalidRegistration = registerUser({
  name: '',
  email: 'invalid-email',
  password: '123',
  age: 16
}, 'register-error-001');
```

### 3. Async Operations with Helper Functions

```typescript
// ✅ Async validation และการใช้ helper functions
const asyncUserProcessing = {
  // Database simulation
  checkEmailExists: async (email: string): Promise<Result<boolean, BaseFailure>> => {
    return Result.fromAsync(
      async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return email === 'exists@example.com';
      },
      () => new CommonFailures.GetFail('Database error while checking email')
    );
  },

  saveUser: async (userData: UserRegistrationData): Promise<Result<UserRegistrationData & { id: string }, BaseFailure>> => {
    return Result.fromAsync(
      async () => {
        await new Promise(resolve => setTimeout(resolve, 200));
        return {
          ...userData,
          id: `saved_${Date.now()}`
        };
      },
      () => new CommonFailures.CreateFail('Failed to save user to database')
    );
  },

  // ✅ Complete async registration flow
  processRegistration: async (userData: Partial<UserRegistrationData>, traceId?: string) => {
    const result = await validateUserRegistration(userData)
      .chainAsync(async (validData) => {
        const emailExists = await asyncUserProcessing.checkEmailExists(validData.email);
        if (emailExists.isSuccess && emailExists.getValue()) {
          return failureToResult(new CommonFailures.CreateFail('Email already exists'));
        }
        return Result.ok(validData);
      })
      .then(result => result.chainAsync(asyncUserProcessing.saveUser));

    return resultToResponse(result, {
      successMessage: 'User registration completed successfully',
      errorDataResult: userData,
      traceId
    });
  }
};

// การทดสอบ async registration
const testAsyncRegistration = async () => {
  const newUser = {
    name: 'Jane Doe',
    email: 'jane@example.com',
    password: 'newpassword123',
    age: 30
  };

  const existingUser = {
    name: 'John Doe',
    email: 'exists@example.com',
    password: 'password123',
    age: 25
  };

  const successResult = await asyncUserProcessing.processRegistration(newUser, 'async-success');
  const errorResult = await asyncUserProcessing.processRegistration(existingUser, 'async-error');
  
  return { successResult, errorResult };
};
```

### 4. Express.js Integration with Helper Functions

```typescript
// ✅ Express controller ที่ใช้ helper functions
interface ExpressController {
  // POST /users - Create user with full validation
  createUser: (req: { body: unknown }, res: { status: (code: number) => { json: (data: unknown) => void } }) => Promise<void>;
  
  // GET /users/:id - Get user with validation
  getUser: (req: { params: { id: string } }, res: { status: (code: number) => { json: (data: unknown) => void } }) => Promise<void>;
  
  // PUT /users/:id - Update user
  updateUser: (req: { params: { id: string }; body: unknown }, res: { status: (code: number) => { json: (data: unknown) => void } }) => Promise<void>;
}

const createExpressControllers = (): ExpressController => ({
  createUser: async (req, res) => {
    const userData = req.body;
    const traceId = `create-user-${Date.now()}`;

    // ใช้ helper functions ใน complex validation chain
    const result = await Result.ok(userData)
      .chain(data => {
        if (!data || typeof data !== 'object') {
          return failureToResult(new CommonFailures.ValidationFail('Request body must be an object'));
        }
        return Result.ok(data);
      })
      .chain(data => validateUserRegistration(data as Partial<UserRegistrationData>))
      .chainAsync(async (validData) => {
        // Check if email exists
        const emailCheck = await asyncUserProcessing.checkEmailExists(validData.email);
        if (emailCheck.isSuccess && emailCheck.getValue()) {
          return failureToResult(new CommonFailures.CreateFail('Email already registered'));
        }
        return Result.ok(validData);
      })
      .then(result => result.chainAsync(asyncUserProcessing.saveUser));

    // ใช้ resultToResponse เพื่อแปลงเป็น API response
    const response = resultToResponse(result, {
      successMessage: 'User created successfully',
      errorDataResult: userData,
      traceId
    });

    res.status(response.statusCode).json(response);
  },

  getUser: async (req, res) => {
    const userId = req.params.id;
    const traceId = `get-user-${Date.now()}`;

    // Validation และ fetch user
    const result = await Result.ok(userId)
      .chain(id => {
        if (!id || id.trim().length === 0) {
          return failureToResult(new CommonFailures.ValidationFail('User ID is required'));
        }
        return Result.ok(id);
      })
      .chain(findUser)
      .chainAsync(async (user) => {
        // Enrich user data
        return Result.ok({
          ...user,
          lastAccessed: new Date(),
          status: 'active'
        });
      });

    const response = resultToResponse(result, {
      successMessage: 'User retrieved successfully',
      traceId
    });

    res.status(response.statusCode).json(response);
  },

  updateUser: async (req, res) => {
    const userId = req.params.id;
    const updateData = req.body;
    const traceId = `update-user-${Date.now()}`;

    const result = await Result.ok({ userId, updateData })
      .chain(({ userId, updateData }) => {
        // Validate user ID
        if (!userId) {
          return failureToResult(new CommonFailures.ValidationFail('User ID is required'));
        }
        
        // Validate update data
        if (!updateData || typeof updateData !== 'object') {
          return failureToResult(new CommonFailures.ValidationFail('Update data must be an object'));
        }

        return Result.ok({ userId, updateData });
      })
      .chain(({ userId }) => findUser(userId)) // Check if user exists
      .chainAsync(async (existingUser) => {
        // Apply updates
        const updatedUser = {
          ...existingUser,
          ...(updateData as object),
          updatedAt: new Date()
        };

        // Simulate save
        await new Promise(resolve => setTimeout(resolve, 100));
        return Result.ok(updatedUser);
      });

    const response = resultToResponse(result, {
      successMessage: 'User updated successfully',
      errorDataResult: { userId, updateData },
      traceId
    });

    res.status(response.statusCode).json(response);
  }
});

// การใช้งาน controllers
const controllers = createExpressControllers();

// Test requests simulation
const simulateRequests = async () => {
  console.log('=== Testing Express Controllers with Helper Functions ===');

  // Mock response object
  const createMockResponse = () => ({
    status: (code: number) => ({
      json: (data: unknown) => console.log(`Status ${code}:`, JSON.stringify(data, null, 2))
    })
  });

  // Test create user
  console.log('\n1. Create User Test:');
  await controllers.createUser(
    { body: { name: 'Test User', email: 'test@example.com', password: 'password123', age: 25 } },
    createMockResponse()
  );

  // Test create user with validation error
  console.log('\n2. Create User Validation Error:');
  await controllers.createUser(
    { body: { name: '', email: 'invalid-email' } },
    createMockResponse()
  );

  // Test get user
  console.log('\n3. Get User Test:');
  await controllers.getUser(
    { params: { id: 'user123' } },
    createMockResponse()
  );

  // Test get user not found
  console.log('\n4. Get User Not Found:');
  await controllers.getUser(
    { params: { id: 'notfound' } },
    createMockResponse()
  );

  // Test update user
  console.log('\n5. Update User Test:');
  await controllers.updateUser(
    { params: { id: 'user123' }, body: { name: 'Updated Name' } },
    createMockResponse()
  );
};
```

### 5. Advanced Helper Function Patterns

```typescript
// ✅ Creating custom helper functions
const createCustomHelpers = () => {
  // Helper สำหรับ validation chains
  const validateRequired = <T>(value: T, fieldName: string): Result<T, BaseFailure> => {
    if (value === null || value === undefined || value === '') {
      return failureToResult(new CommonFailures.ValidationFail(`${fieldName} is required`));
    }
    return Result.ok(value);
  };

  const validateLength = (value: string, min: number, max: number, fieldName: string): Result<string, BaseFailure> => {
    if (value.length < min || value.length > max) {
      return failureToResult(new CommonFailures.ValidationFail(
        `${fieldName} must be between ${min} and ${max} characters`
      ));
    }
    return Result.ok(value);
  };

  const validateEmail = (email: string): Result<string, BaseFailure> => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return failureToResult(new CommonFailures.ValidationFail('Invalid email format'));
    }
    return Result.ok(email);
  };

  // Helper สำหรับสร้าง standardized responses
  const createSuccessResponse = <T>(data: T, message: string, traceId?: string) => {
    return resultToResponse(Result.ok(data), {
      successMessage: message,
      traceId
    });
  };

  const createErrorResponse = (error: BaseFailure, data?: unknown, traceId?: string) => {
    return resultToResponse(Result.fail(error), {
      errorDataResult: data,
      traceId
    });
  };

  // Complex validation helper
  const validateUserInput = (input: {
    name?: string;
    email?: string;
    password?: string;
  }): Result<{ name: string; email: string; password: string }, BaseFailure> => {
    return Result.ok(input)
      .chain(data => validateRequired(data.name, 'name').map(() => data))
      .chain(data => validateLength(data.name!, 2, 50, 'name').map(() => data))
      .chain(data => validateRequired(data.email, 'email').map(() => data))
      .chain(data => validateEmail(data.email!).map(() => data))
      .chain(data => validateRequired(data.password, 'password').map(() => data))
      .chain(data => validateLength(data.password!, 8, 100, 'password').map(() => data))
      .map(data => ({
        name: data.name!,
        email: data.email!,
        password: data.password!
      }));
  };

  return {
    validateRequired,
    validateLength,
    validateEmail,
    createSuccessResponse,
    createErrorResponse,
    validateUserInput
  };
};

// การใช้งาน custom helpers
const customHelpersExample = () => {
  const helpers = createCustomHelpers();

  // Test validation
  const validInput = {
    name: 'John Doe',
    email: 'john@example.com',
    password: 'securepassword123'
  };

  const invalidInput = {
    name: '',
    email: 'invalid-email',
    password: '123'
  };

  const validResult = helpers.validateUserInput(validInput);
  const invalidResult = helpers.validateUserInput(invalidInput);

  // Convert to responses
  const successResponse = resultToResponse(validResult, {
    successMessage: 'User input validated successfully',
    traceId: 'validation-success'
  });

  const errorResponse = resultToResponse(invalidResult, {
    errorDataResult: invalidInput,
    traceId: 'validation-error'
  });

  return { successResponse, errorResponse };
};
```

---

## 🎯 Helper Functions Best Practices

### ✅ การใช้ `failureToResult`
- ใช้เมื่อต้องการแปลง `BaseFailure` เป็น `Result` สำหรับ chaining
- เหมาะสำหรับ validation functions ที่คืน `Result`
- ช่วยให้ code สอดคล้องกับ Result pattern

### ✅ การใช้ `resultToResponse`
- ใช้เป็น final step ในการแปลง `Result` เป็น API response
- รองรับ custom success message และ error data
- จำเป็นต้องมี traceId สำหรับ tracking

### ✅ การรวมใช้ทั้งสอง Helper Functions
- `failureToResult` สำหรับสร้าง `Result` จาก errors
- `resultToResponse` สำหรับแปลงเป็น API response
- ใช้ร่วมกันใน validation chains และ controller patterns

Helper functions เหล่านี้ช่วยให้การใช้งาน ResponseBuilder มีประสิทธิภาพและสม่ำเสมอมากขึ้น! 🚀
