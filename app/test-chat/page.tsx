"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/app/lib/supabase/client";

export default function TestChat() {
  const [status, setStatus] = useState("");
  const [user, setUser] = useState<any>(null);
  const [conversationId, setConversationId] = useState("");
  
  useEffect(() => {
    checkAuth();
  }, []);
  
  const checkAuth = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUser(user);
      setStatus(`Logged in as: ${user.email}`);
    } else {
      setStatus("Not logged in");
    }
  };
  
  const testConversationAPI = async () => {
    if (!user) {
      setStatus("Not logged in!");
      return;
    }
    
    setStatus("Testing conversation API...");
    
    try {
      const response = await fetch("/api/client/conversations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include"
      });
      
      const data = await response.json();
      console.log("API Response:", data);
      
      if (response.ok) {
        setConversationId(data.conversation_id);
        setStatus(`✅ Conversation ID: ${data.conversation_id}`);
      } else {
        setStatus(`❌ Error: ${data.error}`);
      }
    } catch (error) {
      console.error("Error:", error);
      setStatus(`❌ Error: ${error}`);
    }
  };
  
  const sendTestMessage = async () => {
    if (!conversationId) {
      setStatus("Get conversation ID first!");
      return;
    }
    
    setStatus("Sending test message...");
    
    try {
      const response = await fetch("/api/messages/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          conversation_id: conversationId,
          content: "Test message from client",
          sender_type: "client"
        }),
        credentials: "include"
      });
      
      const data = await response.json();
      console.log("Send message response:", data);
      
      if (response.ok) {
        setStatus(`✅ Message sent! ID: ${data.id}`);
      } else {
        setStatus(`❌ Error: ${data.error}`);
      }
    } catch (error) {
      console.error("Error:", error);
      setStatus(`❌ Error: ${error}`);
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-lg p-8 max-w-md w-full space-y-4">
        <h1 className="text-2xl font-bold text-white">Test Chat API</h1>
        
        <div className="text-gray-300">
          <p>User: {user?.email || "Not logged in"}</p>
          <p>ID: {user?.id || "-"}</p>
        </div>
        
        <button
          onClick={testConversationAPI}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded"
        >
          Get Conversation ID
        </button>
        
        {conversationId && (
          <>
            <div className="text-green-400 text-sm">
              Conversation: {conversationId}
            </div>
            
            <button
              onClick={sendTestMessage}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded"
            >
              Send Test Message
            </button>
          </>
        )}
        
        <div className="p-3 bg-gray-700 rounded text-gray-300 text-sm break-all">
          {status}
        </div>
        
        <a 
          href="/quick-login" 
          className="block text-center text-blue-400 hover:text-blue-300"
        >
          Go to Login
        </a>
      </div>
    </div>
  );
}