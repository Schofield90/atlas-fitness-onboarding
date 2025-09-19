import React, { useState } from "react";
import ClassBlock from "./ClassBlock";
import SessionDetailModal from "./SessionDetailModal";

const timeSlots = [
  "6:00 AM",
  "6:30 AM",
  "7:00 AM",
  "7:30 AM",
  "8:00 AM",
  "8:30 AM",
  "9:00 AM",
  "9:30 AM",
  "10:00 AM",
  "10:30 AM",
  "11:00 AM",
  "11:30 AM",
  "12:00 PM",
  "12:30 PM",
  "1:00 PM",
  "1:30 PM",
  "2:00 PM",
  "2:30 PM",
  "3:00 PM",
  "3:30 PM",
  "4:00 PM",
  "4:30 PM",
  "5:00 PM",
  "5:30 PM",
  "6:00 PM",
  "6:30 PM",
  "7:00 PM",
  "7:30 PM",
  "8:00 PM",
  "8:30 PM",
  "9:00 PM",
];

const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Get days array based on view type
const getDaysForView = (view: "day" | "week" | "month", date: Date) => {
  if (view === "day") {
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return [dayNames[date.getDay()]];
  } else if (view === "week") {
    return weekDays;
  } else {
    // For month view, generate days of the month
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();

    const days = [];
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i.toString());
    }
    return days;
  }
};

// Mock class data
const mockClasses = [
  {
    id: "1",
    title: "HIIT Blast",
    instructor: "Sarah Chen",
    time: "9:00 AM",
    duration: 45,
    bookings: 18,
    capacity: 20,
    color: "orange" as const,
    earnings: "£360",
    room: "Studio A",
    day: 0, // Monday
    timeSlot: 3, // 9:00 AM
  },
  {
    id: "2",
    title: "Power Yoga",
    instructor: "Marcus Johnson",
    time: "10:30 AM",
    duration: 60,
    bookings: 22,
    capacity: 25,
    color: "purple" as const,
    earnings: "£440",
    room: "Studio B",
    day: 0,
    timeSlot: 4,
  },
  {
    id: "3",
    title: "Strength Training",
    instructor: "Emily Rodriguez",
    time: "6:00 PM",
    duration: 75,
    bookings: 15,
    capacity: 15,
    color: "blue" as const,
    earnings: "£450",
    room: "Gym Floor",
    day: 0,
    timeSlot: 12,
  },
  {
    id: "4",
    title: "Morning Flow",
    instructor: "Lisa Thompson",
    time: "7:00 AM",
    duration: 50,
    bookings: 12,
    capacity: 16,
    color: "green" as const,
    earnings: "£240",
    room: "Studio A",
    day: 1,
    timeSlot: 1,
  },
  {
    id: "5",
    title: "HIIT Express",
    instructor: "David Kim",
    time: "12:00 PM",
    duration: 30,
    bookings: 20,
    capacity: 18,
    color: "orange" as const,
    earnings: "£300",
    room: "Studio B",
    day: 1,
    timeSlot: 6,
  },
  {
    id: "6",
    title: "Pilates Core",
    instructor: "Sarah Chen",
    time: "5:00 PM",
    duration: 45,
    bookings: 14,
    capacity: 20,
    color: "pink" as const,
    earnings: "£280",
    room: "Studio A",
    day: 2,
    timeSlot: 11,
  },
];

interface PremiumCalendarGridProps {
  classes?: any[];
  loading?: boolean;
  onClassUpdate?: () => void;
  onSelectClass?: (cls: any) => void;
  view?: "day" | "week" | "month";
  currentDate?: Date;
}

