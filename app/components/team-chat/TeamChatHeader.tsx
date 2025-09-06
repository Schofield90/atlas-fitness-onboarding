"use client";

import { useState } from "react";
import {
  Hash,
  Lock,
  Users,
  Search,
  Settings,
  Star,
  Pin,
  MoreVertical,
  UserPlus,
  Bell,
  BellOff,
} from "lucide-react";
import type { Database } from "../../lib/supabase/database.types";

type TeamChannel = Database["public"]["Tables"]["team_channels"]["Row"];

interface TeamChatHeaderProps {
  channel: TeamChannel;
  memberCount: number;
  onInviteMembers?: () => void;
  onToggleNotifications?: () => void;
  onOpenSettings?: () => void;
}

export default function TeamChatHeader({
  channel,
  memberCount,
  onInviteMembers,
  onToggleNotifications,
  onOpenSettings,
}: TeamChatHeaderProps) {
  const [showChannelMenu, setShowChannelMenu] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const getChannelIcon = () => {
    if (channel.type === "direct_message") {
      return <div className="w-5 h-5 bg-green-500 rounded-full" />;
    }
    if (channel.is_private) {
      return <Lock className="w-5 h-5 text-gray-400" />;
    }
    return <Hash className="w-5 h-5 text-gray-400" />;
  };

  const getChannelTypeLabel = () => {
    if (channel.type === "direct_message") return "Direct Message";
    if (channel.is_private) return "Private Channel";
    return "Public Channel";
  };

  const handleToggleNotifications = () => {
    setNotificationsEnabled(!notificationsEnabled);
    onToggleNotifications?.();
  };

  const formatMemberCount = (count: number) => {
    if (count === 0) return "No members";
    if (count === 1) return "1 member";
    return `${count} members`;
  };

  return (
    <div className="h-16 bg-gray-800 border-b border-gray-700 px-4 flex items-center justify-between">
      {/* Left Side - Channel Info */}
      <div className="flex items-center space-x-3 min-w-0 flex-1">
        {/* Channel Icon & Name */}
        <div className="flex items-center space-x-2 min-w-0">
          {getChannelIcon()}
          <div className="min-w-0">
            <h1 className="text-lg font-semibold text-white truncate">
              {channel.name}
            </h1>
            {channel.description && (
              <p className="text-sm text-gray-400 truncate max-w-xs">
                {channel.description}
              </p>
            )}
          </div>
        </div>

        {/* Channel Indicators */}
        <div className="flex items-center space-x-2">
          {/* Starred */}
          <Star className="w-4 h-4 text-yellow-400 fill-current" />

          {/* Pinned Messages */}
          <Pin className="w-4 h-4 text-gray-400" />

          {/* Member Count */}
          <div className="flex items-center space-x-1 text-sm text-gray-400">
            <Users className="w-4 h-4" />
            <span>{formatMemberCount(memberCount)}</span>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      {showSearch && (
        <div className="flex-1 max-w-md mx-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search in this channel..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          </div>
        </div>
      )}

      {/* Right Side - Actions */}
      <div className="flex items-center space-x-2">
        {/* Search Toggle */}
        <button
          onClick={() => {
            setShowSearch(!showSearch);
            if (showSearch) {
              setSearchQuery("");
            }
          }}
          className={`p-2 rounded-lg transition-colors ${
            showSearch
              ? "bg-blue-600 text-white"
              : "text-gray-400 hover:text-white hover:bg-gray-700"
          }`}
          title="Search messages"
        >
          <Search className="w-5 h-5" />
        </button>

        {/* Notifications Toggle */}
        <button
          onClick={handleToggleNotifications}
          className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
          title={
            notificationsEnabled ? "Mute notifications" : "Enable notifications"
          }
        >
          {notificationsEnabled ? (
            <Bell className="w-5 h-5" />
          ) : (
            <BellOff className="w-5 h-5" />
          )}
        </button>

        {/* Invite Members */}
        {channel.type !== "direct_message" && (
          <button
            onClick={onInviteMembers}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
            title="Invite members"
          >
            <UserPlus className="w-5 h-5" />
          </button>
        )}

        {/* Channel Menu */}
        <div className="relative">
          <button
            onClick={() => setShowChannelMenu(!showChannelMenu)}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
            title="Channel options"
          >
            <MoreVertical className="w-5 h-5" />
          </button>

          {/* Dropdown Menu */}
          {showChannelMenu && (
            <div className="absolute right-0 top-full mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-lg py-2 min-w-[200px] z-10">
              {/* Channel Info */}
              <div className="px-4 py-2 border-b border-gray-600">
                <div className="flex items-center space-x-2 mb-1">
                  {getChannelIcon()}
                  <span className="font-semibold text-white">
                    {channel.name}
                  </span>
                </div>
                <p className="text-xs text-gray-400">{getChannelTypeLabel()}</p>
              </div>

              {/* Menu Items */}
              <div className="py-1">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `${window.location.origin}/team-chat?channel=${channel.id}`,
                    );
                    setShowChannelMenu(false);
                    // TODO: Show toast
                  }}
                  className="w-full px-4 py-2 text-left text-gray-300 hover:bg-gray-700 flex items-center space-x-3"
                >
                  <span>Copy link</span>
                </button>

                {channel.type !== "direct_message" && (
                  <>
                    <button
                      onClick={() => {
                        onInviteMembers?.();
                        setShowChannelMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-gray-300 hover:bg-gray-700 flex items-center space-x-3"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>Invite members</span>
                    </button>

                    <button className="w-full px-4 py-2 text-left text-gray-300 hover:bg-gray-700 flex items-center space-x-3">
                      <Users className="w-4 h-4" />
                      <span>View members</span>
                    </button>

                    <button className="w-full px-4 py-2 text-left text-gray-300 hover:bg-gray-700 flex items-center space-x-3">
                      <Pin className="w-4 h-4" />
                      <span>Pinned messages</span>
                    </button>
                  </>
                )}

                <hr className="my-1 border-gray-600" />

                <button
                  onClick={handleToggleNotifications}
                  className="w-full px-4 py-2 text-left text-gray-300 hover:bg-gray-700 flex items-center space-x-3"
                >
                  {notificationsEnabled ? (
                    <>
                      <BellOff className="w-4 h-4" />
                      <span>Mute notifications</span>
                    </>
                  ) : (
                    <>
                      <Bell className="w-4 h-4" />
                      <span>Enable notifications</span>
                    </>
                  )}
                </button>

                <button className="w-full px-4 py-2 text-left text-gray-300 hover:bg-gray-700 flex items-center space-x-3">
                  <Star className="w-4 h-4" />
                  <span>Add to starred</span>
                </button>

                {channel.type !== "direct_message" && (
                  <>
                    <hr className="my-1 border-gray-600" />

                    <button
                      onClick={() => {
                        onOpenSettings?.();
                        setShowChannelMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-gray-300 hover:bg-gray-700 flex items-center space-x-3"
                    >
                      <Settings className="w-4 h-4" />
                      <span>Channel settings</span>
                    </button>

                    <button className="w-full px-4 py-2 text-left text-red-400 hover:bg-gray-700 flex items-center space-x-3">
                      <span>Leave channel</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Click outside to close menus */}
      {(showChannelMenu || showSearch) && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => {
            setShowChannelMenu(false);
            if (showSearch && !searchQuery) {
              setShowSearch(false);
            }
          }}
        />
      )}
    </div>
  );
}
