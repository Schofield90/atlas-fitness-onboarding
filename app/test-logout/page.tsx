"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/app/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function TestLogout() {
  const [status, setStatus] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const router = useRouter();
  
  useEffect(() => {
    checkCurrentUser();
  }, []);
  
  const checkCurrentUser = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);
    if (user) {
      setStatus(`Currently logged in as: ${user.email}`);
    } else {
      setStatus("Not logged in");
    }
  };
  
  const logout = async () => {
    setStatus("Logging out...");
    const supabase = createClient();
    
    // Clear all auth data
    await supabase.auth.signOut();
    
    // Clear cookies manually as well
    document.cookie.split(";").forEach((c) => {
      document.cookie = c
        .replace(/^ +/, "")
        .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });
    
    setStatus("Logged out! Redirecting to login...");
    setCurrentUser(null);
    
    setTimeout(() => {
      router.push("/quick-login");
    }, 1000);
  };
  
  const loginAsClient = async () => {
    setStatus("Switching to client account...");
    
    const supabase = createClient();
    
    // First logout
    await supabase.auth.signOut();
    
    // Then login as client
    const { data, error } = await supabase.auth.signInWithPassword({
      email: "samschofield90@hotmail.co.uk",
      password: "@Aa80236661"
    });
    
    if (error) {
      setStatus(`Error: ${error.message}`);
    } else {
      setStatus("Success! Redirecting to client dashboard...");
      setTimeout(() => {
        window.location.href = "/client/dashboard";
      }, 500);
    }
  };
  
  const loginAsOwner = async () => {
    setStatus("Switching to owner account...");
    
    const supabase = createClient();
    
    // First logout
    await supabase.auth.signOut();
    
    // Then login as owner
    const { data, error } = await supabase.auth.signInWithPassword({
      email: "sam@atlas-gyms.co.uk",
      password: "@Aa80236661"
    });
    
    if (error) {
      setStatus(`Error: ${error.message}`);
    } else {
      setStatus("Success! Redirecting to owner dashboard...");
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 500);
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-lg p-8 max-w-md w-full space-y-4">
        <h1 className="text-2xl font-bold text-white">User Switcher</h1>
        
        <div className="p-4 bg-gray-700 rounded">
          <p className="text-gray-300 text-sm">
            Current User: {currentUser?.email || "Not logged in"}
          </p>
          <p className="text-gray-400 text-xs">
            ID: {currentUser?.id || "-"}
          </p>
        </div>
        
        <div className="space-y-2">
          <button
            onClick={loginAsClient}
            className={`w-full py-3 rounded font-medium transition ${
              currentUser?.email === "samschofield90@hotmail.co.uk"
                ? "bg-green-600 text-white"
                : "bg-blue-600 hover:bg-blue-700 text-white"
            }`}
          >
            Switch to CLIENT
            <div className="text-xs opacity-80">samschofield90@hotmail.co.uk</div>
          </button>
          
          <button
            onClick={loginAsOwner}
            className={`w-full py-3 rounded font-medium transition ${
              currentUser?.email === "sam@atlas-gyms.co.uk"
                ? "bg-green-600 text-white"
                : "bg-purple-600 hover:bg-purple-700 text-white"
            }`}
          >
            Switch to OWNER
            <div className="text-xs opacity-80">sam@atlas-gyms.co.uk</div>
          </button>
          
          <button
            onClick={logout}
            className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded font-medium"
          >
            Logout Completely
          </button>
        </div>
        
        <div className={`p-3 rounded text-center text-sm ${
          status.includes('Error') ? 'bg-red-900/30 text-red-400' : 
          status.includes('Success') ? 'bg-green-900/30 text-green-400' : 
          'bg-gray-700 text-gray-300'
        }`}>
          {status}
        </div>
        
        <div className="pt-4 border-t border-gray-700">
          <p className="text-gray-400 text-xs mb-2">Quick Links:</p>
          <div className="space-y-1">
            <a href="/client/messages" className="block text-blue-400 hover:text-blue-300 text-sm">
              → Client Messages
            </a>
            <a href="/client/dashboard" className="block text-blue-400 hover:text-blue-300 text-sm">
              → Client Dashboard
            </a>
            <a href="/dashboard" className="block text-purple-400 hover:text-purple-300 text-sm">
              → Owner Dashboard
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}