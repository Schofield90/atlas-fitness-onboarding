"use client";

import {
  CreditCard,
  Calendar,
  Activity,
  ChevronLeft,
  Package,
  AlertCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/app/lib/supabase/client";
import { format, parseISO } from "date-fns";

export default function ClientMembershipPage() {
  const router = useRouter();
  const [client, setClient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [membership, setMembership] = useState<any>(null);
  const [membershipPlan, setMembershipPlan] = useState<any>(null);
  const [usageStats, setUsageStats] = useState({
    classesThisMonth: 0,
    creditsUsed: 0,
    creditsRemaining: 0,
  });
  const [supabase] = useState(() => createClient());

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (client) {
      loadMembership();
      loadUsageStats();
    }
  }, [client]);

  const checkAuth = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      router.push("/login-otp");
      return;
    }

    const { data: clientData } = await supabase
      .from("clients")
      .select("*")
      .eq("user_id", session.user.id)
      .single();

    if (!clientData) {
      router.push("/login-otp");
      return;
    }

    setClient(clientData);
    setLoading(false);
  };

  const loadMembership = async () => {
    console.log("Loading membership for client:", client.id, client.email);

    // Try to get membership from customer_memberships table (the correct table)
    let { data: directMembership, error: directError } = await supabase
      .from("customer_memberships")
      .select(
        `
        *,
        membership_plans (
          id,
          name,
          description,
          price,
          price_pennies,
          classes_per_period,
          billing_period
        )
      `,
      )
      .eq("client_id", client.id)
      .eq("status", "active")
      .single();

    console.log(
      "Direct membership query result:",
      directMembership,
      "Error:",
      directError,
    );

    if (directMembership) {
      // Use direct membership
      setMembership(directMembership);
      setMembershipPlan({
        name: directMembership.membership_plans?.name || "Standard Membership",
        description:
          directMembership.membership_plans?.description || "Full gym access",
        price_pennies:
          directMembership.membership_plans?.price_pennies ||
          directMembership.membership_plans?.price ||
          0,
        monthly_credits:
          directMembership.membership_plans?.classes_per_period ||
          directMembership.classes_used_this_period ||
          0,
      });
    } else {
      // Fallback: check if there's a lead record linked to this client
      console.log("No direct membership found, checking lead records...");
      const { data: leadData, error: leadError } = await supabase
        .from("leads")
        .select("id")
        .eq("client_id", client.id)
        .single();

      console.log("Lead data:", leadData, "Error:", leadError);

      if (leadData) {
        // Get active membership using the lead ID from customer_memberships
        console.log(
          "Found lead, checking membership for lead ID:",
          leadData.id,
        );
        const { data: membershipData, error: membershipError } = await supabase
          .from("customer_memberships")
          .select(
            `
            *,
            membership_plans (
              id,
              name,
              description,
              price,
              price_pennies,
              classes_per_period,
              billing_period
            )
          `,
          )
          .eq("customer_id", leadData.id)
          .eq("status", "active")
          .single();

        console.log(
          "Lead membership data:",
          membershipData,
          "Error:",
          membershipError,
        );

        if (membershipData) {
          setMembership(membershipData);
          setMembershipPlan({
            name:
              membershipData.membership_plans?.name || "Standard Membership",
            description:
              membershipData.membership_plans?.description || "Full gym access",
            price_pennies:
              membershipData.membership_plans?.price_pennies ||
              membershipData.membership_plans?.price ||
              0,
            monthly_credits:
              membershipData.membership_plans?.classes_per_period ||
              membershipData.classes_used_this_period ||
              0,
          });
        }
      } else {
        // Final fallback: Try to find lead by email
        console.log("No lead by client_id, trying by email:", client.email);
        const { data: leadByEmail, error: emailError } = await supabase
          .from("leads")
          .select("id")
          .eq("email", client.email)
          .eq("organization_id", client.organization_id)
          .single();

        console.log("Lead by email:", leadByEmail, "Error:", emailError);

        if (leadByEmail) {
          const { data: membershipData, error: membershipError } =
            await supabase
              .from("customer_memberships")
              .select(
                `
              *,
              membership_plans (
                id,
                name,
                description,
                price,
                credits_per_period
              )
            `,
              )
              .eq("customer_id", leadByEmail.id)
              .eq("status", "active")
              .single();

          console.log(
            "Email-based membership data:",
            membershipData,
            "Error:",
            membershipError,
          );

          if (membershipData) {
            setMembership(membershipData);
            setMembershipPlan({
              name:
                membershipData.membership_plans?.name || "Standard Membership",
              description:
                membershipData.membership_plans?.description ||
                "Full gym access",
              price_pennies: membershipData.membership_plans?.price || 0,
              monthly_credits:
                membershipData.membership_plans?.credits_per_period ||
                membershipData.credits_remaining ||
                0,
            });
          }
        }
      }
    }
  };

  const loadUsageStats = async () => {
    // Get bookings for current month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    console.log("Start of month for usage stats:", startOfMonth.toISOString());

    // Get bookings from BOTH tables
    let { data: directBookings } = await supabase
      .from("bookings")
      .select("*")
      .eq("client_id", client.id)
      .gte("created_at", startOfMonth.toISOString());

    let { data: classBookings } = await supabase
      .from("class_bookings")
      .select("*")
      .eq("client_id", client.id)
      .eq("booking_status", "confirmed")
      .gte("created_at", startOfMonth.toISOString());

    let classesThisMonth =
      (directBookings?.length || 0) + (classBookings?.length || 0);
    let creditsUsed = 0;
    let creditsRemaining = 0;

    // Try to get credits directly for client
    const { data: directCredits } = await supabase
      .from("class_credits")
      .select("*")
      .eq("client_id", client.id)
      .single();

    if (directCredits) {
      creditsUsed = directCredits.credits_used || 0;
      creditsRemaining = directCredits.credits_remaining || 0;
    }

    // If no direct data, check lead records
    if (classesThisMonth === 0 || !directCredits) {
      const { data: leadData } = await supabase
        .from("leads")
        .select("id")
        .eq("client_id", client.id)
        .single();

      if (leadData) {
        // Get bookings using lead ID from both tables
        const { data: leadBookings } = await supabase
          .from("bookings")
          .select("*")
          .eq("customer_id", leadData.id)
          .gte("created_at", startOfMonth.toISOString());

        const { data: leadClassBookings } = await supabase
          .from("class_bookings")
          .select("*")
          .eq("customer_id", leadData.id)
          .eq("booking_status", "confirmed")
          .gte("created_at", startOfMonth.toISOString());

        classesThisMonth +=
          (leadBookings?.length || 0) + (leadClassBookings?.length || 0);

        // Get credits from lead if no direct credits
        if (!directCredits) {
          const { data: leadCredits } = await supabase
            .from("class_credits")
            .select("*")
            .eq("customer_id", leadData.id)
            .single();

          if (leadCredits) {
            creditsUsed = leadCredits.credits_used || 0;
            creditsRemaining = leadCredits.credits_remaining || 0;
          }
        }
      }
    }

    setUsageStats({
      classesThisMonth,
      creditsUsed,
      creditsRemaining,
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 shadow-sm border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-4">
            <button
              onClick={() => router.push("/client")}
              className="mr-4 text-gray-300 hover:text-orange-500 transition-colors"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <h1 className="text-2xl font-bold text-white">My Membership</h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Membership Status */}
        {membership ? (
          <>
            <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6 mb-6">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">
                    {membershipPlan?.name || "Standard Membership"}
                  </h2>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <Package className="h-4 w-4 text-orange-500" />
                      <span>
                        {membershipPlan?.description || "Full gym access"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <Calendar className="h-4 w-4 text-orange-500" />
                      <span>
                        Active since{" "}
                        {format(
                          parseISO(membership.start_date),
                          "MMMM d, yyyy",
                        )}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <CreditCard className="h-4 w-4 text-orange-500" />
                      <span>£{membershipPlan?.price_pennies / 100}/month</span>
                    </div>
                  </div>
                </div>
                <span className="bg-green-900/50 text-green-400 text-sm font-medium px-3 py-1 rounded-full">
                  Active
                </span>
              </div>
            </div>

            {/* Usage Stats */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-6">
              <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6">
                <div className="flex items-center">
                  <Activity className="h-8 w-8 text-orange-500 mr-3" />
                  <div>
                    <div className="text-2xl font-bold text-white">
                      {usageStats.classesThisMonth}
                    </div>
                    <div className="text-sm text-gray-400">
                      Classes This Month
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6">
                <div className="flex items-center">
                  <CreditCard className="h-8 w-8 text-green-500 mr-3" />
                  <div>
                    <div className="text-2xl font-bold text-white">
                      {usageStats.creditsRemaining}
                    </div>
                    <div className="text-sm text-gray-400">
                      Credits Remaining
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6">
                <div className="flex items-center">
                  <Activity className="h-8 w-8 text-purple-500 mr-3" />
                  <div>
                    <div className="text-2xl font-bold text-white">
                      {membershipPlan?.monthly_credits || "Unlimited"}
                    </div>
                    <div className="text-sm text-gray-400">Monthly Credits</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Membership Benefits */}
            <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6 mb-6">
              <h3 className="text-lg font-semibold text-white mb-4">
                Your Benefits
              </h3>
              <div className="space-y-3">
                <div className="flex items-start">
                  <div className="flex-shrink-0 h-5 w-5 text-orange-500 mt-0.5">
                    <svg
                      className="h-5 w-5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <span className="ml-3 text-gray-300">
                    {membershipPlan?.monthly_credits
                      ? `${membershipPlan.monthly_credits} classes per month`
                      : "Unlimited classes"}
                  </span>
                </div>
                <div className="flex items-start">
                  <div className="flex-shrink-0 h-5 w-5 text-orange-500 mt-0.5">
                    <svg
                      className="h-5 w-5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <span className="ml-3 text-gray-300">
                    Access to all gym locations
                  </span>
                </div>
                <div className="flex items-start">
                  <div className="flex-shrink-0 h-5 w-5 text-orange-500 mt-0.5">
                    <svg
                      className="h-5 w-5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <span className="ml-3 text-gray-300">
                    Book classes up to 2 weeks in advance
                  </span>
                </div>
                <div className="flex items-start">
                  <div className="flex-shrink-0 h-5 w-5 text-orange-500 mt-0.5">
                    <svg
                      className="h-5 w-5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <span className="ml-3 text-gray-300">
                    Priority waitlist access
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">
                Manage Membership
              </h3>
              <div className="space-y-3">
                <button className="w-full text-left px-4 py-3 border border-gray-600 rounded-lg hover:bg-gray-700 transition-colors">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Update Payment Method</span>
                    <ChevronLeft className="h-5 w-5 text-gray-400 transform rotate-180" />
                  </div>
                </button>
                <button className="w-full text-left px-4 py-3 border border-gray-600 rounded-lg hover:bg-gray-700 transition-colors">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Freeze Membership</span>
                    <ChevronLeft className="h-5 w-5 text-gray-400 transform rotate-180" />
                  </div>
                </button>
                <button className="w-full text-left px-4 py-3 border border-gray-600 rounded-lg hover:bg-gray-700 transition-colors">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">View Billing History</span>
                    <ChevronLeft className="h-5 w-5 text-gray-400 transform rotate-180" />
                  </div>
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-12 text-center">
            <AlertCircle className="h-12 w-12 text-orange-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">
              No Active Membership
            </h2>
            <p className="text-gray-400 mb-6">
              You don't have an active membership. Join today to start your
              fitness journey!
            </p>
            <button
              onClick={() => router.push("/client")}
              className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
