# Project Structure Guidelines for @feedos-frgm-system/shared-api-service

## 📋 Overview

This document defines the standardized project structure for API commands and queries within the shared API service. It promotes consistency, maintainability, and clear separation of concerns.

## 🏗️ Overall Service Architecture API-Service Layer

```
@feedos-frgm-system/shared-api-service/
├── src/
│   ├── feed-registration-api/           # API Domain
│   ├── process-setting-api/             # API Domain  
│   ├── example-api/                     # API Domain
│   ├── check-animal-feed-registration-api/ # API Domain
│   ├── manage-file-api/                 # API Domain
│   └── shared/                          # Shared utilities
├── docs/                                # Documentation
├── __tests__/                           # Service-level E2E tests
└── package.json
```

## 📁 API Domain Structure

Each API domain follows this consistent structure:

```
{api-name}/
├── command/                    # Write operations (CQRS Commands)
│   ├── add-example/
│   ├── update-status/
│   └── delete-item/
├── query/                      # Read operations (CQRS Queries)
│   ├── get-list/
│   ├── get-details/
│   └── search/
└── __tests__/                  # API domain-level functional tests
    ├── {command}.functional.test.ts
    ├── {workflow}.functional.test.ts
    └── {api-name}.e2e.test.ts
```

## 🎯 Command/Query Structure (Standardized)

Each command or query follows this **mandatory** structure:

```
{command-name}/
├── index.ts                    # Public API exports
├── endpoint/                   # HTTP endpoint handlers
│   ├── v1.endpoint.ts
│   └── __tests__/
│       ├── v1.endpoint.test.ts           # Unit tests
│       └── v1.endpoint.integration.test.ts # Integration tests
├── logic/                      # Business logic (Private)
│   ├── business.logic.ts       # Pure business functions
│   ├── steps.logic.ts          # Pipeline step definitions
│   └── __tests__/
│       ├── business.logic.test.ts        # Unit tests
│       ├── steps.logic.test.ts           # Unit tests
│       └── pipeline.integration.test.ts  # Integration tests
└── types/                      # Local types (Optional)
    └── {command}.types.ts
```

## 📄 File Responsibilities

### 1. `index.ts` - Public API
**Purpose**: Export only the public API (endpoints) that external consumers need.

**✅ Good Example**:
```typescript
// Only export public endpoints
export * from './endpoint/v1.endpoint';
```

**❌ Bad Example**:
```typescript
// Don't export internal implementation details
export * from './endpoint/v1.endpoint';
export * from './logic/business.logic';  // ❌ Internal details
export * from './logic/steps.logic';     // ❌ Internal details
```

### 2. `endpoint/v1.endpoint.ts` - HTTP Handler
**Purpose**: Handle HTTP requests, integrate with protect pipeline, manage telemetry.

**Structure**:
```typescript
import { UnifiedRouteHandler, UnifiedHandlerFn } from "@inh-lib/unified-route";
import { protectApiPipeline } from "@shared-api-service/shared/pipeline/protect-api.pipeline";
import { mapReqToInputStep, processBusinessLogicStep, completeStep } from "../logic/steps.logic";

/**
 * {Command Name} Endpoint V1
 * 
 * {Brief description of what this endpoint does}
 */
export const {commandName}EndpointV1: UnifiedRouteHandler = async (context): Promise<void> => {
    const apiPipeline = protectApiPipeline.setHandler({commandName}EndpointV1Handler);
    await apiPipeline.execute(context);
}

const {commandName}EndpointV1Handler: UnifiedHandlerFn = async (context) => {
    const telemetryService = getRegistryItem(context, TELEMETRY_CONTEXT_KEYS.MIDDLEWARE_SERVICE) as TelemetryMiddlewareService;
    
    // Create process pipeline with telemetry support
    const processParams: ProcessPipelineParams = {
        context,
        telemetryService
    };
    
    const bizPipeline = new ProcessPipeline<ProcessPipelineParams, OutputDTO>()
        .use(mapReqToInputStep)
        .use(processBusinessLogicStep)
        .use(completeStep);
        
    const result = await bizPipeline.execute(processParams);
    result.toHttpResponse(context.response);
}
```

### 3. `logic/business.logic.ts` - Pure Business Functions
**Purpose**: Contain pure business functions that implement the core logic.

**Structure**:
```typescript
// ===================================================================
// STEP 1: Parse Request to Input DTO
// ===================================================================

/**
 * Parse HTTP request body to InputDTO with validation
 */
export const parseReqToInputDTO: ParserFn<InputDTO> = (request, _registry) => {
    // Pure function - validation logic
};

/**
 * Map InputDTO to process state
 */
export const setInputDTOToState: StateMapperFn<InputDTO> = (input) => {
    // Pure function - state mapping
};

// ===================================================================
// STEP 2: Execute Business Logic
// ===================================================================

/**
 * Prepare input arguments for business logic execution
 */
export const getProcessInput: GetInitialInputFn<...> = (params) => {
    // Pure function - input preparation
};

/**
 * Execute core business logic
 */
export const processBusinessLogic: ExecutionAsyncFn<...> = async (inputArgs) => {
    // Business logic execution (may have side effects via repository)
};

/**
 * Map business result to process state
 */
export const setOutputToState: StateMapperFn<OutputDTO> = (output) => {
    // Pure function - state mapping
};

// ===================================================================
// STEP 3: Complete Process and Return Final Result
// ===================================================================

/**
 * Extract output from process state for final response
 */
export const completeMapper: StateToDataFn<OutputDTO> = (state) => {
    // Pure function - final result extraction
};
```

