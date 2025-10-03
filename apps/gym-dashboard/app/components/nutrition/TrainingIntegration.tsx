'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/app/lib/supabase/client'
import { Activity, Flame, Calendar, TrendingUp, Clock, Dumbbell } from 'lucide-react'
import { format, startOfWeek, endOfWeek, isWithinInterval } from 'date-fns'

interface TrainingIntegrationProps {
  profile: any
  client: any
}

interface TrainingSession {
  id: string
  session_date: string
  session_type: string
  duration_minutes: number
  calories_burned: number
  class_name?: string
  booking_status?: string
  booking_id?: string
}

export default function TrainingIntegration({ profile, client }: TrainingIntegrationProps) {
  const [sessions, setSessions] = useState<TrainingSession[]>([])
  const [bookings, setBookings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [weeklyStats, setWeeklyStats] = useState({
    totalSessions: 0,
    totalMinutes: 0,
    totalCalories: 0,
    averageSessionLength: 0
  })
  const supabase = createClient()

  useEffect(() => {
    if (profile && client) {
      fetchTrainingData()
    }
  }, [profile, client])

  const fetchTrainingData = async () => {
    try {
      // Fetch training sessions from nutrition_training_sessions
      const { data: trainingSessions, error: trainingError } = await supabase
        .from('nutrition_training_sessions')
        .select('*')
        .eq('profile_id', profile.id)
        .gte('session_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .order('session_date', { ascending: false })

      if (trainingError) console.error('Error fetching training sessions:', trainingError)

      // Fetch bookings with class information
      const { data: bookingData, error: bookingError } = await supabase
        .from('bookings')
        .select(`
          *,
          class_session:class_sessions (
            id,
            name,
            start_time,
            duration_minutes,
            class_type
          )
        `)
        .eq('customer_id', client.id)
        .in('booking_status', ['confirmed', 'attended'])
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })

      if (bookingError) console.error('Error fetching bookings:', bookingError)

      // Combine and process data
      const processedSessions: TrainingSession[] = []
      
      // Add nutrition training sessions
      if (trainingSessions) {
        processedSessions.push(...trainingSessions.map(session => ({
          id: session.id,
          session_date: session.session_date,
          session_type: session.session_type,
          duration_minutes: session.duration_minutes,
          calories_burned: session.calories_burned || estimateCalories(session.session_type, session.duration_minutes)
        })))
      }

      // Add bookings as training sessions if not already tracked
      if (bookingData) {
        setBookings(bookingData)
        
        for (const booking of bookingData) {
          if (booking.class_session && booking.booking_status === 'attended') {
            const sessionDate = new Date(booking.class_session.start_time).toISOString().split('T')[0]
            
            // Check if this booking is already tracked in nutrition_training_sessions
            const alreadyTracked = processedSessions.some(
              s => s.session_date === sessionDate && s.booking_id === booking.id
            )
            
            if (!alreadyTracked) {
              processedSessions.push({
                id: booking.id,
                session_date: sessionDate,
                session_type: mapClassType(booking.class_session.class_type || booking.class_session.name),
                duration_minutes: booking.class_session.duration_minutes || 60,
                calories_burned: estimateCalories(
                  booking.class_session.class_type || booking.class_session.name,
                  booking.class_session.duration_minutes || 60
                ),
                class_name: booking.class_session.name,
                booking_status: booking.booking_status
              })
            }
          }
        }
      }

      setSessions(processedSessions)
      calculateWeeklyStats(processedSessions)
    } catch (error) {
      console.error('Error fetching training data:', error)
    } finally {
      setLoading(false)
    }
  }

  const mapClassType = (className: string): string => {
    const name = className.toLowerCase()
    if (name.includes('strength') || name.includes('weight')) return 'weightlifting'
    if (name.includes('hiit') || name.includes('interval')) return 'hiit'
    if (name.includes('yoga') || name.includes('pilates')) return 'yoga'
    if (name.includes('cardio') || name.includes('spin') || name.includes('cycle')) return 'cardio'
    if (name.includes('cross')) return 'crossfit'
    return 'general'
  }

  const estimateCalories = (type: string, minutes: number): number => {
    // Rough estimates based on activity type and average person
    const caloriesPerMinute: { [key: string]: number } = {
      weightlifting: 6,
      hiit: 12,
      cardio: 10,
      yoga: 3,
      crossfit: 11,
      general: 8
    }
    
    const rate = caloriesPerMinute[type.toLowerCase()] || 8
    return Math.round(rate * minutes)
  }

  const calculateWeeklyStats = (sessions: TrainingSession[]) => {
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 })
    const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 })
    
    const weeklySessions = sessions.filter(session => {
      const sessionDate = new Date(session.session_date)
      return isWithinInterval(sessionDate, { start: weekStart, end: weekEnd })
    })

    const totalMinutes = weeklySessions.reduce((sum, s) => sum + s.duration_minutes, 0)
    const totalCalories = weeklySessions.reduce((sum, s) => sum + s.calories_burned, 0)

    setWeeklyStats({
      totalSessions: weeklySessions.length,
      totalMinutes,
      totalCalories,
      averageSessionLength: weeklySessions.length > 0 ? Math.round(totalMinutes / weeklySessions.length) : 0
    })
  }

  const getAdjustedDailyCalories = () => {
    // Calculate average daily calories burned from training
    const dailyTrainingCalories = Math.round(weeklyStats.totalCalories / 7)
    
    // Adjust base calories based on training
    const baseCalories = profile.daily_calories || 2000
    const adjustedCalories = baseCalories + dailyTrainingCalories
    
    return { baseCalories, dailyTrainingCalories, adjustedCalories }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const { baseCalories, dailyTrainingCalories, adjustedCalories } = getAdjustedDailyCalories()

  return (
    <div className="space-y-6">
      {/* Weekly Summary */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold mb-4">This Week's Training</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="flex items-center text-gray-600 mb-1">
              <Dumbbell className="h-4 w-4 mr-2" />
              <span className="text-sm">Sessions</span>
            </div>
            <p className="text-2xl font-bold">{weeklyStats.totalSessions}</p>
          </div>
          <div>
            <div className="flex items-center text-gray-600 mb-1">
              <Clock className="h-4 w-4 mr-2" />
              <span className="text-sm">Total Time</span>
            </div>
            <p className="text-2xl font-bold">{weeklyStats.totalMinutes} min</p>
          </div>
          <div>
            <div className="flex items-center text-gray-600 mb-1">
              <Flame className="h-4 w-4 mr-2" />
              <span className="text-sm">Calories Burned</span>
            </div>
            <p className="text-2xl font-bold">{weeklyStats.totalCalories.toLocaleString()}</p>
          </div>
          <div>
            <div className="flex items-center text-gray-600 mb-1">
              <Activity className="h-4 w-4 mr-2" />
              <span className="text-sm">Avg. Session</span>
            </div>
            <p className="text-2xl font-bold">{weeklyStats.averageSessionLength} min</p>
          </div>
        </div>
      </div>

      {/* Calorie Adjustment */}
      <div className="bg-blue-50 rounded-lg p-6">
        <h4 className="font-medium text-blue-900 mb-3">Daily Calorie Target Adjustment</h4>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-blue-700">Base Daily Calories</span>
            <span className="font-medium">{baseCalories.toLocaleString()} kcal</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-blue-700">Avg. Training Burn</span>
            <span className="font-medium text-green-600">+{dailyTrainingCalories} kcal</span>
          </div>
          <div className="border-t border-blue-200 pt-2 mt-2">
            <div className="flex justify-between items-center">
              <span className="font-medium text-blue-900">Adjusted Daily Target</span>
              <span className="text-xl font-bold text-blue-900">{adjustedCalories.toLocaleString()} kcal</span>
            </div>
          </div>
        </div>
        <p className="text-xs text-blue-600 mt-3">
          {weeklyStats.totalSessions >= profile.training_frequency 
            ? "You're meeting your training frequency goal! Keep it up!"
            : `Try to reach ${profile.training_frequency} sessions per week for optimal results.`
          }
        </p>
      </div>

      {/* Recent Sessions */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h4 className="font-medium mb-4">Recent Training Sessions</h4>
        {sessions.length > 0 ? (
          <div className="space-y-3">
            {sessions.slice(0, 5).map((session) => (
              <div key={session.id} className="flex items-center justify-between py-3 border-b last:border-0">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${
                    session.session_type === 'weightlifting' ? 'bg-purple-100' :
                    session.session_type === 'cardio' ? 'bg-blue-100' :
                    session.session_type === 'hiit' ? 'bg-red-100' :
                    'bg-gray-100'
                  }`}>
                    <Activity className={`h-5 w-5 ${
                      session.session_type === 'weightlifting' ? 'text-purple-600' :
                      session.session_type === 'cardio' ? 'text-blue-600' :
                      session.session_type === 'hiit' ? 'text-red-600' :
                      'text-gray-600'
                    }`} />
                  </div>
                  <div>
                    <p className="font-medium">
                      {session.class_name || session.session_type.charAt(0).toUpperCase() + session.session_type.slice(1)}
                    </p>
                    <p className="text-sm text-gray-600">
                      {format(new Date(session.session_date), 'MMM d, yyyy')} • {session.duration_minutes} min
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium">{session.calories_burned} kcal</p>
                  {session.booking_status && (
                    <p className="text-xs text-gray-500">{session.booking_status}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Activity className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">No training sessions recorded yet</p>
            <p className="text-sm text-gray-500 mt-1">
              Book classes or log workouts to see them here
            </p>
          </div>
        )}
      </div>

      {/* Upcoming Bookings */}
      {bookings.filter(b => b.booking_status === 'confirmed').length > 0 && (
        <div className="bg-gray-50 rounded-lg p-6">
          <h4 className="font-medium mb-3">Upcoming Classes</h4>
          <div className="space-y-2">
            {bookings
              .filter(b => b.booking_status === 'confirmed')
              .slice(0, 3)
              .map((booking) => (
                <div key={booking.id} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{booking.class_session?.name}</p>
                    <p className="text-xs text-gray-600">
                      {format(new Date(booking.class_session?.start_time), 'MMM d, h:mm a')}
                    </p>
                  </div>
                  <Calendar className="h-4 w-4 text-gray-400" />
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}