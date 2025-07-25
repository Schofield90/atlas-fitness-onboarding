import React, { useState } from 'react';
import { Users } from 'lucide-react';

const instructors = [
  { id: 'all', name: 'All Instructors', avatar: null, classes: 24, status: 'active' },
  { id: '1', name: 'Sarah Chen', avatar: '👩‍💼', classes: 8, status: 'active' },
  { id: '2', name: 'Marcus Johnson', avatar: '👨‍💪', classes: 6, status: 'active' },
  { id: '3', name: 'Emily Rodriguez', avatar: '👩‍🏫', classes: 5, status: 'active' },
  { id: '4', name: 'David Kim', avatar: '👨‍🎓', classes: 3, status: 'busy' },
  { id: '5', name: 'Lisa Thompson', avatar: '👩‍⚕️', classes: 2, status: 'offline' }
];

const InstructorFilter: React.FC = () => {
  const [selectedInstructor, setSelectedInstructor] = useState('all');
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'busy': return 'bg-amber-500';
      case 'offline': return 'bg-slate-500';
      default: return 'bg-slate-500';
    }
  };
  
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Users className="w-4 h-4 text-gray-400" />
        <h3 className="text-sm font-medium text-gray-300">Instructors</h3>
      </div>
      
      <div className="space-y-2">
        {instructors.map((instructor) => (
          <button
            key={instructor.id}
            onClick={() => {
              setSelectedInstructor(instructor.id);
              console.log(`Filter by instructor: ${instructor.name}`);
              // In a real app, this would filter the calendar
            }}
            className={`
              w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm
              transition-all duration-200 border
              ${selectedInstructor === instructor.id
                ? 'bg-gray-700 text-white border-gray-600'
                : 'text-gray-300 hover:text-white hover:bg-gray-700 border-transparent'
              }
            `}
          >
            <div className="flex items-center gap-2 flex-1">
              {instructor.avatar && (
                <div className="relative">
                  <span className="text-lg">{instructor.avatar}</span>
                  {instructor.id !== 'all' && (
                    <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-gray-900 ${getStatusColor(instructor.status)}`} />
                  )}
                </div>
              )}
              <span className="font-medium">{instructor.name}</span>
            </div>
            <span className="text-xs opacity-75">{instructor.classes}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default InstructorFilter;