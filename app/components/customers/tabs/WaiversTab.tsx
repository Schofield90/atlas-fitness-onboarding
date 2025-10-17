"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/app/lib/supabase/client";
import {
  FileText,
  Download,
  Eye,
  Clock,
  CheckCircle,
  AlertCircle,
  Upload,
  Plus,
  Send,
  Mail,
  RotateCcw,
  X,
  Users,
  Edit,
} from "lucide-react";
import { formatBritishDate } from "@/app/lib/utils/british-format";
import { WaiverAssignmentModal } from "../WaiverAssignmentModal";

interface WaiversTabProps {
  customerId: string;
}

interface CustomerWaiver {
  id: string;
  customer_id: string;
  waiver_id: string;
  status: "pending" | "signed" | "expired" | "cancelled";
  assigned_at: string;
  sent_at: string | null;
  opened_at: string | null;
  signed_at: string | null;
  expires_at: string | null;
  signature_data: string | null;
  signature_method: string | null;
  witness_name: string | null;
  witness_signature: string | null;
  witness_email: string | null;
  reminder_count: number;
  last_reminder_sent: string | null;
  waiver: {
    id: string;
    title: string;
    waiver_type: string;
    content: string;
    requires_witness: boolean;
  };
}

interface AvailableWaiver {
  id: string;
  title: string;
  waiver_type: string;
  is_active: boolean;
  requires_witness: boolean;
  validity_days: number | null;
}

