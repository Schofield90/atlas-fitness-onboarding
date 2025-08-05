'use client';

import { useState } from 'react';
import { createClient } from '@/app/lib/supabase/client';

export default function TestLogin() {
  const [email, setEmail] = useState('sam@atlas-gyms.co.uk');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    setMessage('');
    
    try {
      const supabase = createClient();
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setMessage('Error: ' + error.message);
      } else if (data?.user) {
        setMessage('Success! Redirecting...');
        window.location.href = '/dashboard';
      } else {
        setMessage('No user data returned');
      }
    } catch (err: any) {
      setMessage('Catch error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-gray-800 rounded-lg p-8">
        <h1 className="text-2xl font-bold text-white mb-6">Test Login</h1>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
              className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="Enter your password"
            />
          </div>
          
          <button
            onClick={handleLogin}
            disabled={loading || !password}
            className="w-full py-3 bg-orange-500 text-white font-medium rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
          
          {message && (
            <div className={message.includes('Error') ? 'p-4 rounded-lg bg-red-900/20 text-red-400' : 'p-4 rounded-lg bg-green-900/20 text-green-400'}>
              {message}
            </div>
          )}
        </div>
        
        <div className="mt-6 text-center">
          <a href="/login" className="text-blue-400 hover:text-blue-300">
            ← Back to normal login
          </a>
        </div>
      </div>
    </div>
  );
}