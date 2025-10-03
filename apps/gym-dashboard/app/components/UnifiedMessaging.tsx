"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/app/lib/supabase/client";
import {
  MessageCircle,
  Send,
  Loader2,
  User,
  Bell,
  Check,
  CheckCheck,
  Bot,
  Clock,
  Search,
  Mail,
  Phone,
  MessageSquare,
  ChevronDown,
  X,
  Plus,
  Star,
  MailOpen,
  MailX,
} from "lucide-react";
import toast from "@/app/lib/toast";
import { formatBritishDateTime } from "@/app/lib/utils/british-format";

interface Message {
  id: string;
  content: string;
  sender_type: "member" | "coach" | "ai" | "gym";
  sender_id: string;
  sender_name?: string;
  created_at: string;
  read: boolean;
  type?: "sms" | "whatsapp" | "email";
  direction?: "inbound" | "outbound";
  status?: "pending" | "sent" | "delivered" | "failed" | "read";
}

interface Conversation {
  id: string;
  contact_id: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  last_message: string;
  last_message_time: string;
  unread_count: number;
  sender_type: "member" | "coach" | "ai" | "gym";
  type: "coaching" | "general";
  membership_status?: string;
  is_starred?: boolean;
  needs_reply?: boolean; // True if last message was from member/ai
  is_manually_read?: boolean; // True if user manually marked as read
}

