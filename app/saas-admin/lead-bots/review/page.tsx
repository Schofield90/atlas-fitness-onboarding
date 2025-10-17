"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "react-hot-toast";
import { Calendar, AlertTriangle, MessageSquare, CheckCircle, XCircle, Clock } from "lucide-react";

/**
 * Human Review UI for Flagged Conversations
 *
 * Allows staff to:
 * 1. Review flagged conversations
 * 2. Provide training feedback
 * 3. Update SOPs automatically
 * 4. Mark as resolved/false positive
 */

interface Flag {
  id: string;
  agent_id: string;
  conversation_id: string;
  message_id: string;
  flag_type: string;
  severity: string;
  trigger_message: string;
  agent_response: string;
  detection_metadata: any;
  review_status: string;
  reviewer_notes: string | null;
  improvement_instructions: string | null;
  sop_update_applied: boolean;
  created_at: string;
  agent?: {
    id: string;
    name: string;
  };
}

interface ConversationMessage {
  role: string;
  content: string;
  created_at: string;
  tool_calls?: any;
  tool_results?: any;
}

export default function FlaggedConversationsReview() {
  const [flags, setFlags] = useState<Flag[]>([]);
  const [selectedFlag, setSelectedFlag] = useState<Flag | null>(null);
  const [conversationContext, setConversationContext] = useState<ConversationMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [severityFilter, setSeverityFilter] = useState<string>("all");

  // Form states
  const [reviewerNotes, setReviewerNotes] = useState("");
  const [improvementInstructions, setImprovementInstructions] = useState("");
  const [updateSOPChecked, setUpdateSOPChecked] = useState(true);

  useEffect(() => {
    fetchFlags();
  }, [statusFilter, severityFilter]);

  useEffect(() => {
    if (selectedFlag) {
      fetchConversationContext(selectedFlag.conversation_id);
      setReviewerNotes(selectedFlag.reviewer_notes || "");
      setImprovementInstructions(selectedFlag.improvement_instructions || "");
    }
  }, [selectedFlag]);

  async function fetchFlags() {
    setLoading(true);
    try {
      const supabase = createClient();

      let query = supabase
        .from("ai_agent_conversation_flags")
        .select(
          `
          *,
          agent:ai_agents(id, name)
        `
        )
        .order("severity", { ascending: false })
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("review_status", statusFilter);
      }

      if (severityFilter !== "all") {
        query = query.eq("severity", severityFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      setFlags(data || []);
    } catch (error: any) {
      console.error("Error fetching flags:", error);
      toast.error("Failed to load flagged conversations");
    } finally {
      setLoading(false);
    }
  }

  async function fetchConversationContext(conversationId: string) {
    try {
      const supabase = createClient();

      const { data, error } = await supabase
        .from("ai_agent_messages")
        .select("role, content, created_at, tool_calls, tool_results")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true })
        .limit(20);

      if (error) throw error;

      setConversationContext(data || []);
    } catch (error: any) {
      console.error("Error fetching conversation context:", error);
      toast.error("Failed to load conversation history");
    }
  }

  async function handleSubmitReview(newStatus: string) {
    if (!selectedFlag) return;

    setSubmitting(true);
    try {
      const response = await fetch("/api/saas-admin/agent-training/review-flag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          flagId: selectedFlag.id,
          reviewStatus: newStatus,
          reviewerNotes,
          improvementInstructions:
            newStatus === "resolved" ? improvementInstructions : null,
          updateSOP: updateSOPChecked && newStatus === "resolved",
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to submit review");
      }

      toast.success(
        result.sopUpdated
          ? "Review saved and SOP updated successfully!"
          : "Review saved successfully"
      );

      // Refresh flags and clear selection
      fetchFlags();
      setSelectedFlag(null);
      setReviewerNotes("");
      setImprovementInstructions("");
    } catch (error: any) {
      console.error("Error submitting review:", error);
      toast.error(error.message || "Failed to submit review");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Flagged Conversations Review
          </h1>
          <p className="text-gray-600">
            Review conversations flagged for negative sentiment and provide training feedback
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending Review</option>
                <option value="reviewing">In Review</option>
                <option value="resolved">Resolved</option>
                <option value="false_positive">False Positive</option>
                <option value="escalated">Escalated</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Severity
              </label>
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="all">All Severities</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Flag List */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                Flagged Conversations ({flags.length})
              </h2>
            </div>
            <div className="divide-y divide-gray-200 max-h-[800px] overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center text-gray-500">Loading...</div>
              ) : flags.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  No flagged conversations found
                </div>
              ) : (
                flags.map((flag) => (
                  <div
                    key={flag.id}
                    onClick={() => setSelectedFlag(flag)}
                    className={`p-4 cursor-pointer hover:bg-gray-50 transition ${
                      selectedFlag?.id === flag.id ? "bg-orange-50 border-l-4 border-orange-500" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded ${
                            flag.severity === "critical"
                              ? "bg-red-100 text-red-800"
                              : flag.severity === "high"
                                ? "bg-orange-100 text-orange-800"
                                : flag.severity === "medium"
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {flag.severity}
                        </span>
                        <span className="text-xs text-gray-500 capitalize">
                          {flag.flag_type.replace(/_/g, " ")}
                        </span>
                      </div>
                      <span
                        className={`text-xs ${
                          flag.review_status === "pending"
                            ? "text-yellow-600"
                            : flag.review_status === "resolved"
                              ? "text-green-600"
                              : "text-gray-600"
                        }`}
                      >
                        {flag.review_status}
                      </span>
                    </div>
                    <div className="text-sm text-gray-700 font-medium mb-1">
                      {flag.agent?.name || "Unknown Agent"}
                    </div>
                    <div className="text-sm text-gray-600 line-clamp-2 mb-2">
                      {flag.trigger_message}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Calendar className="w-3 h-3" />
                      {new Date(flag.created_at).toLocaleString("en-GB")}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right: Review Panel */}
          <div className="bg-white rounded-lg shadow">
            {selectedFlag ? (
              <div className="p-6">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-1">
                      Review Conversation
                    </h2>
                    <p className="text-sm text-gray-500">
                      Agent: {selectedFlag.agent?.name || "Unknown"}
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 text-sm font-semibold rounded ${
                      selectedFlag.severity === "critical"
                        ? "bg-red-100 text-red-800"
                        : selectedFlag.severity === "high"
                          ? "bg-orange-100 text-orange-800"
                          : selectedFlag.severity === "medium"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {selectedFlag.severity} severity
                  </span>
                </div>

                {/* Detection Info */}
                {selectedFlag.detection_metadata?.matched_keywords && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center gap-2 text-red-800 font-semibold mb-2">
                      <AlertTriangle className="w-4 h-4" />
                      Keywords Detected
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selectedFlag.detection_metadata.matched_keywords.map((kw: string) => (
                        <span
                          key={kw}
                          className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded"
                        >
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Flagged Messages */}
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Flagged Exchange</h3>
                  <div className="space-y-3">
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="text-xs text-blue-600 font-semibold mb-1">User Message:</div>
                      <div className="text-sm text-gray-900">{selectedFlag.trigger_message}</div>
                    </div>
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="text-xs text-green-600 font-semibold mb-1">Agent Response:</div>
                      <div className="text-sm text-gray-900">{selectedFlag.agent_response}</div>
                    </div>
                  </div>
                </div>

                {/* Conversation Context */}
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Full Conversation ({conversationContext.length} messages)
                  </h3>
                  <div className="max-h-60 overflow-y-auto space-y-2 border border-gray-200 rounded-lg p-3">
                    {conversationContext.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`text-sm p-2 rounded ${
                          msg.role === "user"
                            ? "bg-blue-50 text-blue-900"
                            : "bg-green-50 text-green-900"
                        }`}
                      >
                        <div className="text-xs font-semibold capitalize mb-1">{msg.role}:</div>
                        <div>{msg.content}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Review Form */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Reviewer Notes
                    </label>
                    <textarea
                      value={reviewerNotes}
                      onChange={(e) => setReviewerNotes(e.target.value)}
                      rows={3}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="Your analysis of what happened..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Improvement Instructions (for SOP)
                    </label>
                    <textarea
                      value={improvementInstructions}
                      onChange={(e) => setImprovementInstructions(e.target.value)}
                      rows={4}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="How should the agent handle this differently? This will update the system prompt if checked below."
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="updateSOP"
                      checked={updateSOPChecked}
                      onChange={(e) => setUpdateSOPChecked(e.target.checked)}
                      className="w-4 h-4 text-orange-500 border-gray-300 rounded focus:ring-orange-500"
                    />
                    <label htmlFor="updateSOP" className="text-sm text-gray-700">
                      Update agent SOP with improvement instructions
                    </label>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4 border-t border-gray-200">
                    <button
                      onClick={() => handleSubmitReview("resolved")}
                      disabled={!improvementInstructions || submitting}
                      className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Resolve & Train
                    </button>
                    <button
                      onClick={() => handleSubmitReview("false_positive")}
                      disabled={submitting}
                      className="flex-1 flex items-center justify-center gap-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 disabled:bg-gray-300"
                    >
                      <XCircle className="w-4 h-4" />
                      False Positive
                    </button>
                    <button
                      onClick={() => handleSubmitReview("escalated")}
                      disabled={submitting}
                      className="flex-1 flex items-center justify-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:bg-gray-300"
                    >
                      <Clock className="w-4 h-4" />
                      Escalate
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-12 text-center text-gray-500">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p>Select a flagged conversation to review</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
