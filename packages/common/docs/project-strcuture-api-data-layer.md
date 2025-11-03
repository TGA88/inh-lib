# Final Folder Structure - @feedos-frgm-system/feedos-frgm-data-store-prisma

## 📁 **Complete Folder Structure ล่าสุด API-Data Layer**

```
libs/shared-webapi/feedos-frgm-data/store-prisma/
├── src/
│   ├── feed-registration-api/                  # API Domain (ตรงกับ Service Layer)
│   │   ├── command/                            # Command operations
│   │   │   ├── add-attachment/
│   │   │   │   ├── repository.ts               # Repository implementation (Either)
│   │   │   │   ├── dataAccess.logic.ts         # Pure data access (Either)
│   │   │   │   ├── business.logic.ts           # Business rules (Either)
│   │   │   │   ├── mapper.ts                   # DataParser implementations (Either)
│   │   │   │   ├── index.ts                    # Exports
│   │   │   │   └── __tests__/                  # Tests
│   │   │   │       ├── repository.test.ts     # Repository unit tests
│   │   │   │       ├── dataAccess.test.ts     # Data access unit tests
│   │   │   │       ├── business.test.ts       # Business logic unit tests
│   │   │   │       ├── mapper.test.ts         # Mapper unit tests
│   │   │   │       └── integration.test.ts    # Integration tests
│   │   │   ├── save-registration/
│   │   │   │   ├── repository.ts
│   │   │   │   ├── dataAccess.logic.ts
│   │   │   │   ├── business.logic.ts
│   │   │   │   ├── mapper.ts
│   │   │   │   ├── index.ts
│   │   │   │   └── __tests__/
│   │   │   │       ├── repository.test.ts
│   │   │   │       ├── dataAccess.test.ts
│   │   │   │       ├── business.test.ts
│   │   │   │       ├── mapper.test.ts
│   │   │   │       └── integration.test.ts
│   │   │   ├── update-status/
│   │   │   │   ├── repository.ts
│   │   │   │   ├── dataAccess.logic.ts
│   │   │   │   ├── business.logic.ts
│   │   │   │   ├── mapper.ts
│   │   │   │   ├── index.ts
│   │   │   │   └── __tests__/
│   │   │   └── index.ts                        # Command exports
│   │   ├── query/                              # Query operations
│   │   │   ├── get-animal-breed/
│   │   │   │   ├── repository.ts
│   │   │   │   ├── dataAccess.logic.ts
│   │   │   │   ├── business.logic.ts
│   │   │   │   ├── mapper.ts
│   │   │   │   ├── index.ts
│   │   │   │   └── __tests__/
│   │   │   │       ├── repository.test.ts
│   │   │   │       ├── dataAccess.test.ts
│   │   │   │       ├── business.test.ts
│   │   │   │       ├── mapper.test.ts
│   │   │   │       └── integration.test.ts
│   │   │   ├── find-registration-data/
│   │   │   │   ├── repository.ts
│   │   │   │   ├── dataAccess.logic.ts
│   │   │   │   ├── business.logic.ts
│   │   │   │   ├── mapper.ts
│   │   │   │   ├── index.ts
│   │   │   │   └── __tests__/
│   │   │   ├── get-registration-history/
│   │   │   │   ├── repository.ts
│   │   │   │   ├── dataAccess.logic.ts
│   │   │   │   ├── business.logic.ts
│   │   │   │   ├── mapper.ts
│   │   │   │   ├── index.ts
│   │   │   │   └── __tests__/
│   │   │   └── index.ts                        # Query exports
│   │   ├── __tests__/                          # API-level tests
│   │   │   └── feed-registration-api.integration.test.ts
│   │   └── index.ts                            # API exports
│   ├── check-animal-feed-registration-api/     # API Domain
│   │   ├── query/
│   │   │   ├── get-list-animal-feed-register/
│   │   │   │   ├── repository.ts
│   │   │   │   ├── dataAccess.logic.ts
│   │   │   │   ├── business.logic.ts
│   │   │   │   ├── mapper.ts
│   │   │   │   ├── index.ts
│   │   │   │   └── __tests__/
│   │   │   ├── get-registration-detail/
│   │   │   │   ├── repository.ts
│   │   │   │   ├── dataAccess.logic.ts
│   │   │   │   ├── business.logic.ts
│   │   │   │   ├── mapper.ts
│   │   │   │   ├── index.ts
│   │   │   │   └── __tests__/
│   │   │   └── index.ts
│   │   ├── __tests__/
│   │   │   └── check-animal-feed-registration-api.integration.test.ts
│   │   └── index.ts
│   ├── document-process-api/                   # API Domain
│   │   ├── command/
│   │   │   ├── upload-document/
│   │   │   │   ├── repository.ts
│   │   │   │   ├── dataAccess.logic.ts
│   │   │   │   ├── business.logic.ts
│   │   │   │   ├── mapper.ts
│   │   │   │   ├── index.ts
│   │   │   │   └── __tests__/
│   │   │   ├── validate-document/
│   │   │   │   ├── repository.ts
│   │   │   │   ├── dataAccess.logic.ts
│   │   │   │   ├── business.logic.ts
│   │   │   │   ├── mapper.ts
│   │   │   │   ├── index.ts
│   │   │   │   └── __tests__/
│   │   │   └── index.ts
│   │   ├── query/
│   │   │   ├── get-document-status/
│   │   │   │   ├── repository.ts
│   │   │   │   ├── dataAccess.logic.ts
│   │   │   │   ├── business.logic.ts
│   │   │   │   ├── mapper.ts
│   │   │   │   ├── index.ts
│   │   │   │   └── __tests__/
│   │   │   └── index.ts
│   │   ├── __tests__/
│   │   │   └── document-process-api.integration.test.ts
│   │   └── index.ts
│   ├── process-setting-api/                    # API Domain
│   │   ├── command/
│   │   │   ├── create-process-setting/
│   │   │   │   ├── repository.ts
│   │   │   │   ├── dataAccess.logic.ts
│   │   │   │   ├── business.logic.ts
│   │   │   │   ├── mapper.ts
│   │   │   │   ├── index.ts
│   │   │   │   └── __tests__/
│   │   │   ├── update-process-setting/
│   │   │   │   ├── repository.ts
│   │   │   │   ├── dataAccess.logic.ts
│   │   │   │   ├── business.logic.ts
│   │   │   │   ├── mapper.ts
│   │   │   │   ├── index.ts
│   │   │   │   └── __tests__/
│   │   │   └── index.ts
│   │   ├── query/
│   │   │   ├── get-process-settings/
│   │   │   │   ├── repository.ts
│   │   │   │   ├── dataAccess.logic.ts
│   │   │   │   ├── business.logic.ts
│   │   │   │   ├── mapper.ts
│   │   │   │   ├── index.ts
│   │   │   │   └── __tests__/
│   │   │   └── index.ts
│   │   ├── __tests__/
│   │   │   └── process-setting-api.integration.test.ts
│   │   └── index.ts
│   ├── manage-file-api/                        # API Domain
│   │   ├── command/
│   │   │   ├── upload-file/
│   │   │   │   ├── repository.ts
│   │   │   │   ├── dataAccess.logic.ts
│   │   │   │   ├── business.logic.ts
│   │   │   │   ├── mapper.ts
│   │   │   │   ├── index.ts
│   │   │   │   └── __tests__/
│   │   │   ├── delete-file/
│   │   │   │   ├── repository.ts
│   │   │   │   ├── dataAccess.logic.ts
│   │   │   │   ├── business.logic.ts
│   │   │   │   ├── mapper.ts
│   │   │   │   ├── index.ts
│   │   │   │   └── __tests__/
│   │   │   └── index.ts
│   │   ├── query/
│   │   │   ├── get-file-info/
│   │   │   │   ├── repository.ts
│   │   │   │   ├── dataAccess.logic.ts
│   │   │   │   ├── business.logic.ts
│   │   │   │   ├── mapper.ts
│   │   │   │   ├── index.ts
│   │   │   │   └── __tests__/
│   │   │   └── index.ts
│   │   ├── __tests__/
│   │   │   └── manage-file-api.integration.test.ts
│   │   └── index.ts
│   ├── bible-factory/                          # Utility functions
│   │   ├── animal-breed-factory.ts             # Animal breed utilities
│   │   ├── registration-factory.ts             # Registration utilities
│   │   ├── document-factory.ts                 # Document utilities
│   │   ├── process-factory.ts                  # Process utilities
│   │   ├── __tests__/                          # Factory tests
│   │   │   ├── animal-breed-factory.test.ts
│   │   │   ├── registration-factory.test.ts
│   │   │   ├── document-factory.test.ts
│   │   │   └── process-factory.test.ts
│   │   └── index.ts                            # Factory exports
│   ├── __tests__/                              # Global tests
│   │   ├── utils.test.ts                       # Utils testing
│   │   ├── dbclient.test.ts                    # Database testing
│   │   └── setup/                              # Test setup
│   │       ├── test-database.ts                # Test DB setup
│   │       ├── test-fixtures.ts                # Test data
│   │       └── jest.setup.ts                   # Jest configuration
│   ├── dbclient.ts                             # Database client (existing)
│   ├── utils.ts                                # Either utilities
│   └── index.ts                                # Main exports
├── docs/                                       # Documentation
│   ├── EITHER_VS_RESULT_ANALYSIS.md           # Analysis documents
│   ├── REVISED_PROJECT_STRUCTURE.md           # Structure documentation
│   ├── BUSINESS_LOGIC_SEPARATION_ANALYSIS.md  # Business logic analysis
│   ├── DOMAIN_TYPES_EXPLANATION.md            # Domain types docs
│   ├── REFINED_STRUCTURE_ANALYSIS.md          # Refined analysis
│   ├── CORRECTED_IMPLEMENTATION_EXAMPLES.md   # Implementation examples
│   └── FINAL_FOLDER_STRUCTURE.md              # This file
├── jest.config.ts                              # Jest configuration
├── tsconfig.json                               # TypeScript configuration
├── package.json                                # Package configuration
└── README.md                                   # Project documentation
```

