import { Result } from "../Result";

export type DataParser<I, O> = (input: I) => Result<O>;