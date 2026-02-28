'use client';

import { useState, useEffect, useMemo } from 'react';
import { Calendar as CalendarIcon, Plus } from 'lucide-react';
import { AppLayout } from '@/components/layout/app-layout';
import { CalendarGrid } from '@/components/calendar/calendar-grid';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/date-utils';
import Link from 'next/link';
import { useEvents } from '@/hooks/use-events';

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState<Date | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const { data, loading, error } = useEvents(1, 100);
  const events = data?.events || [];

  useEffect(() => {
    // Initialize dates after hydration
    setCurrentMonth(new Date());
    setSelectedDate(new Date());
  }, []);

  const handleMonthChange = (increment: number) => {
    if (!currentMonth) return;
    if (increment === 0) {
      setCurrentMonth(new Date());
    } else {
      setCurrentMonth(
        new Date(currentMonth.getFullYear(), currentMonth.getMonth() + increment, 1)
      );
    }
  };

  const selectedEvents = useMemo(() => {
    if (!selectedDate) return [];
    return events.filter((event) => {
      const eventDate = new Date(event.date);
      return (
        eventDate.getDate() === selectedDate.getDate() &&
        eventDate.getMonth() === selectedDate.getMonth() &&
        eventDate.getFullYear() === selectedDate.getFullYear()
      );
    });
  }, [events, selectedDate]);

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Calendar</h1>
          <p className="text-muted-foreground">
            Track your upcoming ticket sales and events
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <div className="lg:col-span-2">
            {currentMonth ? (
              <CalendarGrid
                currentDate={currentMonth}
                events={events}
                selectedDate={selectedDate}
                onDateSelect={setSelectedDate}
                onMonthChange={handleMonthChange}
              />
            ) : (
              <div className="h-96 bg-muted animate-pulse rounded-lg" />
            )}
          </div>

          {/* Day Detail Sidebar */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-lg">
                  <span>
                    {selectedDate
                      ? formatDate(selectedDate)
                      : 'Select a date'}
                  </span>
                  {selectedDate && (
                    <Badge variant="secondary">
                      {selectedEvents.length} {selectedEvents.length === 1 ? 'Event' : 'Events'}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {error ? (
                  <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground">Unable to load events</p>
                    <p className="text-xs text-muted-foreground mt-1">{error.message}</p>
                  </div>
                ) : selectedDate && loading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, idx) => (
                      <div key={idx} className="h-16 bg-muted animate-pulse rounded-lg" />
                    ))}
                  </div>
                ) : selectedDate && selectedEvents.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center mx-auto mb-3">
                      <CalendarIcon className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      No events for this day
                    </p>
                    <Link href="/events">
                      <Button size="sm" className="bg-gradient-magenta">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Event
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedEvents.map((event) => (
                      <Link
                        key={event.id}
                        href={`/events/${event.id}`}
                        className="block"
                      >
                        <div className="p-3 rounded-lg border border-border hover:bg-accent transition-colors">
                          <div className="flex items-start gap-3">
                            <div className="w-12 h-12 rounded bg-accent shrink-0 overflow-hidden">
                              {event.imageUrl ? (
                                <img
                                  src={event.imageUrl}
                                  alt={event.title}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <CalendarIcon className="w-5 h-5 text-muted-foreground" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm line-clamp-1">
                                {event.title}
                              </p>
                              <p className="text-xs text-muted-foreground line-clamp-1">
                                {event.venue}
                              </p>
                              <Badge
                                variant="outline"
                                className="mt-1 text-[10px] capitalize"
                              >
                                {event.category}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">This Month</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {currentMonth ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Total Events</span>
                      <span className="font-bold text-lg">
                        {events.filter((e) => {
                          const eventDate = new Date(e.date);
                          return (
                            eventDate.getMonth() === currentMonth.getMonth() &&
                            eventDate.getFullYear() === currentMonth.getFullYear()
                          );
                        }).length}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Ticket Sales</span>
                      <span className="font-bold text-lg text-primary">
                        {events.filter((e) => {
                          const saleDate = e.presaleDate || e.ticketSaleDate;
                          if (!saleDate) return false;
                          return (
                            saleDate.getMonth() === currentMonth.getMonth() &&
                            saleDate.getFullYear() === currentMonth.getFullYear()
                          );
                        }).length}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="space-y-3">
                    <div className="h-4 bg-muted rounded animate-pulse" />
                    <div className="h-4 bg-muted rounded animate-pulse" />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Add Event CTA */}
            <Card className="bg-gradient-magenta border-0 text-white">
              <CardContent className="p-6 text-center">
                <h3 className="font-bold text-lg mb-2">Track More Events</h3>
                <p className="text-sm opacity-90 mb-4">
                  Browse upcoming events and set reminders
                </p>
                <Link href="/events">
                  <Button variant="secondary" size="sm" className="bg-white text-purple-600 hover:bg-gray-100">
                    Discover Events
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
