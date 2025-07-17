import { ValidationResult, validateMetricName, validateLabelKeys, validateAttributes, validateServiceName } from '../utils/validation.utils';
import { CounterOptions } from '../types/metrics/counter';
import { HistogramOptions } from '../types/metrics/histogram';
import { GaugeOptions } from '../types/metrics/gauge';
import { ObservabilityConfig } from '../types/configuration/observability-config';
import { LoggerOptions } from '../types/logging/logger';
import { SpanOptions } from '../types/tracing/span';
import { SpanContext } from '../types/tracing/context';
import { ValidationError } from '../errors';

export function validateCounterOptions(options: CounterOptions): ValidationResult {
  const errors: string[] = [];
  
  const nameValidation = validateMetricName(options.name);
  if (!nameValidation.isValid) {
    errors.push(...nameValidation.errors);
  }
  
  if (!options.description || typeof options.description !== 'string') {
    errors.push('Counter description is required and must be a string');
  }
  
  if (options.labelKeys) {
    const labelKeysValidation = validateLabelKeys(options.labelKeys);
    if (!labelKeysValidation.isValid) {
      errors.push(...labelKeysValidation.errors);
    }
  }
  
  return { isValid: errors.length === 0, errors };
}

export function validateHistogramOptions(options: HistogramOptions): ValidationResult {
  const errors: string[] = [];
  
  const nameValidation = validateMetricName(options.name);
  if (!nameValidation.isValid) {
    errors.push(...nameValidation.errors);
  }
  
  if (!options.description || typeof options.description !== 'string') {
    errors.push('Histogram description is required and must be a string');
  }
  
  if (options.labelKeys) {
    const labelKeysValidation = validateLabelKeys(options.labelKeys);
    if (!labelKeysValidation.isValid) {
      errors.push(...labelKeysValidation.errors);
    }
  }
  
  if (options.boundaries) {
    const boundariesValidation = validateHistogramBoundaries(options.boundaries);
    if (!boundariesValidation.isValid) {
      errors.push(...boundariesValidation.errors);
    }
  }
  
  return { isValid: errors.length === 0, errors };
}

export function validateGaugeOptions(options: GaugeOptions): ValidationResult {
  const errors: string[] = [];
  
  const nameValidation = validateMetricName(options.name);
  if (!nameValidation.isValid) {
    errors.push(...nameValidation.errors);
  }
  
  if (!options.description || typeof options.description !== 'string') {
    errors.push('Gauge description is required and must be a string');
  }
  
  if (options.labelKeys) {
    const labelKeysValidation = validateLabelKeys(options.labelKeys);
    if (!labelKeysValidation.isValid) {
      errors.push(...labelKeysValidation.errors);
    }
  }
  
  return { isValid: errors.length === 0, errors };
}

export function validateObservabilityConfig(config: ObservabilityConfig): ValidationResult {
  const errors: string[] = [];
  
  const serviceNameValidation = validateServiceName(config.serviceName);
  if (!serviceNameValidation.isValid) {
    errors.push(...serviceNameValidation.errors);
  }
  
  if (!config.serviceVersion || typeof config.serviceVersion !== 'string') {
    errors.push('Service version is required and must be a string');
  }
  
  if (!config.environment || typeof config.environment !== 'string') {
    errors.push('Environment is required and must be a string');
  }
  
  // Validate vendor-specific configs
  if (config.metrics?.enabled && !config.metrics.vendor) {
    errors.push('metrics.vendor is required when metrics are enabled');
  }
  
  if (config.tracing?.enabled && !config.tracing.vendor) {
    errors.push('tracing.vendor is required when tracing are enabled');
  }
  
  if (config.logging?.enabled && !config.logging.vendor) {
    errors.push('logging.vendor is required when logging are enabled');
  }
  
  return { isValid: errors.length === 0, errors };
}

