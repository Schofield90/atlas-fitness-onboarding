"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ChevronDownIcon,
  FunnelIcon,
  ArrowsUpDownIcon,
} from "@heroicons/react/24/outline";

interface Organization {
  id: string;
  name: string;
  slug: string;
  subscription_status: string;
  subscription_plan: string;
  created_at: string;
  active_users: number;
  mrr: number;
  last_activity: string;
}

export default function AdminOrganizationsTable() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<keyof Organization>("created_at");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [filter, setFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    try {
      const res = await fetch("/api/admin/organizations");
      if (res.ok) {
        const data = await res.json();
        setOrganizations(data.organizations);
      }
    } catch (error) {
      console.error("Failed to fetch organizations:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field: keyof Organization) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const filteredOrgs = organizations
    .filter((org) => {
      if (statusFilter !== "all" && org.subscription_status !== statusFilter)
        return false;
      if (filter && !org.name.toLowerCase().includes(filter.toLowerCase()))
        return false;
      return true;
    })
    .sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      const direction = sortDirection === "asc" ? 1 : -1;

      if (typeof aVal === "string" && typeof bVal === "string") {
        return aVal.localeCompare(bVal) * direction;
      }

      return ((aVal as any) - (bVal as any)) * direction;
    });

  const exportToCSV = () => {
    const headers = [
      "Organization",
      "Status",
      "Plan",
      "Users",
      "MRR",
      "Created",
      "Last Activity",
    ];
    const rows = filteredOrgs.map((org) => [
      org.name,
      org.subscription_status,
      org.subscription_plan,
      org.active_users,
      org.mrr,
      new Date(org.created_at).toLocaleDateString(),
      org.last_activity
        ? new Date(org.last_activity).toLocaleDateString()
        : "N/A",
    ]);

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `organizations-${new Date().toISOString()}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-gray-900">Organizations</h2>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search..."
              className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="trialing">Trialing</option>
              <option value="past_due">Past Due</option>
              <option value="canceled">Canceled</option>
            </select>
            <button
              onClick={exportToCSV}
              className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
            >
              Export CSV
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort("name")}
              >
                <div className="flex items-center">
                  Organization
                  <ArrowsUpDownIcon className="ml-1 h-3 w-3" />
                </div>
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort("subscription_status")}
              >
                <div className="flex items-center">
                  Status
                  <ArrowsUpDownIcon className="ml-1 h-3 w-3" />
                </div>
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort("subscription_plan")}
              >
                <div className="flex items-center">
                  Plan
                  <ArrowsUpDownIcon className="ml-1 h-3 w-3" />
                </div>
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort("active_users")}
              >
                <div className="flex items-center">
                  Users
                  <ArrowsUpDownIcon className="ml-1 h-3 w-3" />
                </div>
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort("mrr")}
              >
                <div className="flex items-center">
                  MRR
                  <ArrowsUpDownIcon className="ml-1 h-3 w-3" />
                </div>
              </th>
              <th scope="col" className="relative px-6 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredOrgs.map((org) => (
              <tr key={org.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {org.name}
                    </div>
                    <div className="text-sm text-gray-500">{org.slug}</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                    ${org.subscription_status === "active" ? "bg-green-100 text-green-800" : ""}
                    ${org.subscription_status === "trialing" ? "bg-blue-100 text-blue-800" : ""}
                    ${org.subscription_status === "past_due" ? "bg-red-100 text-red-800" : ""}
                    ${org.subscription_status === "canceled" ? "bg-gray-100 text-gray-800" : ""}
                  `}
                  >
                    {org.subscription_status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {org.subscription_plan}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {org.active_users}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  £{org.mrr?.toLocaleString() || 0}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <Link
                    href={`/admin/organizations/${org.id}`}
                    className="text-blue-600 hover:text-blue-900"
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="px-6 py-3 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-700">
            Showing {filteredOrgs.length} of {organizations.length}{" "}
            organizations
          </p>
        </div>
      </div>
    </div>
  );
}
