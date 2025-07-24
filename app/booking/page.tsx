'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import BookingCalendar from '@/app/components/booking/BookingCalendar';
import CustomerBookings from '@/app/components/booking/CustomerBookings';
import DashboardLayout from '@/app/components/DashboardLayout';
import { createClient } from '@supabase/supabase-js';

export default function BookingPage() {
  const [activeTab, setActiveTab] = useState<'calendar' | 'my-bookings'>('calendar');
  const [user, setUser] = useState<any>(null);
  const [organization, setOrganization] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !authUser) {
          router.push('/login');
          return;
        }

        // Get user details
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*, organizations(*)')
          .eq('id', authUser.id)
          .single();

        if (userError || !userData) {
          console.error('Error fetching user data:', userError);
          return;
        }

        setUser(userData);
        setOrganization(userData.organizations);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-screen">
          <div className="text-lg text-gray-600">Loading...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (!user || !organization) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-screen">
          <div className="text-lg text-gray-600">Unable to load booking system</div>
        </div>
      </DashboardLayout>
    );
  }

  // For demo purposes, using the user ID as customer ID
  // In a real system, you'd have a separate customer/lead selection
  const customerId = user.id;

  return (
    <DashboardLayout>
      <div className="h-full flex flex-col">
        <div className="mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Class Booking</h1>
              <p className="text-gray-600 mt-2">Book and manage your fitness classes</p>
            </div>
            {user?.role === 'admin' && (
              <a
                href="/booking/admin"
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Admin Panel
              </a>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('calendar')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'calendar'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Book a Class
            </button>
            <button
              onClick={() => setActiveTab('my-bookings')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'my-bookings'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              My Bookings
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="flex-1 bg-white rounded-lg shadow">
          {activeTab === 'calendar' ? (
            <BookingCalendar
              organizationId={organization.id}
              customerId={customerId}
              onBookClass={(booking) => {
                // Optionally switch to My Bookings tab after booking
                setActiveTab('my-bookings');
              }}
            />
          ) : (
            <div className="p-6">
              <CustomerBookings customerId={customerId} />
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}