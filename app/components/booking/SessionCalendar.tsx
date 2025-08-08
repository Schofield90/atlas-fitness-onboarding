'use client';

import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Clock, Users, MapPin } from 'lucide-react';
import { format, startOfWeek, addDays, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, getDay } from 'date-fns';
import { Badge } from '@/app/components/ui/Badge';

interface ClassSession {
  id: string;
  start_at: string;
  end_at: string;
  capacity: number;
  class: {
    id: string;
    name: string;
    category?: string;
  };
  instructor?: {
    full_name: string;
  };
  bookings?: Array<{
    status: string;
  }>;
}

interface SessionCalendarProps {
  onSessionClick?: (session: ClassSession) => void;
  clientId?: string; // If provided, shows only available sessions for this client
}

export default function SessionCalendar({ onSessionClick, clientId }: SessionCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [sessions, setSessions] = useState<Record<string, ClassSession[]>>({});
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'week' | 'month'>('week');

  useEffect(() => {
    fetchSessions();
  }, [currentDate, view]);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      
      let startDate: Date;
      let endDate: Date;
      
      if (view === 'week') {
        startDate = startOfWeek(currentDate, { weekStartsOn: 1 });
        endDate = addDays(startDate, 6);
      } else {
        startDate = startOfMonth(currentDate);
        endDate = endOfMonth(currentDate);
      }

      const params = new URLSearchParams({
        dateFrom: startDate.toISOString(),
        dateTo: endDate.toISOString()
      });

      const response = await fetch(`/api/v2/sessions/schedule?${params}`);
      if (response.ok) {
        const data = await response.json();
        setSessions(data);
      }
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSessionStatus = (session: ClassSession) => {
    const bookedCount = session.bookings?.filter(b => b.status === 'booked').length || 0;
    const availableSpots = session.capacity - bookedCount;
    
    if (availableSpots === 0) return { text: 'Full', color: 'error' };
    if (availableSpots <= 3) return { text: `${availableSpots} left`, color: 'warning' };
    return { text: `${availableSpots} available`, color: 'success' };
  };

  const navigatePeriod = (direction: 'prev' | 'next') => {
    if (view === 'week') {
      setCurrentDate(prev => addDays(prev, direction === 'next' ? 7 : -7));
    } else {
      setCurrentDate(prev => {
        const newDate = new Date(prev);
        newDate.setMonth(prev.getMonth() + (direction === 'next' ? 1 : -1));
        return newDate;
      });
    }
  };

  const renderWeekView = () => {
    const startDate = startOfWeek(currentDate, { weekStartsOn: 1 });
    const days = Array.from({ length: 7 }, (_, i) => addDays(startDate, i));

    return (
      <div className="grid grid-cols-7 gap-4">
        {days.map(day => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const daySessions = sessions[dateKey] || [];
          const isToday = isSameDay(day, new Date());

          return (
            <div key={dateKey} className="min-h-[400px]">
              <div className={`text-center p-2 rounded-t-lg ${
                isToday ? 'bg-blue-500 text-white' : 'bg-gray-100'
              }`}>
                <p className="text-sm font-medium">{format(day, 'EEE')}</p>
                <p className="text-lg font-bold">{format(day, 'd')}</p>
              </div>
              
              <div className="border border-t-0 rounded-b-lg p-2 space-y-2 bg-white">
                {loading ? (
                  <div className="animate-pulse space-y-2">
                    <div className="h-20 bg-gray-200 rounded"></div>
                    <div className="h-20 bg-gray-200 rounded"></div>
                  </div>
                ) : daySessions.length === 0 ? (
                  <p className="text-center text-gray-500 text-sm py-4">
                    No classes
                  </p>
                ) : (
                  daySessions.map(session => {
                    const status = getSessionStatus(session);
                    
                    return (
                      <div
                        key={session.id}
                        className="border rounded-lg p-3 hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => onSessionClick?.(session)}
                      >
                        <p className="font-medium text-sm">
                          {session.class.name}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-gray-600">
                          <Clock className="h-3 w-3" />
                          {format(new Date(session.start_at), 'HH:mm')}
                        </div>
                        {session.instructor && (
                          <p className="text-xs text-gray-600 mt-1">
                            {session.instructor.full_name}
                          </p>
                        )}
                        <Badge 
                          variant={status.color as any} 
                          className="mt-2 text-xs"
                        >
                          {status.text}
                        </Badge>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = startOfWeek(monthEnd, { weekStartsOn: 1 });
    endDate.setDate(endDate.getDate() + 6);
    
    const days = eachDayOfInterval({ start: startDate, end: endDate });

    return (
      <div className="grid grid-cols-7 gap-2">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
          <div key={day} className="text-center font-medium text-sm p-2">
            {day}
          </div>
        ))}
        {days.map(day => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const daySessions = sessions[dateKey] || [];
          const isToday = isSameDay(day, new Date());
          const isCurrentMonth = day.getMonth() === currentDate.getMonth();

          return (
            <div
              key={dateKey}
              className={`min-h-[100px] border rounded-lg p-2 ${
                isCurrentMonth ? 'bg-white' : 'bg-gray-50'
              } ${isToday ? 'ring-2 ring-blue-500' : ''}`}
            >
              <p className={`text-sm font-medium mb-1 ${
                !isCurrentMonth ? 'text-gray-400' : ''
              }`}>
                {format(day, 'd')}
              </p>
              {daySessions.length > 0 && (
                <div className="space-y-1">
                  {daySessions.slice(0, 3).map(session => (
                    <div
                      key={session.id}
                      className="text-xs p-1 bg-blue-100 rounded cursor-pointer hover:bg-blue-200"
                      onClick={() => onSessionClick?.(session)}
                    >
                      {format(new Date(session.start_at), 'HH:mm')} {session.class.name}
                    </div>
                  ))}
                  {daySessions.length > 3 && (
                    <p className="text-xs text-gray-500">
                      +{daySessions.length - 3} more
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigatePeriod('prev')}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <h2 className="text-xl font-bold">
              {view === 'week' 
                ? `Week of ${format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'MMM d, yyyy')}`
                : format(currentDate, 'MMMM yyyy')
              }
            </h2>
            <button
              onClick={() => navigatePeriod('next')}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-3 py-1 text-sm border rounded-lg hover:bg-gray-50"
            >
              Today
            </button>
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setView('week')}
                className={`px-3 py-1 text-sm rounded ${
                  view === 'week' ? 'bg-white shadow' : ''
                }`}
              >
                Week
              </button>
              <button
                onClick={() => setView('month')}
                className={`px-3 py-1 text-sm rounded ${
                  view === 'month' ? 'bg-white shadow' : ''
                }`}
              >
                Month
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Calendar */}
      <div className="p-4">
        {view === 'week' ? renderWeekView() : renderMonthView()}
      </div>
    </div>
  );
}