export const SpanStatusCode = {
  UNSET: 'UNSET',
  OK: 'OK',
  ERROR: 'ERROR'
} as const;

export type SpanStatusCode = typeof SpanStatusCode[keyof typeof SpanStatusCode];

export const HttpStatusCodeRange = {
  SUCCESS: '2xx',
  CLIENT_ERROR: '4xx',
  SERVER_ERROR: '5xx'
} as const;

export type HttpStatusCodeRange = typeof HttpStatusCodeRange[keyof typeof HttpStatusCodeRange];

// Helper functions
export function getSpanStatusFromHttpCode(statusCode: number): SpanStatusCode {
  if (statusCode >= 400) {
    return SpanStatusCode.ERROR;
  }
  return SpanStatusCode.OK;
}

export function getHttpStatusRange(statusCode: number): HttpStatusCodeRange | undefined {
  if (statusCode >= 200 && statusCode < 300) {
    return HttpStatusCodeRange.SUCCESS;
  }
  if (statusCode >= 400 && statusCode < 500) {
    return HttpStatusCodeRange.CLIENT_ERROR;
  }
  if (statusCode >= 500 && statusCode < 600) {
    return HttpStatusCodeRange.SERVER_ERROR;
  }
  return undefined;
}