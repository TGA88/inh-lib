
export class Result<T,F=unknown> {
  public isSuccess: boolean;
  public isFailure: boolean
  public error?: F | string;
  private readonly _value?: T;

  public constructor (isSuccess: boolean, error?: F | string, value?: T) {
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

  public getValue () : T | undefined {
    if (!this.isSuccess) {
      console.log(this.error,);
      throw new Error("Can't get the value of an error Result. Use 'errorValue' instead.")
    } 

    return this._value;
  }

  public errorValue (): F {
    return this.error as F;
  }

  public static ok<T,F> (value?: T) : Result<T,F> {
    return new Result<T,F>(true,undefined , value);
  }

  public static fail<T,F> (error: F): Result<T,F> {
    return new Result<T,F>(false, error);
  }

  public static combine (Results: Result<unknown,unknown>[]) : Result<unknown,unknown> {
    for (const Result of Results) {
      if (Result.isFailure) return Result;
    }
    return Result.ok();
  }
}

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

export const left = <L, A>(l: L): Either<L, A> => {
  return new Left(l);
};

export const right = <L, A>(a: A): Either<L, A> => {
  return new Right<L, A>(a);
};


