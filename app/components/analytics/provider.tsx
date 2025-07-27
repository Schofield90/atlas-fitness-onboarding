'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { analytics } from '@/app/lib/analytics/client';

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    // Track page views on route change
    analytics.trackPageView(pathname);
  }, [pathname]);

  return <>{children}</>;
}