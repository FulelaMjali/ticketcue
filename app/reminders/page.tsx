'use client';

import { useState, useEffect } from 'react';
import { Bell, Plus } from 'lucide-react';
import { AppLayout } from '@/components/layout/app-layout';
import { ReminderCard } from '@/components/reminders/reminder-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EventCategory } from '@/types';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useEvents } from '@/hooks/use-events';
import { useReminders } from '@/hooks/use-reminders';

type FilterType = 'all' | 'upcoming' | 'this-week' | 'this-month';

export default function RemindersPage() {
  const [filter, setFilter] = useState<FilterType>('all');
  const [showPastReminders, setShowPastReminders] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<EventCategory | 'all'>('all');

  const { data, loading, error } = useEvents(1, 100);
  const {
    reminders,
    loading: remindersLoading,
    error: remindersError,
    removeReminder,
  } = useReminders();
  const events = data?.events || [];

  const handleDeleteReminder = async (reminderId: string) => {
    await removeReminder(reminderId);
  };

  const activeReminders = reminders.filter((r) => r.status === 'active');

  const filterReminders = (reminders: Reminder[]) => {
    const now = new Date();
    const eventsById = new Map(events.map((evt) => [evt.id, evt]));

    return reminders
      .map((r) => ({
        reminder: r,
        event: eventsById.get(r.eventId),
      }))
      .filter((item) => {
        if (!item.event) return false;

        const saleDate = item.event.presaleDate || item.event.ticketSaleDate;
        if (!saleDate) return false;

        const isPast = saleDate.getTime() < now.getTime();
        if (!showPastReminders && isPast) return false;

        if (categoryFilter !== 'all' && item.event.category !== categoryFilter) {
          return false;
        }

        const diffHours = (saleDate.getTime() - now.getTime()) / (1000 * 60 * 60);

        switch (filter) {
          case 'upcoming':
            return diffHours > 0;
          case 'this-week':
            return diffHours > 0 && diffHours <= 168;
          case 'this-month':
            return diffHours > 0 && diffHours <= 720;
          default:
            return true;
        }
      })
      .sort((a, b) => {
        const dateA = a.event!.presaleDate || a.event!.ticketSaleDate;
        const dateB = b.event!.presaleDate || b.event!.ticketSaleDate;
        if (!dateA) return 1;
        if (!dateB) return -1;
        return dateA.getTime() - dateB.getTime();
      });
  };

  const filteredReminders = filterReminders(activeReminders);

  const filters: { value: FilterType; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'this-week', label: 'This Week' },
    { value: 'this-month', label: 'This Month' },
    { value: 'upcoming', label: 'Upcoming' },
  ];

  const categoryFilters: { value: EventCategory | 'all'; label: string }[] = [
    { value: 'all', label: 'All Types' },
    { value: 'concert', label: 'Concerts' },
    { value: 'sports', label: 'Sports' },
    { value: 'theater', label: 'Theater' },
    { value: 'comedy', label: 'Comedy' },
    { value: 'festival', label: 'Festivals' },
    { value: 'nightlife', label: 'Nightlife' },
  ];

  const isLoading = loading || remindersLoading;
  const pageError = error || remindersError;

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">My Reminders</h1>
          <p className="text-muted-foreground">
            Manage your event reminders and never miss a ticket drop
          </p>
        </div>

        {/* Filters and Actions */}
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 w-full sm:w-auto">
              {filters.map((f) => (
                <Badge
                  key={f.value}
                  variant={filter === f.value ? 'default' : 'outline'}
                  className={cn(
                    'cursor-pointer px-4 py-2 text-sm font-medium transition-all whitespace-nowrap',
                    filter === f.value
                      ? 'bg-primary hover:bg-primary/90 text-primary-foreground'
                      : 'hover:bg-accent'
                  )}
                  onClick={() => setFilter(f.value)}
                >
                  {f.label}
                </Badge>
              ))}
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Badge
                variant={showPastReminders ? 'default' : 'outline'}
                className={cn(
                  'cursor-pointer px-4 py-2 text-sm font-medium transition-all whitespace-nowrap',
                  showPastReminders
                    ? 'bg-primary hover:bg-primary/90 text-primary-foreground'
                    : 'hover:bg-accent'
                )}
                onClick={() => setShowPastReminders((prev) => !prev)}
              >
                {showPastReminders ? 'Showing Past' : 'Hide Past'}
              </Badge>
            </div>
            <Link href="/events">
              <Button className="bg-gradient-magenta w-full sm:w-auto">
                <Plus className="w-4 h-4 mr-2" />
                Add Reminder
              </Button>
            </Link>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {categoryFilters.map((f) => (
              <Badge
                key={f.value}
                variant={categoryFilter === f.value ? 'default' : 'outline'}
                className={cn(
                  'cursor-pointer px-4 py-2 text-sm font-medium transition-all whitespace-nowrap',
                  categoryFilter === f.value
                    ? 'bg-primary hover:bg-primary/90 text-primary-foreground'
                    : 'hover:bg-accent'
                )}
                onClick={() => setCategoryFilter(f.value)}
              >
                {f.label}
              </Badge>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="text-2xl font-bold text-primary">{activeReminders.length}</div>
            <div className="text-sm text-muted-foreground">Total Active</div>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="text-2xl font-bold text-primary">
              {filterReminders(activeReminders).filter((item) => {
                const saleDate = item.event!.presaleDate || item.event!.ticketSaleDate;
                if (!saleDate) return false;
                const diffHours = (saleDate.getTime() - Date.now()) / (1000 * 60 * 60);
                return diffHours <= 168 && diffHours >= 0;
              }).length}
            </div>
            <div className="text-sm text-muted-foreground">This Week</div>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="text-2xl font-bold text-primary">
              {filterReminders(activeReminders).filter((item) => {
                const saleDate = item.event!.presaleDate || item.event!.ticketSaleDate;
                if (!saleDate) return false;
                const diffHours = (saleDate.getTime() - Date.now()) / (1000 * 60 * 60);
                return diffHours <= 24 && diffHours >= 0;
              }).length}
            </div>
            <div className="text-sm text-muted-foreground">Next 24h</div>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="text-2xl font-bold text-primary">
              {reminders.filter((r) => r.status === 'completed').length}
            </div>
            <div className="text-sm text-muted-foreground">Completed</div>
          </div>
        </div>

        {/* Reminders List */}
        {pageError ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <p className="text-muted-foreground">Unable to load reminders</p>
            <p className="text-xs text-muted-foreground mt-1">{pageError.message}</p>
          </div>
        ) : isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, idx) => (
              <div key={idx} className="h-32 bg-muted animate-pulse rounded-xl" />
            ))}
          </div>
        ) : filteredReminders.length > 0 ? (
          <div className="space-y-4">
            {filteredReminders.map(({ reminder, event }) => (
              <ReminderCard
                key={reminder.id}
                reminder={reminder}
                event={event!}
                onDelete={handleDeleteReminder}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-20 h-20 rounded-full bg-accent flex items-center justify-center mb-4">
              <Bell className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">
              {filter === 'all' && categoryFilter === 'all' && !showPastReminders ? 'No active upcoming reminders' : 'No reminders found'}
            </h3>
            <p className="text-muted-foreground text-center mb-6 max-w-md">
              {filter === 'all' && categoryFilter === 'all' && !showPastReminders
                ? 'You are currently hiding past reminders. Toggle "Hide Past" to show historical reminders.'
                : 'No reminders match your selected filters.'}
            </p>
            <Link href="/events">
              <Button className="bg-gradient-magenta">
                <Plus className="w-4 h-4 mr-2" />
                Browse Events
              </Button>
            </Link>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
