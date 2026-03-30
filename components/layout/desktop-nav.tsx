'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, Calendar, Home, Newspaper, Settings, Ticket, Users } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useFriendRequests } from '@/hooks/use-friends';

const navItems = [
  { href: '/', label: 'Discover', icon: Home },
  { href: '/dashboard', label: 'Dashboard', icon: Ticket },
  { href: '/reminders', label: 'My Reminders', icon: Bell },
  { href: '/calendar', label: 'Calendar', icon: Calendar },
  { href: '/friends', label: 'Friends', icon: Users },
];

export function DesktopNav() {
  const pathname = usePathname();
  const { profile } = useUserProfile();
  const { requests } = useFriendRequests();
  const pendingCount = requests.length;

  const getUserInitials = () => {
    if (profile?.name) {
      return profile.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
    }
    if (profile?.email) return profile.email[0].toUpperCase();
    return 'U';
  };

  return (
    <nav className="hidden md:flex fixed top-0 left-0 right-0 h-16 bg-card/80 backdrop-blur-lg border-b border-border z-50">
      <div className="container mx-auto px-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-magenta flex items-center justify-center">
            <Ticket className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold">TicketCue</span>
        </Link>

        <div className="flex items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            const showBadge = item.href === '/friends' && pendingCount > 0;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'relative flex items-center gap-2 px-4 py-2 rounded-lg transition-colors',
                  isActive
                    ? 'text-primary bg-primary/10'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                )}
              >
                <Icon className="w-4 h-4" />
                <span className="text-sm font-medium">{item.label}</span>
                {showBadge && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />
                )}
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-4">
          <button className="relative p-2 hover:bg-accent rounded-lg transition-colors">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />
          </button>
          <Link href="/profile">
            <Avatar className="cursor-pointer hover:opacity-80 transition-opacity">
              <AvatarFallback className="bg-gradient-magenta text-white font-semibold">
                {getUserInitials()}
              </AvatarFallback>
            </Avatar>
          </Link>
        </div>
      </div>
    </nav>
  );
}
