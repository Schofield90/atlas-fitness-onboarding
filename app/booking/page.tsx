'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import BookingDemo from '@/app/components/booking/BookingDemo';
import AuthenticatedBooking from '@/app/components/booking/AuthenticatedBooking';
import DashboardLayout from '@/app/components/DashboardLayout';

export default function BookingPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [authMode, setAuthMode] = useState<'demo' | 'authenticated'>('demo');
  const router = useRouter();

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    checkAuthentication();
  }, []);

  const checkAuthentication = async () => {
    try {
      // First check if user is authenticated with Supabase
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      if (authUser) {
        // Get user's gym information
        const { data: userData } = await supabase
          .from('users')
          .select('*, gyms(*)')
          .eq('id', authUser.id)
          .single();
          
        if (userData && userData.gyms) {
          setUser(userData);
          setAuthMode('authenticated');
        } else {
          // User exists but no gym - show demo with signup CTA
          setAuthMode('demo');
        }
      } else {
        // Check for trial data (fallback for existing demo users)
        const storedData = localStorage.getItem('gymleadhub_trial_data');
        if (storedData) {
          // Show demo for trial users
          setAuthMode('demo');
        } else {
          // No auth at all - show demo
          setAuthMode('demo');
        }
      }
    } catch (error) {
      console.error('Auth check error:', error);
      setAuthMode('demo');
    } finally {
      setLoading(false);
    }
  };

  const handleSignupClick = () => {
    router.push('/signup');
  };

  if (loading) {
    return (
      <DashboardLayout userData={user}>
        <div className="flex justify-center items-center h-screen">
          <div className="text-lg text-gray-400">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-4"></div>
            Loading booking system...
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userData={user}>
      <div className="h-full flex flex-col">
        <div className="mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Class Booking</h1>
              <p className="text-gray-300">
                {authMode === 'demo' 
                  ? 'Interactive demo - See how our booking system works'
                  : 'Book and manage your fitness classes'
                }
              </p>
            </div>
          </div>
        </div>

        {/* Render appropriate booking system based on auth mode */}
        {authMode === 'demo' ? (
          <BookingDemo onSignupClick={handleSignupClick} />
        ) : (
          <AuthenticatedBooking 
            user={user} 
            gymId={user.gyms.id}
          />
        )}
      </div>
    </DashboardLayout>
  );
}