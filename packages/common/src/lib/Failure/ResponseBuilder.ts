import { BaseFailure } from "./BaseFailure";
import { Result } from "../ResultV2";
import { DataResponse } from "../type/endpoint/data-response";
import {CommonFailures} from "./CommonFailures";

export class ResponseBuilder {
  // สร้าง Success Response
  static success<T>(
    data: T,
    message = 'Success',
    traceId?: string
  ): DataResponse<T> {
    return {
      statusCode: 200,
      isSuccess: true,
      traceId,
      codeResult: 'SUCCESS',
      message,
      dataResult: data,
    };
  }

  // สร้าง Success Response (Created)
  static created<T>(
    data: T,
    message = 'Resource created successfully',
    traceId?: string
  ): DataResponse<T> {
    return {
      statusCode: 201,
      isSuccess: true,
      traceId,
      codeResult: 'SUCCESS',
      message,
      dataResult: data,
    };
  }

  // สร้าง Error Response จาก BaseFailure
  static error<T = null>(
    failure: BaseFailure,
    dataResult: T = null as T
  ): DataResponse<T> {
    return failure.toResponse(dataResult);
  }

  // สร้าง Error Response จาก unknown error
  static fromError<T = null>(
    error: unknown,
    traceId?: string,
    dataResult: T = null as T
  ): DataResponse<T> {
    if (error instanceof BaseFailure) {
      if (traceId) {
        error.withTraceId(traceId);
      }
      return error.toResponse(dataResult);
    }

    if (error instanceof Error) {
      const failure = new CommonFailures.InternalFail(error.message, {
        originalError: error.name,
      });
      if (traceId) {
        failure.withTraceId(traceId);
      }
      return failure.toResponse(dataResult);
    }

    const failure = new CommonFailures.InternalFail('Unknown error occurred', { error });
    if (traceId) {
      failure.withTraceId(traceId);
    }
    return failure.toResponse(dataResult);
  }
}


// Helper function สำหรับแปลง Failure เป็น Result
export const failureToResult = <T>(failure: BaseFailure): Result<T, BaseFailure> => {
  return Result.fail<T, BaseFailure>(failure);
};

// Helper function สำหรับแปลง Result เป็น DataResponse
export interface ResultToResponseOptions<E = null> {
  // For Success
  successMessage?: string;
  
  // For Error
  errorDataResult?: E;
  
  // For Both
  traceId?: string;
}

export const resultToResponse = <T, E = null>(
  result: Result<T, BaseFailure>,
  options?: ResultToResponseOptions<E>
): DataResponse<T | E | null> => {
  const { successMessage = 'Success', errorDataResult, traceId } = options || {};

  if (result.isSuccess) {
    return ResponseBuilder.success(result.getValue(), successMessage, traceId);
  }

  const error = result.error;
  if (!error) {
    return ResponseBuilder.error(
      new CommonFailures.InternalFail('Unknown error'),
      errorDataResult ?? null
    );
  }
  
  if (traceId) {
    error.withTraceId(traceId);
  }

  return ResponseBuilder.error(error, errorDataResult ?? null);
};

// ========== Helper Functions Usage Examples ==========

/**
 * ตัวอย่างการใช้งาน failureToResult helper function
 */
export const failureToResultExamples = {
  // ✅ แปลง ValidationFail เป็น Result
  validateEmail: (email: string): Result<string, BaseFailure> => {
    if (!email || !email.includes('@')) {
      const failure = new CommonFailures.ValidationFail('Invalid email format', {
        field: 'email',
        value: email
      });
      return failureToResult<string>(failure);
    }
    return Result.ok(email);
  },

  // ✅ แปลง NotFoundFail เป็น Result
  findUser: (userId: string): Result<{ id: string; name: string }, BaseFailure> => {
    if (userId === 'notfound') {
      const failure = new CommonFailures.NotFoundFail(`User with ID ${userId} not found`, {
        userId,
        resource: 'user'
      });
      return failureToResult(failure);
    }
    
    return Result.ok({ id: userId, name: 'John Doe' });
  },

  // ✅ การใช้ใน chain operations
  processUserChain: (userId: string, email: string) => {
    return Result.ok(userId)
      .chain(id => failureToResultExamples.findUser(id))
      .chain(user => failureToResultExamples.validateEmail(email).map(() => user))
      .map(user => ({ ...user, email, processedAt: new Date() }));
  }
};

