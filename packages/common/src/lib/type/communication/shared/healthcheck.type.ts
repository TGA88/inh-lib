import { Result } from "../../../Result";

export interface InhHealthCheckCommandItf {
    execute: <I,O>() => Promise<Result<I,O>>;
  }
  export type MakeInhHealthCheckCommandFn =  (target:string) => InhHealthCheckCommandItf;



