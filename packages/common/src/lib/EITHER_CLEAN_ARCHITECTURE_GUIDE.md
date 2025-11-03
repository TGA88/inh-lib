# Either Usage Guide: Clean Architecture

คู่มือการใช้ Either ในแอปพลิเคชันแบบ Clean Architecture โดยแยกความรับผิดชอบของแต่ละ layer อย่างชัดเจน

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Either API](#either-api)
3. [Helper Functions](#helper-functions)
4. [Business Logic Layer](#business-logic-layer)
5. [Service Layer](#service-layer)
6. [Real-world Examples](#real-world-examples)
7. [Best Practices](#best-practices)
8. [Testing](#testing)

## Architecture Overview

### Layer Structure & Principles

```
┌─────────────────────────────────────┐
│           API Endpoints             │ ← Result types only
│        (Controller Layer)           │
├─────────────────────────────────────┤
│        Service/Application          │ ← Result types only
│           Layer(Command/Query)      │ 
├─────────────────────────────────────┤
│        Domain/Core Layer            │ ← Either → Result
│   (BusinessLogic/Pure Function)     │ ← Either types only,Pure functions, no I/O
├─────────────────────────────────────┤
│        Infrastructure               │ ← try-catch → Either
│      (Database, APIs)               │ ← eitherFromOperation
└─────────────────────────────────────┘
```

### Key Rules

1. **Business Logic**: ใช้ Either เท่านั้น (pure functions)
2. **Service Layer**: Return Result เสมอ
3. **Infrastructure Layer**: ใช้ try-catch หรือ eitherFromOperation → Either
4. **Try-catch**: ใช้เฉพาะ external operations แล้วแปลงเป็น Either

## Either API

### Basic Types

```typescript
import { Either, Left, Right, left, right } from '@inh-lib/common';

// Either<L, A> = Left<L, A> | Right<L, A>
type Either<L, A> = Left<L, A> | Right<L, A>;

// Success case (Right)
const success: Either<string, number> = right(42);

// Error case (Left)  
const error: Either<string, number> = left('Something went wrong');
```

### Type Guards

```typescript
// ตรวจสอบและ narrow types
if (result.isLeft()) {
  console.log('Error:', result.value); // type: L
} else {
  console.log('Success:', result.value); // type: A
}
```

## Helper Functions

### Core Helpers (จากไฟล์ Either.ts)

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

### Custom Helper Functions (ถ้าต้องการขยาย)

```typescript
// สามารถสร้าง helper functions เพิ่มเติมได้ถ้าต้องการ
// แต่ไม่จำเป็นเพราะ Either.ts มี helper functions พื้นฐานครบแล้ว

// Chain operations (optional)
const chainEither = <L, A, B>(
  either: Either<L, A>,
  fn: (value: A) => Either<L, B>
): Either<L, B> => {
  return either.isRight() ? fn(either.value) : either;
};

// Map values (optional)
const mapEither = <L, A, B>(
  either: Either<L, A>,
  fn: (value: A) => B
): Either<L, B> => {
  return either.isRight() ? right(fn(either.value)) : either;
};

// Sequence multiple Either values (optional)
const sequenceEither = <L, A>(eithers: Either<L, A>[]): Either<L, A[]> => {
  const values: A[] = [];
  
  for (const either of eithers) {
    if (either.isLeft()) return either;
    values.push(either.value);
  }
  
  return right(values);
};
```

## Business Logic Layer

### Validation Functions (Pure Either)

```typescript
// ✅ Pure validation functions using Either
type ValidationError = 
  | 'EMPTY_NAME'
  | 'INVALID_EMAIL'
  | 'INVALID_AGE'
  | 'WEAK_PASSWORD';

const validateName = (name: string): Either<ValidationError, string> => {
  if (!name || name.trim().length === 0) {
    return left('EMPTY_NAME');
  }
  return right(name.trim());
};

const validateEmail = (email: string): Either<ValidationError, string> => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) ? right(email) : left('INVALID_EMAIL');
};

const validateUser = (userData: unknown): Either<ValidationError, ValidatedUser> => {
  if (typeof userData !== 'object' || userData === null) {
    return left('EMPTY_NAME');
  }
  
  const data = userData as Record<string, unknown>;
  
  // Manual chaining with if-checks (no chainEither needed)
  if (typeof data.name !== 'string') {
    return left('EMPTY_NAME');
  }
  const nameResult = validateName(data.name);
  if (nameResult.isLeft()) return nameResult;
  
  if (typeof data.email !== 'string') {
    return left('INVALID_EMAIL');
  }
  const emailResult = validateEmail(data.email);
  if (emailResult.isLeft()) return emailResult;
  
  return right({
    name: nameResult.value,
    email: emailResult.value,
    age: data.age as number,
    password: data.password as string
  });
};
```

### Business Calculations

```typescript
interface OrderItem {
  price: number;
  quantity: number;
}

type OrderError = 'EMPTY_ORDER' | 'INVALID_PRICE' | 'INVALID_QUANTITY';

const validateOrderItem = (item: OrderItem): Either<OrderError, OrderItem> => {
  if (item.price < 0) return left('INVALID_PRICE');
  if (item.quantity <= 0) return left('INVALID_QUANTITY');
  return right(item);
};

const calculateOrderTotal = (items: OrderItem[]): Either<OrderError, number> => {
  if (items.length === 0) return left('EMPTY_ORDER');
  
  // Validate all items manually
  for (const item of items) {
    const validationResult = validateOrderItem(item);
    if (validationResult.isLeft()) {
      return validationResult;
    }
  }
  
  // Calculate total using manual loop
  const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  return right(total);
};
```

## Service Layer

### Converting Either to Result

```typescript
import { ResultV2 as Result, eitherToResult } from '@inh-lib/common';

class UserService {
  async createUser(userData: unknown): Promise<Result<User, string>> {
    // Step 1: Validate using business logic (Either)
    const validationResult = validateUser(userData);
    if (validationResult.isLeft()) {
      return Result.fail(this.mapValidationError(validationResult.value));
    }

    // Step 2: Save with async operation handling
    const saveResult = await eitherFromOperation(
      () => this.userRepository.save(validationResult.value),
      (error) => `Failed to save user: ${error.message}`
    );

    // Step 3: Convert Either → Result
    return eitherToResult(saveResult);
  }

  async fetchUserProfile(userId: string): Promise<Result<UserProfile, string>> {
    // ใช้ eitherFromOperation สำหรับ external API calls
    const profileResult = await eitherFromOperation(
      () => this.externalAPI.fetchProfile(userId),
      (error) => `External API error: ${error.message}`
    );

    // Process result using matchEither
    return matchEither(
      profileResult,
      (error) => Result.fail(error),
      (profile) => {
        // Apply business logic transformation
        const transformResult = this.enrichProfile(profile);
        return eitherToResult(transformResult);
      }
    );
  }

  private enrichProfile(profile: ExternalProfile): Either<string, UserProfile> {
    // Pure business logic for profile enrichment
    return right({
      ...profile,
      lastUpdated: new Date(),
      isVerified: profile.email.includes('@verified.com')
    });
  }

  private mapValidationError(error: ValidationError): string {
    const messages = {
      'EMPTY_NAME': 'Name is required',
      'INVALID_EMAIL': 'Please provide a valid email',
      'INVALID_AGE': 'Age must be valid',
      'WEAK_PASSWORD': 'Password too weak'
    };
    return messages[error] || 'Validation failed';
  }
}
```

## Infrastructure Layer

### Database Operations with eitherFromOperation

```typescript
// ✅ Repository layer using eitherFromOperation
class UserRepository {
  constructor(private db: DatabaseConnection) {}

  async findById(id: string): Promise<Either<string, User | null>> {
    return eitherFromOperation(
      async () => {
        const query = 'SELECT * FROM users WHERE id = $1';
        const result = await this.db.query(query, [id]);
        return result.rows.length > 0 ? result.rows[0] as User : null;
      },
      (error) => `Database error: ${error.message}`
    );
  }

  async save(user: ValidatedUser): Promise<Either<string, User>> {
    return eitherFromOperation(
      async () => {
        const query = `
          INSERT INTO users (name, email, age, password_hash) 
          VALUES ($1, $2, $3, $4) 
          RETURNING *
        `;
        const passwordHash = await this.hashPassword(user.password);
        const result = await this.db.query(query, [
          user.name,
          user.email,
          user.age,
          passwordHash
        ]);
        return result.rows[0] as User;
      },
      (error) => {
        if ((error as any).code === '23505') {
          return `Email ${user.email} already exists`;
        }
        return `Failed to save user: ${error.message}`;
      }
    );
  }

  async findByEmail(email: string): Promise<Either<string, User | null>> {
    return eitherFromOperation(
      async () => {
        const query = 'SELECT * FROM users WHERE email = $1';
        const result = await this.db.query(query, [email]);
        return result.rows.length > 0 ? result.rows[0] as User : null;
      },
      (error) => `Database error: ${error.message}`
    );
  }

  private async hashPassword(password: string): Promise<string> {
    // This might throw, but eitherFromOperation will catch it
    return await bcrypt.hash(password, 10);
  }
}
```

### External API Integration with eitherFromOperation

```typescript
// ✅ External API service using eitherFromOperation
class ExternalAPIService {
  async fetchUserProfile(userId: string): Promise<Either<string, ExternalUserProfile>> {
    return eitherFromOperation(
      async () => {
        const response = await axios.get(`/api/external/users/${userId}`, {
          timeout: 5000,
          headers: {
            'Authorization': `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.status !== 200) {
          throw new Error(`API returned status ${response.status}`);
        }
        
        return response.data as ExternalUserProfile;
      },
      (error) => {
        if (axios.isAxiosError(error)) {
          if (error.code === 'ECONNABORTED') {
            return 'External API timeout';
          }
          if (error.response?.status === 404) {
            return 'User profile not found in external system';
          }
          if (error.response?.status === 401) {
            return 'Unauthorized access to external API';
          }
          return `External API error: ${error.message}`;
        }
        return `Unexpected error: ${error.message}`;
      }
    );
  }

  async uploadFile(file: File): Promise<Either<string, UploadResult>> {
    return eitherFromOperation(
      async () => {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await axios.post('/api/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          timeout: 30000, // 30 seconds for file upload
        });
        
        return response.data as UploadResult;
      },
      (error) => `File upload failed: ${error.message}`
    );
  }
}
```

### File System Operations with eitherFromOperation

```typescript
// ✅ File service using eitherFromOperation
class FileService {
  async readFile(filePath: string): Promise<Either<string, string>> {
    return eitherFromOperation(
      () => fs.promises.readFile(filePath, 'utf-8'),
      (error) => `Failed to read file ${filePath}: ${error.message}`
    );
  }

  async writeFile(filePath: string, content: string): Promise<Either<string, void>> {
    return eitherFromOperation(
      () => fs.promises.writeFile(filePath, content, 'utf-8'),
      (error) => `Failed to write file ${filePath}: ${error.message}`
    );
  }

  async deleteFile(filePath: string): Promise<Either<string, void>> {
    return eitherFromOperation(
      () => fs.promises.unlink(filePath),
      (error) => `Failed to delete file ${filePath}: ${error.message}`
    );
  }
}
```

### Cache Operations with eitherFromOperation

```typescript
// ✅ Cache service using eitherFromOperation
class CacheService {
  constructor(private redis: RedisClient) {}

  async get<T>(key: string): Promise<Either<string, T | null>> {
    return eitherFromOperation(
      async () => {
        const value = await this.redis.get(key);
        return value ? JSON.parse(value) as T : null;
      },
      (error) => `Cache get error for key ${key}: ${error.message}`
    );
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<Either<string, void>> {
    return eitherFromOperation(
      async () => {
        const serialized = JSON.stringify(value);
        if (ttlSeconds) {
          await this.redis.setex(key, ttlSeconds, serialized);
        } else {
          await this.redis.set(key, serialized);
        }
      },
      (error) => `Cache set error for key ${key}: ${error.message}`
    );
  }

  async delete(key: string): Promise<Either<string, void>> {
    return eitherFromOperation(
      () => this.redis.del(key),
      (error) => `Cache delete error for key ${key}: ${error.message}`
    );
  }
}
```

## Real-world Examples

### User Registration with All Helper Functions

```typescript
// ใช้ helper functions จาก Either.ts
import { 
  Either, left, right, 
  matchEither, eitherFromOperation, eitherToResult 
} from '@inh-lib/common';

// Business Logic Layer
interface RegistrationData {
  name: string;
  email: string;
  password: string;
}

const validateRegistration = (data: unknown): Either<string, RegistrationData> => {
  if (typeof data !== 'object' || data === null) {
    return left('Invalid registration data');
  }
  
  const reg = data as Record<string, unknown>;
  
  if (typeof reg.name !== 'string' || reg.name.trim().length === 0) {
    return left('Name is required');
  }
  
  if (typeof reg.email !== 'string' || !reg.email.includes('@')) {
    return left('Valid email is required');
  }
  
  if (typeof reg.password !== 'string' || reg.password.length < 8) {
    return left('Password must be at least 8 characters');
  }
  
  return right({
    name: reg.name.trim(),
    email: reg.email,
    password: reg.password
  });
};

// Service Layer
class RegistrationService {
  async registerUser(data: unknown): Promise<Result<User, string>> {
    // Step 1: Validate using business logic
    const validationResult = validateRegistration(data);
    if (validationResult.isLeft()) {
      return Result.fail(validationResult.value);
    }

    // Step 2: Check existing user using eitherFromOperation
    const existingUserResult = await eitherFromOperation(
      () => this.userRepository.findByEmail(validationResult.value.email),
      (error) => `Database error: ${error.message}`
    );

    // Step 3: Handle existing user check with matchEither
    const checkResult = matchEither(
      existingUserResult,
      (error) => left(error),
      (user) => user ? left('Email already exists') : right(null)
    );

    if (checkResult.isLeft()) {
      return Result.fail(checkResult.value);
    }

    // Step 4: Save new user using eitherFromOperation
    const saveResult = await eitherFromOperation(
      () => this.userRepository.save(validationResult.value),
      (error) => `Failed to save user: ${error.message}`
    );

    // Step 5: Convert Either → Result using eitherToResult
    return eitherToResult(saveResult);
  }
}
```

### Data Processing Pipeline

```typescript
// ใช้เฉพาะ helper functions ที่มีใน Either.ts
interface DataItem {
  id: string;
  content: string;
  metadata: Record<string, unknown>;
}

const validateDataItem = (item: unknown): Either<string, DataItem> => {
  if (typeof item !== 'object' || item === null) {
    return left('Invalid data item');
  }
  
  const data = item as Record<string, unknown>;
  
  if (typeof data.id !== 'string' || data.id.length === 0) {
    return left('ID is required');
  }
  
  if (typeof data.content !== 'string') {
    return left('Content must be string');
  }
  
  return right({
    id: data.id,
    content: data.content,
    metadata: data.metadata as Record<string, unknown> || {}
  });
};

const parseContent = (item: DataItem): Either<string, DataItem> => {
  try {
    const parsed = JSON.parse(item.content);
    return right({ ...item, content: JSON.stringify(parsed) });
  } catch {
    return left(`Invalid JSON in item ${item.id}`);
  }
};

// Manual chaining using if-checks
const processDataItem = (item: unknown): Either<string, DataItem> => {
  const validationResult = validateDataItem(item);
  if (validationResult.isLeft()) {
    return validationResult;
  }
  
  return parseContent(validationResult.value);
};

// Service Layer
class DataProcessingService {
  async processBatch(items: unknown[]): Promise<Result<ProcessedBatch, string>> {
    const processedItems: DataItem[] = [];
    
    // Process each item manually
    for (const item of items) {
      const processResult = processDataItem(item);
      if (processResult.isLeft()) {
        return Result.fail(processResult.value);
      }
      processedItems.push(processResult.value);
    }

    // Save processed data using eitherFromOperation
    const saveResult = await eitherFromOperation(
      () => this.dataRepository.saveBatch(processedItems),
      (error) => `Failed to save batch: ${error.message}`
    );

    // Convert และส่งผลลัพธ์ using matchEither
    return matchEither(
      saveResult,
      (error) => Result.fail(error),
      (saved) => Result.ok({
        processed: saved,
        count: saved.length,
        processedAt: new Date()
      })
    );
  }
}
```

## Best Practices

### 1. **Layer Separation**

```typescript
// ✅ DO: ใช้ Either ใน Business Logic เท่านั้น
const validateUser = (data: unknown): Either<ValidationError, User> => {
  // Pure validation logic
};

// ✅ DO: Service Layer return Result เสมอ
class UserService {
  async createUser(data: unknown): Promise<Result<User, string>> {
    const validation = validateUser(data);
    if (validation.isLeft()) {
      return Result.fail(this.mapError(validation.value));
    }
    
    const saveResult = await eitherFromOperation(
      () => this.repository.save(validation.value)
    );
    
    return eitherToResult(saveResult);
  }
}

// ❌ DON'T: Service return Either
class BadService {
  async createUser(data: unknown): Promise<Either<string, User>> {
    // Wrong! Service should return Result
  }
}
```

### 2. **ใช้ Helper Functions อย่างเหมาะสม**

```typescript
// ✅ DO: ใช้ eitherFromOperation สำหรับ async operations
const fetchData = async (): Promise<Either<string, Data>> => {
  return eitherFromOperation(
    () => apiClient.getData(),
    (error) => `API Error: ${error.message}`
  );
};

// ✅ DO: ใช้ matchEither สำหรับ pattern matching
const handleResult = (result: Either<string, number>) => {
  return matchEither(
    result,
    (error) => console.error(error),
    (value) => console.log(`Success: ${value}`)
  );
};

// ✅ DO: ใช้ manual chaining หรือ helper functions จาก Either.ts
const processUser = (data: unknown): Either<string, ProcessedUser> => {
  const userResult = validateUser(data);
  if (userResult.isLeft()) return userResult;
  
  const enrichResult = enrichUser(userResult.value);
  if (enrichResult.isLeft()) return enrichResult;
  
  return calculateScore(enrichResult.value);
};
```

### 3. **Error Type Consistency**

```typescript
// ✅ DO: Domain-specific error types
type UserError = 'INVALID_NAME' | 'INVALID_EMAIL' | 'USER_EXISTS';
type OrderError = 'EMPTY_ORDER' | 'INVALID_QUANTITY';

// ✅ DO: Map errors ใน Service layer
class UserService {
  private mapUserError(error: UserError): string {
    const messages = {
      'INVALID_NAME': 'Name is required',
      'INVALID_EMAIL': 'Email is invalid',
      'USER_EXISTS': 'User already exists'
    };
    return messages[error];
  }
}
```

## Testing

### Business Logic Testing (Pure Functions)

```typescript
describe('Either Business Logic', () => {
  describe('validateUser', () => {
    it('should return Right for valid user', () => {
      const validUser = { name: 'John', email: 'john@test.com' };
      const result = validateUser(validUser);
      
      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.name).toBe('John');
      }
    });
    
    it('should return Left for invalid email', () => {
      const invalidUser = { name: 'John', email: 'invalid' };
      const result = validateUser(invalidUser);
      
      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value).toBe('INVALID_EMAIL');
      }
    });
  });
  
  describe('Helper Functions', () => {
    it('should chain operations correctly', () => {
      const result = chainEither(
        right(5),
        x => right(x * 2)
      );
      
      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value).toBe(10);
      }
    });
    
    it('should handle matchEither', () => {
      const success = matchEither(
        right(42),
        () => 'error',
        (value) => `success: ${value}`
      );
      
      expect(success).toBe('success: 42');
    });
  });
});
```

### Service Layer Testing

```typescript
describe('UserService', () => {
  let service: UserService;
  let mockRepository: jest.Mocked<UserRepository>;
  
  beforeEach(() => {
    mockRepository = {
      save: jest.fn(),
      findByEmail: jest.fn()
    } as any;
    service = new UserService(mockRepository);
  });
  
  // ✅ Test public methods only - private methods จะถูกทดสอบผ่าน public methods
  it('should create user successfully', async () => {
    const userData = { name: 'John', email: 'john@test.com' };
    
    mockRepository.findByEmail.mockResolvedValue(null);
    mockRepository.save.mockResolvedValue({ id: '1', ...userData });
    
    const result = await service.createUser(userData);
    
    expect(result.isSuccess).toBe(true);
    expect(result.getValue().name).toBe('John');
  });
  
  it('should handle validation errors', async () => {
    const invalidData = { name: '', email: 'invalid' };
    
    const result = await service.createUser(invalidData);
    
    expect(result.isFailure).toBe(true);
    expect(result.error).toContain('Name is required');
    
    // ✅ Private method mapValidationError ถูกทดสอบผ่าน public method createUser
    // ไม่จำเป็นต้อง test mapValidationError แยกต่างหาก
  });
  
  it('should test error mapping through public interface', async () => {
    const testCases = [
      { input: { name: '', email: 'valid@test.com' }, expectedError: 'Name is required' },
      { input: { name: 'John', email: 'invalid' }, expectedError: 'Valid email is required' },
      { input: { name: 'John', email: 'test@test.com', password: '123' }, expectedError: 'Password must be at least 8 characters' }
    ];
    
    for (const testCase of testCases) {
      const result = await service.createUser(testCase.input);
      
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain(testCase.expectedError);
      // ✅ Private method mapValidationError ถูกทดสอบแบบอ้อมผ่าน public method
    }
  });
});
```

### Testing Guidelines สำหรับ Classes

#### ✅ **DO: Test Public Methods Only**

```typescript
class UserService {
  async createUser(data: unknown): Promise<Result<User, string>> {
    // Public method - ต้อง test
    const validation = validateUser(data);
    if (validation.isLeft()) {
      return Result.fail(this.mapError(validation.value)); // Private method called here
    }
    // ... rest of implementation
  }
  