export default function UnifiedMessaging({
  userData,
  initialContactId,
}: {
  userData: any;
  initialContactId?: string;
}) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [messageType, setMessageType] = useState<
    "sms" | "whatsapp" | "email" | "in_app"
  >("in_app");
  const [showReplyArea, setShowReplyArea] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [activeTab, setActiveTab] = useState<"unread" | "recent" | "starred">(
    "recent",
  );
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => {
    // Only load conversations if userData is available
    if (!userData?.id || !userData?.organization_id) {
      console.log("[UnifiedMessaging] Waiting for userData:", {
        hasUserData: !!userData,
        hasId: !!userData?.id,
        hasOrgId: !!userData?.organization_id,
      });
      return;
    }

    console.log("[UnifiedMessaging] userData available, loading conversations");
    loadConversations();

    // Setup realtime with error handling
    let cleanup: (() => void) | undefined;
    try {
      cleanup = setupRealtimeSubscriptions();
    } catch (error) {
      console.error("Failed to setup realtime subscriptions:", error);
    }

    return () => {
      if (cleanup) {
        cleanup();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userData?.id, userData?.organization_id]);

  useEffect(() => {
    if (initialContactId && conversations.length > 0) {
      const conversation = conversations.find(
        (c) =>
          c.contact_id === initialContactId ||
          c.contact_id === initialContactId.replace("lead-", ""),
      );
      if (conversation) {
        setSelectedConversation(conversation);
      }
    }
  }, [initialContactId, conversations]);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.contact_id);
      markMessagesAsRead(selectedConversation.contact_id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const setupRealtimeSubscriptions = () => {
    // Subscribe to coaching messages with error handling
    const coachingSubscription = supabase
      .channel("unified-coach-messages")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "member_coach_messages",
          filter: `coach_id=eq.${userData.id}`,
        },
        (payload) => {
          handleNewMessage(payload.new as any);
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log("Coaching messages subscription active");
        } else if (status === "CHANNEL_ERROR") {
          console.error("Error subscribing to coaching messages");
        }
      });

    // Subscribe to general messages with error handling
    const generalSubscription = supabase
      .channel("unified-general-messages")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `organization_id=eq.${userData.organization_id}`,
        },
        (payload) => {
          handleNewMessage(payload.new as any);
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log("General messages subscription active");
        } else if (status === "CHANNEL_ERROR") {
          console.error("Error subscribing to general messages");
        }
      });

    return () => {
      // Safe unsubscribe with error handling
      try {
        if (coachingSubscription) {
          supabase.removeChannel(coachingSubscription);
        }
        if (generalSubscription) {
          supabase.removeChannel(generalSubscription);
        }
      } catch (error) {
        console.error("Error unsubscribing from channels:", error);
      }
    };
  };

  const handleNewMessage = (newMessage: any) => {
    // Update conversations list
    loadConversations();

    // If this message is for the current conversation, add it to messages
    if (
      selectedConversation &&
      (newMessage.member_id === selectedConversation.contact_id ||
        newMessage.lead_id === selectedConversation.contact_id)
    ) {
      setMessages((prev) => [...prev, formatMessage(newMessage)]);
    }
  };

  const formatMessage = (msg: any): Message => {
    return {
      id: msg.id,
      content: msg.content || msg.body || msg.message || "",
      sender_type:
        msg.sender_type || (msg.direction === "inbound" ? "member" : "gym"),
      sender_id: msg.sender_id || msg.user_id || "",
      sender_name: msg.sender_name || "",
      created_at: msg.created_at,
      read: msg.read || msg.status === "read" || false,
      type: msg.type,
      direction: msg.direction,
      status: msg.status,
    };
  };

  const loadConversations = async () => {
    try {
      console.log(
        "[UnifiedMessaging] Loading conversations for user:",
        userData.id,
        "org:",
        userData.organization_id,
      );

      // Get all conversations (clients and leads) using new unified function
      const { data: allConversations, error: convError } = await supabase.rpc(
        "get_all_conversations",
        {
          p_user_id: userData.id,
          p_organization_id: userData.organization_id,
        },
      );

      if (convError) {
        console.error(
          "[UnifiedMessaging] Error loading conversations:",
          convError,
        );
        // Fallback to old method if new function doesn't exist
        return loadConversationsOldMethod();
      }

      console.log(
        "[UnifiedMessaging] Loaded conversations:",
        allConversations?.length || 0,
      );

      // Load starred conversations and manually read status from localStorage
      const starredKey = `starred_conversations_${userData.organization_id}`;
      const starredConversations = JSON.parse(
        localStorage.getItem(starredKey) || "[]",
      );
      const manuallyReadKey = `manually_read_conversations_${userData.organization_id}`;
      const manuallyReadConversations = JSON.parse(
        localStorage.getItem(manuallyReadKey) || "[]",
      );

      // Format conversations for display
      const formattedConversations = (allConversations || []).map(
        (conv: any) => {
          const convId =
            conv.conv_id || `${conv.contact_type}-${conv.contact_id}`;
          const senderType = conv.sender_type || "client";
          const needsReply =
            senderType === "member" ||
            senderType === "ai" ||
            senderType === "client";
          const isManuallyRead = manuallyReadConversations.includes(convId);

          return {
            id: convId,
            contact_id: conv.contact_id,
            contact_name: conv.contact_name || "Unknown",
            contact_email: conv.contact_email || "",
            contact_phone: conv.contact_phone || "",
            last_message: conv.last_message || "",
            last_message_time: conv.last_message_time,
            unread_count: conv.unread_count || 0,
            sender_type: senderType,
            type: conv.contact_type === "client" ? "general" : "coaching",
            membership_status:
              conv.contact_type === "client" ? "Client" : "Lead",
            is_starred: starredConversations.includes(convId),
            needs_reply: needsReply && !isManuallyRead,
            is_manually_read: isManuallyRead,
          };
        },
      );

      setConversations(formattedConversations);
    } catch (error) {
      console.error("Error loading conversations:", error);
      // Fallback to old method
      loadConversationsOldMethod();
    }
  };

  const loadConversationsOldMethod = async () => {
    try {
      console.log("[UnifiedMessaging] Using old method fallback");

      // Load starred conversations and manually read status from localStorage
      const starredKey = `starred_conversations_${userData.organization_id}`;
      const starredConversations = JSON.parse(
        localStorage.getItem(starredKey) || "[]",
      );
      const manuallyReadKey = `manually_read_conversations_${userData.organization_id}`;
      const manuallyReadConversations = JSON.parse(
        localStorage.getItem(manuallyReadKey) || "[]",
      );

      // Get all coaching conversations
      const { data: coachingData, error: coachError } = await supabase.rpc(
        "get_coach_conversations",
        {
          coach_user_id: userData.id,
        },
      );

      if (coachError) {
        console.error(
          "[UnifiedMessaging] Error loading coaching conversations:",
          coachError,
        );
      }
      console.log(
        "[UnifiedMessaging] Loaded coaching conversations:",
        coachingData?.length || 0,
      );

      const coachingConversations = (coachingData || []).map((conv: any) => {
        const convId = `coach-${conv.member_id}`;
        const senderType = conv.sender_type;
        const needsReply =
          senderType === "member" ||
          senderType === "ai" ||
          senderType === "client";
        const isManuallyRead = manuallyReadConversations.includes(convId);

        return {
          id: convId,
          contact_id: conv.member_id,
          contact_name: conv.member_name,
          contact_email: conv.member_email,
          contact_phone: conv.member_phone || "",
          last_message: conv.last_message,
          last_message_time: conv.last_message_time,
          unread_count: conv.unread_count,
          sender_type: senderType,
          type: "coaching" as const,
          membership_status: "Member",
          is_starred: starredConversations.includes(convId),
          needs_reply: needsReply && !isManuallyRead,
          is_manually_read: isManuallyRead,
        };
      });

      // Get all general conversations from leads
      const { data: leads } = await supabase
        .from("leads")
        .select("*")
        .eq("organization_id", userData.organization_id)
        .order("updated_at", { ascending: false })
        .limit(50);

      // Get recent messages for leads
      const { data: recentMessages } = await supabase
        .from("messages")
        .select("*")
        .eq("organization_id", userData.organization_id)
        .order("created_at", { ascending: false })
        .limit(200);

      const generalConversations = (leads || [])
        .map((lead: any) => {
          const leadMessages = (recentMessages || []).filter(
            (m) => m.lead_id === lead.id,
          );
          const lastMessage = leadMessages[0];
          const unreadCount = leadMessages.filter(
            (m) => m.direction === "inbound" && m.status !== "read",
          ).length;

          const convId = `general-${lead.id}`;
          const senderType =
            lastMessage?.direction === "inbound" ? "member" : "gym";
          const needsReply = senderType === "member" || senderType === "ai";
          const isManuallyRead = manuallyReadConversations.includes(convId);

          return {
            id: convId,
            contact_id: lead.id,
            contact_name:
              `${lead.first_name || ""} ${lead.last_name || ""}`.trim() ||
              lead.name ||
              "Unknown",
            contact_email: lead.email || "",
            contact_phone: lead.phone || "",
            last_message: lastMessage?.body || "No messages yet",
            last_message_time: lastMessage?.created_at || lead.created_at,
            unread_count: unreadCount,
            sender_type: senderType,
            type: "general" as const,
            membership_status: lead.status === "converted" ? "Member" : "Lead",
            is_starred: starredConversations.includes(convId),
            needs_reply: needsReply && !isManuallyRead,
            is_manually_read: isManuallyRead,
          };
        })
        .filter((conv: any) => conv.last_message !== "No messages yet");

      // Combine and sort all conversations
      const allConversations = [
        ...coachingConversations,
        ...generalConversations,
      ].sort(
        (a, b) =>
          new Date(b.last_message_time).getTime() -
          new Date(a.last_message_time).getTime(),
      );

      setConversations(allConversations);
    } catch (error) {
      console.error("Error loading conversations:", error);
    }
  };

  const loadMessages = async (contactId: string) => {
    try {
      const formattedMessages: Message[] = [];

      // Load coaching messages
      const { data: coachingMessages } = await supabase
        .from("member_coach_messages")
        .select("*")
        .or(
          `member_id.eq.${contactId},member_id.eq.${contactId.replace("lead-", "")}`,
        )
        .eq("coach_id", userData.id)
        .order("created_at", { ascending: true });

      if (coachingMessages) {
        formattedMessages.push(...coachingMessages.map(formatMessage));
      }

      // Load messages by client_id for client conversations
      if (selectedConversation?.contact_id) {
        const { data: clientMessages } = await supabase
          .from("messages")
          .select("*")
          .eq("client_id", selectedConversation.contact_id)
          .eq("organization_id", userData.organization_id)
          .order("created_at", { ascending: true });

        if (clientMessages) {
          formattedMessages.push(...clientMessages.map(formatMessage));
        }
      }

      // Also try loading by lead_id if contact_id doesn't match
      const { data: leadMessages } = await supabase
        .from("messages")
        .select("*")
        .eq("lead_id", contactId.replace("lead-", "").replace("client-", ""))
        .eq("organization_id", userData.organization_id)
        .order("created_at", { ascending: true });

      if (leadMessages) {
        formattedMessages.push(...leadMessages.map(formatMessage));
      }

      // Sort all messages by time
      formattedMessages.sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      );

      setMessages(formattedMessages);
    } catch (error) {
      console.error("Error loading messages:", error);
    }
  };

  const markMessagesAsRead = async (contactId: string) => {
    try {
      // Mark coaching messages as read
      await supabase
        .from("member_coach_messages")
        .update({ read: true })
        .eq("member_id", contactId)
        .eq("coach_id", userData.id)
        .eq("sender_type", "member")
        .eq("read", false);

      // Mark general messages as read
      await supabase
        .from("messages")
        .update({ status: "read", read_at: new Date().toISOString() })
        .eq("lead_id", contactId.replace("lead-", ""))
        .eq("organization_id", userData.organization_id)
        .eq("direction", "inbound")
        .eq("status", "pending");

      // Update conversations list
      setConversations((prev) =>
        prev.map((conv) =>
          conv.contact_id === contactId ? { ...conv, unread_count: 0 } : conv,
        ),
      );
    } catch (error) {
      console.error("Error marking messages as read:", error);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || !selectedConversation || isLoading) return;

    const messageContent = inputMessage.trim();
    const isCoachingConversation = selectedConversation.type === "coaching";

    setInputMessage("");
    setIsLoading(true);
    setShowReplyArea(false);
    setReplyingTo(null);

    // Add optimistic message
    const optimisticMessage: Message = {
      id: `temp-${Date.now()}`,
      content: messageContent,
      sender_type: isCoachingConversation ? "coach" : "gym",
      sender_id: userData.id,
      sender_name: userData.full_name || "Coach",
      created_at: new Date().toISOString(),
      read: false,
      type: messageType,
      direction: "outbound",
      // Only add status for general messages, not coaching messages
      ...(isCoachingConversation ? {} : { status: "pending" }),
    };

    setMessages((prev) => [...prev, optimisticMessage]);

    try {
      if (isCoachingConversation) {
        // Send as coaching message
        const { data, error } = await supabase
          .from("member_coach_messages")
          .insert({
            member_id: selectedConversation.contact_id,
            coach_id: userData.id,
            organization_id: userData.organization_id,
            content: messageContent,
            sender_type: "coach",
            sender_id: userData.id,
            sender_name: userData.full_name || "Coach",
            read: false,
          })
          .select()
          .single();

        if (error) throw error;

        // Update optimistic message with real data
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === optimisticMessage.id ? formatMessage(data) : msg,
          ),
        );

        // Create notification for member
        await supabase.from("notifications").insert({
          user_id: selectedConversation.contact_id,
          type: "coach_message",
          title: "Message from your coach",
          message: `${userData.full_name} sent you a message`,
          data: {
            coach_id: userData.id,
            message: messageContent,
          },
        });
      } else if (messageType === "in_app") {
        // Send in-app message directly to database
        const { data, error } = await supabase
          .from("messages")
          .insert({
            conversation_id: selectedConversation.id,
            organization_id: userData.organization_id,
            client_id: selectedConversation.contact_id,
            sender_id: userData.id, // Changed from user_id to sender_id
            sender_type: "coach", // Changed from "gym" to "coach" to match RLS policy
            sender_name: userData.full_name || userData.email || "Gym",
            channel: "in_app",
            type: "in_app",
            direction: "outbound",
            body: messageContent,
            content: messageContent,
            status: "delivered",
            created_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (error) throw error;

        // Update optimistic message with real data
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === optimisticMessage.id
              ? { ...formatMessage(data), status: "delivered" }
              : msg,
          ),
        );
      } else {
        // Send as SMS/Email/WhatsApp message
        const payload = {
          leadId: selectedConversation.contact_id,
          client_id: selectedConversation.contact_id,
          type: messageType,
          channel: messageType,
          to:
            messageType === "email"
              ? selectedConversation.contact_email
              : selectedConversation.contact_phone,
          subject:
            messageType === "email" ? "Message from Atlas Fitness" : undefined,
          body: messageContent,
        };

        const response = await fetch("/api/messages/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) throw new Error("Failed to send message");

        const result = await response.json();

        // Update optimistic message with real data from server
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === optimisticMessage.id
              ? {
                  ...msg,
                  id: result.message?.id || msg.id,
                  status: result.message?.status || "sent",
                  sent_at: result.message?.sent_at,
                }
              : msg,
          ),
        );

        // No need for duplicate API calls - /api/messages/send already handles Twilio/Resend
      }

      toast.success("Message sent!");

      // Remove conversation from manually read list when we reply
      if (selectedConversation) {
        const manuallyReadKey = `manually_read_conversations_${userData.organization_id}`;
        const manuallyReadConversations = JSON.parse(
          localStorage.getItem(manuallyReadKey) || "[]",
        );
        const index = manuallyReadConversations.indexOf(
          selectedConversation.id,
        );
        if (index > -1) {
          manuallyReadConversations.splice(index, 1);
          localStorage.setItem(
            manuallyReadKey,
            JSON.stringify(manuallyReadConversations),
          );
        }
      }

      loadConversations(); // Refresh conversations
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");

      // Remove optimistic message on error
      setMessages((prev) =>
        prev.filter((msg) => msg.id !== optimisticMessage.id),
      );
      setInputMessage(messageContent); // Restore message
    } finally {
      setIsLoading(false);
    }
  };

  const handleReply = (message: Message) => {
    setReplyingTo(message);
    setShowReplyArea(true);

    // Auto-detect message type based on the message being replied to
    if (message.type) {
      setMessageType(message.type);
    }
  };

  const toggleStar = async (
    conversationId: string,
    event: React.MouseEvent,
  ) => {
    event.stopPropagation(); // Prevent selecting the conversation

    const conversation = conversations.find((c) => c.id === conversationId);
    if (!conversation) return;

    const newStarredState = !conversation.is_starred;

    // Optimistically update UI
    setConversations((prev) =>
      prev.map((conv) =>
        conv.id === conversationId
          ? { ...conv, is_starred: newStarredState }
          : conv,
      ),
    );

    try {
      // Store starred state in localStorage for now (will move to DB later)
      const starredKey = `starred_conversations_${userData.organization_id}`;
      const starredConversations = JSON.parse(
        localStorage.getItem(starredKey) || "[]",
      );

      if (newStarredState) {
        starredConversations.push(conversationId);
      } else {
        const index = starredConversations.indexOf(conversationId);
        if (index > -1) starredConversations.splice(index, 1);
      }

      localStorage.setItem(starredKey, JSON.stringify(starredConversations));
      toast.success(
        newStarredState ? "Conversation starred" : "Conversation unstarred",
      );
    } catch (error) {
      console.error("Error toggling star:", error);
      // Revert on error
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === conversationId
            ? { ...conv, is_starred: !newStarredState }
            : conv,
        ),
      );
      toast.error("Failed to update star");
    }
  };

  const toggleReadStatus = async (
    conversationId: string,
    event: React.MouseEvent,
  ) => {
    event.stopPropagation(); // Prevent selecting the conversation

    const conversation = conversations.find((c) => c.id === conversationId);
    if (!conversation) return;

    const newReadState = !conversation.is_manually_read;

    // Optimistically update UI
    setConversations((prev) =>
      prev.map((conv) =>
        conv.id === conversationId
          ? {
              ...conv,
              is_manually_read: newReadState,
              // If marking as read, remove from needs_reply
              // If marking as unread, always set needs_reply to true
              needs_reply: newReadState ? false : true,
            }
          : conv,
      ),
    );

    try {
      const manuallyReadKey = `manually_read_conversations_${userData.organization_id}`;
      const manuallyReadConversations = JSON.parse(
        localStorage.getItem(manuallyReadKey) || "[]",
      );

      if (newReadState) {
        // Mark as read
        if (!manuallyReadConversations.includes(conversationId)) {
          manuallyReadConversations.push(conversationId);
        }
      } else {
        // Mark as unread
        const index = manuallyReadConversations.indexOf(conversationId);
        if (index > -1) manuallyReadConversations.splice(index, 1);
      }

      localStorage.setItem(
        manuallyReadKey,
        JSON.stringify(manuallyReadConversations),
      );
      toast.success(newReadState ? "Marked as read" : "Marked as unread");
    } catch (error) {
      console.error("Error toggling read status:", error);
      // Revert on error
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === conversationId
            ? {
                ...conv,
                is_manually_read: !newReadState,
                needs_reply: !newReadState ? false : true,
              }
            : conv,
        ),
      );
      toast.error("Failed to update read status");
    }
  };

  const filteredConversations = conversations.filter((conv) => {
    // Apply tab filter - show in unread if it needs a reply (last message from member/ai)
    if (activeTab === "unread" && !conv.needs_reply) return false;
    if (activeTab === "starred" && !conv.is_starred) return false;
    // "recent" tab shows all

    // Apply search filter
    return (
      conv.contact_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.contact_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.contact_phone.includes(searchQuery.toLowerCase())
    );
  });

  const getMessageTypeIcon = (type?: string) => {
    switch (type) {
      case "email":
        return <Mail className="h-3 w-3" />;
      case "whatsapp":
        return <MessageSquare className="h-3 w-3 text-green-500" />;
      case "sms":
        return <MessageCircle className="h-3 w-3 text-blue-500" />;
      default:
        return <MessageCircle className="h-3 w-3" />;
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "pending":
        return "text-yellow-500";
      case "sent":
        return "text-blue-500";
      case "delivered":
        return "text-green-500";
      case "read":
        return "text-green-600";
      case "failed":
        return "text-red-500";
      default:
        return "text-gray-400";
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 h-[700px] flex">
      {/* Conversations List */}
      <div className="w-1/3 border-r border-gray-700 flex flex-col bg-gray-800">
        <div className="p-4 border-b border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-blue-400" />
            All Messages
          </h3>

          {/* Tabs */}
          <div className="flex gap-1 mb-3 bg-gray-900 rounded-lg p-1">
            <button
              onClick={() => setActiveTab("unread")}
              className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === "unread"
                  ? "bg-blue-600 text-white"
                  : "text-gray-400 hover:text-white hover:bg-gray-800"
              }`}
            >
              Unread
              {conversations.filter((c) => c.needs_reply).length > 0 && (
                <span className="ml-1 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">
                  {conversations.filter((c) => c.needs_reply).length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("recent")}
              className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === "recent"
                  ? "bg-blue-600 text-white"
                  : "text-gray-400 hover:text-white hover:bg-gray-800"
              }`}
            >
              Recent
            </button>
            <button
              onClick={() => setActiveTab("starred")}
              className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-1 ${
                activeTab === "starred"
                  ? "bg-blue-600 text-white"
                  : "text-gray-400 hover:text-white hover:bg-gray-800"
              }`}
            >
              <Star
                className={`h-4 w-4 ${activeTab === "starred" ? "fill-white" : ""}`}
              />
              Starred
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-gray-800">
          {filteredConversations.length === 0 ? (
            <div className="p-4 text-center text-gray-400">
              {activeTab === "unread" ? (
                <>
                  <Check className="h-12 w-12 mx-auto mb-2 opacity-50 text-green-400" />
                  <p className="font-medium">All caught up!</p>
                  <p className="text-sm mt-1">No unread messages</p>
                </>
              ) : activeTab === "starred" ? (
                <>
                  <Star className="h-12 w-12 mx-auto mb-2 opacity-50 text-yellow-400" />
                  <p className="font-medium">No starred conversations</p>
                  <p className="text-sm mt-1">
                    Star conversations to find them easily later
                  </p>
                </>
              ) : searchQuery ? (
                <>
                  <Search className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="font-medium">No results found</p>
                  <p className="text-sm mt-1">
                    Try adjusting your search terms
                  </p>
                </>
              ) : (
                <>
                  <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="font-medium">No conversations yet</p>
                  <p className="text-sm mt-1">
                    Start messaging your clients and leads
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-1 p-2">
              {filteredConversations.map((conversation) => (
                <button
                  key={conversation.id}
                  onClick={() => setSelectedConversation(conversation)}
                  className={`w-full text-left p-3 rounded-lg transition-colors relative group ${
                    selectedConversation?.id === conversation.id
                      ? "bg-gray-700 border border-blue-500"
                      : "hover:bg-gray-700"
                  }`}
                >
                  {/* Action buttons */}
                  <div className="absolute top-2 right-2 flex gap-1 z-10">
                    {/* Mark as read/unread button */}
                    <button
                      onClick={(e) => toggleReadStatus(conversation.id, e)}
                      className={`p-1 rounded hover:bg-gray-600 transition-opacity ${
                        conversation.needs_reply
                          ? "opacity-100"
                          : "opacity-0 group-hover:opacity-100"
                      }`}
                      title={
                        conversation.is_manually_read
                          ? "Mark as unread"
                          : "Mark as read"
                      }
                    >
                      {conversation.is_manually_read ? (
                        <MailX className="h-4 w-4 text-gray-400" />
                      ) : (
                        <MailOpen
                          className={`h-4 w-4 ${
                            conversation.needs_reply
                              ? "text-blue-400"
                              : "text-gray-400"
                          }`}
                        />
                      )}
                    </button>

                    {/* Star button */}
                    <button
                      onClick={(e) => toggleStar(conversation.id, e)}
                      className={`p-1 rounded hover:bg-gray-600 transition-opacity ${
                        conversation.is_starred
                          ? "opacity-100"
                          : "opacity-0 group-hover:opacity-100"
                      }`}
                      title={
                        conversation.is_starred
                          ? "Remove from starred"
                          : "Add to starred"
                      }
                    >
                      <Star
                        className={`h-4 w-4 ${
                          conversation.is_starred
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-gray-400"
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex justify-between items-start mb-1">
                    <div className="flex-1 pr-12">
                      <span className="font-medium text-white truncate">
                        {conversation.contact_name}
                      </span>
                      {conversation.membership_status && (
                        <span className="ml-2 text-xs px-2 py-1 rounded-full bg-gray-700 text-gray-400">
                          {conversation.membership_status}
                        </span>
                      )}
                    </div>
                    {conversation.unread_count > 0 && (
                      <span className="bg-blue-600 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                        {conversation.unread_count}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 mb-1">
                    {conversation.sender_type === "ai" ? (
                      <Bot className="h-3 w-3 text-purple-500" />
                    ) : conversation.sender_type === "coach" ||
                      conversation.sender_type === "gym" ? (
                      <User className="h-3 w-3 text-blue-500" />
                    ) : (
                      <User className="h-3 w-3 text-green-500" />
                    )}
                    <p className="text-sm text-gray-400 truncate">
                      {conversation.last_message}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3 text-gray-400" />
                    <span className="text-xs text-gray-400">
                      {formatBritishDateTime(conversation.last_message_time)}
                    </span>
                    {conversation.type === "coaching" && (
                      <span className="ml-auto text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded">
                        Coaching
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-gray-900">
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-700 bg-gray-800">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="font-medium text-white">
                    {selectedConversation.contact_name}
                  </h4>
                  <p className="text-sm text-gray-400">
                    {selectedConversation.contact_email ||
                      selectedConversation.contact_phone}
                  </p>
                </div>
                <button
                  onClick={() =>
                    window.open(
                      `/clients/${selectedConversation.contact_id}`,
                      "_blank",
                    )
                  }
                  className="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                >
                  View Profile
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-900">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`group flex ${
                    message.sender_type === "coach" ||
                    message.sender_type === "gym"
                      ? "justify-end"
                      : "justify-start"
                  }`}
                >
                  <div className="flex items-start gap-2 max-w-[70%]">
                    {(message.sender_type === "member" ||
                      message.sender_type === "ai") && (
                      <div
                        className={`p-2 rounded-full ${
                          message.sender_type === "ai"
                            ? "bg-purple-600"
                            : "bg-green-600"
                        }`}
                      >
                        {message.sender_type === "ai" ? (
                          <Bot className="h-4 w-4 text-white" />
                        ) : (
                          <User className="h-4 w-4 text-white" />
                        )}
                      </div>
                    )}
                    <div className="flex flex-col">
                      <div
                        className={`px-4 py-2 rounded-lg ${
                          message.sender_type === "coach" ||
                          message.sender_type === "gym"
                            ? "bg-blue-600 text-white"
                            : message.sender_type === "ai"
                              ? "bg-purple-100 text-purple-900"
                              : "bg-gray-100 text-gray-900"
                        }`}
                      >
                        {message.sender_type !== "coach" &&
                          message.sender_type !== "gym" && (
                            <p className="text-xs font-semibold mb-1 opacity-75">
                              {message.sender_name ||
                                (message.sender_type === "ai"
                                  ? "AI Assistant"
                                  : "Member")}
                            </p>
                          )}
                        <p className="whitespace-pre-wrap">{message.content}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {message.type && getMessageTypeIcon(message.type)}
                          <span className="text-xs opacity-75">
                            {formatBritishDateTime(message.created_at)}
                          </span>
                          {message.status && (
                            <span
                              className={`text-xs ${getStatusColor(message.status)}`}
                            >
                              {message.status === "read" ? (
                                <CheckCheck className="h-3 w-3" />
                              ) : message.status === "sent" ? (
                                <Check className="h-3 w-3" />
                              ) : message.status === "delivered" ? (
                                <CheckCheck className="h-3 w-3" />
                              ) : (
                                message.status
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                      {/* Quick reply button for inbound messages */}
                      {(message.sender_type === "member" ||
                        message.sender_type === "ai") && (
                        <button
                          onClick={() => handleReply(message)}
                          className="mt-1 text-xs text-blue-600 hover:text-blue-700 opacity-0 group-hover:opacity-100 transition-opacity self-start"
                        >
                          Quick Reply →
                        </button>
                      )}
                    </div>
                    {(message.sender_type === "coach" ||
                      message.sender_type === "gym") && (
                      <div className="p-2 rounded-full bg-blue-600">
                        <User className="h-4 w-4 text-white" />
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-end">
                  <div className="bg-blue-600 text-white px-4 py-2 rounded-lg">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Reply Area (shows when replying) */}
            {showReplyArea && replyingTo && (
              <div className="px-4 py-2 bg-blue-50 border-t border-blue-200">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-xs text-blue-600 font-medium">
                      Replying to:
                    </p>
                    <p className="text-sm text-gray-700 truncate">
                      {replyingTo.content}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setShowReplyArea(false);
                      setReplyingTo(null);
                    }}
                    className="ml-2 text-gray-500 hover:text-gray-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Message Input */}
            <div className="p-4 border-t border-gray-700 bg-gray-800">
              <div className="flex gap-2 mb-2">
                <button
                  onClick={() => setMessageType("in_app")}
                  className={`px-3 py-1 rounded-lg text-sm ${
                    messageType === "in_app"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  }`}
                >
                  In-App
                </button>
                {selectedConversation.type === "general" && (
                  <>
                    <button
                      onClick={() => setMessageType("whatsapp")}
                      className={`px-3 py-1 rounded-lg text-sm ${
                        messageType === "whatsapp"
                          ? "bg-green-600 text-white"
                          : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                      }`}
                    >
                      WhatsApp
                    </button>
                    <button
                      onClick={() => setMessageType("sms")}
                      className={`px-3 py-1 rounded-lg text-sm ${
                        messageType === "sms"
                          ? "bg-blue-600 text-white"
                          : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                      }`}
                    >
                      SMS
                    </button>
                    <button
                      onClick={() => setMessageType("email")}
                      className={`px-3 py-1 rounded-lg text-sm ${
                        messageType === "email"
                          ? "bg-purple-600 text-white"
                          : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                      }`}
                    >
                      Email
                    </button>
                  </>
                )}
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  sendMessage();
                }}
                className="flex gap-2"
              >
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder={
                    replyingTo
                      ? `Reply to message...`
                      : `Type your ${selectedConversation.type === "coaching" ? "coaching" : messageType} message...`
                  }
                  className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={!inputMessage.trim() || isLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <Send className="h-5 w-5" />
                      Send
                    </>
                  )}
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400 bg-gray-900">
            <div className="text-center">
              <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Select a conversation to start messaging</p>
              <p className="text-sm mt-1 text-gray-500">
                All your coaching and general messages in one place
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
