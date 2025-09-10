"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/app/lib/supabase/client";
import CoachDashboard from "@/app/components/nutrition/CoachDashboard";

export default function CoachNutritionPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [coach, setCoach] = useState<any>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
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
        router.push("/login");
        return;
      }

      // Check if user is a coach/staff member
      const { data: staffData, error: staffError } = await supabase
        .from("organization_staff")
        .select("*, organizations(*)")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .single();

      if (staffError || !staffData) {
        // Check if they're an organization owner
        const { data: orgData, error: orgError } = await supabase
          .from("organizations")
          .select("*")
          .eq("owner_id", user.id)
          .single();

        if (orgError || !orgData) {
          setError("You don't have permission to access this page.");
          setLoading(false);
          return;
        }

        setCoach(user);
        setOrganizationId(orgData.id);
      } else {
        setCoach(user);
        setOrganizationId(staffData.organization_id);
      }
    } catch (error) {
      console.error("Error checking auth:", error);
      setError("An error occurred while loading the page.");
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
            Access Denied
          </h2>
          <p className="text-gray-400">{error}</p>
          <button
            onClick={() => router.push("/dashboard")}
            className="mt-4 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!coach || !organizationId) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
        <div className="bg-gray-800 shadow-lg rounded-lg p-6 max-w-md text-center border border-gray-700">
          <h2 className="text-lg font-semibold mb-2 text-white">
            Setup Required
          </h2>
          <p className="text-gray-400">
            Please complete your organization setup first.
          </p>
        </div>
      </div>
    );
  }

  return <CoachDashboard coach={coach} organizationId={organizationId} />;
}
