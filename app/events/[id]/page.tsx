'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Bell, Share2, MapPin, Calendar, ExternalLink, Heart, Check } from 'lucide-react';
import { AppLayout } from '@/components/layout/app-layout';
import { CountdownTimer } from '@/components/events/countdown-timer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { hasTicketsSecured, updateTicketsSecured } from '@/lib/event-status-storage';
import { formatDate, formatTime, formatRelativeTime } from '@/lib/date-utils';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useEvent } from '@/hooks/use-events';
import { useReminders } from '@/hooks/use-reminders';

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;
  const [hasReminder, setHasReminder] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [ticketsSecured, setTicketsSecured] = useState(false);

  const { data: event, loading, error } = useEvent(eventId);
  const { reminders, createReminder, removeReminder } = useReminders();

  useEffect(() => {
    if (event) {
      setHasReminder(reminders.some((r) => r.eventId === event.id && r.status === 'active'));
      setTicketsSecured(hasTicketsSecured(event.id));
    }
  }, [event, reminders]);

  if (loading) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-16 space-y-6">
          <div className="h-10 w-32 bg-muted animate-pulse rounded" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              <div className="h-72 bg-muted animate-pulse rounded-xl" />
              {Array.from({ length: 3 }).map((_, idx) => (
                <div key={idx} className="h-32 bg-muted animate-pulse rounded-xl" />
              ))}
            </div>
            <div className="space-y-4">
              {Array.from({ length: 2 }).map((_, idx) => (
                <div key={idx} className="h-40 bg-muted animate-pulse rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-16 text-center space-y-4">
          <h1 className="text-2xl font-bold">Unable to load event</h1>
          <p className="text-muted-foreground">{error.message}</p>
          <Button onClick={() => router.push('/events')}>Back to Events</Button>
        </div>
      </AppLayout>
    );
  }

  if (!event) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Event Not Found</h1>
          <Button onClick={() => router.push('/events')}>Back to Events</Button>
        </div>
      </AppLayout>
    );
  }

  const saleDate = event?.presaleDate || event?.ticketSaleDate;
  const eventUpdates = event?.updates || [];

  const handleToggleReminder = async () => {
    if (!event) return;

    if (hasReminder) {
      const reminder = reminders.find((r) => r.eventId === event.id && r.status === 'active');
      if (reminder) {
        try {
          await removeReminder(reminder.id);
          setHasReminder(false);
          toast.success('Reminder removed');
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to remove reminder';
          toast.error(message);
        }
      }
    } else {
      if (!saleDate) {
        toast.error('No ticket sale date available');
        return;
      }

      try {
        await createReminder({
          eventId: event.id,
          intervals: {
            twoHours: false,
            oneHour: true,
            thirtyMinutes: false,
            tenMinutes: true,
          },
          notificationMethods: {
            browserPush: true,
            email: false,
          },
        });
        setHasReminder(true);
        toast.success('Reminder added! You\'ll be notified before tickets go on sale.');
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to create reminder';
        toast.error(message);
      }
    }
  };

  const handleToggleTicketsSecured = () => {
    const newStatus = !ticketsSecured;
    updateTicketsSecured(event.id, newStatus);
    setTicketsSecured(newStatus);
    toast.success(newStatus ? 'Marked as tickets secured!' : 'Tickets secured status removed');
  };

  const statusConfig = {
    upcoming: { label: 'Upcoming', className: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
    presale: { label: 'Presale Access', className: 'bg-primary/20 text-primary border-primary/30' },
    onsale: { label: 'On Sale Now', className: 'bg-green-500/20 text-green-400 border-green-500/30' },
    soldout: { label: 'Sold Out', className: 'bg-red-500/20 text-red-400 border-red-500/30' },
  };

  const status = statusConfig[event.status];

  return (
    <AppLayout>
      <div className="min-h-screen">
        {/* Hero Section */}
        <div className="relative h-[60vh] md:h-[70vh] overflow-hidden">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: event.imageUrl ? `url(${event.imageUrl})` : 'none',
              backgroundColor: event.imageUrl ? 'transparent' : '#2d1b4e',
            }}
          />
          <div className="absolute inset-0 bg-linear-to-t from-background via-background/60 to-transparent" />

          {/* Back Button */}
          <div className="absolute top-4 left-4 z-10">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
              className="bg-background/80 backdrop-blur-sm hover:bg-background/90"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </div>

          {/* Actions */}
          <div className="absolute top-4 right-4 z-10 flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsFavorite(!isFavorite)}
              className="bg-background/80 backdrop-blur-sm hover:bg-background/90"
            >
              <Heart className={cn('w-5 h-5', isFavorite && 'fill-red-500 text-red-500')} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="bg-background/80 backdrop-blur-sm hover:bg-background/90"
            >
              <Share2 className="w-5 h-5" />
            </Button>
          </div>

          {/* Content */}
          <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
            <div className="container mx-auto">
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="outline" className={status.className}>
                  {status.label}
                </Badge>
                <Badge variant="outline" className="capitalize">
                  {event.category}
                </Badge>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <MapPin className="w-4 h-4" />
                <span>{event.location}</span>
              </div>

              <h1 className="text-3xl md:text-5xl font-bold mb-2 text-balance">
                {event.title}
              </h1>

              {event.artist && (
                <p className="text-xl md:text-2xl text-muted-foreground mb-4">{event.artist}</p>
              )}

              <div className="flex flex-wrap items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>{formatDate(event.date)} • {formatTime(event.date)}</span>
                </div>
                <span>•</span>
                <span>{event.venue}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column */}
            <div className="lg:col-span-2 space-y-6">
              {/* About */}
              <section>
                <h2 className="text-2xl font-bold mb-4">About the Experience</h2>
                <p className="text-muted-foreground leading-relaxed">
                  {event.description}
                </p>
              </section>

              {/* Headliners (if artist event) */}
              {event.artist && (
                <section>
                  <h2 className="text-2xl font-bold mb-4">Headliners</h2>
                  <div className="flex items-center gap-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="text-center">
                        <Avatar className="w-16 h-16 mb-2 border-2 border-primary/30">
                          <AvatarFallback className="bg-primary/20 text-primary font-bold">
                            {event.artist?.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <p className="text-xs text-muted-foreground">Artist {i}</p>
                      </div>
                    ))}
                    <div className="text-center">
                      <div className="w-16 h-16 mb-2 rounded-full bg-accent flex items-center justify-center text-sm font-bold text-muted-foreground">
                        +12
                      </div>
                      <p className="text-xs text-muted-foreground">More</p>
                    </div>
                  </div>
                </section>
              )}

              {/* Live Updates */}
              {eventUpdates.length > 0 && (
                <section>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <h2 className="text-2xl font-bold">Live Updates</h2>
                      <Badge variant="secondary" className="bg-green-500/20 text-green-400">
                        LIVE
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {eventUpdates.map((update) => (
                      <Card key={update.id}>
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge
                                  variant={
                                    update.priority === 'urgent'
                                      ? 'destructive'
                                      : update.priority === 'important'
                                        ? 'default'
                                        : 'secondary'
                                  }
                                  className="text-xs uppercase"
                                >
                                  {update.type}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {formatRelativeTime(update.timestamp)}
                                </span>
                              </div>
                              <h3 className="font-semibold mb-1">{update.title}</h3>
                              <p className="text-sm text-muted-foreground">{update.description}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </section>
              )}
            </div>

            {/* Right Column - Sticky Sidebar */}
            <div className="lg:sticky lg:top-4 lg:h-fit space-y-6">
              {/* Countdown Card */}
              {saleDate && (
                <Card className="border-primary/30 bg-card/80 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-sm uppercase tracking-wider text-primary">
                      {event.presaleDate ? 'Presale Starts Soon' : 'Tickets Go Live'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CountdownTimer targetDate={saleDate} size="md" />
                    <div className="mt-4 pt-4 border-t border-border space-y-3">
                      <div>
                        <p className="text-sm text-muted-foreground mb-3">
                          Notify me 10 minutes before sale
                        </p>
                        <Button
                          onClick={handleToggleReminder}
                          className={cn(
                            'w-full',
                            hasReminder ? 'bg-accent text-foreground hover:bg-accent/80' : 'bg-gradient-magenta'
                          )}
                        >
                          <Bell className="w-4 h-4 mr-2" />
                          {hasReminder ? 'Reminder Set' : 'Set Alert'}
                        </Button>
                      </div>
                      <div className="pt-3 border-t border-border">
                        <Button
                          onClick={handleToggleTicketsSecured}
                          variant={ticketsSecured ? 'default' : 'outline'}
                          className={cn(
                            'w-full',
                            ticketsSecured && 'bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/30'
                          )}
                        >
                          <Check className="w-4 h-4 mr-2" />
                          {ticketsSecured ? 'Tickets Secured!' : 'Mark Tickets Secured'}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Ticket Link */}
              {event.ticketUrl && (
                <Card className="bg-gradient-magenta border-0 text-white">
                  <CardContent className="p-6">
                    <h3 className="font-bold text-lg mb-2">Get Your Tickets</h3>
                    <p className="text-sm opacity-90 mb-4">
                      Purchase tickets on the official vendor page
                    </p>
                    <Button
                      variant="secondary"
                      className="w-full bg-white text-purple-600 hover:bg-gray-100"
                      asChild
                    >
                      <a href={event.ticketUrl} target="_blank" rel="noopener noreferrer">
                        Go to Ticket Site
                        <ExternalLink className="w-4 h-4 ml-2" />
                      </a>
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Venue Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Venue</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-medium mb-1">{event.venue}</p>
                  <p className="text-sm text-muted-foreground mb-4">{event.location}</p>
                  <Button variant="outline" className="w-full" size="sm">
                    <MapPin className="w-4 h-4 mr-2" />
                    Get Directions
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
