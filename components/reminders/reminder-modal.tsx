'use client';

import { useState } from 'react';
import { Bell, Mail, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Event, Reminder } from '@/types';
import { addReminder } from '@/lib/reminder-storage';
import { formatDate } from '@/lib/date-utils';

interface ReminderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: Event;
  onReminderCreated?: (reminder: Reminder) => void;
}

export function ReminderModal({
  open,
  onOpenChange,
  event,
  onReminderCreated,
}: ReminderModalProps) {
  const [intervals, setIntervals] = useState({
    twoHours: false,
    oneHour: true,
    thirtyMinutes: false,
    tenMinutes: true,
  });

  const [notificationMethods, setNotificationMethods] = useState({
    browserPush: true,
    email: false,
  });

  const [isSaving, setIsSaving] = useState(false);

  const handleIntervalToggle = (key: keyof typeof intervals) => {
    setIntervals((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleMethodToggle = (key: keyof typeof notificationMethods) => {
    setNotificationMethods((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    const reminder = addReminder({
      eventId: event.id,
      intervals,
      notificationMethods,
    });

    if (onReminderCreated) {
      onReminderCreated(reminder);
    }

    setIsSaving(false);
    onOpenChange(false);
  };

  const hasAtLeastOneInterval = Object.values(intervals).some((v) => v);
  const hasAtLeastOneMethod = Object.values(notificationMethods).some((v) => v);
  const canSave = hasAtLeastOneInterval && hasAtLeastOneMethod;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            Set Reminder
          </DialogTitle>
          <DialogDescription>
            Customize when and how you want to be notified about {event.title}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Event Info */}
          <div className="rounded-lg bg-accent/50 p-4 space-y-2">
            <h3 className="font-semibold">{event.title}</h3>
            {event.artist && (
              <p className="text-sm text-muted-foreground">{event.artist}</p>
            )}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{formatDate(event.ticketSaleDate || event.date)}</span>
              <span>•</span>
              <span>{event.location}</span>
            </div>
          </div>

          {/* Reminder Intervals */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-primary" />
              <Label className="text-base font-semibold">Reminder Intervals</Label>
            </div>
            
            <div className="space-y-3">
              {[
                { key: 'twoHours' as const, label: '2 Hours Before' },
                { key: 'oneHour' as const, label: '1 Hour Before' },
                { key: 'thirtyMinutes' as const, label: '30 Minutes Before' },
                { key: 'tenMinutes' as const, label: '10 Minutes Before' },
              ].map((interval) => (
                <div key={interval.key} className="flex items-center justify-between">
                  <Label htmlFor={interval.key} className="cursor-pointer">
                    {interval.label}
                  </Label>
                  <Switch
                    id={interval.key}
                    checked={intervals[interval.key]}
                    onCheckedChange={() => handleIntervalToggle(interval.key)}
                  />
                </div>
              ))}
            </div>

            {!hasAtLeastOneInterval && (
              <p className="text-sm text-destructive">
                Select at least one reminder interval
              </p>
            )}
          </div>

          <Separator />

          {/* Notification Methods */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-primary" />
              <Label className="text-base font-semibold">Notification Method</Label>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="browserPush" className="cursor-pointer">
                    Browser Push
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Get notifications in your browser
                  </p>
                </div>
                <Switch
                  id="browserPush"
                  checked={notificationMethods.browserPush}
                  onCheckedChange={() => handleMethodToggle('browserPush')}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="email" className="cursor-pointer">
                    Email
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Receive email reminders
                  </p>
                </div>
                <Switch
                  id="email"
                  checked={notificationMethods.email}
                  onCheckedChange={() => handleMethodToggle('email')}
                />
              </div>
            </div>

            {!hasAtLeastOneMethod && (
              <p className="text-sm text-destructive">
                Select at least one notification method
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!canSave || isSaving}
            className="bg-gradient-magenta"
          >
            {isSaving ? (
              'Saving...'
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Save Reminder
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
