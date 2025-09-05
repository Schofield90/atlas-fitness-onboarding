'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Plus,
  Link2,
  Copy,
  Edit,
  Trash2,
  Clock,
  Users,
  Settings,
  ExternalLink,
  Check,
  X,
  BarChart3,
  TrendingUp,
  Eye
} from 'lucide-react'

interface BookingLink {
  id: string
  name: string
  url: string
  duration: number
  type: 'one-on-one' | 'group' | 'class'
  active: boolean
  description?: string
  bookingsCount: number
  conversionRate: number
  lastBooking?: string
}

export default function BookingLinksPage() {
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null)
  const [editingLink, setEditingLink] = useState<BookingLink | null>(null)
  const [showNewLinkModal, setShowNewLinkModal] = useState(false)

  // Mock data - in production this would come from API
  const [bookingLinks, setBookingLinks] = useState<BookingLink[]>([
    {
      id: '1',
      name: '30 Minute Consultation',
      url: 'https://book.atlasfitness.com/consultation',
      duration: 30,
      type: 'one-on-one',
      active: true,
      description: 'Free fitness consultation for new members',
      bookingsCount: 24,
      conversionRate: 68,
      lastBooking: '2024-01-22T14:30:00'
    },
    {
      id: '2',
      name: 'Personal Training Session',
      url: 'https://book.atlasfitness.com/pt-session',
      duration: 60,
      type: 'one-on-one',
      active: true,
      description: '1-on-1 personal training session',
      bookingsCount: 18,
      conversionRate: 45,
      lastBooking: '2024-01-21T16:00:00'
    },
    {
      id: '3',
      name: 'Group Fitness Class',
      url: 'https://book.atlasfitness.com/group-class',
      duration: 45,
      type: 'group',
      active: false,
      description: 'High-intensity group workout',
      bookingsCount: 6,
      conversionRate: 32,
      lastBooking: '2024-01-20T18:00:00'
    },
    {
      id: '4',
      name: 'Nutrition Consultation',
      url: 'https://book.atlasfitness.com/nutrition',
      duration: 45,
      type: 'one-on-one',
      active: true,
      description: 'Personalized nutrition planning session',
      bookingsCount: 12,
      conversionRate: 78,
      lastBooking: '2024-01-22T11:00:00'
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
    if (confirm('Are you sure you want to delete this booking link? This action cannot be undone.')) {
      setBookingLinks(links => links.filter(link => link.id !== linkId))
    }
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
        description: linkData.description,
        bookingsCount: 0,
        conversionRate: 0
      }
      setBookingLinks([...bookingLinks, newLink])
    }
    setShowNewLinkModal(false)
    setEditingLink(null)
  }

  const totalBookings = bookingLinks.reduce((sum, link) => sum + link.bookingsCount, 0)
  const activeLinks = bookingLinks.filter(link => link.active).length
  const avgConversionRate = bookingLinks.reduce((sum, link) => sum + link.conversionRate, 0) / bookingLinks.length

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Booking Links</h1>
          <p className="text-gray-600">Create and manage booking links for your services</p>
        </div>
        <Button onClick={() => setShowNewLinkModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create New Link
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Links</CardTitle>
            <Link2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{bookingLinks.length}</div>
            <p className="text-xs text-muted-foreground">{activeLinks} active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalBookings}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Conversion</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(avgConversionRate)}%</div>
            <p className="text-xs text-muted-foreground">Conversion rate</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{Math.round(totalBookings * 0.3)}</div>
            <p className="text-xs text-muted-foreground">New bookings</p>
          </CardContent>
        </Card>
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
            <Card key={link.id} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="text-lg font-medium">{link.name}</h3>
                    <Badge variant={link.active ? 'default' : 'secondary'}>
                      {link.active ? 'Active' : 'Inactive'}
                    </Badge>
                    <Badge variant="outline">
                      {link.type === 'one-on-one' ? '1-on-1' : 
                       link.type === 'group' ? 'Group' : 'Class'}
                    </Badge>
                  </div>
                  
                  {link.description && (
                    <p className="text-sm text-gray-600 mb-3">{link.description}</p>
                  )}
                  
                  <div className="flex items-center gap-6 text-sm text-gray-500 mb-4">
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {link.duration} min
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {link.bookingsCount} bookings
                    </span>
                    <span className="flex items-center gap-1">
                      <TrendingUp className="h-4 w-4" />
                      {link.conversionRate}% conversion
                    </span>
                    {link.lastBooking && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        Last: {new Date(link.lastBooking).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                    <Link2 className="h-4 w-4 text-gray-400" />
                    <code className="text-sm text-gray-700 flex-1">{link.url}</code>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopyLink(link)}
                >
                  {copiedLinkId === link.id ? (
                    <>
                      <Check className="h-4 w-4 mr-1" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-1" />
                      Copy Link
                    </>
                  )}
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(link.url, '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-1" />
                  Preview
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // Navigate to analytics for this link
                    console.log('View analytics for', link.id)
                  }}
                >
                  <BarChart3 className="h-4 w-4 mr-1" />
                  Analytics
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditingLink(link)
                    setShowNewLinkModal(true)
                  }}
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleToggleLink(link.id)}
                >
                  {link.active ? (
                    <>
                      <X className="h-4 w-4 mr-1" />
                      Disable
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-1" />
                      Enable
                    </>
                  )}
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDeleteLink(link.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* New/Edit Link Modal */}
      {showNewLinkModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-[500px] max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">
              {editingLink ? 'Edit Booking Link' : 'Create New Booking Link'}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Link Name</label>
                <Input 
                  placeholder="e.g., 30 Minute Consultation" 
                  defaultValue={editingLink?.name}
                  id="link-name"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Description</label>
                <textarea 
                  className="w-full border rounded-lg p-2 text-sm"
                  rows={3}
                  placeholder="Brief description of this booking type..."
                  defaultValue={editingLink?.description}
                  id="link-description"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Duration</label>
                <select 
                  className="w-full border rounded-lg p-2"
                  defaultValue={editingLink?.duration || 30}
                  id="link-duration"
                >
                  <option value={15}>15 minutes</option>
                  <option value={30}>30 minutes</option>
                  <option value={45}>45 minutes</option>
                  <option value={60}>60 minutes</option>
                  <option value={90}>90 minutes</option>
                  <option value={120}>2 hours</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Type</label>
                <select 
                  className="w-full border rounded-lg p-2"
                  defaultValue={editingLink?.type || 'one-on-one'}
                  id="link-type"
                >
                  <option value="one-on-one">One-on-One</option>
                  <option value="group">Group Session</option>
                  <option value="class">Class</option>
                </select>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Preview URL</h4>
                <code className="text-sm text-blue-700">
                  https://book.atlasfitness.com/new-booking-link
                </code>
                <p className="text-xs text-blue-600 mt-1">
                  URL will be generated based on the link name
                </p>
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
              <Button onClick={() => {
                const name = (document.getElementById('link-name') as HTMLInputElement)?.value || 'New Booking Link'
                const description = (document.getElementById('link-description') as HTMLTextAreaElement)?.value
                const duration = parseInt((document.getElementById('link-duration') as HTMLSelectElement)?.value || '30')
                const type = (document.getElementById('link-type') as HTMLSelectElement)?.value as BookingLink['type'] || 'one-on-one'
                
                handleSaveLink({
                  name,
                  description,
                  duration,
                  type
                })
              }}>
                {editingLink ? 'Save Changes' : 'Create Link'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}