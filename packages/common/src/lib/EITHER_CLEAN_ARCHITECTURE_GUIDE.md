# Either Pattern with Clean Architecture

> **📢 เอกสารฉบับใหม่**: เอกสารนี้ได้ถูกแยกออกเป็นหลายไฟล์เพื่อการจัดการที่ง่ายขึ้น  
> 👉 **[ไปยังเอกสารใหม่](./docs/README.md)**

## 🚀 Quick Navigation

### 📚 Core Documentation
- **[Architecture Overview](./docs/01-architecture-overview.md)** - หลักการพื้นฐานและ principles
- **[Either API Guide](./docs/02-either-api.md)** - การใช้งาน Either pattern และ helper functions
- **[Repository Pattern Comparison](./docs/09-repository-comparison.md)** - เปรียบเทียบแนวทางต่างๆ

### 🎯 Repository Patterns
- **[Feature Repository Pattern](./docs/08-feature-repository.md)** - 1 Feature = 1 Repository (แนะนำ)
- **[Use Case Repository Pattern](./docs/07-use-case-repository.md)** - 1 Use Case = 1 Repository

### 🤖 AI & Team Development
- **[AI Development Guide](./docs/13-ai-development.md)** - การทำงานกับ AI Assistants
- **[Team Collaboration](./docs/14-team-collaboration.md)** - การทำงานเป็นทีม

## 🎯 Repository Pattern Decision Guide

### ✅ Feature Repository Pattern (แนะนำ)
```typescript
// 1 Feature = 1 Repository Class + DataAccessLogic  
class UserRepository {
  async createUser()    // Method = Use Case
  async updateUser()    // Method = Use Case
  async deleteUser()    // Method = Use Case
}
```

**เหมาะกับ:**
- ✅ Feature มี use cases ไม่เยอะมาก (3-7 use cases)
- ✅ Business logic มี shared validation/rules เยอะ
- ✅ การทำงานกับ AI Assistants
- ✅ Code กระชับ อ่านง่าย maintain ง่าย

### ⚖️ Use Case Repository Pattern
```typescript
// 1 Use Case = 1 Repository Class
class CreateUserRepository {
  async execute() // Single responsibility
}
```

**เหมาะกับ:**
- ✅ Feature มี use cases เยอะมาก (8+ use cases)
- ✅ Team ใหญ่ทำงานแบบ parallel
- ✅ Extreme isolation สำหรับ testing
- ✅ Microservices architecture

## 🔧 Key Technologies

- **`@inh-lib/unified-route`**: Framework-independent routing
- **`@inh-lib/api-util-fastify`**: Fastify adapter for UnifiedRoute
- **`@inh-lib/common`**: Either pattern and helper functions
- **Feature Driven Architecture**: 1 Feature = 1 API Domain = 1 Database Schema
- **TypeScript**: Full type safety across all layers

---

## 📜 Legacy Documentation (เดิม)

> **⚠️ หมายเหตุ**: เนื้อหาด้านล่างนี้เป็นเอกสารเดิมที่รวมทุกอย่างไว้ในไฟล์เดียว  
> แนะนำให้ใช้ **[เอกสารใหม่](./docs/README.md)** แทน เพื่อประสบการณ์การอ่านที่ดีกว่า

<details>
<summary>คลิกเพื่อดูเนื้อหาเดิม (ไม่แนะนำ)</summary>

## Architecture Overview

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

## Either API

### Basic Types

```typescript
import { Either, Left, Right, left, right } from '@inh-lib/common';

// Either<L, A> = Left<L, A> | Right<L, A>
type Either<L, A> = Left<L, A> | Right<L, A>;

// Success case (Right)
const success: Either<string, number> = right(42);

// Error case (Left)  
const error: Either<string, number> = left('Something went wrong');
```

### Type Guards

```typescript
// ตรวจสอบและ narrow types
if (result.isLeft()) {
  console.log('Error:', result.value); // type: L
} else {
  console.log('Success:', result.value); // type: A
}
```

## Helper Functions

### Core Helpers (จากไฟล์ Either.ts)

```typescript
import { 
  left, 
  right, 
  matchEither, 
  eitherFromOperation, 
  eitherToResult 
} from '@inh-lib/common';

// 1. Basic constructors
const success = right(42);
const error = left('error message');

// 2. Pattern matching
const result = matchEither(
  someEither,
  (error) => `Error: ${error}`,
  (value) => `Success: ${value}`
);

// 3. Async operations with try-catch handling
const apiResult = await eitherFromOperation(
  async () => fetchData(),
  (error) => `API Error: ${error.message}`
);

// 4. Convert Either → Result
const resultValue = eitherToResult(someEither);
```

### Custom Helper Functions (ถ้าต้องการขยาย)

```typescript
// สามารถสร้าง helper functions เพิ่มเติมได้ถ้าต้องการ
// แต่ไม่จำเป็นเพราะ Either.ts มี helper functions พื้นฐานครบแล้ว

// Chain operations (optional)
const chainEither = <L, A, B>(
  either: Either<L, A>,
  fn: (value: A) => Either<L, B>
): Either<L, B> => {
  return either.isRight() ? fn(either.value) : either;
};

// Map values (optional)
const mapEither = <L, A, B>(
  either: Either<L, A>,
  fn: (value: A) => B
): Either<L, B> => {
  return either.isRight() ? right(fn(either.value)) : either;
};

// Sequence multiple Either values (optional)
const sequenceEither = <L, A>(eithers: Either<L, A>[]): Either<L, A[]> => {
  const values: A[] = [];
  
  for (const either of eithers) {
    if (either.isLeft()) return either;
    values.push(either.value);
  }
  
  return right(values);
};
```

## Project Structure

### Monorepo Organization (Feature Driven)

```
my-app/
├── packages/
│   ├── api-service/                    # Presentation + Application Layer
│   │   ├── src/
│   │   │   ├── feed-registration-api/  # Feature API Domain (= "Controller")
│   │   │   │   ├── command/            # Write operations (CUD)
│   │   │   │   │   ├── add-attachment/ # Single Command
│   │   │   │   │   │   ├── index.ts           # Public API exports
│   │   │   │   │   │   ├── endpoint/          # HTTP endpoint handlers
│   │   │   │   │   │   │   ├── v1.endpoint.ts # UnifiedRouteHandler
│   │   │   │   │   │   │   └── __tests__/
│   │   │   │   │   │   │       ├── v1.endpoint.test.ts           # Unit tests
│   │   │   │   │   │   │       └── v1.endpoint.integration.test.ts # Integration tests
│   │   │   │   │   │   ├── logic/             # Business logic (Private)
│   │   │   │   │   │   │   ├── business.logic.ts  # Pure business functions
│   │   │   │   │   │   │   ├── steps.logic.ts     # Pipeline step definitions
│   │   │   │   │   │   │   └── __tests__/
│   │   │   │   │   │   │       ├── business.logic.test.ts        # Unit tests
│   │   │   │   │   │   │       ├── steps.logic.test.ts           # Unit tests
│   │   │   │   │   │   │       └── pipeline.integration.test.ts  # Integration tests
│   │   │   │   │   │   └── types/             # Local types (Optional)
│   │   │   │   │   │       └── add-attachment.types.ts
│   │   │   │   │   ├── save-registration/     # Single Command
│   │   │   │   │   │   ├── index.ts
│   │   │   │   │   │   ├── endpoint/
│   │   │   │   │   │   │   ├── v1.endpoint.ts # UnifiedRouteHandler
│   │   │   │   │   │   │   └── __tests__/
│   │   │   │   │   │   ├── logic/
│   │   │   │   │   │   └── types/
│   │   │   │   │   └── update-status/         # Single Command
│   │   │   │   │       └── ... (same structure)
│   │   │   │   ├── query/              # Read operations (R)
│   │   │   │   │   ├── get-animal-breed/      # Single Query
│   │   │   │   │   │   ├── index.ts
│   │   │   │   │   │   ├── endpoint/
│   │   │   │   │   │   │   ├── v1.endpoint.ts # UnifiedRouteHandler
│   │   │   │   │   │   │   └── __tests__/
│   │   │   │   │   │   ├── logic/
│   │   │   │   │   │   └── types/
│   │   │   │   │   ├── find-registration-data/ # Single Query
│   │   │   │   │   └── get-registration-history/ # Single Query
│   │   │   │   └── __tests__/          # Feature integration tests
│   │   │   ├── document-process-api/   # Feature API Domain
│   │   │   │   ├── command/
│   │   │   │   │   ├── upload-document/
│   │   │   │   │   │   ├── endpoint/
│   │   │   │   │   │   │   └── v1.endpoint.ts # UnifiedRouteHandler
│   │   │   │   │   │   └── logic/
│   │   │   │   │   └── validate-document/
│   │   │   │   ├── query/
│   │   │   │   │   └── get-document-status/
│   │   │   │   │       ├── endpoint/
│   │   │   │   │       │   └── v1.endpoint.ts # UnifiedRouteHandler
│   │   │   │   │       └── logic/
│   │   │   │   └── __tests__/
│   │   │   ├── manage-file-api/        # Feature API Domain
│   │   │   │   ├── command/
│   │   │   │   ├── query/
│   │   │   │   └── __tests__/
│   │   │   └── shared/                 # Shared utilities
│   │   │       ├── pipeline/
│   │   │       ├── middleware/
│   │   │       └── utils/
│   │   └── package.json
│   │
│   ├── api-core/                       # Domain Layer (Contracts)
│   │   ├── src/
│   │   │   ├── feed-registration-api/  # Feature Domain
│   │   │   │   ├── failures.ts         # Domain failures
│   │   │   │   ├── registry.const.ts   # Domain constants
│   │   │   │   ├── command/            # Command contracts
│   │   │   │   │   ├── add-attachment/
│   │   │   │   │   │   ├── contract.ts      # Repository interface
│   │   │   │   │   │   ├── type.ts          # Input/Output types
│   │   │   │   │   │   ├── failure.ts       # Specific failures
│   │   │   │   │   │   ├── index.ts         # Exports
│   │   │   │   │   │   └── __tests__/       # Contract tests
│   │   │   │   │   ├── save-registration/
│   │   │   │   │   └── update-status/
│   │   │   │   ├── query/              # Query contracts
│   │   │   │   │   ├── get-animal-breed/
│   │   │   │   │   ├── find-registration-data/
│   │   │   │   │   └── get-registration-history/
│   │   │   │   └── logics/             # Domain utilities
│   │   │   │       ├── context-key.ts       # DI keys
│   │   │   │       ├── validation.ts        # Business rules
│   │   │   │       └── index.ts             # Exports
│   │   │   ├── document-process-api/   # Feature Domain
│   │   │   ├── manage-file-api/        # Feature Domain
│   │   │   └── index.ts               # Main exports
│   │   └── package.json
│   │
│   └── api-data/                       # Infrastructure Layer
│       ├── src/
│       │   ├── feed-registration-api/  # Feature Implementation (Schema: feed_registration)
│       │   │   ├── command/            # Command implementations
│       │   │   │   ├── add-attachment/
│       │   │   │   │   ├── repository.ts        # Repository implementation
│       │   │   │   │   ├── dataAccess.logic.ts  # Pure data access
│       │   │   │   │   ├── business.logic.ts    # Business rules
│       │   │   │   │   ├── mapper.ts           # DataParser implementations
│       │   │   │   │   ├── index.ts            # Exports
│       │   │   │   │   └── __tests__/          # Implementation tests
│       │   │   │   ├── save-registration/
│       │   │   │   └── update-status/
│       │   │   ├── query/              # Query implementations
│       │   │   │   ├── get-animal-breed/
│       │   │   │   ├── find-registration-data/
│       │   │   │   └── get-registration-history/
│       │   │   └── __tests__/          # Feature implementation tests
│       │   ├── document-process-api/   # Feature Implementation (Schema: document_process)
│       │   ├── manage-file-api/        # Feature Implementation (Schema: file_management)
│       │   ├── bible-factory/          # Utility functions
│       │   │   ├── registration-factory.ts
│       │   │   ├── document-factory.ts
│       │   │   └── file-factory.ts
│       │   ├── dbclient.ts             # Database client
│       │   ├── utils.ts                # Either utilities
│       │   └── index.ts                # Main exports
│       └── package.json
└── package.json (workspace root)
```

### Database Schema Mapping

```
Feature Domain → Database Schema → Tables
────────────────────────────────────────────────────
feed-registration-api → feed_registration_schema → 
  ├── registrations
  ├── attachments  
  ├── animal_breeds
  └── registration_history

document-process-api → document_process_schema →
  ├── documents
  ├── process_steps
  └── validations

manage-file-api → file_management_schema →
  ├── files
  ├── file_metadata
  └── storage_locations
```

### Dependency Graph

```
api-service/{feature-domain} 
    ↓ uses contracts & types
    ├── api-core/{feature-domain} (repository interfaces)
    └── api-data/{feature-domain} (repository implementations)

api-data/{feature-domain}
    ↓ implements contracts
    └── api-core/{feature-domain} (interfaces & types)

api-core/{feature-domain}
    ↓ depends on
    └── @inh-lib/common (Either pattern)
```

### Project Dependencies

```json
// api-service/package.json
{
  "dependencies": {
    "@my-app/api-core": "workspace:*",
    "@my-app/api-data": "workspace:*",
    "@inh-lib/unified-route": "*",
    "@inh-lib/api-util-fastify": "*",
    "@inh-lib/common": "*",
    "fastify": "*"
  }
}

// api-core/package.json  
{
  "dependencies": {
    "@inh-lib/common": "*"
  }
}

// api-data/package.json
{
  "dependencies": {
    "@my-app/api-core": "workspace:*",
    "@inh-lib/common": "*",
    "pg": "*",
    "redis": "*"
  }
}
```

## API Service (Presentation + Application)

### Feature API Endpoints (UnifiedRouteHandler)

Framework-independent HTTP endpoints using UnifiedRoute pattern:

```typescript
// api-service/src/feed-registration-api/command/add-attachment/endpoint/v1.endpoint.ts
import { UnifiedRouteHandler, UnifiedHandlerFn } from "@inh-lib/unified-route";
import { protectApiPipeline } from "@shared-api-service/shared/pipeline/protect-api.pipeline";
import { mapReqToInputStep, processBusinessLogicStep, completeStep } from "../logic/steps.logic";

/**
 * Add Attachment Endpoint V1
 * 
 * Handles file attachment uploads for feed registrations
 */
export const addAttachmentEndpointV1: UnifiedRouteHandler = async (context): Promise<void> => {
    const apiPipeline = protectApiPipeline.setHandler(addAttachmentEndpointV1Handler);
    await apiPipeline.execute(context);
}

const addAttachmentEndpointV1Handler: UnifiedHandlerFn = async (context) => {
    const telemetryService = getRegistryItem(context, TELEMETRY_CONTEXT_KEYS.MIDDLEWARE_SERVICE) as TelemetryMiddlewareService;
    
    // Create process pipeline with telemetry support
    const processParams: ProcessPipelineParams = {
        context,
        telemetryService
    };
    
    const bizPipeline = new ProcessPipeline<ProcessPipelineParams, AddAttachmentOutput>()
        .use(mapReqToInputStep)
        .use(processBusinessLogicStep)
        .use(completeStep);
        
    const result = await bizPipeline.execute(processParams);
    result.toHttpResponse(context.response);
}
```

```typescript
// api-service/src/feed-registration-api/query/get-animal-breed/endpoint/v1.endpoint.ts
import { UnifiedRouteHandler, UnifiedHandlerFn } from "@inh-lib/unified-route";
import { protectApiPipeline } from "@shared-api-service/shared/pipeline/protect-api.pipeline";
import { mapReqToInputStep, processQueryLogicStep, completeStep } from "../logic/steps.logic";

/**
 * Get Animal Breed Endpoint V1
 * 
 * Retrieves animal breed information for registration forms
 */
export const getAnimalBreedEndpointV1: UnifiedRouteHandler = async (context): Promise<void> => {
    const apiPipeline = protectApiPipeline.setHandler(getAnimalBreedEndpointV1Handler);
    await apiPipeline.execute(context);
}

const getAnimalBreedEndpointV1Handler: UnifiedHandlerFn = async (context) => {
    const telemetryService = getRegistryItem(context, TELEMETRY_CONTEXT_KEYS.MIDDLEWARE_SERVICE) as TelemetryMiddlewareService;
    
    const processParams: ProcessPipelineParams = {
        context,
        telemetryService
    };
    
    const queryPipeline = new ProcessPipeline<ProcessPipelineParams, AnimalBreedOutput>()
        .use(mapReqToInputStep)
        .use(processQueryLogicStep)
        .use(completeStep);
        
    const result = await queryPipeline.execute(processParams);
    result.toHttpResponse(context.response);
}
```

### Business Logic (Application Layer)

Pure business functions and pipeline steps:

