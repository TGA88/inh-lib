# Team Collaboration Guide

แนวทางการทำงานเป็นทีมกับ Feature Repository Pattern และ Use Case Assignment

## 👥 Overview

เอกสารนี้แนะนำวิธีการจัดการทีม และ assign งานใน Feature Driven Architecture โดยเฉพาะการทำงานร่วมกันระหว่าง developers และ AI agents

## 🎯 Team Assignment Strategy

### 📋 Use Case Assignment with Feature Repository Pattern

```typescript
// Feature: UserManagement
class UserRepository {
  constructor(private dataAccess: UserDataAccessLogic) {}
  
  // 👤 Developer A assigned
  async createUser(userData: CreateUserData): Promise<Either<Error, User>> {
    // Task 1: User creation with validation
  }
  
  // 👤 Developer B assigned  
  async updateUser(userId: string, data: UpdateUserData): Promise<Either<Error, User>> {
    // Task 2: User update with audit trail
  }
  
  // 🤖 AI Agent assigned
  async deleteUser(userId: string): Promise<Either<Error, void>> {
    // Task 3: Soft delete with cleanup
  }
  
  // 👤 Developer C assigned
  async getUserProfile(userId: string): Promise<Either<Error, UserProfile>> {
    // Task 4: Profile retrieval with caching
  }
}
```

## 🚧 Potential Challenges & Solutions

### 1. **Merge Conflicts**

#### ❌ ปัญหาที่อาจเกิด
```typescript
// Developer A แก้
class UserRepository {
  constructor(private dataAccess: UserDataAccessLogic) {} // A แก้
  
  async createUser() { /* A ทำ */ }
  async updateUser() { /* B ทำพร้อมกัน */ } // CONFLICT!
}

// Developer B แก้
class UserRepository {
  constructor(
    private dataAccess: UserDataAccessLogic,
    private emailService: EmailService // B เพิ่ม
  ) {}
  
  async updateUser() { /* B ทำ */ }
}
```

#### ✅ วิธีแก้ไข: Progressive Implementation

```typescript
// Phase 1: Base Structure (Developer A)
class UserRepository {
  constructor(private dataAccess: UserDataAccessLogic) {}
  
  async createUser() { /* Complete implementation */ }
  
  // Placeholder methods
  async updateUser(): Promise<Either<Error, User>> {
    return Left(new Error('Not implemented'));
  }
  
  async deleteUser(): Promise<Either<Error, void>> {
    return Left(new Error('Not implemented'));
  }
}

// Phase 2: Add Update (Developer B)  
async updateUser(id: string, data: UpdateUserData): Promise<Either<Error, User>> {
  // B's implementation
}

// Phase 3: Add Delete (AI Agent)
async deleteUser(id: string): Promise<Either<Error, void>> {
  // AI implementation
}
```

### 2. **Feature Branch Strategy**

```bash
# แนวทางแก้ปัญหา
main
├── feature/user-create     # Developer A
├── feature/user-update     # Developer B  
├── feature/user-delete     # AI Agent
└── feature/user-profile    # Developer C

# Merge Strategy
1. A merge first (base implementation)
2. B rebase และ merge
3. C rebase และ merge  
4. AI Agent rebase และ merge
```

### 3. **Code Review Complexity**

#### 😵 Challenge
```typescript
// Large file review challenge
class UserRepository {
  // A's code
  async createUser() { 
    // 50 lines of logic
  }
  
  // B's code  
  async updateUser() {
    // 40 lines of logic
  }
  
  // C's code
  async deleteUser() {
    // 30 lines of logic  
  }
}
// Reviewer: "ไฟล์ใหญ่ รีวิวยาก แยกไม่ออกว่าใครเขียนส่วนไหน"
```

#### ✅ Solution: Structured Review Process

```typescript
// แต่ละ PR focus เฉพาะ method
// PR Title: "Add updateUser method to UserRepository"

async updateUser(id: string, data: UpdateUserData): Promise<Either<Error, User>> {
  // Review focus:
  // - Method implementation
  // - Error handling
  // - Data validation
  // - Performance considerations
}
```

