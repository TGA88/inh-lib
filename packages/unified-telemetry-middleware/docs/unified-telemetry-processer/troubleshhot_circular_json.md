# Troubleshooting Guide: Circular JSON Structure Error

## 🐛 **Understanding the Problem**

### What is a Circular Reference?

A circular reference occurs when an object references itself, either directly or through a chain of references. This creates an infinite loop when JavaScript tries to serialize the object to JSON.

```typescript
// Simple example
const obj = { name: 'test' };
obj.self = obj; // ← obj.self.self.self.self... infinite loop

JSON.stringify(obj); // ❌ Error: Converting circular structure to JSON
```

## 🔍 **Real-world Examples**

### 1. **User Profile Circular Reference**

```typescript
// ❌ Common mistake in user-profile relationships
const user = {
    id: '123',
    name: 'John Doe',
    email: 'john@example.com',
    profile: null
};

const profile = {
    id: 'profile-456',
    bio: 'Software Engineer',
    user: user,  // ← References back to user
    preferences: {
        theme: 'dark',
        user: user  // ← Another reference back
    }
};

user.profile = profile;  // ← Completes the circle

// Structure visualization:
// user
// ├── profile
//     ├── user (back to original user)
//     ├── preferences
//         └── user (back to original user again)

console.log("Circular paths:");
console.log("user.profile.user === user:", user.profile.user === user); // true
console.log("user.profile.preferences.user === user:", user.profile.preferences.user === user); // true

// ❌ This will fail
try {
    JSON.stringify(user);
} catch (error) {
    console.log(error.message);
    // Converting circular structure to JSON
    // --> starting at object with constructor 'Object'
    // |     property 'profile' -> object with constructor 'Object'  
    // --- property 'user' closes the circle
}
```

### 2. **Company Hierarchy Circular Reference**

```typescript
// ❌ Organization structure with circular references
const company = {
    id: 'comp-1',
    name: 'Tech Corp',
    departments: [],
    employees: []
};

const engineering = {
    id: 'dept-eng',
    name: 'Engineering',
    company: company,  // ← Back reference to company
    manager: null,
    employees: []
};

const john = {
    id: 'emp-john',
    name: 'John Smith',
    role: 'Engineering Manager',
    company: company,     // ← Reference to company
    department: engineering,  // ← Reference to department
    manager: null,
    subordinates: []
};

const jane = {
    id: 'emp-jane', 
    name: 'Jane Doe',
    role: 'Senior Developer',
    company: company,     // ← Reference to company
    department: engineering,  // ← Reference to department
    manager: john,        // ← Reference to manager
    subordinates: []
};

// Create circular references
company.departments = [engineering];
company.employees = [john, jane];
engineering.manager = john;
engineering.employees = [john, jane];
john.subordinates = [jane];

// Multiple circular paths exist:
// company.departments[0].company === company
// company.employees[0].company === company
// company.employees[0].department.company === company
// john.subordinates[0].manager === john
```

### 3. **UnifiedHttpContext with Telemetry (Real scenario)**

```typescript
// ❌ What actually happens in telemetry middleware
const createTelemetryContext = () => {
    const span = {
        id: 'span-123',
        operationName: 'user.findAll',
        tracer: null,
        context: null,
        parent: null,
        children: [],
        tags: {},
        logs: [],
        startTime: Date.now(),
        
        setTag: function(key, value) { 
            this.tags[key] = value; 
        },
        
        addChild: function(childSpan) {
            childSpan.parent = this;  // ← Child references parent
            this.children.push(childSpan);  // ← Parent references child
        }
    };

    const tracer = {
        id: 'tracer-456',
        spans: [span],  // ← Tracer contains spans
        provider: null,
        
        createSpan: function(name, parentSpan) {
            const newSpan = { ...span, operationName: name, tracer: this };  // ← Span references tracer
            this.spans.push(newSpan);
            if (parentSpan) {
                parentSpan.addChild(newSpan);  // ← Creates parent-child circular refs
            }
            return newSpan;
        }
    };

    const provider = {
        id: 'provider-789',
        tracers: [tracer],  // ← Provider contains tracers
        
        getTracer: function() { 
            return tracer; 
        }
    };

    // Complete the circular references
    span.tracer = tracer;           // span -> tracer -> spans -> span
    tracer.provider = provider;     // tracer -> provider -> tracers -> tracer
    
    const telemetryService = {
        provider: provider,
        tracer: tracer,
        currentSpan: span,
        
        createActiveSpan: function(context, operationName) {
            const newSpan = this.tracer.createSpan(operationName, this.currentSpan);
            newSpan.context = context;  // ← Span references context
            return { span: newSpan, logger: {}, finish: () => {} };
        }
    };

    const httpContext = {
        requestId: 'req-123',
        traceId: 'trace-456',
        telemetryService: telemetryService,
        request: {
            id: 'req-123',
            url: '/api/users',
            method: 'GET',
            context: null  // ← Will point back to httpContext
        },
        response: {
            statusCode: null,
            headers: {},
            context: null  // ← Will point back to httpContext
        }
    };

    // Final circular references
    httpContext.request.context = httpContext;    // request -> context -> request
    httpContext.response.context = httpContext;   // response -> context -> response
    span.context = httpContext;                   // span -> context -> telemetryService -> span

    return httpContext;
};

const context = createTelemetryContext();

// Visualization of circular paths:
console.log("Circular reference paths in telemetry context:");
console.log("1. context.request.context === context:", context.request.context === context);
console.log("2. context.telemetryService.currentSpan.tracer.spans includes currentSpan");
console.log("3. context.telemetryService.currentSpan.context === context:", 
    context.telemetryService.currentSpan.context === context);
```

