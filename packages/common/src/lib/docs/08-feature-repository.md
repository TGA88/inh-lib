# Feature Repository Pattern

แนวทางการออกแบบ Repository แบบ 1 Feature = 1 Repository Class ที่มีหลาย methods (use cases)

## 🎯 Overview

**Feature Repository Pattern** เป็นแนวทางที่รวม use cases ของ feature เดียวกันไว้ใน Repository class เดียว โดยแต่ละ method ใน Repository จะเป็น use case หนึ่งๆ

## 🏗️ Architecture Structure

```typescript
// 1 Feature = 1 Repository Class + 1 DataAccessLogic
Feature/
├── FeatureRepository.ts        # Repository มีหลาย methods (use cases)
├── FeatureDataAccessLogic.ts   # Data access functions
└── FeatureBusinessLogic.ts     # Business rules (optional)
```

## 📋 Implementation Example

### Repository Class

```typescript
// UserRepository.ts - 1 Feature = 1 Repository
class UserRepository {
  constructor(private dataAccess: UserDataAccessLogic) {}
  
  // Method = Use Case 1: Create User
  async createUser(userData: CreateUserData): Promise<Either<Error, User>> {
    // เรียกหลาย DataAccessLogic functions
    const emailCheck = await this.dataAccess.checkEmailExists(userData.email);
    if (emailCheck.isLeft()) return emailCheck;
    
    const user = await this.dataAccess.insertUser(userData);
    if (user.isLeft()) return user;
    
    const profile = await this.dataAccess.createDefaultProfile(user.value.id);
    if (profile.isLeft()) return profile;
    
    const notification = await this.dataAccess.sendWelcomeEmail(user.value.email);
    // Email failure ไม่ต้อง fail ทั้ง operation
    
    return Right(user.value);
  }
  
  // Method = Use Case 2: Update User
  async updateUser(userId: string, userData: UpdateUserData): Promise<Either<Error, User>> {
    const validation = await this.dataAccess.validateUserExists(userId);
    if (validation.isLeft()) return validation;
    
    const updated = await this.dataAccess.updateUser(userId, userData);
    if (updated.isLeft()) return updated;
    
    const audit = await this.dataAccess.logUserUpdate(userId);
    // Audit failure ไม่ต้อง fail ทั้ง operation
    
    return Right(updated.value);
  }
  
  // Method = Use Case 3: Get User Details
  async getUserDetails(userId: string): Promise<Either<Error, UserDetails>> {
    const user = await this.dataAccess.getUserById(userId);
    if (user.isLeft()) return user;
    
    const profile = await this.dataAccess.getUserProfile(userId);
    if (profile.isLeft()) return profile;
    
    const preferences = await this.dataAccess.getUserPreferences(userId);
    // Preferences ไม่ใช่ critical data
    
    return Right({
      user: user.value,
      profile: profile.value,
      preferences: preferences.isRight() ? preferences.value : null
    });
  }
  
  // Method = Use Case 4: Deactivate User
  async deactivateUser(userId: string): Promise<Either<Error, void>> {
    const validation = await this.dataAccess.validateUserExists(userId);
    if (validation.isLeft()) return validation;
    
    const deactivated = await this.dataAccess.deactivateUser(userId);
    if (deactivated.isLeft()) return deactivated;
    
    const cleanup = await this.dataAccess.cleanupUserSessions(userId);
    const notification = await this.dataAccess.sendDeactivationEmail(userId);
    // Cleanup และ notification failures ไม่ต้อง fail operation
    
    return Right(undefined);
  }
}
```

### Data Access Logic

