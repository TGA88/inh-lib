// วิธีที่ 1: ใช้ Result Monad Pattern
type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E };

class ResultMonad<T, E = Error> {
  constructor(private result: Result<T, E>) {}
  
  static ok<T>(data: T): ResultMonad<T> {
    return new ResultMonad({ success: true, data });
  }
  
  static err<E>(error: E): ResultMonad<never, E> {
    return new ResultMonad({ success: false, error });
  }
  
  // Chain operations - หยุดทันทีถ้าเจอ error
  chain<U>(fn: (data: T) => ResultMonad<U, E>): ResultMonad<U, E> {
    return this.result.success 
      ? fn(this.result.data)
      : new ResultMonad(this.result);
  }
  
  // Map ค่าถ้า success
  map<U>(fn: (data: T) => U): ResultMonad<U, E> {
    return this.result.success
      ? ResultMonad.ok(fn(this.result.data))
      : new ResultMonad(this.result);
  }
  
  // Handle error และส่ง HTTP response
  orThrow(): T {
    return this.result.success 
      ? this.result.data 
      : (() => { throw this.result.error; })();
  }
  
  // Convert to HTTP response
  toHttpResponse(res: any) {
    return this.result.success
      ? res.json(this.result.data)
      : res.status(400).json({ error: this.result.error });
  }
}

// ตัวอย่างการใช้งาน
async function processUserData(userId: string, res: any) {
  return ResultMonad.ok(userId)
    .chain(validateUserId)     // chain ที่ 1: string -> ResultMonad<string>
    .chain(fetchUser)          // chain ที่ 2: string -> ResultMonad<User>
    .chain(processUser)        // chain ที่ 3: User -> ResultMonad<ProcessedUser>
    .chain(saveUser)           // chain ที่ 4: ProcessedUser -> ResultMonad<SavedUser>
    .toHttpResponse(res);
}

// Chain ที่ 1: Validation
function validateUserId(userId: string): ResultMonad<string> {
  return userId.length > 0 && /^[0-9]+$/.test(userId)
    ? ResultMonad.ok(userId)
    : ResultMonad.err('Invalid user ID format');
}

// Chain ที่ 2: Fetch User จาก Database
function fetchUser(userId: string): ResultMonad<User> {
  try {
    // สมมติว่ามี database service
    const user = database.findById(userId);
    
    return user 
      ? ResultMonad.ok(user)
      : ResultMonad.err(`User with ID ${userId} not found`);
  } catch (error) {
    return ResultMonad.err(`Database error: ${error.message}`);
  }
}

// Chain ที่ 3: Process User data
function processUser(user: User): ResultMonad<ProcessedUser> {
  try {
    // ทำการ process ข้อมูล เช่น validate, transform, calculate
    const processedUser = {
      ...user,
      fullName: `${user.firstName} ${user.lastName}`,
      age: calculateAge(user.birthDate),
      isActive: user.lastLoginDate > new Date(Date.now() - 30*24*60*60*1000) // 30 days
    };
    
    // Check business rules
    return processedUser.age >= 18
      ? ResultMonad.ok(processedUser)
      : ResultMonad.err('User must be at least 18 years old');
  } catch (error) {
    return ResultMonad.err(`Processing error: ${error.message}`);
  }
}

// Chain ที่ 4: Save processed user
function saveUser(processedUser: ProcessedUser): ResultMonad<SavedUser> {
  try {
    const savedUser = database.update(processedUser.id, processedUser);
    
    return ResultMonad.ok({
      ...savedUser,
      savedAt: new Date(),
      status: 'success'
    });
  } catch (error) {
    return ResultMonad.err(`Save failed: ${error.message}`);
  }
}

// Types สำหรับ type safety
interface User {
  id: string;
  firstName: string;
  lastName: string;
  birthDate: Date;
  lastLoginDate: Date;
}

interface ProcessedUser extends User {
  fullName: string;
  age: number;
  isActive: boolean;
}

interface SavedUser extends ProcessedUser {
  savedAt: Date;
  status: string;
}

// วิธีที่ 2: ใช้ Pipeline Pattern กับ Throwing
const pipe = <T>(...fns: Array<(arg: T) => T>) => (value: T) => 
  fns.reduce((acc, fn) => fn(acc), value);

