export const UnifiedSpanStatusCode = {
  UNSET: 'UNSET',
  OK: 'OK',
  ERROR: 'ERROR'
} as const;

export type UnifiedSpanStatusCode = typeof UnifiedSpanStatusCode[keyof typeof UnifiedSpanStatusCode];

export const UnifiedHttpStatusCodeRange = {
  SUCCESS: '2xx',
  CLIENT_ERROR: '4xx',
  SERVER_ERROR: '5xx'
} as const;

export type UnifiedHttpStatusCodeRange = typeof UnifiedHttpStatusCodeRange[keyof typeof UnifiedHttpStatusCodeRange];

// Helper functions
export function getSpanStatusFromHttpCode(statusCode: number): UnifiedSpanStatusCode {
  if (statusCode >= 400) {
    return UnifiedSpanStatusCode.ERROR;
  }
  return UnifiedSpanStatusCode.OK;
}

export function getHttpStatusRange(statusCode: number): UnifiedHttpStatusCodeRange | undefined {
  if (statusCode >= 200 && statusCode < 300) {
    return UnifiedHttpStatusCodeRange.SUCCESS;
  }
  if (statusCode >= 400 && statusCode < 500) {
    return UnifiedHttpStatusCodeRange.CLIENT_ERROR;
  }
  if (statusCode >= 500 && statusCode < 600) {
    return UnifiedHttpStatusCodeRange.SERVER_ERROR;
  }
  return undefined;
}