```typescript
// UserDataAccessLogic.ts - 1 file per Repository
class UserDataAccessLogic {
  constructor(private prisma: PrismaClient) {}
  
  // Reusable across multiple use cases
  async validateUserExists(userId: string): Promise<Either<Error, boolean>> {
    return eitherFromOperation(
      async () => {
        const user = await this.prisma.user.findUnique({
          where: { id: userId },
          select: { id: true }
        });
        return !!user;
      },
      (error) => `User validation failed: ${error.message}`
    );
  }
  
  async checkEmailExists(email: string): Promise<Either<Error, boolean>> {
    return eitherFromOperation(
      async () => {
        const user = await this.prisma.user.findUnique({
          where: { email },
          select: { id: true }
        });
        if (user) {
          throw new Error(`Email ${email} already exists`);
        }
        return false;
      },
      (error) => error.message
    );
  }
  
  // Create user operations
  async insertUser(userData: CreateUserData): Promise<Either<Error, User>> {
    return eitherFromOperation(
      async () => {
        return await this.prisma.user.create({
          data: {
            name: userData.name,
            email: userData.email,
            passwordHash: await this.hashPassword(userData.password),
            status: 'ACTIVE',
            createdAt: new Date()
          }
        });
      },
      (error) => `User creation failed: ${error.message}`
    );
  }
  
  async createDefaultProfile(userId: string): Promise<Either<Error, Profile>> {
    return eitherFromOperation(
      async () => {
        return await this.prisma.profile.create({
          data: {
            userId,
            displayName: 'New User',
            avatar: '/defaults/avatar.png',
            preferences: {},
            createdAt: new Date()
          }
        });
      },
      (error) => `Profile creation failed: ${error.message}`
    );
  }
  
  // Update user operations
  async updateUser(userId: string, userData: UpdateUserData): Promise<Either<Error, User>> {
    return eitherFromOperation(
      async () => {
        return await this.prisma.user.update({
          where: { id: userId },
          data: {
            name: userData.name,
            email: userData.email,
            updatedAt: new Date()
          }
        });
      },
      (error) => `User update failed: ${error.message}`
    );
  }
  
  // Read user operations
  async getUserById(userId: string): Promise<Either<Error, User>> {
    return eitherFromOperation(
      async () => {
        const user = await this.prisma.user.findUnique({
          where: { id: userId }
        });
        if (!user) {
          throw new Error(`User with ID ${userId} not found`);
        }
        return user;
      },
      (error) => error.message
    );
  }
  
  async getUserProfile(userId: string): Promise<Either<Error, Profile>> {
    return eitherFromOperation(
      async () => {
        const profile = await this.prisma.profile.findUnique({
          where: { userId }
        });
        if (!profile) {
          throw new Error(`Profile for user ${userId} not found`);
        }
        return profile;
      },
      (error) => error.message
    );
  }
  
  async getUserPreferences(userId: string): Promise<Either<Error, UserPreferences>> {
    return eitherFromOperation(
      async () => {
        const preferences = await this.prisma.userPreferences.findUnique({
          where: { userId }
        });
        return preferences || this.getDefaultPreferences();
      },
      (error) => `Preferences fetch failed: ${error.message}`
    );
  }
  
  // Deactivate user operations
  async deactivateUser(userId: string): Promise<Either<Error, User>> {
    return eitherFromOperation(
      async () => {
        return await this.prisma.user.update({
          where: { id: userId },
          data: {
            status: 'INACTIVE',
            deactivatedAt: new Date()
          }
        });
      },
      (error) => `User deactivation failed: ${error.message}`
    );
  }
  
  // Supporting operations
  async sendWelcomeEmail(email: string): Promise<Either<Error, void>> {
    return eitherFromOperation(
      async () => {
        // Call external email service
        await this.emailService.sendWelcomeEmail(email);
      },
      (error) => `Welcome email failed: ${error.message}`
    );
  }
  
  async sendDeactivationEmail(userId: string): Promise<Either<Error, void>> {
    return eitherFromOperation(
      async () => {
        const user = await this.prisma.user.findUnique({
          where: { id: userId },
          select: { email: true }
        });
        if (user) {
          await this.emailService.sendDeactivationEmail(user.email);
        }
      },
      (error) => `Deactivation email failed: ${error.message}`
    );
  }
  
  async logUserUpdate(userId: string): Promise<Either<Error, void>> {
    return eitherFromOperation(
      async () => {
        await this.prisma.auditLog.create({
          data: {
            userId,
            action: 'USER_UPDATE',
            timestamp: new Date(),
            details: { source: 'user-repository' }
          }
        });
      },
      (error) => `Audit logging failed: ${error.message}`
    );
  }
  
  async cleanupUserSessions(userId: string): Promise<Either<Error, void>> {
    return eitherFromOperation(
      async () => {
        await this.prisma.userSession.deleteMany({
          where: { userId }
        });
      },
      (error) => `Session cleanup failed: ${error.message}`
    );
  }
  
  private async hashPassword(password: string): Promise<string> {
    // Password hashing logic
    return bcrypt.hash(password, 10);
  }
  
  private getDefaultPreferences(): UserPreferences {
    return {
      theme: 'light',
      language: 'en',
      notifications: true
    };
  }
}
```

## 🎯 ข้อดีของ Feature Repository Pattern

