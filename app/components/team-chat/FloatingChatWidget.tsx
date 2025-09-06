"use client";

import { useState, useEffect } from "react";
import { MessageCircle, X, Minimize2, Maximize2, Bell } from "lucide-react";
import { useTeamChatNotifications } from "../notifications/TeamChatNotificationProvider";
import TeamChatNotificationPanel from "../notifications/TeamChatNotificationPanel";

interface FloatingChatWidgetProps {
  className?: string;
}

export default function FloatingChatWidget({
  className = "",
}: FloatingChatWidgetProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  const { unreadCount } = useTeamChatNotifications();

  // Hide widget on team-chat page
  useEffect(() => {
    const checkPath = () => {
      const path = window.location.pathname;
      setIsVisible(path !== "/team-chat");
    };

    checkPath();

    // Listen for navigation changes
    const handlePopState = () => checkPath();
    window.addEventListener("popstate", handlePopState);

    // Also listen for pushState/replaceState (for client-side navigation)
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function (...args) {
      originalPushState.apply(history, args);
      checkPath();
    };

    history.replaceState = function (...args) {
      originalReplaceState.apply(history, args);
      checkPath();
    };

    return () => {
      window.removeEventListener("popstate", handlePopState);
      history.pushState = originalPushState;
      history.replaceState = originalReplaceState;
    };
  }, []);

  if (!isVisible) return null;

  const handleToggleExpanded = () => {
    setIsExpanded(!isExpanded);
    setIsMinimized(false);
  };

  const handleMinimize = () => {
    setIsMinimized(true);
    setIsExpanded(false);
  };

  const handleOpenFullChat = () => {
    window.open("/team-chat", "_blank");
  };

  if (isMinimized) {
    return (
      <div className={`fixed bottom-4 right-4 z-40 ${className}`}>
        <button
          onClick={() => setIsMinimized(false)}
          className="bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition-colors relative"
          title="Expand Team Chat"
        >
          <MessageCircle className="w-6 h-6" />
          {unreadCount > 0 && (
            <span className="absolute -top-2 -right-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-500 rounded-full">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </div>
    );
  }

  return (
    <>
      <div className={`fixed bottom-4 right-4 z-40 ${className}`}>
        {/* Compact Widget */}
        {!isExpanded && (
          <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl">
            <div className="flex items-center space-x-3 p-4">
              <button
                onClick={handleToggleExpanded}
                className="bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 transition-colors relative"
                title="Open Team Chat"
              >
                <MessageCircle className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-2 -right-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-500 rounded-full">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              <div className="flex-1">
                <h3 className="text-white font-medium">Team Chat</h3>
                <p className="text-gray-400 text-sm">
                  {unreadCount > 0
                    ? `${unreadCount} unread message${unreadCount !== 1 ? "s" : ""}`
                    : "Stay connected with your team"}
                </p>
              </div>

              <div className="flex flex-col space-y-2">
                {/* Notifications Button */}
                <button
                  onClick={() => setShowNotifications(true)}
                  className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors relative"
                  title="View notifications"
                >
                  <Bell className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
                  )}
                </button>

                {/* Minimize Button */}
                <button
                  onClick={handleMinimize}
                  className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
                  title="Minimize"
                >
                  <Minimize2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Expanded Widget */}
        {isExpanded && (
          <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl w-80 h-96 flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-gray-700 flex items-center justify-between">
              <h3 className="text-white font-medium">Team Chat</h3>
              <div className="flex items-center space-x-2">
                {/* Notifications Button */}
                <button
                  onClick={() => setShowNotifications(true)}
                  className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors relative"
                  title="View notifications"
                >
                  <Bell className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
                  )}
                </button>

                {/* Maximize Button */}
                <button
                  onClick={handleOpenFullChat}
                  className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
                  title="Open in new tab"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>

                {/* Close Button */}
                <button
                  onClick={() => setIsExpanded(false)}
                  className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 p-4 flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MessageCircle className="w-8 h-8 text-gray-400" />
                </div>
                <h4 className="text-white font-medium mb-2">
                  Quick Chat Access
                </h4>
                <p className="text-gray-400 text-sm mb-4">
                  Open the full chat experience to message your team
                </p>
                <div className="space-y-2">
                  <button
                    onClick={handleOpenFullChat}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Open Team Chat
                  </button>
                  {unreadCount > 0 && (
                    <button
                      onClick={() => setShowNotifications(true)}
                      className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors flex items-center justify-center space-x-2"
                    >
                      <Bell className="w-4 h-4" />
                      <span>
                        View {unreadCount} notification
                        {unreadCount !== 1 ? "s" : ""}
                      </span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-700 text-center">
              <p className="text-xs text-gray-400">
                {unreadCount > 0
                  ? `${unreadCount} unread message${unreadCount !== 1 ? "s" : ""}`
                  : "All caught up!"}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Notification Panel */}
      <TeamChatNotificationPanel
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
      />
    </>
  );
}
