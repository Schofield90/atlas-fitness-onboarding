"use client";

import { useEffect, useState } from "react";

export default function ForceSwitchToClient() {
  const [status, setStatus] = useState("Forcing switch to client account...");
  const [step, setStep] = useState(1);

  useEffect(() => {
    forceSwitchToClient();
  }, []);

  const forceSwitchToClient = async () => {
    try {
      // Step 1: Clear ALL browser storage
      setStep(1);
      setStatus("Step 1: Clearing all browser storage...");
      
      // Clear every possible storage mechanism
      try {
        // Clear all cookies
        document.cookie.split(";").forEach(function(c) { 
          document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
        });
        
        // Clear localStorage
        localStorage.clear();
        
        // Clear sessionStorage  
        sessionStorage.clear();
        
        // Clear IndexedDB if it exists
        if (window.indexedDB) {
          const databases = await indexedDB.databases?.() || [];
          databases.forEach(db => {
            if (db.name) indexedDB.deleteDatabase(db.name);
          });
        }
      } catch (e) {
        console.log("Some storage clearing failed:", e);
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Step 2: Force logout via API
      setStep(2);
      setStatus("Step 2: Force logging out via API...");
      
      await fetch("/api/auth/signout", { 
        method: "POST",
        credentials: "same-origin"
      }).catch(() => {});
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Step 3: Use direct Supabase import to login
      setStep(3);
      setStatus("Step 3: Logging in as client...");
      
      const { createClient } = await import("@supabase/supabase-js");
      const supabase = createClient(
        "https://lzlrojoaxrqvmhempnkn.supabase.co",
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0OTI1MzksImV4cCI6MjA2ODA2ODUzOX0.rrqVwWJg-9Jm0TpGEqH6sFdJuqZPnL3sITDDvLqzS9U"
      );
      
      // Force sign out first
      await supabase.auth.signOut();
      
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Now sign in as client
      const { data, error } = await supabase.auth.signInWithPassword({
        email: "samschofield90@hotmail.co.uk",
        password: "@Aa80236661"
      });
      
      if (error) {
        setStatus(`Error: ${error.message}`);
        console.error("Login error:", error);
        return;
      }
      
      if (data.user) {
        setStep(4);
        setStatus("Step 4: Verifying session...");
        
        // Verify the session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          setStatus("✅ SUCCESS! Logged in as CLIENT. Redirecting...");
          console.log("Successfully logged in as:", session.user.email);
          
          // Set a flag in localStorage to verify on next page
          localStorage.setItem("force_client_login", "true");
          localStorage.setItem("expected_email", "samschofield90@hotmail.co.uk");
          
          // Hard redirect with page reload
          setTimeout(() => {
            window.location.href = "/client/messages";
          }, 2000);
        } else {
          setStatus("⚠️ Session not set, retrying...");
          
          // Try to refresh
          const { data: { session: refreshedSession } } = await supabase.auth.refreshSession();
          if (refreshedSession) {
            setStatus("✅ Session refreshed! Redirecting...");
            setTimeout(() => {
              window.location.href = "/client/messages";
            }, 2000);
          } else {
            setStatus("❌ Failed to establish session. Please try manual login.");
            setTimeout(() => {
              window.location.href = "/simple-login";
            }, 3000);
          }
        }
      }
      
    } catch (err) {
      setStatus(`Fatal error: ${err}`);
      console.error("Fatal error:", err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-lg p-8 max-w-lg w-full">
        <h1 className="text-2xl font-bold text-white mb-6">Force Switch to Client</h1>
        
        <div className="space-y-4">
          <div className={`p-4 rounded-lg ${step >= 1 ? 'bg-blue-900/30 border border-blue-600' : 'bg-gray-700'}`}>
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step > 1 ? 'bg-green-600' : step === 1 ? 'bg-blue-600 animate-pulse' : 'bg-gray-600'}`}>
                {step > 1 ? '✓' : '1'}
              </div>
              <span className="text-white">Clear browser storage</span>
            </div>
          </div>
          
          <div className={`p-4 rounded-lg ${step >= 2 ? 'bg-blue-900/30 border border-blue-600' : 'bg-gray-700'}`}>
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step > 2 ? 'bg-green-600' : step === 2 ? 'bg-blue-600 animate-pulse' : 'bg-gray-600'}`}>
                {step > 2 ? '✓' : '2'}
              </div>
              <span className="text-white">Force logout</span>
            </div>
          </div>
          
          <div className={`p-4 rounded-lg ${step >= 3 ? 'bg-blue-900/30 border border-blue-600' : 'bg-gray-700'}`}>
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step > 3 ? 'bg-green-600' : step === 3 ? 'bg-blue-600 animate-pulse' : 'bg-gray-600'}`}>
                {step > 3 ? '✓' : '3'}
              </div>
              <span className="text-white">Login as client</span>
            </div>
          </div>
          
          <div className={`p-4 rounded-lg ${step >= 4 ? 'bg-blue-900/30 border border-blue-600' : 'bg-gray-700'}`}>
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step > 4 ? 'bg-green-600' : step === 4 ? 'bg-blue-600 animate-pulse' : 'bg-gray-600'}`}>
                {step > 4 ? '✓' : '4'}
              </div>
              <span className="text-white">Verify & redirect</span>
            </div>
          </div>
        </div>
        
        <div className="mt-6 p-4 bg-gray-700 rounded-lg">
          <p className="text-white font-mono text-sm">{status}</p>
        </div>
        
        <div className="mt-4 text-gray-400 text-xs">
          <p>Target: samschofield90@hotmail.co.uk (CLIENT)</p>
          <p>This will force-switch your account and redirect to chat.</p>
        </div>
        
        <button 
          onClick={() => window.location.reload()}
          className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded"
        >
          Retry if stuck
        </button>
      </div>
    </div>
  );
}