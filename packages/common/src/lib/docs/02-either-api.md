# Either API Guide

คู่มือการใช้งาน Either pattern และ helper functions ใน `@inh-lib/common`

## 🔧 Basic Types

```typescript
import { Either, Left, Right, left, right } from '@inh-lib/common';

// Either<L, A> = Left<L, A> | Right<L, A>
type Either<L, A> = Left<L, A> | Right<L, A>;

// Success case (Right)
const success: Either<string, number> = right(42);

// Error case (Left)  
const error: Either<string, number> = left('Something went wrong');
```

## 🔍 Type Guards

```typescript
// ตรวจสอบและ narrow types
if (result.isLeft()) {
  console.log('Error:', result.value); // type: L
} else {
  console.log('Success:', result.value); // type: A
}
```

## 🛠️ Helper Functions

### Core Helpers (จาก Either.ts)

```typescript
import { 
  left, 
  right, 
  matchEither, 
  eitherFromOperation, 
  eitherToResult 
} from '@inh-lib/common';

// 1. Basic constructors
const success = right(42);
const error = left('error message');

// 2. Pattern matching
const result = matchEither(
  someEither,
  (error) => `Error: ${error}`,
  (value) => `Success: ${value}`
);

// 3. Async operations with try-catch handling
const apiResult = await eitherFromOperation(
  async () => fetchData(),
  (error) => `API Error: ${error.message}`
);

// 4. Convert Either → Result
const resultValue = eitherToResult(someEither);
```

## 🎯 Usage Patterns

### Business Logic Validation

```typescript
const validateUser = (data: unknown): Either<string, UserData> => {
  if (typeof data !== 'object' || data === null) {
    return left('Invalid user data');
  }
  
  const user = data as Record<string, unknown>;
  
  if (typeof user.name !== 'string' || user.name.length === 0) {
    return left('Name is required');
  }
  
  if (typeof user.email !== 'string' || !user.email.includes('@')) {
    return left('Valid email is required');
  }
  
  if (typeof user.age !== 'number' || user.age < 0) {
    return left('Valid age is required');
  }
  
  return right({
    name: user.name,
    email: user.email,
    age: user.age
  });
};
```

### Database Operations

```typescript
const saveUser = async (userData: UserData): Promise<Either<string, User>> => {
  return eitherFromOperation(
    async () => {
      const result = await db.query(
        'INSERT INTO users (name, email, age) VALUES ($1, $2, $3) RETURNING *',
        [userData.name, userData.email, userData.age]
      );
      return result.rows[0] as User;
    },
    (error) => {
      if ((error as any).code === '23505') {
        return `Email ${userData.email} already exists`;
      }
      return `Database error: ${error.message}`;
    }
  );
};
```

### External API Calls

```typescript
const fetchUserProfile = async (userId: string): Promise<Either<string, UserProfile>> => {
  return eitherFromOperation(
    async () => {
      const response = await fetch(`/api/users/${userId}/profile`, {
        timeout: 5000,
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) {
        throw new Error(`API returned status ${response.status}`);
      }
      
      return response.json() as UserProfile;
    },
    (error) => {
      if (error.name === 'AbortError') {
        return 'Request timeout';
      }
      if (error.message.includes('404')) {
        return 'User profile not found';
      }
      return `API error: ${error.message}`;
    }
  );
};
```

### File Operations

```typescript
const readConfigFile = async (filePath: string): Promise<Either<string, Config>> => {
  return eitherFromOperation(
    async () => {
      const content = await fs.promises.readFile(filePath, 'utf-8');
      return JSON.parse(content) as Config;
    },
    (error) => {
      if ((error as any).code === 'ENOENT') {
        return `Config file not found: ${filePath}`;
      }
      if (error instanceof SyntaxError) {
        return `Invalid JSON in config file: ${filePath}`;
      }
      return `Failed to read config: ${error.message}`;
    }
  );
};
```

## 🔄 Chaining Operations

### Manual Chaining (Recommended)

