// tests/helpers/mock-context.ts
import { 
  UnifiedHttpContext, 
  UnifiedRequestContext, 
  UnifiedResponseContext 
} from '../../types/unified-context';

interface MockResponseState {
  statusCode: number;
  headers: Record<string, string>;
  body: unknown;
  isSent: boolean;
  redirectUrl?: string;
}

export function createMockRequest(
  overrides: Partial<UnifiedRequestContext> = {}
): UnifiedRequestContext {
  return {
    body: {},
    params: {},
    query: {},
    headers: {},
    method: 'GET',
    url: '/test',
    route: '/test',
    ip: '127.0.0.1',
    userAgent: 'test-agent',
    ...overrides
  };
}

export function createMockResponse(): {
  response: UnifiedResponseContext;
  state: MockResponseState;
} {
  const state: MockResponseState = {
    statusCode: 200,
    headers: {},
    body: null,
    isSent: false
  };

  const response: UnifiedResponseContext = {
    get sent(): boolean {
      return state.isSent;
    },

    status: (code: number) => {
      state.statusCode = code;
      return response;
    },

    json: <T>(data: T) => {
      state.body = data;
      state.isSent = true;
    },

    send: (data: unknown) => {
      state.body = data;
      state.isSent = true;
      return data;
    },

    header: (name: string, value: string) => {
      state.headers[name] = value;
      return response;
    },

    redirect: (url: string) => {
      state.redirectUrl = url;
      state.isSent = true;
    }
  };

  return { response, state };
}

export function createMockContext(
  requestOverrides: Partial<UnifiedRequestContext> = {}
): {
  ctx: UnifiedHttpContext;
  state: MockResponseState;
} {
  const { response, state } = createMockResponse();
  
  return {
    ctx: {
      request: createMockRequest(requestOverrides),
      response,
      registry: {}
    },
    state
  };
}