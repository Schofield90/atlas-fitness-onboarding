"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/app/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";

export default function QuickLogin() {
  const [status, setStatus] = useState("");
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);

  useEffect(() => {
    // Create client only on the client side
    const client = createClient();
    setSupabase(client);
  }, []);

  const loginAsOwner = async () => {
    if (!supabase) {
      setStatus("Initializing...");
      return;
    }
    
    setStatus("Logging in as owner...");
    
    try {
      // First sign out any existing user
      await supabase.auth.signOut();
      
      // Login as owner
      const { data, error } = await supabase.auth.signInWithPassword({
        email: "sam@atlas-gyms.co.uk",
        password: "@Aa80236661"
      });
      
      if (error) {
        setStatus(`Error: ${error.message}`);
        console.error("Login error:", error);
      } else {
        setStatus("Success! Redirecting to dashboard...");
        // Use window.location for a full page reload to ensure auth state is fresh
        setTimeout(() => {
          window.location.href = "/dashboard";
        }, 500);
      }
    } catch (err) {
      setStatus(`Error: ${err}`);
      console.error("Unexpected error:", err);
    }
  };

  const loginAsClient = async () => {
    if (!supabase) {
      setStatus("Initializing...");
      return;
    }
    
    setStatus("Logging in as client...");
    
    try {
      // First sign out any existing user
      await supabase.auth.signOut();
      
      // Login as client
      const { data, error } = await supabase.auth.signInWithPassword({
        email: "samschofield90@hotmail.co.uk",
        password: "@Aa80236661"
      });
      
      if (error) {
        setStatus(`Error: ${error.message}`);
        console.error("Login error:", error);
      } else {
        setStatus("Success! Redirecting to client dashboard...");
        // Use window.location for a full page reload
        setTimeout(() => {
          window.location.href = "/client/dashboard";
        }, 500);
      }
    } catch (err) {
      setStatus(`Error: ${err}`);
      console.error("Unexpected error:", err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="bg-gray-800 rounded-lg p-8 space-y-4 max-w-md w-full">
        <h1 className="text-2xl font-bold text-white mb-6">Quick Login</h1>
        
        <button
          onClick={loginAsOwner}
          className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-medium"
        >
          Login as Owner (sam@atlas-gyms.co.uk)
        </button>
        
        <button
          onClick={loginAsClient}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium"
        >
          Login as Client (samschofield90@hotmail.co.uk)
        </button>
        
        {status && (
          <div className={`mt-4 p-3 rounded text-center ${
            status.includes('Error') ? 'bg-red-900/30 text-red-400' : 
            status.includes('Success') ? 'bg-green-900/30 text-green-400' : 
            'bg-gray-700 text-gray-300'
          }`}>
            {status}
          </div>
        )}
      </div>
    </div>
  );
}