'use client'

import { useState, useEffect } from 'react'
import { ChevronDown, Calendar, User, Plus, X } from 'lucide-react'

interface BirthdayTriggerConfigProps {
  config: any
  onChange: (config: any) => void
  organizationId: string
}

interface Contact {
  id: string
  name: string
  email: string
  birthday?: string
}

export default function BirthdayTriggerConfig({ config, onChange, organizationId }: BirthdayTriggerConfigProps) {
  const [triggerName, setTriggerName] = useState(config.name || 'Contact Birthday Trigger')
  const [contacts, setContacts] = useState<Contact[]>([])
  const [filters, setFilters] = useState(config.filters || {
    advanceNotice: 0, // Days before birthday to trigger
    contactGroup: 'all', // 'all', 'specific', or 'tagged'
    specificContacts: [],
    requiredTags: []
  })
  const [additionalFilters, setAdditionalFilters] = useState(config.additionalFilters || [])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (config.name) {
      setTriggerName(config.name)
    }
  }, [])

  useEffect(() => {
    loadContacts()
  }, [organizationId])

  const loadContacts = async () => {
    try {
      setLoading(true)
      
      // Load contacts with birthday information
      const contactsResponse = await fetch('/api/contacts?hasBirthday=true')
      if (contactsResponse.ok) {
        const contactsData = await contactsResponse.json()
        if (contactsData.contacts) {
          setContacts(contactsData.contacts.map((contact: any) => ({
            id: contact.id,
            name: contact.name || contact.email,
            email: contact.email,
            birthday: contact.birthday
          })))
        }
      } else {
        console.error('Failed to fetch contacts')
      }
    } catch (error) {
      console.error('Error loading contacts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (key: string, value: any) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    onChange({ ...config, filters: newFilters })
  }

  const addAdditionalFilter = () => {
    const newFilter = {
      id: Date.now().toString(),
      field: 'contact.age',
      operator: 'equals',
      value: ''
    }
    setAdditionalFilters([...additionalFilters, newFilter])
    onChange({ ...config, additionalFilters: [...additionalFilters, newFilter] })
  }

  const updateAdditionalFilter = (id: string, updates: any) => {
    const updated = additionalFilters.map((f: any) => f.id === id ? { ...f, ...updates } : f)
    setAdditionalFilters(updated)
    onChange({ ...config, additionalFilters: updated })
  }

  const removeAdditionalFilter = (id: string) => {
    const updated = additionalFilters.filter((f: any) => f.id !== id)
    setAdditionalFilters(updated)
    onChange({ ...config, additionalFilters: updated })
  }

  if (loading) {
    return <div className="p-4 text-center">Loading contacts...</div>
  }

  return (
    <div className="space-y-6">
      {/* Trigger Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2 uppercase tracking-wide">
          WORKFLOW TRIGGER NAME
        </label>
        <input
          type="text"
          value={triggerName}
          onChange={(e) => {
            setTriggerName(e.target.value)
            onChange({ ...config, name: e.target.value })
          }}
          placeholder="Enter trigger name"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Birthday Configuration */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 uppercase tracking-wide">
            BIRTHDAY TRIGGER SETTINGS
          </label>
          <p className="text-sm text-gray-500 mb-4">
            Configure when to trigger based on contact birthdays
          </p>
        </div>

        {/* Advance Notice */}
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Trigger timing
            </label>
            <div className="relative">
              <select
                value={filters.advanceNotice}
                onChange={(e) => handleFilterChange('advanceNotice', parseInt(e.target.value))}
                className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg appearance-none bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value={0}>On the birthday</option>
                <option value={1}>1 day before</option>
                <option value={3}>3 days before</option>
                <option value={7}>1 week before</option>
                <option value={30}>1 month before</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Contact Group Selection */}
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Which contacts
            </label>
            <div className="relative">
              <select
                value={filters.contactGroup}
                onChange={(e) => handleFilterChange('contactGroup', e.target.value)}
                className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg appearance-none bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All contacts with birthdays</option>
                <option value="tagged">Contacts with specific tags</option>
                <option value="specific">Specific contacts only</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Contact Statistics */}
        {contacts.length === 0 ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <Calendar className="w-12 h-12 text-yellow-600 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No Birthday Information Found
            </h3>
            <p className="text-gray-600 mb-4">
              None of your contacts have birthday information set. Add birthday data to contacts to use this trigger.
            </p>
            <a
              href="/contacts"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Manage Contacts
            </a>
          </div>
        ) : (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center">
              <User className="w-5 h-5 text-blue-600 mr-2" />
              <span className="text-blue-800 font-medium">
                {contacts.length} contacts have birthday information
              </span>
            </div>
          </div>
        )}

        {/* Tag Filtering (when contactGroup is 'tagged') */}
        {filters.contactGroup === 'tagged' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Required tags
            </label>
            <input
              type="text"
              placeholder="Enter tags separated by commas (e.g., vip, member)"
              value={filters.requiredTags.join(', ')}
              onChange={(e) => handleFilterChange('requiredTags', e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        )}

        {/* Additional Filters */}
        {additionalFilters.length > 0 && (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Additional Filters</label>
            {additionalFilters.map((filter: any) => (
              <div key={filter.id} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                <select
                  value={filter.field}
                  onChange={(e) => updateAdditionalFilter(filter.id, { field: e.target.value })}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="contact.age">Contact Age</option>
                  <option value="contact.location">Location</option>
                  <option value="contact.source">Source</option>
                </select>
                
                <select
                  value={filter.operator}
                  onChange={(e) => updateAdditionalFilter(filter.id, { operator: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="equals">equals</option>
                  <option value="not_equals">not equals</option>
                  <option value="contains">contains</option>
                  <option value="greater_than">greater than</option>
                  <option value="less_than">less than</option>
                </select>
                
                <input
                  type="text"
                  value={filter.value}
                  onChange={(e) => updateAdditionalFilter(filter.id, { value: e.target.value })}
                  placeholder="Value"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                
                <button
                  type="button"
                  onClick={() => removeAdditionalFilter(filter.id)}
                  className="text-red-600 hover:text-red-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add More Filters */}
        <button
          type="button"
          onClick={addAdditionalFilter}
          className="text-blue-600 hover:text-blue-700 font-medium flex items-center"
        >
          <Plus className="w-5 h-5 mr-1" />
          Add filters
        </button>
      </div>
    </div>
  )
}