"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Send,
  MessageCircle,
  User,
  Clock,
  Search,
  ChevronLeft,
} from "lucide-react";

interface Conversation {
  id: string;
  client_id: string;
  coach_id: string;
  organization_id: string;
  title: string;
  status: string;
  last_message_at: string;
  client: {
    name: string;
    email: string;
  };
}

interface Message {
  id: string;
  conversation_id: string;
  content: string;
  sender_type: "coach" | "client";
  created_at: string;
  status: string;
}

export default function DashboardMessagesPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user) {
      loadConversations();
    }
  }, [user]);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.id);
      subscribeToMessages(selectedConversation.id);
    }
  }, [selectedConversation]);

  const checkAuth = async () => {
    try {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (!authUser) {
        router.push("/signin");
        return;
      }

      // Get user info
      const { data: userData } = await supabase
        .from("users")
        .select("*, organizations(*)")
        .eq("id", authUser.id)
        .single();

      if (userData) {
        setUser(userData);
      }
    } catch (error) {
      console.error("Error checking auth:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadConversations = async () => {
    try {
      const { data, error } = await supabase
        .from("conversations")
        .select(
          `
          *,
          client:clients(name, email)
        `,
        )
        .eq("organization_id", user.organization_id)
        .order("last_message_at", { ascending: false });

      if (error) {
        console.error("Error loading conversations:", error);
        return;
      }

      setConversations(data || []);

      // Auto-select first conversation if none selected
      if (data && data.length > 0 && !selectedConversation) {
        setSelectedConversation(data[0]);
      }
    } catch (error) {
      console.error("Error loading conversations:", error);
    }
  };

  const loadMessages = async (conversationId: string) => {
    try {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error loading messages:", error);
        return;
      }

      setMessages(data || []);
    } catch (error) {
      console.error("Error loading messages:", error);
    }
  };

  const subscribeToMessages = (conversationId: string) => {
    const channel = supabase
      .channel(`coach-messages-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
          // Update last_message_at for the conversation
          setConversations((prev) =>
            prev.map((conv) =>
              conv.id === conversationId
                ? { ...conv, last_message_at: new Date().toISOString() }
                : conv,
            ),
          );
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || sending || !selectedConversation) return;

    setSending(true);
    try {
      const { data, error } = await supabase
        .from("messages")
        .insert({
          conversation_id: selectedConversation.id,
          organization_id: user.organization_id,
          client_id: selectedConversation.client_id,
          channel: "in_app",
          sender_type: "coach",
          message_type: "text",
          content: newMessage.trim(),
          status: "sent",
        })
        .select("*")
        .single();

      if (error) throw error;

      setMessages((prev) => [...prev, data]);
      setNewMessage("");

      // Update conversation's last_message_at
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === selectedConversation.id
            ? { ...conv, last_message_at: new Date().toISOString() }
            : conv,
        ),
      );
    } catch (error) {
      console.error("Error sending message:", error);
      alert("Failed to send message. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const filteredConversations = conversations.filter(
    (conv) =>
      conv.client?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conv.client?.email?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white shadow-lg rounded-lg p-6 max-w-md text-center">
          <h2 className="text-lg font-semibold mb-2">
            Authentication Required
          </h2>
          <p className="text-gray-600">Please sign in to access messages.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center">
              <button
                onClick={() => router.push("/dashboard")}
                className="mr-4 text-gray-600 hover:text-blue-600 transition-colors"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <MessageCircle className="h-6 w-6 text-blue-500" />
                  Client Messages
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  Manage conversations with your clients
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-lg shadow-sm border flex h-[calc(100vh-200px)]">
          {/* Conversations List */}
          <div className="w-1/3 border-r">
            {/* Search */}
            <div className="p-4 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search clients..."
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Conversations */}
            <div className="overflow-y-auto h-full">
              {filteredConversations.length === 0 ? (
                <div className="text-center py-8">
                  <MessageCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No conversations yet</p>
                </div>
              ) : (
                filteredConversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    onClick={() => setSelectedConversation(conversation)}
                    className={`p-4 border-b cursor-pointer hover:bg-gray-50 transition-colors ${
                      selectedConversation?.id === conversation.id
                        ? "bg-blue-50"
                        : ""
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-gray-900">
                          {conversation.client?.name || "Unknown Client"}
                        </p>
                        <p className="text-sm text-gray-600">
                          {conversation.client?.email}
                        </p>
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(
                          conversation.last_message_at,
                        ).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 flex flex-col">
            {selectedConversation ? (
              <>
                {/* Conversation Header */}
                <div className="p-4 border-b bg-gray-50">
                  <h2 className="font-semibold text-gray-900">
                    {selectedConversation.client?.name || "Unknown Client"}
                  </h2>
                  <p className="text-sm text-gray-600">
                    {selectedConversation.client?.email}
                  </p>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.length === 0 ? (
                    <div className="text-center py-12">
                      <MessageCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">No messages yet</p>
                      <p className="text-sm text-gray-400 mt-2">
                        Start a conversation with this client
                      </p>
                    </div>
                  ) : (
                    messages.map((message) => {
                      const isFromCoach = message.sender_type === "coach";
                      return (
                        <div
                          key={message.id}
                          className={`flex ${isFromCoach ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[70%] rounded-lg p-3 ${
                              isFromCoach
                                ? "bg-blue-500 text-white"
                                : "bg-gray-100 text-gray-900"
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <User className="h-4 w-4" />
                              <span className="text-sm font-semibold">
                                {isFromCoach ? "You" : "Client"}
                              </span>
                              <Clock className="h-3 w-3 ml-auto" />
                              <span className="text-xs opacity-75">
                                {new Date(
                                  message.created_at,
                                ).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </div>
                            <p className="text-sm">{message.content}</p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Message Input */}
                <div className="border-t p-4">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                      placeholder="Type your message..."
                      className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={sendMessage}
                      disabled={!newMessage.trim() || sending}
                      className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                        newMessage.trim() && !sending
                          ? "bg-blue-500 text-white hover:bg-blue-600"
                          : "bg-gray-200 text-gray-400 cursor-not-allowed"
                      }`}
                    >
                      <Send className="h-4 w-4" />
                      Send
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <MessageCircle className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">
                    Select a conversation to start messaging
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
