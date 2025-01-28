// src/lib/router/types.ts
export interface InhRouter {
    // ... existing methods
    push: (path: string) => void;
    replace: (path: string) => void;
    back: () => void;
    forward: () => void;
    getCurrentPath: () => string;
  
    // New methods for params(URL_PARAM)
    getParams: () => Record<string, string>;
    getParam: (key: string) => string | undefined;
    
// New methods for search params (QUERY_PARAM)
    getSearchParams: () => URLSearchParams;
    getSearchParam: (key: string) => string | null;
    setSearchParams: (params: Record<string, string>) => void;
    updateSearchParams: (params: Record<string, string>) => void;
  }

 

  