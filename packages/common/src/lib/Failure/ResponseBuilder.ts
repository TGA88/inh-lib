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



