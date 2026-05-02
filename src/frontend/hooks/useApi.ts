import { useState, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

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

        const response = await fetch(`${backendUrl.current}${url}`, {
          ...options,
          ...executeOptions,
          headers,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'API request failed');
        }

        const responseData = await response.json();
        setData(responseData);

        executeOptions?.onSuccess?.(responseData);
        return responseData;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
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
