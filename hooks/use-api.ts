/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useCallback } from 'react';

export interface FetchOptions extends RequestInit {
  baseUrl?: string;
}

export function useFetch<T = any>(url: string, options?: FetchOptions) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(
    async (fetchOptions?: FetchOptions) => {
      try {
        setLoading(true);
        setError(null);
        const baseUrl = options?.baseUrl || fetchOptions?.baseUrl || '';
        const response = await fetch(`${baseUrl}${url}`, {
          ...options,
          ...fetchOptions,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.error || `HTTP ${response.status}: ${response.statusText}`
          );
        }

        const resultData: T = await response.json();
        setData(resultData);
        return resultData;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [url, options]
  );

  return { data, error, loading, fetch: fetchData };
}

export async function apiCall<T = any>(
  url: string,
  options?: FetchOptions & { method?: string }
): Promise<T> {
  const baseUrl = options?.baseUrl || '';
  const response = await fetch(`${baseUrl}${url}`, options);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error || `HTTP ${response.status}: ${response.statusText}`
    );
  }

  return response.json();
}
