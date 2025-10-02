"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/app/lib/supabase/client";
import {
  Package,
  Plus,
  Edit,
  Trash2,
  Check,
  X,
  TrendingUp,
  Users,
  Mail,
  Brain,
} from "lucide-react";

interface BillingPlan {
  id: string;
  name: string;
  slug: string;
  description: string;
  price_monthly: number;
  price_yearly: number;
  stripe_price_id?: string;
  stripe_price_id_yearly?: string;
  stripe_product_id?: string;
  features: any;
  limits: any;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export default function BillingPlansAdmin() {
  const [plans, setPlans] = useState<BillingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPlan, setEditingPlan] = useState<BillingPlan | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const supabase = createClient();

  // Form state
  const [formData, setFormData] = useState<Partial<BillingPlan>>({
    name: "",
    slug: "",
    description: "",
    price_monthly: 0,
    price_yearly: 0,
    is_active: true,
    features: {},
    limits: {},
  });

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      const { data, error } = await supabase
        .from("saas_plans")
        .select("*")
        .order("sort_order");

      if (!error && data) {
        setPlans(data);
      }
    } catch (error) {
      console.error("Error loading plans:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Prepare data for database - use price_monthly as the base price_pennies
      const dbData = {
        name: formData.name,
        slug: formData.slug,
        description: formData.description,
        price_pennies: formData.price_monthly || 0, // Use monthly price as base
        price_monthly: formData.price_monthly,
        price_yearly: formData.price_yearly,
        billing_period: "monthly", // Default billing period
        features: formData.features || {},
        limits: formData.limits || {},
        is_active: formData.is_active ?? true,
      };

      console.log("Submitting data:", dbData);

      if (editingPlan) {
        // Update existing plan
        const { data, error } = await supabase
          .from("saas_plans")
          .update(dbData)
          .eq("id", editingPlan.id)
          .select();

        if (error) {
          console.error("Update error:", error);
          alert(`Error updating plan: ${error.message}`);
        } else {
          console.log("Update successful:", data);
          await loadPlans();
          setShowForm(false);
          setEditingPlan(null);
          resetForm();
        }
      } else {
        // Create new plan
        const { data, error } = await supabase
          .from("saas_plans")
          .insert(dbData)
          .select();

        if (error) {
          console.error("Insert error:", error);
          alert(`Error creating plan: ${error.message}`);
        } else {
          console.log("Insert successful:", data);
          await loadPlans();
          setShowForm(false);
          resetForm();
        }
      }
    } catch (error) {
      console.error("Error saving plan:", error);
    }
  };

  const handleEdit = (plan: BillingPlan) => {
    setEditingPlan(plan);
    setFormData(plan);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this plan?")) return;

    try {
      const { error } = await supabase.from("saas_plans").delete().eq("id", id);

      if (!error) {
        await loadPlans();
      }
    } catch (error) {
      console.error("Error deleting plan:", error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      slug: "",
      description: "",
      price_monthly: 0,
      price_yearly: 0,
      is_active: true,
      features: {},
      limits: {},
    });
  };

  const syncWithStripe = async () => {
    if (
      !confirm(
        "This will create/update Stripe products and prices for all active plans. Continue?",
      )
    ) {
      return;
    }

    setSyncing(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const response = await fetch("/api/admin/stripe/sync-plans", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
          "Content-Type": "application/json",
        },
      });

      const result = await response.json();

      if (response.ok) {
        alert(`Successfully synced: ${result.message}`);
        await loadPlans();
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error("Error syncing with Stripe:", error);
      alert("Failed to sync with Stripe");
    } finally {
      setSyncing(false);
    }
  };

  const updateFeature = (category: string, feature: string, value: boolean) => {
    setFormData((prev) => ({
      ...prev,
      features: {
        ...prev.features,
        [category]: {
          ...prev.features?.[category],
          [feature]: value,
        },
      },
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-800 rounded w-1/3 mb-8"></div>
          <div className="grid gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-gray-800 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Package className="h-8 w-8 text-orange-500" />
            Billing Plans Management
          </h1>
          <div className="flex gap-3">
            <button
              onClick={syncWithStripe}
              disabled={syncing}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2 disabled:opacity-50"
            >
              <TrendingUp className="h-5 w-5" />
              {syncing ? "Syncing..." : "Sync with Stripe"}
            </button>
            <button
              onClick={() => {
                setShowForm(true);
                setEditingPlan(null);
                resetForm();
              }}
              className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 flex items-center gap-2"
            >
              <Plus className="h-5 w-5" />
              Add Plan
            </button>
          </div>
        </div>

        {/* Plans Grid */}
        {!showForm && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`bg-gray-800 border ${plan.is_popular ? "border-orange-500" : "border-gray-700"} rounded-lg p-6 relative`}
              >
                {plan.is_popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-orange-500 text-white text-xs px-3 py-1 rounded-full">
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="mb-4">
                  <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                  <p className="text-gray-400 text-sm mt-1">
                    {plan.description}
                  </p>
                </div>

                <div className="mb-6">
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-3xl font-bold text-white">
                      £{plan.monthly_price || "Custom"}
                    </span>
                    {plan.monthly_price && (
                      <span className="text-gray-400">/month</span>
                    )}
                  </div>
                  {plan.annual_price && (
                    <p className="text-sm text-green-500">
                      £{plan.annual_price}/year (Save{" "}
                      {Math.round(
                        (1 - plan.annual_price / (plan.monthly_price * 12)) *
                          100,
                      )}
                      %)
                    </p>
                  )}
                </div>

                <div className="space-y-2 mb-6">
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-300">
                      {plan.max_members
                        ? `Up to ${plan.max_members} members`
                        : "Unlimited members"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-300">
                      {plan.max_email_sends_per_month
                        ? `${plan.max_email_sends_per_month} emails/mo`
                        : "Unlimited emails"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Brain className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-300">
                      {plan.max_ai_credits_per_month
                        ? `${plan.max_ai_credits_per_month} AI credits/mo`
                        : "Unlimited AI"}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(plan)}
                    className="flex-1 px-3 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 flex items-center justify-center gap-2"
                  >
                    <Edit className="h-4 w-4" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(plan.id)}
                    className="px-3 py-2 bg-red-900 text-red-300 rounded hover:bg-red-800"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {!plan.is_active && (
                  <div className="absolute inset-0 bg-gray-900 bg-opacity-75 rounded-lg flex items-center justify-center">
                    <span className="text-gray-400 font-semibold">
                      Inactive
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Plan Form */}
        {showForm && (
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-8">
            <h2 className="text-2xl font-bold text-white mb-6">
              {editingPlan ? "Edit Plan" : "Create New Plan"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Info */}
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Plan Name
                  </label>
                  <input
                    type="text"
                    value={formData.name || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Slug
                  </label>
                  <input
                    type="text"
                    value={formData.slug || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        slug: e.target.value.toLowerCase().replace(/\s+/g, "-"),
                      })
                    }
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  rows={3}
                />
              </div>

              {/* Pricing */}
              <div className="border-t border-gray-700 pt-6">
                <h3 className="text-lg font-semibold text-white mb-4">
                  Pricing
                </h3>
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Monthly Price (£)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.monthly_price || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          monthly_price: parseFloat(e.target.value),
                        })
                      }
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Annual Price (£)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.annual_price || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          annual_price: parseFloat(e.target.value),
                        })
                      }
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Setup Fee (£)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.setup_fee || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          setup_fee: parseFloat(e.target.value),
                        })
                      }
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Limits */}
              <div className="border-t border-gray-700 pt-6">
                <h3 className="text-lg font-semibold text-white mb-4">
                  Usage Limits (Leave empty for unlimited)
                </h3>
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Max Members
                    </label>
                    <input
                      type="number"
                      value={formData.max_members || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          max_members: e.target.value
                            ? parseInt(e.target.value)
                            : null,
                        })
                      }
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Max Staff
                    </label>
                    <input
                      type="number"
                      value={formData.max_staff || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          max_staff: e.target.value
                            ? parseInt(e.target.value)
                            : null,
                        })
                      }
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Max Locations
                    </label>
                    <input
                      type="number"
                      value={formData.max_locations || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          max_locations: parseInt(e.target.value),
                        })
                      }
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Emails/Month
                    </label>
                    <input
                      type="number"
                      value={formData.max_email_sends_per_month || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          max_email_sends_per_month: e.target.value
                            ? parseInt(e.target.value)
                            : null,
                        })
                      }
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      SMS/Month
                    </label>
                    <input
                      type="number"
                      value={formData.max_sms_sends_per_month || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          max_sms_sends_per_month: e.target.value
                            ? parseInt(e.target.value)
                            : null,
                        })
                      }
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      AI Credits/Month
                    </label>
                    <input
                      type="number"
                      value={formData.max_ai_credits_per_month || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          max_ai_credits_per_month: e.target.value
                            ? parseInt(e.target.value)
                            : null,
                        })
                      }
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Features */}
              <div className="border-t border-gray-700 pt-6">
                <h3 className="text-lg font-semibold text-white mb-4">
                  Features
                </h3>

                {/* Core Features */}
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-400 mb-2">
                    Core Features
                  </h4>
                  <div className="grid md:grid-cols-3 gap-3">
                    {[
                      "lead_management",
                      "booking_system",
                      "class_scheduling",
                      "member_portal",
                      "staff_management",
                    ].map((feature) => (
                      <label
                        key={feature}
                        className="flex items-center gap-2 text-gray-300"
                      >
                        <input
                          type="checkbox"
                          checked={formData.features?.core?.[feature] || false}
                          onChange={(e) =>
                            updateFeature("core", feature, e.target.checked)
                          }
                          className="rounded text-orange-500"
                        />
                        {feature
                          .replace(/_/g, " ")
                          .replace(/\b\w/g, (l) => l.toUpperCase())}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Communication Features */}
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-400 mb-2">
                    Communication
                  </h4>
                  <div className="grid md:grid-cols-3 gap-3">
                    {[
                      "email",
                      "sms",
                      "whatsapp",
                      "voice_calls",
                      "dedicated_email_server",
                    ].map((feature) => (
                      <label
                        key={feature}
                        className="flex items-center gap-2 text-gray-300"
                      >
                        <input
                          type="checkbox"
                          checked={
                            formData.features?.communication?.[feature] || false
                          }
                          onChange={(e) =>
                            updateFeature(
                              "communication",
                              feature,
                              e.target.checked,
                            )
                          }
                          className="rounded text-orange-500"
                        />
                        {feature
                          .replace(/_/g, " ")
                          .replace(/\b\w/g, (l) => l.toUpperCase())}
                      </label>
                    ))}
                  </div>
                </div>

                {/* AI Features */}
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-400 mb-2">
                    AI Features
                  </h4>
                  <div className="grid md:grid-cols-3 gap-3">
                    {[
                      "lead_scoring",
                      "content_generation",
                      "chat_assistant",
                      "workout_generation",
                      "nutrition_planning",
                    ].map((feature) => (
                      <label
                        key={feature}
                        className="flex items-center gap-2 text-gray-300"
                      >
                        <input
                          type="checkbox"
                          checked={formData.features?.ai?.[feature] || false}
                          onChange={(e) =>
                            updateFeature("ai", feature, e.target.checked)
                          }
                          className="rounded text-orange-500"
                        />
                        {feature
                          .replace(/_/g, " ")
                          .replace(/\b\w/g, (l) => l.toUpperCase())}
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Status */}
              <div className="border-t border-gray-700 pt-6">
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-gray-300">
                    <input
                      type="checkbox"
                      checked={formData.is_active || false}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          is_active: e.target.checked,
                        })
                      }
                      className="rounded text-orange-500"
                    />
                    Active Plan
                  </label>

                  <label className="flex items-center gap-2 text-gray-300">
                    <input
                      type="checkbox"
                      checked={formData.is_popular || false}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          is_popular: e.target.checked,
                        })
                      }
                      className="rounded text-orange-500"
                    />
                    Mark as Popular
                  </label>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-4 pt-6">
                <button
                  type="submit"
                  className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
                >
                  {editingPlan ? "Update Plan" : "Create Plan"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingPlan(null);
                    resetForm();
                  }}
                  className="px-6 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
