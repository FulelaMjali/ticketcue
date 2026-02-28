'use client';

import { useEffect, useState } from 'react';
import { UrgentAlert } from '@/components/notifications/urgent-alert';
import { getReminders } from '@/lib/reminder-storage';
import { sendBrowserNotification, getNotificationPermission } from '@/lib/notification-utils';
import { Event } from '@/types';
import { useEvents } from '@/hooks/use-events';

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [urgentEvent, setUrgentEvent] = useState<Event | null>(null);
  const [urgentMessage, setUrgentMessage] = useState('');
  const { data } = useEvents(1, 200);
  const events = data?.events || [];

  useEffect(() => {
    if (!events.length) return;

    // Check reminders every minute
    const checkReminders = () => {
      const reminders = getReminders();
      const now = new Date();
      const eventsById = new Map(events.map((evt) => [evt.id, evt]));

      reminders.forEach((reminder) => {
        if (reminder.status !== 'active') return;

        const event = eventsById.get(reminder.eventId);
        if (!event) return;

        const saleDate = event.ticketSaleDate || event.date;
        const timeDiff = new Date(saleDate).getTime() - now.getTime();
        const minutesUntil = Math.floor(timeDiff / (1000 * 60));

        // Check each interval
        const intervals = [
          { key: 'twoHours', minutes: 120 },
          { key: 'oneHour', minutes: 60 },
          { key: 'thirtyMinutes', minutes: 30 },
          { key: 'tenMinutes', minutes: 10 },
        ] as const;

        intervals.forEach((interval) => {
          if (
            reminder.intervals[interval.key] &&
            minutesUntil <= interval.minutes &&
            minutesUntil > interval.minutes - 1
          ) {
            const message = `Ticket sale starts in ${interval.minutes === 120 ? '2 hours' : interval.minutes === 60 ? '1 hour' : `${interval.minutes} minutes`}!`;

            // Send browser notification if enabled
            if (
              reminder.notificationMethods.browserPush &&
              getNotificationPermission() === 'granted'
            ) {
              sendBrowserNotification({
                title: event.title,
                body: message,
                tag: `reminder-${reminder.id}-${interval.key}`,
                onClick: () => {
                  window.focus();
                  window.location.href = `/events/${event.id}`;
                },
              });
            }

            // Show urgent alert for imminent sales (10 minutes or less)
            if (interval.minutes <= 10) {
              setUrgentEvent(event);
              setUrgentMessage(message);
            }
          }
        });
      });
    };

    // Check immediately
    checkReminders();

    // Then check every minute
    const interval = setInterval(checkReminders, 60 * 1000);

    return () => clearInterval(interval);
  }, [events]);

  return (
    <>
      {children}
      {urgentEvent && (
        <UrgentAlert
          open={!!urgentEvent}
          onOpenChange={(open) => {
            if (!open) {
              setUrgentEvent(null);
              setUrgentMessage('');
            }
          }}
          event={urgentEvent}
          message={urgentMessage}
        />
      )}
    </>
  );
}
