🎯 สรุป Use Cases ทั้งหมด:
1. Basic Usage - เริ่มต้น

สร้าง success/error results
ดึงค่าและ handle errors
Safe value extraction

2. Chain Operations - Pipeline

Validation → Fetch → Process → Save
หยุดทันทีเมื่อเจอ error
ไม่ต้องเขียน if-else ซ้อน

3. Map Operations - แปลงข้อมูล

Transform values
Transform error types
Preserve error context

4. Async Operations - ทำงาน async

chainAsync() สำหรับ async functions
mapAsync() สำหรับ async transformations
Promise integration

5. File Operations - จัดการไฟล์

Read files
Parse JSON
Config validation
Error handling for I/O

6. HTTP API - สำหรับ REST API

Express.js integration
toHttpResponse() method
CRUD operations
Automatic status codes

7. Business Logic - ตรรกะทางธุรกิจ

Order processing
Inventory management
Payment processing
Complex validation rules

8. Complex Workflows - ซับซ้อน

Result.combine() - รวมหลาย results
Result.firstSuccess() - ลองหลาย options
Batch processing
Sequence operations

9. Testing - การทดสอบ

match() method สำหรับ assert
Test different scenarios
Error case testing

10. Performance - ติดตาม performance

Timing wrappers
Logging และ monitoring
Production debugging

🚀 เคล็ดลับการใช้งาน:
เริ่มจาก Simple → ไป Complex:

เริ่มด้วย basic ok() / fail()
เพิ่ม chain() สำหรับ pipeline
ใช้ tap() สำหรับ logging
toHttpResponse() สำหรับ API
chainAsync() สำหรับ async operations

// =================================================================
// 1. 🏁 Basic Usage - การใช้งานพื้นฐาน
// =================================================================

// สร้าง Success Result
const successResult = Result.ok<string>('Hello World');
console.log(successResult.getValue()); // 'Hello World'

// สร้าง Error Result
const errorResult = Result.fail<string>('Something went wrong');
console.log(errorResult.errorValue()); // 'Something went wrong'

// Safe value extraction
const value = successResult.getValueOrDefault('default value'); // 'Hello World'
const errorValue = errorResult.getValueOrDefault('default value'); // 'default value'

// =================================================================
// 2. 🔗 Chain Operations - Pipeline การทำงาน
// =================================================================

interface User {
  id: string;
  name: string;
  email: string;
  age: number;
}

interface ProcessedUser extends User {
  isAdult: boolean;
  emailDomain: string;
}

// Validation functions
const validateUserId = (id: string): Result<string, string> => {
  return id.length > 0 && /^[0-9]+$/.test(id)
    ? Result.ok(id)
    : Result.fail('Invalid user ID format');
};

const fetchUser = (id: string): Result<User, string> => {
  // Simulate database lookup
  const users = [
    { id: '1', name: 'John Doe', email: 'john@gmail.com', age: 25 },
    { id: '2', name: 'Jane Smith', email: 'jane@yahoo.com', age: 17 }
  ];
  
  const user = users.find(u => u.id === id);
  return user 
    ? Result.ok(user)
    : Result.fail(`User with ID ${id} not found`);
};

const processUser = (user: User): Result<ProcessedUser, string> => {
  try {
    const processed: ProcessedUser = {
      ...user,
      isAdult: user.age >= 18,
      emailDomain: user.email.split('@')[1]
    };
    return Result.ok(processed);
  } catch (error) {
    return Result.fail('Failed to process user data');
  }
};

const validateAdult = (user: ProcessedUser): Result<ProcessedUser, string> => {
  return user.isAdult 
    ? Result.ok(user)
    : Result.fail('User must be 18 or older');
};

// Chain example
const processUserPipeline = (userId: string): Result<ProcessedUser, string> => {
  return Result.ok(userId)
    .chain(validateUserId)
    .chain(fetchUser)
    .chain(processUser)
    .chain(validateAdult)
    .tap(user => console.log(`✅ Successfully processed user: ${user.name}`))
    .tapError(error => console.error(`❌ Error: ${error}`));
};

// =================================================================
// 3. 🗺️ Map Operations - การแปลงข้อมูล
// =================================================================

const numberResult = Result.ok<number>(42);

// Map value
const doubled = numberResult.map(n => n * 2); // Result<number>
const stringified = numberResult.map(n => n.toString()); // Result<string>
const complex = numberResult.map(n => ({ value: n, squared: n * n })); // Result<object>

// Map error
const errorMapped = Result.fail<number>('Not a number')
  .mapError(err => ({ code: 'VALIDATION_ERROR', message: err }));