## 🎯 **Key Structure Principles:**

### **1. API Domain Organization**
```
{api-name}/
├── command/        # Write operations (CUD)
├── query/          # Read operations (R)
├── __tests__/      # API-level integration tests
└── index.ts        # API exports
```

### **2. Operation Structure**
```
{operation-name}/
├── repository.ts       # Interface implementation (Either → Result)
├── dataAccess.logic.ts # Pure data access (Either)
├── business.logic.ts   # Business rules (Either)
├── mapper.ts          # DataParser implementations (Either)
├── index.ts           # Operation exports
└── __tests__/         # Operation tests
    ├── repository.test.ts
    ├── dataAccess.test.ts
    ├── business.test.ts
    ├── mapper.test.ts
    └── integration.test.ts
```

### **3. Test Organization**
```
__tests__/
├── *.test.ts          # Unit tests per layer
└── integration.test.ts # End-to-end tests
```

## 📊 **Folder Count Summary:**

| Level | Count | Purpose |
|-------|-------|---------|
| **API Domains** | 5 APIs | feed-registration, check-animal-feed, document-process, process-setting, manage-file |
| **Operations** | ~15-20 ops | Commands + Queries per domain |
| **Core Files** | 4 files/op | repository, dataAccess, business, mapper |
| **Test Files** | 5 files/op | unit tests + integration |
| **Global Utils** | 3 files | dbclient, utils, bible-factory |