### 4. **DOM Elements (Browser Environment)**

```typescript
// ❌ DOM elements naturally have circular references
const simulateDOMCircular = () => {
    const element = {
        id: 'my-button',
        tagName: 'BUTTON',
        parentNode: null,
        children: [],
        ownerDocument: null,
        
        addEventListener: function(event, handler) {
            // Event handler might reference the element
            handler.element = this;  // ← Circular reference
        }
    };

    const document = {
        getElementById: function(id) { return element; },
        createElement: function(tag) { return element; },
        body: {
            children: [element],
            ownerDocument: null  // ← Will reference document
        }
    };

    // Create circular references (like real DOM)
    element.ownerDocument = document;      // element -> document
    element.parentNode = document.body;    // element -> body -> ownerDocument -> document
    document.body.ownerDocument = document; // body -> document -> body

    return { element, document };
};
```

## 🚨 **Error Messages You'll See**

### Full Error Examples:

```
TypeError: Converting circular structure to JSON
    --> starting at object with constructor 'Object'
    |     property 'telemetryService' -> object with constructor 'Object'
    |     property 'tracer' -> object with constructor 'Object'
    |     property 'spans' -> object with constructor 'Array'
    |     index 0 -> object with constructor 'Object'
    --- property 'tracer' closes the circle
```

```
TypeError: Converting circular structure to JSON
    --> starting at object with constructor 'Object'
    |     property 'profile' -> object with constructor 'Object'
    --- property 'user' closes the circle
```

```  
TypeError: Converting circular structure to JSON
    --> starting at object with constructor 'Object'
    |     property 'request' -> object with constructor 'Object'
    --- property 'context' closes the circle
```

## 🔧 **Detection Tools**

### Tool 1: Circular Reference Detector

```typescript
function detectCircularReferences(obj: any, path: string = 'root'): string[] {
    const found: string[] = [];
    const visited = new WeakMap();
    
    function traverse(current: any, currentPath: string) {
        if (!current || typeof current !== 'object') return;
        
        if (visited.has(current)) {
            const originalPath = visited.get(current);
            found.push(`Circular: ${originalPath} referenced again at ${currentPath}`);
            return;
        }
        
        visited.set(current, currentPath);
        
        for (const [key, value] of Object.entries(current)) {
            if (value && typeof value === 'object') {
                traverse(value, `${currentPath}.${key}`);
            }
        }
    }
    
    traverse(obj, path);
    return found;
}

// Usage
const user = { id: '123', profile: null };
const profile = { user: user };
user.profile = profile;

const circularPaths = detectCircularReferences(user, 'user');
console.log("Found circular references:");
circularPaths.forEach(path => console.log(`- ${path}`));
// Output:
// - Circular: user referenced again at user.profile.user
```

### Tool 2: Safe Inspector

```typescript
function inspectObjectStructure(obj: any, maxDepth: number = 3): string {
    const visited = new WeakSet();
    
    function inspect(current: any, depth: number, path: string): string {
        if (depth > maxDepth) return '[MAX_DEPTH]';
        if (!current || typeof current !== 'object') return typeof current;
        if (visited.has(current)) return '[CIRCULAR]';
        
        visited.add(current);
        
        if (Array.isArray(current)) {
            const items = current.slice(0, 3).map((item, i) => 
                `[${i}]: ${inspect(item, depth + 1, `${path}[${i}]`)}`
            );
            return `Array(${current.length}) { ${items.join(', ')} ${current.length > 3 ? '...' : ''} }`;
        }
        
        const entries = Object.entries(current).slice(0, 5).map(([key, value]) =>
            `${key}: ${inspect(value, depth + 1, `${path}.${key}`)}`
        );
        
        const totalKeys = Object.keys(current).length;
        return `Object { ${entries.join(', ')} ${totalKeys > 5 ? '...' : ''} }`;
    }
    
    return inspect(obj, 0, 'root');
}

// Usage
const context = createTelemetryContext();
console.log("Context structure:");
console.log(inspectObjectStructure(context, 2));
// Output:
// Object { 
//   requestId: string, 
//   traceId: string, 
//   telemetryService: Object { provider: Object { id: string, tracers: Array(1) { ... }, ... }, ... },
//   request: Object { id: string, url: string, method: string, context: [CIRCULAR] },
//   response: Object { statusCode: undefined, headers: Object { }, context: [CIRCULAR] }
// }
```