```typescript
// api-service/src/feed-registration-api/command/add-attachment/logic/business.logic.ts

// ===================================================================
// STEP 1: Parse Request to Input DTO
// ===================================================================

/**
 * Parse HTTP request body to AddAttachmentInput with validation
 */
export const parseReqToInputDTO: ParserFn<AddAttachmentInput> = (request, _registry) => {
    if (!request.body) {
        return left('Request body is required');
    }

    const body = request.body as Record<string, unknown>;
    
    // Validate required fields
    if (typeof body.registrationId !== 'string' || body.registrationId.length === 0) {
        return left('Registration ID is required');
    }

    if (!Array.isArray(body.files) || body.files.length === 0) {
        return left('At least one file is required');
    }

    // Validate files
    const validatedFiles: FileData[] = [];
    for (const file of body.files) {
        const fileValidation = validateFileData(file);
        if (fileValidation.isLeft()) {
            return fileValidation;
        }
        validatedFiles.push(fileValidation.value);
    }

    return right({
        registrationId: body.registrationId,
        files: validatedFiles,
        userId: request.headers['user-id'] || 'anonymous',
        metadata: body.metadata as Record<string, unknown>
    });
};

/**
 * Map AddAttachmentInput to process state
 */
export const setInputDTOToState: StateMapperFn<AddAttachmentInput> = (input) => {
    return {
        registrationId: input.registrationId,
        filesToAttach: input.files,
        userId: input.userId,
        attachmentMetadata: input.metadata
    };
};

// ===================================================================
// STEP 2: Execute Business Logic
// ===================================================================

/**
 * Prepare input arguments for business logic execution
 */
export const getProcessInput: GetInitialInputFn<AddAttachmentProcessArgs> = (params) => {
    return {
        context: params.context,
        input: {
            registrationId: params.state.registrationId,
            files: params.state.filesToAttach,
            userId: params.state.userId,
            metadata: params.state.attachmentMetadata
        },
        addAttachmentRepository: getRegistryItem(params.context, FeedRegistrationContextKeys.ADD_ATTACHMENT_REPOSITORY) as IAddAttachmentRepository
    };
};

/**
 * Execute core business logic - coordinate with repository
 */
export const processBusinessLogic: ExecutionAsyncFn<AddAttachmentProcessArgs, AddAttachmentOutput> = async (inputArgs) => {
    const { context, input, addAttachmentRepository } = inputArgs;
    
    // Execute business logic through repository
    const result = await addAttachmentRepository.addAttachment(context, input);
    
    if (result.isFailure) {
        throw new Error(`Add attachment failed: ${result.error}`);
    }
    
    return result.data;
};

/**
 * Map business result to process state
 */
export const setOutputToState: StateMapperFn<AddAttachmentOutput> = (output) => {
    return {
        attachmentResult: output,
        responseMessage: 'Attachments added successfully',
        statusCode: 201
    };
};

// ===================================================================
// STEP 3: Complete Process and Return Final Result
// ===================================================================

/**
 * Extract output from process state for final response
 */
export const completeMapper: StateToDataFn<AddAttachmentOutput> = (state) => {
    return state.attachmentResult;
};

// Helper functions
const validateFileData = (file: unknown): Either<string, FileData> => {
    if (typeof file !== 'object' || file === null) {
        return left('Invalid file data');
    }

    const fileData = file as Record<string, unknown>;
    
    if (typeof fileData.fileName !== 'string' || fileData.fileName.length === 0) {
        return left('File name is required');
    }

    if (!Buffer.isBuffer(fileData.fileData)) {
        return left('File data must be a Buffer');
    }

    if (typeof fileData.contentType !== 'string') {
        return left('Content type is required');
    }

    return right({
        fileName: fileData.fileName,
        fileData: fileData.fileData,
        contentType: fileData.contentType,
        description: fileData.description as string
    });
};
```

### Pipeline Steps Definition

```typescript
// api-service/src/feed-registration-api/command/add-attachment/logic/steps.logic.ts
import { createAsyncStep, createCompletionStep, createParseRequestToInputStep } from "@shared-api-service/shared/utils/pipeline-helpers";
import { 
    parseReqToInputDTO, 
    setInputDTOToState,
    getProcessInput,
    processBusinessLogic,
    setOutputToState,
    completeMapper
} from "./business.logic";

// ===================================================================
// PIPELINE STEPS DEFINITION
// ===================================================================

/**
 * Step 1: Parse HTTP request to AddAttachmentInput and update state
 */
export const mapReqToInputStep = createParseRequestToInputStep(
    "mapReqToInputStep", 
    parseReqToInputDTO, 
    setInputDTOToState
);

/**
 * Step 2: Execute core business logic - add attachments
 */
export const processBusinessLogicStep = createAsyncStep(
    "processBusinessLogicStep", 
    getProcessInput, 
    processBusinessLogic, 
    setOutputToState
);

/**
 * Step 3: Complete process and return final result
 */
export const completeStep = createCompletionStep<ProcessPipelineParams, AddAttachmentOutput>(
    "completeStep", 
    completeMapper
);
```

### Public API Exports

```typescript
// api-service/src/feed-registration-api/command/add-attachment/index.ts
// Only export public endpoints
export * from './endpoint/v1.endpoint';
```

### Fastify Route Registration

```typescript
// api-service/src/app.ts or main server file
import Fastify from 'fastify';
import { createUnifiedFastifyHandler } from '@inh-lib/api-util-fastify';

// Feature API endpoints
import { addAttachmentEndpointV1 } from './feed-registration-api/command/add-attachment';
import { saveRegistrationEndpointV1 } from './feed-registration-api/command/save-registration';
import { getAnimalBreedEndpointV1 } from './feed-registration-api/query/get-animal-breed';

const fastify = Fastify({ logger: true });

// Feature: feed-registration-api routes
fastify.register(async function feedRegistrationRoutes(fastify) {
  // Dependencies injection per feature
  fastify.addHook('preHandler', async (request) => {
    if (!request.unifiedAppContext) {
      request.unifiedAppContext = { request: {} as any, response: {} as any, registry: {} };
    }
    
    // Inject feature-specific repositories
    request.unifiedAppContext.registry[FeedRegistrationContextKeys.ADD_ATTACHMENT_REPOSITORY] = 
      new AddAttachmentRepository(prismaClient);
    request.unifiedAppContext.registry[FeedRegistrationContextKeys.GET_ANIMAL_BREED_REPOSITORY] = 
      new GetAnimalBreedRepository(prismaClient);
  });
  
  // Commands (Write operations)
  fastify.post('/api/feed-registration/attachments', 
    createUnifiedFastifyHandler(addAttachmentEndpointV1));
  fastify.post('/api/feed-registration/registrations', 
    createUnifiedFastifyHandler(saveRegistrationEndpointV1));
  
  // Queries (Read operations)  
  fastify.get('/api/feed-registration/animal-breeds', 
    createUnifiedFastifyHandler(getAnimalBreedEndpointV1));
});

// Feature: document-process-api routes
fastify.register(async function documentProcessRoutes(fastify) {
  // Document process feature routes...
});

export default fastify;
```

## API Core (Domain Layer)

### Entities (Shared Domain Models)

```typescript
// api-core/src/entities/user.ts
import { Either, left, right } from '@inh-lib/common';

export interface UserProps {
  name: string;
  email: string;
  age: number;
  id?: string;
  createdAt?: Date;
}

export class User {
  private constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly email: string,
    public readonly age: number,
    public readonly createdAt: Date
  ) {}

  // ✅ Factory method with domain validation
  static create(props: UserProps): Either<string, User> {
    // Domain business rules
    if (props.age < 13) {
      return left('User must be at least 13 years old');
    }

    if (props.age > 120) {
      return left('Invalid age');
    }

    return right(new User(
      props.id || generateId(),
      props.name,
      props.email,
      props.age,
      props.createdAt || new Date()
    ));
  }

  // ✅ Domain behavior
  canVote(): boolean {
    return this.age >= 18;
  }

  getDisplayName(): string {
    return this.name;
  }
}

function generateId(): string {
  return `user_${Date.now()}_${Math.random().toString(36).substring(2)}`;
}
```

### Shared Domain Validators

```typescript
// api-core/src/validators/shared-validators.ts
import { Either, left, right } from '@inh-lib/common';

// ✅ Shared between api-service and api-data
export const validateEmail = (email: unknown): Either<string, string> => {
  if (typeof email !== 'string') {
    return left('Email must be a string');
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return left('Invalid email format');
  }

  return right(email.toLowerCase());
};

// ✅ Shared domain rule
export const validateAge = (age: unknown): Either<string, number> => {
  if (typeof age !== 'number') {
    return left('Age must be a number');
  }

  if (age < 0 || age > 150) {
    return left('Age must be between 0 and 150');
  }

  return right(age);
};
```

### Repository Interfaces

```typescript
// api-core/src/interfaces/user-repository.ts
import { Either } from '@inh-lib/common';
import { User } from '../entities/user';

export interface UserRepository {
  save(user: User): Promise<Either<string, User>>;
  findById(id: string): Promise<Either<string, User | null>>;
  findByEmail(email: string): Promise<Either<string, User | null>>;
  delete(id: string): Promise<Either<string, void>>;
}
```

## API Data (Infrastructure Layer)

### Use Case-Driven Repository Structure

แต่ละ Use Case มี repository, business logic และ data access logic เป็นของตัวเอง:

```
api-data/src/
├── feed-registration-api/           # 🔵 Feature: Feed Registration
│   ├── command/
│   │   ├── addAttachment/           # 🎯 Use Case 1
│   │   │   ├── repository.ts        # Repository implementation (Either)
│   │   │   ├── business.logic.ts    # Data access business logic (Either)
│   │   │   └── dataAccess.logic.ts  # Pure data access functions (Either)
│   │   └── saveRegistration/        # 🎯 Use Case 2  
│   │       ├── repository.ts        # Repository implementation (Either)
│   │       ├── business.logic.ts    # Data access business logic (Either)
│   │       └── dataAccess.logic.ts  # Pure data access functions (Either)
│   └── query/
│       └── getAnimalBreed/          # 🎯 Use Case 3
│           ├── repository.ts        # Repository implementation (Either)
│           ├── business.logic.ts    # Query optimization logic (Either)
│           └── dataAccess.logic.ts  # Pure data access functions (Either)
│
├── document-process-api/            # 🟢 Feature: Document Process
│   ├── command/
│   │   └── createDocument/          # 🎯 Use Case 1
│   │       ├── repository.ts
│   │       ├── business.logic.ts
│   │       └── dataAccess.logic.ts
│   └── query/
│       └── getDocumentStatus/       # 🎯 Use Case 2
│           ├── repository.ts
│           ├── business.logic.ts
│           └── dataAccess.logic.ts
│
└── user-management-api/             # 🟡 Feature: User Management
    ├── command/
    │   └── createUser/              # 🎯 Use Case 1
    │       ├── repository.ts
    │       ├── business.logic.ts
    │       └── dataAccess.logic.ts
    └── query/
        └── getUser/                 # 🎯 Use Case 2
            ├── repository.ts
            ├── business.logic.ts
            └── dataAccess.logic.ts
```

### Repository Implementation per Use Case

#### ✅ **Use Case: Add Attachment**

```typescript
// api-data/src/feed-registration-api/command/addAttachment/repository.ts
import { IAddAttachmentRepository, AddAttachmentInput, AddAttachmentOutput } from '@my-app/api-core';
import { UnifiedRequestContext } from '@inh-lib/unified-route';
import { Either, left, right } from '@inh-lib/common';
import { AddAttachmentBusinessLogic } from './business.logic';

export class AddAttachmentRepository implements IAddAttachmentRepository {
  private businessLogic: AddAttachmentBusinessLogic;

  constructor(private prisma: PrismaClient) {
    this.businessLogic = new AddAttachmentBusinessLogic(prisma);
  }

  async addAttachment(
    context: UnifiedRequestContext, 
    input: AddAttachmentInput
  ): Promise<Either<string, AddAttachmentOutput>> {
    // Repository จัดการเฉพาะ coordination, ไม่มี business logic
    return await this.businessLogic.executeAddAttachment(context, input);
  }
}
```

```typescript
// api-data/src/feed-registration-api/command/addAttachment/business.logic.ts
import { PrismaClient } from '@prisma/client';
import { AddAttachmentInput, AddAttachmentOutput } from '@my-app/api-core';
import { UnifiedRequestContext } from '@inh-lib/unified-route';
import { Either, left, right } from '@inh-lib/common';
import { 
  checkRegistrationExists, 
  checkUserAuthorization, 
  saveAttachmentsBatch,
  getCreatedAttachments 
} from './dataAccess.logic';

/**
 * Data Access Business Logic for Add Attachment Use Case
 * 
 * ประกอบด้วย business logic ที่เกี่ยวข้องกับ data access patterns:
 * - Batch insertion optimization
 * - User authorization checking
 * - Transaction management
 */
export class AddAttachmentBusinessLogic {
  constructor(private prisma: PrismaClient) {}

  async executeAddAttachment(
    context: UnifiedRequestContext, 
    input: AddAttachmentInput
  ): Promise<Either<string, AddAttachmentOutput>> {
    const { registrationId, files, userId, metadata } = input;

    try {
      // Step 1: Check if registration exists
      const registrationCheck = await checkRegistrationExists(this.prisma, registrationId);
      if (registrationCheck.isLeft()) {
        return registrationCheck;
      }

      // Step 2: Check user authorization (data access business logic)
      const authCheck = await checkUserAuthorization(this.prisma, registrationId, userId);
      if (authCheck.isLeft()) {
        return authCheck;
      }

      // Step 3: Save files using batch operation (performance optimization)
      const saveResult = await saveAttachmentsBatch(this.prisma, {
        registrationId,
        files,
        userId,
        metadata
      });

      if (saveResult.isLeft()) {
        return saveResult;
      }

      // Step 4: Get created attachments with optimized query
      const attachmentsResult = await getCreatedAttachments(
        this.prisma, 
        registrationId, 
        userId
      );

      if (attachmentsResult.isLeft()) {
        return attachmentsResult;
      }

      return right({
        registrationId,
        attachments: attachmentsResult.value,
        totalAttached: attachmentsResult.value.length,
        message: `Successfully attached ${attachmentsResult.value.length} files to registration`
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
      return left(`Failed to add attachments: ${errorMessage}`);
    }
  }
}
```

```typescript
// api-data/src/feed-registration-api/command/addAttachment/dataAccess.logic.ts
import { PrismaClient } from '@prisma/client';
import { Either, left, right } from '@inh-lib/common';

/**
 * Pure Data Access Functions for Add Attachment Use Case
 * 
 * ประกอบด้วย pure functions ที่ทำการเข้าถึงข้อมูลเท่านั้น
 * ไม่มี business logic ซับซ้อน
 */

export const checkRegistrationExists = async (
  prisma: PrismaClient, 
  registrationId: string
): Promise<Either<string, boolean>> => {
  try {
    const registration = await prisma.feedRegistration.findUnique({
      where: { id: registrationId },
      select: { id: true }
    });

    if (!registration) {
      return left(`Feed registration with ID ${registrationId} not found`);
    }

    return right(true);
  } catch (error) {
    return left(`Database error checking registration: ${error.message}`);
  }
};

export const checkUserAuthorization = async (
  prisma: PrismaClient, 
  registrationId: string, 
  userId: string
): Promise<Either<string, boolean>> => {
  try {
    const registration = await prisma.feedRegistration.findUnique({
      where: { id: registrationId },
      select: { userId: true }
    });

    if (registration?.userId !== userId) {
      return left('User not authorized to add attachments to this registration');
    }

    return right(true);
  } catch (error) {
    return left(`Database error checking authorization: ${error.message}`);
  }
};

export const saveAttachmentsBatch = async (
  prisma: PrismaClient,
  input: {
    registrationId: string;
    files: FileData[];
    userId: string;
    metadata?: Record<string, unknown>;
  }
): Promise<Either<string, number>> => {
  try {
    const attachmentData = input.files.map(file => ({
      registrationId: input.registrationId,
      fileName: file.fileName,
      fileData: file.fileData,
      contentType: file.contentType,
      description: file.description,
      uploadedBy: input.userId,
      metadata: input.metadata || {},
      createdAt: new Date()
    }));

    const result = await prisma.feedRegistrationAttachment.createMany({
      data: attachmentData,
      skipDuplicates: true
    });

    return right(result.count);
  } catch (error) {
    return left(`Database error saving attachments: ${error.message}`);
  }
};

export const getCreatedAttachments = async (
  prisma: PrismaClient,
  registrationId: string,
  userId: string
): Promise<Either<string, AttachmentInfo[]>> => {
  try {
    const attachments = await prisma.feedRegistrationAttachment.findMany({
      where: {
        registrationId,
        uploadedBy: userId,
        createdAt: {
          gte: new Date(Date.now() - 60000) // Last minute
        }
      },
      select: {
        id: true,
        fileName: true,
        contentType: true,
        description: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const attachmentInfos = attachments.map(attachment => ({
      attachmentId: attachment.id,
      fileName: attachment.fileName,
      contentType: attachment.contentType,
      description: attachment.description,
      uploadedAt: attachment.createdAt
    }));

    return right(attachmentInfos);
  } catch (error) {
    return left(`Database error retrieving attachments: ${error.message}`);
  }
};

interface FileData {
  fileName: string;
  fileData: Buffer;
  contentType: string;
  description?: string;
}

interface AttachmentInfo {
  attachmentId: string;
  fileName: string;
  contentType: string;
  description?: string;
  uploadedAt: Date;
}
```

#### ✅ **Use Case: Save Registration (Upsert Pattern)**

