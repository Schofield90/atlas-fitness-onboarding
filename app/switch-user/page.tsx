"use client";

import { useState } from "react";
import { createClient } from "@/app/lib/supabase/client";
import { useRouter } from "next/navigation";
import { LogOut, LogIn, Users } from "lucide-react";

export default function SwitchUserPage() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const router = useRouter();
  const supabase = createClient();

  const loginAsClient = async () => {
    setLoading(true);
    setStatus("Logging in as client...");
    
    try {
      // First sign out current user
      await supabase.auth.signOut();
      
      // Login as client
      const { data, error } = await supabase.auth.signInWithPassword({
        email: "samschofield90@hotmail.co.uk",
        password: "@Aa80236661"
      });
      
      if (error) throw error;
      
      setStatus("Success! Redirecting to client dashboard...");
      setTimeout(() => {
        window.location.href = "/client/dashboard";
      }, 1000);
      
    } catch (error) {
      setStatus(`Error: ${error instanceof Error ? error.message : 'Login failed'}`);
      setLoading(false);
    }
  };

  const loginAsOwner = async () => {
    setLoading(true);
    setStatus("Logging in as owner...");
    
    try {
      // First sign out current user
      await supabase.auth.signOut();
      
      // Login as owner
      const { data, error } = await supabase.auth.signInWithPassword({
        email: "sam@atlas-gyms.co.uk",
        password: "@Aa80236661"
      });
      
      if (error) throw error;
      
      setStatus("Success! Redirecting to owner dashboard...");
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 1000);
      
    } catch (error) {
      setStatus(`Error: ${error instanceof Error ? error.message : 'Login failed'}`);
      setLoading(false);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setStatus("Logged out");
    router.push("/simple-login");
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <Users className="w-16 h-16 text-orange-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Switch User</h1>
          <p className="text-gray-400">Quick user switching for testing</p>
        </div>

        <div className="space-y-4">
          <button
            onClick={loginAsClient}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <LogIn className="w-5 h-5" />
            Login as Client (Member)
          </button>
          
          <button
            onClick={loginAsOwner}
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-lg font-medium transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <LogIn className="w-5 h-5" />
            Login as Owner (Gym)
          </button>
          
          <button
            onClick={logout}
            disabled={loading}
            className="w-full bg-red-600 hover:bg-red-700 text-white py-3 px-4 rounded-lg font-medium transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <LogOut className="w-5 h-5" />
            Logout Current User
          </button>
        </div>

        {status && (
          <div className={`mt-6 p-3 rounded-lg text-center ${
            status.includes('Error') ? 'bg-red-900/30 text-red-400' : 
            status.includes('Success') ? 'bg-green-900/30 text-green-400' : 
            'bg-gray-700 text-gray-300'
          }`}>
            {status}
          </div>
        )}

        <div className="mt-8 border-t border-gray-700 pt-6">
          <h3 className="text-sm font-semibold text-gray-400 mb-3">Test Accounts:</h3>
          <div className="space-y-3 text-sm">
            <div className="bg-gray-700/50 rounded p-3">
              <p className="text-blue-400 font-semibold">Client (Member):</p>
              <p className="text-gray-300">samschofield90@hotmail.co.uk</p>
              <p className="text-gray-500">Access: /client/* pages</p>
            </div>
            <div className="bg-gray-700/50 rounded p-3">
              <p className="text-green-400 font-semibold">Owner (Gym):</p>
              <p className="text-gray-300">sam@atlas-gyms.co.uk</p>
              <p className="text-gray-500">Access: /dashboard, /messages</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}