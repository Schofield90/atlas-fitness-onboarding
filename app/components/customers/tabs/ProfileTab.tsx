'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Camera, Edit2, Save, X, Plus, Trash2, Phone, Mail, User } from 'lucide-react'
import { formatBritishDate } from '@/app/lib/utils/british-format'

interface ProfileTabProps {
  customer: any
  onUpdate: () => void
}

export default function ProfileTab({ customer, onUpdate }: ProfileTabProps) {
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState(customer)
  const [emergencyContacts, setEmergencyContacts] = useState<any[]>([])
  const [medicalInfo, setMedicalInfo] = useState<any>(null)
  const [preferences, setPreferences] = useState<any>(null)
  const [notes, setNotes] = useState<any[]>([])
  const [newNote, setNewNote] = useState('')
  const [photos, setPhotos] = useState<any[]>([])
  const supabase = createClientComponentClient()

  useEffect(() => {
    fetchProfileData()
  }, [customer.id])

  const fetchProfileData = async () => {
    try {
      // Fetch emergency contacts
      const { data: contactsData } = await supabase
        .from('customer_emergency_contacts')
        .select('*')
        .eq('customer_id', customer.id)
        .order('is_primary', { ascending: false })

      if (contactsData) setEmergencyContacts(contactsData)

      // Fetch medical info
      const { data: medicalData } = await supabase
        .from('customer_medical_info')
        .select('*')
        .eq('customer_id', customer.id)
        .single()

      if (medicalData) setMedicalInfo(medicalData)

      // Fetch preferences
      const { data: prefsData } = await supabase
        .from('customer_preferences')
        .select('*')
        .eq('customer_id', customer.id)
        .single()

      if (prefsData) setPreferences(prefsData)

      // Fetch notes
      const { data: notesData } = await supabase
        .from('customer_notes')
        .select('*, staff:auth.users(email)')
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false })

      if (notesData) setNotes(notesData)

      // Fetch photos
      const { data: photosData } = await supabase
        .from('customer_photos')
        .select('*')
        .eq('customer_id', customer.id)
        .order('is_primary', { ascending: false })

      if (photosData) setPhotos(photosData)
    } catch (error) {
      console.error('Error fetching profile data:', error)
    }
  }

  const handleSave = async () => {
    try {
      setLoading(true)

      // Update customer basic info
      const { error } = await supabase
        .from('leads')
        .update({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          date_of_birth: formData.date_of_birth,
          gender: formData.gender,
          address_line_1: formData.address_line_1,
          address_line_2: formData.address_line_2,
          city: formData.city,
          postal_code: formData.postal_code,
          country: formData.country,
          occupation: formData.occupation,
          company: formData.company,
          referral_source: formData.referral_source,
          referral_name: formData.referral_name,
        })
        .eq('id', customer.id)

      if (error) throw error

      // Log activity
      await supabase.rpc('log_customer_activity', {
        p_customer_id: customer.id,
        p_activity_type: 'profile_updated',
        p_activity_data: { updated_fields: Object.keys(formData) }
      })

      onUpdate()
      setEditing(false)
    } catch (error) {
      console.error('Error updating profile:', error)
      alert('Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      // For now, just create a placeholder entry
      // In production, you'd upload to Supabase Storage first
      const { error } = await supabase
        .from('customer_photos')
        .insert({
          customer_id: customer.id,
          organization_id: customer.organization_id,
          url: URL.createObjectURL(file), // Temporary URL for demo
          storage_path: `customers/${customer.id}/${file.name}`,
          is_primary: photos.length === 0
        })

      if (error) throw error
      fetchProfileData()
    } catch (error) {
      console.error('Error uploading photo:', error)
    }
  }

  const handleAddNote = async () => {
    if (!newNote.trim()) return

    try {
      const { error } = await supabase
        .from('customer_notes')
        .insert({
          customer_id: customer.id,
          organization_id: customer.organization_id,
          note: newNote,
          note_type: 'general'
        })

      if (error) throw error

      setNewNote('')
      fetchProfileData()
    } catch (error) {
      console.error('Error adding note:', error)
    }
  }

  const addEmergencyContact = async () => {
    try {
      const { error } = await supabase
        .from('customer_emergency_contacts')
        .insert({
          customer_id: customer.id,
          organization_id: customer.organization_id,
          name: 'New Contact',
          relationship: 'Other',
          phone: '',
          is_primary: emergencyContacts.length === 0
        })

      if (error) throw error
      fetchProfileData()
    } catch (error) {
      console.error('Error adding emergency contact:', error)
    }
  }

  return (
    <div className="space-y-6">
      {/* Profile Photo and Basic Info */}
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="flex items-start justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Personal Information</h2>
          {!editing ? (
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Edit2 className="h-4 w-4" />
              Edit Profile
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setEditing(false)}
                className="px-4 py-2 text-gray-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
              <button
                onClick={handleSave}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                Save Changes
              </button>
            </div>
          )}
        </div>

        <div className="flex gap-6">
          {/* Photo Section */}
          <div className="flex-shrink-0">
            <div className="relative">
              {photos.length > 0 ? (
                <img
                  src={photos[0].url}
                  alt={customer.name}
                  className="h-32 w-32 rounded-lg object-cover"
                />
              ) : (
                <div className="h-32 w-32 bg-gray-700 rounded-lg flex items-center justify-center">
                  <User className="h-16 w-16 text-gray-500" />
                </div>
              )}
              <label className="absolute bottom-2 right-2 p-2 bg-gray-900 rounded-full cursor-pointer hover:bg-gray-800">
                <Camera className="h-4 w-4 text-gray-400" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Basic Info Form */}
          <div className="flex-1 grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Full Name
              </label>
              {editing ? (
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                />
              ) : (
                <p className="text-white">{customer.name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Email
              </label>
              {editing ? (
                <input
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                />
              ) : (
                <p className="text-white">{customer.email || 'Not set'}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Phone
              </label>
              {editing ? (
                <input
                  type="tel"
                  value={formData.phone || ''}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                />
              ) : (
                <p className="text-white">{customer.phone || 'Not set'}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Date of Birth
              </label>
              {editing ? (
                <input
                  type="date"
                  value={formData.date_of_birth || ''}
                  onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                />
              ) : (
                <p className="text-white">
                  {customer.date_of_birth ? formatBritishDate(customer.date_of_birth) : 'Not set'}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Gender
              </label>
              {editing ? (
                <select
                  value={formData.gender || ''}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                >
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                  <option value="prefer_not_to_say">Prefer not to say</option>
                </select>
              ) : (
                <p className="text-white capitalize">{customer.gender || 'Not set'}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Occupation
              </label>
              {editing ? (
                <input
                  type="text"
                  value={formData.occupation || ''}
                  onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                />
              ) : (
                <p className="text-white">{customer.occupation || 'Not set'}</p>
              )}
            </div>
          </div>
        </div>

        {/* Address Section */}
        <div className="mt-6 pt-6 border-t border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Address</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Address Line 1
              </label>
              {editing ? (
                <input
                  type="text"
                  value={formData.address_line_1 || ''}
                  onChange={(e) => setFormData({ ...formData, address_line_1: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                />
              ) : (
                <p className="text-white">{customer.address_line_1 || 'Not set'}</p>
              )}
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Address Line 2
              </label>
              {editing ? (
                <input
                  type="text"
                  value={formData.address_line_2 || ''}
                  onChange={(e) => setFormData({ ...formData, address_line_2: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                />
              ) : (
                <p className="text-white">{customer.address_line_2 || ''}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                City
              </label>
              {editing ? (
                <input
                  type="text"
                  value={formData.city || ''}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                />
              ) : (
                <p className="text-white">{customer.city || 'Not set'}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Postal Code
              </label>
              {editing ? (
                <input
                  type="text"
                  value={formData.postal_code || ''}
                  onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                />
              ) : (
                <p className="text-white">{customer.postal_code || 'Not set'}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Emergency Contacts */}
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Emergency Contacts</h3>
          <button
            onClick={addEmergencyContact}
            className="flex items-center gap-2 px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Add Contact
          </button>
        </div>

        {emergencyContacts.length === 0 ? (
          <p className="text-gray-400">No emergency contacts added</p>
        ) : (
          <div className="space-y-3">
            {emergencyContacts.map((contact) => (
              <div key={contact.id} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                <div>
                  <p className="text-white font-medium">
                    {contact.name}
                    {contact.is_primary && (
                      <span className="ml-2 text-xs bg-blue-600 text-white px-2 py-0.5 rounded">
                        Primary
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-gray-400">{contact.relationship}</p>
                  <div className="flex items-center gap-4 mt-1">
                    <span className="flex items-center gap-1 text-sm text-gray-400">
                      <Phone className="h-3 w-3" />
                      {contact.phone}
                    </span>
                    {contact.email && (
                      <span className="flex items-center gap-1 text-sm text-gray-400">
                        <Mail className="h-3 w-3" />
                        {contact.email}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Notes */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Notes</h3>
        
        <div className="mb-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Add a note..."
              className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
            />
            <button
              onClick={handleAddNote}
              disabled={!newNote.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              Add Note
            </button>
          </div>
        </div>

        {notes.length === 0 ? (
          <p className="text-gray-400">No notes added</p>
        ) : (
          <div className="space-y-3">
            {notes.map((note) => (
              <div key={note.id} className="p-3 bg-gray-700 rounded-lg">
                <p className="text-white">{note.note}</p>
                <p className="text-xs text-gray-400 mt-2">
                  By {note.staff?.email || 'Unknown'} • {formatBritishDate(note.created_at)}
                  {note.note_type !== 'general' && (
                    <span className="ml-2 bg-gray-600 px-2 py-0.5 rounded">
                      {note.note_type}
                    </span>
                  )}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}