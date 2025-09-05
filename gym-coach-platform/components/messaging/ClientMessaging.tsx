'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Plus } from 'lucide-react';
import MessageThread from './MessageThread';
import { toast } from 'react-hot-toast';

interface Conversation {
  id: string;
  title: string;
  status: string;
  last_message_at: string;
  created_at: string;
  last_message: string;
  unread_count: number;
  clients: {
    id: string;
    name: string;
    email: string;
  };
}

interface ClientMessagingProps {
  clientId: string;
  clientName: string;
  clientEmail: string;
}

export default function ClientMessaging({ 
  clientId, 
  clientName, 
  clientEmail 
}: ClientMessagingProps) {
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadConversation();
  }, [clientId]);

  const loadConversation = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/conversations?client_id=${clientId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.conversations && data.conversations.length > 0) {
          setConversation(data.conversations[0]);
        }
      } else {
        console.error('Failed to load conversation');
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
    } finally {
      setLoading(false);
    }
  };

  const createConversation = async (firstMessage?: string) => {
    setCreating(true);
    try {
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          client_id: clientId,
          title: `Conversation with ${clientName}`
        })
      });

      if (response.ok) {
        const data = await response.json();
        setConversation({
          ...data.conversation,
          last_message: '',
          unread_count: 0,
          clients: {
            id: clientId,
            name: clientName,
            email: clientEmail
          }
        });

        // If there's a first message, send it
        if (firstMessage) {
          await sendFirstMessage(data.conversation.id, firstMessage);
        }

        toast.success('Conversation started');
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to create conversation');
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast.error('Error creating conversation');
    } finally {
      setCreating(false);
    }
  };

  const sendFirstMessage = async (conversationId: string, content: string) => {
    try {
      await fetch(`/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      });
    } catch (error) {
      console.error('Error sending first message:', error);
    }
  };

  const handleConversationCreate = (firstMessage: string) => {
    createConversation(firstMessage);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Messages
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Messages
            {conversation && conversation.unread_count > 0 && (
              <Badge variant="default" className="ml-2">
                {conversation.unread_count} unread
              </Badge>
            )}
          </CardTitle>
          {!conversation && (
            <Button 
              onClick={() => createConversation()} 
              disabled={creating}
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              {creating ? 'Starting...' : 'Start Chat'}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="h-[500px]">
          <MessageThread
            conversationId={conversation?.id || null}
            clientName={clientName}
            clientAvatar={undefined}
            onConversationCreate={handleConversationCreate}
          />
        </div>
      </CardContent>
    </Card>
  );
}