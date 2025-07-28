import React, { useState } from 'react';
import ClassBlock from './ClassBlock';

const timeSlots = [
  '6:00 AM', '7:00 AM', '8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM',
  '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM',
  '6:00 PM', '7:00 PM', '8:00 PM', '9:00 PM'
];

const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Mock class data
const mockClasses = [
  {
    id: '1',
    title: 'HIIT Blast',
    instructor: 'Sarah Chen',
    time: '9:00 AM',
    duration: 45,
    bookings: 18,
    capacity: 20,
    color: 'orange' as const,
    earnings: '$360',
    room: 'Studio A',
    day: 0, // Monday
    timeSlot: 3 // 9:00 AM
  },
  {
    id: '2',
    title: 'Power Yoga',
    instructor: 'Marcus Johnson',
    time: '10:30 AM',
    duration: 60,
    bookings: 22,
    capacity: 25,
    color: 'purple' as const,
    earnings: '$440',
    room: 'Studio B',
    day: 0,
    timeSlot: 4
  },
  {
    id: '3',
    title: 'Strength Training',
    instructor: 'Emily Rodriguez',
    time: '6:00 PM',
    duration: 75,
    bookings: 15,
    capacity: 15,
    color: 'blue' as const,
    earnings: '$450',
    room: 'Gym Floor',
    day: 0,
    timeSlot: 12
  },
  {
    id: '4',
    title: 'Morning Flow',
    instructor: 'Lisa Thompson',
    time: '7:00 AM',
    duration: 50,
    bookings: 12,
    capacity: 16,
    color: 'green' as const,
    earnings: '$240',
    room: 'Studio A',
    day: 1,
    timeSlot: 1
  },
  {
    id: '5',
    title: 'HIIT Express',
    instructor: 'David Kim',
    time: '12:00 PM',
    duration: 30,
    bookings: 20,
    capacity: 18,
    color: 'orange' as const,
    earnings: '$300',
    room: 'Studio B',
    day: 1,
    timeSlot: 6
  },
  {
    id: '6',
    title: 'Pilates Core',
    instructor: 'Sarah Chen',
    time: '5:00 PM',
    duration: 45,
    bookings: 14,
    capacity: 20,
    color: 'pink' as const,
    earnings: '$280',
    room: 'Studio A',
    day: 2,
    timeSlot: 11
  }
];

interface PremiumCalendarGridProps {
  classes?: any[];
  loading?: boolean;
}

const PremiumCalendarGrid: React.FC<PremiumCalendarGridProps> = ({ classes = [], loading = false }) => {
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  
  const getClassesForDayAndTime = (dayIndex: number, timeIndex: number) => {
    return classes.filter(cls => cls.day === dayIndex && cls.timeSlot === timeIndex);
  };
  
  if (loading) {
    return (
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-8">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
            <p className="text-gray-400">Loading classes...</p>
          </div>
        </div>
      </div>
    );
  }
  
  if (!classes || classes.length === 0) {
    return (
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-8">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-300 mb-2">No Classes Scheduled</h3>
            <p className="text-gray-500">Click the "Add Class" button to create your first class.</p>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden shadow-2xl">
      <div className="grid grid-cols-8 h-full">
        {/* Time column */}
        <div className="border-r border-gray-700 bg-gray-800/50">
          <div className="h-16 border-b border-gray-700 flex items-center justify-center">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Time
            </span>
          </div>
          {timeSlots.map((time, index) => (
            <div
              key={index}
              className="h-20 border-b border-gray-700 px-3 py-2 flex items-start justify-end"
            >
              <span className="text-xs text-gray-500 font-medium">
                {time}
              </span>
            </div>
          ))}
        </div>
        
        {/* Day columns */}
        {days.map((day, dayIndex) => (
          <div key={dayIndex} className="border-r border-gray-700 last:border-r-0">
            {/* Day header */}
            <div className="h-16 border-b border-gray-700 p-3 bg-gray-800/30">
              <div className="text-center">
                <div className="font-semibold text-white text-sm">{day}</div>
                <div className="text-xs text-gray-400 mt-1">
                  {new Date(Date.now() + dayIndex * 24 * 60 * 60 * 1000).getDate()}
                </div>
              </div>
            </div>
            
            {/* Time slots */}
            <div className="relative">
              {timeSlots.map((_, timeIndex) => (
                <div
                  key={timeIndex}
                  className="h-20 border-b border-gray-700 relative"
                >
                  {/* Classes in this time slot */}
                  {getClassesForDayAndTime(dayIndex, timeIndex).map((cls, classIndex) => (
                    <div
                      key={cls.id}
                      className="absolute inset-x-2 top-1"
                      style={{ 
                        zIndex: classIndex + 1,
                        transform: `translateY(${classIndex * 4}px)`
                      }}
                    >
                      <ClassBlock
                        {...cls}
                        onSelect={() => setSelectedClass(cls.id)}
                      />
                    </div>
                  ))}
                </div>
              ))}
              
              {/* Add class button overlay */}
              <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-200">
                <div className="h-full w-full flex items-center justify-center">
                  <button 
                    className="bg-slate-800/90 hover:bg-slate-700/90 border border-slate-600 rounded-lg px-3 py-2 text-xs text-slate-300 hover:text-white transition-colors backdrop-blur-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      console.log(`Add class on ${day}`);
                      alert(`Add class modal would open for ${day}`);
                    }}
                  >
                    + Add Class
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Current time indicator - only render on client */}
      {typeof window !== 'undefined' && (
        <div className="absolute left-16 right-0 pointer-events-none">
          <div 
            className="h-0.5 bg-orange-500 shadow-lg"
            style={{
              top: `${16 + (new Date().getHours() - 6) * 80 + (new Date().getMinutes() / 60) * 80}px`,
              display: new Date().getHours() >= 6 && new Date().getHours() <= 21 ? 'block' : 'none'
            }}
          >
            <div className="w-3 h-3 bg-orange-500 rounded-full -translate-y-1.5 -translate-x-1.5 shadow-lg" />
          </div>
        </div>
      )}
    </div>
  );
};

export default PremiumCalendarGrid;