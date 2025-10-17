"use client";

import { useState, useEffect, Suspense } from "react";
import { createClient } from "@/app/lib/supabase/client";
import DashboardLayout from "@/app/components/DashboardLayout";
import {
  Plus,
  Search,
  Download,
  Filter,
  UserPlus,
  Mail,
  Phone,
  MessageSquare,
  Upload,
  Tags,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  Trash2,
  Check,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import { useToast } from "@/app/lib/hooks/useToast";
import { useOrganization } from "@/app/hooks/useOrganization";
import { RequireOrganization } from "@/app/components/auth/RequireOrganization";

interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  lead_id?: string;
  client_id?: string;
  client_type?: string; // "Current Client" or "Ex-Client"
  is_current_client?: boolean;
  status?: string;
  subscription_status?: string;
  membership_plan?: string;
  source?: string;
  sms_opt_in: boolean;
  whatsapp_opt_in: boolean;
  email_opt_in: boolean;
  tags?: string[];
  metadata?: any;
  created_at: string;
  updated_at: string;
  lead?: {
    id: string;
    name: string;
    source: string;
    status: string;
    score?: number;
  };
}

function ContactsContent() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [tagFilter, setTagFilter] = useState<string>("");
  const [optInFilter, setOptInFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [showImportModal, setShowImportModal] = useState(false);
  const [sortKey, setSortKey] = useState<"name" | "created">("created");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(
    new Set(),
  );
  const [showBulkActions, setShowBulkActions] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();
  const orgSlug = params.orgSlug as string;
  const { organizationId } = useOrganization();
  const supabase = createClient();
  const toast = useToast();

  useEffect(() => {
    if (organizationId) {
      fetchContacts();
    }
    // Initialize pagination from URL params
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "25");
    setCurrentPage(page);
    setItemsPerPage(pageSize);
  }, [organizationId]);

  useEffect(() => {
    filterContacts();
  }, [
    contacts,
    searchTerm,
    sourceFilter,
    tagFilter,
    optInFilter,
    sortKey,
    sortOrder,
  ]);

  // Update bulk actions visibility when selection changes
  useEffect(() => {
    setShowBulkActions(selectedContacts.size > 0);
  }, [selectedContacts]);

  // Update URL when pagination changes
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", currentPage.toString());
    params.set("pageSize", itemsPerPage.toString());
    router.replace(`/org/${orgSlug}/contacts?${params.toString()}`, {
      scroll: false,
    });
  }, [currentPage, itemsPerPage, router, searchParams, orgSlug]);

  const fetchContacts = async () => {
    try {
      if (!organizationId) {
        console.log("Waiting for organization ID from context...");
        setLoading(false);
        return;
      }

      console.log("Fetching contacts for organization:", organizationId);
      await fetchContactsWithOrg({ organization_id: organizationId });
    } catch (error) {
      console.error("Error in fetchContacts:", error);
      toast.showToast("Failed to load contacts", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchContactsWithOrg = async (orgData: { organization_id: string }) => {
    console.log("Fetching contacts for organization:", orgData.organization_id);

    try {
      // Fetch contacts from API endpoint (auto-populated from clients table)
      const response = await fetch("/api/contacts");
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to fetch contacts");
      }

      if (result.success && result.contacts) {
        console.log(`Loaded ${result.contacts.length} contacts from API`);
        setContacts(result.contacts);
      } else {
        console.error("Invalid API response:", result);
        setContacts([]);
      }
    } catch (error) {
      console.error("Error fetching contacts from API:", error);
      toast.showToast("Failed to load contacts", "error");
      setContacts([]);
    }
  };

  const filterContacts = () => {
    let filtered = [...contacts];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter((contact) => {
        const fullName =
          `${contact.first_name || ""} ${contact.last_name || ""}`.toLowerCase();
        const email = (contact.email || "").toLowerCase();
        const phone = (contact.phone || "").toLowerCase();
        const search = searchTerm.toLowerCase();

        return (
          fullName.includes(search) ||
          email.includes(search) ||
          phone.includes(search)
        );
      });
    }

    // Source filter
    if (sourceFilter !== "all") {
      filtered = filtered.filter((contact) => {
        const contactSource = contact.source || contact.lead?.source;
        if (sourceFilter === "facebook") {
          return (
            contact.tags?.includes("facebook-lead") ||
            contactSource === "facebook"
          );
        }
        if (sourceFilter === "website") {
          return contactSource === "website" || contactSource === "form";
        }
        if (sourceFilter === "manual") {
          return (
            contactSource === "manual" ||
            (!contactSource && !contact.tags?.includes("facebook-lead"))
          );
        }
        return true;
      });
    }

    // Tag filter
    if (tagFilter) {
      filtered = filtered.filter((contact) =>
        contact.tags?.some((tag) =>
          tag.toLowerCase().includes(tagFilter.toLowerCase()),
        ),
      );
    }

    // Opt-in filter
    if (optInFilter !== "all") {
      if (optInFilter === "sms") {
        filtered = filtered.filter((contact) => contact.sms_opt_in);
      } else if (optInFilter === "whatsapp") {
        filtered = filtered.filter((contact) => contact.whatsapp_opt_in);
      } else if (optInFilter === "email") {
        filtered = filtered.filter((contact) => contact.email_opt_in);
      }
    }

    // Sorting
    if (sortKey === "name") {
      filtered.sort((a, b) => {
        const nameA = `${a.first_name || ""} ${a.last_name || ""}`
          .trim()
          .toLowerCase();
        const nameB = `${b.first_name || ""} ${b.last_name || ""}`
          .trim()
          .toLowerCase();
        if (nameA < nameB) return sortOrder === "asc" ? -1 : 1;
        if (nameA > nameB) return sortOrder === "asc" ? 1 : -1;
        return 0;
      });
    } else if (sortKey === "created") {
      filtered.sort((a, b) => {
        const diff =
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        return sortOrder === "asc" ? diff : -diff;
      });
    }

    setFilteredContacts(filtered);

    // Reset to first page when filtering changes
    if (
      currentPage > 1 &&
      (searchTerm ||
        sourceFilter !== "all" ||
        tagFilter ||
        optInFilter !== "all")
    ) {
      setCurrentPage(1);
    }
  };

  const handleSort = (key: "name" | "created") => {
    if (sortKey === key) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortOrder(key === "name" ? "asc" : "desc");
    }
  };

  const handleExport = () => {
    const csv = [
      [
        "First Name",
        "Last Name",
        "Email",
        "Phone",
        "Source",
        "Tags",
        "SMS Opt-in",
        "WhatsApp Opt-in",
        "Email Opt-in",
        "Created",
      ],
      ...filteredContacts.map((contact) => [
        contact.first_name || "",
        contact.last_name || "",
        contact.email || "",
        contact.phone || "",
        contact.lead?.source || "Direct",
        (contact.tags || []).join(", "),
        contact.sms_opt_in ? "Yes" : "No",
        contact.whatsapp_opt_in ? "Yes" : "No",
        contact.email_opt_in ? "Yes" : "No",
        new Date(contact.created_at).toLocaleDateString("en-GB"),
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `contacts_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  const handleSelectContact = (contactId: string) => {
    const newSelected = new Set(selectedContacts);
    if (newSelected.has(contactId)) {
      newSelected.delete(contactId);
    } else {
      newSelected.add(contactId);
    }
    setSelectedContacts(newSelected);
  };

  const handleSelectAll = () => {
    const currentPageIds = paginatedContacts.map((c) => c.id);
    const allCurrentSelected = currentPageIds.every((id) =>
      selectedContacts.has(id),
    );

    const newSelected = new Set(selectedContacts);
    if (allCurrentSelected) {
      // Deselect all on current page
      currentPageIds.forEach((id) => newSelected.delete(id));
    } else {
      // Select all on current page
      currentPageIds.forEach((id) => newSelected.add(id));
    }
    setSelectedContacts(newSelected);
  };

  const handleSelectAllFiltered = () => {
    const allFilteredIds = filteredContacts.map((c) => c.id);
    const allSelected = allFilteredIds.every((id) => selectedContacts.has(id));

    if (allSelected) {
      // Deselect all filtered contacts
      setSelectedContacts(new Set());
    } else {
      // Select all filtered contacts
      setSelectedContacts(new Set(allFilteredIds));
    }
  };

  const handleBulkMessage = (type: "sms" | "whatsapp" | "email") => {
    // Navigate to campaigns with pre-selected contacts
    const selectedIds =
      selectedContacts.size > 0
        ? Array.from(selectedContacts)
        : filteredContacts.map((c) => c.id);
    router.push(
      `/org/${orgSlug}/campaigns/new?type=${type}&contacts=${selectedIds.join(",")}`,
    );
  };

  const handleBulkAddTags = async (tags: string[]) => {
    if (selectedContacts.size === 0) return;

    try {
      const selectedContactsArray = Array.from(selectedContacts);

      // Update each selected contact with new tags
      for (const contactId of selectedContactsArray) {
        const contact = contacts.find((c) => c.id === contactId);
        if (!contact) continue;

        const existingTags = contact.tags || [];
        const newTags = [...new Set([...existingTags, ...tags])];

        // Update in database (if it's a real contact, not a lead-based one)
        if (!contactId.startsWith("lead-")) {
          await supabase
            .from("contacts")
            .update({ tags: newTags })
            .eq("id", contactId);
        }
      }

      // Refresh contacts
      await fetchContacts();
      toast.showToast(
        `Added tags to ${selectedContactsArray.length} contacts`,
        "success",
      );
      setSelectedContacts(new Set());
    } catch (error) {
      console.error("Error adding tags:", error);
      toast.showToast("Failed to add tags", "error");
    }
  };

  const handleBulkDelete = async () => {
    if (selectedContacts.size === 0) return;

    if (
      !confirm(
        `Are you sure you want to delete ${selectedContacts.size} contacts? This action cannot be undone.`,
      )
    ) {
      return;
    }

    try {
      const selectedContactsArray = Array.from(selectedContacts);
      const realContacts = selectedContactsArray.filter(
        (id) => !id.startsWith("lead-"),
      );
      const leadContacts = selectedContactsArray.filter((id) =>
        id.startsWith("lead-"),
      );

      // Delete real contacts
      if (realContacts.length > 0) {
        await supabase.from("contacts").delete().in("id", realContacts);
      }

      // Delete leads (extract lead ID from lead-prefixed IDs)
      if (leadContacts.length > 0) {
        const leadIds = leadContacts.map((id) => id.replace("lead-", ""));
        await supabase.from("leads").delete().in("id", leadIds);
      }

      // Refresh contacts
      await fetchContacts();
      toast.showToast(
        `Deleted ${selectedContactsArray.length} contacts`,
        "success",
      );
      setSelectedContacts(new Set());
    } catch (error) {
      console.error("Error deleting contacts:", error);
      toast.showToast("Failed to delete contacts", "error");
    }
  };

  const paginatedContacts = filteredContacts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const totalPages = Math.ceil(filteredContacts.length / itemsPerPage);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">All Contacts</h1>
          <p className="text-gray-400 mt-1">
            Manage all your leads and contacts from every source
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowImportModal(true)}
            className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Import
          </button>
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
          <Link
            href={`/org/${orgSlug}/contacts/new`}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            Add Contact
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Total Contacts</p>
              <p className="text-2xl font-bold text-white">{contacts.length}</p>
            </div>
            <div className="bg-blue-500/20 p-3 rounded-lg">
              <UserPlus className="w-6 h-6 text-blue-400" />
            </div>
          </div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">SMS Enabled</p>
              <p className="text-2xl font-bold text-white">
                {contacts.filter((c) => c.sms_opt_in).length}
              </p>
            </div>
            <div className="bg-green-500/20 p-3 rounded-lg">
              <Phone className="w-6 h-6 text-green-400" />
            </div>
          </div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">WhatsApp Enabled</p>
              <p className="text-2xl font-bold text-white">
                {contacts.filter((c) => c.whatsapp_opt_in).length}
              </p>
            </div>
            <div className="bg-green-500/20 p-3 rounded-lg">
              <MessageSquare className="w-6 h-6 text-green-400" />
            </div>
          </div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Email Enabled</p>
              <p className="text-2xl font-bold text-white">
                {contacts.filter((c) => c.email_opt_in).length}
              </p>
            </div>
            <div className="bg-purple-500/20 p-3 rounded-lg">
              <Mail className="w-6 h-6 text-purple-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-gray-800 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search contacts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="px-4 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="all">All Sources</option>
            <option value="facebook">Facebook</option>
            <option value="website">Website</option>
            <option value="manual">Manual</option>
          </select>

          <select
            value={optInFilter}
            onChange={(e) => setOptInFilter(e.target.value)}
            className="px-4 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="all">All Opt-ins</option>
            <option value="sms">SMS Opted-in</option>
            <option value="whatsapp">WhatsApp Opted-in</option>
            <option value="email">Email Opted-in</option>
          </select>

          <input
            type="text"
            placeholder="Filter by tag..."
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
            className="px-4 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
          />

          <div className="flex gap-2">
            <button
              onClick={() => handleBulkMessage("sms")}
              className="px-3 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
              title="Send SMS to filtered contacts"
            >
              <Phone className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleBulkMessage("whatsapp")}
              className="px-3 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
              title="Send WhatsApp to filtered contacts"
            >
              <MessageSquare className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleBulkMessage("email")}
              className="px-3 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
              title="Send Email to filtered contacts"
            >
              <Mail className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {showBulkActions && (
        <div className="bg-orange-600 text-white p-4 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="font-medium">
              {selectedContacts.size} contact
              {selectedContacts.size !== 1 ? "s" : ""} selected
            </span>
            <button
              onClick={handleSelectAllFiltered}
              className="text-orange-200 hover:text-white underline text-sm"
            >
              {filteredContacts.every((c) => selectedContacts.has(c.id))
                ? "Deselect all filtered"
                : `Select all ${filteredContacts.length} filtered contacts`}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <BulkTagModal onAddTags={handleBulkAddTags} />
            <button
              onClick={() => handleBulkMessage("sms")}
              className="px-3 py-2 bg-orange-700 hover:bg-orange-800 rounded-lg flex items-center gap-2"
              title="Send SMS to selected contacts"
            >
              <Phone className="w-4 h-4" />
              SMS
            </button>
            <button
              onClick={() => handleBulkMessage("whatsapp")}
              className="px-3 py-2 bg-orange-700 hover:bg-orange-800 rounded-lg flex items-center gap-2"
              title="Send WhatsApp to selected contacts"
            >
              <MessageSquare className="w-4 h-4" />
              WhatsApp
            </button>
            <button
              onClick={() => handleBulkMessage("email")}
              className="px-3 py-2 bg-orange-700 hover:bg-orange-800 rounded-lg flex items-center gap-2"
              title="Send Email to selected contacts"
            >
              <Mail className="w-4 h-4" />
              Email
            </button>
            <button
              onClick={handleBulkDelete}
              className="px-3 py-2 bg-red-600 hover:bg-red-700 rounded-lg flex items-center gap-2"
              title="Delete selected contacts"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
            <button
              onClick={() => setSelectedContacts(new Set())}
              className="px-3 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg flex items-center gap-2"
              title="Clear selection"
            >
              <X className="w-4 h-4" />
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Contacts Table */}
      <div className="bg-gray-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-900">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={
                      paginatedContacts.length > 0 &&
                      paginatedContacts.every((c) => selectedContacts.has(c.id))
                    }
                    onChange={handleSelectAll}
                    className="w-4 h-4 text-orange-600 bg-gray-700 border-gray-600 rounded focus:ring-orange-500"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider select-none">
                  <button
                    type="button"
                    onClick={() => handleSort("name")}
                    className="inline-flex items-center gap-1 text-gray-300 hover:text-white"
                  >
                    Contact
                    {sortKey === "name" ? (
                      sortOrder === "asc" ? (
                        <ChevronUp className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3" />
                      )
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-gray-500" />
                    )}
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Communication
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Source
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Tags
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Opt-ins
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider select-none">
                  <button
                    type="button"
                    onClick={() => handleSort("created")}
                    className="inline-flex items-center gap-1 text-gray-300 hover:text-white"
                  >
                    Created
                    {sortKey === "created" ? (
                      sortOrder === "asc" ? (
                        <ChevronUp className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3" />
                      )
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-gray-500" />
                    )}
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {loading ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-6 py-4 text-center text-gray-400"
                  >
                    Loading contacts...
                  </td>
                </tr>
              ) : paginatedContacts.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-6 py-4 text-center text-gray-400"
                  >
                    No contacts found
                  </td>
                </tr>
              ) : (
                paginatedContacts.map((contact) => (
                  <tr key={contact.id} className="hover:bg-gray-700/50">
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={selectedContacts.has(contact.id)}
                        onChange={() => handleSelectContact(contact.id)}
                        className="w-4 h-4 text-orange-600 bg-gray-700 border-gray-600 rounded focus:ring-orange-500"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-white">
                          {contact.first_name || contact.last_name
                            ? `${contact.first_name || ""} ${contact.last_name || ""}`.trim()
                            : "No Name"}
                        </div>
                        {contact.lead?.status && (
                          <div className="text-xs text-gray-400">
                            Lead Status: {contact.lead.status}
                            {contact.lead.score &&
                              ` (Score: ${contact.lead.score})`}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-300">
                        {contact.email && (
                          <div className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {contact.email}
                          </div>
                        )}
                        {contact.phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {contact.phone}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {contact.client_type && (
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${
                            contact.is_current_client
                              ? "bg-green-500/20 text-green-400"
                              : "bg-gray-600/50 text-gray-300"
                          }`}
                        >
                          {contact.client_type}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-700 text-gray-300">
                        {contact.source ||
                          contact.lead?.source ||
                          contact.metadata?.source ||
                          "Direct"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {contact.tags?.map((tag, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 text-xs bg-blue-500/20 text-blue-400 rounded"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex gap-2">
                        {contact.sms_opt_in && (
                          <span className="text-green-400" title="SMS">
                            <Phone className="w-4 h-4" />
                          </span>
                        )}
                        {contact.whatsapp_opt_in && (
                          <span className="text-green-400" title="WhatsApp">
                            <MessageSquare className="w-4 h-4" />
                          </span>
                        )}
                        {contact.email_opt_in && (
                          <span className="text-green-400" title="Email">
                            <Mail className="w-4 h-4" />
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                      {new Date(contact.created_at).toLocaleDateString("en-GB")}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex gap-2">
                        {contact.lead_id && (
                          <Link
                            href={`/org/${orgSlug}/leads/${contact.lead_id}`}
                            className="text-orange-400 hover:text-orange-300"
                            title="View Lead"
                          >
                            View
                          </Link>
                        )}
                        <button
                          onClick={() =>
                            router.push(
                              `/org/${orgSlug}/conversations?contact=${contact.id}`,
                            )
                          }
                          className="text-blue-400 hover:text-blue-300"
                          title="Message"
                        >
                          Message
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-gray-900 px-6 py-3 flex items-center justify-between">
            <div className="text-sm text-gray-400">
              Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
              {Math.min(currentPage * itemsPerPage, filteredContacts.length)} of{" "}
              {filteredContacts.length} contacts
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 bg-gray-700 text-white rounded disabled:opacity-50"
              >
                Previous
              </button>
              <span className="px-3 py-1 text-white">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages}
                className="px-3 py-1 bg-gray-700 text-white rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function BulkTagModal({ onAddTags }: { onAddTags: (tags: string[]) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleSubmit = () => {
    if (tags.length > 0) {
      onAddTags(tags);
      setTags([]);
      setIsOpen(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddTag();
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="px-3 py-2 bg-orange-700 hover:bg-orange-800 rounded-lg flex items-center gap-2"
        title="Add tags to selected contacts"
      >
        <Tags className="w-4 h-4" />
        Add Tags
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-medium text-white mb-4">
          Add Tags to Selected Contacts
        </h3>

        <div className="space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Enter tag name..."
              className="flex-1 px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            <button
              onClick={handleAddTag}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg"
            >
              Add
            </button>
          </div>

          {tags.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-gray-400">Tags to add:</p>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded flex items-center gap-1"
                  >
                    {tag}
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className="text-blue-300 hover:text-white"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={() => {
              setIsOpen(false);
              setTags([]);
              setTagInput("");
            }}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={tags.length === 0}
            className="px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg"
          >
            Add Tags
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ContactsPage() {
  return (
    <RequireOrganization>
      <DashboardLayout>
        <Suspense
          fallback={
            <div className="flex items-center justify-center min-h-screen">
              <div className="text-gray-400">Loading contacts...</div>
            </div>
          }
        >
          <ContactsContent />
        </Suspense>
      </DashboardLayout>
    </RequireOrganization>
  );
}
