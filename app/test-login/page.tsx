"use client";

import { useState } from "react";
import { createSessionClient } from "@/lib/supabase/client-with-session";

export default function TestLoginPage() {
  const [email, setEmail] = useState("sam@atlas-gyms.co.uk");
  const [password, setPassword] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testLogin = async () => {
    setLoading(true);
    setResult(null);
    
    try {
      console.log("🔐 Test: Creating Supabase client...");
      const supabase = createSessionClient();
      
      if (!supabase) {
        setResult({ error: "Failed to create Supabase client" });
        return;
      }
      
      console.log("🔐 Test: Clearing existing sessions...");
      await supabase.auth.signOut();
      
      console.log("🔐 Test: Attempting login...");
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        console.error("❌ Test: Login failed:", error);
        setResult({ 
          success: false, 
          error: error.message,
          details: error
        });
      } else {
        console.log("✅ Test: Login successful:", data);
        setResult({ 
          success: true, 
          user: data.user,
          session: data.session ? "Session created" : "No session"
        });
        
        // Test if session persists
        const { data: sessionCheck } = await supabase.auth.getSession();
        console.log("📋 Session check:", sessionCheck);
      }
    } catch (err: any) {
      console.error("💥 Test: Unexpected error:", err);
      setResult({ 
        error: err.message,
        stack: err.stack
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-6">Login Test Page</h1>
        
        <div className="bg-gray-800 rounded-lg p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              placeholder="Enter your password"
            />
          </div>
          
          <button
            onClick={testLogin}
            disabled={loading || !password}
            className="w-full px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
          >
            {loading ? "Testing..." : "Test Login"}
          </button>
          
          {result && (
            <div className="mt-6 p-4 bg-gray-700 rounded-lg">
              <pre className="text-sm text-white overflow-x-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
          
          <div className="mt-4 text-sm text-gray-400">
            <p>Check browser console for detailed logs</p>
            <p className="mt-2">Try with email: sam@atlas-gyms.co.uk</p>
          </div>
        </div>
      </div>
    </div>
  );
}