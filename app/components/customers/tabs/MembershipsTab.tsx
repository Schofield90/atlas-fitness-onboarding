"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/app/lib/supabase/client";
import {
  CreditCard,
  Calendar,
  Clock,
  PauseCircle,
  PlayCircle,
  XCircle,
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
  Edit3,
} from "lucide-react";
import {
  formatBritishDate,
  formatBritishCurrency,
} from "@/app/lib/utils/british-format";
import AddMembershipModal from "../AddMembershipModal";

interface MembershipsTabProps {
  customerId: string;
}

export default function MembershipsTab({ customerId }: MembershipsTabProps) {
  const [memberships, setMemberships] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTarget, setEditTarget] = useState<any | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeTarget, setUpgradeTarget] = useState<any | null>(null);
  const [membershipPlans, setMembershipPlans] = useState<any[]>([]);
  const supabase = createClient();

  useEffect(() => {
    fetchMemberships();
    fetchCustomerName();
    fetchMembershipPlans();
  }, [customerId]);

  const fetchCustomerName = async () => {
    try {
      // Try clients table first, then leads table
      let { data, error } = await supabase
        .from("clients")
        .select("first_name, last_name")
        .eq("id", customerId)
        .single();

      if (!error && data) {
        const name = `${data.first_name || ""} ${data.last_name || ""}`.trim();
        setCustomerName(name || "Unknown Member");
        return;
      }

      // Fallback to leads table
      const leadResult = await supabase
        .from("leads")
        .select("name, first_name, last_name")
        .eq("id", customerId)
        .single();

      if (!leadResult.error && leadResult.data) {
        const name =
          leadResult.data.name ||
          `${leadResult.data.first_name || ""} ${leadResult.data.last_name || ""}`.trim();
        setCustomerName(name || "Unknown Member");
      }
    } catch (error) {
      console.error("Error fetching customer name:", error);
      setCustomerName("Unknown Member");
    }
  };

  const fetchMemberships = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("customer_memberships")
        .select(
          `
          *,
          membership_plan:membership_plans(*)
        `,
        )
        .or(`customer_id.eq.${customerId},client_id.eq.${customerId}`)
        .order("created_at", { ascending: false });

      if (error && error.code !== "PGRST116") throw error;
      setMemberships(data || []);
    } catch (error) {
      console.error("Error fetching memberships:", error);
      setMemberships([]); // Set empty array on error to prevent UI issues
    } finally {
      setLoading(false);
    }
  };

  const fetchMembershipPlans = async () => {
    try {
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

      const { data } = await supabase
        .from("membership_plans")
        .select("*")
        .eq("organization_id", userOrg.organization_id)
        .eq("is_active", true)
        .order("price", { ascending: true });

      setMembershipPlans(data || []);
    } catch (error) {
      console.error("Error fetching membership plans:", error);
    }
  };

  const updateMembership = async (id: string, updates: any) => {
    const { error } = await supabase
      .from("customer_memberships")
      .update({ ...updates })
      .eq("id", id);
    if (error) throw error;
  };

  const handlePauseResume = async (membership: any) => {
    try {
      const newStatus = membership.status === "paused" ? "active" : "paused";
      await updateMembership(membership.id, { status: newStatus });
      await fetchMemberships();
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const handleCancel = async (membership: any) => {
    try {
      if (!confirm("Cancel this membership? This will end it today.")) return;
      const today = new Date().toISOString().split("T")[0];
      await updateMembership(membership.id, {
        status: "cancelled",
        end_date: today,
      });
      await fetchMemberships();
    } catch (error) {
      console.error("Error cancelling membership:", error);
    }
  };

  const openEdit = (membership: any) => {
    setEditTarget(membership);
    setShowEditModal(true);
  };

  const openUpgrade = (membership: any) => {
    setUpgradeTarget(membership);
    setShowUpgradeModal(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-600";
      case "paused":
        return "bg-yellow-600";
      case "cancelled":
        return "bg-red-600";
      case "expired":
        return "bg-gray-600";
      default:
        return "bg-gray-600";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-gray-400">Loading memberships...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white">Memberships</h3>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Add Membership
        </button>
      </div>

      {memberships.length === 0 ? (
        <div className="text-center py-12 bg-gray-800 rounded-lg">
          <CreditCard className="h-12 w-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">No active memberships</p>
          <p className="text-sm text-gray-500 mt-2">
            Add a membership to get started
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {memberships.map((membership) => (
            <div key={membership.id} className="bg-gray-800 rounded-lg">
              <button
                className="w-full p-4 flex items-start justify-between text-left"
                onClick={() =>
                  setExpandedId(
                    expandedId === membership.id ? null : membership.id,
                  )
                }
              >
                <div>
                  <h4 className="font-medium text-white flex items-center gap-2">
                    {membership.membership_plan?.name || "Membership"}
                    {expandedId === membership.id ? (
                      <ChevronUp className="h-4 w-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    )}
                  </h4>
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      Started {formatBritishDate(membership.start_date)}
                    </span>
                    {membership.end_date && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        Ends {formatBritishDate(membership.end_date)}
                      </span>
                    )}
                  </div>

                  <div className="mt-2">
                    <span className="text-lg font-semibold text-white">
                      {formatBritishCurrency(
                        membership.membership_plan?.price_pennies ||
                          (membership.membership_plan?.price
                            ? membership.membership_plan.price * 100
                            : 0),
                        true,
                      )}
                    </span>
                    <span className="text-sm text-gray-400 ml-1">
                      /{membership.membership_plan?.billing_period || "month"}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span
                    className={`px-3 py-1 text-xs text-white rounded-full ${getStatusColor(membership.status)}`}
                  >
                    {membership.status}
                  </span>
                </div>
              </button>

              {expandedId === membership.id && (
                <div className="px-4 pb-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gray-900 rounded-lg p-4">
                      <p className="text-xs text-gray-400">Plan</p>
                      <p className="text-white">
                        {membership.membership_plan?.name || "—"}
                      </p>
                      <p className="text-xs text-gray-400 mt-2">Billing</p>
                      <p className="text-white">
                        {formatBritishCurrency(
                          membership.membership_plan?.price_pennies ||
                            (membership.membership_plan?.price
                              ? membership.membership_plan.price * 100
                              : 0),
                          true,
                        )}{" "}
                        /{" "}
                        {membership.membership_plan?.billing_period || "month"}
                      </p>
                    </div>
                    <div className="bg-gray-900 rounded-lg p-4">
                      <p className="text-xs text-gray-400">Start Date</p>
                      <p className="text-white">
                        {formatBritishDate(membership.start_date)}
                      </p>
                      <p className="text-xs text-gray-400 mt-2">End Date</p>
                      <p className="text-white">
                        {membership.end_date
                          ? formatBritishDate(membership.end_date)
                          : "—"}
                      </p>
                    </div>
                    <div className="bg-gray-900 rounded-lg p-4">
                      <p className="text-xs text-gray-400">Next Billing</p>
                      <p className="text-white">
                        {membership.next_billing_date
                          ? formatBritishDate(membership.next_billing_date)
                          : "—"}
                      </p>
                      <p className="text-xs text-gray-400 mt-2">Notes</p>
                      <p className="text-white whitespace-pre-wrap">
                        {membership.notes || "—"}
                      </p>
                    </div>
                  </div>

                  {membership.membership_plan?.features && (
                    <div className="mt-4 pt-4 border-t border-gray-700">
                      <p className="text-sm font-medium text-gray-400 mb-2">
                        Includes:
                      </p>
                      <ul className="text-sm text-gray-300 space-y-1">
                        {Object.entries(
                          membership.membership_plan.features,
                        ).map(([key, value]) => (
                          <li key={key}>
                            • {key}: {String(value)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      className="px-3 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 flex items-center gap-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditTarget(membership);
                        setShowEditModal(true);
                      }}
                    >
                      <Edit3 className="h-4 w-4" /> Edit
                    </button>
                    {membership.status === "paused" ? (
                      <button
                        className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePauseResume(membership);
                        }}
                      >
                        <PlayCircle className="h-4 w-4" /> Resume
                      </button>
                    ) : (
                      <button
                        className="px-3 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 flex items-center gap-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePauseResume(membership);
                        }}
                      >
                        <PauseCircle className="h-4 w-4" /> Pause
                      </button>
                    )}
                    <button
                      className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCancel(membership);
                      }}
                    >
                      <XCircle className="h-4 w-4" /> Cancel
                    </button>
                    <button
                      className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        setUpgradeTarget(membership);
                        setShowUpgradeModal(true);
                      }}
                    >
                      <ArrowUpRight className="h-4 w-4" /> Upgrade
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <AddMembershipModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        customerId={customerId}
        customerName={customerName}
        onSuccess={() => {
          fetchMemberships();
          setShowAddModal(false);
        }}
      />
      {showEditModal && editTarget && (
        <EditMembershipModal
          membership={editTarget}
          onClose={() => {
            setShowEditModal(false);
            setEditTarget(null);
          }}
          onSaved={async () => {
            await fetchMemberships();
            setShowEditModal(false);
            setEditTarget(null);
          }}
        />
      )}
      {showUpgradeModal && upgradeTarget && (
        <UpgradeMembershipModal
          membership={upgradeTarget}
          plans={membershipPlans}
          onClose={() => {
            setShowUpgradeModal(false);
            setUpgradeTarget(null);
          }}
          onSaved={async () => {
            await fetchMemberships();
            setShowUpgradeModal(false);
            setUpgradeTarget(null);
          }}
        />
      )}
    </div>
  );
}

function EditMembershipModal({
  membership,
  onClose,
  onSaved,
}: {
  membership: any;
  onClose: () => void;
  onSaved: () => void;
}) {
  const supabase = createClient();
  const [endDate, setEndDate] = useState<string>(membership.end_date || "");
  const [nextBilling, setNextBilling] = useState<string>(
    membership.next_billing_date || "",
  );
  const [notes, setNotes] = useState<string>(membership.notes || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const updates: any = {
        end_date: endDate || null,
        next_billing_date: nextBilling || null,
        notes: notes || null,
      };
      const { error } = await supabase
        .from("customer_memberships")
        .update(updates)
        .eq("id", membership.id);
      if (error) throw error;
      await onSaved();
    } catch (err: any) {
      setError(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">Edit Membership</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            ✕
          </button>
        </div>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              End Date
            </label>
            <input
              type="date"
              value={endDate || ""}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Next Billing Date
            </label>
            <input
              type="date"
              value={nextBilling || ""}
              onChange={(e) => setNextBilling(e.target.value)}
              className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              disabled={saving}
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function UpgradeMembershipModal({
  membership,
  plans,
  onClose,
  onSaved,
}: {
  membership: any;
  plans: any[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const supabase = createClient();
  const [planId, setPlanId] = useState<string>(
    membership.membership_plan_id || "",
  );
  const [effectiveDate, setEffectiveDate] = useState<string>(
    new Date().toISOString().split("T")[0],
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleUpgrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planId) {
      setError("Please select a plan");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const updates: any = {
        membership_plan_id: planId,
        start_date: effectiveDate,
      };
      const { error } = await supabase
        .from("customer_memberships")
        .update(updates)
        .eq("id", membership.id);
      if (error) throw error;
      await onSaved();
    } catch (err: any) {
      setError(err.message || "Failed to upgrade");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">
            Upgrade Membership
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            ✕
          </button>
        </div>
        <form onSubmit={handleUpgrade} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              New Plan *
            </label>
            <select
              value={planId}
              onChange={(e) => setPlanId(e.target.value)}
              className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Select a plan</option>
              {plans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name} - {formatBritishCurrency(plan.price || 0)}/
                  {plan.billing_period || "month"}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Effective From *
            </label>
            <input
              type="date"
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
              className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
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
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              disabled={saving}
            >
              {saving ? "Upgrading..." : "Confirm Upgrade"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
