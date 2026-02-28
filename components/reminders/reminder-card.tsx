'use client';

import Link from 'next/link';
import { Bell, MoreVertical, MapPin, Calendar } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CountdownTimer } from '@/components/events/countdown-timer';
import { Event, Reminder } from '@/types';
import { formatDate, formatTime } from '@/lib/date-utils';
import { cn } from '@/lib/utils';

interface ReminderCardProps {
  reminder: Reminder;
  event: Event;
  onDelete?: (reminderId: string) => void;
  onSettings?: (reminderId: string) => void;
}

export function ReminderCard({ reminder, event, onDelete, onSettings }: ReminderCardProps) {
  const saleDate = event.presaleDate || event.ticketSaleDate;
  if (!saleDate) return null;

  const urgencyLevel = () => {
    const now = new Date();
    const diff = saleDate.getTime() - now.getTime();
    const hoursRemaining = diff / (1000 * 60 * 60);

    if (hoursRemaining <= 2) return 'urgent';
    if (hoursRemaining <= 24) return 'soon';
    return 'normal';
  };

  const level = urgencyLevel();

  return (
    <Card
      className={cn(
        'overflow-hidden transition-all hover:shadow-lg',
        level === 'urgent' && 'border-red-500/50 shadow-red-500/20',
        level === 'soon' && 'border-primary/50 shadow-primary/20'
      )}
    >
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          {/* Event Image */}
          <div className="relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-accent">
            {event.imageUrl ? (
              <img
                src={event.imageUrl}
                alt={event.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Bell className="w-8 h-8 text-muted-foreground" />
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex-1">
                <Link
                  href={`/events/${event.id}`}
                  className="font-semibold text-lg hover:text-primary transition-colors line-clamp-1"
                >
                  {event.title}
                </Link>
                {event.artist && (
                  <p className="text-sm text-muted-foreground">{event.artist}</p>
                )}
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onSettings?.(reminder.id)}>
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onDelete?.(reminder.id)} className="text-destructive">
                    Delete Reminder
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="flex flex-wrap items-center gap-2 mb-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                <span className="truncate">{event.location}</span>
              </div>
              <span>•</span>
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>{formatDate(event.date)}</span>
              </div>
            </div>

            {/* Sale Status Badge */}
            <Badge
              variant={level === 'urgent' ? 'destructive' : 'default'}
              className={cn(
                'mb-3',
                level === 'soon' && 'bg-primary hover:bg-primary/90'
              )}
            >
              {level === 'urgent' && '🔥 Sale Starting Soon!'}
              {level === 'soon' && '⏰ Sale in 2 Days'}
              {level === 'normal' && `Sale in ${Math.ceil((saleDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))} Days`}
            </Badge>

            {/* Countdown */}
            <div className="bg-accent/50 rounded-lg p-3">
              <div className="text-xs text-muted-foreground mb-2">
                {event.presaleDate ? 'Presale Access' : 'Ticket Sale'} starts in:
              </div>
              <CountdownTimer targetDate={saleDate} size="sm" showLabels={true} />
            </div>

            {/* Reminder Info */}
            <div className="mt-3 text-xs text-muted-foreground">
              Reminder set for {formatTime(saleDate)} on {formatDate(saleDate)}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