```typescript
// api-data/src/feed-registration-api/command/saveRegistration/business.logic.ts
import { PrismaClient } from '@prisma/client';
import { SaveRegistrationInput, SaveRegistrationOutput } from '@my-app/api-core';
import { UnifiedRequestContext } from '@inh-lib/unified-route';
import { Either, left, right } from '@inh-lib/common';

/**
 * Data Access Business Logic for Save Registration Use Case
 * 
 * ประกอบด้วย business logic ที่เกี่ยวข้องกับ data access patterns:
 * - Upsert logic (insert if not exists, update if exists)
 * - Database-specific optimizations
 * - Transaction management
 */
export class SaveRegistrationBusinessLogic {
  constructor(private prisma: PrismaClient) {}

  async executeSaveRegistration(
    context: UnifiedRequestContext, 
    input: SaveRegistrationInput
  ): Promise<Either<string, SaveRegistrationOutput>> {
    try {
      // 🔥 Data Access Business Logic: ถ้ามี record ให้ update, ถ้าไม่มีให้ insert
      // ใช้ Prisma upsert เพื่อ performance (1 DB call แทน 2-3 calls)
      
      const registration = await this.prisma.feedRegistration.upsert({
        where: {
          // Composite unique key
          animalId_ownerId: {
            animalId: input.animalId,
            ownerId: input.ownerId
          }
        },
        update: {
          // Update existing registration
          registrationDate: input.registrationDate,
          registrationFee: input.registrationFee,
          expiryDate: input.expiryDate,
          status: input.status,
          notes: input.notes,
          updatedAt: new Date(),
          updatedBy: input.userId
        },
        create: {
          // Create new registration
          animalId: input.animalId,
          ownerId: input.ownerId,
          registrationNumber: await this.generateRegistrationNumber(),
          registrationDate: input.registrationDate,
          registrationFee: input.registrationFee,
          expiryDate: input.expiryDate,
          status: input.status,
          notes: input.notes,
          createdAt: new Date(),
          createdBy: input.userId
        },
        include: {
          animal: {
            select: {
              name: true,
              breed: true,
              animalType: true
            }
          },
          owner: {
            select: {
              name: true,
              email: true
            }
          }
        }
      });

      return right({
        registrationId: registration.id,
        registrationNumber: registration.registrationNumber,
        status: registration.status,
        registrationDate: registration.registrationDate,
        expiryDate: registration.expiryDate,
        registrationFee: registration.registrationFee,
        animal: registration.animal,
        owner: registration.owner,
        isNewRegistration: registration.createdAt.getTime() === registration.updatedAt.getTime()
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
      return left(`Failed to save registration: ${errorMessage}`);
    }
  }

  private async generateRegistrationNumber(): Promise<string> {
    // Data access business logic สำหรับ generate unique registration number
    const year = new Date().getFullYear();
    const count = await this.prisma.feedRegistration.count({
      where: {
        registrationNumber: {
          startsWith: `REG${year}`
        }
      }
    });
    
    return `REG${year}${String(count + 1).padStart(6, '0')}`;
  }
}
```

#### ✅ **Alternative Implementation (Raw SQL without Upsert)**

```typescript
// api-data/src/feed-registration-api/command/saveRegistration/business.logic.raw-sql.ts
import { Pool } from 'pg';
import { SaveRegistrationInput, SaveRegistrationOutput } from '@my-app/api-core';
import { UnifiedRequestContext } from '@inh-lib/unified-route';
import { Either, left, right } from '@inh-lib/common';

/**
 * Alternative Implementation for databases ที่ไม่มี upsert
 * 
 * แสดงให้เห็นว่า business logic เดียวกัน แต่ implementation ต่างกัน
 * ตาม database capabilities
 */
export class SaveRegistrationBusinessLogicRawSQL {
  constructor(private db: Pool) {}

  async executeSaveRegistration(
    context: UnifiedRequestContext, 
    input: SaveRegistrationInput
  ): Promise<Either<string, SaveRegistrationOutput>> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');

      // 🔥 Data Access Business Logic: ถ้ามี record ให้ update, ถ้าไม่มีให้ insert
      // Raw SQL ต้องทำ 3 steps เพราะไม่มี upsert
      
      // Step 1: Check if registration exists
      const existingResult = await client.query(
        'SELECT id, registration_number FROM feed_registrations WHERE animal_id = $1 AND owner_id = $2',
        [input.animalId, input.ownerId]
      );

      let registration;
      let isNewRegistration: boolean;

      if (existingResult.rows.length > 0) {
        // Step 2: Update existing registration
        const updateResult = await client.query(`
          UPDATE feed_registrations 
          SET registration_date = $3,
              registration_fee = $4,
              expiry_date = $5,
              status = $6,
              notes = $7,
              updated_at = NOW(),
              updated_by = $8
          WHERE animal_id = $1 AND owner_id = $2
          RETURNING *
        `, [
          input.animalId, input.ownerId, input.registrationDate,
          input.registrationFee, input.expiryDate, input.status,
          input.notes, input.userId
        ]);
        
        registration = updateResult.rows[0];
        isNewRegistration = false;
      } else {
        // Step 3: Create new registration
        const registrationNumber = await this.generateRegistrationNumber(client);
        
        const insertResult = await client.query(`
          INSERT INTO feed_registrations (
            animal_id, owner_id, registration_number, registration_date,
            registration_fee, expiry_date, status, notes, created_at, created_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9)
          RETURNING *
        `, [
          input.animalId, input.ownerId, registrationNumber, input.registrationDate,
          input.registrationFee, input.expiryDate, input.status,
          input.notes, input.userId
        ]);
        
        registration = insertResult.rows[0];
        isNewRegistration = true;
      }

      await client.query('COMMIT');

      return right({
        registrationId: registration.id,
        registrationNumber: registration.registration_number,
        status: registration.status,
        registrationDate: registration.registration_date,
        expiryDate: registration.expiry_date,
        registrationFee: registration.registration_fee,
        isNewRegistration
      });

    } catch (error) {
      await client.query('ROLLBACK');
      const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
      return left(`Failed to save registration: ${errorMessage}`);
    } finally {
      client.release();
    }
  }

  private async generateRegistrationNumber(client: any): Promise<string> {
    // Same business logic, different implementation
    const year = new Date().getFullYear();
    const countResult = await client.query(
      'SELECT COUNT(*) FROM feed_registrations WHERE registration_number LIKE $1',
      [`REG${year}%`]
    );
    
    const count = parseInt(countResult.rows[0].count);
    return `REG${year}${String(count + 1).padStart(6, '0')}`;
  }
}

export class GetAnimalBreedRepository implements IGetAnimalBreedRepository {
  constructor(private prisma: PrismaClient) {}

  async getAnimalBreeds(
    context: UnifiedRequestContext, 
    input: AnimalBreedQueryInput
  ): Promise<Either<string, AnimalBreedOutput>> {
    const { animalType, searchTerm, isActive, limit, offset } = input;

    try {
      // Build dynamic where clause
      const whereClause: any = {};

      if (animalType) {
        whereClause.animalType = animalType;
      }

      if (searchTerm) {
        whereClause.OR = [
          { breedName: { contains: searchTerm, mode: 'insensitive' } },
          { breedCode: { contains: searchTerm, mode: 'insensitive' } },
          { description: { contains: searchTerm, mode: 'insensitive' } }
        ];
      }

      if (typeof isActive === 'boolean') {
        whereClause.isActive = isActive;
      }

      // Execute query with pagination
      const [breeds, totalCount] = await Promise.all([
        this.prisma.animalBreed.findMany({
          where: whereClause,
          orderBy: [
            { animalType: 'asc' },
            { breedName: 'asc' }
          ],
          take: limit || 50,
          skip: offset || 0,
          select: {
            id: true,
            breedCode: true,
            breedName: true,
            animalType: true,
            description: true,
            isActive: true,
            characteristics: true,
            originCountry: true,
            registrationRequirements: true,
            createdAt: true,
            updatedAt: true
          }
        }),
        this.prisma.animalBreed.count({ where: whereClause })
      ]);

      if (breeds.length === 0) {
        return right({
          breeds: [],
          totalCount: 0,
          hasMore: false,
          currentPage: Math.floor((offset || 0) / (limit || 50)) + 1,
          message: 'No animal breeds found matching the criteria'
        });
      }

      const currentPage = Math.floor((offset || 0) / (limit || 50)) + 1;
      const totalPages = Math.ceil(totalCount / (limit || 50));
      const hasMore = currentPage < totalPages;

      return right({
        breeds: breeds.map(breed => ({
          id: breed.id,
          breedCode: breed.breedCode,
          breedName: breed.breedName,
          animalType: breed.animalType,
          description: breed.description,
          isActive: breed.isActive,
          characteristics: breed.characteristics,
          originCountry: breed.originCountry,
          registrationRequirements: breed.registrationRequirements,
          lastUpdated: breed.updatedAt
        })),
        totalCount,
        hasMore,
        currentPage,
        totalPages,
        message: `Found ${breeds.length} animal breeds`
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
      return left(`Failed to retrieve animal breeds: ${errorMessage}`);
    }
  }
}
```

### Feature Database Schema Mapping

Each feature maps to dedicated database schemas:

```sql
-- Feed Registration API Schema (feed_registration)
-- Tables: feed_registrations, feed_registration_attachments, animal_breeds, etc.

CREATE SCHEMA IF NOT EXISTS feed_registration;

CREATE TABLE feed_registration.feed_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  animal_type VARCHAR(100) NOT NULL,
  breed_id UUID REFERENCES feed_registration.animal_breeds(id),
  registration_number VARCHAR(50) UNIQUE,
  status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE feed_registration.feed_registration_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id UUID REFERENCES feed_registration.feed_registrations(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_data BYTEA NOT NULL,
  content_type VARCHAR(100) NOT NULL,
  description TEXT,
  uploaded_by VARCHAR(255) NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE feed_registration.animal_breeds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  breed_code VARCHAR(20) UNIQUE NOT NULL,
  breed_name VARCHAR(100) NOT NULL,
  animal_type VARCHAR(100) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  characteristics JSONB DEFAULT '{}',
  origin_country VARCHAR(100),
  registration_requirements JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Document Process API Schema (document_process)
-- Tables: document_processes, document_templates, process_steps, etc.

CREATE SCHEMA IF NOT EXISTS document_process;

CREATE TABLE document_process.document_processes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  process_name VARCHAR(255) NOT NULL,
  process_type VARCHAR(100) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
  created_by VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Management API Schema (user_management)
-- Tables: users, user_profiles, user_permissions, etc.

CREATE SCHEMA IF NOT EXISTS user_management;

CREATE TABLE user_management.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Use Case Repository Dependency Injection

#### ✅ **Context Keys per Use Case**

```typescript
// api-data/src/di/context-keys.ts
// แต่ละ use case มี context key เฉพาะตัว

// Feed Registration Feature Context Keys
export const FeedRegistrationContextKeys = {
  // Command Use Cases
  ADD_ATTACHMENT_REPOSITORY: 'feed-registration.command.add-attachment.repository',
  SAVE_REGISTRATION_REPOSITORY: 'feed-registration.command.save-registration.repository',
  
  // Query Use Cases
  GET_ANIMAL_BREED_REPOSITORY: 'feed-registration.query.get-animal-breed.repository',
  SEARCH_REGISTRATIONS_REPOSITORY: 'feed-registration.query.search-registrations.repository'
} as const;

// Document Process Feature Context Keys
export const DocumentProcessContextKeys = {
  // Command Use Cases
  CREATE_DOCUMENT_REPOSITORY: 'document-process.command.create-document.repository',
  UPDATE_DOCUMENT_STATUS_REPOSITORY: 'document-process.command.update-status.repository',
  
  // Query Use Cases
  GET_DOCUMENT_STATUS_REPOSITORY: 'document-process.query.get-status.repository',
  LIST_DOCUMENTS_REPOSITORY: 'document-process.query.list-documents.repository'
} as const;

// User Management Feature Context Keys
export const UserManagementContextKeys = {
  // Command Use Cases
  CREATE_USER_REPOSITORY: 'user-management.command.create-user.repository',
  UPDATE_USER_REPOSITORY: 'user-management.command.update-user.repository',
  
  // Query Use Cases
  GET_USER_REPOSITORY: 'user-management.query.get-user.repository',
  SEARCH_USERS_REPOSITORY: 'user-management.query.search-users.repository'
} as const;
```

#### ✅ **Use Case Repository Registry**

```typescript
// api-data/src/di/use-case-repositories.registry.ts
import { PrismaClient } from '@prisma/client';

// Feed Registration Use Case Repositories
import { AddAttachmentRepository } from '../feed-registration-api/command/addAttachment/repository';
import { SaveRegistrationRepository } from '../feed-registration-api/command/saveRegistration/repository';
import { GetAnimalBreedRepository } from '../feed-registration-api/query/getAnimalBreed/repository';
import { SearchRegistrationsRepository } from '../feed-registration-api/query/searchRegistrations/repository';

// Document Process Use Case Repositories
import { CreateDocumentRepository } from '../document-process-api/command/createDocument/repository';
import { UpdateDocumentStatusRepository } from '../document-process-api/command/updateDocumentStatus/repository';
import { GetDocumentStatusRepository } from '../document-process-api/query/getDocumentStatus/repository';
import { ListDocumentsRepository } from '../document-process-api/query/listDocuments/repository';

// User Management Use Case Repositories
import { CreateUserRepository } from '../user-management-api/command/createUser/repository';
import { UpdateUserRepository } from '../user-management-api/command/updateUser/repository';
import { GetUserRepository } from '../user-management-api/query/getUser/repository';
import { SearchUsersRepository } from '../user-management-api/query/searchUsers/repository';

/**
 * Registry สำหรับสร้าง repository instances ตาม use case
 * แต่ละ method สร้าง repository สำหรับ use case เฉพาะ
 */
export class UseCaseRepositoriesRegistry {
  constructor(private prisma: PrismaClient) {}

  // 🔵 Feed Registration Feature Use Case Repositories
  
  // Command Use Cases
  createAddAttachmentRepository(): AddAttachmentRepository {
    return new AddAttachmentRepository(this.prisma);
  }

  createSaveRegistrationRepository(): SaveRegistrationRepository {
    return new SaveRegistrationRepository(this.prisma);
  }

  // Query Use Cases
  createGetAnimalBreedRepository(): GetAnimalBreedRepository {
    return new GetAnimalBreedRepository(this.prisma);
  }

  createSearchRegistrationsRepository(): SearchRegistrationsRepository {
    return new SearchRegistrationsRepository(this.prisma);
  }

  // 🟢 Document Process Feature Use Case Repositories
  
  // Command Use Cases
  createCreateDocumentRepository(): CreateDocumentRepository {
    return new CreateDocumentRepository(this.prisma);
  }

  createUpdateDocumentStatusRepository(): UpdateDocumentStatusRepository {
    return new UpdateDocumentStatusRepository(this.prisma);
  }

  // Query Use Cases
  createGetDocumentStatusRepository(): GetDocumentStatusRepository {
    return new GetDocumentStatusRepository(this.prisma);
  }

  createListDocumentsRepository(): ListDocumentsRepository {
    return new ListDocumentsRepository(this.prisma);
  }

  // 🟡 User Management Feature Use Case Repositories
  
  // Command Use Cases
  createCreateUserRepository(): CreateUserRepository {
    return new CreateUserRepository(this.prisma);
  }

  createUpdateUserRepository(): UpdateUserRepository {
    return new UpdateUserRepository(this.prisma);
  }

  // Query Use Cases
  createGetUserRepository(): GetUserRepository {
    return new GetUserRepository(this.prisma);
  }

  createSearchUsersRepository(): SearchUsersRepository {
    return new SearchUsersRepository(this.prisma);
  }

  // 🎯 Helper: Get all repositories for a specific feature
  getFeedRegistrationRepositories() {
    return {
      // Commands
      addAttachment: this.createAddAttachmentRepository(),
      saveRegistration: this.createSaveRegistrationRepository(),
      
      // Queries
      getAnimalBreed: this.createGetAnimalBreedRepository(),
      searchRegistrations: this.createSearchRegistrationsRepository()
    };
  }

  getDocumentProcessRepositories() {
    return {
      // Commands
      createDocument: this.createCreateDocumentRepository(),
      updateDocumentStatus: this.createUpdateDocumentStatusRepository(),
      
      // Queries
      getDocumentStatus: this.createGetDocumentStatusRepository(),
      listDocuments: this.createListDocumentsRepository()
    };
  }

  getUserManagementRepositories() {
    return {
      // Commands
      createUser: this.createCreateUserRepository(),
      updateUser: this.createUpdateUserRepository(),
      
      // Queries
      getUser: this.createGetUserRepository(),
      searchUsers: this.createSearchUsersRepository()
    };
  }
}
```

#### ✅ **Feature Route Registration with Use Case Repository Injection**

```typescript
// node-app/apps/webapi-mcsfastify/src/app.ts - การ register routes แยกตาม feature และ use case
import Fastify from 'fastify';
import { createUnifiedFastifyHandler } from '@inh-lib/api-util-fastify';
import { UseCaseRepositoriesRegistry } from '@my-app/api-data';
import { 
  FeedRegistrationContextKeys, 
  DocumentProcessContextKeys, 
  UserManagementContextKeys 
} from '@my-app/api-data';

const fastify = Fastify({ logger: true });
const useCaseRepositoriesRegistry = new UseCaseRepositoriesRegistry(prismaClient);

// 🔵 Feed Registration Feature Routes
fastify.register(async function feedRegistrationFeature(fastify) {
  // Inject repositories ตาม use case ที่ feature นี้ต้องการ
  fastify.addHook('preHandler', async (request) => {
    if (!request.unifiedAppContext) {
      request.unifiedAppContext = { request: {} as any, response: {} as any, registry: {} };
    }
    
    // ✅ Inject เฉพาะ repositories สำหรับ use cases ของ feed registration
    request.unifiedAppContext.registry[FeedRegistrationContextKeys.ADD_ATTACHMENT_REPOSITORY] = 
      useCaseRepositoriesRegistry.createAddAttachmentRepository();
      
    request.unifiedAppContext.registry[FeedRegistrationContextKeys.SAVE_REGISTRATION_REPOSITORY] = 
      useCaseRepositoriesRegistry.createSaveRegistrationRepository();
      
    request.unifiedAppContext.registry[FeedRegistrationContextKeys.GET_ANIMAL_BREED_REPOSITORY] = 
      useCaseRepositoriesRegistry.createGetAnimalBreedRepository();
      
    request.unifiedAppContext.registry[FeedRegistrationContextKeys.SEARCH_REGISTRATIONS_REPOSITORY] = 
      useCaseRepositoriesRegistry.createSearchRegistrationsRepository();
  });
  
  // Feed Registration endpoints - แต่ละ endpoint ใช้ repository ของ use case เฉพาะ
  fastify.post('/api/feed-registration/attachments', 
    createUnifiedFastifyHandler(addAttachmentEndpointV1));  // ใช้ ADD_ATTACHMENT_REPOSITORY
    
  fastify.post('/api/feed-registration/registrations', 
    createUnifiedFastifyHandler(saveRegistrationEndpointV1));  // ใช้ SAVE_REGISTRATION_REPOSITORY
    
  fastify.get('/api/feed-registration/animal-breeds', 
    createUnifiedFastifyHandler(getAnimalBreedEndpointV1));  // ใช้ GET_ANIMAL_BREED_REPOSITORY
    
  fastify.get('/api/feed-registration/search', 
    createUnifiedFastifyHandler(searchRegistrationsEndpointV1));  // ใช้ SEARCH_REGISTRATIONS_REPOSITORY
});

