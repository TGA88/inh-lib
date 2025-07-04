import { UnifiedMiddleware } from "../../type/unified/unified-middleware";
import { Logger } from "./logger.type";

// foundations/middleware/error-handling.ts
export const createErrorMiddleware = (logger: Logger): UnifiedMiddleware => {
  return async (context, next) => {
    try {
      await next();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Internal server error';
      
      logger.error('Request error', {
        url: context.request.url,
        method: context.request.method,
        error: message,
        stack: error instanceof Error ? error.stack : undefined
      });
      
      context.response.status(500);
      context.response.json({ 
        error: 'Internal server error',
        path: context.request.url 
      });
    }
  };
};