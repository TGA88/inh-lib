// adapters/unified-fastify-adapter.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { UnifiedRequestContext, UnifiedResponseContext, UnifiedHttpContext } from '@inh-lib/common';

export function adaptFastifyRequest<TBody = Record<string, unknown>>(
  req: FastifyRequest
): UnifiedRequestContext & { body: TBody } {
  return {
    body: (req.body as TBody) || ({} as TBody),
    params: req.params as Record<string, string>,
    query: req.query as Record<string, string | string[]>,
    headers: req.headers as Record<string, string>,
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  } as UnifiedRequestContext & { body: TBody };
}

export function adaptFastifyResponse(res: FastifyReply): UnifiedResponseContext {
  return {
    status: (code: number) => {
      res.status(code);
      return adaptFastifyResponse(res);
    },
    json: <T>(data: T) => {
      res.send(data);
    },
    send: (data: string) => {
      res.send(data);
    },
    header: (name: string, value: string) => {
      res.header(name, value);
      return adaptFastifyResponse(res);
    },
    redirect: (url: string) => {
      res.redirect(url);
    },
  };
}

export function createFastifyContext<TBody = Record<string, unknown>>(
  req: FastifyRequest,
  res: FastifyReply
): UnifiedHttpContext & { request: UnifiedRequestContext & { body: TBody } } {
  return {
    request: adaptFastifyRequest<TBody>(req),
    response: adaptFastifyResponse(res),
  };
}
