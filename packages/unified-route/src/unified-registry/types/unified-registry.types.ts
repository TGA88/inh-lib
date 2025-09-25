/**
 * Public types - same structure as internal for simplicity
 * ใช้ structure เดียวกันกับ internal เพื่อลดความซับซ้อน
 */

/**
 * Public service lifetime type - same as internal
 */
export type UnifiedServiceLifetime = 'singleton' | 'transient' | 'scoped';

/**
 * Public service options - same structure as internal
 */
export interface UnifiedServiceOptions {
    lifetime: UnifiedServiceLifetime;
    disposable?: boolean;
}

/**
 * Public service registration - same structure as internal
 */
export interface UnifiedServiceRegistration<T = unknown> {
    token: string;
    factory: (() => T) | ((scope: UnifiedScope) => T);
    options: UnifiedServiceOptions;
}

/**
 * Public registry - same structure as internal
 */
export interface UnifiedRegistry {
    services: Map<string, UnifiedServiceRegistration<unknown>>;
    singletons: Map<string, unknown>;
}

/**
 * Public scope - same structure as internal
 */
export interface UnifiedScope {
    registry: UnifiedRegistry;
    instances: Map<string, unknown>;
    resolving: Set<string>;
    disposed: boolean;
}