// =================================================================
// 4. 🌊 Async Operations - การทำงานแบบ Async
// =================================================================

const fetchUserFromAPI = async (id: string): Promise<Result<User, string>> => {
  try {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 100));
    
    if (id === '999') {
      return Result.fail('User not found in API');
    }
    
    const user: User = {
      id,
      name: 'API User',
      email: 'api@example.com',
      age: 30
    };
    
    return Result.ok(user);
  } catch (error) {
    return Result.fail(`API Error: ${error}`);
  }
};

const saveUserToDB = async (user: ProcessedUser): Promise<Result<ProcessedUser, string>> => {
  try {
    // Simulate database save
    await new Promise(resolve => setTimeout(resolve, 50));
    console.log(`💾 Saved user ${user.name} to database`);
    return Result.ok(user);
  } catch (error) {
    return Result.fail(`Database save failed: ${error}`);
  }
};

// Async chain example
const processUserAsync = async (userId: string): Promise<Result<ProcessedUser, string>> => {
  const result = await Result.ok(userId)
    .chain(validateUserId)
    .chainAsync(fetchUserFromAPI)  // Async chain
    .then(result => result.chain(processUser))
    .then(result => result.chain(validateAdult))
    .then(result => result.chainAsync(saveUserToDB));  // Async chain

  return result;
};

// Map async example
const enrichUserData = async (user: User): Promise<Result<User & { avatar: string }, string>> => {
  try {
    // Simulate fetching avatar
    await new Promise(resolve => setTimeout(resolve, 100));
    const enriched = { ...user, avatar: `https://avatar.com/${user.id}` };
    return Result.ok(enriched);
  } catch (error) {
    return Result.fail('Failed to fetch avatar');
  }
};

const processWithEnrichment = async (userId: string) => {
  return await Result.ok(userId)
    .chain(validateUserId)
    .chainAsync(fetchUserFromAPI)
    .then(result => result.mapAsync(enrichUserData))  // Map async
    .then(result => result.chain(user => processUser(user)));
};

// =================================================================
// 5. 📁 File Operations - การจัดการไฟล์
// =================================================================

const readFileContent = (filename: string): Result<string, string> => {
  return Result.from(
    () => {
      // Simulate file reading
      if (filename === 'missing.txt') {
        throw new Error('File not found');
      }
      if (filename === 'empty.txt') {
        return '';
      }
      return `Content of ${filename}`;
    },
    error => `File Error: ${error}`
  );
};

const parseJSON = <T>(content: string): Result<T, string> => {
  return Result.from(
    () => JSON.parse(content) as T,
    error => `JSON Parse Error: ${error}`
  );
};

const validateConfig = (config: unknown): Result<{ apiUrl: string; timeout: number }, string> => {
  const c = config as { apiUrl?: string; timeout?: number };
  
  if (!c.apiUrl) return Result.fail('Missing apiUrl in config');
  if (!c.timeout || c.timeout <= 0) return Result.fail('Invalid timeout in config');
  
  return Result.ok({ apiUrl: c.apiUrl, timeout: c.timeout });
};

// File processing pipeline
const loadConfig = (filename: string) => {
  return readFileContent(filename)
    .chain(parseJSON<unknown>)
    .chain(validateConfig)
    .tap(config => console.log(`✅ Config loaded: ${config.apiUrl}`))
    .tapError(error => console.error(`❌ Config error: ${error}`));
};

// =================================================================
// 6. 🌐 HTTP API Integration - การต่อ API
// =================================================================

// Express.js handlers
const userController = {
  // GET /users/:id
  getUser: (req: { params: { id: string } }, res: { json: (data: unknown) => void; status: (code: number) => { json: (data: unknown) => void } }) => {
    return processUserPipeline(req.params.id).toHttpResponse(res);
  },

  // POST /users
  createUser: async (req: { body: Partial<User> }, res: { json: (data: unknown) => void; status: (code: number) => { json: (data: unknown) => void } }) => {
    const result = await validateCreateUserInput(req.body)
      .chainAsync(createUserInDB)
      .then(result => result.chainAsync(sendWelcomeEmail));
    
    return result.toHttpResponse(res);
  },

  // PUT /users/:id  
  updateUser: async (req: { params: { id: string }; body: Partial<User> }, res: { json: (data: unknown) => void; status: (code: number) => { json: (data: unknown) => void } }) => {
    const result = await Result.ok({ id: req.params.id, updates: req.body })
      .chain(validateUpdateInput)
      .chainAsync(updateUserInDB)
      .then(result => result.tap(user => console.log(`Updated user: ${user.name}`)));
    
    return result.toHttpResponse(res);
  }
};

