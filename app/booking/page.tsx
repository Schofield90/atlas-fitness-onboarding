'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import BookingCalendar from '@/app/components/booking/BookingCalendar';
import CustomerBookings from '@/app/components/booking/CustomerBookings';
import DashboardLayout from '@/app/components/DashboardLayout';

export default function BookingPage() {
  const [activeTab, setActiveTab] = useState<'calendar' | 'my-bookings'>('calendar');
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Use the same auth system as dashboard - localStorage trial data
    const storedData = localStorage.getItem('gymleadhub_trial_data');
    if (storedData) {
      setUserData(JSON.parse(storedData));
    }
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <DashboardLayout userData={userData}>
        <div className="flex justify-center items-center h-screen">
          <div className="text-lg text-gray-400">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-4"></div>
            Loading booking system...
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!userData) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Welcome to Gymleadhub!</h1>
          <p className="text-gray-300 mb-8">Please sign up to access the booking system.</p>
          <button 
            onClick={() => router.push('/signup')}
            className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-6 rounded-lg transition-colors"
          >
            Start Free Trial
          </button>
        </div>
      </div>
    );
  }

  // For demo purposes, use a demo organization ID
  const organizationId = userData.organizationId || '63589490-8f55-4157-bd3a-e141594b740e'; // Atlas Fitness demo ID
  const customerId = userData.id || 'demo-customer-id';

  return (
    <DashboardLayout userData={userData}>
      <div className="h-full flex flex-col">
        <div className="mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Class Booking</h1>
              <p className="text-gray-300">Book and manage your fitness classes</p>
            </div>
            {userData?.role === 'admin' && (
              <a
                href="/booking/admin"
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
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
        <div className="border-b border-gray-700 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('calendar')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'calendar'
                  ? 'border-orange-500 text-orange-500'
                  : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-600'
              }`}
            >
              Book a Class
            </button>
            <button
              onClick={() => setActiveTab('my-bookings')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'my-bookings'
                  ? 'border-orange-500 text-orange-500'
                  : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-600'
              }`}
            >
              My Bookings
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="flex-1 bg-gray-800 rounded-lg">
          {activeTab === 'calendar' ? (
            <div className="p-6">
              <div className="bg-yellow-900/50 border border-yellow-600 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-yellow-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div>
                    <h4 className="font-medium text-yellow-300 mb-1">Demo Mode</h4>
                    <p className="text-sm text-yellow-200">
                      The booking system is in demo mode. Click "Create Demo Classes" to populate the calendar with sample fitness classes.
                    </p>
                    <div className="flex gap-2 mt-2">
                      <button 
                        onClick={async () => {
                          try {
                            const response = await fetch('/api/booking/create-demo-data', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' }
                            });
                            const result = await response.json();
                            if (result.success) {
                              alert('Demo classes created successfully! The page will refresh.');
                              window.location.reload();
                            } else {
                              alert(result.message || 'Failed to create demo data');
                            }
                          } catch (error) {
                            alert('Error creating demo data');
                          }
                        }}
                        className="text-xs bg-orange-600 hover:bg-orange-700 text-white px-3 py-1 rounded transition-colors"
                      >
                        Create Demo Classes
                      </button>
                      <button 
                        onClick={() => router.push('/booking/setup')}
                        className="text-xs bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1 rounded transition-colors"
                      >
                        Setup Page
                      </button>
                      <button 
                        onClick={() => router.push('/booking-debug')}
                        className="text-xs bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded transition-colors"
                      >
                        Debug Page
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              
              <BookingCalendar
                organizationId={organizationId}
                customerId={customerId}
                onBookClass={(booking) => {
                  // Optionally switch to My Bookings tab after booking
                  setActiveTab('my-bookings');
                }}
              />
            </div>
          ) : (
            <div className="p-6">
              <CustomerBookings customerId={customerId} />
            </div>
          )}
        </div>

        {/* Getting Started Info */}
        <div className="mt-6 bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-3">🚀 Getting Started with Booking</h3>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-gray-700 rounded-lg p-4">
              <h4 className="font-medium text-white mb-2">1. View Available Classes</h4>
              <p className="text-gray-400 text-sm">Browse the calendar to see all upcoming fitness classes and their availability.</p>
            </div>
            <div className="bg-gray-700 rounded-lg p-4">
              <h4 className="font-medium text-white mb-2">2. Book Your Spot</h4>
              <p className="text-gray-400 text-sm">Click any class to view details and secure your spot. Join waitlist if full.</p>
            </div>
            <div className="bg-gray-700 rounded-lg p-4">
              <h4 className="font-medium text-white mb-2">3. Manage Bookings</h4>
              <p className="text-gray-400 text-sm">View your bookings, cancel up to 24hrs before, and track attendance.</p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}