/**
 * ตัวอย่างการใช้งาน resultToResponse helper function
 */
export const resultToResponseExamples = {
  // ✅ Basic success response
  simpleSuccess: () => {
    const result = Result.ok({ id: '1', name: 'John' });
    return resultToResponse(result, {
      successMessage: 'User retrieved successfully',
      traceId: 'trace-001'
    });
  },

  // ✅ Basic error response  
  simpleError: () => {
    const failure = new CommonFailures.ValidationFail('Email is required');
    const result = Result.fail<never, BaseFailure>(failure);
    return resultToResponse(result, {
      traceId: 'trace-002'
    });
  },

  // ✅ Success response with custom options
  successWithOptions: () => {
    const userData = { id: '1', name: 'John', email: 'john@example.com' };
    const result = Result.ok(userData);
    
    return resultToResponse(result, {
      successMessage: 'User profile loaded successfully',
      traceId: 'user-profile-001'
    });
  },

  // ✅ Error response with error data
  errorWithData: () => {
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
  },

  // ✅ การใช้กับ async operations
  asyncExample: async () => {
    const fetchUserData = async (id: string): Promise<Result<{ id: string; name: string }, BaseFailure>> => {
      if (id === 'error') {
        return Result.fail(new CommonFailures.GetFail('Database error'));
      }
      return Result.ok({ id, name: 'Async User' });
    };

    const result = await fetchUserData('123');
    return resultToResponse(result, {
      successMessage: 'User data fetched asynchronously',
      traceId: 'async-fetch-001'
    });
  },

  // ✅ การใช้กับ Result chain
  chainExample: () => {
    interface User { id: string; name: string; email: string; }
    
    const validateAndCreateUser = (userData: { name?: string; email?: string }): Result<User, BaseFailure> => {
      return Result.ok(userData)
        .chain(data => {
          if (!data.name) {
            return Result.fail(new CommonFailures.ValidationFail('Name is required'));
          }
          return Result.ok(data);
        })
        .chain(data => {
          if (!data.email || !data.email.includes('@')) {
            return Result.fail(new CommonFailures.ValidationFail('Valid email is required'));
          }
          return Result.ok(data);
        })
        .map(data => ({
          id: `user_${Date.now()}`,
          name: data.name!,
          email: data.email!
        }));
    };

    const validData = { name: 'John', email: 'john@example.com' };
    const invalidData = { name: 'John' }; // missing email

    const successResult = validateAndCreateUser(validData);
    const errorResult = validateAndCreateUser(invalidData);

    return {
      success: resultToResponse(successResult, {
        successMessage: 'User created successfully',
        traceId: 'chain-success-001'
      }),
      error: resultToResponse(errorResult, {
        errorDataResult: invalidData,
        traceId: 'chain-error-001'
      })
    };
  }
};

/**
 * ตัวอย่างการใช้ Helper Functions ใน Express Controllers
 */
