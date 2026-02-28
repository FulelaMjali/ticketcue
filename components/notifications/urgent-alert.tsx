'use client';

import { AlertTriangle, ExternalLink, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Event } from '@/types';
import { CountdownTimer } from '@/components/events/countdown-timer';
import Link from 'next/link';

interface UrgentAlertProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: Event;
  message: string;
}

export function UrgentAlert({ open, onOpenChange, event, message }: UrgentAlertProps) {
  const saleDate = event.ticketSaleDate || event.date;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg border-destructive/50">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            Ticket Sale Starting Soon!
          </DialogTitle>
          <DialogDescription>{message}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Event Info */}
          <div className="rounded-lg bg-destructive/10 p-4 border border-destructive/20">
            <h3 className="font-bold text-lg mb-2">{event.title}</h3>
            {event.artist && (
              <p className="text-sm text-muted-foreground mb-3">{event.artist}</p>
            )}
            
            {/* Countdown */}
            <div className="bg-background/50 rounded-lg p-4">
              <p className="text-xs text-muted-foreground mb-2 text-center">
                Sale starts in
              </p>
              <CountdownTimer targetDate={new Date(saleDate)} size="lg" />
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2">
            {event.ticketUrl && (
              <Button
                asChild
                className="w-full bg-gradient-magenta"
              >
                <Link href={event.ticketUrl} target="_blank">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Go to Ticket Site
                </Link>
              </Button>
            )}
            
            <Button
              asChild
              variant="outline"
              className="w-full"
            >
              <Link href={`/events/${event.id}`}>
                View Event Details
              </Link>
            </Button>
            
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="w-full"
            >
              <X className="w-4 h-4 mr-2" />
              Dismiss
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            Make sure you're ready when tickets go live!
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
