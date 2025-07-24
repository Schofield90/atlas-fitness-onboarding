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
        <Users className="w-4 h-4 text-slate-400" />
        <h3 className="text-sm font-medium text-slate-300">Instructors</h3>
      </div>
      
      <div className="space-y-2">
        {instructors.map((instructor) => (
          <button
            key={instructor.id}
            onClick={() => setSelectedInstructor(instructor.id)}
            className={`
              w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm
              transition-all duration-200 border
              ${selectedInstructor === instructor.id
                ? 'bg-slate-700 text-white border-slate-600'
                : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800 border-transparent'
              }
            `}
          >
            <div className="flex items-center gap-2 flex-1">
              {instructor.avatar && (
                <div className="relative">
                  <span className="text-lg">{instructor.avatar}</span>
                  {instructor.id !== 'all' && (
                    <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-slate-900 ${getStatusColor(instructor.status)}`} />
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