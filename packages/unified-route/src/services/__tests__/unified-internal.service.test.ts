import { 
  UnifiedInternalService,
  UnifiedInternalClient 
} from '../unified-internal.service';
import type { UnifiedHandlerFn } from '../../types/unified-context';

describe('UnifiedInternalService', () => {
  test('should create service and client', () => {
    const service = new UnifiedInternalService();
    const client = new UnifiedInternalClient(service);
    
    expect(service).toBeDefined();
    expect(client).toBeDefined();
  });

  test('should register handlers', () => {
    const service = new UnifiedInternalService();
    const handler: UnifiedHandlerFn = async (ctx) => {
      ctx.response.json({ message: 'test' });
    };
    
    service.registerHandler('/api/test', handler);
    expect(service.hasHandler('/api/test')).toBe(true);
  });
});
