'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { formatBritishDateTime } from '@/app/lib/utils/british-format'
import { 
  Calendar, 
  CreditCard, 
  UserCheck, 
  MessageSquare, 
  FileText, 
  Edit,
  Clock,
  Activity
} from 'lucide-react'

interface ActivityTabProps {
  customerId: string
}

export default function ActivityTab({ customerId }: ActivityTabProps) {
  const [activities, setActivities] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const supabase = createClientComponentClient()

  useEffect(() => {
    fetchActivities()
  }, [customerId, filter])

  const fetchActivities = async () => {
    try {
      setLoading(true)
      let query = supabase
        .from('customer_activity_log')
        .select('*, staff:auth.users(email)')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })
        .limit(50)

      if (filter !== 'all') {
        query = query.eq('activity_type', filter)
      }

      const { data, error } = await query

      if (error) throw error
      setActivities(data || [])
    } catch (error) {
      console.error('Error fetching activities:', error)
    } finally {
      setLoading(false)
    }
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'check_in':
        return <UserCheck className="h-5 w-5" />
      case 'booking':
        return <Calendar className="h-5 w-5" />
      case 'payment':
        return <CreditCard className="h-5 w-5" />
      case 'note_added':
        return <MessageSquare className="h-5 w-5" />
      case 'form_submitted':
        return <FileText className="h-5 w-5" />
      case 'profile_updated':
        return <Edit className="h-5 w-5" />
      default:
        return <Activity className="h-5 w-5" />
    }
  }

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'check_in':
        return 'text-green-400 bg-green-400/10'
      case 'booking':
        return 'text-blue-400 bg-blue-400/10'
      case 'payment':
        return 'text-yellow-400 bg-yellow-400/10'
      case 'note_added':
        return 'text-purple-400 bg-purple-400/10'
      case 'form_submitted':
        return 'text-indigo-400 bg-indigo-400/10'
      case 'profile_updated':
        return 'text-gray-400 bg-gray-400/10'
      default:
        return 'text-gray-400 bg-gray-400/10'
    }
  }

  const getActivityDescription = (activity: any) => {
    const data = activity.activity_data || {}
    
    switch (activity.activity_type) {
      case 'check_in':
        return `Checked in${data.class_name ? ` to ${data.class_name}` : ''}`
      case 'booking':
        return `Booked ${data.class_name || 'a class'}${data.date ? ` for ${formatBritishDateTime(data.date)}` : ''}`
      case 'payment':
        return `Payment of £${((data.amount || 0) / 100).toFixed(2)} received${data.description ? ` for ${data.description}` : ''}`
      case 'note_added':
        return `Note added${data.note_type ? ` (${data.note_type})` : ''}`
      case 'form_submitted':
        return `Submitted ${data.form_name || 'a form'}`
      case 'profile_updated':
        return `Profile information updated`
      default:
        return activity.activity_type.replace(/_/g, ' ')
    }
  }

  const activityTypes = [
    { value: 'all', label: 'All Activities' },
    { value: 'check_in', label: 'Check-ins' },
    { value: 'booking', label: 'Bookings' },
    { value: 'payment', label: 'Payments' },
    { value: 'note_added', label: 'Notes' },
    { value: 'form_submitted', label: 'Forms' },
    { value: 'profile_updated', label: 'Profile Updates' },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-gray-400">Loading activity...</p>
      </div>
    )
  }

  return (
    <div>
      {/* Filter */}
      <div className="mb-6">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
        >
          {activityTypes.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </div>

      {/* Activity Timeline */}
      {activities.length === 0 ? (
        <div className="text-center py-12">
          <Activity className="h-12 w-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">No activity recorded yet</p>
        </div>
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-700"></div>

          {/* Activity items */}
          <div className="space-y-6">
            {activities.map((activity, index) => (
              <div key={activity.id} className="relative flex items-start">
                {/* Activity icon */}
                <div className={`relative z-10 flex items-center justify-center w-12 h-12 rounded-full ${getActivityColor(activity.activity_type)}`}>
                  {getActivityIcon(activity.activity_type)}
                </div>

                {/* Activity content */}
                <div className="ml-6 flex-1 bg-gray-800 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-white">
                      {getActivityDescription(activity)}
                    </h4>
                    <div className="flex items-center text-sm text-gray-400">
                      <Clock className="h-4 w-4 mr-1" />
                      {formatBritishDateTime(activity.created_at)}
                    </div>
                  </div>
                  
                  {activity.staff?.email && (
                    <p className="text-sm text-gray-400">
                      By {activity.staff.email}
                    </p>
                  )}

                  {/* Additional activity details */}
                  {activity.activity_data && Object.keys(activity.activity_data).length > 0 && (
                    <div className="mt-3 p-3 bg-gray-700 rounded text-sm text-gray-300">
                      <pre className="whitespace-pre-wrap">
                        {JSON.stringify(activity.activity_data, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}