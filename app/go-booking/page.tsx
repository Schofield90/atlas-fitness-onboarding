'use client';

import { useEffect } from 'react';

export default function GoBooking() {
  useEffect(() => {
    // Set to booking mode
    localStorage.setItem('systemMode', 'booking');
    // Redirect to booking dashboard
    window.location.href = '/dashboard/overview';
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
        <p className="text-white">Switching to Booking System...</p>
      </div>
    </div>
  );
}