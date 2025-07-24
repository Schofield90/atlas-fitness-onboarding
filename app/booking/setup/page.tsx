'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/app/components/DashboardLayout';
import { createClient } from '@supabase/supabase-js';

export default function BookingSetupPage() {
  const [loading, setLoading] = useState(false);
  const [organization, setOrganization] = useState<any>(null);
  const [setupComplete, setSetupComplete] = useState(false);
  const [publicUrl, setPublicUrl] = useState('');
  const router = useRouter();

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      router.push('/login');
      return;
    }

    const { data: userData } = await supabase
      .from('users')
      .select('*, organizations(*)')
      .eq('id', user.id)
      .single();

    if (userData?.organizations) {
      setOrganization(userData.organizations);
      setPublicUrl(`${window.location.origin}/book/public/${userData.organizations.id}`);
    }
  };

  const handleSetup = async () => {
    setLoading(true);
    
    try {
      const response = await fetch('/api/booking/seed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();

      if (response.ok) {
        setSetupComplete(true);
      } else {
        alert(`Setup failed: ${result.error}`);
      }
    } catch (error) {
      alert('Setup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Booking System Setup</h1>

        {!setupComplete ? (
          <div className="bg-white rounded-lg shadow-md p-8">
            <h2 className="text-xl font-semibold mb-4">Quick Setup</h2>
            <p className="text-gray-600 mb-6">
              Click the button below to automatically create sample programs and classes for testing the booking system.
            </p>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h3 className="font-medium text-blue-900 mb-2">This will create:</h3>
              <ul className="list-disc list-inside text-blue-700 space-y-1">
                <li>4 fitness programs (HIIT, Strength Training, Yoga, Free Trial)</li>
                <li>Multiple class sessions for the next 7 days</li>
                <li>Various time slots throughout each day</li>
                <li>Some classes pre-filled to demonstrate waitlist functionality</li>
              </ul>
            </div>

            <button
              onClick={handleSetup}
              disabled={loading}
              className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                loading
                  ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {loading ? 'Setting up...' : 'Run Setup'}
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <div className="flex items-start">
                <svg className="h-6 w-6 text-green-600 mr-3 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h3 className="text-lg font-semibold text-green-900">Setup Complete!</h3>
                  <p className="text-green-700 mt-1">
                    Sample programs and classes have been created successfully.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold mb-4">Next Steps</h3>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900">1. Test Internal Booking</h4>
                  <p className="text-gray-600 text-sm mt-1">For logged-in users (staff/members)</p>
                  <a
                    href="/booking"
                    className="inline-flex items-center mt-2 text-blue-600 hover:text-blue-800"
                  >
                    Go to Booking Page →
                  </a>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900">2. Manage Classes</h4>
                  <p className="text-gray-600 text-sm mt-1">Add, edit, or remove programs and classes</p>
                  <a
                    href="/booking/admin"
                    className="inline-flex items-center mt-2 text-blue-600 hover:text-blue-800"
                  >
                    Go to Admin Panel →
                  </a>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900">3. Public Booking Page</h4>
                  <p className="text-gray-600 text-sm mt-1">Share this link with customers for public bookings</p>
                  <div className="mt-2 p-3 bg-gray-50 rounded border border-gray-200">
                    <code className="text-sm break-all">{publicUrl}</code>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(publicUrl);
                      alert('URL copied to clipboard!');
                    }}
                    className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                  >
                    Copy URL
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-medium text-yellow-900 mb-1">Testing Tips</h4>
              <ul className="list-disc list-inside text-yellow-700 text-sm space-y-1">
                <li>Some classes are pre-filled to test waitlist functionality</li>
                <li>Try booking a full class to see the waitlist in action</li>
                <li>Cancel a booking from a full class to trigger auto-booking from waitlist</li>
                <li>Test the 24-hour cancellation policy by trying to cancel upcoming classes</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}