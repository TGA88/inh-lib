# 🧱 New Architecture Complete Example (Unified / Framework-Agnostic)

ภาษาไทยอยู่ด้านล่าง (Thai version below)

---
## 1. Overview
This document provides a complete, end-to-end example of building a framework-agnostic HTTP application using `@inh-lib/unified-route` with the "New Architecture" approach:

- Business logic isolated from any web framework
- Unified registry & dependency lifecycle (singleton / scoped / transient)
- Middleware composition & context registry
- Swappable adapters (Fastify / Express)
- Testable units without booting a server
- Optional telemetry & logging integration points

---
## 2. Goals
| Goal | Achieved By |
|------|-------------|
| Framework independence | Use pure controllers & services, add adapter layer |
| Scoped dependency resolution | Unified registry + scope per request |
| Clean separation | `services`, `controllers`, `adapters` folders |
| Easy migration | Only replace adapter factory |
| Predictable lifetimes | Explicit `lifetime` per registration |
| Type-safe registry | Constants + helper accessors |

---
## 3. Suggested Directory Structure
```
packages/my-business/
  src/
    domain/
      user.types.ts
    services/
      user.repository.ts
      user.service.ts
      auth.service.ts
    controllers/
      user.controller.ts
    setup/
      registry.setup.ts

packages/fastify-integration/
  src/
    adapters/
      fastify-handler.factory.ts
    middleware/
      auth.middleware.ts
      metadata.middleware.ts

apps/api-fastify/
  src/
    main.ts
    routes/user.routes.ts

apps/api-express/
  src/
    main.ts
```

---
## 4. Domain Types (Example)
```typescript
// user.types.ts
export interface User { id: string; email: string; roles: string[]; }
export interface CreateUserInput { email: string; }
```

---
## 5. Services
```typescript
// user.repository.ts (Transient)
export class UserRepository {
  private users = new Map<string, { id: string; email: string; roles: string[] }>();
  async create(email: string) { const id = crypto.randomUUID(); const u = { id, email, roles: ['user'] }; this.users.set(id, u); return u; }
  async findById(id: string) { return this.users.get(id) || null; }
  async list() { return [...this.users.values()]; }
}

// user.service.ts (Scoped – caches within request)
export class UserService {
  constructor(private repo: UserRepository) {}
  async createUser(input: { email: string }) { return this.repo.create(input.email); }
  async getUser(id: string) { return this.repo.findById(id); }
  async listUsers() { return this.repo.list(); }
}

// auth.service.ts (Singleton)
export class AuthService {
  validateToken(token?: string) { if (!token) return null; return { userId: 'system', roles: ['admin'] }; }
}
```

---
## 6. Controller (Pure, Framework-Agnostic)
```typescript
// user.controller.ts
import { UserService } from '../services/user.service';

export class UserController {
  constructor(private users: UserService) {}

  list = async () => { return await this.users.listUsers(); };
  create = async (data: { email: string }) => this.users.createUser(data);
}
```

---
## 7. Unified Registry Setup
```typescript
// registry.setup.ts
import { UnifiedRegistryService } from '@inh-lib/unified-route';
import { UserRepository } from '../services/user.repository';
import { UserService } from '../services/user.service';
import { AuthService } from '../services/auth.service';
import { UserController } from '../controllers/user.controller';

export const REGISTRY_TOKENS = {
  USER_REPO: 'user:repo',
  USER_SERVICE: 'user:service',
  AUTH_SERVICE: 'auth:service',
  USER_CONTROLLER: 'user:controller'
} as const;

type Tokens = typeof REGISTRY_TOKENS[keyof typeof REGISTRY_TOKENS];

export const setupBusinessServices = (registry = UnifiedRegistryService.create()) => {
  // Singleton
  registry.register(REGISTRY_TOKENS.AUTH_SERVICE, () => new AuthService(), { lifetime: 'singleton' });

  // Transient (new each resolve)
  registry.register(REGISTRY_TOKENS.USER_REPO, () => new UserRepository(), { lifetime: 'transient' });

  // Scoped (per request scope)
  registry.register(REGISTRY_TOKENS.USER_SERVICE, (scope) => {
    const repo = scope.resolve<UserRepository>(REGISTRY_TOKENS.USER_REPO);
    return new UserService(repo);
  }, { lifetime: 'scoped' });

  // Scoped controller (depends on scoped service)
  registry.register(REGISTRY_TOKENS.USER_CONTROLLER, (scope) => {
    const users = scope.resolve<UserService>(REGISTRY_TOKENS.USER_SERVICE);
    return new UserController(users);
  }, { lifetime: 'scoped' });

  return registry;
};
```

