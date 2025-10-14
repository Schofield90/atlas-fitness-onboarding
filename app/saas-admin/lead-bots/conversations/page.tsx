"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ChatBubbleBottomCenterTextIcon,
  MagnifyingGlassIcon,
  UserIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  PaperAirplaneIcon,
} from "@heroicons/react/24/outline";

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface Conversation {
  id: string;
  leadName: string;
  leadEmail: string;
  leadPhone: string;
  organizationName: string;
  status: 'active' | 'completed' | 'archived';
  createdAt: string;
  lastMessageAt: string;
  messageCount: number;
  aiEnabled: boolean;
}

function ConversationsPageContent() {
  const searchParams = useSearchParams();
  const orgFilter = searchParams?.get("org");

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed' | 'archived'>('all');

  // Manual override state
  const [manualMode, setManualMode] = useState(false);
  const [manualMessage, setManualMessage] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetchConversations();
  }, [orgFilter, statusFilter]);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (orgFilter) params.set('org', orgFilter);
      if (statusFilter !== 'all') params.set('status', statusFilter);

      const response = await fetch(`/api/saas-admin/lead-bots/conversations?${params}`);
      if (!response.ok) throw new Error("Failed to fetch conversations");

      const data = await response.json();
      setConversations(data.conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (conversationId: string) => {
    try {
      setLoadingMessages(true);
      const response = await fetch(`/api/saas-admin/lead-bots/conversations/${conversationId}/messages`);
      if (!response.ok) throw new Error("Failed to fetch messages");

      const data = await response.json();
      setMessages(data.messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
    } finally {
      setLoadingMessages(false);
    }
  };

  const selectConversation = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    fetchMessages(conversation.id);
    setManualMode(false);
    setManualMessage("");
  };

  const toggleManualMode = async () => {
    if (!selectedConversation) return;

    const newMode = !manualMode;
    setManualMode(newMode);

    if (newMode) {
      // Disable AI for this conversation
      await fetch(`/api/saas-admin/lead-bots/conversations/${selectedConversation.id}/toggle-ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: false }),
      });
    } else {
      // Re-enable AI for this conversation
      await fetch(`/api/saas-admin/lead-bots/conversations/${selectedConversation.id}/toggle-ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: true }),
      });
    }
  };

  const sendManualMessage = async () => {
    if (!selectedConversation || !manualMessage.trim() || sending) return;

    try {
      setSending(true);
      const response = await fetch(`/api/saas-admin/lead-bots/conversations/${selectedConversation.id}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: manualMessage }),
      });

      if (!response.ok) throw new Error("Failed to send message");

      // Add message to local state immediately
      const newMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: manualMessage,
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, newMessage]);
      setManualMessage("");

      // Refresh messages to get actual data
      await fetchMessages(selectedConversation.id);
    } catch (error) {
      console.error("Error sending message:", error);
      alert("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const filteredConversations = conversations.filter(conv => {
    const matchesSearch =
      conv.leadName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.leadEmail?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.organizationName.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesSearch;
  });

  return (
    <div className="flex h-screen bg-gray-900">
      {/* Conversations List */}
      <div className="w-96 bg-gray-800 border-r border-gray-700 flex flex-col">
        <div className="p-4 border-b border-gray-700">
          <h1 className="text-2xl font-bold text-white mb-4">Conversations</h1>

          {/* Search */}
          <div className="relative mb-4">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          {/* Status Filter */}
          <div className="flex gap-2">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 rounded-lg text-sm font-medium ${
                statusFilter === 'all'
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1 rounded-lg text-sm font-medium ${
                statusFilter === 'active'
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setStatusFilter('completed')}
              className={`px-3 py-1 rounded-lg text-sm font-medium ${
                statusFilter === 'completed'
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Completed
            </button>
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <ChatBubbleBottomCenterTextIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No conversations found</p>
            </div>
          ) : (
            filteredConversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => selectConversation(conv)}
                className={`w-full p-4 border-b border-gray-700 hover:bg-gray-750 transition-colors text-left ${
                  selectedConversation?.id === conv.id ? 'bg-gray-750' : ''
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <UserIcon className="h-5 w-5 text-gray-400" />
                    <span className="font-semibold text-white">{conv.leadName}</span>
                  </div>
                  {conv.aiEnabled ? (
                    <span className="px-2 py-0.5 rounded-full text-xs bg-green-900 text-green-200">AI</span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-xs bg-blue-900 text-blue-200">Manual</span>
                  )}
                </div>
                <p className="text-sm text-gray-400 mb-1">{conv.organizationName}</p>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>{conv.messageCount} messages</span>
                  <span>{new Date(conv.lastMessageAt).toLocaleDateString()}</span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat Window */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-700 bg-gray-800">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">{selectedConversation.leadName}</h2>
                  <p className="text-sm text-gray-400">{selectedConversation.leadEmail}</p>
                  <p className="text-sm text-gray-400">{selectedConversation.organizationName}</p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={toggleManualMode}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      manualMode
                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                        : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                    }`}
                  >
                    {manualMode ? 'Manual Mode ON' : 'Enable Manual Override'}
                  </button>
                  {selectedConversation.status === 'active' ? (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-900 text-green-200">
                      <CheckCircleIcon className="h-4 w-4 mr-1" />
                      Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-700 text-gray-300">
                      <XCircleIcon className="h-4 w-4 mr-1" />
                      {selectedConversation.status}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {loadingMessages ? (
                <div className="flex items-center justify-center h-full">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-400">
                  <div className="text-center">
                    <ChatBubbleBottomCenterTextIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No messages yet</p>
                  </div>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg px-4 py-2 ${
                        message.role === 'user'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-700 text-gray-100'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{message.content}</p>
                      <p className="text-xs opacity-70 mt-1">
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Manual Message Input */}
            {manualMode && (
              <div className="p-4 border-t border-gray-700 bg-gray-800">
                <div className="bg-blue-900 bg-opacity-30 border border-blue-700 rounded-lg p-3 mb-3">
                  <p className="text-sm text-blue-200">
                    Manual override enabled - AI responses are paused for this conversation
                  </p>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Type your message..."
                    value={manualMessage}
                    onChange={(e) => setManualMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendManualMessage()}
                    className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={sending}
                  />
                  <button
                    onClick={sendManualMessage}
                    disabled={!manualMessage.trim() || sending}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                  >
                    <PaperAirplaneIcon className="h-5 w-5" />
                    {sending ? 'Sending...' : 'Send'}
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <ChatBubbleBottomCenterTextIcon className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p>Select a conversation to view messages</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ConversationsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center p-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
        <p className="ml-4 text-gray-400">Loading...</p>
      </div>
    }>
      <ConversationsPageContent />
    </Suspense>
  );
}
