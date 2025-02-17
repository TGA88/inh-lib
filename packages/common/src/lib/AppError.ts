
import { Result } from "./Result";
import { UseCaseError } from "./UseCaseError";

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace GenericAppError {
  export class UnexpectedError extends Result<void,UseCaseError> {
    public constructor (err: unknown,) {
      super(false, {
        message: `An unexpected error occurred.`,
        error: err
      } as UseCaseError)
      // console.log(`[AppError]: An unexpected error occurred`);
      // console.error(err);
    }

    public static create (err: unknown): UnexpectedError {
      return new UnexpectedError(err);
    }
  }
}