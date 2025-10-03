'use client'

import { useState } from 'react'
import { X, Edit, Trash, Calendar, Clock, Users, Link } from 'lucide-react'
import type { CalendarEvent } from '@/app/lib/types/calendar'
import { formatBritishDate, formatBritishDateTime } from '@/app/lib/utils/british-format'

interface EventDetailsModalProps {
  event: CalendarEvent | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit?: (event: CalendarEvent) => void
  onDelete?: (eventId: string) => void
}

export function EventDetailsModal({ 
  event, 
  open, 
  onOpenChange,
  onEdit,
  onDelete
}: EventDetailsModalProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  
  if (!open || !event) return null

  const handleDelete = async () => {
    if (!onDelete) return
    
    const confirmed = window.confirm(
      'Are you sure you want to delete this event? This will also remove it from Google Calendar if synced.'
    )
    
    if (confirmed) {
      setIsDeleting(true)
      await onDelete(event.id)
      setIsDeleting(false)
      onOpenChange(false)
    }
  }

  const handleEdit = () => {
    if (onEdit) {
      onEdit(event)
      onOpenChange(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-lg max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">Event Details</h2>
          <button
            onClick={() => onOpenChange(false)}
            className="p-1 hover:bg-gray-700 rounded transition-colors"
          >
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Title */}
          <div>
            <h3 className="text-lg font-medium text-white">{event.title}</h3>
            {event.description && (
              <p className="text-gray-400 mt-1">{event.description}</p>
            )}
          </div>

          {/* Date and Time */}
          <div className="flex items-center gap-2 text-gray-300">
            <Calendar className="h-4 w-4 text-gray-500" />
            <span>{formatBritishDate(event.startTime)}</span>
          </div>
          
          <div className="flex items-center gap-2 text-gray-300">
            <Clock className="h-4 w-4 text-gray-500" />
            <span>
              {new Date(event.startTime).toLocaleTimeString('en-GB', {
                hour: '2-digit',
                minute: '2-digit'
              })}
              {' - '}
              {new Date(event.endTime).toLocaleTimeString('en-GB', {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
          </div>

          {/* Attendees */}
          {event.attendees && event.attendees.length > 0 && (
            <div>
              <div className="flex items-center gap-2 text-gray-300 mb-2">
                <Users className="h-4 w-4 text-gray-500" />
                <span>Attendees ({event.attendees.length})</span>
              </div>
              <div className="space-y-1 ml-6">
                {event.attendees.map((attendee, index) => (
                  <div key={index} className="text-sm text-gray-400">
                    {attendee.name || attendee.email}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Meeting URL */}
          {event.meetingUrl && (
            <div className="flex items-center gap-2">
              <Link className="h-4 w-4 text-gray-500" />
              <a 
                href={event.meetingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 text-sm underline"
              >
                Join Meeting
              </a>
            </div>
          )}

          {/* Google Calendar Status */}
          {event.googleEventId && (
            <div className="text-xs text-gray-500 flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Synced with Google Calendar
            </div>
          )}

          {/* Status */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">Status:</span>
            <span className={`text-sm font-medium ${
              event.status === 'confirmed' ? 'text-green-400' : 
              event.status === 'cancelled' ? 'text-red-400' : 
              'text-yellow-400'
            }`}>
              {event.status || 'confirmed'}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={handleEdit}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Edit className="h-4 w-4" />
            Edit Event
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Trash className="h-4 w-4" />
            {isDeleting ? 'Deleting...' : 'Delete Event'}
          </button>
        </div>

        {/* Warning */}
        <p className="text-xs text-gray-500 mt-4 text-center">
          Changes will be synced with Google Calendar if connected
        </p>
      </div>
    </div>
  )
}