"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/app/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import SimpleLoginPage from "@/app/simple-login/page";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [processing, setProcessing] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const handleMagicLink = async () => {
      // Check if we have a magic link token in the URL hash
      const hashParams = new URLSearchParams(window.location.hash.slice(1));
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");

      if (accessToken && refreshToken) {
        try {
          const supabase = createClient();

          // Set the session with the tokens
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) {
            console.error("Failed to set session:", error);
            setError("Authentication failed. Please try again.");
            setProcessing(false);
            return;
          }

          // Check if user is a client
          const { data: client } = await supabase
            .from("clients")
            .select("id")
            .eq("user_id", data.user?.id)
            .single();

          // Redirect based on user type
          if (client) {
            // User is a client, redirect to client portal
            router.push("/client");
          } else {
            // Check for redirect parameter
            const redirect = searchParams.get("redirect");
            if (redirect) {
              router.push(redirect);
            } else {
              // Default to dashboard for non-clients
              router.push("/dashboard");
            }
          }
        } catch (err) {
          console.error("Error processing magic link:", err);
          setError(
            "Failed to process authentication. Please try logging in again.",
          );
          setProcessing(false);
        }
      } else {
        // No magic link token, show regular login
        setProcessing(false);
      }
    };

    handleMagicLink();
  }, [router, searchParams]);

  if (processing) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Signing you in...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-red-50 text-red-600 p-4 rounded-lg max-w-md">
          <p>{error}</p>
          <button
            onClick={() => setError("")}
            className="mt-4 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return <SimpleLoginPage />;
}