// 🟢 Document Process Feature Routes
fastify.register(async function documentProcessFeature(fastify) {
  // Inject repositories ตาม use case ที่ feature นี้ต้องการ
  fastify.addHook('preHandler', async (request) => {
    if (!request.unifiedAppContext) {
      request.unifiedAppContext = { request: {} as any, response: {} as any, registry: {} };
    }
    
    // ✅ Inject เฉพาะ repositories สำหรับ use cases ของ document process
    request.unifiedAppContext.registry[DocumentProcessContextKeys.CREATE_DOCUMENT_REPOSITORY] = 
      useCaseRepositoriesRegistry.createCreateDocumentRepository();
      
    request.unifiedAppContext.registry[DocumentProcessContextKeys.UPDATE_DOCUMENT_STATUS_REPOSITORY] = 
      useCaseRepositoriesRegistry.createUpdateDocumentStatusRepository();
      
    request.unifiedAppContext.registry[DocumentProcessContextKeys.GET_DOCUMENT_STATUS_REPOSITORY] = 
      useCaseRepositoriesRegistry.createGetDocumentStatusRepository();
      
    request.unifiedAppContext.registry[DocumentProcessContextKeys.LIST_DOCUMENTS_REPOSITORY] = 
      useCaseRepositoriesRegistry.createListDocumentsRepository();
  });
  
  // Document Process endpoints
  fastify.post('/api/document-process/documents', 
    createUnifiedFastifyHandler(createDocumentEndpointV1));  // ใช้ CREATE_DOCUMENT_REPOSITORY
    
  fastify.patch('/api/document-process/documents/:id/status', 
    createUnifiedFastifyHandler(updateDocumentStatusEndpointV1));  // ใช้ UPDATE_DOCUMENT_STATUS_REPOSITORY
    
  fastify.get('/api/document-process/documents/:id/status', 
    createUnifiedFastifyHandler(getDocumentStatusEndpointV1));  // ใช้ GET_DOCUMENT_STATUS_REPOSITORY
    
  fastify.get('/api/document-process/documents', 
    createUnifiedFastifyHandler(listDocumentsEndpointV1));  // ใช้ LIST_DOCUMENTS_REPOSITORY
});

// 🟡 User Management Feature Routes
fastify.register(async function userManagementFeature(fastify) {
  // Inject repositories ตาม use case ที่ feature นี้ต้องการ
  fastify.addHook('preHandler', async (request) => {
    if (!request.unifiedAppContext) {
      request.unifiedAppContext = { request: {} as any, response: {} as any, registry: {} };
    }
    
    // ✅ Inject เฉพาะ repositories สำหรับ use cases ของ user management
    request.unifiedAppContext.registry[UserManagementContextKeys.CREATE_USER_REPOSITORY] = 
      useCaseRepositoriesRegistry.createCreateUserRepository();
      
    request.unifiedAppContext.registry[UserManagementContextKeys.UPDATE_USER_REPOSITORY] = 
      useCaseRepositoriesRegistry.createUpdateUserRepository();
      
    request.unifiedAppContext.registry[UserManagementContextKeys.GET_USER_REPOSITORY] = 
      useCaseRepositoriesRegistry.createGetUserRepository();
      
    request.unifiedAppContext.registry[UserManagementContextKeys.SEARCH_USERS_REPOSITORY] = 
      useCaseRepositoriesRegistry.createSearchUsersRepository();
  });
  
  // User Management endpoints
  fastify.post('/api/user-management/users', 
    createUnifiedFastifyHandler(createUserEndpointV1));  // ใช้ CREATE_USER_REPOSITORY
    
  fastify.patch('/api/user-management/users/:id', 
    createUnifiedFastifyHandler(updateUserEndpointV1));  // ใช้ UPDATE_USER_REPOSITORY
    
  fastify.get('/api/user-management/users/:id', 
    createUnifiedFastifyHandler(getUserEndpointV1));  // ใช้ GET_USER_REPOSITORY
    
  fastify.get('/api/user-management/users/search', 
    createUnifiedFastifyHandler(searchUsersEndpointV1));  // ใช้ SEARCH_USERS_REPOSITORY
});

export default fastify;
```

#### 🎯 **ประโยชน์ของ Use Case-Driven Repository Structure**

##### ✅ **1. Single Responsibility per Repository**
- แต่ละ repository มีหน้าที่แค่ use case เดียว
- ไม่มี shared methods ที่อาจทำให้เกิด side effects
- ง่ายต่อการเข้าใจและ maintain

##### ✅ **2. Data Access Business Logic Isolation**
- Business logic ที่เกี่ยวข้องกับ database patterns อยู่ใน infrastructure layer
- Application layer ไม่ต้องรู้เรื่อง upsert, transactions, หรือ database optimizations
- สามารถเปลี่ยน database implementation ได้โดยไม่กระทบ application logic

##### ✅ **3. Performance Optimization per Use Case**
```typescript
// ✅ แต่ละ use case optimize ได้เฉพาะ
// Add Attachment: Batch insert optimization
await prisma.attachment.createMany({ data: attachmentData, skipDuplicates: true });

// Save Registration: Upsert optimization  
await prisma.registration.upsert({ where: {...}, update: {...}, create: {...} });

// Search Registrations: Index optimization
await prisma.registration.findMany({ 
  where: complexWhereClause,
  include: optimizedIncludes,  // เฉพาะข้อมูลที่ search ต้องการ
  orderBy: searchSpecificOrder
});
```

##### ✅ **4. Independent Development & Testing**
```typescript
// Test เฉพาะ use case โดยไม่ต้องกังวลเรื่อง methods อื่น
describe('AddAttachmentRepository', () => {
  it('should handle batch file upload with authorization check', async () => {
    // Test เฉพาะ add attachment business logic
    // ไม่ต้องกังวลว่า save registration หรือ search จะกระทบ
  });
});

describe('SaveRegistrationRepository', () => {
  it('should upsert registration correctly', async () => {
    // Test เฉพาะ save registration business logic
    // ไม่ต้องกังวลว่า add attachment จะกระทบ
  });
});
```

##### ✅ **5. Clear Database Schema Boundaries**
```typescript
// แต่ละ use case repository จัดการเฉพาะ tables ที่เกี่ยวข้อง
// AddAttachmentRepository:
// - feed_registration.registrations (read for validation)
// - feed_registration.attachments (write)

// SaveRegistrationRepository:  
// - feed_registration.registrations (upsert)
// - feed_registration.animal_breeds (read for validation)

// GetAnimalBreedRepository:
// - feed_registration.animal_breeds (read only)
```

#### � **เปรียบเทียบกับ Traditional Repository Pattern**

##### ❌ **Traditional Repository (Entity-Based)**
```typescript
// ❌ ปัญหา: Repository ใหญ่มีหลาย responsibilities
class RegistrationRepository {
  async create(data) { /* logic 1 */ }
  async update(id, data) { /* logic 2 */ }
  async findById(id) { /* logic 3 */ }
  async search(criteria) { /* logic 4 */ }
  async addAttachment(regId, files) { /* logic 5 */ }
  async getAttachments(regId) { /* logic 6 */ }
  // ... อีกหลาย methods
  
  // ปัญหา:
  // 1. ยาก test - ต้อง mock หลาย methods
  // 2. ยาก maintain - แก้ method หนึ่งอาจกระทบอย่างอื่น  
  // 3. ยาก optimize - methods ใช้ table เดียวกันแต่ต้องการ optimization ต่างกัน
}
```

##### ✅ **Use Case-Driven Repository**
```typescript
// ✅ ข้อดี: แต่ละ repository มี responsibility ชัดเจน
class SaveRegistrationRepository {
  async save(data) {
    // เฉพาะ business logic สำหรับ save registration
    // - upsert optimization
    // - registration number generation
    // - validation logic
  }
}

class AddAttachmentRepository {
  async addAttachment(files) {
    // เฉพาะ business logic สำหรับ add attachment
    // - batch upload optimization
    // - authorization check
    // - file validation
  }
}

class SearchRegistrationsRepository {
  async search(criteria) {
    // เฉพาะ business logic สำหรับ search
    // - complex query optimization
    // - pagination logic
    // - search index usage
  }
}
```

#### 🚨 **ข้อควรระวังและ Best Practices**

##### ⚠️ **1. ไม่ควรแชร์ Business Logic ระหว่าง Use Cases**
```typescript
// ❌ ผิด: แชร์ business logic
class SharedRegistrationLogic {
  static generateRegistrationNumber() { /* shared logic */ }
}

// ✅ ถูก: แยก business logic ตาม use case
// api-data/src/feed-registration-api/command/saveRegistration/business.logic.ts
export class SaveRegistrationBusinessLogic {
  private async generateRegistrationNumber() {
    // Business logic เฉพาะ save registration use case
  }
}

// api-data/src/feed-registration-api/command/renewRegistration/business.logic.ts  
export class RenewRegistrationBusinessLogic {
  private async generateRenewalNumber() {
    // Business logic เฉพาะ renew registration use case (อาจต่างจาก save)
  }
}
```

##### ⚠️ **2. การจัดการ Shared Data Access Functions**
```typescript
// ✅ ถูก: Shared data access functions (ไม่ใช่ business logic)
// api-data/src/shared/data-access/common.functions.ts
export const findRegistrationById = async (prisma: PrismaClient, id: string) => {
  // Pure data access function - ไม่มี business logic
  return await prisma.registration.findUnique({ where: { id } });
};

// Use cases สามารถใช้ shared data access functions ได้
// api-data/src/feed-registration-api/command/addAttachment/dataAccess.logic.ts
import { findRegistrationById } from '../../../shared/data-access/common.functions';

export const checkRegistrationExists = async (prisma: PrismaClient, id: string) => {
  const registration = await findRegistrationById(prisma, id);
  return registration ? right(registration) : left('Registration not found');
};
```

##### ⚠️ **3. Transaction Management ข้าม Use Cases**
```typescript
// ✅ ถูก: ใช้ application layer orchestrate ข้าม use cases
// api-service/src/feed-registration-api/command/completeRegistration/logic/business.logic.ts
export const processCompleteRegistration = async (inputArgs) => {
  const { saveRegistrationRepo, addAttachmentRepo, notificationRepo } = inputArgs;
  
  // Application layer จัดการ transaction ข้าม use cases
  return await prisma.$transaction(async (tx) => {
    // Step 1: Save registration
    const registrationResult = await saveRegistrationRepo.save(tx, registrationData);
    if (registrationResult.isLeft()) return registrationResult;
    
    // Step 2: Add required attachments
    const attachmentResult = await addAttachmentRepo.addAttachment(tx, attachmentData);
    if (attachmentResult.isLeft()) return attachmentResult;
    
    // Step 3: Send notification
    const notificationResult = await notificationRepo.sendConfirmation(tx, notificationData);
    if (notificationResult.isLeft()) return notificationResult;
    
    return right({ registration: registrationResult.value, attachments: attachmentResult.value });
  });
};
```

#### 📋 **สรุป Use Case-Driven Repository Benefits**

**Use Case-Driven Repository Structure** หมายถึงการออกแบบระบบให้:

1. **แต่ละ Use Case มี Repository เป็นของตัวเอง** - ไม่แชร์กับ use cases อื่น
2. **Data Access Business Logic อยู่ใน Infrastructure Layer** - upsert, optimization, database patterns
3. **Single Responsibility per Repository** - แต่ละ repository มีหน้าที่ชัดเจน
4. **Performance Optimization per Use Case** - optimize ตาม workload ของแต่ละ use case
5. **Independent Development & Testing** - พัฒนา test และ maintain แยกกันได้
6. **Clear Database Schema Boundaries** - แต่ละ use case จัดการเฉพาะ tables ที่เกี่ยวข้อง

วิธีนี้ทำให้ระบบมี **clear separation of concerns**, **easy maintenance**, **better performance optimization** และ **independent scaling** โดยเฉพาะใน **complex business domains** ที่มี use cases หลากหลายครับ! 🚀

### Repository Dependency Injection

```typescript
// api-data/src/external-apis/email-service.ts
import { eitherFromOperation, Either } from '@inh-lib/common';

export interface EmailService {
  sendWelcomeEmail(email: string): Promise<Either<string, void>>;
  sendPasswordReset(email: string, token: string): Promise<Either<string, void>>;
}

export class ExternalEmailService implements EmailService {
  constructor(
    private apiKey: string,
    private baseUrl: string
  ) {}

  async sendWelcomeEmail(email: string): Promise<Either<string, void>> {
    return eitherFromOperation(
      async () => {
        const response = await fetch(`${this.baseUrl}/send`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            to: email,
            template: 'welcome',
            subject: 'Welcome to our platform!'
          })
        });

        if (!response.ok) {
          throw new Error(`Email service responded with ${response.status}`);
        }
      },
      (error) => `Email service error: ${error.message}`
    );
  }

  async sendPasswordReset(email: string, token: string): Promise<Either<string, void>> {
    return eitherFromOperation(
      async () => {
        const response = await fetch(`${this.baseUrl}/send`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            to: email,
            template: 'password-reset',
            subject: 'Reset your password',
            variables: {
              resetToken: token,
              resetUrl: `https://app.example.com/reset?token=${token}`
            }
          })
        });

        if (!response.ok) {
          throw new Error(`Email service responded with ${response.status}`);
        }
      },
      (error) => `Password reset email error: ${error.message}`
    );
  }
}
```

### Cache Implementation

```typescript
// api-data/src/cache/redis-cache.ts
import { eitherFromOperation, Either } from '@inh-lib/common';
import { Redis } from 'ioredis';

export class RedisCache {
  constructor(private redis: Redis) {}

  async get<T>(key: string): Promise<Either<string, T | null>> {
    return eitherFromOperation(
      async () => {
        const value = await this.redis.get(key);
        if (value === null) return null;
        
        try {
          return JSON.parse(value) as T;
        } catch (error) {
          throw new Error(`Failed to parse cached value for key ${key}`);
        }
      },
      (error) => `Cache get error for key ${key}: ${error.message}`
    );
  }

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<Either<string, void>> {
    return eitherFromOperation(
      async () => {
        const serialized = JSON.stringify(value);
        if (ttlSeconds) {
          await this.redis.setex(key, ttlSeconds, serialized);
        } else {
          await this.redis.set(key, serialized);
        }
      },
      (error) => `Cache set error for key ${key}: ${error.message}`
    );
  }

  async delete(key: string): Promise<Either<string, void>> {
    return eitherFromOperation(
      async () => {
        await this.redis.del(key);
      },
      (error) => `Cache delete error for key ${key}: ${error.message}`
    );
  }
}
```

## Real-world Feature Examples

### Complete User Registration Use Case

ตัวอย่างที่แสดงการทำงานครบทุก layer ตามโครงสร้าง Use Case Driven:

#### 1. Controller (api-service)

```typescript
// api-service/src/controllers/user-controller.ts
import { UnifiedRouteHandler } from '@inh-lib/unified-route';
import { CreateUserUseCase } from '../use-cases/create-user-use-case';

