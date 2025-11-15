import { 
  UnifiedInternalService,
  UnifiedInternalClient 
} from '../unified-internal.service';
import type { UnifiedRouteHandler } from '../../types/unified-middleware';

describe('UnifiedInternalService', () => {
  test('should create service and client', () => {
    const service = new UnifiedInternalService();
    const client = new UnifiedInternalClient(service);
    
    expect(service).toBeDefined();
    expect(client).toBeDefined();
  });

  test('should register handlers', () => {
    const service = new UnifiedInternalService();
    const handler: UnifiedRouteHandler = async (ctx) => {
      ctx.response.json({ message: 'test' });
    };
    
    service.registerHandler('/api/test', handler);
    expect(service.hasHandler('/api/test')).toBe(true);
  });
});
