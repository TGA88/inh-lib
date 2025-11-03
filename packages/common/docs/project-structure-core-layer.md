# Project Structure for @feedos-frgm-system/shared-api-core

## 📋 Overview

This document defines the **standardized project structure** for the Core layer based on Domain Layer Architecture principles. The Core layer contains domain models, business rules, repository contracts, and shared utilities organized by business domains.

## 🏗️ API-Core Layer Architecture

### **Architecture Principles**
- **🏢 1 Product or System per DB Instance** → Clear product boundaries
- **🗄️ 1 Feature (API Domain) per DB Schema** → Schema isolation per domain  
- **🔑 Feature Names must be unique in Product Scope** → No naming conflicts across domains

### **Layer Responsibilities**
- **🏛️ Core Layer**: Domain models, repository contracts, business rules
- **🔧 Service Layer**: Use case implementations, business logic orchestration
- **🔌 Infrastructure Layer**: Database implementations, external services

## 📁 Project Structure

```
@feedos-frgm-system/shared-api-core/
├── src/
│   ├── {api-domain}/                     # API Domain (1 per DB Schema)
│   │   ├── failures.ts                   # 🌐 Domain-wide failures
│   │   ├── {domain}.const.ts            # Domain constants
│   │   ├── command/                      # Write Operations (CUD)
│   │   │   └── {use-case}/              # Single Use Case
│   │   │       ├── contract.ts          # Repository interface
│   │   │       ├── type.ts              # Input/Output types
│   │   │       ├── failure.ts           # Use case specific failures
│   │   │       ├── index.ts             # Barrel exports
│   │   │       └── __test__/            # Unit tests
│   │   ├── query/                       # Read Operations (R)
│   │   │   └── {use-case}/              # Single Use Case
│   │   │       ├── contract.ts          # Query interface
│   │   │       ├── type.ts              # Query types
│   │   │       ├── failure.ts           # Query specific failures
│   │   │       └── index.ts             # Barrel exports
|   |   |       └── __test__/            # Unit tests
│   │   └── logics/                      # Domain utilities
│   │       ├── context-key.ts          # Dependency injection keys
│   │       ├── {utility}.ts            # Pure functions & business rules
│   │       └── index.ts                # Utilities exports
│   └── index.ts                         # Main package exports
├── docs/                                 # Documentation
└── package.json
```

## 🎯 File Organization

### **Domain Level Files**

#### **failures.ts** - Domain-wide Failures
```typescript
// feed-registration-api/failures.ts
import { BaseFailure, CommonFailures } from '@inh-lib/common';

export namespace FeedRegistrationFailures {
  // Domain-wide business failures
  export class RegistrationNotFound extends BaseFailure {
    constructor(registrationId: string) {
      super('REGISTRATION_NOT_FOUND', `Registration ${registrationId} not found`, 404);
    }
  }

  export class InvalidRegistrationStatus extends BaseFailure {
    constructor(status: string, allowedStatuses: string[]) {
      super('INVALID_REGISTRATION_STATUS', 
            `Status '${status}' invalid. Allowed: ${allowedStatuses.join(', ')}`, 422);
    }
  }

  // Reuse common failures
  export const ValidationError = CommonFailures.ValidationFail;
  export const DatabaseError = CommonFailures.InternalFail;
}
```

#### **{domain}.const.ts** - Domain Constants
```typescript
// feed-registration-api/registry.const.ts
export const REGISTRATION_STATUS = {
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED', 
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  EXPIRED: 'EXPIRED'
} as const;

export type RegistrationStatus = typeof REGISTRATION_STATUS[keyof typeof REGISTRATION_STATUS];

export const BUSINESS_RULES = {
  MAX_ATTACHMENTS: 10,
  MAX_FILE_SIZE_MB: 50,
  ALLOWED_FILE_TYPES: ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx'] as const,
  REGISTRATION_EXPIRY_DAYS: 365
} as const;
```

### **Use Case Level Files**

