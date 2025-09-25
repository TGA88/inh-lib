import type { 
    InternalRegistry, 
    InternalScope, 
    InternalServiceOptions 
} from '../types/internal-unified-registry.types';

import type { 
    UnifiedRegistry, 
    UnifiedScope, 
    UnifiedServiceOptions 
} from '../../types/unified-registry.types';

/**
 * Simple type utilities - minimal code for type safety
 * เนื่องจาก structure เหมือนกัน จึงใช้ safe type assertions
 */

/**
 * Safe cast public registry to internal (same structure)
 */
export const asInternalRegistry = (registry: UnifiedRegistry): InternalRegistry => {
    return registry as unknown as InternalRegistry;
};

/**
 * Safe cast internal registry to public (same structure)
 */
export const asUnifiedRegistry = (registry: InternalRegistry): UnifiedRegistry => {
    return registry as unknown as UnifiedRegistry;
};

/**
 * Safe cast public scope to internal (same structure)
 */
export const asInternalScope = (scope: UnifiedScope): InternalScope => {
    return scope as unknown as InternalScope;
};

/**
 * Safe cast internal scope to public (same structure)
 */
export const asUnifiedScope = (scope: InternalScope): UnifiedScope => {
    return scope as unknown as UnifiedScope;
};

/**
 * Safe cast public options to internal (same structure)
 */
export const asInternalOptions = (options: UnifiedServiceOptions): InternalServiceOptions => {
    return options as InternalServiceOptions;
};

/**
 * Safe cast internal options to public (same structure)
 */
export const asUnifiedOptions = (options: InternalServiceOptions): UnifiedServiceOptions => {
    return options as UnifiedServiceOptions;
};

/**
 * Convert unified factory to internal factory - simple wrapper
 */
export const wrapFactoryForInternal = <T>(
    factory: (() => T) | ((scope: UnifiedScope) => T)
): (() => T) | ((scope: InternalScope) => T) => {
    if (factory.length === 0) {
        // No parameters - direct cast
        return factory as () => T;
    } else {
        // Has scope parameter - wrap with scope conversion
        return (internalScope: InternalScope): T => {
            const unifiedScope = asUnifiedScope(internalScope);
            return (factory as (scope: UnifiedScope) => T)(unifiedScope);
        };
    }
};