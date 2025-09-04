'use client'

import { useState, useEffect, Suspense } from 'react'
import { createClient } from '@/app/lib/supabase/client'
import DashboardLayout from '@/app/components/DashboardLayout'
import { Plus, Search, Download, Filter, UserPlus, Mail, Phone, MessageSquare, Upload, Tags, ArrowUpDown, ChevronUp, ChevronDown } from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useToast } from '@/app/lib/hooks/useToast'

interface Contact {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  lead_id?: string
  client_id?: string
  sms_opt_in: boolean
  whatsapp_opt_in: boolean
  email_opt_in: boolean
  tags?: string[]
  metadata?: any
  created_at: string
  updated_at: string
  lead?: {
    id: string
    name: string
    source: string
    status: string
    score?: number
  }
}

function ContactsContent() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [sourceFilter, setSourceFilter] = useState<string>('all')
  const [tagFilter, setTagFilter] = useState<string>('')
  const [optInFilter, setOptInFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(25)
  const [showImportModal, setShowImportModal] = useState(false)
  const [sortKey, setSortKey] = useState<'name' | 'created'>('created')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const toast = useToast()

  useEffect(() => {
    fetchContacts()
    // Initialize pagination from URL params
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '25')
    setCurrentPage(page)
    setItemsPerPage(pageSize)
  }, [])

  useEffect(() => {
    filterContacts()
  }, [contacts, searchTerm, sourceFilter, tagFilter, optInFilter, sortKey, sortOrder])

  // Update URL when pagination changes
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', currentPage.toString())
    params.set('pageSize', itemsPerPage.toString())
    router.replace(`?${params.toString()}`, { scroll: false })
  }, [currentPage, itemsPerPage, router, searchParams])

  const fetchContacts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      console.log('Fetching contacts for user:', user?.id)
      if (!user) {
        console.error('No user authenticated')
        return
      }

      // Get user's organization
      const { data: orgData, error: orgError } = await supabase
        .from('user_organizations')
        .select('organization_id')
        .eq('user_id', user.id)
        .single()

      console.log('Organization data:', orgData, 'Error:', orgError)

      if (!orgData) {
        console.error('No organization found for user, trying fallback')
        // Try organization_members table as fallback
        const { data: memberData } = await supabase
          .from('organization_members')
          .select('organization_id')
          .eq('user_id', user.id)
          .single()
        
        if (!memberData) {
          console.error('No organization found in either table')
          // Use default organization
          const defaultOrgId = '63589490-8f55-4157-bd3a-e141594b748e'
          console.log('Using default organization:', defaultOrgId)
          
          // Create a fake orgData object
          const fakeOrgData = { organization_id: defaultOrgId }
          
          // Continue with default org
          await fetchContactsWithOrg(fakeOrgData)
          return
        }
        
        await fetchContactsWithOrg(memberData)
        return
      }
      
      await fetchContactsWithOrg(orgData)
    } catch (error) {
      console.error('Error in fetchContacts:', error)
      toast.showToast('Failed to load contacts', 'error')
    } finally {
      setLoading(false)
    }
  }
  
  const fetchContactsWithOrg = async (orgData: { organization_id: string }) => {
    console.log('Fetching contacts for organization:', orgData.organization_id)

    // Fetch all contacts with their related lead information
    // First try with organization_id filter
    let { data: contactsData, error: contactsError } = await supabase
      .from('contacts')
      .select(`
        *,
        lead:leads (
          id,
          name,
          source,
          status,
          score
        )
      `)
      .eq('organization_id', orgData.organization_id)
      .order('created_at', { ascending: false })
    
    console.log('Contacts query result:', { contactsData, contactsError })
    
    // If we get a column error, try without organization_id filter
    if (contactsError?.message?.includes('column') || contactsError?.message?.includes('organization_id')) {
      console.log('Contacts table missing organization_id column, fetching all contacts')
      const result = await supabase
        .from('contacts')
        .select(`
          *,
          lead:leads (
            id,
            name,
            source,
            status,
            score
          )
        `)
        .order('created_at', { ascending: false })
      
      contactsData = result.data
      contactsError = result.error
      console.log('Fallback contacts query result:', { contactsData, contactsError })
    }

    if (contactsError) {
      console.error('Error fetching contacts:', contactsError)
    }

    // Also fetch leads that might not have a contact record yet
    let { data: leadsData, error: leadsError } = await supabase
      .from('leads')
      .select('*')
      .eq('organization_id', orgData.organization_id)
      .order('created_at', { ascending: false })

    // If leads query fails due to missing organization_id, try without filter
    if (leadsError?.message?.includes('column') || leadsError?.message?.includes('organization_id')) {
      console.log('Leads table missing organization_id column, fetching all leads')
      const result = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false })
      
      leadsData = result.data
      leadsError = result.error
    }

    console.log('Leads query result:', { leadsData, leadsError })

    if (leadsError) {
      console.error('Error fetching leads:', leadsError)
    }

    // Create a map to avoid duplicates
    const contactsMap = new Map()
    console.log('Processing contacts and leads...')
    
    // Add all contacts first
    if (contactsData) {
      console.log(`Adding ${contactsData.length} direct contacts`)
      contactsData.forEach(contact => {
        contactsMap.set(contact.id, contact)
      })
    } else {
      console.log('No direct contacts found')
    }

    // Process leads and create contact records for those without one
    if (leadsData) {
      console.log(`Processing ${leadsData.length} leads`)
      for (const lead of leadsData) {
        // Check if this lead already has a contact record
        const hasContact = contactsData?.some(c => c.lead_id === lead.id)
        
        if (!hasContact) {
          console.log(`Creating contact from lead: ${lead.name || lead.email}`)
          // Create a contact-like object from the lead
          const contactFromLead: Contact = {
            id: `lead-${lead.id}`, // Temporary ID to distinguish from real contacts
            first_name: lead.name?.split(' ')[0] || '',
            last_name: lead.name?.split(' ').slice(1).join(' ') || '',
            email: lead.email || '',
            phone: lead.phone || '',
            lead_id: lead.id,
            client_id: undefined,
            sms_opt_in: true,
            whatsapp_opt_in: true,
            email_opt_in: true,
            tags: lead.metadata?.tags || [],
            metadata: lead.metadata,
            created_at: lead.created_at,
            updated_at: lead.updated_at,
            lead: {
              id: lead.id,
              name: lead.name || '',
              source: lead.source || 'unknown',
              status: lead.status || 'new',
              score: lead.score
            }
          }
          
          // Add Facebook-specific tags
          if (lead.source === 'facebook' || lead.metadata?.facebook_lead_id) {
            if (!contactFromLead.tags) contactFromLead.tags = []
            if (!contactFromLead.tags.includes('facebook-lead')) {
              contactFromLead.tags.push('facebook-lead')
            }
            if (lead.metadata?.page_name && !contactFromLead.tags.includes(lead.metadata.page_name)) {
              contactFromLead.tags.push(lead.metadata.page_name)
            }
            if (lead.metadata?.form_name && !contactFromLead.tags.includes(lead.metadata.form_name)) {
              contactFromLead.tags.push(lead.metadata.form_name)
            }
          }
          
          contactsMap.set(contactFromLead.id, contactFromLead)
        } else {
          console.log(`Skipping lead ${lead.name || lead.email} - already has contact record`)
        }
      }
    } else {
      console.log('No leads found')
    }

    // Convert map to array
    let allContacts = Array.from(contactsMap.values())
    
    // Remove duplicates based on email, keeping the most recent
    const uniqueContacts = allContacts.reduce((acc: Contact[], contact) => {
      if (!contact.email) {
        // If no email, keep the contact (can't deduplicate without email)
        acc.push(contact)
        return acc
      }
      
      const existingIndex = acc.findIndex(c => 
        c.email && c.email.toLowerCase() === contact.email.toLowerCase()
      )
      
      if (existingIndex === -1) {
        // No duplicate found, add the contact
        acc.push(contact)
      } else {
        // Duplicate found, keep the most recent one
        const existing = acc[existingIndex]
        const existingDate = new Date(existing.updated_at || existing.created_at)
        const currentDate = new Date(contact.updated_at || contact.created_at)
        
        if (currentDate > existingDate) {
          // Current contact is more recent, replace the existing one
          acc[existingIndex] = contact
        }
      }
      
      return acc
    }, [])
    
    // Sort by created date (most recent first)
    uniqueContacts.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )

    console.log(`Final contact count: ${uniqueContacts.length} (deduplicated from ${allContacts.length})`)
    console.log('Sample contacts:', uniqueContacts.slice(0, 3))
    
    setContacts(uniqueContacts)
  }

  const filterContacts = () => {
    let filtered = [...contacts]

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(contact => {
        const fullName = `${contact.first_name || ''} ${contact.last_name || ''}`.toLowerCase()
        const email = (contact.email || '').toLowerCase()
        const phone = (contact.phone || '').toLowerCase()
        const search = searchTerm.toLowerCase()
        
        return fullName.includes(search) || email.includes(search) || phone.includes(search)
      })
    }

    // Source filter
    if (sourceFilter !== 'all') {
      filtered = filtered.filter(contact => {
        if (sourceFilter === 'facebook') {
          return contact.tags?.includes('facebook-lead') || contact.lead?.source === 'facebook'
        }
        if (sourceFilter === 'website') {
          return contact.lead?.source === 'website' || contact.lead?.source === 'form'
        }
        if (sourceFilter === 'manual') {
          return contact.lead?.source === 'manual' || (!contact.lead?.source && !contact.tags?.includes('facebook-lead'))
        }
        return true
      })
    }

    // Tag filter
    if (tagFilter) {
      filtered = filtered.filter(contact => 
        contact.tags?.some(tag => tag.toLowerCase().includes(tagFilter.toLowerCase()))
      )
    }

    // Opt-in filter
    if (optInFilter !== 'all') {
      if (optInFilter === 'sms') {
        filtered = filtered.filter(contact => contact.sms_opt_in)
      } else if (optInFilter === 'whatsapp') {
        filtered = filtered.filter(contact => contact.whatsapp_opt_in)
      } else if (optInFilter === 'email') {
        filtered = filtered.filter(contact => contact.email_opt_in)
      }
    }

    // Sorting
    if (sortKey === 'name') {
      filtered.sort((a, b) => {
        const nameA = `${a.first_name || ''} ${a.last_name || ''}`.trim().toLowerCase()
        const nameB = `${b.first_name || ''} ${b.last_name || ''}`.trim().toLowerCase()
        if (nameA < nameB) return sortOrder === 'asc' ? -1 : 1
        if (nameA > nameB) return sortOrder === 'asc' ? 1 : -1
        return 0
      })
    } else if (sortKey === 'created') {
      filtered.sort((a, b) => {
        const diff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        return sortOrder === 'asc' ? diff : -diff
      })
    }

    setFilteredContacts(filtered)
    
    // Reset to first page when filtering changes
    if (currentPage > 1 && (searchTerm || sourceFilter !== 'all' || tagFilter || optInFilter !== 'all')) {
      setCurrentPage(1)
    }
  }

  const handleSort = (key: 'name' | 'created') => {
    if (sortKey === key) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortOrder(key === 'name' ? 'asc' : 'desc')
    }
  }

  const handleExport = () => {
    const csv = [
      ['First Name', 'Last Name', 'Email', 'Phone', 'Source', 'Tags', 'SMS Opt-in', 'WhatsApp Opt-in', 'Email Opt-in', 'Created'],
      ...filteredContacts.map(contact => [
        contact.first_name || '',
        contact.last_name || '',
        contact.email || '',
        contact.phone || '',
        contact.lead?.source || 'Direct',
        (contact.tags || []).join(', '),
        contact.sms_opt_in ? 'Yes' : 'No',
        contact.whatsapp_opt_in ? 'Yes' : 'No',
        contact.email_opt_in ? 'Yes' : 'No',
        new Date(contact.created_at).toLocaleDateString('en-GB')
      ])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `contacts_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  const handleBulkMessage = (type: 'sms' | 'whatsapp' | 'email') => {
    // Navigate to campaigns with pre-selected contacts
    const selectedIds = filteredContacts.map(c => c.id)
    router.push(`/campaigns/new?type=${type}&contacts=${selectedIds.join(',')}`)
  }

  const paginatedContacts = filteredContacts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const totalPages = Math.ceil(filteredContacts.length / itemsPerPage)

  return (
    <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white">All Contacts</h1>
            <p className="text-gray-400 mt-1">Manage all your leads and contacts from every source</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowImportModal(true)}
              className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              Import
            </button>
            <button
              onClick={handleExport}
              className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
            <Link
              href="/contacts/new"
              className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              Add Contact
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Contacts</p>
                <p className="text-2xl font-bold text-white">{contacts.length}</p>
              </div>
              <div className="bg-blue-500/20 p-3 rounded-lg">
                <UserPlus className="w-6 h-6 text-blue-400" />
              </div>
            </div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">SMS Enabled</p>
                <p className="text-2xl font-bold text-white">
                  {contacts.filter(c => c.sms_opt_in).length}
                </p>
              </div>
              <div className="bg-green-500/20 p-3 rounded-lg">
                <Phone className="w-6 h-6 text-green-400" />
              </div>
            </div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">WhatsApp Enabled</p>
                <p className="text-2xl font-bold text-white">
                  {contacts.filter(c => c.whatsapp_opt_in).length}
                </p>
              </div>
              <div className="bg-green-500/20 p-3 rounded-lg">
                <MessageSquare className="w-6 h-6 text-green-400" />
              </div>
            </div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Email Enabled</p>
                <p className="text-2xl font-bold text-white">
                  {contacts.filter(c => c.email_opt_in).length}
                </p>
              </div>
              <div className="bg-purple-500/20 p-3 rounded-lg">
                <Mail className="w-6 h-6 text-purple-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search contacts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="px-4 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="all">All Sources</option>
              <option value="facebook">Facebook</option>
              <option value="website">Website</option>
              <option value="manual">Manual</option>
            </select>

            <select
              value={optInFilter}
              onChange={(e) => setOptInFilter(e.target.value)}
              className="px-4 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="all">All Opt-ins</option>
              <option value="sms">SMS Opted-in</option>
              <option value="whatsapp">WhatsApp Opted-in</option>
              <option value="email">Email Opted-in</option>
            </select>

            <input
              type="text"
              placeholder="Filter by tag..."
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value)}
              className="px-4 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            />

            <div className="flex gap-2">
              <button
                onClick={() => handleBulkMessage('sms')}
                className="px-3 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
                title="Send SMS to filtered contacts"
              >
                <Phone className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleBulkMessage('whatsapp')}
                className="px-3 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
                title="Send WhatsApp to filtered contacts"
              >
                <MessageSquare className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleBulkMessage('email')}
                className="px-3 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
                title="Send Email to filtered contacts"
              >
                <Mail className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Contacts Table */}
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider select-none">
                    <button
                      type="button"
                      onClick={() => handleSort('name')}
                      className="inline-flex items-center gap-1 text-gray-300 hover:text-white"
                    >
                      Contact
                      {sortKey === 'name' ? (
                        sortOrder === 'asc' ? (
                          <ChevronUp className="w-3 h-3" />
                        ) : (
                          <ChevronDown className="w-3 h-3" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-gray-500" />
                      )}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Communication
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Source
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Tags
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Opt-ins
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider select-none">
                    <button
                      type="button"
                      onClick={() => handleSort('created')}
                      className="inline-flex items-center gap-1 text-gray-300 hover:text-white"
                    >
                      Created
                      {sortKey === 'created' ? (
                        sortOrder === 'asc' ? (
                          <ChevronUp className="w-3 h-3" />
                        ) : (
                          <ChevronDown className="w-3 h-3" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-gray-500" />
                      )}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 text-center text-gray-400">
                      Loading contacts...
                    </td>
                  </tr>
                ) : paginatedContacts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 text-center text-gray-400">
                      No contacts found
                    </td>
                  </tr>
                ) : (
                  paginatedContacts.map((contact) => (
                    <tr key={contact.id} className="hover:bg-gray-700/50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-white">
                            {contact.first_name || contact.last_name 
                              ? `${contact.first_name || ''} ${contact.last_name || ''}`.trim()
                              : 'No Name'}
                          </div>
                          {contact.lead?.status && (
                            <div className="text-xs text-gray-400">
                              Lead Status: {contact.lead.status}
                              {contact.lead.score && ` (Score: ${contact.lead.score})`}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-300">
                          {contact.email && (
                            <div className="flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {contact.email}
                            </div>
                          )}
                          {contact.phone && (
                            <div className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {contact.phone}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-700 text-gray-300">
                          {contact.lead?.source || contact.metadata?.source || 'Direct'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {contact.tags?.map((tag, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 text-xs bg-blue-500/20 text-blue-400 rounded"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex gap-2">
                          {contact.sms_opt_in && (
                            <span className="text-green-400" title="SMS">
                              <Phone className="w-4 h-4" />
                            </span>
                          )}
                          {contact.whatsapp_opt_in && (
                            <span className="text-green-400" title="WhatsApp">
                              <MessageSquare className="w-4 h-4" />
                            </span>
                          )}
                          {contact.email_opt_in && (
                            <span className="text-green-400" title="Email">
                              <Mail className="w-4 h-4" />
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                        {new Date(contact.created_at).toLocaleDateString('en-GB')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex gap-2">
                          {contact.lead_id && (
                            <Link
                              href={`/leads/${contact.lead_id}`}
                              className="text-orange-400 hover:text-orange-300"
                              title="View Lead"
                            >
                              View
                            </Link>
                          )}
                          <button
                            onClick={() => router.push(`/conversations?contact=${contact.id}`)}
                            className="text-blue-400 hover:text-blue-300"
                            title="Message"
                          >
                            Message
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-gray-900 px-6 py-3 flex items-center justify-between">
              <div className="text-sm text-gray-400">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to{' '}
                {Math.min(currentPage * itemsPerPage, filteredContacts.length)} of{' '}
                {filteredContacts.length} contacts
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 bg-gray-700 text-white rounded disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="px-3 py-1 text-white">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 bg-gray-700 text-white rounded disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
  )
}

export default function ContactsPage() {
  return (
    <DashboardLayout>
      <Suspense fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-gray-400">Loading contacts...</div>
        </div>
      }>
        <ContactsContent />
      </Suspense>
    </DashboardLayout>
  )
}