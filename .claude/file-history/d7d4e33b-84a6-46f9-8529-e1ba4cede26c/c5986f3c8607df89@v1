"use client";

import { useState, useEffect, useCallback } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";
import { Suspense } from "react";
import TeamChatSidebar from "../components/team-chat/TeamChatSidebar";
import TeamChatMessages from "../components/team-chat/TeamChatMessages";
import TeamChatInput from "../components/team-chat/TeamChatInput";
import TeamChatHeader from "../components/team-chat/TeamChatHeader";
import { useOrganization } from "../hooks/useOrganization";
import type { Database } from "../lib/supabase/database.types";

type TeamChannel = Database["public"]["Tables"]["team_channels"]["Row"];
type TeamMessage = Database["public"]["Tables"]["team_messages"]["Row"] & {
  user: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    email: string;
  };
  reactions: Array<{
    id: string;
    emoji: string;
    user_id: string;
    user: {
      full_name: string | null;
    };
  }>;
  attachments: Array<{
    id: string;
    file_name: string;
    file_type: string;
    file_url: string;
    thumbnail_url: string | null;
  }>;
  thread_count?: number;
};

export default function TeamChatPage() {
  return (
    <Suspense fallback={<TeamChatLoadingSkeleton />}>
      <TeamChatPageContent />
    </Suspense>
  );
}