## 🔄 Recommended Workflow

### **📋 Task Assignment Structure**

```typescript
// Epic: User Management Feature
// ├── Story 1: Create User (Developer A)
// ├── Story 2: Update User (Developer B)  
// ├── Story 3: Delete User (AI Agent)
// └── Story 4: Get User Profile (Developer C)

// Implementation Strategy:
class UserRepository {
  // Base structure + Create (A) → Review
  // Add Update (B) → Review
  // Add Delete (AI) → Review  
  // Add Profile (C) → Review
  // Final integration review
}
```

### **🔄 Code Review Process**

#### **1. Individual Method Review**
```typescript
// แต่ละ PR focus เฉพาะ method
// PR Title: "Add updateUser method to UserRepository"

async updateUser(id: string, data: UpdateUserData): Promise<Either<Error, User>> {
  // Review focus:
  // - Method implementation
  // - Error handling
  // - Data validation
  // - Performance considerations
}
```

#### **2. Integration Review**
```typescript
// Final PR: Integration review
class UserRepository {
  // Review focus:
  // - Method consistency
  // - Shared code opportunities
  // - Overall architecture
  // - Documentation completeness
}
```

## 🤖 AI Agent Integration

### **🎯 AI Assignment Guidelines**

#### ✅ **เหมาะกับ AI:**
```typescript
// Tasks ที่ AI ทำได้ดี:
// 1. CRUD operations ที่มี pattern ชัดเจน
async deleteUser(id: string): Promise<Either<Error, void>> {
  // Pattern: validate → execute → cleanup
}

// 2. Data transformation และ mapping
async transformUserData(rawData: RawUserData): UserData {
  // Pattern-based transformation
}

// 3. Basic validation และ business rules
private validateUserAge(age: number): Either<Error, number> {
  // Rule-based validation
}
```

#### ⚠️ **ระวังกับ AI:**
```typescript
// Tasks ที่ AI อาจทำผิด:
// 1. Complex business logic
async calculateUserRewards(user: User, transactions: Transaction[]): Reward[] {
  // Complex domain knowledge required
}

// 2. Integration กับ external systems
async syncWithThirdPartyAPI(userData: User): Promise<SyncResult> {
  // API-specific knowledge required
}

// 3. Security-critical operations
async validateUserPermissions(user: User, resource: Resource): boolean {
  // Security implications
}
```

### **🤖 AI Review Advantages**

```typescript
// ✅ AI สามารถรีวิวได้ดี
class UserRepository {
  async createUser() { /* Pattern A */ }
  async updateUser() { /* AI: "Pattern B แตกต่างจาก A ทำไม?" */ }
  async deleteUser() { /* AI: "ควรใช้ pattern เดียวกัน" */ }
  
  // AI ตรวจจับ:
  // - Inconsistent error handling
  // - Missing validations  
  // - Performance issues
  // - Security vulnerabilities
}
```

## 📊 Team Collaboration Metrics

### **Merge Conflict Frequency**

| Pattern | Conflicts per Sprint | Resolution Time |
|---------|---------------------|-----------------|
| **Feature Repository** | 2-3 conflicts | 15-30 minutes |
| **Use Case Repository** | 0-1 conflicts | 5-10 minutes |

### **Code Review Efficiency**

| Pattern | Review Time per PR | Issues Found |
|---------|-------------------|--------------|
| **Feature Repository** | 20-30 minutes | 3-5 issues |
| **Use Case Repository** | 10-15 minutes | 1-2 issues |

### **Knowledge Sharing**

| Pattern | Context Sharing | Onboarding Time |
|---------|----------------|-----------------|
| **Feature Repository** | High (all methods visible) | 2-3 days |
| **Use Case Repository** | Medium (isolated methods) | 1-2 days |

## 🛠️ Tools & Best Practices

### **Git Workflow**

