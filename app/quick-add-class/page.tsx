'use client';
import Link from 'next/link'
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getCurrentUserOrganization } from '@/lib/organization-service';

export default function QuickAddClass() {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const addClassForToday = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/quick-add-class', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        setMessage(`Error: ${data.error}`);
      } else {
        setMessage(`Success! ${data.message}`);
        // Redirect to dashboard after 2 seconds
        setTimeout(() => {
          window.location.href = '/dashboard/overview';
        }, 2000);
      }
    } catch (error: any) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold text-white mb-4">Quick Add Class</h1>
        
        <button
          onClick={addClassForToday}
          disabled={loading}
          className="w-full px-4 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
        >
          {loading ? 'Adding...' : 'Add 5 Test Classes (Next 3 Days)'}
        </button>
        
        {message && (
          <div className={`mt-4 p-4 rounded-lg ${message.includes('Error') ? 'bg-red-900/20 text-red-400' : 'bg-green-900/20 text-green-400'}`}>
            {message}
          </div>
        )}
        
        <div className="mt-4">
          <Link href="/dashboard/overview" className="text-blue-400 hover:text-blue-300">
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}