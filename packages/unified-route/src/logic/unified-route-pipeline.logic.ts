// ========================================
// Route Pipeline
// ========================================

import { UnifiedHandlerFn, UnifiedHttpContext, UnifiedPreHandlerFn } from "../types/unified-context";
import { getRegistryItem } from "./unified-context.logic";

export class UnifiedRoutePipeline {
  private readonly preHandlers: UnifiedPreHandlerFn[] = [];
  private handler: UnifiedHandlerFn | null = null;

  addPreHandler(preHandler: UnifiedPreHandlerFn): this {
    this.preHandlers.push(preHandler);
    return this;
  }

  addPreHandlers(preHandlers: UnifiedPreHandlerFn[]): this {
    this.preHandlers.push(...preHandlers);
    return this;
  }

  setHandler(handler: UnifiedHandlerFn): this {
    this.handler = handler;
    return this;
  }

  async execute(ctx: UnifiedHttpContext): Promise<void> {
    
    // expect logger is UnifiedTelemetryLogger at runtime but fallback to console when not found in registry
    // force type to Console because we can't import UnifiedTelemetryLogger here (It will cause circular dependency)
    let logger = getRegistryItem<Console>(ctx, 'telemetry:logger'); 
    if (logger instanceof Error) {
      logger = console;
    }
    try {
      // 1. Execute ทุก preHandler ตามลำดับ
      for (const preHandler of this.preHandlers) {
        // ตรวจสอบว่า response ถูกส่งแล้วหรือยัง
        if (ctx.response.sent) {
          logger.info('Response sent in preHandler, stopping pipeline');
          return;
        }

        await preHandler(ctx);
      }

      // 2. Execute handler หลักถ้ายังไม่ได้ส่ง response
      if (!ctx.response.sent && this.handler) {
        await this.handler(ctx);
      }

      // 3. ถ้ายังไม่ได้ส่ง response เลย ส่ง 404
      if (!ctx.response.sent) {
        
        ctx.response.status(404).json({ 
          error: 'Not Found',
          path: ctx.request.url 
        });
      }

    } catch (error) {
      // Handle errors
      if (!ctx.response.sent) {
        logger.error('Pipeline error:', error);
        ctx.response.status(500).json({
          error: 'Internal Server Error',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  }
}