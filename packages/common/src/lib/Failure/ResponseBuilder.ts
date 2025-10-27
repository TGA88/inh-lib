import { BaseFailure } from "./BaseFailure";
import { Result } from "../ResultV2";
import { DataResponse } from "../type/endpoint/data-response";
import {CommonFailures} from "./CommonFailures";
import { getStatusCodeName, HttpStatusCodeValue, isSuccessStatus } from "./HttpStatusCode";




export class ResponseBuilder {

    /**
   * 🎯 Generic Response Method - ใช้สร้าง response ทุกแบบ
   * @param statusCode - HTTP Status Code จาก HttpStatusCode constant (เช่น HttpStatusCode.OK = 200)
   * @param data - ข้อมูลที่จะส่งกลับ
   * @param message - ข้อความอธิบาย
   * @param traceId - Trace ID สำหรับ tracking
   */
  static respond<T>(
    statusCode: HttpStatusCodeValue,
    data: T,
    message?: string,
    traceId?: string
  ): DataResponse<T> {
    const codeResult = getStatusCodeName(statusCode);
    const isSuccess = isSuccessStatus(statusCode);
    const defaultMessage = getStatusCodeName(statusCode);

    return {
      statusCode,
      isSuccess,
      traceId,
      codeResult,
      message: message || defaultMessage,
      dataResult: data,
    };
  }
  
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



  // 🆕 สร้าง Accepted Response (202 - Async Operation)
  static accepted<T>(
    data: T,
    message = 'Request accepted for processing',
    traceId?: string
  ): DataResponse<T> {
    return {
      statusCode: 202,
      isSuccess: true,
      traceId,
      codeResult: 'ACCEPTED',
      message,
      dataResult: data,
    };
  }

  // 🆕 สร้าง No Content Response (204)
  static noContent(
    message = 'Operation completed successfully',
    traceId?: string
  ): DataResponse<null> {
    return {
      statusCode: 204,
      isSuccess: true,
      traceId,
      codeResult: 'SUCCESS',
      message,
      dataResult: null,
    };
  }

