'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/app/lib/supabase/client'
import { ArrowLeft, Phone, Mail, Calendar, MapPin, User, AlertCircle } from 'lucide-react'
import CustomerProfileTabs from '@/app/components/customers/CustomerProfileTabs'
import { formatBritishDate } from '@/app/lib/utils/british-format'

interface Customer {
  id: string
  organization_id: string
  name: string
  email: string
  phone: string
  status: string
  created_at: string
  date_of_birth: string | null
  gender: string | null
  address_line_1: string | null
  address_line_2: string | null
  city: string | null
  postal_code: string | null
  country: string | null
  occupation: string | null
  company: string | null
  referral_source: string | null
  referral_name: string | null
  joined_date: string | null
  last_visit_date: string | null
  total_visits: number
  lifetime_value: number
  is_vip: boolean
  tags: string[]
}

export default function CustomerDetailPage() {
  const params = useParams()
  const router = useRouter()
  const customerId = params.id as string
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    fetchCustomer()
  }, [customerId])

  const fetchCustomer = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('id', customerId)
        .single()

      if (error) throw error
      setCustomer(data)
    } catch (error) {
      console.error('Error fetching customer:', error)
      setError('Failed to load customer details')
    } finally {
      setLoading(false)
    }
  }

  const calculateAge = (dob: string | null): string => {
    if (!dob) return 'Not set'
    const birthDate = new Date(dob)
    const today = new Date()
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    return `${age} years old`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-400">Loading customer details...</p>
        </div>
      </div>
    )
  }

  if (error || !customer) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-400">{error || 'Customer not found'}</p>
          <button
            onClick={() => router.push('/leads')}
            className="mt-4 text-blue-500 hover:text-blue-400"
          >
            Back to customers
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/leads')}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-gray-400" />
              </button>
              
              {/* Customer Photo */}
              <div className="h-16 w-16 bg-gray-700 rounded-full flex items-center justify-center">
                <User className="h-8 w-8 text-gray-400" />
              </div>
              
              {/* Customer Info */}
              <div>
                <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                  {customer.name}
                  {customer.is_vip && (
                    <span className="text-xs bg-yellow-500 text-black px-2 py-1 rounded-full">
                      VIP
                    </span>
                  )}
                </h1>
                <div className="flex items-center gap-4 text-sm text-gray-400 mt-1">
                  {customer.email && (
                    <div className="flex items-center gap-1">
                      <Mail className="h-4 w-4" />
                      {customer.email}
                    </div>
                  )}
                  {customer.phone && (
                    <div className="flex items-center gap-1">
                      <Phone className="h-4 w-4" />
                      {customer.phone}
                    </div>
                  )}
                  {customer.date_of_birth && (
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {calculateAge(customer.date_of_birth)}
                    </div>
                  )}
                  {customer.city && (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {customer.city}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{customer.total_visits || 0}</div>
                <div className="text-xs text-gray-400">Total Visits</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white">
                  £{((customer.lifetime_value || 0) / 100).toFixed(2)}
                </div>
                <div className="text-xs text-gray-400">Lifetime Value</div>
              </div>
              <div className="text-center">
                <div className="text-sm font-medium text-white">
                  {customer.last_visit_date ? formatBritishDate(customer.last_visit_date) : 'Never'}
                </div>
                <div className="text-xs text-gray-400">Last Visit</div>
              </div>
            </div>
          </div>

          {/* Tags */}
          {customer.tags && customer.tags.length > 0 && (
            <div className="flex items-center gap-2 mt-3">
              {customer.tags.map((tag, index) => (
                <span
                  key={index}
                  className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="px-6 py-6">
        <CustomerProfileTabs customer={customer} onUpdate={fetchCustomer} />
      </div>
    </div>
  )
}