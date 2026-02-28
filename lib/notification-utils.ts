'use client';

import { toast } from 'sonner';

export interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  onClick?: () => void;
}

// Check if browser notifications are supported
export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

// Check current permission status
export function getNotificationPermission(): NotificationPermission {
  if (!isNotificationSupported()) {
    return 'denied';
  }
  return Notification.permission;
}

// Request notification permission
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isNotificationSupported()) {
    console.warn('Notifications are not supported in this browser');
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission === 'denied') {
    toast.error('Notifications are blocked. Please enable them in your browser settings.');
    return 'denied';
  }

  try {
    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      toast.success('Notifications enabled successfully');
    } else {
      toast.error('Notification permission denied');
    }
    
    return permission;
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return 'denied';
  }
}

// Send a browser notification
export function sendBrowserNotification(options: NotificationOptions): Notification | null {
  if (!isNotificationSupported()) {
    console.warn('Notifications are not supported');
    return null;
  }

  if (Notification.permission !== 'granted') {
    console.warn('Notification permission not granted');
    return null;
  }

  try {
    const notification = new Notification(options.title, {
      body: options.body,
      icon: options.icon || '/icon.svg',
      tag: options.tag,
      badge: '/icon.svg',
      requireInteraction: true,
    });

    if (options.onClick) {
      notification.onclick = () => {
        options.onClick?.();
        notification.close();
      };
    }

    return notification;
  } catch (error) {
    console.error('Error sending notification:', error);
    return null;
  }
}

// Schedule a notification (simulated for demo)
export function scheduleNotification(
  options: NotificationOptions,
  delayMs: number
): NodeJS.Timeout {
  return setTimeout(() => {
    sendBrowserNotification(options);
  }, delayMs);
}

// Send toast notification as fallback
export function sendToastNotification(
  title: string,
  description?: string,
  type: 'info' | 'success' | 'warning' | 'error' = 'info'
) {
  switch (type) {
    case 'success':
      toast.success(title, { description });
      break;
    case 'warning':
      toast.warning(title, { description });
      break;
    case 'error':
      toast.error(title, { description });
      break;
    default:
      toast.info(title, { description });
  }
}

// Check if notifications should be sent based on reminder settings
export function shouldSendNotification(
  eventDate: Date,
  intervalMinutes: number
): boolean {
  const now = new Date();
  const timeDiff = eventDate.getTime() - now.getTime();
  const minutesUntilEvent = Math.floor(timeDiff / (1000 * 60));

  // Check if we're within the notification window (±2 minutes)
  return Math.abs(minutesUntilEvent - intervalMinutes) <= 2;
}

// Format notification time
export function formatNotificationTime(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }
  const hours = Math.floor(minutes / 60);
  return `${hours} hour${hours !== 1 ? 's' : ''}`;
}
