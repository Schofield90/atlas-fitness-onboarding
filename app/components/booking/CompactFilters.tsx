"use client";

import React, { useState } from "react";
import { Filter, Calendar, Clock, Users, ChevronDown } from "lucide-react";
import Button from "../ui/Button";
import {
  navigateDate,
  formatDateRange,
  CalendarView,
} from "@/app/lib/utils/calendar-navigation";

interface CompactFiltersProps {
  classes: any[];
  onFilter: (filteredClasses: any[]) => void;
  view: CalendarView;
  currentDate: Date;
  onViewChange: (view: CalendarView) => void;
  onDateChange: (date: Date) => void;
}

const CompactFilters: React.FC<CompactFiltersProps> = ({
  classes,
  onFilter,
  view,
  currentDate,
  onViewChange,
  onDateChange,
}) => {
  const [showFilters, setShowFilters] = useState(false);
  const [selectedClassType, setSelectedClassType] = useState("all");
  const [selectedInstructor, setSelectedInstructor] = useState("all");
  const [selectedTimeRange, setSelectedTimeRange] = useState("all");

  // Get unique class types and instructors
  const classTypes = Array.from(
    new Set(classes.map((c) => c.program?.name || "Unknown").filter(Boolean)),
  );
  const instructors = Array.from(
    new Set(classes.map((c) => c.instructor_name || "TBD").filter(Boolean)),
  );

  const navigate = (direction: "prev" | "next") => {
    if (!onDateChange || typeof onDateChange !== "function") {
      console.warn("CompactFilters: onDateChange not available");
      return;
    }

    const newDate = navigateDate(currentDate, view, direction);
    onDateChange(newDate);
  };

  const applyFilters = () => {
    let filtered = [...classes];

    if (selectedClassType !== "all") {
      filtered = filtered.filter((c) => c.program?.name === selectedClassType);
    }

    if (selectedInstructor !== "all") {
      filtered = filtered.filter(
        (c) => c.instructor_name === selectedInstructor,
      );
    }

    if (selectedTimeRange !== "all") {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      filtered = filtered.filter((c) => {
        const classDate = new Date(c.start_time);
        const hours = classDate.getHours();

        switch (selectedTimeRange) {
          case "today":
            return (
              classDate >= today &&
              classDate < new Date(today.getTime() + 24 * 60 * 60 * 1000)
            );
          case "morning":
            return hours >= 6 && hours < 12;
          case "afternoon":
            return hours >= 12 && hours < 17;
          case "evening":
            return hours >= 17 && hours <= 21;
          default:
            return true;
        }
      });
    }

    onFilter(filtered);
  };

  const resetFilters = () => {
    setSelectedClassType("all");
    setSelectedInstructor("all");
    setSelectedTimeRange("all");
    onFilter(classes);
  };

  const hasActiveFilters =
    selectedClassType !== "all" ||
    selectedInstructor !== "all" ||
    selectedTimeRange !== "all";

  return (
    <div className="bg-gray-800 rounded-lg p-4 space-y-4">
      {/* Main Controls Row */}
      <div className="flex items-center justify-between">
        {/* Date Navigation */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("prev")}
            className="text-gray-300 hover:text-white"
          >
            ←
          </Button>

          <div className="text-white font-medium min-w-0">
            {formatDateRange(currentDate, view)}
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("next")}
            className="text-gray-300 hover:text-white"
          >
            →
          </Button>
        </div>

        {/* View Toggle */}
        <div className="flex bg-gray-700 rounded-lg p-1">
          {(["day", "week", "month"] as const).map((viewType) => (
            <button
              key={viewType}
              onClick={() => onViewChange(viewType)}
              className={`px-3 py-1 text-sm rounded-md transition-colors capitalize ${
                view === viewType
                  ? "bg-blue-600 text-white"
                  : "text-gray-300 hover:text-white"
              }`}
            >
              {viewType}
            </button>
          ))}
        </div>

        {/* Filters Toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className={`text-gray-300 hover:text-white flex items-center gap-2 ${
            hasActiveFilters ? "text-blue-400" : ""
          }`}
        >
          <Filter className="w-4 h-4" />
          Filters
          {hasActiveFilters && (
            <span className="bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded-full">
              {
                [
                  selectedClassType,
                  selectedInstructor,
                  selectedTimeRange,
                ].filter((f) => f !== "all").length
              }
            </span>
          )}
          <ChevronDown
            className={`w-4 h-4 transition-transform ${showFilters ? "rotate-180" : ""}`}
          />
        </Button>
      </div>

      {/* Expandable Filters */}
      {showFilters && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-700">
          {/* Class Type Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              <Users className="w-4 h-4 inline mr-1" />
              Class Type
            </label>
            <select
              value={selectedClassType}
              onChange={(e) => setSelectedClassType(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Classes</option>
              {classTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          {/* Instructor Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              <Users className="w-4 h-4 inline mr-1" />
              Instructor
            </label>
            <select
              value={selectedInstructor}
              onChange={(e) => setSelectedInstructor(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Instructors</option>
              {instructors.map((instructor) => (
                <option key={instructor} value={instructor}>
                  {instructor}
                </option>
              ))}
            </select>
          </div>

          {/* Time Range Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              <Clock className="w-4 h-4 inline mr-1" />
              Time Range
            </label>
            <select
              value={selectedTimeRange}
              onChange={(e) => setSelectedTimeRange(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Times</option>
              <option value="today">Today</option>
              <option value="morning">Morning (6-12)</option>
              <option value="afternoon">Afternoon (12-17)</option>
              <option value="evening">Evening (17-21)</option>
            </select>
          </div>

          {/* Filter Actions */}
          <div className="md:col-span-3 flex gap-2 pt-2">
            <Button
              variant="primary"
              size="sm"
              onClick={applyFilters}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Apply Filters
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="text-gray-300 hover:text-white"
            >
              Reset
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompactFilters;
