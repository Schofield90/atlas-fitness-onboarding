"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/app/lib/supabase/client";

export default function ForceClientLogin() {
  const [status, setStatus] = useState("Forcing client login...");

  useEffect(() => {
    forceClientLogin();
  }, []);

  const forceClientLogin = async () => {
    try {
      // Clear ALL cookies first
      document.cookie.split(";").forEach((c) => {
        document.cookie = c
          .replace(/^ +/, "")
          .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
      });
      
      // Clear localStorage
      localStorage.clear();
      
      // Clear sessionStorage
      sessionStorage.clear();
      
      setStatus("Cleared all auth data. Logging in as client...");
      
      // Create fresh client
      const supabase = createClient();
      
      // Force sign out first
      await supabase.auth.signOut();
      
      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Now login as client
      const { data, error } = await supabase.auth.signInWithPassword({
        email: "samschofield90@hotmail.co.uk",
        password: "@Aa80236661"
      });

      if (error) {
        setStatus(`Error: ${error.message}`);
        console.error("Login error:", error);
      } else {
        setStatus("✅ Successfully logged in as CLIENT! Redirecting...");
        console.log("Logged in as:", data.user?.email);
        
        // Force reload to clear any cached auth state
        setTimeout(() => {
          window.location.href = "/client/messages";
        }, 1000);
      }
    } catch (err) {
      setStatus(`Error: ${err}`);
      console.error("Error:", err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-lg p-8 max-w-md w-full">
        <h1 className="text-2xl font-bold text-white mb-4">Force Client Login</h1>
        
        <div className="p-4 bg-gray-700 rounded text-white">
          {status}
        </div>
        
        <div className="mt-4 text-gray-400 text-sm">
          <p>This page will:</p>
          <ul className="list-disc list-inside mt-2">
            <li>Clear all cookies</li>
            <li>Clear localStorage</li>
            <li>Clear sessionStorage</li>
            <li>Force logout</li>
            <li>Login as samschofield90@hotmail.co.uk</li>
            <li>Redirect to client messages</li>
          </ul>
        </div>
        
        <button 
          onClick={forceClientLogin}
          className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded"
        >
          Retry Force Login
        </button>
      </div>
    </div>
  );
}