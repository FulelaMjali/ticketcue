'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Event } from '@/types';
import { hasTicketsSecured } from '@/lib/event-status-storage';
import { cn } from '@/lib/utils';

interface CalendarGridProps {
  currentDate: Date;
  events: Event[];
  selectedDate: Date | null;
  onDateSelect: (date: Date) => void;
  onMonthChange: (increment: number) => void;
}

export function CalendarGrid({
  currentDate,
  events,
  selectedDate,
  onDateSelect,
  onMonthChange,
}: CalendarGridProps) {
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const daysOfWeek = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month, 1).getDay();
  };

  const getEventsForDate = (date: Date) => {
    return events.filter((event) => {
      const eventDate = new Date(event.date);
      return (
        eventDate.getDate() === date.getDate() &&
        eventDate.getMonth() === date.getMonth() &&
        eventDate.getFullYear() === date.getFullYear()
      );
    });
  };

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDayOfMonth = getFirstDayOfMonth(currentDate);
  const prevMonthDays = getDaysInMonth(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));

  const calendarDays = [];

  // Previous month days
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    const date = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() - 1,
      prevMonthDays - i
    );
    calendarDays.push({ date, isCurrentMonth: false });
  }

  // Current month days
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    calendarDays.push({ date, isCurrentMonth: true });
  }

  // Next month days to fill grid
  const remainingDays = 42 - calendarDays.length;
  for (let day = 1; day <= remainingDays; day++) {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, day);
    calendarDays.push({ date, isCurrentMonth: false });
  }

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const isSelected = (date: Date) => {
    if (!selectedDate) return false;
    return (
      date.getDate() === selectedDate.getDate() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear()
    );
  };

  return (
    <div className="bg-card rounded-lg border border-border p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">
          {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
        </h2>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => onMonthChange(-1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              onDateSelect(new Date());
              onMonthChange(0);
            }}
          >
            Today
          </Button>
          <Button variant="outline" size="icon" onClick={() => onMonthChange(1)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Days of Week */}
      <div className="grid grid-cols-7 gap-2 mb-2">
        {daysOfWeek.map((day) => (
          <div
            key={day}
            className="text-center text-xs font-medium text-muted-foreground py-2"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-2">
        {calendarDays.map(({ date, isCurrentMonth }, index) => {
          const dayEvents = getEventsForDate(date);
          const hasEvents = dayEvents.length > 0;

          return (
            <button
              key={index}
              onClick={() => onDateSelect(date)}
              className={cn(
                'relative aspect-square p-2 rounded-lg text-sm transition-all hover:bg-accent',
                !isCurrentMonth && 'text-muted-foreground opacity-50',
                isToday(date) && 'bg-primary/20 text-primary font-bold',
                isSelected(date) && 'bg-primary text-primary-foreground hover:bg-primary',
                hasEvents && isCurrentMonth && 'font-semibold'
              )}
            >
              <div className="flex flex-col items-center justify-center h-full">
                <span>{date.getDate()}</span>
                {hasEvents && (
                  <div className="flex gap-0.5 mt-1 flex-wrap justify-center">
                    {dayEvents.slice(0, 3).map((event, i) => {
                      const secured = hasTicketsSecured(event.id);
                      return (
                        <div
                          key={i}
                          className={cn(
                            'w-1 h-1 rounded-full',
                            secured
                              ? 'bg-green-500'
                              : isSelected(date)
                                ? 'bg-primary-foreground'
                                : 'bg-primary'
                          )}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-primary" />
          <span className="text-muted-foreground">Ticket Sale Reminder</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span className="text-muted-foreground">Tickets Secured</span>
        </div>
      </div>
    </div>
  );
}
