'use client';

import { useState, useEffect, useMemo } from 'react';
import { Bell, Plus, Share2 } from 'lucide-react';
import { AppLayout } from '@/components/layout/app-layout';
import { ReminderCard } from '@/components/reminders/reminder-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatRelativeTime } from '@/lib/date-utils';
import Link from 'next/link';
import { useEvents } from '@/hooks/use-events';
import { useReminders } from '@/hooks/use-reminders';
import { useUpdatesFeed } from '@/hooks/use-updates';
import { useUserProfile } from '@/hooks/use-user-profile';

export default function DashboardPage() {
  const { reminders, removeReminder, loading: remindersLoading, error: remindersError } = useReminders();
  const { data, loading, error } = useEvents(1, 100);
  const { updates: feedUpdates, loading: updatesLoading, error: updatesError } = useUpdatesFeed();
  const { profile, loading: profileLoading } = useUserProfile();
  const events = data?.events || [];
  const eventsById = useMemo(() => new Map(events.map((evt) => [evt.id, evt])), [events]);

  const handleDeleteReminder = async (reminderId: string) => {
    await removeReminder(reminderId);
  };

  const activeReminders = reminders.filter((r) => r.status === 'active');
  const reminderEvents = activeReminders
    .map((r) => ({
      reminder: r,
      event: eventsById.get(r.eventId),
    }))
    .filter((item) => item.event)
    .sort((a, b) => {
      const dateA = a.event!.presaleDate || a.event!.ticketSaleDate;
      const dateB = b.event!.presaleDate || b.event!.ticketSaleDate;
      if (!dateA) return 1;
      if (!dateB) return -1;
      return dateA.getTime() - dateB.getTime();
    });

  const upcomingSales = reminderEvents.filter((item) => {
    const saleDate = item.event!.presaleDate || item.event!.ticketSaleDate;
    if (!saleDate) return false;
    const now = new Date();
    const diffHours = (saleDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    return diffHours <= 168; // Within 7 days
  });

  const latestNews = useMemo(() => {
    return [...feedUpdates].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 5);
  }, [feedUpdates]);

  // Get user initials from name or email
  const getUserInitials = () => {
    if (profile?.name) {
      return profile.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    if (profile?.email) {
      return profile.email[0].toUpperCase();
    }
    return 'U';
  };

  // Get user display name
  const getUserDisplayName = () => {
    return profile?.name || profile?.email?.split('@')[0] || 'User';
  };

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          {profileLoading ? (
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-full bg-muted animate-pulse" />
              <div>
                <div className="h-8 w-48 bg-muted animate-pulse rounded mb-2" />
                <div className="h-5 w-32 bg-muted animate-pulse rounded" />
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-xl font-bold">{getUserInitials()}</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold">Welcome Back, {getUserDisplayName()}</h1>
                <p className="text-muted-foreground">
                  {profile?.stats.ticketsSecured || 0} tickets secured • {profile?.stats.activeReminders || 0} reminders
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Upcoming Sales Section */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl md:text-2xl font-bold">
                  Upcoming Sales & Reminders
                </h2>
                <Link href="/reminders">
                  <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80">
                    VIEW ALL
                  </Button>
                </Link>
              </div>

              {error || remindersError ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    Unable to load dashboard data
                  </CardContent>
                </Card>
              ) : loading || remindersLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, idx) => (
                    <div key={idx} className="h-28 bg-muted animate-pulse rounded-xl" />
                  ))}
                </div>
              ) : upcomingSales.length > 0 ? (
                <div className="space-y-4">
                  {upcomingSales.slice(0, 3).map(({ reminder, event }) => (
                    <ReminderCard
                      key={reminder.id}
                      reminder={reminder}
                      event={event!}
                      onDelete={handleDeleteReminder}
                    />
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center mb-4">
                      <Bell className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <p className="text-lg font-medium mb-2">No upcoming sales</p>
                    <p className="text-sm text-muted-foreground text-center mb-4">
                      You have {activeReminders.length} ticket releases happening this week.
                    </p>
                    <Link href="/events">
                      <Button className="bg-gradient-magenta">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Reminder
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              )}
            </section>

            {/* Quick Actions */}
            <section>
              <h3 className="text-lg font-semibold mb-3">QUICK ACTIONS</h3>
              <div className="grid grid-cols-2 gap-4">
                <Link href="/reminders">
                  <Card className="cursor-pointer transition-all hover:bg-accent group">
                    <CardContent className="flex flex-col items-center justify-center p-6 text-center">
                      <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mb-3 group-hover:bg-primary/30 transition-colors">
                        <Bell className="w-6 h-6 text-primary" />
                      </div>
                      <p className="font-medium">Add Reminder</p>
                    </CardContent>
                  </Card>
                </Link>
                <Link href="/events">
                  <Card className="cursor-pointer transition-all hover:bg-accent group">
                    <CardContent className="flex flex-col items-center justify-center p-6 text-center">
                      <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mb-3 group-hover:bg-primary/30 transition-colors">
                        <Share2 className="w-6 h-6 text-primary" />
                      </div>
                      <p className="font-medium">Share Event</p>
                    </CardContent>
                  </Card>
                </Link>
              </div>
            </section>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Stats Card */}
            <Card className="bg-gradient-purple border-primary/20">
              <CardContent className="p-6">
                <h3 className="text-sm font-medium text-muted-foreground mb-4">
                  YOUR ACTIVITY
                </h3>
                {profileLoading ? (
                  <div className="space-y-4">
                    <div className="h-12 bg-white/10 animate-pulse rounded" />
                    <div className="h-12 bg-white/10 animate-pulse rounded" />
                    <div className="h-12 bg-white/10 animate-pulse rounded" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <div className="text-3xl font-bold text-primary">
                        {profile?.stats.ticketsSecured || 0}
                      </div>
                      <div className="text-sm text-muted-foreground">Tickets Secured</div>
                    </div>
                    <div>
                      <div className="text-3xl font-bold text-primary">
                        {profile?.stats.eventsThisMonth || 0}
                      </div>
                      <div className="text-sm text-muted-foreground">Events This Month</div>
                    </div>
                    <div>
                      <div className="text-3xl font-bold text-primary">
                        {profile?.stats.activeReminders || 0}
                      </div>
                      <div className="text-sm text-muted-foreground">Active Reminders</div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Latest News */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Latest News</CardTitle>
                  <Link href="/news">
                    <Button variant="ghost" size="sm" className="text-primary h-auto p-0">
                      VIEW ALL
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {updatesError ? (
                  <p className="text-sm text-destructive">Unable to load updates.</p>
                ) : updatesLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 3 }).map((_, idx) => (
                      <div key={idx} className="h-12 bg-muted animate-pulse rounded" />
                    ))}
                  </div>
                ) : latestNews.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No updates yet.</p>
                ) : (
                  latestNews.map((update) => (
                    <div key={update.id} className="border-b border-border last:border-0 pb-4 last:pb-0">
                      <div className="flex items-start gap-2 mb-1">
                        <Badge
                          variant={
                            update.priority === 'urgent'
                              ? 'destructive'
                              : update.priority === 'important'
                                ? 'default'
                                : 'secondary'
                          }
                          className="text-[10px] px-1.5 py-0.5"
                        >
                          {update.type.toUpperCase()}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatRelativeTime(update.timestamp)}
                        </span>
                      </div>
                      <Link
                        href={`/events/${update.eventId}`}
                        className="font-medium text-sm hover:text-primary transition-colors line-clamp-2"
                      >
                        {update.title}
                      </Link>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {update.description}
                      </p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Discover Section */}
            <Card className="bg-gradient-magenta border-0 text-white">
              <CardContent className="p-6 text-center">
                <h3 className="font-bold text-lg mb-2">Discover Local Gigs</h3>
                <p className="text-sm opacity-90 mb-4">
                  Check out concerts and events happening near you
                </p>
                <Link href="/events">
                  <Button variant="secondary" size="sm" className="bg-white text-purple-600 hover:bg-gray-100">
                    Browse Events
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