export function validateLoggerOptions(options: LoggerOptions): ValidationResult {
  const errors: string[] = [];
  
  if (!options.name || typeof options.name !== 'string') {
    errors.push('Logger name is required and must be a string');
  }
  
  if (options.name && options.name.length === 0) {
    errors.push('Logger name cannot be empty');
  }
  
  return { isValid: errors.length === 0, errors };
}

export function validateSpanOptions(name: string, options?: SpanOptions): ValidationResult {
  const errors: string[] = [];
  
  if (!name || typeof name !== 'string') {
    errors.push('Span name is required and must be a string');
  }
  
  if (name && name.length === 0) {
    errors.push('Span name cannot be empty');
  }
  
  if (options?.attributes) {
    const attributesValidation = validateAttributes(options.attributes);
    if (!attributesValidation.isValid) {
      errors.push(...attributesValidation.errors);
    }
  }
  
  return { isValid: errors.length === 0, errors };
}

export function validateSpanContext(context: SpanContext): ValidationResult {
  const errors: string[] = [];
  
  if (!context.traceId || typeof context.traceId !== 'string') {
    errors.push('Trace ID is required and must be a string');
  }
  
  if (!context.spanId || typeof context.spanId !== 'string') {
    errors.push('Span ID is required and must be a string');
  }
  
  if (typeof context.traceFlags !== 'number') {
    errors.push('Trace flags must be a number');
  }
  
  if (context.traceFlags < 0 || context.traceFlags > 255) {
    errors.push('Trace flags must be between 0 and 255');
  }
  
  // Validate trace ID format (32 hex characters)
  if (context.traceId && !/^[0-9a-f]{32}$/i.test(context.traceId)) {
    errors.push('Trace ID must be 32 hexadecimal characters');
  }
  
  // Validate span ID format (16 hex characters)
  if (context.spanId && !/^[0-9a-f]{16}$/i.test(context.spanId)) {
    errors.push('Span ID must be 16 hexadecimal characters');
  }
  
  // Validate trace ID is not all zeros
  if (context.traceId && context.traceId === '00000000000000000000000000000000') {
    errors.push('Trace ID cannot be all zeros');
  }
  
  // Validate span ID is not all zeros
  if (context.spanId && context.spanId === '0000000000000000') {
    errors.push('Span ID cannot be all zeros');
  }
  
  return { isValid: errors.length === 0, errors };
}

export function validateTraceState(traceState?: string): ValidationResult {
  const errors: string[] = [];
  
  if (traceState !== undefined) {
    if (typeof traceState !== 'string') {
      errors.push('Trace state must be a string');
      return { isValid: false, errors };
    }
    
    // W3C Trace Context specification validation
    if (traceState.length > 512) {
      errors.push('Trace state cannot exceed 512 characters');
    }
    
    // Validate trace state format: key1=value1,key2=value2
    const entries = traceState.split(',');
    for (const entry of entries) {
      const [key, value] = entry.split('=');
      
      if (!key || !value) {
        errors.push(`Invalid trace state entry format: ${entry}`);
        continue;
      }
      
      // Key validation
      if (key.length > 256) {
        errors.push(`Trace state key too long: ${key}`);
      }
      
      if (!/^[a-z0-9_\-*/]*$/.test(key)) {
        errors.push(`Invalid characters in trace state key: ${key}`);
      }
      
      // Value validation
      if (value.length > 256) {
        errors.push(`Trace state value too long for key: ${key}`);
      }
      
      if (!/^[\x20-\x7E]*$/.test(value)) {
        errors.push(`Invalid characters in trace state value for key: ${key}`);
      }
    }
  }
  
  return { isValid: errors.length === 0, errors };
}

// Helper function to throw ValidationError if validation fails
export function assertValid(validation: ValidationResult, context: string): void {
  if (!validation.isValid) {
    throw new ValidationError(
      `Validation failed for ${context}`,
      validation.errors
    );
  }
}

// Add missing function import
import { validateHistogramBoundaries } from '../utils/validation.utils';