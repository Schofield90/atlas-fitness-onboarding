import React from 'react';
import Badge from '../ui/Badge';
import { Users, DollarSign, Clock, MapPin } from 'lucide-react';

interface ClassBlockProps {
  title: string;
  instructor: string;
  time: string;
  duration: number;
  bookings: number;
  capacity: number;
  color: 'orange' | 'purple' | 'blue' | 'green' | 'pink';
  earnings: string;
  room?: string;
  onSelect?: () => void;
}

const ClassBlock: React.FC<ClassBlockProps> = ({
  title,
  instructor,
  time,
  duration,
  bookings,
  capacity,
  color,
  earnings,
  room,
  onSelect
}) => {
  const utilization = (bookings / capacity) * 100;
  
  // Debug logging
  React.useEffect(() => {
    console.log('ClassBlock render:', { title, bookings, capacity });
  }, [title, bookings, capacity]);
  
  const getColorClasses = (color: string) => {
    const colors = {
      orange: 'bg-gradient-to-br from-orange-600/20 to-orange-700/30 border-orange-600/50 hover:from-orange-600/30 hover:to-orange-700/40',
      purple: 'bg-gradient-to-br from-purple-600/20 to-purple-700/30 border-purple-600/50 hover:from-purple-600/30 hover:to-purple-700/40',
      blue: 'bg-gradient-to-br from-blue-600/20 to-blue-700/30 border-blue-600/50 hover:from-blue-600/30 hover:to-blue-700/40',
      green: 'bg-gradient-to-br from-green-600/20 to-green-700/30 border-green-600/50 hover:from-green-600/30 hover:to-green-700/40',
      pink: 'bg-gradient-to-br from-pink-600/20 to-pink-700/30 border-pink-600/50 hover:from-pink-600/30 hover:to-pink-700/40'
    };
    return colors[color] || colors.orange;
  };
  
  const getUtilizationColor = () => {
    if (utilization >= 90) return 'bg-red-500';
    if (utilization >= 80) return 'bg-amber-500';
    if (utilization >= 60) return 'bg-orange-500';
    return 'bg-green-500';
  };
  
  return (
    <div
      onClick={() => {
        console.log('ClassBlock clicked:', { title, bookings, capacity });
        if (onSelect) onSelect();
      }}
      className={`
        relative px-2 py-1 rounded cursor-pointer
        border transition-all duration-200 hover:shadow-md
        ${getColorClasses(color)}
      `}
      style={{ 
        height: 'calc(100% - 4px)',
        fontSize: '11px'
      }}
    >
      {/* Title and Time */}
      <div className="flex items-start justify-between mb-1">
        <h4 className="font-semibold text-white text-xs truncate flex-1">{title}</h4>
        <span className="text-xs text-gray-300 ml-1">{duration}m</span>
      </div>
      
      {/* Instructor */}
      <p className="text-xs text-gray-300 truncate mb-1">{instructor}</p>
      
      {/* Capacity */}
      <div className="flex items-center justify-between">
        <div className="flex-1 mr-2">
          <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
            <div 
              className={`h-full ${getUtilizationColor()}`}
              style={{ width: `${Math.min(utilization, 100)}%` }}
            />
          </div>
        </div>
        <span className="text-xs text-white">
          {bookings}/{capacity}
        </span>
      </div>
    </div>
  );
};

export default ClassBlock;