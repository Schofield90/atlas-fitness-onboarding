'use client';

import React, { useState, useEffect } from 'react';
import { Clock, Play, Square, MapPin, MessageSquare, User, CheckCircle, XCircle } from 'lucide-react';

interface TimeClockWidgetProps {
  staffId?: string;
  organizationId: string;
  compact?: boolean;
  onStatusChange?: (status: 'clocked_in' | 'clocked_out') => void;
}

interface ClockStatus {
  is_clocked_in: boolean;
  clock_in_time?: string;
  total_hours_today?: number;
  current_session_hours?: number;
  timesheet_id?: string;
}

export default function TimeClockWidget({ 
  staffId, 
  organizationId, 
  compact = false,
  onStatusChange 
}: TimeClockWidgetProps) {
  const [status, setStatus] = useState<ClockStatus>({
    is_clocked_in: false
  });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    loadClockStatus();
    
    // Update current time every second
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, [staffId, organizationId]);

  useEffect(() => {
    // Update session hours every minute when clocked in
    if (status.is_clocked_in) {
      const interval = setInterval(() => {
        updateSessionHours();
      }, 60000);

      return () => clearInterval(interval);
    }
  }, [status.is_clocked_in, status.clock_in_time]);

  const loadClockStatus = async () => {
    if (!staffId) return;
    
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await fetch(
        `/api/timesheets?staff_id=${staffId}&date=${today}&status=active`
      );
      
      if (response.ok) {
        const data = await response.json();
        const todayTimesheet = data.timesheets?.[0];
        
        if (todayTimesheet) {
          setStatus({
            is_clocked_in: true,
            clock_in_time: todayTimesheet.clock_in_time,
            timesheet_id: todayTimesheet.id,
            current_session_hours: calculateSessionHours(todayTimesheet.clock_in_time)
          });
        } else {
          setStatus({ is_clocked_in: false });
        }
      }
    } catch (error) {
      console.error('Error loading clock status:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSessionHours = () => {
    if (status.clock_in_time) {
      const sessionHours = calculateSessionHours(status.clock_in_time);
      setStatus(prev => ({
        ...prev,
        current_session_hours: sessionHours
      }));
    }
  };

  const calculateSessionHours = (clockInTime: string): number => {
    const start = new Date(clockInTime);
    const now = new Date();
    const diffMs = now.getTime() - start.getTime();
    return Math.max(0, diffMs / (1000 * 60 * 60)); // Convert to hours
  };

  const handleClockIn = async () => {
    if (!staffId) return;
    
    setActionLoading(true);
    try {
      const response = await fetch('/api/timesheets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'clock_in',
          staff_id: staffId,
          location: location || 'Main Location',
          notes: notes
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus({
          is_clocked_in: true,
          clock_in_time: data.timesheet.clock_in_time,
          timesheet_id: data.timesheet.id,
          current_session_hours: 0
        });
        
        setLocation('');
        setNotes('');
        setShowDetails(false);
        onStatusChange?.('clocked_in');
        
        // Show success message briefly
        setTimeout(() => {
          alert(data.message);
        }, 100);
      } else {
        alert('Failed to clock in: ' + data.error);
      }
    } catch (error) {
      console.error('Error clocking in:', error);
      alert('Failed to clock in');
    } finally {
      setActionLoading(false);
    }
  };

  const handleClockOut = async () => {
    if (!staffId || !status.timesheet_id) return;
    
    setActionLoading(true);
    try {
      const response = await fetch('/api/timesheets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'clock_out',
          staff_id: staffId,
          notes: notes
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus({
          is_clocked_in: false,
          total_hours_today: data.total_hours
        });
        
        setNotes('');
        setShowDetails(false);
        onStatusChange?.('clocked_out');
        
        // Show success message with hours worked
        setTimeout(() => {
          alert(`${data.message}\nTotal hours worked: ${data.total_hours.toFixed(2)}`);
        }, 100);
      } else {
        alert('Failed to clock out: ' + data.error);
      }
    } catch (error) {
      console.error('Error clocking out:', error);
      alert('Failed to clock out');
    } finally {
      setActionLoading(false);
    }
  };

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('en-GB', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDuration = (hours: number): string => {
    const h = Math.floor(hours);
    const m = Math.floor((hours - h) * 60);
    return `${h}h ${m}m`;
  };

  if (loading) {
    return (
      <div className={`bg-gray-800 rounded-lg border border-gray-700 ${compact ? 'p-4' : 'p-6'}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-700 rounded w-1/2 mb-3"></div>
          <div className="h-8 bg-gray-700 rounded w-3/4"></div>
        </div>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${
              status.is_clocked_in ? 'bg-green-400' : 'bg-gray-500'
            }`} />
            <div>
              <p className="text-white font-medium">
                {status.is_clocked_in ? 'Clocked In' : 'Clocked Out'}
              </p>
              <p className="text-gray-400 text-sm">
                {status.is_clocked_in && status.clock_in_time
                  ? `Since ${new Date(status.clock_in_time).toLocaleTimeString('en-GB', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}`
                  : formatTime(currentTime)
                }
              </p>
            </div>
          </div>
          
          {status.is_clocked_in && status.current_session_hours !== undefined && (
            <div className="text-right">
              <p className="text-orange-400 font-bold">
                {formatDuration(status.current_session_hours)}
              </p>
              <p className="text-gray-500 text-xs">Today</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Clock className="w-6 h-6 text-orange-400" />
          <h3 className="text-lg font-semibold text-white">Time Clock</h3>
        </div>
        <div className="text-right">
          <div className="text-xl font-mono text-white">{formatTime(currentTime)}</div>
          <div className="text-sm text-gray-400">
            {currentTime.toLocaleDateString('en-GB', { 
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </div>
        </div>
      </div>

      {/* Status Display */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
            status.is_clocked_in 
              ? 'bg-green-900/30 border border-green-700' 
              : 'bg-gray-700 border border-gray-600'
          }`}>
            {status.is_clocked_in ? (
              <>
                <CheckCircle className="w-5 h-5 text-green-400" />
                <span className="text-green-400 font-medium">Clocked In</span>
              </>
            ) : (
              <>
                <XCircle className="w-5 h-5 text-gray-400" />
                <span className="text-gray-400 font-medium">Clocked Out</span>
              </>
            )}
          </div>

          {status.is_clocked_in && status.current_session_hours !== undefined && (
            <div className="bg-orange-900/30 border border-orange-700 px-4 py-2 rounded-lg">
              <span className="text-orange-400 font-bold">
                {formatDuration(status.current_session_hours)}
              </span>
              <span className="text-orange-300 ml-2">today</span>
            </div>
          )}
        </div>

        {status.is_clocked_in && status.clock_in_time && (
          <p className="text-gray-400 text-sm">
            Clocked in at {new Date(status.clock_in_time).toLocaleTimeString('en-GB', {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
        )}
      </div>

      {/* Action Section */}
      <div className="space-y-4">
        {showDetails && (
          <div className="space-y-3">
            {!status.is_clocked_in && (
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Location (Optional)
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="e.g., Main Gym, Studio A"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Notes (Optional)
              </label>
              <div className="relative">
                <MessageSquare className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  rows={2}
                  placeholder={status.is_clocked_in ? "Any notes for clock out..." : "Any notes for today..."}
                />
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-3">
          {status.is_clocked_in ? (
            <button
              onClick={handleClockOut}
              disabled={actionLoading}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Square className="w-5 h-5" />
              {actionLoading ? 'Clocking Out...' : 'Clock Out'}
            </button>
          ) : (
            <button
              onClick={handleClockIn}
              disabled={actionLoading || !staffId}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Play className="w-5 h-5" />
              {actionLoading ? 'Clocking In...' : 'Clock In'}
            </button>
          )}

          <button
            onClick={() => setShowDetails(!showDetails)}
            className="px-4 py-3 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
          >
            {showDetails ? 'Less' : 'More'}
          </button>
        </div>

        {!staffId && (
          <p className="text-center text-gray-500 text-sm">
            Select a staff member to use the time clock
          </p>
        )}
      </div>
    </div>
  );
}