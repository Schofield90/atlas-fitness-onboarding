"use client";

import { useState, useRef } from "react";
import { Button } from "@/app/components/ui/Button";
import {
  PhotoIcon,
  VideoCameraIcon,
  CloudArrowUpIcon,
  XMarkIcon,
  EyeIcon,
  DevicePhoneMobileIcon,
  ComputerDesktopIcon,
} from "@heroicons/react/24/outline";

interface CreativeData {
  name: string;
  title: string;
  body: string;
  call_to_action_type: string;
  link_url: string;
  display_url: string;
  image_url?: string;
  video_url?: string;
  creative_type: "single_image" | "video" | "carousel";
}

interface AdCreativeBuilderProps {
  creative: CreativeData;
  onChange: (creative: CreativeData) => void;
}

const CALL_TO_ACTION_OPTIONS = [
  { value: "LEARN_MORE", label: "Learn More" },
  { value: "SIGN_UP", label: "Sign Up" },
  { value: "BOOK_TRAVEL", label: "Book Now" },
  { value: "DOWNLOAD", label: "Download" },
  { value: "GET_QUOTE", label: "Get Quote" },
  { value: "CONTACT_US", label: "Contact Us" },
  { value: "APPLY_NOW", label: "Apply Now" },
  { value: "SUBSCRIBE", label: "Subscribe" },
  { value: "REQUEST_TIME", label: "Request Info" },
  { value: "SEE_MENU", label: "See Menu" },
  { value: "SHOP_NOW", label: "Shop Now" },
];

