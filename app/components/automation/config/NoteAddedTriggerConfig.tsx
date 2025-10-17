'use client'

import { useState, useEffect } from 'react'
import { ChevronDown, Plus, X, FileText, User, MessageSquare } from 'lucide-react'

interface NoteAddedTriggerConfigProps {
  config: any
  onChange: (config: any) => void
  organizationId: string
}

interface NoteType {
  id: string
  name: string
  description?: string
}

interface TeamMember {
  id: string
  name: string
  email: string
}

export default function NoteAddedTriggerConfig({ config, onChange, organizationId }: NoteAddedTriggerConfigProps) {
  const [triggerName, setTriggerName] = useState(config.name || 'Note Added Trigger')
  const [noteTypes, setNoteTypes] = useState<NoteType[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [filters, setFilters] = useState(config.filters || {
    noteType: 'any', // 'any', specific note type id
    addedBy: 'any', // 'any', 'me', specific user id
    relatedTo: 'any', // 'any', 'contact', 'opportunity', 'appointment', 'task'
    visibility: 'any', // 'any', 'private', 'public', 'team'
    contentLength: 'any', // 'any', 'short', 'medium', 'long'
    hasAttachments: 'any', // 'any', 'with_attachments', 'without_attachments'
    mentionsTeam: false, // whether the note mentions team members
    containsKeywords: [] // array of keywords to look for
  })
  const [additionalFilters, setAdditionalFilters] = useState(config.additionalFilters || [])
  const [keywords, setKeywords] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (config.name) {
      setTriggerName(config.name)
    }
    if (config.filters?.containsKeywords) {
      setKeywords(config.filters.containsKeywords.join(', '))
    }
  }, [])

  useEffect(() => {
    loadAvailableData()
  }, [organizationId])

  const loadAvailableData = async () => {
    try {
      setLoading(true)
      
      // Load available note types
      const noteTypesResponse = await fetch('/api/notes/types')
      if (noteTypesResponse.ok) {
        const noteTypesData = await noteTypesResponse.json()
        if (noteTypesData.noteTypes) {
          setNoteTypes(noteTypesData.noteTypes.map((type: any) => ({
            id: type.id,
            name: type.name,
            description: type.description
          })))
        }
      } else {
        // Default note types if API is not available
        setNoteTypes([
          { id: 'general', name: 'General Note', description: 'General purpose notes' },
          { id: 'meeting', name: 'Meeting Note', description: 'Meeting summaries and notes' },
          { id: 'call', name: 'Call Note', description: 'Phone call notes' },
          { id: 'follow_up', name: 'Follow-up Note', description: 'Follow-up action notes' },
          { id: 'complaint', name: 'Complaint Note', description: 'Customer complaint notes' },
          { id: 'feedback', name: 'Feedback Note', description: 'Customer feedback notes' }
        ])
      }
      
      // Load team members
      const membersResponse = await fetch('/api/team/members')
      if (membersResponse.ok) {
        const membersData = await membersResponse.json()
        if (membersData.members) {
          setTeamMembers(membersData.members.map((member: any) => ({
            id: member.id,
            name: member.name || member.email,
            email: member.email
          })))
        }
      } else {
        console.error('Failed to fetch team members')
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (key: string, value: any) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    onChange({ ...config, filters: newFilters })
  }

  const handleKeywordsChange = (value: string) => {
    setKeywords(value)
    const keywordArray = value.split(',').map(k => k.trim()).filter(k => k.length > 0)
    handleFilterChange('containsKeywords', keywordArray)
  }

  const addAdditionalFilter = () => {
    const newFilter = {
      id: Date.now().toString(),
      field: 'note.content',
      operator: 'contains',
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

  const getSelectedNoteType = () => {
    return noteTypes.find(type => type.id === filters.noteType)
  }

  const getSelectedTeamMember = () => {
    return teamMembers.find(member => member.id === filters.addedBy)
  }

  if (loading) {
    return <div className="p-4 text-center">Loading note configuration...</div>
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

      {/* Note Configuration */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 uppercase tracking-wide">
            NOTE TRIGGER SETTINGS
          </label>
          <p className="text-sm text-gray-500 mb-4">
            Configure when to trigger based on notes being added to contacts
          </p>
        </div>

        {/* Note Type Filter */}
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Note type
            </label>
            <div className="relative">
              <select
                value={filters.noteType}
                onChange={(e) => handleFilterChange('noteType', e.target.value)}
                className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg appearance-none bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="any">Any note type</option>
                {noteTypes.map(type => (
                  <option key={type.id} value={type.id}>{type.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            </div>
          </div>
          <div className="flex-1">
            <span className="px-4 py-3 bg-gray-100 text-gray-700 rounded-lg block text-center">
              {getSelectedNoteType()?.name || 'Any'}
            </span>
          </div>
        </div>

        {/* Added By Filter */}
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Added by
            </label>
            <div className="relative">
              <select
                value={filters.addedBy}
                onChange={(e) => handleFilterChange('addedBy', e.target.value)}
                className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg appearance-none bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="any">Anyone</option>
                <option value="me">Me</option>
                {teamMembers.map(member => (
                  <option key={member.id} value={member.id}>{member.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            </div>
          </div>
          <div className="flex-1">
            <span className="px-4 py-3 bg-gray-100 text-gray-700 rounded-lg block text-center">
              {filters.addedBy === 'me' ? 'Me' : getSelectedTeamMember()?.name || 'Anyone'}
            </span>
          </div>
        </div>

        {/* Related To Filter */}
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Related to
            </label>
            <div className="relative">
              <select
                value={filters.relatedTo}
                onChange={(e) => handleFilterChange('relatedTo', e.target.value)}
                className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg appearance-none bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="any">Any relation</option>
                <option value="contact">Contact</option>
                <option value="opportunity">Opportunity</option>
                <option value="appointment">Appointment</option>
                <option value="task">Task</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            </div>
          </div>
          <div className="flex-1">
            <span className="px-4 py-3 bg-gray-100 text-gray-700 rounded-lg block text-center capitalize">
              {filters.relatedTo === 'any' ? 'Any' : filters.relatedTo}
            </span>
          </div>
        </div>

        {/* Visibility Filter */}
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Visibility level
            </label>
            <div className="relative">
              <select
                value={filters.visibility}
                onChange={(e) => handleFilterChange('visibility', e.target.value)}
                className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg appearance-none bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="any">Any visibility</option>
                <option value="private">Private notes</option>
                <option value="public">Public notes</option>
                <option value="team">Team visible</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            </div>
          </div>
          <div className="flex-1">
            <span className={`px-4 py-3 rounded-lg block text-center capitalize ${
              filters.visibility === 'private' ? 'bg-red-100 text-red-700' :
              filters.visibility === 'public' ? 'bg-green-100 text-green-700' :
              filters.visibility === 'team' ? 'bg-blue-100 text-blue-700' :
              'bg-gray-100 text-gray-700'
            }`}>
              {filters.visibility === 'any' ? 'Any' : filters.visibility}
            </span>
          </div>
        </div>

        {/* Content Length Filter */}
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Content length
            </label>
            <div className="relative">
              <select
                value={filters.contentLength}
                onChange={(e) => handleFilterChange('contentLength', e.target.value)}
                className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg appearance-none bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="any">Any length</option>
                <option value="short">Short notes (&lt; 100 characters)</option>
                <option value="medium">Medium notes (100-500 characters)</option>
                <option value="long">Long notes (&gt; 500 characters)</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            </div>
          </div>
          <div className="flex-1">
            <span className="px-4 py-3 bg-gray-100 text-gray-700 rounded-lg block text-center">
              {filters.contentLength === 'any' ? 'Any' : 
               filters.contentLength === 'short' ? 'Short' :
               filters.contentLength === 'medium' ? 'Medium' :
               filters.contentLength === 'long' ? 'Long' :
               'Any'}
            </span>
          </div>
        </div>

        {/* Attachments Filter */}
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Attachments
            </label>
            <div className="relative">
              <select
                value={filters.hasAttachments}
                onChange={(e) => handleFilterChange('hasAttachments', e.target.value)}
                className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg appearance-none bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="any">Any attachment status</option>
                <option value="with_attachments">With attachments</option>
                <option value="without_attachments">Without attachments</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            </div>
          </div>
          <div className="flex-1">
            <span className="px-4 py-3 bg-gray-100 text-gray-700 rounded-lg block text-center">
              {filters.hasAttachments === 'any' ? 'Any' : 
               filters.hasAttachments === 'with_attachments' ? 'With attachments' :
               filters.hasAttachments === 'without_attachments' ? 'No attachments' :
               'Any'}
            </span>
          </div>
        </div>

        {/* Team Mentions Filter */}
        <div className="flex items-center">
          <input
            type="checkbox"
            id="mentionsTeam"
            checked={filters.mentionsTeam}
            onChange={(e) => handleFilterChange('mentionsTeam', e.target.checked)}
            className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="mentionsTeam" className="text-sm font-medium text-gray-700">
            Only when note mentions team members (@mentions)
          </label>
        </div>

        {/* Keywords Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Contains keywords (optional)
          </label>
          <input
            type="text"
            value={keywords}
            onChange={(e) => handleKeywordsChange(e.target.value)}
            placeholder="Enter keywords separated by commas"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <p className="text-sm text-gray-500 mt-1">
            Separate multiple keywords with commas. Leave empty to trigger on any note content.
          </p>
        </div>

        {filters.containsKeywords.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Watching for keywords ({filters.containsKeywords.length})
            </label>
            <div className="flex flex-wrap gap-2">
              {filters.containsKeywords.map((keyword: string, index: number) => (
                <span
                  key={index}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                >
                  {keyword}
                  <button
                    type="button"
                    onClick={() => {
                      const newKeywords = filters.containsKeywords.filter((_: string, i: number) => i !== index)
                      handleFilterChange('containsKeywords', newKeywords)
                      setKeywords(newKeywords.join(', '))
                    }}
                    className="ml-2 text-blue-600 hover:text-blue-800"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Note Info Display */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center">
            <FileText className="w-5 h-5 text-blue-600 mr-2" />
            <span className="text-blue-800 font-medium">
              Trigger will fire when notes are added to contacts matching the above criteria
            </span>
          </div>
        </div>

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
                  <option value="note.content">Note Content</option>
                  <option value="note.created_at">Created Date</option>
                  <option value="note.updated_at">Updated Date</option>
                  <option value="contact.name">Contact Name</option>
                  <option value="contact.email">Contact Email</option>
                  <option value="contact.source">Contact Source</option>
                  <option value="user.name">Created By User</option>
                </select>
                
                <select
                  value={filter.operator}
                  onChange={(e) => updateAdditionalFilter(filter.id, { operator: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="equals">equals</option>
                  <option value="not_equals">not equals</option>
                  <option value="contains">contains</option>
                  <option value="starts_with">starts with</option>
                  <option value="ends_with">ends with</option>
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