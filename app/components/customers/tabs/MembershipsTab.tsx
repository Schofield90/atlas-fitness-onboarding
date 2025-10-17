"use client";

import { useState, useEffect } from "react";
import { formatBritishCurrency } from "@/app/lib/utils/british-format";
import AddMembershipModal from "../AddMembershipModal";
import { createClient } from "@/app/lib/supabase/client";

interface MembershipsTabProps {
  customerId: string;
}

export default function MembershipsTab({ customerId }: MembershipsTabProps) {
  const [memberships, setMemberships] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [customerName, setCustomerName] = useState("");

  useEffect(() => {
    fetchMemberships();
    fetchCustomerName();
  }, [customerId]);

  const fetchCustomerName = async () => {
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from("clients")
        .select("first_name, last_name")
        .eq("id", customerId)
        .single();

      if (data) {
        const name = `${data.first_name || ""} ${data.last_name || ""}`.trim();
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
      const response = await fetch(
        `/api/customer-memberships?customerId=${customerId}`,
      );

      if (!response.ok) {
        setMemberships([]);
        return;
      }

      const result = await response.json();
      setMemberships(result.memberships || []);
    } catch (error) {
      console.error("Error fetching memberships:", error);
      setMemberships([]);
    } finally {
      setLoading(false);
    }
  };

  const getUsageText = (membership: any) => {
    if (!membership.end_date) return "Never Expires.";

    const endDate = new Date(membership.end_date);
    const today = new Date();
    const diffTime = endDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return "Expired";
    if (diffDays === 0) return "Expires today";
    if (diffDays === 1) return "1 day left";
    return `${diffDays} days left`;
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: "bg-green-600 text-white",
      paused: "bg-yellow-600 text-white",
      cancelled: "bg-red-600 text-white",
      expired: "bg-gray-600 text-white",
    };
    return styles[status] || styles.expired;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-gray-400">Loading memberships...</p>
      </div>
    );
  }

  const activeMemberships = memberships.filter((m) => m.status === "active");
  const inactiveMemberships = memberships.filter((m) => m.status !== "active");

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

      {/* Active Memberships Section */}
      <div className="mb-8">
        <h4 className="text-md font-semibold text-white mb-4">
          Active ({activeMemberships.length})
        </h4>
        {activeMemberships.length === 0 ? (
          <div className="text-center py-8 bg-gray-800 rounded-lg">
            <p className="text-gray-400">No active memberships</p>
          </div>
        ) : (
          <div className="bg-gray-800 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-300">
                    Name
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-300">
                    Start Date
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-300">
                    Cost
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-300">
                    Usage
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-300">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {activeMemberships.map((membership) => {
                  const priceInPennies =
                    membership.membership_plan?.price_pennies ||
                    (membership.membership_plan?.price
                      ? membership.membership_plan.price * 100
                      : 0);

                  return (
                    <tr
                      key={membership.id}
                      className="border-t border-gray-700 hover:bg-gray-750"
                    >
                      <td className="py-3 px-4">
                        <a
                          href={`/members/${customerId}/membership/${membership.id}`}
                          className="text-blue-400 hover:underline cursor-pointer"
                        >
                          {membership.membership_plan?.name || "Membership"}
                        </a>
                      </td>
                      <td className="py-3 px-4 text-gray-300">
                        {new Date(membership.start_date).toLocaleDateString(
                          "en-GB",
                        )}
                      </td>
                      <td className="py-3 px-4 text-gray-300">
                        {formatBritishCurrency(priceInPennies, true)}/
                        {membership.membership_plan?.billing_period || "month"}
                      </td>
                      <td className="py-3 px-4 text-gray-400">
                        {getUsageText(membership)}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs ${getStatusBadge(membership.status)}`}
                        >
                          {membership.status.charAt(0).toUpperCase() +
                            membership.status.slice(1)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Inactive Memberships Section */}
      {inactiveMemberships.length > 0 && (
        <div>
          <h4 className="text-md font-semibold text-white mb-4">
            Inactive ({inactiveMemberships.length})
          </h4>
          <div className="bg-gray-800 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-300">
                    Name
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-300">
                    Start Date
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-300">
                    Cost
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-300">
                    Usage
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-300">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {inactiveMemberships.map((membership) => {
                  const priceInPennies =
                    membership.membership_plan?.price_pennies ||
                    (membership.membership_plan?.price
                      ? membership.membership_plan.price * 100
                      : 0);

                  return (
                    <tr
                      key={membership.id}
                      className="border-t border-gray-700 hover:bg-gray-750"
                    >
                      <td className="py-3 px-4">
                        <a
                          href={`/members/${customerId}/membership/${membership.id}`}
                          className="text-blue-400 hover:underline cursor-pointer"
                        >
                          {membership.membership_plan?.name || "Membership"}
                        </a>
                      </td>
                      <td className="py-3 px-4 text-gray-300">
                        {new Date(membership.start_date).toLocaleDateString(
                          "en-GB",
                        )}
                      </td>
                      <td className="py-3 px-4 text-gray-300">
                        {formatBritishCurrency(priceInPennies, true)}/
                        {membership.membership_plan?.billing_period || "month"}
                      </td>
                      <td className="py-3 px-4 text-gray-400">
                        {getUsageText(membership)}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs ${getStatusBadge(membership.status)}`}
                        >
                          {membership.status.charAt(0).toUpperCase() +
                            membership.status.slice(1)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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
    </div>
  );
}
