'use client';

import { useState, useEffect, useCallback } from 'react';
import { Friend } from '@/types';

interface FriendRequest {
  id: string;
  requester: { id: string; name: string | null; email: string };
  createdAt: string;
}

interface SearchResult {
  id: string;
  name: string | null;
  email: string;
  friendshipStatus: 'none' | 'pending_sent' | 'pending_received' | 'accepted';
  friendshipId: string | null;
}

export function useFriends() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchFriends = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/friends');
      if (!res.ok) throw new Error('Failed to load friends');
      const data = await res.json();
      setFriends(data.friends);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchFriends(); }, [fetchFriends]);

  const removeFriend = useCallback(async (friendshipId: string) => {
    await fetch(`/api/friends/${friendshipId}`, { method: 'DELETE' });
    setFriends((prev) => prev.filter((f) => f.id !== friendshipId));
  }, []);

  return { friends, loading, error, refetch: fetchFriends, removeFriend };
}

export function useFriendRequests() {
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/friends/requests');
      if (!res.ok) throw new Error('Failed to load friend requests');
      const data = await res.json();
      setRequests(data.requests);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const respond = useCallback(async (friendshipId: string, action: 'accept' | 'decline') => {
    await fetch(`/api/friends/${friendshipId}/respond`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    setRequests((prev) => prev.filter((r) => r.id !== friendshipId));
  }, []);

  return { requests, loading, error, refetch: fetchRequests, respond };
}

export function useUserSearch() {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    try {
      setLoading(true);
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(q.trim())}`);
      if (!res.ok) throw new Error('Search failed');
      const data = await res.json();
      setResults(data.users);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, []);

  const sendRequest = useCallback(async (addresseeId: string) => {
    const res = await fetch('/api/friends/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ addresseeId }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error ?? 'Failed to send request');
    }
    // Optimistically update search result status
    setResults((prev) =>
      prev.map((u) =>
        u.id === addresseeId ? { ...u, friendshipStatus: 'pending_sent' } : u
      )
    );
  }, []);

  const clear = useCallback(() => setResults([]), []);

  return { results, loading, error, search, sendRequest, clear };
}