  private mapError(error: ValidationError): string {
    // Private method - ไม่ต้อง test แยก
    // จะถูกทดสอบผ่าน createUser method
    const messages = {
      'EMPTY_NAME': 'Name is required',
      'INVALID_EMAIL': 'Valid email is required'
    };
    return messages[error] || 'Validation failed';
  }
}

// ✅ Test approach
describe('UserService', () => {
  it('should return proper error messages for validation failures', async () => {
    // Test different validation scenarios
    // Private mapError method จะถูกทดสอบโดยอัตโนมัติ
    const invalidNameResult = await service.createUser({ name: '', email: 'test@test.com' });
    expect(invalidNameResult.error).toBe('Name is required');
    
    const invalidEmailResult = await service.createUser({ name: 'John', email: 'invalid' });
    expect(invalidEmailResult.error).toBe('Valid email is required');
  });
});
```

#### ❌ **DON'T: Test Private Methods Directly**

```typescript
// ❌ ไม่ควรทำแบบนี้
describe('UserService Private Methods', () => {
  it('should map validation errors correctly', () => {
    const service = new UserService(mockRepo);
    
    // ❌ พยายาม access private method - จะไม่ compile
    const result = service.mapError('EMPTY_NAME'); // Error: Property 'mapError' is private
    expect(result).toBe('Name is required');
  });
});

