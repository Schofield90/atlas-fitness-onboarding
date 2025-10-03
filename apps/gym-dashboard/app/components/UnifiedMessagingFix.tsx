// This is a patch for the UnifiedMessaging component to fix in-app messaging
// Add this to the sendMessage function in UnifiedMessaging.tsx

// Replace the existing sendMessage function with this updated version:
const sendMessageFixed = async () => {
  if (!inputMessage.trim() || !selectedConversation || isLoading) return;

  const messageContent = inputMessage.trim();
  setInputMessage("");
  setIsLoading(true);

  // Create optimistic message
  const optimisticMessage: Message = {
    id: `temp-${Date.now()}`,
    content: messageContent,
    sender_type: "gym",
    sender_id: userData.id,
    sender_name: userData.full_name || "Gym",
    created_at: new Date().toISOString(),
    read: false,
    type: messageType,
    direction: "outbound",
    status: "sending",
  };

  setMessages((prev) => [...prev, optimisticMessage]);

  try {
    // Check if this is an in-app conversation
    const isInAppConversation =
      messageType === "in_app" ||
      selectedConversation.type === "coaching" ||
      !messageType ||
      messageType === "";

    if (isInAppConversation) {
      // Handle in-app messaging through conversations

      // First, get or create conversation
      const { data: convData, error: convError } = await supabase.rpc(
        "get_or_create_conversation",
        {
          p_organization_id: userData.organization_id,
          p_client_id: selectedConversation.contact_id.startsWith("client-")
            ? selectedConversation.contact_id.replace("client-", "")
            : null,
          p_lead_id:
            selectedConversation.contact_id.startsWith("lead-") ||
            selectedConversation.contact_id.startsWith("general-")
              ? selectedConversation.contact_id.replace(/^(lead-|general-)/, "")
              : null,
          p_coach_id: userData.id,
        },
      );

      if (convError) throw convError;

      // Send the in-app message
      const { data, error } = await supabase.rpc("send_inapp_message", {
        p_conversation_id: convData,
        p_content: messageContent,
        p_sender_id: userData.id,
        p_sender_type: "gym",
        p_sender_name: userData.full_name || userData.email || "Gym",
        p_organization_id: userData.organization_id,
      });

      if (error) throw error;

      // Update optimistic message with real data
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === optimisticMessage.id
            ? {
                ...msg,
                id: data,
                status: "delivered",
                sent_at: new Date().toISOString(),
              }
            : msg,
        ),
      );
    } else if (selectedConversation.type === "coaching") {
      // Send as coaching message (existing logic)
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
    } else {
      // Send as SMS/Email/WhatsApp message (existing logic)
      const payload = {
        leadId: selectedConversation.contact_id.replace(
          /^(lead-|general-)/,
          "",
        ),
        type: messageType,
        to:
          messageType === "email"
            ? selectedConversation.contact_email
            : selectedConversation.contact_phone,
        subject:
          messageType === "email" ? "Message from Atlas Fitness" : undefined,
        body: messageContent,
        // Add these fields for in-app compatibility
        channel: messageType,
        conversation_id: null, // Will be created if needed
        sender_type: "gym",
        sender_name: userData.full_name || userData.email || "Gym",
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
    }

    toast.success("Message sent!");
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