### 1. **Clear Separation of Concerns**
```typescript
// Business Logic = Repository Methods (Use Cases)
// Data Access = DataAccessLogic functions (Technical Operations)
```
- Use Case logic แยกจาก SQL logic ชัดเจน
- Testing แยกชั้นได้ (mock DataAccessLogic ได้ง่าย)
- Business rules อยู่ใน Repository methods
- Technical implementation อยู่ใน DataAccessLogic

### 2. **Feature Cohesion**
```typescript
// All User-related operations in one place
UserRepository {
  createUser()         // Use Case 1
  updateUser()         // Use Case 2  
  getUserDetails()     // Use Case 3
  deactivateUser()     // Use Case 4
}
```
- Feature boundary ชัดเจน
- Easy to find all use cases ของ feature
- Team ownership ง่าย
- Deploy/scale per feature ได้

### 3. **Reusable Data Access Functions**
```typescript
class UserDataAccessLogic {
  // Reusable across multiple use cases
  async validateUserExists(userId: string) { /* เรียกใช้ได้หลาย use case */ }
  async getUserById(userId: string) { /* เรียกใช้ได้หลาย use case */ }
  async logUserAction(userId: string, action: string) { /* เรียกใช้ได้หลาย use case */ }
}
```

### 4. **AI-Friendly Structure**
```typescript
// ✅ AI สามารถเข้าใจได้ง่าย
class UserRepository {
  // AI เห็นทุก methods พร้อมกัน
  async createUser() { /* เห็น pattern */ }
  async updateUser() { /* เห็นความเกี่ยวข้อง */ }
  async deleteUser() { /* เข้าใจ flow */ }
}
```
- Context Window Efficiency
- Pattern Recognition
- Code Generation Accuracy
- Better Code Review Capability

## ⚠️ ข้อเสียและความเสี่ยง

### 1. **Potential Performance Issues**
```typescript
// อาจเกิด N+1 หรือ over-fetching
async getUsersWithDetails(): Promise<Either<Error, UserDetail[]>> {
  const users = await this.dataAccess.getAllUsers(); // 1 SQL
  
  for (const user of users) {
    user.profile = await this.dataAccess.getUserProfile(user.id); // N SQL
    user.preferences = await this.dataAccess.getUserPreferences(user.id); // N SQL
  }
  return Right(users);
}
```

### 2. **Cross-Feature Data Dependencies**
```typescript
// Order feature ต้องการ User validation
class OrderRepository {
  async createOrder(orderData: OrderData): Promise<Either<Error, Order>> {
    // ต้องการ User validation แต่อยู่คน feature
    // ทำยังไง?
    const userExists = await ??; // UserDataAccessLogic?
  }
}
```

### 3. **Transaction Management Complexity**
```typescript
// Transaction ข้าม DataAccessLogic functions
async transferUserData(fromUserId: string, toUserId: string): Promise<Either<Error, void>> {
  // ต้อง coordinate multiple data access calls ใน transaction
  return await this.transactionManager.execute(async (trx) => {
    await this.dataAccess.lockUser(fromUserId, trx);
    await this.dataAccess.lockUser(toUserId, trx);
    await this.dataAccess.transferData(fromUserId, toUserId, trx);
    await this.dataAccess.updateTimestamps([fromUserId, toUserId], trx);
  });
}
```

### 4. **Class Size Growth**
```typescript
// Feature ที่มี use cases เยอะอาจทำให้ Repository ใหญ่มาก
class OrderManagementRepository {
  async createOrder() { /* Use Case 1 */ }
  async updateOrder() { /* Use Case 2 */ }
  async cancelOrder() { /* Use Case 3 */ }
  async processPayment() { /* Use Case 4 */ }
  async handleRefund() { /* Use Case 5 */ }
  async trackShipping() { /* Use Case 6 */ }
  async generateInvoice() { /* Use Case 7 */ }
  async handleReturn() { /* Use Case 8 */ }
  async applyDiscount() { /* Use Case 9 */ }
  async validateInventory() { /* Use Case 10 */ }
  // ... อีกหลาย use cases
  // กลายเป็น God Object
}
```

## 💡 คำแนะนำปรับปรุง

