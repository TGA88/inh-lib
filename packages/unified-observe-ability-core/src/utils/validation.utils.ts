import { AttributeValue, LabelValue } from './type.utils';

export interface ValidationResult {
  readonly isValid: boolean;
  readonly errors: string[];
}

export function createValidationResult(isValid: boolean, errors: string[] = []): ValidationResult {
  return { isValid, errors: [...errors] };
}

export function validateMetricName(name: string): ValidationResult {
  const errors: string[] = [];
  
  if (!name || typeof name !== 'string') {
    errors.push('Metric name must be a non-empty string');
    return createValidationResult(false, errors);
  }
  
  if (name.length === 0) {
    errors.push('Metric name cannot be empty');
  }
  
  if (name.length > 255) {
    errors.push('Metric name cannot exceed 255 characters');
  }
  
  // Check valid characters (alphanumeric, underscore, colon)
  const validNameRegex = /^[a-zA-Z_:][a-zA-Z0-9_:]*$/;
  if (!validNameRegex.test(name)) {
    errors.push('Metric name must start with letter, underscore, or colon and contain only alphanumeric characters, underscores, and colons');
  }
  
  return createValidationResult(errors.length === 0, errors);
}

export function validateLabelKeys(labelKeys: string[]): ValidationResult {
  const errors: string[] = [];
  
  for (const key of labelKeys) {
    if (!key || typeof key !== 'string') {
      errors.push('Label keys must be non-empty strings');
      continue;
    }
    
    if (key.length === 0) {
      errors.push('Label key cannot be empty');
      continue;
    }
    
    if (key.startsWith('__')) {
      errors.push(`Label key "${key}" cannot start with double underscore (reserved prefix)`);
    }
    
    const validKeyRegex = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
    if (!validKeyRegex.test(key)) {
      errors.push(`Label key "${key}" must start with letter or underscore and contain only alphanumeric characters and underscores`);
    }
  }
  
  return createValidationResult(errors.length === 0, errors);
}

export function validateLabels(labels: Record<string, LabelValue>): ValidationResult {
  const errors: string[] = [];
  
  for (const [key, value] of Object.entries(labels)) {
    const keyValidation = validateLabelKeys([key]);
    if (!keyValidation.isValid) {
      errors.push(...keyValidation.errors);
    }
    
    if (typeof value !== 'string') {
      errors.push(`Label value for key "${key}" must be a string`);
    }
  }
  
  return createValidationResult(errors.length === 0, errors);
}

export function validateAttributes(attributes: Record<string, AttributeValue>): ValidationResult {
  const errors: string[] = [];
  
  for (const [key, value] of Object.entries(attributes)) {
    if (!key || typeof key !== 'string') {
      errors.push('Attribute keys must be non-empty strings');
      continue;
    }
    
    if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') {
      errors.push(`Attribute value for key "${key}" must be string, number, or boolean`);
    }
  }
  
  return createValidationResult(errors.length === 0, errors);
}

export function validateHistogramBoundaries(boundaries: number[]): ValidationResult {
  const errors: string[] = [];
  
  if (boundaries.length === 0) {
    errors.push('Histogram boundaries cannot be empty');
    return createValidationResult(false, errors);
  }
  
  // Check for non-numeric values
  for (const boundary of boundaries) {
    if (typeof boundary !== 'number' || !Number.isFinite(boundary)) {
      errors.push('All histogram boundaries must be finite numbers');
      break;
    }
  }
  
  // Check for sorted order
  for (let i = 1; i < boundaries.length; i++) {
    if (boundaries[i] <= boundaries[i - 1]) {
      errors.push('Histogram boundaries must be in strictly increasing order');
      break;
    }
  }
  
  // Check for positive values
  if (boundaries[0] <= 0) {
    errors.push('Histogram boundaries must be positive');
  }
  
  return createValidationResult(errors.length === 0, errors);
}

export function validateServiceName(serviceName: string): ValidationResult {
  const errors: string[] = [];
  
  if (!serviceName || typeof serviceName !== 'string') {
    errors.push('Service name must be a non-empty string');
    return createValidationResult(false, errors);
  }
  
  if (serviceName.length === 0) {
    errors.push('Service name cannot be empty');
  }
  
  if (serviceName.length > 100) {
    errors.push('Service name cannot exceed 100 characters');
  }
  
  const validServiceNameRegex = /^[a-zA-Z][a-zA-Z0-9._-]*$/;
  if (!validServiceNameRegex.test(serviceName)) {
    errors.push('Service name must start with letter and contain only alphanumeric characters, dots, underscores, and hyphens');
  }
  
  return createValidationResult(errors.length === 0, errors);
}