#### **contract.ts** - Repository Interface
```typescript
// feed-registration-api/command/add-attachment/contract.ts
import { BaseFailure, ResultV2 as Result } from '@inh-lib/common';
import { UnifiedHttpContext } from '@inh-lib/unified-route';
import { AddAttachmentInput, AddAttachmentOutput } from './type';

/**
 * Repository contract for adding attachments to registrations
 */
export interface IAddAttachmentRepository {
  /**
   * Add attachments to a feed registration
   * @param context - HTTP context for user authentication
   * @param input - Attachment data and metadata
   * @returns Result with attachment details or failure
   */
  addAttachment(
    context: UnifiedHttpContext,
    input: AddAttachmentInput,
  ): Promise<Result<AddAttachmentOutput, BaseFailure>>;
}

// Type alias for easier importing
export type AddAttachmentRepository = IAddAttachmentRepository;
```

#### **type.ts** - Input/Output Types
```typescript
// feed-registration-api/command/add-attachment/type.ts

/**
 * Input data for adding attachments to a registration
 */
export type AddAttachmentInput = {
  registrationId: string;
  files: {
    fileName: string;
    fileData: Buffer;
    contentType: string;
    description?: string;
  }[];
  userId: string;
  metadata?: {
    tags?: string[];
    category?: string;
  };
};

/**
 * Output data after successfully adding attachments
 */
export type AddAttachmentOutput = {
  attachmentId: string;
  registrationId: string;
  uploadedFiles: {
    fileId: string;
    fileName: string;
    filePath: string;
    fileSize: number;
    contentType: string;
    uploadedAt: Date;
  }[];
  status: 'success' | 'partial';
  totalFiles: number;
  totalSize: number;
};

/**
 * Additional types specific to this use case
 */
export type FileValidationResult = {
  fileName: string;
  isValid: boolean;
  errors: string[];
  size: number;
};

export type AttachmentMetadata = {
  checksum: string;
  mimeType: string;
  processedAt: Date;
};
```

#### **failure.ts** - Use Case Specific Failures
```typescript
// feed-registration-api/command/add-attachment/failure.ts
import { BaseFailure } from '@inh-lib/common';
import { FeedRegistrationFailures } from '../../failures';

export namespace AddAttachmentFailures {
  // Use case specific business rule failures
  export class InvalidFileType extends BaseFailure {
    constructor(fileType: string, allowedTypes: string[]) {
      super(
        'INVALID_FILE_TYPE',
        `File type '${fileType}' is not allowed. Allowed types: ${allowedTypes.join(', ')}`,
        422,
        { fileType, allowedTypes }
      );
    }
  }

  export class FileSizeExceeded extends BaseFailure {
    constructor(fileName: string, size: number, maxSize: number) {
      super(
        'FILE_SIZE_EXCEEDED',
        `File '${fileName}' size ${size} bytes exceeds maximum ${maxSize} bytes`,
        422,
        { fileName, size, maxSize, maxSizeMB: Math.round(maxSize / (1024 * 1024)) }
      );
    }
  }

  export class TooManyAttachments extends BaseFailure {
    constructor(count: number, maxCount: number) {
      super(
        'TOO_MANY_ATTACHMENTS',
        `Cannot attach ${count} files. Maximum allowed: ${maxCount}`,
        422,
        { count, maxCount }
      );
    }
  }

  export class DuplicateFileName extends BaseFailure {
    constructor(fileName: string) {
      super(
        'DUPLICATE_FILE_NAME',
        `File with name '${fileName}' already exists in this registration`,
        409,
        { fileName }
      );
    }
  }

  // Import relevant domain-wide failures
  export const RegistrationNotFound = FeedRegistrationFailures.RegistrationNotFound;
  export const InvalidRegistrationStatus = FeedRegistrationFailures.InvalidRegistrationStatus;
  export const ValidationError = FeedRegistrationFailures.ValidationError;
  export const DatabaseError = FeedRegistrationFailures.DatabaseError;
}
```

#### **index.ts** - Barrel Exports
```typescript
// feed-registration-api/command/add-attachment/index.ts

// Export all public interfaces and types
export * from './contract';
export * from './type';
export * from './failure';

// Named exports for explicit importing
export { IAddAttachmentRepository, type AddAttachmentRepository } from './contract';
export type { 
  AddAttachmentInput, 
  AddAttachmentOutput, 
  FileValidationResult,
  AttachmentMetadata 
} from './type';
export { AddAttachmentFailures } from './failure';
```

### **Domain Utilities**

