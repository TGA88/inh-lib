import { Result } from "../../../Result";
import { InhLogger } from "../../inh-logger";

export interface InhHealthCheckCommandItf<O,F> {
    execute: () => Promise<Result<O,F>>;
  }
  export type MakeInhHealthCheckCommandFn =  <T1,O,F>(healthCheckContext:T1,logger:InhLogger) => InhHealthCheckCommandItf<O,F>;



