import { describe, it, expect, beforeEach } from 'vitest';
import { addDays, addMinutes, setHours, setMinutes, startOfDay } from 'date-fns';
import { generateSlots, distributeSlots, isSlotAvailable, AvailabilityPolicy, Booking } from './generateSlots';

describe('generateSlots', () => {
  let basePolicy: AvailabilityPolicy;
  let testDate: Date;

  beforeEach(() => {
    testDate = setHours(setMinutes(new Date(), 0), 9); // 9:00 AM today
    
    basePolicy = {
      workHours: {
        Mon: [['08:00', '18:00']],
        Tue: [['08:00', '18:00']],
        Wed: [['08:00', '18:00']],
        Thu: [['08:00', '18:00']],
        Fri: [['08:00', '18:00']],
        Sat: [],
        Sun: []
      },
      slotIntervalMins: 30,
      durationMins: 15,
      bufferBeforeMins: 0,
      bufferAfterMins: 15,
      minNoticeMins: 60,
      dateRangeDays: 7,
      maxPerSlotPerUser: 1,
      lookBusyPercent: 0,
      timezone: 'UTC'
    };
  });

  describe('basic slot generation', () => {
    it('should generate slots for a single day', () => {
      const startDate = startOfDay(testDate);
      const endDate = addDays(startDate, 1);
      
      const slots = generateSlots(basePolicy, startDate, endDate);
      
      expect(slots).toHaveLength(1);
      expect(slots[0].slots.length).toBeGreaterThan(0);
      
      // Check first slot starts at 8:00 AM
      const firstSlot = slots[0].slots[0];
      const firstSlotTime = new Date(firstSlot.startTime);
      expect(firstSlotTime.getHours()).toBe(8);
      expect(firstSlotTime.getMinutes()).toBe(0);
    });

    it('should respect slot interval', () => {
      const startDate = startOfDay(testDate);
      const endDate = addDays(startDate, 1);
      
      const slots = generateSlots(basePolicy, startDate, endDate);
      const daySlots = slots[0].slots;
      
      // Check interval between consecutive slots
      for (let i = 1; i < daySlots.length; i++) {
        const prevStart = new Date(daySlots[i - 1].startTime);
        const currStart = new Date(daySlots[i].startTime);
        const diffMinutes = (currStart.getTime() - prevStart.getTime()) / (1000 * 60);
        expect(diffMinutes).toBe(basePolicy.slotIntervalMins);
      }
    });

    it('should respect slot duration', () => {
      const startDate = startOfDay(testDate);
      const endDate = addDays(startDate, 1);
      
      const slots = generateSlots(basePolicy, startDate, endDate);
      const daySlots = slots[0].slots;
      
      daySlots.forEach(slot => {
        const start = new Date(slot.startTime);
        const end = new Date(slot.endTime);
        const durationMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
        expect(durationMinutes).toBe(basePolicy.durationMins);
      });
    });
  });

  describe('minimum notice', () => {
    it('should mark slots as unavailable within minimum notice period', () => {
      const now = new Date();
      const startDate = now;
      const endDate = addDays(now, 1);
      
      const slots = generateSlots(basePolicy, startDate, endDate);
      const daySlots = slots[0].slots;
      
      daySlots.forEach(slot => {
        const slotStart = new Date(slot.startTime);
        const timeDiff = (slotStart.getTime() - now.getTime()) / (1000 * 60);
        
        if (timeDiff < basePolicy.minNoticeMins) {
          expect(slot.available).toBe(false);
        }
      });
    });

    it('should mark slots as available after minimum notice period', () => {
      const now = new Date();
      const startDate = addDays(now, 2); // Start 2 days from now
      const endDate = addDays(startDate, 1);
      
      const slots = generateSlots(basePolicy, startDate, endDate);
      const daySlots = slots[0].slots;
      
      // All slots should be available (well beyond min notice)
      const availableSlots = daySlots.filter(s => s.available);
      expect(availableSlots.length).toBe(daySlots.length);
    });
  });

  describe('buffers', () => {
    it('should apply after buffer to prevent overlapping bookings', () => {
      const startDate = addDays(new Date(), 2);
      const endDate = addDays(startDate, 1);
      
      // Create a booking at 10:00 AM
      const bookingStart = setHours(setMinutes(startDate, 0), 10);
      const existingBookings: Booking[] = [{
        startTime: bookingStart,
        endTime: addMinutes(bookingStart, 15)
      }];
      
      const slots = generateSlots(basePolicy, startDate, endDate, existingBookings);
      const daySlots = slots[0].slots;
      
      // Find slots around the booking
      const conflictingSlots = daySlots.filter(slot => {
        const slotStart = new Date(slot.startTime);
        const slotHour = slotStart.getHours();
        const slotMin = slotStart.getMinutes();
        
        // Check slots that would conflict with buffer
        // Booking is 10:00-10:15, with 15min after buffer = 10:00-10:30
        // So 10:00 and 10:15 slots should be unavailable
        return (slotHour === 10 && slotMin < 30);
      });
      
      conflictingSlots.forEach(slot => {
        expect(slot.available).toBe(false);
      });
    });
  });

  describe('date range', () => {
    it('should limit slots to specified date range', () => {
      const startDate = new Date();
      const endDate = addDays(startDate, 30); // Request 30 days
      
      basePolicy.dateRangeDays = 7; // But policy limits to 7 days
      
      const slots = generateSlots(basePolicy, startDate, endDate);
      
      // Should only generate 7 days worth of slots
      expect(slots.length).toBeLessThanOrEqual(7);
    });
  });

  describe('look busy percentage', () => {
    it('should randomly hide slots based on look busy percentage', () => {
      const startDate = addDays(new Date(), 2);
      const endDate = addDays(startDate, 1);
      
      basePolicy.lookBusyPercent = 50; // Hide 50% of slots
      
      const slots = generateSlots(basePolicy, startDate, endDate);
      const daySlots = slots[0].slots;
      
      const availableCount = daySlots.filter(s => s.available).length;
      const totalCount = daySlots.length;
      
      // Roughly 50% should be unavailable (with some variance due to randomness)
      expect(availableCount).toBeLessThan(totalCount);
    });
  });

  describe('existing bookings', () => {
    it('should mark slots as unavailable when they conflict with existing bookings', () => {
      const startDate = addDays(new Date(), 2);
      const endDate = addDays(startDate, 1);
      
      // Create existing bookings
      const existingBookings: Booking[] = [
        {
          startTime: setHours(setMinutes(startDate, 0), 9),
          endTime: setHours(setMinutes(startDate, 15), 9)
        },
        {
          startTime: setHours(setMinutes(startDate, 0), 14),
          endTime: setHours(setMinutes(startDate, 30), 14)
        }
      ];
      
      const slots = generateSlots(basePolicy, startDate, endDate, existingBookings);
      const daySlots = slots[0].slots;
      
      // Check that slots at 9:00 and 14:00 are unavailable
      const slot9am = daySlots.find(s => {
        const time = new Date(s.startTime);
        return time.getHours() === 9 && time.getMinutes() === 0;
      });
      
      const slot2pm = daySlots.find(s => {
        const time = new Date(s.startTime);
        return time.getHours() === 14 && time.getMinutes() === 0;
      });
      
      expect(slot9am?.available).toBe(false);
      expect(slot2pm?.available).toBe(false);
    });
  });
});

