'use client'

import React, { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import Card from '@/app/components/ui/Card'
import Button from '@/app/components/ui/Button'
import { Calendar, Clock, MapPin, Users } from 'lucide-react'

interface ClassSession {
  id: string
  name: string
  instructor: string
  date: string
  time: string
  duration: number
  capacity: number
  booked: number
  location: string
}

export default function HarrogateBookingPage() {
  const [sessions, setSessions] = useState<ClassSession[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClientComponentClient()

  useEffect(() => {
    loadSessions()
  }, [])

  const loadSessions = async () => {
    try {
      // For now, using mock data until backend is fully connected
      const mockSessions: ClassSession[] = [
        {
          id: '1',
          name: 'Power Yoga',
          instructor: 'Rachel Green',
          date: '2025-08-11',
          time: '06:30',
          duration: 75,
          capacity: 25,
          booked: 15,
          location: 'Yoga Studio'
        },
        {
          id: '2',
          name: 'CrossFit',
          instructor: 'Tom Anderson',
          date: '2025-08-11',
          time: '08:00',
          duration: 60,
          capacity: 12,
          booked: 11,
          location: 'CrossFit Box'
        },
        {
          id: '3',
          name: 'Aqua Aerobics',
          instructor: 'Sophie Martin',
          date: '2025-08-11',
          time: '11:00',
          duration: 45,
          capacity: 30,
          booked: 22,
          location: 'Pool'
        },
        {
          id: '4',
          name: 'Zumba',
          instructor: 'Maria Garcia',
          date: '2025-08-12',
          time: '18:00',
          duration: 60,
          capacity: 35,
          booked: 28,
          location: 'Dance Studio'
        },
        {
          id: '5',
          name: 'Strength Training',
          instructor: 'David Lee',
          date: '2025-08-12',
          time: '19:30',
          duration: 50,
          capacity: 16,
          booked: 14,
          location: 'Weight Room'
        },
        {
          id: '6',
          name: 'Meditation & Mindfulness',
          instructor: 'Emma Thompson',
          date: '2025-08-13',
          time: '07:00',
          duration: 30,
          capacity: 20,
          booked: 8,
          location: 'Relaxation Room'
        }
      ]
      setSessions(mockSessions)
    } catch (error) {
      console.error('Error loading sessions:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleBooking = (sessionId: string) => {
    alert(`Booking session ${sessionId} - This will be connected to the payment system`)
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-GB', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long',
      year: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading classes...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Book a Class - Harrogate</h1>
          <p className="text-gray-600 mt-2">
            Choose from our range of fitness classes at Atlas Fitness Harrogate
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {sessions.map((session) => {
            const spotsLeft = session.capacity - session.booked
            const isFullyBooked = spotsLeft === 0
            
            return (
              <Card key={session.id} className={isFullyBooked ? 'opacity-75' : ''}>
                <div className="p-6">
                  <h3 className="text-xl font-semibold">{session.name}</h3>
                  <p className="text-sm text-gray-600">with {session.instructor}</p>
                </div>
                <div className="px-6 pb-6">
                  <div className="space-y-3">
                    <div className="flex items-center text-sm text-gray-600">
                      <Calendar className="h-4 w-4 mr-2" />
                      {formatDate(session.date)}
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <Clock className="h-4 w-4 mr-2" />
                      {session.time} ({session.duration} mins)
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <MapPin className="h-4 w-4 mr-2" />
                      {session.location}
                    </div>
                    <div className="flex items-center text-sm">
                      <Users className="h-4 w-4 mr-2" />
                      {isFullyBooked ? (
                        <span className="text-red-600 font-semibold">Fully Booked</span>
                      ) : spotsLeft <= 3 ? (
                        <span className="text-orange-600 font-semibold">
                          Only {spotsLeft} {spotsLeft === 1 ? 'spot' : 'spots'} left!
                        </span>
                      ) : (
                        <span className="text-gray-600">
                          {spotsLeft} spots available
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <Button
                    className="w-full mt-4"
                    onClick={() => handleBooking(session.id)}
                    disabled={isFullyBooked}
                    variant={isFullyBooked ? 'outline' : 'default'}
                  >
                    {isFullyBooked ? 'Join Waitlist' : 'Book Now'}
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>

        {sessions.length === 0 && (
          <Card className="text-center py-12">
            <div className="p-6">
              <p className="text-gray-600">No classes available at the moment.</p>
              <p className="text-sm text-gray-500 mt-2">Please check back later or contact us for more information.</p>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}