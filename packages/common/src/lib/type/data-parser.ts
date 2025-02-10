import { Result } from "../Result";

export type DataParser<I, O,F=unknown> = (input: I) => Result<O,F>;