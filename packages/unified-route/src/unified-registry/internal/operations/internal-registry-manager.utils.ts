import type { 
    InternalRegistry, 
    InternalScope, 
    InternalServiceOptions,
    InternalServiceRegistration 
} from '../types/internal-unified-registry.types';

import {
    INTERNAL_SERVICE_LIFETIME,
    INTERNAL_REGISTRY_CONFIG,
    INTERNAL_ERROR_MESSAGES
} from '../constants/internal-unified-registry.const';

// Import pure functions from internal core
import { createInternalScopeInstance } from '../core/internal-registry-factory.logic';
import { 
    buildInternalCircularDependencyMessage,
    buildInternalServiceNotFoundMessage,
    doesInternalFactoryExpectScope,
    isInternalDisposableService,
    isInternalDevelopmentEnvironment,
    buildInternalDebugMessage
} from '../core/internal-service-helpers.logic';

/**
 * Internal registry operation utilities
 * ใช้เฉพาะ internal types และ constants
 * ไฟล์นี้มี complex operations ที่อาจมี side effects
 * ใช้เป็น "private functions" ของ service classes
 */

/**
 * Add service registration to internal registry
 * Has side effect: mutates registry state
 */
export const addInternalServiceRegistration = <T>(
    registry: InternalRegistry,
    token: string,
    factory: (() => T) | ((scope: InternalScope) => T),
    options: InternalServiceOptions
): void => {
    // Side effect: registry state mutation
    registry.services.set(token, { token, factory, options } as InternalServiceRegistration<T>);
    
    // Side effect: debug logging (development only)
    if (isInternalDevelopmentEnvironment()) {
        console.debug(buildInternalDebugMessage(`Service '${token}' registered with lifetime '${options.lifetime}'`));
    }
};

/**
 * Retrieve service registration from internal registry
 * Read-only operation, no side effects
 */
export const getInternalServiceRegistration = <T>(
    registry: InternalRegistry, 
    token: string
): InternalServiceRegistration<T> | undefined => {
    return registry.services.get(token) as InternalServiceRegistration<T> | undefined;
};

/**
 * Check if service exists in internal registry
 * Read-only operation, no side effects
 */
export const doesInternalServiceExist = (registry: InternalRegistry, token: string): boolean => {
    return registry.services.has(token);
};

/**
 * Get all service tokens from internal registry
 * Read-only operation, no side effects
 */
export const getAllInternalServiceTokens = (registry: InternalRegistry): string[] => {
    return Array.from(registry.services.keys());
};

/**
 * Resolve service from internal registry (singleton/transient only)
 * Complex operation with error handling and possible side effects
 */
export const resolveInternalServiceFromRegistry = <T>(registry: InternalRegistry, token: string): T => {
    const service = getInternalServiceRegistration<T>(registry, token);
    
    if (!service) {
        const availableTokens = getAllInternalServiceTokens(registry);
        const errorMessage = buildInternalServiceNotFoundMessage(token, availableTokens);
        
        // Side effect: error logging
        console.error(buildInternalDebugMessage(errorMessage));
        throw new Error(errorMessage);
    }

    if (service.options.lifetime === INTERNAL_SERVICE_LIFETIME.SCOPED) {
        const error = new Error(INTERNAL_ERROR_MESSAGES.SCOPED_SERVICE_DIRECT_RESOLVE);
        console.error(buildInternalDebugMessage(error.message));
        throw error;
    }

    // Side effect: debug logging
    if (isInternalDevelopmentEnvironment()) {
        console.debug(buildInternalDebugMessage(`Resolving '${token}' with lifetime '${service.options.lifetime}'`));
    }

    return executeInternalLifetimeResolution<T>(registry, service);
};

/**
 * Resolve service from internal scope with circular dependency detection
 * Complex operation with state mutation and side effects
 */
