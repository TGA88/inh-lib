import { 
  UnifiedInternalService, 
  UnifiedInternalClient, 
  UnifiedInternalError 
} from './unified-internal.service';
import type { UnifiedHandlerFn } from '../types/unified-context';

/**
 * ตัวอย่างการใช้งาน Unified Internal Service และ Client
 * สำหรับการเรียกใช้ API ข้ามกันภายใน service เดียวกัน แบบ Mediator Pattern
 */

// ==============================================
// ตัวอย่าง Handlers สำหรับ document-api
// ==============================================

const documentGetHandler: UnifiedHandlerFn = async (ctx) => {
  const { id } = ctx.request.params;
  
  // Mock document retrieval
  const document = {
    id,
    title: `Document ${id}`,
    content: 'Lorem ipsum...',
    createdAt: new Date().toISOString()
  };

  ctx.response.json({ success: true, data: document });
};

const documentCreateHandler: UnifiedHandlerFn = async (ctx) => {
  const { title, content } = ctx.request.body;
  
  // Mock document creation
  const newDocument = {
    id: `doc_${Date.now()}`,
    title: title as string,
    content: content as string,
    createdAt: new Date().toISOString()
  };

  ctx.response.status(201).json({ success: true, data: newDocument });
};

// ==============================================
// ตัวอย่าง Handlers สำหรับ process-setting-api
// ==============================================

const processSettingGetHandler: UnifiedHandlerFn = async (ctx) => {
  const { processId } = ctx.request.params;
  
  // Mock process setting retrieval
  const setting = {
    processId,
    name: `Process ${processId}`,
    config: {
      autoApprove: true,
      maxRetries: 3,
      timeout: 30000
    },
    updatedAt: new Date().toISOString()
  };

  ctx.response.json({ success: true, data: setting });
};

const processSettingUpdateHandler: UnifiedHandlerFn = async (ctx) => {
  const { processId } = ctx.request.params;
  const { config } = ctx.request.body;
  
  // Mock process setting update
  const updatedSetting = {
    processId,
    name: `Process ${processId}`,
    config: config as Record<string, unknown>,
    updatedAt: new Date().toISOString()
  };

  ctx.response.json({ success: true, data: updatedSetting });
};

// ==============================================
// Cross-Service Handler ที่ใช้ Local Service Adapter
// ==============================================

const documentWithProcessHandler: UnifiedHandlerFn = async (ctx) => {
  const { documentId, processId } = ctx.request.params;
  
  // ดึง UnifiedInternalClient จาก registry
  const internalClient = ctx.registry['internalClient'] as UnifiedInternalClient;
  
  if (!internalClient) {
    ctx.response.status(500).json({
      success: false,
      error: 'Internal client not available'
    });
    return;
  }

  try {
    // เรียกใช้ document-api แบบ internal ด้วย GET method
    const documentResult = await internalClient.get<{
      success: boolean;
      data: {
        id: string;
        title: string;
        content: string;
        createdAt: string;
      };
    }>('/api/documents/:id', 
      { id: documentId }, 
      {
        userId: ctx.request.headers['x-user-id'] || 'system',
        correlationId: ctx.request.headers['x-correlation-id'] || 'auto-generated'
      }
    );

    // เรียกใช้ process-setting-api แบบ internal ด้วย GET method
    const processResult = await internalClient.get<{
      success: boolean;
      data: {
        processId: string;
        name: string;
        config: Record<string, unknown>;
        updatedAt: string;
      };
    }>('/api/process-settings/:processId', 
      { processId }, 
      {
        userId: ctx.request.headers['x-user-id'] || 'system',
        correlationId: ctx.request.headers['x-correlation-id'] || 'auto-generated'
      }
    );

    // รวมข้อมูลจากทั้งสอง APIs
    const combinedData = {
      document: documentResult.unwrap().data,
      processSettings: processResult.unwrap().data,
      combinedAt: new Date().toISOString()
    };

    ctx.response.json({
      success: true,
      data: combinedData
    });

  } catch (error) {
    if (error instanceof UnifiedInternalError) {
      ctx.response.status(500).json({
        success: false,
        error: error.message,
        code: error.code,
        details: error.data
      });
    } else {
      const errorMessage = error instanceof Error ? error.message : 'Internal server error';
      ctx.response.status(500).json({
        success: false,
        error: errorMessage
      });
    }
  }
};

