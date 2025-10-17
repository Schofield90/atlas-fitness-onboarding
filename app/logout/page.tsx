"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createSessionClient } from "@/lib/supabase/client-with-session";

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    async function logout() {
      const supabase = createSessionClient();
      
      // Clear all auth data
      await supabase.auth.signOut();
      
      // Clear localStorage
      if (typeof window !== 'undefined') {
        localStorage.clear();
        sessionStorage.clear();
      }
      
      // Redirect to login
      setTimeout(() => {
        router.push("/owner-login");
      }, 1000);
    }
    
    logout();
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-white mb-4">Logging out...</h1>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
      </div>
    </div>
  );
}