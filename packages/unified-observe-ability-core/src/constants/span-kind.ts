export const UnifiedSpanKind = {
  INTERNAL: 'INTERNAL',
  SERVER: 'SERVER',
  CLIENT: 'CLIENT',
  PRODUCER: 'PRODUCER',
  CONSUMER: 'CONSUMER'
} as const;

export type UnifiedSpanKind = typeof UnifiedSpanKind[keyof typeof UnifiedSpanKind];