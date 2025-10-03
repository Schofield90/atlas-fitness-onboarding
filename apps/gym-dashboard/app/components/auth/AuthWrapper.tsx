'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/app/lib/supabase/client';

interface AuthWrapperProps {
  children: React.ReactNode;
}

export default function AuthWrapper({ children }: AuthWrapperProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    checkAuth();
  }, [pathname]);

  const checkAuth = async () => {
    // Skip check for public pages
    const publicPaths = ['/login', '/signup', '/landing', '/fix-login', '/onboarding'];
    if (publicPaths.some(path => pathname.startsWith(path))) {
      setChecking(false);
      return;
    }

    try {
      // Check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        // Not authenticated, redirect to login
        router.push('/login');
        return;
      }

      // Check organization membership
      const response = await fetch('/api/auth/check-membership');
      const result = await response.json();

      if (result.error) {
        console.error('Error checking membership:', result.error);
        setChecking(false);
        return;
      }

      if (result.needsOnboarding && pathname !== '/onboarding') {
        // New user needs onboarding
        router.push('/onboarding');
        return;
      }

      if (result.hasOrganization && pathname === '/onboarding') {
        // User has organization but is on onboarding page
        router.push('/dashboard');
        return;
      }

      setChecking(false);
    } catch (error) {
      console.error('Auth check error:', error);
      setChecking(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}