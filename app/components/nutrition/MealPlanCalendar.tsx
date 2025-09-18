"use client";

import { useState, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Plus,
  RefreshCw,
} from "lucide-react";

interface MealPlanCalendarProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  generatedDates: Date[];
  onGenerateDay: (date: Date) => void;
  generating: boolean;
  nutritionProfile?: any;
}

export default function MealPlanCalendar({
  selectedDate,
  onDateSelect,
  generatedDates,
  onGenerateDay,
  generating,
  nutritionProfile,
}: MealPlanCalendarProps) {
  const [showCalendar, setShowCalendar] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const hasGeneratedMeal = (date: Date) => {
    return generatedDates.some((d) => d.toDateString() === date.toDateString());
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const renderCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentMonth);
    const firstDay = getFirstDayOfMonth(currentMonth);
    const days = [];

    // Empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="p-2"></div>);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth(),
        day,
      );
      const isSelected = date.toDateString() === selectedDate.toDateString();
      const hasMeal = hasGeneratedMeal(date);
      const isPast = date < new Date(new Date().setHours(0, 0, 0, 0));

      days.push(
        <button
          key={day}
          onClick={() => {
            onDateSelect(date);
            setShowCalendar(false);
          }}
          disabled={false}
          className={`
            p-2 rounded-lg text-sm font-medium transition-all relative
            ${
              isSelected
                ? "bg-orange-600 text-white"
                : isToday(date)
                  ? "bg-gray-700 text-white ring-2 ring-orange-500"
                  : hasMeal
                    ? "bg-green-900/30 text-green-400 hover:bg-green-900/50"
                    : isPast
                      ? "bg-gray-800 text-gray-600 cursor-not-allowed"
                      : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }
          `}
        >
          {day}
          {hasMeal && !isSelected && (
            <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-green-400 rounded-full"></div>
          )}
        </button>,
      );
    }

    return days;
  };

  const handlePrevMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1),
    );
  };

  const handleNextMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1),
    );
  };

  return (
    <div className="relative">
      {/* Calendar Toggle Button */}
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowCalendar(!showCalendar)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              <CalendarIcon className="h-4 w-4" />
              {formatDate(selectedDate)}
            </button>

            {!hasGeneratedMeal(selectedDate) && nutritionProfile && (
              <button
                onClick={() => onGenerateDay(selectedDate)}
                disabled={
                  generating ||
                  selectedDate < new Date(new Date().setHours(0, 0, 0, 0))
                }
                className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50"
              >
                {generating ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Generate Meal Plan
                  </>
                )}
              </button>
            )}
          </div>

          {/* Quick Navigation - 7 Days */}
          <div className="flex gap-1">
            {[0, 1, 2, 3, 4, 5, 6].map((offset) => {
              const date = new Date();
              date.setDate(date.getDate() + offset);
              const isSelected =
                date.toDateString() === selectedDate.toDateString();
              const hasMeal = hasGeneratedMeal(date);

              return (
                <button
                  key={offset}
                  onClick={() => onDateSelect(date)}
                  className={`
                    px-2.5 py-1.5 rounded-lg text-xs transition-colors flex flex-col items-center min-w-[50px]
                    ${
                      isSelected
                        ? "bg-orange-600 text-white"
                        : hasMeal
                          ? "bg-green-900/30 text-green-400 hover:bg-green-900/50"
                          : "bg-gray-700 text-gray-400 hover:bg-gray-600"
                    }
                  `}
                  title={date.toLocaleDateString("en-GB", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })}
                >
                  <span className="font-medium">
                    {offset === 0
                      ? "Today"
                      : offset === 1
                        ? "Tomorrow"
                        : date.toLocaleDateString("en-GB", {
                            weekday: "short",
                          })}
                  </span>
                  <span className="text-[10px] mt-0.5">
                    {date.getDate()}{" "}
                    {date.toLocaleDateString("en-GB", { month: "short" })}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Calendar Dropdown */}
      {showCalendar && (
        <div className="absolute top-full left-0 mt-2 z-50 bg-gray-800 rounded-lg border border-gray-700 p-4 shadow-xl">
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={handlePrevMonth}
              className="p-1 hover:bg-gray-700 rounded transition-colors"
            >
              <ChevronLeft className="h-5 w-5 text-gray-400" />
            </button>
            <h3 className="text-white font-semibold">
              {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </h3>
            <button
              onClick={handleNextMonth}
              className="p-1 hover:bg-gray-700 rounded transition-colors"
            >
              <ChevronRight className="h-5 w-5 text-gray-400" />
            </button>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Day headers */}
            {["S", "M", "T", "W", "T", "F", "S"].map((day) => (
              <div
                key={day}
                className="text-center text-xs text-gray-500 font-medium p-2"
              >
                {day}
              </div>
            ))}

            {/* Calendar days */}
            {renderCalendarDays()}
          </div>

          {/* Legend */}
          <div className="mt-4 pt-4 border-t border-gray-700 flex gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-900/30 rounded"></div>
              <span className="text-gray-400">Has meal plan</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-orange-600 rounded"></div>
              <span className="text-gray-400">Selected</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-gray-700 ring-2 ring-orange-500 rounded"></div>
              <span className="text-gray-400">Today</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
