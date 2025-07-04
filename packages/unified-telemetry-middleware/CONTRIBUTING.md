# Contributing to @inh-lib/unified-telemetry-middleware

We love your input! We want to make contributing to this project as easy and transparent as possible, whether it's:

- Reporting a bug
- Discussing the current state of the code
- Submitting a fix
- Proposing new features
- Becoming a maintainer

## Development Process

We use GitHub to host code, track issues and feature requests, as well as accept pull requests.

### We Use [GitHub Flow](https://guides.github.com/introduction/flow/index.html)

Pull requests are the best way to propose changes to the codebase:

1. Fork the repo and create your branch from `main`
2. If you've added code that should be tested, add tests
3. If you've changed APIs, update the documentation
4. Ensure the test suite passes
5. Make sure your code lints
6. Issue that pull request!

## Development Setup

### Prerequisites

- Node.js 16.x or higher
- npm 7.x or higher

### Setup Steps

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/unified-telemetry-middleware.git
cd unified-telemetry-middleware

# Install dependencies
npm install

# Run tests to ensure everything works
npm test

# Start development mode
npm run dev
```

### Project Structure

```
src/
├── services/                    # Public service classes
│   └── telemetry-middleware.service.ts
├── telemetry-middleware.const.ts # Public constants
└── index.ts                     # Main exports

internal/                        # Private implementation
├── adapters/                    # Interface adapters
├── logic/                       # Business logic
├── types/                       # Internal types
├── utils/                       # Utilities
└── constants/                   # Internal constants

tests/                           # Test files
examples/                        # Usage examples
```

## Code Style Guidelines

### TypeScript Standards

- ✅ **No `any` types** - Use proper typing
- ✅ **Use union types** instead of enums
- ✅ **Prefer composition** over inheritance
- ✅ **Function purity** - Avoid side effects where possible
- ✅ **Explicit return types** for public APIs

### Naming Conventions

#### Files
- **Service classes**: `*.service.ts`
- **Constants**: `*.const.ts`
- **Types**: `*.types.ts`
- **Logic**: `*.logic.ts`
- **Utils**: `*.utils.ts`
- **Tests**: `*.test.ts` or `*.spec.ts`

#### Code
- **Classes**: PascalCase (`TelemetryMiddlewareService`)
- **Interfaces**: PascalCase without "I" prefix (`UnifiedHttpContext`)
- **Functions**: camelCase (`createMiddleware`)
- **Constants**: UPPER_SNAKE_CASE (`TELEMETRY_HEADERS`)
- **Variables**: camelCase (`telemetryService`)

### Architecture Principles

#### 1. Clean Service Layer
```typescript
// ✅ Good: Service class with utils
export class TelemetryMiddlewareService {
  createMiddleware(): UnifiedMiddleware {
    return createMiddlewareHandler(this.dependencies);
  }
}

// ✅ Supporting utility function
function createMiddlewareHandler(deps: Dependencies): UnifiedMiddleware {
  // Implementation
}
```

#### 2. No Private Methods in Classes
```typescript
// ❌ Bad: Private methods
export class MyService {
  private helperMethod() { } // Don't do this
}

// ✅ Good: Utils functions
export class MyService {
  publicMethod() {
    return helperFunction(this.data);
  }
}

function helperFunction(data: Data) {
  // Implementation
}
```

#### 3. Internal vs Public Separation
```typescript
// ✅ Public exports (src/index.ts)
export { TelemetryMiddlewareService } from './services/telemetry-middleware.service';
export { TELEMETRY_HEADERS } from './telemetry-middleware.const';

// ❌ Don't export internal types or utilities
// export { InternalTraceContext } from './internal/types/middleware.types';
```

## Testing Guidelines

### Test Categories

1. **Unit Tests** - Test individual functions and classes
2. **Integration Tests** - Test middleware with mock contexts
3. **Example Tests** - Verify examples work correctly

### Writing Tests

```typescript
describe('TelemetryMiddlewareService', () => {
  let service: TelemetryMiddlewareService;
  let mockProvider: UnifiedTelemetryProvider;

  beforeEach(() => {
    // Use NoOp provider for testing
    mockProvider = new NoOpUnifiedTelemetryProvider(config);
    service = new TelemetryMiddlewareService(mockProvider, config);
  });

  afterEach(async () => {
    await service.shutdown();
  });

  it('should create middleware', () => {
    const middleware = service.createMiddleware();
    expect(typeof middleware).toBe('function');
  });
});
```

### Coverage Requirements

- **Minimum coverage**: 70% for all metrics
- **Critical paths**: Must have 90%+ coverage
- **New features**: Must include comprehensive tests

## Documentation

### Code Documentation

- **Public APIs**: Full JSDoc comments
- **Complex logic**: Inline comments explaining why
- **Type definitions**: Clear interface documentation

```typescript
/**
 * Creates telemetry middleware for unified-route
 * 
 * @param config - Configuration options for telemetry
 * @returns Middleware function for use with unified-route
 * 
 * @example
 * ```typescript
 * const middleware = service.createMiddleware();
 * const handler = composeMiddleware([middleware])(routeHandler);
 * ```
 */