function TeamChatPageContent() {
  const [selectedChannel, setSelectedChannel] = useState<TeamChannel | null>(
    null,
  );
  const [messages, setMessages] = useState<TeamMessage[]>([]);
  const [channels, setChannels] = useState<TeamChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  const supabase = createClientComponentClient<Database>();
  const router = useRouter();
  const { organization, user } = useOrganization();

  // Load channels
  const loadChannels = useCallback(async () => {
    if (!organization?.id) return;

    try {
      const { data: channelsData, error } = await supabase
        .from("team_channels")
        .select(
          `
          *,
          team_channel_members!inner(
            user_id,
            last_read_at,
            notifications_enabled
          )
        `,
        )
        .eq("organization_id", organization.id)
        .eq("team_channel_members.user_id", user?.id)
        .is("archived_at", null)
        .order("created_at", { ascending: true });

      if (error) throw error;

      setChannels(channelsData || []);

      // Select first channel if none selected
      if (!selectedChannel && channelsData && channelsData.length > 0) {
        setSelectedChannel(channelsData[0]);
      }
    } catch (error) {
      console.error("Error loading channels:", error);
    }
  }, [organization?.id, user?.id, selectedChannel, supabase]);

  // Load messages for selected channel
  const loadMessages = useCallback(async () => {
    if (!selectedChannel?.id) return;

    try {
      const { data: messagesData, error } = await supabase
        .from("team_messages")
        .select(
          `
          *,
          user:users(id, full_name, avatar_url, email),
          team_message_reactions(
            id,
            emoji,
            user_id,
            user:users(full_name)
          ),
          team_message_attachments(
            id,
            file_name,
            file_type,
            file_url,
            thumbnail_url
          )
        `,
        )
        .eq("channel_id", selectedChannel.id)
        .is("thread_id", null) // Only get top-level messages for now
        .order("created_at", { ascending: true })
        .limit(100);

      if (error) throw error;

      setMessages(messagesData || []);

      // Mark channel as read
      await markChannelAsRead(selectedChannel.id);
    } catch (error) {
      console.error("Error loading messages:", error);
    }
  }, [selectedChannel?.id, supabase]);

  // Load unread counts
  const loadUnreadCounts = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase.rpc("get_unread_message_count", {
        user_uuid: user.id,
      });

      if (error) throw error;

      const counts: Record<string, number> = {};
      data?.forEach((item: { channel_id: string; unread_count: number }) => {
        counts[item.channel_id] = item.unread_count;
      });

      setUnreadCounts(counts);
    } catch (error) {
      console.error("Error loading unread counts:", error);
    }
  }, [user?.id, supabase]);

  // Mark channel as read
  const markChannelAsRead = useCallback(
    async (channelId: string) => {
      if (!user?.id) return;

      try {
        await supabase.rpc("mark_channel_as_read", {
          channel_uuid: channelId,
          user_uuid: user.id,
        });

        // Update local unread counts
        setUnreadCounts((prev) => ({
          ...prev,
          [channelId]: 0,
        }));
      } catch (error) {
        console.error("Error marking channel as read:", error);
      }
    },
    [user?.id, supabase],
  );

  // Send message
  const sendMessage = useCallback(
    async (content: string, attachments?: File[]) => {
      if (!selectedChannel?.id || !user?.id || !organization?.id) return;

      try {
        // Insert message
        const { data: messageData, error: messageError } = await supabase
          .from("team_messages")
          .insert({
            channel_id: selectedChannel.id,
            user_id: user.id,
            organization_id: organization.id,
            content,
            message_type:
              attachments && attachments.length > 0 ? "file" : "text",
          })
          .select("*")
          .single();

        if (messageError) throw messageError;

        // Handle file uploads
        if (attachments && attachments.length > 0 && messageData) {
          for (const file of attachments) {
            const fileExt = file.name.split(".").pop();
            const fileName = `${messageData.id}-${Date.now()}.${fileExt}`;
            const filePath = `chat-attachments/${organization.id}/${fileName}`;

            // Upload file to Supabase Storage
            const { error: uploadError } = await supabase.storage
              .from("attachments")
              .upload(filePath, file);

            if (uploadError) {
              console.error("Error uploading file:", uploadError);
              continue;
            }

            // Get public URL
            const { data: urlData } = supabase.storage
              .from("attachments")
              .getPublicUrl(filePath);

            // Insert attachment record
            await supabase.from("team_message_attachments").insert({
              message_id: messageData.id,
              organization_id: organization.id,
              file_name: file.name,
              file_type: file.type,
              file_size: file.size,
              file_url: urlData.publicUrl,
            });
          }
        }

        // Process mentions
        const mentionMatches = content.match(/@(\w+)/g);
        if (mentionMatches && messageData) {
          for (const mention of mentionMatches) {
            const username = mention.substring(1);

            // Find user by email or name (simplified)
            const { data: mentionedUsers } = await supabase
              .from("users")
              .select("id")
              .or(`email.ilike.%${username}%,full_name.ilike.%${username}%`)
              .limit(1);

            if (mentionedUsers && mentionedUsers.length > 0) {
              await supabase.from("team_mentions").insert({
                message_id: messageData.id,
                mentioned_user_id: mentionedUsers[0].id,
                mentioned_by_user_id: user.id,
                organization_id: organization.id,
                mention_type: "user",
              });
            }
          }
        }

        // Reload messages
        await loadMessages();
      } catch (error) {
        console.error("Error sending message:", error);
      }
    },
    [selectedChannel?.id, user?.id, organization?.id, supabase, loadMessages],
  );

  // Handle typing indicators
  const handleTyping = useCallback(
    async (isTyping: boolean) => {
      if (!selectedChannel?.id || !user?.id || !organization?.id) return;

      try {
        if (isTyping) {
          await supabase.from("team_typing_indicators").upsert({
            channel_id: selectedChannel.id,
            user_id: user.id,
            organization_id: organization.id,
            expires_at: new Date(Date.now() + 10000).toISOString(), // 10 seconds
          });
        } else {
          await supabase
            .from("team_typing_indicators")
            .delete()
            .eq("channel_id", selectedChannel.id)
            .eq("user_id", user.id);
        }
      } catch (error) {
        console.error("Error handling typing indicator:", error);
      }
    },
    [selectedChannel?.id, user?.id, organization?.id, supabase],
  );

  // React to message
  const handleReaction = useCallback(
    async (messageId: string, emoji: string) => {
      if (!user?.id || !organization?.id) return;

      try {
        // Check if user already reacted with this emoji
        const { data: existingReaction } = await supabase
          .from("team_message_reactions")
          .select("id")
          .eq("message_id", messageId)
          .eq("user_id", user.id)
          .eq("emoji", emoji)
          .single();

        if (existingReaction) {
          // Remove reaction
          await supabase
            .from("team_message_reactions")
            .delete()
            .eq("id", existingReaction.id);
        } else {
          // Add reaction
          await supabase.from("team_message_reactions").insert({
            message_id: messageId,
            user_id: user.id,
            organization_id: organization.id,
            emoji,
          });
        }

        // Reload messages to update reactions
        await loadMessages();
      } catch (error) {
        console.error("Error handling reaction:", error);
      }
    },
    [user?.id, organization?.id, supabase, loadMessages],
  );

  // Set up real-time subscriptions
  useEffect(() => {
    if (!organization?.id || !user?.id) return;

    // Subscribe to new messages in current channel
    const messagesChannel = supabase
      .channel(`team_messages:${selectedChannel?.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "team_messages",
          filter: `channel_id=eq.${selectedChannel?.id}`,
        },
        () => {
          loadMessages();
        },
      )
      .subscribe();

    // Subscribe to typing indicators
    const typingChannel = supabase
      .channel(`typing:${selectedChannel?.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "team_typing_indicators",
          filter: `channel_id=eq.${selectedChannel?.id}`,
        },
        async () => {
          if (!selectedChannel?.id) return;

          const { data } = await supabase
            .from("team_typing_indicators")
            .select(
              `
              user_id,
              user:users(full_name)
            `,
            )
            .eq("channel_id", selectedChannel.id)
            .gt("expires_at", new Date().toISOString())
            .neq("user_id", user.id);

          setTypingUsers(
            data?.map((t: any) => t.user.full_name || "Someone") || [],
          );
        },
      )
      .subscribe();

    // Subscribe to channel updates
    const channelsChannel = supabase
      .channel(`team_channels:${organization.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "team_channels",
          filter: `organization_id=eq.${organization.id}`,
        },
        () => {
          loadChannels();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(typingChannel);
      supabase.removeChannel(channelsChannel);
    };
  }, [
    organization?.id,
    user?.id,
    selectedChannel?.id,
    supabase,
    loadMessages,
    loadChannels,
  ]);

  // Initial data loading
  useEffect(() => {
    if (organization?.id && user?.id) {
      setLoading(true);
      Promise.all([loadChannels(), loadUnreadCounts()]).finally(() =>
        setLoading(false),
      );
    }
  }, [organization?.id, user?.id, loadChannels, loadUnreadCounts]);

  // Load messages when channel changes
  useEffect(() => {
    if (selectedChannel?.id) {
      loadMessages();
    }
  }, [selectedChannel?.id, loadMessages]);

  if (!organization || !user) {
    router.push("/signin");
    return null;
  }

  if (loading) {
    return <TeamChatLoadingSkeleton />;
  }

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      {/* Sidebar */}
      <div className="w-80 border-r border-gray-700 flex-shrink-0">
        <TeamChatSidebar
          channels={channels}
          selectedChannel={selectedChannel}
          onChannelSelect={setSelectedChannel}
          unreadCounts={unreadCounts}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedChannel ? (
          <>
            {/* Header */}
            <TeamChatHeader
              channel={selectedChannel}
              memberCount={0} // TODO: Get actual member count
            />

            {/* Messages */}
            <div className="flex-1 overflow-hidden">
              <TeamChatMessages
                messages={messages}
                currentUserId={user.id}
                onReaction={handleReaction}
                typingUsers={typingUsers}
              />
            </div>

            {/* Input */}
            <TeamChatInput
              onSendMessage={sendMessage}
              onTyping={handleTyping}
              placeholder={`Message #${selectedChannel.name}`}
            />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-gray-400">
              <h2 className="text-2xl font-semibold mb-2">
                Welcome to Team Chat
              </h2>
              <p>Select a channel to start messaging</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TeamChatLoadingSkeleton() {
  return (
    <div className="flex h-screen bg-gray-900 text-white">
      <div className="w-80 border-r border-gray-700 p-4">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-700 rounded mb-4"></div>
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-6 bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
      <div className="flex-1 flex flex-col">
        <div className="h-16 bg-gray-800 border-b border-gray-700 animate-pulse"></div>
        <div className="flex-1 p-4 space-y-4 animate-pulse">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex space-x-3">
              <div className="w-8 h-8 bg-gray-700 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-700 rounded mb-2"></div>
                <div className="h-3 bg-gray-700 rounded w-2/3"></div>
              </div>
            </div>
          ))}
        </div>
        <div className="h-20 bg-gray-800 border-t border-gray-700 animate-pulse"></div>
      </div>
    </div>
  );
}
