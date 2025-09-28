"use client";

import { useState } from "react";
import { createClient } from "@/app/lib/supabase/client";

export default function TestClientAuth() {
  const [status, setStatus] = useState("");
  const [conversationId, setConversationId] = useState("");
  const supabase = createClient();

  const testAsClient = async () => {
    setStatus("Logging in as client...");
    
    // Login as client
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: "samschofield90@hotmail.co.uk",
      password: "@Aa80236661"
    });
    
    if (authError) {
      setStatus(`Login failed: ${authError.message}`);
      return;
    }
    
    setStatus("Logged in! Testing conversation API...");
    
    // Test conversation API
    try {
      const response = await fetch("/api/client/conversations", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        }
      });
      
      const data = await response.json();
      
      if (data.error) {
        setStatus(`API Error: ${data.error}`);
      } else if (data.conversation_id) {
        setStatus(`✅ Success! Conversation ID: ${data.conversation_id}`);
        setConversationId(data.conversation_id);
        
        // Test sending a message
        await testSendMessage(data.conversation_id);
      }
    } catch (error) {
      setStatus(`Fetch error: ${error}`);
    }
  };
  
  const testSendMessage = async (convId: string) => {
    setStatus(prev => prev + "\n\nSending test message...");
    
    const { data: { user } } = await supabase.auth.getUser();
    const { data: client } = await supabase
      .from("clients")
      .select("*")
      .eq("user_id", user?.id)
      .single();
    
    if (!client) {
      setStatus(prev => prev + "\n❌ Client not found");
      return;
    }
    
    const { error } = await supabase
      .from("messages")
      .insert({
        conversation_id: convId,
        client_id: client.id,
        customer_id: client.id,
        organization_id: client.org_id || client.organization_id,
        channel: "in_app",
        sender_type: "client",
        sender_name: client.first_name || "Client",
        message_type: "text",
        type: "text",
        direction: "inbound",
        content: "Test message from client auth test",
        body: "Test message from client auth test",
        status: "sent",
        sender_id: client.id,
        metadata: {}
      });
    
    if (error) {
      setStatus(prev => prev + `\n❌ Message error: ${error.message}`);
    } else {
      setStatus(prev => prev + "\n✅ Message sent successfully!");
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-8">Client Auth & Messaging Test</h1>
        
        <button
          onClick={testAsClient}
          className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg font-medium"
        >
          Test Client Login & Messaging
        </button>
        
        {status && (
          <div className="mt-8 p-4 bg-gray-800 rounded-lg">
            <pre className="text-gray-300 whitespace-pre-wrap">{status}</pre>
          </div>
        )}
        
        {conversationId && (
          <div className="mt-4 p-4 bg-green-900/30 rounded-lg">
            <p className="text-green-400">
              ✅ Conversation created! You can now go to{" "}
              <a href="/client/messages" className="underline">
                /client/messages
              </a>{" "}
              to test the chat interface.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}