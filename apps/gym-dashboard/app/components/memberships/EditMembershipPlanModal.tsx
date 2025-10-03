"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { createClient } from "@/app/lib/supabase/client";
import toast from "@/app/lib/toast";
import { formatBritishCurrency } from "@/app/lib/utils/british-format";
import type { MembershipPlan } from "@/app/lib/services/membership-service";
import { getCurrentUserOrganization } from "@/app/lib/organization-service";

interface EditMembershipPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  plan: MembershipPlan | null;
}

export default function EditMembershipPlanModal({
  isOpen,
  onClose,
  onSuccess,
  plan,
}: EditMembershipPlanModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    billing_period: "monthly" as "daily" | "weekly" | "monthly" | "yearly",
    features: [""],
    is_active: true,
    max_members: "",
    trial_days: "0",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (plan) {
      setFormData({
        name: plan.name || "",
        description: plan.description || "",
        price: plan.price_pennies ? (plan.price_pennies / 100).toFixed(2) : "",
        billing_period: plan.billing_period || "monthly",
        features:
          plan.features && plan.features.length > 0 ? plan.features : [""],
        is_active: plan.is_active !== undefined ? plan.is_active : true,
        max_members: plan.max_members ? plan.max_members.toString() : "",
        trial_days: plan.trial_days ? plan.trial_days.toString() : "0",
      });
    }
  }, [plan]);

  if (!isOpen || !plan) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.price) {
      toast.error("Please fill in all required fields");
      return;
    }

    setLoading(true);
    const supabase = createClient();

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be logged in to update membership plans");
        return;
      }

      // Get organization ID via centralized resolver
      const { organizationId, error: orgError } =
        await getCurrentUserOrganization();
      if (orgError || !organizationId) {
        toast.error(
          orgError || "No organization found. Please contact support.",
        );
        return;
      }

      // Filter out empty features
      const features = formData.features.filter((f) => f.trim() !== "");

      // Update the membership plan
      const { error } = await supabase
        .from("membership_plans")
        .update({
          name: formData.name,
          description: formData.description || null,
          price: Math.round(parseFloat(formData.price) * 100), // Convert to pence and use 'price' column
          billing_period: formData.billing_period,
          features: features.length > 0 ? features : null,
          is_active: formData.is_active,
          class_limit: formData.max_members
            ? parseInt(formData.max_members)
            : null,
          trial_days: parseInt(formData.trial_days) || 0,
          updated_at: new Date().toISOString(),
        })
        .eq("id", plan.id)
        .eq("organization_id", organizationId);

      if (error) {
        console.error("Error updating membership plan:", error);
        toast.error("Failed to update membership plan");
        return;
      }

      toast.success("Membership plan updated successfully");
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error("Error:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const addFeature = () => {
    setFormData((prev) => ({
      ...prev,
      features: [...prev.features, ""],
    }));
  };

  const removeFeature = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index),
    }));
  };

  const updateFeature = (index: number, value: string) => {
    setFormData((prev) => ({
      ...prev,
      features: prev.features.map((f, i) => (i === index ? value : f)),
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Edit Membership Plan</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Plan Name */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              Plan Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              className="w-full bg-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="e.g., Premium Membership"
              required
            />
          </div>

          {/* Description */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              className="w-full bg-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              rows={3}
              placeholder="Describe what's included in this membership..."
            />
          </div>

          {/* Price and Billing */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Price (£) *
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, price: e.target.value }))
                }
                className="w-full bg-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="49.99"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Billing Period *
              </label>
              <select
                value={formData.billing_period}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    billing_period: e.target.value as any,
                  }))
                }
                className="w-full bg-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
          </div>

          {/* Features */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Features</label>
            {formData.features.map((feature, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={feature}
                  onChange={(e) => updateFeature(index, e.target.value)}
                  className="flex-1 bg-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="e.g., Unlimited gym access"
                />
                {formData.features.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeFeature(index)}
                    className="px-3 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addFeature}
              className="text-orange-500 hover:text-orange-400 text-sm"
            >
              + Add Feature
            </button>
          </div>

          {/* Advanced Settings */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Max Members (optional)
              </label>
              <input
                type="number"
                value={formData.max_members}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    max_members: e.target.value,
                  }))
                }
                className="w-full bg-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="Unlimited"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Trial Days
              </label>
              <input
                type="number"
                value={formData.trial_days}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    trial_days: e.target.value,
                  }))
                }
                className="w-full bg-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="0"
              />
            </div>
          </div>

          {/* Active Status */}
          <div className="mb-6">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    is_active: e.target.checked,
                  }))
                }
                className="w-4 h-4 text-orange-500 bg-gray-700 rounded focus:ring-orange-500"
              />
              <span className="text-sm">
                Active (members can sign up for this plan)
              </span>
            </label>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-orange-600 hover:bg-orange-700 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? "Updating..." : "Update Plan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
