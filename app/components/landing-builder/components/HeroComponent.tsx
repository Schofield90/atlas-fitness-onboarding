"use client";

import React from "react";
import { ComponentProps } from "../types";
import { EditableTextComponent } from "./EditableTextComponent";

interface HeroProps extends ComponentProps {
  title?: string;
  subtitle?: string;
  description?: string;
  primaryButton?: { label: string; href: string };
  secondaryButton?: { label: string; href: string };
  backgroundImage?: string;
  backgroundColor?: string;
  textColor?: string;
  alignment?: "left" | "center" | "right";
  height?: "small" | "medium" | "large" | "full";
  isEditing?: boolean;
  onUpdate?: (field: string, value: string) => void;
  onAIRewrite?: (field: string) => void;
}

export const HeroComponent: React.FC<HeroProps> = ({
  title = "Welcome to Your Site",
  subtitle = "Subheading text here",
  description = "Add your compelling description here to engage visitors and explain your value proposition.",
  primaryButton,
  secondaryButton,
  backgroundImage,
  backgroundColor = "#f3f4f6",
  textColor = "#111827",
  alignment = "center",
  height = "large",
  className = "",
  isEditing = false,
  onUpdate,
  onAIRewrite,
}) => {
  const heightMap = {
    small: "min-h-[300px]",
    medium: "min-h-[500px]",
    large: "min-h-[700px]",
    full: "min-h-screen",
  };

  const alignmentMap = {
    left: "text-left items-start",
    center: "text-center items-center",
    right: "text-right items-end",
  };

  return (
    <section
      className={`relative ${heightMap[height]} flex items-center ${className}`}
      style={{
        backgroundColor: !backgroundImage ? backgroundColor : undefined,
        backgroundImage: backgroundImage
          ? `url(${backgroundImage})`
          : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
        color: textColor,
      }}
    >
      {backgroundImage && (
        <div className="absolute inset-0 bg-black bg-opacity-40" />
      )}

      <div className="container mx-auto px-4 relative z-10">
        <div
          className={`max-w-3xl ${alignment === "center" ? "mx-auto" : alignment === "right" ? "ml-auto" : ""}`}
        >
          <div className={`flex flex-col ${alignmentMap[alignment]}`}>
            {subtitle && (
              <EditableTextComponent
                content={subtitle}
                fontSize="large"
                fontWeight="normal"
                textColor={textColor}
                textAlign={alignment}
                className="mb-2 opacity-90"
                isEditing={isEditing}
                onUpdate={(newContent) => onUpdate?.("subtitle", newContent)}
                onAIRewrite={() => onAIRewrite?.("subtitle")}
              />
            )}

            <EditableTextComponent
              content={`<h1 class="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">${title}</h1>`}
              textColor={textColor}
              textAlign={alignment}
              isEditing={isEditing}
              onUpdate={(newContent) => onUpdate?.("title", newContent)}
              onAIRewrite={() => onAIRewrite?.("title")}
            />

            {description && (
              <EditableTextComponent
                content={description}
                fontSize="xl"
                fontWeight="normal"
                textColor={textColor}
                textAlign={alignment}
                className="mb-8 opacity-90 max-w-2xl"
                isEditing={isEditing}
                onUpdate={(newContent) => onUpdate?.("description", newContent)}
                onAIRewrite={() => onAIRewrite?.("description")}
              />
            )}

            <div className="flex gap-4 flex-wrap">
              {primaryButton && (
                <a
                  href={isEditing ? undefined : primaryButton.href}
                  onClick={isEditing ? (e) => e.preventDefault() : undefined}
                  className="bg-blue-600 text-white px-8 py-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors inline-block cursor-pointer"
                >
                  {primaryButton.label}
                </a>
              )}

              {secondaryButton && (
                <a
                  href={isEditing ? undefined : secondaryButton.href}
                  onClick={isEditing ? (e) => e.preventDefault() : undefined}
                  className="border-2 border-current px-8 py-4 rounded-lg font-semibold hover:bg-white hover:text-gray-900 transition-colors inline-block cursor-pointer"
                >
                  {secondaryButton.label}
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