// ❌ หรือใช้ type assertion เพื่อ bypass TypeScript
describe('UserService Private Methods', () => {
  it('should map validation errors correctly', () => {
    const service = new UserService(mockRepo);
    
    // ❌ ไม่ควรทำแบบนี้
    const result = (service as any).mapError('EMPTY_NAME');
    expect(result).toBe('Name is required');
  });
});
```

#### 🎯 **Why Test Public Methods Only?**

1. **Encapsulation**: Private methods เป็น implementation details ไม่ใช่ public contract
2. **Refactoring Safety**: เปลี่ยน private methods ได้โดยไม่กระทบ tests
3. **Behavior Focus**: Test พฤติกรรมที่ user เห็น ไม่ใช่ internal implementation
4. **Automatic Coverage**: Private methods ถูก test ผ่าน public methods อยู่แล้ว

#### 🔍 **เมื่อไหร่ควร Extract Private Method เป็น Separate Function?**

```typescript
// ✅ ถ้า logic ซับซ้อน ควร extract เป็น pure function แยก
const mapValidationError = (error: ValidationError): string => {
  const messages = {
    'EMPTY_NAME': 'Name is required',
    'INVALID_EMAIL': 'Valid email is required',
    'INVALID_AGE': 'Age must be between 0 and 150',
    'WEAK_PASSWORD': 'Password must be at least 8 characters'
  };
  return messages[error] || 'Validation failed';
};