const PremiumCalendarGrid: React.FC<PremiumCalendarGridProps> = ({
  classes = [],
  loading = false,
  onClassUpdate,
  onSelectClass,
  view = "week",
  currentDate = new Date(),
}) => {
  const [selectedClass, setSelectedClass] = useState<any | null>(null);
  const [showSessionDetail, setShowSessionDetail] = useState(false);

  // Helper function to get the start of the week (Monday)
  const getWeekStartDate = (date: Date) => {
    const startOfWeek = new Date(date);
    const dayOfWeek = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const monday = new Date(startOfWeek.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
  };

  const getClassesForDayAndTime = (dayIndex: number, timeIndex: number) => {
    // For week view, also filter by date to ensure we show classes for the correct week
    const filtered = classes.filter((cls) => {
      if (cls.day !== dayIndex || cls.timeSlot !== timeIndex) return false;

      // In week view, also check that the class date falls within the current week
      if (view === "week" && cls.startTime) {
        const classDate = new Date(cls.startTime);
        const weekStart = getWeekStartDate(currentDate);
        const weekEnd = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000);
        weekEnd.setHours(23, 59, 59, 999);
        return classDate >= weekStart && classDate <= weekEnd;
      }
      return true;
    });
    if (filtered.length > 0) {
      console.log(
        `Found ${filtered.length} classes for day ${dayIndex}, timeSlot ${timeIndex}:`,
        filtered.map((c) => ({
          id: c.id,
          title: c.title,
          startTime: c.startTime,
        })),
      );
      // If multiple classes at same time, pick the one closest to current date
      if (filtered.length > 1) {
        const now = new Date();
        filtered.sort((a, b) => {
          const dateA = new Date(a.startTime);
          const dateB = new Date(b.startTime);
          const diffA = Math.abs(dateA.getTime() - now.getTime());
          const diffB = Math.abs(dateB.getTime() - now.getTime());
          return diffA - diffB;
        });
        console.log(
          "Multiple classes found, sorted by closest date. Using:",
          filtered[0],
        );
      }
    }
    return filtered;
  };

  const handleClassClick = (cls: any) => {
    console.log("handleClassClick called with:", cls);
    setSelectedClass(cls);
    setShowSessionDetail(true);
    // Notify parent for side panel updates
    if (onSelectClass) {
      onSelectClass(cls);
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-8">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
            <p className="text-gray-400">Loading classes...</p>
          </div>
        </div>
      </div>
    );
  }

  const days = getDaysForView(view, currentDate);

  if (!classes || classes.length === 0) {
    // Add debug info for empty state
    console.log("PremiumCalendarGrid: No classes to display", {
      classesLength: classes?.length,
      view,
      currentDate: currentDate.toISOString(),
      classesArray: classes,
    });
    return (
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-8">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <svg
              className="w-16 h-16 text-gray-600 mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <h3 className="text-lg font-medium text-gray-300 mb-2">
              No Classes Scheduled
            </h3>
            <p className="text-gray-500">
              Click the "Add Class" button to create your first class.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Render different layouts based on view type
  if (view === "day") {
    return (
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden shadow-2xl">
        <div className="grid grid-cols-2 h-full">
          {/* Time column */}
          <div className="border-r border-gray-700 bg-gray-800/50">
            <div className="h-16 border-b border-gray-700 flex items-center justify-center">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Time
              </span>
            </div>
            {timeSlots.map((time, index) => (
              <div
                key={index}
                className="h-16 border-b border-gray-700 px-3 py-1 flex items-start justify-end"
              >
                <span className="text-xs text-gray-500 font-medium">
                  {time}
                </span>
              </div>
            ))}
          </div>

          {/* Single day column */}
          <div className="border-r border-gray-700 last:border-r-0">
            <div className="h-16 border-b border-gray-700 p-3 bg-gray-800/30">
              <div className="text-center">
                <div className="font-semibold text-white text-sm">
                  {currentDate.toLocaleDateString("en-GB", { weekday: "long" })}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {currentDate.toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                  })}
                </div>
              </div>
            </div>

            {/* Time slots for the day */}
            <div className="relative">
              {timeSlots.map((_, timeIndex) => {
                // For day view, we need to filter classes by the exact date
                const dayClasses = classes.filter((cls) => {
                  const classDate = new Date(cls.startTime);
                  // Compare dates using UTC to avoid timezone issues
                  const classDateUTC = new Date(
                    Date.UTC(
                      classDate.getUTCFullYear(),
                      classDate.getUTCMonth(),
                      classDate.getUTCDate(),
                    ),
                  );
                  const currentDateUTC = new Date(
                    Date.UTC(
                      currentDate.getFullYear(),
                      currentDate.getMonth(),
                      currentDate.getDate(),
                    ),
                  );
                  return (
                    classDateUTC.getTime() === currentDateUTC.getTime() &&
                    cls.timeSlot === timeIndex
                  );
                });

                return (
                  <div
                    key={timeIndex}
                    className="h-16 border-b border-gray-700 relative"
                  >
                    {dayClasses.slice(0, 1).map((cls) => {
                      // Calculate how many 30-minute slots this class spans
                      const durationSlots = Math.ceil(cls.duration / 30);
                      const heightInPixels = durationSlots * 64; // 64px per slot (h-16)

                      return (
                        <div
                          key={cls.id}
                          className="absolute inset-x-1 pointer-events-none z-10"
                          style={{
                            top: "2px",
                            width: "calc(100% - 8px)",
                            height: `${heightInPixels - 4}px`, // Subtract 4px for spacing
                          }}
                        >
                          <div className="pointer-events-auto h-full">
                            <ClassBlock
                              {...cls}
                              onSelect={() => handleClassClick(cls)}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Session Detail Modal */}
        <SessionDetailModal
          isOpen={showSessionDetail}
          onClose={() => {
            setShowSessionDetail(false);
            setSelectedClass(null);
          }}
          session={selectedClass}
          onUpdate={onClassUpdate}
        />
      </div>
    );
  }

  // Month view
  if (view === "month") {
    // For month view, create a simple list-style layout
    const classesByDate = classes.reduce(
      (acc, cls) => {
        const date = new Date(cls.startTime).toDateString();
        if (!acc[date]) acc[date] = [];
        acc[date].push(cls);
        return acc;
      },
      {} as Record<string, any[]>,
    );

    return (
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden shadow-2xl p-4">
        <div className="space-y-4 max-h-[600px] overflow-y-auto">
          {Object.entries(classesByDate)
            .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
            .map(([date, dateClasses]: [string, any[]]) => (
              <div
                key={date}
                className="border-b border-gray-700 pb-4 last:border-0"
              >
                <h3 className="text-sm font-semibold text-gray-300 mb-2">
                  {new Date(date).toLocaleDateString("en-GB", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {dateClasses.map((cls) => (
                    <div
                      key={cls.id}
                      className="cursor-pointer"
                      onClick={() => handleClassClick(cls)}
                    >
                      <ClassBlock
                        {...cls}
                        onSelect={() => handleClassClick(cls)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
        </div>

        {/* Session Detail Modal */}
        <SessionDetailModal
          isOpen={showSessionDetail}
          onClose={() => {
            setShowSessionDetail(false);
            setSelectedClass(null);
          }}
          session={selectedClass}
          onUpdate={onClassUpdate}
        />
      </div>
    );
  }

  // Default week view
  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden shadow-2xl">
      <div className="grid grid-cols-8 h-full">
        {/* Time column */}
        <div className="border-r border-gray-700 bg-gray-800/50">
          <div className="h-16 border-b border-gray-700 flex items-center justify-center">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Time
            </span>
          </div>
          {timeSlots.map((time, index) => (
            <div
              key={index}
              className="h-16 border-b border-gray-700 px-3 py-1 flex items-start justify-end"
            >
              <span className="text-xs text-gray-500 font-medium">{time}</span>
            </div>
          ))}
        </div>

        {/* Day columns */}
        {days.map((day, dayIndex) => {
          // Calculate the actual date for this day of the week
          const startOfWeek = new Date(currentDate);
          const dayOfWeek = startOfWeek.getDay();
          const diff =
            startOfWeek.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Adjust for Monday start
          const monday = new Date(startOfWeek.setDate(diff));
          const actualDate = new Date(monday);
          actualDate.setDate(monday.getDate() + dayIndex);

          return (
            <div
              key={dayIndex}
              className="border-r border-gray-700 last:border-r-0"
            >
              {/* Day header */}
              <div className="h-16 border-b border-gray-700 p-3 bg-gray-800/30">
                <div className="text-center">
                  <div className="font-semibold text-white text-sm">{day}</div>
                  <div className="text-xs text-gray-400 mt-1">
                    {actualDate.getDate()}
                  </div>
                </div>
              </div>

              {/* Time slots */}
              <div className="relative">
                {timeSlots.map((_, timeIndex) => (
                  <div
                    key={timeIndex}
                    className="h-16 border-b border-gray-700 relative"
                  >
                    {/* Classes in this time slot - only show the first (most recent) one */}
                    {getClassesForDayAndTime(dayIndex, timeIndex)
                      .slice(0, 1)
                      .map((cls, classIndex) => {
                        // Calculate how many 30-minute slots this class spans
                        const durationSlots = Math.ceil(cls.duration / 30);
                        const heightInPixels = durationSlots * 64; // 64px per slot (h-16)

                        return (
                          <div
                            key={cls.id}
                            className="absolute inset-x-1 pointer-events-none z-10"
                            style={{
                              top: "2px",
                              width: "calc(100% - 8px)",
                              height: `${heightInPixels - 4}px`, // Subtract 4px for spacing
                            }}
                          >
                            <div className="pointer-events-auto h-full">
                              <ClassBlock
                                {...cls}
                                onSelect={() => handleClassClick(cls)}
                              />
                            </div>
                          </div>
                        );
                      })}
                  </div>
                ))}

                {/* Add class button overlay - removed for now as it blocks clicks */}
              </div>
            </div>
          );
        })}
      </div>

      {/* Current time indicator - only render on client */}
      {typeof window !== "undefined" && (
        <div className="absolute left-16 right-0 pointer-events-none">
          <div
            className="h-0.5 bg-orange-500 shadow-lg"
            style={{
              top: `${16 + (new Date().getHours() - 6) * 80 + (new Date().getMinutes() / 60) * 80}px`,
              display:
                new Date().getHours() >= 6 && new Date().getHours() <= 21
                  ? "block"
                  : "none",
            }}
          >
            <div className="w-3 h-3 bg-orange-500 rounded-full -translate-y-1.5 -translate-x-1.5 shadow-lg" />
          </div>
        </div>
      )}

      {/* Session Detail Modal */}
      <SessionDetailModal
        isOpen={showSessionDetail}
        onClose={() => {
          setShowSessionDetail(false);
          setSelectedClass(null);
        }}
        session={selectedClass}
        onUpdate={onClassUpdate}
      />
    </div>
  );
};

export default PremiumCalendarGrid;
