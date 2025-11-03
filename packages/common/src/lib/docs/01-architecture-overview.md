# Architecture Overview

หลักการพื้นฐานของ Either Pattern กับ Feature Driven Architecture และ Clean Architecture

## 🎯 Core Principles

### Feature Driven Structure

```
┌─────────────────────────────────────┐
│           api-service               │ ← Presentation + Application
│   (Feature APIs + Commands/Queries)│   - HTTP Endpoints (UnifiedRoute)
│                                     │   - Business Workflows per Feature
│ Uses: Result<T, E>                 │   - Command/Query Orchestration
│ Returns: HTTP Status + JSON        │   - Request/Response Handling
├─────────────────────────────────────┤
│            api-core                 │ ← Domain Layer
│       (Feature Domain Logic)       │   - Feature Contracts & Types
│                                     │   - Repository Interfaces
│ Uses: Either<Left, Right>          │   - Business Rules (shared)
│ (left, right, matchEither)         │   - Domain Failures & Constants
├─────────────────────────────────────┤
│            api-data                 │ ← Infrastructure Layer
│    (Feature Implementations)       │   - Database Repositories
│                                     │   - External APIs per Feature
│ Uses: eitherFromOperation          │   - File System I/O
│ Returns: Either<Error, Data>       │   - Message Queues
└─────────────────────────────────────┘
```

### 🎯 **Feature Driven Principles:**

1. **1 Feature = 1 API Domain = 1 "Logical Controller"**:
   - **feed-registration-api** → feed_registration schema (ไม่ใช่ Controller class)
   - **document-process-api** → document_process schema
   - **manage-file-api** → file_management schema

2. **Project Separation**:
   - **`api-service`**: Feature endpoints + Commands/Queries orchestration  
   - **`api-core`**: Feature contracts + Domain logic + Repository interfaces
   - **`api-data`**: Feature implementations + Database access per schema

3. **Command/Query Structure**:
   - **Commands**: Write operations (Create, Update, Delete) + HTTP endpoints
   - **Queries**: Read operations (Get, List, Search) + HTTP endpoints
   - **Endpoints**: UnifiedRouteHandler สำหรับ createUnifiedFastifyHandler

4. **Dependency Flow**:
   - `api-service` → `api-core` (uses contracts and types)
   - `api-data` → `api-core` (implements repository interfaces)
   - `api-service` → `api-data` (uses repository implementations)

## 🏗️ Repository Architecture Options

### Option 1: Feature Repository Pattern (แนะนำ)
```typescript
// 1 Feature = 1 Repository Class + DataAccessLogic
class UserRepository {
  async createUser()    // Method = Use Case
  async updateUser()    // Method = Use Case  
  async deleteUser()    // Method = Use Case
  async getUserById()   // Method = Use Case
}

class UserDataAccessLogic {
  // 1 function = 1 SQL execution
  async insertUser()
  async updateUser()
  async deleteUser()
  async findUserById()
}
```

### Option 2: Use Case Repository Pattern
```typescript
// 1 Use Case = 1 Repository Class
class CreateUserRepository {
  async execute() // Single responsibility
}

class UpdateUserRepository {
  async execute() // Single responsibility
}

class DeleteUserRepository {
  async execute() // Single responsibility
}
```

## 📦 Clean Architecture Layers

### Presentation Layer (api-service)
```typescript
// Framework-independent HTTP handlers
export const createUserEndpointV1: UnifiedRouteHandler = async (context) => {
  const pipeline = protectApiPipeline.setHandler(createUserHandler);
  await pipeline.execute(context);
};
```

### Application Layer (api-service)
```typescript
// Business workflows and orchestration
export const processCreateUser: ExecutionAsyncFn = async (inputArgs) => {
  const { userRepository } = inputArgs;
  
  // Orchestrate business logic
  const result = await userRepository.createUser(inputArgs.input);
  return result;
};
```

### Domain Layer (api-core)
```typescript
// Contracts and shared business rules
export interface IUserRepository {
  createUser(input: CreateUserInput): Promise<Result<User, BaseFailure>>;
}

export class User {
  static create(props: UserProps): Either<string, User> {
    // Domain validation
    if (props.age < 13) {
      return left('User must be at least 13 years old');
    }
    return right(new User(props));
  }
}
```

### Infrastructure Layer (api-data)
```typescript
// Database implementations and external integrations
export class UserRepository implements IUserRepository {
  async createUser(input: CreateUserInput): Promise<Result<User, BaseFailure>> {
    return eitherToResult(
      await eitherFromOperation(
        async () => {
          // Database operations
          return await this.prisma.user.create({ data: input });
        },
        (error) => `User creation failed: ${error.message}`
      )
    );
  }
}
```

## 🔄 Data Flow

### Request Flow
1. **HTTP Request** → Feature endpoint (UnifiedRoute)
2. **Feature Endpoint** → Command/Query pipeline
3. **Pipeline Steps** → Business logic execution
4. **Business Logic** → Repository interface call
5. **Repository Implementation** → Database/External API
6. **Response** ← HTTP JSON through UnifiedRoute

### Error Flow
1. **Domain Errors** → Either<DomainError, Success>
2. **Infrastructure Errors** → Either<TechnicalError, Data>
3. **Application Errors** → Result<Data, BusinessError>
4. **HTTP Errors** → Status Code + Error Response

## 🎯 Key Benefits

### Feature Independence
- Each feature has its own database schema
- Feature teams can work independently
- Deploy and scale features separately
- Clear feature boundaries

### Framework Independence
- UnifiedRoute abstracts web framework details
- Easy to switch from Fastify to Express/Koa
- Business logic not tied to HTTP framework
- Consistent API patterns across features

### Type Safety
- Either pattern ensures compile-time error handling
- Clear distinction between technical and business errors
- Type-safe data transformations
- Predictable error propagation

### Clean Architecture Benefits
- Clear separation of concerns
- Dependency inversion principle
- Easy testing and mocking
- Technology independence

## 📚 Next Steps

1. **[Either API Guide](./02-either-api.md)** - เรียนรู้การใช้งาน Either pattern
2. **[Project Structure](./03-project-structure.md)** - ดูโครงสร้างโปรเจคแบบ Feature Driven  
3. **[Repository Comparison](./09-repository-comparison.md)** - เปรียบเทียบแนวทาง Repository
4. **[Real-world Examples](./12-real-world-examples.md)** - ตัวอย่างการใช้งานจริง

## 🔧 Technologies Used

- **`@inh-lib/unified-route`**: Framework-independent routing
- **`@inh-lib/api-util-fastify`**: Fastify adapter for UnifiedRoute
- **`@inh-lib/common`**: Either pattern and helper functions
- **TypeScript**: Full type safety across all layers
- **Prisma/Raw SQL**: Database access with optimizations
- **Fastify**: Web framework (replaceable via UnifiedRoute)