// ✅ Test pure function แยก (Unit Test)
describe('mapValidationError', () => {
  it('should map validation errors correctly', () => {
    expect(mapValidationError('EMPTY_NAME')).toBe('Name is required');
    expect(mapValidationError('INVALID_EMAIL')).toBe('Valid email is required');
    expect(mapValidationError('UNKNOWN_ERROR' as any)).toBe('Validation failed');
  });
});

class UserService {
  async createUser(data: unknown): Promise<Result<User, string>> {
    const validation = validateUser(data);
    if (validation.isLeft()) {
      return Result.fail(mapValidationError(validation.value)); // Use pure function
    }
    // ...
  }
}
```

#### 🎯 **การ Test เมื่อใช้ Pure Function:**

##### ✅ **DO: ไม่ต้อง Mock Pure Functions**

```typescript
// ✅ Test class method โดยไม่ mock pure function
describe('UserService', () => {
  let service: UserService;
  let mockRepository: jest.Mocked<UserRepository>;
  
  beforeEach(() => {
    mockRepository = {
      save: jest.fn(),
      findByEmail: jest.fn()
    } as any;
    service = new UserService(mockRepository);
  });
  
  it('should use pure function naturally in unit test', async () => {
    const invalidData = { name: '', email: 'valid@test.com' };
    
    // ✅ ไม่ต้อง mock mapValidationError เพราะเป็น pure function
    // Pure function ไม่มี side effects, deterministic output
    const result = await service.createUser(invalidData);
    
    expect(result.isFailure).toBe(true);
    expect(result.error).toBe('Name is required'); // Pure function ทำงานปกติ
    
    // ✅ ยังคงเป็น Unit Test เพราะ:
    // 1. Test 1 unit (UserService.createUser)
    // 2. Mock dependencies (repository)
    // 3. Pure functions ไม่ใช่ dependencies
  });
  
  it('should handle different validation errors', async () => {
    const testCases = [
      { 
        input: { name: '', email: 'test@test.com' }, 
        expectedError: 'Name is required' 
      },
      { 
        input: { name: 'John', email: 'invalid' }, 
        expectedError: 'Valid email is required' 
      }
    ];
    
    for (const testCase of testCases) {
      const result = await service.createUser(testCase.input);
      
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(testCase.expectedError);
      // ✅ Pure function ให้ผลลัพธ์ที่คาดเดาได้ ไม่ต้อง mock
    }
  });
});
```

##### ❌ **DON'T: Mock Pure Functions**

```typescript
// ❌ ไม่ควร mock pure functions
describe('UserService', () => {
  it('should not mock pure functions', async () => {
    // ❌ ไม่จำเป็นต้องทำแบบนี้
    jest.mock('./mapValidationError', () => ({
      mapValidationError: jest.fn().mockReturnValue('Mocked error message')
    }));
    
    // ❌ ทำให้ test ไม่สะท้อนพฤติกรรมจริง
    const result = await service.createUser({ name: '' });
    expect(result.error).toBe('Mocked error message'); // ไม่ใช่ error message จริง
  });
});
```

#### 🏷️ **Unit Test vs Integration Test Classification:**

##### ✅ **Unit Test (ใช้ Pure Functions)**
```typescript
describe('UserService Unit Tests', () => {
  it('should be unit test when using pure functions', async () => {
    // ✅ Unit Test เพราะ:
    // 1. Test 1 unit of work (UserService.createUser)
    // 2. Mock external dependencies (repository, APIs)
    // 3. Use pure functions directly (no side effects)
    
    mockRepository.findByEmail.mockResolvedValue(null);
    mockRepository.save.mockResolvedValue(savedUser);
    
    const result = await service.createUser(validData);
    
    // Pure functions (validateUser, mapValidationError) ทำงานจริง
    // External dependencies (repository) ถูก mock
    expect(result.isSuccess).toBe(true);
  });
});
```

##### 🔗 **Integration Test (ใช้ Real Dependencies)**
```typescript
describe('UserService Integration Tests', () => {
  it('should be integration test with real database', async () => {
    // 🔗 Integration Test เพราะ:
    // 1. Use real database connection
    // 2. Test interaction between layers
    // 3. No mocking of external dependencies
    
    const realRepository = new UserRepository(realDatabase);
    const service = new UserService(realRepository);
    
    const result = await service.createUser(validData);
    
    // Test ทั้ง service logic และ database interaction
    expect(result.isSuccess).toBe(true);
    
    // Verify data in real database
    const savedUser = await realDatabase.query('SELECT * FROM users WHERE email = ?', [validData.email]);
    expect(savedUser).toBeDefined();
  });
});
```

#### 🎯 **เหตุผลที่ไม่ต้อง Mock Pure Functions:**

1. **Deterministic**: Pure functions ให้ output เดียวกันเมื่อได้ input เดียวกัน
2. **No Side Effects**: ไม่มี I/O, database calls, API calls
3. **Fast Execution**: รันเร็ว ไม่ทำให้ test ช้า
4. **Reliable**: ไม่มีความเสี่ยงที่จะ fail จาก external factors
5. **Real Behavior**: Test พฤติกรรมจริงของ application

#### 📊 **เปรียบเทียบ Testing Approaches:**

```typescript
// ✅ Pure Function Approach
const mapError = (error: ValidationError): string => {
  // Pure function - test แยก และใช้จริงใน class tests
};

