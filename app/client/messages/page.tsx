"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/app/lib/supabase/client";
import { Send, ChevronLeft, MessageCircle, User, Clock } from "lucide-react";

export default function ClientMessagesPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [client, setClient] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (client) {
      loadMessages();
      subscribeToMessages();
    }
  }, [client]);

  const checkAuth = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/client-portal/login");
        return;
      }

      // Get client info
      const { data: clientData, error: clientError } = await supabase
        .from("clients")
        .select("*, organizations(*)")
        .eq("user_id", user.id)
        .single();

      if (clientError || !clientData) {
        // Try by email
        const { data: clientByEmail } = await supabase
          .from("clients")
          .select("*, organizations(*)")
          .eq("email", user.email)
          .single();

        if (clientByEmail) {
          setClient(clientByEmail);
        }
      } else {
        setClient(clientData);
      }
    } catch (error) {
      console.error("Error checking auth:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async () => {
    try {
      const { data, error } = await supabase
        .from("nutrition_coach_messages")
        .select("*, coach:coach_id(email)")
        .eq("client_id", client.id)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error loading messages:", error);
        return;
      }

      setMessages(data || []);

      // Mark messages as read
      if (data && data.length > 0) {
        const unreadIds = data
          .filter((m) => !m.is_read && m.message_type === "coach_to_client")
          .map((m) => m.id);

        if (unreadIds.length > 0) {
          await supabase
            .from("nutrition_coach_messages")
            .update({ is_read: true, read_at: new Date().toISOString() })
            .in("id", unreadIds);
        }
      }
    } catch (error) {
      console.error("Error loading messages:", error);
    }
  };

  const subscribeToMessages = () => {
    const channel = supabase
      .channel(`client-messages-${client.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "nutrition_coach_messages",
          filter: `client_id=eq.${client.id}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new]);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      const { data, error } = await supabase
        .from("nutrition_coach_messages")
        .insert({
          client_id: client.id,
          organization_id: client.organization_id,
          message_type: "client_to_coach",
          subject: "Message from client",
          message: newMessage.trim(),
        })
        .select()
        .single();

      if (error) throw error;

      setMessages((prev) => [...prev, data]);
      setNewMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
      alert("Failed to send message. Please try again.");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
        <div className="bg-gray-800 shadow-lg rounded-lg p-6 max-w-md text-center border border-gray-700">
          <h2 className="text-lg font-semibold mb-2 text-white">
            Setup Required
          </h2>
          <p className="text-gray-400">
            Please complete your profile setup first.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 shadow-sm border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center">
              <button
                onClick={() => router.push("/client")}
                className="mr-4 text-gray-300 hover:text-orange-500 transition-colors"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                  <MessageCircle className="h-6 w-6 text-orange-500" />
                  Message Your Coach
                </h1>
                <p className="text-sm text-gray-400 mt-1">
                  Chat with your nutrition and fitness coaches
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Messages Container */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-gray-800 rounded-lg border border-gray-700 flex flex-col h-[calc(100vh-200px)]">
          {/* Messages List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-12">
                <MessageCircle className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">No messages yet</p>
                <p className="text-sm text-gray-500 mt-2">
                  Start a conversation with your coach
                </p>
              </div>
            ) : (
              messages.map((message) => {
                const isFromClient = message.message_type === "client_to_coach";
                return (
                  <div
                    key={message.id}
                    className={`flex ${isFromClient ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg p-3 ${
                        isFromClient
                          ? "bg-orange-500 text-white"
                          : "bg-gray-700 text-white"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <User className="h-4 w-4" />
                        <span className="text-sm font-semibold">
                          {isFromClient ? "You" : "Coach"}
                        </span>
                        <Clock className="h-3 w-3 ml-auto" />
                        <span className="text-xs opacity-75">
                          {new Date(message.created_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <p className="text-sm">{message.message}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Message Input */}
          <div className="border-t border-gray-700 p-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                placeholder="Type your message..."
                className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <button
                onClick={sendMessage}
                disabled={!newMessage.trim() || sending}
                className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                  newMessage.trim() && !sending
                    ? "bg-orange-500 text-white hover:bg-orange-600"
                    : "bg-gray-700 text-gray-400 cursor-not-allowed"
                }`}
              >
                <Send className="h-4 w-4" />
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
