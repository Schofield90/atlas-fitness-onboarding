'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/app/components/DashboardLayout'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

const schema = z.object({
  name: z.string().min(1, 'Full name is required'),
  email: z.string().email('Enter a valid email').optional().or(z.literal('').transform(() => undefined)),
  phone: z.string().optional(),
}).superRefine((data, ctx) => {
  const hasEmail = typeof data.email === 'string' && data.email.trim().length > 0
  const hasPhone = typeof data.phone === 'string' && data.phone.trim().length > 0
  if (!hasEmail && !hasPhone) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['email'], message: 'Provide email or phone' })
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['phone'], message: 'Provide email or phone' })
  }
  if (hasPhone) {
    const digits = (data.phone || '').replace(/[^0-9]/g, '')
    if (digits.length < 7) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['phone'], message: 'Phone looks invalid' })
    }
  }
})

type FormValues = z.infer<typeof schema>

export default function NewContactPage() {
  const router = useRouter()
  const [submitError, setSubmitError] = useState('')
  const { register, handleSubmit, formState: { errors, isSubmitting }, setError, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '', phone: '' }
  })

  const onSubmit = async (values: FormValues) => {
    setSubmitError('')
    try {
      const payload = {
        name: values.name,
        email: values.email,
        phone: values.phone,
        membership_type: 'Standard',
        membership_status: 'active',
        start_date: new Date().toISOString(),
        total_revenue: 0,
        engagement_score: 50,
      }
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        const message = data?.error || 'Failed to create contact'
        if (/email/i.test(message)) {
          setError('email', { type: 'manual', message })
        } else if (/phone/i.test(message)) {
          setError('phone', { type: 'manual', message })
        }
        throw new Error(message)
      }
      reset()
      router.push('/contacts')
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to create contact')
    }
  }

  return (
    <DashboardLayout>
      <div className="p-6 max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-2">Add Contact</h1>
        <p className="text-gray-400 mb-6">Create a new contact with a valid name and either email or phone.</p>

        {submitError && (
          <div className="bg-red-900/50 border border-red-600 rounded-lg p-3 mb-4">
            <p className="text-sm text-red-200">{submitError}</p>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Full Name *</label>
            <input
              type="text"
              {...register('name')}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-orange-500"
              placeholder="Jane Doe"
            />
            {errors.name && <p className="text-sm text-red-400 mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
            <input
              type="email"
              {...register('email')}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-orange-500"
              placeholder="jane@example.com"
            />
            {errors.email && <p className="text-sm text-red-400 mt-1">{errors.email.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Phone</label>
            <input
              type="tel"
              {...register('phone')}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-orange-500"
              placeholder="+1 (555) 123-4567"
            />
            {errors.phone && <p className="text-sm text-red-400 mt-1">{errors.phone.message}</p>}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => router.push('/contacts')}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Create Contact'}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  )
}

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/app/components/DashboardLayout'
import { ArrowLeft, Save, User, Mail, Phone, Building, Tag, Calendar, MapPin, Globe, MessageSquare } from 'lucide-react'
import { createClient } from '@/app/lib/supabase/client'

export default function NewContactPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    company: '',
    position: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    country: '',
    website: '',
    source: 'manual',
    status: 'active',
    tags: [] as string[],
    notes: '',
    birthday: '',
    social_media: {
      facebook: '',
      instagram: '',
      linkedin: '',
      twitter: ''
    }
  })
  const [tagInput, setTagInput] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const supabase = createClient()
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        alert('You must be logged in to create a contact')
        return
      }

      // Get organization ID - try multiple approaches
      let organizationId = null
      
      // First try user_organizations table
      const { data: orgData } = await supabase
        .from('user_organizations')
        .select('organization_id')
        .eq('user_id', user.id)
        .single()
      
      if (orgData?.organization_id) {
        organizationId = orgData.organization_id
      } else {
        // Try organization_members as fallback
        const { data: memberData } = await supabase
          .from('organization_members')
          .select('organization_id')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .single()
        
        if (memberData?.organization_id) {
          organizationId = memberData.organization_id
        } else {
          // Use default Atlas Fitness organization and create association
          organizationId = '63589490-8f55-4157-bd3a-e141594b748e'
          
          // Try to create the association
          await supabase
            .from('user_organizations')
            .upsert({
              user_id: user.id,
              organization_id: organizationId,
              role: 'owner'
            }, {
              onConflict: 'user_id'
            })
        }
      }

      if (!organizationId) {
        alert('Could not find organization')
        return
      }

      // Create contact - build the insert object conditionally
      const contactData: any = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        phone: formData.phone,
        tags: formData.tags,
        metadata: {
          company: formData.company,
          position: formData.position,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          zip: formData.zip,
          country: formData.country,
          website: formData.website,
          source: formData.source,
          status: formData.status,
          notes: formData.notes,
          birthday: formData.birthday,
          social_media: formData.social_media
        },
        sms_opt_in: true,
        whatsapp_opt_in: true,
        email_opt_in: true,
        created_at: new Date().toISOString()
      }
      
      // Try to add organization_id if the column exists
      // First attempt with organization_id
      let { data, error } = await supabase
        .from('contacts')
        .insert({
          ...contactData,
          organization_id: organizationId
        })
        .select()
        .single()
      
      // If organization_id column doesn't exist, try without it
      if (error?.message?.includes('column') || error?.message?.includes('organization_id')) {
        console.log('Contacts table missing organization_id, inserting without it')
        const result = await supabase
          .from('contacts')
          .insert(contactData)
          .select()
          .single()
        
        data = result.data
        error = result.error
      }

      if (error) {
        console.error('Error creating contact:', error)
        const errorMessage = error?.message || error?.details || JSON.stringify(error) || 'Unknown error'
        alert(`Failed to create contact: ${errorMessage}`)
        return
      }

      // Also create a lead record for compatibility
      const leadName = `${formData.first_name} ${formData.last_name}`.trim() || formData.email || 'Unknown'
      const { error: leadError } = await supabase
        .from('leads')
        .insert({
          organization_id: organizationId,
          name: leadName,
          email: formData.email,
          phone: formData.phone,
          source: formData.source,
          status: 'new',
          notes: formData.notes,
          metadata: {
            company: formData.company,
            position: formData.position,
            tags: formData.tags
          }
        })
      
      if (leadError) {
        console.error('Error creating lead record:', leadError)
        // Don't fail the contact creation if lead creation fails
      }

      alert('Contact created successfully!')
      router.push('/contacts')
    } catch (error: any) {
      console.error('Error:', error)
      const errorMessage = error?.message || error?.toString() || 'Unknown error'
      alert(`Failed to create contact: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, tagInput.trim()]
      })
      setTagInput('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter(tag => tag !== tagToRemove)
    })
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-900 p-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/contacts')}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-400" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-white">New Contact</h1>
                <p className="text-gray-400 text-sm mt-1">Add a new contact to your CRM</p>
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <User className="w-5 h-5 text-orange-500" />
                <h2 className="text-lg font-semibold text-white">Basic Information</h2>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    First Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.first_name}
                    onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={formData.last_name}
                    onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <Mail className="w-5 h-5 text-orange-500" />
                <h2 className="text-lg font-semibold text-white">Contact Information</h2>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Company
                  </label>
                  <input
                    type="text"
                    value={formData.company}
                    onChange={(e) => setFormData({...formData, company: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Position
                  </label>
                  <input
                    type="text"
                    value={formData.position}
                    onChange={(e) => setFormData({...formData, position: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="w-5 h-5 text-orange-500" />
                <h2 className="text-lg font-semibold text-white">Address</h2>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Street Address
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      City
                    </label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData({...formData, city: e.target.value})}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      State/Province
                    </label>
                    <input
                      type="text"
                      value={formData.state}
                      onChange={(e) => setFormData({...formData, state: e.target.value})}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      ZIP/Postal Code
                    </label>
                    <input
                      type="text"
                      value={formData.zip}
                      onChange={(e) => setFormData({...formData, zip: e.target.value})}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Country
                  </label>
                  <input
                    type="text"
                    value={formData.country}
                    onChange={(e) => setFormData({...formData, country: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
              </div>
            </div>

            {/* Additional Information */}
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <Globe className="w-5 h-5 text-orange-500" />
                <h2 className="text-lg font-semibold text-white">Additional Information</h2>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Website
                    </label>
                    <input
                      type="url"
                      value={formData.website}
                      onChange={(e) => setFormData({...formData, website: e.target.value})}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      placeholder="https://"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Birthday
                    </label>
                    <input
                      type="date"
                      value={formData.birthday}
                      onChange={(e) => setFormData({...formData, birthday: e.target.value})}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Source
                  </label>
                  <select
                    value={formData.source}
                    onChange={(e) => setFormData({...formData, source: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  >
                    <option value="manual">Manual Entry</option>
                    <option value="website">Website</option>
                    <option value="facebook">Facebook</option>
                    <option value="instagram">Instagram</option>
                    <option value="referral">Referral</option>
                    <option value="walk-in">Walk-in</option>
                    <option value="phone">Phone Call</option>
                    <option value="email">Email</option>
                    <option value="event">Event</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Tags
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                      className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      placeholder="Add a tag..."
                    />
                    <button
                      type="button"
                      onClick={handleAddTag}
                      className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-3 py-1 bg-gray-700 text-white rounded-full text-sm flex items-center gap-1"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="text-gray-400 hover:text-white"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    rows={4}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    placeholder="Add any additional notes about this contact..."
                  />
                </div>
              </div>
            </div>

            {/* Social Media */}
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <MessageSquare className="w-5 h-5 text-orange-500" />
                <h2 className="text-lg font-semibold text-white">Social Media</h2>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Facebook
                  </label>
                  <input
                    type="text"
                    value={formData.social_media.facebook}
                    onChange={(e) => setFormData({
                      ...formData,
                      social_media: {...formData.social_media, facebook: e.target.value}
                    })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    placeholder="facebook.com/username"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Instagram
                  </label>
                  <input
                    type="text"
                    value={formData.social_media.instagram}
                    onChange={(e) => setFormData({
                      ...formData,
                      social_media: {...formData.social_media, instagram: e.target.value}
                    })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    placeholder="@username"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    LinkedIn
                  </label>
                  <input
                    type="text"
                    value={formData.social_media.linkedin}
                    onChange={(e) => setFormData({
                      ...formData,
                      social_media: {...formData.social_media, linkedin: e.target.value}
                    })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    placeholder="linkedin.com/in/username"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Twitter
                  </label>
                  <input
                    type="text"
                    value={formData.social_media.twitter}
                    onChange={(e) => setFormData({
                      ...formData,
                      social_media: {...formData.social_media, twitter: e.target.value}
                    })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    placeholder="@username"
                  />
                </div>
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="flex justify-end gap-4">
              <button
                type="button"
                onClick={() => router.push('/contacts')}
                className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !formData.first_name}
                className="px-6 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {loading ? 'Creating...' : 'Create Contact'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  )
}