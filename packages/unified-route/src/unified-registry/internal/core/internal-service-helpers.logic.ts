import type { InternalServiceOptions, InternalServiceLifetime, InternalScope } from '../types/internal-unified-registry.types';
import { INTERNAL_SERVICE_LIFETIME, INTERNAL_REGISTRY_CONFIG } from '../constants/internal-unified-registry.const';




/**
 * Internal service helper functions - Pure functions only
 * ใช้เฉพาะ internal types และ constants
 * ไฟล์นี้มี pure functions สำหรับช่วยในการทำงานกับ services
 * ทุก function ใน core/ ต้องเป็น pure functions (no side effects)
 */

/**
 * Create singleton service options
 * Pure function
 */
export const buildInternalSingletonOptions = (disposable = false): InternalServiceOptions => ({
    lifetime: INTERNAL_SERVICE_LIFETIME.SINGLETON,
    disposable
});

/**
 * Create transient service options  
 * Pure function
 */
export const buildInternalTransientOptions = (): InternalServiceOptions => ({
    lifetime: INTERNAL_SERVICE_LIFETIME.TRANSIENT
});

/**
 * Create scoped service options
 * Pure function
 */
export const buildInternalScopedOptions = (disposable = false): InternalServiceOptions => ({
    lifetime: INTERNAL_SERVICE_LIFETIME.SCOPED,
    disposable
});

/**
 * Validate service lifetime value
 * Pure function for type checking
 */
export const isValidInternalServiceLifetime = (lifetime: string): lifetime is InternalServiceLifetime => {
    const validLifetimes: InternalServiceLifetime[] = [
        INTERNAL_SERVICE_LIFETIME.SINGLETON,
        INTERNAL_SERVICE_LIFETIME.TRANSIENT,
        INTERNAL_SERVICE_LIFETIME.SCOPED
    ];
    return validLifetimes.includes(lifetime as InternalServiceLifetime);
};

/**
 * Validate complete service options
 * Pure function
 */
export const areValidInternalServiceOptions = (options: InternalServiceOptions): boolean => {
    return isValidInternalServiceLifetime(options.lifetime) && 
           typeof options.disposable === 'boolean';
};

/**
 * Create service token with namespace prefix
 * Pure function for token generation
 */
export const buildInternalServiceToken = (namespace: string, identifier: string): string => {
    return `${namespace}:${identifier}`;
};

/**
 * Parse service token to extract parts
 * Pure function returns null if invalid format
 */
export const parseInternalServiceTokenParts = (token: string): { namespace: string; identifier: string } | null => {
    const parts = token.split(':');
    if (parts.length === 2) {
        return { namespace: parts[0], identifier: parts[1] };
    }
    return null;
};

/**
 * Check if factory function expects scope parameter
 * Pure function for checking function signature
 */
export const doesInternalFactoryExpectScope = <T>(factory:  (() => T) | ((scope: InternalScope) => T)): boolean => {
    return factory.length > 0;
};

/**
 * Generate circular dependency error message
 * Pure function for error message creation
 */
export const buildInternalCircularDependencyMessage = (resolvingTokens: string[], currentToken: string): string => {
    const cycle = [...resolvingTokens, currentToken].join(' -> ');
    return `Circular dependency detected: ${cycle}`;
};

/**
 * Generate service not found error message
 * Pure function for error message creation
 */
export const buildInternalServiceNotFoundMessage = (token: string, availableTokens: string[]): string => {
    return `Service '${token}' not found. Available: ${availableTokens.join(', ')}`;
};

/**
 * Check if object has dispose method (type guard)
 * Pure function for type checking - no side effects
 */
export const hasInternalDisposeMethod = (obj: unknown): obj is { dispose: () => void } => {
    return obj !== null && 
           obj !== undefined && 
           typeof obj === 'object' && 
           'dispose' in obj && 
           typeof (obj as Record<string, unknown>)['dispose'] === 'function';
};

/**
 * Check if object is disposable service based on options
 * Pure function combining service options and object check
 */
export const isInternalDisposableService = (options: InternalServiceOptions, instance: unknown): boolean => {
    return options.disposable === true && hasInternalDisposeMethod(instance);
};

/**
 * Check if environment is development
 * Pure function for environment checking
 */
export const isInternalDevelopmentEnvironment = (): boolean => {

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return process.env.NODE_ENV === INTERNAL_REGISTRY_CONFIG.DEVELOPMENT_ENV;
};

/**
 * Generate debug log message with prefix
 * Pure function for log message creation
 */
export const buildInternalDebugMessage = (message: string): string => {
    return `${INTERNAL_REGISTRY_CONFIG.DEBUG_LOG_PREFIX} ${message}`;
};