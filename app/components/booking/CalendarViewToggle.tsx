import React from "react";
import { Calendar, Grid, List, ChevronLeft, ChevronRight } from "lucide-react";
import Button from "../ui/Button";
import {
  navigateDate,
  formatDateRange,
  navigateToToday,
  CalendarView,
} from "@/app/lib/utils/calendar-navigation";

interface CalendarViewToggleProps {
  view: CalendarView;
  currentDate: Date;
  onViewChange: (view: CalendarView) => void;
  onDateChange?: (date: Date) => void;
}

const CalendarViewToggle: React.FC<CalendarViewToggleProps> = ({
  view,
  currentDate,
  onViewChange,
  onDateChange,
}) => {
  const navigate = (direction: "prev" | "next") => {
    // Add safety check for onDateChange function
    if (!onDateChange || typeof onDateChange !== "function") {
      console.warn(
        "CalendarViewToggle: onDateChange not available, skipping navigation",
      );
      return;
    }

    const newDate = navigateDate(currentDate, view, direction);
    onDateChange(newDate);
  };

  return (
    <div className="flex items-center justify-between mb-6">
      {/* Navigation */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate("prev")}>
            <ChevronLeft className="w-4 h-4" />
          </Button>

          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold text-white">
              {formatDateRange(currentDate, view)}
            </h2>
          </div>

          <Button variant="ghost" size="sm" onClick={() => navigate("next")}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            if (onDateChange && typeof onDateChange === "function") {
              onDateChange(navigateToToday());
            } else {
              console.warn(
                "CalendarViewToggle: onDateChange not available for Today button",
              );
            }
          }}
        >
          Today
        </Button>
      </div>

      {/* View Toggle */}
      <div className="flex items-center gap-2">
        <div className="flex bg-gray-800 border border-gray-700 rounded-lg p-1">
          <button
            onClick={() => onViewChange("day")}
            className={`
              px-3 py-1.5 text-sm font-medium rounded-md transition-colors
              ${
                view === "day"
                  ? "bg-orange-600 text-white"
                  : "text-gray-300 hover:text-white hover:bg-gray-700"
              }
            `}
          >
            Day
          </button>
          <button
            onClick={() => onViewChange("week")}
            className={`
              px-3 py-1.5 text-sm font-medium rounded-md transition-colors
              ${
                view === "week"
                  ? "bg-orange-600 text-white"
                  : "text-gray-300 hover:text-white hover:bg-gray-700"
              }
            `}
          >
            Week
          </button>
          <button
            onClick={() => onViewChange("month")}
            className={`
              px-3 py-1.5 text-sm font-medium rounded-md transition-colors
              ${
                view === "month"
                  ? "bg-orange-600 text-white"
                  : "text-gray-300 hover:text-white hover:bg-gray-700"
              }
            `}
          >
            Month
          </button>
        </div>

        <div className="h-6 w-px bg-gray-700" />

        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            console.log("Grid view clicked");
            alert("Grid view would be shown here");
          }}
          title="Grid View"
        >
          <Grid className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            console.log("List view clicked");
            alert("List view would be shown here");
          }}
          title="List View"
        >
          <List className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export default CalendarViewToggle;
