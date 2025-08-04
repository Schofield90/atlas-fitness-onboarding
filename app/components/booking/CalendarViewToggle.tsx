import React from 'react';
import { Calendar, Grid, List, ChevronLeft, ChevronRight } from 'lucide-react';
import Button from '../ui/Button';

interface CalendarViewToggleProps {
  view: 'day' | 'week' | 'month';
  currentDate: Date;
  onViewChange: (view: 'day' | 'week' | 'month') => void;
  onDateChange: (date: Date) => void;
}

const CalendarViewToggle: React.FC<CalendarViewToggleProps> = ({ 
  view, 
  currentDate, 
  onViewChange, 
  onDateChange 
}) => {
  
  const formatDateRange = () => {
    const start = new Date(currentDate);
    const end = new Date(currentDate);
    
    switch (view) {
      case 'day':
        return start.toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        });
      case 'week':
        start.setDate(start.getDate() - start.getDay());
        end.setDate(start.getDate() + 6);
        return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
      case 'month':
        return start.toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long' 
        });
    }
  };
  
  const navigate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    
    switch (view) {
      case 'day':
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
        break;
      case 'week':
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
        break;
      case 'month':
        newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
        break;
    }
    
    onDateChange(newDate);
  };
  
  return (
    <div className="flex items-center justify-between mb-6">
      {/* Navigation */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('prev')}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold text-white">
              {formatDateRange()}
            </h2>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('next')}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => onDateChange(new Date())}
        >
          Today
        </Button>
      </div>
      
      {/* View Toggle */}
      <div className="flex items-center gap-2">
        <div className="flex bg-gray-800 border border-gray-700 rounded-lg p-1">
          <button
            onClick={() => onViewChange('day')}
            className={`
              px-3 py-1.5 text-sm font-medium rounded-md transition-colors
              ${view === 'day' 
                ? 'bg-orange-600 text-white' 
                : 'text-gray-300 hover:text-white hover:bg-gray-700'
              }
            `}
          >
            Day
          </button>
          <button
            onClick={() => onViewChange('week')}
            className={`
              px-3 py-1.5 text-sm font-medium rounded-md transition-colors
              ${view === 'week' 
                ? 'bg-orange-600 text-white' 
                : 'text-gray-300 hover:text-white hover:bg-gray-700'
              }
            `}
          >
            Week
          </button>
          <button
            onClick={() => onViewChange('month')}
            className={`
              px-3 py-1.5 text-sm font-medium rounded-md transition-colors
              ${view === 'month' 
                ? 'bg-orange-600 text-white' 
                : 'text-gray-300 hover:text-white hover:bg-gray-700'
              }
            `}
          >
            Month
          </button>
        </div>
        
        <div className="h-6 w-px bg-gray-700" />
        
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => {
            console.log('Grid view clicked');
            alert('Grid view would be shown here');
          }}
          title="Grid View"
        >
          <Grid className="w-4 h-4" />
        </Button>
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => {
            console.log('List view clicked');
            alert('List view would be shown here');
          }}
          title="List View"
        >
          <List className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export default CalendarViewToggle;