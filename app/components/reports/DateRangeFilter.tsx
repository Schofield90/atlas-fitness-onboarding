"use client";

import { useState } from "react";
import { Calendar, ChevronDown } from "lucide-react";
import { DEFAULT_DATE_PRESETS, type DatePreset } from "@/app/lib/reports/query";
import { formatDate } from "@/app/lib/reports/formatting";

interface DateRangeFilterProps {
  value: {
    from: string;
    to: string;
    preset?: string;
  };
  onChange: (value: { from: string; to: string; preset?: string }) => void;
  timezone?: string;
  label?: string;
  className?: string;
  disabled?: boolean;
}

export default function DateRangeFilter({
  value,
  onChange,
  timezone = "UTC",
  label = "Date Range",
  className = "",
  disabled = false,
}: DateRangeFilterProps) {
  const [showCustomRange, setShowCustomRange] = useState(false);
  const [showPresets, setShowPresets] = useState(false);

  const handlePresetSelect = (preset: DatePreset) => {
    const { from, to } = preset.getValue();
    onChange({
      from: from.toISOString(),
      to: to.toISOString(),
      preset: preset.value,
    });
    setShowCustomRange(false);
    setShowPresets(false);
  };

  const handleCustomDateChange = (field: "from" | "to", dateValue: string) => {
    const date = new Date(dateValue);
    if (field === "from") {
      date.setHours(0, 0, 0, 0);
    } else {
      date.setHours(23, 59, 59, 999);
    }

    onChange({
      ...value,
      [field]: date.toISOString(),
      preset: undefined,
    });
  };

  const getCurrentPresetLabel = () => {
    if (value.preset) {
      const preset = DEFAULT_DATE_PRESETS.find((p) => p.value === value.preset);
      return preset?.label || "Custom Range";
    }
    return "Custom Range";
  };

  const getDateDisplayValue = () => {
    if (value.preset && value.preset !== "custom") {
      return getCurrentPresetLabel();
    }

    const fromDate = formatDate(value.from, "dd MMM yyyy", timezone);
    const toDate = formatDate(value.to, "dd MMM yyyy", timezone);
    return `${fromDate} - ${toDate}`;
  };

  return (
    <div className={`relative ${className}`}>
      <label className="block text-sm font-medium text-gray-300 mb-2">
        {label}
      </label>

      {/* Main Filter Button */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setShowPresets(!showPresets)}
          disabled={disabled}
          className="flex items-center justify-between w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-400" />
            <span className="text-sm">{getDateDisplayValue()}</span>
          </div>
          <ChevronDown
            className={`h-4 w-4 text-gray-400 transition-transform ${showPresets ? "rotate-180" : ""}`}
          />
        </button>

        {/* Dropdown Menu */}
        {showPresets && (
          <div className="absolute z-50 mt-1 w-full bg-gray-800 border border-gray-600 rounded-lg shadow-lg overflow-hidden">
            {/* Preset Options */}
            <div className="py-1">
              {DEFAULT_DATE_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  onClick={() => handlePresetSelect(preset)}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-700 transition-colors ${
                    value.preset === preset.value
                      ? "bg-gray-700 text-orange-400"
                      : "text-gray-300"
                  }`}
                >
                  <div>
                    <div className="font-medium">{preset.label}</div>
                    {preset.description && (
                      <div className="text-xs text-gray-500">
                        {preset.description}
                      </div>
                    )}
                  </div>
                </button>
              ))}

              {/* Custom Range Toggle */}
              <div className="border-t border-gray-600 mt-1 pt-1">
                <button
                  onClick={() => {
                    setShowCustomRange(!showCustomRange);
                    setShowPresets(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-700 transition-colors ${
                    showCustomRange ||
                    !value.preset ||
                    value.preset === "custom"
                      ? "bg-gray-700 text-orange-400"
                      : "text-gray-300"
                  }`}
                >
                  <div className="font-medium">Custom Range</div>
                  <div className="text-xs text-gray-500">
                    Select specific dates
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Custom Date Range Inputs */}
      {showCustomRange && (
        <div className="mt-3 p-3 bg-gray-800 border border-gray-600 rounded-lg">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">From</label>
              <input
                type="date"
                value={value.from ? value.from.split("T")[0] : ""}
                onChange={(e) => handleCustomDateChange("from", e.target.value)}
                disabled={disabled}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">To</label>
              <input
                type="date"
                value={value.to ? value.to.split("T")[0] : ""}
                onChange={(e) => handleCustomDateChange("to", e.target.value)}
                disabled={disabled}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:opacity-50"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-3">
            <button
              onClick={() => setShowCustomRange(false)}
              className="px-3 py-1 text-sm text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                setShowCustomRange(false);
                onChange({ ...value, preset: "custom" });
              }}
              className="px-3 py-1 bg-orange-600 hover:bg-orange-700 text-white text-sm rounded transition-colors"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
