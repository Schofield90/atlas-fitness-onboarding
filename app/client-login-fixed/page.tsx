"use client";

import { useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";

export default function ClientLoginFixed() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  const handleLogin = async () => {
    if (!email || !password) {
      setError("Please enter email and password");
      return;
    }
    
    setLoading(true);
    setError("");
    
    try {
      // Create a fresh Supabase client
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          auth: {
            persistSession: true,
            storageKey: 'supabase-auth-token',
            storage: typeof window !== 'undefined' ? window.localStorage : undefined,
          }
        }
      );
      
      // Sign out first to clear any existing session
      await supabase.auth.signOut();
      
      // Wait a moment
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Sign in with provided credentials
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (signInError) {
        setError(signInError.message);
        return;
      }
      
      if (!data.session) {
        setError("No session created");
        return;
      }
      
      // Store the session manually in localStorage as backup
      localStorage.setItem('client-auth-backup', JSON.stringify({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at,
        user: data.user
      }));
      
      // Verify the session is set
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        console.log("✅ Session verified:", session.user?.email);
        
        // Navigate to messages
        router.push("/client/messages");
      } else {
        setError("Session not persisted");
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-lg p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold text-white mb-6">Client Login (Fixed)</h1>
        
        <div className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter client email"
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          {error && (
            <div className="p-4 bg-red-900/30 border border-red-600 rounded">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}
          
          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white py-3 rounded font-semibold"
          >
            {loading ? "Logging in..." : "Login as Client"}
          </button>
          
          <div className="text-center text-gray-400 text-sm">
            <p>This login page:</p>
            <ul className="mt-2 text-left list-disc list-inside">
              <li>Clears any existing sessions</li>
              <li>Creates a fresh auth session</li>
              <li>Stores backup auth token</li>
              <li>Redirects to messages page</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}