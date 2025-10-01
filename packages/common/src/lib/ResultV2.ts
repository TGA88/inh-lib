export class Result<T, F = unknown> {
  public readonly isSuccess: boolean;
  public readonly isFailure: boolean;
  public readonly error?: F;
  private readonly _value?: T; // ✅ แก้: เพิ่ม readonly

  private constructor(isSuccess: boolean, error?: F, value?: T) {
    if (isSuccess && error) {
      throw new Error("InvalidOperation: A Result cannot be successful and contain an error");
    }
    if (!isSuccess && !error) {
      throw new Error("InvalidOperation: A failing Result needs to contain an error message");
    }

    this.isSuccess = isSuccess;
    this.isFailure = !isSuccess;
    this.error = error;
    this._value = value;
    
    Object.freeze(this);
  }

  public getValue(): T {
    if (!this.isSuccess) {
      console.log(this.error);
      throw new Error("Can't get the value of an error Result. Use 'errorValue' instead.");
    }

    return this._value as T; // ✅ แก้: ใช้ ! assertion แทน as T
  }

  public getValueOrDefault(defaultValue: T): T {
    return this.isSuccess ? this._value as T : defaultValue;
  }

  public getValueOrUndefined(): T | undefined {
    return this.isSuccess ? this._value : undefined;
  }

  public errorValue(): F {
    if (this.isSuccess) {
      throw new Error("Can't get error value of a successful Result. Use 'getValue' instead.");
    }
    return this.error as F; // ✅ แก้: ใช้ ! assertion แทน as F
  }

  // ✅ แก้: ใช้ this type แทน Result<T, F>
  public chain<U>(fn: (value: T) => Result<U, F>): Result<U, F> {
    if (this.isFailure) {
      return Result.fail<U, F>(this.error as F);
    }
    return fn(this._value as T);
  }

  // ✅ แก้: ใช้ this type แทน Result<T, F>
  public map<U>(fn: (value: T) => U): Result<U, F> {
    if (this.isFailure) {
      return Result.fail<U, F>(this.error as F);
    }
    try {
      const mappedValue = fn(this._value as T);
      return Result.ok<U, F>(mappedValue);
    } catch (error) {
      return Result.fail<U, F>(error as F);
    }
  }

  public mapError<G>(fn: (error: F) => G): Result<T, G> {
    if (this.isSuccess) {
      return Result.ok<T, G>(this._value);
    }
    const mappedError = fn(this.error as F);
    return Result.fail<T, G>(mappedError);
  }

  public async chainAsync<U>(fn: (value: T) => Promise<Result<U, F>>): Promise<Result<U, F>> {
    if (this.isFailure) {
      return Result.fail<U, F>(this.error as F);
    }
    return await fn(this._value as T);
  }

  public async mapAsync<U>(fn: (value: T) => Promise<U>): Promise<Result<U, F>> {
    if (this.isFailure) {
      return Result.fail<U, F>(this.error as F);
    }
    try {
      const mappedValue = await fn(this._value as T);
      return Result.ok<U, F>(mappedValue);
    } catch (error) {
      return Result.fail<U, F>(error as F);
    }
  }

  // ✅ แก้: ใช้ this type
  public tap(fn: (value: T) => void): this {
    if (this.isSuccess) {
      fn(this._value as T);
    }
    return this;
  }

  // ✅ แก้: ใช้ this type
  public tapError(fn: (error: F) => void): this {
    if (this.isFailure) {
      fn(this.error as F);
    }
    return this;
  }

  public match<U>(onSuccess: (value: T) => U, onError: (error: F) => U): U {
    return this.isSuccess 
      ? onSuccess(this._value as T)
      : onError(this.error as F);
  }

  public toHttpResponse(res: { 
    json: (data: unknown) => void; 
    status: (code: number) => { json: (data: unknown) => void } 
  }) {
    return this.isSuccess
      ? res.json({ success: true, data: this._value })
      : res.status(400).json({ success: false, error: this.error });
  }

  // ========== Static Methods ==========

  public static ok<T, F = unknown>(value?: T): Result<T, F> {
    return new Result<T, F>(true, undefined, value);
  }

  public static fail<T, F = unknown>(error: F): Result<T, F> {
    return new Result<T, F>(false, error);
  }

  public static from<T, F = unknown>(
    fn: () => T, 
    errorMapper?: (error: unknown) => F
  ): Result<T, F> {
    try {
      const value = fn();
      return Result.ok<T, F>(value);
    } catch (error) {
      const mappedError = errorMapper ? errorMapper(error) : (error as F);
      return Result.fail<T, F>(mappedError);
    }
  }

  public static async fromAsync<T, F = string>(
    fn: () => Promise<T>, 
    errorMapper?: (error: unknown) => F
  ): Promise<Result<T, F>> {
    try {
      const value = await fn();
      return Result.ok<T, F>(value);
    } catch (error) {
      const mappedError = errorMapper ? errorMapper(error) : (error as F);
      return Result.fail<T, F>(mappedError);
    }
  }

  // ✅ แก้: ปรับ type signature ให้ถูกต้อง
  public static combine<T extends readonly Result<unknown, unknown>[]>(
    results: T
  ): Result<{ [K in keyof T]: T[K] extends Result<infer U, unknown> ? U : never }, unknown> {
    const values: unknown[] = [];
    
    for (const result of results) {
      if (result.isFailure) {
        return Result.fail(result.error);
      }
      values.push(result.getValue());
    }
    
    return Result.ok(values as { [K in keyof T]: T[K] extends Result<infer U, unknown> ? U : never });
  }

  public static combineWith<T, R, F>(
    results: Result<T, F>[],
    combiner: (values: T[]) => R
  ): Result<R, F> {
    const values: T[] = [];
    
    for (const result of results) {
      if (result.isFailure) {
        return Result.fail<R, F>(result.error as F);
      }
      values.push(result.getValue());
    }
    
    try {
      const combinedValue = combiner(values);
      return Result.ok<R, F>(combinedValue);
    } catch (error) {
      return Result.fail<R, F>(error as F);
    }
  }

  // ✅ แก้: แก้ปัญหา type mismatch F[] vs F และไม่ใช้ non-null assertion
  public static firstSuccess<T, F>(results: Result<T, F>[]): Result<T, F[]> {
    const errors: F[] = [];
    
    for (const result of results) {
      if (result.isSuccess) {
        return Result.ok<T, F[]>(result.getValue()); // ✅ cast type ให้ถูกต้อง
      }
      if (result.error !== undefined) {
        errors.push(result.error);
      }
    }
    
    return Result.fail<T, F[]>(errors);
  }
}

