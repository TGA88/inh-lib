import { BaseFailure } from "./BaseFailure";
import { CommonFailures } from "./CommonFailures";

export function toBaseFailure(error: unknown): BaseFailure {
  if (error instanceof BaseFailure) {
    return error;
  } else if (error instanceof Error) {
    return new CommonFailures.InternalFail(error.message, { error: error });
  }
  const err = new Error(String(error));
  return new CommonFailures.InternalFail(err.message, { error: err });
}