class UserService {
  async createUser(data: unknown): Promise<Result<User, string>> {
    const validation = validateUser(data);
    if (validation.isLeft()) {
      return Result.fail(mapError(validation.value)); // ใช้ pure function
    }
    // ...
  }
}

// ✅ Tests
describe('mapError (Pure Function)', () => {
  // Unit test pure function แยก
});

describe('UserService', () => {
  // Unit test class โดยใช้ pure function จริง
  // Mock เฉพาะ external dependencies (repository, APIs)
});

// ❌ Private Method Approach  
class UserServiceBad {
  private mapError(error: ValidationError): string {
    // Private method - ไม่สามารถ test แยกได้
  }
  
  async createUser(data: unknown): Promise<Result<User, string>> {
    // ต้อง test mapError ผ่าน createUser เท่านั้น
  }
}
```

#### 🏆 **Best Practices Summary:**

1. **Pure Functions**: ไม่ต้อง mock, test แยกได้, ใช้จริงใน unit tests
2. **External Dependencies**: ต้อง mock (database, APIs, file system)
3. **Private Methods**: ไม่ต้อง test แยก, test ผ่าน public methods
4. **Complex Logic**: Extract เป็น pure functions เพื่อ testability
5. **Unit vs Integration**: Unit = mock externals, Integration = use real dependencies

#### 🔧 **Private Methods ที่ไม่ใช่ Pure Function:**

```typescript
class UserService {
  constructor(
    private userRepository: UserRepository,
    private emailService: EmailService,
    private logger: Logger
  ) {}

