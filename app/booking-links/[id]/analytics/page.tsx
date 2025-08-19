'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { 
  ArrowLeft, BarChart3, TrendingUp, Users, Calendar,
  Eye, MousePointer, CheckCircle, XCircle
} from 'lucide-react'
import Button from '@/app/components/ui/Button'

interface AnalyticsData {
  analytics: {
    page_views: number
    form_starts: number
    bookings_completed: number
    conversion_rate: number
    daily_stats: Array<{ date: string; views: number; bookings: number }>
  }
  stats: {
    total_bookings: number
    confirmed_bookings: number
    cancelled_bookings: number
    no_shows: number
    this_month: number
    last_month: number
  }
  booking_link: {
    id: string
    name: string
    slug: string
  }
}

export default function BookingLinkAnalyticsPage() {
  const router = useRouter()
  const params = useParams()
  const bookingLinkId = params?.id as string

  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState(30)

  useEffect(() => {
    if (bookingLinkId) {
      fetchAnalytics()
    }
  }, [bookingLinkId, timeRange])

  const fetchAnalytics = async () => {
    try {
      const response = await fetch(`/api/booking-links/${bookingLinkId}/analytics?days=${timeRange}`)
      if (!response.ok) throw new Error('Failed to fetch analytics')
      
      const data = await response.json()
      setAnalyticsData(data)
    } catch (error) {
      console.error('Error fetching analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-400">Loading analytics...</div>
        </div>
      </div>
    )
  }

  if (!analyticsData) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Analytics Not Available</h1>
          <p className="text-gray-400">Unable to load analytics for this booking link.</p>
        </div>
      </div>
    )
  }

  const { analytics, stats, booking_link } = analyticsData

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => router.push('/booking-links')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Links
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{booking_link.name}</h1>
            <p className="text-gray-400">Analytics & Performance</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(parseInt(e.target.value))}
            className="px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <Button
            variant="outline"
            onClick={() => router.push(`/booking-links/${bookingLinkId}/edit`)}
          >
            Edit Link
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Page Views</p>
              <p className="text-2xl font-bold">{analytics.page_views}</p>
            </div>
            <Eye className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Form Starts</p>
              <p className="text-2xl font-bold">{analytics.form_starts}</p>
            </div>
            <MousePointer className="w-8 h-8 text-yellow-500" />
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Bookings</p>
              <p className="text-2xl font-bold">{analytics.bookings_completed}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Conversion Rate</p>
              <p className="text-2xl font-bold">{analytics.conversion_rate.toFixed(1)}%</p>
            </div>
            <TrendingUp className="w-8 h-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Booking Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Booking Status
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Total Bookings</span>
              <span className="font-medium">{stats.total_bookings}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Confirmed</span>
              <span className="font-medium text-green-400">{stats.confirmed_bookings}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Cancelled</span>
              <span className="font-medium text-red-400">{stats.cancelled_bookings}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">No Shows</span>
              <span className="font-medium text-yellow-400">{stats.no_shows}</span>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Monthly Trends
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">This Month</span>
              <span className="font-medium text-green-400">{stats.this_month}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Last Month</span>
              <span className="font-medium">{stats.last_month}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Growth</span>
              <span className={`font-medium ${
                stats.this_month >= stats.last_month ? 'text-green-400' : 'text-red-400'
              }`}>
                {stats.last_month > 0 
                  ? `${(((stats.this_month - stats.last_month) / stats.last_month) * 100).toFixed(1)}%`
                  : 'N/A'
                }
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Daily Activity Chart */}
      <div className="bg-gray-800 rounded-lg p-6 mb-8">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          Daily Activity (Last {timeRange} days)
        </h3>
        
        {analytics.daily_stats.length === 0 ? (
          <p className="text-gray-400">No activity data available</p>
        ) : (
          <div className="overflow-x-auto">
            <div className="flex items-end gap-2 h-48 min-w-full">
              {analytics.daily_stats.map((day, index) => {
                const maxViews = Math.max(...analytics.daily_stats.map(d => d.views))
                const maxBookings = Math.max(...analytics.daily_stats.map(d => d.bookings))
                const viewHeight = maxViews > 0 ? (day.views / maxViews) * 160 : 0
                const bookingHeight = maxBookings > 0 ? (day.bookings / maxBookings) * 160 : 0
                
                return (
                  <div key={day.date} className="flex-1 min-w-[40px] flex flex-col items-center">
                    <div className="flex items-end gap-1 h-40 w-full">
                      <div
                        className="bg-blue-500 rounded-t flex-1"
                        style={{ height: `${viewHeight}px` }}
                        title={`${day.views} views`}
                      />
                      <div
                        className="bg-green-500 rounded-t flex-1"
                        style={{ height: `${bookingHeight}px` }}
                        title={`${day.bookings} bookings`}
                      />
                    </div>
                    <div className="text-xs text-gray-400 mt-2 text-center">
                      {new Date(day.date).toLocaleDateString('en-GB', { 
                        day: '2-digit', 
                        month: 'short' 
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="flex items-center gap-4 mt-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded" />
                <span className="text-gray-400">Page Views</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded" />
                <span className="text-gray-400">Bookings</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Performance Insights */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Performance Insights</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h4 className="font-medium text-gray-300">Conversion Funnel</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Page Views</span>
                <span>{analytics.page_views}</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full"
                  style={{ width: '100%' }}
                />
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Form Starts</span>
                <span>{analytics.form_starts}</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-yellow-500 h-2 rounded-full"
                  style={{ 
                    width: analytics.page_views > 0 
                      ? `${(analytics.form_starts / analytics.page_views) * 100}%` 
                      : '0%' 
                  }}
                />
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Bookings Completed</span>
                <span>{analytics.bookings_completed}</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full"
                  style={{ 
                    width: analytics.page_views > 0 
                      ? `${analytics.conversion_rate}%` 
                      : '0%' 
                  }}
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-medium text-gray-300">Recommendations</h4>
            <div className="space-y-3 text-sm">
              {analytics.conversion_rate < 10 && (
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2" />
                  <div>
                    <p className="text-yellow-400 font-medium">Low Conversion Rate</p>
                    <p className="text-gray-400">
                      Consider simplifying your booking form or improving the value proposition.
                    </p>
                  </div>
                </div>
              )}
              
              {analytics.form_starts > 0 && analytics.bookings_completed === 0 && (
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-2" />
                  <div>
                    <p className="text-red-400 font-medium">Form Abandonment</p>
                    <p className="text-gray-400">
                      Users are starting but not completing bookings. Check form complexity.
                    </p>
                  </div>
                </div>
              )}
              
              {analytics.conversion_rate > 20 && (
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2" />
                  <div>
                    <p className="text-green-400 font-medium">Great Performance!</p>
                    <p className="text-gray-400">
                      Your booking link is performing well. Consider promoting it more.
                    </p>
                  </div>
                </div>
              )}
              
              {stats.cancelled_bookings > stats.confirmed_bookings * 0.2 && (
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-orange-500 rounded-full mt-2" />
                  <div>
                    <p className="text-orange-400 font-medium">High Cancellation Rate</p>
                    <p className="text-gray-400">
                      Consider reviewing your cancellation policy or booking confirmation process.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}