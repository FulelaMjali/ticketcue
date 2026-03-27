'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, SlidersHorizontal, Plus } from 'lucide-react';
import { AppLayout } from '@/components/layout/app-layout';
import { EventCard } from '@/components/events/event-card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EventCategory } from '@/types';
import { cn } from '@/lib/utils';
import { useEvents } from '@/hooks/use-events';
import { useReminders } from '@/hooks/use-reminders';
import { useUserProfile } from '@/hooks/use-user-profile';

const categories: { value: EventCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'All Events' },
  { value: 'concert', label: 'Concerts' },
  { value: 'sports', label: 'Sports' },
  { value: 'theater', label: 'Theater' },
  { value: 'comedy', label: 'Comedy' },
  { value: 'festival', label: 'Festivals' },
  { value: 'nightlife', label: 'Nightlife' },
];

export default function EventsPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<EventCategory | 'all'>('all');
  const [categoryInitialized, setCategoryInitialized] = useState(false);
  const { reminders } = useReminders();
  const { profile } = useUserProfile();

  // Once the profile loads, auto-select the preferred category if the user has exactly one.
  // If they have multiple preferences, keep 'all' — the badge highlights show what they care about.
  useEffect(() => {
    if (profile && !categoryInitialized) {
      setCategoryInitialized(true);
      const prefs = profile.preferences.preferredCategories as EventCategory[];
      if (prefs.length === 1) {
        setSelectedCategory(prefs[0]);
      }
    }
  }, [profile, categoryInitialized]);

  const { data, loading, error } = useEvents(1, 20, {
    category: selectedCategory === 'all' ? undefined : selectedCategory,
    search: searchQuery || undefined,
  });

  const preferredCategories = useMemo(
    () => new Set((profile?.preferences.preferredCategories ?? []) as EventCategory[]),
    [profile]
  );

  const filteredEvents = useMemo(() => {
    const events = data?.events || [];

    if (!searchQuery) return events;

    return events.filter((event) => {
      const haystack = `${event.title} ${event.artist || ''} ${event.location}`.toLowerCase();
      return haystack.includes(searchQuery.toLowerCase());
    });
  }, [data?.events, searchQuery]);

  const reminderEventIds = useMemo(
    () => new Set(reminders.filter((item) => item.status === 'active').map((item) => item.eventId)),
    [reminders]
  );

  return (
    <AppLayout>
      <div className="min-h-screen">
        {/* Header */}
        <div className="bg-card/50 border-b border-border backdrop-blur-sm sticky top-0 z-10">
          <div className="container mx-auto px-4 py-6">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl md:text-3xl font-bold">Discover Events</h1>
              <Button onClick={() => router.push('/events/create')} className="gap-2">
                <Plus className="w-4 h-4" />
                Create Event
              </Button>
            </div>

            {/* Search Bar */}
            <div className="relative max-w-2xl mb-4">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search artist, team, or venue..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 pr-12 h-12 bg-background"
              />
              <Button
                size="icon"
                variant="ghost"
                className="absolute right-2 top-1/2 -translate-y-1/2"
              >
                <SlidersHorizontal className="w-5 h-5" />
              </Button>
            </div>

            {/* Categories */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {categories.map((category) => {
                const isSelected = selectedCategory === category.value;
                const isPreferred = category.value !== 'all' && preferredCategories.has(category.value as EventCategory);
                return (
                  <Badge
                    key={category.value}
                    variant={isSelected ? 'default' : 'outline'}
                    className={cn(
                      'cursor-pointer px-4 py-2 text-sm font-medium transition-all whitespace-nowrap',
                      isSelected
                        ? 'bg-primary hover:bg-primary/90 text-primary-foreground'
                        : isPreferred
                        ? 'border-primary/50 text-primary hover:bg-primary/10'
                        : 'hover:bg-accent'
                    )}
                    onClick={() => setSelectedCategory(category.value)}
                  >
                    {category.label}
                    {isPreferred && !isSelected && (
                      <span className="ml-1 w-1.5 h-1.5 rounded-full bg-primary inline-block align-middle" />
                    )}
                  </Badge>
                );
              })}
            </div>
          </div>
        </div>

        {/* Events Grid */}
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-6">
            <p className="text-muted-foreground">
              {loading ? 'Loading events…' : `${filteredEvents.length} ${filteredEvents.length === 1 ? 'event' : 'events'} found`}
            </p>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array.from({ length: 12 }).map((_, idx) => (
                <div key={idx} className="h-64 bg-muted animate-pulse rounded-xl" />
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-16">
              <p className="text-muted-foreground text-lg">Unable to load events</p>
              <p className="text-sm text-muted-foreground mt-2">{error.message}</p>
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-muted-foreground text-lg">No events found</p>
              <p className="text-sm text-muted-foreground mt-2">
                Try adjusting your search or filters
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredEvents.map((event) => (
                <EventCard key={event.id} event={event} isReminderActive={reminderEventIds.has(event.id)} />
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
