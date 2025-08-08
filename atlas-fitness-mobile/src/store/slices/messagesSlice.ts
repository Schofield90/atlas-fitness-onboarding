import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { supabase } from '@config/supabase';
import { Conversation, Message } from '@types/index';

interface MessagesState {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  messages: Message[];
  isLoading: boolean;
  isSending: boolean;
  error: string | null;
  unreadCount: number;
}

const initialState: MessagesState = {
  conversations: [],
  activeConversation: null,
  messages: [],
  isLoading: false,
  isSending: false,
  error: null,
  unreadCount: 0,
};

export const fetchConversations = createAsyncThunk(
  'messages/fetchConversations',
  async (userId: string) => {
    const { data, error } = await supabase
      .from('conversation_participants')
      .select(`
        conversations(
          *,
          conversation_participants(*, users(*)),
          messages(*)
        )
      `)
      .eq('user_id', userId)
      .order('conversations.last_message_at', { ascending: false });

    if (error) throw error;

    return data.map((item) => {
      const conversation = item.conversations;
      const lastMessage = conversation.messages
        .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

      // Calculate unread count
      const participant = conversation.conversation_participants.find((p: any) => p.user_id === userId);
      const unreadCount = conversation.messages.filter(
        (m: any) => new Date(m.created_at) > new Date(participant.last_read_at || 0)
      ).length;

      return {
        ...conversation,
        lastMessage,
        unreadCount,
        participants: conversation.conversation_participants.map((p: any) => ({
          ...p,
          user: p.users,
        })),
      };
    });
  }
);

export const fetchMessages = createAsyncThunk(
  'messages/fetchMessages',
  async ({ conversationId, userId }: { conversationId: string; userId: string }) => {
    const { data, error } = await supabase
      .from('messages')
      .select('*, users(*)')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    // Mark messages as read
    await supabase
      .from('conversation_participants')
      .update({ last_read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .eq('user_id', userId);

    return data.map((message) => ({
      ...message,
      sender: message.users,
    }));
  }
);

export const sendMessage = createAsyncThunk(
  'messages/sendMessage',
  async ({ conversationId, senderId, content, type = 'text' }: {
    conversationId: string;
    senderId: string;
    content: string;
    type?: 'text' | 'image' | 'file';
  }) => {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: senderId,
        content,
        type,
      })
      .select('*, users(*)')
      .single();

    if (error) throw error;

    // Update conversation last message time
    await supabase
      .from('conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', conversationId);

    return {
      ...data,
      sender: data.users,
    };
  }
);

export const createConversation = createAsyncThunk(
  'messages/createConversation',
  async ({ userId, participantIds, type = 'direct', name }: {
    userId: string;
    participantIds: string[];
    type?: 'direct' | 'group' | 'support';
    name?: string;
  }) => {
    // Create conversation
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .insert({
        type,
        name,
        last_message_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (convError) throw convError;

    // Add participants
    const participants = [userId, ...participantIds].map((id) => ({
      conversation_id: conversation.id,
      user_id: id,
      role: id === userId ? 'admin' : 'member',
      joined_at: new Date().toISOString(),
    }));

    const { error: partError } = await supabase
      .from('conversation_participants')
      .insert(participants);

    if (partError) throw partError;

    return conversation;
  }
);

const messagesSlice = createSlice({
  name: 'messages',
  initialState,
  reducers: {
    setActiveConversation: (state, action: PayloadAction<Conversation | null>) => {
      state.activeConversation = action.payload;
    },
    addMessage: (state, action: PayloadAction<Message>) => {
      if (state.activeConversation?.id === action.payload.conversationId) {
        state.messages.push(action.payload);
      }
    },
    updateUnreadCount: (state, action: PayloadAction<number>) => {
      state.unreadCount = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch conversations
      .addCase(fetchConversations.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchConversations.fulfilled, (state, action) => {
        state.isLoading = false;
        state.conversations = action.payload;
        state.unreadCount = action.payload.reduce((sum, conv) => sum + conv.unreadCount, 0);
      })
      .addCase(fetchConversations.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch conversations';
      })
      // Fetch messages
      .addCase(fetchMessages.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchMessages.fulfilled, (state, action) => {
        state.isLoading = false;
        state.messages = action.payload;
      })
      .addCase(fetchMessages.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch messages';
      })
      // Send message
      .addCase(sendMessage.pending, (state) => {
        state.isSending = true;
      })
      .addCase(sendMessage.fulfilled, (state, action) => {
        state.isSending = false;
        state.messages.push(action.payload);
      })
      .addCase(sendMessage.rejected, (state, action) => {
        state.isSending = false;
        state.error = action.error.message || 'Failed to send message';
      })
      // Create conversation
      .addCase(createConversation.fulfilled, (state, action) => {
        // Will refetch conversations after creation
        state.error = null;
      });
  },
});

export const { setActiveConversation, addMessage, updateUnreadCount, clearError } = messagesSlice.actions;
export default messagesSlice.reducer;