#### **logics/context-key.ts** - Dependency Injection Keys
```typescript
// feed-registration-api/logics/context-key.ts

/**
 * Context keys for dependency injection in feed registration domain
 */
export const FeedRegistrationContextKeys = {
  // Repository keys (one per use case)
  ADD_ATTACHMENT_REPOSITORY: 'repository:feed-registration:add-attachment',
  SAVE_REGISTRATION_REPOSITORY: 'repository:feed-registration:save-registration',
  DELETE_FILE_REPOSITORY: 'repository:feed-registration:delete-file',
  SEND_EMAIL_REPOSITORY: 'repository:feed-registration:send-email',
  
  GET_ANIMAL_BREED_REPOSITORY: 'repository:feed-registration:get-animal-breed',
  GET_REGISTRATION_DETAIL_REPOSITORY: 'repository:feed-registration:get-registration-detail',
  GET_LIST_FEED_REGISTRATION_REPOSITORY: 'repository:feed-registration:get-list-feed-registration',

  // Service keys
  FILE_VALIDATION_SERVICE: 'service:feed-registration:file-validation',
  EMAIL_NOTIFICATION_SERVICE: 'service:feed-registration:email-notification',
  DOCUMENT_GENERATOR_SERVICE: 'service:feed-registration:document-generator',
  AUDIT_LOG_SERVICE: 'service:feed-registration:audit-log',

  // Configuration keys
  FILE_UPLOAD_CONFIG: 'config:feed-registration:file-upload',
  BUSINESS_RULES_CONFIG: 'config:feed-registration:business-rules',
  EMAIL_TEMPLATE_CONFIG: 'config:feed-registration:email-templates',
  NOTIFICATION_CONFIG: 'config:feed-registration:notifications',
} as const;

// Type-safe context key type
export type FeedRegistrationContextKey = 
  typeof FeedRegistrationContextKeys[keyof typeof FeedRegistrationContextKeys];
```

#### **logics/validation.ts** - Domain Business Rules
```typescript
// feed-registration-api/logics/validation.ts
import { BUSINESS_RULES, RegistrationStatus } from '../registry.const';

/**
 * Validate file type against allowed types
 */
export const isValidFileType = (fileType: string): boolean => {
  return BUSINESS_RULES.ALLOWED_FILE_TYPES.includes(fileType.toLowerCase() as any);
};

/**
 * Validate file size against business rules
 */
export const isValidFileSize = (sizeInBytes: number): boolean => {
  const maxSizeBytes = BUSINESS_RULES.MAX_FILE_SIZE_MB * 1024 * 1024;
  return sizeInBytes <= maxSizeBytes;
};

/**
 * Check if registration status allows modifications
 */
export const canModifyRegistration = (status: RegistrationStatus): boolean => {
  return ['DRAFT', 'SUBMITTED'].includes(status);
};

/**
 * Validate registration expiry
 */
export const isRegistrationExpired = (createdAt: Date): boolean => {
  const expiryDate = new Date(createdAt);
  expiryDate.setDate(expiryDate.getDate() + BUSINESS_RULES.REGISTRATION_EXPIRY_DAYS);
  return new Date() > expiryDate;
};

/**
 * Format registration ID according to business rules
 */
export const formatRegistrationId = (prefix: string, sequence: number): string => {
  return `${prefix}-${sequence.toString().padStart(6, '0')}`;
};
```

## 🎯 Domain Organization Patterns

### **Pattern 1: Full CQRS Domain** (Complete business functionality)
```
feed-registration-api/                    # Primary business domain
├── failures.ts                          # Domain-wide failures
├── registry.const.ts                    # Domain constants
├── command/                              # Write operations
│   ├── add-attachment/                   # File attachment management
│   │   ├── contract.ts
│   │   ├── type.ts
│   │   ├── failure.ts
│   │   └── index.ts
│   ├── save-registration/                # Registration lifecycle
│   │   ├── contract.ts
│   │   ├── type.ts
│   │   ├── failure.ts
│   │   └── index.ts
│   ├── delete-file/                      # File management
│   │   └── ...
│   └── send-email/                       # Communication
│       └── ...
├── query/                                # Read operations
│   ├── get-animal-breed/                 # Reference data
│   │   ├── contract.ts
│   │   ├── type.ts
│   │   ├── failure.ts
│   │   └── index.ts
│   ├── get-registration-detail/          # Entity retrieval
│   │   └── ...
│   └── get-list-feed-registration/       # List operations
│       └── ...
└── logics/                               # Domain utilities
    ├── context-key.ts                   # DI keys
    ├── validation.ts                    # Business rules
    ├── format-date.ts                   # Utilities
    └── index.ts                         # Exports
```

