import { Result } from "../Result";

export type DataParser<I, O,F> = (input: I) => Result<O,F>;