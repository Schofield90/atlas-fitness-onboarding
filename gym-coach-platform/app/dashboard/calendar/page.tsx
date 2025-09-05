'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Calendar as CalendarIcon,
  Link2,
  ArrowRight,
  Clock,
  Users,
  ExternalLink
} from 'lucide-react'

export default function CalendarPage() {
  const router = useRouter()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Calendar & Booking Overview</h1>
        <p className="text-gray-600">Access your calendar and booking management tools</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Google Calendar Card */}
        <Card className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <CalendarIcon className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Google Calendar</h2>
              <p className="text-sm text-gray-600">View and manage your synced calendar events</p>
            </div>
          </div>
          
          <div className="space-y-3 mb-4">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Clock className="h-4 w-4" />
              <span>Real-time sync with Google Calendar</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Users className="h-4 w-4" />
              <span>Appointment and class management</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <ExternalLink className="h-4 w-4" />
              <span>Bidirectional event synchronization</span>
            </div>
          </div>
          
          <Button 
            className="w-full" 
            onClick={() => router.push('/dashboard/google-calendar')}
          >
            Open Google Calendar
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </Card>

        {/* Booking Links Card */}
        <Card className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <Link2 className="h-8 w-8 text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Booking Links</h2>
              <p className="text-sm text-gray-600">Create and manage booking links for clients</p>
            </div>
          </div>
          
          <div className="space-y-3 mb-4">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Link2 className="h-4 w-4" />
              <span>Custom booking URLs for services</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Users className="h-4 w-4" />
              <span>Track bookings and conversions</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Clock className="h-4 w-4" />
              <span>Flexible scheduling options</span>
            </div>
          </div>
          
          <Button 
            className="w-full" 
            onClick={() => router.push('/dashboard/booking-links')}
          >
            Manage Booking Links
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </Card>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Events</CardTitle>
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8</div>
            <p className="text-xs text-muted-foreground">Appointments & classes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Links</CardTitle>
            <Link2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">4</div>
            <p className="text-xs text-muted-foreground">Booking links</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Week</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">32</div>
            <p className="text-xs text-muted-foreground">New bookings</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sync Status</CardTitle>
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">✓</div>
            <p className="text-xs text-muted-foreground">Connected & synced</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}