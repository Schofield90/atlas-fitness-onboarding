"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/app/lib/supabase/client";
import { X } from "lucide-react";
import { formatBritishCurrency } from "@/app/lib/utils/british-format";

interface AddMembershipModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerId: string;
  customerName: string;
  onSuccess: () => void;
}

export default function AddMembershipModal({
  isOpen,
  onClose,
  customerId,
  customerName,
  onSuccess,
}: AddMembershipModalProps) {
  const [membershipPlans, setMembershipPlans] = useState<any[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const supabase = createClient();

  useEffect(() => {
    if (isOpen) {
      fetchMembershipPlans();
    }
  }, [isOpen]);

  const fetchMembershipPlans = async () => {
    try {
      // Get user's organization
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userOrg } = await supabase
        .from("user_organizations")
        .select("organization_id")
        .eq("user_id", user.id)
        .single();

      if (!userOrg) return;

      // Get active membership plans
      const { data, error } = await supabase
        .from("membership_plans")
        .select("*")
        .eq("organization_id", userOrg.organization_id)
        .eq("is_active", true)
        .order("price", { ascending: true });

      if (error) throw error;
      setMembershipPlans(data || []);
    } catch (error) {
      console.error("Error fetching membership plans:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlanId) {
      setError("Please select a membership plan");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: userOrg } = await supabase
        .from("user_organizations")
        .select("organization_id")
        .eq("user_id", user.id)
        .single();

      if (!userOrg) throw new Error("No organization found");

      // Determine if this is a lead (customer_id) or client (client_id)
      let isClient = false;
      let isLead = false;

      // Check if customerId exists in clients table
      const { data: clientCheck } = await supabase
        .from("clients")
        .select("id")
        .eq("id", customerId)
        .eq("org_id", userOrg.organization_id)
        .single();

      if (clientCheck) {
        isClient = true;
      } else {
        // Check if customerId exists in leads table
        const { data: leadCheck } = await supabase
          .from("leads")
          .select("id")
          .eq("id", customerId)
          .eq("organization_id", userOrg.organization_id)
          .single();

        if (leadCheck) {
          isLead = true;
        }
      }

      if (!isClient && !isLead) {
        throw new Error("Customer not found in clients or leads table");
      }

      // Check if customer already has an active membership with this plan
      const { data: existingMemberships, error: checkError } = await supabase
        .from("customer_memberships")
        .select("*")
        .or(
          isClient
            ? `client_id.eq.${customerId}`
            : `customer_id.eq.${customerId}`,
        )
        .eq("membership_plan_id", selectedPlanId)
        .eq("status", "active");

      if (checkError) {
        console.error("Error checking existing memberships:", checkError);
      }

      if (existingMemberships && existingMemberships.length > 0) {
        setError(
          "This customer already has an active membership with this plan. Please cancel or modify the existing membership first.",
        );
        setLoading(false);
        return;
      }

      // Calculate end date based on billing period
      const selectedPlan = membershipPlans.find((p) => p.id === selectedPlanId);
      let endDate = null;
      if (selectedPlan) {
        const start = new Date(startDate);
        if (selectedPlan.billing_period === "monthly") {
          endDate = new Date(start.setMonth(start.getMonth() + 1));
        } else if (selectedPlan.billing_period === "yearly") {
          endDate = new Date(start.setFullYear(start.getFullYear() + 1));
        }
      }

      // Create membership record with appropriate customer field
      const membershipData: any = {
        organization_id: userOrg.organization_id,
        membership_plan_id: selectedPlanId,
        status: "active",
        start_date: startDate,
        end_date: endDate?.toISOString().split("T")[0],
        next_billing_date: endDate?.toISOString().split("T")[0],
        notes: notes || null,
        created_by: user.id,
      };

      // Set either customer_id (for leads) or client_id (for clients)
      if (isClient) {
        membershipData.client_id = customerId;
      } else {
        membershipData.customer_id = customerId;
      }

      const { error: insertError } = await supabase
        .from("customer_memberships")
        .insert(membershipData);

      if (insertError) {
        // Handle specific error cases
        if (insertError.code === "23505") {
          setError(
            "This customer already has this membership. Please check the existing memberships.",
          );
        } else if (
          insertError.message?.includes("violates foreign key constraint")
        ) {
          setError(
            "Invalid customer or membership plan. Please refresh and try again.",
          );
        } else {
          setError(insertError.message || "Failed to add membership");
        }
        throw insertError;
      }

      onSuccess();
      onClose();
      resetForm();
    } catch (error: any) {
      console.error("Error adding membership:", error);
      // Error is already set in the if block above
      if (!error.code) {
        setError(error.message || "Failed to add membership");
      }
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedPlanId("");
    setStartDate(new Date().toISOString().split("T")[0]);
    setNotes("");
    setError("");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">Add Membership</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="text-gray-400 mb-4">
          Add membership for{" "}
          <span className="text-white font-medium">{customerName}</span>
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Membership Plan *
            </label>
            <select
              value={selectedPlanId}
              onChange={(e) => setSelectedPlanId(e.target.value)}
              className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Select a plan</option>
              {membershipPlans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name} - {formatBritishCurrency(plan.price, true)}/
                  {plan.billing_period}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Start Date *
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Any additional notes..."
            />
          </div>

          {error && (
            <div className="bg-red-600 bg-opacity-20 border border-red-600 rounded-lg p-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? "Adding..." : "Add Membership"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
