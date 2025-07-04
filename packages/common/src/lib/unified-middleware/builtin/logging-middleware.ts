import { UnifiedMiddleware } from "../../type/unified/unified-middleware";
import { Logger } from "./logger.type";



export const createLoggingMiddleware = (logger: Logger): UnifiedMiddleware => {
  return async (context, next) => {
    const start = Date.now();
    const { method, url } = context.request;
    
    logger.info(`→ ${method} ${url}`, {
      method,
      url,
      ip: context.request.ip,
      userAgent: context.request.headers['user-agent']
    });
    
    try {
      await next();
      const duration = Date.now() - start;
      logger.info(`← ${method} ${url} 200 (${duration}ms)`, {
        method,
        url,
        statusCode: 200,
        duration
      });
    } catch (error) {
      const duration = Date.now() - start;
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`← ${method} ${url} 500 (${duration}ms)`, {
        method,
        url,
        statusCode: 500,
        duration,
        error: message
      });
      throw error;
    }
  };
};