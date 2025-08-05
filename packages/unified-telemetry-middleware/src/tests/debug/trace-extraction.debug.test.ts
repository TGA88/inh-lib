/**
 * Debug test for trace extraction
 */

import { extractTraceContextFromHeaders } from '../../internal/logic/trace-extractor.logic';
import type { UnifiedHttpContext } from '@inh-lib/unified-route';

// Mock context factory
const createMockContext = (overrides: Partial<UnifiedHttpContext> = {}): UnifiedHttpContext => ({
  request: {
    body: {},
    params: {},
    query: {},
    headers: {},
    method: 'GET',
    url: '/test',
    ip: '127.0.0.1',
    userAgent: 'test-agent',
    ...overrides.request,
  },
  response: {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
    send: jest.fn(),
    header: jest.fn().mockReturnThis(),
    redirect: jest.fn(),
    ...overrides.response,
  },
  registry: {},
  ...overrides,
});

describe('Debug trace extraction', () => {
  it('should extract W3C trace context', () => {
    const context = createMockContext({
      request: {
        body: {},
        params: {},
        query: {},
        method: 'GET',
        url: '/test',
        ip: '127.0.0.1',
        userAgent: 'test-agent',
        headers: {
          'traceparent': '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01',
          'tracestate': 'rojo=00f067aa0ba902b7',
        },
      },
    });

    console.log('Context headers:', context.request.headers);
    
    const traceContext = extractTraceContextFromHeaders(context);
    
    console.log('Extracted trace context:', traceContext);
    
    expect(traceContext.traceId).toBe('4bf92f3577b34da6a3ce929d0e0e4736');
    expect(traceContext.format).toBe('w3c');
  });
});