## 🔍 **File Responsibility:**

### **📄 repository.ts**
```typescript
// ✅ Implements Core Layer interface
// ✅ Coordinates dataAccess + business
// ✅ Transforms Either → Result
// ✅ Returns Result to match Core interface
```

### **📄 dataAccess.logic.ts**
```typescript
// ✅ Pure database operations
// ✅ Uses eitherFromPrisma wrapper
// ✅ No business logic
// ✅ Returns Either<Data, BaseFailure>
```

### **📄 business.logic.ts**
```typescript
// ✅ Pure business rules
// ✅ Domain validation
// ✅ Business calculations
// ✅ Returns Either<Result, BaseFailure>
```

### **📄 mapper.ts**
```typescript
// ✅ DataParser implementations
// ✅ Input validation
// ✅ Data transformation
// ✅ Returns Either<Output, BaseFailure>
```

## 🚀 **File Navigation Examples:**

### **📁 Adding New Operation:**
```bash
# Create new command
mkdir src/feed-registration-api/command/new-operation
cd src/feed-registration-api/command/new-operation

# Create core files
touch repository.ts
touch dataAccess.logic.ts
touch business.logic.ts
touch mapper.ts
touch index.ts

# Create test files
mkdir __tests__
touch __tests__/repository.test.ts
touch __tests__/dataAccess.test.ts
touch __tests__/business.test.ts
touch __tests__/mapper.test.ts
touch __tests__/integration.test.ts
```

### **📁 Adding New API Domain:**
```bash
# Create new API
mkdir src/new-api
cd src/new-api

# Create structure
mkdir command query __tests__
touch index.ts
touch __tests__/new-api.integration.test.ts

# Add first operation
mkdir command/first-operation
# ... follow operation structure
```

## 🎯 **Benefits of This Structure:**

### ✅ **Clear Separation**
- **API Domains** ตรงกับ Service Layer
- **Commands/Queries** แยกชัดเจน
- **Layers** (repository, dataAccess, business, mapper) แยก responsibility

### ✅ **Easy Navigation**
- **Predictable paths** - รู้ทันทีว่าไฟล์อยู่ที่ไหน
- **Consistent naming** - ทุก operation ใช้ pattern เดียวกัน
- **Logical grouping** - เรียงตาม domain และ operation type

### ✅ **Scalable Testing**
- **Unit tests** per layer
- **Integration tests** per operation
- **API-level tests** per domain
- **Global tests** for utilities

### ✅ **Type Safety**
- **Either** เสมอใน Infrastructure Layer
- **Result** ตาม Core Layer interface
- **DataParser** สำหรับ transformation
- **BaseFailure** จาก Core Layer

## 📋 **Implementation Checklist:**

### **Phase 1: Core Setup** ✅
- [x] Create utils.ts with Either utilities
- [x] Keep existing dbclient.ts
- [x] Setup test infrastructure

### **Phase 2: One Domain** 🔄
- [ ] Implement feed-registration-api structure
- [ ] Create add-attachment operation
- [ ] Write comprehensive tests
- [ ] Validate pattern works

### **Phase 3: Scale Out** ⏳
- [ ] Apply to all API domains
- [ ] Migrate existing operations
- [ ] Update exports

### **Phase 4: Polish** ⏳
- [ ] Performance optimization
- [ ] Documentation update
- [ ] Coverage reports
- [ ] Code review

**ตอนนี้มี Complete Folder Structure ที่ชัดเจนและครบถ้วนแล้วครับ! 🎉**