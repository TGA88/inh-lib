
/**
 * Provides navigation utilities including route transitions, query parameter handling,
 * forward/back navigation, and retrieval of the current path.
 *
 * @remarks
 * 1. Obtains a router instance using a custom hook.  
 * 2. Defines an internal `navigate` function that constructs a URL using an optional query.  
 * 3. Uses either a push or replace method from the router, based on the provided options.  
 * 4. Returns an object offering multiple navigation capabilities including:
 *    - `navigate`: for route changes with query support.
 *    - `goBack`: to navigate backward using browser history.
 *    - `goForward`: to move forward in browser history.
 *    - `currentPath`: to retrieve the current path.
 */
 
/**
 * Defines the available options for navigation.
 *
 * @property replace - Indicates whether the reader should replace the current history entry.
 * @property query - An object containing key-value pairs representing URL query parameters.
 * @remarks 
 * These options can be passed to the internal navigate function to customize navigation behavior.
 */

/**
 * Navigates to a specified path with optional query parameters.
 *
 * @param path - The path to navigate to.
 * @param options - Provides a boolean flag to replace history and a map of query parameters.
 * @remarks
 * 1. Builds a URL with the optional query parameters using URLSearchParams.  
 * 2. Decides between pushing or replacing the history stack, depending on the provided option.  
 * 3. Leverages the router instance to perform the actual navigation.
 */

// src/hooks/useNavigation.ts
import { useInhRouter } from '../../components/router-provider/router-provider';
import { useCallback } from 'react';



interface InhNavigationOptions {
  replace?: boolean;
  query?: Record<string, string>;
}

/**
 * A custom hook for handling navigation in the application using the InhRouter.
 * 
 * @remarks
 * This hook provides navigation utilities including:
 * 1. Navigation to specific paths with query parameters
 * 2. Browser history navigation (back/forward)
 * 3. Current path retrieval
 * 
 * The navigation process follows these steps:
 * 1. Accepts a path and optional navigation options
 * 2. Constructs URL search parameters from query object
 * 3. Combines path with query string
 * 4. Performs navigation using either push or replace
 * 
 * @returns An object containing navigation utilities:
 * - navigate: Function to navigate to a specific path
 * - goBack: Function to navigate to previous history entry
 * - goForward: Function to navigate to next history entry
 * - currentPath: String representing current router path
 * 
 * @example
 * ```tsx
 * const { navigate, goBack, goForward, currentPath } = useNavigation();
 * 
 * // Navigate to a new path with query parameters
 * navigate('/dashboard', { 
 *   query: { tab: 'overview' }, 
 *   replace: false 
 * });
 * ```
 * 
 * @see {@link InhNavigationOptions} for available navigation options
 * @see {@link useInhRouter} for underlying router implementation
 */
export function useNavigation() {
  const router = useInhRouter();

const navigate = useCallback(
    (path: string, options: InhNavigationOptions = {}) => {
        // Step 1: Destructure options with default values
        const { replace = false, query = {} } = options;
        
        // Step 2: Create a new URLSearchParams instance for query string construction
        const searchParams = new URLSearchParams();

        // Step 3: Convert query object to URLSearchParams entries
        Object.entries(query).forEach(([key, value]) => {
            searchParams.set(key, value);
        });
        
        // Step 4: Construct the full URL path by combining:
        // - Base path
        // - Query string (if exists, prefixed with '?')
        const fullPath = `${path}${
            searchParams.toString() ? `?${searchParams.toString()}` : ''
        }`;
        
        // Step 5: Perform navigation based on replace option
        // - If replace is true, replace current history entry
        // - If replace is false, push new entry to history
        if (replace) {
            router.replace(fullPath);
        } else {
            router.push(fullPath);
        }
    },
    [router] // Memoize function when router changes
);

  return {
    navigate,
    goBack: router.back,
    goForward: router.forward,
    currentPath: router.getCurrentPath()
  };
}