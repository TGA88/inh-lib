import { UnifiedHttpContext } from "../../type/unified/unified-context";

// foundations/middleware/rate-limit.ts
const requests = new Map<string, { count: number; resetTime: number }>();

export const createRateLimitMiddleware = (max = 100, windowMs = 15 * 60 * 1000) => {
  return async (context: UnifiedHttpContext, next: () => Promise<void>) => {
    const key = context.request.ip;
    const now = Date.now();
    
    let data = requests.get(key);
    if (!data || now > data.resetTime) {
      data = { count: 0, resetTime: now + windowMs };
      requests.set(key, data);
    }
    
    if (data.count >= max) {
      context.response.status(429);
      context.response.json({ error: 'Too many requests' });
      return;
    }
    
    data.count++;
    await next();
  };
};