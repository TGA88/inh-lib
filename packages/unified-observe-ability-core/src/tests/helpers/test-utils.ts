

// Test utilities
import { UnifiedValidationResult } from '../../utils/validation.utils';

export function expectValidationToPass(result: UnifiedValidationResult): void {
  expect(result.isValid).toBe(true);
  expect(result.errors).toEqual([]);
}

export function expectValidationToFail(result: UnifiedValidationResult, expectedErrors?: string[]): void {
  expect(result.isValid).toBe(false);
  expect(result.errors.length).toBeGreaterThan(0);
  
  if (expectedErrors) {
    expectedErrors.forEach(error => {
      expect(result.errors).toContain(error);
    });
  }
}

export function createMockError(message = 'Mock error'): Error {
  const error = new Error(message);
  error.stack = `Error: ${message}\n    at createMockError (test-utils.ts:1:1)`;
  return error;
}

export function createMockValidationResult(isValid: boolean, errors: string[] = []): UnifiedValidationResult {
  return { isValid, errors: [...errors] };
}

