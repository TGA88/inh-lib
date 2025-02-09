import { Either, left, Result } from "./Result";
import { createEventLogFormatFn, EventLogFormatter, InhLogContext, InhLogger } from "./type/inh-logger";

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
export type FunctionStep = {
    (data?: unknown): Either<unknown, unknown>;
};

/**
 * Interface for the FunctionChain class.
 */
export interface FunctionChainItf {

    /**
     * Adds a step to the function chain.
     * @param step - The step to be added.
     * @returns The FunctionChain instance.
     */
    addStep(step: FunctionStep): FunctionChainItf;

    totalSteps(): number;

    /**
     * Starts the function chain with the provided data.
     * @param data - The initial data to start the chain.
     * @returns The FunctionChain instance.
     */
    start(data: unknown): FunctionChainItf;

    /**
     * Retrieves the result of the function chain.
     * @returns An Either type representing the result of the function chain.
     */
    getResult(): Either<unknown, unknown>;
}

/**
 * Class representing a chain of functions to be executed sequentially.
 * Implements the FunctionChainItf interface.
 */
export class FunctionChain implements FunctionChainItf {
    private logger: InhLogger;
    private logFmt:EventLogFormatter
    private logCtx:InhLogContext

    private steps: FunctionStep[] = [];
    private currentResult: Either<unknown, unknown> | undefined;

    constructor(originLogCtx: InhLogContext){
        this.logCtx= originLogCtx.createChild()
        this.logFmt = createEventLogFormatFn('FunctionChain',this.logCtx.context)
        this.logger = this.logCtx.logger;
    }
    
    /**
     * Adds a step to the function chain.
     * @param step - The step to be added.
     * @returns The FunctionChain instance.
     * @remarks
     * This method appends the provided step to the internal list of steps.
     */
    addStep(step: FunctionStep): FunctionChainItf {
        this.steps.push(step);
        return this;
    }

    totalSteps(): number {
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
    start(data: unknown): FunctionChainItf {
        this.logger.info(this.logFmt("Begin function start"));
        if (this.steps.length === 0) {
            // If no steps are defined, set the current result to a failure
            this.logger.info(this.logFmt("No steps defined in the chain"));
            this.currentResult = left(Result.fail("No steps defined in the chain"));
            return this;
        }

        // Execute the first step with the initial data
        this.logger.info(this.logFmt(`Execute the first step [${this.steps[0].name}] with the initial data`, data));

        let result = this.steps[0](data);
        
        // Iterate through the remaining steps
        for (let i = 1; i < this.steps.length; i++) {
            const val = result.value;
            // If the result is a failure, break the loop
            if (result.isLeft()) {
                this.logger.info(this.logFmt(`End function start with Error at step [${this.steps[i].name}]`, val));
                break;
            }
            // Execute the next step with the result of the previous step
            const nextStep = this.steps[i];
            
            this.logger.info(this.logFmt(`Execute the next step[${nextStep.name}] with the result of the previous step `, val));
            result = nextStep(val);
        }

        // Set the final result
        this.logger.info(this.logFmt(`End function start successfully`,result));
        this.currentResult = result;
        return this;
    }

    /**
     * Retrieves the result of the function chain.
     * @returns An Either type representing the result of the function chain.
     * @remarks
     * This method returns the final result of the function chain execution. If the chain
     * has not been started, it returns a failure result.
     */
    getResult(): Either<unknown, unknown> {
        if (this.currentResult === undefined) {
            // If the chain has not been started, return a failure
            return left(Result.fail("Chain has not been started"));
        }
        return this.currentResult;
    }
}





// export class FunctionChain {
//     private steps: FunctionStep[] = [];
//     constructor(steps: FunctionStep[]){
//         this.steps = steps;
//     }
//     public async start(data:unknown): Promise<Either<unknown,unknown>> {
//         let isFirst=true;
//         let result: Either<unknown,unknown> = this.steps[0](data);
//         for (const step of this.steps) {
//             if (isFirst) {
//                 isFirst = false;
    
//                 result= step(data);
//                 if (result.isLeft()) {
//                     return result;
//                 }
//             }

//             result = nextStep(step, result);
//             if (result.isLeft()) {
//                 break;
//             }
//         }
//         return result;
//     }
// }