### 1. **Batch Operations Pattern**
```typescript
class UserDataAccessLogic {
  // Single operations
  async getUserById(id: string): Promise<Either<Error, User>>;
  
  // Batch operations for performance
  async getUsersByIds(ids: string[]): Promise<Either<Error, User[]>>;
  async getUsersWithProfiles(ids: string[]): Promise<Either<Error, UserWithProfile[]>>;
  
  // Complex queries when needed
  async getUsersWithDetailsAndPreferences(
    filters: UserFilters
  ): Promise<Either<Error, UserDetails[]>> {
    return eitherFromOperation(
      async () => {
        // Single optimized query instead of N+1
        return await this.prisma.user.findMany({
          where: this.buildFilters(filters),
          include: {
            profile: true,
            preferences: true,
            sessions: {
              where: { isActive: true },
              take: 5
            }
          }
        });
      },
      (error) => `Batch user fetch failed: ${error.message}`
    );
  }
}
```

### 2. **Shared Data Access Layer**
```typescript
// SharedDataAccessLogic.ts
class SharedDataAccessLogic {
  async validateEntityExists(table: string, id: string): Promise<Either<Error, boolean>>;
  async getEntityById<T>(table: string, id: string): Promise<Either<Error, T>>;
  async logAction(userId: string, action: string, details: any): Promise<Either<Error, void>>;
}

// UserDataAccessLogic extends shared
class UserDataAccessLogic extends SharedDataAccessLogic {
  async insertUser(userData: UserData): Promise<Either<Error, User>>;
  
  // Override for user-specific validation
  async validateUserExists(userId: string): Promise<Either<Error, boolean>> {
    return super.validateEntityExists('users', userId);
  }
}
```

### 3. **Event-Driven Cross-Feature Communication**
```typescript
class OrderRepository {
  constructor(
    private dataAccess: OrderDataAccessLogic,
    private eventBus: EventBus
  ) {}
  
  async createOrder(orderData: OrderData): Promise<Either<Error, Order>> {
    // Validate user via event/API instead of direct access
    const userValidation = await this.eventBus.query('user.validate', { 
      userId: orderData.userId 
    });
    
    if (userValidation.isLeft()) return userValidation;
    
    const order = await this.dataAccess.insertOrder(orderData);
    if (order.isLeft()) return order;
    
    // Publish event for other features
    await this.eventBus.publish('order.created', order.value);
    
    return order;
  }
}
```

### 4. **Feature Size Management**
```typescript
// เมื่อ Feature Repository มี methods เยอะมาก (>7-8 methods)
// ให้แยกเป็น sub-features หรือ migrate ไป Use Case Pattern

// Before: God Object
class OrderManagementRepository {
  // 15+ methods
}

// After: Split by sub-features
class OrderLifecycleRepository {
  async createOrder() { /* */ }
  async updateOrder() { /* */ }
  async cancelOrder() { /* */ }
}

class OrderPaymentRepository {
  async processPayment() { /* */ }
  async handleRefund() { /* */ }
  async applyDiscount() { /* */ }
}

class OrderFulfillmentRepository {
  async trackShipping() { /* */ }
  async handleReturn() { /* */ }
  async generateInvoice() { /* */ }
}
```

## 🧪 Testing Strategy

