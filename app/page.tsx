'use client';

import { useState, useMemo } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import { AppLayout } from '@/components/layout/app-layout';
import { EventCard } from '@/components/events/event-card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EventCategory } from '@/types';
import { cn } from '@/lib/utils';
import { useEvents } from '@/hooks/use-events';

const categories: { value: EventCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'All Events' },
  { value: 'concert', label: 'Concerts' },
  { value: 'sports', label: 'Sports' },
  { value: 'theater', label: 'Theater' },
  { value: 'comedy', label: 'Comedy' },
  { value: 'festival', label: 'Festivals' },
  { value: 'nightlife', label: 'Nightlife' },
];

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<EventCategory | 'all'>('all');

  const { data, loading, error } = useEvents(1, 20, {
    category: selectedCategory === 'all' ? undefined : selectedCategory,
    search: searchQuery || undefined,
  });

  const filteredEvents = useMemo(() => {
    const events = data?.events || [];

    if (!searchQuery) return events;

    return events.filter((event) => {
      const haystack = `${event.title} ${event.artist || ''} ${event.location}`.toLowerCase();
      return haystack.includes(searchQuery.toLowerCase());
    });
  }, [data?.events, searchQuery]);

  return (
    <AppLayout>
      <div className="min-h-screen">
        {/* Hero Section */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-radial-purple opacity-50" />
          <div className="relative container mx-auto px-4 py-16 md:py-24">
            <div className="max-w-3xl mx-auto text-center">
              <h1 className="text-4xl md:text-6xl font-bold mb-6 text-balance">
                Find your next <span className="text-gradient-magenta">experience</span>
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground mb-8">
                Discover concerts, sports, and theater events near you. Set alerts and never miss a ticket drop again.
              </p>

              {/* Search Bar */}
              <div className="relative max-w-2xl mx-auto mb-8">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search artist, team, or venue..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 pr-12 h-14 text-lg bg-card/80 backdrop-blur-sm border-border"
                />
                <Button
                  size="icon"
                  variant="ghost"
                  className="absolute right-2 top-1/2 -translate-y-1/2"
                >
                  <SlidersHorizontal className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Categories */}
        <div className="container mx-auto px-4 mb-8">
          <div className="flex flex-wrap items-center gap-2">
            {categories.map((category) => (
              <Badge
                key={category.value}
                variant={selectedCategory === category.value ? 'default' : 'outline'}
                className={cn(
                  'cursor-pointer px-4 py-2 text-sm font-medium transition-all whitespace-nowrap',
                  selectedCategory === category.value
                    ? 'bg-primary hover:bg-primary/90 text-primary-foreground'
                    : 'hover:bg-accent'
                )}
                onClick={() => setSelectedCategory(category.value)}
              >
                {category.label}
              </Badge>
            ))}
          </div>
        </div>

        {/* Trending Section */}
        <div className="container mx-auto px-4 pb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl md:text-3xl font-bold">
              {selectedCategory === 'all' ? 'Trending Near You' : `${categories.find(c => c.value === selectedCategory)?.label}`}
            </h2>
            <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80">
              View all →
            </Button>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map((_, idx) => (
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
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
