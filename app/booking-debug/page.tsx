'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

export default function BookingDebug() {
  const [data, setData] = useState<any>({});
  const [loading, setLoading] = useState(true);
  
  const orgId = '63589490-8f55-4157-bd3a-e141594b740e';

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      // Test 1: Get all programs
      const { data: programs, error: programError } = await supabase
        .from('programs')
        .select('*')
        .eq('organization_id', orgId);

      // Test 2: Get ALL class sessions (no date filter)
      const { data: allSessions, error: sessionError } = await supabase
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
        .order('start_time', { ascending: false })
        .limit(10);

      // Test 3: Get future sessions only
      const { data: futureSessions } = await supabase
        .from('class_sessions')
        .select('*')
        .eq('organization_id', orgId)
        .gte('start_time', new Date().toISOString())
        .order('start_time', { ascending: true });

      // Test 4: Try API endpoint
      let apiData = null;
      try {
        const response = await fetch(`/api/booking/classes/${orgId}`);
        apiData = await response.json();
      } catch (e) {
        apiData = { error: 'API call failed' };
      }

      setData({
        timestamp: new Date().toISOString(),
        organizationId: orgId,
        programs: {
          count: programs?.length || 0,
          error: programError?.message,
          data: programs
        },
        allSessions: {
          count: allSessions?.length || 0,
          error: sessionError?.message,
          data: allSessions
        },
        futureSessions: {
          count: futureSessions?.length || 0,
          data: futureSessions
        },
        apiEndpoint: apiData,
        environment: {
          hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
          hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        }
      });
    } catch (error) {
      setData({ error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setLoading(false);
    }
  };

  const createNewSessions = async () => {
    try {
      const response = await fetch('/api/debug/force-create-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId: orgId })
      });
      const result = await response.json();
      
      console.log('Create sessions result:', result);
      
      if (result.created) {
        let message = `Created ${result.created.programs} programs and ${result.created.sessions} sessions!\n`;
        message += `Verified: ${result.verified.programs} programs, ${result.verified.sessions} sessions\n`;
        
        if (result.created.programErrors && result.created.programErrors.length > 0) {
          message += `\nProgram Errors:\n`;
          result.created.programErrors.forEach((e: any) => {
            message += `- ${e.program}: ${e.error}\n`;
          });
        }
        
        if (result.created.sessionError) {
          message += `\nSession Error: ${result.created.sessionError}`;
        }
        
        alert(message);
      } else {
        alert(`Error: ${result.error || 'Unknown error'}\n${result.details || ''}`);
      }
      
      fetchAllData(); // Reload data
    } catch (error) {
      alert('Failed to create sessions');
    }
  };

  if (loading) {
    return <div className="p-8">Loading debug data...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Booking System Debug</h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="space-x-4">
            <button
              onClick={createNewSessions}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Create Fresh Sessions (Next 2 Weeks)
            </button>
            <button
              onClick={async () => {
                const response = await fetch('/api/debug/test-insert', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ organizationId: orgId })
                });
                const result = await response.json();
                console.log('Insert test results:', result);
                alert(`Insert Test Results:\n${JSON.stringify(result.summary, null, 2)}\n\nCheck console for details`);
              }}
              className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
            >
              Test Insert (Debug)
            </button>
            <button
              onClick={fetchAllData}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Refresh Data
            </button>
            <a
              href="/booking-live"
              className="inline-block px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
            >
              Go to Booking Page
            </a>
          </div>
        </div>

        <div className="space-y-6">
          {/* Programs Summary */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-2">
              Programs ({data.programs?.count || 0})
            </h3>
            {data.programs?.error && (
              <p className="text-red-600 text-sm mb-2">Error: {data.programs.error}</p>
            )}
            {data.programs?.data?.map((program: any) => (
              <div key={program.id} className="mb-2 p-2 bg-gray-50 rounded">
                <p className="font-medium">{program.name}</p>
                <p className="text-sm text-gray-600">
                  £{(program.price_pennies / 100).toFixed(2)} - Max: {program.max_participants}
                </p>
              </div>
            ))}
          </div>

          {/* Sessions Summary */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-2">
              All Sessions ({data.allSessions?.count || 0})
            </h3>
            {data.allSessions?.error && (
              <p className="text-red-600 text-sm mb-2">Error: {data.allSessions.error}</p>
            )}
            <div className="space-y-2">
              {data.allSessions?.data?.slice(0, 5).map((session: any) => (
                <div key={session.id} className="p-3 bg-gray-50 rounded">
                  <p className="font-medium">{session.name}</p>
                  <p className="text-sm">
                    {new Date(session.start_time).toLocaleString()} - 
                    {session.session_status} - 
                    {session.current_bookings}/{session.max_capacity} booked
                  </p>
                  <p className="text-xs text-gray-500">
                    Created: {new Date(session.created_at).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
            <p className="mt-2 text-sm text-gray-600">
              Future sessions: {data.futureSessions?.count || 0}
            </p>
          </div>

          {/* Full Debug Data */}
          <div className="bg-gray-100 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-2">Full Debug Data</h3>
            <pre className="text-xs overflow-auto max-h-96 bg-white p-4 rounded">
              {JSON.stringify(data, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}