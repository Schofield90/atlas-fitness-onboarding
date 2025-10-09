"use client";

import { useState, useEffect } from "react";
import { X, ArrowLeft } from "lucide-react";
import { formatBritishCurrency } from "@/app/lib/utils/british-format";
import { useOrganization } from "@/app/hooks/useOrganization";

interface AddMembershipModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerId: string;
  customerName: string;
  onSuccess: () => void;
}

type CheckoutStep = "plan" | "payment";
type PaymentMethod = "cash" | "card" | "direct_debit";
type CashStatus = "outstanding" | "received";

export default function AddMembershipModal({
  isOpen,
  onClose,
  customerId,
  customerName,
  onSuccess,
}: AddMembershipModalProps) {
  const [membershipPlans, setMembershipPlans] = useState<any[]>([]);
  const [step, setStep] = useState<CheckoutStep>("plan");
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [cashStatus, setCashStatus] = useState<CashStatus>("outstanding");
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
      // Reset state when modal opens
      setStep("plan");
      setSelectedPlanId("");
      setSelectedPlan(null);
      setPaymentMethod("cash");
      setCashStatus("outstanding");
      setError("");
    }
  }, [isOpen, organizationId]);

  const fetchMembershipPlans = async () => {
    try {
      if (!organizationId) {
        setError("Organization not found. Please try refreshing the page.");
        return;
      }

      const response = await fetch("/api/membership-plans?active_only=true");

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch membership plans");
      }

      const result = await response.json();
      const data = result.membershipPlans || result.plans || [];
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

  const handlePlanSelection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlanId) {
      setError("Please select a membership plan");
      return;
    }

    const plan = membershipPlans.find((p) => p.id === selectedPlanId);
    setSelectedPlan(plan);
    setStep("payment");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
          paymentMethod,
          cashStatus: paymentMethod === "cash" ? cashStatus : undefined,
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
    setStep("plan");
    setSelectedPlanId("");
    setSelectedPlan(null);
    setPaymentMethod("cash");
    setCashStatus("outstanding");
    setStartDate(new Date().toISOString().split("T")[0]);
    setNotes("");
    setError("");
  };

  if (!isOpen) return null;

  const priceInPennies =
    selectedPlan?.price_pennies ||
    (selectedPlan?.price ? selectedPlan.price * 100 : 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {step === "payment" && (
              <button
                onClick={() => setStep("plan")}
                className="text-gray-400 hover:text-white"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            )}
            <h2 className="text-xl font-semibold text-white">
              {step === "plan" ? "Select Membership Plan" : "Payment Details"}
            </h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="text-gray-400 mb-4">
          {step === "plan"
            ? "Choose a membership plan for"
            : "Complete payment for"}{" "}
          <span className="text-white font-medium">{customerName}</span>
        </p>

        {step === "plan" ? (
          <form onSubmit={handlePlanSelection} className="space-y-4">
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
                  const groupedPlans = membershipPlans.reduce(
                    (acc, plan) => {
                      const category = plan.category || "Uncategorized";
                      if (!acc[category]) acc[category] = [];
                      acc[category].push(plan);
                      return acc;
                    },
                    {} as Record<string, any[]>,
                  );

                  const sortedCategories = Object.keys(groupedPlans).sort(
                    (a, b) => {
                      if (a === "Uncategorized") return 1;
                      if (b === "Uncategorized") return -1;
                      return a.localeCompare(b);
                    },
                  );

                  sortedCategories.forEach((category) => {
                    groupedPlans[category].sort((a, b) =>
                      a.name.localeCompare(b.name),
                    );
                  });

                  return sortedCategories.map((category) => (
                    <optgroup key={category} label={category}>
                      {groupedPlans[category].map((plan) => {
                        const planPrice =
                          plan.price_pennies ||
                          (plan.price ? plan.price * 100 : 0);
                        return (
                          <option key={plan.id} value={plan.id}>
                            {plan.name} -{" "}
                            {formatBritishCurrency(planPrice, true)}/
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
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                disabled={!selectedPlanId}
              >
                Next: Payment
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Selected Plan Summary */}
            <div className="bg-gray-700 rounded-lg p-4">
              <p className="text-sm text-gray-400">Selected Plan</p>
              <p className="text-white font-medium">{selectedPlan?.name}</p>
              <p className="text-lg font-semibold text-blue-400">
                {formatBritishCurrency(priceInPennies, true)}/
                {selectedPlan?.billing_period}
              </p>
            </div>

            {/* Payment Method Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Payment Method *
              </label>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("cash")}
                  className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-colors ${
                    paymentMethod === "cash"
                      ? "border-blue-500 bg-blue-600 bg-opacity-10"
                      : "border-gray-600 bg-gray-700 hover:border-gray-500"
                  }`}
                >
                  <p className="font-medium text-white">Cash</p>
                  <p className="text-sm text-gray-400">
                    Pay in person with cash
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod("card")}
                  className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-colors ${
                    paymentMethod === "card"
                      ? "border-blue-500 bg-blue-600 bg-opacity-10"
                      : "border-gray-600 bg-gray-700 hover:border-gray-500"
                  }`}
                >
                  <p className="font-medium text-white">Credit/Debit Card</p>
                  <p className="text-sm text-gray-400">
                    Pay with card over the phone
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod("direct_debit")}
                  className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-colors ${
                    paymentMethod === "direct_debit"
                      ? "border-blue-500 bg-blue-600 bg-opacity-10"
                      : "border-gray-600 bg-gray-700 hover:border-gray-500"
                  }`}
                >
                  <p className="font-medium text-white">Direct Debit</p>
                  <p className="text-sm text-gray-400">
                    Set up recurring payments
                  </p>
                </button>
              </div>
            </div>

            {/* Cash Status Options */}
            {paymentMethod === "cash" && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Cash Status *
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setCashStatus("outstanding")}
                    className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                      cashStatus === "outstanding"
                        ? "bg-yellow-600 text-white"
                        : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                    }`}
                  >
                    Outstanding
                  </button>
                  <button
                    type="button"
                    onClick={() => setCashStatus("received")}
                    className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                      cashStatus === "received"
                        ? "bg-green-600 text-white"
                        : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                    }`}
                  >
                    Received
                  </button>
                </div>
              </div>
            )}

            {/* Card Payment Note */}
            {paymentMethod === "card" && (
              <div className="bg-blue-600 bg-opacity-10 border border-blue-500 rounded-lg p-3">
                <p className="text-blue-400 text-sm">
                  Card payment will be processed over the phone. The membership
                  will be activated once payment is confirmed.
                </p>
              </div>
            )}

            {/* Direct Debit Note */}
            {paymentMethod === "direct_debit" && (
              <div className="bg-blue-600 bg-opacity-10 border border-blue-500 rounded-lg p-3">
                <p className="text-blue-400 text-sm">
                  Direct Debit mandate will be set up separately. The membership
                  will be activated once the mandate is confirmed.
                </p>
              </div>
            )}

            {error && (
              <div className="bg-red-600 bg-opacity-20 border border-red-600 rounded-lg p-3">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep("plan")}
                className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
                disabled={loading}
              >
                Back
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading}
              >
                {loading ? "Processing..." : "Complete Membership"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
