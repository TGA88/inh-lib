# @inh-lib/common

this lib for sharing type and utility function for service and core layer.

## Content
 - [ResultV2](#resultv2-documentation) 
 - [ResponseBuilder](#responsebuilder-usage-examples)

# ResultV2 Documentation

## 📋 สารบัญ
1. [ภาพรวม](#ภาพรวม)
2. [การติดตั้งและ Import](#การติดตั้งและ-import)
3. [Basic Usage](#basic-usage)
4. [API Reference](#api-reference)
5. [ตัวอย่างการใช้งาน](#ตัวอย่างการใช้งาน)
6. [Best Practices](#best-practices)
7. [FAQ](#faq)

## 🎯 ภาพรวม

**ResultV2** เป็น class ที่ใช้สำหรับจัดการ error handling แบบ functional programming โดยช่วยให้คุณสามารถจัดการกับการดำเนินการที่อาจสำเร็จหรือล้มเหลวได้อย่างปลอดภัย โดยไม่ต้องใช้ try-catch หรือ throw exceptions

### ✨ จุดเด่น
- 🔒 **Type Safe** - ใช้ TypeScript generics เพื่อความปลอดภัยในการใช้งาน
- ⛓️ **Method Chaining** - รองรับการต่อ operations แบบ fluent interface
- 🌊 **Async Support** - รองรับการทำงานแบบ asynchronous
- 🔄 **Immutable** - ไม่สามารถแก้ไขได้หลังจากสร้างแล้ว
- 🎭 **Pattern Matching** - รองรับการจัดการ success/failure แบบ functional

### 🧬 Type Signature
```typescript
class Result<T, F = unknown> {
  // T = Type ของข้อมูลเมื่อสำเร็จ
  // F = Type ของ error เมื่อล้มเหลว (default: unknown)
}
```

## 📦 การติดตั้งและ Import

```typescript
// Import จาก package
import { Result, isSuccess, isFailure, sequence } from '@your-package/common';

// หรือ import แบบ destructuring
import { 
  Result, 
  isSuccess, 
  isFailure, 
  sequence 
} from '@your-package/common';
```

## 🚀 Basic Usage

### การสร้าง Result

```typescript
// สร้าง successful Result
const successResult = Result.ok<string>('Hello World');
const numberResult = Result.ok<number>(42);
const voidResult = Result.ok<void>(); // ไม่มีค่า return

// สร้าง failed Result
const errorResult = Result.fail<string>('Something went wrong');
const customErrorResult = Result.fail<string, { code: number; message: string }>({
  code: 404,
  message: 'Not found'
});
```

### การเข้าถึงข้อมูล

```typescript
const result = Result.ok<string>('Hello');

// การเข้าถึงค่า
if (result.isSuccess) {
  console.log(result.getValue()); // 'Hello'
}

// การเข้าถึงแบบปลอดภัย
const value = result.getValueOrDefault('Default'); // 'Hello'
const maybeValue = result.getValueOrUndefined(); // 'Hello' | undefined

// การเข้าถึง error
const errorResult = Result.fail<string>('Error occurred');
if (errorResult.isFailure) {
  console.log(errorResult.errorValue()); // 'Error occurred'
}
```

## 📚 API Reference

### Instance Methods

#### getValue(): T
ดึงค่าจาก successful Result หากเป็น failed Result จะ throw error

```typescript
const result = Result.ok<string>('Hello');
const value = result.getValue(); // 'Hello'

const failed = Result.fail<string>('Error');
// failed.getValue(); // ❌ จะ throw error
```

#### getValueOrDefault(defaultValue: T): T
ดึงค่าจาก Result หากไม่สำเร็จจะคืนค่า default

```typescript
const success = Result.ok<string>('Hello');
const failed = Result.fail<string>('Error');

console.log(success.getValueOrDefault('Default')); // 'Hello'
console.log(failed.getValueOrDefault('Default'));  // 'Default'
```

#### getValueOrUndefined(): T | undefined
ดึงค่าจาก Result หากไม่สำเร็จจะคืน undefined

```typescript
const success = Result.ok<string>('Hello');
const failed = Result.fail<string>('Error');

console.log(success.getValueOrUndefined()); // 'Hello'
console.log(failed.getValueOrUndefined());  // undefined
```

#### errorValue(): F
ดึง error จาก failed Result หากเป็น successful Result จะ throw error

```typescript
const failed = Result.fail<string>('Something went wrong');
const error = failed.errorValue(); // 'Something went wrong'
```

#### chain<U>(fn: (value: T) => Result<U, F>): Result<U, F>
ต่อ operations แบบ sequential หากขั้นตอนใดล้มเหลวจะหยุดทันที

```typescript
const result = Result.ok<number>(5)
  .chain(x => Result.ok<string>(`Value: ${x}`))
  .chain(text => Result.ok<string>(text.toUpperCase()));

console.log(result.getValue()); // 'VALUE: 5'

// กรณีมี error
const failedChain = Result.ok<number>(5)
  .chain(x => Result.fail<string>('Conversion failed'))
  .chain(text => Result.ok<string>(text.toUpperCase())); // ไม่ทำงาน

console.log(failedChain.errorValue()); // 'Conversion failed'
```

#### map<U>(fn: (value: T) => U): Result<U, F>
แปลงค่าภายใน Result โดยอัตโนมัติจับ exceptions

```typescript
const result = Result.ok<number>(42)
  .map(x => x * 2)
  .map(x => `Result: ${x}`);

console.log(result.getValue()); // 'Result: 84'

// จับ exception อัตโนมัติ
const errorMap = Result.ok<string>('hello')
  .map(x => {
    throw new Error('Something went wrong');
  });

console.log(errorMap.isFailure); // true
```

#### mapError<G>(fn: (error: F) => G): Result<T, G>
แปลง error type ใน failed Result

```typescript
const result = Result.fail<string>('404')
  .mapError(code => ({
    status: parseInt(code),
    message: 'Not Found'
  }));

console.log(result.errorValue()); // { status: 404, message: 'Not Found' }
```

#### chainAsync<U>(fn: (value: T) => Promise<Result<U, F>>): Promise<Result<U, F>>
ต่อ async operations

```typescript
const fetchUser = async (id: string): Promise<Result<User, string>> => {
  // simulate API call
  return Result.ok({ id, name: 'John', email: 'john@example.com' });
};

const result = await Result.ok<string>('123')
  .chainAsync(fetchUser);

console.log(result.getValue()); // { id: '123', name: 'John', email: 'john@example.com' }
```

#### mapAsync<U>(fn: (value: T) => Promise<U>): Promise<Result<U, F>>
แปลงค่าด้วย async function

```typescript
const processData = async (data: string): Promise<string> => {
  // simulate async processing
  return `Processed: ${data}`;
};

const result = await Result.ok<string>('input')
  .mapAsync(processData);

console.log(result.getValue()); // 'Processed: input'
```

#### tap(fn: (value: T) => void): this
ทำ side effects โดยไม่เปลี่ยนค่า (สำหรับ successful Result)

```typescript
const result = Result.ok<string>('Hello')
  .tap(value => console.log(`Success: ${value}`)) // จะ log
  .map(value => value.toUpperCase());

console.log(result.getValue()); // 'HELLO'
```

## 🆚 Side Effect vs Transform

### 🔄 Side Effect คืออะไร?
**Side Effect** หมายถึงการดำเนินการที่มีผลกระทบต่อสิ่งที่อยู่นอก function หรือมีการเปลี่ยนแปลงสถานะที่สังเกตได้จากภายนอก แต่**ไม่เปลี่ยนแปลงค่าที่ return**

### 🔧 Transform คืออะไร?
**Transform** หมายถึงการแปลงข้อมูลจากรูปแบบหนึ่งไปเป็นอีกรูปแบบหนึ่ง โดย**เปลี่ยนแปลงค่าที่ return** แต่**ไม่มีผลกระทบข้างเคียง**

### 📊 เปรียบเทียบ Side Effect vs Transform

| Aspect | **Side Effect** | **Transform** |
|--------|----------------|---------------|
| **Return Value** | ไม่เปลี่ยนค่าที่ return | เปลี่ยนค่าที่ return |
| **External Impact** | มีผลกระทบต่อภายนอก | ไม่มีผลกระทบต่อภายนอก |
| **Method ใน Result** | `.tap()`, `.tapError()` | `.map()`, `.chain()` |
| **Purity** | Impure function | Pure function |
| **Testability** | ยากต่อการ test | ง่ายต่อการ test |

### 🔍 ตัวอย่างการใช้งาน

```typescript
interface User {
  id: string;
  name: string;
  email: string;
}

const processUser = (user: User): Result<User, string> => {
  return Result.ok(user)
    // Side Effects - ไม่เปลี่ยนค่า user
    .tap(u => console.log('🔄 Processing user:', u.name))     // Logging
    .tap(u => metrics.increment('user.processed'))           // Metrics
    .tap(u => auditLog.record('USER_ACCESSED', u.id))       // Audit logging
    .tap(u => cache.set(u.id, u))                           // Caching
    
    // Transforms - เปลี่ยนแปลงข้อมูล
    .map(u => ({ ...u, name: u.name.toUpperCase() }))       // Transform name
    .map(u => ({ ...u, email: u.email.toLowerCase() }))     // Transform email
    .map(u => ({ ...u, processedAt: new Date() }))          // Add timestamp
    
    // Side Effects หลัง transform
    .tap(processedUser => {
      console.log('✅ User processed:', processedUser.name);
      sendNotification(processedUser.email, 'Account updated');
    });
};

// ค่าใน Result เปลี่ยนแปลงตาม transforms แต่ side effects ไม่เปลี่ยนค่า
```

### 🎯 ตัวอย่าง Side Effects
```typescript
// ✅ ตัวอย่าง Side Effects ที่ถูกต้อง
Result.ok(data)
  .tap(d => console.log('Processing:', d))          // Logging
  .tap(d => saveToDatabase(d))                      // Database save
  .tap(d => sendEmail(d.email, 'Welcome'))          // Email notification
  .tap(d => metrics.increment('user.created'))      // Metrics
  .tap(d => cache.invalidate(d.category))           // Cache management
  .map(d => d.name); // ค่าสุดท้ายยังคงเป็น original data
```

### 🔄 ตัวอย่าง Transforms
```typescript
// ✅ ตัวอย่าง Transforms ที่ถูกต้อง
Result.ok('john doe')
  .map(name => name.trim())                         // 'john doe'
  .map(name => name.toUpperCase())                  // 'JOHN DOE'
  .map(name => name.split(' '))                     // ['JOHN', 'DOE']
  .map(parts => ({                                  // { firstName: 'JOHN', lastName: 'DOE' }
    firstName: parts[0],
    lastName: parts[1]
  }));
```

### ⚠️ Common Mistakes

```typescript
// ❌ ผิด - ทำ side effects ใน map
Result.ok(user)
  .map(u => {
    console.log('Processing:', u.name);  // ❌ Side effect ใน map
    saveToDatabase(u);                   // ❌ Side effect ใน map
    return u.name.toUpperCase();         // Transform
  });

// ✅ ถูก - แยก side effects และ transforms
Result.ok(user)
  .tap(u => console.log('Processing:', u.name))     // ✅ Side effect
  .tap(u => saveToDatabase(u))                     // ✅ Side effect
  .map(u => u.name.toUpperCase());                 // ✅ Transform
```

#### tapError(fn: (error: F) => void): this
ทำ side effects โดยไม่เปลี่ยนค่า (สำหรับ failed Result)

```typescript
const result = Result.fail<string>('Error occurred')
  .tapError(error => console.log(`Error: ${error}`)) // จะ log
  .mapError(error => `Handled: ${error}`);

console.log(result.errorValue()); // 'Handled: Error occurred'
```

#### match<U>(onSuccess: (value: T) => U, onError: (error: F) => U): U
Pattern matching สำหรับจัดการทั้ง success และ failure

```typescript
const result = Result.ok<number>(42);

const message = result.match(
  value => `Success: ${value}`,
  error => `Error: ${error}`
);

console.log(message); // 'Success: 42'
```

#### toHttpResponse(res: ResponseObject)
แปลงเป็น HTTP response สำหรับ web APIs

```typescript
// Express.js example
app.get('/users/:id', (req, res) => {
  return getUserById(req.params.id).toHttpResponse(res);
});

// Success response: { success: true, data: { ... } }
// Error response: { success: false, error: "..." } with status 400
```

### Static Methods

#### Result.ok<T, F>(value?: T): Result<T, F>
สร้าง successful Result

```typescript
const stringResult = Result.ok<string>('Hello');
const numberResult = Result.ok<number>(42);
const voidResult = Result.ok<void>();
```

#### Result.fail<T, F>(error: F): Result<T, F>
สร้าง failed Result

```typescript
const errorResult = Result.fail<string>('Something went wrong');
const customError = Result.fail<User, ApiError>({
  code: 'USER_NOT_FOUND',
  message: 'User does not exist'
});
```

#### Result.from<T, F>(fn: () => T, errorMapper?: (error: unknown) => F): Result<T, F>
สร้าง Result จาก function โดยจับ exceptions อัตโนมัติ

```typescript
const result = Result.from(
  () => JSON.parse('{"name": "John"}'),
  error => `Parse error: ${error.message}`
);

const safeParseInt = (str: string) => Result.from(
  () => {
    const num = parseInt(str);
    if (isNaN(num)) throw new Error('Not a number');
    return num;
  }
);
```

#### Result.fromAsync<T, F>(fn: () => Promise<T>, errorMapper?: (error: unknown) => F): Promise<Result<T, F>>
สร้าง Result จาก async function

```typescript
const fetchData = async (url: string) => {
  return Result.fromAsync(
    () => fetch(url).then(res => res.json()),
    error => `Fetch error: ${error.message}`
  );
};
```

#### Result.combine<T>(results: T): Result<...>
รวม Results หลายตัว หากมีตัวใดล้มเหลวก็จะล้มเหลวทั้งหมด

```typescript
const results = [
  Result.ok<string>('Hello'),
  Result.ok<number>(42),
  Result.ok<boolean>(true)
] as const;

const combined = Result.combine(results);
if (combined.isSuccess) {
  const [str, num, bool] = combined.getValue();
  console.log(str, num, bool); // 'Hello', 42, true
}
```

#### Result.combineWith<T, R, F>(results: Result<T, F>[], combiner: (values: T[]) => R): Result<R, F>
รวม Results พร้อมใช้ combiner function

```typescript
const numbers = [
  Result.ok<number>(1),
  Result.ok<number>(2),
  Result.ok<number>(3)
];

const sum = Result.combineWith(
  numbers,
  values => values.reduce((a, b) => a + b, 0)
);

console.log(sum.getValue()); // 6
```

#### Result.firstSuccess<T, F>(results: Result<T, F>[]): Result<T, F[]>
คืน Result แรกที่สำเร็จ หากไม่มีจะคืน array ของ errors

```typescript
const attempts = [
  Result.fail<string, string>('Service 1 down'),
  Result.fail<string, string>('Service 2 down'),
  Result.ok<string, string>('Service 3 success')
];

const result = Result.firstSuccess(attempts);
console.log(result.getValue()); // 'Service 3 success'
```

### Utility Functions

#### isSuccess<T, F>(result: Result<T, F>): boolean
Type guard สำหรับตรวจสอบว่าเป็น successful Result

```typescript
const result = Result.ok<string>('Hello');

if (isSuccess(result)) {
  // TypeScript รู้ว่า result เป็น successful Result
  console.log(result.getValue()); // Type safe
}
```

#### isFailure<T, F>(result: Result<T, F>): boolean
Type guard สำหรับตรวจสอบว่าเป็น failed Result

```typescript
const result = Result.fail<string>('Error');

if (isFailure(result)) {
  // TypeScript รู้ว่า result เป็น failed Result
  console.log(result.errorValue()); // Type safe
}
```

#### sequence<T, F>(results: Result<T, F>[]): Result<T[], F>
แปลง array ของ Results เป็น Result ของ array

```typescript
const results = [
  Result.ok<string>('first'),
  Result.ok<string>('second'),
  Result.ok<string>('third')
];

const sequenced = sequence(results);
console.log(sequenced.getValue()); // ['first', 'second', 'third']
```

## 💡 ตัวอย่างการใช้งาน

### 1. 🔍 User Validation Pipeline

```typescript
interface User {
  id: string;
  name: string;
  email: string;
  age: number;
}

interface ValidationError {
  field: string;
  message: string;
}

const validateUserId = (id: string): Result<string, ValidationError> => {
  if (!id || id.length === 0) {
    return Result.fail({ field: 'id', message: 'ID is required' });
  }
  if (!/^[0-9]+$/.test(id)) {
    return Result.fail({ field: 'id', message: 'ID must be numeric' });
  }
  return Result.ok(id);
};

const fetchUser = async (id: string): Promise<Result<User, ValidationError>> => {
  // Simulate database call
  const users: User[] = [
    { id: '1', name: 'John Doe', email: 'john@example.com', age: 25 }
  ];
  
  const user = users.find(u => u.id === id);
  if (!user) {
    return Result.fail({ field: 'user', message: 'User not found' });
  }
  
  return Result.ok(user);
};

const validateAge = (user: User): Result<User, ValidationError> => {
  if (user.age < 18) {
    return Result.fail({ field: 'age', message: 'User must be 18 or older' });
  }
  return Result.ok(user);
};

// การใช้งาน
const processUser = async (userId: string) => {
  const result = await Result.ok(userId)
    .chain(validateUserId)
    .chainAsync(fetchUser)
    .then(result => result.chain(validateAge))
    .then(result => result.tap(user => 
      console.log(`✅ User ${user.name} processed successfully`)
    ))
    .then(result => result.tapError(error => 
      console.error(`❌ Validation failed: ${error.field} - ${error.message}`)
    ));

  return result;
};

// การใช้งาน
processUser('1'); // ✅ Success
processUser('17-year-old-id'); // ❌ Age validation fails
```

### 2. 🌐 HTTP API Integration

```typescript
interface ApiResponse<T> {
  data: T;
  status: number;
}

interface ApiError {
  code: string;
  message: string;
  status: number;
}

const apiCall = async <T>(url: string): Promise<Result<T, ApiError>> => {
  return Result.fromAsync(
    async () => {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return response.json() as T;
    },
    error => ({
      code: 'API_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error',
      status: 500
    })
  );
};

// Express.js Controller
const getUserController = async (req: Request, res: Response) => {
  const result = await Result.ok(req.params.id)
    .chain(validateUserId)
    .chainAsync(id => apiCall<User>(`/api/users/${id}`))
    .then(result => result.map(user => ({
      ...user,
      isAdult: user.age >= 18
    })));

  return result.toHttpResponse(res);
};
```

### 3. 🔄 Batch Processing

```typescript
const processItems = async (items: string[]): Promise<Result<string[], string>> => {
  const processItem = async (item: string): Promise<Result<string, string>> => {
    if (item === 'invalid') {
      return Result.fail(`Cannot process item: ${item}`);
    }
    
    // Simulate processing
    await new Promise(resolve => setTimeout(resolve, 100));
    return Result.ok(`Processed: ${item}`);
  };

  // Process all items
  const results = await Promise.all(
    items.map(item => processItem(item))
  );

  // Use sequence to convert Result[] to Result<[]>
  return sequence(results);
};

// การใช้งาน
const items = ['item1', 'item2', 'item3'];
const result = await processItems(items);

result.match(
  processedItems => console.log('All processed:', processedItems),
  error => console.error('Processing failed:', error)
);
```

### 4. 🎯 Error Recovery Pattern

```typescript
const tryMultipleServices = async (data: string): Promise<Result<string, string[]>> => {
  const service1 = (): Promise<Result<string, string>> => 
    Result.fromAsync(() => Promise.reject('Service 1 unavailable'));
  
  const service2 = (): Promise<Result<string, string>> => 
    Result.fromAsync(() => Promise.reject('Service 2 unavailable'));
  
  const service3 = (): Promise<Result<string, string>> => 
    Result.fromAsync(() => Promise.resolve(`Service 3: ${data}`));

  const results = await Promise.all([
    service1(),
    service2(), 
    service3()
  ]);

  return Result.firstSuccess(results);
};

// การใช้งาน
const result = await tryMultipleServices('test data');
result.match(
  data => console.log('Success:', data),
  errors => console.log('All services failed:', errors)
);
```

### 5. 📊 Configuration Loading

```typescript
interface Config {
  apiUrl: string;
  timeout: number;
  retries: number;
}

interface ConfigError {
  field: string;
  issue: string;
}

const loadConfigFile = (): Result<unknown, ConfigError> => {
  return Result.from(
    () => {
      // Simulate reading config file
      const configText = '{"apiUrl": "https://api.example.com", "timeout": 5000}';
      return JSON.parse(configText);
    },
    () => ({ field: 'file', issue: 'Cannot read config file' })
  );
};

const validateConfig = (raw: unknown): Result<Config, ConfigError> => {
  const config = raw as Partial<Config>;
  
  if (!config.apiUrl) {
    return Result.fail({ field: 'apiUrl', issue: 'Missing API URL' });
  }
  
  if (!config.timeout || config.timeout <= 0) {
    return Result.fail({ field: 'timeout', issue: 'Invalid timeout value' });
  }

  return Result.ok({
    apiUrl: config.apiUrl,
    timeout: config.timeout,
    retries: config.retries || 3 // default value
  });
};

// การใช้งาน
const configResult = loadConfigFile()
  .chain(validateConfig)
  .tap(config => console.log('✅ Config loaded:', config.apiUrl))
  .tapError(error => console.error(`❌ Config error in ${error.field}: ${error.issue}`));

if (configResult.isSuccess) {
  const config = configResult.getValue();
  // Use config...
}
```

## 🎯 Best Practices

### 1. ✅ Type Safety
```typescript
// ✅ ระบุ types ให้ชัดเจน
const parseUser = (data: string): Result<User, string> => {
  return Result.from(() => JSON.parse(data) as User);
};

// ❌ ไม่ระบุ type
const parseData = (data: string) => {
  return Result.from(() => JSON.parse(data));
};
```

### 2. ✅ Error Types
```typescript
// ✅ ใช้ custom error types
interface ValidationError {
  field: string;
  message: string;
  code: string;
}

const validate = (input: string): Result<string, ValidationError> => {
  if (!input) {
    return Result.fail({
      field: 'input',
      message: 'Input is required',
      code: 'REQUIRED'
    });
  }
  return Result.ok(input);
};

// ❌ ใช้ string error แบบธรรมดา
const validateBad = (input: string): Result<string, string> => {
  return input ? Result.ok(input) : Result.fail('Input required');
};
```

### 3. ✅ Method Chaining
```typescript
// ✅ ใช้ method chaining อย่างมีเหตุผล
const processData = (input: string) => {
  return Result.ok(input)
    .map(data => data.trim())
    .chain(validateInput)
    .chainAsync(processAsync)
    .then(result => result.tap(data => logSuccess(data)))
    .then(result => result.tapError(error => logError(error)));
};

// ❌ nested callbacks
const processDataBad = async (input: string) => {
  const trimmed = Result.ok(input.trim());
  if (trimmed.isSuccess) {
    const validated = validateInput(trimmed.getValue());
    if (validated.isSuccess) {
      const processed = await processAsync(validated.getValue());
      // ... more nesting
    }
  }
};
```

### 4. ✅ Error Handling
```typescript
// ✅ ใช้ match สำหรับ final result handling
const handleResult = (result: Result<User, ApiError>) => {
  return result.match(
    user => ({ success: true, data: user }),
    error => ({ success: false, error: error.message })
  );
};

// ✅ ใช้ tap/tapError สำหรับ side effects
const processWithLogging = (data: string) => {
  return Result.ok(data)
    .tap(data => console.log(`Processing: ${data}`))
    .chain(validate)
    .tapError(error => console.error(`Validation failed: ${error}`))
    .chain(process);
};
```

### 5. ✅ Async Operations
```typescript
// ✅ ใช้ chainAsync สำหรับ Result-returning async functions
const processAsync = async (id: string) => {
  return await Result.ok(id)
    .chainAsync(fetchUser)
    .then(result => result.chainAsync(enrichUser))
    .then(result => result.chainAsync(saveUser));
};

// ✅ ใช้ mapAsync สำหรับ value-returning async functions
const transformAsync = async (data: string) => {
  return await Result.ok(data)
    .mapAsync(async data => {
      const processed = await externalProcess(data);
      return processed.toUpperCase();
    });
};
```

### 6. ✅ Side Effects vs Transforms
```typescript
// ✅ ใช้ tap สำหรับ side effects (ไม่เปลี่ยนค่า)
const withSideEffects = (user: User) => {
  return Result.ok(user)
    .tap(u => console.log(`Processing user: ${u.name}`))     // Logging
    .tap(u => auditLog.record('USER_PROCESSED', u.id))      // Audit
    .tap(u => metrics.increment('user.processing.count'))   // Metrics
    .tap(u => cache.set(`user:${u.id}`, u))                // Caching
    .map(u => ({ ...u, lastProcessed: new Date() }));       // Transform
};

// ✅ ใช้ map สำหรับ transforms (เปลี่ยนค่า)
const withTransforms = (input: string) => {
  return Result.ok(input)
    .map(s => s.trim())                    // Transform: remove whitespace
    .map(s => s.toLowerCase())             // Transform: to lowercase
    .map(s => s.split(' '))                // Transform: to array
    .map(words => words.filter(w => w));   // Transform: remove empty
};

// ❌ ไม่ควรทำ side effects ใน map
const badPractice = (user: User) => {
  return Result.ok(user)
    .map(u => {
      console.log('Processing:', u.name);  // ❌ Side effect ใน map
      saveToDatabase(u);                   // ❌ Side effect ใน map
      return u.name.toUpperCase();         // Transform
    });
};

// ✅ แยก side effects และ transforms ให้ชัดเจน
const goodPractice = (user: User) => {
  return Result.ok(user)
    .tap(u => console.log('Processing:', u.name))    // ✅ Side effect
    .tap(u => saveToDatabase(u))                     // ✅ Side effect
    .map(u => u.name.toUpperCase());                 // ✅ Transform
};
```

## ❓ FAQ

### Q: เมื่อไหร่ควรใช้ Result แทน try-catch?
**A:** ใช้ Result เมื่อ:
- ต้องการ type safety สำหรับ errors
- มี operations หลายขั้นตอนที่อาจล้มเหลว
- ต้องการ functional programming style
- ต้องการ method chaining

### Q: Result vs Optional/Maybe?
**A:** Result เหมาะสำหรับกรณีที่ต้องการข้อมูล error, Optional/Maybe เหมาะสำหรับกรณีที่อาจมีหรือไม่มีค่า

### Q: จะจัดการ nested Results ยังไง?
**A:** ใช้ `chain()` แทน `map()` เพื่อหลีกเลี่ยง `Result<Result<T>>`

```typescript
// ❌ nested Results
const nested = result.map(value => anotherResult(value)); // Result<Result<U>>

// ✅ flattened
const flattened = result.chain(value => anotherResult(value)); // Result<U>
```

### Q: จะรวม Results หลายตัวยังไง?
**A:** ใช้ `Result.combine()` หรือ `sequence()`:

```typescript
// สำหรับ Results ที่ต่างกัน
const combined = Result.combine([userResult, configResult, dataResult]);

// สำหรับ Results เหมือนกัน
const sequenced = sequence([result1, result2, result3]);
```

### Q: จะแปลง Promise เป็น Result ยังไง?
**A:** ใช้ `Result.fromAsync()`:

```typescript
const result = await Result.fromAsync(
  () => fetch('/api/data').then(res => res.json()),
  error => `API Error: ${error.message}`
);
```

### Q: Side Effect และ Transform ต่างกันยังไง?
**A:** 
- **Side Effect** (ใช้ `.tap()`): ทำกิจกรรมข้างเคียงโดยไม่เปลี่ยนค่า เช่น logging, database save, notifications
- **Transform** (ใช้ `.map()`): แปลงข้อมูลจากรูปแบบหนึ่งไปอีกรูปแบบหนึ่ง

```typescript
// Side Effect - ไม่เปลี่ยนค่า
Result.ok(user).tap(u => console.log(u.name)); // ค่ายังคงเป็น user

// Transform - เปลี่ยนค่า
Result.ok(user).map(u => u.name); // ค่าเปลี่ยนเป็น string
```

### Q: เมื่อไหร่ควรใช้ tap และเมื่อไหร่ควรใช้ map?
**A:**
- ใช้ **`.tap()`** เมื่อต้องการ: logging, metrics, caching, notifications, audit trails
- ใช้ **`.map()`** เมื่อต้องการ: แปลงข้อมูล, คำนวณค่าใหม่, format ข้อมูล, extract properties

```typescript
// ตัวอย่างการผสมใช้
Result.ok(rawData)
  .tap(data => logger.info('Processing started'))  // Side effect
  .map(data => data.trim())                        // Transform
  .map(data => JSON.parse(data))                   // Transform
  .tap(parsed => cache.set('data', parsed))        // Side effect
  .map(parsed => parsed.result);                   // Transform
```

---

**🎉 ขอให้สนุกกับการใช้ ResultV2!** 

สำหรับคำถามเพิ่มเติมหรือการพัฒนาฟีเจอร์ใหม่ กรุณาติดต่อทีมพัฒนา

---

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
