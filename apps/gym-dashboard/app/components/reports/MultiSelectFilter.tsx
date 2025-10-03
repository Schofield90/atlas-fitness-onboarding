"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Search, X, Check } from "lucide-react";
import type { FilterOption } from "@/app/lib/reports/types";

interface MultiSelectFilterProps<T = string> {
  options: FilterOption<T>[];
  value: T[];
  onChange: (value: T[]) => void;
  label: string;
  placeholder?: string;
  searchable?: boolean;
  className?: string;
  disabled?: boolean;
  maxHeight?: string;
  showCount?: boolean;
  allowSelectAll?: boolean;
}

export default function MultiSelectFilter<T = string>({
  options,
  value,
  onChange,
  label,
  placeholder = "Select options...",
  searchable = true,
  className = "",
  disabled = false,
  maxHeight = "max-h-64",
  showCount = true,
  allowSelectAll = true,
}: MultiSelectFilterProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearchTerm("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen, searchable]);

  const filteredOptions =
    searchable && searchTerm
      ? options.filter(
          (option) =>
            option.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
            String(option.value)
              .toLowerCase()
              .includes(searchTerm.toLowerCase()),
        )
      : options;

  const handleToggleOption = (optionValue: T) => {
    if (disabled) return;

    const newValue = value.includes(optionValue)
      ? value.filter((v) => v !== optionValue)
      : [...value, optionValue];

    onChange(newValue);
  };

  const handleSelectAll = () => {
    if (disabled) return;

    const availableValues = filteredOptions
      .filter((option) => !option.disabled)
      .map((option) => option.value);

    onChange(value.length === availableValues.length ? [] : availableValues);
  };

  const handleClearAll = () => {
    if (disabled) return;
    onChange([]);
  };

  const getDisplayText = () => {
    if (value.length === 0) {
      return placeholder;
    }

    if (value.length === 1) {
      const selectedOption = options.find(
        (option) => option.value === value[0],
      );
      return selectedOption?.label || String(value[0]);
    }

    if (showCount) {
      return `${value.length} selected`;
    }

    return value
      .map((v) => {
        const option = options.find((option) => option.value === v);
        return option?.label || String(v);
      })
      .join(", ");
  };

  const allAvailableSelected = filteredOptions
    .filter((option) => !option.disabled)
    .every((option) => value.includes(option.value));

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <label className="block text-sm font-medium text-gray-300 mb-2">
        {label}
      </label>

      {/* Main Button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`flex items-center justify-between w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-left transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
          isOpen
            ? "ring-2 ring-orange-500 border-orange-500"
            : "hover:bg-gray-600"
        }`}
      >
        <span
          className={`text-sm ${value.length === 0 ? "text-gray-400" : "text-white"}`}
        >
          {getDisplayText()}
        </span>

        <div className="flex items-center gap-2">
          {value.length > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleClearAll();
              }}
              className="p-1 hover:bg-gray-600 rounded text-gray-400 hover:text-white transition-colors"
              title="Clear all"
            >
              <X className="h-3 w-3" />
            </button>
          )}
          <ChevronDown
            className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className={`absolute z-50 mt-1 w-full bg-gray-800 border border-gray-600 rounded-lg shadow-lg overflow-hidden ${maxHeight}`}
        >
          {/* Search Input */}
          {searchable && (
            <div className="p-2 border-b border-gray-600">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search options..."
                  className="w-full pl-9 pr-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
            </div>
          )}

          {/* Select All / Clear All */}
          {allowSelectAll && filteredOptions.length > 1 && (
            <div className="p-2 border-b border-gray-600">
              <button
                onClick={handleSelectAll}
                className="flex items-center gap-2 w-full px-2 py-1 text-sm text-gray-300 hover:bg-gray-700 rounded transition-colors"
              >
                <div
                  className={`flex items-center justify-center w-4 h-4 border border-gray-500 rounded ${
                    allAvailableSelected
                      ? "bg-orange-600 border-orange-600"
                      : ""
                  }`}
                >
                  {allAvailableSelected && (
                    <Check className="h-3 w-3 text-white" />
                  )}
                </div>
                <span className="font-medium">
                  {allAvailableSelected ? "Deselect All" : "Select All"}
                </span>
              </button>
            </div>
          )}

          {/* Options List */}
          <div className="overflow-y-auto max-h-48">
            {filteredOptions.length === 0 ? (
              <div className="p-3 text-center text-gray-400 text-sm">
                {searchTerm ? "No options found" : "No options available"}
              </div>
            ) : (
              <div className="py-1">
                {filteredOptions.map((option) => {
                  const isSelected = value.includes(option.value);
                  const isDisabled = option.disabled;

                  return (
                    <button
                      key={String(option.value)}
                      onClick={() =>
                        !isDisabled && handleToggleOption(option.value)
                      }
                      disabled={isDisabled}
                      className={`flex items-center gap-2 w-full px-3 py-2 text-sm text-left transition-colors ${
                        isDisabled
                          ? "text-gray-500 cursor-not-allowed"
                          : isSelected
                            ? "bg-gray-700 text-orange-400"
                            : "text-gray-300 hover:bg-gray-700"
                      }`}
                    >
                      <div
                        className={`flex items-center justify-center w-4 h-4 border border-gray-500 rounded ${
                          isSelected && !isDisabled
                            ? "bg-orange-600 border-orange-600"
                            : ""
                        }`}
                      >
                        {isSelected && !isDisabled && (
                          <Check className="h-3 w-3 text-white" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="truncate">{option.label}</div>
                        {option.count !== undefined && (
                          <div className="text-xs text-gray-500">
                            {option.count.toLocaleString()} items
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
