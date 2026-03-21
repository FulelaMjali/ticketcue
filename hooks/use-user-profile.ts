import { useEffect, useState } from 'react';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  preferences: {
    preferredCategories: string[];
    emailNotifications: boolean;
    pushNotifications: boolean;
  };
  stats: {
    ticketsSecured: number;
    activeReminders: number;
    eventsThisMonth: number;
  };
}

export function useUserProfile() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/user/profile');
        if (!response.ok) {
          throw new Error('Failed to fetch user profile');
        }
        const data = await response.json();
        setProfile(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const updateProfile = async (updates: {
    name?: string;
    preferences?: {
      preferredCategories?: string[];
      emailNotifications?: boolean;
      pushNotifications?: boolean;
    };
  }) => {
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error('Failed to update profile');
      }

      const data = await response.json();
      setProfile(data);
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      throw err;
    }
  };

  return { profile, loading, error, updateProfile };
}