// Helper functions for user controller
const validateCreateUserInput = (input: Partial<User>): Result<User, string> => {
  if (!input.name) return Result.fail('Name is required');
  if (!input.email) return Result.fail('Email is required');
  if (!input.age || input.age < 0) return Result.fail('Valid age is required');
  
  return Result.ok({
    id: Date.now().toString(),
    name: input.name,
    email: input.email,
    age: input.age
  });
};

const createUserInDB = async (user: User): Promise<Result<User, string>> => {
  try {
    // Simulate database save
    await new Promise(resolve => setTimeout(resolve, 100));
    return Result.ok(user);
  } catch (error) {
    return Result.fail(`Database error: ${error}`);
  }
};

const sendWelcomeEmail = async (user: User): Promise<Result<User, string>> => {
  try {
    // Simulate email sending
    console.log(`📧 Welcome email sent to ${user.email}`);
    return Result.ok(user);
  } catch (error) {
    return Result.fail(`Email sending failed: ${error}`);
  }
};

const validateUpdateInput = (input: { id: string; updates: Partial<User> }): Result<{ id: string; updates: Partial<User> }, string> => {
  if (!input.id) return Result.fail('User ID is required');
  if (Object.keys(input.updates).length === 0) return Result.fail('No updates provided');
  return Result.ok(input);
};

const updateUserInDB = async (input: { id: string; updates: Partial<User> }): Promise<Result<User, string>> => {
  try {
    // Simulate database update
    const updatedUser: User = {
      id: input.id,
      name: input.updates.name || 'Default Name',
      email: input.updates.email || 'default@example.com',
      age: input.updates.age || 0
    };
    return Result.ok(updatedUser);
  } catch (error) {
    return Result.fail(`Update failed: ${error}`);
  }
};

// =================================================================
// 7. 💰 Business Logic - ตรรกะทางธุรกิจ
// =================================================================

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
}

interface Order {
  id: string;
  userId: string;
  items: Array<{ productId: string; quantity: number }>;
  total: number;
}

const validateOrder = (orderData: Partial<Order>): Result<Order, string> => {
  if (!orderData.userId) return Result.fail('User ID is required');
  if (!orderData.items || orderData.items.length === 0) return Result.fail('Order must have items');
  
  return Result.ok({
    id: Date.now().toString(),
    userId: orderData.userId,
    items: orderData.items,
    total: orderData.total || 0
  });
};

const checkInventory = async (order: Order): Promise<Result<Order, string>> => {
  try {
    // Simulate inventory check
    for (const item of order.items) {
      if (item.quantity <= 0) {
        return Result.fail(`Invalid quantity for product ${item.productId}`);
      }
      // Simulate stock check
      if (item.productId === 'out-of-stock') {
        return Result.fail(`Product ${item.productId} is out of stock`);
      }
    }
    return Result.ok(order);
  } catch (error) {
    return Result.fail(`Inventory check failed: ${error}`);
  }
};

const calculateTotal = (order: Order): Result<Order, string> => {
  try {
    // Simulate price calculation
    const total = order.items.reduce((sum, item) => {
      const price = item.productId === 'expensive' ? 1000 : 100;
      return sum + (price * item.quantity);
    }, 0);
    
    return Result.ok({ ...order, total });
  } catch (error) {
    return Result.fail(`Price calculation failed: ${error}`);
  }
};

const processPayment = async (order: Order): Promise<Result<Order & { paymentId: string }, string>> => {
  try {
    // Simulate payment processing
    if (order.total > 10000) {
      return Result.fail('Payment amount exceeds limit');
    }
    
    const paymentId = `pay_${Date.now()}`;
    return Result.ok({ ...order, paymentId });
  } catch (error) {
    return Result.fail(`Payment failed: ${error}`);
  }
};

// Order processing pipeline
const processOrder = async (orderData: Partial<Order>): Promise<Result<Order & { paymentId: string }, string>> => {
  return await Result.ok(orderData)
    .chain(validateOrder)
    .chainAsync(checkInventory)
    .then(result => result.chain(calculateTotal))
    .then(result => result.chainAsync(processPayment))
    .then(result => result.tap(order => console.log(`✅ Order ${order.id} processed successfully`)))
    .then(result => result.tapError(error => console.error(`❌ Order processing failed: ${error}`)));
};

// =================================================================
// 8. 🔄 Complex Workflows - การทำงานที่ซับซ้อน
// =================================================================

