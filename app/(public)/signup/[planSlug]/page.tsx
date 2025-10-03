"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/app/lib/supabase/client";
import { Check, Loader2 } from "lucide-react";

interface Plan {
  id: string;
  name: string;
  slug: string;
  description: string;
  price_monthly: number;
  price_yearly: number;
  features: any;
  limits: any;
  stripe_product_id?: string;
  stripe_price_id?: string;
  stripe_price_id_yearly?: string;
}

export default function PlanSignupPage() {
  const params = useParams();
  const router = useRouter();
  const planSlug = params.planSlug as string;

  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">(
    "monthly",
  );
  const [processing, setProcessing] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    loadPlan();
  }, [planSlug]);

  const loadPlan = async () => {
    try {
      const { data, error } = await supabase
        .from("saas_plans")
        .select("*")
        .ilike("slug", planSlug)
        .eq("is_active", true)
        .single();

      if (error || !data) {
        console.error("Error loading plan:", error);
        return;
      }

      setPlan(data);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async () => {
    if (!plan) return;

    setProcessing(true);
    try {
      const response = await fetch("/api/billing/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: plan.id,
          billingPeriod,
        }),
      });

      const { url, error } = await response.json();

      if (error) {
        alert(`Error: ${error}`);
        setProcessing(false);
        return;
      }

      // Redirect to Stripe Checkout
      window.location.href = url;
    } catch (error) {
      console.error("Error creating checkout session:", error);
      alert("Failed to start checkout process");
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Plan Not Found</h1>
          <p className="text-gray-400">
            This plan does not exist or is no longer available.
          </p>
        </div>
      </div>
    );
  }

  const price =
    billingPeriod === "monthly" ? plan.price_monthly : plan.price_yearly;
  const displayPrice = (price / 100).toFixed(2);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">
            Subscribe to {plan.name}
          </h1>
          <p className="text-xl text-gray-300">{plan.description}</p>
        </div>

        {/* Billing Period Toggle */}
        <div className="flex justify-center mb-8">
          <div className="bg-gray-800 rounded-lg p-1 inline-flex">
            <button
              onClick={() => setBillingPeriod("monthly")}
              className={`px-6 py-2 rounded-md font-medium transition-colors ${
                billingPeriod === "monthly"
                  ? "bg-blue-600 text-white"
                  : "text-gray-300 hover:text-white"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingPeriod("yearly")}
              className={`px-6 py-2 rounded-md font-medium transition-colors ${
                billingPeriod === "yearly"
                  ? "bg-blue-600 text-white"
                  : "text-gray-300 hover:text-white"
              }`}
            >
              Yearly
              {plan.price_yearly < plan.price_monthly * 12 && (
                <span className="ml-2 text-xs bg-green-500 text-white px-2 py-1 rounded">
                  Save{" "}
                  {Math.round(
                    (1 - plan.price_yearly / (plan.price_monthly * 12)) * 100,
                  )}
                  %
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Plan Card */}
        <div className="bg-gray-800 rounded-xl p-8 shadow-2xl">
          {/* Price */}
          <div className="text-center mb-8">
            <div className="text-5xl font-bold text-white mb-2">
              £{displayPrice}
              <span className="text-xl text-gray-400 font-normal">
                /{billingPeriod === "monthly" ? "month" : "year"}
              </span>
            </div>
          </div>

          {/* Features */}
          {plan.features && Object.keys(plan.features).length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-white mb-4">
                Features
              </h3>
              <div className="space-y-3">
                {Object.entries(plan.features).map(
                  ([category, features]: [string, any]) => (
                    <div key={category}>
                      {typeof features === "object" &&
                        Object.entries(features).map(([feature, enabled]) => {
                          if (enabled) {
                            return (
                              <div
                                key={feature}
                                className="flex items-start gap-3"
                              >
                                <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                                <span className="text-gray-300">
                                  {feature
                                    .replace(/_/g, " ")
                                    .replace(/\b\w/g, (l) => l.toUpperCase())}
                                </span>
                              </div>
                            );
                          }
                          return null;
                        })}
                    </div>
                  ),
                )}
              </div>
            </div>
          )}

          {/* Limits */}
          {plan.limits && Object.keys(plan.limits).length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-white mb-4">
                Usage Limits
              </h3>
              <div className="grid md:grid-cols-2 gap-3">
                {Object.entries(plan.limits).map(([key, value]) => {
                  if (value) {
                    return (
                      <div
                        key={key}
                        className="flex items-center gap-2 text-gray-300"
                      >
                        <Check className="w-4 h-4 text-blue-500" />
                        <span>
                          {key
                            .replace(/_/g, " ")
                            .replace(/\b\w/g, (l) => l.toUpperCase())}
                          : {value === -1 ? "Unlimited" : value}
                        </span>
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            </div>
          )}

          {/* Subscribe Button */}
          <button
            onClick={handleSubscribe}
            disabled={processing}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-4 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {processing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Processing...
              </>
            ) : (
              `Subscribe to ${plan.name}`
            )}
          </button>

          <p className="text-center text-sm text-gray-400 mt-4">
            Secure payment powered by Stripe
          </p>
        </div>
      </div>
    </div>
  );
}
