'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function BookingDirectPage() {
  const router = useRouter();

  useEffect(() => {
    // Common organization IDs - we'll try the most likely one
    // Based on your screenshot showing "Atlas Performance Gym"
    const possibleOrgIds = [
      'atlas-performance-gym', // Common slug format
      'atlas_performance_gym', // Underscore format
      // Add the actual UUID if you know it
    ];

    // For now, let's create a simple interface to help find it
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Direct Booking Links</h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Manual Setup Instructions</h2>
          
          <ol className="list-decimal list-inside space-y-4 text-gray-700">
            <li>
              <strong>Find your Organization ID:</strong>
              <p className="ml-6 text-sm text-gray-600 mt-1">
                Go to your Supabase dashboard → Table Editor → organizations table → copy the ID for "Atlas Performance Gym"
              </p>
            </li>
            
            <li>
              <strong>Create sample data manually in Supabase:</strong>
              <div className="ml-6 mt-2 space-y-3">
                <div className="bg-gray-100 p-3 rounded text-sm">
                  <p className="font-medium mb-1">In the "programs" table, add:</p>
                  <pre className="text-xs">{`{
  "name": "HIIT Class",
  "organization_id": "[your-org-id]",
  "price_pennies": 1500,
  "max_participants": 15,
  "program_type": "ongoing",
  "is_active": true
}`}</pre>
                </div>
                
                <div className="bg-gray-100 p-3 rounded text-sm">
                  <p className="font-medium mb-1">In the "class_sessions" table, add:</p>
                  <pre className="text-xs">{`{
  "organization_id": "[your-org-id]",
  "program_id": "[program-id-from-above]",
  "name": "Morning HIIT",
  "start_time": "${new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()}",
  "end_time": "${new Date(Date.now() + 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString()}",
  "max_capacity": 15,
  "current_bookings": 0,
  "room_location": "Studio A",
  "session_status": "scheduled"
}`}</pre>
                </div>
              </div>
            </li>
            
            <li>
              <strong>Access your booking page:</strong>
              <p className="ml-6 text-sm text-gray-600 mt-1">
                Replace [your-org-id] with your actual organization ID:
              </p>
              <div className="ml-6 mt-2 bg-blue-50 p-3 rounded">
                <code className="text-sm">
                  https://atlas-fitness-onboarding.vercel.app/book/public/[your-org-id]
                </code>
              </div>
            </li>
          </ol>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-semibold text-yellow-900 mb-2">Alternative: Quick Test</h3>
          <p className="text-sm text-yellow-700">
            If you just want to see the UI without real data, you can visit the booking page with a dummy ID. 
            It will show "No classes available" but you can see the interface:
          </p>
          <a 
            href="/book/public/test-123"
            className="inline-block mt-2 text-blue-600 hover:underline text-sm"
          >
            View booking UI with test data →
          </a>
        </div>
      </div>
    </div>
  );
}