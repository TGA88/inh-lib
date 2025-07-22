
// src/configuration/otel-resource-builder.ts

import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { OtelResourceConfig } from '../types';
import {
  buildOtelResource,
  mergeOtelResources,
  extractResourceAttributes
} from '../utils';

export class OtelResourceBuilder {
  static build(config: OtelResourceConfig): Resource {
    return buildOtelResource(config);
  }

  static buildWithDetectors(config: OtelResourceConfig): Resource {
    const baseResource = buildOtelResource(config);
    
    if (!config.detectors || config.detectors.length === 0) {
      return baseResource;
    }

    const detectedResources = config.detectors
      .filter(detector => detector.enabled)
      .map(detector => detectResource(detector.type, detector.timeout))
      .filter((resource): resource is Resource => resource !== null);

    return detectedResources.reduce(
      (merged, resource) => mergeOtelResources(merged, resource),
      baseResource
    );
  }

  static buildWithCustomAttributes(
    config: OtelResourceConfig,
    customAttributes: Record<string, string>
  ): Resource {
    const baseResource = buildOtelResource(config);
    const customResource = new Resource(customAttributes);
    return mergeOtelResources(baseResource, customResource);
  }

  static extractAttributes(resource: Resource): Record<string, string> {
    return extractResourceAttributes(resource);
  }
}

function detectResource(type: string, timeout?: number): Resource | null {
  // In real implementation, would use actual resource detectors
  switch (type) {
    case 'env':
      return new Resource({
        [SemanticResourceAttributes.PROCESS_PID]: String(process.pid),
        [SemanticResourceAttributes.PROCESS_EXECUTABLE_NAME]: process.title
      });
    
    case 'host':
      return new Resource({
        [SemanticResourceAttributes.HOST_NAME]: require('os').hostname(),
        [SemanticResourceAttributes.HOST_ARCH]: require('os').arch()
      });
    
    case 'os':
      return new Resource({
        [SemanticResourceAttributes.OS_TYPE]: require('os').type(),
        [SemanticResourceAttributes.OS_VERSION]: require('os').release()
      });
    
    case 'process':
      return new Resource({
        [SemanticResourceAttributes.PROCESS_RUNTIME_NAME]: 'nodejs',
        [SemanticResourceAttributes.PROCESS_RUNTIME_VERSION]: process.version
      });
    
    default:
      return null;
  }
}
