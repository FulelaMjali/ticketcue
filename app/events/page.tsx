'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, SlidersHorizontal, Plus, ChevronDown, X } from 'lucide-react';
import { AppLayout } from '@/components/layout/app-layout';
import { EventCard } from '@/components/events/event-card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { EventCategory } from '@/types';
import { cn } from '@/lib/utils';
import { useEvents } from '@/hooks/use-events';
import { useReminders } from '@/hooks/use-reminders';
import { useUserProfile } from '@/hooks/use-user-profile';
import { Event } from '@/types';

type SortOption = { value: 'date_asc' | 'date_desc' | 'created_desc'; label: string };

const SORT_OPTIONS: SortOption[] = [
  { value: 'date_asc', label: 'Soonest first' },
  { value: 'date_desc', label: 'Latest first' },
  { value: 'created_desc', label: 'Recently added' },
];

const CATEGORIES: { value: EventCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'concert', label: 'Concerts' },
  { value: 'sports', label: 'Sports' },
  { value: 'theater', label: 'Theater' },
  { value: 'comedy', label: 'Comedy' },
  { value: 'festival', label: 'Festivals' },
  { value: 'nightlife', label: 'Nightlife' },
];

const STATUS_FILTERS: { value: string | 'all'; label: string }[] = [
  { value: 'all', label: 'Any status' },
  { value: 'onsale', label: 'On Sale' },
  { value: 'presale', label: 'Presale' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'soldout', label: 'Sold Out' },
];

const PAGE_SIZE = 12;

