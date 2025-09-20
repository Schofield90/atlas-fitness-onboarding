"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    // Only initialize analytics on client side
    if (typeof window !== "undefined") {
      // Dynamically import analytics to avoid SSR issues
      import("@/app/lib/analytics/client").then(({ analytics }) => {
        analytics.trackPageView(pathname);
      });
    }
  }, [pathname]);

  return <>{children}</>;
}
