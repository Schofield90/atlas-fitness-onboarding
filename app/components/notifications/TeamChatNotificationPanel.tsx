"use client";

import { useState } from "react";
import {
  Bell,
  BellOff,
  X,
  Hash,
  AtSign,
  UserPlus,
  CheckCircle,
  Circle,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useTeamChatNotifications } from "./TeamChatNotificationProvider";

interface TeamChatNotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TeamChatNotificationPanel({
  isOpen,
  onClose,
}: TeamChatNotificationPanelProps) {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotification,
    isEnabled,
    toggleNotifications,
  } = useTeamChatNotifications();

  const [filter, setFilter] = useState<"all" | "unread" | "mentions">("all");

  if (!isOpen) return null;

  const filteredNotifications = notifications.filter((notification) => {
    if (filter === "unread") return !notification.read;
    if (filter === "mentions") return notification.type === "mention";
    return true;
  });

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "mention":
        return <AtSign className="w-4 h-4 text-blue-400" />;
      case "channel_invite":
        return <UserPlus className="w-4 h-4 text-green-400" />;
      default:
        return <Hash className="w-4 h-4 text-gray-400" />;
    }
  };

  const handleNotificationClick = (notification: any) => {
    markAsRead(notification.id);

    if (notification.channel_id) {
      // Navigate to the channel
      window.location.href = `/team-chat?channel=${notification.channel_id}`;
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end pt-16 pr-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative bg-gray-800 border border-gray-700 rounded-lg shadow-xl w-96 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <h2 className="text-lg font-semibold text-white">Team Chat</h2>
            {unreadCount > 0 && (
              <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-500 rounded-full">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {/* Notification Toggle */}
            <button
              onClick={toggleNotifications}
              className={`p-2 rounded-lg transition-colors ${
                isEnabled
                  ? "text-white hover:bg-gray-700"
                  : "text-gray-500 hover:bg-gray-700"
              }`}
              title={
                isEnabled ? "Disable notifications" : "Enable notifications"
              }
            >
              {isEnabled ? (
                <Bell className="w-4 h-4" />
              ) : (
                <BellOff className="w-4 h-4" />
              )}
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex space-x-1">
            {[
              { key: "all", label: "All" },
              { key: "unread", label: "Unread" },
              { key: "mentions", label: "Mentions" },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key as any)}
                className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                  filter === key
                    ? "bg-blue-600 text-white"
                    : "text-gray-300 hover:bg-gray-700"
                }`}
              >
                {label}
                {key === "unread" && unreadCount > 0 && (
                  <span className="ml-2 px-2 py-1 text-xs bg-red-500 rounded-full">
                    {unreadCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        {notifications.length > 0 && (
          <div className="p-4 border-b border-gray-700 flex justify-between">
            <button
              onClick={markAllAsRead}
              className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
              disabled={unreadCount === 0}
            >
              Mark all read
            </button>

            <span className="text-sm text-gray-400">
              {filteredNotifications.length} notification
              {filteredNotifications.length !== 1 ? "s" : ""}
            </span>
          </div>
        )}

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto">
          {!isEnabled && (
            <div className="p-4 text-center">
              <BellOff className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p className="text-gray-400 mb-4">Notifications are disabled</p>
              <button
                onClick={toggleNotifications}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Enable Notifications
              </button>
            </div>
          )}

          {isEnabled && filteredNotifications.length === 0 && (
            <div className="p-4 text-center">
              <Bell className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p className="text-gray-400">
                {filter === "all"
                  ? "No notifications yet"
                  : filter === "unread"
                    ? "No unread notifications"
                    : "No mentions yet"}
              </p>
            </div>
          )}

          {isEnabled &&
            filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 border-b border-gray-700 hover:bg-gray-750 transition-colors cursor-pointer ${
                  !notification.read ? "bg-gray-750" : ""
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex items-start space-x-3">
                  {/* Icon */}
                  <div className="flex-shrink-0 pt-1">
                    {getNotificationIcon(notification.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-white">
                          {notification.title}
                        </p>
                        <p className="text-sm text-gray-300 mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                        <div className="flex items-center space-x-2 mt-2">
                          <span className="text-xs text-gray-400">
                            {formatDistanceToNow(
                              new Date(notification.created_at),
                              { addSuffix: true },
                            )}
                          </span>
                          {notification.channel_name && (
                            <>
                              <span className="text-xs text-gray-500">•</span>
                              <span className="text-xs text-gray-400">
                                #{notification.channel_name}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Status & Actions */}
                      <div className="flex items-center space-x-2 ml-2">
                        {/* Read Status */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (notification.read) return;
                            markAsRead(notification.id);
                          }}
                          className="p-1 hover:bg-gray-600 rounded transition-colors"
                          title={
                            notification.read
                              ? "Mark as unread"
                              : "Mark as read"
                          }
                        >
                          {notification.read ? (
                            <CheckCircle className="w-4 h-4 text-green-400" />
                          ) : (
                            <Circle className="w-4 h-4 text-gray-400" />
                          )}
                        </button>

                        {/* Clear */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            clearNotification(notification.id);
                          }}
                          className="p-1 hover:bg-gray-600 rounded transition-colors"
                          title="Clear notification"
                        >
                          <X className="w-4 h-4 text-gray-400" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="p-4 border-t border-gray-700 text-center">
            <button
              onClick={() => {
                window.location.href = "/team-chat";
                onClose();
              }}
              className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
            >
              Open Team Chat
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