### Repository Testing
```typescript
describe('UserRepository', () => {
  let repository: UserRepository;
  let mockDataAccess: jest.Mocked<UserDataAccessLogic>;
  
  beforeEach(() => {
    mockDataAccess = {
      checkEmailExists: jest.fn(),
      insertUser: jest.fn(),
      createDefaultProfile: jest.fn(),
      sendWelcomeEmail: jest.fn(),
      validateUserExists: jest.fn(),
      updateUser: jest.fn(),
      logUserUpdate: jest.fn()
    } as any;
    
    repository = new UserRepository(mockDataAccess);
  });

  describe('createUser', () => {
    it('should create user with profile successfully', async () => {
      // Setup
      const userData = { name: 'John', email: 'john@test.com', password: 'pass123' };
      const createdUser = { id: '1', name: 'John', email: 'john@test.com' };
      const createdProfile = { id: '1', userId: '1', displayName: 'John' };
      
      mockDataAccess.checkEmailExists.mockResolvedValue(Right(false));
      mockDataAccess.insertUser.mockResolvedValue(Right(createdUser));
      mockDataAccess.createDefaultProfile.mockResolvedValue(Right(createdProfile));
      mockDataAccess.sendWelcomeEmail.mockResolvedValue(Right(undefined));
      
      // Act
      const result = await repository.createUser(userData);
      
      // Assert
      expect(result.isRight()).toBe(true);
      expect(result.value).toEqual(createdUser);
      expect(mockDataAccess.checkEmailExists).toHaveBeenCalledWith('john@test.com');
      expect(mockDataAccess.insertUser).toHaveBeenCalledWith(userData);
      expect(mockDataAccess.createDefaultProfile).toHaveBeenCalledWith('1');
      expect(mockDataAccess.sendWelcomeEmail).toHaveBeenCalledWith('john@test.com');
    });

    it('should fail when email already exists', async () => {
      // Setup
      mockDataAccess.checkEmailExists.mockResolvedValue(Left(new Error('Email exists')));
      
      // Act
      const result = await repository.createUser({} as any);
      
      // Assert
      expect(result.isLeft()).toBe(true);
      expect(mockDataAccess.insertUser).not.toHaveBeenCalled();
    });

    it('should continue when welcome email fails', async () => {
      // Setup
      const userData = { name: 'John', email: 'john@test.com', password: 'pass123' };
      const createdUser = { id: '1', name: 'John', email: 'john@test.com' };
      
      mockDataAccess.checkEmailExists.mockResolvedValue(Right(false));
      mockDataAccess.insertUser.mockResolvedValue(Right(createdUser));
      mockDataAccess.createDefaultProfile.mockResolvedValue(Right({} as any));
      mockDataAccess.sendWelcomeEmail.mockResolvedValue(Left(new Error('Email service down')));
      
      // Act
      const result = await repository.createUser(userData);
      
      // Assert
      expect(result.isRight()).toBe(true); // Main operation should still succeed
      expect(result.value).toEqual(createdUser);
    });
  });

  describe('updateUser', () => {
    it('should update user and log action', async () => {
      // Setup
      const userId = '1';
      const updateData = { name: 'John Updated', email: 'john.new@test.com' };
      const updatedUser = { id: '1', ...updateData };
      
      mockDataAccess.validateUserExists.mockResolvedValue(Right(true));
      mockDataAccess.updateUser.mockResolvedValue(Right(updatedUser));
      mockDataAccess.logUserUpdate.mockResolvedValue(Right(undefined));
      
      // Act
      const result = await repository.updateUser(userId, updateData);
      
      // Assert
      expect(result.isRight()).toBe(true);
      expect(result.value).toEqual(updatedUser);
      expect(mockDataAccess.validateUserExists).toHaveBeenCalledWith(userId);
      expect(mockDataAccess.updateUser).toHaveBeenCalledWith(userId, updateData);
      expect(mockDataAccess.logUserUpdate).toHaveBeenCalledWith(userId);
    });
  });
});
```

### Data Access Logic Testing
```typescript
describe('UserDataAccessLogic', () => {
  let dataAccess: UserDataAccessLogic;
  let mockPrisma: jest.Mocked<PrismaClient>;
  
  beforeEach(() => {
    mockPrisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn()
      }
    } as any;
    
    dataAccess = new UserDataAccessLogic(mockPrisma);
  });

  describe('checkEmailExists', () => {
    it('should return error when email exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: '1' });
      
      const result = await dataAccess.checkEmailExists('john@test.com');
      
      expect(result.isLeft()).toBe(true);
      expect(result.value).toContain('Email john@test.com already exists');
    });

    it('should return success when email does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      
      const result = await dataAccess.checkEmailExists('john@test.com');
      
      expect(result.isRight()).toBe(true);
    });
  });
});
```

## 📊 เมื่อไหร่ควรใช้ Feature Repository Pattern

### ✅ เหมาะกับ:
- Feature มี use cases ไม่เยอะมาก (3-7 use cases)
- Team เล็ก-กลาง (2-5 คน ต่อ feature)  
- Business logic มี shared validation/rules เยอะ
- Performance และ memory usage ไม่ใช่ constraint หลัก
- ต้องการ code ที่กระชับ อ่านง่าย
- **ทำงานกับ AI Assistants บ่อย**

### ⚠️ ระวัง:
- Feature ที่มี use cases เยอะมาก (8+ use cases)
- Team ใหญ่ทำงานแบบ parallel
- Business logic แต่ละ use case แตกต่างมาก
- ต้องการ extreme isolation สำหรับ testing

## 🏆 สรุป

Feature Repository Pattern เป็นแนวทางที่ **สมดุล** ระหว่าง simplicity และ functionality เหมาะสำหรับ**โปรเจคส่วนใหญ่** โดยเฉพาะเมื่อต้องการ:

1. **Code ที่กระชับและอ่านง่าย**
2. **การทำงานร่วมกับ AI Assistants**
3. **Shared business logic ใน feature**
4. **Team collaboration ที่มีประสิทธิภาพ**

และสามารถ **evolve** ไป Use Case Pattern ได้เมื่อ feature เติบโตและซับซ้อนขึ้น 🚀