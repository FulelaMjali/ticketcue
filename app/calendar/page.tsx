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
  const [ticketSecuredMap, setTicketSecuredMap] = useState<Record<string, boolean>>({});

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

  const selectedItems = useMemo(() => {
    if (!selectedDate) return [];
    
    const eventMap = new Map<string, {
      event: typeof events[0];
      hasTicketSale: boolean;
      isEventDate: boolean;
    }>();
    
    events.forEach((event) => {
      if (eventMap.has(event.id)) return;
      
      let hasTicketSale = false;
      let isEventDate = false;
      
      // Check for ticket sale date (presale or general sale)
      const saleDate = event.presaleDate || event.ticketSaleDate;
      if (saleDate) {
        const saleDateObj = new Date(saleDate);
        if (
          saleDateObj.getDate() === selectedDate.getDate() &&
          saleDateObj.getMonth() === selectedDate.getMonth() &&
          saleDateObj.getFullYear() === selectedDate.getFullYear()
        ) {
          hasTicketSale = true;
        }
      }

      // Check event date
      const eventDate = new Date(event.date);
      if (
        eventDate.getDate() === selectedDate.getDate() &&
        eventDate.getMonth() === selectedDate.getMonth() &&
        eventDate.getFullYear() === selectedDate.getFullYear()
      ) {
        isEventDate = true;
      }

      // Only add if event occurs on this date in some way
      if (hasTicketSale || isEventDate) {
        eventMap.set(event.id, { event, hasTicketSale, isEventDate });
      }
    });

    return Array.from(eventMap.values());
  }, [events, selectedDate]);

  // Fetch ticket secured status for all events
  useEffect(() => {
    const fetchTicketSecuredStatus = async () => {
      const newMap: Record<string, boolean> = {};
      
      for (const event of events) {
        try {
          const response = await fetch(`/api/events/${event.id}/status`);
          if (response.ok) {
            const data = await response.json();
            newMap[event.id] = data.ticketsSecured || false;
          }
        } catch (error) {
          newMap[event.id] = false;
        }
      }
      
      setTicketSecuredMap(newMap);
    };

    if (events.length > 0) {
      fetchTicketSecuredStatus();
    }
  }, [events]);

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
                onMonthChange={handleMonthChange}                ticketSecuredMap={ticketSecuredMap}              />
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
                      {selectedItems.length} {selectedItems.length === 1 ? 'Item' : 'Items'}
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
                ) : selectedDate && selectedItems.length === 0 ? (
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
                    {selectedItems.map((item) => {
                      const isSecured = ticketSecuredMap[item.event.id] || false;
                      
                      return (
                        <Link
                          key={item.event.id}
                          href={`/events/${item.event.id}`}
                          className="block"
                        >
                          <div className="p-3 rounded-lg border border-border hover:bg-accent transition-colors">
                            <div className="flex items-start gap-3">
                              <div className="w-12 h-12 rounded bg-accent shrink-0 overflow-hidden">
                                {item.event.imageUrl ? (
                                  <img
                                    src={item.event.imageUrl}
                                    alt={item.event.title}
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
                                  {item.event.title}
                                </p>
                                <p className="text-xs text-muted-foreground line-clamp-1">
                                  {item.event.venue}
                                </p>
                                <div className="flex gap-1 mt-1 flex-wrap items-center">
                                  {item.hasTicketSale && (
                                    <Badge
                                      variant="outline"
                                      className="text-[10px] bg-amber-500/10 text-amber-700 border-amber-200"
                                    >
                                      Ticket Sale
                                    </Badge>
                                  )}
                                  {item.isEventDate && (
                                    <Badge
                                      variant="outline"
                                      className="text-[10px] bg-primary/10 text-primary border-primary/20"
                                    >
                                      Event Date
                                    </Badge>
                                  )}
                                  {isSecured && (
                                    <Badge
                                      variant="outline"
                                      className="text-[10px] bg-green-500/10 text-green-700 border-green-200 font-semibold"
                                    >
                                      ✓ Secured
                                    </Badge>
                                  )}
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] capitalize"
                                  >
                                    {item.event.category}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
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
