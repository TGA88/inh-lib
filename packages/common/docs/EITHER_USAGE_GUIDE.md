# Either Usage Guide

Either เป็น functional programming pattern ที่ใช้แทนความเป็นไปได้ 2 แบบ (เสมือน union type) โดยสามารถเป็นได้ทั้ง `Left` (มักใช้แทน error) หรือ `Right` (มักใช้แทน success value)

## Table of Contents

1. [Overview](#overview)
2. [Basic Concepts](#basic-concepts)
3. [Core API](#core-api)
4. [Usage Examples](#usage-examples)
5. [Either vs ResultV2](#either-vs-resultv2)
6. [When to Use Either](#when-to-use-either)
7. [When to Use ResultV2](#when-to-use-resultv2)
8. [Migration Guide](#migration-guide)
9. [Best Practices](#best-practices)
10. [Common Patterns](#common-patterns)
11. [Advanced Usage](#advanced-usage)
12. [Testing](#testing)
13. [Try-Catch vs Either](#try-catch-vs-either-core-error-handling-patterns)

## Overview

Either เป็น algebraic data type ที่เป็นส่วนหนึ่งของ functional programming patterns มี 2 สถานะ:

- **Left**: มักใช้แทน error หรือ failure case
- **Right**: มักใช้แทน success หรือ valid value

### Key Features

- ✅ **Simple**: Minimal API, easy to understand
- ✅ **Type Safe**: Full TypeScript support
- ✅ **Functional**: Pure functional programming approach
- ✅ **Immutable**: Values cannot be changed after creation
- ✅ **Composable**: Can be used in functional pipelines

## Basic Concepts

### The Either Type

```typescript
type Either<L, A> = Left<L, A> | Right<L, A>
```

- `L`: Type ของ Left value (error type)
- `A`: Type ของ Right value (success type)

### Convention

- **Left** = Error/Failure/Invalid state
- **Right** = Success/Valid value

> จำได้ง่ายๆ: "Right is right" (ถูกต้อง)

## Core API

### Creating Either Values

```typescript
import { Either, left, right, Left, Right } from '@inh-lib/common';

// สร้าง success value (Right)
const successValue: Either<string, number> = right(42);

// สร้าง error value (Left)  
const errorValue: Either<string, number> = left('Error occurred');

// หรือใช้ constructor โดยตรง
const success = new Right<string, number>(42);
const error = new Left<string, number>('Error occurred');
```

### Type Guards

```typescript
// ตรวจสอบว่าเป็น Left หรือ Right
if (result.isLeft()) {
  console.log('Error:', result.value); // type: L
} else if (result.isRight()) {
  console.log('Success:', result.value); // type: A
}
```

## Usage Examples

### Basic Usage

```typescript
import { Either, left, right } from '@inh-lib/common';

// Function ที่ return Either
const divide = (a: number, b: number): Either<string, number> => {
  if (b === 0) {
    return left('Cannot divide by zero');
  }
  return right(a / b);
};

// การใช้งาน
const result1 = divide(10, 2);  // Right(5)
const result2 = divide(10, 0);  // Left('Cannot divide by zero')

if (result1.isRight()) {
  console.log('Result:', result1.value); // 5
}

if (result2.isLeft()) {
  console.log('Error:', result2.value); // 'Cannot divide by zero'
}
```

### Validation Example

```typescript
interface User {
  name: string;
  email: string;
  age: number;
}

type ValidationError = 
  | 'EMPTY_NAME'
  | 'INVALID_EMAIL'
  | 'INVALID_AGE';

const validateName = (name: string): Either<ValidationError, string> => {
  return name.trim().length > 0 
    ? right(name.trim())
    : left('EMPTY_NAME');
};

const validateEmail = (email: string): Either<ValidationError, string> => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email)
    ? right(email)
    : left('INVALID_EMAIL');
};

const validateAge = (age: number): Either<ValidationError, number> => {
  return age >= 0 && age <= 150
    ? right(age)
    : left('INVALID_AGE');
};

// การใช้งาน
const validateUser = (data: any): Either<ValidationError, User> => {
  const nameResult = validateName(data.name);
  if (nameResult.isLeft()) return nameResult;
  
  const emailResult = validateEmail(data.email);
  if (emailResult.isLeft()) return emailResult;
  
  const ageResult = validateAge(data.age);
  if (ageResult.isLeft()) return ageResult;
  
  return right({
    name: nameResult.value,
    email: emailResult.value,
    age: ageResult.value
  });
};
```

### File Operations Example

```typescript
import { promises as fs } from 'fs';

const readFile = async (path: string): Promise<Either<string, string>> => {
  try {
    const content = await fs.readFile(path, 'utf-8');
    return right(content);
  } catch (error) {
    return left(`Failed to read file: ${error.message}`);
  }
};

const parseJSON = (content: string): Either<string, any> => {
  try {
    const parsed = JSON.parse(content);
    return right(parsed);
  } catch (error) {
    return left(`Invalid JSON: ${error.message}`);
  }
};

// การใช้งาน
const processConfigFile = async (path: string) => {
  const fileResult = await readFile(path);
  
  if (fileResult.isLeft()) {
    console.error('File error:', fileResult.value);
    return;
  }
  
  const parseResult = parseJSON(fileResult.value);
  
  if (parseResult.isLeft()) {
    console.error('Parse error:', parseResult.value);
    return;
  }
  
  console.log('Config loaded:', parseResult.value);
};
```

## Either vs ResultV2

### Comparison Table

| Feature | Either | ResultV2 |
|---------|--------|----------|
| **Complexity** | Simple, minimal | Rich, feature-complete |
| **Chain Operations** | ❌ No built-in | ✅ `chain()`, `map()` |
| **Async Support** | ❌ Manual | ✅ `chainAsync()`, `mapAsync()` |
| **Error Handling** | ✅ Pure functional | ✅ + HTTP integration |
| **HTTP Integration** | ❌ Manual | ✅ Built-in response methods |
| **Multiple Operations** | ❌ Manual | ✅ `combine()`, `sequence()` |
| **Trace ID Support** | ❌ No | ✅ Built-in |
| **Learning Curve** | Easy | Moderate |
| **Bundle Size** | Tiny | Larger |
| **Use Case** | Pure FP, simple cases | App development, APIs |

### Code Comparison

#### Either Approach
```typescript
// Either: Manual chaining
const processUser = async (userData: any): Promise<Either<string, User>> => {
  const nameResult = validateName(userData.name);
  if (nameResult.isLeft()) return nameResult;
  
  const emailResult = validateEmail(userData.email);
  if (emailResult.isLeft()) return emailResult;
  
  const saveResult = await saveUser({ 
    name: nameResult.value, 
    email: emailResult.value 
  });
  if (saveResult.isLeft()) return saveResult;
  
  return saveResult;
};
```

#### ResultV2 Approach
```typescript
// ResultV2: Automatic chaining
const processUser = async (userData: any): Promise<Result<User, string>> => {
  return Result.ok(userData)
    .chain(data => validateName(data.name).map(() => data))
    .chain(data => validateEmail(data.email).map(() => data))
    .chainAsync(data => saveUser(data));
};
```

## When to Use Either

### ✅ Use Either When:

1. **Pure Functional Programming**
   ```typescript
   // เมื่อต้องการ pure functional approach
   const compose = <A, B, C, E>(
     f: (a: A) => Either<E, B>,
     g: (b: B) => Either<E, C>
   ) => (a: A): Either<E, C> => {
     const result = f(a);
     return result.isLeft() ? result : g(result.value);
   };
   ```

2. **Simple Binary Choices**
   ```typescript
   // เมื่อมีตัวเลือกแค่ 2 แบบ
   type ParseResult = Either<'INVALID_FORMAT', ParsedData>;
   type AuthResult = Either<'UNAUTHORIZED', UserSession>;
   ```

3. **Library Development**
   ```typescript
   // เมื่อสร้าง library ที่ต้องการ minimal dependency
   export const validateInput = (input: string): Either<ValidationError, CleanInput> => {
     // validation logic
   };
   ```

4. **Mathematical Operations**
   ```typescript
   // เมื่อทำ mathematical computations
   const sqrt = (n: number): Either<'NEGATIVE_NUMBER', number> => {
     return n < 0 ? left('NEGATIVE_NUMBER') : right(Math.sqrt(n));
   };
   ```

5. **Type-Driven Development**
   ```typescript
   // เมื่อต้องการ explicit types สำหรับทุก case
   type DatabaseResult<T> = Either<DatabaseError, T>;
   type NetworkResult<T> = Either<NetworkError, T>;
   ```

## When to Use ResultV2

### ✅ Use ResultV2 When:

1. **API Development**
   ```typescript
   // เมื่อสร้าง REST APIs
   app.get('/users/:id', async (req, res) => {
     const result = await getUserById(req.params.id)
       .chain(validateUser)
       .chain(enrichUserData);
     
     return result.toHttpResponse(res);
   });
   ```

2. **Complex Error Handling**
   ```typescript
   // เมื่อต้องการ trace IDs และ HTTP status codes
   const result = await processOrder(orderData)
     .withTraceId(req.traceId)
     .withHttpStatusCode(201);
   ```

3. **Chain Operations**
   ```typescript
   // เมื่อต้องการ chain หลายขั้นตอน
   const result = await Result.ok(userData)
     .chain(validateInput)
     .chainAsync(saveToDatabase)
     .chainAsync(sendEmail)
     .map(addTimestamp);
   ```

4. **Async Heavy Applications**
   ```typescript
   // เมื่อทำงานกับ async operations เยอะ
   const result = await Result.fromAsync(() => fetchUserData(id))
     .chainAsync(user => Result.fromAsync(() => updateProfile(user)))
     .mapAsync(user => enrichWithPreferences(user));
   ```

5. **Integration with Failure System**
   ```typescript
   // เมื่อใช้ร่วมกับ BaseFailure และ ResponseBuilder
   const result = await processData(input)
     .mapError(error => new CommonFailures.ValidationFail(error.message));
   
   return ResponseBuilder.fromResult(result);
   ```

## Migration Guide

### From Either to ResultV2

```typescript
// Before: Using Either
const processData = (input: string): Either<string, ProcessedData> => {
  const validationResult = validateInput(input);
  if (validationResult.isLeft()) return validationResult;
  
  const processResult = processValidInput(validationResult.value);
  if (processResult.isLeft()) return processResult;
  
  return processResult;
};

// After: Using ResultV2
const processData = (input: string): Result<ProcessedData, string> => {
  return Result.ok(input)
    .chain(validateInput)
    .chain(processValidInput);
};
```

### From ResultV2 to Either

```typescript
// Before: Using ResultV2
const simpleValidation = (input: string): Result<string, string> => {
  return input.length > 0 
    ? Result.ok(input)
    : Result.fail('Empty input');
};

// After: Using Either
const simpleValidation = (input: string): Either<string, string> => {
  return input.length > 0 
    ? right(input)
    : left('Empty input');
};
```

## Best Practices

### 1. Consistent Error Types

```typescript
// ✅ Good: Use union types for specific errors
type UserValidationError = 
  | 'INVALID_EMAIL'
  | 'INVALID_AGE' 
  | 'MISSING_NAME';

const validateUser = (data: any): Either<UserValidationError, User> => {
  // validation logic
};

// ❌ Avoid: Generic string errors
const validateUser = (data: any): Either<string, User> => {
  // harder to handle specific cases
};
```

### 2. Use Helper Functions

```typescript
// ✅ Good: Create reusable helpers
const isLeft = <L, A>(either: Either<L, A>): either is Left<L, A> => 
  either.isLeft();

const isRight = <L, A>(either: Either<L, A>): either is Right<L, A> => 
  either.isRight();

const mapEither = <L, A, B>(
  either: Either<L, A>,
  fn: (value: A) => B
): Either<L, B> => {
  return either.isRight() ? right(fn(either.value)) : either;
};

const chainEither = <L, A, B>(
  either: Either<L, A>,
  fn: (value: A) => Either<L, B>
): Either<L, B> => {
  return either.isRight() ? fn(either.value) : either;
};
```

### 3. Pattern Matching

```typescript
// ✅ Good: Use pattern matching style
const handleResult = <L, A, R>(
  either: Either<L, A>,
  onLeft: (error: L) => R,
  onRight: (value: A) => R
): R => {
  return either.isLeft() ? onLeft(either.value) : onRight(either.value);
};

// Usage
const message = handleResult(
  divide(10, 2),
  error => `Error: ${error}`,
  result => `Result: ${result}`
);
```

### 4. Early Returns

```typescript
// ✅ Good: Use early returns for clarity
const processUserData = (data: any): Either<string, ProcessedUser> => {
  const nameResult = validateName(data.name);
  if (nameResult.isLeft()) return nameResult;
  
  const emailResult = validateEmail(data.email);
  if (emailResult.isLeft()) return emailResult;
  
  // Continue with valid data
  return right(createUser(nameResult.value, emailResult.value));
};
```

## Common Patterns

### 1. Validation Pipeline

```typescript
interface UserRegistration {
  name: string;
  email: string;
  password: string;
  age: number;
}

type ValidationError = 
  | 'EMPTY_NAME'
  | 'INVALID_EMAIL'
  | 'WEAK_PASSWORD'
  | 'INVALID_AGE';

const validateUserRegistration = (data: any): Either<ValidationError, UserRegistration> => {
  // Validate name
  if (!data.name || data.name.trim().length === 0) {
    return left('EMPTY_NAME');
  }
  
  // Validate email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(data.email)) {
    return left('INVALID_EMAIL');
  }
  
  // Validate password
  if (!data.password || data.password.length < 8) {
    return left('WEAK_PASSWORD');
  }
  
  // Validate age
  if (typeof data.age !== 'number' || data.age < 13 || data.age > 120) {
    return left('INVALID_AGE');
  }
  
  return right({
    name: data.name.trim(),
    email: data.email,
    password: data.password,
    age: data.age
  });
};
```

### 2. Parser Combinator Pattern

```typescript
type ParseError = string;

const parseNumber = (str: string): Either<ParseError, number> => {
  const num = Number(str);
  return isNaN(num) ? left(`Invalid number: ${str}`) : right(num);
};

const parseArray = (str: string): Either<ParseError, string[]> => {
  try {
    const parsed = JSON.parse(str);
    return Array.isArray(parsed) ? right(parsed) : left('Not an array');
  } catch {
    return left('Invalid JSON');
  }
};

const parseNumberArray = (str: string): Either<ParseError, number[]> => {
  const arrayResult = parseArray(str);
  if (arrayResult.isLeft()) return arrayResult;
  
  const numbers: number[] = [];
  for (const item of arrayResult.value) {
    const numResult = parseNumber(item);
    if (numResult.isLeft()) return numResult;
    numbers.push(numResult.value);
  }
  
  return right(numbers);
};
```

### 3. Configuration Loading

```typescript
interface AppConfig {
  port: number;
  database: {
    host: string;
    port: number;
    name: string;
  };
  features: {
    enableLogging: boolean;
    enableMetrics: boolean;
  };
}

type ConfigError = 
  | 'FILE_NOT_FOUND'
  | 'INVALID_JSON'
  | 'MISSING_FIELD'
  | 'INVALID_TYPE';

const loadConfig = async (path: string): Promise<Either<ConfigError, AppConfig>> => {
  // Read file
  try {
    const content = await fs.readFile(path, 'utf-8');
    
    // Parse JSON
    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch {
      return left('INVALID_JSON');
    }
    
    // Validate structure
    if (typeof parsed.port !== 'number') {
      return left('MISSING_FIELD');
    }
    
    if (!parsed.database || typeof parsed.database.host !== 'string') {
      return left('MISSING_FIELD');
    }
    
    return right(parsed as AppConfig);
    
  } catch {
    return left('FILE_NOT_FOUND');
  }
};
```

## Advanced Usage

### 1. Either with Generics

```typescript
// Generic Either utility
class EitherUtils {
  static sequence<L, A>(eithers: Either<L, A>[]): Either<L, A[]> {
    const values: A[] = [];
    
    for (const either of eithers) {
      if (either.isLeft()) return either;
      values.push(either.value);
    }
    
    return right(values);
  }
  
  static traverse<L, A, B>(
    array: A[],
    fn: (item: A) => Either<L, B>
  ): Either<L, B[]> {
    return EitherUtils.sequence(array.map(fn));
  }
}

// Usage
const validateNumbers = (strings: string[]): Either<string, number[]> => {
  return EitherUtils.traverse(strings, str => {
    const num = Number(str);
    return isNaN(num) ? left(`Invalid: ${str}`) : right(num);
  });
};
```

### 2. Either Monad Laws

```typescript
// Left Identity: right(a).chain(f) === f(a)
const leftIdentityTest = <A, B, L>(a: A, f: (a: A) => Either<L, B>) => {
  const left = chainEither(right(a), f);
  const right_side = f(a);
  // left should equal right_side
};

// Right Identity: m.chain(right) === m
const rightIdentityTest = <L, A>(m: Either<L, A>) => {
  const result = chainEither(m, right);
  // result should equal m
};

// Associativity: m.chain(f).chain(g) === m.chain(x => f(x).chain(g))
const associativityTest = <L, A, B, C>(
  m: Either<L, A>,
  f: (a: A) => Either<L, B>,
  g: (b: B) => Either<L, C>
) => {
  const left = chainEither(chainEither(m, f), g);
  const right_side = chainEither(m, x => chainEither(f(x), g));
  // left should equal right_side
};
```

### 3. Converting Between Either and Other Types

```typescript
// Either <-> Option/Maybe
type Option<T> = T | null;

const eitherToOption = <L, A>(either: Either<L, A>): Option<A> => {
  return either.isRight() ? either.value : null;
};

const optionToEither = <L, A>(option: Option<A>, error: L): Either<L, A> => {
  return option !== null ? right(option) : left(error);
};

// Either <-> Promise
const eitherToPromise = <L, A>(either: Either<L, A>): Promise<A> => {
  return either.isRight() 
    ? Promise.resolve(either.value)
    : Promise.reject(either.value);
};

const promiseToEither = async <A>(promise: Promise<A>): Promise<Either<unknown, A>> => {
  try {
    const result = await promise;
    return right(result);
  } catch (error) {
    return left(error);
  }
};
```

## Testing

### Unit Testing Either

```typescript
import { Either, left, right } from '@inh-lib/common';

describe('Either', () => {
  describe('Basic functionality', () => {
    it('should create Right value', () => {
      const result = right(42);
      
      expect(result.isRight()).toBe(true);
      expect(result.isLeft()).toBe(false);
      expect(result.value).toBe(42);
    });
    
    it('should create Left value', () => {
      const result = left('error');
      
      expect(result.isLeft()).toBe(true);
      expect(result.isRight()).toBe(false);
      expect(result.value).toBe('error');
    });
  });
  
  describe('Type guards', () => {
    it('should narrow types correctly', () => {
      const success: Either<string, number> = right(42);
      const error: Either<string, number> = left('error');
      
      if (success.isRight()) {
        // TypeScript knows success.value is number
        expect(typeof success.value).toBe('number');
      }
      
      if (error.isLeft()) {
        // TypeScript knows error.value is string
        expect(typeof error.value).toBe('string');
      }
    });
  });
});
```

### Testing with Property-Based Testing

```typescript
import fc from 'fast-check';

describe('Either Laws', () => {
  it('should maintain type consistency', () => {
    fc.assert(fc.property(
      fc.oneof(fc.string(), fc.integer()),
      (value) => {
        const either = typeof value === 'string' 
          ? left(value) 
          : right(value);
        
        if (either.isLeft()) {
          expect(typeof either.value).toBe('string');
        } else {
          expect(typeof either.value).toBe('number');
        }
      }
    ));
  });
});
```

### Integration Testing

```typescript
describe('Either Integration', () => {
  it('should handle complete workflow', async () => {
    const workflow = async (input: string) => {
      // Simulate validation
      if (input.length === 0) {
        return left('EMPTY_INPUT');
      }
      
      // Simulate processing
      if (input === 'invalid') {
        return left('INVALID_DATA');
      }
      
      // Simulate success
      return right(input.toUpperCase());
    };
    
    const validResult = await workflow('hello');
    expect(validResult.isRight()).toBe(true);
    if (validResult.isRight()) {
      expect(validResult.value).toBe('HELLO');
    }
    
    const emptyResult = await workflow('');
    expect(emptyResult.isLeft()).toBe(true);
    if (emptyResult.isLeft()) {
      expect(emptyResult.value).toBe('EMPTY_INPUT');
    }
  });
});
```

---

## Summary

### Either คือ:
- ✅ **Simple & Minimal**: Basic functional programming pattern
- ✅ **Type Safe**: Compile-time error detection  
- ✅ **Pure**: No side effects, immutable
- ✅ **Educational**: Great for learning FP concepts

### ResultV2 คือ:
- ✅ **Feature Rich**: Built-in chain, map, async operations
- ✅ **Production Ready**: HTTP integration, tracing, error handling
- ✅ **Developer Friendly**: Fewer boilerplate, better DX
- ✅ **Ecosystem**: Works with Failure system and ResponseBuilder

### เลือกใช้ยังไง:
- **Either**: สำหรับ pure functional programming, simple cases, library development
- **ResultV2**: สำหรับ application development, APIs, complex error handling

ทั้งสองมีจุดประสงค์ที่แตกต่างกัน และสามารถใช้ร่วมกันได้ในโปรเจกต์เดียวกัน ขึ้นอยู่กับ context และความต้องการ! 🚀

---

# Try-Catch vs Either: Core Error Handling Patterns

แม้ว่าจะมี Either pattern แล้ว แต่ try-catch ยังคงมีบทบาทสำคัญในการจัดการ errors ในแอปพลิเคชัน JavaScript/TypeScript โดยเฉพาะในการ interface กับ external systems

## Table of Contents

1. [Overview](#overview)
2. [When Try-Catch is Still Necessary](#when-try-catch-is-still-necessary)
3. [Integration Patterns](#integration-patterns)
4. [Best Practices](#best-practices)
5. [Decision Matrix](#decision-matrix)
6. [Summary](#summary-1)

## Overview

### Quick Summary

| Pattern | Use Case | Strengths | Weaknesses |
|---------|----------|-----------|------------|
| **try-catch** | External APIs, legacy integration, I/O operations | Native support, catches all errors | Can be missed, imperative |
| **Either** | Pure functional programming, business logic | Type safe, explicit, composable | Manual chaining, learning curve |

### The Philosophy

**Try-catch** สำหรับ **boundary operations** - การติดต่อกับโลกภายนอก
**Either** สำหรับ **core business logic** - การประมวลผลภายในแอปพลิเคชัน

### The Reality

**Try-catch ยังคงจำเป็น** เพราะ:
- JavaScript/TypeScript ecosystem ส่วนใหญ่ใช้ exceptions
- Third-party libraries throw errors
- Browser APIs และ Node.js APIs ใช้ exceptions
- Legacy code integration

## When Try-Catch is Still Necessary

### 1. 🔌 **External API Integration**

```typescript
import { Either, left, right } from '@inh-lib/common';

// ❌ Third-party library ที่ throw errors
import axios from 'axios';

// ✅ Wrap external APIs with try-catch, then convert to Either
const fetchUserData = async (userId: string): Promise<Either<string, User>> => {
  try {
    const response = await axios.get(`/api/users/${userId}`);
    return right(response.data);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      return left(`API Error: ${error.message}`);
    }
    return left(`Unknown error: ${error}`);
  }
};

// ❌ ไม่ใช้ try-catch = unhandled promise rejection
const badFetchUserData = async (userId: string): Promise<Either<string, User>> => {
  const response = await axios.get(`/api/users/${userId}`); // 💥 อาจ throw error
  return right(response.data);
};
```

### 2. 🏗️ **JSON Parsing และ Data Transformation**

```typescript
// ✅ JSON parsing ต้องใช้ try-catch
const parseJsonSafely = <T>(jsonString: string): Either<string, T> => {
  try {
    const parsed = JSON.parse(jsonString);
    return right(parsed);
  } catch (error) {
    return left(`Invalid JSON: ${error.message}`);
  }
};

// ❌ ไม่มี try-catch = app crash
const dangerousParseJson = <T>(jsonString: string): T => {
  return JSON.parse(jsonString); // 💥 อาจ throw SyntaxError
};

// ✅ Chain with validation using Either
const parseAndValidateJson = <T>(
  jsonString: string,
  validator: (data: unknown) => Either<string, T>
): Either<string, T> => {
  const parseResult = parseJsonSafely<unknown>(jsonString);
  if (parseResult.isLeft()) return parseResult;
  
  return validator(parseResult.value);
};
```

### 3. 📁 **File System Operations**

```typescript
import { promises as fs } from 'fs';

// ✅ File operations ต้องใช้ try-catch
const readFileToEither = async (path: string): Promise<Either<string, string>> => {
  try {
    const content = await fs.readFile(path, 'utf-8');
    return right(content);
  } catch (error) {
    return left(`Failed to read file ${path}: ${error.message}`);
  }
};

// ✅ Chain with validation using Either
const readAndParseConfig = async (path: string): Promise<Either<string, AppConfig>> => {
  const fileResult = await readFileToEither(path);
  if (fileResult.isLeft()) return fileResult;
  
  return parseAndValidateJson(fileResult.value, validateAppConfig);
};

// ✅ Pure validation function using Either
const validateAppConfig = (data: unknown): Either<string, AppConfig> => {
  if (typeof data !== 'object' || data === null) {
    return left('Config must be an object');
  }
  
  const obj = data as Record<string, unknown>;
  
  if (typeof obj.port !== 'number') {
    return left('Config.port must be a number');
  }
  
  return right(data as AppConfig);
};
```

### 4. 🌐 **Browser APIs**

```typescript
// ✅ Browser APIs ที่อาจ throw
const getLocationToEither = (): Promise<Either<string, GeolocationPosition>> => {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(left('Geolocation not supported'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => resolve(right(position)),
      (error) => resolve(left(`Location error: ${error.message}`))
    );
  });
};

// ✅ Local storage operations
const getStorageItem = (key: string): Either<string, string> => {
  try {
    const item = localStorage.getItem(key);
    return item !== null 
      ? right(item)
      : left(`Item '${key}' not found`);
  } catch (error) {
    return left(`Storage error: ${error.message}`);
  }
};

// ✅ Pure business logic using Either
const validateStorageData = (data: string): Either<string, UserPreferences> => {
  const parseResult = parseJsonSafely<unknown>(data);
  if (parseResult.isLeft()) return parseResult;
  
  // Validate structure
  const obj = parseResult.value;
  if (typeof obj !== 'object' || obj === null) {
    return left('Invalid preferences format');
  }
  
  return right(obj as UserPreferences);
};
```

### 5. 🔗 **Database Operations**

```typescript
import { Pool } from 'pg';

// ✅ Database operations ต้องใช้ try-catch
class UserRepository {
  constructor(private pool: Pool) {}

  async findById(id: string): Promise<Either<string, User>> => {
    try {
      const query = 'SELECT * FROM users WHERE id = $1';
      const result = await this.pool.query(query, [id]);
      
      if (result.rows.length === 0) {
        return left(`User with ID ${id} not found`);
      }
      
      return right(result.rows[0]);
    } catch (error) {
      return left(`Database error: ${error.message}`);
    }
  }

  async create(userData: CreateUserData): Promise<Either<string, User>> => {
    try {
      const query = `
        INSERT INTO users (name, email, age) 
        VALUES ($1, $2, $3) 
        RETURNING *
      `;
      const result = await this.pool.query(query, [
        userData.name, 
        userData.email, 
        userData.age
      ]);
      
      return right(result.rows[0]);
    } catch (error) {
      if (error.code === '23505') { // Unique constraint violation
        return left(`Email ${userData.email} already exists`);
      }
      return left(`Failed to create user: ${error.message}`);
    }
  }
}

// ✅ Business logic  using Either
const validateUserData = (data: unknown): Either<string, CreateUserData> => {
  if (typeof data !== 'object' || data === null) {
    return left('User data must be an object');
  }
  
  const obj = data as Record<string, unknown>;
  
  if (typeof obj.name !== 'string' || obj.name.trim().length === 0) {
    return left('Name is required');
  }
  
  if (typeof obj.email !== 'string' || !obj.email.includes('@')) {
    return left('Valid email is required');
  }
  
  return right({
    name: obj.name.trim(),
    email: obj.email,
    age: typeof obj.age === 'number' ? obj.age : 0
  });
};
```


## Decision Matrix

### 🤔 เลือกใช้ Try-Catch เมื่อ:

| Scenario | Reason | Example |
|----------|--------|---------|
| **Third-party APIs** | Libraries throw exceptions | `axios`, `fetch`, database drivers |
| **Native APIs** | Browser/Node.js APIs throw | `JSON.parse`, file operations |
| **Boundary operations** | Interface with external world | Network calls, file system |
| **Legacy integration** | Existing code uses exceptions | Wrapping old services |
| **Performance critical** | When no errors expected | Hot paths, calculations |

### 🤔 เลือกใช้ Either เมื่อ:

| Scenario | Reason | Example |
|----------|--------|---------|
| **Business logic** | Predictable error cases | Validation, calculations |
| **Pure functions** | No side effects | Mathematical operations |
| **Simple choices** | Binary outcomes | Valid/invalid, success/fail |
| **Type safety** | Compile-time error checking | Form validation |
| **Functional style** | FP approach | Parsing, transformation |

### 🎯 **Simple Decision Tree:**

```
การจัดการ Error
├── External System?
│   ├── YES → Try-Catch (then convert to Either)
│   └── NO → Either
├── Pure Function?
│   ├── YES → Either
│   └── NO → Try-Catch for I/O, Either for logic
└── Legacy Code?
    ├── YES → Try-Catch (wrap existing)
    └── NO → Either (new code)
```

---

## Summary

### 🎯 **Key Takeaways:**

1. **Try-catch ยังคงจำเป็น** สำหรับ:
   - External APIs และ third-party libraries
   - File operations และ JSON parsing  
   - Browser APIs และ Node.js APIs
   - Legacy code integration

2. **ใช้ร่วมกันได้** และควรใช้:
   - Try-catch สำหรับ boundary operations
   - Either สำหรับ core business logic
   - Helper functions สำหรับแปลงระหว่าง patterns

3. **Best Practice:**
   - Wrap external dependencies ด้วย try-catch
   - Convert exceptions เป็น Either
   - ใช้ pattern เดียวกันใน layer เดียวกัน
   - จัดการ errors อย่างสม่ำเสมอ

4. **Performance:**
   - Try-catch overhead น้อยหาก ไม่ throw
   - Throwing exceptions มี cost สูง
   - Either pattern เร็วกว่าเมื่อมี errors เยอะ

5. **Architecture:**
   - **Boundary Layer**: Try-catch → Either
   - **Business Layer**: Pure Either functions
   - **Application Layer**: Either chains

### 🚀 **Recommendation:**
ใช้ **layered approach** - try-catch ที่ boundaries เพื่อจับ exceptions และแปลงเป็น Either สำหรับ business logic ที่สะอาดและ type-safe! Either เพียงพอสำหรับ core logic โดยไม่ต้องใช้ Result ในระดับนี้
