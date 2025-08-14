# Contributing to UnifiedTelemetryProcesser

Welcome to the UnifiedTelemetryProcesser project! This guide will help you get started as a contributor.

## 🛠️ **Development Environment Setup**

### Prerequisites

- **Node.js**: >= 18.0.0
- **npm**: >= 8.0.0
- **TypeScript**: >= 5.0.0
- **Git**: Latest version

### Initial Setup

```bash
# Clone the repository
git clone https://github.com/your-org/unified-telemetry-processer.git
cd unified-telemetry-processer

# Install dependencies
npm install

# Install peer dependencies for development
npm install --save-dev @inh-lib/unified-telemetry-middleware @inh-lib/unified-route

# Run tests to verify setup
npm test

# Build the project
npm run build

# Start development mode with watch
npm run dev
```

### Environment Configuration

Create a `.env.development` file:

```bash
NODE_ENV=development
LOG_LEVEL=debug
TELEMETRY_ENABLED=true
```

## 📁 **Project Structure**

```
unified-telemetry-processer/
├── src/
│   ├── index.ts                           # Main export file
│   ├── unified-telemetry-processer.ts     # Core implementation
│   ├── types/
│   │   ├── index.ts                       # Type definitions
│   │   └── internal.ts                    # Internal types
│   ├── helpers/
│   │   ├── factory.ts                     # Helper factory functions
│   │   └── validation.ts                 # Input validation utilities
│   └── utils/
│       ├── safe-stringify.ts              # Safe JSON serialization
│       └── performance.ts                 # Performance utilities
├── tests/
│   ├── unit/
│   │   ├── unified-telemetry-processer.test.ts
│   │   ├── helpers/
│   │   └── utils/
│   ├── integration/
│   │   ├── real-world-scenarios.test.ts
│   │   └── performance.test.ts
│   ├── fixtures/
│   │   ├── mock-data.ts
│   │   └── test-helpers.ts
│   └── __mocks__/
│       └── telemetry-service.ts
├── examples/
│   ├── basic-usage/
│   ├── advanced-patterns/
│   └── migration-guides/
├── docs/
│   ├── architecture/
│   │   ├── decision-records/
│   │   └── design-patterns.md
│   ├── api/
│   └── guides/
├── scripts/
│   ├── build.sh
│   ├── test.sh
│   └── release.sh
├── .github/
│   ├── workflows/
│   │   ├── ci.yml
│   │   ├── release.yml
│   │   └── security.yml
│   ├── ISSUE_TEMPLATE/
│   └── PULL_REQUEST_TEMPLATE.md
├── package.json
├── tsconfig.json
├── tsconfig.build.json
├── jest.config.js
├── .eslintrc.js
├── .prettierrc
├── README.md
└── CONTRIBUTING.md
```

## 🎨 **Code Standards & Guidelines**

### TypeScript Guidelines

```typescript
// ✅ Use explicit types for public APIs
export function createDatabaseProcessor<
    Args extends readonly [UnifiedHttpContext, ...unknown[]], 
    R
>(
    telemetryService: TelemetryMiddlewareService,
    fn: ProcessorFunction<Args, R>,
    operationName: string,
    tableName?: string
): UnifiedTelemetryProcesser<Args, R> {
    // Implementation
}

// ✅ Use proper error types
class ProcessorValidationError extends Error {
    constructor(
        message: string,
        public readonly operationName: string,
        public readonly validationErrors: string[]
    ) {
        super(message);
        this.name = 'ProcessorValidationError';
    }
}

// ✅ Document complex types
/**
 * Configuration options for telemetry processor
 * @template Args - Function argument types starting with UnifiedHttpContext
 * @template R - Function return type
 */
interface ProcessorOptions {
    /** Telemetry operation type for span classification */
    operationType?: TelemetryOperationType;
    /** Layer designation for proper span hierarchy */
    layer?: TelemetryLayerType;
    /** Custom attributes to be added to the span */
    attributes?: TelemetryAttributes;
}

// ✅ Use const assertions for immutable data
export const SUPPORTED_OPERATIONS = [
    'database',
    'query', 
    'command',
    'integration'
] as const;

// ❌ Avoid any types
function badExample(data: any): any { // ❌ Never use any
    return data;
}

// ✅ Use proper generics instead
function goodExample<T>(data: T): T {
    return data;
}
```

