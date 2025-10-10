"use client";

import React, { useState } from "react";
import { HexColorPicker } from "react-colorful";
import {
  Palette,
  Type,
  AlignLeft,
  AlignCenter,
  AlignRight,
  ChevronDown,
} from "lucide-react";

interface StyleControlsProps {
  // Color
  currentColor?: string;
  onColorChange?: (color: string) => void;

  // Font Size
  currentFontSize?: number;
  onFontSizeChange?: (size: number) => void;

  // Text Align
  currentAlign?: "left" | "center" | "right" | "justify";
  onAlignChange?: (align: "left" | "center" | "right" | "justify") => void;

  // Positioning
  position?: "floating" | "inline";
  className?: string;
}

export const StyleControls: React.FC<StyleControlsProps> = ({
  currentColor = "#374151",
  onColorChange,
  currentFontSize = 16,
  onFontSizeChange,
  currentAlign = "left",
  onAlignChange,
  position = "floating",
  className = "",
}) => {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showFontSizePicker, setShowFontSizePicker] = useState(false);

  const fontSizes = [
    { label: "XS", value: 12 },
    { label: "SM", value: 14 },
    { label: "Base", value: 16 },
    { label: "LG", value: 18 },
    { label: "XL", value: 20 },
    { label: "2XL", value: 24 },
    { label: "3XL", value: 30 },
    { label: "4XL", value: 36 },
  ];

  const baseClasses =
    position === "floating"
      ? "absolute z-50 bg-gray-900 text-white rounded-lg shadow-lg"
      : "flex items-center gap-2 bg-gray-100 rounded-lg p-2";

  return (
    <div className={`${baseClasses} ${className}`}>
      {/* Color Picker Button */}
      {onColorChange && (
        <div className="relative">
          <button
            onClick={() => {
              setShowColorPicker(!showColorPicker);
              setShowFontSizePicker(false);
            }}
            className="p-2 rounded hover:bg-gray-700 transition-colors flex items-center gap-1"
            title="Text Color"
          >
            <Palette className="w-4 h-4" />
            <div
              className="w-4 h-4 rounded border-2 border-white"
              style={{ backgroundColor: currentColor }}
            />
            <ChevronDown className="w-3 h-3" />
          </button>

          {showColorPicker && (
            <div className="absolute top-full mt-2 left-0 z-50 bg-white rounded-lg shadow-xl p-3">
              <HexColorPicker color={currentColor} onChange={onColorChange} />
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="text"
                  value={currentColor}
                  onChange={(e) => onColorChange(e.target.value)}
                  className="px-2 py-1 text-sm border rounded text-gray-900 w-24"
                  placeholder="#000000"
                />
                <button
                  onClick={() => setShowColorPicker(false)}
                  className="px-3 py-1 text-sm bg-gray-900 text-white rounded hover:bg-gray-700"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Font Size Picker */}
      {onFontSizeChange && (
        <div className="relative">
          <button
            onClick={() => {
              setShowFontSizePicker(!showFontSizePicker);
              setShowColorPicker(false);
            }}
            className="p-2 rounded hover:bg-gray-700 transition-colors flex items-center gap-1"
            title="Font Size"
          >
            <Type className="w-4 h-4" />
            <span className="text-xs">{currentFontSize}px</span>
            <ChevronDown className="w-3 h-3" />
          </button>

          {showFontSizePicker && (
            <div className="absolute top-full mt-2 left-0 z-50 bg-white rounded-lg shadow-xl p-3 min-w-[200px]">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-900 block">
                  Font Size
                </label>

                {/* Slider */}
                <input
                  type="range"
                  min="12"
                  max="72"
                  value={currentFontSize}
                  onChange={(e) => onFontSizeChange(parseInt(e.target.value))}
                  className="w-full"
                />

                {/* Preset Buttons */}
                <div className="grid grid-cols-4 gap-1">
                  {fontSizes.map((size) => (
                    <button
                      key={size.value}
                      onClick={() => onFontSizeChange(size.value)}
                      className={`px-2 py-1 text-xs rounded transition-colors ${
                        currentFontSize === size.value
                          ? "bg-gray-900 text-white"
                          : "bg-gray-100 text-gray-900 hover:bg-gray-200"
                      }`}
                    >
                      {size.label}
                    </button>
                  ))}
                </div>

                {/* Custom Input */}
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="8"
                    max="144"
                    value={currentFontSize}
                    onChange={(e) => onFontSizeChange(parseInt(e.target.value))}
                    className="px-2 py-1 text-sm border rounded text-gray-900 w-20"
                  />
                  <span className="text-sm text-gray-600">px</span>
                  <button
                    onClick={() => setShowFontSizePicker(false)}
                    className="ml-auto px-3 py-1 text-sm bg-gray-900 text-white rounded hover:bg-gray-700"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Text Alignment */}
      {onAlignChange && (
        <>
          <div className="w-px h-6 bg-gray-600" />

          <div className="flex items-center gap-1">
            <button
              onClick={() => onAlignChange("left")}
              className={`p-2 rounded hover:bg-gray-700 transition-colors ${
                currentAlign === "left" ? "bg-gray-700" : ""
              }`}
              title="Align Left"
            >
              <AlignLeft className="w-4 h-4" />
            </button>

            <button
              onClick={() => onAlignChange("center")}
              className={`p-2 rounded hover:bg-gray-700 transition-colors ${
                currentAlign === "center" ? "bg-gray-700" : ""
              }`}
              title="Align Center"
            >
              <AlignCenter className="w-4 h-4" />
            </button>

            <button
              onClick={() => onAlignChange("right")}
              className={`p-2 rounded hover:bg-gray-700 transition-colors ${
                currentAlign === "right" ? "bg-gray-700" : ""
              }`}
              title="Align Right"
            >
              <AlignRight className="w-4 h-4" />
            </button>
          </div>
        </>
      )}
    </div>
  );
};
