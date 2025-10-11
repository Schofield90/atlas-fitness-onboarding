"use client";

import React, { useState } from "react";
import { ComponentProps } from "../types";
import { TextComponent } from "./TextComponent";
import { InlineTextEditor } from "../InlineTextEditor";
import { Sparkles } from "lucide-react";

interface EditableTextProps extends ComponentProps {
  content?: string;
  fontSize?: "small" | "base" | "large" | "xl" | "2xl";
  fontWeight?: "normal" | "medium" | "semibold" | "bold";
  textAlign?: "left" | "center" | "right" | "justify";
  textColor?: string;
  lineHeight?: "tight" | "normal" | "relaxed";
  maxWidth?: "none" | "prose" | "screen";
  isEditing?: boolean;
  onUpdate?: (content: string) => void;
  onAIRewrite?: () => void;
}

export const EditableTextComponent: React.FC<EditableTextProps> = ({
  content = "Enter your text content here...",
  fontSize = "base",
  fontWeight = "normal",
  textAlign = "left",
  textColor = "#374151",
  lineHeight = "normal",
  maxWidth = "prose",
  className = "",
  isEditing = false,
  onUpdate,
  onAIRewrite,
}) => {
  const [localContent, setLocalContent] = useState(content);
  const [isEditMode, setIsEditMode] = useState(false);

  const handleContentChange = (newContent: string) => {
    setLocalContent(newContent);
    if (onUpdate) {
      onUpdate(newContent);
    }
  };

  const sizeMap = {
    small: "text-sm",
    base: "text-base",
    large: "text-lg",
    xl: "text-xl",
    "2xl": "text-2xl",
  };

  const weightMap = {
    normal: "font-normal",
    medium: "font-medium",
    semibold: "font-semibold",
    bold: "font-bold",
  };

  const alignMap = {
    left: "text-left",
    center: "text-center",
    right: "text-right",
    justify: "text-justify",
  };

  const lineHeightMap = {
    tight: "leading-tight",
    normal: "leading-normal",
    relaxed: "leading-relaxed",
  };

  const maxWidthMap = {
    none: "",
    prose: "max-w-prose",
    screen: "max-w-screen-xl",
  };

  // When in builder mode (isEditing), show editable version
  if (isEditing) {
    return (
      <div
        className={`
          relative group cursor-text
          ${sizeMap[fontSize]}
          ${weightMap[fontWeight]}
          ${alignMap[textAlign]}
          ${lineHeightMap[lineHeight]}
          ${maxWidthMap[maxWidth]}
          ${textAlign === "center" && maxWidth !== "none" ? "mx-auto" : ""}
          ${className}
        `}
        style={{ color: textColor }}
        onClick={() => setIsEditMode(true)}
        onBlur={() => setIsEditMode(false)}
      >
        {isEditMode ? (
          <InlineTextEditor
            content={localContent}
            onChange={handleContentChange}
            placeholder="Click to edit text..."
            onAIRewrite={onAIRewrite}
            className={`${sizeMap[fontSize]} ${weightMap[fontWeight]} ${lineHeightMap[lineHeight]}`}
          />
        ) : (
          <>
            <TextComponent
              content={localContent}
              fontSize={fontSize}
              fontWeight={fontWeight}
              textAlign={textAlign}
              textColor={textColor}
              lineHeight={lineHeight}
              maxWidth={maxWidth}
              className={className}
            />

            {/* Edit indicator */}
            <div className="absolute -top-8 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="bg-gray-900 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                Click to edit
                {onAIRewrite && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onAIRewrite();
                    }}
                    className="ml-1 p-1 hover:bg-purple-600 rounded"
                    title="Improve with AI"
                  >
                    <Sparkles className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  // Published view - just render static content
  return (
    <TextComponent
      content={localContent}
      fontSize={fontSize}
      fontWeight={fontWeight}
      textAlign={textAlign}
      textColor={textColor}
      lineHeight={lineHeight}
      maxWidth={maxWidth}
      className={className}
    />
  );
};
