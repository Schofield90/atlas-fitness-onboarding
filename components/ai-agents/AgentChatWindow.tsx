'use client';

import { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { Send, Copy, RotateCcw, Trash2, ChevronDown, ChevronUp, ArrowDown } from 'lucide-react';
import type { Agent, Message, SendMessageResponse, MessagesResponse } from '@/lib/ai-agents/types';

interface AgentChatWindowProps {
  agent: Agent;
  conversationId?: string;
  onConversationCreated?: (conversationId: string) => void;
  className?: string;
}

export default function AgentChatWindow({
  agent,
  conversationId: initialConversationId,
  onConversationCreated,
  className = '',
}: AgentChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingHistory, setIsFetchingHistory] = useState(false);
  const [conversationId, setConversationId] = useState(initialConversationId);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [expandedTools, setExpandedTools] = useState<Set<string>>(new Set());
  const [totalTokens, setTotalTokens] = useState(0);
  const [totalCost, setTotalCost] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Fetch conversation history
  useEffect(() => {
    if (conversationId) {
      fetchMessages();
    }
  }, [conversationId]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (!isLoading && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  // Handle scroll visibility
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      setShowScrollButton(!isNearBottom);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  const fetchMessages = async () => {
    if (!conversationId) return;

    setIsFetchingHistory(true);
    try {
      const response = await fetch(`/api/ai-agents/conversations/${conversationId}/messages`);
      const data: MessagesResponse = await response.json();

      if (data.success && data.messages) {
        setMessages(data.messages);

        // Calculate total tokens and cost
        const tokens = data.messages.reduce((sum, msg) => sum + (msg.tokens_used || 0), 0);
        const cost = data.messages.reduce((sum, msg) => sum + (msg.cost_usd || 0), 0);
        setTotalTokens(tokens);
        setTotalCost(cost);
      } else {
        toast.error(data.error || 'Failed to load conversation history');
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Failed to load conversation history');
    } finally {
      setIsFetchingHistory(false);
    }
  };

  const createConversation = async (): Promise<string | null> => {
    try {
      const response = await fetch('/api/ai-agents/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: agent.id,
          title: `Chat with ${agent.name}`,
        }),
      });

      const data = await response.json();

      if (data.success && data.conversation) {
        const newConversationId = data.conversation.id;
        setConversationId(newConversationId);
        onConversationCreated?.(newConversationId);
        return newConversationId;
      } else {
        toast.error(data.error || 'Failed to create conversation');
        return null;
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast.error('Failed to create conversation');
      return null;
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessageContent = input.trim();
    setInput('');

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    // Get or create conversation ID
    let activeConversationId = conversationId;
    if (!activeConversationId) {
      activeConversationId = await createConversation();
      if (!activeConversationId) return;
    }

    // Add optimistic user message
    const optimisticUserMessage: Message = {
      id: `temp-${Date.now()}`,
      conversation_id: activeConversationId,
      role: 'user',
      content: userMessageContent,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticUserMessage]);

    setIsLoading(true);

    try {
      const response = await fetch(`/api/ai-agents/conversations/${activeConversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: userMessageContent }),
      });

      const data: SendMessageResponse = await response.json();

      if (data.success && data.userMessage && data.assistantMessage) {
        // Replace optimistic message with real messages
        setMessages((prev) => {
          const filtered = prev.filter((msg) => msg.id !== optimisticUserMessage.id);
          return [...filtered, data.userMessage!, data.assistantMessage!];
        });

        // Update cost tracking
        if (data.cost) {
          setTotalTokens((prev) => prev + data.cost!.totalTokens);
          setTotalCost((prev) => prev + data.cost!.costUsd);
        }
      } else {
        // Remove optimistic message on error
        setMessages((prev) => prev.filter((msg) => msg.id !== optimisticUserMessage.id));
        toast.error(data.error || 'Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages((prev) => prev.filter((msg) => msg.id !== optimisticUserMessage.id));
      toast.error('Failed to send message');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length <= 4000) {
      setInput(value);

      // Auto-expand textarea
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        const newHeight = Math.min(textareaRef.current.scrollHeight, 120); // Max 5 lines
        textareaRef.current.style.height = `${newHeight}px`;
      }
    }
  };

  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success('Message copied to clipboard');
  };

  const regenerateResponse = async (messageId: string) => {
    // Find the user message before this assistant message
    const messageIndex = messages.findIndex((msg) => msg.id === messageId);
    if (messageIndex <= 0) return;

    const previousUserMessage = messages
      .slice(0, messageIndex)
      .reverse()
      .find((msg) => msg.role === 'user');

    if (!previousUserMessage) return;

    // Remove the assistant message and send the user message again
    setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
    setInput(previousUserMessage.content);
  };

  const clearConversation = () => {
    if (!confirm('Are you sure you want to clear this conversation?')) return;

    setMessages([]);
    setTotalTokens(0);
    setTotalCost(0);
    toast.success('Conversation cleared');
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const toggleToolExpansion = (messageId: string) => {
    setExpandedTools((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return newSet;
    });
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderMessage = (message: Message) => {
    const isUser = message.role === 'user';
    const isSystem = message.role === 'system';

    if (isSystem) {
      return (
        <div key={message.id} className="flex justify-center my-4">
          <div className="text-sm text-gray-500 italic px-4 py-2 bg-gray-50 rounded-lg">
            {message.content}
          </div>
        </div>
      );
    }

    return (
      <div
        key={message.id}
        className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4 group`}
      >
        <div
          className={`max-w-[80%] ${
            isUser
              ? 'bg-blue-600 text-white rounded-l-lg rounded-tr-lg'
              : 'bg-gray-100 text-gray-900 rounded-r-lg rounded-tl-lg'
          } px-4 py-3 shadow-sm`}
        >
          {/* Message Content */}
          <div className="prose prose-sm max-w-none">
            {isUser ? (
              <p className="whitespace-pre-wrap text-white m-0">{message.content}</p>
            ) : (
              <MessageMarkdown content={message.content} />
            )}
          </div>

          {/* Tool Calls */}
          {!isUser && message.tool_calls && message.tool_calls.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <button
                onClick={() => toggleToolExpansion(message.id)}
                className="flex items-center gap-2 text-xs text-gray-600 hover:text-gray-900"
              >
                {expandedTools.has(message.id) ? (
                  <ChevronUp className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
                <span>
                  {message.tool_calls.length} tool{message.tool_calls.length > 1 ? 's' : ''} used
                </span>
              </button>

              {expandedTools.has(message.id) && (
                <div className="mt-2 space-y-2">
                  {message.tool_calls.map((toolCall, idx) => {
                    const args = JSON.parse(toolCall.function.arguments || '{}');
                    const result = message.tool_results?.find(
                      (r) => r.tool_call_id === toolCall.id
                    );

                    return (
                      <div key={idx} className="bg-white rounded p-2 text-xs">
                        <div className="font-medium text-gray-700">
                          {toolCall.function.name}
                        </div>
                        <details className="mt-1">
                          <summary className="cursor-pointer text-gray-500">
                            Parameters
                          </summary>
                          <pre className="mt-1 text-xs bg-gray-50 p-2 rounded overflow-x-auto">
                            {JSON.stringify(args, null, 2)}
                          </pre>
                        </details>
                        {result && (
                          <details className="mt-1">
                            <summary className="cursor-pointer text-gray-500">
                              Result
                            </summary>
                            <pre
                              className={`mt-1 text-xs p-2 rounded overflow-x-auto ${
                                result.is_error ? 'bg-red-50 text-red-900' : 'bg-gray-50'
                              }`}
                            >
                              {result.content}
                            </pre>
                          </details>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Message Footer */}
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-200/50">
            <span
              className={`text-xs ${isUser ? 'text-blue-100' : 'text-gray-500'}`}
              title={new Date(message.created_at).toLocaleString()}
            >
              {formatTimestamp(message.created_at)}
            </span>

            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => copyMessage(message.content)}
                className={`p-1 rounded hover:bg-gray-200/50 ${
                  isUser ? 'text-blue-100 hover:text-white' : 'text-gray-500 hover:text-gray-900'
                }`}
                title="Copy message"
              >
                <Copy className="h-3 w-3" />
              </button>

              {!isUser && (
                <button
                  onClick={() => regenerateResponse(message.id)}
                  className="p-1 rounded hover:bg-gray-200/50 text-gray-500 hover:text-gray-900"
                  title="Regenerate response"
                >
                  <RotateCcw className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`flex flex-col h-full bg-white ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          {agent.avatar_url && (
            <img
              src={agent.avatar_url}
              alt={agent.name}
              className="w-10 h-10 rounded-full"
            />
          )}
          <div>
            <h3 className="font-semibold text-gray-900">{agent.name}</h3>
            <p className="text-sm text-gray-500">{agent.description}</p>
          </div>
        </div>

        <button
          onClick={clearConversation}
          className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          title="Clear conversation"
        >
          <Trash2 className="h-5 w-5" />
        </button>
      </div>

      {/* Messages Container */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        {isFetchingHistory ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-sm text-gray-500">Loading conversation...</p>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center max-w-md">
              <h4 className="text-lg font-medium text-gray-900 mb-2">
                Start a conversation with {agent.name}
              </h4>
              <p className="text-sm text-gray-500">{agent.description}</p>
            </div>
          </div>
        ) : (
          <>
            {messages.map(renderMessage)}

            {/* Typing Indicator */}
            {isLoading && (
              <div className="flex justify-start mb-4">
                <div className="bg-gray-100 rounded-r-lg rounded-tl-lg px-4 py-3">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Scroll to Bottom Button */}
      {showScrollButton && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-24 right-8 p-3 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors"
          title="Scroll to bottom"
        >
          <ArrowDown className="h-5 w-5" />
        </button>
      )}

      {/* Input Area */}
      <div className="border-t border-gray-200 p-4">
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={`Message ${agent.name}...`}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              style={{ minHeight: '52px', maxHeight: '120px' }}
              disabled={isLoading}
            />
            <div className="absolute bottom-2 right-2 text-xs text-gray-400">
              {input.length}/4000
            </div>
          </div>

          <button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            title="Send message (Cmd/Ctrl + Enter)"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>

        {/* Cost Display */}
        {totalTokens > 0 && (
          <div className="mt-2 flex items-center justify-end gap-4 text-xs text-gray-500">
            <span>{totalTokens.toLocaleString()} tokens</span>
            <span>${totalCost.toFixed(4)}</span>
          </div>
        )}

        {/* Keyboard Shortcut Hint */}
        <p className="mt-2 text-xs text-gray-400 text-center">
          Press <kbd className="px-1 py-0.5 bg-gray-100 border border-gray-300 rounded">Cmd</kbd> + <kbd className="px-1 py-0.5 bg-gray-100 border border-gray-300 rounded">Enter</kbd> to send
        </p>
      </div>
    </div>
  );
}

/**
 * MessageMarkdown Component
 * Renders markdown content with code syntax highlighting
 */
function MessageMarkdown({ content }: { content: string }) {
  // Simple markdown parsing without external dependencies
  const parseMarkdown = (text: string) => {
    // Handle code blocks
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    const parts: Array<{ type: 'text' | 'code'; content: string; language?: string }> = [];
    let lastIndex = 0;

    let match;
    while ((match = codeBlockRegex.exec(text)) !== null) {
      // Add text before code block
      if (match.index > lastIndex) {
        parts.push({
          type: 'text',
          content: text.slice(lastIndex, match.index),
        });
      }

      // Add code block
      parts.push({
        type: 'code',
        content: match[2],
        language: match[1] || 'text',
      });

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push({
        type: 'text',
        content: text.slice(lastIndex),
      });
    }

    return parts.length > 0 ? parts : [{ type: 'text' as const, content: text }];
  };

  const renderText = (text: string) => {
    // Handle inline code
    const inlineCodeRegex = /`([^`]+)`/g;
    const boldRegex = /\*\*([^*]+)\*\*/g;
    const italicRegex = /\*([^*]+)\*/g;
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;

    let processed = text;

    // Replace markdown syntax with HTML
    processed = processed.replace(boldRegex, '<strong>$1</strong>');
    processed = processed.replace(italicRegex, '<em>$1</em>');
    processed = processed.replace(inlineCodeRegex, '<code class="px-1 py-0.5 bg-gray-100 rounded text-sm">$1</code>');
    processed = processed.replace(linkRegex, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline">$1</a>');

    return <span dangerouslySetInnerHTML={{ __html: processed }} />;
  };

  const parts = parseMarkdown(content);

  return (
    <div className="space-y-2">
      {parts.map((part, idx) => {
        if (part.type === 'code') {
          return (
            <div key={idx} className="relative">
              <div className="absolute top-2 right-2 text-xs text-gray-500">
                {part.language}
              </div>
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
                <code>{part.content}</code>
              </pre>
            </div>
          );
        }

        return (
          <div key={idx} className="whitespace-pre-wrap">
            {renderText(part.content)}
          </div>
        );
      })}
    </div>
  );
}
