

// src/hooks/useRouteParams.ts
import { useInhRouter } from '../../components/router-provider/router-provider';
import { useMemo } from 'react';
/**
 * Custom hook to access and retrieve route parameters from the current URL path
 * @template T - Type parameter extending Record<string, string> for type-safe parameter access
 * @returns {T} An object containing the route parameters
 * 
 * @example
 * // If route is "/users/:id" and current path is "/users/123"
 * const params = useRouteParams<{ id: string }>();
 * // params.id === "123"
 */
export function useRouteParams<T extends Record<string, string>>(): T {
  const router = useInhRouter();
  
  return useMemo(() => {
    return router.getParams() as T;
  }, [router.getCurrentPath()]);
}

