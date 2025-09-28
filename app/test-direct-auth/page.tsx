"use client";

import { useState } from "react";
import { createClient } from "@/app/lib/supabase/client";

export default function TestDirectAuth() {
  const [status, setStatus] = useState("");
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    console.log(message);
    setLogs(prev => [...prev, `${new Date().toISOString().split('T')[1].slice(0, 8)} - ${message}`]);
  };

  const testDirectAuth = async () => {
    setLogs([]);
    setStatus("Testing...");
    
    try {
      const supabase = createClient();
      
      // Test 1: Check current session
      addLog("Checking current session...");
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      addLog(`Current session: ${currentSession ? 'EXISTS' : 'NONE'}`);
      if (currentSession) {
        addLog(`User email: ${currentSession.user?.email}`);
      }

      // Test 2: Try sign in
      addLog("Attempting sign in...");
      const { data, error } = await supabase.auth.signInWithPassword({
        email: "samschofield90@hotmail.co.uk",
        password: "@Aa80236661",
      });

      if (error) {
        addLog(`Sign in error: ${error.message}`);
        setStatus("Failed");
        return;
      }

      addLog(`Sign in successful!`);
      addLog(`User ID: ${data.user?.id}`);
      addLog(`Email: ${data.user?.email}`);
      addLog(`Session token: ${data.session?.access_token?.slice(0, 20)}...`);

      // Test 3: Verify session is stored
      addLog("Verifying session storage...");
      const { data: { session: newSession } } = await supabase.auth.getSession();
      addLog(`Session after login: ${newSession ? 'EXISTS' : 'NONE'}`);

      // Test 4: Try to get user
      addLog("Getting current user...");
      const { data: { user } } = await supabase.auth.getUser();
      addLog(`Current user: ${user?.email || 'NONE'}`);

      setStatus("Success! Session established");

      // Test 5: Manual navigation
      setTimeout(() => {
        addLog("Attempting navigation to /client/dashboard...");
        window.location.href = "/client/dashboard";
      }, 2000);

    } catch (err) {
      addLog(`Error: ${err instanceof Error ? err.message : String(err)}`);
      setStatus("Error");
    }
  };

  const testLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    addLog("Signed out");
    setStatus("Logged out");
  };

  const navigateDashboard = () => {
    window.location.href = "/client/dashboard";
  };

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-6">Authentication Test Page</h1>
        
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">Test Controls</h2>
          <div className="space-x-4">
            <button
              onClick={testDirectAuth}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Test Direct Auth
            </button>
            <button
              onClick={testLogout}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Sign Out
            </button>
            <button
              onClick={navigateDashboard}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Go to Dashboard
            </button>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">Status</h2>
          <p className={`text-lg font-mono ${
            status === 'Success! Session established' ? 'text-green-400' : 
            status === 'Failed' ? 'text-red-400' : 
            'text-yellow-400'
          }`}>
            {status || 'Ready'}
          </p>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Logs</h2>
          <div className="bg-gray-900 rounded p-4 h-64 overflow-y-auto">
            {logs.length === 0 ? (
              <p className="text-gray-500">No logs yet. Click "Test Direct Auth" to begin.</p>
            ) : (
              logs.map((log, i) => (
                <div key={i} className="text-gray-300 font-mono text-sm mb-1">
                  {log}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="mt-6 text-gray-400 text-sm">
          <p>Test credentials:</p>
          <p>Email: samschofield90@hotmail.co.uk</p>
          <p>Password: @Aa80236661</p>
        </div>
      </div>
    </div>
  );
}