---
## 8. Middleware Examples
```typescript
// metadata.middleware.ts
import { UnifiedMiddleware, addRegistryItem } from '@inh-lib/unified-route';
export const metadataMiddleware: UnifiedMiddleware = async (ctx, next) => {
  addRegistryItem(ctx, 'request:meta', { requestId: crypto.randomUUID(), started: Date.now() });
  await next();
};

// auth.middleware.ts
import { UnifiedMiddleware, getRegistryItem } from '@inh-lib/unified-route';
import { REGISTRY_TOKENS } from '../../business/setup/registry.setup';
export const authMiddleware: UnifiedMiddleware = async (ctx, next) => {
  const scope = ctx.registry.__scope as any; // Implementation detail if exposed – or attach via adapter
  const auth = scope.resolve(REGISTRY_TOKENS.AUTH_SERVICE);
  const token = ctx.request.headers.authorization;
  const user = auth.validateToken(token);
  if (!user) { ctx.response.statusCode = 401; ctx.response.json({ error: 'Unauthorized' }); return; }
  addRegistryItem(ctx, 'auth:user', user);
  await next();
};
```

---
## 9. Adapter Factory (Fastify Example)
```typescript
// fastify-handler.factory.ts
import { setupBusinessServices, REGISTRY_TOKENS } from '.../registry.setup';
import { createUnifiedApp, composeMiddleware, sendResponse } from '@inh-lib/unified-route';

export const createFastifyHandler = (controllerMethod: () => Promise<any>) => {
  const registry = setupBusinessServices();
  const app = createUnifiedApp({ registry });
  const middlewareChain = composeMiddleware([/* metadataMiddleware, authMiddleware */]);

  return async (req, reply) => {
    const scope = registry.createScope();
    const context = app.createContext({
      request: { method: req.method, url: req.url, headers: req.headers, body: req.body, params: req.params, query: req.query },
      response: reply
    }, scope);

    const handler = async () => {
      const ctrl = scope.resolve(REGISTRY_TOKENS.USER_CONTROLLER);
      const result = await controllerMethod.call(ctrl);
      sendResponse(context, result, 200);
    };

    await middlewareChain(context, handler).catch(err => {
      reply.status(500).send({ error: err.message });
    }).finally(() => scope.dispose());
  };
};
```

---
## 10. Fastify Route Wiring
```typescript
// user.routes.ts
import Fastify from 'fastify';
import { createFastifyHandler } from '../adapters/fastify-handler.factory';
import { setupBusinessServices, REGISTRY_TOKENS } from '.../registry.setup';

const fastify = Fastify();
const registry = setupBusinessServices();

fastify.get('/users', async (req, reply) => {
  const handler = createFastifyHandler(function() { return this.list(); });
  return handler(req, reply);
});
```

---
## 11. Express Adapter (Conceptual)
```typescript
export const createExpressHandler = (controllerMethod: () => Promise<any>) => {
  const registry = setupBusinessServices();
  return async (req, res, next) => {
    const scope = registry.createScope();
    const context = { /* build UnifiedHttpContext equivalent */ } as any;
    try {
      const ctrl = scope.resolve(REGISTRY_TOKENS.USER_CONTROLLER);
      const result = await controllerMethod.call(ctrl, req.body);
      res.json(result);
    } catch (e) { next(e); } finally { scope.dispose(); }
  };
};
```

---
## 12. Swapping Frameworks
No business-layer changes. Only choose `createFastifyHandler` vs `createExpressHandler`.

---
## 13. Testing (Unit + Integration)
```typescript
// user.service.spec.ts
import { UserService } from './user.service';
import { UserRepository } from './user.repository';

test('creates user', async () => {
  const service = new UserService(new UserRepository());
  const u = await service.createUser({ email: 'a@test.dev' });
  expect(u.email).toBe('a@test.dev');
});
```

