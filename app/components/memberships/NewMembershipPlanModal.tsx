"use client";

import React, { useState } from "react";
import { X, Save } from "lucide-react";
import toast from "@/app/lib/toast";

interface NewMembershipPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const NewMembershipPlanModal: React.FC<NewMembershipPlanModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    duration: "1",
    durationType: "month",
    features: [""],
    maxMembers: "",
    trialDays: "0",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleAddFeature = () => {
    setFormData({
      ...formData,
      features: [...formData.features, ""],
    });
  };

  const handleRemoveFeature = (index: number) => {
    setFormData({
      ...formData,
      features: formData.features.filter((_, i) => i !== index),
    });
  };

  const handleFeatureChange = (index: number, value: string) => {
    const newFeatures = [...formData.features];
    newFeatures[index] = value;
    setFormData({
      ...formData,
      features: newFeatures,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      // Validate price
      if (
        !formData.price ||
        isNaN(parseFloat(formData.price)) ||
        parseFloat(formData.price) <= 0
      ) {
        toast.error("Please enter a valid price");
        setIsSubmitting(false);
        return;
      }

      // Convert price to pence (database expects price_pennies as integer)
      const pricePennies = Math.round(parseFloat(formData.price) * 100);

      console.log("DEBUG: Price conversion", {
        formDataPrice: formData.price,
        parsedFloat: parseFloat(formData.price),
        pricePennies: pricePennies,
      });

      // Determine billing period
      let billingPeriod = "monthly";
      if (formData.durationType === "year") {
        billingPeriod = "yearly";
      } else if (formData.durationType === "day" && formData.duration === "1") {
        billingPeriod = "one_time";
      }

      // Save membership plan via API
      const requestData = {
        name: formData.name,
        description: formData.description,
        price_pennies: pricePennies,
        billing_period: billingPeriod,
        features: formData.features.filter((f) => f.trim() !== ""),
        is_active: true,
        trial_days: parseInt(formData.trialDays) || 0,
        class_limit: formData.maxMembers ? parseInt(formData.maxMembers) : null,
      };

      console.log("Creating membership plan with data:", requestData);

      const response = await fetch("/api/membership-plans", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error("API error:", result);
        toast.error(result.error || "Failed to create membership plan");
        setIsSubmitting(false);
        return;
      }

      toast.success("Membership plan created successfully!");

      // Reset form
      setFormData({
        name: "",
        description: "",
        price: "",
        duration: "1",
        durationType: "month",
        features: [""],
        maxMembers: "",
        trialDays: "0",
      });

      onClose();

      // Reload page to refresh the list
      window.location.reload();
    } catch (error: any) {
      console.error("Error:", error);
      toast.error(`An error occurred: ${error.message || "Please try again"}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gray-800 flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <h3 className="text-lg font-semibold text-white">
            Create New Membership Plan
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Plan Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-orange-500"
                placeholder="e.g., Premium Monthly"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Price
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                  £
                </span>
                <input
                  type="number"
                  value={formData.price}
                  onChange={(e) =>
                    setFormData({ ...formData, price: e.target.value })
                  }
                  className="w-full pl-8 pr-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-orange-500"
                  placeholder="99.99"
                  step="0.01"
                  required
                />
              </div>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-orange-500"
              rows={3}
              placeholder="Brief description of this membership plan"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Duration
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={formData.duration}
                  onChange={(e) =>
                    setFormData({ ...formData, duration: e.target.value })
                  }
                  className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-orange-500"
                  min="1"
                  required
                />
                <select
                  value={formData.durationType}
                  onChange={(e) =>
                    setFormData({ ...formData, durationType: e.target.value })
                  }
                  className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-orange-500"
                >
                  <option value="day">Day(s)</option>
                  <option value="week">Week(s)</option>
                  <option value="month">Month(s)</option>
                  <option value="year">Year(s)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Trial Days
              </label>
              <input
                type="number"
                value={formData.trialDays}
                onChange={(e) =>
                  setFormData({ ...formData, trialDays: e.target.value })
                }
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-orange-500"
                min="0"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Features
            </label>
            <div className="space-y-2">
              {formData.features.map((feature, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={feature}
                    onChange={(e) => handleFeatureChange(index, e.target.value)}
                    className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-orange-500"
                    placeholder="e.g., Unlimited gym access"
                  />
                  {formData.features.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveFeature(index)}
                      className="px-3 py-2 text-red-500 hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={handleAddFeature}
                className="text-orange-500 hover:text-orange-400 text-sm transition-colors"
              >
                + Add Feature
              </button>
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Maximum Members (Optional)
            </label>
            <input
              type="number"
              value={formData.maxMembers}
              onChange={(e) =>
                setFormData({ ...formData, maxMembers: e.target.value })
              }
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-orange-500"
              placeholder="Leave empty for unlimited"
              min="1"
            />
          </div>

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center gap-2 text-white"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Creating...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Create Plan
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewMembershipPlanModal;
