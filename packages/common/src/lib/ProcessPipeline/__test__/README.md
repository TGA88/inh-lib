# ProcessPipeline Unit Tests

This directory contains comprehensive unit tests for the ProcessPipeline library, covering both core functionality and utility helpers.

## Test Structure

### 📁 Test Files

- **`process-pipeline.spec.ts`** - Core ProcessPipeline class tests (23 tests)
- **`process-helpers.spec.ts`** - Utility helper functions tests (26 tests)  
- **`integration.spec.ts`** - Real-world integration scenarios (10 tests)

**Total: 59 tests passing** ✅

## Test Categories

### 🏗️ Core ProcessPipeline Tests (`process-pipeline.spec.ts`)

#### Pipeline Construction (5 tests)
- Empty pipeline creation
- Single/multiple middleware addition
- Handler configuration
- Method chaining (fluent interface)

#### Success Execution Cases (8 tests)
- Empty pipeline execution
- Single/multiple middleware execution order
- Handler execution after middlewares
- Context sharing between middlewares
- Output setting and preservation
- Continued execution after output setting

#### Error Handling Cases (6 tests)
- Middleware failure handling
- Handler failure handling
- Thrown exception handling
- Non-Error exception handling
- State preservation during failures

#### Async Support (2 tests)
- Async middleware support
- Async handler support

#### Context Properties (2 tests)
- Readonly property access
- Flag updates (completed/failed)
- Output/error setting behavior

### 🔧 Helper Functions Tests (`process-helpers.spec.ts`)

#### `fail()` Function (5 tests)
- Error object setting
- String to Error conversion
- State preservation during failure
- Output preservation during failure
- Multiple fail calls handling

#### `complete()` Function (5 tests)
- Output setting and completion marking
- State preservation during completion
- Multiple complete calls handling
- Error state interaction
- Complex object handling

#### `isCompleted()` Function (6 tests)
- Initial false state
- True state after output setting
- Helper function integration
- Multiple setting persistence
- Error state independence
- Non-mutating behavior

#### `isFailed()` Function (6 tests)
- Initial false state
- True state after error setting
- Helper function integration
- Multiple setting persistence
- Completion state independence
- Non-mutating behavior

#### Integration Scenarios (4 tests)
- Typical success workflow
- Failure workflow
- Mixed completion/failure states
- Type safety validation

### 🎯 Integration Tests (`integration.spec.ts`)

#### Real-world User Validation Pipeline (7 tests)
- Complete validation success flow
- Individual validation failures (email, age, name)
- Multiple error accumulation
- Age categorization logic

#### Early Exit Scenarios (2 tests)
- Early completion in middleware
- Early failure in middleware

#### Advanced State Management (1 test)
- Complex state sharing between components
- Metadata handling
- Processing step tracking

## Type Safety Features

All tests are written with **strict TypeScript compliance**:

- ❌ **No `any` types used**
- ❌ **No `enum` types used** 
- ❌ **No `Function` types used**
- ✅ **Proper interface definitions**
- ✅ **Generic type constraints**
- ✅ **Type-safe mock functions**

## Test Patterns & Best Practices

### Mock Setup
```typescript
// Type-safe Jest mocks
const middlewareSpy = jest.fn<void, [ProcessContext<TestInput, TestOutput>]>();

// Proper mock context creation
const createMockContext = <TInput, TOutput>(input: TInput): ProcessContext<TInput, TOutput> => {
  // Implementation with proper getters/setters
};
```

### Async Testing
```typescript
// Helper function to avoid deep nesting
const delay = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

// Usage in tests
await delay(10);
```

### State Access
```typescript
// Using bracket notation for index signatures
ctx.state['propertyName'] = value;
expect(ctx.state['propertyName']).toBe(value);
```

## Integration Scenarios

### User Validation Pipeline
Real-world example testing a complete user validation workflow:

1. **Email Validation** - Format checking and normalization
2. **Age Validation** - Range checking and categorization  
3. **Name Validation** - Length and format checking
4. **Result Processing** - Error accumulation and user creation

### Early Exit Patterns
- Early completion when conditions are met
- Early failure with proper error propagation
- State preservation across early exits

### Error Recovery
- Graceful error handling
- Retry mechanisms
- State-based recovery logic

## Running Tests

```bash
# Run all ProcessPipeline tests
npx nx test common --testPathPattern="ProcessPipeline"

# Run specific test file
npx nx test common --testNamePattern="Core ProcessPipeline"
npx nx test common --testNamePattern="ProcessHelpers"
npx nx test common --testNamePattern="Integration"

# Run with coverage
npx nx test common --testPathPattern="ProcessPipeline" --coverage
```

## Coverage Areas

✅ **Pipeline Construction & Configuration**  
✅ **Middleware Execution Order**  
✅ **Error Handling & Propagation**  
✅ **Async/Await Support**  
✅ **Context State Management**  
✅ **Helper Function Integration**  
✅ **Type Safety & Generics**  
✅ **Real-world Use Cases**  
✅ **Edge Cases & Error Conditions**  

## Contributing

When adding new tests:

1. Follow existing naming conventions
2. Maintain TypeScript strict mode compliance
3. Use descriptive test names
4. Group related tests in `describe` blocks
5. Add integration tests for complex scenarios
6. Document any new test patterns

---

*Generated test suite provides comprehensive coverage of ProcessPipeline functionality with 59 passing tests and full TypeScript compliance.*