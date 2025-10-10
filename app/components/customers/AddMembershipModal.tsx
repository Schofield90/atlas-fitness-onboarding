"use client";

import { useState, useEffect } from "react";
import { X, ArrowLeft } from "lucide-react";
import { formatBritishCurrency } from "@/app/lib/utils/british-format";
import { useOrganization } from "@/app/hooks/useOrganization";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import StripePaymentForm from "./StripePaymentForm";

// Initialize Stripe
const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!,
);

interface AddMembershipModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerId: string;
  customerName: string;
  customerEmail?: string;
  onSuccess: () => void;
}

type CheckoutStep = "plan" | "payment" | "card_payment";
type PaymentMethod = "cash" | "card" | "direct_debit";
type CashStatus = "outstanding" | "received";

export default function AddMembershipModal({
  isOpen,
  onClose,
  customerId,
  customerName,
  customerEmail,
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
  const [discountCode, setDiscountCode] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [discountAmount, setDiscountAmount] = useState(0);
  const [validatingCode, setValidatingCode] = useState(false);
  const [validatingReferral, setValidatingReferral] = useState(false);
  const [validatedDiscountCode, setValidatedDiscountCode] = useState<any>(null);
  const [validatedReferralCode, setValidatedReferralCode] = useState<any>(null);
  const [customPrice, setCustomPrice] = useState<string>("");
  const [useCustomPrice, setUseCustomPrice] = useState(false);
  const [finalPrice, setFinalPrice] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
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
    setDiscountCode("");
    setReferralCode("");
    setDiscountAmount(0);
    setClientSecret(null);
    setPaymentIntentId(null);
    setError("");
  };

  if (!isOpen) return null;

  const priceInPennies =
    selectedPlan?.price_pennies ||
    (selectedPlan?.price ? selectedPlan.price * 100 : 0);

  // Calculate final price: custom price overrides plan price and discounts
  const finalPriceInPennies =
    useCustomPrice && customPrice
      ? Math.round(parseFloat(customPrice) * 100)
      : priceInPennies - discountAmount;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {(step === "payment" || step === "card_payment") && (
              <button
                onClick={() => {
                  if (step === "card_payment") {
                    setStep("payment");
                    setClientSecret(null);
                    setPaymentIntentId(null);
                  } else {
                    setStep("plan");
                  }
                }}
                className="text-gray-400 hover:text-white"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            )}
            <h2 className="text-xl font-semibold text-white">
              {step === "plan"
                ? "Select Membership Plan"
                : step === "card_payment"
                  ? "Card Payment"
                  : "Payment Details"}
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
        ) : step === "payment" ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Selected Plan Summary */}
            <div className="bg-gray-700 rounded-lg p-4">
              <p className="text-sm text-gray-400">Selected Plan</p>
              <p className="text-white font-medium">{selectedPlan?.name}</p>
              {useCustomPrice ? (
                <div>
                  <p className="text-sm text-gray-400 line-through">
                    {formatBritishCurrency(priceInPennies, true)}
                  </p>
                  <p className="text-lg font-semibold text-orange-400">
                    {formatBritishCurrency(finalPriceInPennies, true)}/
                    {selectedPlan?.billing_period}
                  </p>
                  <p className="text-xs text-orange-400 mt-1">
                    Custom price applied
                  </p>
                </div>
              ) : discountAmount > 0 ? (
                <div>
                  <p className="text-sm text-gray-400 line-through">
                    {formatBritishCurrency(priceInPennies, true)}
                  </p>
                  <p className="text-lg font-semibold text-green-400">
                    {formatBritishCurrency(finalPriceInPennies, true)}/
                    {selectedPlan?.billing_period}
                  </p>
                  <p className="text-xs text-green-400 mt-1">
                    Saved {formatBritishCurrency(discountAmount, true)}
                  </p>
                </div>
              ) : (
                <p className="text-lg font-semibold text-blue-400">
                  {formatBritishCurrency(priceInPennies, true)}/
                  {selectedPlan?.billing_period}
                </p>
              )}

              {/* Manual Price Adjustment Toggle */}
              <div className="mt-4 pt-4 border-t border-gray-600">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useCustomPrice}
                    onChange={(e) => {
                      setUseCustomPrice(e.target.checked);
                      if (!e.target.checked) {
                        setCustomPrice("");
                      }
                    }}
                    className="w-4 h-4 text-orange-600 bg-gray-700 border-gray-600 rounded focus:ring-orange-500"
                  />
                  <span className="text-sm text-gray-300">
                    Override with custom price
                  </span>
                </label>
              </div>

              {useCustomPrice && (
                <div className="mt-3">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Custom Amount (£)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={customPrice}
                    onChange={(e) => setCustomPrice(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-gray-800 text-white rounded-lg px-4 py-2 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    This will override the plan price and any discounts
                  </p>
                </div>
              )}
            </div>

            {/* Discount & Referral Codes */}
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Discount Code (Optional)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={discountCode}
                    onChange={(e) =>
                      setDiscountCode(e.target.value.toUpperCase())
                    }
                    placeholder="Enter discount code"
                    className="flex-1 bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      if (!discountCode) return;

                      try {
                        setValidatingCode(true);
                        setError("");

                        const response = await fetch(
                          "/api/discount-codes/validate",
                          {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              code: discountCode,
                              customerId,
                              membershipPlanId: selectedPlanId,
                              purchaseAmount: priceInPennies,
                            }),
                          },
                        );

                        const data = await response.json();

                        if (!response.ok || !data.success) {
                          setError(data.error || "Invalid discount code");
                          setDiscountAmount(0);
                          setValidatedDiscountCode(null);
                          return;
                        }

                        // Valid discount code
                        setDiscountAmount(data.data.discountAmount);
                        setValidatedDiscountCode(data.data.discountCode);
                        setError("");
                      } catch (err: any) {
                        console.error("Error validating discount code:", err);
                        setError("Failed to validate discount code");
                        setDiscountAmount(0);
                        setValidatedDiscountCode(null);
                      } finally {
                        setValidatingCode(false);
                      }
                    }}
                    disabled={!discountCode || validatingCode}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {validatingCode ? "Validating..." : "Apply"}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Referral Code (Optional)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={referralCode}
                    onChange={(e) =>
                      setReferralCode(e.target.value.toUpperCase())
                    }
                    placeholder="Who referred this member?"
                    className="flex-1 bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      if (!referralCode) return;

                      try {
                        setValidatingReferral(true);
                        setError("");

                        const response = await fetch(
                          "/api/referral-codes/validate",
                          {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              code: referralCode,
                              refereeClientId: customerId,
                            }),
                          },
                        );

                        const data = await response.json();

                        if (!response.ok || !data.success) {
                          setError(data.error || "Invalid referral code");
                          setValidatedReferralCode(null);
                          return;
                        }

                        // Valid referral code
                        setValidatedReferralCode(data.data.referralCode);
                        setError("");
                      } catch (err: any) {
                        console.error("Error validating referral code:", err);
                        setError("Failed to validate referral code");
                        setValidatedReferralCode(null);
                      } finally {
                        setValidatingReferral(false);
                      }
                    }}
                    disabled={!referralCode || validatingReferral}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {validatingReferral ? "Validating..." : "Apply"}
                  </button>
                </div>
                {validatedReferralCode && (
                  <p className="text-sm text-green-400 mt-2">
                    ✓ Valid referral code! Referrer will receive £
                    {validatedReferralCode.credit_amount} credit
                  </p>
                )}
              </div>
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
                  onClick={async () => {
                    setPaymentMethod("card");
                    setLoading(true);
                    setError("");

                    try {
                      // Create Payment Intent
                      const response = await fetch(
                        "/api/stripe/create-payment-intent",
                        {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            amount: finalPriceInPennies,
                            customerId,
                            customerEmail: "", // TODO: Get from customer data
                            customerName,
                            description: `${selectedPlan?.name} membership for ${customerName}`,
                          }),
                        },
                      );

                      const data = await response.json();

                      if (!response.ok || !data.success) {
                        setError(
                          data.error ||
                            "Failed to initialize card payment. Please try again.",
                        );
                        setPaymentMethod("cash");
                        return;
                      }

                      setClientSecret(data.clientSecret);
                      setPaymentIntentId(data.paymentIntentId);
                      setStep("card_payment");
                    } catch (err: any) {
                      console.error("Error creating payment intent:", err);
                      setError(
                        "Failed to initialize card payment. Please try again.",
                      );
                      setPaymentMethod("cash");
                    } finally {
                      setLoading(false);
                    }
                  }}
                  disabled={loading}
                  className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-colors ${
                    paymentMethod === "card"
                      ? "border-blue-500 bg-blue-600 bg-opacity-10"
                      : "border-gray-600 bg-gray-700 hover:border-gray-500"
                  } ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <p className="font-medium text-white">Credit/Debit Card</p>
                  <p className="text-sm text-gray-400">
                    {loading ? "Loading payment form..." : "Pay with card now"}
                  </p>
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    setPaymentMethod("direct_debit");
                    setLoading(true);
                    setError("");

                    try {
                      // Create GoCardless redirect flow
                      const response = await fetch(
                        "/api/gocardless/create-redirect-flow",
                        {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            customerId,
                            customerEmail: "", // TODO: Get from customer data
                            customerName,
                            membershipData: {
                              membership_plan_id: selectedPlan?.id,
                              start_date: startDate,
                              end_date: endDate,
                              billing_period: billingPeriod,
                              amount: finalPriceInPennies / 100,
                              discount_code: discountCode,
                              discount_amount: discountAmount,
                              plan_name: selectedPlan?.name,
                              charge_immediately:
                                billingPeriod === "one_time" ||
                                billingPeriod === "upfront",
                            },
                          }),
                        },
                      );

                      const data = await response.json();

                      if (!response.ok || !data.success) {
                        setError(
                          data.error ||
                            "Failed to initialize Direct Debit. Please try again.",
                        );
                        setPaymentMethod("cash");
                        return;
                      }

                      // Redirect to GoCardless authorization page
                      window.location.href = data.redirectUrl;
                    } catch (err: any) {
                      console.error(
                        "Error creating GoCardless redirect flow:",
                        err,
                      );
                      setError(
                        "Failed to initialize Direct Debit. Please try again.",
                      );
                      setPaymentMethod("cash");
                    } finally {
                      setLoading(false);
                    }
                  }}
                  disabled={loading}
                  className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-colors ${
                    paymentMethod === "direct_debit"
                      ? "border-blue-500 bg-blue-600 bg-opacity-10"
                      : "border-gray-600 bg-gray-700 hover:border-gray-500"
                  } ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <p className="font-medium text-white">Direct Debit</p>
                  <p className="text-sm text-gray-400">
                    {loading
                      ? "Setting up Direct Debit..."
                      : "Set up recurring payments"}
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

            {/* Direct Debit Note */}
            {paymentMethod === "direct_debit" && (
              <div className="bg-blue-600 bg-opacity-10 border border-blue-500 rounded-lg p-3">
                <p className="text-blue-400 text-sm font-medium mb-2">
                  Direct Debit - Next Steps:
                </p>
                <ul className="text-blue-400 text-sm space-y-1 list-disc list-inside">
                  <li>
                    Membership will be created with "Pending" payment status
                  </li>
                  <li>Send Direct Debit mandate form to the member</li>
                  <li>
                    Set up recurring payment via your GoCardless dashboard
                  </li>
                  <li>
                    Payment will process automatically on the billing date
                  </li>
                </ul>
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
        ) : step === "card_payment" && clientSecret ? (
          <div className="space-y-4">
            {/* Selected Plan Summary */}
            <div className="bg-gray-700 rounded-lg p-4">
              <p className="text-sm text-gray-400">Selected Plan</p>
              <p className="text-white font-medium">{selectedPlan?.name}</p>
              {discountAmount > 0 ? (
                <div>
                  <p className="text-sm text-gray-400 line-through">
                    {formatBritishCurrency(priceInPennies, true)}
                  </p>
                  <p className="text-lg font-semibold text-green-400">
                    {formatBritishCurrency(finalPriceInPennies, true)}/
                    {selectedPlan?.billing_period}
                  </p>
                  <p className="text-xs text-green-400 mt-1">
                    Saved {formatBritishCurrency(discountAmount, true)}
                  </p>
                </div>
              ) : (
                <p className="text-lg font-semibold text-blue-400">
                  {formatBritishCurrency(priceInPennies, true)}/
                  {selectedPlan?.billing_period}
                </p>
              )}
            </div>

            {/* Stripe Elements Payment Form */}
            <Elements
              stripe={stripePromise}
              options={{
                clientSecret,
                appearance: {
                  theme: "night",
                  variables: {
                    colorPrimary: "#3b82f6",
                    colorBackground: "#374151",
                    colorText: "#ffffff",
                    colorDanger: "#ef4444",
                    fontFamily: "system-ui, sans-serif",
                    spacingUnit: "4px",
                    borderRadius: "8px",
                  },
                },
              }}
            >
              <StripePaymentForm
                amount={finalPriceInPennies}
                customerEmail={customerEmail}
                onSuccess={async (paymentIntentId, saveCard) => {
                  // Payment successful - create membership
                  setLoading(true);
                  try {
                    const response = await fetch("/api/customer-memberships", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        customerId,
                        membershipPlanId: selectedPlanId,
                        startDate,
                        notes,
                        paymentMethod: "card",
                        paymentIntentId,
                        discountCodeId: validatedDiscountCode?.id || undefined,
                        discountAmount: discountAmount || 0,
                        referralCodeId: validatedReferralCode?.id || undefined,
                        saveCard: saveCard || false,
                      }),
                    });

                    const data = await response.json();

                    if (!response.ok) {
                      setError(
                        data.error ||
                          "Payment succeeded but failed to create membership. Please contact support.",
                      );
                      return;
                    }

                    onSuccess();
                    onClose();
                    resetForm();
                  } catch (error: any) {
                    console.error("Error creating membership:", error);
                    setError(
                      "Payment succeeded but failed to create membership. Please contact support.",
                    );
                  } finally {
                    setLoading(false);
                  }
                }}
                onError={(error) => {
                  setError(error);
                }}
                onCancel={() => {
                  setStep("payment");
                  setClientSecret(null);
                  setPaymentIntentId(null);
                  setPaymentMethod("cash");
                }}
              />
            </Elements>
          </div>
        ) : null}
      </div>
    </div>
  );
}