```typescript
const processUser = async (userData: unknown): Promise<Either<string, ProcessedUser>> => {
  // Step 1: Validate
  const validationResult = validateUser(userData);
  if (validationResult.isLeft()) {
    return validationResult;
  }
  
  // Step 2: Save to database
  const saveResult = await saveUser(validationResult.value);
  if (saveResult.isLeft()) {
    return saveResult;
  }
  
  // Step 3: Fetch additional data
  const profileResult = await fetchUserProfile(saveResult.value.id);
  if (profileResult.isLeft()) {
    return profileResult;
  }
  
  // Step 4: Combine results
  return right({
    user: saveResult.value,
    profile: profileResult.value,
    processedAt: new Date()
  });
};
```

### Using matchEither for Flow Control

```typescript
const handleUserCreation = async (userData: unknown): Promise<string> => {
  const result = await processUser(userData);
  
  return matchEither(
    result,
    (error) => `Failed to create user: ${error}`,
    (processed) => `User created successfully: ${processed.user.name}`
  );
};
```

## 🎭 Layer Boundaries

### Business Logic → Service Layer

```typescript
// Business Logic (returns Either)
const validateUserAge = (age: number): Either<string, number> => {
  if (age < 13) return left('User must be at least 13 years old');
  if (age > 120) return left('Invalid age');
  return right(age);
};

// Service Layer (converts to Result)
class UserService {
  async createUser(userData: UserData): Promise<Result<User, string>> {
    const ageValidation = validateUserAge(userData.age);
    if (ageValidation.isLeft()) {
      return Result.fail(ageValidation.value);
    }
    
    const saveResult = await this.userRepository.save(userData);
    return eitherToResult(saveResult); // Convert Either → Result
  }
}
```

### Repository Implementation

```typescript
class UserRepository {
  async save(userData: UserData): Promise<Either<string, User>> {
    return eitherFromOperation(
      async () => {
        // Pure database operation
        const result = await this.db.query(
          'INSERT INTO users (name, email, age) VALUES ($1, $2, $3) RETURNING *',
          [userData.name, userData.email, userData.age]
        );
        return result.rows[0] as User;
      },
      (error) => `User save failed: ${error.message}`
    );
  }
  
  async findByEmail(email: string): Promise<Either<string, User | null>> {
    return eitherFromOperation(
      async () => {
        const result = await this.db.query(
          'SELECT * FROM users WHERE email = $1',
          [email]
        );
        return result.rows.length > 0 ? result.rows[0] as User : null;
      },
      (error) => `User lookup failed: ${error.message}`
    );
  }
}
```

## 🔧 Error Handling Patterns

### Domain-Specific Errors

```typescript
type UserValidationError = 
  | 'INVALID_NAME'
  | 'INVALID_EMAIL'
  | 'INVALID_AGE'
  | 'USER_EXISTS';

const validateUserData = (data: unknown): Either<UserValidationError, UserData> => {
  // Validation logic with specific error types
  if (!data || typeof data !== 'object') {
    return left('INVALID_NAME');
  }
  
  // ... other validations
  
  return right(validatedData);
};

// Error mapping in service layer
class UserService {
  private mapValidationError(error: UserValidationError): string {
    const messages = {
      'INVALID_NAME': 'Name is required and must be a string',
      'INVALID_EMAIL': 'Please provide a valid email address',
      'INVALID_AGE': 'Age must be a number between 0 and 150',
      'USER_EXISTS': 'A user with this email already exists'
    };
    return messages[error];
  }
}
```

### Error Recovery

```typescript
const getUserWithFallback = async (userId: string): Promise<Either<string, User>> => {
  // Try primary database
  const primaryResult = await primaryDb.getUser(userId);
  if (primaryResult.isRight()) {
    return primaryResult;
  }
  
  // Fallback to cache
  const cacheResult = await cache.getUser(userId);
  if (cacheResult.isRight()) {
    return cacheResult;
  }
  
  // Fallback to secondary database
  const secondaryResult = await secondaryDb.getUser(userId);
  if (secondaryResult.isRight()) {
    return secondaryResult;
  }
  
  // All failed
  return left(`User ${userId} not found in any source`);
};
```

