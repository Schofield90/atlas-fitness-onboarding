'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  Send, 
  MessageSquare,
  Clock,
  Check,
  CheckCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'react-hot-toast';

interface Message {
  id: string;
  content: string;
  sender_id: string;
  sender_type: 'coach' | 'client';
  message_type: string;
  read_at: string | null;
  created_at: string;
  users?: {
    id: string;
    name: string;
    email: string;
  };
}

interface MessageThreadProps {
  conversationId: string | null;
  clientName: string;
  clientAvatar?: string;
  onConversationCreate?: (conversationId: string) => void;
  className?: string;
}

export default function MessageThread({ 
  conversationId, 
  clientName, 
  clientAvatar,
  onConversationCreate,
  className 
}: MessageThreadProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [messageInput, setMessageInput] = useState('');
  const [sending, setSending] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (conversationId) {
      loadMessages();
    }
  }, [conversationId]);

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadMessages = async () => {
    if (!conversationId) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/conversations/${conversationId}/messages`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
      } else {
        toast.error('Failed to load messages');
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      toast.error('Error loading messages');
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!messageInput.trim()) return;

    const content = messageInput.trim();
    setMessageInput('');
    setSending(true);

    try {
      let targetConversationId = conversationId;

      // If no conversation exists, we need to create one first
      if (!targetConversationId) {
        // This should be handled by the parent component
        toast.error('Please create a conversation first');
        return;
      }

      const response = await fetch(`/api/conversations/${targetConversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(prev => [...prev, data.message]);
        toast.success('Message sent');
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to send message');
        setMessageInput(content); // Restore message on error
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Error sending message');
      setMessageInput(content); // Restore message on error
    } finally {
      setSending(false);
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  };

  const getMessageStatus = (message: Message) => {
    if (message.sender_type === 'client') return null;
    
    if (message.read_at) {
      return <CheckCheck className="h-3 w-3 text-blue-500" />;
    }
    return <Check className="h-3 w-3 text-gray-400" />;
  };

  if (!conversationId) {
    return (
      <div className={cn("flex flex-col h-full", className)}>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <MessageSquare className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Start a conversation</h3>
            <p className="text-gray-500 mb-4">
              Send a message to {clientName} to start the conversation
            </p>
            <div className="flex items-center gap-2 max-w-md">
              <Input
                placeholder="Type your first message..."
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (onConversationCreate && messageInput.trim()) {
                      onConversationCreate(messageInput.trim());
                      setMessageInput('');
                    }
                  }
                }}
                className="flex-1"
              />
              <Button 
                onClick={() => {
                  if (onConversationCreate && messageInput.trim()) {
                    onConversationCreate(messageInput.trim());
                    setMessageInput('');
                  }
                }}
                disabled={!messageInput.trim() || sending}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center gap-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src={clientAvatar} />
          <AvatarFallback>{clientName[0]?.toUpperCase()}</AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium">{clientName}</p>
          <p className="text-sm text-gray-500">Client</p>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-center">
            <div>
              <MessageSquare className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No messages yet</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex",
                  message.sender_type === 'coach' ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[70%] rounded-lg px-4 py-2",
                    message.sender_type === 'coach'
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-900"
                  )}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  <div className={cn(
                    "flex items-center justify-between gap-2 mt-1",
                    message.sender_type === 'coach' ? "text-blue-100" : "text-gray-500"
                  )}>
                    <span className="text-xs">{formatTime(message.created_at)}</span>
                    {getMessageStatus(message)}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      {/* Message Input */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center gap-2">
          <Input
            placeholder="Type a message..."
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            disabled={sending}
            className="flex-1"
          />
          <Button 
            onClick={sendMessage} 
            disabled={!messageInput.trim() || sending}
            size="sm"
          >
            {sending ? (
              <Clock className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}