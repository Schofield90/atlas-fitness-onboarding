"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/app/lib/supabase/client";
import {
  MessageSquare,
  Mail,
  Phone,
  Send,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  Smartphone,
  Globe,
  User,
  Calendar,
  Filter,
  Search,
} from "lucide-react";
import { formatBritishDateTime } from "@/app/lib/utils/british-format";

interface ComprehensiveMessagingTabProps {
  customerId: string;
  organizationId: string;
  customer?: any;
}

interface Message {
  id: string;
  channel: "sms" | "email" | "whatsapp" | "in_app";
  direction: "inbound" | "outbound";
  subject?: string;
  content: string;
  status: "pending" | "sent" | "delivered" | "failed" | "read";
  created_at: string;
  sent_at?: string;
  delivered_at?: string;
  read_at?: string;
  metadata?: any;
  sender_name?: string;
  sender_id?: string;
}

const channelIcons = {
  sms: <Phone className="h-4 w-4" />,
  email: <Mail className="h-4 w-4" />,
  whatsapp: <MessageSquare className="h-4 w-4" />,
  in_app: <Smartphone className="h-4 w-4" />,
};

const channelColors = {
  sms: "bg-green-600",
  email: "bg-blue-600",
  whatsapp: "bg-green-500",
  in_app: "bg-purple-600",
};

const statusIcons = {
  pending: <Clock className="h-3 w-3" />,
  sent: <Send className="h-3 w-3" />,
  delivered: <CheckCircle className="h-3 w-3" />,
  failed: <XCircle className="h-3 w-3" />,
  read: <CheckCircle className="h-3 w-3" />,
};

const statusColors = {
  pending: "text-yellow-500",
  sent: "text-blue-500",
  delivered: "text-green-500",
  failed: "text-red-500",
  read: "text-green-600",
};