### **Pattern 2: Command-Only Domain** (Utility operations)
```
manage-file-api/                          # File utility domain
├── failures.ts                          # File operation failures
├── file.const.ts                        # File-related constants
└── command/                              # Write operations only
    ├── upload-file/                      # File upload
    │   ├── contract.ts
    │   ├── type.ts
    │   ├── failure.ts
    │   └── index.ts
    └── download-file/                    # File download
        └── ...
```

### **Pattern 3: Query-Only Domain** (Reporting/Analytics)
```
check-animal-feed-registration-api/       # Reporting domain
├── failures.ts                          # Report generation failures
└── query/                                # Read operations only
    ├── excel-application-detail/         # Report generation
    │   ├── contract.ts
    │   ├── type.ts
    │   ├── failure.ts
    │   └── index.ts
    ├── get-list-history/                 # Historical data
    │   └── ...
    └── get-detail-animal-feed-register/  # Detail reports
        └── ...
```

### **Pattern 4: Mixed Domain** (Configuration management)
```
process-setting-api/                      # Configuration domain
├── failures.ts                          # Configuration failures
├── process.const.ts                     # Process constants
├── command/                              # Configuration write operations
│   ├── create-process-class/
│   │   └── ...
│   └── update-status-process-class/
│       └── ...
├── query/                                # Configuration read operations
│   ├── get-list-process-setting/
│   │   └── ...
│   └── get-process-class-detail/
│       └── ...
└── logics/                               # Configuration utilities
    └── ...
```

## 📦 Export Strategy

### **Main Package Index**
```typescript
// src/index.ts
// Export all domain public APIs
export * from './feed-registration-api';
export * from './check-animal-feed-registration-api';
export * from './document-process-api';
export * from './manage-file-api';
export * from './process-setting-api';
```

### **Domain Index**
```typescript
// src/feed-registration-api/index.ts
// Export domain-wide items
export * from './failures';
export * from './registry.const';
export * from './logics';

// Export all commands
export * from './command/add-attachment';
export * from './command/save-registration';
export * from './command/delete-file';
export * from './command/send-email';

// Export all queries
export * from './query/get-animal-breed';
export * from './query/get-registration-detail';
export * from './query/get-list-feed-registration';
```

### **Package.json Exports**
```json
{
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "require": "./dist/index.js",
      "types": "./dist/index.d.ts"
    },
    "./{domain}": {
      "import": "./dist/{domain}/index.mjs",
      "require": "./dist/{domain}/index.js",
      "types": "./dist/{domain}/index.d.ts"
    },
    "./{domain}/command/{use-case}": {
      "import": "./dist/{domain}/command/{use-case}/index.mjs",
      "require": "./dist/{domain}/command/{use-case}/index.js",
      "types": "./dist/{domain}/command/{use-case}/index.d.ts"
    },
    "./{domain}/query/{query}": {
      "import": "./dist/{domain}/query/{use-case}/index.mjs",
      "require": "./dist/{domain}/query/{use-case}/index.js",
      "types": "./dist/{domain}/query/{use-case}/index.d.ts"
    },
    "./{domain}/logics": {
      "import": "./dist/{domain}/logics/index.mjs",
      "require": "./dist/{domain}/logics/index.js",
      "types": "./dist/{domain}/logics/index.d.ts"
    }
  }
}
```

## 🧪 Testing Strategy

### **Unit Tests Structure**
```
add-attachment/__test__/
├── contract.test.ts          # Interface compliance tests
├── type.test.ts              # Type validation tests
├── failure.test.ts           # Error handling tests
└── integration.test.ts       # Cross-file integration tests
```

