'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import BookingCalendar from '@/app/components/booking/BookingCalendar';
import { createClient } from '@supabase/supabase-js';

export default function PublicBookingPage() {
  const params = useParams();
  const organizationId = params.organizationId as string;
  const [organization, setOrganization] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [selectedClass, setSelectedClass] = useState<any>(null);

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    fetchOrganization();
  }, [organizationId]);

  const fetchOrganization = async () => {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', organizationId)
        .single();

      if (!error && data) {
        setOrganization(data);
      }
    } catch (error) {
      console.error('Error fetching organization:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBookClass = (classData: any) => {
    setSelectedClass(classData);
    setShowBookingForm(true);
  };

  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);

    // Create a lead/customer record
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .insert({
        organization_id: organizationId,
        name: formData.get('name') as string,
        email: formData.get('email') as string,
        phone: formData.get('phone') as string,
        source: 'public_booking',
        status: 'new'
      })
      .select()
      .single();

    if (leadError) {
      alert('Error creating booking. Please try again.');
      return;
    }

    // Create the booking
    try {
      const response = await fetch('/api/booking/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: lead.id,
          classSessionId: selectedClass.id
        })
      });

      const result = await response.json();

      if (result.waitlistPosition) {
        alert(`Class is full! You've been added to the waitlist at position ${result.waitlistPosition}.`);
      } else {
        alert(`Booking confirmed! We'll send a confirmation to ${formData.get('email')}.`);
      }

      setShowBookingForm(false);
      setSelectedClass(null);
    } catch (error) {
      alert('Error creating booking. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg text-gray-600">Organization not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{organization.name}</h1>
              <p className="text-gray-600 mt-1">Book Your Fitness Class</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Need help?</p>
              <p className="text-sm font-medium text-gray-900">Call us at 1-800-FITNESS</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-semibold mb-6">Available Classes</h2>
          
          {/* Info Banner */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex">
              <svg className="h-6 w-6 text-blue-600 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h3 className="text-sm font-medium text-blue-900">How to book:</h3>
                <p className="text-sm text-blue-700 mt-1">
                  Click on any available class in the calendar below to book your spot. 
                  Classes shown in green have availability, orange are nearly full, and red are completely full (waitlist available).
                </p>
              </div>
            </div>
          </div>

          {/* Calendar - Modified to handle public booking */}
          <div style={{ height: '600px' }}>
            <BookingCalendar
              organizationId={organizationId}
              customerId="public" // Temporary ID for public users
              onBookClass={handleBookClass}
            />
          </div>
        </div>
      </main>

      {/* Booking Form Modal */}
      {showBookingForm && selectedClass && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-semibold mb-4">Complete Your Booking</h3>
            
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <p className="font-medium">{selectedClass.program_name}</p>
              <p className="text-sm text-gray-600">
                {new Date(selectedClass.start_time).toLocaleDateString()} at {new Date(selectedClass.start_time).toLocaleTimeString()}
              </p>
              <p className="text-sm text-gray-600">{selectedClass.room_location || 'Main Studio'}</p>
            </div>

            <form onSubmit={handleSubmitBooking}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    name="name"
                    required
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input
                    type="email"
                    name="email"
                    required
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    name="phone"
                    required
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowBookingForm(false);
                    setSelectedClass(null);
                  }}
                  className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Confirm Booking
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}