"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  User,
  Activity,
  CreditCard,
  FileText,
  AlertTriangle,
  StickyNote,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Heart,
  Users,
  TrendingDown,
  TrendingUp,
  Edit,
  Save,
  X,
  Trash2,
  MessageCircle,
  Apple,
} from "lucide-react";
import DashboardLayout from "@/app/components/DashboardLayout";
import MembershipsTab from "@/app/components/customers/tabs/MembershipsTab";
import NotesTab from "@/app/components/customers/tabs/NotesTab";
import WaiversTab from "@/app/components/customers/tabs/WaiversTab";
import ClassBookingsTab from "@/app/components/customers/tabs/ClassBookingsTab";
import ComprehensiveMessagingTab from "@/app/components/customers/tabs/ComprehensiveMessagingTab";
import NutritionTab from "@/app/components/customers/tabs/NutritionTab";
import { createClient } from "@/app/lib/supabase/client";

interface CustomerProfile {
  id: string;
  first_name?: string;
  last_name?: string;
  email: string;
  phone?: string;
  date_of_birth?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  medical_conditions?: string;
  allergies?: string;
  profile_photo_url?: string;
  preferred_contact_method?: string;
  communication_preferences?: any;
  tags?: string[];
  last_visit?: string;
  total_visits?: number;
  churn_risk_score?: number;
  churn_risk_factors?: any;
  lifetime_value?: number;
  notes?: string;
  created_at: string;
  updated_at?: string;
}

interface CustomerActivity {
  id: string;
  type: "booking" | "payment" | "note" | "communication";
  title: string;
  description: string;
  date: string;
  metadata?: any;
}

type TabType =
  | "profile"
  | "activity"
  | "class-bookings"
  | "payments"
  | "memberships"
  | "waivers"
  | "notes"
  | "messaging"
  | "nutrition";

