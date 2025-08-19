'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Plus, Link, Copy, Trash2, Edit, Check, X, ExternalLink, 
  BarChart3, Settings, Eye, Calendar, Users, Clock
} from 'lucide-react'
import Button from '@/app/components/ui/Button'
import { BookingLink } from '@/app/lib/services/booking-link'

interface BookingLinkWithStats extends BookingLink {
  stats?: {
    total_bookings: number
    this_month: number
    conversion_rate: number
  }
}

export default function BookingLinksPage() {
  const router = useRouter()
  const [bookingLinks, setBookingLinks] = useState<BookingLinkWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  useEffect(() => {
    fetchBookingLinks()
  }, [])

  const fetchBookingLinks = async () => {
    try {
      const response = await fetch('/api/booking-links')
      if (!response.ok) throw new Error('Failed to fetch booking links')
      
      const { booking_links } = await response.json()
      
      // Fetch stats for each booking link
      const linksWithStats = await Promise.all(
        booking_links.map(async (link: BookingLink) => {
          try {
            const statsResponse = await fetch(`/api/booking-links/${link.id}/analytics?days=30`)
            if (statsResponse.ok) {
              const { stats, analytics } = await statsResponse.json()
              return {
                ...link,
                stats: {
                  total_bookings: stats.total_bookings,
                  this_month: stats.this_month,
                  conversion_rate: analytics.conversion_rate
                }
              }
            }
          } catch (error) {
            console.error(`Error fetching stats for ${link.slug}:`, error)
          }
          return link
        })
      )
      
      setBookingLinks(linksWithStats)
    } catch (error) {
      console.error('Error fetching booking links:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
      return
    }

    try {
      const response = await fetch(`/api/booking-links/${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete booking link')
      }

      setBookingLinks(bookingLinks.filter(link => link.id !== id))
      alert('Booking link deleted successfully!')
    } catch (error) {
      console.error('Error deleting booking link:', error)
      alert(error instanceof Error ? error.message : 'Failed to delete booking link')
    }
  }

  const copyToClipboard = (slug: string) => {
    const url = `${window.location.origin}/book/${slug}`
    navigator.clipboard.writeText(url)
    setCopiedId(slug)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const getStatusColor = (isActive: boolean) => {
    return isActive ? 'text-green-500' : 'text-gray-500'
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'team': return <Users className="w-4 h-4" />
      case 'round_robin': return <Calendar className="w-4 h-4" />
      case 'collective': return <Users className="w-4 h-4" />
      default: return <Link className="w-4 h-4" />
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-400">Loading booking links...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Booking Links</h1>
          <p className="text-gray-400 mt-1">
            Create and manage shareable booking links for your services
          </p>
        </div>
        <Button
          onClick={() => router.push('/booking-links/create')}
          className="bg-orange-600 hover:bg-orange-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Booking Link
        </Button>
      </div>

      {/* Stats Overview */}
      {bookingLinks.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Links</p>
                <p className="text-2xl font-bold">{bookingLinks.length}</p>
              </div>
              <Link className="w-8 h-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Active Links</p>
                <p className="text-2xl font-bold">
                  {bookingLinks.filter(l => l.is_active).length}
                </p>
              </div>
              <Check className="w-8 h-8 text-green-500" />
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Bookings</p>
                <p className="text-2xl font-bold">
                  {bookingLinks.reduce((sum, link) => sum + (link.stats?.total_bookings || 0), 0)}
                </p>
              </div>
              <Calendar className="w-8 h-8 text-orange-500" />
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">This Month</p>
                <p className="text-2xl font-bold">
                  {bookingLinks.reduce((sum, link) => sum + (link.stats?.this_month || 0), 0)}
                </p>
              </div>
              <BarChart3 className="w-8 h-8 text-purple-500" />
            </div>
          </div>
        </div>
      )}

      {/* Booking Links List */}
      {bookingLinks.length === 0 ? (
        <div className="bg-gray-800 rounded-lg p-8 text-center">
          <Link className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 mb-4">No booking links created yet</p>
          <p className="text-sm text-gray-500 mb-6">
            Create your first booking link to start accepting appointments online
          </p>
          <Button
            onClick={() => router.push('/booking-links/create')}
            variant="outline"
          >
            Create Your First Link
          </Button>
        </div>
      ) : (
        <div className="grid gap-6">
          {bookingLinks.map((link) => (
            <div key={link.id} className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    {getTypeIcon(link.type)}
                    <h3 className="text-xl font-semibold text-white">{link.name}</h3>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      link.is_active 
                        ? 'bg-green-900 text-green-300' 
                        : 'bg-gray-700 text-gray-400'
                    }`}>
                      {link.is_active ? 'Active' : 'Inactive'}
                    </span>
                    {!link.is_public && (
                      <span className="text-xs px-2 py-1 rounded-full bg-yellow-900 text-yellow-300">
                        Private
                      </span>
                    )}
                  </div>
                  
                  {link.description && (
                    <p className="text-gray-400 mb-3">{link.description}</p>
                  )}

                  {/* URL */}
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex items-center gap-2">
                      <Link className="w-4 h-4 text-gray-500" />
                      <code className="text-sm text-gray-400 bg-gray-900 px-2 py-1 rounded">
                        {typeof window !== 'undefined' ? window.location.origin : ''}/book/{link.slug}
                      </code>
                    </div>
                    <button
                      onClick={() => copyToClipboard(link.slug)}
                      className="text-gray-400 hover:text-white transition-colors"
                      title="Copy URL"
                    >
                      {copiedId === link.slug ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                    <a
                      href={`/book/${link.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-400 hover:text-white transition-colors"
                      title="Open in new tab"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>

                  {/* Details */}
                  <div className="flex items-center gap-6 text-sm text-gray-500 mb-4">
                    <span className="capitalize flex items-center gap-1">
                      {getTypeIcon(link.type)}
                      {link.type.replace('_', ' ')} booking
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {link.appointment_type_ids.length} appointment type
                      {link.appointment_type_ids.length !== 1 ? 's' : ''}
                    </span>
                    {link.assigned_staff_ids && link.assigned_staff_ids.length > 0 && (
                      <span className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {link.assigned_staff_ids.length} staff assigned
                      </span>
                    )}
                    <span>{link.timezone}</span>
                  </div>

                  {/* Stats */}
                  {link.stats && (
                    <div className="flex items-center gap-6 text-sm">
                      <div className="text-blue-400">
                        <span className="font-medium">{link.stats.total_bookings}</span>
                        <span className="text-gray-500 ml-1">total bookings</span>
                      </div>
                      <div className="text-green-400">
                        <span className="font-medium">{link.stats.this_month}</span>
                        <span className="text-gray-500 ml-1">this month</span>
                      </div>
                      <div className="text-purple-400">
                        <span className="font-medium">{link.stats.conversion_rate.toFixed(1)}%</span>
                        <span className="text-gray-500 ml-1">conversion</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 ml-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/booking-links/${link.id}/analytics`)}
                    title="View Analytics"
                  >
                    <BarChart3 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(`/book/${link.slug}`, '_blank')}
                    title="Preview"
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/booking-links/${link.id}/edit`)}
                    title="Edit"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(link.id, link.name)}
                    className="text-red-400 hover:text-red-300"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Quick Settings */}
              <div className="mt-4 pt-4 border-t border-gray-700">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      link.confirmation_settings?.auto_confirm ? 'bg-green-500' : 'bg-yellow-500'
                    }`} />
                    <span className="text-gray-400">
                      {link.confirmation_settings?.auto_confirm ? 'Auto-confirm' : 'Manual approval'}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      link.notification_settings?.email_enabled ? 'bg-green-500' : 'bg-gray-500'
                    }`} />
                    <span className="text-gray-400">
                      Email {link.notification_settings?.email_enabled ? 'enabled' : 'disabled'}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      link.payment_settings?.enabled ? 'bg-green-500' : 'bg-gray-500'
                    }`} />
                    <span className="text-gray-400">
                      Payment {link.payment_settings?.enabled ? 'required' : 'optional'}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      link.cancellation_policy?.allowed ? 'bg-green-500' : 'bg-red-500'
                    }`} />
                    <span className="text-gray-400">
                      Cancellation {link.cancellation_policy?.allowed ? 'allowed' : 'disabled'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Help Section */}
      <div className="mt-12 bg-blue-900 bg-opacity-20 border border-blue-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-400 mb-3">Getting Started with Booking Links</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-gray-300">
          <div>
            <h4 className="font-medium text-white mb-2">Quick Setup</h4>
            <ul className="space-y-1">
              <li>• Create appointment types in Settings → Booking</li>
              <li>• Set your availability in the Calendar section</li>
              <li>• Create booking links for different services</li>
              <li>• Share links with prospects and on your website</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-white mb-2">Pro Tips</h4>
            <ul className="space-y-1">
              <li>• Use round-robin for even distribution among staff</li>
              <li>• Set buffer times to avoid back-to-back bookings</li>
              <li>• Enable payment collection for paid consultations</li>
              <li>• Customize colors to match your brand</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}