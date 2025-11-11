// adapters/unified-fastify-adapter.ts
import { FastifyRequest, FastifyReply, FastifyBaseLogger } from 'fastify';
import { UnifiedRequestContext, UnifiedResponseContext, UnifiedHttpContext, UnifiedRouteHandler } from '@inh-lib/unified-route';
import { UnifiedBaseTelemetryLogger } from '@inh-lib/unified-telemetry-core';
import { Readable } from 'node:stream';



// Extend FastifyRequest to include unifiedAppContext
declare module 'fastify' {
  interface FastifyRequest {
    unifiedAppContext?: UnifiedHttpContext;
  }
}

function isReadableStream(data: unknown): data is Readable {
  return data instanceof Readable;
}

function createUnifiedRequest<TBody = Record<string, unknown>>(
  req: FastifyRequest
): UnifiedRequestContext & { body: TBody } {
  return {
    body: (req.body as TBody) || ({} as TBody),
    params: req.params as Record<string, string>,
    query: req.query as Record<string, string | string[]>,
    headers: req.headers as Record<string, string>,
    method: req.method,
    url: req.url,
    route: req.routeOptions?.url || req.routerPath || '',
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  } as UnifiedRequestContext & { body: TBody };
}
function createUnifiedResponse(res: FastifyReply): UnifiedResponseContext {
  // ✅ Track sent state ด้วย closure
  let isSent = false;

  // ✅ Cache instance เพื่อ share state
  const unifiedResponse: UnifiedResponseContext = {
    get sent(): boolean {
      return isSent;
    },

    get statusCode(): number | undefined {
      return res.statusCode;
    },

    status: (code: number) => {
      res.status(code);
      return unifiedResponse; // ✅ return instance เดิม
    },

    json: <T>(data: T) => {
      isSent = true; // ✅ set ใน closure เดียวกัน
      res.send(data);
      // return unifiedResponse.send(data); // ใช้ send แทน
    },

    send: (data: unknown): void | FastifyReply => {
      if (isReadableStream(data)) {
        const result = res.send(data); // ส่งก่อน
        isSent = true; // ✅ set หลัง (ก่อน return)
        return result;
      }
      res.send(data);
      isSent = true;
    },

    header: (name: string, value: string) => {
      res.header(name, value);
      return unifiedResponse; // ✅ return instance เดิม
    },

    redirect: (url: string) => {
      res.redirect(url);
      isSent = true;
    }
  };

  return unifiedResponse;
}

export function createUnifiedContext<TBody = Record<string, unknown>>(
  req: FastifyRequest,
  res: FastifyReply
): UnifiedHttpContext & { request: UnifiedRequestContext & { body: TBody } } {
  return {
    request: createUnifiedRequest<TBody>(req),
    response: createUnifiedResponse(res),
    registry: {} // Initialize an empty registry
  };
}

export function createUnifiedFastifyHandler(
  handler: UnifiedRouteHandler
) {
  const fastifyHandler = async (req: FastifyRequest, reply: FastifyReply) => {
    if (!req.unifiedAppContext) {
      const context = createUnifiedContext(req, reply);
      req.unifiedAppContext = context;
    }

    return await handler(req.unifiedAppContext);
  };

  return fastifyHandler
}


export class FastifyTelemetryLoggerAdapter implements UnifiedBaseTelemetryLogger {
  constructor(private readonly fastifyLog: FastifyBaseLogger) { }
  createChildLogger(scope: string, attributes?: Record<string, unknown>): UnifiedBaseTelemetryLogger {
    const childLogger = this.fastifyLog.child({ scope, ...(attributes || {}) });
    return new FastifyTelemetryLoggerAdapter(childLogger);
  }

  debug(message: string, attributes?: Record<string, unknown>): void {
    this.fastifyLog.debug(attributes, message);
  }

  info(message: string, attributes?: Record<string, unknown>): void {
    this.fastifyLog.info(attributes, message);
  }

  warn(message: string, attributes?: Record<string, unknown>): void {
    this.fastifyLog.warn(attributes, message);
  }

  error(message: string, attributes?: Record<string, unknown>): void {
    this.fastifyLog.error(attributes, message);
  }
}
