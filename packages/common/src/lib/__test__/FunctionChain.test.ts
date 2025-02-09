import { FunctionChain, FunctionStep } from '../FunctionChain';
import {  left, right, Result } from '../Result';
import { InhLogContext, InhLogger } from '../type/inh-logger';

describe('FunctionChain', () => {
  let functionChain: FunctionChain;
let logContext: InhLogContext;
  beforeEach(() => {
  
    logContext = new InhLogContext(console as unknown as InhLogger);
    functionChain = new FunctionChain(logContext);
  });

  test('should add steps to the function chain', () => {
    const step: FunctionStep = (data) => right(data);
    functionChain.addStep(step);
    expect(functionChain.totalSteps()).toBe(1);
  });

  test('should start the function chain and process data through steps', () => {
    const step1: FunctionStep = (data) => right(data as number + 1);
    const step2: FunctionStep = (data) => right(data as number * 2);

    functionChain.addStep(step1).addStep(step2);
    functionChain.start(1);

    const result = functionChain.getResult();
    expect(result.isRight()).toBe(true);
    expect(result.value).toBe(4);
  });

  test('should stop the chain execution if a step fails', () => {
    const step1: FunctionStep = (data) => right(data as number + 1);
    const step2: FunctionStep = () => left(Result.fail('Step 2 failed'));
    const step3: FunctionStep = (data) => right(data as number * 2);

    functionChain.addStep(step1).addStep(step2).addStep(step3);
    functionChain.start(1);

    const result = functionChain.getResult();
    expect(result.isLeft()).toBe(true);
    expect(result.value).toEqual(Result.fail('Step 2 failed'));
  });

  test('should return failure if no steps are defined', () => {
    functionChain.start(1);
    const result = functionChain.getResult();
    expect(result.isLeft()).toBe(true);
    expect(result.value).toEqual(Result.fail('No steps defined in the chain'));
  });

  test('should return failure if chain has not been started', () => {
    const result = functionChain.getResult();
    expect(result.isLeft()).toBe(true);
    expect(result.value).toEqual(Result.fail('Chain has not been started'));
  });
});