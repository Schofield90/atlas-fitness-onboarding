import React, { useState, useMemo } from "react";
import ClassBlock from "./ClassBlock";
import SessionDetailModal from "./SessionDetailModal";

const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Group classes by time for cleaner display
interface TimeGroup {
  timeLabel: string;
  hour: number;
  minutes: number;
  classes: any[];
}

// Format time for display in 24-hour format
const formatTimeLabel = (hour: number, minutes: number): string => {
  const hourStr = String(hour).padStart(2, "0");
  const minuteStr = String(minutes).padStart(2, "0");
  return `${hourStr}:${minuteStr}`;
};

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

interface PremiumCalendarGridProps {
  classes?: any[];
  loading?: boolean;
  onClassUpdate?: () => void;
  onRefresh?: () => void;
  onSelectClass?: (cls: any) => void;
  view?: "day" | "week" | "month";
  currentDate?: Date;
  [key: string]: any; // Allow additional props
}

const PremiumCalendarGrid: React.FC<PremiumCalendarGridProps> = ({
  classes = [],
  loading = false,
  onClassUpdate,
  onSelectClass,
  view = "week",
  currentDate = new Date(),
  organizationId,
  onRefresh,
  ...rest
}) => {
  const [showSessionDetail, setShowSessionDetail] = useState(false);
  const [selectedClass, setSelectedClass] = useState<any>(null);

  // Group classes by time for clean display
  const timeGroups = useMemo(() => {
    if (!classes || classes.length === 0) {
      return [];
    }

    // Create a map of time slots to classes
    const groupMap = new Map<string, TimeGroup>();

    classes.forEach((cls) => {
      const classTime = new Date(cls.startTime);
      const hour = classTime.getUTCHours();
      const minutes = classTime.getUTCMinutes();
      const timeKey = `${hour}-${minutes}`;
      const timeLabel = formatTimeLabel(hour, minutes);

      if (!groupMap.has(timeKey)) {
        groupMap.set(timeKey, {
          timeLabel,
          hour,
          minutes,
          classes: [],
        });
      }

      groupMap.get(timeKey)!.classes.push(cls);
    });

    // Sort by time and return as array
    return Array.from(groupMap.values()).sort((a, b) => {
      if (a.hour !== b.hour) return a.hour - b.hour;
      return a.minutes - b.minutes;
    });
  }, [classes]);

  const getClassesForDayAndTime = (
    dayIndex: number,
    hour: number,
    minutes: number,
    weekStartDate?: Date,
  ) => {
    return classes.filter((cls: any) => {
      const classDate = new Date(cls.startTime);
      const classHour = classDate.getUTCHours();
      const classMinutes = classDate.getUTCMinutes();
      const classDayIndex = (classDate.getUTCDay() + 6) % 7; // Convert to Mon=0 indexing

      // Check if time matches
      const timeMatch = classHour === hour && classMinutes === minutes;

      // For week view, check if the class falls within the current week
      if (view === "week" && weekStartDate) {
        // Calculate the actual date for this day of the week
        const startOfWeek = new Date(weekStartDate);
        const dayOfWeek = startOfWeek.getDay();
        const diff =
          startOfWeek.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Monday start
        const monday = new Date(startOfWeek.setDate(diff));
        const targetDate = new Date(monday);
        targetDate.setDate(monday.getDate() + dayIndex);

        // Check if class is on the same date
        const isSameDate =
          classDate.toDateString() === targetDate.toDateString();
        return isSameDate && timeMatch;
      } else if (view === "week") {
        // Fallback to day index matching if weekStartDate not provided
        return classDayIndex === dayIndex && timeMatch;
      } else if (view === "day") {
        // For day view, check if it's the same date
        return (
          classDate.toDateString() === currentDate.toDateString() && timeMatch
        );
      }

      return timeMatch;
    });
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
    return (
      <div
        className="bg-gray-800 rounded-xl border border-gray-700 p-8"
        data-testid="calendar-grid"
      >
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
      <div
        className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden shadow-2xl"
        data-testid="calendar-grid"
      >
        <div className="p-4">
          {/* Day header */}
          <div className="text-center mb-6">
            <h2 className="text-xl font-semibold text-white">
              {currentDate.toLocaleDateString("en-GB", { weekday: "long" })}
            </h2>
            <p className="text-sm text-gray-400">
              {currentDate.toLocaleDateString("en-GB", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>

          {/* Classes grouped by time */}
          <div className="space-y-6">
            {timeGroups.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-400">
                  No classes scheduled for this day
                </p>
              </div>
            ) : (
              timeGroups.map((group) => {
                const dayClasses = getClassesForDayAndTime(
                  0,
                  group.hour,
                  group.minutes,
                );
                if (dayClasses.length === 0) return null;

                return (
                  <div key={`${group.hour}-${group.minutes}`}>
                    {/* Time header */}
                    <div className="text-sm font-medium text-gray-400 mb-3">
                      {group.timeLabel}
                    </div>
                    {/* Classes for this time */}
                    <div className="grid gap-3">
                      {dayClasses.map((cls) => (
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
                );
              })
            )}
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
          onUpdate={onClassUpdate || onRefresh}
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
          onUpdate={onClassUpdate || onRefresh}
        />
      </div>
    );
  }

  // Default week view - clean grouped layout
  const startOfWeek = new Date(currentDate);
  const dayOfWeek = startOfWeek.getDay();
  const diff = startOfWeek.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
  const monday = new Date(startOfWeek.setDate(diff));

  return (
    <div
      className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden shadow-2xl"
      data-testid="calendar-grid"
    >
      <div className="p-4">
        {/* Week day headers */}
        <div className="grid grid-cols-7 gap-4 mb-6">
          {days.map((day, dayIndex) => {
            const actualDate = new Date(monday);
            actualDate.setDate(monday.getDate() + dayIndex);
            const isToday =
              new Date().toDateString() === actualDate.toDateString();

            return (
              <div key={dayIndex} className="text-center">
                <div
                  className={`font-semibold text-sm ${isToday ? "text-orange-400" : "text-white"}`}
                >
                  {day}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {actualDate.getDate()}
                </div>
              </div>
            );
          })}
        </div>

        {/* Time groups */}
        <div className="space-y-4">
          {timeGroups.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400">No classes scheduled this week</p>
            </div>
          ) : (
            timeGroups.map((group) => {
              // Check if there are any classes at this time for any day of the week
              const hasClassesAtThisTime = days.some((_, dayIndex) => {
                const dayClasses = getClassesForDayAndTime(
                  dayIndex,
                  group.hour,
                  group.minutes,
                  monday,
                );
                return dayClasses.length > 0;
              });

              if (!hasClassesAtThisTime) return null;

              return (
                <div
                  key={`${group.hour}-${group.minutes}`}
                  className="border-t border-gray-700 pt-4"
                >
                  {/* Time header */}
                  <div className="text-sm font-medium text-gray-400 mb-3">
                    {group.timeLabel}
                  </div>

                  {/* Classes grid for this time slot */}
                  <div className="grid grid-cols-7 gap-2">
                    {days.map((_, dayIndex) => {
                      const dayClasses = getClassesForDayAndTime(
                        dayIndex,
                        group.hour,
                        group.minutes,
                        monday,
                      );

                      return (
                        <div key={dayIndex}>
                          {dayClasses.length > 0 ? (
                            <div className="space-y-2">
                              {dayClasses.map((cls) => (
                                <div
                                  key={cls.id}
                                  className="cursor-pointer"
                                  onClick={() => handleClassClick(cls)}
                                >
                                  <ClassBlock
                                    {...cls}
                                    onSelect={() => handleClassClick(cls)}
                                    compact={true}
                                  />
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="h-20" /> // Empty placeholder to maintain grid alignment
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
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
        onUpdate={onClassUpdate || onRefresh}
      />
    </div>
  );
};

export default PremiumCalendarGrid;