// ==============================================
// Service Registry และ Setup (Mediator Pattern)
// ==============================================

export function setupUnifiedInternalExample(): {
  service: UnifiedInternalService;
  client: UnifiedInternalClient;
} {
  // สร้าง UnifiedInternalService (จัดการ handlers)
  const internalService = new UnifiedInternalService({
    version: '1.0.0',
    service: 'document-process-service'
  });

  // สร้าง UnifiedInternalClient (เรียกใช้ services)
  const internalClient = new UnifiedInternalClient(internalService);

  // ลงทะเบียน document-api handlers
  internalService.registerHandler('/api/documents/:id', documentGetHandler);
  internalService.registerHandler('/api/documents', documentCreateHandler);

  // ลงทะเบียน process-setting-api handlers  
  internalService.registerHandler('/api/process-settings/:processId', processSettingGetHandler);
  internalService.registerHandler('/api/process-settings/:processId/update', processSettingUpdateHandler);

  // ลงทะเบียน combined handler
  internalService.registerHandler('/api/documents/:documentId/with-process/:processId', documentWithProcessHandler);

  return { service: internalService, client: internalClient };
}

// ==============================================
// ตัวอย่างการใช้งาน (Mediator Pattern)
// ==============================================

export async function exampleUsage() {
  const { service, client } = setupUnifiedInternalExample();

  try {
    console.log('=== ตัวอย่างการเรียกใช้ document-api ===');
    
    // เรียกใช้ document-api ด้วย GET method
    const documentResult = await client.get('/api/documents/:id', 
      { id: '123' }, 
      {
        userId: 'user-001',
        correlationId: 'req-123'
      }
    );

    console.log('Document Result:', documentResult.data);

    console.log('=== ตัวอย่างการเรียกใช้ process-setting-api ===');
    
    // เรียกใช้ process-setting-api ด้วย GET method
    const processResult = await client.get('/api/process-settings/:processId', 
      { processId: 'proc-456' }, 
      {
        userId: 'user-001', 
        correlationId: 'req-124'
      }
    );

    console.log('Process Result:', processResult.data);

    console.log('=== ตัวอย่างการสร้าง document ใหม่ ===');
    
    // สร้าง document ใหม่ด้วย POST method
    const createResult = await client.post('/api/documents', 
      {
        title: 'New Document',
        content: 'Document content here...'
      },
      {
        userId: 'user-001',
        correlationId: 'req-125'
      }
    );

    console.log('Create Result:', createResult.data);

    console.log('=== ตัวอย่างการเรียกใช้ combined API ===');
    
    // เรียกใช้ combined API ที่ใช้ internal client
    const combinedResult = await client.get('/api/documents/:documentId/with-process/:processId',
      { documentId: '123', processId: 'proc-456' },
      {
        userId: 'user-001',
        correlationId: 'req-126',
        registry: { internalClient: client } // ส่ง client เพื่อให้ handler ใช้
      }
    );

    console.log('Combined Result:', combinedResult.data);

    console.log('=== ตัวอย่างการตรวจสอบ routes ที่มีอยู่ ===');
    
    // ตรวจสอบ routes ที่ลงทะเบียนไว้
    const registeredRoutes = service.getRegisteredRoutes();
    console.log('Registered Routes:', registeredRoutes);

    // ตรวจสอบว่า route มีอยู่หรือไม่
    const hasDocumentRoute = client.hasRoute('/api/documents/:id');
    console.log('Has document route:', hasDocumentRoute);

  } catch (error) {
    console.error('Error:', error);
  }
}

// ==============================================
// Type Definitions สำหรับ Response
// ==============================================

export interface DocumentResponse {
  success: boolean;
  data: {
    id: string;
    title: string;
    content: string;
    createdAt: string;
  };
}

export interface ProcessSettingResponse {
  success: boolean;
  data: {
    processId: string;
    name: string;
    config: Record<string, unknown>;
    updatedAt: string;
  };
}

export interface CombinedResponse {
  success: boolean;
  data: {
    document: DocumentResponse['data'];
    processSettings: ProcessSettingResponse['data'];
    combinedAt: string;
  };
}