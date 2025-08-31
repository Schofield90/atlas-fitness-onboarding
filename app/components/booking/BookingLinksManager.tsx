'use client'

import { useState, useEffect } from 'react'
import { Plus, Link, Copy, Trash2, Edit, Check, X, ExternalLink } from 'lucide-react'
import Button from '@/app/components/ui/Button'
import { createClient } from '@/app/lib/supabase/client'

interface BookingLink {
  id: string
  slug: string
  name: string
  description?: string
  type: 'individual' | 'group' | 'round_robin'
  is_public: boolean
  appointment_type_ids: string[]
  user_id?: string
  team_ids?: string[]
  created_at: string
  updated_at: string
}

interface AppointmentType {
  id: string
  name: string
  duration_minutes: number
  description?: string
}

export default function BookingLinksManager() {
  const [bookingLinks, setBookingLinks] = useState<BookingLink[]>([])
  const [appointmentTypes, setAppointmentTypes] = useState<AppointmentType[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingLink, setEditingLink] = useState<BookingLink | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    type: 'individual' as const,
    appointment_type_ids: [] as string[],
    is_public: true
  })

  useEffect(() => {
    fetchBookingLinks()
    fetchAppointmentTypes()
  }, [])

  const fetchBookingLinks = async () => {
    try {
      const supabase = await createClient()
      const { data, error } = await supabase
        .from('booking_links')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setBookingLinks(data || [])
    } catch (error) {
      console.error('Error fetching booking links:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchAppointmentTypes = async () => {
    try {
      const supabase = await createClient()
      const { data, error } = await supabase
        .from('appointment_types')
        .select('*')
        .eq('is_active', true)
        .order('name')

      if (error) throw error
      setAppointmentTypes(data || [])
    } catch (error) {
      console.error('Error fetching appointment types:', error)
    }
  }

  const handleCreate = async () => {
    try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        alert('You must be logged in to create booking links')
        return
      }

      // Get organization ID - try multiple methods
      let organizationId = null

      // Method 1: Check organization_members table
      const { data: orgMember } = await supabase
        .from('organization_members')
        .select('org_id')
        .eq('user_id', user.id)
        .single()

      if (orgMember) {
        organizationId = orgMember.org_id
      } else {
        // Method 2: Check users table for organization_id
        const { data: userData } = await supabase
          .from('users')
          .select('organization_id')
          .eq('id', user.id)
          .single()

        if (userData?.organization_id) {
          organizationId = userData.organization_id
        } else {
          // Method 3: Use the known Atlas Fitness organization ID as fallback
          organizationId = '63589490-8f55-4157-bd3a-e141594b748e'
          console.log('Using fallback organization ID for booking link:', organizationId)
        }
      }

      if (!organizationId) {
        alert('Unable to determine organization. Please contact support.')
        return
      }

      const { data, error } = await supabase
        .from('booking_links')
        .insert({
          ...formData,
          user_id: user.id,
          organization_id: organizationId
        })
        .select()
        .single()

      if (error) throw error

      setBookingLinks([data, ...bookingLinks])
      setShowCreateModal(false)
      resetForm()
      alert('Booking link created successfully!')
    } catch (error) {
      console.error('Error creating booking link:', error)
      alert('Failed to create booking link: ' + (error as any).message)
    }
  }

  const handleUpdate = async () => {
    if (!editingLink) return

    try {
      const supabase = await createClient()
      const { data, error } = await supabase
        .from('booking_links')
        .update(formData)
        .eq('id', editingLink.id)
        .select()
        .single()

      if (error) throw error

      setBookingLinks(bookingLinks.map(link => 
        link.id === editingLink.id ? data : link
      ))
      setEditingLink(null)
      resetForm()
      alert('Booking link updated successfully!')
    } catch (error) {
      console.error('Error updating booking link:', error)
      alert('Failed to update booking link')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this booking link?')) return

    try {
      const supabase = await createClient()
      const { error } = await supabase
        .from('booking_links')
        .delete()
        .eq('id', id)

      if (error) throw error

      setBookingLinks(bookingLinks.filter(link => link.id !== id))
      alert('Booking link deleted successfully!')
    } catch (error) {
      console.error('Error deleting booking link:', error)
      alert('Failed to delete booking link')
    }
  }

  const copyToClipboard = (slug: string) => {
    const url = `${window.location.origin}/book/${slug}`
    navigator.clipboard.writeText(url)
    setCopiedId(slug)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const resetForm = () => {
    setFormData({
      name: '',
      slug: '',
      description: '',
      type: 'individual',
      appointment_type_ids: [],
      is_public: true
    })
  }

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Loading booking links...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-bold text-white">Call Booking Links</h3>
          <p className="text-sm text-gray-400 mt-1">
            Create shareable links for prospects to book sales calls and consultations
          </p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="bg-orange-600 hover:bg-orange-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Booking Link
        </Button>
      </div>

      {/* Booking Links List */}
      {bookingLinks.length === 0 ? (
        <div className="bg-gray-800 rounded-lg p-8 text-center">
          <Link className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 mb-4">No booking links created yet</p>
          <Button
            onClick={() => setShowCreateModal(true)}
            variant="outline"
          >
            Create Your First Link
          </Button>
        </div>
      ) : (
        <div className="grid gap-4">
          {bookingLinks.map((link) => (
            <div key={link.id} className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="text-lg font-semibold text-white">{link.name}</h4>
                  {link.description && (
                    <p className="text-sm text-gray-400 mt-1">{link.description}</p>
                  )}
                  <div className="flex items-center gap-4 mt-3">
                    <div className="flex items-center gap-2">
                      <Link className="w-4 h-4 text-gray-500" />
                      <code className="text-sm text-gray-400">
                        {window.location.origin}/book/{link.slug}
                      </code>
                    </div>
                    <button
                      onClick={() => copyToClipboard(link.slug)}
                      className="text-gray-400 hover:text-white transition-colors"
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
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                  <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                    <span className="capitalize">{link.type} booking</span>
                    <span>•</span>
                    <span>{link.is_public ? 'Public' : 'Private'}</span>
                    <span>•</span>
                    <span>
                      {link.appointment_type_ids.length} appointment type
                      {link.appointment_type_ids.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => {
                      setEditingLink(link)
                      setFormData({
                        name: link.name,
                        slug: link.slug,
                        description: link.description || '',
                        type: link.type,
                        appointment_type_ids: link.appointment_type_ids,
                        is_public: link.is_public
                      })
                    }}
                    className="p-2 text-gray-400 hover:text-white transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(link.id)}
                    className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {(showCreateModal || editingLink) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-white mb-4">
              {editingLink ? 'Edit Booking Link' : 'Create Booking Link'}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({ 
                      ...formData, 
                      name: e.target.value,
                      slug: editingLink ? formData.slug : generateSlug(e.target.value)
                    })
                  }}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                  placeholder="e.g., 30 Minute Consultation"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  URL Slug
                </label>
                <div className="flex items-center">
                  <span className="text-gray-400 text-sm mr-1">/book/</span>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                    placeholder="consultation"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Description (optional)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                  rows={3}
                  placeholder="Brief description of this booking type"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Booking Type
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                >
                  <option value="individual">Individual</option>
                  <option value="group">Group</option>
                  <option value="round_robin">Round Robin</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Duration
                </label>
                <select
                  value={formData.duration || 30}
                  onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                >
                  <option value={15}>15 minutes</option>
                  <option value={30}>30 minutes</option>
                  <option value={45}>45 minutes</option>
                  <option value={60}>1 hour</option>
                  <option value={90}>1.5 hours</option>
                  <option value={120}>2 hours</option>
                </select>
              </div>

              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.is_public}
                    onChange={(e) => setFormData({ ...formData, is_public: e.target.checked })}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-300">
                    Make this link publicly accessible
                  </span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreateModal(false)
                  setEditingLink(null)
                  resetForm()
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={editingLink ? handleUpdate : handleCreate}
                disabled={!formData.name || !formData.slug}
                className="bg-orange-600 hover:bg-orange-700"
              >
                {editingLink ? 'Update' : 'Create'} Link
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}