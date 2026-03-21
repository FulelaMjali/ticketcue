'use client';

import { useEffect, useState } from 'react';
import { EventUpdate } from '@/types';

type FetchState = {
  updates: EventUpdate[];
  loading: boolean;
  error: Error | null;
};

function normalizeUpdates(raw: any[]): EventUpdate[] {
  return raw.map((u) => ({
    ...u,
    timestamp: new Date(u.timestamp),
    createdAt: u.createdAt ? new Date(u.createdAt) : undefined,
  }));
}

export function useUpdatesFeed() {
  const [state, setState] = useState<FetchState>({ updates: [], loading: true, error: null });

  useEffect(() => {
    const run = async () => {
      try {
        setState((s) => ({ ...s, loading: true, error: null }));
        const res = await fetch('/api/updates/feed', { cache: 'no-store' });
        if (res.status === 401) {
          setState({ updates: [], loading: false, error: null });
          return;
        }
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
        const data = await res.json();
        setState({ updates: normalizeUpdates(data), loading: false, error: null });
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setState((s) => ({ ...s, loading: false, error }));
      }
    };

    run();
  }, []);

  return state;
}

export function useEventUpdates(eventId: string | null) {
  const [state, setState] = useState<FetchState>({ updates: [], loading: true, error: null });

  useEffect(() => {
    if (!eventId) {
      setState({ updates: [], loading: false, error: null });
      return;
    }

    const run = async () => {
      try {
        setState((s) => ({ ...s, loading: true, error: null }));
        const res = await fetch(`/api/events/${eventId}/updates`, { cache: 'no-store' });
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
        const data = await res.json();
        setState({ updates: normalizeUpdates(data), loading: false, error: null });
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setState((s) => ({ ...s, loading: false, error }));
      }
    };

    run();
  }, [eventId]);

  return state;
}
