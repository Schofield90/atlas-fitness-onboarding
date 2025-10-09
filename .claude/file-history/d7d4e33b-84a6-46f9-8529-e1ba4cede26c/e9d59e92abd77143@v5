"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { formatBritishCurrency } from "@/app/lib/utils/british-format";
import { useOrganization } from "@/app/hooks/useOrganization";

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
  const { organizationId } = useOrganization();

  useEffect(() => {
    if (isOpen && organizationId) {
      fetchMembershipPlans();
    }
  }, [isOpen, organizationId]);

  const fetchMembershipPlans = async () => {
    try {
      // Wait for organization context to be available
      if (!organizationId) {
        setError("Organization not found. Please try refreshing the page.");
        return;
      }

      console.log(
        "Fetching membership plans for organization:",
        organizationId,
      );

      // Use API endpoint instead of direct database query to ensure proper authentication
      const response = await fetch("/api/membership-plans?active_only=true");

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Error fetching membership plans:", {
          status: response.status,
          error: errorData,
          organizationId,
        });
        throw new Error(errorData.error || "Failed to fetch membership plans");
      }

      const result = await response.json();
      const data = result.membershipPlans || result.plans || [];

      console.log("Fetched membership plans:", data?.length || 0);
      console.log("First plan details:", data[0]);
      setMembershipPlans(data || []);

      if (!data || data.length === 0) {
        setError(
          "No active membership plans found. Please create membership plans first.",
        );
      }
    } catch (error: any) {
      console.error("Error fetching membership plans:", error);
      setError("Failed to load membership plans. Please try again.");
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
      const response = await fetch("/api/customer-memberships", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customerId,
          membershipPlanId: selectedPlanId,
          startDate,
          notes,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to add membership");
        return;
      }

      onSuccess();
      onClose();
      resetForm();
    } catch (error: any) {
      console.error("Error adding membership:", error);
      setError(error?.message || "Failed to add membership");
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
              {(() => {
                // Group plans by category
                const groupedPlans = membershipPlans.reduce(
                  (acc, plan) => {
                    const category = plan.category || "Uncategorized";
                    if (!acc[category]) acc[category] = [];
                    acc[category].push(plan);
                    return acc;
                  },
                  {} as Record<string, any[]>,
                );

                // Sort categories alphabetically
                const sortedCategories = Object.keys(groupedPlans).sort(
                  (a, b) => {
                    // "Uncategorized" always goes last
                    if (a === "Uncategorized") return 1;
                    if (b === "Uncategorized") return -1;
                    return a.localeCompare(b);
                  },
                );

                // Sort plans within each category alphabetically
                sortedCategories.forEach((category) => {
                  groupedPlans[category].sort((a, b) =>
                    a.name.localeCompare(b.name),
                  );
                });

                // Render optgroups
                return sortedCategories.map((category) => (
                  <optgroup key={category} label={category}>
                    {groupedPlans[category].map((plan) => {
                      const priceInPennies =
                        plan.price_pennies ||
                        (plan.price ? plan.price * 100 : 0);
                      return (
                        <option key={plan.id} value={plan.id}>
                          {plan.name} -{" "}
                          {formatBritishCurrency(priceInPennies, true)}/
                          {plan.billing_period}
                        </option>
                      );
                    })}
                  </optgroup>
                ));
              })()}
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
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading || !selectedPlanId}
            >
              {loading ? "Adding..." : "Add Membership"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