export default function EventsPage() {
  const router = useRouter();

  // --- filter state ---
  const [inputValue, setInputValue] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<EventCategory | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [sort, setSort] = useState<SortOption['value']>('date_asc');
  const [page, setPage] = useState(1);
  const [allEvents, setAllEvents] = useState<Event[]>([]);
  const [categoryInitialized, setCategoryInitialized] = useState(false);

  const { reminders } = useReminders();
  const { profile } = useUserProfile();

  // Debounce search input — 400 ms
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSearchChange = useCallback((value: string) => {
    setInputValue(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearchQuery(value);
      setPage(1);
      setAllEvents([]);
    }, 400);
  }, []);

  // Auto-select single preferred category on first profile load
  useEffect(() => {
    if (profile && !categoryInitialized) {
      setCategoryInitialized(true);
      const prefs = profile.preferences.preferredCategories as EventCategory[];
      if (prefs.length === 1) {
        setSelectedCategory(prefs[0]);
      }
    }
  }, [profile, categoryInitialized]);

  const preferredCategories = useMemo(
    () => new Set((profile?.preferences.preferredCategories ?? []) as EventCategory[]),
    [profile]
  );

  const { data, loading } = useEvents(page, PAGE_SIZE, {
    category: selectedCategory === 'all' ? undefined : selectedCategory,
    status: selectedStatus === 'all' ? undefined : selectedStatus,
    search: searchQuery || undefined,
    sort,
  });

  // Accumulate events for load-more
  useEffect(() => {
    if (!data) return;
    if (page === 1) {
      setAllEvents(data.events);
    } else {
      setAllEvents((prev) => {
        const ids = new Set(prev.map((e) => e.id));
        return [...prev, ...data.events.filter((e) => !ids.has(e.id))];
      });
    }
  }, [data, page]);

  const reminderEventIds = useMemo(
    () => new Set(reminders.filter((r) => r.status === 'active').map((r) => r.eventId)),
    [reminders]
  );

  const hasMore = data ? allEvents.length < data.pagination.total : false;
  const total = data?.pagination.total ?? 0;
  const activeSort = SORT_OPTIONS.find((o) => o.value === sort)!;

  const hasFilters = selectedCategory !== 'all' || selectedStatus !== 'all' || searchQuery;

  function resetFilters() {
    setInputValue('');
    setSearchQuery('');
    setSelectedCategory('all');
    setSelectedStatus('all');
    setPage(1);
    setAllEvents([]);
  }

  function changeCategory(value: EventCategory | 'all') {
    setSelectedCategory(value);
    setPage(1);
    setAllEvents([]);
  }

  function changeStatus(value: string) {
    setSelectedStatus(value);
    setPage(1);
    setAllEvents([]);
  }

  function changeSort(value: SortOption['value']) {
    setSort(value);
    setPage(1);
    setAllEvents([]);
  }

  return (
    <AppLayout>
      <div className="min-h-screen">
        {/* Sticky filter header */}
        <div className="bg-card/80 border-b border-border backdrop-blur-sm sticky top-0 z-10">
          <div className="container mx-auto px-4 pt-6 pb-4 space-y-4">
            {/* Title row */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold">Discover Events</h1>
                {!loading && (
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {total} {total === 1 ? 'event' : 'events'}
                    {hasFilters && ' matching your filters'}
                  </p>
                )}
              </div>
              <Button onClick={() => router.push('/events/create')} size="sm" className="gap-1.5">
                <Plus className="w-4 h-4" />
                Add Event
              </Button>
            </div>

            {/* Search + Sort row */}
            <div className="flex gap-2">
              <div className="relative flex-1 max-w-2xl">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search artist, venue, or event…"
                  value={inputValue}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-10 pr-10 h-10 bg-background"
                />
                {inputValue && (
                  <button
                    onClick={() => handleSearchChange('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5 h-10 shrink-0">
                    <SlidersHorizontal className="w-4 h-4" />
                    {activeSort.label}
                    <ChevronDown className="w-3 h-3 opacity-60" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {SORT_OPTIONS.map((opt) => (
                    <DropdownMenuItem
                      key={opt.value}
                      onClick={() => changeSort(opt.value)}
                      className={cn(sort === opt.value && 'text-primary font-medium')}
                    >
                      {opt.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Category filter pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {CATEGORIES.map((cat) => {
                const isSelected = selectedCategory === cat.value;
                const isPreferred = cat.value !== 'all' && preferredCategories.has(cat.value as EventCategory);
                return (
                  <Badge
                    key={cat.value}
                    variant={isSelected ? 'default' : 'outline'}
                    className={cn(
                      'cursor-pointer px-3 py-1.5 text-sm font-medium transition-all whitespace-nowrap shrink-0',
                      isSelected
                        ? 'bg-primary hover:bg-primary/90 text-primary-foreground'
                        : isPreferred
                        ? 'border-primary/60 text-primary hover:bg-primary/10'
                        : 'hover:bg-accent'
                    )}
                    onClick={() => changeCategory(cat.value)}
                  >
                    {cat.label}
                    {isPreferred && !isSelected && (
                      <span className="ml-1.5 w-1.5 h-1.5 rounded-full bg-primary inline-block align-middle" />
                    )}
                  </Badge>
                );
              })}

              <div className="w-px h-4 bg-border shrink-0 mx-1" />

              {/* Status filter pills */}
              {STATUS_FILTERS.slice(1).map((sf) => {
                const isSelected = selectedStatus === sf.value;
                return (
                  <Badge
                    key={sf.value}
                    variant={isSelected ? 'default' : 'outline'}
                    className={cn(
                      'cursor-pointer px-3 py-1.5 text-sm font-medium transition-all whitespace-nowrap shrink-0',
                      isSelected
                        ? 'bg-primary hover:bg-primary/90 text-primary-foreground'
                        : 'hover:bg-accent'
                    )}
                    onClick={() => changeStatus(isSelected ? 'all' : sf.value)}
                  >
                    {sf.label}
                  </Badge>
                );
              })}

              {hasFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetFilters}
                  className="shrink-0 text-muted-foreground hover:text-foreground gap-1 h-8"
                >
                  <X className="w-3 h-3" />
                  Clear
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Events grid */}
        <div className="container mx-auto px-4 py-8">
          {loading && allEvents.length === 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array.from({ length: PAGE_SIZE }).map((_, i) => (
                <div key={i} className="h-72 bg-muted animate-pulse rounded-xl" />
              ))}
            </div>
          ) : allEvents.length === 0 ? (
            <div className="text-center py-24">
              <p className="text-2xl font-semibold mb-2">No events found</p>
              <p className="text-muted-foreground mb-6">
                {hasFilters ? 'Try adjusting your search or filters.' : 'Check back soon for upcoming events.'}
              </p>
              {hasFilters && (
                <Button variant="outline" onClick={resetFilters}>
                  Clear all filters
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {allEvents.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    isReminderActive={reminderEventIds.has(event.id)}
                  />
                ))}
                {/* Loading skeletons while fetching next page */}
                {loading &&
                  Array.from({ length: 4 }).map((_, i) => (
                    <div key={`skeleton-${i}`} className="h-72 bg-muted animate-pulse rounded-xl" />
                  ))}
              </div>

              {hasMore && !loading && (
                <div className="flex justify-center mt-10">
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => setPage((p) => p + 1)}
                    className="min-w-40"
                  >
                    Load more
                  </Button>
                </div>
              )}

              {!hasMore && allEvents.length > PAGE_SIZE && (
                <p className="text-center text-sm text-muted-foreground mt-10">
                  All {total} events loaded
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
