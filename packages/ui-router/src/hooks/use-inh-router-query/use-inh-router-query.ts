
/**
 * A custom hook for managing URL query parameters in a type-safe way.
 * 
 * @template T - An object type where all properties are strings
 * @param defaultValues - Default values for query parameters
 * 
 * @returns {UseInhRouterQueryResult<T>} An object containing:
 * - query: Current query parameters
 * - setQuery: Function to update query parameters
 * - resetQuery: Function to reset query parameters to default values
 * 
 * @example
 * ```typescript
 * const { query, setQuery, resetQuery } = useInhRouterQuery({
 *   page: '1',
 *   search: ''
 * });
 * ```
 * 
 * @description
 * This hook manages URL query parameters with the following features:
 * 1. Type-safe query parameter handling
 * 2. Automatic synchronization with URL search params
 * 3. Fallback to default values when parameters are not present
 * 4. Memoized query values to prevent unnecessary re-renders
 * 
 * The hook performs these steps:
 * 1. Gets current search parameters from the router
 * 2. Merges them with default values
 * 3. Provides methods to update and reset query parameters
 * 
 * @remarks
 * - Query values must be strings
 * - undefined values are filtered out when setting new query parameters
 * - Changes to query parameters will update the URL
 * 
 * @see {@link useInhRouter} - The underlying router hook
 */
// src/hooks/useRouterQuery.ts
import { useInhRouter } from '../../components/router-provider/router-provider';
import { useMemo } from 'react';

interface UseInhRouterQueryResult<T> {
  query: T;
  setQuery: (newQuery: Partial<T>) => void;
  resetQuery: () => void;
}

export function useInhRouterQuery<T extends Record<string, string>>(
  defaultValues: T
): UseInhRouterQueryResult<T> {
  // Get router instance from context
  const router = useInhRouter();
  
  // Memoize query values to prevent unnecessary re-renders
  const query = useMemo(() => {
    // Get current search parameters from URL
    const searchParams = router.getSearchParams();
    // Initialize empty object to store merged query parameters
    const current: Record<string, string> = {};
    
    // Merge URL search params with default values
    // If parameter exists in URL, use that value, otherwise use default
    Object.keys(defaultValues).forEach(key => {
      current[key] = searchParams.get(key) || defaultValues[key];
    });
    
    // Cast to generic type T and return
    return current as T;
  }, [router.getCurrentPath(), defaultValues]); // Re-run when path or defaults change

  // Function to update query parameters
  const setQuery = (newQuery: Partial<T>) => {
    // Filter out undefined values and create clean query object
    const filteredQuery: Record<string, string> = {};
    Object.entries(newQuery).forEach(([key, value]) => {
      if (value !== undefined) {
        filteredQuery[key] = value;
      }
    });
    
    // Update URL search parameters with filtered query
    router.updateSearchParams(filteredQuery);
  };

  // Function to reset query parameters to default values
  const resetQuery = () => {
    router.setSearchParams(defaultValues);
  };

  // Return query state and control functions
  return { query, setQuery, resetQuery };
}


