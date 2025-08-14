// ตัวอย่างข้อมูลที่ทำให้เกิด Circular JSON Structure Error

// === 1. Simple Circular Reference ===
console.log("=== 1. Simple Circular Reference ===");

const user = {
    id: '123',
    name: 'John Doe',
    profile: null as any
};

const profile = {
    userId: '123',
    bio: 'Software Engineer',
    user: user  // ← Circular reference: profile.user.profile.user.profile...
};

user.profile = profile;  // ← สร้าง circular reference

console.log("User object structure:");
console.log("user.name:", user.name);
console.log("user.profile.bio:", user.profile.bio);
console.log("user.profile.user === user:", user.profile.user === user); // true

// ❌ จะ Error: Converting circular structure to JSON
try {
    JSON.stringify(user);
} catch (error) {
    console.log("❌ Error:", error.message);
    // Output: Converting circular structure to JSON
    //         --> starting at object with constructor 'Object'
    //         |     property 'profile' -> object with constructor 'Object'
    //         --- property 'user' closes the circle
}

// === 2. Complex Nested Circular Reference ===
console.log("\n=== 2. Complex Nested Circular Reference ===");

const company = {
    id: 'comp-1',
    name: 'Tech Corp',
    employees: []
};

const department = {
    id: 'dept-1',
    name: 'Engineering',
    company: company,
    manager: null as any,
    employees: []
};

const employee = {
    id: 'emp-1',
    name: 'Jane Smith',
    department: department,
    company: company,
    manager: null as any,
    subordinates: []
};

// สร้าง circular references
company.employees = [employee];
department.employees = [employee];
department.manager = employee;
employee.manager = employee; // self-reference
employee.subordinates = [employee]; // self-reference

console.log("Complex structure:");
console.log("employee.name:", employee.name);
console.log("employee.department.company.employees[0] === employee:", 
    employee.department.company.employees[0] === employee); // true
console.log("employee.manager === employee:", employee.manager === employee); // true

// ❌ จะ Error เมื่อพยายาม stringify
try {
    JSON.stringify(company);
} catch (error) {
    console.log("❌ Complex Error:", error.message);
}

// === 3. Real-world: UnifiedHttpContext with Telemetry ===
console.log("\n=== 3. Real-world: UnifiedHttpContext with Telemetry ===");

// ตัวอย่างจริงจาก UnifiedHttpContext ที่มี telemetry objects
const mockSpan = {
    id: 'span-123',
    operationName: 'user.findAll',
    tracer: null as any,
    context: null as any,
    tags: {},
    setTag: function(key: string, value: any) { this.tags[key] = value; },
    setStatus: function(status: any) { this.status = status; },
    recordException: function(error: Error) { this.error = error; }
};

const mockTracer = {
    id: 'tracer-456',
    spans: [mockSpan],
    provider: null as any,
    createSpan: function(name: string) { 
        const span = { ...mockSpan, operationName: name, tracer: this };
        this.spans.push(span);
        return span;
    }
};

const mockProvider = {
    id: 'provider-789',
    tracers: [mockTracer],
    getTracer: function() { return mockTracer; }
};

// สร้าง circular references
mockSpan.tracer = mockTracer;
mockSpan.context = {
    requestId: 'req-123',
    span: mockSpan  // ← circular
};
mockTracer.provider = mockProvider;
mockProvider.tracers = [mockTracer];

const unifiedHttpContext = {
    requestId: 'req-123',
    traceId: 'trace-456',
    telemetryService: {
        tracer: mockTracer,
        currentSpan: mockSpan,
        provider: mockProvider
    },
    request: {
        id: 'req-123',
        url: '/api/users',
        method: 'GET',
        context: null as any  // ← จะชี้กลับมาที่ unifiedHttpContext
    }
};

// สร้าง circular reference
unifiedHttpContext.request.context = unifiedHttpContext;

