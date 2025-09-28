"use client";

import { useState } from "react";

export default function TestLoginSimple() {
  const [status, setStatus] = useState("Click a button to test");

  const testLogin = async (email: string) => {
    setStatus(`Testing login for ${email}...`);
    console.log("Starting login test for:", email);
    
    try {
      // Direct fetch to Supabase API
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/token?grant_type=password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          },
          body: JSON.stringify({
            email: email,
            password: "@Aa80236661",
            gotrue_meta_security: {}
          }),
        }
      );

      const data = await response.json();
      console.log("Login response:", data);

      if (response.ok) {
        setStatus(`✅ Login successful! Token: ${data.access_token?.substring(0, 20)}...`);
        
        // Set the cookies manually
        document.cookie = `sb-lzlrojoaxrqvmhempnkn-auth-token=${data.access_token}; path=/; max-age=3600`;
        
        // Redirect after a moment
        setTimeout(() => {
          if (email.includes("hotmail")) {
            window.location.href = "/client/dashboard";
          } else {
            window.location.href = "/dashboard";
          }
        }, 1000);
      } else {
        setStatus(`❌ Login failed: ${data.error_description || data.msg || 'Unknown error'}`);
      }
    } catch (error) {
      console.error("Login error:", error);
      setStatus(`❌ Error: ${error}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-lg p-8 max-w-md w-full">
        <h1 className="text-2xl font-bold text-white mb-6">Simple Login Test</h1>
        
        <div className="space-y-4">
          <button
            onClick={() => testLogin("sam@atlas-gyms.co.uk")}
            className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-medium transition"
          >
            Test Owner Login
          </button>
          
          <button
            onClick={() => testLogin("samschofield90@hotmail.co.uk")}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium transition"
          >
            Test Client Login
          </button>
        </div>
        
        <div className="mt-6 p-4 bg-gray-700 rounded">
          <p className="text-gray-300 text-sm break-all">{status}</p>
        </div>
        
        <div className="mt-4 text-gray-400 text-xs">
          <p>Check browser console for detailed logs</p>
          <p>URL: {process.env.NEXT_PUBLIC_SUPABASE_URL}</p>
        </div>
      </div>
    </div>
  );
}