```bash
# 1. Feature branch per developer/AI
git checkout -b feature/user-create-method
git checkout -b feature/user-update-method
git checkout -b feature/user-delete-method

# 2. Frequent commits with descriptive messages
git commit -m "feat(user): add createUser method with validation"
git commit -m "feat(user): add updateUser method with audit trail"
git commit -m "feat(user): add deleteUser method with soft delete"

# 3. Rebase before merge
git rebase main
git push --force-with-lease

# 4. Squash merge for clean history
git merge --squash feature/user-create-method
```

### **Code Review Templates**

```markdown
## Code Review Checklist: UserRepository Method

### Method Implementation
- [ ] Follows existing pattern in class
- [ ] Uses Either<Error, T> return type consistently  
- [ ] Includes proper input validation
- [ ] Handles errors appropriately
- [ ] Performance considerations addressed

### Integration
- [ ] Compatible with existing methods
- [ ] Shared logic opportunities identified
- [ ] Dependencies properly injected
- [ ] No duplicate code introduced

### Testing
- [ ] Unit tests included
- [ ] Edge cases covered
- [ ] Mock strategies consistent
- [ ] Test documentation clear

### Documentation
- [ ] Method documentation complete
- [ ] Parameter descriptions clear
- [ ] Return type documented
- [ ] Usage examples provided
```

### **Assignment Templates**

```typescript
// Task Assignment Template:
/*
Epic: User Management Feature
Story: Implement {methodName} method in UserRepository

Requirements:
- Follow existing pattern in UserRepository class
- Use Either<Error, T> return type  
- Include input validation
- Add proper error handling
- Write unit tests
- Document method behavior

Pattern Example:
async createUser(data: CreateUserData): Promise<Either<Error, User>> {
  const validation = await this.dataAccess.validateUserData(data);
  if (validation.isLeft()) return validation;
  
  const result = await this.dataAccess.insertUser(data);
  return result;
}

Acceptance Criteria:
- [ ] Method follows pattern above
- [ ] All validations pass
- [ ] Error handling complete
- [ ] Tests achieve 90%+ coverage
- [ ] Documentation updated
*/
```

## 🎯 Best Practices for Team Coordination

### **1. Communication Strategy**

```typescript
// Daily standups focus:
// 1. Which method/use case working on
// 2. Dependencies on other team members
// 3. Blockers or conflicts

// Example:
// "Working on updateUser method in UserRepository"
// "Need createUser method to be merged first"
// "No blockers"
```

### **2. Documentation Standards**

```typescript
/**
 * UserRepository - Central hub for all user-related operations
 * 
 * Team Ownership:
 * - createUser: Developer A (@john)
 * - updateUser: Developer B (@jane)  
 * - deleteUser: AI Agent (Copilot)
 * - getUserProfile: Developer C (@bob)
 * 
 * Dependencies: UserDataAccessLogic
 * Last Updated: 2024-01-15
 * Sprint: Sprint 23
 */
class UserRepository {
  // Implementation...
}
```

### **3. Dependency Management**

```typescript
// Clear dependency injection per feature
const feedRegistrationContextKeys = {
  CREATE_USER_REPOSITORY: 'repository:user:create',
  UPDATE_USER_REPOSITORY: 'repository:user:update',
  DELETE_USER_REPOSITORY: 'repository:user:delete'
} as const;

// Feature-specific DI setup
fastify.register(async function (fastify) {
  fastify.addHook('preHandler', async (request) => {
    if (!request.unifiedAppContext) {
      request.unifiedAppContext = { 
        request: {} as any, 
        response: {} as any, 
        registry: {} 
      };
    }
    
    // Inject repositories ที่ team พัฒนา
    request.unifiedAppContext.registry[userContextKeys.USER_REPOSITORY] = 
      new UserRepository(dataAccessLogic);
  });
  
  // Routes
  fastify.post('/api/users', createUnifiedFastifyHandler(createUserEndpoint));
  fastify.put('/api/users/:id', createUnifiedFastifyHandler(updateUserEndpoint));
});
```

