
// src/utils/otel-resource.utils.ts

import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { OtelResourceConfig } from '../types';

export function buildOtelResource(config: OtelResourceConfig): Resource {
  const attributes: Record<string, string> = {
    [SemanticResourceAttributes.SERVICE_NAME]: config.serviceName,
    [SemanticResourceAttributes.SERVICE_VERSION]: config.serviceVersion,
    [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: config.environment,
    [SemanticResourceAttributes.TELEMETRY_SDK_NAME]: 'inh-unified-observability',
    [SemanticResourceAttributes.TELEMETRY_SDK_VERSION]: '1.0.0',
    [SemanticResourceAttributes.TELEMETRY_SDK_LANGUAGE]: 'nodejs'
  };

  if (config.serviceNamespace) {
    attributes[SemanticResourceAttributes.SERVICE_NAMESPACE] = config.serviceNamespace;
  }

  if (config.serviceInstanceId) {
    attributes[SemanticResourceAttributes.SERVICE_INSTANCE_ID] = config.serviceInstanceId;
  }

  if (config.customAttributes) {
    Object.assign(attributes, config.customAttributes);
  }

  return new Resource(attributes);
}

export function mergeOtelResources(base: Resource, additional: Resource): Resource {
  return base.merge(additional);
}

export function extractResourceAttributes(resource: Resource): Record<string, string> {
  const attributes: Record<string, string> = {};
  
  Object.entries(resource.attributes).forEach(([key, value]) => {
    if (typeof value === 'string') {
      attributes[key] = value;
    } else {
      attributes[key] = String(value);
    }
  });

  return attributes;
}