export const resolveInternalServiceFromScope = <T>(scope: InternalScope, token: string): T => {
    // Validation with error logging
    if (scope.disposed) {
        const error = new Error(INTERNAL_ERROR_MESSAGES.DISPOSED_SCOPE);
        console.error(buildInternalDebugMessage(error.message));
        throw error;
    }

    // Circular dependency detection
    if (scope.resolving.has(token)) {
        const resolvingTokens = Array.from(scope.resolving);
        const errorMessage = buildInternalCircularDependencyMessage(resolvingTokens, token);
        console.error(buildInternalDebugMessage(errorMessage));
        throw new Error(errorMessage);
    }

    const service = getInternalServiceRegistration<T>(scope.registry, token);
    if (!service) {
        const error = new Error(`${INTERNAL_ERROR_MESSAGES.SERVICE_NOT_FOUND}: '${token}'`);
        console.error(buildInternalDebugMessage(error.message));
        throw error;
    }

    // Side effect: state mutation for tracking resolution chain
    scope.resolving.add(token);
    
    // Side effect: debug logging
    if (isInternalDevelopmentEnvironment()) {
        const resolutionChain = Array.from(scope.resolving).join(' -> ');
        console.debug(buildInternalDebugMessage(`Resolving scoped '${token}' (chain: ${resolutionChain})`));
    }
    
    try {
        return executeInternalLifetimeResolutionWithScope<T>(scope, service);
    } finally {
        // Side effect: cleanup resolution tracking
        scope.resolving.delete(token);
    }
};

/**
 * Dispose all instances in internal scope
 * Has side effects: calls dispose methods, clears collections
 */
export const disposeInternalScopeResources = (scope: InternalScope): void => {
    if (scope.disposed) return;

    let disposedCount = 0;
    let errorCount = 0;

    // Side effects: calling dispose methods on disposable instances
    for (const [token, instance] of scope.instances) {
        const service = getInternalServiceRegistration<unknown>(scope.registry, token);
        
        if (service && isInternalDisposableService(service.options, instance)) {
            try {
                (instance as { dispose: () => void }).dispose();
                disposedCount++;
                
                // Side effect: debug logging
                if (isInternalDevelopmentEnvironment()) {
                    console.debug(buildInternalDebugMessage(`Disposed scoped instance '${token}'`));
                }
            } catch (error) {
                errorCount++;
                // Side effect: error logging
                console.error(buildInternalDebugMessage(`Error disposing scoped instance '${token}':`), error);
            }
        }
    }

    // Side effects: clearing collections and updating state
    scope.instances.clear();
    scope.resolving.clear();
    scope.disposed = true;

    // Side effect: summary logging
    if (isInternalDevelopmentEnvironment() && (disposedCount > 0 || errorCount > 0)) {
        console.debug(buildInternalDebugMessage(`Scope disposed: ${disposedCount} instances disposed, ${errorCount} errors`));
    }
};

/**
 * Clear all singleton instances in internal registry
 * Has side effects: calls dispose methods, clears singletons map
 */
export const clearInternalRegistrySingletons = (registry: InternalRegistry): void => {
    let disposedCount = 0;
    let errorCount = 0;

    // Side effects: calling dispose methods on disposable singletons
    for (const [token, instance] of registry.singletons) {
        const service = getInternalServiceRegistration<unknown>(registry, token);
        
        if (service && isInternalDisposableService(service.options, instance)) {
            try {
                (instance as { dispose: () => void }).dispose();
                disposedCount++;
                
                // Side effect: debug logging
                if (isInternalDevelopmentEnvironment()) {
                    console.debug(buildInternalDebugMessage(`Disposed singleton '${token}'`));
                }
            } catch (error) {
                errorCount++;
                // Side effect: error logging
                console.error(buildInternalDebugMessage(`Error disposing singleton '${token}':`), error);
            }
        }
    }

    // Side effect: clearing singletons map
    registry.singletons.clear();

    // Side effect: summary logging
    if (isInternalDevelopmentEnvironment() && (disposedCount > 0 || errorCount > 0)) {
        console.debug(buildInternalDebugMessage(`Singletons cleared: ${disposedCount} disposed, ${errorCount} errors`));
    }
};

/**
 * Validate all internal registry dependencies
 * Complex operation with side effects (testing resolution)
 */