## 📈 Scaling Team Collaboration

### **Small Team (2-3 people)**
```typescript
// ✅ Feature Repository Pattern เหมาะสม
// - Communication overhead ต่ำ
// - Merge conflicts จัดการได้
// - Knowledge sharing ง่าย

class UserRepository {
  async createUser() { /* Person 1 */ }
  async updateUser() { /* Person 2 */ }
  async deleteUser() { /* Person 3 */ }
}
```

### **Medium Team (4-6 people)**
```typescript
// ✅ Feature Repository Pattern ยังใช้ได้
// แต่ต้องมี process ที่ดี
// - Feature branch strategy
// - Code review process
// - Clear assignment

class UserRepository {
  async createUser() { /* Developer A */ }
  async updateUser() { /* Developer B */ }
  async deleteUser() { /* Developer C */ }
  async getUserDetails() { /* Developer D */ }
  async archiveUser() { /* AI Agent */ }
}
```

### **Large Team (7+ people)**
```typescript
// ⚠️ พิจารณา Use Case Repository Pattern
// หรือ แยก sub-features

// Option 1: Split to sub-features
class UserAccountRepository {
  async createUser() { /* Team A */ }
  async updateUser() { /* Team A */ }
  async deleteUser() { /* Team A */ }
}

class UserProfileRepository {
  async createProfile() { /* Team B */ }
  async updateProfile() { /* Team B */ }
  async getProfile() { /* Team B */ }
}

// Option 2: Use Case Repository Pattern
CreateUserRepository // Developer 1
UpdateUserRepository // Developer 2
DeleteUserRepository // Developer 3
// etc.
```

## 🏆 Success Factors

### **✅ Feature Repository Pattern Success เมื่อ:**

1. **Good Communication** - Team communicate well about changes
2. **Clear Processes** - Established branch, review, merge processes
3. **Shared Understanding** - Everyone understands the codebase structure
4. **Tool Support** - Good IDE, Git tools, CI/CD pipeline
5. **Team Size** - Small to medium teams (2-6 people)

### **⚠️ Consider Use Case Pattern เมื่อ:**

1. **Large Teams** - 7+ developers working parallel
2. **Complex Features** - Many use cases per feature (8+)
3. **High Isolation Needs** - Extreme test isolation requirements
4. **Microservices** - Each use case might become separate service

## 📋 Checklist สำหรับ Team Lead

### ✅ Before Starting Development
- [ ] Team แบ่งหน้าที่ชัดเจน per use case/method
- [ ] Git workflow และ branch strategy กำหนดแล้ว
- [ ] Code review process ชัดเจน
- [ ] Merge conflict resolution strategy พร้อม
- [ ] Documentation standards ตกลงแล้ว

### ✅ During Development
- [ ] Daily standups track method/use case progress
- [ ] Code reviews focus เฉพาะ assigned methods
- [ ] Merge conflicts resolved quickly
- [ ] Integration issues addressed promptly
- [ ] Knowledge sharing sessions จัดเป็นประจำ

### ✅ After Feature Complete
- [ ] Final integration review ครบถ้วน
- [ ] Documentation updated
- [ ] Team retrospective for process improvement
- [ ] Lessons learned documented
- [ ] Success metrics measured

## 🎯 Conclusion

**Feature Repository Pattern + Use Case Assignment = WORKABLE** 

**เงื่อนไข:**
1. **📋 Clear Assignment Strategy** - แบ่งงานชัดเจน
2. **🔄 Progressive Implementation** - ทำทีละ method
3. **🌿 Feature Branch Strategy** - แยก branch ต่อ use case
4. **👥 Structured Code Review** - รีวิวทีละส่วน แล้วรวม
5. **🤖 AI Integration** - ใช้ AI ช่วยงานที่เหมาะสม

**Bottom Line: Feature Pattern + Use Case Assignment ได้ แต่ต้องมี process ที่ดี!** 🚀