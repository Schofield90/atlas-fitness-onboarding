'use client';

import { useState } from 'react';

export default function EmergencyAccess() {
  const [orgId, setOrgId] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const findOrganization = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/debug/org');
      const data = await response.json();
      setResult(data);
      
      if (data.organization?.id) {
        setOrgId(data.organization.id);
      }
    } catch (error) {
      setResult({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
    setLoading(false);
  };

  const createSeedData = async () => {
    if (!orgId) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/debug/seed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId: orgId })
      });
      const data = await response.json();
      setResult({ ...result, seedData: data });
    } catch (error) {
      setResult({ 
        ...result, 
        seedError: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">🚨 Emergency Access Panel</h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Step 1: Find Your Organization</h2>
          <button 
            onClick={findOrganization} 
            disabled={loading}
            className={`px-6 py-3 rounded-lg font-medium ${
              loading 
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {loading ? 'Finding...' : 'Find Atlas Performance Gym ID'}
          </button>
        </div>

        {orgId && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-green-900 mb-4">
              ✅ Organization Found: {result?.organization?.name}
            </h3>
            <p className="text-sm text-green-700 mb-4">ID: <code>{orgId}</code></p>
            
            <div className="space-y-3">
              <button 
                onClick={createSeedData} 
                disabled={loading}
                className={`block px-6 py-3 rounded-lg font-medium ${
                  loading 
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                {loading ? 'Creating...' : 'Step 2: Create Sample Data'}
              </button>
              
              <div className="flex gap-3">
                <a 
                  href={`/book/public/${orgId}`} 
                  target="_blank"
                  className="inline-block px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium"
                >
                  🎯 Test Public Booking Page
                </a>
                
                <a 
                  href="/booking/admin" 
                  target="_blank"
                  className="inline-block px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium"
                >
                  ⚙️ Admin Panel (Login Required)
                </a>
              </div>
            </div>
          </div>
        )}

        {result?.seedData && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-4">
              🎉 Sample Data Created Successfully!
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p><strong>Programs Created:</strong> {result.seedData.programs}</p>
                <p><strong>Class Sessions:</strong> {result.seedData.sessions}</p>
              </div>
              <div>
                <p className="text-blue-700">
                  Your booking system is now ready to test with realistic data including:
                </p>
                <ul className="list-disc list-inside text-blue-600 text-xs mt-2">
                  <li>6-Week Transformation Challenge (£197)</li>
                  <li>28-Day Kickstart (£147)</li>
                  <li>HIIT Blast (£15/class)</li>
                  <li>Free Trial Sessions</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {result && (
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">🔍 Debug Results:</h3>
            <pre className="bg-white p-4 rounded border text-xs overflow-auto max-h-96">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-6">
          <h3 className="font-semibold text-yellow-900 mb-2">📝 What This Does:</h3>
          <ul className="text-sm text-yellow-700 space-y-1">
            <li>• Bypasses authentication using service role key</li>
            <li>• Finds your Atlas Performance Gym organization</li>
            <li>• Creates realistic fitness programs and class schedules</li>
            <li>• Provides direct links to test the booking system</li>
            <li>• The public booking page works without any login</li>
          </ul>
        </div>
      </div>
    </div>
  );
}