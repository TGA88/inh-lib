import type { InternalRegistry, InternalScope } from '../types/internal-unified-registry.types';

/**
 * Internal core factory functions - Pure functions only
 * ใช้เฉพาะ internal types และ constants
 * ไฟล์นี้มี pure functions สำหรับสร้าง registry และ scope instances
 * ไม่มี side effects, stateless, predictable
 */

/**
 * Create a new empty registry instance
 * Pure function - no side effects, same input = same output
 */
export const createInternalRegistryInstance = (): InternalRegistry => ({
    services: new Map(),
    singletons: new Map(),
});

/**
 * Create a new scope instance linked to a registry  
 * Pure function - no side effects, same input = same output
 */
export const createInternalScopeInstance = (registry: InternalRegistry): InternalScope => ({
    registry,
    instances: new Map(),
    resolving: new Set(),
    disposed: false,
});