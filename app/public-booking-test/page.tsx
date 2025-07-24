'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

export default function PublicBookingTest() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const orgId = '63589490-8f55-4157-bd3a-e141594b740e';

  useEffect(() => {
    testOrganizationFetch();
  }, []);

  const testOrganizationFetch = async () => {
    try {
      // Test 1: Direct Supabase query
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const { data, error, status } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', orgId);

      // Test 2: API endpoint
      const apiResponse = await fetch('/api/debug/get-org-id');
      const apiData = await apiResponse.json();

      setResult({
        supabaseQuery: {
          data,
          error,
          status,
          count: data?.length || 0
        },
        apiEndpoint: apiData,
        envVars: {
          hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
          hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        }
      });
    } catch (error) {
      setResult({ error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Public Booking Test</h1>
      <p className="mb-4">Testing organization fetch for ID: {orgId}</p>
      
      <div className="bg-gray-100 p-4 rounded">
        <pre className="text-xs overflow-auto">
          {JSON.stringify(result, null, 2)}
        </pre>
      </div>

      {result?.apiEndpoint?.success && (
        <div className="mt-4">
          <h2 className="text-lg font-semibold">Working Links:</h2>
          <a 
            href={`/public-booking/${orgId}`}
            className="text-blue-600 hover:underline block"
          >
            Public Booking Page
          </a>
          <a 
            href={result.apiEndpoint.urls.emergency_access}
            className="text-blue-600 hover:underline block"
          >
            Emergency Access
          </a>
        </div>
      )}
    </div>
  );
}