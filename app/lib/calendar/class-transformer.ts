/**
 * Transform class data from database format to calendar display format
 */

// Map time strings to slot indices (0-based)
const TIME_SLOT_MAP: Record<string, number> = {
  "6:00 AM": 0,
  "6:30 AM": 1,
  "7:00 AM": 2,
  "7:30 AM": 3,
  "8:00 AM": 4,
  "8:30 AM": 5,
  "9:00 AM": 6,
  "9:30 AM": 7,
  "10:00 AM": 8,
  "10:30 AM": 9,
  "11:00 AM": 10,
  "11:30 AM": 11,
  "12:00 PM": 12,
  "12:30 PM": 13,
  "1:00 PM": 14,
  "1:30 PM": 15,
  "2:00 PM": 16,
  "2:30 PM": 17,
  "3:00 PM": 18,
  "3:30 PM": 19,
  "4:00 PM": 20,
  "4:30 PM": 21,
  "5:00 PM": 22,
  "5:30 PM": 23,
  "6:00 PM": 24,
  "6:30 PM": 25,
  "7:00 PM": 26,
  "7:30 PM": 27,
  "8:00 PM": 28,
  "8:30 PM": 29,
  "9:00 PM": 30,
};

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

// Convert time string to 24-hour format time slot index
function getTimeSlotIndex(timeStr: string): number {
  // Parse different time formats
  const date = new Date(timeStr);
  if (isNaN(date.getTime())) {
    console.warn("Invalid date string:", timeStr);
    return 0;
  }

  const hours = date.getHours();
  const minutes = date.getMinutes();

  // Convert to 12-hour format string for lookup
  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  const timeKey = `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`;

  // Find closest time slot
  if (TIME_SLOT_MAP[timeKey] !== undefined) {
    return TIME_SLOT_MAP[timeKey];
  }

  // If exact match not found, find closest slot
  const totalMinutes = hours * 60 + minutes;
  let closestSlot = 0;
  let minDiff = Infinity;

  Object.entries(TIME_SLOT_MAP).forEach(([time, slot]) => {
    const [timePart, periodPart] = time.split(" ");
    const [hourStr, minStr] = timePart.split(":");
    let slotHours = parseInt(hourStr);
    const slotMinutes = parseInt(minStr);

    if (periodPart === "PM" && slotHours !== 12) slotHours += 12;
    if (periodPart === "AM" && slotHours === 12) slotHours = 0;

    const slotTotalMinutes = slotHours * 60 + slotMinutes;
    const diff = Math.abs(slotTotalMinutes - totalMinutes);

    if (diff < minDiff) {
      minDiff = diff;
      closestSlot = slot;
    }
  });

  return closestSlot;
}

// Get day index (0 = Monday, 6 = Sunday for calendar grid)
function getDayIndex(dateStr: string): number {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    console.warn("Invalid date string:", dateStr);
    return 0;
  }

  // JavaScript getDay: 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  // We want: 0 = Monday, 1 = Tuesday, ..., 6 = Sunday
  const jsDay = date.getDay();
  return jsDay === 0 ? 6 : jsDay - 1;
}

// Format time for display
function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "TBD";

  const hours = date.getHours();
  const minutes = date.getMinutes();
  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;

  return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`;
}

// Calculate duration in minutes
function calculateDuration(startTime: string, endTime: string): number {
  const start = new Date(startTime);
  const end = new Date(endTime);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return 60; // Default to 60 minutes
  }

  const diffMs = end.getTime() - start.getTime();
  return Math.max(30, Math.min(180, Math.round(diffMs / (1000 * 60)))); // Between 30 and 180 minutes
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
      time: formatTime(startTime),
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
