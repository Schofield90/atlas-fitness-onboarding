"use client";

import { useState, useEffect, useRef } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar as CalendarIcon,
} from "lucide-react";
import type { CalendarEvent } from "@/app/lib/types/calendar";
import "./GoogleStyleCalendar.css";

interface GoogleStyleCalendarProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  onSlotSelect?: (slot: { startTime: Date; endTime: Date }) => void;
  onEventClick?: (event: CalendarEvent) => void;
  events: CalendarEvent[];
  view?: "week" | "month" | "day";
}

// Event colors similar to Google Calendar
const EVENT_COLORS = {
  gym: "#1a73e8", // Blue
  "no-calls": "#4285f4", // Light blue
  harrogate: "#34a853", // Green
  martin: "#fbbc04", // Yellow
  sean: "#ea4335", // Red
  lizzie: "#673ab7", // Purple
  liz: "#ff6d00", // Orange
  "liz-massage": "#795548", // Brown
  work: "#607d8b", // Blue grey
  recycling: "#009688", // Teal
  default: "#1a73e8", // Default blue
};

// Helper function to calculate adaptive time range based on events
function getAdaptiveTimeRange(events: CalendarEvent[]) {
  if (events.length === 0) {
    return { startHour: 8, endHour: 18 }; // Default business hours when no events
  }

  const eventTimes = events.map((event) => {
    const start = new Date(event.startTime);
    const end = new Date(event.endTime);
    return {
      startHour: start.getHours(),
      endHour: Math.ceil(end.getHours() + end.getMinutes() / 60),
    };
  });

  const earliestStart = Math.min(...eventTimes.map((t) => t.startHour));
  const latestEnd = Math.max(...eventTimes.map((t) => t.endHour));

  // Add 1-hour buffer and ensure minimum 8-hour window for good UX
  const startHour = Math.max(0, earliestStart - 1);
  const endHour = Math.min(23, Math.max(latestEnd + 1, startHour + 8));

  return { startHour, endHour };
}

