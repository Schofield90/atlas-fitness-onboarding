"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useOrganization } from "../../hooks/useOrganization";
import type { Database } from "../../lib/supabase/database.types";

interface TeamChatNotification {
  id: string;
  type: "message" | "mention" | "channel_invite";
  title: string;
  message: string;
  channel_id?: string;
  channel_name?: string;
  user_name?: string;
  created_at: string;
  read: boolean;
}

interface TeamChatNotificationContextType {
  notifications: TeamChatNotification[];
  unreadCount: number;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  clearNotification: (notificationId: string) => void;
  isEnabled: boolean;
  toggleNotifications: () => void;
}

const TeamChatNotificationContext = createContext<
  TeamChatNotificationContextType | undefined
>(undefined);

export function useTeamChatNotifications() {
  const context = useContext(TeamChatNotificationContext);
  if (!context) {
    throw new Error(
      "useTeamChatNotifications must be used within a TeamChatNotificationProvider",
    );
  }
  return context;
}

interface TeamChatNotificationProviderProps {
  children: ReactNode;
}

export default function TeamChatNotificationProvider({
  children,
}: TeamChatNotificationProviderProps) {
  const [notifications, setNotifications] = useState<TeamChatNotification[]>(
    [],
  );
  const [isEnabled, setIsEnabled] = useState(true);
  const { organization, user } = useOrganization();

  // Only create supabase client on client side
  const [supabase, setSupabase] = useState<any>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const client = createClientComponentClient<Database>();
      setSupabase(client);
    }
  }, []);

  // Load notifications from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("team-chat-notifications-enabled");
      if (saved !== null) {
        setIsEnabled(JSON.parse(saved));
      }
    }
  }, []);

  // Request notification permission
  useEffect(() => {
    if (
      isEnabled &&
      "Notification" in window &&
      Notification.permission === "default"
    ) {
      Notification.requestPermission();
    }
  }, [isEnabled]);

  // Set up real-time subscriptions for new messages and mentions
  useEffect(() => {
    if (!organization?.id || !user?.id || !isEnabled || !supabase) return;

    // Subscribe to mentions
    const mentionsChannel = supabase
      .channel(`mentions:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "team_mentions",
          filter: `mentioned_user_id=eq.${user.id}`,
        },
        async (payload) => {
          const mention = payload.new as any;

          // Get message details
          const { data: message } = await supabase
            .from("team_messages")
            .select(
              `
              id,
              content,
              team_channels(id, name),
              user:users(full_name, email)
            `,
            )
            .eq("id", mention.message_id)
            .single();

          if (message) {
            const notification: TeamChatNotification = {
              id: mention.id,
              type: "mention",
              title: `Mentioned in #${(message as any).team_channels.name}`,
              message: `${(message as any).user.full_name || (message as any).user.email}: ${message.content.slice(0, 100)}${message.content.length > 100 ? "..." : ""}`,
              channel_id: (message as any).team_channels.id,
              channel_name: (message as any).team_channels.name,
              user_name:
                (message as any).user.full_name || (message as any).user.email,
              created_at: new Date().toISOString(),
              read: false,
            };

            setNotifications((prev) => [notification, ...prev.slice(0, 49)]); // Keep last 50

            // Show browser notification
            showBrowserNotification(notification);

            // Play notification sound
            playNotificationSound();
          }
        },
      )
      .subscribe();

    // Subscribe to new messages in channels where user has notifications enabled
    const messagesChannel = supabase
      .channel(`team_messages:${organization.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "team_messages",
          filter: `organization_id=eq.${organization.id}`,
        },
        async (payload) => {
          const message = payload.new as any;

          // Don't notify for own messages
          if (message.user_id === user.id) return;

          // Check if user is member of the channel with notifications enabled
          const { data: membership } = await supabase
            .from("team_channel_members")
            .select("notifications_enabled")
            .eq("channel_id", message.channel_id)
            .eq("user_id", user.id)
            .single();

          if (!membership?.notifications_enabled) return;

          // Get channel and user details
          const { data: details } = await supabase
            .from("team_messages")
            .select(
              `
              team_channels(id, name),
              user:users(full_name, email)
            `,
            )
            .eq("id", message.id)
            .single();

          if (details) {
            const notification: TeamChatNotification = {
              id: `message-${message.id}`,
              type: "message",
              title: `New message in #${(details as any).team_channels.name}`,
              message: `${(details as any).user.full_name || (details as any).user.email}: ${message.content.slice(0, 100)}${message.content.length > 100 ? "..." : ""}`,
              channel_id: (details as any).team_channels.id,
              channel_name: (details as any).team_channels.name,
              user_name:
                (details as any).user.full_name || (details as any).user.email,
              created_at: message.created_at,
              read: false,
            };

            setNotifications((prev) => [notification, ...prev.slice(0, 49)]); // Keep last 50

            // Only show browser notification if not currently viewing the channel
            const currentPath = window.location.pathname;
            const isViewingChat = currentPath === "/team-chat";

            if (!isViewingChat) {
              showBrowserNotification(notification);
              playNotificationSound();
            }
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(mentionsChannel);
      supabase.removeChannel(messagesChannel);
    };
  }, [organization?.id, user?.id, isEnabled, supabase]);

  const showBrowserNotification = (notification: TeamChatNotification) => {
    if (
      !isEnabled ||
      !("Notification" in window) ||
      Notification.permission !== "granted"
    ) {
      return;
    }

    const browserNotification = new Notification(notification.title, {
      body: notification.message,
      icon: "/logo-192.png", // Adjust path as needed
      tag: notification.id,
      requireInteraction: notification.type === "mention",
    });

    browserNotification.onclick = () => {
      window.focus();
      if (notification.channel_id) {
        // Navigate to the channel
        window.location.href = `/team-chat?channel=${notification.channel_id}`;
      }
      browserNotification.close();
    };

    // Auto-close after 5 seconds (except mentions)
    if (notification.type !== "mention") {
      setTimeout(() => browserNotification.close(), 5000);
    }
  };

  const playNotificationSound = () => {
    if (!isEnabled) return;

    try {
      // Create a simple notification sound
      const audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800;
      oscillator.type = "sine";

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(
        0.01,
        audioContext.currentTime + 0.5,
      );

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
      console.log("Could not play notification sound:", error);
    }
  };

  const markAsRead = (notificationId: string) => {
    setNotifications((prev) =>
      prev.map((notif) =>
        notif.id === notificationId ? { ...notif, read: true } : notif,
      ),
    );

    // Mark mention as read in database if it's a mention notification
    const notification = notifications.find((n) => n.id === notificationId);
    if (notification?.type === "mention" && supabase) {
      supabase
        .from("team_mentions")
        .update({ read: true })
        .eq("id", notificationId)
        .then(() => {})
        .catch(console.error);
    }
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((notif) => ({ ...notif, read: true })));

    // Mark all mentions as read in database
    const mentionIds = notifications
      .filter((n) => n.type === "mention" && !n.read)
      .map((n) => n.id);

    if (mentionIds.length > 0 && supabase) {
      supabase
        .from("team_mentions")
        .update({ read: true })
        .in("id", mentionIds)
        .then(() => {})
        .catch(console.error);
    }
  };

  const clearNotification = (notificationId: string) => {
    setNotifications((prev) =>
      prev.filter((notif) => notif.id !== notificationId),
    );
  };

  const toggleNotifications = () => {
    const newValue = !isEnabled;
    setIsEnabled(newValue);

    if (typeof window !== "undefined") {
      localStorage.setItem(
        "team-chat-notifications-enabled",
        JSON.stringify(newValue),
      );
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  const value: TeamChatNotificationContextType = {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotification,
    isEnabled,
    toggleNotifications,
  };

  return (
    <TeamChatNotificationContext.Provider value={value}>
      {children}
    </TeamChatNotificationContext.Provider>
  );
}
