/**
 * ✅ Internal utility functions exports
 * 
 * ⚠️ IMPORTANT: These utilities are for INTERNAL use only
 * They are NOT exported in the main index.ts file
 * 
 * These functions are used internally by middleware implementations
 * but not exposed as public API to package consumers
 */

// HTTP context utilities
export * from './http-context.utils';

// Trace extraction utilities
export * from './trace-extraction.utils';

// Note: These functions replace private methods in middleware classes
// and help maintain clean public APIs while providing reusable functionality