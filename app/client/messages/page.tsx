"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/app/lib/supabase/client";
import { Send, ChevronLeft, MessageCircle, User, Clock } from "lucide-react";

export default function ClientMessagesPage() {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [client, setClient] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (client) {
      initConversation();
    }
  }, [client]); // eslint-disable-line react-hooks/exhaustive-deps

  const checkAuth = async () => {
    try {
      // First try to get the session from storage
      const {
        data: { session },
      } = await supabase.auth.getSession();

      let userId: string | null = null;

      // If no session in memory, try to restore from storage/cookies
      if (!session) {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.push("/simple-login");
          return;
        }

        // If we have a user but no session, refresh the session
        const {
          data: { session: refreshedSession },
        } = await supabase.auth.refreshSession();

        if (!refreshedSession) {
          router.push("/simple-login");
          return;
        }

        userId = user.id;
      } else {
        userId = session.user.id;
      }

      // Get client info
      const { data: clientData, error: clientError } = await supabase
        .from("clients")
        .select("*, organizations(*)")
        .eq("user_id", userId)
        .single();

      if (clientError || !clientData) {
        // Try by email
        const userEmail =
          session?.user?.email ||
          (await supabase.auth.getUser()).data.user?.email;
        if (userEmail) {
          const { data: clientByEmail } = await supabase
            .from("clients")
            .select("*, organizations(*)")
            .eq("email", userEmail)
            .single();

          if (clientByEmail) {
            setClient(clientByEmail);
          } else {
            router.push("/simple-login");
            return;
          }
        } else {
          router.push("/simple-login");
          return;
        }
      } else {
        setClient(clientData);
      }
    } catch (error) {
      console.error("Error checking auth:", error);
      router.push("/simple-login");
    } finally {
      setLoading(false);
    }
  };

  const initConversation = async () => {
    try {
      // Get current session to ensure we're authenticated
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        console.error("No session found");
        alert("Please sign in to use the messaging feature.");
        return;
      }

      // Create or get the conversation for this client
      const resp = await fetch("/api/client/conversations", {
        method: "POST",
        credentials: "include", // Include cookies for authentication
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`, // Add auth header as backup
        },
      });
      const data = await resp.json();

      console.log("Conversation API response:", data);

      if (!resp.ok) {
        console.error("Conversation API error:", data);
        throw new Error(data.error || "Failed to init conversation");
      }

      if (!data.conversation_id) {
        console.error("No conversation_id in response:", data);
        throw new Error("No conversation ID returned");
      }

      if (data.warning) {
        console.warn("Conversation warning:", data.warning);
      }

      setConversationId(data.conversation_id);

      // Verify the conversation exists in the database before proceeding
      const { data: convCheck } = await supabase
        .from("conversations")
        .select("id")
        .eq("id", data.conversation_id)
        .single();

      if (!convCheck) {
        console.error("Conversation not found in database");
        throw new Error("Conversation creation failed");
      }

      await loadMessages(data.conversation_id);
      subscribeToMessages(data.conversation_id);
    } catch (error) {
      console.error("Error initializing conversation:", error);
      alert(
        "Failed to initialize chat. Please refresh the page and try again.",
      );
    }
  };

  const loadMessages = async (convId: string) => {
    try {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", convId)
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

  const subscribeToMessages = (convId: string) => {
    const channel = supabase
      .channel(`client-messages-${convId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${convId}`,
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

    // Get fresh conversation ID from state
    let currentConversationId = conversationId;

    // Always ensure we have a conversation ID before sending
    if (!currentConversationId) {
      console.warn("No conversation ID available, attempting to create one...");
      try {
        // Try to reinitialize the conversation
        await initConversation();
        // Wait a bit for state to update
        await new Promise((resolve) => setTimeout(resolve, 200));
        currentConversationId = conversationId;
      } catch (initError) {
        console.error("Failed to initialize conversation:", initError);
      }

      // If still no ID after initialization, we cannot proceed
      if (!currentConversationId) {
        console.error("Failed to create conversation");
        alert("Unable to start chat. Please refresh the page and try again.");
        setSending(false);
        return;
      }
    }

    console.log("Sending message with conversation_id:", currentConversationId);
    setSending(true);

    const messageData = {
      conversation_id: currentConversationId,
      client_id: client.id,
      customer_id: client.id, // Compatibility alias
      org_id: client.org_id || client.organization_id, // Use org_id as that's what the DB expects
      channel: "in_app",
      sender_type: "client",
      sender_name: client.name || client.first_name || client.email || "Client",
      message_type: "text",
      type: "text", // Legacy compatibility
      direction: "inbound", // Client messages are inbound
      content: newMessage.trim(),
      body: newMessage.trim(), // Legacy compatibility
      status: "sent",
      sender_id: null, // Clients don't have user records
      metadata: {},
    };

    try {
      const { data, error } = await supabase
        .from("messages")
        .insert(messageData)
        .select("*")
        .single();

      if (error) {
        console.error("Database insert error:", error);
        throw error;
      }

      // Add to local messages immediately for better UX
      setMessages((prev) => [...prev, data]);
      setNewMessage("");
    } catch (error: any) {
      console.error("Error sending message:", error);

      // If it's a conversation_id constraint error, try one more time with a new ID
      if (
        error?.message?.includes("conversation_id") ||
        error?.message?.includes("foreign key")
      ) {
        console.warn(
          "Conversation ID constraint error, retrying with new ID...",
        );
        try {
          const retryConversationId = crypto.randomUUID();
          setConversationId(retryConversationId);

          const retryData = {
            ...messageData,
            conversation_id: retryConversationId,
          };
          const { data: retryResult, error: retryError } = await supabase
            .from("messages")
            .insert(retryData)
            .select("*")
            .single();

          if (retryError) throw retryError;

          setMessages((prev) => [...prev, retryResult]);
          setNewMessage("");
          console.log("Message sent successfully on retry");
          return;
        } catch (retryErr) {
          console.error("Retry also failed:", retryErr);
        }
      }

      // Show user-friendly error message
      const errorMsg = error?.message?.includes("conversation_id")
        ? "Unable to connect to conversation. Please refresh the page and try again."
        : "Failed to send message. Please try again.";

      alert(errorMsg);
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
                const isFromClient = message.sender_type === "client";
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
                      <p className="text-sm">{message.content}</p>
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
