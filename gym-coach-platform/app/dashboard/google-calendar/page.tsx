'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Calendar as CalendarIcon,
  Plus,
  ChevronLeft,
  ChevronRight,
  Clock,
  Users,
  Video,
  MapPin,
  Settings,
  ExternalLink,
  Check,
  X,
  RefreshCw,
  AlertCircle,
  Plug,
  Sync,
  Eye,
  Edit,
  Trash2
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface GoogleCalendarEvent {
  id: string
  title: string
  start: Date
  end: Date
  type: 'appointment' | 'class' | 'blocked' | 'personal'
  client?: string
  status: 'confirmed' | 'pending' | 'cancelled'
  location?: string
  attendees?: string[]
  description?: string
  googleEventId?: string
  synced: boolean
}

interface CalendarIntegration {
  connected: boolean
  lastSync?: string
  syncEnabled: boolean
  calendars: GoogleCalendar[]
  totalEvents: number
  syncErrors: number
}

interface GoogleCalendar {
  id: string
  name: string
  primary: boolean
  selected: boolean
  color: string
}

export default function GoogleCalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null)

  // Mock integration status - in production this would come from API
  const [integration, setIntegration] = useState<CalendarIntegration>({
    connected: true,
    lastSync: '2024-01-22T10:30:00',
    syncEnabled: true,
    totalEvents: 42,
    syncErrors: 0,
    calendars: [
      { id: 'primary', name: 'Primary Calendar', primary: true, selected: true, color: '#1a73e8' },
      { id: 'work', name: 'Work Calendar', primary: false, selected: true, color: '#e67c73' },
      { id: 'personal', name: 'Personal', primary: false, selected: false, color: '#33b679' }
    ]
  })

  // Mock events - in production this would come from Google Calendar API
  const [events, setEvents] = useState<GoogleCalendarEvent[]>([
    {
      id: '1',
      title: 'PT Session - John Doe',
      start: new Date(2024, 0, 15, 10, 0),
      end: new Date(2024, 0, 15, 11, 0),
      type: 'appointment',
      client: 'John Doe',
      status: 'confirmed',
      location: 'Gym Floor A',
      googleEventId: 'google_event_123',
      synced: true
    },
    {
      id: '2',
      title: 'HIIT Class',
      start: new Date(2024, 0, 15, 12, 0),
      end: new Date(2024, 0, 15, 13, 0),
      type: 'class',
      status: 'confirmed',
      attendees: ['member1@example.com', 'member2@example.com'],
      googleEventId: 'google_event_456',
      synced: true
    },
    {
      id: '3',
      title: 'Team Meeting',
      start: new Date(2024, 0, 16, 14, 0),
      end: new Date(2024, 0, 16, 15, 0),
      type: 'personal',
      status: 'confirmed',
      location: 'Conference Room',
      googleEventId: 'google_event_789',
      synced: true
    }
  ])

  const handleSyncNow = async () => {
    setIsLoading(true)
    try {
      // Simulate API call to sync with Google Calendar
      await new Promise(resolve => setTimeout(resolve, 2000))
      setLastSyncTime(new Date().toISOString())
      setIntegration(prev => ({
        ...prev,
        lastSync: new Date().toISOString()
      }))
    } finally {
      setIsLoading(false)
    }
  }

  const handleConnectCalendar = () => {
    // Redirect to Google OAuth
    window.open('/api/auth/google', '_blank')
  }

  const handleDisconnectCalendar = () => {
    if (confirm('Are you sure you want to disconnect Google Calendar? This will stop syncing events.')) {
      setIntegration(prev => ({
        ...prev,
        connected: false,
        syncEnabled: false
      }))
    }
  }

  const toggleCalendarSelection = (calendarId: string) => {
    setIntegration(prev => ({
      ...prev,
      calendars: prev.calendars.map(cal => 
        cal.id === calendarId ? { ...cal, selected: !cal.selected } : cal
      )
    }))
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

  if (!integration.connected) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Google Calendar</h1>
          <p className="text-gray-600">Connect your Google Calendar to sync events and appointments</p>
        </div>

        <Card className="p-8 text-center">
          <CalendarIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-gray-900 mb-2">Connect Google Calendar</h3>
          <p className="text-gray-500 mb-6">
            Sync your appointments, classes, and events with Google Calendar for seamless scheduling.
          </p>
          <Button onClick={handleConnectCalendar} size="lg">
            <Plug className="h-5 w-5 mr-2" />
            Connect Google Calendar
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Google Calendar</h1>
          <p className="text-gray-600">View and manage your synced Google Calendar events</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleSyncNow} disabled={isLoading}>
            {isLoading ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Sync className="h-4 w-4 mr-2" />
            )}
            {isLoading ? 'Syncing...' : 'Sync Now'}
          </Button>
          <Button variant="outline" onClick={() => window.open('https://calendar.google.com', '_blank')}>
            <ExternalLink className="h-4 w-4 mr-2" />
            Open Google Calendar
          </Button>
        </div>
      </div>

      {/* Integration Status */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Connection Status</CardTitle>
            <Check className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">Connected</div>
            <p className="text-xs text-muted-foreground">
              Last sync: {integration.lastSync ? new Date(integration.lastSync).toLocaleString() : 'Never'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{integration.totalEvents}</div>
            <p className="text-xs text-muted-foreground">Synced events</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Calendars</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{integration.calendars.filter(c => c.selected).length}</div>
            <p className="text-xs text-muted-foreground">of {integration.calendars.length} calendars</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sync Status</CardTitle>
            {integration.syncErrors > 0 ? (
              <AlertCircle className="h-4 w-4 text-red-600" />
            ) : (
              <Check className="h-4 w-4 text-green-600" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${integration.syncErrors > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {integration.syncErrors > 0 ? `${integration.syncErrors} Errors` : 'Healthy'}
            </div>
            <p className="text-xs text-muted-foreground">Sync status</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="calendar" className="space-y-4">
        <TabsList>
          <TabsTrigger value="calendar">Calendar View</TabsTrigger>
          <TabsTrigger value="events">Event List</TabsTrigger>
          <TabsTrigger value="settings">Sync Settings</TabsTrigger>
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
                                "text-xs p-1 rounded truncate flex items-center",
                                event.type === 'appointment' && "bg-blue-100 text-blue-700",
                                event.type === 'class' && "bg-green-100 text-green-700",
                                event.type === 'personal' && "bg-purple-100 text-purple-700",
                                event.type === 'blocked' && "bg-gray-100 text-gray-700"
                              )}
                            >
                              {event.synced && <Check className="w-2 h-2 mr-1" />}
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
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium">{event.title}</p>
                                  {event.synced && (
                                    <Badge variant="outline" className="text-xs">
                                      <Check className="w-3 h-3 mr-1" />
                                      Synced
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-gray-500">
                                  {event.start.toLocaleTimeString('en-US', { 
                                    hour: '2-digit', 
                                    minute: '2-digit' 
                                  })} - {event.end.toLocaleTimeString('en-US', { 
                                    hour: '2-digit', 
                                    minute: '2-digit' 
                                  })}
                                </p>
                                {event.location && (
                                  <p className="text-sm text-gray-500 flex items-center gap-1">
                                    <MapPin className="w-3 h-3" />
                                    {event.location}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge
                                variant={
                                  event.status === 'confirmed' ? 'default' :
                                  event.status === 'pending' ? 'secondary' : 'destructive'
                                }
                              >
                                {event.status}
                              </Badge>
                              {event.googleEventId && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => window.open(`https://calendar.google.com/calendar/event?eid=${event.googleEventId}`, '_blank')}
                                >
                                  <ExternalLink className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          </div>
                        ))
                    ) : (
                      <p className="text-sm text-gray-500">No events scheduled</p>
                    )}
                </div>
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="events" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Events</CardTitle>
              <CardDescription>All events synced from Google Calendar</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {events.map(event => (
                  <div key={event.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-3 h-3 rounded-full",
                        event.type === 'appointment' && "bg-blue-500",
                        event.type === 'class' && "bg-green-500",
                        event.type === 'personal' && "bg-purple-500",
                        event.type === 'blocked' && "bg-gray-500"
                      )} />
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{event.title}</p>
                          {event.synced && (
                            <Badge variant="outline" className="text-xs">
                              <Check className="w-3 h-3 mr-1" />
                              Synced
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">
                          {event.start.toLocaleDateString()} at {event.start.toLocaleTimeString('en-US', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </p>
                        {event.client && (
                          <p className="text-sm text-gray-500">Client: {event.client}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          event.status === 'confirmed' ? 'default' :
                          event.status === 'pending' ? 'secondary' : 'destructive'
                        }
                      >
                        {event.status}
                      </Badge>
                      {event.googleEventId && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(`https://calendar.google.com/calendar/event?eid=${event.googleEventId}`, '_blank')}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Calendar Selection</CardTitle>
                <CardDescription>Choose which Google Calendars to sync</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {integration.calendars.map(calendar => (
                  <div key={calendar.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-4 h-4 rounded-full" 
                        style={{ backgroundColor: calendar.color }}
                      />
                      <div>
                        <p className="font-medium">{calendar.name}</p>
                        {calendar.primary && (
                          <Badge variant="outline" className="text-xs">Primary</Badge>
                        )}
                      </div>
                    </div>
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={calendar.selected}
                        onChange={() => toggleCalendarSelection(calendar.id)}
                        className="sr-only"
                      />
                      <div className={cn(
                        "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
                        calendar.selected ? "bg-blue-600 border-blue-600" : "border-gray-300"
                      )}>
                        {calendar.selected && <Check className="w-3 h-3 text-white" />}
                      </div>
                    </label>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Sync Settings</CardTitle>
                <CardDescription>Configure how events are synchronized</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Auto Sync</p>
                      <p className="text-sm text-gray-500">Automatically sync events every 15 minutes</p>
                    </div>
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={integration.syncEnabled}
                        onChange={(e) => setIntegration(prev => ({ ...prev, syncEnabled: e.target.checked }))}
                        className="sr-only"
                      />
                      <div className={cn(
                        "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
                        integration.syncEnabled ? "bg-blue-600 border-blue-600" : "border-gray-300"
                      )}>
                        {integration.syncEnabled && <Check className="w-3 h-3 text-white" />}
                      </div>
                    </label>
                  </div>

                  <div className="pt-4 border-t">
                    <Button variant="outline" onClick={handleDisconnectCalendar} className="w-full">
                      <X className="h-4 w-4 mr-2" />
                      Disconnect Google Calendar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}