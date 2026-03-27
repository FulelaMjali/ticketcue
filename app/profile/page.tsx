'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { AppLayout } from '@/components/layout/app-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useUserProfile } from '@/hooks/use-user-profile';
import { signOut } from 'next-auth/react';
import { Loader2, Save, LogOut, Check } from 'lucide-react';
import { EventCategory } from '@/types';

const categories: EventCategory[] = ['concert', 'sports', 'theater', 'comedy', 'festival', 'nightlife'];

interface PendingPrefs {
  preferredCategories?: EventCategory[];
  emailNotifications?: boolean;
  pushNotifications?: boolean;
}

export default function ProfilePage() {
  const { profile, loading, updateProfile } = useUserProfile();
  const [name, setName] = useState('');
  const [nameSaving, setNameSaving] = useState(false);
  const [nameSaved, setNameSaved] = useState(false);
  const [nameError, setNameError] = useState('');

  // Local optimistic state for preferences — updated instantly on click
  const [localPrefs, setLocalPrefs] = useState<PendingPrefs | null>(null);
  const [prefsSaving, setPrefsSaving] = useState(false);
  const [prefsSaved, setPrefsSaved] = useState(false);

  // Debounce timer ref — cleared and reset on every change
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Always-current snapshot of pending prefs for the debounced flush
  const pendingPrefsRef = useRef<PendingPrefs>({});

  // Sync name input with loaded profile (only on first load)
  const [nameInitialized, setNameInitialized] = useState(false);
  if (profile && !nameInitialized) {
    setName(profile.name);
    setNameInitialized(true);
  }

  // Effective preferences: local optimistic state takes priority over server state
  const effectivePrefs = {
    preferredCategories: (localPrefs?.preferredCategories ?? profile?.preferences.preferredCategories ?? []) as EventCategory[],
    emailNotifications: localPrefs?.emailNotifications ?? profile?.preferences.emailNotifications ?? true,
    pushNotifications: localPrefs?.pushNotifications ?? profile?.preferences.pushNotifications ?? true,
  };

  const getUserInitials = () => {
    if (profile?.name) {
      return profile.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
    }
    if (profile?.email) return profile.email[0].toUpperCase();
    return 'U';
  };

  // Flush the accumulated pending prefs to the API once, 600ms after the last change
  const scheduleFlush = useCallback((next: PendingPrefs) => {
    pendingPrefsRef.current = next;
    setPrefsSaving(true);

    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    debounceTimer.current = setTimeout(async () => {
      try {
        await updateProfile({ preferences: pendingPrefsRef.current });
        setLocalPrefs(null); // server state is now authoritative again
        setPrefsSaved(true);
        setTimeout(() => setPrefsSaved(false), 2000);
      } catch {
        // On error keep localPrefs so UI stays consistent; could add error state here
      } finally {
        setPrefsSaving(false);
      }
    }, 600);
  }, [updateProfile]);

  // Clean up timer on unmount
  useEffect(() => () => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
  }, []);

  const toggleCategory = (cat: EventCategory) => {
    if (!profile) return;
    const current = effectivePrefs.preferredCategories;
    const updated = current.includes(cat) ? current.filter((c) => c !== cat) : [...current, cat];
    const next: PendingPrefs = { ...pendingPrefsRef.current, preferredCategories: updated };
    setLocalPrefs((prev) => ({ ...prev, preferredCategories: updated }));
    scheduleFlush(next);
  };

  const toggleNotification = (key: 'emailNotifications' | 'pushNotifications') => {
    if (!profile) return;
    const updated = !effectivePrefs[key];
    const next: PendingPrefs = { ...pendingPrefsRef.current, [key]: updated };
    setLocalPrefs((prev) => ({ ...prev, [key]: updated }));
    scheduleFlush(next);
  };

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setNameSaving(true);
    setNameError('');
    try {
      await updateProfile({ name: name.trim() });
      setNameSaved(true);
      setTimeout(() => setNameSaved(false), 2000);
    } catch {
      setNameError('Failed to save name');
    } finally {
      setNameSaving(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </AppLayout>
    );
  }

  if (!profile) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-16 text-center">
          <p className="text-muted-foreground">Could not load profile.</p>
        </div>
      </AppLayout>
    );
  }

  const PrefsStatus = () => {
    if (prefsSaving) return <span className="flex items-center gap-1 text-xs text-muted-foreground"><Loader2 className="w-3 h-3 animate-spin" />Saving…</span>;
    if (prefsSaved) return <span className="flex items-center gap-1 text-xs text-green-500"><Check className="w-3 h-3" />Saved</span>;
    return <span className="text-xs text-muted-foreground">Changes save automatically</span>;
  };

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
            <span className="text-2xl font-bold">{getUserInitials()}</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold">{profile.name || profile.email}</h1>
            <p className="text-muted-foreground">{profile.email}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-2xl font-bold">{profile.stats.ticketsSecured}</p>
              <p className="text-xs text-muted-foreground mt-1">Tickets Secured</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-2xl font-bold">{profile.stats.activeReminders}</p>
              <p className="text-xs text-muted-foreground mt-1">Active Reminders</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-2xl font-bold">{profile.stats.eventsThisMonth}</p>
              <p className="text-xs text-muted-foreground mt-1">Events This Month</p>
            </CardContent>
          </Card>
        </div>

        {/* Name */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">Display Name</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveName} className="flex gap-3">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="flex-1"
              />
              <Button type="submit" disabled={nameSaving || !name.trim()} className="gap-2">
                {nameSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : nameSaved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                {nameSaved ? 'Saved!' : 'Save'}
              </Button>
            </form>
            {nameError && <p className="text-sm text-destructive mt-2">{nameError}</p>}
          </CardContent>
        </Card>

        {/* Preferred Categories */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Preferred Event Categories</CardTitle>
              <PrefsStatus />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Select categories to personalise your feed.
            </p>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => {
                const active = effectivePrefs.preferredCategories.includes(cat);
                return (
                  <Badge
                    key={cat}
                    variant={active ? 'default' : 'outline'}
                    className="cursor-pointer px-4 py-2 capitalize select-none"
                    onClick={() => toggleCategory(cat)}
                  >
                    {cat}
                  </Badge>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Notification Preferences</CardTitle>
              <PrefsStatus />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Email Notifications</p>
                <p className="text-sm text-muted-foreground">Get reminders sent to your inbox</p>
              </div>
              <Button
                variant={effectivePrefs.emailNotifications ? 'default' : 'outline'}
                size="sm"
                onClick={() => toggleNotification('emailNotifications')}
              >
                {effectivePrefs.emailNotifications ? 'On' : 'Off'}
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Push Notifications</p>
                <p className="text-sm text-muted-foreground">Get browser push notifications</p>
              </div>
              <Button
                variant={effectivePrefs.pushNotifications ? 'default' : 'outline'}
                size="sm"
                onClick={() => toggleNotification('pushNotifications')}
              >
                {effectivePrefs.pushNotifications ? 'On' : 'Off'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Sign Out */}
        <Button
          variant="outline"
          className="w-full gap-2 text-destructive border-destructive/50 hover:bg-destructive/10"
          onClick={() => signOut({ callbackUrl: '/login' })}
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </Button>
      </div>
    </AppLayout>
  );
}
