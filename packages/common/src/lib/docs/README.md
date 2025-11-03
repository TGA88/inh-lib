# Either Pattern with Clean Architecture Documentation

คู่มือการใช้ Either pattern ในโครงสร้าง Clean Architecture แบบ Feature Driven และ Use Case Driven Repository Pattern

## 📚 Table of Contents

### Core Documentation
- [**Architecture Overview**](./01-architecture-overview.md) - หลักการพื้นฐานและ principles
- [**Either API Guide**](./02-either-api.md) - การใช้งาน Either pattern และ helper functions
- [**Project Structure**](./03-project-structure.md) - โครงสร้างโปรเจคแบบ Feature Driven

### Implementation Guides
- [**API Service Layer**](./04-api-service-layer.md) - Presentation + Application Layer implementation
- [**API Core Layer**](./05-api-core-layer.md) - Domain Layer contracts และ types
- [**API Data Layer**](./06-api-data-layer.md) - Infrastructure Layer implementations

### Repository Patterns
- [**Use Case Repository Pattern**](./07-use-case-repository.md) - Use Case-Driven Repository structure
- [**Feature Repository Pattern**](./08-feature-repository.md) - Feature-Based Repository structure  
- [**Repository Pattern Comparison**](./09-repository-comparison.md) - เปรียบเทียบแนวทางต่างๆ

### Development Practices
- [**Best Practices**](./10-best-practices.md) - แนวทางปฏิบัติที่ดี
- [**Testing Strategies**](./11-testing-strategies.md) - กลยุทธ์การทดสอบ
- [**Real-world Examples**](./12-real-world-examples.md) - ตัวอย่างการใช้งานจริง

### Advanced Topics
- [**AI Development Guide**](./13-ai-development.md) - แนวทางการทำงานกับ AI Assistants
- [**Team Collaboration**](./14-team-collaboration.md) - การทำงานเป็นทีม

## 🚀 Quick Start

1. เริ่มต้นด้วย [Architecture Overview](./01-architecture-overview.md) เพื่อเข้าใจหลักการพื้นฐาน
2. ศึกษา [Either API Guide](./02-either-api.md) เพื่อเรียนรู้การใช้งาน Either pattern
3. ดู [Project Structure](./03-project-structure.md) เพื่อเข้าใจโครงสร้างโปรเจค
4. เลือกแนวทาง Repository Pattern จาก [Repository Pattern Comparison](./09-repository-comparison.md)
5. ดูตัวอย่างการใช้งานจริงใน [Real-world Examples](./12-real-world-examples.md)

## 🎯 Repository Pattern Decision Guide

### Use Case Repository Pattern (แนะนำ)
- ✅ เหมาะกับ: Feature มี use cases ไม่เยอะมาก (3-7 use cases)
- ✅ เหมาะกับ: Business logic มี shared validation/rules เยอะ
- ✅ เหมาะกับ: การทำงานกับ AI Assistants
- ✅ เหมาะกับ: Code กระชับ อ่านง่าย maintain ง่าย
- 📖 อ่านเพิ่มเติม: [Feature Repository Pattern](./08-feature-repository.md)

### Feature Repository Pattern  
- ✅ เหมาะกับ: Feature มี use cases เยอะมาก (8+ use cases)
- ✅ เหมาะกับ: Team ใหญ่ทำงานแบบ parallel
- ✅ เหมาะกับ: Business logic แต่ละ use case แตกต่างมาก
- ✅ เหมาะกับ: Microservices architecture
- 📖 อ่านเพิ่มเติม: [Use Case Repository Pattern](./07-use-case-repository.md)

## 🔧 Key Technologies

- **`@inh-lib/unified-route`**: Framework-independent routing
- **`@inh-lib/api-util-fastify`**: Fastify adapter for UnifiedRoute
- **`@inh-lib/common`**: Either pattern and helper functions
- **Feature Driven Architecture**: 1 Feature = 1 API Domain = 1 Database Schema
- **TypeScript**: Full type safety across all layers

## 📞 Support

หากมีคำถามหรือต้องการความช่วยเหลือ สามารถ:
- สร้าง Issue ใน repository
- ดูตัวอย่างเพิ่มเติมใน [Real-world Examples](./12-real-world-examples.md)
- ศึกษา [Best Practices](./10-best-practices.md) สำหรับแนวทางปฏิบัติที่ดี

---

*Documentation v2.0 - แยกไฟล์เพื่อการจัดการที่ง่ายขึ้น*