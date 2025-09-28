"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/app/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function AccountSwitcher() {
  const [status, setStatus] = useState("Loading...");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    checkCurrentUser();
  }, []);

  const checkCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
      
      if (user) {
        setStatus(`Currently logged in as: ${user.email}`);
        
        // Also check if they have a client profile
        const { data: clientData } = await supabase
          .from("clients")
          .select("*")
          .eq("user_id", user.id)
          .single();
          
        if (clientData) {
          setStatus(`${user.email} (CLIENT profile found)`);
        } else {
          setStatus(`${user.email} (OWNER - no client profile)`);
        }
      } else {
        setStatus("Not logged in");
      }
    } catch (error) {
      console.error("Error checking user:", error);
      setStatus("Error checking authentication");
    }
  };

  const clearAllAuthData = () => {
    // Clear all cookies
    document.cookie.split(";").forEach((c) => {
      const eqPos = c.indexOf("=");
      const name = eqPos > -1 ? c.substring(0, eqPos).trim() : c.trim();
      // Clear for all possible domains
      document.cookie = `${name}=;expires=${new Date(0).toUTCString()};path=/`;
      document.cookie = `${name}=;expires=${new Date(0).toUTCString()};path=/;domain=localhost`;
      document.cookie = `${name}=;expires=${new Date(0).toUTCString()};path=/;domain=.localhost`;
    });
    
    // Clear localStorage
    localStorage.clear();
    
    // Clear sessionStorage
    sessionStorage.clear();
  };

  const loginAsClient = async () => {
    setIsLoading(true);
    setStatus("Switching to CLIENT account...");
    
    try {
      // Step 1: Clear everything
      clearAllAuthData();
      setStatus("Cleared all auth data...");
      
      // Step 2: Sign out from Supabase
      await supabase.auth.signOut();
      setStatus("Signed out...");
      
      // Step 3: Wait for auth to clear
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Step 4: Sign in as client
      setStatus("Signing in as CLIENT...");
      const { data, error } = await supabase.auth.signInWithPassword({
        email: "samschofield90@hotmail.co.uk",
        password: "@Aa80236661"
      });

      if (error) {
        setStatus(`Error: ${error.message}`);
        console.error("Login error:", error);
      } else if (data.user) {
        setStatus("✅ Successfully logged in as CLIENT!");
        console.log("Logged in as:", data.user.email);
        
        // Verify the session is set
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          console.log("Session verified:", session.user.email);
          
          // Wait and then redirect
          setTimeout(() => {
            window.location.href = "/client/messages";
          }, 1500);
        } else {
          setStatus("⚠️ Session not persisted, retrying...");
          // Try refreshing the session
          await supabase.auth.refreshSession();
          setTimeout(() => {
            window.location.href = "/client/messages";
          }, 1500);
        }
      }
    } catch (err) {
      setStatus(`Error: ${err}`);
      console.error("Error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const loginAsOwner = async () => {
    setIsLoading(true);
    setStatus("Switching to OWNER account...");
    
    try {
      // Step 1: Clear everything
      clearAllAuthData();
      setStatus("Cleared all auth data...");
      
      // Step 2: Sign out from Supabase
      await supabase.auth.signOut();
      setStatus("Signed out...");
      
      // Step 3: Wait for auth to clear
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Step 4: Sign in as owner
      setStatus("Signing in as OWNER...");
      const { data, error } = await supabase.auth.signInWithPassword({
        email: "sam@atlas-gyms.co.uk",
        password: "@Aa80236661"
      });

      if (error) {
        setStatus(`Error: ${error.message}`);
        console.error("Login error:", error);
      } else if (data.user) {
        setStatus("✅ Successfully logged in as OWNER!");
        console.log("Logged in as:", data.user.email);
        
        // Verify the session is set
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          console.log("Session verified:", session.user.email);
          
          // Wait and then redirect
          setTimeout(() => {
            window.location.href = "/dashboard";
          }, 1500);
        } else {
          setStatus("⚠️ Session not persisted, retrying...");
          // Try refreshing the session
          await supabase.auth.refreshSession();
          setTimeout(() => {
            window.location.href = "/dashboard";
          }, 1500);
        }
      }
    } catch (err) {
      setStatus(`Error: ${err}`);
      console.error("Error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const forceLogout = async () => {
    setIsLoading(true);
    try {
      clearAllAuthData();
      await supabase.auth.signOut();
      setStatus("✅ Completely logged out");
      setCurrentUser(null);
      
      // Reload to clear any cached state
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err) {
      setStatus(`Error: ${err}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-lg p-8 max-w-2xl w-full">
        <h1 className="text-3xl font-bold text-white mb-6">Account Switcher</h1>
        
        {/* Current Status */}
        <div className="mb-8 p-4 bg-gray-700 rounded-lg">
          <p className="text-white font-mono text-sm">{status}</p>
          {currentUser && (
            <div className="mt-2 text-xs text-gray-400">
              <p>User ID: {currentUser.id}</p>
              <p>Email: {currentUser.email}</p>
            </div>
          )}
        </div>

        {/* Account Info */}
        <div className="mb-8 grid md:grid-cols-2 gap-4">
          <div className="p-4 bg-blue-900/30 rounded-lg border border-blue-600">
            <h3 className="text-blue-400 font-semibold mb-2">CLIENT Account</h3>
            <p className="text-sm text-gray-300">Email: samschofield90@hotmail.co.uk</p>
            <p className="text-sm text-gray-300">Password: @Aa80236661</p>
            <p className="text-sm text-gray-300">Type: Gym Member</p>
            <p className="text-xs text-gray-500 mt-2">Has client profile, can use chat</p>
          </div>
          
          <div className="p-4 bg-green-900/30 rounded-lg border border-green-600">
            <h3 className="text-green-400 font-semibold mb-2">OWNER Account</h3>
            <p className="text-sm text-gray-300">Email: sam@atlas-gyms.co.uk</p>
            <p className="text-sm text-gray-300">Password: @Aa80236661</p>
            <p className="text-sm text-gray-300">Type: Gym Owner</p>
            <p className="text-xs text-gray-500 mt-2">No client profile, manages gym</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={loginAsClient}
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white py-3 px-4 rounded-lg font-semibold transition-colors"
          >
            {isLoading ? "Switching..." : "Switch to CLIENT Account (For Chat Testing)"}
          </button>
          
          <button
            onClick={loginAsOwner}
            disabled={isLoading}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-800 disabled:cursor-not-allowed text-white py-3 px-4 rounded-lg font-semibold transition-colors"
          >
            {isLoading ? "Switching..." : "Switch to OWNER Account (Gym Management)"}
          </button>
          
          <button
            onClick={forceLogout}
            disabled={isLoading}
            className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-800 disabled:cursor-not-allowed text-white py-3 px-4 rounded-lg font-semibold transition-colors"
          >
            {isLoading ? "Logging out..." : "Force Complete Logout"}
          </button>
          
          <button
            onClick={checkCurrentUser}
            disabled={isLoading}
            className="w-full bg-gray-600 hover:bg-gray-700 disabled:bg-gray-800 disabled:cursor-not-allowed text-white py-3 px-4 rounded-lg font-semibold transition-colors"
          >
            Refresh Status
          </button>
        </div>

        {/* Instructions */}
        <div className="mt-8 p-4 bg-yellow-900/20 rounded-lg border border-yellow-600/50">
          <h3 className="text-yellow-400 font-semibold mb-2">📝 Instructions</h3>
          <ol className="text-sm text-gray-300 space-y-1 list-decimal list-inside">
            <li>Check which account you're currently logged in as</li>
            <li>To test the chat as a gym member, click "Switch to CLIENT Account"</li>
            <li>To manage the gym, click "Switch to OWNER Account"</li>
            <li>If switching doesn't work, try "Force Complete Logout" first</li>
            <li>The page will redirect automatically after successful login</li>
          </ol>
        </div>

        {/* Test Links */}
        <div className="mt-6 flex flex-wrap gap-2">
          <a href="/api/test-auth" target="_blank" className="text-sm text-blue-400 hover:text-blue-300">
            Test Auth API →
          </a>
          <a href="/client/messages" className="text-sm text-blue-400 hover:text-blue-300">
            Client Messages →
          </a>
          <a href="/dashboard" className="text-sm text-green-400 hover:text-green-300">
            Owner Dashboard →
          </a>
        </div>
      </div>
    </div>
  );
}