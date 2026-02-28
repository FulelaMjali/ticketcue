'use client';

import { useEffect, useState } from 'react';
import { getTimeUntil } from '@/lib/date-utils';

interface CountdownTimerProps {
  targetDate: Date;
  size?: 'sm' | 'md' | 'lg';
  showLabels?: boolean;
  className?: string;
}

export function CountdownTimer({
  targetDate,
  size = 'md',
  showLabels = true,
  className = '',
}: CountdownTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    // Set initial value after hydration
    setTimeRemaining(getTimeUntil(targetDate));
    
    const interval = setInterval(() => {
      setTimeRemaining(getTimeUntil(targetDate));
    }, 1000);

    return () => clearInterval(interval);
  }, [targetDate]);

  const sizeClasses = {
    sm: 'text-2xl',
    md: 'text-4xl',
    lg: 'text-6xl',
  };

  const labelSizeClasses = {
    sm: 'text-[10px]',
    md: 'text-xs',
    lg: 'text-sm',
  };

  const units = [
    { value: timeRemaining.days, label: 'DAYS' },
    { value: timeRemaining.hours, label: 'HOURS' },
    { value: timeRemaining.minutes, label: 'MINS' },
  ];

  if (size === 'sm') {
    units.push({ value: timeRemaining.seconds, label: 'SECS' });
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {units.map((unit, index) => (
        <div key={unit.label} className="flex items-center gap-3">
          <div className="flex flex-col items-center">
            <div
              className={`${sizeClasses[size]} font-bold tabular-nums leading-none`}
            >
              {String(unit.value).padStart(2, '0')}
            </div>
            {showLabels && (
              <div
                className={`${labelSizeClasses[size]} text-muted-foreground font-medium tracking-wider mt-1`}
              >
                {unit.label}
              </div>
            )}
          </div>
          {index < units.length - 1 && (
            <div className={`${sizeClasses[size]} font-bold text-muted-foreground`}>:</div>
          )}
        </div>
      ))}
    </div>
  );
}