const handleError = (fn: Function) => (value: any) =>
  value instanceof Error ? (() => { throw value; })() : fn(value);

// ตัวอย่างการใช้
const processData = pipe(
  handleError(validateInput),
  handleError(transformData),
  handleError(saveToDatabase)
);

// วิธีที่ 3: ใช้ Either Pattern
class Either<L, R> {
  private constructor(
    private left: L | null,
    private right: R | null
  ) {}
  
  static left<L, R>(value: L): Either<L, R> {
    return new Either(value, null);
  }
  
  static right<L, R>(value: R): Either<L, R> {
    return new Either(null, value);
  }
  
  chain<R2>(fn: (value: R) => Either<L, R2>): Either<L, R2> {
    return this.right !== null 
      ? fn(this.right)
      : Either.left(this.left!);
  }
  
  fold<T>(leftFn: (left: L) => T, rightFn: (right: R) => T): T {
    return this.left !== null 
      ? leftFn(this.left)
      : rightFn(this.right!);
  }
}

// วิธีที่ 4: ใช้ Option Pattern
class Option<T> {
  private constructor(private value: T | null) {}
  
  static some<T>(value: T): Option<T> {
    return new Option(value);
  }
  
  static none<T>(): Option<T> {
    return new Option(null);
  }
  
  chain<U>(fn: (value: T) => Option<U>): Option<U> {
    return this.value !== null ? fn(this.value) : Option.none();
  }
  
  orElse(defaultValue: T): T {
    return this.value ?? defaultValue;
  }
  
  orThrow(error: Error): T {
    return this.value ?? (() => { throw error; })();
  }
}

// วิธีที่ 5: ใช้ Try-Catch Pattern แบบ Functional
const tryF = <T>(fn: () => T): Result<T> => {
  try {
    return { success: true, data: fn() };
  } catch (error) {
    return { success: false, error: error as Error };
  }
};

const asyncTryF = async <T>(fn: () => Promise<T>): Promise<Result<T>> => {
  try {
    return { success: true, data: await fn() };
  } catch (error) {
    return { success: false, error: error as Error };
  }
};

// ตัวอย่าง API Handler
async function apiHandler(req: any, res: any) {
  const result = await asyncTryF(() => processRequest(req));
  
  return result.success
    ? res.json(result.data)
    : res.status(500).json({ error: result.error.message });
}

// วิธีที่ 6: ใช้ Continuation Passing Style (CPS)
function processWithContinuation<T>(
  value: T | Error,
  onSuccess: (value: T) => void,
  onError: (error: Error) => void
) {
  return value instanceof Error 
    ? onError(value)
    : onSuccess(value as T);
}

// ตัวอย่างการใช้ CPS
function handleRequest(data: any, res: any) {
  processWithContinuation(
    validateAndProcess(data),
    (result) => res.json(result),
    (error) => res.status(400).json({ error: error.message })
  );
}

// วิธีที่ 7: ใช้ Railway Oriented Programming
const success = <T>(value: T) => ({ success: true, value, error: null });
const failure = <E>(error: E) => ({ success: false, value: null, error });

const bind = <T, U, E>(fn: (value: T) => {success: boolean, value: U | null, error: E | null}) => 
  (result: {success: boolean, value: T | null, error: E | null}) =>
    result.success ? fn(result.value!) : result;

const tee = <T>(fn: (value: T) => void) => 
  (result: {success: boolean, value: T | null, error: any}) => {
    result.success && fn(result.value!);
    return result;
  };

// การใช้งาน Railway Pattern
const processRequest = (data: any) =>
  success(data)
    |> bind(validateInput)
    |> bind(transformData)
    |> bind(saveToDatabase)
    |> tee((result) => console.log('Success:', result));

// วิธีที่ 8: ใช้ Promise Chain แบบ Functional
function processAsync(data: any) {
  return Promise.resolve(data)
    .then(validateAsync)
    .then(transformAsync)
    .then(saveAsync)
    .catch(error => Promise.reject(error));
}

// Express.js middleware แบบ functional
const asyncHandler = (fn: Function) => (req: any, res: any, next: any) =>
  Promise.resolve(fn(req, res, next)).catch(next);

const errorHandler = (err: Error, req: any, res: any, next: any) =>
  res.status(500).json({ error: err.message });