console.log("UnifiedHttpContext structure:");
console.log("context.requestId:", unifiedHttpContext.requestId);
console.log("context.telemetryService.currentSpan.tracer.provider.tracers[0] === context.telemetryService.tracer:", 
    unifiedHttpContext.telemetryService.currentSpan.tracer.provider.tracers[0] === unifiedHttpContext.telemetryService.tracer);
console.log("context.request.context === context:", unifiedHttpContext.request.context === unifiedHttpContext);

// ❌ จะ Error เมื่อใช้ใน attributes
try {
    const attributes = {
        'processer.args': JSON.stringify([unifiedHttpContext, 'some-param'])
    };
} catch (error) {
    console.log("❌ Real-world Error:", error.message);
    // Error: Converting circular structure to JSON
    //        --> starting at object with constructor 'Object'
    //        |     property 'telemetryService' -> object with constructor 'Object'
    //        |     property 'tracer' -> object with constructor 'Object'
    //        |     property 'provider' -> object with constructor 'Object'
    //        --- property 'tracers' closes the circle
}

// === 4. DOM Elements (Browser Environment) ===
console.log("\n=== 4. DOM Elements (Browser Environment) ===");

// ใน browser environment
const mockDOMElement = {
    id: 'button-1',
    tagName: 'BUTTON',
    parentNode: null as any,
    children: [] as any[],
    ownerDocument: null as any
};

const mockDocument = {
    getElementById: function(id: string) { return mockDOMElement; },
    elements: [mockDOMElement],
    body: {
        children: [mockDOMElement],
        ownerDocument: null as any
    }
};

// สร้าง circular references
mockDOMElement.ownerDocument = mockDocument;
mockDOMElement.parentNode = mockDocument.body;
mockDocument.body.ownerDocument = mockDocument;

console.log("DOM element structure:");
console.log("element.tagName:", mockDOMElement.tagName);
console.log("element.ownerDocument.body.children[0] === element:", 
    mockDOMElement.ownerDocument.body.children[0] === mockDOMElement);

try {
    JSON.stringify(mockDOMElement);
} catch (error) {
    console.log("❌ DOM Error:", error.message);
}

// === 5. เวลาใช้งานจริงใน UnifiedTelemetryProcesser ===
console.log("\n=== 5. Real Usage in UnifiedTelemetryProcesser ===");

// ตัวอย่างการส่ง arguments ที่มี circular reference
function simulateProcessorUsage() {
    const processor = {
        process: function(...args: any[]) {
            try {
                // ❌ สิ่งที่ไม่ควรทำ - stringify ทั้ง args
                const attributes = {
                    'processer.args': JSON.stringify(args),  // ← จะ error ที่นี่
                    'processer.args_count': args.length
                };
                console.log("✅ Attributes created:", attributes);
            } catch (error) {
                console.log("❌ Error in processor:", error.message);
                
                // ✅ วิธีแก้ไข - ใช้ safe attributes
                const safeAttributes = {
                    'processer.args_count': args.length,
                    'processer.args_types': args.map(arg => typeof arg).join(', '),
                    'processer.context_id': args[0]?.requestId || 'unknown',
                    'processer.operation': 'test.operation'
                };
                console.log("✅ Safe attributes:", safeAttributes);
            }
        }
    };
    
    // เรียกใช้กับข้อมูลที่มี circular reference
    processor.process(unifiedHttpContext, { userId: '123', filters: {} });
}

simulateProcessorUsage();

// === 6. วิธีตรวจสอบ Circular Reference ===
console.log("\n=== 6. วิธีตรวจสอบ Circular Reference ===");

function hasCircularReference(obj: any, seen = new WeakSet()): boolean {
    if (obj === null || typeof obj !== 'object') {
        return false;
    }
    
    if (seen.has(obj)) {
        return true; // เจอ circular reference
    }
    
    seen.add(obj);
    
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            if (hasCircularReference(obj[key], seen)) {
                return true;
            }
        }
    }
    
    seen.delete(obj);
    return false;
}