## ✅ **Solutions**

### 1. **Manual Safe Stringify**

```typescript
function safeStringify(obj: any, space?: number): string {
    const seen = new WeakSet();
    
    return JSON.stringify(obj, (key, value) => {
        if (value && typeof value === 'object') {
            if (seen.has(value)) {
                return '[Circular Reference]';
            }
            seen.add(value);
        }
        return value;
    }, space);
}

// Usage
const user = { id: '123', profile: null };
user.profile = { user: user };

console.log(safeStringify(user, 2));
// Output:
// {
//   "id": "123",
//   "profile": {
//     "user": "[Circular Reference]"
//   }
// }
```

### 2. **Extract Safe Data**

```typescript
function extractSafeContextData(context: UnifiedHttpContext): Record<string, any> {
    return {
        requestId: context.requestId,
        traceId: context.traceId,
        method: context.request?.method,
        url: context.request?.url,
        userAgent: context.request?.headers?.['user-agent'],
        // Skip complex objects that might have circular refs
        telemetryServiceType: typeof context.telemetryService,
        hasCurrentSpan: !!context.telemetryService?.currentSpan
    };
}

// Usage in processor
const safeContextData = extractSafeContextData(context);
const attributes = {
    'processer.context': JSON.stringify(safeContextData),
    'processer.operation': operationName
};
```

### 3. **UnifiedTelemetryProcesser's Built-in Solution**

```typescript
// ✅ How UnifiedTelemetryProcesser handles this automatically
class UnifiedTelemetryProcesser {
    private safeAttributes(attrs?: TelemetryAttributes): Record<string, string | number | boolean> {
        if (!attrs) return {};
        
        const safe: Record<string, string | number | boolean> = {};
        
        for (const [key, value] of Object.entries(attrs)) {
            try {
                if (value === null || value === undefined) {
                    safe[key] = String(value);
                } else if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
                    safe[key] = value;
                } else if (typeof value === 'object' && value !== null) {
                    // Don't attempt to stringify complex objects
                    if (this.hasCircularReference(value)) {
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
    
    private hasCircularReference(obj: any): boolean {
        try {
            JSON.stringify(obj);
            return false;
        } catch (error) {
            return error.message.includes('circular');
        }
    }
}
```

## 🎯 **Best Practices**

### ✅ **Do's**

```typescript
// ✅ Extract primitive values for logging
const userInfo = {
    id: user.id,
    name: user.name,
    email: user.email
    // Don't include nested objects
};

// ✅ Use type information instead of full objects
const attributes = {
    'args.count': args.length,
    'args.types': args.map(arg => typeof arg).join(','),
    'context.requestId': context.requestId
};

// ✅ Use safe processors from UnifiedTelemetryProcesser
const processor = createDatabaseProcessor(
    service,
    async (ctx) => await this.repository.findAll(ctx),
    'repo.user.findAll'
);
```

### ❌ **Don'ts**

```typescript
// ❌ Never stringify entire context or complex objects
const attributes = {
    'full.context': JSON.stringify(context),  // Will likely fail
    'full.args': JSON.stringify(args)         // Will likely fail
};

// ❌ Don't manually create circular references
user.self = user;

// ❌ Don't ignore the error and use try-catch everywhere
try {
    JSON.stringify(complexObject);
} catch {
    // Ignoring the problem doesn't fix it
}
```

## 🚀 **Prevention Strategies**

1. **Use UnifiedTelemetryProcesser**: It handles circular references automatically
2. **Extract primitive data**: Only log simple values, IDs, and counts
3. **Use util.inspect**: For debugging, use Node.js `util.inspect()` with circular detection
4. **Implement safe stringify**: Create your own serialization for complex objects
5. **Design with serialization in mind**: Avoid creating unnecessary circular references

## 📞 **Still Having Issues?**

If you're still encountering circular reference errors:

1. **Enable debug logging** to see the exact object causing issues
2. **Use the detection tools** provided above to identify circular paths
3. **Check the CONTRIBUTING.md** for development debugging techniques
4. **Open an issue** with the specific object structure causing problems

The UnifiedTelemetryProcesser is designed to handle these issues automatically, so you shouldn't encounter them in normal usage.