export const registerUserHandler: UnifiedRouteHandler = async (context) => {
  const { request, response } = context;
  const createUserUseCase = context.registry.createUserUseCase as CreateUserUseCase;
  
  try {
    const result = await createUserUseCase.execute(request.body);
    
    if (result.isSuccess) {
      response.status(201).json({
        success: true,
        data: {
          id: result.data.id,
          name: result.data.name,
          email: result.data.email,
          canVote: result.data.canVote()
        },
        message: 'User registered successfully'
      });
    } else {
      response.status(400).json({
        success: false,
        error: result.error,
        message: 'Registration failed'
      });
    }
  } catch (error) {
    response.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};
```

#### 2. Use Case (api-service) 

```typescript
// api-service/src/use-cases/create-user-use-case.ts
import { Result, eitherToResult } from '@inh-lib/common';
import { User, UserRepository } from '@my-app/api-core';
import { EmailService } from '@my-app/api-data';
import { validateUserRegistration } from '../validators/user-validators';

export class CreateUserUseCase {
  constructor(
    private userRepository: UserRepository,
    private emailService: EmailService,
    private logger: Logger
  ) {}

  async execute(requestData: unknown): Promise<Result<User, string>> {
    // 1. Validate input (use case specific validation)
    const validationResult = validateUserRegistration(requestData);
    if (validationResult.isLeft()) {
      return Result.fail(validationResult.value);
    }

    const userData = validationResult.value;

    // 2. Check existing user
    const existingUserResult = await this.userRepository.findByEmail(userData.email);
    if (existingUserResult.isLeft()) {
      return eitherToResult(existingUserResult);
    }

    if (existingUserResult.value !== null) {
      return Result.fail('User with this email already exists');
    }

    // 3. Create domain entity (uses shared domain logic)
    const userEntityResult = User.create(userData);
    if (userEntityResult.isLeft()) {
      return eitherToResult(userEntityResult);
    }

    // 4. Save user 
    const saveResult = await this.userRepository.save(userEntityResult.value);
    if (saveResult.isLeft()) {
      return eitherToResult(saveResult);
    }

    // 5. Send welcome email (infrastructure operation)
    const emailResult = await this.emailService.sendWelcomeEmail(userData.email);
    if (emailResult.isLeft()) {
      // Log error but don't fail the entire use case
      this.logger.warn(`Failed to send welcome email: ${emailResult.value}`);
    }

    return Result.ok(saveResult.value);
  }
}
```

#### 3. Domain Entity (api-core)

```typescript
// api-core/src/entities/user.ts - Already shown above
// Contains shared business rules like age validation, canVote(), etc.
```

#### 4. Repository Implementation (api-data)

```typescript
// api-data/src/repositories/postgres-user-repository.ts - Already shown above  
// Handles database operations with eitherFromOperation
```

### Fastify Application Setup

```typescript
// api-service/src/app.ts
import Fastify from 'fastify';
import { createUnifiedFastifyHandler } from '@inh-lib/api-util-fastify';
import { registerUserHandler } from './controllers/user-controller';
import { CreateUserUseCase } from './use-cases/create-user-use-case';
import { PostgresUserRepository } from '@my-app/api-data';
import { ExternalEmailService } from '@my-app/api-data';
import { Pool } from 'pg';

const fastify = Fastify({ logger: true });

// Setup dependencies
const dbPool = new Pool({ connectionString: process.env.DATABASE_URL });
const userRepository = new PostgresUserRepository(dbPool);
const emailService = new ExternalEmailService(
  process.env.EMAIL_API_KEY!, 
  process.env.EMAIL_SERVICE_URL!
);

const createUserUseCase = new CreateUserUseCase(
  userRepository,
  emailService,
  fastify.log
);

// Register routes
fastify.register(async function (fastify) {
  // Dependency injection
  fastify.addHook('preHandler', async (request) => {
    if (!request.unifiedAppContext) {
      request.unifiedAppContext = {
        request: {} as any,
        response: {} as any,
        registry: {}
      };
    }
    
    request.unifiedAppContext.registry.createUserUseCase = createUserUseCase;
  });
  
  // Routes
  fastify.post('/api/users/register', createUnifiedFastifyHandler(registerUserHandler));
});

export default fastify;
export default fastify;
```

## Best Practices

### 🎯 **Feature Organization Guidelines**

#### ✅ **When to put logic in api-core (Domain)**:
```typescript
// ✅ Repository contracts shared between api-service and api-data
export interface IAddAttachmentRepository {
  addAttachment(context: UnifiedHttpContext, input: AddAttachmentInput): Promise<Result<AddAttachmentOutput, BaseFailure>>;
}

// ✅ Domain types and failures
export type AddAttachmentInput = {
  registrationId: string;
  files: FileData[];
};

export class InvalidFileType extends BaseFailure {
  constructor(fileType: string) {
    super('INVALID_FILE_TYPE', `File type ${fileType} is not allowed`);
  }
}

// ✅ Domain constants
export const BUSINESS_RULES = {
  MAX_ATTACHMENTS: 10,
  MAX_FILE_SIZE_MB: 50,
  ALLOWED_FILE_TYPES: ['pdf', 'jpg', 'jpeg', 'png']
} as const;
```

#### ✅ **When to keep logic in api-service (Application)**:
```typescript
// ✅ Feature-specific orchestration logic
export class AddAttachmentEndpointV1 {
  async execute(context: UnifiedHttpContext): Promise<void> {
    // Orchestration logic specific to this endpoint
    const pipeline = protectApiPipeline.setHandler(this.handler);
    await pipeline.execute(context);
  }
}

// ✅ Feature-specific business workflows
export const processBusinessLogic: ExecutionAsyncFn = async (inputArgs) => {
  // Business workflow specific to add-attachment feature
  const repository = inputArgs.addAttachmentRepository;
  return await repository.addAttachment(inputArgs.context, inputArgs.input);
};
```

#### ✅ **When to implement in api-data (Infrastructure)**:
```typescript
// ✅ Database operations for specific feature
export class AddAttachmentRepository implements IAddAttachmentRepository {
  async addAttachment(context: UnifiedHttpContext, input: AddAttachmentInput): Promise<Result<AddAttachmentOutput, BaseFailure>> {
    return eitherToResult(
      await eitherFromOperation(
        async () => {
          // Database operations using Prisma for feed_registration schema
          const result = await this.prisma.attachment.create({
            data: { ... }
          });
          return result;
        },
        (error) => `Database error: ${error.message}`
      )
    );
  }
}
```

### 🏗️ **Feature Driven Patterns**

#### ✅ **Complete Feature Example (feed-registration-api)**:

**api-core/feed-registration-api/command/add-attachment/**
```typescript
// contract.ts - Repository interface
export interface IAddAttachmentRepository {
  addAttachment(context: UnifiedHttpContext, input: AddAttachmentInput): Promise<Result<AddAttachmentOutput, BaseFailure>>;
}

// type.ts - Domain types
export type AddAttachmentInput = {
  registrationId: string;
  files: FileData[];
  userId: string;
};

export type AddAttachmentOutput = {
  attachmentId: string;
  uploadedFiles: UploadedFile[];
  status: 'success' | 'partial';
};

// failure.ts - Domain failures
export class InvalidFileType extends BaseFailure {
  constructor(fileType: string, allowedTypes: string[]) {
    super('INVALID_FILE_TYPE', `File type ${fileType} not allowed. Allowed: ${allowedTypes.join(', ')}`);
  }
}
```

**api-service/feed-registration-api/command/add-attachment/**
```typescript
// endpoint/v1.endpoint.ts - HTTP handler
export const addAttachmentEndpointV1: UnifiedRouteHandler = async (context) => {
  const apiPipeline = protectApiPipeline.setHandler(addAttachmentEndpointV1Handler);
  await apiPipeline.execute(context);
};

// logic/business.logic.ts - Business workflows
export const parseReqToInputDTO: ParserFn<AddAttachmentInput> = (request) => {
  // Parse and validate HTTP request
};

export const processBusinessLogic: ExecutionAsyncFn = async (inputArgs) => {
  // Execute feature business logic
  const repository = inputArgs.addAttachmentRepository;
  return await repository.addAttachment(inputArgs.context, inputArgs.input);
};

// logic/steps.logic.ts - Pipeline steps
export const mapReqToInputStep = createParseRequestToInputStep(
  "mapReqToInputStep", 
  parseReqToInputDTO, 
  setInputDTOToState
);

export const processBusinessLogicStep = createAsyncStep(
  "processBusinessLogicStep", 
  getProcessInput, 
  processBusinessLogic, 
  setOutputToState
);
```

**api-data/feed-registration-api/command/add-attachment/**
```typescript
// repository.ts - Repository implementation
export class AddAttachmentRepository implements IAddAttachmentRepository {
  constructor(private prisma: PrismaClient) {}

  async addAttachment(context: UnifiedHttpContext, input: AddAttachmentInput): Promise<Result<AddAttachmentOutput, BaseFailure>> {
    // Coordinate data access and business logic
    const businessResult = await this.validateBusinessRules(input);
    if (businessResult.isLeft()) {
      return eitherToResult(businessResult);
    }

    const dataResult = await this.saveAttachments(input);
    return eitherToResult(dataResult);
  }
}

// dataAccess.logic.ts - Pure database operations
export const saveAttachmentToDatabase = async (prisma: PrismaClient, data: AttachmentData): Promise<Either<string, AttachmentRecord>> => {
  return eitherFromOperation(
    async () => {
      return await prisma.attachment.create({
        data: {
          registrationId: data.registrationId,
          fileName: data.fileName,
          filePath: data.filePath,
          fileSize: data.fileSize,
        }
      });
    },
    (error) => `Database save error: ${error.message}`
  );
};

// business.logic.ts - Business rules validation
export const validateAttachmentRules = (input: AddAttachmentInput): Either<string, ValidatedAttachment> => {
  // Validate file types
  for (const file of input.files) {
    if (!BUSINESS_RULES.ALLOWED_FILE_TYPES.includes(file.type)) {
      return left(`Invalid file type: ${file.type}`);
    }
  }

  // Validate file count
  if (input.files.length > BUSINESS_RULES.MAX_ATTACHMENTS) {
    return left(`Too many attachments. Max: ${BUSINESS_RULES.MAX_ATTACHMENTS}`);
  }

  return right({ validatedFiles: input.files });
};

// mapper.ts - Data transformation
export const mapInputToAttachmentData: DataParser<AddAttachmentInput, AttachmentData[]> = (input) => {
  return eitherFromOperation(
    () => {
      return input.files.map(file => ({
        registrationId: input.registrationId,
        fileName: file.fileName,
        filePath: `/uploads/${input.registrationId}/${file.fileName}`,
        fileSize: file.size,
        contentType: file.type,
        uploadedBy: input.userId,
        uploadedAt: new Date()
      }));
    },
    (error) => `Mapping error: ${error.message}`
  );
};
```

### 🔄 **Error Handling Patterns per Layer**

#### ✅ **Layer-specific error handling**:
```typescript
// Presentation Layer (api-service): HTTP status codes
const addAttachmentEndpointV1Handler: UnifiedHandlerFn = async (context) => {
  const result = await pipeline.execute(params);
  
  if (result.isSuccess) {
    context.response.status(201).json({
      success: true,
      data: result.data,
      message: 'Attachments added successfully'
    });
  } else {
    // Map feature errors to HTTP status codes
    const statusCode = mapFeatureErrorToHttpStatus(result.error);
    context.response.status(statusCode).json({
      success: false,
      error: result.error,
      message: 'Failed to add attachments'
    });
  }
};

// Application Layer (api-service): Feature error orchestration
export const processBusinessLogic: ExecutionAsyncFn = async (inputArgs) => {
  const repository = inputArgs.addAttachmentRepository;
  const result = await repository.addAttachment(inputArgs.context, inputArgs.input);
  
  if (result.isFailure) {
    // Log feature-specific context
    logger.error(`Add attachment failed for registration ${inputArgs.input.registrationId}`, {
      error: result.error,
      userId: inputArgs.input.userId
    });
  }
  
  return result;
};

// Domain Layer (api-core): Business rule validation
export class InvalidFileType extends BaseFailure {
  constructor(fileType: string, allowedTypes: string[]) {
    super(
      'INVALID_FILE_TYPE',
      `File type '${fileType}' is not allowed. Allowed types: ${allowedTypes.join(', ')}`,
      400,
      { fileType, allowedTypes }
    );
  }
}

// Infrastructure Layer (api-data): Technical error handling
export class AddAttachmentRepository implements IAddAttachmentRepository {
  async addAttachment(context: UnifiedHttpContext, input: AddAttachmentInput): Promise<Result<AddAttachmentOutput, BaseFailure>> {
    return eitherToResult(
      await eitherFromOperation(
        async () => {
          // Database operation
          const result = await this.prisma.attachment.create({ data });
          return result;
        },
        (error) => {
          // Convert technical errors to domain failures
          if (error.code === 'P2002') {
            return 'Duplicate attachment name';
          }
          return `Database error: ${error.message}`;
        }
      )
    );
  }
}
```

### 📦 **Feature Dependency Management**

#### ✅ **Correct dependency injection per feature**:
```typescript
// api-service dependency injection
const feedRegistrationContextKeys = {
  ADD_ATTACHMENT_REPOSITORY: 'repository:feed-registration:add-attachment',
  SAVE_REGISTRATION_REPOSITORY: 'repository:feed-registration:save-registration',
  GET_ANIMAL_BREED_REPOSITORY: 'repository:feed-registration:get-animal-breed'
} as const;

// Feature-specific DI setup
fastify.register(async function (fastify) {
  fastify.addHook('preHandler', async (request) => {
    if (!request.unifiedAppContext) {
      request.unifiedAppContext = { request: {} as any, response: {} as any, registry: {} };
    }
    
    // Inject feature-specific repositories
    request.unifiedAppContext.registry[feedRegistrationContextKeys.ADD_ATTACHMENT_REPOSITORY] = 
      new AddAttachmentRepository(prismaClient);
    request.unifiedAppContext.registry[feedRegistrationContextKeys.SAVE_REGISTRATION_REPOSITORY] = 
      new SaveRegistrationRepository(prismaClient);
  });
  
  // Feature routes
  fastify.post('/api/feed-registration/attachments', createUnifiedFastifyHandler(addAttachmentEndpointV1));
  fastify.post('/api/feed-registration/registrations', createUnifiedFastifyHandler(saveRegistrationEndpointV1));
});
```

### 🔄 **Error Handling Patterns**

#### ✅ **Layer-specific error handling**:
```typescript
// Presentation Layer: HTTP status codes
export const createUserHandler: UnifiedRouteHandler = async (context) => {
  const result = await createUserUseCase.execute(request.body);
  
  if (result.isSuccess) {
    response.status(201).json({ success: true, data: result.data });
  } else {
    // Map business errors to HTTP status codes
    const statusCode = getHttpStatusFromError(result.error);
    response.status(statusCode).json({ success: false, error: result.error });
  }
};

// Application Layer: Business error messages
export class CreateUserUseCase {
  async execute(request: CreateUserRequest): Promise<Result<User, string>> {
    const validationResult = validateUserCreation(request);
    if (validationResult.isLeft()) {
      return Result.fail(validationResult.value); // Business error message
    }
    
    // Convert Either → Result for upper layers
    return eitherToResult(saveResult);
  }
}

// Domain Layer: Domain-specific errors
export class User {
  static create(props: UserProps): Either<string, User> {
    if (props.age < 13) {
      return left('User must be at least 13 years old'); // Domain rule
    }
    return right(new User(props));
  }
}

// Infrastructure Layer: Technical error handling
export class PostgresUserRepository {
  async save(user: User): Promise<Either<string, User>> {
    return eitherFromOperation(
      async () => {
        // Database operation
        const result = await this.db.query(query, params);
        return result.rows[0];
      },
      (error) => `Database save error: ${error.message}` // Technical error
    );
  }
}
```

### 📦 **Dependency Management**

#### ✅ **Correct dependency injection**:
```typescript
// api-service/src/use-cases/create-user-use-case.ts
export class CreateUserUseCase {
  constructor(
    private userRepository: UserRepository,    // Interface from api-core
    private emailService: EmailService,       // Interface from api-core  
    private logger: Logger                     // External dependency
  ) {}
}

// app.ts - Dependency injection setup
const userRepository = new PostgresUserRepository(dbPool);  // api-data implementation
const emailService = new ExternalEmailService(apiKey, baseUrl); // api-data implementation
const createUserUseCase = new CreateUserUseCase(userRepository, emailService, logger);
```

### 🔧 **Either Pattern Best Practices**

#### ✅ **Use appropriate helper functions**:
```typescript
// Use left() and right() for simple cases
const validateName = (name: string): Either<string, string> => {
  return name.length > 0 ? right(name) : left('Name required');
};

// Use matchEither for branching logic
const processResult = matchEither(
  validationResult,
  (error) => handleError(error),
  (data) => processData(data)
);

// Use eitherFromOperation for async operations with error handling
const saveResult = await eitherFromOperation(
  () => repository.save(data),
  (error) => `Save failed: ${error.message}`
);

// Use eitherToResult for layer boundaries (Either → Result)
return eitherToResult(domainResult);
```

## Testing Strategies

### 🧪 **Testing Each Layer**

#### **Domain Layer Testing (api-core)**

```typescript
// api-core/src/entities/__tests__/user.test.ts
import { User } from '../user';

describe('User Domain Entity', () => {
  describe('create', () => {
    it('should create user with valid data', () => {
      const result = User.create({
        name: 'John Doe',
        email: 'john@example.com',
        age: 25
      });
      
      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.canVote()).toBe(true);
      }
    });

    it('should reject user under 13', () => {
      const result = User.create({
        name: 'Child',
        email: 'child@example.com',
        age: 12
      });
      
      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value).toBe('User must be at least 13 years old');
      }
    });
  });
});
```

#### **Application Layer Testing (api-service)**

```typescript
// api-service/src/use-cases/__tests__/create-user-use-case.test.ts
import { CreateUserUseCase } from '../create-user-use-case';
import { UserRepository } from '@my-app/api-core';
import { EmailService } from '@my-app/api-data';

describe('CreateUserUseCase', () => {
  let useCase: CreateUserUseCase;
  let mockUserRepository: jest.Mocked<UserRepository>;
  let mockEmailService: jest.Mocked<EmailService>;
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(() => {
    mockUserRepository = {
      save: jest.fn(),
      findByEmail: jest.fn(),
      findById: jest.fn(),
      delete: jest.fn()
    };
    
    mockEmailService = {
      sendWelcomeEmail: jest.fn(),
      sendPasswordReset: jest.fn()
    };
    
    mockLogger = {
      warn: jest.fn(),
      error: jest.fn(),
      info: jest.fn()
    } as any;

    useCase = new CreateUserUseCase(mockUserRepository, mockEmailService, mockLogger);
  });

  it('should create user successfully', async () => {
    // Setup
    const userData = {
      name: 'John Doe',
      email: 'john@example.com',
      age: 25
    };
    
    mockUserRepository.findByEmail.mockResolvedValue(right(null)); // No existing user
    mockUserRepository.save.mockResolvedValue(right(expect.any(Object)));
    mockEmailService.sendWelcomeEmail.mockResolvedValue(right(undefined));

    // Act
    const result = await useCase.execute(userData);

    // Assert
    expect(result.isSuccess).toBe(true);
    expect(mockUserRepository.save).toHaveBeenCalledTimes(1);
    expect(mockEmailService.sendWelcomeEmail).toHaveBeenCalledWith('john@example.com');
  });

  it('should fail when user already exists', async () => {
    // Setup
    const userData = {
      name: 'John Doe',
      email: 'john@example.com',
      age: 25
    };
    
    const existingUser = User.create(userData);
    mockUserRepository.findByEmail.mockResolvedValue(right(existingUser.value));

    // Act
    const result = await useCase.execute(userData);

    // Assert
    expect(result.isFailure).toBe(true);
    expect(result.error).toBe('User with this email already exists');
    expect(mockUserRepository.save).not.toHaveBeenCalled();
  });
});
```

#### **Infrastructure Layer Testing (api-data)**

```typescript
// api-data/src/repositories/__tests__/postgres-user-repository.test.ts
import { PostgresUserRepository } from '../postgres-user-repository';
import { Pool } from 'pg';
import { User } from '@my-app/api-core';