export default function CustomerProfilePage() {
  const params = useParams();
  const router = useRouter();
  const customerId = params.customerId as string;
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [customer, setCustomer] = useState<CustomerProfile | null>(null);
  const [organizationId, setOrganizationId] = useState<string>("");
  const [activities, setActivities] = useState<CustomerActivity[]>([]);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [memberships, setMemberships] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [waivers, setWaivers] = useState<any[]>([]);
  const [classBookings, setClassBookings] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>("profile");
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<CustomerProfile>>({});
  const [sendingWelcomeEmail, setSendingWelcomeEmail] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (customerId) {
      loadCustomerProfile();
    }
  }, [customerId]);

  useEffect(() => {
    if (customerId && activeTab !== "profile") {
      loadTabData();
    }
  }, [activeTab, customerId]);

  const loadCustomerProfile = async () => {
    setLoading(true);
    try {
      // Get current user's organization
      const {
        data: { user },
      } = await supabase.auth.getUser();
      console.log("Current user:", user?.id);
      if (user) {
        const { data: userOrg, error: orgError } = await supabase
          .from("user_organizations")
          .select("organization_id")
          .eq("user_id", user.id)
          .single();

        console.log("User org query result:", userOrg, orgError);

        if (userOrg?.organization_id) {
          setOrganizationId(userOrg.organization_id);
          console.log("Set organizationId to:", userOrg.organization_id);
        } else {
          console.warn("No organization found for user");
        }
      }

      const response = await fetch(`/api/customers/${customerId}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to load customer");
      }

      const data = result.customer;

      if (data) {
        // Normalize to CustomerProfile shape
        const name = (
          data.name || `${data.first_name || ""} ${data.last_name || ""}`
        ).trim();
        const normalized: any = {
          ...data,
          name,
          total_visits: data.total_visits || 0,
          last_visit_date: data.last_visit || data.last_visit_date,
          lifetime_value: data.lifetime_value || 0,
          created_at: data.created_at,
          updated_at: data.updated_at,
        };
        setCustomer(normalized);
        setEditForm(normalized);

        console.log(`Loaded customer profile: ${name}`);
      }
    } catch (error) {
      console.error("Error loading customer:", error);
      alert("Failed to load customer profile");
      router.push("/members");
    } finally {
      setLoading(false);
    }
  };

  const loadTabData = async () => {
    try {
      switch (activeTab) {
        case "activity":
          await loadActivity();
          break;
        // Other tabs handle their own data loading
      }
    } catch (error) {
      console.error("Error loading tab data:", error);
    }
  };

  const loadActivity = async () => {
    try {
      const response = await fetch(`/api/customers/${customerId}/activity`);
      const data = await response.json();

      if (response.ok) {
        setActivities(data.activities || []);
      }
    } catch (error) {
      console.error("Error loading activity:", error);
    }
  };

  const loadRegistrations = async () => {
    try {
      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .or(`customer_id.eq.${customerId},client_id.eq.${customerId}`)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRegistrations(data || []);
    } catch (error) {
      console.error("Error loading registrations:", error);
    }
  };

  const loadPayments = async () => {
    try {
      console.log("Loading payments for customerId:", customerId);

      // Load payments from API endpoint (bypasses RLS)
      const response = await fetch(`/api/customers/${customerId}/payments`);

      if (!response.ok) {
        throw new Error("Failed to load payments from API");
      }

      const result = await response.json();

      const paymentTransactions = result.payments.payment_transactions || [];
      const importedPayments = result.payments.imported_payments || [];
      const transactions = result.payments.transactions || [];

      // Combine all payments
      const allPayments = [];

      // Add payment_transactions
      if (paymentTransactions) {
        paymentTransactions.forEach((pt) => {
          allPayments.push({
            ...pt,
            amount: pt.amount_pennies,
            source: "payment_transactions",
          });
        });
      }

      // Add imported payments
      if (importedPayments) {
        importedPayments.forEach((ip) => {
          allPayments.push({
            ...ip,
            amount: ip.amount, // Already in pounds, not pennies
            created_at: ip.payment_date || ip.created_at,
            status: ip.payment_status || "completed",
            source: "payments",
          });
        });
      }

      // Add transactions
      if (transactions) {
        transactions.forEach((t) => {
          allPayments.push({
            ...t,
            amount_pennies: t.amount,
            status: t.status || "completed",
            source: "transactions",
          });
        });
      }

      // Sort by date
      allPayments.sort((a, b) => {
        const dateA = new Date(a.created_at || a.payment_date);
        const dateB = new Date(b.created_at || b.payment_date);
        return dateB.getTime() - dateA.getTime();
      });

      console.log("Total payments loaded:", allPayments.length);
      console.log("Sources:", {
        payment_transactions: paymentTransactions?.length || 0,
        payments: importedPayments?.length || 0,
        transactions: transactions?.length || 0,
      });

      setPayments(allPayments);

      // Calculate and update lifetime value
      const totalValue = allPayments.reduce((sum, payment) => {
        const amount = payment.amount_pennies || payment.amount || 0;
        return sum + amount;
      }, 0);

      console.log(
        "Calculated lifetime value: £" + (totalValue / 100).toFixed(2),
      );

      // Update the customer's lifetime_value in the database
      if (totalValue > 0) {
        // Update in clients table (where the data is actually loaded from)
        const { error: updateError } = await supabase
          .from("clients")
          .update({ lifetime_value: totalValue })
          .eq("id", customerId);

        if (!updateError) {
          console.log("Updated lifetime_value in clients table");
          // Update local state
          setCustomer((prev) =>
            prev ? { ...prev, lifetime_value: totalValue } : prev,
          );
        } else {
          console.error("Error updating lifetime_value:", updateError);
        }
      }
    } catch (error) {
      console.error("Error loading payments:", error);
    }
  };

  const loadMemberships = async () => {
    try {
      const { data, error } = await supabase
        .from("customer_memberships")
        .select(
          `
          *,
          membership_plans (
            name,
            price,
            billing_period
          )
        `,
        )
        .or(`customer_id.eq.${customerId},client_id.eq.${customerId}`)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setMemberships(data || []);
    } catch (error) {
      console.error("Error loading memberships:", error);
    }
  };

  const loadNotes = async () => {
    try {
      // Ensure we have organizationId
      if (!organizationId) {
        console.warn("No organization ID available for loading notes");
        setNotes([]);
        return;
      }

      const { data, error } = await supabase
        .from("customer_notes")
        .select("*")
        .or(`customer_id.eq.${customerId},client_id.eq.${customerId}`)
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading notes:", error);
        console.error("Query details:", {
          customerId,
          organizationId,
          error: error.message,
        });
        throw error;
      }

      setNotes(data || []);
    } catch (error) {
      console.error("Error loading notes:", error);
      setNotes([]); // Set empty array on error to prevent UI issues
    }
  };

  const handleAddNote = async (noteContent: string) => {
    try {
      // Ensure we have organizationId
      if (!organizationId) {
        throw new Error("No organization ID available");
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Check if customer exists in clients table first
      let noteData: any = {
        organization_id: organizationId,
        note: noteContent, // Changed from 'content' to 'note'
        created_by: user.id,
        is_internal: true,
        customer_id: null as string | null,
        client_id: null as string | null,
      };

      // Try clients table first
      const { data: clientCheck } = await supabase
        .from("clients")
        .select("id")
        .eq("id", customerId)
        .eq("org_id", organizationId)
        .single();

      if (clientCheck) {
        noteData.client_id = customerId;
      } else {
        // Fall back to leads table
        const { data: leadCheck } = await supabase
          .from("leads")
          .select("id")
          .eq("id", customerId)
          .eq("organization_id", organizationId)
          .single();

        if (leadCheck) {
          noteData.customer_id = customerId;
        } else {
          throw new Error("Customer not found");
        }
      }

      const { data, error } = await supabase
        .from("customer_notes")
        .insert(noteData)
        .select("*")
        .single();

      if (error) {
        console.error("Database error:", error);
        throw error;
      }

      // Refresh notes - success feedback is handled by the NotesTab component
      await loadNotes();
    } catch (error) {
      console.error("Error adding note:", error);

      // Re-throw error so NotesTab can handle the feedback
      throw error;
    }
  };

  const handleUpdateNote = async (noteId: string, content: string) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("customer_notes")
        .update({
          content,
          updated_at: new Date().toISOString(),
        })
        .eq("id", noteId)
        .eq("organization_id", organizationId)
        .eq("created_by", user.id); // Only allow updating own notes

      if (error) throw error;
      await loadNotes();
    } catch (error) {
      console.error("Error updating note:", error);
      throw error;
    }
  };

  const loadWaivers = async () => {
    try {
      const { data, error } = await supabase
        .from("customer_waivers")
        .select(
          `
          *,
          waivers (
            id,
            name,
            content,
            organization_id
          )
        `,
        )
        .or(`customer_id.eq.${customerId},client_id.eq.${customerId}`)
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setWaivers(data || []);
    } catch (error) {
      console.error("Error loading waivers:", error);
      setWaivers([]);
    }
  };

  const loadClassBookings = async () => {
    try {
      const { data, error } = await supabase
        .from("bookings")
        .select(
          `
          *,
          schedules (
            name,
            start_time,
            duration_minutes,
            location
          )
        `,
        )
        .or(`customer_id.eq.${customerId},client_id.eq.${customerId}`)
        .eq("organization_id", organizationId)
        .order("booking_date", { ascending: false });

      if (error) throw error;
      setClassBookings(data || []);
    } catch (error) {
      console.error("Error loading class bookings:", error);
      setClassBookings([]);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Check if user is admin/owner or created the note
      const { data: userOrg } = await supabase
        .from("user_organizations")
        .select("role")
        .eq("user_id", user.id)
        .eq("organization_id", organizationId)
        .single();

      const canDelete = userOrg?.role === "owner" || userOrg?.role === "admin";

      let deleteQuery = supabase
        .from("customer_notes")
        .delete()
        .eq("id", noteId)
        .eq("organization_id", organizationId);

      // If not admin, only allow deleting own notes
      if (!canDelete) {
        deleteQuery = deleteQuery.eq("created_by", user.id);
      }

      const { error } = await deleteQuery;

      if (error) throw error;
      await loadNotes();
    } catch (error) {
      console.error("Error deleting note:", error);
      throw error;
    }
  };

  const handleSendWelcomeEmail = async () => {
    console.log("handleSendWelcomeEmail called");
    console.log("Customer data:", {
      id: customer?.id,
      email: customer?.email,
      name: customer?.first_name,
    });

    if (!customer?.email) {
      alert("Customer does not have an email address");
      return;
    }

    setSendingWelcomeEmail(true);
    try {
      const customerName =
        `${customer.first_name || ""} ${customer.last_name || ""}`.trim() ||
        "Customer";

      const requestBody = {
        customerId: customer.id,
        email: customer.email,
        name: customerName,
      };

      console.log("Sending request to /api/send-magic-link");
      console.log("Request body:", requestBody);

      const response = await fetch("/api/send-magic-link", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      console.log("Response status:", response.status);
      console.log("Response ok:", response.ok);

      const data = await response.json();
      console.log("Response data:", data);

      if (response.ok) {
        if (data.credentials) {
          // Email failed, show magic link for manual sharing
          const message =
            `Account claim link generated:\n\n` +
            `Email: ${data.credentials.email}\n` +
            `Magic Link: ${data.credentials.magicLink}\n` +
            `Expires: ${new Date(data.credentials.expiresAt).toLocaleString()}\n\n` +
            `Please share this link with the customer.`;
          alert(message);
          console.log("Customer magic link:", data.credentials);
        } else {
          // Email sent successfully
          let message = `Welcome email sent successfully to ${customer.email}`;
          if (data.magicLink) {
            // In development, also show the magic link
            message += `\n\nMagic link: ${data.magicLink}`;
            message += `\nExpires: ${new Date(data.expiresAt).toLocaleString()}`;
          }
          alert(message);
        }
      } else {
        throw new Error(data.error || "Failed to send welcome email");
      }
    } catch (error) {
      console.error("Error sending welcome email:", error);
      alert(
        error instanceof Error ? error.message : "Failed to send welcome email",
      );
    } finally {
      setSendingWelcomeEmail(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      const response = await fetch(`/api/customers/${customerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to update customer");
      }

      setCustomer({ ...customer!, ...editForm });
      setIsEditing(false);
      alert("Customer profile updated successfully");
    } catch (error) {
      console.error("Error updating customer:", error);
      alert("Failed to update customer profile");
    }
  };

  const handleDeleteMember = async () => {
    const confirmed = confirm(
      `Are you sure you want to delete ${customer?.first_name || "this member"}? This action cannot be undone.`,
    );

    if (!confirmed) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/clients/${customerId}/delete`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (response.ok) {
        alert("Member deleted successfully");
        router.push("/members");
      } else {
        throw new Error(data.error || "Failed to delete member");
      }
    } catch (error) {
      console.error("Error deleting member:", error);
      alert(error instanceof Error ? error.message : "Failed to delete member");
    } finally {
      setIsDeleting(false);
    }
  };

  const getChurnRiskColor = (score?: number) => {
    if (!score) return "text-gray-400";
    if (score >= 0.7) return "text-red-400";
    if (score >= 0.4) return "text-yellow-400";
    return "text-green-400";
  };

  const getChurnRiskLabel = (score?: number) => {
    if (!score) return "Unknown";
    if (score >= 0.7) return "High Risk";
    if (score >= 0.4) return "Medium Risk";
    return "Low Risk";
  };

  if (loading) {
    return (
      <DashboardLayout userData={null}>
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
            <p className="text-gray-400">Loading customer profile...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!customer) {
    return (
      <DashboardLayout userData={null}>
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
          <div className="text-center">
            <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <p className="text-gray-400">Customer not found</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userData={null}>
      <div className="min-h-screen bg-gray-900">
        <div className="container mx-auto px-6 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push("/members")}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-400" />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-white">
                  {`${customer.first_name || ""} ${customer.last_name || ""}`.trim() ||
                    "Unknown Member"}
                </h1>
                <p className="text-gray-400 mt-1">
                  Customer Profile & Management
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              {isEditing ? (
                <>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setEditForm(customer);
                    }}
                    className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                  >
                    <X className="w-4 h-4 inline mr-2" />
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveProfile}
                    className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                  >
                    <Save className="w-4 h-4 inline mr-2" />
                    Save Changes
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleSendWelcomeEmail}
                    className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
                    disabled={sendingWelcomeEmail}
                  >
                    <Mail className="w-4 h-4 inline mr-2" />
                    {sendingWelcomeEmail ? "Sending..." : "Send Magic Link"}
                  </button>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-3 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm"
                  >
                    <Edit className="w-4 h-4 inline mr-2" />
                    Edit
                  </button>
                  <button
                    onClick={handleDeleteMember}
                    className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                    disabled={isDeleting}
                  >
                    <Trash2 className="w-4 h-4 inline mr-2" />
                    {isDeleting ? "Deleting..." : "Delete"}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Customer Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div className="flex items-center gap-3 mb-2">
                <Activity className="w-5 h-5 text-blue-400" />
                <span className="text-gray-400 text-sm">Total Visits</span>
              </div>
              <div className="text-2xl font-bold text-white">
                {customer.total_visits || 0}
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div className="flex items-center gap-3 mb-2">
                <CreditCard className="w-5 h-5 text-green-400" />
                <span className="text-gray-400 text-sm">Lifetime Value</span>
              </div>
              <div className="text-2xl font-bold text-white">
                £{((customer.lifetime_value || 0) / 100).toFixed(2)}
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div className="flex items-center gap-3 mb-2">
                <TrendingDown className="w-5 h-5 text-orange-400" />
                <span className="text-gray-400 text-sm">Churn Risk</span>
              </div>
              <div
                className={`text-2xl font-bold ${getChurnRiskColor(customer.churn_risk_score)}`}
              >
                {getChurnRiskLabel(customer.churn_risk_score)}
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div className="flex items-center gap-3 mb-2">
                <Calendar className="w-5 h-5 text-purple-400" />
                <span className="text-gray-400 text-sm">Last Visit</span>
              </div>
              <div className="text-2xl font-bold text-white">
                {customer.last_visit
                  ? new Date(customer.last_visit).toLocaleDateString("en-GB")
                  : "Never"}
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex space-x-1 bg-gray-800 p-1 rounded-lg mb-6 overflow-x-auto">
            {[
              { key: "profile", label: "Profile", icon: User },
              { key: "activity", label: "Activity", icon: Activity },
              {
                key: "class-bookings",
                label: "Class Bookings",
                icon: Calendar,
              },
              { key: "payments", label: "Payments", icon: CreditCard },
              { key: "memberships", label: "Memberships", icon: Users },
              { key: "waivers", label: "Waivers", icon: FileText },
              { key: "notes", label: "Notes", icon: StickyNote },
              { key: "messaging", label: "Messaging", icon: MessageCircle },
              { key: "nutrition", label: "Nutrition", icon: Apple },
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key as TabType)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${
                  activeTab === key
                    ? "bg-orange-600 text-white"
                    : "text-gray-400 hover:text-white hover:bg-gray-700"
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {activeTab === "profile" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Basic Information */}
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-4">
                  Basic Information
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      First Name
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editForm.first_name || ""}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            first_name: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    ) : (
                      <p className="text-white">
                        {customer.first_name || "Not provided"}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Last Name
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editForm.last_name || ""}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            last_name: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    ) : (
                      <p className="text-white">
                        {customer.last_name || "Not provided"}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Email
                    </label>
                    {isEditing ? (
                      <input
                        type="email"
                        value={editForm.email || ""}
                        onChange={(e) =>
                          setEditForm({ ...editForm, email: e.target.value })
                        }
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    ) : (
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-gray-400" />
                        <p className="text-white">{customer.email}</p>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Phone
                    </label>
                    {isEditing ? (
                      <input
                        type="tel"
                        value={editForm.phone || ""}
                        onChange={(e) =>
                          setEditForm({ ...editForm, phone: e.target.value })
                        }
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    ) : (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <p className="text-white">{customer.phone}</p>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Date of Birth
                    </label>
                    {isEditing ? (
                      <input
                        type="date"
                        value={editForm.date_of_birth || ""}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            date_of_birth: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    ) : (
                      <p className="text-white">
                        {customer.date_of_birth
                          ? new Date(customer.date_of_birth).toLocaleDateString(
                              "en-GB",
                            )
                          : "Not provided"}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Emergency Contact */}
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-4">
                  Emergency Contact
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Contact Name
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editForm.emergency_contact_name || ""}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            emergency_contact_name: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    ) : (
                      <p className="text-white">
                        {customer.emergency_contact_name || "Not provided"}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Contact Phone
                    </label>
                    {isEditing ? (
                      <input
                        type="tel"
                        value={editForm.emergency_contact_phone || ""}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            emergency_contact_phone: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    ) : (
                      <p className="text-white">
                        {customer.emergency_contact_phone || "Not provided"}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Medical Information */}
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Heart className="w-5 h-5 text-red-400" />
                  Medical Information
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Medical Conditions
                    </label>
                    {isEditing ? (
                      <textarea
                        value={editForm.medical_conditions || ""}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            medical_conditions: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                        rows={3}
                        placeholder="Any medical conditions or health concerns..."
                      />
                    ) : (
                      <p className="text-white">
                        {customer.medical_conditions || "None reported"}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Allergies
                    </label>
                    {isEditing ? (
                      <textarea
                        value={editForm.allergies || ""}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            allergies: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                        rows={3}
                        placeholder="Any allergies or dietary restrictions..."
                      />
                    ) : (
                      <p className="text-white">
                        {customer.allergies || "None reported"}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Tags & Preferences */}
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-4">
                  Tags & Preferences
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Customer Tags
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {(customer.tags || []).map((tag, index) => (
                        <span
                          key={index}
                          className="bg-orange-900/20 text-orange-400 px-2 py-1 rounded text-sm"
                        >
                          {tag}
                        </span>
                      ))}
                      {(!customer.tags || customer.tags.length === 0) && (
                        <span className="text-gray-400">No tags assigned</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Preferred Contact Method
                    </label>
                    {isEditing ? (
                      <select
                        value={editForm.preferred_contact_method || ""}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            preferred_contact_method: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                      >
                        <option value="">Select method</option>
                        <option value="email">Email</option>
                        <option value="sms">SMS</option>
                        <option value="whatsapp">WhatsApp</option>
                        <option value="phone">Phone</option>
                        <option value="none">No contact</option>
                      </select>
                    ) : (
                      <p className="text-white capitalize">
                        {customer.preferred_contact_method || "Not specified"}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Activity Tab */}
          {activeTab === "activity" && (
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4">
                Recent Activity
              </h3>
              {activities.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No activity recorded yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {activities.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-start gap-4 p-4 bg-gray-700 rounded-lg"
                    >
                      <div className="flex-1">
                        <h4 className="text-white font-medium">
                          {activity.title}
                        </h4>
                        <p className="text-gray-400 text-sm mt-1">
                          {activity.description}
                        </p>
                        <p className="text-gray-500 text-xs mt-2">
                          {new Date(activity.date).toLocaleString("en-GB")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Payments Tab */}
          {activeTab === "payments" && (
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4">
                Payment History
              </h3>
              {payments.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No payments recorded yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {payments.map((payment) => (
                    <div
                      key={payment.id}
                      className="flex items-start justify-between p-4 bg-gray-700 rounded-lg"
                    >
                      <div className="flex-1">
                        <h4 className="text-white font-medium">
                          £
                          {(payment.amount_pennies
                            ? payment.amount_pennies / 100 // If amount_pennies exists, it's in pennies
                            : payment.amount || 0
                          ) // Otherwise amount is already in pounds
                            .toFixed(2)}
                        </h4>
                        <p className="text-gray-400 text-sm mt-1">
                          {payment.description ||
                            payment.payment_method ||
                            "Payment"}
                        </p>
                        <p className="text-gray-500 text-xs mt-2">
                          {new Date(
                            payment.created_at || payment.payment_date,
                          ).toLocaleDateString("en-GB")}
                        </p>
                      </div>
                      <div className="text-right">
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            payment.status === "completed"
                              ? "bg-green-900/20 text-green-400"
                              : payment.status === "pending"
                                ? "bg-yellow-900/20 text-yellow-400"
                                : payment.status === "failed"
                                  ? "bg-red-900/20 text-red-400"
                                  : "bg-gray-700 text-gray-400"
                          }`}
                        >
                          {payment.status || "completed"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Memberships Tab */}
          {activeTab === "memberships" && (
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <MembershipsTab customerId={customerId} />
            </div>
          )}

          {/* Notes Tab */}
          {activeTab === "notes" && (
            <NotesTab
              notes={notes}
              onAddNote={handleAddNote}
              onUpdateNote={handleUpdateNote}
              onDeleteNote={handleDeleteNote}
              onRefresh={loadNotes}
            />
          )}

          {/* Waivers Tab */}
          {activeTab === "waivers" && (
            <WaiversTab
              customerId={customerId}
              customerEmail={customer.email}
              customerName={
                `${customer.first_name || ""} ${customer.last_name || ""}`.trim() ||
                customer.email
              }
              existingWaivers={waivers}
              onRefresh={loadWaivers}
            />
          )}

          {/* Class Bookings Tab */}
          {activeTab === "class-bookings" && (
            <ClassBookingsTab
              customerId={customerId}
              organizationId={organizationId}
            />
          )}

          {/* Messaging Tab */}
          {activeTab === "messaging" && (
            <ComprehensiveMessagingTab
              customerId={customerId}
              customer={customer}
            />
          )}

          {/* Nutrition Tab */}
          {activeTab === "nutrition" && (
            <NutritionTab customerId={customerId} />
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
