"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/app/lib/supabase/client";
import NutritionDashboard from "@/app/components/nutrition/NutritionDashboard";

export default function NutritionPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [client, setClient] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/client-portal/login");
        return;
      }

      // Get client info
      const { data: clientData, error: clientError } = await supabase
        .from("clients")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (clientError || !clientData) {
        // Try by email
        const { data: clientByEmail, error: emailError } = await supabase
          .from("clients")
          .select("*")
          .eq("email", user.email)
          .single();

        if (clientByEmail) {
          setClient(clientByEmail);
        } else {
          if (emailError) {
            console.error("Client lookup by email failed:", emailError);
          }
          setClient(null);
        }
      } else {
        setClient(clientData);
      }
    } catch (error) {
      console.error("Error checking auth:", error);
      setError("We could not load your nutrition at this time.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
        <div className="bg-gray-800 shadow-lg rounded-lg p-6 max-w-md text-center border border-gray-700">
          <h2 className="text-lg font-semibold mb-2 text-white">
            Nutrition temporarily unavailable
          </h2>
          <p className="text-gray-400">{error}</p>
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
        <div className="bg-gray-800 shadow-lg rounded-lg p-6 max-w-md text-center border border-gray-700">
          <h2 className="text-lg font-semibold mb-2 text-white">Nutrition</h2>
          <p className="text-gray-400">
            Your personalized meal plans will appear here once your profile is
            set up.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <NutritionDashboard client={client} />
    </div>
  );
}
