// src/lib/router/context.tsx
import  React,{ createContext, useContext, ReactNode } from 'react';
import {InhRouter} from '../router/router';

const InhRouterContext = createContext<InhRouter | null>(null);

interface InhRouterProviderProps {
  router: InhRouter;
  children: ReactNode;
}

// export const InhRouterProvider: React.FC<InhRouterProviderProps> = ({ router, children }): ReactNode => {
//   return (
//     <InhRouterContext.Provider value={router}>
//       {children}
//     </InhRouterContext.Provider>
//   );
// };

export const InhRouterProvider = ({ router, children }: InhRouterProviderProps) => {   
  return (     
    <InhRouterContext.Provider value={router}>       
      {children}     
    </InhRouterContext.Provider>   
  ); 
};
export const useInhRouter = () => {
    const router = useContext(InhRouterContext);
    if (!router) {
      throw new Error('useInhRouter must be used within a InhRouterProvider');
    }
    return router;
  };