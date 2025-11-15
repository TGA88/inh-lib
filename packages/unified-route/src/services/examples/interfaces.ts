// Example: Complete Facade Pattern Implementation
// libs/api-service/document-api/interfaces/document-api-client.interface.ts

export interface Document {
  id: string;
  title: string;
  content: string;
  author: string;
  status: 'draft' | 'published' | 'archived';
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
}

export interface CreateDocumentInput {
  title: string;
  content: string;
  author: string;
  tags?: string[];
}

export interface SearchDocumentsInput {
  query?: string;
  userId?: string;
  status?: Document['status'];
  tags?: string[];
  limit?: number;
  offset?: number;
  sortBy?: 'title' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

export interface DocumentMetadata {
  wordCount: number;
  readingTime: number;
  lastModifiedBy: string;
  version: number;
  checksum: string;
}

export interface DocumentAnalytics {
  views: number;
  downloads: number;
  shares: number;
  avgRating: number;
  lastAccessed: Date;
  topReferrers: string[];
}

/**
 * 🎯 Main Interface - API Contract for Document Operations
 * 
 * This interface defines all document operations that can be performed
 * regardless of the underlying implementation (Internal, HTTP, etc.)
 * 
 * Benefits:
 * - Type safety across all implementations
 * - Easy mocking for tests
 * - Consistent API surface
 * - Implementation flexibility
 */
export interface IDocumentApiClient {
  // ✅ Core CRUD Operations
  getDocument(id: string): Promise<Document>;
  createDocument(input: CreateDocumentInput): Promise<Document>;
  updateDocument(id: string, updates: Partial<CreateDocumentInput>): Promise<Document>;
  deleteDocument(id: string): Promise<void>;
  
  // ✅ Query Operations
  searchDocuments(input?: SearchDocumentsInput): Promise<Document[]>;
  getDocumentsByUser(userId: string): Promise<Document[]>;
  
  // ✅ Metadata Operations  
  getMetadata(id: string): Promise<DocumentMetadata>;
  getAnalytics(id: string): Promise<DocumentAnalytics>;
  
  // ✅ Business Operations
  publishDocument(id: string): Promise<Document>;
  archiveDocument(id: string): Promise<void>;
  
  // ✅ Composite Operations (Multiple calls combined)
  getDocumentWithMetadata(id: string): Promise<Document & { metadata: DocumentMetadata }>;
  bulkCreateDocuments(documents: CreateDocumentInput[]): Promise<Document[]>;
}

/**
 * 🏭 Factory Configuration Types
 */
export type ClientType = 'internal' | 'axios' | 'fetch';

export interface HttpClientConfig {
  baseURL: string;
  timeout?: number;
  retries?: number;
  headers?: Record<string, string>;
  auth?: {
    apiKey?: string;
    token?: string;
  };
}

export interface ClientConfig {
  type: ClientType;
  http?: HttpClientConfig;
}