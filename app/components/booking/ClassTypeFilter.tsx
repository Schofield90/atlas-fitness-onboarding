import React, { useState } from 'react';
import { Filter } from 'lucide-react';

const classTypes = [
  { id: 'all', name: 'All Classes', count: 24, color: 'slate' },
  { id: 'hiit', name: 'HIIT', count: 8, color: 'orange' },
  { id: 'yoga', name: 'Yoga', count: 6, color: 'purple' },
  { id: 'strength', name: 'Strength', count: 5, color: 'blue' },
  { id: 'cardio', name: 'Cardio', count: 3, color: 'green' },
  { id: 'pilates', name: 'Pilates', count: 2, color: 'pink' }
];

const ClassTypeFilter: React.FC = () => {
  const [selectedType, setSelectedType] = useState('all');
  
  const getColorClasses = (color: string, isSelected: boolean) => {
    const colors = {
      slate: isSelected ? 'bg-slate-700 text-white border-slate-600' : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800',
      orange: isSelected ? 'bg-orange-600 text-white border-orange-500' : 'text-orange-400 hover:text-orange-300 hover:bg-orange-950',
      purple: isSelected ? 'bg-purple-600 text-white border-purple-500' : 'text-purple-400 hover:text-purple-300 hover:bg-purple-950',
      blue: isSelected ? 'bg-blue-600 text-white border-blue-500' : 'text-blue-400 hover:text-blue-300 hover:bg-blue-950',
      green: isSelected ? 'bg-green-600 text-white border-green-500' : 'text-green-400 hover:text-green-300 hover:bg-green-950',
      pink: isSelected ? 'bg-pink-600 text-white border-pink-500' : 'text-pink-400 hover:text-pink-300 hover:bg-pink-950'
    };
    return colors[color] || colors.slate;
  };
  
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Filter className="w-4 h-4 text-slate-400" />
        <h3 className="text-sm font-medium text-slate-300">Class Types</h3>
      </div>
      
      <div className="space-y-2">
        {classTypes.map((type) => (
          <button
            key={type.id}
            onClick={() => setSelectedType(type.id)}
            className={`
              w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium
              border transition-all duration-200
              ${getColorClasses(type.color, selectedType === type.id)}
            `}
          >
            <span>{type.name}</span>
            <span className="text-xs opacity-75">{type.count}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ClassTypeFilter;