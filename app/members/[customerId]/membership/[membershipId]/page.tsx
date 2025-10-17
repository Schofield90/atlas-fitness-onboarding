"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { formatBritishCurrency } from "@/lib/utils/british-format";
import { ChevronLeft, Edit2, Pause, X, ChevronDown } from "lucide-react";

interface MembershipDetails {
  id: string;
  client_id: string;
  membership_plan_id: string;
  status: string;
  start_date: string;
  end_date: string | null;
  billing_interval: string;
  next_billing_date: string | null;
  notes: string | null;
  created_at: string;
  membership_plan: {
    name: string;
    description: string;
    price: number;
    price_pennies: number;
    billing_period: string;
  };
  client: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

interface Payment {
  id: string;
  amount: number;
  payment_date: string;
  payment_status: string;
  payment_provider: string;
  description: string;
}

type Tab =
  | "details"
  | "past_payments"
  | "upcoming_payments"
  | "skipped_payments"
  | "usage";

export default function MembershipDetailPage() {
  const params = useParams();
  const router = useRouter();
  const customerId = params.customerId as string;
  const membershipId = params.membershipId as string;

  const [membership, setMembership] = useState<MembershipDetails | null>(null);
  const [pastPayments, setPastPayments] = useState<Payment[]>([]);
  const [upcomingPayments, setUpcomingPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("details");
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    fetchMembershipDetails();
    fetchPayments();
  }, [membershipId]);

