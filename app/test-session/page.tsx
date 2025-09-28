"use client";

import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";

export default function TestSessionPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const [session, setSession] = useState<any>(null);

  // Create a properly configured client
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setSession(session);
    setStatus(session ? `Logged in as ${session.user.email}` : "Not logged in");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("Logging in...");

    // Clear any existing session
    await supabase.auth.signOut();
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setStatus(`Error: ${error.message}`);
      return;
    }

    if (data?.session) {
      setStatus(`Success! Logged in as ${data.user.email}`);
      setSession(data.session);
      
      // Wait a bit then check if session persists
      setTimeout(async () => {
        const { data: { session: newSession } } = await supabase.auth.getSession();
        if (newSession) {
          setStatus(`Session persisted! Still logged in as ${newSession.user.email}`);
          
          // Try navigating to dashboard
          setTimeout(() => {
            window.location.href = "/dashboard";
          }, 2000);
        } else {
          setStatus("Session lost after login!");
        }
      }, 1000);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setStatus("Logged out");
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="bg-gray-800 rounded-lg p-8">
          <h1 className="text-2xl font-bold text-white mb-6">Session Test</h1>
          
          <div className="mb-6 p-4 bg-gray-700 rounded">
            <p className="text-white">Status: <span className="text-green-400">{status}</span></p>
            {session && (
              <div className="mt-2 text-sm text-gray-300">
                <p>Session ID: {session.access_token?.substring(0, 20)}...</p>
                <p>Expires: {new Date(session.expires_at * 1000).toLocaleString()}</p>
              </div>
            )}
          </div>

          {!session ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2 bg-gray-700 text-white rounded"
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-3 py-2 bg-gray-700 text-white rounded"
              />
              <button
                type="submit"
                className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Test Login
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              <button
                onClick={handleLogout}
                className="w-full py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Logout
              </button>
              <button
                onClick={checkSession}
                className="w-full py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Check Session
              </button>
              <button
                onClick={() => window.location.href = "/dashboard"}
                className="w-full py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
              >
                Go to Dashboard
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}