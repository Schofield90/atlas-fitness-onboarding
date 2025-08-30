'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/app/lib/supabase/client'
import Link from 'next/link'
import { ArrowLeft, Save, User, Mail, Phone, Calendar, MapPin } from 'lucide-react'

export default function NewCustomerPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    date_of_birth: '',
    gender: '',
    address_line_1: '',
    address_line_2: '',
    city: '',
    postal_code: '',
    country: 'UK',
    emergency_contact: '',
    emergency_phone: '',
    notes: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Get the current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Get user's organization
      let organizationId: string
      const { data: userOrg } = await supabase
        .from('user_organizations')
        .select('organization_id')
        .eq('user_id', user.id)
        .single()

      if (!userOrg?.organization_id) {
        // Use default Atlas Fitness organization as fallback
        const defaultOrgId = '63589490-8f55-4157-bd3a-e141594b748e'
        
        // Create user_organizations entry with default org
        const { error: orgError } = await supabase
          .from('user_organizations')
          .insert({
            user_id: user.id,
            organization_id: defaultOrgId,
            role: 'member'
          })
        
        // Ignore conflict errors (user might already have this org)
        if (orgError && !orgError.message.includes('duplicate')) {
          console.error('Error creating user organization:', orgError)
        }
        
        organizationId = defaultOrgId
      } else {
        organizationId = userOrg.organization_id
      }

      // Split name into first and last name
      const nameParts = formData.name.trim().split(' ')
      const firstName = nameParts[0] || formData.name
      const lastName = nameParts.slice(1).join(' ') || ''

      // Create the customer with both org_id and organization_id for compatibility
      const { data: customer, error: customerError } = await supabase
        .from('clients')
        .insert({
          name: formData.name,
          first_name: firstName,
          last_name: lastName,
          email: formData.email,
          phone: formData.phone,
          date_of_birth: formData.date_of_birth || null,
          gender: formData.gender || null,
          address_line_1: formData.address_line_1 || null,
          address_line_2: formData.address_line_2 || null,
          city: formData.city || null,
          postal_code: formData.postal_code || null,
          country: formData.country || 'UK',
          organization_id: organizationId,
          org_id: organizationId, // Include both for compatibility
          status: 'active',
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (customerError) {
        // If address columns don't exist, try without them
        if (customerError.message.includes('address_line_1') || 
            customerError.message.includes('column')) {
          const { data: customerFallback, error: fallbackError } = await supabase
            .from('clients')
            .insert({
              name: formData.name,
              email: formData.email,
              phone: formData.phone,
              organization_id: organizationId,
              org_id: organizationId, // Include both for compatibility
              metadata: {
                address: {
                  line_1: formData.address_line_1,
                  line_2: formData.address_line_2,
                  city: formData.city,
                  postal_code: formData.postal_code,
                  country: formData.country
                },
                date_of_birth: formData.date_of_birth,
                gender: formData.gender
              },
              created_at: new Date().toISOString()
            })
            .select()
            .single()
          
          if (fallbackError) throw fallbackError
          router.push(`/customers/${customerFallback.id}`)
          return
        }
        throw customerError
      }

      // Navigate to the customer's profile
      router.push(`/customers/${customer.id}`)
    } catch (err: any) {
      console.error('Error creating customer:', err)
      setError(err.message || 'Failed to create customer')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href="/customers"
            className="inline-flex items-center text-gray-400 hover:text-gray-200 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to customers
          </Link>
          
          <h1 className="text-3xl font-bold text-white">Add New Customer</h1>
          <p className="text-gray-400 mt-2">Create a new customer profile</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-500/30 rounded-lg text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-gray-800 rounded-xl shadow-sm border border-gray-700 p-6">
          <div className="space-y-6">
            {/* Basic Information */}
            <div>
              <h2 className="text-lg font-semibold text-white mb-4">Basic Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    <User className="inline h-4 w-4 mr-1" />
                    Full Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    <Mail className="inline h-4 w-4 mr-1" />
                    Email Address *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    <Phone className="inline h-4 w-4 mr-1" />
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    <Calendar className="inline h-4 w-4 mr-1" />
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    name="date_of_birth"
                    value={formData.date_of_birth}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Gender
                  </label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  >
                    <option value="">Select gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                    <option value="prefer_not_to_say">Prefer not to say</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Address */}
            <div>
              <h2 className="text-lg font-semibold text-white mb-4">Address</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    <MapPin className="inline h-4 w-4 mr-1" />
                    Address Line 1
                  </label>
                  <input
                    type="text"
                    name="address_line_1"
                    value={formData.address_line_1}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    placeholder="Street address"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Address Line 2 (Optional)
                  </label>
                  <input
                    type="text"
                    name="address_line_2"
                    value={formData.address_line_2}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    placeholder="Apartment, suite, etc."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Postal Code
                  </label>
                  <input
                    type="text"
                    name="postal_code"
                    value={formData.postal_code}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
              </div>
            </div>

            {/* Emergency Contact */}
            <div>
              <h2 className="text-lg font-semibold text-white mb-4">Emergency Contact</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Contact Name
                  </label>
                  <input
                    type="text"
                    name="emergency_contact"
                    value={formData.emergency_contact}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Contact Phone
                  </label>
                  <input
                    type="tel"
                    name="emergency_phone"
                    value={formData.emergency_phone}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Notes
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={4}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                placeholder="Any additional notes about this customer..."
              />
            </div>
          </div>

          {/* Actions */}
          <div className="mt-8 flex justify-end gap-4">
            <button
              type="button"
              onClick={() => router.push('/customers')}
              className="px-6 py-2 border border-gray-600 rounded-lg text-gray-300 hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {loading ? 'Creating...' : 'Create Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}