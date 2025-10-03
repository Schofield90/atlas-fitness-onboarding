'use client'

import { useState } from 'react'
import { X, Search, Loader2, Phone, MapPin, DollarSign, Check } from 'lucide-react'
import { createClient } from '@/app/lib/supabase/client'

interface NumberSearchModalProps {
  isOpen: boolean
  onClose: () => void
  onNumberSelected: (phoneData: any) => void
}

interface AvailableNumber {
  phoneNumber: string
  friendlyName: string
  locality: string
  region: string
  postalCode: string
  country: string
  capabilities: {
    voice: boolean
    sms: boolean
    mms: boolean
  }
  price: number
}

export default function NumberSearchModal({ 
  isOpen, 
  onClose, 
  onNumberSelected 
}: NumberSearchModalProps) {
  const [searchType, setSearchType] = useState<'areaCode' | 'city'>('areaCode')
  const [searchValue, setSearchValue] = useState('')
  const [country, setCountry] = useState('GB')
  const [searching, setSearching] = useState(false)
  const [provisioning, setProvisioning] = useState(false)
  const [availableNumbers, setAvailableNumbers] = useState<AvailableNumber[]>([])
  const [selectedNumber, setSelectedNumber] = useState<AvailableNumber | null>(null)
  const [error, setError] = useState('')
  const supabase = createClient()

  const handleSearch = async () => {
    if (!searchValue.trim() && searchType === 'areaCode') {
      setError('Please enter an area code')
      return
    }

    setSearching(true)
    setError('')
    
    try {
      const response = await fetch('/api/phone/search-numbers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          country,
          areaCode: searchType === 'areaCode' ? searchValue : undefined,
          city: searchType === 'city' ? searchValue : undefined
        })
      })

      if (!response.ok) {
        throw new Error('Failed to search numbers')
      }

      const data = await response.json()
      
      if (data.numbers && data.numbers.length > 0) {
        setAvailableNumbers(data.numbers)
      } else {
        setError('No numbers available in this area. Try a different search.')
        setAvailableNumbers([])
      }
    } catch (error) {
      console.error('Error searching numbers:', error)
      setError('Failed to search for numbers. Please try again.')
    } finally {
      setSearching(false)
    }
  }

  const handleProvision = async () => {
    if (!selectedNumber) return

    setProvisioning(true)
    setError('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data: userOrg } = await supabase
        .from('user_organizations')
        .select('organization_id')
        .eq('user_id', user.id)
        .single()

      if (!userOrg) throw new Error('No organization found')

      const response = await fetch('/api/phone/provision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: userOrg.organization_id,
          phoneNumber: selectedNumber.phoneNumber,
          country
        })
      })

      if (!response.ok) {
        throw new Error('Failed to provision number')
      }

      const data = await response.json()
      
      // Save configuration to database
      await supabase.from('phone_configurations').insert({
        organization_id: userOrg.organization_id,
        phone_number: data.phoneNumber,
        phone_sid: data.sid,
        is_external_account: false,
        monthly_charge: selectedNumber.price,
        capabilities: ['voice', 'sms'],
        status: 'active'
      })

      onNumberSelected({
        phoneNumber: data.phoneNumber,
        sid: data.sid,
        price: selectedNumber.price,
        capabilities: ['voice', 'sms']
      })
    } catch (error) {
      console.error('Error provisioning number:', error)
      setError('Failed to provision number. Please try again.')
    } finally {
      setProvisioning(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div>
            <h2 className="text-xl font-semibold text-white">
              Find Your Perfect Phone Number
            </h2>
            <p className="text-sm text-gray-400 mt-1">
              Search for available numbers in your area
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg"
          >
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        {/* Search Section */}
        <div className="p-6 border-b border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Country Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Country
              </label>
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              >
                <option value="GB">United Kingdom</option>
                <option value="US">United States</option>
                <option value="CA">Canada</option>
                <option value="AU">Australia</option>
              </select>
            </div>

            {/* Search Type */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Search By
              </label>
              <select
                value={searchType}
                onChange={(e) => setSearchType(e.target.value as 'areaCode' | 'city')}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              >
                <option value="areaCode">Area Code</option>
                <option value="city">City</option>
              </select>
            </div>

            {/* Search Input */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                {searchType === 'areaCode' ? 'Area Code' : 'City Name'}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  placeholder={searchType === 'areaCode' ? '020, 0161, etc.' : 'London, Manchester, etc.'}
                  className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
                />
                <button
                  onClick={handleSearch}
                  disabled={searching}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
                >
                  {searching ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-900/20 border border-red-800 rounded-lg">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}
        </div>

        {/* Results Section */}
        <div className="p-6 overflow-y-auto max-h-[400px]">
          {availableNumbers.length === 0 && !searching ? (
            <div className="text-center py-12">
              <Phone className="h-12 w-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">
                Search for numbers to see available options
              </p>
            </div>
          ) : (
            <div className="grid gap-3">
              {availableNumbers.map((number) => (
                <button
                  key={number.phoneNumber}
                  onClick={() => setSelectedNumber(number)}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    selectedNumber?.phoneNumber === number.phoneNumber
                      ? 'bg-orange-900/20 border-orange-500'
                      : 'bg-gray-700 border-gray-600 hover:border-gray-500'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Phone className="h-5 w-5 text-orange-500" />
                        <span className="text-lg font-mono text-white">
                          {number.phoneNumber}
                        </span>
                        {selectedNumber?.phoneNumber === number.phoneNumber && (
                          <div className="p-1 bg-orange-600 rounded-full">
                            <Check className="h-3 w-3 text-white" />
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-400">
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          <span>{number.locality}, {number.region}</span>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          <span>£{number.price}/month</span>
                        </div>
                      </div>
                      
                      <div className="flex gap-2 mt-2">
                        {number.capabilities.voice && (
                          <span className="px-2 py-0.5 bg-gray-600 rounded text-xs text-gray-300">
                            Voice
                          </span>
                        )}
                        {number.capabilities.sms && (
                          <span className="px-2 py-0.5 bg-gray-600 rounded text-xs text-gray-300">
                            SMS
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              {selectedNumber && (
                <p className="text-sm text-gray-400">
                  Monthly charge: <span className="text-white font-semibold">
                    £{selectedNumber.price}
                  </span>
                </p>
              )}
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
              >
                Cancel
              </button>
              
              <button
                onClick={handleProvision}
                disabled={!selectedNumber || provisioning}
                className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {provisioning ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Provisioning...
                  </>
                ) : (
                  <>
                    Provision Number
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}