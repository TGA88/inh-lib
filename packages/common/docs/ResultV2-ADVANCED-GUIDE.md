# ResultV2 Advanced Usage Guide

## 📋 สารบัญ
1. [Advanced Patterns](#advanced-patterns)
2. [Performance Optimization](#performance-optimization)
3. [Testing Strategies](#testing-strategies)
4. [Integration Patterns](#integration-patterns)
5. [Migration from Result V1](#migration-from-result-v1)
6. [Common Pitfalls](#common-pitfalls)

## 🚀 Advanced Patterns

### 1. 🏗️ Builder Pattern with Result

```typescript
interface UserBuilder {
  name?: string;
  email?: string;
  age?: number;
}

interface ValidationError {
  field: string;
  message: string;
}

class UserCreator {
  private builder: UserBuilder = {};

  setName(name: string): Result<UserCreator, ValidationError> {
    if (!name || name.trim().length === 0) {
      return Result.fail({ field: 'name', message: 'Name cannot be empty' });
    }
    this.builder.name = name.trim();
    return Result.ok(this);
  }

  setEmail(email: string): Result<UserCreator, ValidationError> {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return Result.fail({ field: 'email', message: 'Invalid email format' });
    }
    this.builder.email = email;
    return Result.ok(this);
  }

  setAge(age: number): Result<UserCreator, ValidationError> {
    if (age < 0 || age > 150) {
      return Result.fail({ field: 'age', message: 'Age must be between 0 and 150' });
    }
    this.builder.age = age;
    return Result.ok(this);
  }

  build(): Result<User, ValidationError> {
    if (!this.builder.name) {
      return Result.fail({ field: 'name', message: 'Name is required' });
    }
    if (!this.builder.email) {
      return Result.fail({ field: 'email', message: 'Email is required' });
    }
    if (this.builder.age === undefined) {
      return Result.fail({ field: 'age', message: 'Age is required' });
    }

    return Result.ok({
      id: Date.now().toString(),
      name: this.builder.name,
      email: this.builder.email,
      age: this.builder.age
    });
  }
}

// การใช้งาน
const createUser = (userData: Partial<User>) => {
  const creator = new UserCreator();
  
  return Result.ok(creator)
    .chain(c => userData.name ? c.setName(userData.name) : Result.ok(c))
    .chain(c => userData.email ? c.setEmail(userData.email) : Result.ok(c))
    .chain(c => userData.age !== undefined ? c.setAge(userData.age) : Result.ok(c))
    .chain(c => c.build());
};
```

### 2. 🎯 Strategy Pattern with Result

```typescript
interface PaymentProvider {
  name: string;
  process(amount: number): Promise<Result<PaymentResult, PaymentError>>;
}

interface PaymentResult {
  transactionId: string;
  amount: number;
  status: 'success' | 'pending';
}

interface PaymentError {
  code: string;
  message: string;
  provider: string;
}

class CreditCardProvider implements PaymentProvider {
  name = 'CreditCard';

  async process(amount: number): Promise<Result<PaymentResult, PaymentError>> {
    if (amount > 10000) {
      return Result.fail({
        code: 'AMOUNT_EXCEEDED',
        message: 'Amount exceeds credit limit',
        provider: this.name
      });
    }

    return Result.ok({
      transactionId: `cc_${Date.now()}`,
      amount,
      status: 'success' as const
    });
  }
}

class PayPalProvider implements PaymentProvider {
  name = 'PayPal';

  async process(amount: number): Promise<Result<PaymentResult, PaymentError>> {
    // Simulate PayPal processing
    return Result.ok({
      transactionId: `pp_${Date.now()}`,
      amount,
      status: 'pending' as const
    });
  }
}

class PaymentProcessor {
  private providers: PaymentProvider[] = [
    new CreditCardProvider(),
    new PayPalProvider()
  ];

  async processPayment(amount: number): Promise<Result<PaymentResult, PaymentError[]>> {
    const attempts = await Promise.all(
      this.providers.map(provider => provider.process(amount))
    );

    return Result.firstSuccess(attempts);
  }
}
```

### 3. 🔄 Retry Pattern with Result

```typescript
interface RetryConfig {
  maxAttempts: number;
  delayMs: number;
  backoffMultiplier: number;
}

const withRetry = async <T, F>(
  operation: () => Promise<Result<T, F>>,
  config: RetryConfig,
  shouldRetry: (error: F) => boolean = () => true
): Promise<Result<T, F>> => {
  let lastResult: Result<T, F>;
  let delay = config.delayMs;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    lastResult = await operation();

    if (lastResult.isSuccess) {
      return lastResult;
    }

    if (attempt === config.maxAttempts || !shouldRetry(lastResult.errorValue())) {
      break;
    }

    // Wait before next attempt
    await new Promise(resolve => setTimeout(resolve, delay));
    delay *= config.backoffMultiplier;
  }

  return lastResult!;
};

// การใช้งาน
const fetchWithRetry = async (url: string) => {
  return withRetry(
    () => Result.fromAsync(
      () => fetch(url).then(res => res.json()),
      error => ({ type: 'NETWORK_ERROR', message: error.message })
    ),
    {
      maxAttempts: 3,
      delayMs: 1000,
      backoffMultiplier: 2
    },
    error => error.type === 'NETWORK_ERROR' // Only retry network errors
  );
};
```

### 4. 📊 Pipeline Pattern with Metrics

```typescript
interface PipelineMetrics {
  stepName: string;
  duration: number;
  success: boolean;
  error?: string;
}

class MetricsPipeline<T, F> {
  private metrics: PipelineMetrics[] = [];

  constructor(private initialValue: T) {}

  step<U>(
    name: string,
    operation: (value: T) => Result<U, F>
  ): MetricsPipeline<U, F> {
    const startTime = Date.now();
    
    try {
      const result = operation(this.initialValue);
      const duration = Date.now() - startTime;

      if (result.isSuccess) {
        this.metrics.push({
          stepName: name,
          duration,
          success: true
        });
        return new MetricsPipeline(result.getValue()).copyMetrics(this.metrics);
      } else {
        this.metrics.push({
          stepName: name,
          duration,
          success: false,
          error: String(result.errorValue())
        });
        return new MetricsPipeline(result as any).copyMetrics(this.metrics);
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      this.metrics.push({
        stepName: name,
        duration,
        success: false,
        error: String(error)
      });
      throw error;
    }
  }

  async stepAsync<U>(
    name: string,
    operation: (value: T) => Promise<Result<U, F>>
  ): Promise<MetricsPipeline<U, F>> {
    const startTime = Date.now();
    
    try {
      const result = await operation(this.initialValue);
      const duration = Date.now() - startTime;

      if (result.isSuccess) {
        this.metrics.push({
          stepName: name,
          duration,
          success: true
        });
        return new MetricsPipeline(result.getValue()).copyMetrics(this.metrics);
      } else {
        this.metrics.push({
          stepName: name,
          duration,
          success: false,
          error: String(result.errorValue())
        });
        return new MetricsPipeline(result as any).copyMetrics(this.metrics);
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      this.metrics.push({
        stepName: name,
        duration,
        success: false,
        error: String(error)
      });
      throw error;
    }
  }

  getResult(): { value: T; metrics: PipelineMetrics[] } {
    return {
      value: this.initialValue,
      metrics: [...this.metrics]
    };
  }

  private copyMetrics(metrics: PipelineMetrics[]): MetricsPipeline<T, F> {
    this.metrics = [...metrics];
    return this;
  }
}

// การใช้งาน
const processDataWithMetrics = async (input: string) => {
  const pipeline = new MetricsPipeline(input)
    .step('validate', data => validateInput(data))
    .step('sanitize', data => sanitizeInput(data))
    await pipeline.stepAsync('enrich', data => enrichData(data));

  const { value, metrics } = pipeline.getResult();
  
  console.log('Pipeline metrics:', metrics);
  return value;
};
```

## ⚡ Performance Optimization

### 1. 🎯 Lazy Evaluation

```typescript
class LazyResult<T, F> {
  private _computed: boolean = false;
  private _result: Result<T, F> | undefined;

  constructor(private computation: () => Result<T, F>) {}

  get result(): Result<T, F> {
    if (!this._computed) {
      this._result = this.computation();
      this._computed = true;
    }
    return this._result!;
  }

  map<U>(fn: (value: T) => U): LazyResult<U, F> {
    return new LazyResult(() => this.result.map(fn));
  }

  chain<U>(fn: (value: T) => Result<U, F>): LazyResult<U, F> {
    return new LazyResult(() => this.result.chain(fn));
  }
}

// การใช้งาน
const createLazyComputation = (input: string) => {
  return new LazyResult(() => {
    console.log('Computing...'); // จะ log เมื่อ access เท่านั้น
    return Result.ok(input.toUpperCase());
  });
};

const lazy = createLazyComputation('hello')
  .map(s => s + '!')
  .map(s => s.repeat(2));

// การคำนวณเกิดขึ้นเมื่อ access result
console.log(lazy.result.getValue()); // "HELLO!HELLO!"
```

### 2. 🔄 Memoization

```typescript
const memoize = <T, F>(
  fn: (key: string) => Result<T, F>,
  maxSize: number = 100
): ((key: string) => Result<T, F>) => {
  const cache = new Map<string, Result<T, F>>();

  return (key: string): Result<T, F> => {
    if (cache.has(key)) {
      return cache.get(key)!;
    }

    const result = fn(key);
    
    if (cache.size >= maxSize) {
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
    }
    
    cache.set(key, result);
    return result;
  };
};

// การใช้งาน
const expensiveComputation = memoize((input: string): Result<string, string> => {
  console.log('Computing for:', input);
  // Simulate expensive operation
  return Result.ok(input.toUpperCase());
});

console.log(expensiveComputation('hello').getValue()); // Computing for: hello, HELLO
console.log(expensiveComputation('hello').getValue()); // HELLO (from cache)
```

### 3. 🏊‍♂️ Batch Processing

```typescript
interface BatchProcessor<T, R, F> {
  process(items: T[]): Promise<Result<R[], F>>;
  batchSize: number;
}

const createBatchProcessor = <T, R, F>(
  processor: (items: T[]) => Promise<Result<R[], F>>,
  batchSize: number = 10
): BatchProcessor<T, R, F> => ({
  batchSize,
  async process(items: T[]): Promise<Result<R[], F>> {
    const batches: T[][] = [];
    
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }

    const results = await Promise.all(
      batches.map(batch => processor(batch))
    );

    return sequence(results).map(batches => batches.flat());
  }
});

// การใช้งาน
const userProcessor = createBatchProcessor(
  async (userIds: string[]): Promise<Result<User[], string>> => {
    // Process batch of users
    return Result.fromAsync(
      () => fetchUsersFromDB(userIds),
      error => `Batch processing failed: ${error}`
    );
  },
  5 // Process 5 users at a time
);
```

## 🧪 Testing Strategies

### 1. 🎭 Test Helpers

```typescript
// Test utilities
export const TestHelpers = {
  // สร้าง successful Result สำหรับ testing
  mockSuccess: <T>(value: T) => Result.ok<T, never>(value),
  
  // สร้าง failed Result สำหรับ testing
  mockFailure: <F>(error: F) => Result.fail<never, F>(error),

  // ตรวจสอบว่า Result เป็น success และมีค่าตามที่คาดหวัง
  expectSuccess: <T>(result: Result<T, unknown>, expectedValue: T) => {
    expect(result.isSuccess).toBe(true);
    expect(result.getValue()).toEqual(expectedValue);
  },

  // ตรวจสอบว่า Result เป็น failure และมี error ตามที่คาดหวัง
  expectFailure: <F>(result: Result<unknown, F>, expectedError: F) => {
    expect(result.isFailure).toBe(true);
    expect(result.errorValue()).toEqual(expectedError);
  },

  // สร้าง mock function ที่คืน Result
  mockResultFunction: <T, F>(
    results: Array<Result<T, F>>
  ): jest.MockedFunction<() => Result<T, F>> => {
    const mock = jest.fn();
    results.forEach((result, index) => {
      mock.mockReturnValueOnce(result);
    });
    return mock;
  },

  // สร้าง async mock function ที่คืน Result
  mockAsyncResultFunction: <T, F>(
    results: Array<Result<T, F>>
  ): jest.MockedFunction<() => Promise<Result<T, F>>> => {
    const mock = jest.fn();
    results.forEach((result, index) => {
      mock.mockResolvedValueOnce(result);
    });
    return mock;
  }
};

// การใช้งานใน tests
describe('UserService', () => {
  it('should process user successfully', () => {
    const mockUser: User = { id: '1', name: 'John', email: 'john@test.com', age: 25 };
    const result = processUser(mockUser);
    
    TestHelpers.expectSuccess(result, mockUser);
  });

  it('should handle validation errors', () => {
    const invalidUser: Partial<User> = { name: '' };
    const result = validateUser(invalidUser);
    
    TestHelpers.expectFailure(result, {
      field: 'name',
      message: 'Name cannot be empty'
    });
  });

  it('should chain operations correctly', async () => {
    const mockFetch = TestHelpers.mockAsyncResultFunction([
      TestHelpers.mockSuccess({ id: '1', name: 'John' }),
      TestHelpers.mockSuccess({ id: '1', name: 'John', processed: true })
    ]);

    const result = await processUserChain('1', mockFetch);
    
    TestHelpers.expectSuccess(result, { id: '1', name: 'John', processed: true });
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
```

### 2. 🏗️ Property-Based Testing

```typescript
import fc from 'fast-check';

describe('Result Laws', () => {
  // Left Identity Law: Result.ok(a).chain(f) === f(a)
  it('should satisfy left identity law', () => {
    fc.assert(fc.property(
      fc.string(),
      (value) => {
        const f = (x: string) => Result.ok(x.toUpperCase());
        const left = Result.ok(value).chain(f);
        const right = f(value);
        
        expect(left.getValue()).toEqual(right.getValue());
      }
    ));
  });

  // Right Identity Law: m.chain(Result.ok) === m
  it('should satisfy right identity law', () => {
    fc.assert(fc.property(
      fc.string(),
      (value) => {
        const m = Result.ok(value);
        const chained = m.chain(Result.ok);
        
        expect(chained.getValue()).toEqual(m.getValue());
      }
    ));
  });

  // Associativity Law: m.chain(f).chain(g) === m.chain(x => f(x).chain(g))
  it('should satisfy associativity law', () => {
    fc.assert(fc.property(
      fc.string(),
      (value) => {
        const f = (x: string) => Result.ok(x.toUpperCase());
        const g = (x: string) => Result.ok(x + '!');
        
        const m = Result.ok(value);
        const left = m.chain(f).chain(g);
        const right = m.chain(x => f(x).chain(g));
        
        expect(left.getValue()).toEqual(right.getValue());
      }
    ));
  });

  // Map composition: result.map(f).map(g) === result.map(x => g(f(x)))
  it('should satisfy map composition law', () => {
    fc.assert(fc.property(
      fc.string(),
      (value) => {
        const f = (x: string) => x.toUpperCase();
        const g = (x: string) => x + '!';
        
        const result = Result.ok(value);
        const left = result.map(f).map(g);
        const right = result.map(x => g(f(x)));
        
        expect(left.getValue()).toEqual(right.getValue());
      }
    ));
  });
});
```

## 🔗 Integration Patterns

### 1. 🌐 Express.js Middleware

```typescript
import { Request, Response, NextFunction } from 'express';

// Middleware สำหรับแปลง Result เป็น HTTP response
const resultMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const originalJson = res.json;
  
  res.json = function(data: unknown) {
    if (data && typeof data === 'object' && 'isSuccess' in data) {
      const result = data as Result<unknown, unknown>;
      return result.toHttpResponse(this);
    }
    return originalJson.call(this, data);
  };
  
  next();
};

// Controller wrapper
const asyncHandler = (
  fn: (req: Request, res: Response) => Promise<Result<unknown, unknown>>
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await fn(req, res);
      res.json(result);
    } catch (error) {
      next(error);
    }
  };
};

// การใช้งาน
app.use(resultMiddleware);

app.get('/users/:id', asyncHandler(async (req, res) => {
  return await getUserById(req.params.id);
}));
```

### 2. 🎣 React Hooks

```typescript
import { useState, useEffect, useMemo } from 'react';

interface UseResultState<T, F> {
  data?: T;
  error?: F;
  loading: boolean;
  isSuccess: boolean;
  isFailure: boolean;
}

const useResult = <T, F>(
  resultPromise: Promise<Result<T, F>>,
  deps: React.DependencyList = []
): UseResultState<T, F> => {
  const [state, setState] = useState<UseResultState<T, F>>({
    loading: true,
    isSuccess: false,
    isFailure: false
  });

  useEffect(() => {
    let cancelled = false;
    
    setState({
      loading: true,
      isSuccess: false,
      isFailure: false
    });

    resultPromise.then(result => {
      if (!cancelled) {
        if (result.isSuccess) {
          setState({
            data: result.getValue(),
            loading: false,
            isSuccess: true,
            isFailure: false
          });
        } else {
          setState({
            error: result.errorValue(),
            loading: false,
            isSuccess: false,
            isFailure: true
          });
        }
      }
    });

    return () => {
      cancelled = true;
    };
  }, deps);

  return state;
};

// การใช้งาน
const UserProfile: React.FC<{ userId: string }> = ({ userId }) => {
  const { data: user, error, loading, isSuccess } = useResult(
    fetchUser(userId),
    [userId]
  );

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (isSuccess && user) return <div>Hello, {user.name}!</div>;
  
  return null;
};
```

## 🔄 Migration from Result V1

### การเปลี่ยนแปลงหลัก

```typescript
// V1 - Error type เป็น string เสมอ
const oldResult: Result<User, string> = Result.fail('User not found');

// V2 - Error type เป็น generic
const newResult: Result<User, ApiError> = Result.fail({
  code: 'USER_NOT_FOUND',
  message: 'User not found'
});

// V1 - Static methods
Result.ok<string>('value');
Result.fail<string>('error');

// V2 - เหมือนเดิม แต่รองรับ error types มากขึ้น
Result.ok<string, ApiError>('value');
Result.fail<string, ApiError>(apiError);
```

### Migration Steps

1. **แทนที่ string errors ด้วย typed errors**
```typescript
// Before
interface UserService {
  getUser(id: string): Promise<Result<User, string>>;
}

// After  
interface UserError {
  code: 'NOT_FOUND' | 'INVALID_ID' | 'SERVER_ERROR';
  message: string;
}

interface UserService {
  getUser(id: string): Promise<Result<User, UserError>>;
}
```

2. **อัปเดต error handling**
```typescript
// Before
result.match(
  user => console.log(user.name),
  error => console.log(error) // string
);

// After
result.match(
  user => console.log(user.name),
  error => console.log(`${error.code}: ${error.message}`) // typed error
);
```

3. **ใช้ utility functions ใหม่**
```typescript
// Before - ไม่มี
const results = [result1, result2, result3];
// Manual combining...

// After
const combined = Result.combine([result1, result2, result3]);
const sequenced = sequence(results);
const firstSuccess = Result.firstSuccess(results);
```

## ⚠️ Common Pitfalls

### 1. ❌ Nested Results
```typescript
// ❌ ผิด - สร้าง Result<Result<T>>
const nested = result.map(value => anotherOperation(value)); // Result<Result<U>>

// ✅ ถูก - ใช้ chain
const flattened = result.chain(value => anotherOperation(value)); // Result<U>
```

### 2. ❌ Exception Handling
```typescript
// ❌ ผิด - ใช้ try-catch กับ Result
try {
  const value = result.getValue(); // อาจ throw
  return processValue(value);
} catch (error) {
  return handleError(error);
}

// ✅ ถูก - ใช้ match หรือ type guards
return result.match(
  value => processValue(value),
  error => handleError(error)
);
```

### 3. ❌ Async/Await กับ Result
```typescript
// ❌ ผิด - ลืมใช้ chainAsync
const result = await someResult
  .chain(async value => {
    const processed = await processAsync(value);
    return Result.ok(processed);
  }); // ❌ จะได้ Promise<Result> ไม่ใช่ Result

// ✅ ถูก - ใช้ chainAsync
const result = await someResult
  .chainAsync(async value => {
    const processed = await processAsync(value);
    return Result.ok(processed);
  });
```

### 4. ❌ Error Type Inconsistency
```typescript
// ❌ ผิด - ใช้ error types ที่ไม่สอดคล้อง
const step1 = (): Result<string, string> => Result.fail('error1');
const step2 = (): Result<number, ApiError> => Result.fail(apiError);

// ไม่สามารถ chain ได้เพราะ error types ต่างกัน
// step1().chain(value => step2()); // ❌ Type error

// ✅ ถูก - ใช้ error types ที่สอดคล้อง หรือ map error
const step1Fixed = (): Result<string, ApiError> => 
  Result.fail({ code: 'STEP1_ERROR', message: 'error1' });

step1Fixed().chain(value => step2()); // ✅ ใช้ได้
```

### 5. ❌ Side Effects ในที่ไม่เหมาะสม
```typescript
// ❌ ผิด - ทำ side effects ใน map
const result = input
  .map(value => {
    console.log('Processing:', value); // ❌ Side effect
    saveToDatabase(value); // ❌ Side effect
    return value.toUpperCase();
  });

// ✅ ถูก - ใช้ tap สำหรับ side effects
const result = input
  .tap(value => console.log('Processing:', value)) // ✅ Side effect
  .tap(value => saveToDatabase(value)) // ✅ Side effect  
  .map(value => value.toUpperCase()); // ✅ Pure transformation
```

---

**🎯 สรุป:** ResultV2 เป็นเครื่องมือที่ทรงพลังสำหรับ error handling แต่ต้องใช้อย่างถูกต้องเพื่อให้ได้ประโยชน์สูงสุด
