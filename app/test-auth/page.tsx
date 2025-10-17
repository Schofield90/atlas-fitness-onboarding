'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function TestAuthPage() {
  const [status, setStatus] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      // Check current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      // Check current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      // Check organization membership
      let orgStatus = null;
      if (user) {
        try {
          const response = await fetch('/api/auth/check-membership');
          orgStatus = await response.json();
        } catch (e) {
          orgStatus = { error: 'Failed to check membership' };
        }
      }

      setStatus({
        session: session ? 'Active' : 'No session',
        sessionError: sessionError?.message,
        user: user ? user.email : 'Not logged in',
        userId: user?.id,
        userError: userError?.message,
        organization: orgStatus,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      setStatus({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const testLogin = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: 'samschofield90@hotmail.co.uk',
        password: prompt('Enter your password:') || ''
      });

      if (error) {
        alert(`Login failed: ${error.message}`);
      } else {
        alert('Login successful! Redirecting to dashboard...');
        router.push('/dashboard-direct');
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
      checkAuth();
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    checkAuth();
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">🔧 Auth Test Page</h1>
        
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Current Status</h2>
          {loading ? (
            <p>Checking authentication...</p>
          ) : (
            <pre className="bg-gray-900 p-4 rounded overflow-auto text-sm">
              {JSON.stringify(status, null, 2)}
            </pre>
          )}
        </div>

        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <button
              onClick={testLogin}
              disabled={loading}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              Test Login (samschofield90@hotmail.co.uk)
            </button>
            
            <button
              onClick={() => router.push('/dashboard-direct')}
              className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Go to Dashboard (Direct)
            </button>
            
            <button
              onClick={() => router.push('/login')}
              className="w-full px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
            >
              Go to Login Page
            </button>
            
            <button
              onClick={logout}
              disabled={loading}
              className="w-full px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
            >
              Logout
            </button>
            
            <button
              onClick={checkAuth}
              disabled={loading}
              className="w-full px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50"
            >
              Refresh Status
            </button>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Test Instructions</h2>
          <ol className="list-decimal list-inside space-y-2 text-gray-300">
            <li>Click "Test Login" and enter your password</li>
            <li>Check the status above to see if you're authenticated</li>
            <li>Click "Go to Dashboard" to test the dashboard access</li>
            <li>If you get stuck, click "Logout" and try again</li>
          </ol>
          
          <div className="mt-4 p-4 bg-yellow-900/20 border border-yellow-600 rounded">
            <p className="text-sm text-yellow-300">
              <strong>Note:</strong> This page bypasses normal authentication flow for testing. 
              The dashboard redirect goes to /dashboard-direct which doesn't require API calls.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}