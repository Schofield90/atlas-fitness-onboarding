'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

export default function BookingTestPage() {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [organizations, setOrganizations] = useState<any[]>([]);

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    const { data, error } = await supabase
      .from('organizations')
      .select('id, name')
      .limit(1);

    if (data && data.length > 0) {
      setOrganizations(data);
      setMessage(`Found organization: ${data[0].name} (ID: ${data[0].id})`);
    } else {
      setMessage('No organizations found. You may need to create one first.');
    }
  };

  const runSetup = async () => {
    if (organizations.length === 0) {
      alert('No organization found to create data for.');
      return;
    }

    setLoading(true);
    setMessage('Creating sample data...');

    try {
      const response = await fetch('/api/booking/seed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();

      if (response.ok) {
        setMessage(`Success! Created ${result.data.programs} programs and ${result.data.sessions} class sessions.`);
        
        // Show links
        setTimeout(() => {
          setMessage(prev => prev + `\n\nYou can now access:\n- Public booking: /book/public/${organizations[0].id}\n- Admin panel: /booking/admin (requires login)`);
        }, 1000);
      } else {
        setMessage(`Setup failed: ${result.error}`);
      }
    } catch (error) {
      setMessage('Setup failed. Check console for errors.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Booking System Test Setup</h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Quick Setup (No Login Required)</h2>
          
          <div className="mb-6">
            <pre className="bg-gray-100 p-4 rounded text-sm whitespace-pre-wrap">{message}</pre>
          </div>

          <button
            onClick={runSetup}
            disabled={loading || organizations.length === 0}
            className={`w-full py-3 px-4 rounded-lg font-medium ${
              loading || organizations.length === 0
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {loading ? 'Creating Sample Data...' : 'Run Setup'}
          </button>
        </div>

        {organizations.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">Test URLs:</h3>
            <div className="space-y-2 text-sm">
              <p>
                <strong>Public Booking (No Login):</strong><br />
                <a 
                  href={`/book/public/${organizations[0].id}`}
                  className="text-blue-600 hover:underline"
                  target="_blank"
                >
                  /book/public/{organizations[0].id}
                </a>
              </p>
              <p className="text-gray-600 text-xs">
                ↑ Share this link with customers - they can book without creating an account
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}