'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

export default function BookingLive() {
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [selectedClass, setSelectedClass] = useState<any>(null);
  
  const orgId = '63589490-8f55-4157-bd3a-e141594b740e';

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      // Direct API call to get classes
      const response = await fetch(`/api/booking/classes/${orgId}`);
      const data = await response.json();
      
      if (data.sessions) {
        setClasses(data.sessions);
      } else {
        // Fallback: try to fetch directly
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        const { data: sessions } = await supabase
          .from('class_sessions')
          .select(`
            *,
            programs (
              name,
              description,
              price_pennies
            )
          `)
          .eq('organization_id', orgId)
          .gte('start_time', new Date().toISOString())
          .order('start_time', { ascending: true })
          .limit(20);

        if (sessions) {
          setClasses(sessions);
        }
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBookClass = (classSession: any) => {
    setSelectedClass(classSession);
    setShowBookingForm(true);
  };

  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);

    try {
      // Create lead
      const leadResponse = await fetch('/api/public-api/create-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: orgId,
          name: formData.get('name'),
          email: formData.get('email'),
          phone: formData.get('phone')
        })
      });

      if (!leadResponse.ok) {
        throw new Error('Failed to create lead');
      }

      const { leadId } = await leadResponse.json();

      // Create booking
      const bookingResponse = await fetch('/api/booking/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: leadId,
          classSessionId: selectedClass.id
        })
      });

      const result = await bookingResponse.json();

      if (result.waitlistPosition) {
        alert(`Class is full! You've been added to the waitlist at position ${result.waitlistPosition}.`);
      } else {
        alert(`Booking confirmed! We'll send a confirmation to ${formData.get('email')}.`);
      }

      setShowBookingForm(false);
      fetchClasses(); // Refresh to show updated capacity
    } catch (error) {
      alert('Booking failed. Please try again.');
      console.error('Booking error:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg">Loading classes...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-2">Atlas Fitness</h1>
        <p className="text-gray-600 mb-8">Book Your Fitness Class</p>

        {classes.length === 0 ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h3 className="font-semibold text-yellow-900 mb-2">No Classes Available</h3>
            <p className="text-yellow-700">
              Please check back later or contact us for more information.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {classes.map((session) => {
              const startTime = new Date(session.start_time);
              const endTime = new Date(session.end_time);
              const spotsLeft = session.max_capacity - session.current_bookings;
              const isFull = spotsLeft <= 0;
              
              return (
                <div
                  key={session.id}
                  className={`bg-white rounded-lg shadow-md p-6 ${
                    isFull ? 'opacity-75' : ''
                  }`}
                >
                  <h3 className="text-lg font-semibold mb-2">
                    {session.programs?.name || session.name}
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    {session.programs?.description || session.description}
                  </p>
                  
                  <div className="space-y-2 text-sm">
                    <p>
                      <strong>Date:</strong> {startTime.toLocaleDateString()}
                    </p>
                    <p>
                      <strong>Time:</strong> {startTime.toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })} - {endTime.toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </p>
                    <p>
                      <strong>Location:</strong> {session.room_location || 'Main Studio'}
                    </p>
                    <p>
                      <strong>Price:</strong> {
                        session.programs?.price_pennies === 0 
                          ? 'Free' 
                          : `£${(session.programs?.price_pennies / 100).toFixed(2)}`
                      }
                    </p>
                    <p className={`font-semibold ${
                      isFull ? 'text-red-600' : spotsLeft <= 3 ? 'text-orange-600' : 'text-green-600'
                    }`}>
                      {isFull ? 'Class Full (Waitlist Available)' : `${spotsLeft} spots left`}
                    </p>
                  </div>

                  <button
                    onClick={() => handleBookClass(session)}
                    className={`mt-4 w-full py-2 px-4 rounded-lg font-medium ${
                      isFull
                        ? 'bg-orange-600 hover:bg-orange-700 text-white'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    {isFull ? 'Join Waitlist' : 'Book Now'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Booking Form Modal */}
      {showBookingForm && selectedClass && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-semibold mb-4">Complete Your Booking</h3>
            
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <p className="font-medium">{selectedClass.programs?.name || selectedClass.name}</p>
              <p className="text-sm text-gray-600">
                {new Date(selectedClass.start_time).toLocaleDateString()} at{' '}
                {new Date(selectedClass.start_time).toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </p>
            </div>

            <form onSubmit={handleSubmitBooking}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    name="email"
                    required
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number *
                  </label>
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