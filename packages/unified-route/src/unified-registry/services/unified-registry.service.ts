import type { 
    UnifiedRegistry, 
    UnifiedScope, 
    UnifiedServiceOptions
} from '../types/unified-registry.types';

// Import core functions
import { 
    createInternalRegistryInstance, 
    createInternalScopeInstance 
} from '../internal/core/internal-registry-factory.logic';

// Import simple type utilities
import {
    asInternalRegistry,
    asUnifiedRegistry,
    asInternalScope,
    asUnifiedScope,
    asInternalOptions,
    wrapFactoryForInternal
} from '../internal/core/internal-type-utils.logic';

// Import operations
import { 
    addInternalServiceRegistration,
    resolveInternalServiceFromRegistry,
    resolveInternalServiceFromScope,
    disposeInternalScopeResources,
    clearInternalRegistrySingletons,
    validateAllInternalDependencies,
    getAllInternalServiceTokens,
    doesInternalServiceExist
} from '../internal/operations/internal-registry-manager.utils';

/**
 * Unified Registry Service - simplified and maintainable
 * เขียน code น้อยลง แต่ยังคง type safety
 */
export class UnifiedRegistryService {
    constructor(private readonly registry: UnifiedRegistry) {}

    static create(): UnifiedRegistryService {
        const internalRegistry = createInternalRegistryInstance();
        return new UnifiedRegistryService(asUnifiedRegistry(internalRegistry));
    }

    register<T>(
        token: string,
        factory: (() => T) | ((scope: UnifiedScope) => T),
        options: UnifiedServiceOptions
    ): this {
        addInternalServiceRegistration(
            asInternalRegistry(this.registry),
            token,
            wrapFactoryForInternal(factory),
            asInternalOptions(options)
        );
        return this;
    }

    resolve<T>(token: string): T {
        return resolveInternalServiceFromRegistry<T>(asInternalRegistry(this.registry), token);
    }

    createScope(): UnifiedRegistryScope {
        const internalScope = createInternalScopeInstance(asInternalRegistry(this.registry));
        return new UnifiedRegistryScope(asUnifiedScope(internalScope));
    }

    hasService(token: string): boolean {
        return doesInternalServiceExist(asInternalRegistry(this.registry), token);
    }

    getServiceTokens(): string[] {
        return getAllInternalServiceTokens(asInternalRegistry(this.registry));
    }

    clearSingletons(): void {
        clearInternalRegistrySingletons(asInternalRegistry(this.registry));
    }

    validateDependencies(): string[] {
        return validateAllInternalDependencies(asInternalRegistry(this.registry));
    }

    getStatistics(): UnifiedRegistryStatistics {
        const internalRegistry = asInternalRegistry(this.registry);
        const tokens = getAllInternalServiceTokens(internalRegistry);
        
        const lifetimeStats = tokens.reduce((stats, token) => {
            const service = internalRegistry.services.get(token);
            if (service) {
                stats[service.options.lifetime] = (stats[service.options.lifetime] || 0) + 1;
            }
            return stats;
        }, {} as Record<string, number>);

        return {
            totalServices: tokens.length,
            singletonsCreated: internalRegistry.singletons.size,
            lifetimeDistribution: lifetimeStats,
            serviceTokens: tokens
        };
    }
}

/**
 * Unified Registry Scope - simplified and maintainable
 */
export class UnifiedRegistryScope {
    constructor(private readonly scope: UnifiedScope) {}

    resolve<T>(token: string): T {
        return resolveInternalServiceFromScope<T>(asInternalScope(this.scope), token);
    }

    dispose(): void {
        disposeInternalScopeResources(asInternalScope(this.scope));
    }

    get disposed(): boolean {
        return this.scope.disposed;
    }

    get resolving(): string[] {
        return Array.from(this.scope.resolving);
    }

    getStatistics(): UnifiedScopeStatistics {
        return {
            instancesCreated: this.scope.instances.size,
            currentlyResolving: Array.from(this.scope.resolving),
            disposed: this.scope.disposed,
            instanceTokens: Array.from(this.scope.instances.keys())
        };
    }
}

/**
 * Statistics interfaces
 */
export interface UnifiedRegistryStatistics {
    totalServices: number;
    singletonsCreated: number;
    lifetimeDistribution: Record<string, number>;
    serviceTokens: string[];
}

export interface UnifiedScopeStatistics {
    instancesCreated: number;
    currentlyResolving: string[];
    disposed: boolean;
    instanceTokens: string[];
}