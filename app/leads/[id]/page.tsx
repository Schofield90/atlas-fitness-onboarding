"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import DashboardLayout from "@/app/components/DashboardLayout";
import { MessageComposer } from "@/app/components/messaging/MessageComposer";
import { UnifiedTimeline } from "@/app/components/messaging/UnifiedTimeline";
import { CallModal } from "@/app/components/calling/CallModal";
import { AttendanceHistory } from "@/app/components/attendance/AttendanceHistory";
import { PaymentHistory } from "@/app/components/payments/PaymentHistory";

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  source: string;
  status: string;
  created_at: string;
  form_name?: string;
  campaign_name?: string;
  facebook_lead_id?: string;
  page_id?: string;
  form_id?: string;
  field_data?: Record<string, any>;
  client_id?: string;
}

export default function LeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [notes, setNotes] = useState("");
  const [userData, setUserData] = useState<any>(null);
  const [messageModalOpen, setMessageModalOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [callModalOpen, setCallModalOpen] = useState(false);

  useEffect(() => {
    fetchLead();
    const storedData = localStorage.getItem("gymleadhub_trial_data");
    if (storedData) {
      setUserData(JSON.parse(storedData));
    }
  }, [params.id]);

  const fetchLead = async () => {
    try {
      const res = await fetch(`/api/leads/${params.id}`);
      if (res.ok) {
        const data = await res.json();
        setLead(data.lead);
        // Load existing notes if any
        if (data.lead.notes) {
          setNotes(data.lead.notes);
        }
      }
    } catch (error) {
      console.error("Error fetching lead:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateLeadStatus = async (newStatus: string) => {
    if (!lead) return;

    try {
      const res = await fetch("/api/leads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: lead.id,
          status: newStatus,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setLead(data.lead);
      }
    } catch (error) {
      console.error("Error updating lead:", error);
    }
  };

  const saveNotes = async () => {
    if (!lead) return;

    try {
      const res = await fetch("/api/leads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: lead.id,
          notes: notes,
        }),
      });

      if (res.ok) {
        alert("Notes saved successfully!");
      }
    } catch (error) {
      console.error("Error saving notes:", error);
      alert("Failed to save notes");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "new":
        return "bg-blue-500";
      case "contacted":
        return "bg-yellow-500";
      case "qualified":
        return "bg-green-500";
      case "converted":
        return "bg-purple-500";
      default:
        return "bg-gray-500";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (!lead) {
    return (
      <DashboardLayout userData={userData}>
        <div className="container mx-auto px-6 py-8">
          <div className="bg-gray-800 rounded-lg p-8 text-center">
            <h1 className="text-2xl font-bold mb-4">Lead Not Found</h1>
            <p className="text-gray-400 mb-6">
              The lead you're looking for doesn't exist.
            </p>
            <Link
              href="/leads"
              className="bg-orange-600 hover:bg-orange-700 text-white py-2 px-4 rounded-lg"
            >
              Back to Leads
            </Link>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userData={userData}>
      <div className="container mx-auto px-6 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
          <Link href="/leads" className="hover:text-white">
            Leads
          </Link>
          <span>/</span>
          <span className="text-white">{lead.name}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Lead Info Card */}
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h1 className="text-2xl font-bold mb-2">{lead.name}</h1>
                  <div className="flex items-center gap-4">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium text-white ${getStatusColor(lead.status)}`}
                    >
                      {lead.status}
                    </span>
                    <span className="text-sm text-gray-400">
                      Added {formatDate(lead.created_at)}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setEditing(!editing)}
                  className="p-2 hover:bg-gray-700 rounded transition-colors"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-400 mb-1">
                    Email
                  </h3>
                  <p className="text-lg">{lead.email}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-400 mb-1">
                    Phone
                  </h3>
                  <p className="text-lg">{lead.phone}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-400 mb-1">
                    Source
                  </h3>
                  <p className="text-lg capitalize">{lead.source}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-400 mb-1">
                    Lead Form
                  </h3>
                  <p className="text-lg">{lead.form_name || "N/A"}</p>
                </div>
                {lead.campaign_name && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-400 mb-1">
                      Campaign
                    </h3>
                    <p className="text-lg">{lead.campaign_name}</p>
                  </div>
                )}
                {lead.facebook_lead_id && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-400 mb-1">
                      Facebook Lead ID
                    </h3>
                    <p className="text-sm font-mono">{lead.facebook_lead_id}</p>
                  </div>
                )}
              </div>

              {lead.field_data && Object.keys(lead.field_data).length > 0 && (
                <div className="mt-6 pt-6 border-t border-gray-700">
                  <h3 className="text-lg font-medium mb-4">
                    Additional Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(lead.field_data).map(([key, value]) => (
                      <div key={key}>
                        <h4 className="text-sm font-medium text-gray-400 mb-1">
                          {key}
                        </h4>
                        <p>{String(value)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Attendance History - Show if lead has a connected client */}
            {(lead.client_id || lead.id) && (
              <>
                <div className="mb-6">
                  <AttendanceHistory
                    clientId={lead.client_id || lead.id}
                    clientName={lead.name}
                  />
                </div>

                {/* Payment History */}
                <div className="mb-6">
                  <PaymentHistory
                    clientId={lead.client_id || lead.id}
                    clientName={lead.name}
                  />
                </div>
              </>
            )}

            {/* Unified Communication Timeline */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-bold mb-4">Communication History</h2>
              <UnifiedTimeline
                leadId={lead.id}
                leadPhone={lead.phone}
                leadEmail={lead.email}
              />
            </div>

            {/* Notes Section */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-bold mb-4">Notes</h2>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes about this lead..."
                className="w-full h-32 bg-gray-700 text-white placeholder-gray-400 rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <button
                onClick={saveNotes}
                className="mt-3 bg-orange-600 hover:bg-orange-700 text-white py-2 px-4 rounded-lg transition-colors"
              >
                Save Notes
              </button>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-bold mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <button
                  onClick={() => setCallModalOpen(true)}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                    />
                  </svg>
                  Call
                </button>
                <button
                  onClick={() => {
                    setMessageModalOpen(true);
                    // Set message type to WhatsApp when modal opens
                    if ((window as any).setMessageType) {
                      (window as any).setMessageType("whatsapp");
                    }
                  }}
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                  WhatsApp
                </button>
                <button
                  onClick={() => setMessageModalOpen(true)}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                  Send Message
                </button>
              </div>
            </div>

            {/* Status Update */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-bold mb-4">Update Status</h3>
              <select
                value={lead.status}
                onChange={(e) => updateLeadStatus(e.target.value)}
                className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="qualified">Qualified</option>
                <option value="converted">Converted</option>
              </select>
            </div>

            {/* Activity Timeline */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-bold mb-4">Activity</h3>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                  <div className="flex-1">
                    <p className="text-sm">Lead created</p>
                    <p className="text-xs text-gray-400">
                      {formatDate(lead.created_at)}
                    </p>
                  </div>
                </div>
                {lead.status !== "new" && (
                  <div className="flex gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                    <div className="flex-1">
                      <p className="text-sm">Status updated to {lead.status}</p>
                      <p className="text-xs text-gray-400">Just now</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Message Composer Modal */}
      {lead && (
        <MessageComposer
          isOpen={messageModalOpen}
          onClose={() => setMessageModalOpen(false)}
          lead={lead}
          onMessageSent={() => {
            setMessageModalOpen(false);
            // Refresh message history
            window.location.reload();
          }}
        />
      )}

      {/* Call Modal */}
      {lead && (
        <CallModal
          isOpen={callModalOpen}
          onClose={() => setCallModalOpen(false)}
          lead={lead}
        />
      )}
    </DashboardLayout>
  );
}
