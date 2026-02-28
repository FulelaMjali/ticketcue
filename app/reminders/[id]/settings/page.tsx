'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Mail, Save, Trash2, ArrowLeft, Check } from 'lucide-react';
import { AppLayout } from '@/components/layout/app-layout';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { getEventStatus, updateTicketsSecured } from '@/lib/event-status-storage';
import { Reminder } from '@/types';
import { toast } from 'sonner';
import Link from 'next/link';
import { useEvent } from '@/hooks/use-events';
import { useReminders } from '@/hooks/use-reminders';

export default function ReminderSettingsPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const [reminder, setReminder] = useState<Reminder | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [ticketsSecured, setTicketsSecured] = useState(false);
  const { reminders, loading: remindersLoading, updateReminder, removeReminder } = useReminders();
  const { data: event, loading: eventLoading, error: eventError } = useEvent(reminder?.eventId || '');

  useEffect(() => {
    if (remindersLoading) return;

    const reminderData = reminders.find((r) => r.id === params.id);
    if (reminderData) {
      setReminder(reminderData);
      
      // Load tickets secured status
      const eventStatus = getEventStatus(reminderData.eventId);
      setTicketsSecured(eventStatus?.ticketsSecured || false);
    } else {
      toast.error('Reminder not found');
      router.push('/reminders');
    }
  }, [params.id, reminders, remindersLoading, router]);

  if (!reminder) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-8">
          <p>Loading...</p>
        </div>
      </AppLayout>
    );
  }

  if (eventLoading) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-8 space-y-4">
          <div className="h-6 w-24 bg-muted animate-pulse rounded" />
          <div className="h-24 bg-muted animate-pulse rounded" />
        </div>
      </AppLayout>
    );
  }

  if (!event || eventError) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-8">
          <p className="text-muted-foreground">Event not found</p>
        </div>
      </AppLayout>
    );
  }

  const handleIntervalToggle = (key: keyof Reminder['intervals']) => {
    setReminder((prev) =>
      prev
        ? {
            ...prev,
            intervals: {
              ...prev.intervals,
              [key]: !prev.intervals[key],
            },
          }
        : null
    );
  };

  const handleMethodToggle = (key: keyof Reminder['notificationMethods']) => {
    setReminder((prev) =>
      prev
        ? {
            ...prev,
            notificationMethods: {
              ...prev.notificationMethods,
              [key]: !prev.notificationMethods[key],
            },
          }
        : null
    );
  };

  const handleSave = async () => {
    if (!reminder) return;

    const hasAtLeastOneInterval = Object.values(reminder.intervals).some((v) => v);
    const hasAtLeastOneMethod = Object.values(reminder.notificationMethods).some(
      (v) => v
    );

    if (!hasAtLeastOneInterval) {
      toast.error('Please select at least one reminder interval');
      return;
    }

    if (!hasAtLeastOneMethod) {
      toast.error('Please select at least one notification method');
      return;
    }

    setIsSaving(true);
    try {
      await updateReminder(reminder.id, {
        intervals: reminder.intervals,
        notificationMethods: reminder.notificationMethods,
      });
      updateTicketsSecured(reminder.eventId, ticketsSecured);
      toast.success('Preferences saved');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save preferences';
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!reminder) return;

    try {
      await removeReminder(reminder.id);
      toast.success('Reminder deleted');
      router.push('/reminders');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete reminder';
      toast.error(message);
    }
  };

  return (
    <AppLayout>
      <div className="container max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/reminders"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Reminders
          </Link>
          <h1 className="text-3xl font-bold mb-2">Manage Reminder</h1>
          <p className="text-muted-foreground">
            Customize when and how you want to be notified
          </p>
        </div>

        {/* Event Info Card */}
        <Card className="mb-6 border-primary/20">
          <CardHeader>
            <CardTitle className="text-xl">{event.title}</CardTitle>
          </CardHeader>
          <CardContent>
            {event.artist && (
              <p className="text-sm text-muted-foreground mb-2">{event.artist}</p>
            )}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{event.location}</span>
              <span>•</span>
              <span>{event.category}</span>
            </div>
          </CardContent>
        </Card>

        {/* Reminder Intervals */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              <CardTitle>Reminder Intervals</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
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
                  checked={reminder.intervals[interval.key]}
                  onCheckedChange={() => handleIntervalToggle(interval.key)}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Event Status */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Check className="w-5 h-5 text-green-500" />
              <CardTitle>Event Status</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="ticketsSecured" className="cursor-pointer">
                  Tickets Secured
                </Label>
                <p className="text-xs text-muted-foreground">
                  Mark if you've successfully purchased tickets
                </p>
              </div>
              <Switch
                id="ticketsSecured"
                checked={ticketsSecured}
                onCheckedChange={setTicketsSecured}
              />
            </div>
          </CardContent>
        </Card>

        {/* Notification Methods */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-primary" />
              <CardTitle>Notification Method</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="browserPush" className="cursor-pointer">
                  Browser Push Notifications
                </Label>
                <p className="text-xs text-muted-foreground">
                  Get notifications in your browser
                </p>
              </div>
              <Switch
                id="browserPush"
                checked={reminder.notificationMethods.browserPush}
                onCheckedChange={() => handleMethodToggle('browserPush')}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="email" className="cursor-pointer">
                  Email Notifications
                </Label>
                <p className="text-xs text-muted-foreground">
                  Receive email reminders (coming soon)
                </p>
              </div>
              <Switch
                id="email"
                checked={reminder.notificationMethods.email}
                onCheckedChange={() => handleMethodToggle('email')}
                disabled
              />
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 bg-gradient-magenta"
          >
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Preferences'}
          </Button>
          <Button
            variant="destructive"
            onClick={() => setShowDeleteDialog(true)}
            className="flex-1 sm:flex-none"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete Reminder
          </Button>
        </div>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Reminder</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this reminder? You will no longer receive
                notifications for this event.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
}
