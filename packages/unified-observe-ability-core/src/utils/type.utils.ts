export type UnifiedPrimitive = string | number | boolean;
export type UnifiedLabelValue = string;
export type UnifiedAttributeValue = string | number | boolean;

export interface UnifiedKeyValuePair<T = string> {
  readonly key: string;
  readonly value: T;
}

export type ReadonlyRecord<K extends string | number | symbol, V> = Readonly<Record<K, V>>;

export function isUnifiedPrimitive(value: unknown): value is UnifiedPrimitive {
  const type = typeof value;
  return type === 'string' || type === 'number' || type === 'boolean';
}

export function isValidUnifiedLabelValue(value: unknown): value is UnifiedLabelValue {
  return typeof value === 'string' && value.length > 0;
}

export function isValidUnifiedAttributeValue(value: unknown): value is UnifiedAttributeValue {
  return isUnifiedPrimitive(value);
}

export function ensureStringMap(input: Record<string, unknown>): Record<string, string> {
  const result: Record<string, string> = {};
  
  for (const [key, value] of Object.entries(input)) {
    if (typeof value === 'string') {
      result[key] = value;
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      result[key] = String(value);
    } else {
      result[key] = 'unknown';
    }
  }
  
  return result;
}