describe('PostgresUserRepository', () => {
  let repository: PostgresUserRepository;
  let mockDb: jest.Mocked<Pool>;

  beforeEach(() => {
    mockDb = {
      query: jest.fn()
    } as any;
    
    repository = new PostgresUserRepository(mockDb);
  });

  it('should save user successfully', async () => {
    // Setup
    const user = User.create({
      name: 'John Doe',
      email: 'john@example.com',
      age: 25
    });
    
    const dbRow = {
      id: 'user_123',
      name: 'John Doe',
      email: 'john@example.com',
      age: 25,
      created_at: new Date()
    };
    
    mockDb.query.mockResolvedValue({ rows: [dbRow] } as any);

    // Act
    const result = await repository.save(user.value!);

    // Assert
    expect(result.isRight()).toBe(true);
    expect(mockDb.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO users'),
      expect.arrayContaining([user.value!.id, 'John Doe', 'john@example.com', 25])
    );
  });

  it('should handle database errors', async () => {
    // Setup
    const user = User.create({
      name: 'John Doe',
      email: 'john@example.com',
      age: 25
    });
    
    mockDb.query.mockRejectedValue(new Error('Connection failed'));

    // Act
    const result = await repository.save(user.value!);

    // Assert
    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value).toContain('Database save error');
    }
  });
});
```

#### **Controller Testing (api-service)**

```typescript
// api-service/src/controllers/__tests__/user-controller.test.ts
import { registerUserHandler } from '../user-controller';
import { CreateUserUseCase } from '../../use-cases/create-user-use-case';
import { Result } from '@inh-lib/common';

describe('User Controller', () => {
  let mockCreateUserUseCase: jest.Mocked<CreateUserUseCase>;

  beforeEach(() => {
    mockCreateUserUseCase = {
      execute: jest.fn()
    } as any;
  });

  it('should return 201 for successful user creation', async () => {
    // Setup
    const requestBody = {
      name: 'John Doe',
      email: 'john@example.com',
      age: 25
    };
    
    const user = User.create(requestBody);
    mockCreateUserUseCase.execute.mockResolvedValue(Result.ok(user.value!));

    const mockContext = {
      request: { body: requestBody },
      response: {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      },
      registry: {
        createUserUseCase: mockCreateUserUseCase
      }
    };

    // Act
    await registerUserHandler(mockContext as any);

    // Assert
    expect(mockContext.response.status).toHaveBeenCalledWith(201);
    expect(mockContext.response.json).toHaveBeenCalledWith({
      success: true,
      data: expect.objectContaining({
        id: expect.any(String),
        name: 'John Doe',
        email: 'john@example.com'
      }),
      message: 'User registered successfully'
    });
  });
});
```

### 🎯 **Testing Best Practices**

1. **Test layer boundaries**: Focus on testing the contract between layers
2. **Mock external dependencies**: Always mock infrastructure in use case tests
3. **Test Either/Result conversions**: Verify error handling at layer boundaries
4. **Use descriptive test names**: Clearly describe what scenario is being tested
5. **Test both success and failure paths**: Cover all Either branches

### 🚀 **Benefits of This Architecture**

- ✅ **Use Case Focused**: Organizes code around business use cases
- ✅ **Framework Independence**: UnifiedRoute allows framework switching
- ✅ **Clear Boundaries**: Each project has distinct responsibilities
- ✅ **Shared Logic**: api-core contains only truly shared domain logic
- ✅ **Type Safety**: Either pattern ensures compile-time error handling
- ✅ **Easy Testing**: Each layer can be tested in isolation
- ✅ **Maintainable**: Business logic location is predictable and consistent
      (error) => Result.fail(error),
      (profile) => {
        // Apply business logic transformation
        const transformResult = this.enrichProfile(profile);
        return eitherToResult(transformResult);
      }
    );
  }

  private enrichProfile(profile: ExternalProfile): Either<string, UserProfile> {
    // Pure business logic for profile enrichment
    return right({
      ...profile,
      lastUpdated: new Date(),
      isVerified: profile.email.includes('@verified.com')
    });
  }

  private mapValidationError(error: ValidationError): string {
    const messages = {
      'EMPTY_NAME': 'Name is required',
      'INVALID_EMAIL': 'Please provide a valid email',
      'INVALID_AGE': 'Age must be valid',
      'WEAK_PASSWORD': 'Password too weak'
    };
    return messages[error] || 'Validation failed';
  }
}
```

## Infrastructure Layer

### Database Operations with eitherFromOperation

```typescript
// ✅ Repository layer using eitherFromOperation
class UserRepository {
  constructor(private db: DatabaseConnection) {}

  async findById(id: string): Promise<Either<string, User | null>> {
    return eitherFromOperation(
      async () => {
        const query = 'SELECT * FROM users WHERE id = $1';
        const result = await this.db.query(query, [id]);
        return result.rows.length > 0 ? result.rows[0] as User : null;
      },
      (error) => `Database error: ${error.message}`
    );
  }

  async save(user: ValidatedUser): Promise<Either<string, User>> {
    return eitherFromOperation(
      async () => {
        const query = `
          INSERT INTO users (name, email, age, password_hash) 
          VALUES ($1, $2, $3, $4) 
          RETURNING *
        `;
        const passwordHash = await this.hashPassword(user.password);
        const result = await this.db.query(query, [
          user.name,
          user.email,
          user.age,
          passwordHash
        ]);
        return result.rows[0] as User;
      },
      (error) => {
        if ((error as any).code === '23505') {
          return `Email ${user.email} already exists`;
        }
        return `Failed to save user: ${error.message}`;
      }
    );
  }

  async findByEmail(email: string): Promise<Either<string, User | null>> {
    return eitherFromOperation(
      async () => {
        const query = 'SELECT * FROM users WHERE email = $1';
        const result = await this.db.query(query, [email]);
        return result.rows.length > 0 ? result.rows[0] as User : null;
      },
      (error) => `Database error: ${error.message}`
    );
  }

  private async hashPassword(password: string): Promise<string> {
    // This might throw, but eitherFromOperation will catch it
    return await bcrypt.hash(password, 10);
  }
}
```

### External API Integration with eitherFromOperation

```typescript
// ✅ External API service using eitherFromOperation
class ExternalAPIService {
  async fetchUserProfile(userId: string): Promise<Either<string, ExternalUserProfile>> {
    return eitherFromOperation(
      async () => {
        const response = await axios.get(`/api/external/users/${userId}`, {
          timeout: 5000,
          headers: {
            'Authorization': `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.status !== 200) {
          throw new Error(`API returned status ${response.status}`);
        }
        
        return response.data as ExternalUserProfile;
      },
      (error) => {
        if (axios.isAxiosError(error)) {
          if (error.code === 'ECONNABORTED') {
            return 'External API timeout';
          }
          if (error.response?.status === 404) {
            return 'User profile not found in external system';
          }
          if (error.response?.status === 401) {
            return 'Unauthorized access to external API';
          }
          return `External API error: ${error.message}`;
        }
        return `Unexpected error: ${error.message}`;
      }
    );
  }

  async uploadFile(file: File): Promise<Either<string, UploadResult>> {
    return eitherFromOperation(
      async () => {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await axios.post('/api/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          timeout: 30000, // 30 seconds for file upload
        });
        
        return response.data as UploadResult;
      },
      (error) => `File upload failed: ${error.message}`
    );
  }
}
```

### File System Operations with eitherFromOperation

```typescript
// ✅ File service using eitherFromOperation
class FileService {
  async readFile(filePath: string): Promise<Either<string, string>> {
    return eitherFromOperation(
      () => fs.promises.readFile(filePath, 'utf-8'),
      (error) => `Failed to read file ${filePath}: ${error.message}`
    );
  }

  async writeFile(filePath: string, content: string): Promise<Either<string, void>> {
    return eitherFromOperation(
      () => fs.promises.writeFile(filePath, content, 'utf-8'),
      (error) => `Failed to write file ${filePath}: ${error.message}`
    );
  }

  async deleteFile(filePath: string): Promise<Either<string, void>> {
    return eitherFromOperation(
      () => fs.promises.unlink(filePath),
      (error) => `Failed to delete file ${filePath}: ${error.message}`
    );
  }
}
```

### Cache Operations with eitherFromOperation

```typescript
// ✅ Cache service using eitherFromOperation
class CacheService {
  constructor(private redis: RedisClient) {}

  async get<T>(key: string): Promise<Either<string, T | null>> {
    return eitherFromOperation(
      async () => {
        const value = await this.redis.get(key);
        return value ? JSON.parse(value) as T : null;
      },
      (error) => `Cache get error for key ${key}: ${error.message}`
    );
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<Either<string, void>> {
    return eitherFromOperation(
      async () => {
        const serialized = JSON.stringify(value);
        if (ttlSeconds) {
          await this.redis.setex(key, ttlSeconds, serialized);
        } else {
          await this.redis.set(key, serialized);
        }
      },
      (error) => `Cache set error for key ${key}: ${error.message}`
    );
  }

  async delete(key: string): Promise<Either<string, void>> {
    return eitherFromOperation(
      () => this.redis.del(key),
      (error) => `Cache delete error for key ${key}: ${error.message}`
    );
  }
}
```

## Real-world Examples

### User Registration with All Helper Functions

```typescript
// ใช้ helper functions จาก Either.ts
import { 
  Either, left, right, 
  matchEither, eitherFromOperation, eitherToResult 
} from '@inh-lib/common';

// Business Logic Layer
interface RegistrationData {
  name: string;
  email: string;
  password: string;
}

const validateRegistration = (data: unknown): Either<string, RegistrationData> => {
  if (typeof data !== 'object' || data === null) {
    return left('Invalid registration data');
  }
  
  const reg = data as Record<string, unknown>;
  
  if (typeof reg.name !== 'string' || reg.name.trim().length === 0) {
    return left('Name is required');
  }
  
  if (typeof reg.email !== 'string' || !reg.email.includes('@')) {
    return left('Valid email is required');
  }
  
  if (typeof reg.password !== 'string' || reg.password.length < 8) {
    return left('Password must be at least 8 characters');
  }
  
  return right({
    name: reg.name.trim(),
    email: reg.email,
    password: reg.password
  });
};

// Service Layer
class RegistrationService {
  async registerUser(data: unknown): Promise<Result<User, string>> {
    // Step 1: Validate using business logic
    const validationResult = validateRegistration(data);
    if (validationResult.isLeft()) {
      return Result.fail(validationResult.value);
    }

    // Step 2: Check existing user using eitherFromOperation
    const existingUserResult = await eitherFromOperation(
      () => this.userRepository.findByEmail(validationResult.value.email),
      (error) => `Database error: ${error.message}`
    );

    // Step 3: Handle existing user check with matchEither
    const checkResult = matchEither(
      existingUserResult,
      (error) => left(error),
      (user) => user ? left('Email already exists') : right(null)
    );

    if (checkResult.isLeft()) {
      return Result.fail(checkResult.value);
    }

    // Step 4: Save new user using eitherFromOperation
    const saveResult = await eitherFromOperation(
      () => this.userRepository.save(validationResult.value),
      (error) => `Failed to save user: ${error.message}`
    );

    // Step 5: Convert Either → Result using eitherToResult
    return eitherToResult(saveResult);
  }
}
```

### Data Processing Pipeline

```typescript
// ใช้เฉพาะ helper functions ที่มีใน Either.ts
interface DataItem {
  id: string;
  content: string;
  metadata: Record<string, unknown>;
}

const validateDataItem = (item: unknown): Either<string, DataItem> => {
  if (typeof item !== 'object' || item === null) {
    return left('Invalid data item');
  }
  
  const data = item as Record<string, unknown>;
  
  if (typeof data.id !== 'string' || data.id.length === 0) {
    return left('ID is required');
  }
  
  if (typeof data.content !== 'string') {
    return left('Content must be string');
  }
  
  return right({
    id: data.id,
    content: data.content,
    metadata: data.metadata as Record<string, unknown> || {}
  });
};

const parseContent = (item: DataItem): Either<string, DataItem> => {
  try {
    const parsed = JSON.parse(item.content);
    return right({ ...item, content: JSON.stringify(parsed) });
  } catch {
    return left(`Invalid JSON in item ${item.id}`);
  }
};

// Manual chaining using if-checks
const processDataItem = (item: unknown): Either<string, DataItem> => {
  const validationResult = validateDataItem(item);
  if (validationResult.isLeft()) {
    return validationResult;
  }
  
  return parseContent(validationResult.value);
};

// Service Layer
class DataProcessingService {
  async processBatch(items: unknown[]): Promise<Result<ProcessedBatch, string>> {
    const processedItems: DataItem[] = [];
    
    // Process each item manually
    for (const item of items) {
      const processResult = processDataItem(item);
      if (processResult.isLeft()) {
        return Result.fail(processResult.value);
      }
      processedItems.push(processResult.value);
    }

    // Save processed data using eitherFromOperation
    const saveResult = await eitherFromOperation(
      () => this.dataRepository.saveBatch(processedItems),
      (error) => `Failed to save batch: ${error.message}`
    );

    // Convert และส่งผลลัพธ์ using matchEither
    return matchEither(
      saveResult,
      (error) => Result.fail(error),
      (saved) => Result.ok({
        processed: saved,
        count: saved.length,
        processedAt: new Date()
      })
    );
  }
}
```

## Best Practices

### 1. **Layer Separation**

```typescript
// ✅ DO: ใช้ Either ใน Business Logic เท่านั้น
const validateUser = (data: unknown): Either<ValidationError, User> => {
  // Pure validation logic
};

// ✅ DO: Service Layer return Result เสมอ
class UserService {
  async createUser(data: unknown): Promise<Result<User, string>> {
    const validation = validateUser(data);
    if (validation.isLeft()) {
      return Result.fail(this.mapError(validation.value));
    }
    
    const saveResult = await eitherFromOperation(
      () => this.repository.save(validation.value)
    );
    
    return eitherToResult(saveResult);
  }
}

// ❌ DON'T: Service return Either
class BadService {
  async createUser(data: unknown): Promise<Either<string, User>> {
    // Wrong! Service should return Result
  }
}
```

### 2. **ใช้ Helper Functions อย่างเหมาะสม**

```typescript
// ✅ DO: ใช้ eitherFromOperation สำหรับ async operations
const fetchData = async (): Promise<Either<string, Data>> => {
  return eitherFromOperation(
    () => apiClient.getData(),
    (error) => `API Error: ${error.message}`
  );
};

// ✅ DO: ใช้ matchEither สำหรับ pattern matching
const handleResult = (result: Either<string, number>) => {
  return matchEither(
    result,
    (error) => console.error(error),
    (value) => console.log(`Success: ${value}`)
  );
};

// ✅ DO: ใช้ manual chaining หรือ helper functions จาก Either.ts
const processUser = (data: unknown): Either<string, ProcessedUser> => {
  const userResult = validateUser(data);
  if (userResult.isLeft()) return userResult;
  
  const enrichResult = enrichUser(userResult.value);
  if (enrichResult.isLeft()) return enrichResult;
  
  return calculateScore(enrichResult.value);
};
```

### 3. **Error Type Consistency**

```typescript
// ✅ DO: Domain-specific error types
type UserError = 'INVALID_NAME' | 'INVALID_EMAIL' | 'USER_EXISTS';
type OrderError = 'EMPTY_ORDER' | 'INVALID_QUANTITY';

// ✅ DO: Map errors ใน Service layer
class UserService {
  private mapUserError(error: UserError): string {
    const messages = {
      'INVALID_NAME': 'Name is required',
      'INVALID_EMAIL': 'Email is invalid',
      'USER_EXISTS': 'User already exists'
    };
    return messages[error];
  }
}
```

## Testing

### Business Logic Testing (Pure Functions)

```typescript
describe('Either Business Logic', () => {
  describe('validateUser', () => {
    it('should return Right for valid user', () => {
      const validUser = { name: 'John', email: 'john@test.com' };
      const result = validateUser(validUser);
      
      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.name).toBe('John');
      }
    });
    
    it('should return Left for invalid email', () => {
      const invalidUser = { name: 'John', email: 'invalid' };
      const result = validateUser(invalidUser);
      
      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value).toBe('INVALID_EMAIL');
      }
    });
  });
  
  describe('Helper Functions', () => {
    it('should chain operations correctly', () => {
      const result = chainEither(
        right(5),
        x => right(x * 2)
      );
      
      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value).toBe(10);
      }
    });
    
    it('should handle matchEither', () => {
      const success = matchEither(
        right(42),
        () => 'error',
        (value) => `success: ${value}`
      );
      
      expect(success).toBe('success: 42');
    });
  });
});
```

### Service Layer Testing

```typescript
describe('UserService', () => {
  let service: UserService;
  let mockRepository: jest.Mocked<UserRepository>;
  
  beforeEach(() => {
    mockRepository = {
      save: jest.fn(),
      findByEmail: jest.fn()
    } as any;
    service = new UserService(mockRepository);
  });
  
  // ✅ Test public methods only - private methods จะถูกทดสอบผ่าน public methods
  it('should create user successfully', async () => {
    const userData = { name: 'John', email: 'john@test.com' };
    
    mockRepository.findByEmail.mockResolvedValue(null);
    mockRepository.save.mockResolvedValue({ id: '1', ...userData });
    
    const result = await service.createUser(userData);
    
    expect(result.isSuccess).toBe(true);
    expect(result.getValue().name).toBe('John');
  });
  
  it('should handle validation errors', async () => {
    const invalidData = { name: '', email: 'invalid' };
    
    const result = await service.createUser(invalidData);
    
    expect(result.isFailure).toBe(true);
    expect(result.error).toContain('Name is required');
    
    // ✅ Private method mapValidationError ถูกทดสอบผ่าน public method createUser
    // ไม่จำเป็นต้อง test mapValidationError แยกต่างหาก
  });
  
  it('should test error mapping through public interface', async () => {
    const testCases = [
      { input: { name: '', email: 'valid@test.com' }, expectedError: 'Name is required' },
      { input: { name: 'John', email: 'invalid' }, expectedError: 'Valid email is required' },
      { input: { name: 'John', email: 'test@test.com', password: '123' }, expectedError: 'Password must be at least 8 characters' }
    ];
    
    for (const testCase of testCases) {
      const result = await service.createUser(testCase.input);
      
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain(testCase.expectedError);
      // ✅ Private method mapValidationError ถูกทดสอบแบบอ้อมผ่าน public method
    }
  });
});
```

### Testing Guidelines สำหรับ Classes

#### ✅ **DO: Test Public Methods Only**

```typescript
class UserService {
  async createUser(data: unknown): Promise<Result<User, string>> {
    // Public method - ต้อง test
    const validation = validateUser(data);
    if (validation.isLeft()) {
      return Result.fail(this.mapError(validation.value)); // Private method called here
    }
    // ... rest of implementation
  }
  