createMiddleware(config: MiddlewareConfig): UnifiedMiddleware {
  // Implementation
}
```

### README Updates

When adding features:
1. Update the feature list
2. Add usage examples
3. Update configuration documentation
4. Add any new dependencies

## Submitting Changes

### Pull Request Process

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```

2. **Make Changes**
   - Follow code style guidelines
   - Add tests for new functionality
   - Update documentation

3. **Test Your Changes**
   ```bash
   npm run lint          # Check code style
   npm test              # Run all tests
   npm run build         # Ensure it builds
   ```

4. **Commit with Conventional Commits**
   ```bash
   git commit -m "feat: add amazing new feature"
   git commit -m "fix: resolve issue with trace extraction"
   git commit -m "docs: update README with new examples"
   ```

5. **Push and Create PR**
   ```bash
   git push origin feature/amazing-feature
   ```

### Commit Message Format

We use [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `test:` - Test additions or changes
- `refactor:` - Code refactoring
- `perf:` - Performance improvements
- `chore:` - Maintenance tasks

### PR Requirements

- [ ] Tests pass (`npm test`)
- [ ] Code lints (`npm run lint`)
- [ ] Documentation updated
- [ ] Examples work if applicable
- [ ] Breaking changes documented

## Issue Reporting

### Bug Reports

Please include:
- Clear description of the issue
- Steps to reproduce
- Expected vs actual behavior
- Environment details (Node.js version, etc.)
- Code examples if applicable

```markdown
**Bug Description**
Clear description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:
1. Create middleware with config '...'
2. Make request to '...'
3. See error

**Expected Behavior**
A clear description of what you expected to happen.

**Environment**
- Node.js version: [e.g., 18.17.0]
- Package version: [e.g., 1.2.3]
- Framework: [e.g., Express 4.18.0]
```

### Feature Requests

Please include:
- Clear description of the feature
- Use case explanation
- Proposed API if applicable
- Alternative solutions considered

## Performance Considerations

### Guidelines

1. **Minimal Overhead** - Telemetry shouldn't significantly impact performance
2. **Lazy Loading** - Initialize resources only when needed
3. **Memory Management** - Clean up resources properly
4. **Async Operations** - Don't block the event loop

### Benchmarking

When making performance-related changes:

```bash
# Run performance tests
npm run bench

# Profile memory usage
node --inspect examples/express-example.js
```

## Security

### Reporting Security Issues

Please **DO NOT** file public issues for security vulnerabilities. Instead:

1. Email security@inh-lib.com
2. Include detailed description
3. Provide reproduction steps if possible
4. Allow time for fix before disclosure

### Security Guidelines

- Never log sensitive data (passwords, tokens, etc.)
- Sanitize user inputs in telemetry data
- Follow principle of least privilege
- Keep dependencies updated

## Release Process

### Version Numbering

We use [Semantic Versioning](https://semver.org/):

- **MAJOR** - Breaking changes
- **MINOR** - New features (backward compatible)
- **PATCH** - Bug fixes (backward compatible)

### Automated Releases

Releases are automated via semantic-release:

1. Merge to `main` triggers CI/CD
2. semantic-release analyzes commits
3. Generates changelog and version
4. Publishes to npm automatically

## Community Guidelines

### Code of Conduct

Be respectful and inclusive:

- Use welcoming and inclusive language
- Be respectful of differing viewpoints
- Accept constructive criticism gracefully
- Focus on what's best for the community

### Getting Help

- **Documentation**: Check README and examples first
- **Issues**: Search existing issues before creating new ones
- **Discussions**: Use GitHub Discussions for questions
- **Discord**: Join our community Discord (link in README)

## Recognition

Contributors are recognized in:

- GitHub contributors list
- CHANGELOG.md for significant contributions
- README.md for major features

Thank you for contributing! 🙏