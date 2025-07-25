import React, { useState } from 'react';
import { Clock } from 'lucide-react';

const timeRanges = [
  { id: 'today', name: 'Today', active: true },
  { id: 'week', name: 'This Week', active: false },
  { id: 'month', name: 'This Month', active: false },
  { id: 'custom', name: 'Custom Range', active: false }
];

const quickTimes = [
  { id: 'morning', name: 'Morning', time: '6:00 - 12:00', active: 8 },
  { id: 'afternoon', name: 'Afternoon', time: '12:00 - 17:00', active: 6 },
  { id: 'evening', name: 'Evening', time: '17:00 - 21:00', active: 10 }
];

const TimeRangeFilter: React.FC = () => {
  const [selectedRange, setSelectedRange] = useState('today');
  const [selectedTimes, setSelectedTimes] = useState<string[]>([]);
  
  const toggleTimeFilter = (timeId: string) => {
    setSelectedTimes(prev => 
      prev.includes(timeId)
        ? prev.filter(id => id !== timeId)
        : [...prev, timeId]
    );
  };
  
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Clock className="w-4 h-4 text-gray-400" />
        <h3 className="text-sm font-medium text-gray-300">Time Range</h3>
      </div>
      
      {/* Date Range Selector */}
      <div className="space-y-2 mb-4">
        {timeRanges.map((range) => (
          <button
            key={range.id}
            onClick={() => {
              setSelectedRange(range.id);
              console.log(`Filter by time range: ${range.name}`);
              // In a real app, this would filter the calendar
            }}
            className={`
              w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium
              border transition-all duration-200
              ${selectedRange === range.id
                ? 'bg-gray-700 text-white border-gray-600'
                : 'text-gray-300 hover:text-white hover:bg-gray-700 border-transparent'
              }
            `}
          >
            <span>{range.name}</span>
            {range.active && (
              <div className="w-2 h-2 bg-orange-500 rounded-full" />
            )}
          </button>
        ))}
      </div>
      
      {/* Time of Day Filters */}
      <div className="border-t border-gray-700 pt-4">
        <h4 className="text-xs font-medium text-gray-400 mb-2 uppercase tracking-wide">
          Time of Day
        </h4>
        <div className="space-y-2">
          {quickTimes.map((time) => (
            <button
              key={time.id}
              onClick={() => {
                toggleTimeFilter(time.id);
                console.log(`Toggle time filter: ${time.name} (${time.time})`);
                // In a real app, this would filter the calendar
              }}
              className={`
                w-full px-3 py-2 rounded-lg text-sm border transition-all duration-200
                ${selectedTimes.includes(time.id)
                  ? 'bg-orange-600/20 text-orange-300 border-orange-600/50'
                  : 'text-gray-300 hover:text-white hover:bg-gray-700 border-transparent'
                }
              `}
            >
              <div className="flex items-center justify-between">
                <div className="text-left">
                  <div className="font-medium">{time.name}</div>
                  <div className="text-xs opacity-75">{time.time}</div>
                </div>
                <span className="text-xs font-medium">{time.active} classes</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TimeRangeFilter;