export function GoogleStyleCalendar({
  selectedDate,
  onDateSelect,
  onSlotSelect,
  onEventClick,
  events = [],
  view = "week",
}: GoogleStyleCalendarProps) {
  console.log("GoogleStyleCalendar - Total events received:", events.length);
  console.log("GoogleStyleCalendar - First 5 events:", events.slice(0, 5));
  const [currentDate, setCurrentDate] = useState(new Date(selectedDate));
  const [currentTime, setCurrentTime] = useState(new Date());
  const timelineRef = useRef<HTMLDivElement>(null);
  const hoursRef = useRef<HTMLDivElement>(null);

  // Helper function to get local hour in London timezone
  const getLocalHour = (date: Date) => {
    const formatter = new Intl.DateTimeFormat("en-GB", {
      hour: "numeric",
      minute: "numeric",
      hour12: false,
      timeZone: "Europe/London",
    });
    const parts = formatter.formatToParts(date);
    const hour = parseInt(parts.find((p) => p.type === "hour")?.value || "0");
    const minute = parseInt(
      parts.find((p) => p.type === "minute")?.value || "0",
    );
    return hour + minute / 60;
  };

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Scroll to current time on mount
  useEffect(() => {
    if (timelineRef.current && view === "week") {
      const currentHour = getLocalHour(new Date());
      const scrollPosition = currentHour * 60 - 200; // 60px per hour, offset for better view
      timelineRef.current.scrollTop = scrollPosition;
    }
  }, [view]);

  // No longer need scroll sync since time labels are inside the scrollable area

  const getWeekStart = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    return new Date(d.setDate(diff));
  };

  const getWeekDays = () => {
    const start = getWeekStart(currentDate);
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const formatTime = (hour: number) => {
    if (hour === 0) return "12 AM";
    if (hour === 12) return "12 PM";
    return hour > 12 ? `${hour - 12} PM` : `${hour} AM`;
  };

  const navigatePrevious = () => {
    const newDate = new Date(currentDate);
    if (view === "week") {
      newDate.setDate(newDate.getDate() - 7);
    } else if (view === "month") {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setDate(newDate.getDate() - 1);
    }
    setCurrentDate(newDate);
  };

  const navigateNext = () => {
    const newDate = new Date(currentDate);
    if (view === "week") {
      newDate.setDate(newDate.getDate() + 7);
    } else if (view === "month") {
      newDate.setMonth(newDate.getMonth() + 1);
    } else {
      newDate.setDate(newDate.getDate() + 1);
    }
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    onDateSelect(new Date());
  };

  const getEventStyle = (event: CalendarEvent, adaptiveStartHour?: number) => {
    const start = new Date(event.startTime);
    const end = new Date(event.endTime);
    const eventStartHour = getLocalHour(start);
    const duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60);

    // Calculate position relative to the adaptive start hour
    const baseStartHour =
      adaptiveStartHour !== undefined ? adaptiveStartHour : 0;
    const relativeStartHour = eventStartHour - baseStartHour;

    // Determine color based on event title
    let bgColor = EVENT_COLORS.default;
    const title = event.title.toLowerCase();

    for (const [key, color] of Object.entries(EVENT_COLORS)) {
      if (title.includes(key)) {
        bgColor = color;
        break;
      }
    }

    return {
      top: `${relativeStartHour * 60}px`,
      height: `${duration * 60 - 2}px`,
      backgroundColor: bgColor,
      opacity: 0.9,
    };
  };

  const getEventsForDay = (date: Date) => {
    const dayEvents = events.filter((event) => {
      const eventDate = new Date(event.startTime);
      return eventDate.toDateString() === date.toDateString();
    });
    if (dayEvents.length > 0) {
      console.log(`Events for ${date.toDateString()}:`, dayEvents);
    }
    return dayEvents;
  };

  const handleTimeSlotClick = (date: Date, hour: number) => {
    if (onSlotSelect) {
      const startTime = new Date(date);
      startTime.setHours(hour, 0, 0, 0);
      const endTime = new Date(startTime);
      endTime.setHours(hour + 1, 0, 0, 0);
      onSlotSelect({ startTime, endTime });
    }
  };

  const getCurrentTimePosition = () => {
    const now = new Date();
    const localHour = getLocalHour(now);
    return localHour * 60;
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const weekDays = getWeekDays();

  // Calculate adaptive time range for current week events
  const weekEvents = events.filter((event) => {
    const eventDate = new Date(event.startTime);
    return weekDays.some(
      (day) => day.toDateString() === eventDate.toDateString(),
    );
  });
  const { startHour, endHour } = getAdaptiveTimeRange(weekEvents);
  const timeSlots = Array.from(
    { length: endHour - startHour + 1 },
    (_, i) => startHour + i,
  );

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
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  if (view === "week") {
    return (
      <div className="bg-gray-800 rounded-lg overflow-hidden h-full flex flex-col">
        {/* Header */}
        <div className="bg-gray-900 px-4 py-3 flex items-center justify-between border-b border-gray-700">
          <div className="flex items-center gap-4">
            <button
              onClick={goToToday}
              className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-md text-sm font-medium transition-colors"
            >
              Today
            </button>
            <div className="flex items-center gap-1">
              <button
                onClick={navigatePrevious}
                className="p-1.5 hover:bg-gray-700 rounded-md transition-colors"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={navigateNext}
                className="p-1.5 hover:bg-gray-700 rounded-md transition-colors"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
            <h2 className="text-lg font-medium">
              {monthNames[weekDays[0].getMonth()]} {weekDays[0].getFullYear()}
            </h2>
          </div>
        </div>

        {/* Calendar Grid */}
        <div
          className="flex-1 overflow-auto google-calendar-scrollbar"
          ref={timelineRef}
        >
          <div className="flex">
            {/* Time labels - now inside scrollable area */}
            <div className="w-16 bg-gray-900 border-r border-gray-700 sticky left-0 z-10">
              <div className="h-12 bg-gray-900 border-b border-gray-700 sticky top-0" />{" "}
              {/* Spacer for day headers */}
              <div>
                {timeSlots.map((hour) => (
                  <div
                    key={hour}
                    className="h-[60px] px-2 py-1 text-xs text-gray-400 text-right border-b border-gray-700"
                  >
                    {hour === startHour ? "" : formatTime(hour)}
                  </div>
                ))}
              </div>
            </div>

            {/* Days and time slots */}
            <div className="flex flex-1">
              {weekDays.map((day, dayIndex) => (
                <div
                  key={dayIndex}
                  className="flex-1 border-r border-gray-700 last:border-r-0"
                >
                  {/* Day header */}
                  <div className="h-12 bg-gray-900 border-b border-gray-700 px-2 py-1 sticky top-0 z-10">
                    <div
                      className={`text-xs font-medium ${isToday(day) ? "text-blue-400" : "text-gray-300"}`}
                    >
                      {dayNames[day.getDay()]}
                    </div>
                    <div
                      className={`text-lg font-medium ${isToday(day) ? "text-blue-400" : "text-white"}`}
                    >
                      {day.getDate()}
                    </div>
                  </div>

                  {/* Time slots */}
                  <div className="relative">
                    {/* Hour lines */}
                    {timeSlots.map((hour) => (
                      <div
                        key={hour}
                        className="h-[60px] border-b border-gray-700 hover:bg-gray-700/30 cursor-pointer transition-colors"
                        onClick={() => handleTimeSlotClick(day, hour)}
                      />
                    ))}

                    {/* Current time indicator */}
                    {isToday(day) &&
                      (() => {
                        const currentHour = getLocalHour(new Date());
                        // Only show current time indicator if it's within our visible range
                        if (
                          currentHour >= startHour &&
                          currentHour <= endHour
                        ) {
                          const relativePosition =
                            (currentHour - startHour) * 60;
                          return (
                            <div
                              className="absolute left-0 right-0 h-0.5 bg-red-500 z-20 pointer-events-none"
                              style={{ top: `${relativePosition}px` }}
                            >
                              <div className="absolute -left-2 -top-1.5 w-3 h-3 bg-red-500 rounded-full" />
                            </div>
                          );
                        }
                        return null;
                      })()}

                    {/* Events */}
                    {getEventsForDay(day).map((event) => (
                      <div
                        key={event.id}
                        className="absolute left-1 right-1 rounded-md p-1 cursor-pointer hover:shadow-lg transition-shadow text-white text-xs overflow-hidden"
                        style={getEventStyle(event, startHour)}
                        onClick={() => onEventClick?.(event)}
                      >
                        <div className="font-medium truncate">
                          {event.title}
                        </div>
                        <div className="truncate opacity-90">
                          {new Date(event.startTime).toLocaleTimeString(
                            "en-GB",
                            {
                              hour: "numeric",
                              minute: "2-digit",
                              timeZone: "Europe/London",
                            },
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Month view implementation
  if (view === "month") {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay();

    // Calculate weeks
    const weeks = [];
    let currentWeek = [];

    // Add empty cells for days before month starts
    for (let i = 0; i < startDayOfWeek; i++) {
      currentWeek.push(null);
    }

    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      currentWeek.push(new Date(year, month, day));
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }

    // Add empty cells for remaining days in last week
    while (currentWeek.length > 0 && currentWeek.length < 7) {
      currentWeek.push(null);
    }
    if (currentWeek.length > 0) {
      weeks.push(currentWeek);
    }

    return (
      <div className="bg-gray-800 rounded-lg overflow-hidden h-full flex flex-col">
        {/* Header */}
        <div className="bg-gray-900 px-4 py-3 flex items-center justify-between border-b border-gray-700">
          <div className="flex items-center gap-4">
            <button
              onClick={goToToday}
              className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-md text-sm font-medium transition-colors"
            >
              Today
            </button>
            <div className="flex items-center gap-1">
              <button
                onClick={navigatePrevious}
                className="p-1.5 hover:bg-gray-700 rounded-md transition-colors"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={navigateNext}
                className="p-1.5 hover:bg-gray-700 rounded-md transition-colors"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
            <h2 className="text-lg font-medium">
              {monthNames[month]} {year}
            </h2>
          </div>
        </div>

        {/* Month Grid */}
        <div className="flex-1 p-4">
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {dayNames.map((day) => (
              <div
                key={day}
                className="text-center text-sm font-medium text-gray-400 py-2"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Weeks */}
          <div className="grid grid-rows-6 gap-1 h-full">
            {weeks.map((week, weekIndex) => (
              <div key={weekIndex} className="grid grid-cols-7 gap-1">
                {week.map((day, dayIndex) => {
                  if (!day) {
                    return (
                      <div
                        key={`empty-${dayIndex}`}
                        className="bg-gray-900/50 rounded-md"
                      />
                    );
                  }

                  const dayEvents = getEventsForDay(day);
                  const isCurrentDay = isToday(day);
                  const isSelected =
                    day.toDateString() === selectedDate.toDateString();

                  return (
                    <div
                      key={day.getDate()}
                      onClick={() => onDateSelect(day)}
                      className={`
                        bg-gray-900/50 rounded-md p-2 cursor-pointer hover:bg-gray-700 transition-colors
                        ${isCurrentDay ? "ring-2 ring-blue-500" : ""}
                        ${isSelected ? "bg-gray-700" : ""}
                      `}
                    >
                      <div
                        className={`text-sm font-medium mb-1 ${isCurrentDay ? "text-blue-400" : "text-white"}`}
                      >
                        {day.getDate()}
                      </div>
                      <div className="space-y-1">
                        {dayEvents.slice(0, 3).map((event, i) => {
                          const title = event.title.toLowerCase();
                          let bgColor = EVENT_COLORS.default;

                          for (const [key, color] of Object.entries(
                            EVENT_COLORS,
                          )) {
                            if (title.includes(key)) {
                              bgColor = color;
                              break;
                            }
                          }

                          return (
                            <div
                              key={event.id}
                              className="text-xs px-1 py-0.5 rounded truncate text-white cursor-pointer hover:opacity-80"
                              style={{ backgroundColor: bgColor }}
                              onClick={(e) => {
                                e.stopPropagation();
                                onEventClick?.(event);
                              }}
                              title={event.title}
                            >
                              {new Date(event.startTime).toLocaleTimeString(
                                "en-GB",
                                {
                                  hour: "numeric",
                                  minute: "2-digit",
                                  timeZone: "Europe/London",
                                },
                              )}{" "}
                              {event.title}
                            </div>
                          );
                        })}
                        {dayEvents.length > 3 && (
                          <div className="text-xs text-gray-400">
                            +{dayEvents.length - 3} more
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Default fallback
  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <p className="text-white">View not implemented</p>
    </div>
  );
}
