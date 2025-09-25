/**
 * Simplified internal types - same shape as public types
 * ลดความซับซ้อนโดยใช้ types เดียวกัน แต่แยก namespace
 */

/**
 * Service lifetime - exact same as public
 */
export type InternalServiceLifetime = 'singleton' | 'transient' | 'scoped';

/**
 * Service options - exact same structure as public
 */
export interface InternalServiceOptions {
    lifetime: InternalServiceLifetime;
    disposable?: boolean;
}

/**
 * Service registration - simplified version
 */
export interface InternalServiceRegistration<T = unknown> {
    token: string;
    factory: (() => T) | ((scope: InternalScope) => T);
    options: InternalServiceOptions;
}

/**
 * Registry - simplified version
 */
export interface InternalRegistry {
    services: Map<string, InternalServiceRegistration<unknown>>;
    singletons: Map<string, unknown>;
}

/**
 * Scope - simplified version  
 */
export interface InternalScope {
    registry: InternalRegistry;
    instances: Map<string, unknown>;
    resolving: Set<string>;
    disposed: boolean;
}