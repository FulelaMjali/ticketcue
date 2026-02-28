import { ReactNode } from 'react';
import { DesktopNav } from './desktop-nav';
import { MobileNav } from './mobile-nav';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-purple">
      <DesktopNav />
      <main className="pt-0 md:pt-16 pb-16 md:pb-0">
        {children}
      </main>
      <MobileNav />
    </div>
  );
}
