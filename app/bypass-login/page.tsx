'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/app/lib/supabase/client';

export default function BypassLogin() {
  const [message, setMessage] = useState('Attempting bypass login...');

  useEffect(() => {
    const bypassLogin = async () => {
      try {
        const supabase = createClient();
        
        // Try to get current session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          setMessage('Session found! Redirecting to dashboard...');
          setTimeout(() => {
            window.location.href = '/dashboard';
          }, 1000);
        } else {
          // Try anonymous sign in
          const { data, error } = await supabase.auth.signInAnonymously();
          
          if (error) {
            setMessage('Cannot bypass login. Please use test-login page with your password.');
          } else {
            setMessage('Anonymous session created. Redirecting...');
            setTimeout(() => {
              window.location.href = '/dashboard';
            }, 1000);
          }
        }
      } catch (err: any) {
        setMessage('Error: ' + err.message);
      }
    };
    
    bypassLogin();
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
        <p className="text-white text-lg">{message}</p>
        
        <div className="mt-8">
          <a href="/test-login" className="text-blue-400 hover:text-blue-300">
            Go to test login page
          </a>
        </div>
      </div>
    </div>
  );
}