  async createUser(data: unknown): Promise<Result<User, string>> {
    const validation = validateUser(data);
    if (validation.isLeft()) {
      return Result.fail(mapValidationError(validation.value));
    }

    const saveResult = await this.userRepository.save(validation.value);
    if (saveResult.isLeft()) {
      // Private method with side effects
      await this.logError('User creation failed', saveResult.value);
      return Result.fail(saveResult.value);
    }

    // Private method with side effects
    await this.sendWelcomeEmail(saveResult.value);
    
    return Result.ok(saveResult.value);
  }

  // ❌ Private method ที่ไม่ใช่ pure function (มี side effects)
  private async logError(message: string, error: string): Promise<void> {
    // Side effect: logging
    await this.logger.error(`${message}: ${error}`, {
      timestamp: new Date(),
      userId: 'unknown'
    });
  }

  // ❌ Private method ที่ไม่ใช่ pure function (มี side effects)  
  private async sendWelcomeEmail(user: User): Promise<void> {
    try {
      // Side effect: sending email
      await this.emailService.sendWelcomeEmail(user.email, user.name);
    } catch (error) {
      // Side effect: logging
      await this.logger.warn(`Failed to send welcome email to ${user.email}`, error);
    }
  }
}
```

#### ✅ **การ Test Private Methods ที่มี Side Effects:**

```typescript
describe('UserService with Private Methods (Non-Pure)', () => {
  let service: UserService;
  let mockRepository: jest.Mocked<UserRepository>;
  let mockEmailService: jest.Mocked<EmailService>;
  let mockLogger: jest.Mocked<Logger>;
  
  beforeEach(() => {
    mockRepository = {
      save: jest.fn()
    } as any;
    
    mockEmailService = {
      sendWelcomeEmail: jest.fn()
    } as any;
    
    mockLogger = {
      error: jest.fn(),
      warn: jest.fn()
    } as any;
    
    service = new UserService(mockRepository, mockEmailService, mockLogger);
  });

  it('should test private logError through public method failure', async () => {
    // Setup: Make repository fail
    mockRepository.save.mockResolvedValue(left('Database connection error'));
    
    const userData = { name: 'John', email: 'john@test.com', password: 'password123' };
    
    // Act: Call public method
    const result = await service.createUser(userData);
    
    // Assert: Verify public behavior
    expect(result.isFailure).toBe(true);
    expect(result.error).toBe('Database connection error');
    
    // ✅ Verify private logError was called through mock dependencies
    expect(mockLogger.error).toHaveBeenCalledWith(
      'User creation failed: Database connection error',
      expect.objectContaining({
        timestamp: expect.any(Date),
        userId: 'unknown'
      })
    );
    
    // ✅ Private method ถูก test ผ่าน public interface + mocked dependencies
  });

  it('should test private sendWelcomeEmail through public method success', async () => {
    // Setup: Make repository succeed
    const savedUser = { id: '1', name: 'John', email: 'john@test.com' };
    mockRepository.save.mockResolvedValue(right(savedUser));
    mockEmailService.sendWelcomeEmail.mockResolvedValue();
    
    const userData = { name: 'John', email: 'john@test.com', password: 'password123' };
    
    // Act: Call public method
    const result = await service.createUser(userData);
    
    // Assert: Verify public behavior
    expect(result.isSuccess).toBe(true);
    expect(result.getValue()).toEqual(savedUser);
    
    // ✅ Verify private sendWelcomeEmail was called through mock dependencies
    expect(mockEmailService.sendWelcomeEmail).toHaveBeenCalledWith('john@test.com', 'John');
    
    // ✅ Private method ถูก test ผ่าน mocked dependencies
  });

  it('should handle email sending failure in private method', async () => {
    // Setup: Repository succeeds, email fails
    const savedUser = { id: '1', name: 'John', email: 'john@test.com' };
    mockRepository.save.mockResolvedValue(right(savedUser));
    mockEmailService.sendWelcomeEmail.mockRejectedValue(new Error('Email service unavailable'));
    
    const userData = { name: 'John', email: 'john@test.com', password: 'password123' };
    
    // Act: Call public method
    const result = await service.createUser(userData);
    
    // Assert: User creation should still succeed (email is not critical)
    expect(result.isSuccess).toBe(true);
    
    // ✅ Verify private method's error handling through mocked logger
    expect(mockLogger.warn).toHaveBeenCalledWith(
      'Failed to send welcome email to john@test.com',
      expect.any(Error)
    );
    
    // ✅ Private method error handling ถูก test ผ่าน mock dependencies
  });
});
```

#### 📊 **แนวทางการ Test ตาม Type ของ Private Method:**

##### ✅ **Pure Functions → Extract & Test Separately**
```typescript
// ✅ Extract เป็น pure function
const mapValidationError = (error: ValidationError): string => {
  // Pure function - no side effects
  return errorMessages[error] || 'Validation failed';
};

// ✅ Test pure function แยก + ใช้จริงใน class
describe('mapValidationError', () => {
  it('should map errors correctly', () => {
    expect(mapValidationError('EMPTY_NAME')).toBe('Name is required');
  });
});
```

##### ✅ **Non-Pure Private Methods → Test Through Public Interface**
```typescript
class UserService {
  // ❌ Private method with side effects - keep private, test through public
  private async logError(message: string): Promise<void> {
    await this.logger.error(message); // Side effect
  }
  
