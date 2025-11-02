import {  Result } from "./Result";
import { left,Either } from "./Either";
import { createEventLogFormatFn, EventLogFormatter, InhLogContext, InhLogger } from "./type/inh-logger";

export type FunctionChainState = Record<string, unknown>

/**
 * Represents a function instance with an input and a function that processes the input.
 * @template I - The type of the input.
 */
export type FunctionInstance<I> = {
    /**
     * The function that processes the input.
     * @param input - The input to be processed.
     * @returns An Either type representing the result of the function.
     */
    fn(input?: I): Either<unknown, unknown>;
    input: I;
};

/**
 * Represents a step in the function chain.
 * @param data - The data to be processed by the step.
 * @returns An Either type representing the result of the step.
 */
export type FunctionStep<I, O> = {
    (data: I): O
};

/**
 * Interface for the FunctionChain class.
 */
/**
 * Interface representing a chain of functions to be executed sequentially.
 * 
 * @template T - The type of the input data for the function chain.
 * @template O - The type of the output result of the function chain.
 * 
 * @remarks
 * The `FunctionChainItf` interface allows you to create a chain of functions
 * that can be executed in sequence. Each function in the chain is referred to
 * as a "step". You can add steps to the chain using the `addStep` method, 
 * start the chain with initial data using the `start` method, and retrieve 
 * the result of the chain using the `getResult` method.
 * 
 * @example
 * ```typescript
 * const chain: FunctionChainItf<number, string> = new FunctionChain<number, string>();
 * chain.addStep(async (data) => data + 1)
 *      .addStep(async (data) => data * 2)
 *      .start(1)
 *      .then(() => {
 *          const result = chain.getResult();
 *          console.log(result); // Output will depend on the implementation of getResult
 *      });
 * ```
 */
export interface FunctionChainItf<T, O> {

    /**
     * Adds a step to the function chain.
     * @param step - The step to be added.
     * @returns The FunctionChain instance.
     */
    addStep(step: FunctionStep<T, O>): FunctionChainItf<T, O>;

    totalSteps(): number;

    /**
     * Starts the function chain with the provided data.
     * @param data - The initial data to start the chain.
     * @returns The FunctionChain instance.
     */
    start(data: T): Promise<FunctionChainItf<T, O>>;

    /**
     * Retrieves the result of the function chain.
     * @returns An Either type representing the result of the function chain.
     */
    getResult(): O
}

/**
 * Class representing a chain of functions to be executed sequentially.
 * Implements the FunctionChainItf interface.
 */
export class FunctionChain<T, O> implements FunctionChainItf<T, O> {
    private logger: InhLogger;
    private logFmt: EventLogFormatter
    private logCtx: InhLogContext

    private steps: FunctionStep<T, O>[] = [];
    private currentResult: O | undefined;

    constructor(originLogCtx: InhLogContext) {
        this.logCtx = originLogCtx.createChild()
        this.logFmt = createEventLogFormatFn('FunctionChain', this.logCtx.context)
        this.logger = this.logCtx.logger;
    }

    /**
     * Adds a step to the function chain.
     * @param step - The step to be added.
     * @returns The FunctionChain instance.
     * @remarks
     * This method appends the provided step to the internal list of steps.
     */
    addStep(step: FunctionStep<T, O>): FunctionChainItf<T, O> {
        this.logger.debug(this.logFmt(`Add step [${step.name}] to the function chain`));
        this.steps.push(step);
        return this;
    }

    totalSteps(): number {
        this.logger.debug(this.logFmt(`Get total steps in the function chain`,this.steps.length));
        return this.steps.length;
    }

    /**
     * Starts the function chain with the provided data.
     * @param data - The initial data to start the chain.
     * @returns The FunctionChain instance.
     * @remarks
     * This method initializes the function chain execution. It processes the initial data
     * through the first step and then sequentially through the remaining steps. If any step
     * results in a failure, the chain execution stops and the failure result is set.
     */
    async start(data: T): Promise<FunctionChainItf<T, O>> {
        this.logger.info(this.logFmt("Begin function start"));
        if (this.steps.length === 0) {
            // If no steps are defined, set the current result to a failure
            this.logger.info(this.logFmt("No steps defined in the chain"));
            this.currentResult = left(Result.fail("No steps defined in the chain")) as O;
            return this;
        }

        // Execute the first step with the initial data
        this.logger.info(this.logFmt(`Execute the first step [${this.steps[0].name}] with the initial data`));
        this.logger.debug(this.logFmt(`Initial data`, data));

        let result = await this.steps[0](data) as Either<unknown, unknown>;
        this.currentResult = result as O;
        // If the result is a failure, break the loop
        if (result.isLeft()) {
            const fail = result.value;
            this.logger.info(this.logFmt(`End function start with Error at step [${this.steps[0].name}]`));
            this.logger.debug(this.logFmt(`Error`, fail));

        }

        // Iterate through the remaining steps
        for (let i = 1; i < this.steps.length; i++) {
            // previousState 
            const val = result.value;

            // Execute the next step with the result of the previous step
            const pvState = val as T;
            const nextStep = this.steps[i];
            this.logger.info(this.logFmt(`Execute the next step[${nextStep.name}] with the result of the previous step `));
            this.logger.debug(this.logFmt(`Previous state`, pvState));

            result = await nextStep(pvState) as Either<unknown, unknown>;
            // If the result is a failure, break the loop
            if (result.isLeft()) {
                this.logger.info(this.logFmt(`End function start with Error at step [${this.steps[i].name}]`));
                this.logger.debug(this.logFmt(`step [${this.steps[i].name}] Error`, result.value));
                this.currentResult = result as O;
                return this
            }
        }

        // Set the final result
        this.logger.info(this.logFmt(`End function start successfully`));
        this.logger.debug(this.logFmt(`Final state`, result.value));

        this.currentResult = result as O;
        return this;
    }

    /**
     * Retrieves the result of the function chain.
     * @returns An Either type representing the result of the function chain.
     * @remarks
     * This method returns the final result of the function chain execution. If the chain
     * has not been started, it returns a failure result.
     */
    getResult(): O {
        this.logger.info(this.logFmt(`Get result of the function chain`));
        if (this.currentResult === undefined) {
            // If the chain has not been started, return a failure
            this.logCtx.logger.error(this.logFmt(`Chain has not been started`));
            return left(Result.fail("Chain has not been started")) as O;
        }
        return this.currentResult as O;
    }
}