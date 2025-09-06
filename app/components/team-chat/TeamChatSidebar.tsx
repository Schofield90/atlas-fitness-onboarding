'use client';

import { useState } from 'react';
import { Hash, Lock, Plus, Search, Settings, Users } from 'lucide-react';
import type { Database } from '../../lib/supabase/database.types';

type TeamChannel = Database['public']['Tables']['team_channels']['Row'];

interface TeamChatSidebarProps {
  channels: TeamChannel[];
  selectedChannel: TeamChannel | null;
  onChannelSelect: (channel: TeamChannel) => void;
  unreadCounts: Record<string, number>;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export default function TeamChatSidebar({
  channels,
  selectedChannel,
  onChannelSelect,
  unreadCounts,
  searchQuery,
  onSearchChange
}: TeamChatSidebarProps) {
  const [showCreateChannel, setShowCreateChannel] = useState(false);

  // Filter channels based on search
  const filteredChannels = channels.filter(channel =>
    channel.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (channel.description && channel.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Group channels by type
  const publicChannels = filteredChannels.filter(channel => !channel.is_private);
  const privateChannels = filteredChannels.filter(channel => channel.is_private);
  const directMessages = filteredChannels.filter(channel => channel.type === 'direct_message');

  const getChannelIcon = (channel: TeamChannel) => {
    if (channel.type === 'direct_message') {
      return <div className="w-4 h-4 bg-green-500 rounded-full" />;
    }
    if (channel.is_private) {
      return <Lock className="w-4 h-4 text-gray-400" />;
    }
    return <Hash className="w-4 h-4 text-gray-400" />;
  };

  const getUnreadBadge = (channelId: string) => {
    const count = unreadCounts[channelId];
    if (!count || count === 0) return null;

    return (
      <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-500 rounded-full">
        {count > 99 ? '99+' : count}
      </span>
    );
  };

  return (
    <div className="h-full flex flex-col bg-gray-800">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <h1 className="text-xl font-bold text-white mb-4">Team Chat</h1>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search channels..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Channels List */}
      <div className="flex-1 overflow-y-auto">
        {/* Public Channels */}
        {publicChannels.length > 0 && (
          <div className="p-2">
            <div className="flex items-center justify-between px-2 py-2 text-sm font-semibold text-gray-400 uppercase tracking-wide">
              <span>Channels</span>
              <button
                onClick={() => setShowCreateChannel(true)}
                className="p-1 hover:bg-gray-700 rounded transition-colors"
                title="Create Channel"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-1">
              {publicChannels.map((channel) => (
                <button
                  key={channel.id}
                  onClick={() => onChannelSelect(channel)}
                  className={`w-full flex items-center justify-between px-2 py-2 rounded-lg text-left transition-colors ${
                    selectedChannel?.id === channel.id
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  <div className="flex items-center space-x-3 min-w-0 flex-1">
                    {getChannelIcon(channel)}
                    <span className="font-medium truncate">{channel.name}</span>
                  </div>
                  {getUnreadBadge(channel.id)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Private Channels */}
        {privateChannels.length > 0 && (
          <div className="p-2">
            <div className="flex items-center justify-between px-2 py-2 text-sm font-semibold text-gray-400 uppercase tracking-wide">
              <span>Private Channels</span>
            </div>
            <div className="space-y-1">
              {privateChannels.map((channel) => (
                <button
                  key={channel.id}
                  onClick={() => onChannelSelect(channel)}
                  className={`w-full flex items-center justify-between px-2 py-2 rounded-lg text-left transition-colors ${
                    selectedChannel?.id === channel.id
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  <div className="flex items-center space-x-3 min-w-0 flex-1">
                    {getChannelIcon(channel)}
                    <span className="font-medium truncate">{channel.name}</span>
                  </div>
                  {getUnreadBadge(channel.id)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Direct Messages */}
        {directMessages.length > 0 && (
          <div className="p-2">
            <div className="flex items-center justify-between px-2 py-2 text-sm font-semibold text-gray-400 uppercase tracking-wide">
              <span>Direct Messages</span>
              <button
                className="p-1 hover:bg-gray-700 rounded transition-colors"
                title="New Direct Message"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-1">
              {directMessages.map((channel) => (
                <button
                  key={channel.id}
                  onClick={() => onChannelSelect(channel)}
                  className={`w-full flex items-center justify-between px-2 py-2 rounded-lg text-left transition-colors ${
                    selectedChannel?.id === channel.id
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  <div className="flex items-center space-x-3 min-w-0 flex-1">
                    {getChannelIcon(channel)}
                    <span className="font-medium truncate">{channel.name}</span>
                  </div>
                  {getUnreadBadge(channel.id)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {filteredChannels.length === 0 && (
          <div className="p-4 text-center text-gray-400">
            {searchQuery ? (
              <div>
                <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No channels found matching "{searchQuery}"</p>
              </div>
            ) : (
              <div>
                <Hash className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No channels available</p>
                <button
                  onClick={() => setShowCreateChannel(true)}
                  className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Create First Channel
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-700">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-400">
            {channels.length} channels
          </div>
          <button
            className="p-2 hover:bg-gray-700 rounded transition-colors"
            title="Chat Settings"
          >
            <Settings className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Create Channel Modal */}
      {showCreateChannel && (
        <CreateChannelModal
          onClose={() => setShowCreateChannel(false)}
          onChannelCreated={() => {
            setShowCreateChannel(false);
            // Channel list will be updated via real-time subscription
          }}
        />
      )}
    </div>
  );
}

interface CreateChannelModalProps {
  onClose: () => void;
  onChannelCreated: () => void;
}

function CreateChannelModal({ onClose, onChannelCreated }: CreateChannelModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      const response = await fetch('/api/team-chat/channels', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          isPrivate,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create channel');
      }

      onChannelCreated();
    } catch (error) {
      console.error('Error creating channel:', error);
      // TODO: Show error toast
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold text-white mb-4">Create Channel</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Channel Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. marketing, design-team"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              maxLength={50}
              required
            />
            <p className="mt-1 text-xs text-gray-400">
              Lowercase letters, numbers, and hyphens only
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Description (Optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this channel about?"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={3}
            />
          </div>

          <div>
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
              />
              <div>
                <span className="text-sm font-medium text-gray-300">Make private</span>
                <p className="text-xs text-gray-400">
                  Only specific people can access this channel
                </p>
              </div>
            </label>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              disabled={loading || !name.trim()}
            >
              {loading ? 'Creating...' : 'Create Channel'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}