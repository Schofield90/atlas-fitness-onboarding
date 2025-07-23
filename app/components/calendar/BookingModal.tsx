'use client'

import { useState } from 'react'
import { Calendar, Clock, Video, Phone, MapPin, Mail, User, X } from 'lucide-react'
import type { TimeSlot } from '@/app/lib/types/calendar'

interface BookingModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  slot: TimeSlot
  duration: number
  title: string
  onBookingComplete: () => void
  isPublicBooking?: boolean
  hostUserId?: string
  organizationId?: string
  leadId?: string
  leadName?: string
  leadEmail?: string
  leadPhone?: string
}

export function BookingModal({
  open,
  onOpenChange,
  slot,
  duration,
  title,
  onBookingComplete,
  isPublicBooking = false,
  hostUserId,
  organizationId,
  leadId,
  leadName = '',
  leadEmail = '',
  leadPhone = ''
}: BookingModalProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: title || 'Consultation',
    description: '',
    name: leadName,
    email: leadEmail,
    phone: leadPhone,
    meetingType: 'video' as 'video' | 'phone' | 'in-person',
    sendCalendarInvite: true
  })

  if (!open) return null

  const formatDateTime = () => {
    const start = new Date(slot.startTime)
    const end = new Date(slot.endTime)
    
    return {
      date: start.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      }),
      time: `${start.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })} - ${end.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })}`
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (isPublicBooking && (!formData.name || !formData.email)) {
      alert('Please fill in your name and email')
      return
    }
    
    setLoading(true)
    
    try {
      const eventData = {
        title: `${formData.title} with ${formData.name || leadName}`,
        description: formData.description,
        startTime: slot.startTime,
        endTime: slot.endTime,
        meetingType: formData.meetingType,
        sendCalendarInvite: formData.sendCalendarInvite,
        attendees: formData.email ? [{
          email: formData.email,
          name: formData.name || undefined
        }] : [],
        leadId: leadId,
        organizationId: organizationId,
        createdBy: hostUserId,
        googleCalendarConnected: !isPublicBooking
      }
      
      const response = await fetch('/api/calendar/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData)
      })
      
      if (!response.ok) {
        throw new Error('Failed to create booking')
      }
      
      alert(
        isPublicBooking 
          ? 'Booking confirmed! Check your email for details.'
          : 'Meeting scheduled successfully!'
      )
      
      onBookingComplete()
      onOpenChange(false)
      
    } catch (error) {
      console.error('Error creating booking:', error)
      alert('Failed to create booking. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const { date, time } = formatDateTime()

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">
              {isPublicBooking ? `Book ${title}` : 'Schedule Meeting'}
            </h2>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="text-gray-400 hover:text-white"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <p className="text-gray-400 mb-6">
            Fill in the details for your {duration}-minute meeting
          </p>

          <div className="space-y-4">
            {/* Date & Time Display */}
            <div className="bg-gray-700 rounded-lg p-4">
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span>{date}</span>
              </div>
              <div className="flex items-center gap-3 text-sm mt-2">
                <Clock className="h-4 w-4 text-gray-400" />
                <span>{time}</span>
              </div>
            </div>

            {/* Public Booking Fields */}
            {isPublicBooking && (
              <>
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-1">
                    Your Name *
                  </label>
                  <input
                    id="name"
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="John Doe"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">
                    Your Email *
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="john@example.com"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-300 mb-1">
                    Phone Number (Optional)
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+1 (555) 123-4567"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-orange-500"
                  />
                </div>
              </>
            )}

            {/* Meeting Title */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-300 mb-1">
                Meeting Title
              </label>
              <input
                id="title"
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Consultation"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-orange-500"
              />
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-1">
                Description (Optional)
              </label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                placeholder="Add any notes or agenda items..."
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-orange-500"
              />
            </div>

            {/* Meeting Type */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Meeting Type
              </label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, meetingType: 'video' })}
                  className={`p-3 rounded-lg border transition-all ${
                    formData.meetingType === 'video'
                      ? 'border-orange-500 bg-orange-500/20'
                      : 'border-gray-600 hover:border-gray-500'
                  }`}
                >
                  <Video className="h-5 w-5 mx-auto mb-1" />
                  <span className="text-xs">Video Call</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, meetingType: 'phone' })}
                  className={`p-3 rounded-lg border transition-all ${
                    formData.meetingType === 'phone'
                      ? 'border-orange-500 bg-orange-500/20'
                      : 'border-gray-600 hover:border-gray-500'
                  }`}
                >
                  <Phone className="h-5 w-5 mx-auto mb-1" />
                  <span className="text-xs">Phone Call</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, meetingType: 'in-person' })}
                  className={`p-3 rounded-lg border transition-all ${
                    formData.meetingType === 'in-person'
                      ? 'border-orange-500 bg-orange-500/20'
                      : 'border-gray-600 hover:border-gray-500'
                  }`}
                >
                  <MapPin className="h-5 w-5 mx-auto mb-1" />
                  <span className="text-xs">In Person</span>
                </button>
              </div>
            </div>

            {/* Lead Contact Info (for internal bookings) */}
            {!isPublicBooking && (leadEmail || leadPhone) && (
              <div className="bg-gray-700 rounded-lg p-4 space-y-2">
                <h4 className="text-sm font-medium mb-2">Lead Contact Info</h4>
                {leadEmail && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <span>{leadEmail}</span>
                  </div>
                )}
                {leadPhone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <span>{leadPhone}</span>
                  </div>
                )}
              </div>
            )}

            {/* Send Calendar Invite */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="sendInvite"
                checked={formData.sendCalendarInvite}
                onChange={(e) => setFormData({ ...formData, sendCalendarInvite: e.target.checked })}
                className="w-4 h-4 text-orange-500 bg-gray-700 border-gray-600 rounded focus:ring-orange-500"
              />
              <label htmlFor="sendInvite" className="text-sm text-gray-300 cursor-pointer">
                Send calendar invite via email
              </label>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Booking...' : 'Confirm Booking'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}