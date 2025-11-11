import { DataResponse } from "../type/endpoint/data-response";

export abstract class BaseFailure extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: unknown ;
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

    if (details && typeof details === "object" && "error" in details) {
      const inner = (details as { error?: unknown }).error;
      if (inner instanceof Error || inner instanceof BaseFailure) {
        // use inner error's stack if available
        if (inner.stack) this.stack = inner.stack;
      }
    }
    

    // ทำให้ instanceof ทำงานได้ถูกต้องใน TypeScript
    Object.setPrototypeOf(this, new.target.prototype);
  }

  // Set traceId (เรียกใช้ตอน catch error)
  withTraceId(traceId: string): this {
    this.traceId = traceId;
    return this;
  }

  // ดึงค่า dataResult จาก details (ถ้ามี)
  toDataResult(){
    let defaultDataResult: unknown = null;

    if (this instanceof BaseFailure) {
      const details = this.details;
      if (details && typeof details === "object" && "dataResult" in details) {
        defaultDataResult = (details as { dataResult: unknown }).dataResult;
      }
    }

    return defaultDataResult;
  }

  // แปลงเป็น DataResponse
  toResponse<T = unknown>(dataResult: T = null as T): DataResponse<T> {
    const defaultDataResult = this.toDataResult();
    return {
      statusCode: this.statusCode,
      isSuccess: false,
      traceId: this.traceId,
      codeResult: this.code,
      message: this.message,
      dataResult: dataResult ?? defaultDataResult as T,
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

