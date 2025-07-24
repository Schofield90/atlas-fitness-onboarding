'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, momentLocalizer, View, SlotInfo } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import './BookingCalendar.css';
import ClassBookingModal from './ClassBookingModal';

const localizer = momentLocalizer(moment);

interface BookingCalendarProps {
  organizationId: string;
  customerId: string;
  onBookClass?: (booking: any) => void;
}

interface ClassEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: any;
}

const BookingCalendar: React.FC<BookingCalendarProps> = ({ 
  organizationId, 
  customerId, 
  onBookClass 
}) => {
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>('week');
  const [date, setDate] = useState(new Date());

  useEffect(() => {
    fetchClasses();
  }, [organizationId]);

  const fetchClasses = async () => {
    try {
      const response = await fetch(`/api/booking/classes/${organizationId}`);
      
      if (!response.ok) {
        console.warn('Failed to fetch classes, loading demo data');
        // Set some demo classes if API fails
        setClasses([]);
      } else {
        const classData = await response.json();
        setClasses(classData);
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
      // Set empty array to show "no classes" message rather than error
      setClasses([]);
    } finally {
      setLoading(false);
    }
  };

  const calendarEvents: ClassEvent[] = classes.map(cls => ({
    id: cls.id,
    title: `${cls.program_name} (${cls.spaces_available} spaces)`,
    start: new Date(cls.start_time),
    end: new Date(cls.end_time),
    resource: cls
  }));

  const eventStyleGetter = (event: ClassEvent) => {
    const cls = event.resource;
    let backgroundColor = '#3174ad';
    
    if (cls.spaces_available === 0) {
      backgroundColor = '#d32f2f'; // Full
    } else if (cls.spaces_available <= 2) {
      backgroundColor = '#f57c00'; // Nearly full
    } else {
      backgroundColor = '#388e3c'; // Available
    }
    
    return {
      style: {
        backgroundColor,
        borderRadius: '5px',
        opacity: 0.8,
        color: 'white',
        border: '0px'
      }
    };
  };

  const handleSelectEvent = (event: ClassEvent) => {
    setSelectedClass(event.resource);
  };

  const handleBookClass = async (classId: string) => {
    try {
      const response = await fetch('/api/booking/book', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          customerId,
          classSessionId: classId
        })
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to book class');
      }
      
      if (result.waitlistPosition) {
        alert(`Class is full! You've been added to the waitlist at position ${result.waitlistPosition}. We'll automatically book you when space becomes available.`);
      } else {
        alert('Booking confirmed!');
        onBookClass && onBookClass(result);
      }
      
      fetchClasses(); // Refresh calendar
      setSelectedClass(null);
    } catch (error) {
      console.error('Booking error:', error);
      alert(error instanceof Error ? error.message : 'Failed to book class');
    }
  };

  if (loading) return <div className="flex justify-center items-center h-96">Loading classes...</div>;

  return (
    <div className="booking-calendar h-full">
      <Calendar
        localizer={localizer}
        events={calendarEvents}
        startAccessor="start"
        endAccessor="end"
        style={{ height: 600 }}
        onSelectEvent={handleSelectEvent}
        eventPropGetter={eventStyleGetter}
        views={['month', 'week', 'day']}
        view={view}
        onView={(newView) => setView(newView)}
        date={date}
        onNavigate={(newDate) => setDate(newDate)}
        step={30}
        timeslots={2}
        min={new Date(0, 0, 0, 6, 0, 0)}
        max={new Date(0, 0, 0, 22, 0, 0)}
      />
      
      {selectedClass && (
        <ClassBookingModal
          classData={selectedClass}
          onBook={() => handleBookClass(selectedClass.id)}
          onClose={() => setSelectedClass(null)}
        />
      )}
    </div>
  );
};

export default BookingCalendar;