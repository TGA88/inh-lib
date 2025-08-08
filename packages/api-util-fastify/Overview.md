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

🆓 Part 4.1: Free Edition - เหมาะสำหรับ startup และ mid-size teams

Table of Content
Enterprise Patterns (Free Edition) for @inh-lib/api-util-fastify provides:
✅ CQRS Pattern - Separate Commands (write) and Queries (read) for focused operations
✅ Simple Route Modules - Framework-agnostic route functions with reusable commands/queries
✅ Basic DI Container - Automatic dependency management for enterprise applications
✅ Repository Interfaces - Clean data access abstraction for testing & flexibility
✅ Validation Layers - Clear separation between Schema, Business, Rules, and Side Effects
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

---

# Part 4.2: Enterprise Middleware System 🔗

## 📖 **Course Overview**

**Goal**: สร้าง enterprise-grade middleware system ที่สามารถจัดการ cross-cutting concerns อย่างเป็นระบบ พร้อมด้วย comprehensive logging, schema validation, และ framework independence

**Learning Outcome**: 
- เขียน reusable middleware ที่ทำงานได้กับทุก HTTP framework
- ใช้ schema validation middleware เพื่อลด boilerplate code 90%
- สร้าง individual route classes ที่มี custom middleware ต่าง ๆ กัน
- ใช้ logger injection เพื่อ complete observability
- เขียน comprehensive tests สำหรับ middleware และ routes
- ออกแบบ middleware architecture ที่ scalable สำหรับ enterprise applications

**Time Investment**: 2-3 สัปดาห์ (8-12 ชั่วโมง total)
- **Week 1**: อ่านทฤษฎี + ลองเขียน basic middleware (3-4 ชม.)
- **Week 2**: ลงมือสร้าง validation middleware + route classes (4-5 ชม.) 
- **Week 3**: เขียน tests + ปรับแต่ง production setup (2-3 ชม.)

---

## 📋 **Table of Contents**

### **Part 1: Foundation & Problem Analysis**
- [The Problem Without Middleware](#the-problem-without-middleware)
- [Solution: Simple Middleware Pattern](#-solution-simple-middleware-pattern)
- [Core Types & Middleware Composer](#simple-middleware-composer)

### **Part 2: Essential Built-in Middlewares**
- [📊 Logging Middleware](#-logging-middleware)
- [🌍 CORS Middleware](#-cors-middleware)
- [🛡️ Error Handling Middleware](#️-error-handling-middleware)
- [⚡ Rate Limiting Middleware](#-rate-limiting-middleware)
- [🛡️ Schema Validation Middleware](#️-schema-validation-middleware)
- [🗄️ Cache Middleware](#️-cache-middleware)

### **Part 3: Schema-Driven Development**
- [Zod Schemas & Type Safety](#zod-schemas)
- [Validation Schemas Configuration](#schemas--validation)
- [Middleware Stacks & Composition](#middleware-stacks)

### **Part 4: Clean Architecture Implementation**
- [Setup with Fastify Logger](#setup-with-fastify-logger)
- [Clean Route Classes (Individual Routes)](#clean-route-classes-using-schema-validation-middleware)
- [HTTP Route Handlers with Custom Middleware](#http-route-handlers-with-schema-validation-middleware)
- [Framework Integration](#framework-integration)

### **Part 5: Testing & Quality Assurance**
- [Testing Schema Validation Middleware](#testing-schema-validation-middleware)
- [Testing Route Classes](#testing-route-classes-with-schema-validation)
- [Testing Individual Middlewares](#testing-middleware)
- [Integration Testing Strategies](#testing-individual-route-classes)

### **Part 6: Enterprise Benefits & Best Practices**
- [Benefits of Logger in Every Middleware](#-benefits-of-logger-in-every-middleware)
- [Benefits of Schema Validation Middleware](#-benefits-of-schema-validation-middleware)
- [Individual Route Classes Benefits](#-benefits-of-individual-route-classes-with-complete-logging)
- [Production Considerations](#-complete-architecture-benefits)

### **Part 7: Framework Independence**
- [Cross-Framework Compatibility](#framework-independence-maintained-with-universal-logging)
- [Logger Injection Benefits](#benefits-of-logger-injection)
- [Production Deployment](#-universal-middleware-logging)

---

# Part 4.3: 💎 Advanced Validation Patterns (Premium)
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

---

# Part 4.4: 💎 Advanced Route Management (Premium Enterprise Features):

Table of Contents
Advanced Route Library Architecture
Automatic route discovery
OpenAPI generation
Dynamic middleware composition
Advanced DI Container features

---

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