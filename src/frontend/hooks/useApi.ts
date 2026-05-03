import { useState, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

interface ApiOptions extends RequestInit {
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
}

interface ApiResponse<T = any> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  execute: (options?: ApiOptions) => Promise<T>;
}

export function useApi<T = any>(
  url: string,
  options?: ApiOptions
): ApiResponse<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { token } = useAuth();
  const { showToast } = useToast();
  const backendUrl = useRef<string>('');

  const execute = useCallback(
    async (executeOptions?: ApiOptions): Promise<T> => {
      setLoading(true);
      setError(null);

      try {
        if (!backendUrl.current) {
          // Try to get from Electron, fallback to localhost:3001 for development
          backendUrl.current = (await window.electron?.getBackendUrl?.()) || 'http://localhost:3001';
        }

        const headers: HeadersInit = {
          'Content-Type': 'application/json',
          ...options?.headers,
          ...executeOptions?.headers,
        };

        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const fullUrl = `${backendUrl.current}${url}`;
        console.log('[useApi] Fetching:', fullUrl);

        const response = await fetch(fullUrl, {
          ...options,
          ...executeOptions,
          headers,
        });

        console.log('[useApi] Response status:', response.status);

        if (!response.ok) {
          const errorData = await response.json();
          console.log('[useApi] Error response:', errorData);

          // Handle specific error codes
          if (response.status === 403) {
            const error = new Error('You do not have permission to access this feature');
            (error as any).status = 403;
            throw error;
          } else if (response.status === 401) {
            const error = new Error('Your session has expired. Please log in again');
            (error as any).status = 401;
            throw error;
          }

          throw new Error(errorData.error || 'API request failed');
        }

        const responseData = await response.json();
        console.log('[useApi] Response data:', responseData);
        setData(responseData);

        executeOptions?.onSuccess?.(responseData);
        return responseData;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);

        // Show toast notification for errors
        const status = (error as any).status;
        if (status === 403) {
          showToast('🔒 ' + error.message, 'error');
        } else if (status === 401) {
          showToast('⏰ ' + error.message, 'warning');
        } else if (!executeOptions?.onError) {
          // Only show generic error toast if no custom error handler
          showToast('❌ ' + error.message, 'error');
        }

        executeOptions?.onError?.(error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [url, token, options]
  );

  return { data, loading, error, execute };
}

export default useApi;
