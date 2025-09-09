"use client";

import React, { useState, useEffect } from "react";
import { FileDown, Plus } from "lucide-react";
import Button from "@/app/components/ui/Button";
import QuickStat from "@/app/components/booking/QuickStat";
import ClassTypeFilter from "@/app/components/booking/ClassTypeFilter";
import InstructorFilter from "@/app/components/booking/InstructorFilter";
import TimeRangeFilter from "@/app/components/booking/TimeRangeFilter";
import CalendarViewToggle from "@/app/components/booking/CalendarViewToggle";
import PremiumCalendarGrid from "@/app/components/booking/PremiumCalendarGrid";
import SelectedClassDetails from "@/app/components/booking/SelectedClassDetails";
import AddClassModal from "@/app/components/booking/AddClassModal";
import DashboardLayout from "@/app/components/DashboardLayout";
import { getCurrentUserOrganization } from "@/app/lib/organization-service";

export const dynamic = "force-dynamic";

export default function ClassCalendarPage() {
  const [showAddClass, setShowAddClass] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [selectedView, setSelectedView] = useState<"calendar" | "list">(
    "calendar",
  );
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [calendarView, setCalendarView] = useState<"day" | "week" | "month">(
    "week",
  );
  const [currentDate, setCurrentDate] = useState(new Date());

  // Get organization ID and fetch classes
  useEffect(() => {
    const initializeBooking = async () => {
      try {
        // Enable test mode in non-production to bypass auth in E2E
        if (
          typeof window !== "undefined" &&
          process.env.NODE_ENV !== "production"
        ) {
          const params = new URLSearchParams(window.location.search);
          if (params.get("test") === "1") {
            console.log("[Test Mode] Bypassing org lookup");
            setOrganizationId("test-org-id");
            return;
          }
        }

        const { organizationId: orgId, error } =
          await getCurrentUserOrganization();
        console.log("Current user organization:", { orgId, error });

        if (error || !orgId) {
          throw new Error("No organization found for user");
        }

        console.log("Using organization ID:", orgId);
        setOrganizationId(orgId);
      } catch (error) {
        console.error("Error initializing booking:", error);
        // Do not use hardcoded fallback - redirect to onboarding instead
        window.location.href = "/onboarding";
      }
    };

    initializeBooking();
  }, []);

  // Fetch classes when organization ID or date range changes
  useEffect(() => {
    if (organizationId) {
      const range = getDateRange(currentDate, calendarView);
      fetchClasses(organizationId, range.start, range.end);
    }
  }, [organizationId, currentDate, calendarView]);

  // Helper function to get date range based on view type
  const getDateRange = (date: Date, view: "day" | "week" | "month") => {
    const start = new Date(date);
    const end = new Date(date);

    switch (view) {
      case "day":
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case "week":
        // Start from Sunday
        const dayOfWeek = start.getDay();
        start.setDate(start.getDate() - dayOfWeek);
        start.setHours(0, 0, 0, 0);
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);
        break;
      case "month":
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        end.setMonth(end.getMonth() + 1);
        end.setDate(0); // Last day of month
        end.setHours(23, 59, 59, 999);
        break;
    }

    return { start, end };
  };

  const fetchClasses = async (
    orgId: string,
    startDate?: Date,
    endDate?: Date,
  ) => {
    try {
      console.log(
        "ClassCalendarPage: fetchClasses called with orgId:",
        orgId,
        "dates:",
        startDate,
        endDate,
      );
      setLoading(true);

      // Calculate date range based on view and currentDate if not provided
      if (!startDate || !endDate) {
        const range = getDateRange(currentDate, calendarView);
        startDate = range.start;
        endDate = range.end;
      }

      const params = new URLSearchParams({
        organizationId: orgId,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });

      const response = await fetch(
        `/api/booking/classes?${params}&t=${Date.now()}&r=${Math.random()}`,
        {
          cache: "no-store",
          next: { revalidate: 0 },
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
            Expires: "0",
          },
        },
      );
      if (response.ok) {
        const data = await response.json();
        console.log("API Response - Full data:", data);
        console.log("API Response - Number of classes:", data.classes?.length);
        if (data.classes && data.classes.length > 0) {
          console.log("API Response - First class raw:", data.classes[0]);
          console.log("API Response - First class bookings:", {
            bookings: data.classes[0].bookings,
            isArray: Array.isArray(data.classes[0].bookings),
            length: data.classes[0].bookings?.length,
          });
        }
        // Transform the classes to match the expected format
        const transformedClasses = (data.classes || [])
          .map((cls: any) => {
            const startDate = new Date(cls.start_time);
            const dayOfWeek = startDate.getDay();
            const hour = startDate.getHours();
            const minutes = startDate.getMinutes();

            // Convert to match weekDays array in PremiumCalendarGrid: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
            // JavaScript: Sunday = 0, Monday = 1, etc.
            // We need: Monday = 0, Tuesday = 1, ..., Sunday = 6
            const day = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

            // Calculate time slot for 30-minute intervals
            // 0 = 6:00 AM, 1 = 6:30 AM, 2 = 7:00 AM, etc.
            const timeSlot = (hour - 6) * 2 + (minutes >= 30 ? 1 : 0);
            if (hour < 6 || hour > 21 || (hour === 21 && minutes > 0)) {
              console.log(
                `Skipping class at ${hour}:${minutes} - outside calendar range`,
              );
              return null;
            }

            return {
              ...cls,
              id: cls.id,
              title: cls.program?.name || "Class",
              instructor: cls.instructor_name,
              time: startDate.toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
                hour12: true,
              }),
              duration: cls.duration_minutes,
              bookings: Array.isArray(cls.bookings)
                ? cls.bookings.filter((b) => b.booking_status !== "cancelled")
                    .length
                : 0,
              capacity: cls.capacity,
              color: "orange" as const,
              earnings: `£${((cls.program?.price_pennies || 0) / 100).toFixed(0)}`,
              room: cls.location,
              day,
              timeSlot,
              startTime: cls.start_time,
            };
          })
          .filter((cls) => cls !== null); // Remove null entries for classes outside time range

        console.log(
          `Loaded ${transformedClasses.length} classes for the calendar`,
        );

        // Debug: Show classes by day
        const classesByDay = transformedClasses.reduce(
          (acc, cls) => {
            if (!acc[cls.day]) acc[cls.day] = [];
            acc[cls.day].push(`${cls.time} - ${cls.title}`);
            return acc;
          },
          {} as Record<number, string[]>,
        );
        console.log("Classes by day (0=Mon, 6=Sun):", classesByDay);

        // Log classes with bookings
        const classesWithBookings = transformedClasses.filter(
          (c) => c.bookings > 0,
        );
        console.log(
          `Classes with bookings: ${classesWithBookings.length}`,
          classesWithBookings,
        );

        console.log("Raw API data for first class:", data.classes[0]);
        console.log(
          "First class booking details:",
          transformedClasses[0]
            ? {
                id: transformedClasses[0].id,
                title: transformedClasses[0].title,
                bookings: transformedClasses[0].bookings,
                capacity: transformedClasses[0].capacity,
                bookingsLength: transformedClasses[0].bookings?.length,
                rawBookings: data.classes[0]?.bookings,
              }
            : "No classes",
        );
        setClasses(transformedClasses);
      }
    } catch (error) {
      console.error("Error fetching classes:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = (format: string) => {
    console.log(`Exporting schedule as ${format}`);
    // Add export logic here
    setShowExportMenu(false);
    // Show success toast
    alert(`Schedule exported as ${format}`);
  };

  const handleAddClass = async (classData: any) => {
    try {
      const response = await fetch("/api/booking/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...classData,
          organizationId,
          startTime: `${classData.date}T${classData.startTime}:00`,
        }),
      });

      if (response.ok) {
        alert(`Class "${classData.title}" has been added successfully!`);
        setShowAddClass(false);
        fetchClasses(organizationId); // Refresh the class list
      } else {
        const error = await response.json();
        alert(`Failed to add class: ${error.error}`);
      }
    } catch (error) {
      console.error("Error adding class:", error);
      alert("Failed to add class. Please try again.");
    }
  };

  return (
    <DashboardLayout userData={null}>
      <div className="flex flex-col h-screen bg-gray-900">
        {/* Top Action Bar */}
        <div className="border-b border-gray-700 bg-gray-800 flex-shrink-0">
          <div className="flex items-center justify-between px-6 py-4">
            <div>
              <h1 className="text-2xl font-bold text-white">Class Schedule</h1>
              <p className="text-sm text-gray-400">
                Manage your gym's classes and bookings
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                className="border-slate-700"
                onClick={() => {
                  console.log("Manual refresh triggered");
                  if (organizationId) {
                    const range = getDateRange(currentDate, calendarView);
                    fetchClasses(organizationId, range.start, range.end);
                  }
                }}
              >
                Refresh
              </Button>
              <div className="relative">
                <Button
                  variant="outline"
                  className="border-slate-700"
                  onClick={() => setShowExportMenu(!showExportMenu)}
                >
                  <FileDown className="w-4 h-4 mr-2" />
                  Export Schedule
                </Button>
                {showExportMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-lg z-10">
                    <button
                      onClick={() => handleExport("PDF")}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-slate-700 text-slate-300 hover:text-white"
                    >
                      Export as PDF
                    </button>
                    <button
                      onClick={() => handleExport("CSV")}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-slate-700 text-slate-300 hover:text-white"
                    >
                      Export as CSV
                    </button>
                    <button
                      onClick={() => handleExport("Excel")}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-slate-700 text-slate-300 hover:text-white rounded-b-lg"
                    >
                      Export as Excel
                    </button>
                  </div>
                )}
              </div>
              <Button
                className="bg-orange-600 hover:bg-orange-700 shadow-lg"
                onClick={() => setShowAddClass(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Class
              </Button>
            </div>
          </div>

          {/* Quick Stats Bar */}
          <div className="grid grid-cols-4 gap-6 px-6 pb-4">
            <QuickStat
              label="Today's Classes"
              value={classes
                .filter(
                  (c) =>
                    new Date(c.startTime).toDateString() ===
                    new Date().toDateString(),
                )
                .length.toString()}
              change=""
              trend="neutral"
            />
            <QuickStat
              label="Total Bookings"
              value="0"
              change=""
              trend="neutral"
            />
            <QuickStat label="Capacity" value="0%" change="" trend="neutral" />
            <QuickStat
              label="Revenue Today"
              value="£0"
              change=""
              trend="neutral"
            />
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Sidebar - Class Types & Filters */}
          <div className="w-64 border-r border-gray-700 bg-gray-800/50 p-4 overflow-y-auto flex-shrink-0">
            <ClassTypeFilter />
            <InstructorFilter />
            <TimeRangeFilter />
          </div>

          {/* Calendar/Schedule View */}
          <div className="flex-1 flex flex-col p-6 overflow-hidden">
            <div className="flex-shrink-0">
              <CalendarViewToggle
                view={calendarView}
                currentDate={currentDate}
                onViewChange={(newView) => {
                  setCalendarView(newView);
                  if (organizationId) {
                    const range = getDateRange(currentDate, newView);
                    fetchClasses(organizationId, range.start, range.end);
                  }
                }}
                onDateChange={(newDate) => {
                  setCurrentDate(newDate);
                  if (organizationId) {
                    const range = getDateRange(newDate, calendarView);
                    fetchClasses(organizationId, range.start, range.end);
                  }
                }}
              />
            </div>
            <div className="flex-1 overflow-auto mt-4">
              <PremiumCalendarGrid
                classes={classes}
                loading={loading}
                onSelectClass={(cls) => setSelectedClass(cls)}
                view={calendarView}
                currentDate={currentDate}
                onClassUpdate={() => {
                  console.log(
                    "ClassCalendarPage: onClassUpdate callback triggered, organizationId:",
                    organizationId,
                  );
                  if (organizationId) {
                    const range = getDateRange(currentDate, calendarView);
                    fetchClasses(organizationId, range.start, range.end);
                  } else {
                    console.error(
                      "ClassCalendarPage: Cannot refresh - organizationId is null",
                    );
                  }
                }}
              />
            </div>
          </div>

          {/* Right Sidebar - Selected Class Details */}
          <div className="w-96 border-l border-gray-700 bg-gray-800/50 overflow-y-auto flex-shrink-0">
            <SelectedClassDetails selectedClass={selectedClass} />
          </div>
        </div>

        {/* Add Class Modal */}
        <AddClassModal
          isOpen={showAddClass}
          onClose={() => setShowAddClass(false)}
          onAdd={handleAddClass}
        />
      </div>
    </DashboardLayout>
  );
}