export const validateAllInternalDependencies = (registry: InternalRegistry): string[] => {
    const errors: string[] = [];
    const testScope = createInternalScopeInstance(registry);
    const serviceTokens = getAllInternalServiceTokens(registry);
    
    // Side effect: logging validation start
    if (isInternalDevelopmentEnvironment()) {
        console.debug(buildInternalDebugMessage(`${INTERNAL_ERROR_MESSAGES.REGISTRY_VALIDATION_START} ${serviceTokens.length} services...`));
    }
    
    try {
        for (const token of serviceTokens) {
            try {
                const service = getInternalServiceRegistration<unknown>(registry, token);
                if (service?.options.lifetime === INTERNAL_SERVICE_LIFETIME.SCOPED) {
                    resolveInternalServiceFromScope<unknown>(testScope, token);
                } else {
                    resolveInternalServiceFromRegistry<unknown>(registry, token);
                }
            } catch (error) {
                const errorMessage = `${token}: ${(error as Error).message}`;
                errors.push(errorMessage);
                
                // Side effect: error logging
                console.error(buildInternalDebugMessage(`Validation failed for '${token}':`), error);
            }
        }
    } finally {
        // Side effect: cleanup test scope
        disposeInternalScopeResources(testScope);
    }
    
    // Side effect: summary logging
    if (isInternalDevelopmentEnvironment()) {
        if (errors.length === 0) {
            console.debug(buildInternalDebugMessage(`✅ ${INTERNAL_ERROR_MESSAGES.REGISTRY_VALIDATION_SUCCESS}`));
        } else {
            console.error(buildInternalDebugMessage(`❌ ${INTERNAL_ERROR_MESSAGES.REGISTRY_VALIDATION_FAILED}: ${errors.length} errors found`));
        }
    }
    
    return errors;
};

/**
 * Private helper functions for internal lifetime resolution
 * These have side effects (instance creation, caching)
 */

function executeInternalLifetimeResolution<T>(
    registry: InternalRegistry, 
    service: InternalServiceRegistration<T>
): T {
    switch (service.options.lifetime) {
        case INTERNAL_SERVICE_LIFETIME.SINGLETON:
            return resolveInternalSingletonInstance<T>(registry, service);
        case INTERNAL_SERVICE_LIFETIME.TRANSIENT:
            return resolveInternalTransientInstance<T>(service);
        default:
            return resolveInternalTransientInstance<T>(service);
    }
}

function executeInternalLifetimeResolutionWithScope<T>(
    scope: InternalScope, 
    service: InternalServiceRegistration<T>
): T {
    switch (service.options.lifetime) {
        case INTERNAL_SERVICE_LIFETIME.SINGLETON:
            return resolveInternalSingletonInstance<T>(scope.registry, service, scope);
        case INTERNAL_SERVICE_LIFETIME.TRANSIENT:
            return resolveInternalTransientInstance<T>(service, scope);
        case INTERNAL_SERVICE_LIFETIME.SCOPED:
            return resolveInternalScopedInstance<T>(scope, service);
        default:
            return resolveInternalTransientInstance<T>(service, scope);
    }
}

function resolveInternalSingletonInstance<T>(
    registry: InternalRegistry, 
    service: InternalServiceRegistration<T>, 
    scope?: InternalScope
): T {
    // Side effect: caching in singletons map
    if (!registry.singletons.has(service.token)) {
        const instance = createInternalInstanceFromFactory<T>(service, scope);
        registry.singletons.set(service.token, instance);
        
        // Side effect: debug logging
        if (isInternalDevelopmentEnvironment()) {
            console.debug(buildInternalDebugMessage(`Created singleton instance for '${service.token}'`));
        }
    }
    
    return registry.singletons.get(service.token) as T;
}

function resolveInternalTransientInstance<T>(
    service: InternalServiceRegistration<T>, 
    scope?: InternalScope
): T {
    const instance = createInternalInstanceFromFactory<T>(service, scope);
    
    // Side effect: debug logging
    if (isInternalDevelopmentEnvironment()) {
        console.debug(buildInternalDebugMessage(`Created transient instance for '${service.token}'`));
    }
    
    return instance;
}

function resolveInternalScopedInstance<T>(
    scope: InternalScope, 
    service: InternalServiceRegistration<T>
): T {
    // Side effect: caching in scope instances map
    if (!scope.instances.has(service.token)) {
        const instance = createInternalInstanceFromFactory<T>(service, scope);
        scope.instances.set(service.token, instance);
        
        // Side effect: debug logging
        if (isInternalDevelopmentEnvironment()) {
            console.debug(buildInternalDebugMessage(`Created scoped instance for '${service.token}'`));
        }
    }
    
    return scope.instances.get(service.token) as T;
}

function createInternalInstanceFromFactory<T>(
    service: InternalServiceRegistration<T>, 
    scope?: InternalScope
): T {
    const { factory } = service;
    
    // Use pure function to check factory signature
    if (doesInternalFactoryExpectScope(factory) && scope) {
        return (factory as (scope: InternalScope) => T)(scope);
    }
    
    return (factory as () => T)();
}