### Naming Conventions

```typescript
// ✅ Classes: PascalCase
class UnifiedTelemetryProcesser { }

// ✅ Functions: camelCase with descriptive names
function createDatabaseProcessor() { }
function validateOperationName() { }

// ✅ Constants: SCREAMING_SNAKE_CASE
const DEFAULT_TIMEOUT_MS = 5000;
const TELEMETRY_OPERATION_TYPES = { } as const;

// ✅ Types: PascalCase
interface ProcessorOptions { }
type TelemetryLayerType = string;

// ✅ Variables: camelCase
const telemetryService = new TelemetryService();
const operationStartTime = process.hrtime.bigint();

// ✅ Private methods: camelCase with underscore prefix
class Example {
    private _validateInput(input: unknown): boolean { }
}
```

### Error Handling Patterns

```typescript
// ✅ Create specific error types
export class ProcessorError extends Error {
    constructor(
        message: string,
        public readonly operationName: string,
        public readonly originalError?: Error
    ) {
        super(message);
        this.name = 'ProcessorError';
        
        // Maintain stack trace
        if (originalError?.stack) {
            this.stack = originalError.stack;
        }
    }
}

// ✅ Proper error handling in async functions
async function processWithErrorHandling<T>(
    operation: () => Promise<T>,
    operationName: string
): Promise<T> {
    try {
        return await operation();
    } catch (error) {
        if (error instanceof Error) {
            throw new ProcessorError(
                `Failed to execute ${operationName}: ${error.message}`,
                operationName,
                error
            );
        }
        
        throw new ProcessorError(
            `Failed to execute ${operationName}: Unknown error`,
            operationName
        );
    }
}

// ✅ Input validation with clear error messages
function validateOperationName(name: string): void {
    if (!name || typeof name !== 'string') {
        throw new ProcessorValidationError(
            'Operation name must be a non-empty string',
            name,
            ['operationName: required', 'operationName: must be string']
        );
    }
    
    if (name.length > 100) {
        throw new ProcessorValidationError(
            'Operation name too long',
            name,
            ['operationName: must be <= 100 characters']
        );
    }
}
```

## 🧪 **Testing Requirements**

### Testing Standards

- **Unit Test Coverage**: Minimum 95% line coverage
- **Integration Tests**: All helper functions must have integration tests
- **Performance Tests**: Critical paths must have performance benchmarks
- **Type Tests**: Public APIs must have type-level tests

### Test Structure

```typescript
// ✅ Proper test structure
describe('UnifiedTelemetryProcesser', () => {
    describe('constructor', () => {
        it('should create instance with valid parameters', () => {
            // Arrange
            const mockService = createMockTelemetryService();
            const mockFunction = jest.fn();
            
            // Act
            const processor = new UnifiedTelemetryProcesser(
                mockService,
                mockFunction,
                'test.operation'
            );
            
            // Assert
            expect(processor).toBeInstanceOf(UnifiedTelemetryProcesser);
        });
        
        it('should throw error for invalid function parameter', () => {
            // Arrange
            const mockService = createMockTelemetryService();
            
            // Act & Assert
            expect(() => {
                new UnifiedTelemetryProcesser(
                    mockService,
                    'not-a-function' as any,
                    'test.operation'
                );
            }).toThrow(ProcessorValidationError);
        });
    });
    
    describe('process', () => {
        let processor: UnifiedTelemetryProcesser<[UnifiedHttpContext], string>;
        let mockService: jest.Mocked<TelemetryMiddlewareService>;
        let mockContext: UnifiedHttpContext;
        
        beforeEach(() => {
            mockService = createMockTelemetryService();
            mockContext = createMockContext();
            
            processor = new UnifiedTelemetryProcesser(
                mockService,
                async (ctx: UnifiedHttpContext) => 'test-result',
                'test.process'
            );
        });
        
        it('should execute function and return result', async () => {
            // Act
            const result = await processor.process(mockContext);
            
            // Assert
            expect(result).toBe('test-result');
            expect(mockService.createActiveSpan).toHaveBeenCalledWith(
                mockContext,
                'test.process',
                expect.objectContaining({
                    operationType: TELEMETRY_OPERATION_TYPES.CUSTOM,
                    layer: TELEMETRY_LAYERS.CUSTOM
                })
            );
        });
        
        it('should handle function errors properly', async () => {
            // Arrange
            const testError = new Error('Test error');
            const failingProcessor = new UnifiedTelemetryProcesser(
                mockService,
                async () => { throw testError; },
                'test.failing'
            );
            
            // Act & Assert
            await expect(failingProcessor.process(mockContext))
                .rejects.toThrow('Test error');
                
            // Verify error handling
            const mockSpan = mockService.createActiveSpan.mock.results[0].value.span;
            expect(mockSpan.recordException).toHaveBeenCalledWith(testError);
            expect(mockSpan.setStatus).toHaveBeenCalledWith({
                code: 'error',
                message: 'Test error'
            });
        });
    });
});
```