describe('distributeSlots', () => {
  const mockSlots = [{
    date: '2024-01-01',
    slots: [
      { startTime: '2024-01-01T09:00:00Z', endTime: '2024-01-01T09:15:00Z', available: true },
      { startTime: '2024-01-01T09:30:00Z', endTime: '2024-01-01T09:45:00Z', available: true },
      { startTime: '2024-01-01T10:00:00Z', endTime: '2024-01-01T10:15:00Z', available: true },
      { startTime: '2024-01-01T10:30:00Z', endTime: '2024-01-01T10:45:00Z', available: true }
    ]
  }];

  const mockStaff = [
    { id: 'staff1', weight: 1 },
    { id: 'staff2', weight: 1 },
    { id: 'staff3', weight: 2 } // Higher weight = can handle more bookings
  ];

  it('should assign all slots to single staff when distribution is single', () => {
    const distributed = distributeSlots(mockSlots, mockStaff, 'single');
    
    distributed[0].slots.forEach(slot => {
      expect(slot.staffId).toBe('staff1');
    });
  });

  it('should rotate staff assignments with round_robin', () => {
    const distributed = distributeSlots(mockSlots, mockStaff, 'round_robin');
    const slots = distributed[0].slots;
    
    expect(slots[0].staffId).toBe('staff1');
    expect(slots[1].staffId).toBe('staff2');
    expect(slots[2].staffId).toBe('staff3');
    expect(slots[3].staffId).toBe('staff1'); // Wraps around
  });

  it('should optimize availability based on weights', () => {
    const bookingCounts = new Map([
      ['staff1', 5],
      ['staff2', 5],
      ['staff3', 8] // Has more capacity due to weight
    ]);
    
    const distributed = distributeSlots(mockSlots, mockStaff, 'optimize_availability', bookingCounts);
    const slots = distributed[0].slots;
    
    // Staff3 should get more slots due to higher weight
    const staff3Slots = slots.filter(s => s.staffId === 'staff3').length;
    expect(staff3Slots).toBeGreaterThan(0);
  });

  it('should distribute equally regardless of weight', () => {
    const distributed = distributeSlots(mockSlots, mockStaff, 'equal_distribution');
    const slots = distributed[0].slots;
    
    const counts = new Map<string, number>();
    slots.forEach(slot => {
      counts.set(slot.staffId!, (counts.get(slot.staffId!) || 0) + 1);
    });
    
    // Check that distribution is relatively equal
    const values = Array.from(counts.values());
    const max = Math.max(...values);
    const min = Math.min(...values);
    expect(max - min).toBeLessThanOrEqual(1);
  });
});

