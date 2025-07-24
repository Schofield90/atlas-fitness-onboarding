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
      onClick={onSelect}
      className={`
        relative p-4 rounded-lg cursor-pointer
        border transition-all duration-200 hover:scale-[1.02] hover:shadow-lg
        backdrop-blur-sm
        ${getColorClasses(color)}
      `}
      style={{ 
        height: `${Math.max(duration * 1.2, 80)}px`,
        minHeight: '80px'
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-white text-sm truncate">{title}</h4>
          <p className="text-xs text-slate-300 truncate">{instructor}</p>
        </div>
        <Badge variant="success" className="ml-2 text-xs">
          {earnings}
        </Badge>
      </div>
      
      {/* Time and Duration */}
      <div className="flex items-center gap-2 mb-3">
        <Clock className="w-3 h-3 text-slate-400" />
        <span className="text-xs text-slate-300">{time}</span>
        <span className="text-xs text-slate-400">({duration}min)</span>
      </div>
      
      {/* Room */}
      {room && (
        <div className="flex items-center gap-2 mb-3">
          <MapPin className="w-3 h-3 text-slate-400" />
          <span className="text-xs text-slate-300">{room}</span>
        </div>
      )}
      
      {/* Capacity Progress */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-xs mb-1">
          <div className="flex items-center gap-1">
            <Users className="w-3 h-3 text-slate-400" />
            <span className="text-slate-400">Capacity</span>
          </div>
          <span className="text-white font-medium">{bookings}/{capacity}</span>
        </div>
        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-300 ${getUtilizationColor()}`}
            style={{ width: `${Math.min(utilization, 100)}%` }}
          />
        </div>
        {utilization >= 100 && (
          <div className="text-xs text-amber-400 mt-1 font-medium">
            Full + {bookings - capacity} waitlist
          </div>
        )}
      </div>
      
      {/* Quick Actions */}
      <div className="flex gap-2 mt-auto">
        <button 
          className="text-xs text-slate-400 hover:text-white transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            // Handle view details
          }}
        >
          Details
        </button>
        <button 
          className="text-xs text-slate-400 hover:text-white transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            // Handle message class
          }}
        >
          Message
        </button>
      </div>
      
      {/* Status Indicators */}
      {utilization >= 100 && (
        <div className="absolute top-2 right-2">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
        </div>
      )}
    </div>
  );
};

export default ClassBlock;