'use client';

import React from 'react';
import { X, Calendar, Clock, MapPin, User, Users } from 'lucide-react';

interface ClassDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  classSession: {
    id: string;
    title: string;
    date: string;
    time: string;
    startTime: string;
    instructor?: string;
    capacity: number;
    bookings: number;
    room?: string;
  };
}

export default function ClassDetailModal({ isOpen, onClose, classSession }: ClassDetailModalProps) {
  if (!isOpen) return null;

  const startDate = new Date(classSession.startTime);
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden border border-gray-700">
        {/* Header */}
        <div className="bg-gray-900 border-b border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">{classSession.title}</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-orange-400" />
                <div>
                  <p className="text-sm text-gray-400">Date</p>
                  <p className="text-white font-medium">
                    {startDate.toLocaleDateString('en-GB', { 
                      weekday: 'long', 
                      day: 'numeric', 
                      month: 'long', 
                      year: 'numeric' 
                    })}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-orange-400" />
                <div>
                  <p className="text-sm text-gray-400">Time</p>
                  <p className="text-white font-medium">{classSession.time}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-orange-400" />
                <div>
                  <p className="text-sm text-gray-400">Instructor</p>
                  <p className="text-white font-medium">{classSession.instructor || 'TBD'}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-orange-400" />
                <div>
                  <p className="text-sm text-gray-400">Location</p>
                  <p className="text-white font-medium">{classSession.room || 'Main Studio'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-orange-400" />
                <div>
                  <p className="text-sm text-gray-400">Capacity</p>
                  <p className="text-white font-medium">
                    {classSession.bookings} / {classSession.capacity} 
                    <span className="text-sm text-gray-400 ml-2">
                      ({classSession.capacity - classSession.bookings} spots left)
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Attendance Bar */}
          <div className="mb-6">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-400">Attendance</span>
              <span className="text-white font-medium">
                {Math.round((classSession.bookings / classSession.capacity) * 100)}%
              </span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-3">
              <div 
                className="bg-gradient-to-r from-orange-500 to-orange-400 h-3 rounded-full transition-all"
                style={{ width: `${(classSession.bookings / classSession.capacity) * 100}%` }}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={() => {
                onClose();
                window.location.href = '/booking';
              }}
              className="flex-1 px-4 py-3 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg transition-colors"
            >
              View in Calendar
            </button>
            <button
              onClick={onClose}
              className="px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}