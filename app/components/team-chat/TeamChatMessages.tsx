'use client';

import { useState, useEffect, useRef } from 'react';
import { format, isToday, isYesterday } from 'date-fns';
import { MoreVertical, Reply, Edit, Trash, Download, Eye } from 'lucide-react';
import type { Database } from '../../lib/supabase/database.types';

type TeamMessage = Database['public']['Tables']['team_messages']['Row'] & {
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

interface TeamChatMessagesProps {
  messages: TeamMessage[];
  currentUserId: string;
  onReaction: (messageId: string, emoji: string) => void;
  typingUsers: string[];
}

const COMMON_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '😡', '🎉', '🚀'];

export default function TeamChatMessages({
  messages,
  currentUserId,
  onReaction,
  typingUsers
}: TeamChatMessagesProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);
  const [showMessageMenu, setShowMessageMenu] = useState<string | null>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Close menus on click outside
  useEffect(() => {
    const handleClickOutside = () => {
      setShowEmojiPicker(null);
      setShowMessageMenu(null);
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const formatMessageTime = (createdAt: string) => {
    const date = new Date(createdAt);
    
    if (isToday(date)) {
      return format(date, 'h:mm a');
    } else if (isYesterday(date)) {
      return `Yesterday ${format(date, 'h:mm a')}`;
    } else {
      return format(date, 'MMM d, h:mm a');
    }
  };

  const getDateSeparator = (currentMessage: TeamMessage, previousMessage: TeamMessage | null) => {
    const currentDate = new Date(currentMessage.created_at);
    const previousDate = previousMessage ? new Date(previousMessage.created_at) : null;

    if (!previousDate || currentDate.toDateString() !== previousDate.toDateString()) {
      if (isToday(currentDate)) {
        return 'Today';
      } else if (isYesterday(currentDate)) {
        return 'Yesterday';
      } else {
        return format(currentDate, 'MMMM d, yyyy');
      }
    }

    return null;
  };

  const shouldGroupWithPrevious = (currentMessage: TeamMessage, previousMessage: TeamMessage | null) => {
    if (!previousMessage) return false;
    
    const timeDiff = new Date(currentMessage.created_at).getTime() - new Date(previousMessage.created_at).getTime();
    const isSameUser = currentMessage.user_id === previousMessage.user_id;
    const withinGroupingTime = timeDiff < 5 * 60 * 1000; // 5 minutes
    
    return isSameUser && withinGroupingTime;
  };

  const getUserAvatarUrl = (user: TeamMessage['user']) => {
    if (user.avatar_url) return user.avatar_url;
    
    // Generate a color based on user ID
    const colors = [
      'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500',
      'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500'
    ];
    const colorIndex = user.id.charCodeAt(0) % colors.length;
    const initials = user.full_name?.split(' ').map(n => n[0]).join('') || user.email[0].toUpperCase();
    
    return { color: colors[colorIndex], initials };
  };

  const handleEmojiClick = (messageId: string, emoji: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onReaction(messageId, emoji);
    setShowEmojiPicker(null);
  };

  const renderAttachment = (attachment: TeamMessage['attachments'][0]) => {
    const isImage = attachment.file_type.startsWith('image/');
    const isVideo = attachment.file_type.startsWith('video/');
    const isAudio = attachment.file_type.startsWith('audio/');

    if (isImage) {
      return (
        <div key={attachment.id} className="mt-2">
          <img
            src={attachment.thumbnail_url || attachment.file_url}
            alt={attachment.file_name}
            className="max-w-sm rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => window.open(attachment.file_url, '_blank')}
          />
        </div>
      );
    }

    if (isVideo) {
      return (
        <div key={attachment.id} className="mt-2">
          <video
            src={attachment.file_url}
            controls
            className="max-w-sm rounded-lg"
            poster={attachment.thumbnail_url || undefined}
          />
        </div>
      );
    }

    if (isAudio) {
      return (
        <div key={attachment.id} className="mt-2">
          <audio src={attachment.file_url} controls className="w-full max-w-sm" />
        </div>
      );
    }

    // Generic file attachment
    return (
      <div key={attachment.id} className="mt-2">
        <div className="flex items-center space-x-3 p-3 bg-gray-700 rounded-lg max-w-sm">
          <div className="w-10 h-10 bg-gray-600 rounded flex items-center justify-center">
            <span className="text-xs font-semibold">
              {attachment.file_name.split('.').pop()?.toUpperCase() || 'FILE'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {attachment.file_name}
            </p>
            <p className="text-xs text-gray-400">
              {(attachment.file_size / 1024 / 1024).toFixed(1)} MB
            </p>
          </div>
          <a
            href={attachment.file_url}
            download={attachment.file_name}
            className="p-2 hover:bg-gray-600 rounded transition-colors"
          >
            <Download className="w-4 h-4 text-gray-400" />
          </a>
        </div>
      </div>
    );
  };

  const renderReactions = (reactions: TeamMessage['reactions']) => {
    if (reactions.length === 0) return null;

    // Group reactions by emoji
    const groupedReactions = reactions.reduce((acc, reaction) => {
      if (!acc[reaction.emoji]) {
        acc[reaction.emoji] = [];
      }
      acc[reaction.emoji].push(reaction);
      return acc;
    }, {} as Record<string, typeof reactions>);

    return (
      <div className="flex flex-wrap gap-1 mt-2">
        {Object.entries(groupedReactions).map(([emoji, reactionList]) => {
          const hasUserReacted = reactionList.some(r => r.user_id === currentUserId);
          const users = reactionList.map(r => r.user.full_name || 'Someone').join(', ');
          
          return (
            <button
              key={emoji}
              onClick={() => onReaction(reactionList[0].message_id, emoji)}
              className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs transition-colors ${
                hasUserReacted
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
              title={users}
            >
              <span>{emoji}</span>
              <span>{reactionList.length}</span>
            </button>
          );
        })}
      </div>
    );
  };

  const renderMessage = (message: TeamMessage, index: number) => {
    const previousMessage = index > 0 ? messages[index - 1] : null;
    const dateSeparator = getDateSeparator(message, previousMessage);
    const groupWithPrevious = shouldGroupWithPrevious(message, previousMessage);
    const avatarData = getUserAvatarUrl(message.user);
    const isCurrentUser = message.user_id === currentUserId;

    return (
      <div key={message.id}>
        {/* Date Separator */}
        {dateSeparator && (
          <div className="flex items-center my-4">
            <div className="flex-1 border-t border-gray-600"></div>
            <span className="px-4 text-xs text-gray-400 font-medium">
              {dateSeparator}
            </span>
            <div className="flex-1 border-t border-gray-600"></div>
          </div>
        )}

        {/* Message */}
        <div className={`group relative ${groupWithPrevious ? 'mt-1' : 'mt-4'}`}>
          <div className="flex items-start space-x-3">
            {/* Avatar */}
            <div className={`w-8 h-8 rounded-full flex-shrink-0 ${groupWithPrevious ? 'invisible' : ''}`}>
              {typeof avatarData === 'string' ? (
                <img
                  src={avatarData}
                  alt={message.user.full_name || message.user.email}
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold ${avatarData.color}`}>
                  {avatarData.initials}
                </div>
              )}
            </div>

            {/* Message Content */}
            <div className="flex-1 min-w-0">
              {/* User Info */}
              {!groupWithPrevious && (
                <div className="flex items-baseline space-x-2 mb-1">
                  <span className="font-semibold text-white">
                    {message.user.full_name || message.user.email}
                  </span>
                  <span className="text-xs text-gray-400">
                    {formatMessageTime(message.created_at)}
                  </span>
                  {message.edited && (
                    <span className="text-xs text-gray-400">(edited)</span>
                  )}
                </div>
              )}

              {/* Message Text */}
              <div className={`text-gray-200 break-words ${groupWithPrevious ? 'hover:bg-gray-800 rounded px-2 py-1 -mx-2 -my-1' : ''}`}>
                {message.content}
              </div>

              {/* Attachments */}
              {message.attachments.map(renderAttachment)}

              {/* Reactions */}
              {renderReactions(message.reactions)}

              {/* Thread Count */}
              {message.thread_count && message.thread_count > 0 && (
                <button className="mt-2 text-xs text-blue-400 hover:text-blue-300 flex items-center space-x-1">
                  <Reply className="w-3 h-3" />
                  <span>{message.thread_count} replies</span>
                </button>
              )}
            </div>

            {/* Message Actions */}
            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="flex items-center space-x-1">
                {/* Quick Reactions */}
                <div className="flex items-center space-x-1 bg-gray-800 rounded-lg px-2 py-1">
                  {COMMON_EMOJIS.slice(0, 3).map((emoji) => (
                    <button
                      key={emoji}
                      onClick={(e) => handleEmojiClick(message.id, emoji, e)}
                      className="hover:bg-gray-700 rounded p-1 transition-colors"
                      title={`React with ${emoji}`}
                    >
                      {emoji}
                    </button>
                  ))}
                  
                  {/* More Reactions */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowEmojiPicker(showEmojiPicker === message.id ? null : message.id);
                    }}
                    className="hover:bg-gray-700 rounded p-1 transition-colors"
                  >
                    <span className="text-xs">😊</span>
                  </button>
                </div>

                {/* Message Menu */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMessageMenu(showMessageMenu === message.id ? null : message.id);
                  }}
                  className="p-1 hover:bg-gray-700 rounded transition-colors"
                >
                  <MoreVertical className="w-4 h-4 text-gray-400" />
                </button>
              </div>

              {/* Emoji Picker */}
              {showEmojiPicker === message.id && (
                <div className="absolute right-0 top-8 z-10 bg-gray-800 border border-gray-600 rounded-lg p-2 shadow-lg">
                  <div className="grid grid-cols-4 gap-1">
                    {COMMON_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={(e) => handleEmojiClick(message.id, emoji, e)}
                        className="p-2 hover:bg-gray-700 rounded transition-colors"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Message Menu */}
              {showMessageMenu === message.id && (
                <div className="absolute right-0 top-8 z-10 bg-gray-800 border border-gray-600 rounded-lg py-2 shadow-lg min-w-[160px]">
                  <button className="w-full px-4 py-2 text-left text-gray-300 hover:bg-gray-700 flex items-center space-x-2">
                    <Reply className="w-4 h-4" />
                    <span>Reply</span>
                  </button>
                  {isCurrentUser && (
                    <>
                      <button className="w-full px-4 py-2 text-left text-gray-300 hover:bg-gray-700 flex items-center space-x-2">
                        <Edit className="w-4 h-4" />
                        <span>Edit</span>
                      </button>
                      <button className="w-full px-4 py-2 text-left text-red-400 hover:bg-gray-700 flex items-center space-x-2">
                        <Trash className="w-4 h-4" />
                        <span>Delete</span>
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center text-gray-400">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-700 rounded-full flex items-center justify-center">
                💬
              </div>
              <h3 className="text-lg font-semibold mb-2">No messages yet</h3>
              <p>Be the first to send a message in this channel!</p>
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            {messages.map(renderMessage)}
            
            {/* Typing Indicators */}
            {typingUsers.length > 0 && (
              <div className="flex items-center space-x-3 mt-4 opacity-60">
                <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
                  <div className="flex space-x-1">
                    <div className="w-1 h-1 bg-gray-400 rounded-full animate-pulse"></div>
                    <div className="w-1 h-1 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-1 h-1 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                </div>
                <div className="text-sm text-gray-400">
                  {typingUsers.length === 1
                    ? `${typingUsers[0]} is typing...`
                    : typingUsers.length === 2
                    ? `${typingUsers[0]} and ${typingUsers[1]} are typing...`
                    : `${typingUsers[0]} and ${typingUsers.length - 1} others are typing...`
                  }
                </div>
              </div>
            )}
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}