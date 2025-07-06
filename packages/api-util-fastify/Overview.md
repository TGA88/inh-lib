📚 Series Structure:
Part 1: Getting Started (README.md) ← ปัจจุบัน

✅ Installation & Quick Start
✅ API Reference
✅ Basic CRUD Examples
✅ Testing Basics
✅ Migration Guide

Part 2: Schema Validation with Zod (docs/02-zod-validation.md)

Zod installation และ setup
Schema definitions และ type inference
Validation helpers และ error handling
Advanced patterns (conditional, unions)
Integration กับ Fastify schemas

Part 3: Framework-Agnostic Architecture (docs/03-framework-agnostic.md)

Route library patterns
Commands and Queries (CQRS)
Business logic separation
Reusability patterns
Testing strategies

🆓 Part 4: Free Edition - เหมาะสำหรับ startup และ mid-size teams

Table of Content
✅ CQRS Pattern - Separate Commands (write) and Queries (read) for focused operations
✅ Validation Layers - Clear separation between Schema, Business, Rules, and Side Effects
✅ Basic DI Container - Automatic dependency management for enterprise applications
✅ Route Libraries - Systematic route organization with middleware composition
✅ Repository Interfaces - Clean data access abstraction for testing & flexibility
✅ Decision Framework - Know when to use enterprise vs simple patterns
✅ Gradual Migration - Start simple, add patterns as complexity grows


💎 Advanced DI Container: Premium Edition - สำหรับ large enterprise teams
1. Service Lifecycles

Singleton: One instance ตลอด application lifetime
Transient: New instance ทุกครั้งที่เรียกใช้
Scoped: One instance per scope (เช่น per HTTP request)
Lifecycle management และ automatic cleanup

2. Conditional Registration & Environment-Specific Services

Environment-aware service registration
Conditional registration based on config/environment
Fallback service registration
Configuration-driven service selection

3. Module-Based Registration

Service modules สำหรับ organized registration
Dependency resolution และ topological sorting
Health checks per module
Circular dependency detection

4. Factory Patterns & Lazy Loading

Factory registration สำหรับ complex object creation
Lazy loading สำหรับ expensive services
Async service initialization
Configuration-based factory selection

5. Request-Scoped Services for HTTP Contexts

HTTP request-scoped services
Request-specific loggers, user context, audit trails
Transaction management per request
Rate limiting state per request
Automatic scope cleanup

6. Service Decorators & Interceptors

Logging Decorator: Automatic method logging with sensitive data masking
Caching Decorator: Intelligent caching with TTL และ invalidation
Retry Decorator: Exponential backoff retry mechanisms
Performance Decorator: Method timing และ memory monitoring
Cross-cutting concerns without code changes

7. Performance Considerations & Best Practices

Memory management และ resource cleanup
Built-in performance monitoring
Production optimization strategies
Graceful shutdown patterns

8. Real-World Examples

Multi-tenant applications
Payment service integrations
Database connection factories
Analytics query caching
Production configuration examples

💎 Advanced Validation Patterns (Premium)
📚 Prerequisites
    This guide assumes you've read:

    Part 2: Schema Validation with Zod
    Part 3: Framework-Agnostic Architecture
    Part 4: Enterprise Patterns (Free)

    Table of Contents

    Part1
    Validation Architecture Patterns
    Advanced Zod Patterns
    Business Validation Strategies
    Custom Validation Decorators
    Part2
    Performance & UX Optimization
    Enterprise Validation Requirements
    Testing Validation Logic
    Real-World Implementation

Part 5: Package Architecture & Configuration

📦 Mono-repo structure และ package organization
🔗 Package dependencies (api-core → api-service → api-data-prisma)
⚙️ Configuration management (Environment-specific configs)
🏭 Service factory patterns และ production setup
🔨 Build scripts (Nx/Lerna/Rush)

Part 6: Testing Strategies

🧪 Unit testing (Commands, Queries, Services)
🔗 Integration testing (Cross-package, HTTP routes)
🌐 E2E testing (Full application flow)
🎭 Mock patterns และ test containers
📊 Test coverage และ CI integration

Part 7: Build & Deployment

🐳 Docker containerization และ multi-stage builds
☸️ Kubernetes deployment และ manifests
🚀 Deployment strategies (Blue-Green, Canary, Rolling)
🔄 CI/CD pipelines และ automation
🏗️ Infrastructure as Code

Part 8: Logging & Production

📝 Logging patterns (Structured, Correlation, Audit)
📊 Monitoring และ metrics (Health checks, Performance)
🔒 Security hardening (CORS, Rate limiting, Headers)
⚡ Performance optimization (Memory, CPU, Database)
🚨 Error handling และ alerting