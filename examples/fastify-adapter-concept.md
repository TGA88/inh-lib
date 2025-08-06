/**
 * ตัวอย่างแนวคิดของ unified-fastify-adapter
 * นี่เป็นเพียงตัวอย่างเพื่อแสดงแนวคิด ไม่ใช่ implementation จริง
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import type { UnifiedHttpContext, UnifiedMiddleware, UnifiedRouteHandler } from '@inh-lib/unified-route';
import type { TelemetryMiddlewareService } from '@inh-lib/unified-telemetry-middleware';

export interface UnifiedFastifyAdapterConfig {
  telemetryService?: TelemetryMiddlewareService;
  enableAutoTelemetry?: boolean;
}

export class UnifiedFastifyAdapter {
  constructor(private config: UnifiedFastifyAdapterConfig = {}) {}

  /**
   * แปลง FastifyRequest/Reply เป็น UnifiedHttpContext
   */
  private createUnifiedContext(
    request: FastifyRequest, 
    reply: FastifyReply
  ): UnifiedHttpContext {
    return {
      request: {
        method: request.method as any,
        url: request.url,
        headers: request.headers as Record<string, string>,
        params: request.params as Record<string, string>,
        query: request.query as Record<string, any>,
        body: request.body,
        raw: request.raw,
      },
      response: {
        setHeader: (name: string, value: string) => reply.header(name, value),
        setStatus: (code: number) => reply.code(code),
        send: (data: any) => reply.send(data),
        raw: reply.raw,
      },
      metadata: {
        requestId: request.id,
        startTime: Date.now(),
        // เก็บ reference ของ Fastify objects
        _fastify: {
          request,
          reply,
        },
      },
    };
  }

  /**
   * แปลง UnifiedMiddleware ให้ทำงานกับ Fastify
   */
  convertMiddleware(middleware: UnifiedMiddleware) {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      const context = this.createUnifiedContext(request, reply);
      
      let nextCalled = false;
      const next = async () => {
        nextCalled = true;
      };

      try {
        await middleware(context, next);
        
        // ถ้า middleware ไม่เรียก next() แสดงว่าต้องการจบการประมวลผล
        if (!nextCalled) {
          // ไม่ต้องทำอะไรเพิ่ม Fastify จะจัดการเอง
        }
      } catch (error) {
        // ส่ง error ไปให้ Fastify จัดการ
        throw error;
      }
    };
  }

  /**
   * แปลง UnifiedRouteHandler ให้ทำงานกับ Fastify
   */
  convertHandler(handler: UnifiedRouteHandler) {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      const context = this.createUnifiedContext(request, reply);
      
      try {
        const result = await handler(context);
        
        // ถ้า handler return ข้อมูล ให้ส่งกลับผ่าน Fastify
        if (result !== undefined) {
          return result;
        }
      } catch (error) {
        throw error;
      }
    };
  }

  /**
   * สร้าง Fastify plugin ที่มี telemetry built-in
   */
  createTelemetryPlugin() {
    return async (fastify: any) => {
      if (!this.config.telemetryService) {
        throw new Error('TelemetryService is required for telemetry plugin');
      }

      // เพิ่ม telemetry middleware แบบ global
      fastify.addHook('onRequest', 
        this.convertMiddleware(
          this.config.telemetryService.createMiddleware()
        )
      );

      // เพิ่ม helper methods ใน Fastify context
      fastify.decorateRequest('getTelemetryLogger', function() {
        const context = this._unifiedContext;
        return context ? this.config.telemetryService.getCurrentLogger(context) : null;
      });

      fastify.decorateRequest('createChildSpan', function(operationName: string, options?: any) {
        const context = this._unifiedContext;
        return context ? this.config.telemetryService.createChildSpan(context, operationName, options) : null;
      });
    };
  }
}

export function createUnifiedFastifyAdapter(config?: UnifiedFastifyAdapterConfig): UnifiedFastifyAdapter {
  return new UnifiedFastifyAdapter(config);
}

// ตัวอย่างการใช้งาน
export const exampleUsage = `
import Fastify from 'fastify';
import { createUnifiedFastifyAdapter } from '@inh-lib/unified-fastify-adapter';
import { TelemetryMiddlewareService } from '@inh-lib/unified-telemetry-middleware';

const fastify = Fastify();
const telemetryService = new TelemetryMiddlewareService(provider, config);
const adapter = createUnifiedFastifyAdapter({ telemetryService });

// วิธีที่ 1: ใช้ middleware และ handler แยกกัน
fastify.addHook('onRequest', adapter.convertMiddleware(
  telemetryService.createMiddleware()
));

fastify.get('/users', adapter.convertHandler(async (context) => {
  const logger = telemetryService.getCurrentLogger(context);
  logger.info('Getting users');
  return { users: [] };
}));

// วิธีที่ 2: ใช้ telemetry plugin (แนะนำ)
await fastify.register(adapter.createTelemetryPlugin());

fastify.get('/users', async (request, reply) => {
  // ใช้ telemetry ผ่าน Fastify decorators
  const logger = request.getTelemetryLogger();
  logger.info('Getting users');
  
  const { span, logger: childLogger, finish } = request.createChildSpan('fetch-users');
  try {
    // business logic
    const users = await fetchUsers();
    return { users };
  } finally {
    finish();
  }
});
`;