### 4. `logic/steps.logic.ts` - Pipeline Step Definitions
**Purpose**: Define pipeline steps using helper functions from pipeline-helpers.

**Structure**:
```typescript
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
 * Step 1: Parse HTTP request to InputDTO and update state
 */
export const mapReqToInputStep = createParseRequestToInputStep(
    "mapReqToInputStep", 
    parseReqToInputDTO, 
    setInputDTOToState
);

/**
 * Step 2: Execute core business logic
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
export const completeStep = createCompletionStep<ProcessPipelineParams, OutputDTO>(
    "completeStep", 
    completeMapper
);
```

## 🎯 Code Organization Principles

### 1. **Separation of Concerns**
- **Endpoint**: HTTP handling, telemetry, pipeline orchestration
- **Business Logic**: Pure business functions, domain logic
- **Steps**: Pipeline configuration, step definitions

### 2. **Pure Function Priority**
- Business logic functions should be pure when possible
- Side effects (repository calls, external services) should be clearly identified
- Pure functions are easier to test and reason about

### 3. **Clear Dependencies**
- Internal dependencies flow: `endpoint` → `steps` → `business.logic`
- External dependencies are injected through context/registry
- No circular dependencies

### 4. **Consistent Naming**
- Commands: `{action}-{entity}` (e.g., `add-example`, `update-status`)
- Functions: `{verb}{Entity}` (e.g., `parseReqToInputDTO`, `processBusinessLogic`)
- Steps: `{action}Step` (e.g., `mapReqToInputStep`, `processBusinessLogicStep`)

## 🧪 Testing Structure

### Unit Tests (Co-located)
```typescript
// logic/__tests__/business.logic.test.ts
describe('Business Logic Unit Tests', () => {
  describe('parseReqToInputDTO', () => {
    it('should parse valid request', () => {
      // Test pure function logic
    });
  });
});

// endpoint/__tests__/v1.endpoint.test.ts
describe('Endpoint Unit Tests', () => {
  it('should handle request with mocked dependencies', () => {
    // Test endpoint handler with mocks
  });
});
```

### Integration Tests (Co-located)
```typescript
// logic/__tests__/pipeline.integration.test.ts
describe('Pipeline Integration Tests', () => {
  it('should execute complete pipeline flow', () => {
    // Test full pipeline with real steps, mocked external dependencies
  });
});

// endpoint/__tests__/v1.endpoint.integration.test.ts
describe('Endpoint Integration Tests', () => {
  it('should integrate with real pipeline', () => {
    // Test endpoint + pipeline + real internal dependencies
  });
});
```

## 📦 Module Exports Strategy

### Command/Query Level
```typescript
// index.ts - Only export public API
export * from './endpoint/v1.endpoint';
```

### API Domain Level
```typescript
// feed-registration-api/index.ts
export * from './command/add-example';
export * from './command/continue-next-step';
export * from './query/get-registration';
```

### Service Level
```typescript
// src/index.ts
export * from './feed-registration-api';
export * from './process-setting-api';
export * from './example-api';
```

## 🚀 Benefits of This Structure

### 1. **Consistency**
- Every command/query follows the same pattern
- Easy for team members to navigate and understand
- Reduces onboarding time for new developers

### 2. **Maintainability**
- Clear separation makes it easy to modify specific parts
- Business logic is isolated and testable
- Changes to endpoints don't affect business logic

### 3. **Testability**
- Pure functions are easy to unit test
- Integration points are clearly defined
- Test structure mirrors code structure

### 4. **Scalability**
- Pattern scales well as the service grows
- Easy to add new commands/queries
- Clear boundaries prevent module coupling

### 5. **Reusability**
- Business logic can be reused across different endpoints
- Pipeline helpers promote code reuse
- Clear interfaces enable easy composition

## 📋 Checklist for New Commands/Queries

When creating a new command or query, ensure:

- [ ] Folder structure follows the standard pattern
- [ ] `index.ts` exports only the public endpoint
- [ ] Business logic is separated into pure functions
- [ ] Pipeline steps are properly defined
- [ ] Unit tests are co-located with source code
- [ ] Integration tests cover pipeline flow
- [ ] JSDoc comments explain function purposes
- [ ] Error handling follows the Result pattern
- [ ] Telemetry is properly configured
- [ ] Dependencies are injected through context/registry

---

*Last updated: October 31, 2025*
*Version: 1.0.0*