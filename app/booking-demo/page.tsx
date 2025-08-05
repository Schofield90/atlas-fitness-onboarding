'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, DollarSign, Users, Activity, Gift, CreditCard } from 'lucide-react';
import DashboardLayout from '@/app/components/DashboardLayout';
import ClassDetailModal from '@/app/components/dashboard/ClassDetailModal';

export default function BookingDemo() {
  const router = useRouter();
  const [selectedClass, setSelectedClass] = useState<any>(null);
  const [showClassModal, setShowClassModal] = useState(false);

  // Demo upcoming events data
  const upcomingEvents = [
    {
      id: '1',
      title: 'HIIT Blast',
      startTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours from now
      time: '14:00',
      date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
      bookings: 15,
      capacity: 20,
      instructor: 'Sarah Chen',
      location: 'Studio A',
      duration: 45
    },
    {
      id: '2',
      title: 'Yoga Flow',
      startTime: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(), // 4 hours from now
      time: '16:00',
      date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
      bookings: 22,
      capacity: 25,
      instructor: 'Emma Wilson',
      location: 'Studio B',
      duration: 60
    },
    {
      id: '3',
      title: 'Strength Training',
      startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
      time: '09:00',
      date: new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
      bookings: 10,
      capacity: 15,
      instructor: 'Mike Johnson',
      location: 'Main Gym',
      duration: 60
    },
    {
      id: '4',
      title: 'Pilates',
      startTime: new Date(Date.now() + 26 * 60 * 60 * 1000).toISOString(), // Tomorrow + 2 hours
      time: '11:00',
      date: new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
      bookings: 18,
      capacity: 20,
      instructor: 'Lisa Anderson',
      location: 'Studio A',
      duration: 50
    },
    {
      id: '5',
      title: 'Boxing Fitness',
      startTime: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), // 2 days from now
      time: '18:00',
      date: new Date(Date.now() + 48 * 60 * 60 * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
      bookings: 12,
      capacity: 18,
      instructor: 'Tom Davis',
      location: 'Studio B',
      duration: 45
    }
  ];

  return (
    <DashboardLayout userData={null}>
      <div className="min-h-screen bg-gray-900">
        <div className="container mx-auto px-6 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold mb-2">Dashboard Overview</h1>
                <p className="text-gray-300">Welcome back! Here's what's happening in your gym today.</p>
              </div>
            </div>
          </div>

          {/* Top Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <div className="bg-gray-800 rounded-lg shadow p-6 border border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-yellow-900/30 rounded-lg">
                  <DollarSign className="w-6 h-6 text-yellow-400" />
                </div>
                <span className="text-xs font-medium text-gray-400">PENDING</span>
              </div>
              <h3 className="text-2xl font-bold text-white">£245.00</h3>
              <p className="text-sm text-gray-400">3 pending</p>
            </div>

            <div className="bg-gray-800 rounded-lg shadow p-6 border border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-green-900/30 rounded-lg">
                  <DollarSign className="w-6 h-6 text-green-400" />
                </div>
                <span className="text-xs font-medium text-gray-400">CONFIRMED</span>
              </div>
              <h3 className="text-2xl font-bold text-white">£1,850.00</h3>
              <p className="text-sm text-gray-400">12 confirmed</p>
            </div>

            <div className="bg-gray-800 rounded-lg shadow p-6 border border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-blue-900/30 rounded-lg">
                  <Users className="w-6 h-6 text-blue-400" />
                </div>
                <span className="text-xs font-medium text-green-400">+15%</span>
              </div>
              <h3 className="text-2xl font-bold text-white">28</h3>
              <p className="text-sm text-gray-400">New customers (30d)</p>
            </div>

            <div className="bg-gray-800 rounded-lg shadow p-6 border border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-purple-900/30 rounded-lg">
                  <Calendar className="w-6 h-6 text-purple-400" />
                </div>
                <span className="text-xs font-medium text-gray-400">THIS MONTH</span>
              </div>
              <h3 className="text-2xl font-bold text-white">142</h3>
              <p className="text-sm text-gray-400">Events booked</p>
            </div>
          </div>

          {/* Upcoming Events Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <div className="bg-gray-800 rounded-lg shadow border border-gray-700">
              <div className="p-4 border-b border-gray-700">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-900/30 rounded-lg">
                    <Calendar className="w-5 h-5 text-green-400" />
                  </div>
                  <h3 className="font-semibold text-white">Upcoming Events</h3>
                </div>
              </div>
              <div className="p-4">
                <div className="space-y-2">
                  <div className="flex text-xs text-gray-400 font-medium mb-2">
                    <div className="flex-1">ALL</div>
                    <div className="w-20 text-right">YOURS</div>
                  </div>
                  {upcomingEvents.map((event) => (
                    <div 
                      key={event.id} 
                      className="group cursor-pointer hover:bg-gray-700/50 p-3 rounded-lg transition-colors"
                      onClick={() => {
                        setSelectedClass(event);
                        setShowClassModal(true);
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-300 mb-1">
                            {event.date} - {event.time}
                          </div>
                          <div className="text-white font-medium group-hover:text-orange-400 transition-colors mb-1">
                            {event.title}
                          </div>
                          <div className="text-xs text-gray-400">
                            {event.instructor} • {event.location} • {event.duration} mins
                          </div>
                        </div>
                        <div className="text-right ml-4">
                          <div className="text-white font-medium">{event.bookings}/{event.capacity}</div>
                          <div className="text-xs text-gray-400">
                            {event.capacity - event.bookings} left
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Other widgets... */}
            <div className="bg-gray-800 rounded-lg shadow border border-gray-700">
              <div className="p-4 border-b border-gray-700">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-900/30 rounded-lg">
                    <CreditCard className="w-5 h-5 text-blue-400" />
                  </div>
                  <h3 className="font-semibold text-white">Upcoming Billing</h3>
                </div>
              </div>
              <div className="p-4">
                <p className="text-gray-400 text-sm">No upcoming billing</p>
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg shadow border border-gray-700">
              <div className="p-4 border-b border-gray-700">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-900/30 rounded-lg">
                    <Activity className="w-5 h-5 text-purple-400" />
                  </div>
                  <h3 className="font-semibold text-white">To-dos</h3>
                </div>
              </div>
              <div className="p-4">
                <p className="text-sm text-gray-400">No outstanding to-dos</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Class Detail Modal */}
      {selectedClass && (
        <ClassDetailModal
          isOpen={showClassModal}
          onClose={() => {
            setShowClassModal(false);
            setSelectedClass(null);
          }}
          classSession={selectedClass}
        />
      )}
    </DashboardLayout>
  );
}