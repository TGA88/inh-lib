// adapters/unified-fastify-adapter.ts
import { FastifyRequest, FastifyReply, FastifyBaseLogger } from 'fastify';
import { UnifiedRequestContext, UnifiedResponseContext, UnifiedHttpContext, UnifiedRouteHandler } from '@inh-lib/unified-route';
import { UnifiedBaseTelemetryLogger } from '@inh-lib/unified-telemetry-core';

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
  return {
    status: (code: number) => {
      res.status(code);
      return createUnifiedResponse(res);
    },
    json: <T>(data: T) => {
      res.send(data);
    },
    send: (data: string) => {
      res.send(data);
    },
    header: (name: string, value: string) => {
      res.header(name, value);
      return createUnifiedResponse(res);
    },
    redirect: (url: string) => {
      res.redirect(url);
    },
  };
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
    if (!req.businessLogicContext) {
      const context = createUnifiedContext(req, reply);
      req.businessLogicContext = context;
    }

    await handler(req.businessLogicContext);
  };

  return fastifyHandler
}

 
export class FastifyTelemetryLoggerAdapter implements UnifiedBaseTelemetryLogger {
  constructor(private readonly fastifyLog: FastifyBaseLogger) {}

  debug(message: string, attributes?: Record<string, unknown>): void {
    this.fastifyLog.debug(attributes, message);
  }

  info(message: string, attributes?: Record<string, unknown>): void {
    this.fastifyLog.info(attributes,message);
  }

  warn(message: string, attributes?: Record<string, unknown>): void {
    this.fastifyLog.warn(attributes,message );
  }

  error(message: string, attributes?: Record<string, unknown>): void {
    this.fastifyLog.error(attributes,message);
  }
}
