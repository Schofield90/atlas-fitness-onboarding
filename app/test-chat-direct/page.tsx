"use client";

import { useState, useEffect } from "react";

export default function TestChatDirect() {
  const [status, setStatus] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    testDirectly();
  }, []);

  const testDirectly = async () => {
    try {
      // Step 1: Login directly with fetch
      setStatus({ step: "Logging in..." });
      
      // Get test credentials from environment or prompt user
      const testEmail = prompt("Enter test email:");
      const testPassword = prompt("Enter test password:");
      
      if (!testEmail || !testPassword) {
        setStatus({ error: "Test cancelled - no credentials provided" });
        return;
      }
      
      const loginRes = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        },
        body: JSON.stringify({
          email: testEmail,
          password: testPassword
        })
      });
      
      const loginData = await loginRes.json();
      
      if (!loginData.access_token) {
        setStatus({ error: "Login failed", details: loginData });
        return;
      }
      
      setStatus({ 
        step: "Logged in successfully",
        user: loginData.user?.email,
        token: loginData.access_token.substring(0, 20) + "..."
      });
      
      // Step 2: Test the conversations API directly with the token
      const convRes = await fetch("/api/client/conversations", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${loginData.access_token}`,
          "Content-Type": "application/json"
        }
      });
      
      const convData = await convRes.json();
      
      setStatus(prev => ({
        ...prev,
        apiResponse: convData,
        apiStatus: convRes.status
      }));
      
      if (convData.conversation_id) {
        setStatus(prev => ({
          ...prev,
          success: true,
          conversationId: convData.conversation_id,
          message: "✅ Chat API works! The issue is with session persistence."
        }));
      } else {
        setStatus(prev => ({
          ...prev,
          error: "API didn't return conversation_id",
          details: convData
        }));
      }
      
    } catch (error) {
      setStatus({ 
        error: "Test failed", 
        details: error instanceof Error ? error.message : error 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-6">Direct Chat API Test</h1>
        
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl text-white mb-4">Testing without browser session...</h2>
          
          {loading ? (
            <div className="text-yellow-400">Running test...</div>
          ) : (
            <pre className="text-sm text-gray-300 overflow-auto">
              {JSON.stringify(status, null, 2)}
            </pre>
          )}
        </div>
        
        <div className="mt-6 bg-blue-900/30 border border-blue-600 rounded-lg p-4">
          <h3 className="text-blue-400 font-semibold mb-2">What this tests:</h3>
          <ul className="text-sm text-gray-300 space-y-1">
            <li>• Direct login to Supabase Auth API</li>
            <li>• Using the access token to call conversations API</li>
            <li>• Bypasses all cookie/session issues</li>
            <li>• Shows if the API itself works correctly</li>
          </ul>
        </div>
        
        <button 
          onClick={() => {
            setLoading(true);
            testDirectly();
          }}
          className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
        >
          Run Test Again
        </button>
      </div>
    </div>
  );
}