'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, Building, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { debounce } from 'lodash'

interface BusinessInfo {
  company_name: string
  company_number: string
  business_type: string
  address: {
    line1: string
    line2: string
    city: string
    postal_code: string
    country: string
  }
  contact: {
    first_name: string
    last_name: string
    email: string
    phone: string
  }
  website: string
  vat_number: string
}

interface BusinessVerificationProps {
  businessInfo: BusinessInfo
  onUpdate: (businessInfo: BusinessInfo) => void
}

interface CompanyData {
  company_name: string
  company_number: string
  company_status: string
  incorporation_date: string
  company_type: string
  registered_office_address: {
    address_line_1: string
    address_line_2?: string
    locality: string
    postal_code: string
    country: string
  }
  sic_codes: Array<{
    code: string
    description: string
  }>
}

export default function BusinessVerification({ businessInfo, onUpdate }: BusinessVerificationProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<CompanyData[]>([])
  const [selectedCompany, setSelectedCompany] = useState<CompanyData | null>(null)
  const [manualEntry, setManualEntry] = useState(false)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  // Initialize form data
  useEffect(() => {
    if (businessInfo.company_number) {
      setSearchTerm(businessInfo.company_number)
    }
  }, [])

  // Debounced company search
  const searchCompanies = useCallback(
    debounce(async (term: string) => {
      if (term.length < 3) {
        setSearchResults([])
        return
      }

      setSearching(true)
      try {
        const response = await fetch('/api/sms/setup/verify-business', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ searchTerm: term })
        })

        const data = await response.json()

        if (response.ok) {
          setSearchResults(data.companies || [])
        } else {
          console.error('Company search failed:', data.error)
          setSearchResults([])
        }
      } catch (error) {
        console.error('Error searching companies:', error)
        setSearchResults([])
      } finally {
        setSearching(false)
      }
    }, 500),
    []
  )

  useEffect(() => {
    if (searchTerm && !manualEntry) {
      searchCompanies(searchTerm)
    }
  }, [searchTerm, manualEntry, searchCompanies])

  const handleCompanySelect = (company: CompanyData) => {
    setSelectedCompany(company)
    setSearchResults([])
    
    // Auto-populate form with company data
    const updatedInfo: BusinessInfo = {
      ...businessInfo,
      company_name: company.company_name,
      company_number: company.company_number,
      business_type: getBusinessTypeFromSIC(company.sic_codes),
      address: {
        line1: company.registered_office_address.address_line_1,
        line2: company.registered_office_address.address_line_2 || '',
        city: company.registered_office_address.locality,
        postal_code: company.registered_office_address.postal_code,
        country: company.registered_office_address.country
      }
    }
    
    onUpdate(updatedInfo)
    setSearchTerm('')
  }

  const getBusinessTypeFromSIC = (sicCodes: Array<{ code: string; description: string }>) => {
    // Common SIC codes for fitness/gym businesses
    const fitnessCodes = ['93110', '93120', '93130', '93190']
    const hasFitnessCode = sicCodes.some(sic => fitnessCodes.includes(sic.code))
    
    if (hasFitnessCode) return 'gym'
    
    // Check for other relevant business types
    const serviceCodes = sicCodes.find(sic => sic.code.startsWith('96') || sic.code.startsWith('93'))
    if (serviceCodes) return 'service'
    
    return 'other'
  }

  const validateForm = () => {
    const errors: Record<string, string> = {}

    if (!businessInfo.company_name.trim()) {
      errors.company_name = 'Company name is required'
    }

    if (!businessInfo.company_number.trim()) {
      errors.company_number = 'Company number is required'
    } else if (!/^[A-Z0-9]{8}$/.test(businessInfo.company_number.toUpperCase())) {
      errors.company_number = 'Company number must be 8 characters (e.g., 12345678 or AB123456)'
    }

    if (!businessInfo.address.line1.trim()) {
      errors.address_line1 = 'Address line 1 is required'
    }

    if (!businessInfo.address.city.trim()) {
      errors.city = 'City is required'
    }

    if (!businessInfo.address.postal_code.trim()) {
      errors.postal_code = 'Postal code is required'
    } else if (!/^[A-Z]{1,2}[0-9][0-9A-Z]?\s?[0-9][A-Z]{2}$/i.test(businessInfo.address.postal_code)) {
      errors.postal_code = 'Please enter a valid UK postal code'
    }

    if (!businessInfo.contact.first_name.trim()) {
      errors.contact_first_name = 'First name is required'
    }

    if (!businessInfo.contact.last_name.trim()) {
      errors.contact_last_name = 'Last name is required'
    }

    if (!businessInfo.contact.email.trim()) {
      errors.contact_email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(businessInfo.contact.email)) {
      errors.contact_email = 'Please enter a valid email address'
    }

    if (!businessInfo.contact.phone.trim()) {
      errors.contact_phone = 'Phone number is required'
    } else if (!/^(\+44|0)[0-9]{10,11}$/.test(businessInfo.contact.phone.replace(/\s/g, ''))) {
      errors.contact_phone = 'Please enter a valid UK phone number'
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  useEffect(() => {
    validateForm()
  }, [businessInfo])

  const handleInputChange = (field: string, value: string) => {
    if (field.includes('.')) {
      // Nested field (e.g., 'address.line1' or 'contact.email')
      const [parent, child] = field.split('.')
      onUpdate({
        ...businessInfo,
        [parent]: {
          ...(businessInfo as any)[parent],
          [child]: value
        }
      })
    } else {
      onUpdate({
        ...businessInfo,
        [field]: value
      })
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-white mb-4">Business Verification</h3>
        <p className="text-gray-400 mb-6">
          We need to verify your business information to comply with UK SMS regulations. 
          Search for your company using Companies House data or enter details manually.
        </p>
      </div>

      {/* Company Search */}
      {!selectedCompany && !manualEntry && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Search for your company
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                {searching ? (
                  <Loader2 className="h-4 w-4 text-gray-400 animate-spin" />
                ) : (
                  <Search className="h-4 w-4 text-gray-400" />
                )}
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                placeholder="Enter company name or registration number..."
              />
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="mt-2 bg-gray-700 border border-gray-600 rounded-lg max-h-60 overflow-y-auto">
                {searchResults.map((company, index) => (
                  <button
                    key={index}
                    onClick={() => handleCompanySelect(company)}
                    className="w-full p-3 text-left hover:bg-gray-600 border-b border-gray-600 last:border-b-0 transition-colors"
                  >
                    <div className="flex items-start space-x-3">
                      <Building className="h-5 w-5 text-blue-400 mt-0.5" />
                      <div className="flex-1">
                        <div className="font-medium text-white">{company.company_name}</div>
                        <div className="text-sm text-gray-400">
                          {company.company_number} • {company.company_status}
                        </div>
                        <div className="text-xs text-gray-500">
                          {company.registered_office_address.address_line_1}, {company.registered_office_address.locality}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="text-center">
            <button
              onClick={() => setManualEntry(true)}
              className="text-blue-400 hover:text-blue-300 underline"
            >
              Can't find your company? Enter details manually
            </button>
          </div>
        </div>
      )}

      {/* Selected Company Display */}
      {selectedCompany && (
        <div className="bg-green-900/20 border border-green-700 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <CheckCircle className="h-5 w-5 text-green-400" />
            <span className="font-medium text-green-300">Company Verified</span>
          </div>
          <div className="text-sm text-green-200">
            <p className="font-medium">{selectedCompany.company_name}</p>
            <p>{selectedCompany.company_number} • {selectedCompany.company_status}</p>
          </div>
          <button
            onClick={() => {
              setSelectedCompany(null)
              setManualEntry(true)
            }}
            className="text-xs text-blue-400 hover:text-blue-300 underline mt-2"
          >
            Edit details manually
          </button>
        </div>
      )}

      {/* Business Information Form */}
      {(selectedCompany || manualEntry) && (
        <div className="space-y-6">
          {/* Company Details */}
          <div className="space-y-4">
            <h4 className="font-medium text-white">Company Information</h4>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Company Name *
                </label>
                <input
                  type="text"
                  value={businessInfo.company_name}
                  onChange={(e) => handleInputChange('company_name', e.target.value)}
                  className={`w-full px-3 py-2 bg-gray-700 border rounded-lg text-white ${
                    validationErrors.company_name ? 'border-red-500' : 'border-gray-600'
                  } focus:border-blue-500 focus:outline-none`}
                  placeholder="Your registered company name"
                />
                {validationErrors.company_name && (
                  <p className="text-red-400 text-xs mt-1">{validationErrors.company_name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Company Number *
                </label>
                <input
                  type="text"
                  value={businessInfo.company_number}
                  onChange={(e) => handleInputChange('company_number', e.target.value.toUpperCase())}
                  className={`w-full px-3 py-2 bg-gray-700 border rounded-lg text-white ${
                    validationErrors.company_number ? 'border-red-500' : 'border-gray-600'
                  } focus:border-blue-500 focus:outline-none`}
                  placeholder="12345678"
                  maxLength={8}
                />
                {validationErrors.company_number && (
                  <p className="text-red-400 text-xs mt-1">{validationErrors.company_number}</p>
                )}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Business Type
                </label>
                <select
                  value={businessInfo.business_type}
                  onChange={(e) => handleInputChange('business_type', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                >
                  <option value="gym">Gym/Fitness Center</option>
                  <option value="personal_training">Personal Training</option>
                  <option value="yoga_studio">Yoga/Pilates Studio</option>
                  <option value="sports_club">Sports Club</option>
                  <option value="wellness">Health & Wellness</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  VAT Number (Optional)
                </label>
                <input
                  type="text"
                  value={businessInfo.vat_number}
                  onChange={(e) => handleInputChange('vat_number', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                  placeholder="GB123456789"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Website (Optional)
              </label>
              <input
                type="url"
                value={businessInfo.website}
                onChange={(e) => handleInputChange('website', e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                placeholder="https://www.yourgyм.com"
              />
            </div>
          </div>

          {/* Address */}
          <div className="space-y-4">
            <h4 className="font-medium text-white">Registered Address</h4>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Address Line 1 *
              </label>
              <input
                type="text"
                value={businessInfo.address.line1}
                onChange={(e) => handleInputChange('address.line1', e.target.value)}
                className={`w-full px-3 py-2 bg-gray-700 border rounded-lg text-white ${
                  validationErrors.address_line1 ? 'border-red-500' : 'border-gray-600'
                } focus:border-blue-500 focus:outline-none`}
                placeholder="123 High Street"
              />
              {validationErrors.address_line1 && (
                <p className="text-red-400 text-xs mt-1">{validationErrors.address_line1}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Address Line 2
              </label>
              <input
                type="text"
                value={businessInfo.address.line2}
                onChange={(e) => handleInputChange('address.line2', e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                placeholder="Suite 100"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  City *
                </label>
                <input
                  type="text"
                  value={businessInfo.address.city}
                  onChange={(e) => handleInputChange('address.city', e.target.value)}
                  className={`w-full px-3 py-2 bg-gray-700 border rounded-lg text-white ${
                    validationErrors.city ? 'border-red-500' : 'border-gray-600'
                  } focus:border-blue-500 focus:outline-none`}
                  placeholder="London"
                />
                {validationErrors.city && (
                  <p className="text-red-400 text-xs mt-1">{validationErrors.city}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Postal Code *
                </label>
                <input
                  type="text"
                  value={businessInfo.address.postal_code}
                  onChange={(e) => handleInputChange('address.postal_code', e.target.value.toUpperCase())}
                  className={`w-full px-3 py-2 bg-gray-700 border rounded-lg text-white ${
                    validationErrors.postal_code ? 'border-red-500' : 'border-gray-600'
                  } focus:border-blue-500 focus:outline-none`}
                  placeholder="SW1A 1AA"
                />
                {validationErrors.postal_code && (
                  <p className="text-red-400 text-xs mt-1">{validationErrors.postal_code}</p>
                )}
              </div>
            </div>
          </div>

          {/* Contact Person */}
          <div className="space-y-4">
            <h4 className="font-medium text-white">Authorized Contact Person</h4>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  First Name *
                </label>
                <input
                  type="text"
                  value={businessInfo.contact.first_name}
                  onChange={(e) => handleInputChange('contact.first_name', e.target.value)}
                  className={`w-full px-3 py-2 bg-gray-700 border rounded-lg text-white ${
                    validationErrors.contact_first_name ? 'border-red-500' : 'border-gray-600'
                  } focus:border-blue-500 focus:outline-none`}
                  placeholder="John"
                />
                {validationErrors.contact_first_name && (
                  <p className="text-red-400 text-xs mt-1">{validationErrors.contact_first_name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Last Name *
                </label>
                <input
                  type="text"
                  value={businessInfo.contact.last_name}
                  onChange={(e) => handleInputChange('contact.last_name', e.target.value)}
                  className={`w-full px-3 py-2 bg-gray-700 border rounded-lg text-white ${
                    validationErrors.contact_last_name ? 'border-red-500' : 'border-gray-600'
                  } focus:border-blue-500 focus:outline-none`}
                  placeholder="Smith"
                />
                {validationErrors.contact_last_name && (
                  <p className="text-red-400 text-xs mt-1">{validationErrors.contact_last_name}</p>
                )}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={businessInfo.contact.email}
                  onChange={(e) => handleInputChange('contact.email', e.target.value)}
                  className={`w-full px-3 py-2 bg-gray-700 border rounded-lg text-white ${
                    validationErrors.contact_email ? 'border-red-500' : 'border-gray-600'
                  } focus:border-blue-500 focus:outline-none`}
                  placeholder="john@yourgym.com"
                />
                {validationErrors.contact_email && (
                  <p className="text-red-400 text-xs mt-1">{validationErrors.contact_email}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  value={businessInfo.contact.phone}
                  onChange={(e) => handleInputChange('contact.phone', e.target.value)}
                  className={`w-full px-3 py-2 bg-gray-700 border rounded-lg text-white ${
                    validationErrors.contact_phone ? 'border-red-500' : 'border-gray-600'
                  } focus:border-blue-500 focus:outline-none`}
                  placeholder="+44 20 1234 5678"
                />
                {validationErrors.contact_phone && (
                  <p className="text-red-400 text-xs mt-1">{validationErrors.contact_phone}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Help Text */}
      <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4">
        <div className="flex items-start space-x-2">
          <AlertCircle className="h-4 w-4 text-blue-400 mt-0.5" />
          <div className="text-sm text-blue-200">
            <p className="font-medium mb-1">Why do we need this information?</p>
            <p>UK regulations require businesses to be verified before sending commercial SMS messages. This helps prevent spam and ensures compliance with Ofcom guidelines.</p>
          </div>
        </div>
      </div>
    </div>
  )
}