### **Type Testing**
```typescript
// add-attachment/__test__/type.test.ts
import { AddAttachmentInput, AddAttachmentOutput } from '../type';

describe('AddAttachment Types', () => {
  describe('AddAttachmentInput', () => {
    it('should accept valid input structure', () => {
      const input: AddAttachmentInput = {
        registrationId: 'reg-123',
        files: [{
          fileName: 'test.pdf',
          fileData: Buffer.from('test data'),
          contentType: 'application/pdf'
        }],
        userId: 'user-456'
      };
      
      expect(input.registrationId).toBe('reg-123');
      expect(input.files).toHaveLength(1);
      expect(input.userId).toBe('user-456');
    });

    it('should accept optional metadata', () => {
      const input: AddAttachmentInput = {
        registrationId: 'reg-123',
        files: [],
        userId: 'user-456',
        metadata: {
          tags: ['important', 'review'],
          category: 'documents'
        }
      };
      
      expect(input.metadata?.tags).toEqual(['important', 'review']);
    });
  });
});
```

### **Failure Testing**
```typescript
// add-attachment/__test__/failure.test.ts
import { AddAttachmentFailures } from '../failure';

describe('AddAttachment Failures', () => {
  describe('InvalidFileType', () => {
    it('should create error with correct properties', () => {
      const error = new AddAttachmentFailures.InvalidFileType('exe', ['pdf', 'jpg']);
      
      expect(error.code).toBe('INVALID_FILE_TYPE');
      expect(error.statusCode).toBe(422);
      expect(error.message).toContain('exe');
      expect(error.details.fileType).toBe('exe');
      expect(error.details.allowedTypes).toEqual(['pdf', 'jpg']);
    });
  });

  describe('FileSizeExceeded', () => {
    it('should include size information in details', () => {
      const error = new AddAttachmentFailures.FileSizeExceeded('large.pdf', 100000000, 50000000);
      
      expect(error.details.fileName).toBe('large.pdf');
      expect(error.details.size).toBe(100000000);
      expect(error.details.maxSize).toBe(50000000);
      expect(error.details.maxSizeMB).toBe(48);
    });
  });
});
```

### **Domain Logic Testing**
```typescript
// logics/__test__/validation.test.ts
import { isValidFileType, isValidFileSize, canModifyRegistration } from '../validation';

describe('Feed Registration Validation', () => {
  describe('isValidFileType', () => {
    it('should accept allowed file types', () => {
      expect(isValidFileType('pdf')).toBe(true);
      expect(isValidFileType('jpg')).toBe(true);
      expect(isValidFileType('PDF')).toBe(true); // Case insensitive
    });

    it('should reject disallowed file types', () => {
      expect(isValidFileType('exe')).toBe(false);
      expect(isValidFileType('bat')).toBe(false);
    });
  });

  describe('canModifyRegistration', () => {
    it('should allow modification for draft and submitted status', () => {
      expect(canModifyRegistration('DRAFT')).toBe(true);
      expect(canModifyRegistration('SUBMITTED')).toBe(true);
    });

    it('should deny modification for final statuses', () => {
      expect(canModifyRegistration('APPROVED')).toBe(false);
      expect(canModifyRegistration('REJECTED')).toBe(false);
    });
  });
});
```

## ⚡ Benefits

### **1. Clear Organization**
- **📁 Flat structure**: ไม่มี nested folders ซับซ้อน
- **🎯 Single responsibility**: แต่ละไฟล์มีหน้าที่เดียว
- **🔍 Predictable**: หาไฟล์ได้ง่ายตาม pattern

### **2. Developer Experience**
```typescript
// Clean, predictable imports
import { IAddAttachmentRepository } from '@core/feed-registration-api/command/add-attachment';
import { AddAttachmentInput, AddAttachmentOutput } from '@core/feed-registration-api/command/add-attachment';
import { AddAttachmentFailures } from '@core/feed-registration-api/command/add-attachment';
import { FeedRegistrationFailures } from '@core/feed-registration-api';
```

### **3. Data Access Layer Alignment**
- **🗄️ Schema per domain**: แต่ละ API domain มี dedicated DB schema
- **🔑 Unique naming**: Feature names unique ใน product scope
- **📊 Clear boundaries**: Domain isolation enforced

### **4. Maintenance & Scalability**
- **🔄 Easy refactoring**: Dependencies ชัดเจน
- **🧪 Comprehensive testing**: แต่ละส่วน test ได้แยก
- **👥 Team collaboration**: Ownership boundaries ชัดเจน
- **📈 Growth ready**: เพิ่ม domain/use case ได้ง่าย

---

*Last updated: November 2, 2025*  
*Version: 2.0.0*