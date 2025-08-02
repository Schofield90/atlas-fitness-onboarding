'use client'

import { useState, useEffect } from 'react'
import { Calendar, Clock, MapPin, Users } from 'lucide-react'

// Force no authentication
export const dynamic = 'force-dynamic'

export default function TestClientPage() {
  const [view, setView] = useState<'dashboard' | 'booking'>('dashboard')
  
  // Mock data for testing
  const mockClient = {
    name: 'Sam Schofield',
    email: 'samschofield90@hotmail.co.uk',
    membershipType: 'Gym Member',
    accessCode: 'VEZG-Y8P-MZ4'
  }

  const mockClasses = [
    {
      id: '1',
      name: 'Morning Yoga',
      date: '2025-02-03',
      time: '07:00',
      duration: '60 min',
      instructor: 'Sarah Johnson',
      spotsLeft: 5,
      maxCapacity: 15
    },
    {
      id: '2',
      name: 'HIIT Training',
      date: '2025-02-03',
      time: '09:00',
      duration: '45 min',
      instructor: 'Mike Wilson',
      spotsLeft: 2,
      maxCapacity: 10
    },
    {
      id: '3',
      name: 'Spin Class',
      date: '2025-02-04',
      time: '18:00',
      duration: '45 min',
      instructor: 'Emma Davis',
      spotsLeft: 8,
      maxCapacity: 20
    }
  ]

  const [bookedClasses, setBookedClasses] = useState<string[]>([])

  const handleBook = (classId: string) => {
    if (!bookedClasses.includes(classId)) {
      setBookedClasses([...bookedClasses, classId])
      alert('Class booked successfully!')
    }
  }

  const handleCancel = (classId: string) => {
    setBookedClasses(bookedClasses.filter(id => id !== classId))
    alert('Booking cancelled')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Client Portal Demo</h1>
              <p className="text-sm text-gray-600">Logged in as: {mockClient.name}</p>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => setView('dashboard')}
                className={`px-4 py-2 rounded ${
                  view === 'dashboard' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Dashboard
              </button>
              <button
                onClick={() => setView('booking')}
                className={`px-4 py-2 rounded ${
                  view === 'booking' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Book Classes
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {view === 'dashboard' ? (
          <div className="space-y-6">
            {/* Welcome Card */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Welcome back, Sam!</h2>
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Membership</p>
                  <p className="font-medium">{mockClient.membershipType}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-medium">{mockClient.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Access Code</p>
                  <p className="font-medium font-mono">{mockClient.accessCode}</p>
                </div>
              </div>
            </div>

            {/* My Bookings */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">My Bookings</h3>
              {bookedClasses.length > 0 ? (
                <div className="space-y-3">
                  {mockClasses
                    .filter(cls => bookedClasses.includes(cls.id))
                    .map(cls => (
                      <div key={cls.id} className="border rounded p-4 flex justify-between items-center">
                        <div>
                          <p className="font-medium">{cls.name}</p>
                          <p className="text-sm text-gray-600">
                            {cls.date} at {cls.time} • {cls.instructor}
                          </p>
                        </div>
                        <button
                          onClick={() => handleCancel(cls.id)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-gray-500">No bookings yet. Book your first class!</p>
              )}
            </div>
          </div>
        ) : (
          <div>
            <h2 className="text-2xl font-bold mb-6">Available Classes</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {mockClasses.map(cls => {
                const isBooked = bookedClasses.includes(cls.id)
                const isFull = cls.spotsLeft === 0

                return (
                  <div key={cls.id} className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold mb-3">{cls.name}</h3>
                    
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center text-sm text-gray-600">
                        <Calendar className="h-4 w-4 mr-2" />
                        {cls.date}
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <Clock className="h-4 w-4 mr-2" />
                        {cls.time} ({cls.duration})
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <Users className="h-4 w-4 mr-2" />
                        {cls.instructor}
                      </div>
                      <div className="flex items-center text-sm">
                        <MapPin className="h-4 w-4 mr-2" />
                        <span className={cls.spotsLeft > 3 ? 'text-green-600' : 'text-orange-600'}>
                          {cls.spotsLeft} spots left
                        </span>
                      </div>
                    </div>

                    {isBooked ? (
                      <button
                        onClick={() => handleCancel(cls.id)}
                        className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                      >
                        Cancel Booking
                      </button>
                    ) : (
                      <button
                        onClick={() => handleBook(cls.id)}
                        disabled={isFull}
                        className={`w-full px-4 py-2 rounded ${
                          isFull
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                      >
                        {isFull ? 'Class Full' : 'Book Now'}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}