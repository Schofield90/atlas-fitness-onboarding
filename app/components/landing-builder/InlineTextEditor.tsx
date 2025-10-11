"use client";

import React, { useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { Color } from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import {
  Bold,
  Italic,
  Link as LinkIcon,
  Heading1,
  Heading2,
  Heading3,
  Sparkles,
} from "lucide-react";
import { StyleControls } from "./StyleControls";

interface InlineTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  onAIRewrite?: () => void;
  className?: string;
}

export const InlineTextEditor: React.FC<InlineTextEditorProps> = ({
  content,
  onChange,
  placeholder = "Start typing...",
  onAIRewrite,
  className = "",
}) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-blue-600 underline",
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      TextStyle,
      Color,
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: `prose prose-sm sm:prose lg:prose-lg xl:prose-2xl focus:outline-none ${className.replace(/\s+/g, ' ').trim()}`,
      },
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  if (!editor) {
    return null;
  }

  const setLink = () => {
    const url = window.prompt("Enter URL:");
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  };

  // Get current text color from editor
  const getCurrentColor = () => {
    return editor.getAttributes("textStyle").color || "#374151";
  };

  return (
    <div className="relative group">
      {/* Floating Toolbar */}
      {editor.isActive && (
        <div className="absolute -top-12 left-0 z-50 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
          <div className="flex items-center gap-1 bg-gray-900 text-white rounded-lg shadow-lg p-1">
            <button
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={`p-2 rounded hover:bg-gray-700 transition-colors ${
                editor.isActive("bold") ? "bg-gray-700" : ""
              }`}
              title="Bold"
            >
              <Bold className="w-4 h-4" />
            </button>

            <button
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={`p-2 rounded hover:bg-gray-700 transition-colors ${
                editor.isActive("italic") ? "bg-gray-700" : ""
              }`}
              title="Italic"
            >
              <Italic className="w-4 h-4" />
            </button>

            <div className="w-px h-6 bg-gray-600" />

            <button
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: 1 }).run()
              }
              className={`p-2 rounded hover:bg-gray-700 transition-colors ${
                editor.isActive("heading", { level: 1 }) ? "bg-gray-700" : ""
              }`}
              title="Heading 1"
            >
              <Heading1 className="w-4 h-4" />
            </button>

            <button
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: 2 }).run()
              }
              className={`p-2 rounded hover:bg-gray-700 transition-colors ${
                editor.isActive("heading", { level: 2 }) ? "bg-gray-700" : ""
              }`}
              title="Heading 2"
            >
              <Heading2 className="w-4 h-4" />
            </button>

            <button
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: 3 }).run()
              }
              className={`p-2 rounded hover:bg-gray-700 transition-colors ${
                editor.isActive("heading", { level: 3 }) ? "bg-gray-700" : ""
              }`}
              title="Heading 3"
            >
              <Heading3 className="w-4 h-4" />
            </button>

            <div className="w-px h-6 bg-gray-600" />

            <button
              onClick={setLink}
              className={`p-2 rounded hover:bg-gray-700 transition-colors ${
                editor.isActive("link") ? "bg-gray-700" : ""
              }`}
              title="Add Link"
            >
              <LinkIcon className="w-4 h-4" />
            </button>

            <div className="w-px h-6 bg-gray-600" />

            {/* Style Controls */}
            <StyleControls
              currentColor={getCurrentColor()}
              onColorChange={(color) => {
                editor.chain().focus().setColor(color).run();
              }}
              position="floating"
              className="flex items-center gap-1"
            />

            {onAIRewrite && (
              <>
                <div className="w-px h-6 bg-gray-600" />
                <button
                  onClick={onAIRewrite}
                  className="p-2 rounded hover:bg-purple-600 transition-colors bg-purple-700"
                  title="Improve with AI"
                >
                  <Sparkles className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Editor */}
      <EditorContent editor={editor} />
    </div>
  );
};
