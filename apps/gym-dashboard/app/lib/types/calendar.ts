export interface TimeSlot {
  id: string
  startTime: string // ISO string
  endTime: string // ISO string
  available: boolean
}

export interface CalendarEvent {
  id: string
  title: string
  description?: string
  startTime: string // ISO string
  endTime: string // ISO string
  attendees: {
    email: string
    name?: string
  }[]
  meetingUrl?: string
  status: 'confirmed' | 'tentative' | 'cancelled'
  leadId?: string
  organizationId: string
  createdBy: string
  googleEventId?: string
}

export interface BookingSlot {
  date: string // YYYY-MM-DD
  slots: TimeSlot[]
}

export interface CalendarSettings {
  workingHours: {
    [day: string]: {
      enabled: boolean
      start: string // HH:mm
      end: string // HH:mm
    }
  }
  slotDuration: number // minutes
  bufferTime: number // minutes between appointments
  timezone: string
  googleCalendarId?: string
  googleCalendarConnected: boolean
}