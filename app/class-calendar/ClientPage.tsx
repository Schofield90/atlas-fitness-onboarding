"use client";

import React, { useState, useEffect, useCallback } from "react";
import { FileDown, Plus } from "lucide-react";
import Link from "next/link";
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
import { transformClassesForCalendar } from "@/app/lib/calendar/class-transformer";

export default function ClassCalendarClient() {
  const [error, setError] = useState<string | null>(null);
  const [showAddClass, setShowAddClass] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [selectedView, setSelectedView] = useState<"calendar" | "list">(
    "calendar",
  );
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [calendarView, setCalendarView] = useState<"day" | "week" | "month">(
    "week",
  );
  const [currentDate, setCurrentDate] = useState(new Date());

  // Define fetchClasses first using useCallback
  const fetchClasses = useCallback(async () => {
    if (!organizationId) return;
    setLoading(true);
    try {
      const response = await fetch(
        `/api/class-sessions?organizationId=${organizationId}`,
      );
      if (!response.ok) throw new Error("Failed to fetch classes");
      const data = await response.json();

      // Transform the classes for calendar display
      const transformedClasses = transformClassesForCalendar(
        data.sessions || [],
      );
      console.log("Fetched and transformed classes:", transformedClasses);
      setClasses(transformedClasses);
    } catch (err) {
      console.error("Error fetching classes:", err);
      setError("Failed to load classes");
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  const fetchOrganization = async () => {
    setCheckingAuth(true);
    try {
      const result = await getCurrentUserOrganization();
      if (result?.organizationId) {
        setOrganizationId(result.organizationId);
        setError(null);
      } else {
        console.error("Organization not found:", result?.error);
        setError(
          result?.error ||
            "Organization not found. Please ensure you're logged in.",
        );
      }
    } catch (err) {
      console.error("Error fetching organization:", err);
      setError("Failed to fetch organization. Please refresh the page.");
    } finally {
      setCheckingAuth(false);
    }
  };

  // Now useEffect hooks can safely reference fetchClasses
  useEffect(() => {
    fetchOrganization();
  }, []);

  useEffect(() => {
    if (organizationId) {
      fetchClasses();
    }
  }, [organizationId, fetchClasses]);

  const exportData = (format: string) => {
    console.log(`Exporting in ${format} format`);
    setShowExportMenu(false);
  };

  const createSampleClasses = async () => {
    if (!organizationId) return;

    try {
      const response = await fetch("/api/class-sessions/seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId }),
      });

      const data = await response.json();

      if (data.exists) {
        alert("Sample classes already exist. Check the calendar!");
      } else if (data.success) {
        alert(`Created ${data.classes?.length || 0} sample classes!`);
        fetchClasses(); // Refresh the calendar
      } else {
        alert(
          "Failed to create sample classes: " + (data.error || "Unknown error"),
        );
      }
    } catch (err) {
      console.error("Error creating sample classes:", err);
      alert("Failed to create sample classes");
    }
  };

  if (checkingAuth) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="space-y-4 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
            <p className="text-gray-600">Loading class calendar...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4">
            <div className="text-red-500 text-lg font-medium">
              Unable to Load Class Calendar
            </div>
            <div className="text-gray-600 text-sm">{error}</div>
            <div className="text-gray-600 text-sm">
              If you're not logged in, please{" "}
              <Link
                href="/owner-login"
                className="text-blue-600 hover:underline"
              >
                sign in
              </Link>{" "}
              to access the class calendar.
            </div>
            <Button
              onClick={() => {
                setError(null);
                setCheckingAuth(true);
                fetchOrganization();
              }}
              variant="primary"
            >
              Retry
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <header className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Class Calendar</h1>
          <div className="flex gap-3">
            <div className="relative">
              <Button
                variant="ghost"
                onClick={() => setShowExportMenu(!showExportMenu)}
              >
                <FileDown className="h-4 w-4 mr-2" />
                Export
              </Button>
              {showExportMenu && (
                <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
                  <div className="py-1">
                    <button
                      onClick={() => exportData("csv")}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                    >
                      Export as CSV
                    </button>
                    <button
                      onClick={() => exportData("ical")}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                    >
                      Export as iCal
                    </button>
                  </div>
                </div>
              )}
            </div>
            <Button onClick={() => setShowAddClass(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Class
            </Button>
          </div>
        </header>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <QuickStat
            label="Total Classes"
            value={classes.length}
            trend="+12%"
            isPositive={true}
          />
          <QuickStat
            label="Today's Classes"
            value={
              classes.filter((c: any) => {
                const classDate = new Date(c.startTime);
                const today = new Date();
                return classDate.toDateString() === today.toDateString();
              }).length
            }
            trend="+5%"
            isPositive={true}
          />
          <QuickStat
            label="This Week"
            value={
              classes.filter((c: any) => {
                const classDate = new Date(c.startTime);
                const now = new Date();
                const weekStart = new Date(
                  now.setDate(now.getDate() - now.getDay()),
                );
                const weekEnd = new Date(
                  now.setDate(now.getDate() - now.getDay() + 6),
                );
                return classDate >= weekStart && classDate <= weekEnd;
              }).length
            }
            trend="-2%"
            isPositive={false}
          />
          <QuickStat
            label="Avg Attendance"
            value="75%"
            trend="+8%"
            isPositive={true}
          />
        </div>

        {/* Filters */}
        <div className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <ClassTypeFilter classes={classes} onFilter={setClasses} />
            <InstructorFilter classes={classes} onFilter={setClasses} />
            <TimeRangeFilter classes={classes} onFilter={setClasses} />
            <CalendarViewToggle
              view={calendarView}
              currentDate={currentDate}
              onViewChange={setCalendarView}
              onDateChange={setCurrentDate}
            />
          </div>
        </div>

        {/* Calendar */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            {!loading && classes.length === 0 ? (
              <div className="bg-white rounded-lg shadow-md p-8 text-center">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  No Classes Scheduled
                </h3>
                <p className="text-gray-600 mb-6">
                  Get started by adding classes to your calendar or create
                  sample data for testing.
                </p>
                <div className="flex gap-4 justify-center">
                  <Button onClick={() => setShowAddClass(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Class
                  </Button>
                  <Button variant="ghost" onClick={createSampleClasses}>
                    Generate Sample Classes
                  </Button>
                </div>
              </div>
            ) : (
              <PremiumCalendarGrid
                classes={classes}
                loading={loading}
                view={calendarView}
                currentDate={currentDate}
                onViewChange={setCalendarView}
                onClassSelect={setSelectedClass}
                selectedClass={selectedClass}
                onRefresh={fetchClasses}
                organizationId={organizationId}
              />
            )}
          </div>
          <div className="lg:col-span-1">
            <SelectedClassDetails
              selectedClass={selectedClass}
              onClose={() => setSelectedClass(null)}
              onUpdate={fetchClasses}
            />
          </div>
        </div>
      </div>

      {showAddClass && (
        <AddClassModal
          onClose={() => setShowAddClass(false)}
          onSuccess={() => {
            setShowAddClass(false);
            fetchClasses();
          }}
          organizationId={organizationId}
        />
      )}
    </DashboardLayout>
  );
}
