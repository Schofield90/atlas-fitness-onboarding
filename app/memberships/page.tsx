"use client";

import DashboardLayout from "../components/DashboardLayout";
import { useState, useEffect } from "react";
import NewMembershipPlanModal from "../components/memberships/NewMembershipPlanModal";
import EditMembershipPlanModal from "../components/memberships/EditMembershipPlanModal";
import CategoryManagementModal from "../components/memberships/CategoryManagementModal";
import {
  formatBritishCurrency,
  formatBritishDate,
} from "@/app/lib/utils/british-format";
import {
  getMembershipPlans,
  type MembershipPlan,
} from "@/app/lib/services/membership-service";
import { Settings, MoreVertical, Edit, Users, Copy, Trash, FolderKanban, Tag, CheckSquare, Square, X } from "lucide-react";
import toast from "@/app/lib/toast";
import { useRouter } from "next/navigation";

export default function MembershipsPage() {
  const [activeTab, setActiveTab] = useState("plans");
  const [showNewPlanModal, setShowNewPlanModal] = useState(false);
  const [showEditPlanModal, setShowEditPlanModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<MembershipPlan | null>(null);
  const [membershipPlans, setMembershipPlans] = useState<MembershipPlan[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [providerFilter, setProviderFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [selectedPlans, setSelectedPlans] = useState<Set<string>>(new Set());
  const [bulkCategory, setBulkCategory] = useState<string>("");
  const [updatingBulk, setUpdatingBulk] = useState(false);
  const router = useRouter();

  const handleNewPlan = () => {
    setShowNewPlanModal(true);
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/membership-categories");
      const result = await response.json();

      if (response.ok) {
        setCategories(result.categories || []);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const fetchMembershipPlans = async () => {
    console.log("Starting to fetch membership plans...");
    setLoading(true);
    try {
      const { plans, error } = await getMembershipPlans();

      if (error) {
        console.error("Error fetching membership plans:", error);
      } else {
        console.log(
          "Received plans:",
          plans.map((p) => ({
            name: p.name,
            price_pennies: p.price_pennies,
            price: (p as any).price, // Check if price field exists
          })),
        );
        setMembershipPlans(plans);
        console.log("Set membership plans:", plans.length, "plans");
      }
    } catch (error) {
      console.error("Unexpected error:", error);
    } finally {
      console.log("Setting loading to false");
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembershipPlans();
    fetchCategories();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openDropdown && !(event.target as Element).closest(".relative")) {
        setOpenDropdown(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openDropdown]);

  const handleModalClose = () => {
    setShowNewPlanModal(false);
    fetchMembershipPlans(); // Refresh the list
  };

  const handleEditModalClose = () => {
    setShowEditPlanModal(false);
    setSelectedPlan(null);
    fetchMembershipPlans(); // Refresh the list
  };

  const handleEditPlan = (plan: MembershipPlan) => {
    setSelectedPlan(plan);
    setShowEditPlanModal(true);
    setOpenDropdown(null);
  };

  const handleDuplicatePlan = async (plan: MembershipPlan) => {
    try {
      const response = await fetch("/api/membership-plans", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: `${plan.name} (Copy)`,
          description: plan.description,
          price_pennies: plan.price_pennies,
          billing_period: plan.billing_period,
          features: plan.features,
          is_active: false, // Start inactive
          class_limit: plan.class_limit,
          trial_days: plan.trial_days,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error("Error duplicating plan:", result);
        toast.error(result.error || "Failed to duplicate plan");
        return;
      }

      toast.success("Plan duplicated successfully");
      fetchMembershipPlans();
    } catch (error) {
      console.error("Error:", error);
      toast.error("An unexpected error occurred");
    }
    setOpenDropdown(null);
  };

  const handleDeletePlan = async (plan: MembershipPlan) => {
    if (
      !confirm(
        `Are you sure you want to delete "${plan.name}"? This action cannot be undone.`,
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/membership-plans?id=${plan.id}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (!response.ok) {
        console.error("Error deleting plan:", result);
        toast.error(result.error || "Failed to delete plan");
        return;
      }

      toast.success("Plan deleted successfully");
      fetchMembershipPlans();
    } catch (error) {
      console.error("Error:", error);
      toast.error("An unexpected error occurred");
    }
    setOpenDropdown(null);
  };

  const handleViewMembers = (plan: MembershipPlan) => {
    setOpenDropdown(null);
    router.push(`/members?plan=${plan.id}`);
  };

  const handleToggleSelection = (planId: string) => {
    const newSelected = new Set(selectedPlans);
    if (newSelected.has(planId)) {
      newSelected.delete(planId);
    } else {
      newSelected.add(planId);
    }
    setSelectedPlans(newSelected);
  };

  const handleSelectAll = () => {
    const filteredPlanIds = membershipPlans
      .filter((plan) => {
        // Provider filter
        if (providerFilter !== "all") {
          const planProvider = (plan as any).payment_provider || "manual";
          if (planProvider !== providerFilter) return false;
        }

        // Category filter
        if (categoryFilter !== "all") {
          const planCategoryId = (plan as any).category_id;
          if (categoryFilter === "uncategorized") {
            if (planCategoryId) return false;
          } else {
            if (planCategoryId !== categoryFilter) return false;
          }
        }

        return true;
      })
      .map((p) => p.id);

    setSelectedPlans(new Set(filteredPlanIds));
  };

  const handleClearSelection = () => {
    setSelectedPlans(new Set());
    setBulkCategory("");
  };

  const handleBulkCategoryAssign = async () => {
    if (!bulkCategory || selectedPlans.size === 0) return;

    setUpdatingBulk(true);
    try {
      const updatePromises = Array.from(selectedPlans).map((planId) =>
        fetch(`/api/membership-plans?id=${planId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            category_id: bulkCategory === "none" ? null : bulkCategory,
          }),
        })
      );

      await Promise.all(updatePromises);

      toast.success(
        `Updated ${selectedPlans.size} membership${selectedPlans.size !== 1 ? "s" : ""} successfully`
      );
      handleClearSelection();
      fetchMembershipPlans();
    } catch (error) {
      console.error("Error updating memberships:", error);
      toast.error("Failed to update memberships");
    } finally {
      setUpdatingBulk(false);
    }
  };

  console.log("Render state:", {
    loading,
    membershipPlansCount: membershipPlans.length,
    activeTab,
  });

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6 flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">Membership Management</h2>
              <p className="text-gray-400 mt-1">
                Create and manage membership plans for your gym
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCategoryModal(true)}
                className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
              >
                <FolderKanban className="h-4 w-4" />
                Manage Categories
              </button>
              <button
                onClick={handleNewPlan}
                className="bg-orange-600 hover:bg-orange-700 px-4 py-2 rounded-lg transition-colors"
              >
                + New Membership Plan
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-700 mb-6">
            <nav className="flex space-x-8">
              {[
                { id: "plans", label: "Membership Plans" },
                { id: "active", label: "Active Members" },
                { id: "expired", label: "Expired/Cancelled" },
                { id: "settings", label: "Settings" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? "border-orange-500 text-orange-500"
                      : "border-transparent text-gray-400 hover:text-gray-300"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Filters */}
          {activeTab === "plans" && (
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-3">
                  <label className="text-sm text-gray-400">Provider:</label>
                  <select
                    value={providerFilter}
                    onChange={(e) => setProviderFilter(e.target.value)}
                    className="bg-gray-800 border border-gray-700 text-white px-3 py-1 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    <option value="all">All Providers</option>
                    <option value="stripe">Stripe</option>
                    <option value="gocardless">GoCardless</option>
                    <option value="manual">Manual</option>
                  </select>
                </div>

                <div className="flex items-center gap-3">
                  <label className="text-sm text-gray-400">Category:</label>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="bg-gray-800 border border-gray-700 text-white px-3 py-1 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    <option value="all">All Categories</option>
                    <option value="uncategorized">Uncategorized</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                onClick={handleSelectAll}
                disabled={loading || membershipPlans.length === 0}
                className="flex items-center gap-2 px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CheckSquare className="h-4 w-4" />
                Select All Visible
              </button>
            </div>
          )}

          {/* Content */}
          {activeTab === "plans" && (
            <div>
              {loading ? (
                <div className="bg-gray-800 rounded-lg p-6">
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
                    <p className="text-gray-400 mt-4">
                      Loading membership plans...
                    </p>
                  </div>
                </div>
              ) : membershipPlans.length === 0 ? (
                <div className="bg-gray-800 rounded-lg p-6">
                  <div className="text-center py-8">
                    <svg
                      className="w-16 h-16 mx-auto mb-4 text-gray-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"
                      />
                    </svg>
                    <p className="text-gray-400 mb-2">
                      No membership plans created yet
                    </p>
                    <p className="text-sm text-gray-500">
                      Click "New Membership Plan" to create your first plan
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {membershipPlans
                    .filter((plan) => {
                      // Provider filter
                      if (providerFilter !== "all") {
                        const planProvider = (plan as any).payment_provider || "manual";
                        if (planProvider !== providerFilter) return false;
                      }

                      // Category filter
                      if (categoryFilter !== "all") {
                        const planCategoryId = (plan as any).category_id;
                        if (categoryFilter === "uncategorized") {
                          if (planCategoryId) return false;
                        } else {
                          if (planCategoryId !== categoryFilter) return false;
                        }
                      }

                      return true;
                    })
                    .map((plan) => {
                      const provider = (plan as any).payment_provider || "manual";
                      const providerBadgeColors = {
                        stripe: "bg-purple-600",
                        gocardless: "bg-blue-600",
                        manual: "bg-gray-600",
                      };
                      const providerLabels = {
                        stripe: "Stripe",
                        gocardless: "GoCardless",
                        manual: "Manual",
                      };
                      const planCategoryId = (plan as any).category_id;
                      const planCategory = categories.find((c) => c.id === planCategoryId);

                      const isSelected = selectedPlans.has(plan.id);

                      return (
                    <div
                      key={plan.id}
                      className={`bg-gray-800 rounded-lg p-6 hover:bg-gray-750 transition-all relative ${isSelected ? 'ring-2 ring-orange-500' : ''}`}
                    >
                      {/* Checkbox */}
                      <button
                        onClick={() => handleToggleSelection(plan.id)}
                        className="absolute top-4 left-4 z-10 p-1 hover:bg-gray-700 rounded transition-colors"
                      >
                        {isSelected ? (
                          <CheckSquare className="h-5 w-5 text-orange-500" />
                        ) : (
                          <Square className="h-5 w-5 text-gray-400" />
                        )}
                      </button>

                      <div className="flex justify-between items-start mb-4 pl-8">
                        <div className="flex-1">
                          <h3 className="text-xl font-semibold">{plan.name}</h3>
                          {planCategory && (
                            <div className="flex items-center gap-1 mt-1">
                              <Tag className="h-3 w-3 text-gray-400" />
                              <span
                                className="text-xs px-2 py-0.5 rounded"
                                style={{ backgroundColor: planCategory.color + '30', color: planCategory.color }}
                              >
                                {planCategory.name}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-1 text-xs rounded ${
                              providerBadgeColors[
                                provider as keyof typeof providerBadgeColors
                              ]
                            }`}
                          >
                            {providerLabels[provider as keyof typeof providerLabels]}
                          </span>
                          <span
                            className={`px-2 py-1 text-xs rounded ${plan.is_active ? "bg-green-600" : "bg-gray-600"}`}
                          >
                            {plan.is_active ? "Active" : "Inactive"}
                          </span>
                          <div className="relative">
                            <button
                              onClick={() =>
                                setOpenDropdown(
                                  openDropdown === plan.id ? null : plan.id,
                                )
                              }
                              className="p-1 hover:bg-gray-700 rounded transition-colors"
                            >
                              <MoreVertical className="h-4 w-4 text-gray-400" />
                            </button>

                            {openDropdown === plan.id && (
                              <div className="absolute right-0 mt-2 w-56 bg-gray-800 rounded-md shadow-lg border border-gray-600 z-10">
                                <div className="py-1">
                                  <button
                                    onClick={() => handleEditPlan(plan)}
                                    className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 transition-colors flex items-center gap-2"
                                  >
                                    <Edit className="h-4 w-4" />
                                    <div>
                                      <div className="font-medium">
                                        Edit Details
                                      </div>
                                      <div className="text-gray-500 text-xs">
                                        name, price, features
                                      </div>
                                    </div>
                                  </button>
                                  <button
                                    onClick={() => handleViewMembers(plan)}
                                    className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 transition-colors flex items-center gap-2"
                                  >
                                    <Users className="h-4 w-4" />
                                    <div>
                                      <div className="font-medium">
                                        View Members
                                      </div>
                                      <div className="text-gray-500 text-xs">
                                        see who's on this plan
                                      </div>
                                    </div>
                                  </button>
                                  <button
                                    onClick={() => handleDuplicatePlan(plan)}
                                    className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 transition-colors flex items-center gap-2"
                                  >
                                    <Copy className="h-4 w-4" />
                                    <div>
                                      <div className="font-medium">
                                        Duplicate Plan
                                      </div>
                                      <div className="text-gray-500 text-xs">
                                        create a copy
                                      </div>
                                    </div>
                                  </button>
                                  <button
                                    onClick={() => handleEditPlan(plan)}
                                    className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 transition-colors flex items-center gap-2"
                                  >
                                    <Settings className="h-4 w-4" />
                                    <div>
                                      <div className="font-medium">
                                        Plan Settings
                                      </div>
                                      <div className="text-gray-500 text-xs">
                                        availability, limits
                                      </div>
                                    </div>
                                  </button>
                                  <button
                                    onClick={() => handleDeletePlan(plan)}
                                    className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-gray-700 transition-colors flex items-center gap-2"
                                  >
                                    <Trash className="h-4 w-4" />
                                    <div>
                                      <div className="font-medium">
                                        Delete Plan
                                      </div>
                                      <div className="text-gray-500 text-xs">
                                        permanently remove
                                      </div>
                                    </div>
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <p className="text-gray-400 text-sm mb-4">
                        {plan.description}
                      </p>

                      <div className="mb-4">
                        <p className="text-3xl font-bold">
                          {formatBritishCurrency(plan.price_pennies, true)}
                          <span className="text-sm text-gray-400 font-normal">
                            /
                            {plan.billing_period === "monthly"
                              ? "month"
                              : plan.billing_period === "yearly"
                                ? "year"
                                : "one-time"}
                          </span>
                        </p>
                      </div>

                      {plan.features && plan.features.length > 0 && (
                        <ul className="space-y-2 mb-4">
                          {plan.features.slice(0, 3).map((feature, index) => (
                            <li
                              key={index}
                              className="text-sm text-gray-400 flex items-center"
                            >
                              <svg
                                className="w-4 h-4 mr-2 text-green-500"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                              {feature}
                            </li>
                          ))}
                          {plan.features.length > 3 && (
                            <li className="text-sm text-gray-500 ml-6">
                              +{plan.features.length - 3} more
                            </li>
                          )}
                        </ul>
                      )}

                      <div className="flex justify-between items-center pt-4 border-t border-gray-700">
                        <span className="text-sm text-gray-400">
                          {plan.stats?.active_members || 0} active member{plan.stats?.active_members !== 1 ? 's' : ''}
                        </span>
                        <span
                          className={`text-sm ${plan.is_active ? "text-green-400" : "text-gray-500"}`}
                        >
                          {plan.is_active ? "● Active" : "● Inactive"}
                        </span>
                      </div>
                    </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}

          {activeTab === "active" && (
            <div className="bg-gray-800 rounded-lg p-6">
              <p className="text-gray-400">
                Active members list will be displayed here...
              </p>
            </div>
          )}

          {activeTab === "expired" && (
            <div className="bg-gray-800 rounded-lg p-6">
              <p className="text-gray-400">
                Expired and cancelled memberships will be displayed here...
              </p>
            </div>
          )}

          {activeTab === "settings" && (
            <div className="bg-gray-800 rounded-lg p-6">
              <p className="text-gray-400">
                Membership settings and configurations...
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Floating Bulk Action Bar */}
      {selectedPlans.size > 0 && (
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-gray-800 border border-gray-700 rounded-lg shadow-2xl p-4 z-50 min-w-[500px]">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <CheckSquare className="h-5 w-5 text-orange-500" />
              <span className="text-white font-medium">
                {selectedPlans.size} selected
              </span>
            </div>

            <div className="h-6 w-px bg-gray-700" />

            <div className="flex items-center gap-2 flex-1">
              <label className="text-sm text-gray-400">Move to:</label>
              <select
                value={bulkCategory}
                onChange={(e) => setBulkCategory(e.target.value)}
                className="bg-gray-900 border border-gray-700 text-white px-3 py-1.5 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent flex-1"
              >
                <option value="">Select category...</option>
                <option value="none">No Category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleBulkCategoryAssign}
              disabled={!bulkCategory || updatingBulk}
              className="bg-orange-600 hover:bg-orange-700 px-4 py-1.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-sm"
            >
              {updatingBulk ? "Updating..." : "Assign"}
            </button>

            <button
              onClick={handleClearSelection}
              className="p-1.5 hover:bg-gray-700 rounded transition-colors text-gray-400"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      <NewMembershipPlanModal
        isOpen={showNewPlanModal}
        onClose={handleModalClose}
      />

      <EditMembershipPlanModal
        isOpen={showEditPlanModal}
        onClose={handleEditModalClose}
        onSuccess={handleEditModalClose}
        plan={selectedPlan}
      />

      <CategoryManagementModal
        isOpen={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        onCategoryChange={() => {
          fetchCategories();
          fetchMembershipPlans();
        }}
      />
    </DashboardLayout>
  );
}
