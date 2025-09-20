import React, { useState, useMemo } from "react";
import ClassBlock from "./ClassBlock";
import SessionDetailModal from "./SessionDetailModal";

const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Generate time slots dynamically based on classes
const generateTimeSlots = (startHour: number, endHour: number): string[] => {
  const slots = [];
  for (let hour = startHour; hour <= endHour; hour++) {
    slots.push(
      `${hour === 0 ? 12 : hour > 12 ? hour - 12 : hour}:00 ${hour >= 12 ? "PM" : "AM"}`,
    );
    if (hour < endHour) {
      slots.push(
        `${hour === 0 ? 12 : hour > 12 ? hour - 12 : hour}:30 ${hour >= 12 ? "PM" : "AM"}`,
      );
    }
  }
  return slots;
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

  // Calculate dynamic time range based on actual classes
  const { timeSlots, earliestHour, latestHour } = useMemo(() => {
    if (!classes || classes.length === 0) {
      // Default range if no classes
      return {
        timeSlots: generateTimeSlots(6, 20), // 6 AM to 8 PM default
        earliestHour: 6,
        latestHour: 20,
      };
    }

    let earliest = 24;
    let latest = 0;

    // Find the earliest and latest class times
    classes.forEach((cls) => {
      const classTime = new Date(cls.startTime);
      const hour = classTime.getHours();
      const minutes = classTime.getMinutes();

      // Round down for earliest
      if (hour < earliest) {
        earliest = hour;
      }

      // Round up for latest (considering duration)
      const endHour = hour + Math.ceil((minutes + (cls.duration || 60)) / 60);
      if (endHour > latest) {
        latest = endHour;
      }
    });

    // Add some padding (1 hour before earliest, 1 hour after latest)
    earliest = Math.max(0, earliest - 1);
    latest = Math.min(23, latest + 1);

    return {
      timeSlots: generateTimeSlots(earliest, latest),
      earliestHour: earliest,
      latestHour: latest,
    };
  }, [classes]);

  const getClassesForSlot = (dayIndex: number, timeIndex: number) => {
    const timeString = timeSlots[timeIndex];
    const [time, period] = timeString.split(" ");
    const [hours, minutes] = time.split(":").map(Number);
    let hour24 = hours;
    if (period === "PM" && hours !== 12) hour24 += 12;
    if (period === "AM" && hours === 12) hour24 = 0;

    const filtered = classes.filter((cls: any) => {
      const classDate = new Date(cls.startTime);
      const classHour = classDate.getHours();
      const classMinutes = classDate.getMinutes();
      const classDayIndex = (classDate.getDay() + 6) % 7; // Convert to Mon=0 indexing

      // Check if class matches the time slot (within 30-minute window)
      const timeMatch =
        classHour === hour24 &&
        classMinutes >= parseInt(minutes || "0") &&
        classMinutes < parseInt(minutes || "0") + 30;

      // For week view, check if the day matches
      if (view === "week") {
        return classDayIndex === dayIndex && timeMatch;
      }

      return timeMatch;
    });

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
          {/* Time column - responsive width */}
          <div className="border-r border-gray-700 bg-gray-800/50 w-16 sm:w-20 md:w-24">
            <div className="h-14 sm:h-16 border-b border-gray-700 flex items-center justify-center">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Time
              </span>
            </div>
            {timeSlots.map((time, index) => (
              <div
                key={index}
                className="h-14 sm:h-16 border-b border-gray-700 px-1 sm:px-3 py-1 flex items-start justify-end"
              >
                <span className="text-xs text-gray-500 font-medium">
                  {time}
                </span>
              </div>
            ))}
          </div>

          {/* Single day column */}
          <div className="flex-1 border-r border-gray-700 last:border-r-0">
            <div className="h-14 sm:h-16 border-b border-gray-700 p-2 sm:p-3 bg-gray-800/30">
              <div className="text-center">
                <div className="font-semibold text-white text-xs sm:text-sm">
                  {currentDate.toLocaleDateString("en-GB", { weekday: "long" })}
                </div>
                <div className="text-xs text-gray-400 mt-0.5 sm:mt-1">
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
                  const classHour = classDate.getHours();
                  const classMinutes = classDate.getMinutes();

                  // Check if class is in this time slot
                  const timeString = timeSlots[timeIndex];
                  const [time, period] = timeString.split(" ");
                  const [hours, minutes] = time.split(":").map(Number);
                  let hour24 = hours;
                  if (period === "PM" && hours !== 12) hour24 += 12;
                  if (period === "AM" && hours === 12) hour24 = 0;

                  const timeMatch =
                    classHour === hour24 &&
                    classMinutes >= parseInt(minutes || "0") &&
                    classMinutes < parseInt(minutes || "0") + 30;

                  // Check if it's the same day
                  const isSameDay =
                    classDate.toDateString() === currentDate.toDateString();

                  return isSameDay && timeMatch;
                });

                return (
                  <div
                    key={timeIndex}
                    className="h-14 sm:h-16 border-b border-gray-700 p-1 relative"
                  >
                    {dayClasses.map((cls) => (
                      <div
                        key={cls.id}
                        className="absolute inset-1 cursor-pointer"
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

  // Default week view - responsive grid
  const gridCols = view === "week" ? "grid-cols-8" : "grid-cols-2";
  const responsiveGrid =
    view === "week"
      ? "grid-cols-4 sm:grid-cols-6 md:grid-cols-8"
      : "grid-cols-2";

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-x-auto shadow-2xl">
      <div className={`grid ${responsiveGrid} min-w-[600px] h-full`}>
        {/* Time column - responsive width */}
        <div className="border-r border-gray-700 bg-gray-800/50 w-16 sm:w-20 sticky left-0 z-10">
          <div className="h-14 sm:h-16 border-b border-gray-700 flex items-center justify-center bg-gray-800">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Time
            </span>
          </div>
          {timeSlots.map((time, index) => (
            <div
              key={index}
              className="h-14 sm:h-16 border-b border-gray-700 px-1 sm:px-2 py-1 flex items-start justify-end bg-gray-800/50"
            >
              <span className="text-xs text-gray-500 font-medium">{time}</span>
            </div>
          ))}
        </div>

        {/* Day columns - hidden on small screens for some days */}
        {days.map((day, dayIndex) => {
          // Calculate the actual date for this day of the week
          const startOfWeek = new Date(currentDate);
          const dayOfWeek = startOfWeek.getDay();
          const diff =
            startOfWeek.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Adjust for Monday start
          const monday = new Date(startOfWeek.setDate(diff));
          const actualDate = new Date(monday);
          actualDate.setDate(monday.getDate() + dayIndex);

          const isToday =
            new Date().toDateString() === actualDate.toDateString();

          // Hide some days on smaller screens
          const hideOnSmall = dayIndex === 5 || dayIndex === 6; // Hide Sat/Sun on mobile
          const hideOnMedium = dayIndex === 6; // Hide only Sun on tablets

          return (
            <div
              key={dayIndex}
              className={`border-r border-gray-700 last:border-r-0 min-w-[100px] ${
                hideOnSmall ? "hidden sm:block" : ""
              } ${hideOnMedium ? "sm:hidden md:block" : ""}`}
            >
              <div
                className={`h-14 sm:h-16 border-b border-gray-700 p-1 sm:p-3 ${
                  isToday ? "bg-orange-900/20" : "bg-gray-800/30"
                }`}
              >
                <div className="text-center">
                  <div
                    className={`font-semibold text-xs sm:text-sm ${
                      isToday ? "text-orange-400" : "text-white"
                    }`}
                  >
                    {day}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {actualDate.getDate()}
                  </div>
                </div>
              </div>

              {/* Time slots for each day */}
              <div className="relative">
                {timeSlots.map((_, timeIndex) => {
                  const slotClasses = getClassesForSlot(dayIndex, timeIndex);

                  return (
                    <div
                      key={`${dayIndex}-${timeIndex}`}
                      className="h-14 sm:h-16 border-b border-gray-700 p-0.5 sm:p-1 relative"
                    >
                      {slotClasses.length > 0 && (
                        <div
                          className="absolute inset-0.5 sm:inset-1 cursor-pointer"
                          onClick={() => handleClassClick(slotClasses[0])}
                        >
                          <ClassBlock
                            {...slotClasses[0]}
                            onSelect={() => handleClassClick(slotClasses[0])}
                            compact={true}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
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