export default function ComprehensiveMessagingTab({
  customerId,
  organizationId,
  customer,
}: ComprehensiveMessagingTabProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeChannel, setActiveChannel] = useState<
    "all" | "sms" | "email" | "whatsapp" | "in_app"
  >("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [showComposer, setShowComposer] = useState(false);
  const [newMessage, setNewMessage] = useState({
    channel: "sms" as "sms" | "email" | "whatsapp" | "in_app",
    subject: "",
    content: "",
  });
  const [sending, setSending] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    fetchMessages();
    // Set up real-time subscription
    const subscription = supabase
      .channel(`messages-${customerId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `customer_id=eq.${customerId}`,
        },
        (payload) => {
          fetchMessages();
        },
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [customerId]);

  const fetchMessages = async () => {
    try {
      setLoading(true);

      // Fetch messages from the messages table
      const { data, error } = await supabase
        .from("messages")
        .select(
          `
          *,
          users:sender_id (
            id,
            email,
            user_metadata
          )
        `,
        )
        .or(`customer_id.eq.${customerId},client_id.eq.${customerId}`)
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching messages:", error);
        return;
      }

      // Transform the data to match our Message interface
      const transformedMessages = (data || []).map((msg) => ({
        id: msg.id,
        channel: msg.channel || "email",
        direction: msg.direction || "outbound",
        subject: msg.subject,
        content: msg.content || msg.body || "",
        status: msg.status || "sent",
        created_at: msg.created_at,
        sent_at: msg.sent_at,
        delivered_at: msg.delivered_at,
        read_at: msg.read_at,
        metadata: msg.metadata,
        sender_name: msg.users?.user_metadata?.first_name
          ? `${msg.users.user_metadata.first_name} ${msg.users.user_metadata.last_name || ""}`
          : msg.sender_name || "System",
        sender_id: msg.sender_id,
      }));

      setMessages(transformedMessages);
    } catch (error) {
      console.error("Error fetching messages:", error);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.content.trim()) {
      alert("Please enter a message");
      return;
    }

    setSending(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const messageData = {
        organization_id: organizationId,
        customer_id: customerId,
        client_id: customerId,
        channel: newMessage.channel,
        direction: "outbound" as const,
        subject: newMessage.subject || undefined,
        content: newMessage.content,
        body: newMessage.content,
        status: "pending" as const,
        sender_id: user?.id,
        sender_name: user?.email,
        created_at: new Date().toISOString(),
      };

      // Insert message into database
      const { error: insertError } = await supabase
        .from("messages")
        .insert(messageData);

      if (insertError) throw insertError;

      // Send actual message based on channel
      const endpoint = `/api/messages/send`;
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...messageData,
          recipient: customer?.email || customer?.phone,
        }),
      });

      if (!response.ok) {
        console.error("Failed to send message via API");
      }

      // Reset form and refresh messages
      setNewMessage({ channel: "sms", subject: "", content: "" });
      setShowComposer(false);
      await fetchMessages();
    } catch (error) {
      console.error("Error sending message:", error);
      alert("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const filteredMessages = messages.filter((msg) => {
    const matchesChannel =
      activeChannel === "all" || msg.channel === activeChannel;
    const matchesSearch =
      searchTerm === "" ||
      msg.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      msg.subject?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesChannel && matchesSearch;
  });

  const messageStats = {
    total: messages.length,
    sms: messages.filter((m) => m.channel === "sms").length,
    email: messages.filter((m) => m.channel === "email").length,
    whatsapp: messages.filter((m) => m.channel === "whatsapp").length,
    in_app: messages.filter((m) => m.channel === "in_app").length,
  };

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-white">Message History</h3>
          <button
            onClick={() => setShowComposer(!showComposer)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Send className="h-4 w-4" />
            New Message
          </button>
        </div>

        {/* Channel Stats */}
        <div className="grid grid-cols-5 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-white">
              {messageStats.total}
            </div>
            <div className="text-xs text-gray-400">Total Messages</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-500">
              {messageStats.sms}
            </div>
            <div className="text-xs text-gray-400">SMS</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-500">
              {messageStats.email}
            </div>
            <div className="text-xs text-gray-400">Email</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400">
              {messageStats.whatsapp}
            </div>
            <div className="text-xs text-gray-400">WhatsApp</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-500">
              {messageStats.in_app}
            </div>
            <div className="text-xs text-gray-400">In-App</div>
          </div>
        </div>
      </div>

      {/* Message Composer */}
      {showComposer && (
        <div className="bg-gray-800 rounded-lg p-6">
          <h4 className="text-white font-medium mb-4">Compose Message</h4>

          {/* Channel Selection */}
          <div className="grid grid-cols-4 gap-2 mb-4">
            {(["sms", "email", "whatsapp", "in_app"] as const).map(
              (channel) => (
                <button
                  key={channel}
                  onClick={() => setNewMessage({ ...newMessage, channel })}
                  className={`p-3 rounded-lg flex items-center justify-center gap-2 transition-colors ${
                    newMessage.channel === channel
                      ? `${channelColors[channel]} text-white`
                      : "bg-gray-700 text-gray-400 hover:bg-gray-600"
                  }`}
                >
                  {channelIcons[channel]}
                  <span className="capitalize">
                    {channel === "in_app" ? "In-App" : channel}
                  </span>
                </button>
              ),
            )}
          </div>

          {/* Subject (for email) */}
          {newMessage.channel === "email" && (
            <input
              type="text"
              placeholder="Subject"
              value={newMessage.subject}
              onChange={(e) =>
                setNewMessage({ ...newMessage, subject: e.target.value })
              }
              className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg mb-4"
            />
          )}

          {/* Message Content */}
          <textarea
            placeholder={`Enter your ${newMessage.channel} message...`}
            value={newMessage.content}
            onChange={(e) =>
              setNewMessage({ ...newMessage, content: e.target.value })
            }
            className="w-full px-4 py-3 bg-gray-700 text-white rounded-lg h-32 resize-none mb-4"
          />

          {/* Send Button */}
          <div className="flex justify-end gap-2">
            <button
              onClick={() => {
                setShowComposer(false);
                setNewMessage({ channel: "sms", subject: "", content: "" });
              }}
              className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
            >
              Cancel
            </button>
            <button
              onClick={sendMessage}
              disabled={sending || !newMessage.content.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              <Send className="h-4 w-4" />
              {sending ? "Sending..." : "Send"}
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-4">
        {/* Channel Filter */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-400" />
          <select
            value={activeChannel}
            onChange={(e) => setActiveChannel(e.target.value as any)}
            className="bg-gray-700 text-white rounded-lg px-3 py-2"
          >
            <option value="all">All Channels</option>
            <option value="sms">SMS</option>
            <option value="email">Email</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="in_app">In-App</option>
          </select>
        </div>

        {/* Search */}
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search messages..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-700 text-white rounded-lg"
            />
          </div>
        </div>
      </div>

      {/* Messages List */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-8 text-gray-400">
            Loading messages...
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            No messages found
          </div>
        ) : (
          filteredMessages.map((message) => (
            <div
              key={message.id}
              className={`bg-gray-800 rounded-lg p-4 ${
                message.direction === "inbound"
                  ? "border-l-4 border-blue-500"
                  : ""
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  {/* Channel Icon */}
                  <div
                    className={`p-2 rounded-lg ${channelColors[message.channel]}`}
                  >
                    {channelIcons[message.channel]}
                  </div>

                  {/* Message Content */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-white font-medium">
                        {message.direction === "inbound"
                          ? customer?.name || "Customer"
                          : message.sender_name}
                      </span>
                      <span className="text-xs text-gray-400">
                        via{" "}
                        {message.channel === "in_app"
                          ? "In-App"
                          : message.channel.toUpperCase()}
                      </span>
                      <span
                        className={`flex items-center gap-1 text-xs ${statusColors[message.status]}`}
                      >
                        {statusIcons[message.status]}
                        {message.status}
                      </span>
                    </div>

                    {message.subject && (
                      <div className="text-sm text-gray-300 font-medium mb-1">
                        {message.subject}
                      </div>
                    )}

                    <div className="text-gray-400 whitespace-pre-wrap">
                      {message.content}
                    </div>

                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      <span>{formatBritishDateTime(message.created_at)}</span>
                      {message.delivered_at && (
                        <span>
                          Delivered:{" "}
                          {formatBritishDateTime(message.delivered_at)}
                        </span>
                      )}
                      {message.read_at && (
                        <span>
                          Read: {formatBritishDateTime(message.read_at)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
