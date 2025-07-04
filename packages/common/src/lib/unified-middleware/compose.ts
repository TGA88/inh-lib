import { UnifiedHttpContext } from "../type/unified/unified-context";
import { UnifiedMiddleware, UnifiedRouteHandler } from "../type/unified/unified-middleware";

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