  // ✅ Test through public method
  async createUser(data: unknown): Promise<Result<User, string>> {
    if (error) {
      await this.logError('Creation failed'); // Private method called
      return Result.fail(error);
    }
  }
}

// ✅ Test private method behavior through public interface + mocks
describe('UserService', () => {
  it('should log errors when creation fails', async () => {
    mockRepository.save.mockResolvedValue(left('Database error'));
    
    await service.createUser(invalidData);
    
    // Verify private method side effects through mocks
    expect(mockLogger.error).toHaveBeenCalledWith('Creation failed');
  });
});
```

#### 🚫 **อย่าทำ:**

```typescript
// ❌ DON'T: Force access to private methods
describe('UserService Private Methods', () => {
  it('should not access private methods directly', () => {
    // ❌ Bypassing encapsulation
    (service as any).logError('test'); // Type assertion hack
    expect(mockLogger.error).toHaveBeenCalled();
  });
});

// ❌ DON'T: Extract side effects as functions
const logErrorFunction = async (logger: Logger, message: string) => {
  // ❌ Not pure due to side effect, but extracted anyway
  await logger.error(message);
};
```

#### 🚨 **Problem: Private Methods with Hidden Dependencies**

```typescript
// ❌ ปัญหา: Private method import dependencies โดยตรง
import { sendEmail } from '../utils/emailService';
import { logToFile } from '../utils/fileLogger';
import { trackAnalytics } from '../utils/analytics';

class UserService {
  constructor(private userRepository: UserRepository) {}

  async createUser(data: unknown): Promise<Result<User, string>> {
    const validation = validateUser(data);
    if (validation.isLeft()) {
      return Result.fail(mapValidationError(validation.value));
    }

    const saveResult = await this.userRepository.save(validation.value);
    if (saveResult.isLeft()) {
      // ❌ Hidden dependencies - ยากต่อการ test
      await this.logCreationError(saveResult.value);
      return Result.fail(saveResult.value);
    }

    // ❌ Hidden dependencies - ยากต่อการ test
    await this.notifyUserCreated(saveResult.value);
    
    return Result.ok(saveResult.value);
  }

  // ❌ Private method with hidden dependencies
  private async logCreationError(error: string): Promise<void> {
    // Hidden dependency - ไม่สามารถ mock ได้ง่าย
    await logToFile(`User creation failed: ${error}`);
    
    // Hidden dependency - ไม่สามารถ mock ได้ง่าย
    await trackAnalytics('user_creation_failed', { error });
  }

  // ❌ Private method with hidden dependencies
  private async notifyUserCreated(user: User): Promise<void> {
    try {
      // Hidden dependency - ไม่สามารถ mock ได้ง่าย
      await sendEmail(user.email, 'Welcome!', 'Welcome to our service');
      
      // Hidden dependency - ไม่สามารถ mock ได้ง่าย
      await trackAnalytics('user_created', { userId: user.id });
    } catch (error) {
      // Hidden dependency - ไม่สามารถ mock ได้ง่าย
      await logToFile(`Failed to notify user ${user.id}: ${error}`);
    }
  }
}
```

#### ❌ **ปัญหาของ Hidden Dependencies:**

1. **ไม่สามารถ Mock ได้ง่าย**: ต้องใช้ jest.mock() ที่ module level
2. **Dependencies ไม่ชัดเจน**: คนอ่าน code ไม่รู้ว่ามี dependencies อะไรบ้าง
3. **ยากต่อการ Test**: ต้อง setup complex mocking
4. **Coupling สูง**: Class ผูกติดกับ implementation details
5. **ยากต่อการ Refactor**: เปลี่ยน dependencies ยาก

#### ✅ **วิธีแก้ที่ 1: Dependency Injection ผ่าน Constructor**

```typescript
// ✅ แก้ไข: Inject dependencies ผ่าน constructor
interface EmailService {
  sendEmail(to: string, subject: string, body: string): Promise<void>;
}

interface FileLogger {
  logToFile(message: string): Promise<void>;
}

interface AnalyticsService {
  track(event: string, data: any): Promise<void>;
}

class UserService {
  constructor(
    private userRepository: UserRepository,
    private emailService: EmailService,      // ✅ Explicit dependency
    private logger: FileLogger,              // ✅ Explicit dependency
    private analytics: AnalyticsService      // ✅ Explicit dependency
  ) {}

  async createUser(data: unknown): Promise<Result<User, string>> {
    const validation = validateUser(data);
    if (validation.isLeft()) {
      return Result.fail(mapValidationError(validation.value));
    }

    const saveResult = await this.userRepository.save(validation.value);
    if (saveResult.isLeft()) {
      // ✅ Dependencies ชัดเจน และ mockable
      await this.logCreationError(saveResult.value);
      return Result.fail(saveResult.value);
    }

    // ✅ Dependencies ชัดเจน และ mockable
    await this.notifyUserCreated(saveResult.value);
    
    return Result.ok(saveResult.value);
  }

  // ✅ Private method ใช้ injected dependencies
  private async logCreationError(error: string): Promise<void> {
    await this.logger.logToFile(`User creation failed: ${error}`);
    await this.analytics.track('user_creation_failed', { error });
  }