## 📊 Best Practices

### ✅ DO: Use Either for Business Logic

```typescript
// ✅ Pure business functions
const calculateDiscount = (order: Order): Either<string, Discount> => {
  if (order.total < 100) {
    return left('Minimum order amount required');
  }
  
  const discountRate = order.isVipCustomer ? 0.15 : 0.10;
  return right({
    amount: order.total * discountRate,
    rate: discountRate,
    reason: order.isVipCustomer ? 'VIP_CUSTOMER' : 'STANDARD'
  });
};

// ✅ Database operations
const saveOrder = async (order: Order): Promise<Either<string, Order>> => {
  return eitherFromOperation(
    () => database.save(order),
    (error) => `Order save failed: ${error.message}`
  );
};
```

### ✅ DO: Convert at Layer Boundaries

```typescript
// ✅ Service layer converts Either → Result
class OrderService {
  async processOrder(orderData: OrderData): Promise<Result<Order, string>> {
    const discountResult = calculateDiscount(orderData);
    if (discountResult.isLeft()) {
      return Result.fail(discountResult.value);
    }
    
    const saveResult = await this.orderRepository.save(orderData);
    return eitherToResult(saveResult);
  }
}
```

### ❌ DON'T: Mix Either and Result

```typescript
// ❌ Inconsistent return types
class BadService {
  async method1(): Promise<Either<string, Data>> { /* */ }
  async method2(): Promise<Result<Data, string>> { /* */ }
  // Confusing for consumers!
}
```

### ❌ DON'T: Use Either for HTTP Responses

```typescript
// ❌ Don't return Either from controllers
const badController = async (req, res) => {
  const result = await service.doSomething();
  // Don't return Either directly to HTTP response
  return result; // Either<Error, Data>
};

// ✅ Convert to appropriate HTTP response
const goodController = async (req, res) => {
  const result = await service.doSomething(); // Result<Data, Error>
  
  if (result.isSuccess) {
    res.status(200).json({ success: true, data: result.data });
  } else {
    res.status(400).json({ success: false, error: result.error });
  }
};
```

## 🧪 Testing Either Functions

### Unit Testing

```typescript
describe('validateUser', () => {
  it('should return Right for valid user data', () => {
    const userData = { name: 'John', email: 'john@test.com', age: 25 };
    const result = validateUser(userData);
    
    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.name).toBe('John');
    }
  });
  
  it('should return Left for invalid email', () => {
    const userData = { name: 'John', email: 'invalid', age: 25 };
    const result = validateUser(userData);
    
    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value).toBe('Valid email is required');
    }
  });
});

describe('saveUser', () => {
  it('should handle database errors', async () => {
    const mockDb = {
      query: jest.fn().mockRejectedValue(new Error('Connection failed'))
    };
    
    const result = await saveUser(validUserData);
    
    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value).toContain('Database error');
    }
  });
});
```

### Integration Testing

```typescript
describe('processUser integration', () => {
  it('should handle complete user processing flow', async () => {
    const userData = { name: 'John', email: 'john@test.com', age: 25 };
    
    const result = await processUser(userData);
    
    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.user.name).toBe('John');
      expect(result.value.profile).toBeDefined();
      expect(result.value.processedAt).toBeInstanceOf(Date);
    }
  });
});
```

## 📚 Next Steps

- **[Architecture Overview](./01-architecture-overview.md)** - ทำความเข้าใจ architecture ภาพรวม
- **[Project Structure](./03-project-structure.md)** - ดูโครงสร้างโปรเจค
- **[API Service Layer](./04-api-service-layer.md)** - เรียนรู้การใช้งานใน service layer
- **[Real-world Examples](./12-real-world-examples.md)** - ดูตัวอย่างการใช้งานจริง