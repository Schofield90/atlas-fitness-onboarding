import { addMinutes, startOfDay, endOfDay, isAfter, isBefore, isWithinInterval, parseISO, format, addDays, setHours, setMinutes } from 'date-fns';
import { utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz';

export interface WorkHours {
  [key: string]: string[][]; // { Mon: [["08:00", "18:00"]], ... }
}

export interface AvailabilityPolicy {
  workHours: WorkHours;
  slotIntervalMins: number;
  durationMins: number;
  bufferBeforeMins: number;
  bufferAfterMins: number;
  minNoticeMins: number;
  dateRangeDays: number;
  maxPerSlotPerUser: number;
  lookBusyPercent: number;
  timezone: string;
}

export interface Booking {
  startTime: Date;
  endTime: Date;
  staffId?: string;
}

export interface SlotInfo {
  startTime: string; // ISO string
  endTime: string;
  staffId?: string;
  available: boolean;
}

export interface DailySlots {
  date: string; // YYYY-MM-DD
  slots: SlotInfo[];
}

/**
 * Generate available booking slots based on policy and existing bookings
 */
export function generateSlots(
  policy: AvailabilityPolicy,
  startDate: Date,
  endDate: Date,
  existingBookings: Booking[] = [],
  staffId?: string,
  userTimezone: string = 'UTC'
): DailySlots[] {
  const results: DailySlots[] = [];
  const now = new Date();
  const minNoticeTime = addMinutes(now, policy.minNoticeMins);
  
  // Calculate actual date range considering policy limits
  const maxEndDate = addDays(startDate, policy.dateRangeDays);
  const effectiveEndDate = isAfter(endDate, maxEndDate) ? maxEndDate : endDate;
  
  // Process each day in the range
  let currentDate = new Date(startDate);
  while (isBefore(currentDate, effectiveEndDate)) {
    const dayOfWeek = format(currentDate, 'EEE'); // Mon, Tue, etc.
    const workHoursForDay = policy.workHours[dayOfWeek];
    
    if (!workHoursForDay || workHoursForDay.length === 0) {
      // No work hours for this day
      results.push({
        date: format(currentDate, 'yyyy-MM-dd'),
        slots: []
      });
      currentDate = addDays(currentDate, 1);
      continue;
    }
    
    const dailySlots: SlotInfo[] = [];
    
    // Process each work period for the day
    for (const [startTimeStr, endTimeStr] of workHoursForDay) {
      const [startHour, startMin] = startTimeStr.split(':').map(Number);
      const [endHour, endMin] = endTimeStr.split(':').map(Number);
      
      let slotStart = setMinutes(setHours(currentDate, startHour), startMin);
      const periodEnd = setMinutes(setHours(currentDate, endHour), endMin);
      
      // Generate slots for this work period
      while (isBefore(slotStart, periodEnd)) {
        const slotEnd = addMinutes(slotStart, policy.durationMins);
        
        // Check if slot end time exceeds work period
        if (isAfter(slotEnd, periodEnd)) {
          break;
        }
        
        // Apply buffer times
        const bufferedStart = addMinutes(slotStart, -policy.bufferBeforeMins);
        const bufferedEnd = addMinutes(slotEnd, policy.bufferAfterMins);
        
        // Check minimum notice
        const meetsMinNotice = isAfter(slotStart, minNoticeTime);
        
        // Check for conflicts with existing bookings
        const hasConflict = existingBookings.some(booking => {
          // Check if this booking is for the same staff member (if specified)
          if (staffId && booking.staffId && booking.staffId !== staffId) {
            return false;
          }
          
          // Check time overlap including buffers
          return (
            (isAfter(bufferedEnd, booking.startTime) && isBefore(bufferedStart, booking.endTime)) ||
            (isAfter(booking.endTime, bufferedStart) && isBefore(booking.startTime, bufferedEnd))
          );
        });
        
        // Apply "look busy" percentage (randomly hide slots)
        const isHiddenByLookBusy = policy.lookBusyPercent > 0 && 
          Math.random() * 100 < policy.lookBusyPercent;
        
        // Determine if slot is available
        const isAvailable = meetsMinNotice && !hasConflict && !isHiddenByLookBusy;
        
        // Convert to user's timezone for display
        const zonedStart = utcToZonedTime(slotStart, userTimezone);
        const zonedEnd = utcToZonedTime(slotEnd, userTimezone);
        
        dailySlots.push({
          startTime: slotStart.toISOString(),
          endTime: slotEnd.toISOString(),
          staffId,
          available: isAvailable
        });
        
        // Move to next slot
        slotStart = addMinutes(slotStart, policy.slotIntervalMins);
      }
    }
    
    results.push({
      date: format(currentDate, 'yyyy-MM-dd'),
      slots: dailySlots
    });
    
    currentDate = addDays(currentDate, 1);
  }
  
  return results;
}

/**
 * Distribute slots among staff members based on distribution strategy
 */
export function distributeSlots(
  slots: DailySlots[],
  staffMembers: Array<{ id: string; weight: number }>,
  distribution: 'single' | 'round_robin' | 'optimize_availability' | 'equal_distribution',
  existingBookingCounts: Map<string, number> = new Map()
): DailySlots[] {
  if (staffMembers.length === 0) {
    return slots;
  }
  
  if (distribution === 'single') {
    // Assign all slots to the first staff member
    return slots.map(day => ({
      ...day,
      slots: day.slots.map(slot => ({
        ...slot,
        staffId: staffMembers[0].id
      }))
    }));
  }
  
  const distributedSlots: DailySlots[] = [];
  let staffIndex = 0;
  
  for (const day of slots) {
    const daySlots: SlotInfo[] = [];
    
    for (const slot of day.slots) {
      let assignedStaffId: string;
      
      switch (distribution) {
        case 'round_robin':
          // Rotate through staff members
          assignedStaffId = staffMembers[staffIndex % staffMembers.length].id;
          staffIndex++;
          break;
          
        case 'optimize_availability':
          // Assign to staff with least bookings (considering weight)
          assignedStaffId = findOptimalStaff(staffMembers, existingBookingCounts);
          break;
          
        case 'equal_distribution':
          // Distribute equally among all staff
          assignedStaffId = findEqualDistributionStaff(staffMembers, existingBookingCounts);
          break;
          
        default:
          assignedStaffId = staffMembers[0].id;
      }
      
      daySlots.push({
        ...slot,
        staffId: assignedStaffId
      });
      
      // Update booking count for tracking
      existingBookingCounts.set(
        assignedStaffId,
        (existingBookingCounts.get(assignedStaffId) || 0) + 1
      );
    }
    
    distributedSlots.push({
      date: day.date,
      slots: daySlots
    });
  }
  
  return distributedSlots;
}

function findOptimalStaff(
  staffMembers: Array<{ id: string; weight: number }>,
  bookingCounts: Map<string, number>
): string {
  let optimalStaff = staffMembers[0];
  let minLoad = Infinity;
  
  for (const staff of staffMembers) {
    const count = bookingCounts.get(staff.id) || 0;
    const load = count / staff.weight; // Consider weight in load calculation
    
    if (load < minLoad) {
      minLoad = load;
      optimalStaff = staff;
    }
  }
  
  return optimalStaff.id;
}

function findEqualDistributionStaff(
  staffMembers: Array<{ id: string; weight: number }>,
  bookingCounts: Map<string, number>
): string {
  let minCount = Infinity;
  let selectedStaff = staffMembers[0];
  
  for (const staff of staffMembers) {
    const count = bookingCounts.get(staff.id) || 0;
    if (count < minCount) {
      minCount = count;
      selectedStaff = staff;
    }
  }
  
  return selectedStaff.id;
}

/**
 * Check if a specific slot is still available
 */
export function isSlotAvailable(
  slotStart: Date,
  slotEnd: Date,
  policy: AvailabilityPolicy,
  existingBookings: Booking[],
  staffId?: string
): boolean {
  const now = new Date();
  const minNoticeTime = addMinutes(now, policy.minNoticeMins);
  
  // Check minimum notice
  if (isBefore(slotStart, minNoticeTime)) {
    return false;
  }
  
  // Apply buffers
  const bufferedStart = addMinutes(slotStart, -policy.bufferBeforeMins);
  const bufferedEnd = addMinutes(slotEnd, policy.bufferAfterMins);
  
  // Check for conflicts
  return !existingBookings.some(booking => {
    if (staffId && booking.staffId && booking.staffId !== staffId) {
      return false;
    }
    
    return (
      (isAfter(bufferedEnd, booking.startTime) && isBefore(bufferedStart, booking.endTime)) ||
      (isAfter(booking.endTime, bufferedStart) && isBefore(booking.startTime, bufferedEnd))
    );
  });
}