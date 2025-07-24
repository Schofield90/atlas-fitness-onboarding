'use client';

import React, { useState, useEffect } from 'react';
import BookingCalendar from './BookingCalendar';
import CustomerBookings from './CustomerBookings';

interface AuthenticatedBookingProps {
  user: any;
  gymId: string;
}

const AuthenticatedBooking: React.FC<AuthenticatedBookingProps> = ({ user, gymId }) => {
  const [activeTab, setActiveTab] = useState<'calendar' | 'my-bookings'>('calendar');
  const [hasPrograms, setHasPrograms] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkForPrograms();
  }, [gymId]);

  const checkForPrograms = async () => {
    try {
      const response = await fetch(`/api/gyms/${gymId}/programs`);
      const programs = await response.json();
      setHasPrograms(programs && programs.length > 0);
    } catch (error) {
      console.error('Error checking programs:', error);
      setHasPrograms(false);
    } finally {
      setLoading(false);
    }
  };

  const createSamplePrograms = async () => {
    try {
      const response = await fetch(`/api/gyms/${gymId}/programs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_samples'
        })
      });

      if (response.ok) {
        setHasPrograms(true);
        alert('Sample programs created successfully!');
      } else {
        alert('Failed to create sample programs. Please try again.');
      }
    } catch (error) {
      console.error('Error creating sample programs:', error);
      alert('Error creating sample programs.');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="text-lg text-gray-400">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-4"></div>
          Loading booking system...
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
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
            {!hasPrograms ? (
              <div className="bg-yellow-900/50 border border-yellow-600 rounded-lg p-6 text-center">
                <h3 className="text-lg font-semibold text-yellow-300 mb-2">
                  No Programs Set Up Yet
                </h3>
                <p className="text-yellow-200 mb-4">
                  Your gym doesn't have any fitness programs configured. Create some sample programs to get started.
                </p>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={createSamplePrograms}
                    className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    Create Sample Programs
                  </button>
                  <a
                    href="/booking/admin"
                    className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    Admin Panel
                  </a>
                </div>
              </div>
            ) : (
              <BookingCalendar
                organizationId={gymId}
                customerId={user.id}
                onBookClass={(booking) => {
                  setActiveTab('my-bookings');
                }}
              />
            )}
          </div>
        ) : (
          <div className="p-6">
            <CustomerBookings customerId={user.id} />
          </div>
        )}
      </div>

      {/* Admin Access for Gym Owners */}
      {user.role === 'admin' && (
        <div className="mt-6 bg-gray-800 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-white mb-3">Admin Tools</h3>
          <div className="flex gap-3">
            <a
              href="/booking/admin"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Manage Programs & Classes
            </a>
            <a
              href="/booking/setup"
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
              </svg>
              Setup Wizard
            </a>
          </div>
        </div>
      )}

      {/* Getting Started Info for New Gyms */}
      <div className="mt-6 bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-3">🚀 Booking System Features</h3>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-gray-700 rounded-lg p-4">
            <h4 className="font-medium text-white mb-2">Class Management</h4>
            <p className="text-gray-400 text-sm">Create programs, schedule classes, and manage capacity with ease.</p>
          </div>
          <div className="bg-gray-700 rounded-lg p-4">
            <h4 className="font-medium text-white mb-2">Automated Waitlists</h4>
            <p className="text-gray-400 text-sm">When classes fill up, customers automatically join the waitlist.</p>
          </div>
          <div className="bg-gray-700 rounded-lg p-4">
            <h4 className="font-medium text-white mb-2">Client Integration</h4>
            <p className="text-gray-400 text-sm">Bookings integrate with your existing client records and CRM.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthenticatedBooking;