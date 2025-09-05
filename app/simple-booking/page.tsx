'use client';
import Link from 'next/link'
import { useState, useEffect } from 'react';

export default function SimpleBooking() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const orgId = '63589490-8f55-4157-bd3a-e141594b740e';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Use the API that we know works
      const response = await fetch('/api/debug/get-org-id');
      const result = await response.json();
      
      setData(result);
    } catch (error) {
      setData({ error: 'Failed to fetch data' });
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Atlas Fitness - Book a Class</h1>
        
        {data?.success && data?.organization && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">{data.organization.name}</h2>
            <p className="text-gray-600 mb-4">Organization ID: {data.organization.id}</p>
            
            <div className="bg-blue-50 p-4 rounded">
              <p className="font-medium mb-2">To complete your booking setup:</p>
              <ol className="list-decimal list-inside space-y-2 text-sm">
                <li>Go to your <Link href="/emergency" className="text-blue-600 underline">Emergency Access page</Link></li>
                <li>Click "Step 2: Create Sample Data" to add fitness programs and classes</li>
                <li>Then return here to view available classes</li>
              </ol>
            </div>
          </div>
        )}

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-semibold text-yellow-900 mb-2">Debug Information:</h3>
          <pre className="text-xs overflow-auto">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}