  private mapError(error: ValidationError): string {
    // Private method - ไม่ต้อง test แยก
    // จะถูกทดสอบผ่าน createUser method
    const messages = {
      'EMPTY_NAME': 'Name is required',
      'INVALID_EMAIL': 'Valid email is required'
    };
    return messages[error] || 'Validation failed';
  }
}

// ✅ Test approach
describe('UserService', () => {
  it('should return proper error messages for validation failures', async () => {
    // Test different validation scenarios
    // Private mapError method จะถูกทดสอบโดยอัตโนมัติ
    const invalidNameResult = await service.createUser({ name: '', email: 'test@test.com' });
    expect(invalidNameResult.error).toBe('Name is required');
    
    const invalidEmailResult = await service.createUser({ name: 'John', email: 'invalid' });
    expect(invalidEmailResult.error).toBe('Valid email is required');
  });
});
```

#### ❌ **DON'T: Test Private Methods Directly**

```typescript
// ❌ ไม่ควรทำแบบนี้
describe('UserService Private Methods', () => {
  it('should map validation errors correctly', () => {
    const service = new UserService(mockRepo);
    
    // ❌ พยายาม access private method - จะไม่ compile
    const result = service.mapError('EMPTY_NAME'); // Error: Property 'mapError' is private
    expect(result).toBe('Name is required');
  });
});

// ❌ หรือใช้ type assertion เพื่อ bypass TypeScript
describe('UserService Private Methods', () => {
  it('should map validation errors correctly', () => {
    const service = new UserService(mockRepo);
    
    // ❌ ไม่ควรทำแบบนี้
    const result = (service as any).mapError('EMPTY_NAME');
    expect(result).toBe('Name is required');
  });
});
```

#### 🎯 **Why Test Public Methods Only?**

1. **Encapsulation**: Private methods เป็น implementation details ไม่ใช่ public contract
2. **Refactoring Safety**: เปลี่ยน private methods ได้โดยไม่กระทบ tests
3. **Behavior Focus**: Test พฤติกรรมที่ user เห็น ไม่ใช่ internal implementation
4. **Automatic Coverage**: Private methods ถูก test ผ่าน public methods อยู่แล้ว

#### 🔍 **เมื่อไหร่ควร Extract Private Method เป็น Separate Function?**

```typescript
// ✅ ถ้า logic ซับซ้อน ควร extract เป็น pure function แยก
const mapValidationError = (error: ValidationError): string => {
  const messages = {
    'EMPTY_NAME': 'Name is required',
    'INVALID_EMAIL': 'Valid email is required',
    'INVALID_AGE': 'Age must be between 0 and 150',
    'WEAK_PASSWORD': 'Password must be at least 8 characters'
  };
  return messages[error] || 'Validation failed';
};

// ✅ Test pure function แยก (Unit Test)
describe('mapValidationError', () => {
  it('should map validation errors correctly', () => {
    expect(mapValidationError('EMPTY_NAME')).toBe('Name is required');
    expect(mapValidationError('INVALID_EMAIL')).toBe('Valid email is required');
    expect(mapValidationError('UNKNOWN_ERROR' as any)).toBe('Validation failed');
  });
});

class UserService {
  async createUser(data: unknown): Promise<Result<User, string>> {
    const validation = validateUser(data);
    if (validation.isLeft()) {
      return Result.fail(mapValidationError(validation.value)); // Use pure function
    }
    // ...
  }
}
```

#### 🎯 **การ Test เมื่อใช้ Pure Function:**

##### ✅ **DO: ไม่ต้อง Mock Pure Functions**

```typescript
// ✅ Test class method โดยไม่ mock pure function
describe('UserService', () => {
  let service: UserService;
  let mockRepository: jest.Mocked<UserRepository>;
  
  beforeEach(() => {
    mockRepository = {
      save: jest.fn(),
      findByEmail: jest.fn()
    } as any;
    service = new UserService(mockRepository);
  });
  
  it('should use pure function naturally in unit test', async () => {
    const invalidData = { name: '', email: 'valid@test.com' };
    
    // ✅ ไม่ต้อง mock mapValidationError เพราะเป็น pure function
    // Pure function ไม่มี side effects, deterministic output
    const result = await service.createUser(invalidData);
    
    expect(result.isFailure).toBe(true);
    expect(result.error).toBe('Name is required'); // Pure function ทำงานปกติ
    
    // ✅ ยังคงเป็น Unit Test เพราะ:
    // 1. Test 1 unit (UserService.createUser)
    // 2. Mock dependencies (repository)
    // 3. Pure functions ไม่ใช่ dependencies
  });
  
  it('should handle different validation errors', async () => {
    const testCases = [
      { 
        input: { name: '', email: 'test@test.com' }, 
        expectedError: 'Name is required' 
      },
      { 
        input: { name: 'John', email: 'invalid' }, 
        expectedError: 'Valid email is required' 
      }
    ];
    
    for (const testCase of testCases) {
      const result = await service.createUser(testCase.input);
      
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(testCase.expectedError);
      // ✅ Pure function ให้ผลลัพธ์ที่คาดเดาได้ ไม่ต้อง mock
    }
  });
});
```

##### ❌ **DON'T: Mock Pure Functions**

```typescript
// ❌ ไม่ควร mock pure functions
describe('UserService', () => {
  it('should not mock pure functions', async () => {
    // ❌ ไม่จำเป็นต้องทำแบบนี้
    jest.mock('./mapValidationError', () => ({
      mapValidationError: jest.fn().mockReturnValue('Mocked error message')
    }));
    
    // ❌ ทำให้ test ไม่สะท้อนพฤติกรรมจริง
    const result = await service.createUser({ name: '' });
    expect(result.error).toBe('Mocked error message'); // ไม่ใช่ error message จริง
  });
});
```

#### 🏷️ **Unit Test vs Integration Test Classification:**

##### ✅ **Unit Test (ใช้ Pure Functions)**
```typescript
describe('UserService Unit Tests', () => {
  it('should be unit test when using pure functions', async () => {
    // ✅ Unit Test เพราะ:
    // 1. Test 1 unit of work (UserService.createUser)
    // 2. Mock external dependencies (repository, APIs)
    // 3. Use pure functions directly (no side effects)
    
    mockRepository.findByEmail.mockResolvedValue(null);
    mockRepository.save.mockResolvedValue(savedUser);
    
    const result = await service.createUser(validData);
    
    // Pure functions (validateUser, mapValidationError) ทำงานจริง
    // External dependencies (repository) ถูก mock
    expect(result.isSuccess).toBe(true);
  });
});
```

##### 🔗 **Integration Test (ใช้ Real Dependencies)**
```typescript
describe('UserService Integration Tests', () => {
  it('should be integration test with real database', async () => {
    // 🔗 Integration Test เพราะ:
    // 1. Use real database connection
    // 2. Test interaction between layers
    // 3. No mocking of external dependencies
    
    const realRepository = new UserRepository(realDatabase);
    const service = new UserService(realRepository);
    
    const result = await service.createUser(validData);
    
    // Test ทั้ง service logic และ database interaction
    expect(result.isSuccess).toBe(true);
    
    // Verify data in real database
    const savedUser = await realDatabase.query('SELECT * FROM users WHERE email = ?', [validData.email]);
    expect(savedUser).toBeDefined();
  });
});
```

#### 🎯 **เหตุผลที่ไม่ต้อง Mock Pure Functions:**

1. **Deterministic**: Pure functions ให้ output เดียวกันเมื่อได้ input เดียวกัน
2. **No Side Effects**: ไม่มี I/O, database calls, API calls
3. **Fast Execution**: รันเร็ว ไม่ทำให้ test ช้า
4. **Reliable**: ไม่มีความเสี่ยงที่จะ fail จาก external factors
5. **Real Behavior**: Test พฤติกรรมจริงของ application

#### 📊 **เปรียบเทียบ Testing Approaches:**

```typescript
// ✅ Pure Function Approach
const mapError = (error: ValidationError): string => {
  // Pure function - test แยก และใช้จริงใน class tests
};

class UserService {
  async createUser(data: unknown): Promise<Result<User, string>> {
    const validation = validateUser(data);
    if (validation.isLeft()) {
      return Result.fail(mapError(validation.value)); // ใช้ pure function
    }
    // ...
  }
}

// ✅ Tests
describe('mapError (Pure Function)', () => {
  // Unit test pure function แยก
});

describe('UserService', () => {
  // Unit test class โดยใช้ pure function จริง
  // Mock เฉพาะ external dependencies (repository, APIs)
});

// ❌ Private Method Approach  
class UserServiceBad {
  private mapError(error: ValidationError): string {
    // Private method - ไม่สามารถ test แยกได้
  }
  
  async createUser(data: unknown): Promise<Result<User, string>> {
    // ต้อง test mapError ผ่าน createUser เท่านั้น
  }
}
```

#### 🏆 **Best Practices Summary:**

1. **Pure Functions**: ไม่ต้อง mock, test แยกได้, ใช้จริงใน unit tests
2. **External Dependencies**: ต้อง mock (database, APIs, file system)
3. **Private Methods**: ไม่ต้อง test แยก, test ผ่าน public methods
4. **Complex Logic**: Extract เป็น pure functions เพื่อ testability
5. **Unit vs Integration**: Unit = mock externals, Integration = use real dependencies

#### 🔧 **Private Methods ที่ไม่ใช่ Pure Function:**

```typescript
class UserService {
  constructor(
    private userRepository: UserRepository,
    private emailService: EmailService,
    private logger: Logger
  ) {}

  async createUser(data: unknown): Promise<Result<User, string>> {
    const validation = validateUser(data);
    if (validation.isLeft()) {
      return Result.fail(mapValidationError(validation.value));
    }

    const saveResult = await this.userRepository.save(validation.value);
    if (saveResult.isLeft()) {
      // Private method with side effects
      await this.logError('User creation failed', saveResult.value);
      return Result.fail(saveResult.value);
    }

    // Private method with side effects
    await this.sendWelcomeEmail(saveResult.value);
    
    return Result.ok(saveResult.value);
  }

  // ❌ Private method ที่ไม่ใช่ pure function (มี side effects)
  private async logError(message: string, error: string): Promise<void> {
    // Side effect: logging
    await this.logger.error(`${message}: ${error}`, {
      timestamp: new Date(),
      userId: 'unknown'
    });
  }

  // ❌ Private method ที่ไม่ใช่ pure function (มี side effects)  
  private async sendWelcomeEmail(user: User): Promise<void> {
    try {
      // Side effect: sending email
      await this.emailService.sendWelcomeEmail(user.email, user.name);
    } catch (error) {
      // Side effect: logging
      await this.logger.warn(`Failed to send welcome email to ${user.email}`, error);
    }
  }
}
```

#### ✅ **การ Test Private Methods ที่มี Side Effects:**

```typescript
describe('UserService with Private Methods (Non-Pure)', () => {
  let service: UserService;
  let mockRepository: jest.Mocked<UserRepository>;
  let mockEmailService: jest.Mocked<EmailService>;
  let mockLogger: jest.Mocked<Logger>;
  
  beforeEach(() => {
    mockRepository = {
      save: jest.fn()
    } as any;
    
    mockEmailService = {
      sendWelcomeEmail: jest.fn()
    } as any;
    
    mockLogger = {
      error: jest.fn(),
      warn: jest.fn()
    } as any;
    
    service = new UserService(mockRepository, mockEmailService, mockLogger);
  });

  it('should test private logError through public method failure', async () => {
    // Setup: Make repository fail
    mockRepository.save.mockResolvedValue(left('Database connection error'));
    
    const userData = { name: 'John', email: 'john@test.com', password: 'password123' };
    
    // Act: Call public method
    const result = await service.createUser(userData);
    
    // Assert: Verify public behavior
    expect(result.isFailure).toBe(true);
    expect(result.error).toBe('Database connection error');
    
    // ✅ Verify private logError was called through mock dependencies
    expect(mockLogger.error).toHaveBeenCalledWith(
      'User creation failed: Database connection error',
      expect.objectContaining({
        timestamp: expect.any(Date),
        userId: 'unknown'
      })
    );
    
    // ✅ Private method ถูก test ผ่าน public interface + mocked dependencies
  });

  it('should test private sendWelcomeEmail through public method success', async () => {
    // Setup: Make repository succeed
    const savedUser = { id: '1', name: 'John', email: 'john@test.com' };
    mockRepository.save.mockResolvedValue(right(savedUser));
    mockEmailService.sendWelcomeEmail.mockResolvedValue();
    
    const userData = { name: 'John', email: 'john@test.com', password: 'password123' };
    
    // Act: Call public method
    const result = await service.createUser(userData);
    
    // Assert: Verify public behavior
    expect(result.isSuccess).toBe(true);
    expect(result.getValue()).toEqual(savedUser);
    
    // ✅ Verify private sendWelcomeEmail was called through mock dependencies
    expect(mockEmailService.sendWelcomeEmail).toHaveBeenCalledWith('john@test.com', 'John');
    
    // ✅ Private method ถูก test ผ่าน mocked dependencies
  });

  it('should handle email sending failure in private method', async () => {
    // Setup: Repository succeeds, email fails
    const savedUser = { id: '1', name: 'John', email: 'john@test.com' };
    mockRepository.save.mockResolvedValue(right(savedUser));
    mockEmailService.sendWelcomeEmail.mockRejectedValue(new Error('Email service unavailable'));
    
    const userData = { name: 'John', email: 'john@test.com', password: 'password123' };
    
    // Act: Call public method
    const result = await service.createUser(userData);
    
    // Assert: User creation should still succeed (email is not critical)
    expect(result.isSuccess).toBe(true);
    
    // ✅ Verify private method's error handling through mocked logger
    expect(mockLogger.warn).toHaveBeenCalledWith(
      'Failed to send welcome email to john@test.com',
      expect.any(Error)
    );
    
    // ✅ Private method error handling ถูก test ผ่าน mock dependencies
  });
});
```

#### 📊 **แนวทางการ Test ตาม Type ของ Private Method:**

##### ✅ **Pure Functions → Extract & Test Separately**
```typescript
// ✅ Extract เป็น pure function
const mapValidationError = (error: ValidationError): string => {
  // Pure function - no side effects
  return errorMessages[error] || 'Validation failed';
};

// ✅ Test pure function แยก + ใช้จริงใน class
describe('mapValidationError', () => {
  it('should map errors correctly', () => {
    expect(mapValidationError('EMPTY_NAME')).toBe('Name is required');
  });
});
```

##### ✅ **Non-Pure Private Methods → Test Through Public Interface**
```typescript
class UserService {
  // ❌ Private method with side effects - keep private, test through public
  private async logError(message: string): Promise<void> {
    await this.logger.error(message); // Side effect
  }
  
  // ✅ Test through public method
  async createUser(data: unknown): Promise<Result<User, string>> {
    if (error) {
      await this.logError('Creation failed'); // Private method called
      return Result.fail(error);
    }
  }
}

// ✅ Test private method behavior through public interface + mocks
describe('UserService', () => {
  it('should log errors when creation fails', async () => {
    mockRepository.save.mockResolvedValue(left('Database error'));
    
    await service.createUser(invalidData);
    
    // Verify private method side effects through mocks
    expect(mockLogger.error).toHaveBeenCalledWith('Creation failed');
  });
});
```

#### 🚫 **อย่าทำ:**

```typescript
// ❌ DON'T: Force access to private methods
describe('UserService Private Methods', () => {
  it('should not access private methods directly', () => {
    // ❌ Bypassing encapsulation
    (service as any).logError('test'); // Type assertion hack
    expect(mockLogger.error).toHaveBeenCalled();
  });
});

// ❌ DON'T: Extract side effects as functions
const logErrorFunction = async (logger: Logger, message: string) => {
  // ❌ Not pure due to side effect, but extracted anyway
  await logger.error(message);
};
```

#### 🚨 **Problem: Private Methods with Hidden Dependencies**

```typescript
// ❌ ปัญหา: Private method import dependencies โดยตรง
import { sendEmail } from '../utils/emailService';
import { logToFile } from '../utils/fileLogger';
import { trackAnalytics } from '../utils/analytics';

class UserService {
  constructor(private userRepository: UserRepository) {}

  async createUser(data: unknown): Promise<Result<User, string>> {
    const validation = validateUser(data);
    if (validation.isLeft()) {
      return Result.fail(mapValidationError(validation.value));
    }

    const saveResult = await this.userRepository.save(validation.value);
    if (saveResult.isLeft()) {
      // ❌ Hidden dependencies - ยากต่อการ test
      await this.logCreationError(saveResult.value);
      return Result.fail(saveResult.value);
    }

    // ❌ Hidden dependencies - ยากต่อการ test
    await this.notifyUserCreated(saveResult.value);
    
    return Result.ok(saveResult.value);
  }

  // ❌ Private method with hidden dependencies
  private async logCreationError(error: string): Promise<void> {
    // Hidden dependency - ไม่สามารถ mock ได้ง่าย
    await logToFile(`User creation failed: ${error}`);
    
    // Hidden dependency - ไม่สามารถ mock ได้ง่าย
    await trackAnalytics('user_creation_failed', { error });
  }

