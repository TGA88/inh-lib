
import { Result } from "./ResultV2";

export type Either<L, A> = Left<L, A> | Right<L, A>;

export class Left<L, A> {
  readonly value: L;

  constructor(value: L) {
    this.value = value;
  }

  isLeft(): this is Left<L, A> {
    return true;
  }

  isRight(): this is Right<L, A> {
    return false;
  }
}

export class Right<L, A> {
  readonly value: A;

  constructor(value: A) {
    this.value = value;
  }

  isLeft(): this is Left<L, A> {
    return false;
  }

  isRight(): this is Right<L, A> {
    return true;
  }
}

// =======================================

// ====helper functions====

export const left = <L, A>(l: L): Either<L, A> => {
  return new Left(l);
};

export const right = <L, A>(a: A): Either<L, A> => {
  return new Right<L, A>(a);
};

/**
 * Executes an asynchronous operation and wraps the result in an Either type.
 * 
 * @template T - The type of the successful result
 * @template E - The type of the error (defaults to Error)
 * 
 * @param operation - An asynchronous function that returns a Promise of type T
 * @param errorMapper - Optional function to transform caught errors into type E
 * 
 * @returns A Promise that resolves to Either<E, T>:
 *          - Right<T> if the operation succeeds
 *          - Left<E> if the operation throws an error
 * 
 * @example
 * ```typescript
 * const result = await eitherFromOperation(
 *   async () => fetchData(),
 *   (error) => new CustomError(error)
 * );
 * ```
 */
export const eitherFromOperation = async <T, E=Error>(
    operation: () => Promise<T>,
    errorMapper?: (error: unknown) => E
): Promise<Either<E, T>> => {
    try {
        const result = await operation();
        return right(result);
    } catch (error) {
        const mappedError = errorMapper ? errorMapper(error) : defaultErrorMapper(error) as E;
        return left(mappedError);
    }
};

export const defaultErrorMapper = (error: unknown): Error => {
    if (error instanceof Error) {
        return error;
    }
    const errorMessage = typeof error === 'string' ? error : 'Unknown error';
    return new Error(errorMessage);
}

// ========================================




/**
 * Pattern matches on an Either type, executing the appropriate function based on whether it contains a Left or Right value.
 * 
 * @template L - The type of the Left value (error case)
 * @template A - The type of the Right value (success case)
 * @template R - The return type of both matcher functions
 * 
 * @param {Either<L, A>} either - The Either instance to match against
 * @param {(error: L) => R} onLeft - Function to execute if Either contains a Left value
 * @param {(value: A) => R} onRight - Function to execute if Either contains a Right value
 * 
 * @returns {R} The result of executing either onLeft or onRight function
 * 
 * @example
 * // Basic usage
 * ```typescript
 * const result = matchEither(
 *   someEither,
 *   (error) => `Error: ${error}`,
 *   (value) => `Success: ${value}`
 * );
 * ```
 * 
 * @example
 * // Converting Either to Result
 * ```typescript
 * import { ResultV2 as Result } from '@inh-lib/common';
 *
 * const convertToResult = <L, A>(either: Either<L, A>): Result<A, L> => {
 *   return matchEither(
 *     either,
 *     (error) => Result.fail(error),
 *     (value) => Result.ok(value)
 *   );
 * };
 * ```
 */
export const matchEither = <L, A, R>(
    either: Either<L, A>,
    onLeft: (error: L) => R,
    onRight: (value: A) => R
): R => {
    return either.isLeft() ? onLeft(either.value) : onRight(either.value);
};

export const eitherToResult = <L, A>(either: Either<L, A>): Result<A, L> => {
    return matchEither(
        either,
        (error) => Result.fail(error),
        (value) => Result.ok(value)
    );
};

// ========================================