function findCircularPath(obj: any, path: string[] = [], seen = new WeakMap()): string | null {
    if (obj === null || typeof obj !== 'object') {
        return null;
    }
    
    if (seen.has(obj)) {
        const circularPath = seen.get(obj);
        return `Circular reference: ${circularPath.join('.')} -> ${path.join('.')}`;
    }
    
    seen.set(obj, [...path]);
    
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            const result = findCircularPath(obj[key], [...path, key], seen);
            if (result) {
                return result;
            }
        }
    }
    
    seen.delete(obj);
    return null;
}

// ทดสอบการตรวจสอบ
console.log("Testing circular detection:");
console.log("user has circular:", hasCircularReference(user));
console.log("user circular path:", findCircularPath(user, ['user']));

console.log("company has circular:", hasCircularReference(company));
console.log("company circular path:", findCircularPath(company, ['company']));

console.log("unifiedHttpContext has circular:", hasCircularReference(unifiedHttpContext));
console.log("context circular path:", findCircularPath(unifiedHttpContext, ['context']));

// === 7. Safe Serialization ===
console.log("\n=== 7. Safe Serialization ===");

function safeStringify(obj: any, maxDepth: number = 3, currentDepth: number = 0, seen = new WeakSet()): string {
    if (currentDepth > maxDepth) {
        return '"[Max Depth Reached]"';
    }
    
    if (obj === null || obj === undefined) {
        return JSON.stringify(obj);
    }
    
    if (typeof obj !== 'object') {
        return JSON.stringify(obj);
    }
    
    if (seen.has(obj)) {
        return '"[Circular Reference]"';
    }
    
    seen.add(obj);
    
    try {
        if (Array.isArray(obj)) {
            const items = obj.map(item => 
                safeStringify(item, maxDepth, currentDepth + 1, seen)
            );
            return `[${items.join(',')}]`;
        } else {
            const entries = Object.entries(obj).map(([key, value]) => 
                `"${key}":${safeStringify(value, maxDepth, currentDepth + 1, seen)}`
            );
            return `{${entries.join(',')}}`;
        }
    } catch (error) {
        return '"[Stringify Error]"';
    } finally {
        seen.delete(obj);
    }
}

// ทดสอบ safe stringify
console.log("Safe stringify results:");
console.log("user (safe):", safeStringify(user, 2));
console.log("context (safe):", safeStringify(unifiedHttpContext, 1));

// === 8. UnifiedTelemetryProcesser Solution ===
console.log("\n=== 8. UnifiedTelemetryProcesser Solution ===");

// วิธีที่ UnifiedTelemetryProcesser แก้ปัญหานี้
function safeAttributes(attrs?: Record<string, unknown>): Record<string, string | number | boolean> {
    if (!attrs) return {};
    
    const safe: Record<string, string | number | boolean> = {};
    
    for (const [key, value] of Object.entries(attrs)) {
        try {
            if (value === null || value === undefined) {
                safe[key] = String(value);
            } else if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
                safe[key] = value;
            } else if (typeof value === 'object' && value !== null) {
                // ไม่ stringify objects ที่ซับซ้อน
                if (hasCircularReference(value)) {
                    safe[key] = '[Circular Object]';
                } else {
                    try {
                        const stringified = JSON.stringify(value);
                        safe[key] = stringified.length > 1000 ? '[Large Object]' : stringified;
                    } catch {
                        safe[key] = '[Object]';
                    }
                }
            } else {
                safe[key] = String(value);
            }
        } catch {
            safe[key] = '[Unsafe Value]';
        }
    }
    
    return safe;
}

// ทดสอบ safe attributes
const testAttributes = {
    'simple.string': 'test',
    'simple.number': 123,
    'simple.boolean': true,
    'circular.user': user,
    'circular.context': unifiedHttpContext,
    'simple.object': { key: 'value' },
    'null.value': null,
    'undefined.value': undefined
};

console.log("Safe attributes result:");
console.log(JSON.stringify(safeAttributes(testAttributes), null, 2));

export { hasCircularReference, findCircularPath, safeStringify, safeAttributes };