  const fetchMembershipDetails = async () => {
    try {
      const response = await fetch(`/api/customer-memberships/${membershipId}`);

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Error fetching membership:", errorData);
        setError(
          errorData.error ||
            "Failed to load membership details. Please try refreshing the page.",
        );
        setLoading(false);
        return;
      }

      const { membership } = await response.json();
      setMembership(membership);
    } catch (error) {
      console.error("Error fetching membership:", error);
      setError(
        "Failed to load membership details. Please try refreshing the page.",
      );
      setLoading(false);
    }
  };

  const fetchPayments = async () => {
    try {
      const response = await fetch(`/api/customers/${customerId}/payments`);

      if (!response.ok) {
        console.error("Error fetching payments:", await response.text());
        setLoading(false);
        return;
      }

      const { payments } = await response.json();

      // Filter into past and upcoming
      const past = payments
        .filter((p: Payment) =>
          ["paid_out", "succeeded"].includes(p.payment_status),
        )
        .sort(
          (a: Payment, b: Payment) =>
            new Date(b.payment_date).getTime() -
            new Date(a.payment_date).getTime(),
        );

      const upcoming = payments
        .filter((p: Payment) =>
          ["pending", "outstanding"].includes(p.payment_status),
        )
        .sort(
          (a: Payment, b: Payment) =>
            new Date(a.payment_date).getTime() -
            new Date(b.payment_date).getTime(),
        );

      setPastPayments(past || []);
      setUpcomingPayments(upcoming || []);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching payments:", error);
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: "bg-green-600",
      paused: "bg-yellow-600",
      cancelled: "bg-red-600",
      expired: "bg-gray-600",
    };
    return (
      <span
        className={`px-3 py-1 rounded-full text-xs font-medium ${styles[status] || styles.expired}`}
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getPaymentStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      paid_out: "bg-green-600 text-white",
      succeeded: "bg-green-600 text-white",
      pending: "bg-yellow-600 text-white",
      outstanding: "bg-orange-600 text-white",
      failed: "bg-red-600 text-white",
    };
    return (
      <span
        className={`px-2 py-1 rounded text-xs font-medium ${styles[status] || "bg-gray-600 text-white"}`}
      >
        {status.charAt(0).toUpperCase() + status.slice(1).replace("_", " ")}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading membership details...</p>
        </div>
      </div>
    );
  }

  if (error || !membership) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="bg-red-600 bg-opacity-20 border border-red-600 rounded-lg p-6">
            <p className="text-red-400 text-lg mb-4">
              {error || "Membership not found"}
            </p>
            <button
              onClick={() => router.push(`/members/${customerId}`)}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
            >
              Back to Member Profile
            </button>
          </div>
        </div>
      </div>
    );
  }

  const priceInPennies =
    membership.membership_plan.price_pennies ||
    membership.membership_plan.price * 100;

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-6xl mx-auto p-6">
        {/* Back Button */}
        <button
          onClick={() => router.push(`/members/${customerId}`)}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-6"
        >
          <ChevronLeft className="h-5 w-5" />
          Back to Member Profile
        </button>

        {/* Membership Summary Header */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold mb-2">
                {membership.membership_plan.name}
              </h1>
              <p className="text-gray-400">
                {membership.client.first_name} {membership.client.last_name}
              </p>
            </div>
            {getStatusBadge(membership.status)}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div>
              <p className="text-sm text-gray-400">Start Date</p>
              <p className="font-medium">
                {new Date(membership.start_date).toLocaleDateString("en-GB")}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-400">End Date</p>
              <p className="font-medium">
                {membership.end_date
                  ? new Date(membership.end_date).toLocaleDateString("en-GB")
                  : "Never Expires"}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Billing</p>
              <p className="font-medium">
                {formatBritishCurrency(priceInPennies, true)}/
                {membership.membership_plan.billing_period}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Next Payment</p>
              <p className="font-medium">
                {membership.next_billing_date
                  ? new Date(membership.next_billing_date).toLocaleDateString(
                      "en-GB",
                    )
                  : "N/A"}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => setShowEditModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg"
            >
              <Edit2 className="h-4 w-4" />
              Edit
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-lg">
              <Pause className="h-4 w-4" />
              Hold
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg">
              <X className="h-4 w-4" />
              Cancel
            </button>
            <div className="ml-auto flex gap-3">
              <button className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg">
                Upgrades
                <ChevronDown className="h-4 w-4" />
              </button>
              <button className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg">
                Downgrades
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-gray-800 rounded-lg">
          <div className="border-b border-gray-700">
            <div className="flex gap-8 px-6">
              {[
                { id: "details", label: "Details" },
                { id: "past_payments", label: "Past Payments" },
                { id: "upcoming_payments", label: "Upcoming Payments" },
                { id: "skipped_payments", label: "Skipped Payments" },
                { id: "usage", label: "Usage" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as Tab)}
                  className={`py-4 px-2 border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? "border-blue-500 text-blue-500"
                      : "border-transparent text-gray-400 hover:text-white"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="p-6">
            {activeTab === "details" && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-400 mb-1">
                    Description
                  </h3>
                  <p className="text-white">
                    {membership.membership_plan.description ||
                      "No description available"}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-400 mb-1">
                    Notes
                  </h3>
                  <p className="text-white">{membership.notes || "No notes"}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-400 mb-1">
                    Created
                  </h3>
                  <p className="text-white">
                    {new Date(membership.created_at).toLocaleString("en-GB")}
                  </p>
                </div>
              </div>
            )}

            {activeTab === "past_payments" && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">
                        Date
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">
                        Amount
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">
                        Status
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">
                        Provider
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">
                        Description
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {pastPayments.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="text-center py-8 text-gray-400"
                        >
                          No past payments recorded
                        </td>
                      </tr>
                    ) : (
                      pastPayments.map((payment) => (
                        <tr
                          key={payment.id}
                          className="border-b border-gray-700"
                        >
                          <td className="py-3 px-4">
                            {new Date(payment.payment_date).toLocaleDateString(
                              "en-GB",
                            )}
                          </td>
                          <td className="py-3 px-4">
                            {formatBritishCurrency(payment.amount, true)}
                          </td>
                          <td className="py-3 px-4">
                            {getPaymentStatusBadge(payment.payment_status)}
                          </td>
                          <td className="py-3 px-4 capitalize">
                            {payment.payment_provider}
                          </td>
                          <td className="py-3 px-4 text-gray-400">
                            {payment.description || "—"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === "upcoming_payments" && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">
                        Due Date
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">
                        Amount
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">
                        Status
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">
                        Provider
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {upcomingPayments.length === 0 ? (
                      <tr>
                        <td
                          colSpan={4}
                          className="text-center py-8 text-gray-400"
                        >
                          No upcoming payments scheduled
                        </td>
                      </tr>
                    ) : (
                      upcomingPayments.map((payment) => (
                        <tr
                          key={payment.id}
                          className="border-b border-gray-700"
                        >
                          <td className="py-3 px-4">
                            {new Date(payment.payment_date).toLocaleDateString(
                              "en-GB",
                            )}
                          </td>
                          <td className="py-3 px-4">
                            {formatBritishCurrency(payment.amount, true)}
                          </td>
                          <td className="py-3 px-4">
                            {getPaymentStatusBadge(payment.payment_status)}
                          </td>
                          <td className="py-3 px-4 capitalize">
                            {payment.payment_provider}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === "skipped_payments" && (
              <div className="text-center py-8 text-gray-400">
                No skipped payments
              </div>
            )}

            {activeTab === "usage" && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-400 mb-2">
                    Membership Usage
                  </h3>
                  <p className="text-white">
                    {membership.end_date
                      ? `${Math.ceil((new Date(membership.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days remaining`
                      : "Never Expires"}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Membership Modal */}
      {showEditModal && (
        <EditMembershipModal
          membership={membership}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => {
            fetchMembershipDetails();
            setShowEditModal(false);
          }}
        />
      )}
    </div>
  );
}

// Edit Membership Modal Component
interface EditMembershipModalProps {
  membership: MembershipDetails;
  onClose: () => void;
  onSuccess: () => void;
}

function EditMembershipModal({
  membership,
  onClose,
  onSuccess,
}: EditMembershipModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState<"select" | "card_payment">("select");
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    payment_method:
      membership.payment_method || ("cash" as "cash" | "direct_debit" | "card"),
    notes: membership.notes || "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/customer-memberships/${membership.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            notes: formData.notes,
            payment_method: formData.payment_method,
          }),
        },
      );

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || "Failed to update membership");
        return;
      }

      onSuccess();
    } catch (err: any) {
      console.error("Error updating membership:", err);
      setError("Failed to update membership. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg max-w-md w-full">
        <div className="p-6 border-b border-gray-700">
          <h2 className="text-xl font-bold">Edit Membership</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-600 bg-opacity-20 border border-red-600 rounded-lg p-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Payment Method */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Payment Method
            </label>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() =>
                  setFormData({ ...formData, payment_method: "cash" })
                }
                className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-colors ${
                  formData.payment_method === "cash"
                    ? "border-blue-500 bg-blue-600 bg-opacity-10"
                    : "border-gray-600 bg-gray-700 hover:border-gray-500"
                }`}
              >
                <p className="font-medium">Cash</p>
                <p className="text-sm text-gray-400">Pay in cash at the gym</p>
              </button>

              <button
                type="button"
                onClick={async () => {
                  setFormData({ ...formData, payment_method: "direct_debit" });
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
                          customerId: membership.client_id,
                          customerEmail: membership.client.email,
                          customerName: `${membership.client.first_name} ${membership.client.last_name}`,
                          membershipData: {
                            membership_id: membership.id,
                            membership_plan_id: membership.membership_plan_id,
                            plan_name: membership.membership_plan.name,
                            amount: 0, // Updating payment method, not charging
                            charge_immediately: false,
                          },
                        }),
                      },
                    );

                    const data = await response.json();

                    if (!response.ok || !data.success) {
                      setError(
                        data.error || "Failed to initialize Direct Debit",
                      );
                      setFormData({ ...formData, payment_method: "cash" });
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
                    setFormData({ ...formData, payment_method: "cash" });
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading}
                className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-colors ${
                  formData.payment_method === "direct_debit"
                    ? "border-blue-500 bg-blue-600 bg-opacity-10"
                    : "border-gray-600 bg-gray-700 hover:border-gray-500"
                } ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <p className="font-medium">Direct Debit (GoCardless)</p>
                <p className="text-sm text-gray-400">
                  {loading && formData.payment_method === "direct_debit"
                    ? "Setting up Direct Debit..."
                    : "Automatic bank transfer"}
                </p>
              </button>

              <button
                type="button"
                onClick={() => {
                  setFormData({ ...formData, payment_method: "card" });
                  setStep("card_payment");
                  // Note: Card payment setup would go here
                  // For now, this just changes the payment method
                  setError(
                    "Card payment setup for existing memberships coming soon. Please use Add Membership for card payments.",
                  );
                }}
                disabled={loading}
                className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-colors ${
                  formData.payment_method === "card"
                    ? "border-blue-500 bg-blue-600 bg-opacity-10"
                    : "border-gray-600 bg-gray-700 hover:border-gray-500"
                } ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <p className="font-medium">Credit/Debit Card (Stripe)</p>
                <p className="text-sm text-gray-400">Pay with card</p>
              </button>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium mb-2">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              rows={3}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Add any notes about this membership..."
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