  // 🆕 สร้าง Partial Content Response (206 - Range Request)
  static partialContent<T>(
    data: T,
    message = 'Partial content',
    traceId?: string
  ): DataResponse<T> {
    return {
      statusCode: 206,
      isSuccess: true,
      traceId,
      codeResult: 'PARTIAL_CONTENT',
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

export const resultToResponse = <T, E = unknown >(
  result: Result<T, BaseFailure>,
  options?: ResultToResponseOptions<E>
): DataResponse<T | E | null> => {
  
  const defaultMessage = getStatusCodeName(result.httpStatusCode as HttpStatusCodeValue ?? 200);
  const { successMessage = defaultMessage, errorDataResult, traceId } = options || {};

  if (result.isSuccess) {
    return ResponseBuilder.respond(result.httpStatusCode as HttpStatusCodeValue ?? 200, result.getValue(), successMessage, traceId ?? result.traceId);
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

   const defaultDataResult = error.toDataResult();

  return ResponseBuilder.error(error, errorDataResult ?? defaultDataResult as E);
};

// ========== Helper / Example Functions (Refactored) ==========
// NOTE:
// 1. These are example utilities. Consider moving to a separate docs/examples file or test suite.
// 2. Kept exports so existing imports do not break.
// 3. Replaced any with stricter typing, added small helpers for cleanliness.

interface User {
  id: string;
  name: string;
  email?: string;
  processedAt?: Date;
}

interface ControllerReq<P = unknown, B = unknown> {
  params: P;
  body: B;
}

interface ControllerRes {
  status(code: number): this;
  json(data: unknown): this;
}

/**
 * Examples using failureToResult
 */
export const failureToResultExamples = {
  validateEmail: (email: string): Result<string, BaseFailure> => {
    if (!email || !email.includes('@')) {
      return failureToResult(
        new CommonFailures.ValidationFail('Invalid email format', {
          field: 'email',
          value: email,
        })
      );
    }
    return Result.ok(email);
  },

  findUser: (userId: string): Result<{ id: string; name: string }, BaseFailure> => {
    if (userId === 'notfound') {
      return failureToResult(
        new CommonFailures.NotFoundFail(`User with ID ${userId} not found`, {
          userId,
          resource: 'user',
        })
      );
    }
    return Result.ok({ id: userId, name: 'John Doe' });
  },

  processUserChain: (userId: string, email: string) => {
    return Result.ok(userId)
      .chain(id => failureToResultExamples.findUser(id))
      .chain(user =>
        failureToResultExamples
          .validateEmail(email)
          .map(() => user)
      )
      .map(user => ({ ...user, email, processedAt: new Date() }));
  },
};

/**
 * Examples using resultToResponse
 */
export const resultToResponseExamples = {
  simpleSuccess: () => {
    const result = Result.ok<{ id: string; name: string }, BaseFailure>({ id: '1', name: 'John' });
    return resultToResponse(result, {
      successMessage: 'User retrieved successfully',
      traceId: 'trace-001',
    });
  },

  simpleError: () => {
    const failure = new CommonFailures.ValidationFail('Email is required');
    const result = Result.fail<never, BaseFailure>(failure);
    return resultToResponse(result, { traceId: 'trace-002' });
  },

  successWithOptions: () => {
    const userData = { id: '1', name: 'John', email: 'john@example.com' };
    return resultToResponse(Result.ok(userData), {
      successMessage: 'User profile loaded successfully',
      traceId: 'user-profile-001',
    });
  },

  errorWithData: () => {
    const failure = new CommonFailures.ValidationFail('Validation failed', {
      fields: ['name', 'email'],
    });
    const result = Result.fail<never, BaseFailure>(failure);
    return resultToResponse(result, {
      errorDataResult: {
        submittedData: { name: '', email: 'invalid' },
        validationRules: { name: 'required', email: 'valid email format' },
      },
      traceId: 'validation-error-001',
    });
  },

  asyncExample: async () => {
    const fetchUserData = async (
      id: string
    ): Promise<Result<{ id: string; name: string }, BaseFailure>> => {
      if (id === 'error') {
        return Result.fail(new CommonFailures.GetFail('Database error'));
      }
      return Result.ok({ id, name: 'Async User' });
    };

    const result = await fetchUserData('123');
    return resultToResponse(result, {
      successMessage: 'User data fetched asynchronously',
      traceId: 'async-fetch-001',
    });
  },

  chainExample: () => {

    const validateAndCreateUser = (
      userData: { name?: string; email?: string }
    ): Result<{ id: string; name: string; email: string }, BaseFailure> => {
      return Result.ok<typeof userData,BaseFailure>(userData)
        .chain<{ name: string; email?: string }>(data => {
          if (!data.name) {
            return Result.fail(
              new CommonFailures.ValidationFail('Name is required')
            );
          }
          // Narrow type: name is now guaranteed
          return Result.ok({ ...data, name: data.name });
        })
        .chain<{ name: string; email: string }>(data => {
          if (!data.email?.includes('@')) {
            return Result.fail(
              new CommonFailures.ValidationFail('Valid email is required')
            );
          }
          // Narrow type: email is now guaranteed
          return Result.ok({ ...data, email: data.email });
        })
        .map(data => ({
          id: `user_${Date.now()}`,
          name: data.name,
          email: data.email,
        }));
    };

    const validData = { name: 'John', email: 'john@example.com' };
    const invalidData = { name: 'John' };

    const successResult = validateAndCreateUser(validData);
    const errorResult = validateAndCreateUser(invalidData);

    return {
      success: resultToResponse(successResult, {
        successMessage: 'User created successfully',
        traceId: 'chain-success-001',
      }),
      error: resultToResponse(errorResult, {
        errorDataResult: invalidData,
        traceId: 'chain-error-001',
      }),
    };
  },
};

/**
 * Express-like controller examples (keep minimal / typed)
 */
export const controllerExamples = {
  getUserController: async (
    req: ControllerReq<{ id: string }>,
    res: ControllerRes
  ) => {
    const userId = req.params.id;
    const traceId = `get-user-${Date.now()}`;

    const validateId = (id: string): Result<string, BaseFailure> => {
      if (!id) {
        return failureToResult(
          new CommonFailures.ValidationFail('User ID is required')
        );
      }
      if (!/^[a-zA-Z0-9]+$/.test(id)) {
        return failureToResult(
          new CommonFailures.ValidationFail('Invalid user ID format')
        );
      }
      return Result.ok(id);
    };

    const fetchUser = async (
      id: string
    ): Promise<Result<User, BaseFailure>> => {
      if (id === 'notfound') {
        return failureToResult(new CommonFailures.NotFoundFail('User not found'));
      }
      return Result.ok({
        id,
        name: 'John Doe',
        email: 'john@example.com',
      });
    };

    const result = await validateId(userId).chainAsync(fetchUser);

    const response = resultToResponse(result, {
      successMessage: 'User retrieved successfully',
      traceId,
    });

    return res.status(response.statusCode).json(response);
  },

  createUserController: async (
    req: ControllerReq<unknown, { name?: unknown; email?: unknown; age?: unknown }>,
    res: ControllerRes
  ) => {
    const userData = req.body;
    const traceId = `create-user-${Date.now()}`;

    interface CreateUserData {
      name: string;
      email: string;
      age?: number;
    }

    const validateName = (name: unknown): Result<string, BaseFailure> => {
      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return failureToResult(
          new CommonFailures.ValidationFail(
            'Name is required and must be a non-empty string'
          )
        );
      }
      return Result.ok(name.trim());
    };

    const validateEmail = (email: unknown): Result<string, BaseFailure> => {
      if (!email || typeof email !== 'string') {
        return failureToResult(
          new CommonFailures.ValidationFail('Email is required')
        );
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return failureToResult(
          new CommonFailures.ValidationFail('Invalid email format')
        );
      }
      return Result.ok(email);
    };

    const validateAge = (
      age: unknown
    ): Result<number | undefined, BaseFailure> => {
      if (age === undefined || age === null) {
        return Result.ok(undefined);
      }
      if (typeof age !== 'number' || age < 0 || age > 150) {
        return failureToResult(
          new CommonFailures.ValidationFail(
            'Age must be a number between 0 and 150'
          )
        );
      }
      return Result.ok(age);
    };

    const createUser = async (
      data: CreateUserData
    ): Promise<Result<CreateUserData & { id: string; createdAt: Date }, BaseFailure>> => {
      if (data.email === 'exists@example.com') {
        return failureToResult(
          new CommonFailures.CreateFail('Email already exists')
        );
      }
      return Result.ok({
        ...data,
        id: `user_${Date.now()}`,
        createdAt: new Date(),
      });
    };

    const nameResult = validateName(userData.name);
    const emailResult = validateEmail(userData.email);
    const ageResult = validateAge(userData.age);

    // Preserve tuple types with 'as const' and map explicitly to CreateUserData
    const validationResult = Result
      .combine([nameResult, emailResult, ageResult] as const)
      .map<CreateUserData>(([name, email, age]) => ({ name, email, age })) as Result<CreateUserData, BaseFailure>;
      

    const result = await validationResult.chainAsync(createUser);

    const response = resultToResponse(result, {
      successMessage: 'User created successfully',
      errorDataResult: userData,
      traceId,
    });

    return res.status(response.statusCode).json(response);
  },

  batchProcessController: async (
    req: ControllerReq<unknown, { items?: unknown }>,
    res: ControllerRes
  ) => {
    const rawItems = req.body?.items;
    const items: unknown[] = Array.isArray(rawItems) ? rawItems : [];
    const traceId = `batch-process-${Date.now()}`;

    interface ProcessedItem {
      index: number;
      processed: {
        id: string;
        [k: string]: unknown;
        processedAt: Date;
        status: string;
      };
    }

    const processItem = async (
      item: unknown,
      index: number
    ): Promise<Result<ProcessedItem, BaseFailure>> => {
      if (!item || typeof item !== 'object') {
        return failureToResult(
          new CommonFailures.ValidationFail(`Item at index ${index} is invalid`)
        );
      }
      const typed = item as { id?: unknown; [k: string]: unknown };
      if (!typed.id || typeof typed.id !== 'string') {
        return failureToResult(
          new CommonFailures.ValidationFail(
            `Item at index ${index} missing required field: id`
          )
        );
      }

      return Result.ok({
        index,
        processed: {
          ...typed,
          id: typed.id,
          processedAt: new Date(),
          status: 'completed',
        },
      });
    };

    const results = await Promise.all(
      items.map((item, i) => processItem(item, i))
    );

    const successes: ProcessedItem[] = [];
    const failures: Array<{
      index: number;
      error: BaseFailure | undefined;
      originalItem: unknown;
    }> = [];

    results.forEach((r, i) => {
      if (r.isSuccess) {
        successes.push(r.getValue());
      } else {
        failures.push({
          index: i,
          error: r.error,
          originalItem: items[i],
        });
      }
    });

    type BatchProcessSummary = {
      totalItems: number;
      processedItems: number;
      failedItems: number;
      successes: ProcessedItem[];
      failures: {
        index: number;
        error: BaseFailure | undefined;
        originalItem: unknown;
      }[];
    };

    const finalResult: Result<BatchProcessSummary, BaseFailure> =
      failures.length === 0
        ? Result.ok<BatchProcessSummary, BaseFailure>({
            totalItems: items.length,
            processedItems: successes.length,
            failedItems: 0,
            successes,
            failures: [] as BatchProcessSummary['failures'],
          })
        : Result.fail<BatchProcessSummary, BaseFailure>(
            new CommonFailures.ValidationFail(
              `${failures.length} out of ${items.length} items failed to process`,
              { failures }
            )
          );

    const response = resultToResponse(finalResult, {
      successMessage: `Successfully processed ${successes.length} out of ${items.length} items`,
      errorDataResult: {
        totalItems: items.length,
        processedItems: successes.length,
        failedItems: failures.length,
        successes,
        failures,
      },
      traceId,
    });

    return res.status(response.statusCode).json(response);
  },
};



