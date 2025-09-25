import type { UnifiedServiceOptions } from '../types/unified-registry.types';
import {
    INTERNAL_SERVICE_LIFETIME,
    INTERNAL_SERVICE_OPTIONS,
    INTERNAL_REGISTRY_CONFIG,
    INTERNAL_ERROR_MESSAGES
} from '../internal/constants/internal-unified-registry.const';

/**
 * Public constants for consumers - assigned from internal constants
 * ตาม rules: public constants ต้อง extends หรือ assign จาก internal constants
 * ห้ามมี helper functions ใน .const.ts file ตาม rules
 */

/**
 * Service lifetime constants - assigned from internal
 * ไม่ใช้ enum ตาม rules
 */
export const UNIFIED_SERVICE_LIFETIME = INTERNAL_SERVICE_LIFETIME;

/**
 * Pre-configured service options - assigned from internal with proper typing
 * ไม่มี helper functions - เป็นแค่ constant values
 */
export const SERVICE_OPTIONS: Record<string, UnifiedServiceOptions> = INTERNAL_SERVICE_OPTIONS;

/**
 * Registry configuration constants - assigned from internal
 */
export const REGISTRY_CONFIG = INTERNAL_REGISTRY_CONFIG;

/**
 * Error messages templates - assigned from internal
 * Constants only - ไม่มี functions
 */
export const ERROR_MESSAGES = INTERNAL_ERROR_MESSAGES;