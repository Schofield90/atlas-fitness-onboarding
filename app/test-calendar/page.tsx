"use client";

import React, { useState, useEffect } from "react";
import PremiumCalendarGrid from "@/app/components/booking/PremiumCalendarGrid";
import { transformClassesForCalendar } from "@/app/lib/calendar/class-transformer";

// Test data with your existing classes
const testClasses = [
  {
    id: "test-1",
    name: "Morning Yoga",
    start_time: new Date(2024, 0, 15, 6, 0, 0).toISOString(), // 6:00 AM
    end_time: new Date(2024, 0, 15, 7, 0, 0).toISOString(), // 7:00 AM
    instructor: "Sarah Johnson",
    max_capacity: 20,
    current_bookings: 15,
    location: "Studio A",
    class_type: "Yoga",
    organization_id: "test-org",
  },
  {
    id: "test-2",
    name: "Evening HIIT",
    start_time: new Date(2024, 0, 15, 18, 0, 0).toISOString(), // 6:00 PM
    end_time: new Date(2024, 0, 15, 19, 0, 0).toISOString(), // 7:00 PM
    instructor: "Mike Thompson",
    max_capacity: 15,
    current_bookings: 12,
    location: "Main Gym",
    class_type: "HIIT",
    organization_id: "test-org",
  },
  {
    id: "test-3",
    name: "Lunch Spin",
    start_time: new Date(2024, 0, 16, 12, 0, 0).toISOString(), // 12:00 PM next day
    end_time: new Date(2024, 0, 16, 12, 45, 0).toISOString(), // 12:45 PM
    instructor: "Lisa Chen",
    max_capacity: 25,
    current_bookings: 20,
    location: "Spin Studio",
    class_type: "Spin",
    organization_id: "test-org",
  },
];

export default function TestCalendarPage() {
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState<any>(null);
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    // Transform test classes for calendar display
    const transformed = transformClassesForCalendar(testClasses);
    console.log("Test classes transformed:", transformed);
    setClasses(transformed);
  }, []);

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">
          Test Calendar - Time Display Verification
        </h1>

        <div className="mb-6 p-4 bg-white rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-3">Test Classes:</h2>
          <ul className="space-y-2">
            <li className="text-sm">
              <span className="font-medium">Morning Yoga:</span> Created at 6:00
              AM, should display as 6:00 AM
            </li>
            <li className="text-sm">
              <span className="font-medium">Evening HIIT:</span> Created at 6:00
              PM, should display as 6:00 PM
            </li>
            <li className="text-sm">
              <span className="font-medium">Lunch Spin:</span> Created at 12:00
              PM next day
            </li>
          </ul>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-lg font-semibold mb-4">Calendar Grid</h2>
          <PremiumCalendarGrid
            classes={classes}
            loading={false}
            view="week"
            currentDate={currentDate}
            onViewChange={() => {}}
            onClassSelect={setSelectedClass}
            selectedClass={selectedClass}
            onRefresh={() => {}}
            organizationId="test-org"
          />
        </div>

        {selectedClass && (
          <div className="mt-6 p-4 bg-white rounded-lg shadow">
            <h3 className="font-semibold">Selected Class Details:</h3>
            <pre className="text-xs mt-2">
              {JSON.stringify(selectedClass, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