### Performance Testing

```typescript
describe('Performance', () => {
    it('should have minimal overhead', async () => {
        // Arrange
        const iterations = 1000;
        const mockService = createMockTelemetryService();
        const processor = createDatabaseProcessor(
            mockService,
            async () => 'result',
            'perf.test'
        );
        
        // Act
        const startTime = process.hrtime.bigint();
        
        const promises = Array.from({ length: iterations }, () =>
            processor.process(createMockContext())
        );
        
        await Promise.all(promises);
        
        const endTime = process.hrtime.bigint();
        const durationMs = Number(endTime - startTime) / 1000000;
        const avgDurationMs = durationMs / iterations;
        
        // Assert
        expect(avgDurationMs).toBeLessThan(5); // Should be < 5ms per operation
    });
    
    it('should handle high concurrency', async () => {
        // Test concurrent execution without memory leaks
        const concurrentOperations = 100;
        // Implementation...
    });
});
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- unified-telemetry-processer.test.ts

# Run integration tests
npm run test:integration

# Run performance tests
npm run test:performance

# Run type checking
npm run type-check
```

## 🔄 **Contribution Workflow**

### 1. Issue Creation

Before starting work:

1. **Search existing issues** to avoid duplicates
2. **Create detailed issue** with:
   - Problem description
   - Expected vs actual behavior
   - Minimal reproduction example
   - Environment details
   - Proposed solution (if any)

### 2. Branch Strategy

```bash
# Feature branch naming
feature/add-custom-attributes-support
feature/improve-error-handling

# Bug fix branch naming  
fix/circular-reference-error
fix/memory-leak-in-span-cleanup

# Chore branch naming
chore/update-dependencies
chore/improve-test-coverage
```

### 3. Development Process

```bash
# 1. Create feature branch
git checkout -b feature/your-feature-name

# 2. Make changes following code standards
# 3. Add/update tests
# 4. Run test suite
npm test

# 5. Run linting
npm run lint

# 6. Run type checking
npm run type-check

# 7. Build project
npm run build

# 8. Commit with conventional commit format
git commit -m "feat: add support for custom attributes in processor options

- Add ProcessorOptions.customAttributes field
- Update helper functions to accept custom attributes
- Add validation for attribute values
- Include tests for custom attribute functionality

Closes #123"
```

### 4. Commit Message Format

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): subject

body

footer
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
```bash
feat(processor): add support for custom retry logic

fix(telemetry): resolve circular reference in attribute serialization

docs(readme): update installation instructions

test(integration): add performance benchmarks for database operations

chore(deps): update @inh-lib/unified-telemetry-middleware to v2.1.0
```

### 5. Pull Request Process

1. **Create PR** with descriptive title and description
2. **Fill out PR template** completely
3. **Ensure CI passes** (tests, linting, type checking)
4. **Request review** from maintainers
5. **Address feedback** promptly
6. **Squash and merge** when approved

### PR Template Checklist