export default function WaiversTab({ customerId }: WaiversTabProps) {
  const [customerWaivers, setCustomerWaivers] = useState<CustomerWaiver[]>([]);
  const [availableWaivers, setAvailableWaivers] = useState<AvailableWaiver[]>(
    [],
  );
  const [customer, setCustomer] = useState<{
    id: string;
    name: string;
    email: string;
    organization_id: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showWaiverModal, setShowWaiverModal] = useState<CustomerWaiver | null>(
    null,
  );
  const [emailMessage, setEmailMessage] = useState("");
  const supabase = createClient();

  useEffect(() => {
    fetchCustomerData();
    fetchCustomerWaivers();
    fetchAvailableWaivers();
  }, [customerId]);

  const fetchCustomerData = async () => {
    try {
      // First try clients table
      const { data: clientData } = await supabase
        .from("clients")
        .select("id, name, email, organization_id")
        .eq("id", customerId)
        .single();

      if (clientData) {
        setCustomer(clientData);
        return;
      }

      // If not found in clients, try leads table
      const { data: leadData } = await supabase
        .from("leads")
        .select("id, first_name, last_name, email, organization_id")
        .eq("id", customerId)
        .single();

      if (leadData) {
        setCustomer({
          id: leadData.id,
          name: `${leadData.first_name} ${leadData.last_name}`.trim(),
          email: leadData.email,
          organization_id: leadData.organization_id,
        });
      }
    } catch (error) {
      console.error("Error fetching customer data:", error);
    }
  };

  const fetchCustomerWaivers = async () => {
    try {
      const response = await fetch(
        `/api/waivers/customer-waivers?customer_id=${customerId}`,
      );
      const result = await response.json();

      if (result.success) {
        setCustomerWaivers(result.data || []);
      } else {
        console.error("Error fetching customer waivers:", result.error);
      }
    } catch (error) {
      console.error("Error fetching customer waivers:", error);
    }
  };

  const fetchAvailableWaivers = async () => {
    try {
      const response = await fetch("/api/waivers");
      const result = await response.json();

      if (result.success) {
        setAvailableWaivers(result.data || []);
      } else {
        console.error("Error fetching available waivers:", result.error);
      }
    } catch (error) {
      console.error("Error fetching available waivers:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleWaiverAssigned = async () => {
    await fetchCustomerWaivers();
    setShowAssignModal(false);
  };

  const sendWaiverEmail = async (
    customerWaiverId: string,
    isReminder: boolean = false,
  ) => {
    try {
      setActionLoading(customerWaiverId);

      const response = await fetch("/api/waivers/send-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customer_waiver_id: customerWaiverId,
          email_type: isReminder ? "reminder" : "initial",
          custom_message: emailMessage || undefined,
        }),
      });

      const result = await response.json();

      if (result.success) {
        await fetchCustomerWaivers();
        setEmailMessage("");
        alert("Waiver email sent successfully!");
      } else {
        alert("Failed to send email: " + result.error);
      }
    } catch (error) {
      console.error("Error sending waiver email:", error);
      alert("Failed to send waiver email");
    } finally {
      setActionLoading(null);
    }
  };

  const markWaiverSigned = async (customerWaiverId: string) => {
    if (
      !confirm("Are you sure you want to manually mark this waiver as signed?")
    ) {
      return;
    }

    try {
      setActionLoading(customerWaiverId);

      const response = await fetch(
        `/api/waivers/customer-waivers/${customerWaiverId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: "signed",
            signature_method: "wet_signature",
          }),
        },
      );

      const result = await response.json();

      if (result.success) {
        await fetchCustomerWaivers();
      } else {
        alert("Failed to update waiver: " + result.error);
      }
    } catch (error) {
      console.error("Error updating waiver:", error);
      alert("Failed to update waiver");
    } finally {
      setActionLoading(null);
    }
  };

  const cancelWaiver = async (customerWaiverId: string) => {
    if (!confirm("Are you sure you want to cancel this waiver assignment?")) {
      return;
    }

    try {
      setActionLoading(customerWaiverId);

      const response = await fetch(
        `/api/waivers/customer-waivers/${customerWaiverId}`,
        {
          method: "DELETE",
        },
      );

      const result = await response.json();

      if (result.success) {
        await fetchCustomerWaivers();
      } else {
        alert("Failed to cancel waiver: " + result.error);
      }
    } catch (error) {
      console.error("Error cancelling waiver:", error);
      alert("Failed to cancel waiver");
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusIcon = (status: string, expiryDate: string | null) => {
    if (expiryDate && new Date(expiryDate) < new Date()) {
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
    switch (status) {
      case "signed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "expired":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case "cancelled":
        return <X className="h-4 w-4 text-gray-500" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusText = (status: string, expiryDate: string | null) => {
    if (expiryDate && new Date(expiryDate) < new Date()) {
      return "Expired";
    }
    switch (status) {
      case "signed":
        return "Signed";
      case "expired":
        return "Expired";
      case "cancelled":
        return "Cancelled";
      default:
        return "Pending";
    }
  };

  const getStatusColor = (status: string, expiryDate: string | null) => {
    if (expiryDate && new Date(expiryDate) < new Date()) {
      return "bg-red-500/20 text-red-400";
    }
    switch (status) {
      case "signed":
        return "bg-green-500/20 text-green-400";
      case "expired":
        return "bg-red-500/20 text-red-400";
      case "cancelled":
        return "bg-gray-500/20 text-gray-400";
      default:
        return "bg-yellow-500/20 text-yellow-400";
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "liability":
        return "bg-red-500/20 text-red-400";
      case "medical":
        return "bg-blue-500/20 text-blue-400";
      case "photo_release":
        return "bg-green-500/20 text-green-400";
      case "membership_agreement":
        return "bg-purple-500/20 text-purple-400";
      case "general":
        return "bg-gray-500/20 text-gray-400";
      default:
        return "bg-gray-500/20 text-gray-400";
    }
  };

  const formatWaiverType = (type: string) => {
    return type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const getSigningUrl = (customerWaiverId: string) => {
    return `${window.location.origin}/waivers/sign/${customerWaiverId}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-gray-400">Loading waivers...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Waivers</h3>
        <button
          onClick={() => setShowAssignModal(true)}
          disabled={!customer}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="h-4 w-4" />
          Add Waiver
        </button>
      </div>

      {/* Customer Waivers */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h4 className="text-md font-semibold text-white mb-4">
          Customer Waivers
        </h4>

        {customerWaivers.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="h-8 w-8 text-gray-600 mx-auto mb-2" />
            <p className="text-gray-400">
              No waivers assigned to this customer
            </p>
            <button
              onClick={() => setShowAssignModal(true)}
              className="mt-3 text-blue-400 hover:text-blue-300 text-sm"
            >
              Assign a waiver →
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {customerWaivers.map((customerWaiver) => (
              <div
                key={customerWaiver.id}
                className="p-4 bg-gray-700 rounded-lg"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {getStatusIcon(
                        customerWaiver.status,
                        customerWaiver.expires_at,
                      )}
                      <h5 className="font-medium text-white">
                        {customerWaiver.waiver.title}
                      </h5>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs ${getStatusColor(customerWaiver.status, customerWaiver.expires_at)}`}
                      >
                        {getStatusText(
                          customerWaiver.status,
                          customerWaiver.expires_at,
                        )}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-400 mb-3">
                      <div>
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-xs ${getTypeColor(customerWaiver.waiver.waiver_type)} mr-2`}
                        >
                          {formatWaiverType(customerWaiver.waiver.waiver_type)}
                        </span>
                        {customerWaiver.waiver.requires_witness && (
                          <span className="inline-flex items-center gap-1 text-xs text-orange-400">
                            <Users className="h-3 w-3" />
                            Requires Witness
                          </span>
                        )}
                      </div>
                      <div>
                        <span>
                          Assigned:{" "}
                          {formatBritishDate(customerWaiver.assigned_at)}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-400 mb-3">
                      <div>
                        {customerWaiver.sent_at ? (
                          <span>
                            Sent: {formatBritishDate(customerWaiver.sent_at)}
                          </span>
                        ) : (
                          <span className="text-yellow-400">Not sent yet</span>
                        )}
                      </div>
                      <div>
                        {customerWaiver.opened_at && (
                          <span>
                            Opened:{" "}
                            {formatBritishDate(customerWaiver.opened_at)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-400">
                      <div>
                        {customerWaiver.signed_at ? (
                          <span className="text-green-400">
                            Signed:{" "}
                            {formatBritishDate(customerWaiver.signed_at)}
                          </span>
                        ) : customerWaiver.expires_at ? (
                          <span>
                            Expires:{" "}
                            {formatBritishDate(customerWaiver.expires_at)}
                          </span>
                        ) : null}
                      </div>
                      <div>
                        {customerWaiver.reminder_count > 0 && (
                          <span>
                            Reminders: {customerWaiver.reminder_count}
                          </span>
                        )}
                      </div>
                    </div>

                    {customerWaiver.witness_name && (
                      <div className="mt-2 text-sm text-gray-400">
                        <span>Witness: {customerWaiver.witness_name}</span>
                        {customerWaiver.witness_email && (
                          <span> ({customerWaiver.witness_email})</span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    {/* View Waiver */}
                    <button
                      onClick={() => setShowWaiverModal(customerWaiver)}
                      className="p-2 text-gray-400 hover:text-white hover:bg-gray-600 rounded-lg"
                      title="View waiver"
                    >
                      <Eye className="h-4 w-4" />
                    </button>

                    {/* Actions based on status */}
                    {customerWaiver.status === "pending" && (
                      <>
                        {/* Send/Resend Email */}
                        <button
                          onClick={() =>
                            sendWaiverEmail(
                              customerWaiver.id,
                              !!customerWaiver.sent_at,
                            )
                          }
                          disabled={actionLoading === customerWaiver.id}
                          className="p-2 text-gray-400 hover:text-blue-400 hover:bg-gray-600 rounded-lg disabled:opacity-50"
                          title={
                            customerWaiver.sent_at
                              ? "Send reminder"
                              : "Send waiver email"
                          }
                        >
                          {actionLoading === customerWaiver.id ? (
                            <RotateCcw className="h-4 w-4 animate-spin" />
                          ) : (
                            <Send className="h-4 w-4" />
                          )}
                        </button>

                        {/* Mark as Signed */}
                        <button
                          onClick={() => markWaiverSigned(customerWaiver.id)}
                          disabled={actionLoading === customerWaiver.id}
                          className="p-2 text-gray-400 hover:text-green-400 hover:bg-gray-600 rounded-lg disabled:opacity-50"
                          title="Mark as signed"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </button>

                        {/* Cancel */}
                        <button
                          onClick={() => cancelWaiver(customerWaiver.id)}
                          disabled={actionLoading === customerWaiver.id}
                          className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-600 rounded-lg disabled:opacity-50"
                          title="Cancel waiver"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </>
                    )}

                    {customerWaiver.status === "signed" &&
                      customerWaiver.signature_data && (
                        <button
                          className="p-2 text-gray-400 hover:text-white hover:bg-gray-600 rounded-lg"
                          title="Download signed waiver"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                      )}
                  </div>
                </div>

                {/* Signing URL for pending waivers */}
                {customerWaiver.status === "pending" && (
                  <div className="mt-3 p-3 bg-gray-600 rounded text-sm">
                    <div className="flex items-center gap-2 text-gray-300 mb-1">
                      <Mail className="h-4 w-4" />
                      <span>Signing URL:</span>
                    </div>
                    <code className="text-xs text-blue-400 break-all">
                      {getSigningUrl(customerWaiver.id)}
                    </code>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Waiver Assignment Modal */}
      {customer && (
        <WaiverAssignmentModal
          isOpen={showAssignModal}
          onClose={() => setShowAssignModal(false)}
          customer={customer}
          onWaiverAssigned={handleWaiverAssigned}
        />
      )}

      {/* Waiver Details Modal */}
      {showWaiverModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">
                {showWaiverModal.waiver.title}
              </h3>
              <button
                onClick={() => setShowWaiverModal(null)}
                className="text-gray-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="bg-gray-700 rounded-lg p-4 mb-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-400">Status:</span>
                  <span
                    className={`ml-2 px-2 py-0.5 rounded text-xs ${getStatusColor(showWaiverModal.status, showWaiverModal.expires_at)}`}
                  >
                    {getStatusText(
                      showWaiverModal.status,
                      showWaiverModal.expires_at,
                    )}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">Type:</span>
                  <span className="ml-2 text-white">
                    {formatWaiverType(showWaiverModal.waiver.waiver_type)}
                  </span>
                </div>
                {showWaiverModal.signed_at && (
                  <div>
                    <span className="text-gray-400">Signed:</span>
                    <span className="ml-2 text-white">
                      {formatBritishDate(showWaiverModal.signed_at)}
                    </span>
                  </div>
                )}
                {showWaiverModal.expires_at && (
                  <div>
                    <span className="text-gray-400">Expires:</span>
                    <span className="ml-2 text-white">
                      {formatBritishDate(showWaiverModal.expires_at)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-lg p-6 text-gray-900 max-h-96 overflow-y-auto">
              <div className="whitespace-pre-wrap">
                {showWaiverModal.waiver.content}
              </div>
            </div>

            {showWaiverModal.signature_data && (
              <div className="mt-4 bg-gray-700 rounded-lg p-4">
                <h4 className="text-white font-medium mb-2">Signature</h4>
                <img
                  src={showWaiverModal.signature_data}
                  alt="Customer signature"
                  className="max-w-md border border-gray-600 rounded"
                />
                {showWaiverModal.witness_name && (
                  <div className="mt-2 text-sm text-gray-400">
                    <span>Witnessed by: {showWaiverModal.witness_name}</span>
                    {showWaiverModal.witness_email && (
                      <span> ({showWaiverModal.witness_email})</span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
