'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Calendar as CalendarIcon,
  Plus,
  Link2,
  Copy,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Users,
  Video,
  MapPin,
  Settings,
  ExternalLink,
  Check,
  X
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface BookingLink {
  id: string
  name: string
  url: string
  duration: number
  type: 'one-on-one' | 'group' | 'class'
  active: boolean
  description?: string
}

interface CalendarEvent {
  id: string
  title: string
  start: Date
  end: Date
  type: 'appointment' | 'class' | 'blocked'
  client?: string
  status: 'confirmed' | 'pending' | 'cancelled'
}

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [showNewLinkModal, setShowNewLinkModal] = useState(false)
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null)
  const [editingLink, setEditingLink] = useState<BookingLink | null>(null)

  // Mock data - in production this would come from API
  const [bookingLinks, setBookingLinks] = useState<BookingLink[]>([
    {
      id: '1',
      name: '30 Minute Consultation',
      url: 'https://book.atlasfitness.com/consultation',
      duration: 30,
      type: 'one-on-one',
      active: true,
      description: 'Free fitness consultation for new members'
    },
    {
      id: '2',
      name: 'Personal Training Session',
      url: 'https://book.atlasfitness.com/pt-session',
      duration: 60,
      type: 'one-on-one',
      active: true,
      description: '1-on-1 personal training session'
    },
    {
      id: '3',
      name: 'Group Fitness Class',
      url: 'https://book.atlasfitness.com/group-class',
      duration: 45,
      type: 'group',
      active: false,
      description: 'High-intensity group workout'
    }
  ])

  const [events, setEvents] = useState<CalendarEvent[]>([
    {
      id: '1',
      title: 'PT Session - John Doe',
      start: new Date(2024, 0, 15, 10, 0),
      end: new Date(2024, 0, 15, 11, 0),
      type: 'appointment',
      client: 'John Doe',
      status: 'confirmed'
    },
    {
      id: '2',
      title: 'HIIT Class',
      start: new Date(2024, 0, 15, 12, 0),
      end: new Date(2024, 0, 15, 13, 0),
      type: 'class',
      status: 'confirmed'
    }
  ])

  const handleCopyLink = (link: BookingLink) => {
    navigator.clipboard.writeText(link.url)
    setCopiedLinkId(link.id)
    setTimeout(() => setCopiedLinkId(null), 2000)
  }

  const handleToggleLink = (linkId: string) => {
    setBookingLinks(links =>
      links.map(link =>
        link.id === linkId ? { ...link, active: !link.active } : link
      )
    )
  }

  const handleDeleteLink = (linkId: string) => {
    setBookingLinks(links => links.filter(link => link.id !== linkId))
  }

  const handleSaveLink = (linkData: Partial<BookingLink>) => {
    if (editingLink) {
      setBookingLinks(links =>
        links.map(link =>
          link.id === editingLink.id ? { ...link, ...linkData } : link
        )
      )
    } else {
      const newLink: BookingLink = {
        id: Date.now().toString(),
        name: linkData.name || 'New Booking Link',
        url: `https://book.atlasfitness.com/${linkData.name?.toLowerCase().replace(/\s+/g, '-')}`,
        duration: linkData.duration || 30,
        type: linkData.type || 'one-on-one',
        active: true,
        description: linkData.description
      }
      setBookingLinks([...bookingLinks, newLink])
    }
    setShowNewLinkModal(false)
    setEditingLink(null)
  }

  // Calendar helpers
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const days = []
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i))
    }
    return days
  }

  const formatMonth = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prevDate => {
      const newDate = new Date(prevDate)
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1)
      } else {
        newDate.setMonth(newDate.getMonth() + 1)
      }
      return newDate
    })
  }

  const days = getDaysInMonth(currentDate)
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Calendar & Booking</h1>
        <p className="text-gray-600">Manage your schedule and booking links</p>
      </div>

      <Tabs defaultValue="calendar" className="space-y-4">
        <TabsList>
          <TabsTrigger value="calendar">Calendar View</TabsTrigger>
          <TabsTrigger value="booking-links">Booking Links</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="space-y-4">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">{formatMonth(currentDate)}</h2>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => navigateMonth('prev')}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentDate(new Date())}
                >
                  Today
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => navigateMonth('next')}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-lg overflow-hidden">
              {/* Week day headers */}
              {weekDays.map(day => (
                <div
                  key={day}
                  className="bg-gray-50 p-2 text-center text-sm font-medium text-gray-700"
                >
                  {day}
                </div>
              ))}

              {/* Calendar days */}
              {days.map((day, index) => (
                <div
                  key={index}
                  className={cn(
                    "bg-white p-2 min-h-[100px] cursor-pointer hover:bg-gray-50 transition-colors",
                    day && selectedDate?.toDateString() === day.toDateString() && "bg-blue-50",
                    !day && "bg-gray-50"
                  )}
                  onClick={() => day && setSelectedDate(day)}
                >
                  {day && (
                    <>
                      <div className={cn(
                        "text-sm font-medium mb-1",
                        day.toDateString() === new Date().toDateString() 
                          ? "text-blue-600 font-bold" 
                          : "text-gray-900"
                      )}>
                        {day.getDate()}
                      </div>
                      {/* Event indicators */}
                      <div className="space-y-1">
                        {events
                          .filter(event => 
                            event.start.toDateString() === day.toDateString()
                          )
                          .slice(0, 2)
                          .map(event => (
                            <div
                              key={event.id}
                              className={cn(
                                "text-xs p-1 rounded truncate",
                                event.type === 'appointment' && "bg-blue-100 text-blue-700",
                                event.type === 'class' && "bg-green-100 text-green-700",
                                event.type === 'blocked' && "bg-gray-100 text-gray-700"
                              )}
                            >
                              {event.title}
                            </div>
                          ))}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>

            {/* Selected Date Events */}
            {selectedDate && (
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium mb-3">
                  Events for {selectedDate.toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </h3>
                <div className="space-y-2">
                  {events
                    .filter(event => 
                      event.start.toDateString() === selectedDate.toDateString()
                    )
                    .length > 0 ? (
                      events
                        .filter(event => 
                          event.start.toDateString() === selectedDate.toDateString()
                        )
                        .map(event => (
                          <div key={event.id} className="flex items-center justify-between p-3 bg-white rounded-lg">
                            <div className="flex items-center gap-3">
                              <Clock className="h-4 w-4 text-gray-400" />
                              <div>
                                <p className="font-medium">{event.title}</p>
                                <p className="text-sm text-gray-500">
                                  {event.start.toLocaleTimeString('en-US', { 
                                    hour: '2-digit', 
                                    minute: '2-digit' 
                                  })} - {event.end.toLocaleTimeString('en-US', { 
                                    hour: '2-digit', 
                                    minute: '2-digit' 
                                  })}
                                </p>
                              </div>
                            </div>
                            <Badge
                              variant={
                                event.status === 'confirmed' ? 'default' :
                                event.status === 'pending' ? 'secondary' : 'destructive'
                              }
                            >
                              {event.status}
                            </Badge>
                          </div>
                        ))
                    ) : (
                      <p className="text-sm text-gray-500">No events scheduled</p>
                    )}
                </div>
                <Button className="w-full mt-3">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Event
                </Button>
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="booking-links" className="space-y-4">
          {/* Booking Links Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Booking Links</h2>
              <p className="text-sm text-gray-600">Create and manage your booking links</p>
            </div>
            <Button onClick={() => setShowNewLinkModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create New Link
            </Button>
          </div>

          {/* Booking Links List */}
          <div className="grid gap-4">
            {bookingLinks.length === 0 ? (
              <Card className="p-8 text-center">
                <Link2 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No booking links yet</h3>
                <p className="text-gray-500 mb-4">
                  Create booking links to allow clients to schedule appointments
                </p>
                <Button onClick={() => setShowNewLinkModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Link
                </Button>
              </Card>
            ) : (
              bookingLinks.map(link => (
                <Card key={link.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-medium">{link.name}</h3>
                        <Badge variant={link.active ? 'default' : 'secondary'}>
                          {link.active ? 'Active' : 'Inactive'}
                        </Badge>
                        <Badge variant="outline">
                          {link.type === 'one-on-one' ? '1-on-1' : 
                           link.type === 'group' ? 'Group' : 'Class'}
                        </Badge>
                      </div>
                      {link.description && (
                        <p className="text-sm text-gray-600 mb-2">{link.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {link.duration} min
                        </span>
                        <span className="flex items-center gap-1">
                          <Link2 className="h-3 w-3" />
                          {link.url}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopyLink(link)}
                      >
                        {copiedLinkId === link.id ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(link.url, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingLink(link)
                          setShowNewLinkModal(true)
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleLink(link.id)}
                      >
                        {link.active ? (
                          <X className="h-4 w-4" />
                        ) : (
                          <Check className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteLink(link.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Calendar Settings</h2>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Business Hours</label>
                <div className="grid grid-cols-2 gap-4">
                  <Input type="time" defaultValue="09:00" />
                  <Input type="time" defaultValue="18:00" />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Time Zone</label>
                <select className="w-full border rounded-lg p-2">
                  <option>GMT (London)</option>
                  <option>EST (New York)</option>
                  <option>PST (Los Angeles)</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Default Appointment Duration</label>
                <select className="w-full border rounded-lg p-2">
                  <option>15 minutes</option>
                  <option>30 minutes</option>
                  <option>45 minutes</option>
                  <option>60 minutes</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Buffer Time Between Appointments</label>
                <select className="w-full border rounded-lg p-2">
                  <option>No buffer</option>
                  <option>5 minutes</option>
                  <option>10 minutes</option>
                  <option>15 minutes</option>
                </select>
              </div>

              <div className="pt-4">
                <Button>Save Settings</Button>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* New/Edit Link Modal */}
      {showNewLinkModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-[500px]">
            <h3 className="text-lg font-semibold mb-4">
              {editingLink ? 'Edit Booking Link' : 'Create New Booking Link'}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Link Name</label>
                <Input 
                  placeholder="e.g., 30 Minute Consultation" 
                  defaultValue={editingLink?.name}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Description</label>
                <textarea 
                  className="w-full border rounded-lg p-2 text-sm"
                  rows={3}
                  placeholder="Brief description of this booking type..."
                  defaultValue={editingLink?.description}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Duration</label>
                <select 
                  className="w-full border rounded-lg p-2"
                  defaultValue={editingLink?.duration || 30}
                >
                  <option value={15}>15 minutes</option>
                  <option value={30}>30 minutes</option>
                  <option value={45}>45 minutes</option>
                  <option value={60}>60 minutes</option>
                  <option value={90}>90 minutes</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Type</label>
                <select 
                  className="w-full border rounded-lg p-2"
                  defaultValue={editingLink?.type || 'one-on-one'}
                >
                  <option value="one-on-one">One-on-One</option>
                  <option value="group">Group Session</option>
                  <option value="class">Class</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowNewLinkModal(false)
                  setEditingLink(null)
                }}
              >
                Cancel
              </Button>
              <Button onClick={() => handleSaveLink({
                name: 'New Booking Link',
                duration: 30,
                type: 'one-on-one'
              })}>
                {editingLink ? 'Save Changes' : 'Create Link'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}