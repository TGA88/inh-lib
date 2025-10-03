import { DataResponse } from "../type/endpoint/data-response";

export abstract class BaseFailure extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: unknown;
  public traceId?: string;

  constructor(
    code: string,
    message: string,
    statusCode: number,
    details?: unknown
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;

    // ทำให้ instanceof ทำงานได้ถูกต้องใน TypeScript
    Object.setPrototypeOf(this, new.target.prototype);
  }

  // Set traceId (เรียกใช้ตอน catch error)
  withTraceId(traceId: string): this {
    this.traceId = traceId;
    return this;
  }

  // แปลงเป็น DataResponse
  toResponse<T = null>(dataResult: T = null as T): DataResponse<T> {
    return {
      statusCode: this.statusCode,
      isSuccess: false,
      traceId: this.traceId,
      codeResult: this.code,
      message: this.message,
      dataResult,
    };
  }

  // Logger Systems (Winston, Pino, Bunyan) will call this function to print object as JSON
  toJSON() {
    return {
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      details: this.details,
      traceId: this.traceId,
    };
  }
}