```typescript
// controller integration (without HTTP server)
import { setupBusinessServices, REGISTRY_TOKENS } from '../setup/registry.setup';

it('lists users', async () => {
  const registry = setupBusinessServices();
  const scope = registry.createScope();
  const ctrl = scope.resolve(REGISTRY_TOKENS.USER_CONTROLLER);
  const list = await ctrl.list();
  expect(Array.isArray(list)).toBe(true);
  scope.dispose();
});
```

---
## 14. Error Handling Pattern
```typescript
const safe = (fn: Function) => async (...args: any[]) => {
  try { return await fn(...args); } catch (e: any) { return { error: true, message: e.message }; }
};
```
Attach to controllers or wrap middleware chain.

---
## 15. Telemetry & Logging Hook Points
- Add `traceId` in metadata middleware
- Inject logger via singleton service
- Emit span events inside service methods

---
## 16. Performance Tips
| Scenario | Advice |
|----------|--------|
| High object churn | Prefer `scoped` over `transient` when reused in request |
| Cross-request cache | Use `singleton` |
| Memory spikes | Dispose scopes promptly |
| Hot path serialization | Reuse JSON helpers in utilities |

---
## 17. Migration Checklist
- [ ] All controllers free of Fastify/Express imports
- [ ] Registry tokens centralized
- [ ] Lifetimes reviewed
- [ ] Middleware side-effects idempotent
- [ ] Tests run without framework
- [ ] Scope always disposed

---
## 18. Full Flow Summary
1. Registry created at app start
2. Request arrives → create scope
3. Middleware runs (adds metadata / auth state)
4. Controller resolved via scope
5. Business logic executes
6. Response sent via unified helpers
7. Scope disposed

---
# 🇹🇭 ตัวอย่างสถาปัตยกรรมใหม่ (ฉบับสมบูรณ์)

## ✅ แนวคิดหลัก
- แยก Business Logic ออกจาก Framework 100%
- ใช้ Unified Registry จัดการ Service Lifetime
- เปลี่ยน Framework ได้โดยไม่แก้โค้ด business
- ทดสอบได้ง่าย (Unit + Integration แบบไม่ต้อง boot server)

## 🧬 โครงสร้าง (สรุป)
ดูตัวอย่างด้านบน (Directory Structure) แล้วปรับตามโปรเจคจริง

## 🛠 ขั้นตอนหลัก (Flow)
1. สร้าง Registry และลงทะเบียน services (singleton / scoped / transient)
2. สร้าง scope ต่อ request
3. Middleware ใส่ข้อมูลเสริม (metadata / auth / trace)
4. Resolve controller ผ่าน scope
5. ส่งผลลัพธ์ด้วย helper (`sendResponse`)
6. Dispose scope

## 🗝 การเลือก Lifetime
| Lifetime | ใช้เมื่อ | หมายเหตุ |
|----------|----------|----------|
| singleton | ข้อมูล config / logger / auth | สร้างครั้งเดียว |
| scoped | state ต่อ request (UserService) | ป้องกันรั่วข้าม request |
| transient | ไม่ต้อง cache / เบา | สร้างใหม่ทุกครั้ง |

## 🧪 การทดสอบ
- Service: ทดสอบตรงๆ ด้วย in-memory repo
- Controller: resolve ผ่าน scope
- ไม่ต้อง spin Fastify/Express

## 🔄 การสลับ Framework
เปลี่ยนเฉพาะ adapter (`createFastifyHandler` → `createExpressHandler`)

## 🛡 แนวทาง Error Handling
- ใช้ wrapper (safe) หรือ global error middleware
- แยก Business Error vs System Error

## 🚀 Checklist ก่อน Deploy
- [ ] ไม่มี framework import ใน services/controllers
- [ ] มี dispose scope ทุกครั้ง
- [ ] Middleware ไม่ throw โดยไม่จับ
- [ ] ทดสอบผ่าน

---
## 📌 สรุปสุดท้าย
Architecture นี้ช่วยให้คุณ: เร็วขึ้น, ยืดหยุ่น, ทดสอบง่าย, เปลี่ยน framework ได้ และพร้อมต่อยอด observability / telemetry.

> ปรับ / ตัด / เพิ่ม ส่วนต่างๆ ได้ตามบริบทของทีม

---
**END**
