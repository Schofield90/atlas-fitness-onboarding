'use client';

import React, { useState } from 'react';
import { Calendar, momentLocalizer, View } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import './BookingCalendar.css';

const localizer = momentLocalizer(moment);

// Static mock data for demo purposes
const MOCK_CLASSES = [
  // Today
  {
    id: 'demo-1',
    title: 'Morning HIIT (8 spots)',
    start: moment().hour(9).minute(0).toDate(),
    end: moment().hour(10).minute(0).toDate(),
    resource: {
      id: 'demo-1',
      name: 'Morning HIIT',
      description: 'High-intensity interval training to start your day',
      spaces_available: 8,
      max_capacity: 15,
      instructor: 'Sarah Johnson',
      price: '£15'
    }
  },
  {
    id: 'demo-2',
    title: 'Yoga Flow (12 spots)',
    start: moment().hour(10).minute(30).toDate(),
    end: moment().hour(11).minute(30).toDate(),
    resource: {
      id: 'demo-2',
      name: 'Yoga Flow',
      description: 'Relaxing flow for flexibility and mindfulness',
      spaces_available: 12,
      max_capacity: 20,
      instructor: 'Mike Chen',
      price: '£12'
    }
  },
  {
    id: 'demo-3',
    title: 'Strength Training (FULL - Waitlist)',
    start: moment().hour(18).minute(0).toDate(),
    end: moment().hour(19).minute(0).toDate(),
    resource: {
      id: 'demo-3',
      name: 'Strength Training',
      description: 'Build muscle and improve your strength',
      spaces_available: 0,
      max_capacity: 10,
      instructor: 'Alex Rodriguez',
      price: '£20'
    }
  },
  // Tomorrow
  {
    id: 'demo-4',
    title: 'Morning HIIT (15 spots)',
    start: moment().add(1, 'day').hour(9).minute(0).toDate(),
    end: moment().add(1, 'day').hour(10).minute(0).toDate(),
    resource: {
      id: 'demo-4',
      name: 'Morning HIIT',
      description: 'High-intensity interval training to start your day',
      spaces_available: 15,
      max_capacity: 15,
      instructor: 'Sarah Johnson',
      price: '£15'
    }
  },
  {
    id: 'demo-5',
    title: 'Free Trial Class (5 spots)',
    start: moment().add(1, 'day').hour(16).minute(0).toDate(),
    end: moment().add(1, 'day').hour(17).minute(0).toDate(),
    resource: {
      id: 'demo-5',
      name: 'Free Trial Class',
      description: 'Try our gym with a complimentary session',
      spaces_available: 5,
      max_capacity: 8,
      instructor: 'Team Atlas',
      price: 'FREE'
    }
  },
  // Day after tomorrow
  {
    id: 'demo-6',
    title: 'Yoga Flow (18 spots)',
    start: moment().add(2, 'days').hour(10).minute(30).toDate(),
    end: moment().add(2, 'days').hour(11).minute(30).toDate(),
    resource: {
      id: 'demo-6',
      name: 'Yoga Flow',
      description: 'Relaxing flow for flexibility and mindfulness',
      spaces_available: 18,
      max_capacity: 20,
      instructor: 'Mike Chen',
      price: '£12'
    }
  }
];

interface BookingDemoProps {
  onSignupClick: () => void;
}

const BookingDemo: React.FC<BookingDemoProps> = ({ onSignupClick }) => {
  const [selectedClass, setSelectedClass] = useState<any>(null);
  const [view, setView] = useState<View>('week');
  const [date, setDate] = useState(new Date());

  const eventStyleGetter = (event: any) => {
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

  const handleSelectEvent = (event: any) => {
    setSelectedClass(event.resource);
  };

  const handleBookClass = () => {
    alert('This is a demo! Sign up to enable real bookings and start managing your fitness journey.');
    onSignupClick();
  };

  return (
    <div className="booking-calendar h-full">
      {/* Demo Notice */}
      <div className="bg-blue-900/20 border border-blue-600 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-blue-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h4 className="font-medium text-blue-300 mb-1">Interactive Demo</h4>
            <p className="text-sm text-blue-200 mb-2">
              This is a fully interactive demo of our booking system. Click on any class to see the booking flow!
            </p>
            <button 
              onClick={onSignupClick}
              className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded transition-colors"
            >
              Start Free Trial for Real Bookings
            </button>
          </div>
        </div>
      </div>

      <Calendar
        localizer={localizer}
        events={MOCK_CLASSES}
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
      
      {/* Demo Booking Modal */}
      {selectedClass && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-semibold text-white">{selectedClass.name}</h3>
              <button
                onClick={() => setSelectedClass(null)}
                className="text-gray-400 hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-3 text-gray-300 mb-6">
              <p className="text-sm">{selectedClass.description}</p>
              
              <div className="flex justify-between">
                <span>Instructor:</span>
                <span className="text-white">{selectedClass.instructor}</span>
              </div>
              
              <div className="flex justify-between">
                <span>Price:</span>
                <span className="text-green-400 font-semibold">{selectedClass.price}</span>
              </div>
              
              <div className="flex justify-between">
                <span>Available Spots:</span>
                <span className={`font-semibold ${
                  selectedClass.spaces_available === 0 ? 'text-red-400' :
                  selectedClass.spaces_available <= 2 ? 'text-yellow-400' :
                  'text-green-400'
                }`}>
                  {selectedClass.spaces_available === 0 
                    ? 'FULL - Join Waitlist' 
                    : `${selectedClass.spaces_available} of ${selectedClass.max_capacity}`
                  }
                </span>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setSelectedClass(null)}
                className="flex-1 px-4 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleBookClass}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedClass.spaces_available === 0
                    ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
              >
                {selectedClass.spaces_available === 0 ? 'Join Waitlist' : 'Book Class'}
              </button>
            </div>
            
            <div className="mt-4 p-3 bg-blue-900/20 border border-blue-600 rounded">
              <p className="text-xs text-blue-300">
                💡 This is a demo booking. Sign up to enable real class bookings and payments!
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingDemo;