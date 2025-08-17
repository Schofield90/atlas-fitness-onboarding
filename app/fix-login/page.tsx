'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/app/lib/supabase/client';

export default function FixLoginPage() {
  const router = useRouter();
  const [status, setStatus] = useState('Checking authentication...');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    fixOrganization();
  }, []);

  const fixOrganization = async () => {
    try {
      // Check if user is authenticated
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        setError('You need to be logged in first. Redirecting to login...');
        setTimeout(() => {
          router.push('/login');
        }, 2000);
        return;
      }

      setStatus(`Found user: ${user.email}. Fixing organization membership...`);

      // Call the fix API
      const response = await fetch('/api/auth/fix-organization', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setSuccess(true);
        setStatus('✅ Organization membership fixed successfully! Redirecting to dashboard...');
        
        // Clear any cached data
        router.refresh();
        
        // Redirect to dashboard
        setTimeout(() => {
          router.push('/dashboard');
        }, 2000);
      } else {
        setError(result.error || 'Failed to fix organization membership');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl p-8 max-w-md w-full">
        <h1 className="text-2xl font-bold text-white mb-6">Fix Login Issue</h1>
        
        <div className="space-y-4">
          {!error && !success && (
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500"></div>
              <p className="text-gray-300">{status}</p>
            </div>
          )}
          
          {error && (
            <div className="bg-red-900/30 border border-red-600 rounded-lg p-4">
              <p className="text-red-400">{error}</p>
            </div>
          )}
          
          {success && (
            <div className="bg-green-900/30 border border-green-600 rounded-lg p-4">
              <p className="text-green-400">{status}</p>
            </div>
          )}
        </div>

        <div className="mt-8 space-y-3">
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white py-2 px-4 rounded-lg transition-colors"
          >
            Go to Dashboard
          </button>
          
          <button
            onClick={() => router.push('/login')}
            className="w-full bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-lg transition-colors"
          >
            Back to Login
          </button>
        </div>

        <div className="mt-6 p-4 bg-yellow-900/30 border border-yellow-600 rounded-lg">
          <p className="text-yellow-400 text-sm">
            <strong>Note:</strong> This page automatically adds you to the Atlas Fitness organization so you can access the dashboard.
          </p>
        </div>
      </div>
    </div>
  );
}