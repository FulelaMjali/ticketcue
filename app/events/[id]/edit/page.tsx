'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import EventForm from '@/components/events/event-form';
import { AppLayout } from '@/components/layout/app-layout';
import { Loader2 } from 'lucide-react';
import { useEvent } from '@/hooks/use-events';

export default function EditEventPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;
  const { data: event, loading, error } = useEvent(eventId);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </AppLayout>
    );
  }

  if (error || !event) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-16">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-2">Event not found</h1>
            <p className="text-muted-foreground mb-6">The event you're looking for doesn't exist.</p>
            <button
              onClick={() => router.push('/events')}
              className="text-primary hover:underline"
            >
              Back to Events
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  // Check if user is the creator
  if (!event.isUserCreated) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-16">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-2">Cannot edit this event</h1>
            <p className="text-muted-foreground mb-6">You can only edit events you created.</p>
            <button
              onClick={() => router.push('/events')}
              className="text-primary hover:underline"
            >
              Back to Events
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  const toDatetimeLocal = (d: Date | string | undefined) => {
    if (!d) return '';
    return (d instanceof Date ? d : new Date(d)).toISOString().slice(0, 16);
  };

  const formattedEvent = {
    id: event.id,
    title: event.title,
    artist: event.artist,
    venue: event.venue,
    location: event.location,
    date: toDatetimeLocal(event.date),
    ticketSaleDate: toDatetimeLocal(event.ticketSaleDate),
    presaleDate: toDatetimeLocal(event.presaleDate),
    category: event.category as any,
    description: event.description,
    ticketUrl: event.ticketUrl,
    imageUrl: event.imageUrl,
    ticketPhases: Array.isArray(event.ticketPhases)
      ? event.ticketPhases.map((p) => ({
          name: p.name,
          date: toDatetimeLocal(p.date),
          status: p.status,
        }))
      : [],
  };

  return (
    <AppLayout>
      <div className="container mx-auto">
        <EventForm initialData={formattedEvent} isEditing={true} />
      </div>
    </AppLayout>
  );
}
