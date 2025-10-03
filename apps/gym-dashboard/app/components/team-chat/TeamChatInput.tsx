"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  Paperclip,
  Send,
  Smile,
  AtSign,
  X,
  Image,
  FileText,
} from "lucide-react";

interface TeamChatInputProps {
  onSendMessage: (content: string, attachments?: File[]) => Promise<void>;
  onTyping: (isTyping: boolean) => void;
  placeholder?: string;
}

interface FilePreview {
  file: File;
  url: string;
  id: string;
}

export default function TeamChatInput({
  onSendMessage,
  onTyping,
  placeholder = "Type a message...",
}: TeamChatInputProps) {
  const [message, setMessage] = useState("");
  const [attachments, setAttachments] = useState<FilePreview[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionPosition, setMentionPosition] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Common emojis for quick access
  const COMMON_EMOJIS = [
    "😀",
    "😃",
    "😄",
    "😁",
    "😅",
    "😂",
    "🤣",
    "😊",
    "😇",
    "🙂",
    "🙃",
    "😉",
    "😌",
    "😍",
    "🥰",
    "😘",
    "👍",
    "👎",
    "👌",
    "✌️",
    "🤞",
    "🤟",
    "🤘",
    "👏",
    "🙌",
    "👐",
    "🤲",
    "🤝",
    "🙏",
    "❤️",
    "💛",
    "💚",
    "💙",
    "💜",
    "🖤",
    "🤍",
    "🤎",
    "💔",
    "❣️",
    "💕",
    "🎉",
    "🎊",
    "🎈",
    "🎁",
    "🎀",
    "🎂",
    "🍰",
    "🧁",
  ];

  // Handle typing indicators
  const handleInputChange = useCallback(
    (value: string) => {
      setMessage(value);

      // Trigger typing indicator
      onTyping(true);

      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Set timeout to stop typing indicator
      typingTimeoutRef.current = setTimeout(() => {
        onTyping(false);
      }, 2000);

      // Handle mentions
      const cursorPosition = textareaRef.current?.selectionStart || 0;
      const textBeforeCursor = value.slice(0, cursorPosition);
      const mentionMatch = textBeforeCursor.match(/@(\w*)$/);

      if (mentionMatch) {
        setMentionQuery(mentionMatch[1]);
        setMentionPosition(cursorPosition - mentionMatch[1].length - 1);
        setShowMentionSuggestions(true);
      } else {
        setShowMentionSuggestions(false);
        setMentionQuery("");
      }
    },
    [onTyping],
  );

  // Handle file selection
  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      const maxSize = 10 * 1024 * 1024; // 10MB
      const maxFiles = 5;

      if (attachments.length + files.length > maxFiles) {
        // TODO: Show error toast
        console.error(`Maximum ${maxFiles} files allowed`);
        return;
      }

      const validFiles = files.filter((file) => {
        if (file.size > maxSize) {
          console.error(`File ${file.name} is too large (max 10MB)`);
          return false;
        }
        return true;
      });

      const newAttachments = validFiles.map((file) => ({
        file,
        url: URL.createObjectURL(file),
        id: Math.random().toString(36).substr(2, 9),
      }));

      setAttachments((prev) => [...prev, ...newAttachments]);

      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [attachments.length],
  );

  // Remove attachment
  const removeAttachment = useCallback((id: string) => {
    setAttachments((prev) => {
      const attachment = prev.find((a) => a.id === id);
      if (attachment) {
        URL.revokeObjectURL(attachment.url);
      }
      return prev.filter((a) => a.id !== id);
    });
  }, []);

  // Handle emoji selection
  const handleEmojiSelect = useCallback(
    (emoji: string) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const cursorPosition = textarea.selectionStart || 0;
      const newMessage =
        message.slice(0, cursorPosition) +
        emoji +
        message.slice(cursorPosition);

      setMessage(newMessage);
      setShowEmojiPicker(false);

      // Focus back to textarea
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(
          cursorPosition + emoji.length,
          cursorPosition + emoji.length,
        );
      }, 0);
    },
    [message],
  );

  // Handle form submission
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!message.trim() && attachments.length === 0) return;
      if (isLoading) return;

      setIsLoading(true);

      try {
        await onSendMessage(
          message.trim(),
          attachments.length > 0 ? attachments.map((a) => a.file) : undefined,
        );

        // Clear form
        setMessage("");
        setAttachments((prev) => {
          // Cleanup URLs
          prev.forEach((attachment) => URL.revokeObjectURL(attachment.url));
          return [];
        });

        // Stop typing indicator
        onTyping(false);
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
      } catch (error) {
        console.error("Error sending message:", error);
        // TODO: Show error toast
      } finally {
        setIsLoading(false);
      }
    },
    [message, attachments, isLoading, onSendMessage, onTyping],
  );

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Send on Enter (but not Shift+Enter)
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit(e);
        return;
      }

      // Close emoji picker on Escape
      if (e.key === "Escape") {
        setShowEmojiPicker(false);
        setShowMentionSuggestions(false);
      }
    },
    [handleSubmit],
  );

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + "px";
    }
  }, [message]);

  // Cleanup URLs on unmount
  useEffect(() => {
    return () => {
      attachments.forEach((attachment) => URL.revokeObjectURL(attachment.url));
    };
  }, []);

  const getFileIcon = (file: File) => {
    if (file.type.startsWith("image/")) {
      return <Image className="w-4 h-4" />;
    }
    return <FileText className="w-4 h-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="border-t border-gray-700 bg-gray-800">
      {/* Attachment Previews */}
      {attachments.length > 0 && (
        <div className="p-4 border-b border-gray-700">
          <div className="flex flex-wrap gap-2">
            {attachments.map((attachment) => (
              <div key={attachment.id} className="relative group">
                {attachment.file.type.startsWith("image/") ? (
                  <div className="relative">
                    <img
                      src={attachment.url}
                      alt={attachment.file.name}
                      className="w-20 h-20 object-cover rounded-lg"
                    />
                    <button
                      onClick={() => removeAttachment(attachment.id)}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2 bg-gray-700 rounded-lg p-2 pr-8 relative">
                    {getFileIcon(attachment.file)}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate max-w-32">
                        {attachment.file.name}
                      </p>
                      <p className="text-xs text-gray-400">
                        {formatFileSize(attachment.file.size)}
                      </p>
                    </div>
                    <button
                      onClick={() => removeAttachment(attachment.id)}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="p-4">
        <div className="relative">
          <div className="flex items-end space-x-2">
            {/* File Attachment Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
              title="Attach files"
            >
              <Paperclip className="w-5 h-5" />
            </button>

            {/* Message Input */}
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => handleInputChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                className="w-full px-4 py-3 pr-20 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none min-h-[44px] max-h-[120px]"
                rows={1}
                disabled={isLoading}
              />

              {/* Emoji & Mention Buttons */}
              <div className="absolute right-2 bottom-2 flex items-center space-x-1">
                {/* Mention Button */}
                <button
                  type="button"
                  onClick={() => {
                    const textarea = textareaRef.current;
                    if (textarea) {
                      const cursorPosition = textarea.selectionStart;
                      const newMessage =
                        message.slice(0, cursorPosition) +
                        "@" +
                        message.slice(cursorPosition);
                      setMessage(newMessage);
                      setTimeout(() => {
                        textarea.focus();
                        textarea.setSelectionRange(
                          cursorPosition + 1,
                          cursorPosition + 1,
                        );
                      }, 0);
                    }
                  }}
                  className="p-1 text-gray-400 hover:text-white hover:bg-gray-600 rounded transition-colors"
                  title="Mention someone"
                >
                  <AtSign className="w-4 h-4" />
                </button>

                {/* Emoji Button */}
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="p-1 text-gray-400 hover:text-white hover:bg-gray-600 rounded transition-colors"
                  title="Add emoji"
                >
                  <Smile className="w-4 h-4" />
                </button>
              </div>

              {/* Emoji Picker */}
              {showEmojiPicker && (
                <div className="absolute bottom-full right-0 mb-2 bg-gray-800 border border-gray-600 rounded-lg p-3 shadow-lg z-10">
                  <div className="grid grid-cols-8 gap-1 max-w-xs">
                    {COMMON_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => handleEmojiSelect(emoji)}
                        className="p-2 hover:bg-gray-700 rounded transition-colors text-lg"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Mention Suggestions */}
              {showMentionSuggestions && (
                <div className="absolute bottom-full left-0 mb-2 bg-gray-800 border border-gray-600 rounded-lg shadow-lg z-10 min-w-48">
                  <div className="p-2">
                    <div className="text-xs text-gray-400 mb-2">
                      Mention someone
                    </div>
                    {/* TODO: Implement actual user search */}
                    <div className="text-sm text-gray-300">
                      Start typing to search for team members...
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Send Button */}
            <button
              type="submit"
              disabled={
                (!message.trim() && attachments.length === 0) || isLoading
              }
              className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Send message"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>

          {/* Character/File Count */}
          <div className="flex justify-between items-center mt-2 text-xs text-gray-400">
            <div>
              {attachments.length > 0 && (
                <span>{attachments.length}/5 files</span>
              )}
            </div>
            <div className="flex items-center space-x-2">
              {message.length > 1000 && (
                <span
                  className={
                    message.length > 2000 ? "text-red-400" : "text-yellow-400"
                  }
                >
                  {message.length}/2000
                </span>
              )}
              <span>Shift+Enter for new line</span>
            </div>
          </div>
        </div>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.csv,.xlsx,.pptx"
          onChange={handleFileSelect}
          className="hidden"
        />
      </form>
    </div>
  );
}
