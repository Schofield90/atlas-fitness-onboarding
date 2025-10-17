"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export default function DebugAuth() {
  const [authInfo, setAuthInfo] = useState<any>({});
  const [cookies, setCookies] = useState<string[]>([]);
  
  useEffect(() => {
    checkAuth();
    checkCookies();
  }, []);
  
  const checkAuth = async () => {
    const supabase = createClient();
    
    // Get session
    const { data: { session } } = await supabase.auth.getSession();
    
    // Get user
    const { data: { user } } = await supabase.auth.getUser();
    
    setAuthInfo({
      sessionExists: !!session,
      sessionUser: session?.user?.email || "No session",
      getUserEmail: user?.email || "No user",
      getUserId: user?.id || "No ID",
      accessToken: session?.access_token?.substring(0, 20) + "..." || "No token",
      expiresAt: session?.expires_at || "N/A",
      localStorage: {
        authToken: localStorage.getItem('sb-lzlrojoaxrqvmhempnkn-auth-token')?.substring(0, 20) + "..." || "None"
      }
    });
  };
  
  const checkCookies = () => {
    const allCookies = document.cookie.split(';').map(c => c.trim());
    const supabaseCookies = allCookies.filter(c => 
      c.includes('sb-') || c.includes('auth') || c.includes('session')
    );
    setCookies(supabaseCookies);
  };
  
  const testAPIDirectly = async () => {
    try {
      const response = await fetch("/api/client/conversations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include"
      });
      
      const data = await response.json();
      alert(`API Response: ${JSON.stringify(data, null, 2)}`);
    } catch (error) {
      alert(`API Error: ${error}`);
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">Auth Debug Info</h1>
        
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Auth State</h2>
          <pre className="text-xs bg-gray-900 p-4 rounded overflow-auto">
            {JSON.stringify(authInfo, null, 2)}
          </pre>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Supabase Cookies</h2>
          {cookies.length > 0 ? (
            <ul className="space-y-2">
              {cookies.map((cookie, i) => (
                <li key={i} className="text-xs font-mono bg-gray-900 p-2 rounded break-all">
                  {cookie}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-400">No Supabase cookies found</p>
          )}
        </div>
        
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Actions</h2>
          <div className="space-y-2">
            <button
              onClick={() => {
                checkAuth();
                checkCookies();
              }}
              className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded"
            >
              Refresh Info
            </button>
            
            <button
              onClick={testAPIDirectly}
              className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded ml-2"
            >
              Test API Directly
            </button>
          </div>
        </div>
        
        <div className="bg-yellow-900/30 border border-yellow-600 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-2 text-yellow-400">Expected Client Info</h2>
          <p className="text-sm">Email: samschofield90@hotmail.co.uk</p>
          <p className="text-sm">User ID: 63f796d2-36c7-474b-a5d2-253146eea119</p>
          <p className="text-sm">Client ID: 26d39f21-1a89-4471-b8bf-ab9bb1b7a205</p>
        </div>
      </div>
    </div>
  );
}