// Multiple Result combination
const validateMultipleInputs = () => {
  const nameResult = Result.ok('John Doe');
  const emailResult = Result.ok('john@example.com');
  const ageResult = Result.ok(25);
  
  // Combine multiple results
  const combinedResult = Result.combine([nameResult, emailResult, ageResult]);
  
  return combinedResult.map(([name, email, age]) => ({
    name: name as string,
    email: email as string,
    age: age as number
  }));
};

// First success pattern
const tryMultipleAPIs = async (): Promise<Result<User, string[]>> => {
  const api1Result = await fetchUserFromAPI('1').catch(() => Result.fail('API 1 failed'));
  const api2Result = await fetchUserFromAPI('2').catch(() => Result.fail('API 2 failed'));
  const api3Result = await fetchUserFromAPI('3').catch(() => Result.fail('API 3 failed'));
  
  return Result.firstSuccess([api1Result, api2Result, api3Result]);
};

// Batch processing
const processBatchUsers = async (userIds: string[]): Promise<Result<ProcessedUser[], string>> => {
  const results = await Promise.all(
    userIds.map(id => processUserAsync(id))
  );
  
  return sequence(results);
};

// =================================================================
// 9. 🧪 Testing Examples - ตัวอย่างการทดสอบ
// =================================================================

const testUserProcessing = () => {
  console.log('=== Testing User Processing ===');
  
  // Test success case
  const successCase = processUserPipeline('1');
  successCase.match(
    user => console.log('✅ Success:', user.name),
    error => console.log('❌ Error:', error)
  );
  
  // Test validation error
  const validationError = processUserPipeline('');
  validationError.match(
    user => console.log('✅ Success:', user.name),
    error => console.log('❌ Validation Error:', error)
  );
  
  // Test not found error
  const notFoundError = processUserPipeline('999');
  notFoundError.match(
    user => console.log('✅ Success:', user.name),
    error => console.log('❌ Not Found Error:', error)
  );
  
  // Test age restriction
  const ageError = processUserPipeline('2'); // User with age 17
  ageError.match(
    user => console.log('✅ Success:', user.name),
    error => console.log('❌ Age Restriction Error:', error)
  );
};

// =================================================================
// 10. 📊 Performance Monitoring - การติดตาม Performance
// =================================================================

const withTiming = <T, F>(operation: () => Result<T, F>, operationName: string): Result<T, F> => {
  const start = Date.now();
  const result = operation();
  const duration = Date.now() - start;
  
  return result
    .tap(() => console.log(`⏱️ ${operationName} completed in ${duration}ms`))
    .tapError(() => console.log(`⏱️ ${operationName} failed after ${duration}ms`));
};

const withAsyncTiming = async <T, F>(
  operation: () => Promise<Result<T, F>>, 
  operationName: string
): Promise<Result<T, F>> => {
  const start = Date.now();
  const result = await operation();
  const duration = Date.now() - start;
  
  return result
    .tap(() => console.log(`⏱️ ${operationName} completed in ${duration}ms`))
    .tapError(() => console.log(`⏱️ ${operationName} failed after ${duration}ms`));
};

// Usage with timing
const timedUserProcessing = (userId: string) => {
  return withTiming(
    () => processUserPipeline(userId),
    `User Processing for ID ${userId}`
  );
};

// =================================================================
// 11. 🚀 Production Usage Examples
// =================================================================

// Complete API endpoint
const completeAPIExample = async (req: { params: { id: string } }, res: { json: (data: unknown) => void; status: (code: number) => { json: (data: unknown) => void } }) => {
  const result = await withAsyncTiming(
    () => processUserAsync(req.params.id),
    `User API Request ${req.params.id}`
  );
  
  return result
    .tap(user => console.log(`📊 API Success: User ${user.name} retrieved`))
    .tapError(error => console.log(`📊 API Error: ${error}`))
    .toHttpResponse(res);
};

// Run examples
console.log('🧪 Running all examples...');
testUserProcessing();

// Async examples
(async () => {
  console.log('\n🔄 Running async examples...');
  
  const asyncResult = await processUserAsync('1');
  asyncResult.match(
    user => console.log('✅ Async Success:', user.name),
    error => console.log('❌ Async Error:', error)
  );
  
  const orderResult = await processOrder({
    userId: '1',
    items: [{ productId: 'laptop', quantity: 1 }]
  });
  
  orderResult.match(
    order => console.log('✅ Order Success:', order.id, 'Payment:', order.paymentId),
    error => console.log('❌ Order Error:', error)
  );
})();

console.log('\n✨ All examples completed!');