export function AdCreativeBuilder({
  creative,
  onChange,
}: AdCreativeBuilderProps) {
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">(
    "desktop",
  );
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateCreative = (updates: Partial<CreativeData>) => {
    onChange({ ...creative, ...updates });
  };

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append(
        "type",
        file.type.startsWith("video/") ? "video" : "image",
      );

      const response = await fetch("/api/ads/upload-creative", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        if (file.type.startsWith("video/")) {
          updateCreative({
            video_url: data.url,
            creative_type: "video",
            image_url: undefined,
          });
        } else {
          updateCreative({
            image_url: data.url,
            creative_type: "single_image",
            video_url: undefined,
          });
        }
      } else {
        throw new Error("Upload failed");
      }
    } catch (error) {
      console.error("Failed to upload file:", error);
      alert("Failed to upload file. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const removeMedia = () => {
    updateCreative({
      image_url: undefined,
      video_url: undefined,
      creative_type: "single_image",
    });
  };

  const generateAISuggestions = async () => {
    try {
      const response = await fetch("/api/ads/ai-suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          industry: "fitness",
          objective: "lead_generation",
        }),
      });

      if (response.ok) {
        const suggestions = await response.json();
        updateCreative({
          title: suggestions.title,
          body: suggestions.body,
        });
      }
    } catch (error) {
      console.error("Failed to get AI suggestions:", error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Creative Name */}
      <div>
        <label className="block text-sm font-medium mb-2">Creative Name</label>
        <input
          type="text"
          value={creative.name}
          onChange={(e) => updateCreative({ name: e.target.value })}
          placeholder="Enter creative name for internal reference"
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Media Upload */}
      <div>
        <label className="block text-sm font-medium mb-2">Media</label>

        {!creative.image_url && !creative.video_url ? (
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center hover:border-gray-500 transition-colors cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? (
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            ) : (
              <CloudArrowUpIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            )}
            <p className="text-gray-400 mb-2">
              {uploading
                ? "Uploading..."
                : "Drop your image or video here, or click to browse"}
            </p>
            <p className="text-sm text-gray-500">
              Supports: JPG, PNG, MP4, MOV (max 100MB)
            </p>

            <div className="flex justify-center space-x-4 mt-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploading}
              >
                <PhotoIcon className="h-4 w-4 mr-2" />
                Upload Image
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploading}
              >
                <VideoCameraIcon className="h-4 w-4 mr-2" />
                Upload Video
              </Button>
            </div>
          </div>
        ) : (
          <div className="relative">
            {creative.image_url && (
              <div className="relative">
                <img
                  src={creative.image_url}
                  alt="Creative"
                  className="w-full h-48 object-cover rounded-lg"
                />
                <button
                  onClick={removeMedia}
                  className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full hover:bg-red-700"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </div>
            )}

            {creative.video_url && (
              <div className="relative">
                <video
                  src={creative.video_url}
                  controls
                  className="w-full h-48 rounded-lg"
                />
                <button
                  onClick={removeMedia}
                  className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full hover:bg-red-700"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileUpload(file);
          }}
          className="hidden"
        />
      </div>

      {/* Ad Copy */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium">Headline</label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={generateAISuggestions}
                className="text-xs"
              >
                AI Suggest
              </Button>
            </div>
            <input
              type="text"
              value={creative.title}
              onChange={(e) => updateCreative({ title: e.target.value })}
              placeholder="Write a compelling headline..."
              maxLength={40}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="text-xs text-gray-400 mt-1">
              {creative.title.length}/40 characters
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Description
            </label>
            <textarea
              value={creative.body}
              onChange={(e) => updateCreative({ body: e.target.value })}
              placeholder="Describe your offer and what makes it compelling..."
              maxLength={125}
              rows={4}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
            <div className="text-xs text-gray-400 mt-1">
              {creative.body.length}/125 characters
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Call to Action
            </label>
            <select
              value={creative.call_to_action_type}
              onChange={(e) =>
                updateCreative({ call_to_action_type: e.target.value })
              }
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {CALL_TO_ACTION_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Destination URL
            </label>
            <input
              type="url"
              value={creative.link_url}
              onChange={(e) => updateCreative({ link_url: e.target.value })}
              placeholder="https://yourgym.com/signup"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Display URL (Optional)
            </label>
            <input
              type="text"
              value={creative.display_url}
              onChange={(e) => updateCreative({ display_url: e.target.value })}
              placeholder="yourgym.com"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="text-xs text-gray-400 mt-1">
              This will be shown instead of the full URL
            </div>
          </div>
        </div>

        {/* Live Preview */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <label className="block text-sm font-medium">Preview</label>
            <div className="flex space-x-2">
              <button
                onClick={() => setPreviewMode("desktop")}
                className={`p-2 rounded ${previewMode === "desktop" ? "bg-blue-600" : "bg-gray-700"}`}
              >
                <ComputerDesktopIcon className="h-4 w-4" />
              </button>
              <button
                onClick={() => setPreviewMode("mobile")}
                className={`p-2 rounded ${previewMode === "mobile" ? "bg-blue-600" : "bg-gray-700"}`}
              >
                <DevicePhoneMobileIcon className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div
            className={`bg-white text-black rounded-lg p-4 ${
              previewMode === "mobile" ? "max-w-xs mx-auto" : ""
            }`}
          >
            {/* Ad Header */}
            <div className="flex items-center space-x-2 mb-3">
              <div className="w-8 h-8 bg-blue-600 rounded-full"></div>
              <div>
                <div className="text-sm font-medium">Your Gym Name</div>
                <div className="text-xs text-gray-500">Sponsored</div>
              </div>
            </div>

            {/* Ad Content */}
            <div className="mb-3">
              <div className="text-sm mb-2">
                {creative.title || "Your headline will appear here"}
              </div>
              <div className="text-xs text-gray-600 mb-3">
                {creative.body || "Your description will appear here"}
              </div>
            </div>

            {/* Media */}
            {creative.image_url || creative.video_url ? (
              <div className="mb-3">
                {creative.image_url && (
                  <img
                    src={creative.image_url}
                    alt="Ad preview"
                    className="w-full h-32 object-cover rounded"
                  />
                )}
                {creative.video_url && (
                  <div className="w-full h-32 bg-gray-200 rounded flex items-center justify-center">
                    <VideoCameraIcon className="h-8 w-8 text-gray-400" />
                  </div>
                )}
              </div>
            ) : (
              <div className="w-full h-32 bg-gradient-to-r from-blue-500 to-purple-500 rounded mb-3 flex items-center justify-center">
                <span className="text-white font-medium">Your Media</span>
              </div>
            )}

            {/* Website Link */}
            {creative.link_url && (
              <div className="bg-gray-100 p-2 rounded mb-3">
                <div className="text-xs text-gray-500">
                  {creative.display_url ||
                    new URL(creative.link_url || "https://example.com")
                      .hostname}
                </div>
              </div>
            )}

            {/* CTA Button */}
            <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
              {CALL_TO_ACTION_OPTIONS.find(
                (opt) => opt.value === creative.call_to_action_type,
              )?.label || "Learn More"}
            </Button>
          </div>

          {/* Preview Controls */}
          <div className="mt-4 text-center">
            <div className="text-xs text-gray-400">
              {previewMode === "desktop" ? "Desktop Feed" : "Mobile Feed"}{" "}
              Preview
            </div>
          </div>
        </div>
      </div>

      {/* Creative Guidelines */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
        <h4 className="font-medium text-white mb-2">Creative Guidelines</h4>
        <ul className="text-sm text-gray-400 space-y-1">
          <li>• Use high-quality images or videos that showcase your gym</li>
          <li>• Keep headlines under 40 characters for best performance</li>
          <li>• Include a clear value proposition in your description</li>
          <li>
            • Test different call-to-action buttons to see what works best
          </li>
          <li>• Ensure your landing page matches your ad content</li>
        </ul>
      </div>
    </div>
  );
}
