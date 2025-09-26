"use client";

import { Suspense } from "react";
import { useState, useEffect } from "react";
import { createClient } from "@/app/lib/supabase/client";
import DashboardLayout from "../components/DashboardLayout";
import { useOrganization } from "@/app/hooks/useOrganization";
import {
  Users,
  Mail,
  Phone,
  Calendar,
  Activity,
  Search,
  Filter,
  Plus,
  ChevronRight,
  UserCheck,
  UserX,
  Clock,
  CreditCard,
  Copy,
  X,
  ExternalLink,
  CheckCircle,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "@/app/lib/toast";
import {
  formatBritishDate,
  formatBritishCurrency,
} from "@/app/lib/utils/british-format";

interface Member {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  created_at: string;
  membership_status?: string;
  membership_plan_id?: string;
  membership_plan_name?: string;
  last_visit?: string;
  total_visits?: number;
  status: "active" | "inactive" | "pending";
  tags?: string[];
  notes?: string;
  user_id?: string;
  is_claimed?: boolean;
}

function MembersContent() {
  const { organizationId } = useOrganization();
  const [members, setMembers] = useState<Member[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [duplicateEmails, setDuplicateEmails] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<
    "all" | "active" | "inactive" | "pending"
  >("all");
  const [planFilter, setPlanFilter] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(25);
  const [showClaimLinkModal, setShowClaimLinkModal] = useState(false);
  const [selectedMemberForClaim, setSelectedMemberForClaim] =
    useState<Member | null>(null);
  const [claimLink, setClaimLink] = useState("");
  const [loadingClaimLink, setLoadingClaimLink] = useState(false);
  const [copied, setCopied] = useState(false);
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Check for plan filter from URL
    const planId = searchParams.get("plan");
    if (planId) {
      setPlanFilter(planId);
    }

    // Get page from URL
    const page = parseInt(searchParams.get("page") || "1");
    setCurrentPage(page);

    // Only fetch if we have an organizationId
    if (organizationId) {
      fetchMembers();
    }
  }, [searchParams, organizationId]);

  useEffect(() => {
    filterMembers();
  }, [members, searchTerm, filterStatus, planFilter]);

  const fetchMembers = async () => {
    try {
      setLoading(true);

      // Use the bypass API endpoint to avoid RLS issues
      console.log(
        "Fetching members from bypass API endpoint with org:",
        organizationId,
      );

      // If no organizationId, just return without fetching
      if (!organizationId) {
        console.log("No organizationId available yet, skipping fetch");
        setLoading(false);
        return;
      }

      const timestamp = Date.now();
      const response = await fetch(
        `/api/clients-bypass?organizationId=${organizationId}&page=1&pageSize=1000&t=${timestamp}`,
      );

      if (!response.ok) {
        let errorMessage = "Failed to load members";
        try {
          const errorData = await response.json();
          console.error("API Error:", errorData);
          // Handle different error formats
          if (typeof errorData === "string") {
            errorMessage = errorData;
          } else if (errorData.error) {
            errorMessage =
              typeof errorData.error === "string"
                ? errorData.error
                : errorData.error.message || "Failed to load members";
          } else if (errorData.message) {
            errorMessage = errorData.message;
          }
        } catch (e) {
          console.error("Error parsing response:", e);
        }
        toast.error(errorMessage);
        setLoading(false);
        return;
      }

      const data = await response.json();

      if (!data.data) {
        console.error("Invalid API response:", data);
        toast.error("Failed to load members");
        setLoading(false);
        return;
      }

      // Process the clients from the bypass API
      const clients = data.data || [];

      // Check for duplicates based on email
      const emailToClient: Record<string, any> = {};
      const dupEmails: Set<string> = new Set();

      for (const client of clients) {
        const emailKey = (client.email || "").toLowerCase().trim();
        if (!emailKey) continue;

        if (!emailToClient[emailKey]) {
          emailToClient[emailKey] = client;
        } else {
          dupEmails.add(emailKey);
          // Keep the most recently updated one
          const existing = emailToClient[emailKey];
          const existingDate = new Date(
            existing.updated_at || existing.created_at || 0,
          );
          const currentDate = new Date(
            client.updated_at || client.created_at || 0,
          );
          if (currentDate > existingDate) {
            emailToClient[emailKey] = client;
          }
        }
      }

      // Debug: Check Sam's data
      const samClient = clients.find(
        (c: any) => c.email === "samschofield90@hotmail.co.uk",
      );
      if (samClient) {
        console.log("Sam Schofield client data:", {
          id: samClient.id,
          email: samClient.email,
          user_id: samClient.user_id,
          first_name: samClient.first_name,
          last_name: samClient.last_name,
          customer_memberships: samClient.customer_memberships,
          memberships: samClient.memberships,
        });
      }

      // Transform to member format
      const transformedMembers: Member[] = clients.map((client: any) => {
        // Get membership info from the nested customer_memberships (API returns this name)
        // Prioritize active memberships over cancelled/inactive ones
        const memberships =
          client.customer_memberships || client.memberships || [];

        // Find the best membership to display (prioritize active > pending > cancelled/inactive)
        const activeMembership = memberships.find(
          (m: any) => m.status === "active",
        );
        const pendingMembership = memberships.find(
          (m: any) => m.status === "pending",
        );
        const membership =
          activeMembership || pendingMembership || memberships[0];

        // Get the plan from nested structure - it's inside membership_plans
        const membershipPlan =
          membership?.membership_plans || membership?.membership_plan;

        return {
          id: client.id,
          first_name: client.first_name || "",
          last_name: client.last_name || "",
          email: client.email || "",
          phone: client.phone || "",
          created_at: client.created_at,
          membership_status: membership?.status || "No Membership",
          membership_plan_id: membership?.membership_plan_id,
          membership_plan_name: membershipPlan?.name || "No Plan",
          last_visit: client.last_visit,
          total_visits: client.total_visits || 0,
          status: determineStatusFromAllMemberships(client, memberships),
          tags: client.tags || [],
          notes: client.notes,
          user_id: client.user_id,
          is_claimed: !!client.user_id,
        };
      });

      setMembers(transformedMembers);
      setDuplicateEmails(Array.from(dupEmails));
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to load members");
    } finally {
      setLoading(false);
    }
  };

  const determineStatusFromAllMemberships = (
    client: any,
    memberships: any[],
  ): "active" | "inactive" | "pending" => {
    if (!memberships || memberships.length === 0) return "inactive";

    // Check if any membership is active and not expired
    const hasActiveMembership = memberships.some((membership: any) => {
      if (membership.status === "active") {
        // Check if membership is expired
        if (membership.end_date && new Date(membership.end_date) < new Date()) {
          return false;
        }
        return true;
      }
      return false;
    });

    if (hasActiveMembership) return "active";

    // Check if any membership is pending
    const hasPendingMembership = memberships.some(
      (m: any) => m.status === "pending",
    );
    if (hasPendingMembership) return "pending";

    return "inactive";
  };

  const filterMembers = () => {
    let filtered = [...members];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter((member) => {
        const fullName =
          `${member.first_name} ${member.last_name}`.toLowerCase();
        const email = member.email.toLowerCase();
        const search = searchTerm.toLowerCase();
        return fullName.includes(search) || email.includes(search);
      });
    }

    // Status filter
    if (filterStatus !== "all") {
      filtered = filtered.filter((m) => m.status === filterStatus);
    }

    // Plan filter (from URL)
    if (planFilter) {
      filtered = filtered.filter((m) => m.membership_plan_id === planFilter);
    }

    setFilteredMembers(filtered);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <UserCheck className="w-3 h-3 mr-1" />
            Active
          </span>
        );
      case "pending":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            <UserX className="w-3 h-3 mr-1" />
            Inactive
          </span>
        );
    }
  };

  // Pagination
  const totalPages = Math.ceil(filteredMembers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedMembers = filteredMembers.slice(
    startIndex,
    startIndex + itemsPerPage,
  );

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", page.toString());
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  const handleShowClaimLink = async (member: Member) => {
    console.log("handleShowClaimLink called for member:", member);
    console.log("Member is_claimed status:", member.is_claimed);
    console.log("Member user_id:", member.user_id);

    setSelectedMemberForClaim(member);
    setShowClaimLinkModal(true);
    setLoadingClaimLink(true);
    setCopied(false);

    try {
      // Generate a unique claim link for this member
      const response = await fetch("/api/members/generate-claim-link", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          memberId: member.id,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate claim link");
      }

      const data = await response.json();
      setClaimLink(data.claimUrl);
      setLoadingClaimLink(false);
    } catch (error) {
      console.error("Error generating claim link:", error);
      toast.error("Failed to generate claim link");
      setLoadingClaimLink(false);
      setShowClaimLinkModal(false);
    }
  };

  const handleCopyClaimLink = () => {
    if (claimLink) {
      navigator.clipboard.writeText(claimLink);
      setCopied(true);
      toast.success("Claim link copied to clipboard!");
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const handleClearPlanFilter = () => {
    setPlanFilter(null);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("plan");
    router.replace(`?${params.toString()}`);
  };

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white">Members</h1>
            <p className="text-gray-400 mt-1">
              Manage your gym members and their memberships
            </p>
          </div>
          <Link
            href="/members/new"
            className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Member
          </Link>
        </div>

        {/* Duplicate warning */}
        {duplicateEmails.length > 0 && (
          <div className="mb-4 p-4 rounded-lg bg-yellow-900/30 border border-yellow-600 text-yellow-200 flex items-center justify-between">
            <div>
              Detected {duplicateEmails.length} duplicate member
              {duplicateEmails.length > 1 ? "s" : ""} by email. You can merge
              them to keep your list clean.
            </div>
            <button
              onClick={async () => {
                try {
                  const res = await fetch("/api/admin/dedupe-clients", {
                    method: "POST",
                  });
                  if (res.ok) {
                    toast.success("Duplicates merged");
                    fetchMembers();
                  } else {
                    toast.error("Failed to merge duplicates");
                  }
                } catch (e) {
                  console.error(e);
                  toast.error("Failed to merge duplicates");
                }
              }}
              className="px-3 py-1 rounded bg-yellow-600 text-black hover:bg-yellow-500"
            >
              Merge duplicates
            </button>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-800 p-4 rounded-lg">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-orange-500 mr-3" />
              <div>
                <p className="text-gray-400 text-sm">Total Members</p>
                <p className="text-2xl font-bold text-white">
                  {members.length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-gray-800 p-4 rounded-lg">
            <div className="flex items-center">
              <UserCheck className="h-8 w-8 text-green-500 mr-3" />
              <div>
                <p className="text-gray-400 text-sm">Active</p>
                <p className="text-2xl font-bold text-white">
                  {members.filter((m) => m.status === "active").length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-gray-800 p-4 rounded-lg">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-yellow-500 mr-3" />
              <div>
                <p className="text-gray-400 text-sm">Pending</p>
                <p className="text-2xl font-bold text-white">
                  {members.filter((m) => m.status === "pending").length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-gray-800 p-4 rounded-lg">
            <div className="flex items-center">
              <UserX className="h-8 w-8 text-gray-500 mr-3" />
              <div>
                <p className="text-gray-400 text-sm">Inactive</p>
                <p className="text-2xl font-bold text-white">
                  {members.filter((m) => m.status === "inactive").length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  placeholder="Search members..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-orange-500"
            >
              <option value="all">All Members</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {planFilter && (
            <div className="mt-4 flex items-center">
              <span className="text-sm text-gray-400 mr-2">
                Filtering by plan:
              </span>
              <span className="bg-orange-600 text-white px-3 py-1 rounded-full text-sm">
                {members.find((m) => m.membership_plan_id === planFilter)
                  ?.membership_plan_name || "Unknown Plan"}
              </span>
              <button
                onClick={handleClearPlanFilter}
                className="ml-2 text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>
          )}
        </div>

        {/* Members Table */}
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
              <p className="text-gray-400 mt-4">Loading members...</p>
            </div>
          ) : paginatedMembers.length === 0 ? (
            <div className="p-8 text-center">
              <Users className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">
                {searchTerm || filterStatus !== "all" || planFilter
                  ? "No members found matching your filters"
                  : "No members in your organization yet"}
              </p>
              {!searchTerm && !planFilter && filterStatus === "all" && (
                <>
                  <Link
                    href="/customers/new"
                    className="mt-4 inline-flex items-center text-orange-500 hover:text-orange-400"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add your first member
                  </Link>
                  <p className="text-sm text-gray-500 mt-2">
                    Members are created when customers sign up for a membership
                    plan
                  </p>
                </>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-700">
                  <thead className="bg-gray-900">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Member
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Membership
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Joined
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Last Visit
                      </th>
                      <th className="relative px-6 py-3">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-gray-800 divide-y divide-gray-700">
                    {paginatedMembers.map((member) => (
                      <tr key={member.id} className="hover:bg-gray-750">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <div className="h-10 w-10 rounded-full bg-orange-600 flex items-center justify-center">
                                <span className="text-white font-medium">
                                  {member.first_name[0]}
                                  {member.last_name[0]}
                                </span>
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-white">
                                  {member.first_name} {member.last_name}
                                </span>
                                {!member.is_claimed && (
                                  <button
                                    onClick={() => handleShowClaimLink(member)}
                                    className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-yellow-900 text-yellow-300 hover:bg-yellow-800 transition-colors"
                                  >
                                    Unclaimed
                                  </button>
                                )}
                              </div>
                              <div className="text-sm text-gray-400">
                                {member.email}
                              </div>
                              {member.phone && (
                                <div className="text-sm text-gray-500">
                                  {member.phone}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-white">
                            {member.membership_plan_name}
                          </div>
                          <div className="text-sm text-gray-400">
                            {member.membership_status}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {getStatusBadge(member.status)}
                            {!member.is_claimed && (
                              <button
                                onClick={() => handleShowClaimLink(member)}
                                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-900 text-yellow-300 hover:bg-yellow-800 transition-colors"
                              >
                                Unclaimed
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                          {formatBritishDate(member.created_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                          {member.last_visit
                            ? formatBritishDate(member.last_visit)
                            : "Never"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <Link
                            href={`/members/${member.id}`}
                            className="text-orange-500 hover:text-orange-400"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="bg-gray-900 px-4 py-3 flex items-center justify-between sm:px-6">
                  <div className="flex-1 flex justify-between sm:hidden">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-4 py-2 border border-gray-600 text-sm font-medium rounded-md text-white bg-gray-700 hover:bg-gray-600 disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-600 text-sm font-medium rounded-md text-white bg-gray-700 hover:bg-gray-600 disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                  <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-gray-400">
                        Showing{" "}
                        <span className="font-medium">{startIndex + 1}</span> to{" "}
                        <span className="font-medium">
                          {Math.min(
                            startIndex + itemsPerPage,
                            filteredMembers.length,
                          )}
                        </span>{" "}
                        of{" "}
                        <span className="font-medium">
                          {filteredMembers.length}
                        </span>{" "}
                        results
                      </p>
                    </div>
                    <div>
                      <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                        <button
                          onClick={() => handlePageChange(currentPage - 1)}
                          disabled={currentPage === 1}
                          className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-600 bg-gray-700 text-sm font-medium text-gray-400 hover:bg-gray-600 disabled:opacity-50"
                        >
                          Previous
                        </button>
                        {[...Array(totalPages)].map((_, i) => (
                          <button
                            key={i + 1}
                            onClick={() => handlePageChange(i + 1)}
                            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                              currentPage === i + 1
                                ? "z-10 bg-orange-600 border-orange-600 text-white"
                                : "bg-gray-700 border-gray-600 text-gray-400 hover:bg-gray-600"
                            }`}
                          >
                            {i + 1}
                          </button>
                        ))}
                        <button
                          onClick={() => handlePageChange(currentPage + 1)}
                          disabled={currentPage === totalPages}
                          className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-600 bg-gray-700 text-sm font-medium text-gray-400 hover:bg-gray-600 disabled:opacity-50"
                        >
                          Next
                        </button>
                      </nav>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Claim Link Modal */}
        {showClaimLinkModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg max-w-2xl w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-white">
                  Account Claim Instructions for{" "}
                  {selectedMemberForClaim?.first_name}{" "}
                  {selectedMemberForClaim?.last_name}
                </h3>
                <button
                  onClick={() => {
                    setShowClaimLinkModal(false);
                    setClaimLink("");
                    setSelectedMemberForClaim(null);
                  }}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {loadingClaimLink ? (
                <div className="py-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-4"></div>
                  <p className="text-gray-400">Generating claim link...</p>
                </div>
              ) : claimLink ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Account Claim Page
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={claimLink}
                        readOnly
                        className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
                      />
                      <button
                        onClick={handleCopyClaimLink}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                      >
                        {copied ? (
                          <>
                            <CheckCircle className="w-4 h-4" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            Copy
                          </>
                        )}
                      </button>
                      <a
                        href={claimLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 flex items-center gap-2"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Open
                      </a>
                    </div>
                  </div>

                  <div className="bg-gray-700 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-white mb-2">
                      Instructions:
                    </h4>
                    <ul className="text-sm text-gray-400 space-y-1">
                      <li>
                        • Send this link to {selectedMemberForClaim?.first_name}
                      </li>
                      <li>
                        • They will enter their email (
                        {selectedMemberForClaim?.email})
                      </li>
                      <li>• They'll receive a 6-digit verification code</li>
                      <li>
                        • After entering the code, they can set their password
                      </li>
                      <li>
                        • This is a universal claim page - works for all
                        unclaimed accounts
                      </li>
                    </ul>
                  </div>

                  <div className="bg-blue-900 bg-opacity-50 rounded-lg p-4">
                    <p className="text-sm text-blue-300">
                      💡 Tip: You can also send a welcome email with this link
                      directly from the customer's profile page.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center">
                  <p className="text-red-400">
                    Failed to generate claim link. Please try again.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function MembersPage() {
  return (
    <DashboardLayout>
      <Suspense
        fallback={
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
            <p className="text-gray-400 mt-4">Loading...</p>
          </div>
        }
      >
        <MembersContent />
      </Suspense>
    </DashboardLayout>
  );
}
