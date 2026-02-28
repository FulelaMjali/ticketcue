'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Calendar, MapPin, Plus, Check } from 'lucide-react';
import { Event, Reminder } from '@/types';
import { formatDate } from '@/lib/date-utils';
import { getReminderByEventId, deleteReminder } from '@/lib/reminder-storage';
import { ReminderModal } from '@/components/reminders/reminder-modal';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface EventCardProps {
  event: Event;
}

const categoryColors: Record<string, string> = {
  concert: 'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20',
  sports: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  theater: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  comedy: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
  festival: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  nightlife: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
};

const statusLabels: Record<string, { label: string; color: string }> = {
  upcoming: { label: 'Upcoming', color: 'bg-blue-500/10 text-blue-400' },
  presale: { label: 'Presale', color: 'bg-amber-500/10 text-amber-400' },
  onsale: { label: 'On Sale', color: 'bg-emerald-500/10 text-emerald-400' },
  soldout: { label: 'Sold Out', color: 'bg-red-500/10 text-red-400' },
};

export function EventCard({ event }: EventCardProps) {
  const [hasReminder, setHasReminder] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);

  useEffect(() => {
    // Check localStorage after hydration to avoid hydration mismatch
    setHasReminder(!!getReminderByEventId(event.id));
  }, [event.id]);

  const handleToggleReminder = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (hasReminder) {
      const reminder = getReminderByEventId(event.id);
      if (reminder) {
        deleteReminder(reminder.id);
        setHasReminder(false);
        toast.success('Reminder removed');
      }
    } else {
      setShowReminderModal(true);
    }
  };

  const handleReminderCreated = (reminder: Reminder) => {
    setHasReminder(true);
    toast.success('Reminder added successfully');
  };

  return (
    <>
      <ReminderModal
        open={showReminderModal}
        onOpenChange={setShowReminderModal}
        event={event}
        onReminderCreated={handleReminderCreated}
      />
      
      <Link href={`/events/${event.id}`}>
        <div className="group relative overflow-hidden rounded-xl bg-card border border-border hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10">
        <div className="relative h-48 w-full overflow-hidden bg-accent">
          {event.imageUrl ? (
            <Image
              src={event.imageUrl}
              alt={event.title}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              unoptimized
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-radial-purple flex items-center justify-center">
              <Calendar className="w-12 h-12 text-muted-foreground" />
            </div>
          )}
          <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/40 to-transparent" />
          
          <div className="absolute top-3 left-3 flex gap-2">
            <Badge className={cn('border', categoryColors[event.category])}>
              {event.category}
            </Badge>
            {event.status && (
              <Badge className={cn('border', statusLabels[event.status].color)}>
                {statusLabels[event.status].label}
              </Badge>
            )}
          </div>

          <button
            onClick={handleToggleReminder}
            className={cn(
              'absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-sm transition-all',
              hasReminder
                ? 'bg-primary text-primary-foreground'
                : 'bg-black/40 text-white hover:bg-black/60'
            )}
          >
            {hasReminder ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          </button>
        </div>

        <div className="p-4">
          <h3 className="font-bold text-lg mb-1 line-clamp-1 group-hover:text-primary transition-colors">
            {event.title}
          </h3>
          {event.artist && (
            <p className="text-sm text-muted-foreground mb-2 line-clamp-1">{event.artist}</p>
          )}

          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Calendar className="w-4 h-4" />
            <span>{formatDate(event.date)}</span>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="w-4 h-4" />
            <span className="line-clamp-1">{event.venue} • {event.location}</span>
          </div>

          {event.ticketSaleDate && new Date(event.ticketSaleDate) > new Date() && (
            <div className="mt-3 pt-3 border-t border-border">
              <p className="text-xs text-muted-foreground">Tickets available</p>
              <p className="text-sm font-semibold text-primary">{formatDate(event.ticketSaleDate)}</p>
            </div>
          )}
        </div>
      </div>
    </Link>
    </>
  );
}
