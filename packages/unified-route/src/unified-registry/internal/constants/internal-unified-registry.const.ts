import type { InternalServiceOptions } from '../types/internal-unified-registry.types';

/**
 * Internal constants for unified registry operations
 * ใช้เฉพาะภายใน internal folder เท่านั้น
 * Public constants จะ extends/assign จากที่นี่
 */

/**
 * Internal service lifetime values
 * ไม่ใช้ enum ตาม rules
 */
export const INTERNAL_SERVICE_LIFETIME = {
    SINGLETON: 'singleton',
    TRANSIENT: 'transient',
    SCOPED: 'scoped'
} as const;

/**
 * Internal pre-configured service options
 * ไม่มี helper functions - เป็นแค่ constant values
 */
export const INTERNAL_SERVICE_OPTIONS: Record<string, InternalServiceOptions> = {
    SINGLETON_DISPOSABLE: { 
        lifetime: 'singleton', 
        disposable: true 
    },
    SINGLETON_NON_DISPOSABLE: { 
        lifetime: 'singleton', 
        disposable: false 
    },
    TRANSIENT: { 
        lifetime: 'transient' 
    },
    SCOPED_DISPOSABLE: { 
        lifetime: 'scoped', 
        disposable: true 
    },
    SCOPED_NON_DISPOSABLE: { 
        lifetime: 'scoped', 
        disposable: false 
    }
} as const;

/**
 * Internal registry configuration constants
 */
export const INTERNAL_REGISTRY_CONFIG = {
    MAX_CIRCULAR_DEPENDENCY_DEPTH: 50,
    DEFAULT_VALIDATION_TIMEOUT: 5000,
    DEBUG_LOG_PREFIX: '[UnifiedRegistry]',
    DEVELOPMENT_ENV: 'development'
} as const;

/**
 * Internal error message templates
 * Constants only - ไม่มี functions
 */
export const INTERNAL_ERROR_MESSAGES = {
    SERVICE_NOT_FOUND: 'Service not found',
    CIRCULAR_DEPENDENCY: 'Circular dependency detected',
    SCOPED_SERVICE_DIRECT_RESOLVE: 'Scoped service cannot be resolved directly',
    DISPOSED_SCOPE: 'Cannot resolve from disposed scope',
    INVALID_SERVICE_OPTIONS: 'Invalid service options provided',
    REGISTRY_VALIDATION_START: 'Validating services...',
    REGISTRY_VALIDATION_SUCCESS: 'All dependencies validated successfully',
    REGISTRY_VALIDATION_FAILED: 'Validation failed: errors found'
} as const;