  // ❌ Private method with hidden dependencies
  private async notifyUserCreated(user: User): Promise<void> {
    try {
      // Hidden dependency - ไม่สามารถ mock ได้ง่าย
      await sendEmail(user.email, 'Welcome!', 'Welcome to our service');
      
      // Hidden dependency - ไม่สามารถ mock ได้ง่าย
      await trackAnalytics('user_created', { userId: user.id });
    } catch (error) {
      // Hidden dependency - ไม่สามารถ mock ได้ง่าย
      await logToFile(`Failed to notify user ${user.id}: ${error}`);
    }
  }
}
```

#### ❌ **ปัญหาของ Hidden Dependencies:**

1. **ไม่สามารถ Mock ได้ง่าย**: ต้องใช้ jest.mock() ที่ module level
2. **Dependencies ไม่ชัดเจน**: คนอ่าน code ไม่รู้ว่ามี dependencies อะไรบ้าง
3. **ยากต่อการ Test**: ต้อง setup complex mocking
4. **Coupling สูง**: Class ผูกติดกับ implementation details
5. **ยากต่อการ Refactor**: เปลี่ยน dependencies ยาก

#### ✅ **วิธีแก้ที่ 1: Dependency Injection ผ่าน Constructor**

```typescript
// ✅ แก้ไข: Inject dependencies ผ่าน constructor
interface EmailService {
  sendEmail(to: string, subject: string, body: string): Promise<void>;
}

interface FileLogger {
  logToFile(message: string): Promise<void>;
}

interface AnalyticsService {
  track(event: string, data: any): Promise<void>;
}

class UserService {
  constructor(
    private userRepository: UserRepository,
    private emailService: EmailService,      // ✅ Explicit dependency
    private logger: FileLogger,              // ✅ Explicit dependency
    private analytics: AnalyticsService      // ✅ Explicit dependency
  ) {}

  async createUser(data: unknown): Promise<Result<User, string>> {
    const validation = validateUser(data);
    if (validation.isLeft()) {
      return Result.fail(mapValidationError(validation.value));
    }

    const saveResult = await this.userRepository.save(validation.value);
    if (saveResult.isLeft()) {
      // ✅ Dependencies ชัดเจน และ mockable
      await this.logCreationError(saveResult.value);
      return Result.fail(saveResult.value);
    }

    // ✅ Dependencies ชัดเจน และ mockable
    await this.notifyUserCreated(saveResult.value);
    
    return Result.ok(saveResult.value);
  }

  // ✅ Private method ใช้ injected dependencies
  private async logCreationError(error: string): Promise<void> {
    await this.logger.logToFile(`User creation failed: ${error}`);
    await this.analytics.track('user_creation_failed', { error });
  }

  // ✅ Private method ใช้ injected dependencies
  private async notifyUserCreated(user: User): Promise<void> {
    try {
      await this.emailService.sendEmail(user.email, 'Welcome!', 'Welcome to our service');
      await this.analytics.track('user_created', { userId: user.id });
    } catch (error) {
      await this.logger.logToFile(`Failed to notify user ${user.id}: ${error}`);
    }
  }
}
```

#### ✅ **Testing กับ Explicit Dependencies:**

```typescript
describe('UserService with Explicit Dependencies', () => {
  let service: UserService;
  let mockRepository: jest.Mocked<UserRepository>;
  let mockEmailService: jest.Mocked<EmailService>;
  let mockLogger: jest.Mocked<FileLogger>;
  let mockAnalytics: jest.Mocked<AnalyticsService>;
  
  beforeEach(() => {
    // ✅ ชัดเจนว่ามี dependencies อะไรบ้าง
    mockRepository = { save: jest.fn() } as any;
    mockEmailService = { sendEmail: jest.fn() } as any;
    mockLogger = { logToFile: jest.fn() } as any;
    mockAnalytics = { track: jest.fn() } as any;
    
    service = new UserService(
      mockRepository,
      mockEmailService,
      mockLogger,
      mockAnalytics
    );
  });

  it('should log error through private method when creation fails', async () => {
    // Setup
    mockRepository.save.mockResolvedValue(left('Database error'));
    
    // Act
    const result = await service.createUser(validData);
    
    // Assert
    expect(result.isFailure).toBe(true);
    
    // ✅ ง่ายต่อการ verify private method dependencies
    expect(mockLogger.logToFile).toHaveBeenCalledWith('User creation failed: Database error');
    expect(mockAnalytics.track).toHaveBeenCalledWith('user_creation_failed', { error: 'Database error' });
  });

  it('should notify user through private method when creation succeeds', async () => {
    // Setup
    const savedUser = { id: '1', email: 'john@test.com' };
    mockRepository.save.mockResolvedValue(right(savedUser));
    
    // Act
    const result = await service.createUser(validData);
    
    // Assert
    expect(result.isSuccess).toBe(true);
    
    // ✅ ง่ายต่อการ verify private method dependencies
    expect(mockEmailService.sendEmail).toHaveBeenCalledWith('john@test.com', 'Welcome!', 'Welcome to our service');
    expect(mockAnalytics.track).toHaveBeenCalledWith('user_created', { userId: '1' });
  });

  it('should handle notification failure gracefully', async () => {
    // Setup
    const savedUser = { id: '1', email: 'john@test.com' };
    mockRepository.save.mockResolvedValue(right(savedUser));
    mockEmailService.sendEmail.mockRejectedValue(new Error('Email service down'));
    
    // Act
    const result = await service.createUser(validData);
    
    // Assert
    expect(result.isSuccess).toBe(true); // Main operation succeeds
    
    // ✅ Verify error handling in private method
    expect(mockLogger.logToFile).toHaveBeenCalledWith('Failed to notify user 1: Error: Email service down');
  });
});
```

#### 🔄 **วิธีแก้ที่ 2: ใช้ jest.mock() สำหรับ Module Dependencies**

```typescript
// ถ้าจำเป็นต้องใช้ direct imports
// ✅ Mock ที่ module level
jest.mock('../utils/emailService', () => ({
  sendEmail: jest.fn()
}));

jest.mock('../utils/fileLogger', () => ({
  logToFile: jest.fn()
}));

jest.mock('../utils/analytics', () => ({
  trackAnalytics: jest.fn()
}));

import { sendEmail } from '../utils/emailService';
import { logToFile } from '../utils/fileLogger';
import { trackAnalytics } from '../utils/analytics';

describe('UserService with Module Mocks', () => {
  // ✅ Type assertions for mocked modules
  const mockSendEmail = sendEmail as jest.MockedFunction<typeof sendEmail>;
  const mockLogToFile = logToFile as jest.MockedFunction<typeof logToFile>;
  const mockTrackAnalytics = trackAnalytics as jest.MockedFunction<typeof trackAnalytics>;
  
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it('should use module dependencies in private methods', async () => {
    // Setup
    mockRepository.save.mockResolvedValue(left('Database error'));
    
    // Act
    const result = await service.createUser(invalidData);
    
    // Assert
    expect(result.isFailure).toBe(true);
    
    // ✅ Verify module dependencies were called
    expect(mockLogToFile).toHaveBeenCalledWith('User creation failed: Database error');
    expect(mockTrackAnalytics).toHaveBeenCalledWith('user_creation_failed', { error: 'Database error' });
  });
  
  // ⚠️ ข้อเสีย: ต้อง maintain module mocks, ยากต่อการ setup
});
```

#### 📋 **แนวทางที่แนะนำ:**

##### ✅ **Best Practice: Dependency Injection**

```typescript
// ✅ สร้าง interfaces สำหรับ dependencies
interface UserServiceDependencies {
  userRepository: UserRepository;
  emailService: EmailService;
  logger: FileLogger;
  analytics: AnalyticsService;
}

class UserService {
  constructor(private deps: UserServiceDependencies) {}
  
  // หรือ destructure
  constructor({
    userRepository,
    emailService,
    logger,
    analytics
  }: UserServiceDependencies) {
    this.userRepository = userRepository;
    this.emailService = emailService;
    this.logger = logger;
    this.analytics = analytics;
  }
  
  // Private methods ใช้ this.deps หรือ this.emailService
}
```

##### 📝 **Document Dependencies ใน Code:**

```typescript
/**
 * UserService handles user creation and management
 * 
 * Dependencies:
 * - UserRepository: For data persistence
 * - EmailService: For sending welcome emails
 * - Logger: For error logging
 * - AnalyticsService: For tracking user events
 */
class UserService {
  // Implementation...
}
```

#### 🎯 **Benefits ของ Dependency Injection:**

1. **ชัดเจน**: Dependencies ปรากฏใน constructor
2. **Testable**: ง่ายต่อการ mock
3. **Flexible**: สามารถ swap implementations ได้
4. **Single Responsibility**: แต่ละ dependency มีหน้าที่ชัดเจน
5. **Maintainable**: ง่ายต่อการ refactor และ debug
```
```

---

## Summary

### 🎯 **Key Architecture:**
- **Business Logic**: Either เท่านั้น (pure functions)
- **Service Layer**: Result เสมอ (orchestration + I/O)
- **Helper Functions**: ใช้ helper functions จาก Either.ts

### 🔧 **Helper Functions ใน Either.ts:**
1. `left()`, `right()` - Constructors
2. `matchEither()` - Pattern matching  
3. `eitherFromOperation()` - Async operations with error handling
4. `eitherToResult()` - Convert Either → Result

### 🚀 **Benefits of Feature Driven Architecture**

- ✅ **Feature Independence**: แต่ละ feature มี database schema แยก
- ✅ **Framework Independence**: UnifiedRoute ทำให้ API ไม่ผูกติดกับ web framework
- ✅ **Clear Boundaries**: 1 Feature = 1 API Domain = 1 Database Schema
- ✅ **CQRS Pattern**: Command/Query separation ใน feature
- ✅ **Type Safety**: Either pattern ใน infrastructure, Result ใน application
- ✅ **Easy Scaling**: เพิ่ม feature ใหม่ได้ง่าย โดยไม่กระทบ feature อื่น
- ✅ **Team Ownership**: แต่ละ team สามารถ own feature ได้แยกกัน
- ✅ **Database Independence**: แต่ละ feature ใช้ schema แยก ไม่ interference
- ✅ **Easy Testing**: แต่ละ layer และ feature test ได้อิสระ
- ✅ **Maintainable**: Business logic จัดระเบียบตาม feature domain
- ✅ **Real Helper Functions**: ใช้เฉพาะ helper functions ที่มีจริงใน Either.ts
- ✅ **Proper Dependency Injection**: Dependencies ชัดเจน per feature
- ✅ **Production Ready**: โครงสร้างพร้อมใช้งานจริงในระบบ enterprise

## 🏗️ **Complete Architecture Summary**

```
HTTP Request → Fastify → UnifiedAdapter → Feature RouteHandler
    ↓
Presentation Layer (Feature Controllers)
    ↓ Result<T, E>
Application Layer (Feature Commands/Queries) 
    ↓ Either<L, R>
Domain Layer (Feature Contracts & Types)
    ↓ Either<Error, Data>  
Infrastructure Layer (Feature Database Schema)
```

### 🔄 **Feature Data Flow:**
1. **HTTP Request** → Feature endpoint
2. **Feature Controller** → Command/Query handler
3. **Command/Query** → Repository contract (api-core)
4. **Repository Implementation** → Database schema (api-data)
5. **Response** ← HTTP JSON

### 📚 **Key Technologies:**
- **`@inh-lib/unified-route`**: Framework-independent routing
- **`@inh-lib/api-util-fastify`**: Fastify adapter for UnifiedRoute
- **`@inh-lib/common`**: Either pattern and helper functions
- **Feature Driven Architecture**: 1 Feature = 1 API Domain = 1 Database Schema
- **CQRS**: Command/Query separation per feature
- **TypeScript**: Full type safety across all layers

### 🎯 **When to Use This Architecture:**
- ✅ Multi-feature applications
- ✅ Need clear feature boundaries
- ✅ Multiple teams working on different features
- ✅ Database schema isolation requirements
- ✅ Framework independence is important
- ✅ Long-term maintainability with feature evolution
- ✅ Need to scale individual features independently

---

## Summary

### 🎯 **Key Architecture Principles**

- **Feature Driven**: 1 Feature = 1 API Domain = 1 Database Schema
- **Use Case Driven Repositories**: 1 Use Case = 1 Repository = 1 Business Logic Set
- **Data Access Business Logic in Infrastructure**: Upsert, optimizations, database patterns
- **Application Business Logic in Service**: Domain rules, calculations, orchestration
- **Framework Independent**: UnifiedRoute pattern across all endpoints

### 🔧 **Helper Functions in Either.ts**

1. `left()`, `right()` - Either constructors
2. `matchEither()` - Pattern matching for Either values
3. `eitherFromOperation()` - Async operations with error handling
4. `eitherToResult()` - Convert Either → Result for upper layers

### 🚀 **Benefits of Use Case-Driven Architecture**

- ✅ **Single Responsibility**: Each repository handles one use case only
- ✅ **Data Access Business Logic Isolation**: Database patterns in infrastructure layer
- ✅ **Performance Optimization per Use Case**: Optimize each use case independently
- ✅ **Framework Independence**: UnifiedRoute abstracts web framework details
- ✅ **Clear Boundaries**: 1 Feature = 1 API Domain = 1 Database Schema
- ✅ **Independent Development**: Each use case can be developed separately
- ✅ **Easy Testing**: Test each use case repository independently
- ✅ **Database Implementation Independence**: Can switch DB without affecting application
- ✅ **Team Ownership**: Different teams can own different features/use cases
- ✅ **Maintainable**: Business logic organized by feature and use case
- ✅ **Production Ready**: Enterprise-grade architecture structure

### 🏗️ **Complete Architecture Flow**

```
HTTP Request → Fastify → UnifiedAdapter → Feature Endpoint
    ↓
Presentation Layer (Feature Endpoints)
    ↓ Result<T, E>
Application Layer (Feature Commands/Queries - Domain Business Logic) 
    ↓ Either<L, R>
Domain Layer (Feature Contracts & Types)
    ↓ Either<Error, Data>  
Infrastructure Layer (Use Case Repositories - Data Access Business Logic)
```

### 🔄 **Use Case Data Flow**

1. **HTTP Request** → Feature endpoint (UnifiedRouteHandler)
2. **Feature Endpoint** → Command/Query application logic (domain business rules)
3. **Application Logic** → Use case repository (data access business logic)
4. **Use Case Repository** → Feature database schema (upsert, optimizations)
5. **Response** ← HTTP JSON through UnifiedRoute

### 📁 **Project Structure**

```
packages/
├── api-service/src/                    # Application Layer
│   └── {feature-api}/
│       ├── command/{use-case}/
│       │   ├── endpoint/v1.endpoint.ts # UnifiedRouteHandler
│       │   └── logic/                  # Domain business logic
│       └── query/{use-case}/
│           ├── endpoint/v1.endpoint.ts # UnifiedRouteHandler  
│           └── logic/                  # Domain business logic
│
├── api-core/src/                       # Domain Layer
│   └── {feature-domain}/
│       ├── entities/                   # Domain entities
│       ├── contracts/                  # Repository interfaces
│       └── types/                      # Shared types
│
└── api-data/src/                       # Infrastructure Layer
    └── {feature-api}/
        ├── command/{use-case}/
        │   ├── repository.ts           # Repository implementation
        │   ├── business.logic.ts       # Data access business logic
        │   └── dataAccess.logic.ts     # Pure data access functions
        └── query/{use-case}/
            ├── repository.ts           # Repository implementation
            ├── business.logic.ts       # Query optimization logic
            └── dataAccess.logic.ts     # Pure data access functions
```

### 📚 **Key Technologies**

- **`@inh-lib/unified-route`**: Framework-independent routing
- **`@inh-lib/api-util-fastify`**: Fastify adapter for UnifiedRoute
- **`@inh-lib/common`**: Either pattern and helper functions
- **Feature Driven Architecture**: 1 Feature = 1 API Domain = 1 Database Schema
- **Use Case Driven Repositories**: 1 Use Case = 1 Repository with specific business logic
- **CQRS**: Command/Query separation per feature
- **TypeScript**: Full type safety across all layers

### 🎯 **When to Use This Architecture**

- ✅ Multi-feature applications with complex business domains
- ✅ Multiple teams working on different features/use cases
- ✅ Need database schema isolation per feature
- ✅ Framework independence requirements
- ✅ Long-term maintainability with feature evolution
- ✅ Need to scale individual use cases independently
- ✅ Enterprise applications with varying performance requirements per use case
- ✅ Complex data access patterns (upsert, batch operations, optimizations)

### 🔧 **Business Logic Distribution**

#### 🎭 **Application Layer (api-service)**
- **Domain business rules** (validation, calculations, workflow)
- **Orchestration logic** (calling multiple repositories, external services)  
- **Framework-independent business logic**
- **Cross-cutting concerns** (security, logging, caching)

#### 🎭 **Infrastructure Layer (api-data)**
- **Data access patterns** (upsert vs check+insert/update)
- **Database-specific optimizations** (transactions, bulk operations)
- **Technical business logic** ที่ขึ้นอยู่กับ database implementation
- **Performance optimizations** per use case

### 📋 **Testing Strategy**

- **Unit Tests**: Test application business logic with mocked repositories
- **Integration Tests**: Test use case repositories with real database
- **Contract Tests**: Verify repository implementations match interfaces
- **Use Case Isolation**: Each use case can be tested independently
- **Performance Tests**: Test database optimizations per use case

This Use Case-Driven Architecture provides a robust foundation for building scalable, maintainable applications with proper separation of concerns, optimized data access patterns, and independent use case development. 🚀

</details>

---

**🎯 แนะนำ: ใช้ [เอกสารใหม่](./docs/README.md) สำหรับประสบการณ์การอ่านที่ดีกว่า!**