- [ ] Tests added/updated for new functionality
- [ ] Documentation updated (README, JSDoc comments)
- [ ] No breaking changes (or properly documented)
- [ ] Performance impact considered
- [ ] Security implications reviewed
- [ ] Backward compatibility maintained

## 🚀 **Release Process**

### Version Management

We follow [Semantic Versioning](https://semver.org/):

- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

### Release Workflow

```bash
# 1. Update version
npm version patch|minor|major

# 2. Update CHANGELOG.md
# Document all changes since last release

# 3. Create release PR
git checkout -b release/v1.2.3
git commit -m "chore(release): v1.2.3"

# 4. After PR approval and merge
git tag v1.2.3
git push origin v1.2.3

# 5. GitHub Actions will automatically:
# - Build and test
# - Publish to npm
# - Create GitHub release
# - Update documentation
```

## 📚 **Architecture Guidelines**

### Design Principles

1. **Single Responsibility**: Each processor handles one concern
2. **Type Safety**: Leverage TypeScript for compile-time guarantees
3. **Performance**: Minimal runtime overhead
4. **Extensibility**: Easy to add new operation types
5. **Testability**: Pure functions where possible

### Adding New Features

When adding new features:

1. **Create ADR** (Architecture Decision Record) in `docs/architecture/decision-records/`
2. **Design interfaces first** before implementation
3. **Consider backward compatibility**
4. **Plan migration strategy** for breaking changes
5. **Document performance implications**

### Performance Guidelines

- **Avoid synchronous I/O** in hot paths
- **Minimize object allocation** in frequently called functions
- **Use lazy evaluation** for expensive operations
- **Profile memory usage** for long-running processes
- **Benchmark critical paths** and maintain performance budgets

## 🔒 **Security Considerations**

### Secure Coding Practices

```typescript
// ✅ Input validation
function validateInput(input: unknown): asserts input is ValidInput {
    if (!isValidInput(input)) {
        throw new ValidationError('Invalid input format');
    }
}

// ✅ Avoid prototype pollution
function safeAttributeAssign(target: Record<string, unknown>, source: unknown) {
    if (!source || typeof source !== 'object') return target;
    
    for (const [key, value] of Object.entries(source)) {
        // Prevent prototype pollution
        if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
            continue;
        }
        target[key] = value;
    }
    
    return target;
}

// ✅ Safe JSON handling
function safeStringify(obj: unknown): string {
    try {
        return JSON.stringify(obj, (key, value) => {
            // Remove potentially sensitive keys
            if (typeof key === 'string' && SENSITIVE_KEYS.includes(key)) {
                return '[REDACTED]';
            }
            return value;
        });
    } catch {
        return '[STRINGIFY_ERROR]';
    }
}
```

### Security Checklist

- [ ] No hardcoded secrets or credentials
- [ ] Input validation on all public APIs
- [ ] Protection against prototype pollution
- [ ] Safe handling of user-provided data
- [ ] Proper error messages (no information leakage)
- [ ] Dependencies regularly updated
- [ ] Security audit of dependencies

## 📞 **Getting Help**

### Communication Channels

- **GitHub Discussions**: General questions and ideas
- **GitHub Issues**: Bug reports and feature requests
- **Slack**: #unified-telemetry-dev (for contributors)
- **Email**: dev-team@your-org.com

### Maintainer Responsibilities

Current maintainers:
- **@lead-dev**: Overall project direction
- **@telemetry-expert**: Telemetry integration
- **@typescript-guru**: Type system and API design

### Code Review Guidelines

For reviewers:
- Focus on code quality, security, and performance
- Provide constructive feedback with suggestions
- Test locally when possible
- Verify documentation updates
- Check for breaking changes

For contributors:
- Respond to feedback promptly
- Ask questions if feedback is unclear
- Make requested changes in separate commits
- Update PR description when scope changes

## 🎯 **Roadmap & Future Plans**

See [ROADMAP.md](./ROADMAP.md) for:
- Planned features
- Performance improvements
- API evolution
- Breaking change timeline

Thank you for contributing to UnifiedTelemetryProcesser! 🎉