describe('isSlotAvailable', () => {
  let policy: AvailabilityPolicy;

  beforeEach(() => {
    policy = {
      workHours: {},
      slotIntervalMins: 30,
      durationMins: 15,
      bufferBeforeMins: 0,
      bufferAfterMins: 15,
      minNoticeMins: 60,
      dateRangeDays: 7,
      maxPerSlotPerUser: 1,
      lookBusyPercent: 0,
      timezone: 'UTC'
    };
  });

  it('should return false for slots within minimum notice', () => {
    const now = new Date();
    const slotStart = addMinutes(now, 30); // Only 30 minutes from now
    const slotEnd = addMinutes(slotStart, 15);
    
    const available = isSlotAvailable(slotStart, slotEnd, policy, []);
    expect(available).toBe(false);
  });

  it('should return true for available slots', () => {
    const now = new Date();
    const slotStart = addMinutes(now, 120); // 2 hours from now
    const slotEnd = addMinutes(slotStart, 15);
    
    const available = isSlotAvailable(slotStart, slotEnd, policy, []);
    expect(available).toBe(true);
  });

  it('should detect conflicts with existing bookings', () => {
    const now = new Date();
    const slotStart = addMinutes(now, 120);
    const slotEnd = addMinutes(slotStart, 15);
    
    const existingBookings: Booking[] = [{
      startTime: slotStart,
      endTime: slotEnd
    }];
    
    const available = isSlotAvailable(slotStart, slotEnd, policy, existingBookings);
    expect(available).toBe(false);
  });

  it('should respect staff assignment when checking conflicts', () => {
    const now = new Date();
    const slotStart = addMinutes(now, 120);
    const slotEnd = addMinutes(slotStart, 15);
    
    const existingBookings: Booking[] = [{
      startTime: slotStart,
      endTime: slotEnd,
      staffId: 'staff1'
    }];
    
    // Should be available for staff2
    const available = isSlotAvailable(slotStart, slotEnd, policy, existingBookings, 'staff2');
    expect(available).toBe(true);
    
    // Should not be available for staff1
    const notAvailable = isSlotAvailable(slotStart, slotEnd, policy, existingBookings, 'staff1');
    expect(notAvailable).toBe(false);
  });
});