  // ✅ Private method ใช้ injected dependencies
  private async notifyUserCreated(user: User): Promise<void> {
    try {
      await this.emailService.sendEmail(user.email, 'Welcome!', 'Welcome to our service');
      await this.analytics.track('user_created', { userId: user.id });
    } catch (error) {
      await this.logger.logToFile(`Failed to notify user ${user.id}: ${error}`);
    }
  }
}
```

#### ✅ **Testing กับ Explicit Dependencies:**

```typescript
describe('UserService with Explicit Dependencies', () => {
  let service: UserService;
  let mockRepository: jest.Mocked<UserRepository>;
  let mockEmailService: jest.Mocked<EmailService>;
  let mockLogger: jest.Mocked<FileLogger>;
  let mockAnalytics: jest.Mocked<AnalyticsService>;
  
  beforeEach(() => {
    // ✅ ชัดเจนว่ามี dependencies อะไรบ้าง
    mockRepository = { save: jest.fn() } as any;
    mockEmailService = { sendEmail: jest.fn() } as any;
    mockLogger = { logToFile: jest.fn() } as any;
    mockAnalytics = { track: jest.fn() } as any;
    
    service = new UserService(
      mockRepository,
      mockEmailService,
      mockLogger,
      mockAnalytics
    );
  });

  it('should log error through private method when creation fails', async () => {
    // Setup
    mockRepository.save.mockResolvedValue(left('Database error'));
    
    // Act
    const result = await service.createUser(validData);
    
    // Assert
    expect(result.isFailure).toBe(true);
    
    // ✅ ง่ายต่อการ verify private method dependencies
    expect(mockLogger.logToFile).toHaveBeenCalledWith('User creation failed: Database error');
    expect(mockAnalytics.track).toHaveBeenCalledWith('user_creation_failed', { error: 'Database error' });
  });

  it('should notify user through private method when creation succeeds', async () => {
    // Setup
    const savedUser = { id: '1', email: 'john@test.com' };
    mockRepository.save.mockResolvedValue(right(savedUser));
    
    // Act
    const result = await service.createUser(validData);
    
    // Assert
    expect(result.isSuccess).toBe(true);
    
    // ✅ ง่ายต่อการ verify private method dependencies
    expect(mockEmailService.sendEmail).toHaveBeenCalledWith('john@test.com', 'Welcome!', 'Welcome to our service');
    expect(mockAnalytics.track).toHaveBeenCalledWith('user_created', { userId: '1' });
  });

  it('should handle notification failure gracefully', async () => {
    // Setup
    const savedUser = { id: '1', email: 'john@test.com' };
    mockRepository.save.mockResolvedValue(right(savedUser));
    mockEmailService.sendEmail.mockRejectedValue(new Error('Email service down'));
    
    // Act
    const result = await service.createUser(validData);
    
    // Assert
    expect(result.isSuccess).toBe(true); // Main operation succeeds
    
    // ✅ Verify error handling in private method
    expect(mockLogger.logToFile).toHaveBeenCalledWith('Failed to notify user 1: Error: Email service down');
  });
});
```

#### 🔄 **วิธีแก้ที่ 2: ใช้ jest.mock() สำหรับ Module Dependencies**

```typescript
// ถ้าจำเป็นต้องใช้ direct imports
// ✅ Mock ที่ module level
jest.mock('../utils/emailService', () => ({
  sendEmail: jest.fn()
}));

jest.mock('../utils/fileLogger', () => ({
  logToFile: jest.fn()
}));

jest.mock('../utils/analytics', () => ({
  trackAnalytics: jest.fn()
}));

import { sendEmail } from '../utils/emailService';
import { logToFile } from '../utils/fileLogger';
import { trackAnalytics } from '../utils/analytics';

describe('UserService with Module Mocks', () => {
  // ✅ Type assertions for mocked modules
  const mockSendEmail = sendEmail as jest.MockedFunction<typeof sendEmail>;
  const mockLogToFile = logToFile as jest.MockedFunction<typeof logToFile>;
  const mockTrackAnalytics = trackAnalytics as jest.MockedFunction<typeof trackAnalytics>;
  
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it('should use module dependencies in private methods', async () => {
    // Setup
    mockRepository.save.mockResolvedValue(left('Database error'));
    
    // Act
    const result = await service.createUser(invalidData);
    
    // Assert
    expect(result.isFailure).toBe(true);
    
    // ✅ Verify module dependencies were called
    expect(mockLogToFile).toHaveBeenCalledWith('User creation failed: Database error');
    expect(mockTrackAnalytics).toHaveBeenCalledWith('user_creation_failed', { error: 'Database error' });
  });
  
  // ⚠️ ข้อเสีย: ต้อง maintain module mocks, ยากต่อการ setup
});
```

#### 📋 **แนวทางที่แนะนำ:**

##### ✅ **Best Practice: Dependency Injection**

```typescript
// ✅ สร้าง interfaces สำหรับ dependencies
interface UserServiceDependencies {
  userRepository: UserRepository;
  emailService: EmailService;
  logger: FileLogger;
  analytics: AnalyticsService;
}

class UserService {
  constructor(private deps: UserServiceDependencies) {}
  
  // หรือ destructure
  constructor({
    userRepository,
    emailService,
    logger,
    analytics
  }: UserServiceDependencies) {
    this.userRepository = userRepository;
    this.emailService = emailService;
    this.logger = logger;
    this.analytics = analytics;
  }
  
  // Private methods ใช้ this.deps หรือ this.emailService
}
```

##### 📝 **Document Dependencies ใน Code:**

```typescript
/**
 * UserService handles user creation and management
 * 
 * Dependencies:
 * - UserRepository: For data persistence
 * - EmailService: For sending welcome emails
 * - Logger: For error logging
 * - AnalyticsService: For tracking user events
 */
class UserService {
  // Implementation...
}
```

#### 🎯 **Benefits ของ Dependency Injection:**

1. **ชัดเจน**: Dependencies ปรากฏใน constructor
2. **Testable**: ง่ายต่อการ mock
3. **Flexible**: สามารถ swap implementations ได้
4. **Single Responsibility**: แต่ละ dependency มีหน้าที่ชัดเจน
5. **Maintainable**: ง่ายต่อการ refactor และ debug
```
```

---

## Summary

### 🎯 **Key Architecture:**
- **Business Logic**: Either เท่านั้น (pure functions)
- **Service Layer**: Result เสมอ (orchestration + I/O)
- **Helper Functions**: ใช้ helper functions จาก Either.ts

### 🔧 **Helper Functions ใน Either.ts:**
1. `left()`, `right()` - Constructors
2. `matchEither()` - Pattern matching  
3. `eitherFromOperation()` - Async operations with error handling
4. `eitherToResult()` - Convert Either → Result

### 🚀 **Benefits:**
- ✅ Type safety ตลอด application
- ✅ Clear separation of concerns  
- ✅ Consistent error handling patterns
- ✅ Easy testing and maintenance
- ✅ ใช้เฉพาะ helper functions ที่มีจริงในไฟล์
- ✅ Test public methods only - private methods ถูก test ผ่าน public interface