export const controllerExamples = {
  // ✅ GET Controller with helper functions
  getUserController: async (req: { params: { id: string } }, res: any) => {
    const userId = req.params.id;
    const traceId = `get-user-${Date.now()}`;

    // ใช้ failureToResult เพื่อสร้าง Result จาก validation
    const validateId = (id: string): Result<string, BaseFailure> => {
      if (!id || id.length === 0) {
        return failureToResult(new CommonFailures.ValidationFail('User ID is required'));
      }
      if (!/^[a-zA-Z0-9]+$/.test(id)) {
        return failureToResult(new CommonFailures.ValidationFail('Invalid user ID format'));
      }
      return Result.ok(id);
    };

    const fetchUser = async (id: string): Promise<Result<{ id: string; name: string; email: string }, BaseFailure>> => {
      // Simulate database call
      if (id === 'notfound') {
        return failureToResult(new CommonFailures.NotFoundFail('User not found'));
      }
      
      return Result.ok({
        id,
        name: 'John Doe',
        email: 'john@example.com'
      });
    };

    // Process with Result chain
    const result = await validateId(userId)
      .chainAsync(fetchUser);

    // ใช้ resultToResponse เพื่อแปลงเป็น API response
    const response = resultToResponse(result, {
      successMessage: 'User retrieved successfully',
      traceId
    });

    return res.status(response.statusCode).json(response);
  },

  // ✅ POST Controller with comprehensive validation
  createUserController: async (req: { body: any }, res: any) => {
    const userData = req.body;
    const traceId = `create-user-${Date.now()}`;

    interface CreateUserData {
      name: string;
      email: string;
      age?: number;
    }

    // Validation functions using failureToResult
    const validateName = (name: unknown): Result<string, BaseFailure> => {
      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return failureToResult(new CommonFailures.ValidationFail('Name is required and must be a non-empty string'));
      }
      return Result.ok(name.trim());
    };

    const validateEmail = (email: unknown): Result<string, BaseFailure> => {
      if (!email || typeof email !== 'string') {
        return failureToResult(new CommonFailures.ValidationFail('Email is required'));
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return failureToResult(new CommonFailures.ValidationFail('Invalid email format'));
      }
      return Result.ok(email);
    };

    const validateAge = (age: unknown): Result<number | undefined, BaseFailure> => {
      if (age === undefined || age === null) {
        return Result.ok(undefined);
      }
      if (typeof age !== 'number' || age < 0 || age > 150) {
        return failureToResult(new CommonFailures.ValidationFail('Age must be a number between 0 and 150'));
      }
      return Result.ok(age);
    };

    const createUser = async (data: CreateUserData): Promise<Result<CreateUserData & { id: string; createdAt: Date }, BaseFailure>> => {
      // Simulate database save
      if (data.email === 'exists@example.com') {
        return failureToResult(new CommonFailures.CreateFail('Email already exists'));
      }

      return Result.ok({
        ...data,
        id: `user_${Date.now()}`,
        createdAt: new Date()
      });
    };

    // Validation chain
    const nameResult = validateName(userData.name);
    const emailResult = validateEmail(userData.email);
    const ageResult = validateAge(userData.age);

    // Combine validation results
    const validationResult = Result.combine([nameResult, emailResult, ageResult])
      .map(([name, email, age]) => ({ name, email, age }));

    // Process creation
    const result = await validationResult
      .chainAsync(createUser);

    // Convert to response using resultToResponse
    const response = resultToResponse(result, {
      successMessage: 'User created successfully',
      errorDataResult: userData, // Include submitted data in error response
      traceId
    });

    return res.status(response.statusCode).json(response);
  },

  // ✅ Batch processing with helper functions
  batchProcessController: async (req: { body: { items: any[] } }, res: any) => {
    const items = req.body.items || [];
    const traceId = `batch-process-${Date.now()}`;

    const processItem = async (item: any, index: number): Promise<Result<{ index: number; processed: any }, BaseFailure>> => {
      if (!item || typeof item !== 'object') {
        return failureToResult(new CommonFailures.ValidationFail(`Item at index ${index} is invalid`));
      }

      if (!item.id) {
        return failureToResult(new CommonFailures.ValidationFail(`Item at index ${index} missing required field: id`));
      }

      // Simulate processing
      return Result.ok({
        index,
        processed: {
          ...item,
          processedAt: new Date(),
          status: 'completed'
        }
      });
    };

    // Process all items
    const results = await Promise.all(
      items.map((item, index) => processItem(item, index))
    );

    // Separate successes and failures
    const successes: any[] = [];
    const failures: any[] = [];

    results.forEach((result, index) => {
      if (result.isSuccess) {
        successes.push(result.getValue());
      } else {
        failures.push({
          index,
          error: result.errorValue(),
          originalItem: items[index]
        });
      }
    });

    // Create final result
    const finalResult = failures.length === 0
      ? Result.ok({
          totalItems: items.length,
          processedItems: successes.length,
          failedItems: 0,
          successes,
          failures: []
        })
      : Result.fail(new CommonFailures.ValidationFail(
          `${failures.length} out of ${items.length} items failed to process`,
          { failures }
        ));

    // Convert to response
    const response = resultToResponse(finalResult, {
      successMessage: `Successfully processed ${successes.length} out of ${items.length} items`,
      errorDataResult: {
        totalItems: items.length,
        processedItems: successes.length,
        failedItems: failures.length,
        successes,
        failures
      },
      traceId
    });

    return res.status(response.statusCode).json(response);
  }
};



