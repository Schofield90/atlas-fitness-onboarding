/**
 * Transform class data from database format to calendar display format
 * Now using timezone-aware utilities for consistent time handling
 */

import {
  parseISOToLocal,
  formatTime,
  formatDate,
  normalizeTimeString,
  utcToLocal,
  getUserTimezone,
  getTimeDifferenceMinutes,
} from "@/app/lib/utils/timezone-utils";

// Color palette for class types
const CLASS_COLORS = [
  "orange",
  "purple",
  "blue",
  "green",
  "pink",
  "yellow",
  "indigo",
  "red",
] as const;

type ClassColor = (typeof CLASS_COLORS)[number];

// Get color based on class type or index
function getClassColor(type: string | undefined, index: number): ClassColor {
  if (!type) return CLASS_COLORS[index % CLASS_COLORS.length];

  // Hash the type string to get consistent color
  let hash = 0;
  for (let i = 0; i < type.length; i++) {
    hash = (hash << 5) - hash + type.charCodeAt(i);
    hash = hash & hash; // Convert to 32bit integer
  }
  return CLASS_COLORS[Math.abs(hash) % CLASS_COLORS.length];
}

// Convert time string to 30-minute time slot index
function getTimeSlotIndex(timeStr: string): number {
  try {
    // Convert UTC time from database to local timezone
    const localDate = parseISOToLocal(timeStr);

    // Get hours and minutes in local timezone
    const hours = localDate.getHours();
    const minutes = localDate.getMinutes();

    // Calculate slot index based on 30-minute intervals
    // Starting from 6:00 AM (slot 0) to 9:00 PM (slot 30)
    const startHour = 6; // 6 AM start
    let slotIndex = 0;

    if (hours < startHour) {
      // Before 6 AM, map to first slot
      return 0;
    }

    // Calculate slot based on 30-minute intervals
    slotIndex = (hours - startHour) * 2;

    // Add 1 if we're in the second half of the hour (30+ minutes)
    if (minutes >= 30) {
      slotIndex += 1;
    }

    // Cap at maximum slot (9:30 PM would be slot 31)
    return Math.min(slotIndex, 31);
  } catch (error) {
    console.warn("Invalid time string for slot calculation:", timeStr, error);
    return 0;
  }
}

// Get day index (0 = Monday, 6 = Sunday for calendar grid)
function getDayIndex(dateStr: string): number {
  try {
    // Convert UTC time from database to local timezone
    const localDate = parseISOToLocal(dateStr);

    // JavaScript getDay: 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    // We want: 0 = Monday, 1 = Tuesday, ..., 6 = Sunday
    const jsDay = localDate.getDay();
    return jsDay === 0 ? 6 : jsDay - 1;
  } catch (error) {
    console.warn("Invalid date string for day calculation:", dateStr, error);
    return 0;
  }
}

// Format time for display using timezone utilities
function formatTimeDisplay(dateStr: string): string {
  try {
    // Use timezone-aware formatting
    return formatTime(parseISOToLocal(dateStr), false);
  } catch (error) {
    console.warn("Invalid date string for time formatting:", dateStr, error);
    return "TBD";
  }
}

// Calculate duration in minutes using raw UTC timestamps
function calculateDuration(startTime: string, endTime: string): number {
  try {
    // Calculate duration on raw UTC timestamps to avoid timezone conversion issues
    const startMs = new Date(startTime).getTime();
    const endMs = new Date(endTime).getTime();

    // Return duration in minutes
    return Math.round((endMs - startMs) / (1000 * 60));
  } catch (error) {
    console.warn(
      "Invalid date strings for duration calculation:",
      { startTime, endTime },
      error,
    );
    return 60; // Default to 60 minutes
  }
}

export interface TransformedClass {
  id: string;
  title: string;
  instructor: string;
  time: string;
  startTime: string;
  endTime: string;
  duration: number;
  bookings: number;
  capacity: number;
  color: ClassColor;
  earnings: string;
  room: string;
  day: number;
  timeSlot: number;
  description?: string;
  type: string;
}

/**
 * Transform classes from database format to calendar display format
 */
export function transformClassesForCalendar(
  classes: any[],
): TransformedClass[] {
  return classes.map((cls, index) => {
    const startTime = cls.startTime || cls.start_time;
    const endTime = cls.endTime || cls.end_time;

    return {
      id: cls.id,
      title: cls.name || cls.title || "Untitled Class",
      instructor: cls.instructor || "TBD",
      time: formatTimeDisplay(startTime),
      startTime,
      endTime,
      duration: calculateDuration(startTime, endTime),
      bookings: cls.enrolled || cls.current_bookings || 0,
      capacity: cls.capacity || cls.max_capacity || 20,
      color: getClassColor(cls.type || cls.class_type, index),
      earnings: `£${(cls.enrolled || 0) * 20}`, // Estimate based on bookings
      room: cls.location || cls.room || "Main Studio",
      day: getDayIndex(startTime),
      timeSlot: getTimeSlotIndex(startTime),
      description: cls.description,
      type: cls.type || cls.class_type || "General",
    };
  });
}

/**
 * Create sample classes for testing
 */
export function createSampleClasses(organizationId: string) {
  const today = new Date();
  const classes = [];

  const classTypes = [
    { name: "HIIT Blast", instructor: "Sarah Chen", duration: 45 },
    { name: "Power Yoga", instructor: "Marcus Johnson", duration: 60 },
    { name: "Strength Training", instructor: "Emily Rodriguez", duration: 75 },
    { name: "Spin Class", instructor: "Alex Thompson", duration: 45 },
    { name: "Pilates", instructor: "Lisa Park", duration: 60 },
    { name: "Boxing", instructor: "Mike Wilson", duration: 45 },
    { name: "Zumba", instructor: "Maria Garcia", duration: 60 },
    { name: "CrossFit", instructor: "John Davis", duration: 90 },
  ];

  const timeSlots = [
    { hour: 6, minute: 0 },
    { hour: 7, minute: 0 },
    { hour: 8, minute: 0 },
    { hour: 9, minute: 0 },
    { hour: 10, minute: 30 },
    { hour: 12, minute: 0 },
    { hour: 17, minute: 0 },
    { hour: 18, minute: 30 },
    { hour: 19, minute: 30 },
  ];

  // Generate classes for the next 7 days
  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const classDate = new Date(today);
    classDate.setDate(today.getDate() + dayOffset);

    // Add 3-5 classes per day
    const numClasses = 3 + Math.floor(Math.random() * 3);
    const selectedSlots = timeSlots
      .sort(() => Math.random() - 0.5)
      .slice(0, numClasses);

    selectedSlots.forEach((slot) => {
      const classType =
        classTypes[Math.floor(Math.random() * classTypes.length)];
      const startTime = new Date(classDate);
      startTime.setHours(slot.hour, slot.minute, 0, 0);

      const endTime = new Date(startTime);
      endTime.setMinutes(startTime.getMinutes() + classType.duration);

      classes.push({
        id: `sample-${dayOffset}-${slot.hour}-${slot.minute}`,
        name: classType.name,
        instructor: classType.instructor,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        max_capacity: 20 + Math.floor(Math.random() * 10),
        current_bookings: Math.floor(Math.random() * 20),
        location: `Studio ${String.fromCharCode(65 + Math.floor(Math.random() * 3))}`,
        class_type: classType.name,
        organization_id: organizationId,
        description: `Join us for an energizing ${classType.name} session with ${classType.instructor}!`,
      });
    });
  }

  return classes;
}
