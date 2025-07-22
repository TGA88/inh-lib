// src/utils/otel-validation.utils.ts

import {
  ValidationResult,
  createValidationResult
} from '@inh-lib/unified-observe-ability-core';
import { OtelResourceConfig, OtelMetricsConfig, OtelTracingConfig } from '../types';

export function validateOtelResourceConfig(config: OtelResourceConfig): ValidationResult {
  const errors: string[] = [];

  if (!config.serviceName || typeof config.serviceName !== 'string') {
    errors.push('serviceName is required and must be a string');
  }

  if (!config.serviceVersion || typeof config.serviceVersion !== 'string') {
    errors.push('serviceVersion is required and must be a string');
  }

  if (!config.environment || typeof config.environment !== 'string') {
    errors.push('environment is required and must be a string');
  }

  if (config.customAttributes) {
    Object.entries(config.customAttributes).forEach(([key, value]) => {
      if (typeof key !== 'string' || typeof value !== 'string') {
        errors.push(`Custom attribute ${key} must have string key and value`);
      }
    });
  }

  return createValidationResult(errors.length === 0, errors);
}

export function validateOtelMetricsConfig(config: OtelMetricsConfig): ValidationResult {
  const errors: string[] = [];

  if (config.exportInterval && (config.exportInterval < 1000 || config.exportInterval > 300000)) {
    errors.push('exportInterval must be between 1000ms and 300000ms');
  }

  if (config.resourceDetectionTimeout && config.resourceDetectionTimeout < 0) {
    errors.push('resourceDetectionTimeout must be non-negative');
  }

  if (config.viewConfigs) {
    config.viewConfigs.forEach((view, index) => {
      if (!view.instrumentName) {
        errors.push(`View config ${index}: instrumentName is required`);
      }
      if (!['counter', 'histogram', 'gauge'].includes(view.instrumentType)) {
        errors.push(`View config ${index}: invalid instrumentType`);
      }
    });
  }

  return createValidationResult(errors.length === 0, errors);
}

export function validateOtelTracingConfig(config: OtelTracingConfig): ValidationResult {
  const errors: string[] = [];

  if (config.sampleRate !== undefined) {
    if (config.sampleRate < 0 || config.sampleRate > 1) {
      errors.push('sampleRate must be between 0 and 1');
    }
  }

  if (config.maxSpansPerTrace !== undefined) {
    if (config.maxSpansPerTrace < 1 || config.maxSpansPerTrace > 10000) {
      errors.push('maxSpansPerTrace must be between 1 and 10000');
    }
  }

  if (config.resourceDetectionTimeout && config.resourceDetectionTimeout < 0) {
    errors.push('resourceDetectionTimeout must be non-negative');
  }

  return createValidationResult(errors.length === 0, errors);
}