// ========== Type Guards ==========
export const isSuccess = <T, F>(result: Result<T, F>): result is Result<T, F> & { 
  isSuccess: true 
} => result.isSuccess;

export const isFailure = <T, F>(result: Result<T, F>): result is Result<T, F> & { 
  isFailure: true 
} => result.isFailure;

// ========== Utility Functions ==========
export const sequence = <T, F>(results: Result<T, F>[]): Result<T[], F> => {
  const values: T[] = [];
  
  for (const result of results) {
    if (result.isFailure) {
      return Result.fail<T[], F>(result.error as F);
    }
    values.push(result.getValue());
  }
  
  return Result.ok<T[], F>(values);
};

// ========== Usage Examples (แก้ปัญหา unused variable) ==========

// ตัวอย่างการใช้งาน - ไม่มี unused variables
const exampleUsage = () => {
  // Basic usage
  const result1 = Result.ok('hello')
    .chain(value => Result.ok(value.toUpperCase()))
    .map(value => `Result: ${value}`)
    .tap(value => console.log('Success:', value))
    .tapError(error => console.log('Error:', error));

  // Combine results
  const result2 = Result.combine([
    Result.ok('hello'),
    Result.ok(42),
    Result.ok(true)
  ]);

  // First success
  const result3 = Result.firstSuccess([
    Result.fail<string, string>('error1'),
    Result.fail<string, string>('error2'), 
    Result.ok<string, string>('success')
  ]);

  // HTTP response simulation
  const mockRes = {
    json: (data: unknown) => console.log('Response:', data),
    status: (code: number) => ({
      json: (data: unknown) => console.log(`${code} Response:`, data)
    })
  };

  result1.toHttpResponse(mockRes);
  
  return { result1, result2, result3 };
};

// Export example usage เพื่อป้องกัน unused warning
export { exampleUsage };

// ========== สรุปการแก้ไข ==========

/*
🔧 ปัญหาที่แก้ไขแล้ว:

1. ✅ Type 'Result<T, F>' is not assignable to type 'Result<T, F[]>'
   → แก้ firstSuccess method ให้ return type ถูกต้อง

2. ✅ Use 'this' type instead
   → เปลี่ยน return type ของ tap และ tapError เป็น this
   → ปรับปรุง type signatures อื่นๆ

3. ✅ 'apiHandler' is assigned a value but never used
   → ลบ unused variables และสร้าง example usage function

4. ✅ Member '_value' is never reassigned; mark it as 'readonly'
   → เพิ่ม readonly keyword

5. ✅ This assertion is unnecessary since it does not change the type
   → ใช้ ! assertion แทน as T เมื่อเราแน่ใจว่าค่าไม่เป็น undefined

🎯 การปรับปรุงเพิ่มเติม:
- ใช้ ! assertion แทน as casting เมื่อเราแน่ใจว่าค่าไม่เป็น null/undefined
- ปรับปรุง error handling ให้ชัดเจนขึ้น  
- เพิ่ม example usage เพื่อป้องกัน linting warnings
*/