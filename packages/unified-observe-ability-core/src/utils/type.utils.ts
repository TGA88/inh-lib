export type Primitive = string | number | boolean;
export type LabelValue = string;
export type AttributeValue = string | number | boolean;

export interface KeyValuePair<T = string> {
  readonly key: string;
  readonly value: T;
}

export type ReadonlyRecord<K extends string | number | symbol, V> = Readonly<Record<K, V>>;

export function isPrimitive(value: unknown): value is Primitive {
  const type = typeof value;
  return type === 'string' || type === 'number' || type === 'boolean';
}

export function isValidLabelValue(value: unknown): value is LabelValue {
  return typeof value === 'string' && value.length > 0;
}

export function isValidAttributeValue(value: unknown): value is AttributeValue {
  return isPrimitive(value);
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