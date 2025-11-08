import { UnifiedHttpContext } from "../types/unified-context";
import { UnifiedMiddleware, UnifiedRouteHandler } from "../types/unified-middleware";

// foundations/middleware/composer.ts
export const composeMiddleware = (middlewares: UnifiedMiddleware[]) => {
  return (handler: UnifiedRouteHandler): UnifiedRouteHandler => {
    return async (context: UnifiedHttpContext) => {
      let index = 0;
      
      const next = async (): Promise<void> => {
        if (index >= middlewares.length) {
          await handler(context);
          return;
        }
        
        const middleware = middlewares[index++];
        await middleware(context, next);
      };
      
      await next();
    };
  };
};

export function isUnifiedMiddleware(middleware: unknown): middleware is UnifiedMiddleware {
  return typeof middleware === 'function' && middleware.length === 2;
}

