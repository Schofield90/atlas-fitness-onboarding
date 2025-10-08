'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Bot, MessageSquare, Send, Minimize2, X, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/app/lib/utils';

// Type definitions
interface Agent {
  id: string;
  name: string;
  description: string;
  role?: string;
  avatar_url?: string;
  system_prompt: string;
  model: string;
  enabled: boolean;
  is_default: boolean;
}

interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
  tokens_used?: number;
  cost_usd?: number;
}

interface Conversation {
  id: string;
  agent_id: string;
  title: string;
  status: 'active' | 'archived' | 'deleted';
  message_count: number;
  created_at: string;
  last_message_at?: string;
  agent?: Agent;
}

interface ApiResponse<T> {
  success: boolean;
  error?: string;
  data?: T;
}

export default function AgentTabs() {
  // State management
  const [agents, setAgents] = useState<Agent[]>([]);
  const [activeAgent, setActiveAgent] = useState<Agent | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMinimized, setIsMinimized] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages, scrollToBottom]);

  // Fetch enabled agents on mount
  useEffect(() => {
    fetchAgents();
  }, []);

  // Focus input when expanded
  useEffect(() => {
    if (isExpanded && !isMinimized && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isExpanded, isMinimized]);

  // Fetch enabled agents
  const fetchAgents = async () => {
    try {
      const response = await fetch('/api/ai-agents?enabled=true');
      const data = await response.json();

      if (data.success && data.agents) {
        setAgents(data.agents);
      } else {
        console.error('Failed to fetch agents:', data.error);
        setError('Failed to load AI agents');
      }
    } catch (err) {
      console.error('Error fetching agents:', err);
      setError('Failed to load AI agents');
    }
  };

  // Load or create conversation for agent
  const loadConversation = async (agent: Agent) => {
    setIsLoading(true);
    setError(null);

    try {
      // Try to get existing active conversation for this agent
      const listResponse = await fetch(
        `/api/ai-agents/conversations?agent_id=${agent.id}&status=active&limit=1`
      );
      const listData = await listResponse.json();

      let activeConversation: Conversation;

      if (listData.success && listData.conversations && listData.conversations.length > 0) {
        // Use existing conversation
        activeConversation = listData.conversations[0];
      } else {
        // Create new conversation
        const createResponse = await fetch('/api/ai-agents/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agent_id: agent.id,
            title: `Chat with ${agent.name}`,
          }),
        });
        const createData = await createResponse.json();

        if (!createData.success || !createData.conversation) {
          throw new Error(createData.error || 'Failed to create conversation');
        }

        activeConversation = createData.conversation;
      }

      setConversation(activeConversation);

      // Load messages for conversation
      await loadMessages(activeConversation.id);
    } catch (err: any) {
      console.error('Error loading conversation:', err);
      setError(err.message || 'Failed to load conversation');
    } finally {
      setIsLoading(false);
    }
  };

  // Load messages for conversation
  const loadMessages = async (conversationId: string) => {
    try {
      const response = await fetch(
        `/api/ai-agents/conversations/${conversationId}/messages?limit=100`
      );
      const data = await response.json();

      if (data.success && data.messages) {
        setMessages(data.messages);
      } else {
        console.error('Failed to load messages:', data.error);
      }
    } catch (err) {
      console.error('Error loading messages:', err);
    }
  };

  // Handle agent selection
  const handleAgentClick = async (agent: Agent) => {
    setActiveAgent(agent);
    setIsExpanded(true);
    setIsMinimized(false);
    setMessages([]);
    setConversation(null);
    await loadConversation(agent);
  };

  // Handle send message
  const handleSendMessage = async () => {
    if (!inputValue.trim() || !conversation || isSending) {
      return;
    }

    const userMessage = inputValue.trim();
    setInputValue('');
    setIsSending(true);
    setError(null);

    // Optimistic UI update - add user message immediately
    const optimisticUserMessage: Message = {
      id: `temp-user-${Date.now()}`,
      conversation_id: conversation.id,
      role: 'user',
      content: userMessage,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticUserMessage]);

    try {
      const response = await fetch(
        `/api/ai-agents/conversations/${conversation.id}/messages`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: userMessage }),
        }
      );

      const data = await response.json();

      if (data.success && data.userMessage && data.assistantMessage) {
        // Replace optimistic message with real messages
        setMessages((prev) => {
          const withoutOptimistic = prev.filter((m) => m.id !== optimisticUserMessage.id);
          return [...withoutOptimistic, data.userMessage, data.assistantMessage];
        });
      } else {
        throw new Error(data.error || 'Failed to send message');
      }
    } catch (err: any) {
      console.error('Error sending message:', err);
      setError(err.message || 'Failed to send message');
      // Remove optimistic message on error
      setMessages((prev) => prev.filter((m) => m.id !== optimisticUserMessage.id));
    } finally {
      setIsSending(false);
    }
  };

  // Handle key press in input
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Handle minimize
  const handleMinimize = () => {
    setIsMinimized(true);
  };

  // Handle close
  const handleClose = () => {
    setIsExpanded(false);
    setActiveAgent(null);
    setMessages([]);
    setConversation(null);
    setError(null);
  };

  // Get agent initials for avatar
  const getAgentInitials = (name: string): string => {
    return name
      .split(' ')
      .map((word) => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Format timestamp
  const formatTime = (timestamp: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  // Don't render on mobile
  if (typeof window !== 'undefined' && window.innerWidth < 768) {
    return null;
  }

  return (
    <>
      {/* Minimized state - Agent tabs */}
      {!isExpanded && agents.length > 0 && (
        <div className="fixed bottom-4 right-4 z-50 flex flex-row-reverse gap-2">
          {agents.map((agent) => (
            <button
              key={agent.id}
              onClick={() => handleAgentClick(agent)}
              className="group relative flex items-center gap-2 bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 px-4 py-3"
              title={agent.description}
            >
              {agent.avatar_url ? (
                <img
                  src={agent.avatar_url}
                  alt={agent.name}
                  className="w-6 h-6 rounded-full"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-blue-800 flex items-center justify-center text-xs font-bold">
                  {getAgentInitials(agent.name)}
                </div>
              )}
              <span className="hidden group-hover:inline-block text-sm font-medium whitespace-nowrap transition-all duration-300">
                {agent.name}
              </span>
              <Bot className="w-4 h-4" />
            </button>
          ))}
        </div>
      )}

      {/* Expanded state - Chat window */}
      {isExpanded && activeAgent && (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col bg-white dark:bg-gray-900 rounded-lg shadow-2xl transition-all duration-300 border border-gray-200 dark:border-gray-700">
          {isMinimized ? (
            // Minimized chat - just header bar
            <button
              onClick={() => setIsMinimized(false)}
              className="flex items-center justify-between gap-3 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-500 hover:to-blue-600 transition-all duration-300 shadow-lg w-80"
            >
              <div className="flex items-center gap-3">
                {activeAgent.avatar_url ? (
                  <img
                    src={activeAgent.avatar_url}
                    alt={activeAgent.name}
                    className="w-8 h-8 rounded-full"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-blue-800 flex items-center justify-center text-sm font-bold">
                    {getAgentInitials(activeAgent.name)}
                  </div>
                )}
                <div className="flex flex-col items-start">
                  <span className="font-semibold text-sm">{activeAgent.name}</span>
                  {messages.length > 0 && (
                    <span className="text-xs text-blue-100">
                      {messages.length} message{messages.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <ChevronUp className="w-5 h-5" />
              </div>
            </button>
          ) : (
            // Full chat window
            <>
              {/* Header */}
              <div className="flex items-center justify-between gap-3 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-lg">
                <div className="flex items-center gap-3">
                  {activeAgent.avatar_url ? (
                    <img
                      src={activeAgent.avatar_url}
                      alt={activeAgent.name}
                      className="w-8 h-8 rounded-full"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-blue-800 flex items-center justify-center text-sm font-bold">
                      {getAgentInitials(activeAgent.name)}
                    </div>
                  )}
                  <div className="flex flex-col">
                    <span className="font-semibold text-sm">{activeAgent.name}</span>
                    <span className="text-xs text-blue-100">
                      {isLoading ? 'Loading...' : 'Online'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleMinimize}
                    className="p-1 hover:bg-blue-600 rounded transition-colors duration-200"
                    title="Minimize"
                  >
                    <Minimize2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleClose}
                    className="p-1 hover:bg-blue-600 rounded transition-colors duration-200"
                    title="Close"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Messages area */}
              <div className="flex flex-col h-[600px] w-[400px]">
                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 bg-gray-50 dark:bg-gray-800">
                  {isLoading ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center px-6">
                      <Bot className="w-12 h-12 text-blue-600 mb-3" />
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                        Start a conversation
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {activeAgent.description}
                      </p>
                    </div>
                  ) : (
                    <>
                      {messages.map((message) => (
                        <div
                          key={message.id}
                          className={cn(
                            'flex',
                            message.role === 'user' ? 'justify-end' : 'justify-start'
                          )}
                        >
                          <div
                            className={cn(
                              'max-w-[80%] rounded-lg px-4 py-2 shadow-sm',
                              message.role === 'user'
                                ? 'bg-blue-600 text-white'
                                : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600'
                            )}
                          >
                            <p className="text-sm whitespace-pre-wrap break-words">
                              {message.content}
                            </p>
                            <span
                              className={cn(
                                'text-xs mt-1 block',
                                message.role === 'user'
                                  ? 'text-blue-100'
                                  : 'text-gray-500 dark:text-gray-400'
                              )}
                            >
                              {formatTime(message.created_at)}
                            </span>
                          </div>
                        </div>
                      ))}
                      {isSending && (
                        <div className="flex justify-start">
                          <div className="bg-white dark:bg-gray-700 rounded-lg px-4 py-2 shadow-sm border border-gray-200 dark:border-gray-600">
                            <div className="flex items-center gap-2">
                              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                              <span className="text-sm text-gray-600 dark:text-gray-400">
                                {activeAgent.name} is typing...
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                      <div ref={messagesEndRef} />
                    </>
                  )}
                </div>

                {/* Error display */}
                {error && (
                  <div className="px-4 py-2 bg-red-50 dark:bg-red-900/20 border-t border-red-200 dark:border-red-800">
                    <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                  </div>
                )}

                {/* Input area */}
                <div className="px-4 py-3 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 rounded-b-lg">
                  <div className="flex items-center gap-2">
                    <input
                      ref={inputRef}
                      type="text"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Type your message..."
                      disabled={isLoading || isSending}
                      className="flex-1 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={!inputValue.trim() || isLoading || isSending}
                      className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 shadow-md hover:shadow-lg"
                      title="Send message"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
