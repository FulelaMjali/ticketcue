'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, Calendar, Home, Ticket, User, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFriendRequests } from '@/hooks/use-friends';

const navItems = [
  { href: '/', label: 'Discover', icon: Home },
  { href: '/dashboard', label: 'Dashboard', icon: Ticket },
  { href: '/reminders', label: 'Reminders', icon: Bell },
  { href: '/friends', label: 'Friends', icon: Users },
  { href: '/profile', label: 'Profile', icon: User },
];

export function MobileNav() {
  const pathname = usePathname();
  const { requests } = useFriendRequests();
  const pendingCount = requests.length;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-card/95 backdrop-blur-lg border-t border-border z-50 safe-area-inset-bottom">
      <div className="flex items-center justify-around h-full px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          const showBadge = item.href === '/friends' && pendingCount > 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'relative flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-colors flex-1',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className={cn('w-5 h-5', isActive && 'fill-primary/20')} />
              {showBadge && (
                <span className="absolute top-1 right-3 w-2 h-2 bg-primary rounded-full" />
              )}
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
