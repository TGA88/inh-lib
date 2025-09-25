/**
 * Simplified main exports - less code, better maintainability
 * ไม่มี any types, เขียน code น้อยที่สุด
 */

// ===== Service Classes =====
export { 
    UnifiedRegistryService, 
    UnifiedRegistryScope,
    type UnifiedRegistryStatistics, 
    type UnifiedScopeStatistics 
} from './services/unified-registry.service';

// ===== Constants =====
export { 
    UNIFIED_SERVICE_LIFETIME, 
    SERVICE_OPTIONS,
    REGISTRY_CONFIG,
    ERROR_MESSAGES
} from './constants/unified-registry.const';

// ===== Helper Functions - One-liners =====
import { 
    buildInternalSingletonOptions,
    buildInternalTransientOptions,
    buildInternalScopedOptions,
    areValidInternalServiceOptions
} from './internal/core/internal-service-helpers.logic';

import { asUnifiedOptions, asInternalOptions } from './internal/core/internal-type-utils.logic';
import type { UnifiedServiceOptions } from './types/unified-registry.types';

/**
 * Create service options - simplified one-liners
 */
export const singleton = (disposable = false) => asUnifiedOptions(buildInternalSingletonOptions(disposable));
export const transient = () => asUnifiedOptions(buildInternalTransientOptions());
export const scoped = (disposable = false) => asUnifiedOptions(buildInternalScopedOptions(disposable));

/**
 * Validate service options - no any types
 */
export const validateServiceOptions = (options: UnifiedServiceOptions): boolean => {
    return areValidInternalServiceOptions(asInternalOptions(options));
};

// ===== Types Import Guide =====
/**
 * Import types separately for better performance:
 * 
 * import { UnifiedRegistryService, singleton } from '@inh-lib/unified-route';
 * import type { UnifiedScope } from '@inh-lib/unified-route/types/unified-registry.types';
 */