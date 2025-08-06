'use client'

import { useState, useEffect } from 'react'
import { ChevronDown, Plus, X, MessageSquare, Mail, Phone, MessageCircle, Clock, User, Hash } from 'lucide-react'

interface CustomerRepliedTriggerConfigProps {
  config: any
  onChange: (config: any) => void
  organizationId: string
}

interface CommunicationChannel {
  id: string
  name: string
  type: 'email' | 'sms' | 'chat' | 'social'
  isActive: boolean
}

interface TeamMember {
  id: string
  name: string
  email: string
}

export default function CustomerRepliedTriggerConfig({ config, onChange, organizationId }: CustomerRepliedTriggerConfigProps) {
  const [triggerName, setTriggerName] = useState(config.name || 'Customer Replied Trigger')
  const [communicationChannels, setCommunicationChannels] = useState<CommunicationChannel[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [filters, setFilters] = useState(config.filters || {
    communicationType: 'any', // 'any', 'email', 'sms', 'chat', 'social'
    replyChannel: 'any', // 'any', specific channel id
    replyToMessage: 'any', // 'any', 'campaign', 'workflow', 'broadcast', 'manual'
    replyTiming: 'any', // 'any', 'immediate', 'within_1_hour', 'within_24_hours', 'after_24_hours'
    messageLength: 'any', // 'any', 'short', 'medium', 'long'
    sentiment: 'any', // 'any', 'positive', 'negative', 'neutral'
    containsKeywords: [], // array of keywords to look for
    excludeKeywords: [], // array of keywords to exclude
    isFirstReply: false, // whether this is the first reply from the customer
    replyCount: 'any', // 'any', 'first', 'second', 'third_or_more'
    hasAttachments: 'any', // 'any', 'with_attachments', 'without_attachments'
    originalSentBy: 'any', // 'any', 'me', specific user id
    businessHours: false, // only trigger during business hours
    responseTime: 'any' // 'any', 'fast', 'medium', 'slow'
  })
  const [additionalFilters, setAdditionalFilters] = useState(config.additionalFilters || [])
  const [keywords, setKeywords] = useState('')
  const [excludeWords, setExcludeWords] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (config.name) {
      setTriggerName(config.name)
    }
    if (config.filters?.containsKeywords) {
      setKeywords(config.filters.containsKeywords.join(', '))
    }
    if (config.filters?.excludeKeywords) {
      setExcludeWords(config.filters.excludeKeywords.join(', '))
    }
  }, [])

  useEffect(() => {
    loadAvailableData()
  }, [organizationId])

  const loadAvailableData = async () => {
    try {
      setLoading(true)
      
      // Load available communication channels
      const channelsResponse = await fetch('/api/communications/channels')
      if (channelsResponse.ok) {
        const channelsData = await channelsResponse.json()
        if (channelsData.channels) {
          setCommunicationChannels(channelsData.channels.map((channel: any) => ({
            id: channel.id,
            name: channel.name,
            type: channel.type || 'email',
            isActive: channel.is_active !== false
          })))
        }
      } else {
        // Default communication channels if API is not available
        setCommunicationChannels([
          { id: 'email_primary', name: 'Primary Email', type: 'email', isActive: true },
          { id: 'sms_primary', name: 'Primary SMS', type: 'sms', isActive: true },
          { id: 'chat_widget', name: 'Website Chat', type: 'chat', isActive: true },
          { id: 'facebook_messenger', name: 'Facebook Messenger', type: 'social', isActive: true },
          { id: 'instagram_dm', name: 'Instagram DM', type: 'social', isActive: true }
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

  const handleKeywordsChange = (value: string, type: 'include' | 'exclude') => {
    if (type === 'include') {
      setKeywords(value)
      const keywordArray = value.split(',').map(k => k.trim()).filter(k => k.length > 0)
      handleFilterChange('containsKeywords', keywordArray)
    } else {
      setExcludeWords(value)
      const keywordArray = value.split(',').map(k => k.trim()).filter(k => k.length > 0)
      handleFilterChange('excludeKeywords', keywordArray)
    }
  }

  const addAdditionalFilter = () => {
    const newFilter = {
      id: Date.now().toString(),
      field: 'message.content',
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

  const getSelectedChannel = () => {
    return communicationChannels.find(channel => channel.id === filters.replyChannel)
  }

  const getSelectedTeamMember = () => {
    return teamMembers.find(member => member.id === filters.originalSentBy)
  }

  const getCommunicationTypeIcon = (type: string) => {
    switch (type) {
      case 'email': return Mail
      case 'sms': return Phone
      case 'chat': return MessageCircle
      case 'social': return Hash
      default: return MessageSquare
    }
  }

  if (loading) {
    return <div className="p-4 text-center">Loading customer reply configuration...</div>
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

      {/* Customer Reply Configuration */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 uppercase tracking-wide">
            CUSTOMER REPLY TRIGGER SETTINGS
          </label>
          <p className="text-sm text-gray-500 mb-4">
            Configure when to trigger based on customer replies to messages
          </p>
        </div>

        {/* Communication Type Filter */}
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Communication type
            </label>
            <div className="relative">
              <select
                value={filters.communicationType}
                onChange={(e) => handleFilterChange('communicationType', e.target.value)}
                className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg appearance-none bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="any">Any communication type</option>
                <option value="email">Email replies</option>
                <option value="sms">SMS replies</option>
                <option value="chat">Chat messages</option>
                <option value="social">Social media messages</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            </div>
          </div>
          <div className="flex-1">
            <span className="px-4 py-3 bg-gray-100 text-gray-700 rounded-lg block text-center flex items-center justify-center">
              {filters.communicationType !== 'any' && (
                React.createElement(getCommunicationTypeIcon(filters.communicationType), { className: "w-4 h-4 mr-2" })
              )}
              {filters.communicationType === 'any' ? 'Any' : 
               filters.communicationType === 'email' ? 'Email' :
               filters.communicationType === 'sms' ? 'SMS' :
               filters.communicationType === 'chat' ? 'Chat' :
               filters.communicationType === 'social' ? 'Social' :
               'Any'}
            </span>
          </div>
        </div>

        {/* Reply Channel Filter */}
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Specific channel
            </label>
            <div className="relative">
              <select
                value={filters.replyChannel}
                onChange={(e) => handleFilterChange('replyChannel', e.target.value)}
                className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg appearance-none bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="any">Any channel</option>
                {communicationChannels
                  .filter(channel => filters.communicationType === 'any' || channel.type === filters.communicationType)
                  .map(channel => (
                    <option key={channel.id} value={channel.id}>
                      {channel.name} ({channel.type})
                    </option>
                  ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            </div>
          </div>
          <div className="flex-1">
            <span className="px-4 py-3 bg-gray-100 text-gray-700 rounded-lg block text-center">
              {getSelectedChannel()?.name || 'Any'}
            </span>
          </div>
        </div>

        {/* Reply To Message Type Filter */}
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reply to message type
            </label>
            <div className="relative">
              <select
                value={filters.replyToMessage}
                onChange={(e) => handleFilterChange('replyToMessage', e.target.value)}
                className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg appearance-none bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="any">Any message type</option>
                <option value="campaign">Campaign messages</option>
                <option value="workflow">Workflow messages</option>
                <option value="broadcast">Broadcast messages</option>
                <option value="manual">Manual messages</option>
                <option value="automated">Automated messages</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            </div>
          </div>
          <div className="flex-1">
            <span className="px-4 py-3 bg-gray-100 text-gray-700 rounded-lg block text-center capitalize">
              {filters.replyToMessage === 'any' ? 'Any' : filters.replyToMessage}
            </span>
          </div>
        </div>

        {/* Reply Timing Filter */}
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reply timing
            </label>
            <div className="relative">
              <select
                value={filters.replyTiming}
                onChange={(e) => handleFilterChange('replyTiming', e.target.value)}
                className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg appearance-none bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="any">Any timing</option>
                <option value="immediate">Immediate (&lt; 5 minutes)</option>
                <option value="within_1_hour">Within 1 hour</option>
                <option value="within_24_hours">Within 24 hours</option>
                <option value="after_24_hours">After 24 hours</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            </div>
          </div>
          <div className="flex-1">
            <span className={`px-4 py-3 rounded-lg block text-center ${
              filters.replyTiming === 'immediate' ? 'bg-green-100 text-green-700' :
              filters.replyTiming === 'within_1_hour' ? 'bg-blue-100 text-blue-700' :
              filters.replyTiming === 'within_24_hours' ? 'bg-yellow-100 text-yellow-700' :
              filters.replyTiming === 'after_24_hours' ? 'bg-red-100 text-red-700' :
              'bg-gray-100 text-gray-700'
            }`}>
              {filters.replyTiming === 'any' ? 'Any' : 
               filters.replyTiming === 'immediate' ? 'Immediate' :
               filters.replyTiming === 'within_1_hour' ? '< 1 hour' :
               filters.replyTiming === 'within_24_hours' ? '< 24 hours' :
               filters.replyTiming === 'after_24_hours' ? '> 24 hours' :
               'Any'}
            </span>
          </div>
        </div>

        {/* Message Length Filter */}
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Message length
            </label>
            <div className="relative">
              <select
                value={filters.messageLength}
                onChange={(e) => handleFilterChange('messageLength', e.target.value)}
                className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg appearance-none bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="any">Any length</option>
                <option value="short">Short messages (&lt; 50 characters)</option>
                <option value="medium">Medium messages (50-200 characters)</option>
                <option value="long">Long messages (&gt; 200 characters)</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            </div>
          </div>
          <div className="flex-1">
            <span className="px-4 py-3 bg-gray-100 text-gray-700 rounded-lg block text-center">
              {filters.messageLength === 'any' ? 'Any' : 
               filters.messageLength === 'short' ? 'Short' :
               filters.messageLength === 'medium' ? 'Medium' :
               filters.messageLength === 'long' ? 'Long' :
               'Any'}
            </span>
          </div>
        </div>

        {/* Sentiment Filter */}
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Message sentiment
            </label>
            <div className="relative">
              <select
                value={filters.sentiment}
                onChange={(e) => handleFilterChange('sentiment', e.target.value)}
                className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg appearance-none bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="any">Any sentiment</option>
                <option value="positive">Positive sentiment</option>
                <option value="neutral">Neutral sentiment</option>
                <option value="negative">Negative sentiment</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            </div>
          </div>
          <div className="flex-1">
            <span className={`px-4 py-3 rounded-lg block text-center capitalize ${
              filters.sentiment === 'positive' ? 'bg-green-100 text-green-700' :
              filters.sentiment === 'negative' ? 'bg-red-100 text-red-700' :
              filters.sentiment === 'neutral' ? 'bg-yellow-100 text-yellow-700' :
              'bg-gray-100 text-gray-700'
            }`}>
              {filters.sentiment === 'any' ? 'Any' : filters.sentiment}
            </span>
          </div>
        </div>

        {/* Reply Count Filter */}
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reply sequence
            </label>
            <div className="relative">
              <select
                value={filters.replyCount}
                onChange={(e) => handleFilterChange('replyCount', e.target.value)}
                className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg appearance-none bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="any">Any reply number</option>
                <option value="first">First reply</option>
                <option value="second">Second reply</option>
                <option value="third_or_more">Third reply or more</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            </div>
          </div>
          <div className="flex-1">
            <span className="px-4 py-3 bg-gray-100 text-gray-700 rounded-lg block text-center">
              {filters.replyCount === 'any' ? 'Any' : 
               filters.replyCount === 'first' ? '1st reply' :
               filters.replyCount === 'second' ? '2nd reply' :
               filters.replyCount === 'third_or_more' ? '3rd+ reply' :
               'Any'}
            </span>
          </div>
        </div>

        {/* Original Sent By Filter */}
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Original message sent by
            </label>
            <div className="relative">
              <select
                value={filters.originalSentBy}
                onChange={(e) => handleFilterChange('originalSentBy', e.target.value)}
                className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg appearance-none bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="any">Anyone</option>
                <option value="me">Me</option>
                <option value="system">System/Automated</option>
                {teamMembers.map(member => (
                  <option key={member.id} value={member.id}>{member.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            </div>
          </div>
          <div className="flex-1">
            <span className="px-4 py-3 bg-gray-100 text-gray-700 rounded-lg block text-center">
              {filters.originalSentBy === 'me' ? 'Me' : 
               filters.originalSentBy === 'system' ? 'System' :
               getSelectedTeamMember()?.name || 'Anyone'}
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

        {/* Business Hours Filter */}
        <div className="flex items-center">
          <input
            type="checkbox"
            id="businessHours"
            checked={filters.businessHours}
            onChange={(e) => handleFilterChange('businessHours', e.target.checked)}
            className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="businessHours" className="text-sm font-medium text-gray-700">
            Only trigger during business hours
          </label>
        </div>

        {/* Keywords Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Must contain keywords (optional)
          </label>
          <input
            type="text"
            value={keywords}
            onChange={(e) => handleKeywordsChange(e.target.value, 'include')}
            placeholder="Enter keywords separated by commas"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <p className="text-sm text-gray-500 mt-1">
            Separate multiple keywords with commas. Leave empty to trigger on any reply content.
          </p>
        </div>

        {/* Exclude Keywords Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Must NOT contain keywords (optional)
          </label>
          <input
            type="text"
            value={excludeWords}
            onChange={(e) => handleKeywordsChange(e.target.value, 'exclude')}
            placeholder="Enter keywords to exclude separated by commas"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <p className="text-sm text-gray-500 mt-1">
            Messages containing these keywords will NOT trigger the workflow.
          </p>
        </div>

        {/* Display Keywords */}
        {(filters.containsKeywords.length > 0 || filters.excludeKeywords.length > 0) && (
          <div className="space-y-3">
            {filters.containsKeywords.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Must contain ({filters.containsKeywords.length})
                </label>
                <div className="flex flex-wrap gap-2">
                  {filters.containsKeywords.map((keyword: string, index: number) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800"
                    >
                      {keyword}
                      <button
                        type="button"
                        onClick={() => {
                          const newKeywords = filters.containsKeywords.filter((_: string, i: number) => i !== index)
                          handleFilterChange('containsKeywords', newKeywords)
                          setKeywords(newKeywords.join(', '))
                        }}
                        className="ml-2 text-green-600 hover:text-green-800"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {filters.excludeKeywords.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Must NOT contain ({filters.excludeKeywords.length})
                </label>
                <div className="flex flex-wrap gap-2">
                  {filters.excludeKeywords.map((keyword: string, index: number) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800"
                    >
                      {keyword}
                      <button
                        type="button"
                        onClick={() => {
                          const newKeywords = filters.excludeKeywords.filter((_: string, i: number) => i !== index)
                          handleFilterChange('excludeKeywords', newKeywords)
                          setExcludeWords(newKeywords.join(', '))
                        }}
                        className="ml-2 text-red-600 hover:text-red-800"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Communication Info Display */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center">
            <MessageSquare className="w-5 h-5 text-blue-600 mr-2" />
            <span className="text-blue-800 font-medium">
              Trigger will fire when customers reply to messages matching the above criteria
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
                  <option value="message.content">Message Content</option>
                  <option value="message.created_at">Reply Date</option>
                  <option value="message.response_time">Response Time</option>
                  <option value="contact.name">Contact Name</option>
                  <option value="contact.email">Contact Email</option>
                  <option value="contact.phone">Contact Phone</option>
                  <option value="original.subject">Original Subject</option>
                  <option value="original.campaign">Original Campaign</option>
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