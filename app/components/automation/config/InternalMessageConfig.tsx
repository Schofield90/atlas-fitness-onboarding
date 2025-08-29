'use client'

import { useState, useEffect } from 'react'
import { 
  Users, 
  Mail, 
  Phone, 
  MessageSquare,
  Send,
  Bell,
  User,
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import { createClient } from '@/app/lib/supabase/client'

interface InternalMessageConfigProps {
  nodeData: any
  onChange: (data: any) => void
  organizationId: string
}

interface StaffMember {
  id: string
  name: string
  email: string
  phone: string
  role: string
  telegram_username?: string
}

export default function InternalMessageConfig({ 
  nodeData, 
  onChange,
  organizationId 
}: InternalMessageConfigProps) {
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([])
  const [selectedStaff, setSelectedStaff] = useState<string[]>(nodeData.recipients || [])
  const [selectedChannels, setSelectedChannels] = useState<string[]>(nodeData.channels || ['email'])
  const [message, setMessage] = useState(nodeData.message || '')
  const [subject, setSubject] = useState(nodeData.subject || '')
  const [notificationType, setNotificationType] = useState(nodeData.notificationType || 'alert')
  const [loading, setLoading] = useState(true)
  const [testSending, setTestSending] = useState(false)
  const [testStatus, setTestStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' })
  const supabase = createClient()

  useEffect(() => {
    fetchStaffMembers()
  }, [organizationId])

  const fetchStaffMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('active', true)

      if (error) throw error

      setStaffMembers(data || [])
    } catch (error) {
      console.error('Error fetching staff:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleStaffSelection = (staffId: string) => {
    setSelectedStaff(prev => 
      prev.includes(staffId) 
        ? prev.filter(id => id !== staffId)
        : [...prev, staffId]
    )
  }

  const toggleChannel = (channel: string) => {
    setSelectedChannels(prev =>
      prev.includes(channel)
        ? prev.filter(c => c !== channel)
        : [...prev, channel]
    )
  }

  const insertVariable = (variable: string) => {
    const cursorPos = (document.activeElement as HTMLTextAreaElement)?.selectionStart || message.length
    const newMessage = message.slice(0, cursorPos) + `{{${variable}}}` + message.slice(cursorPos)
    setMessage(newMessage)
  }

  const sendTestMessage = async () => {
    setTestSending(true)
    setTestStatus({ type: null, message: '' })

    try {
      // Send test to first selected staff member
      const testRecipient = staffMembers.find(s => selectedStaff.includes(s.id))
      
      if (!testRecipient) {
        setTestStatus({ type: 'error', message: 'Please select at least one staff member' })
        return
      }

      const response = await fetch('/api/automations/test-internal-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          recipient: testRecipient,
          channels: selectedChannels,
          subject,
          message,
          notificationType
        })
      })

      if (response.ok) {
        setTestStatus({ type: 'success', message: `Test message sent to ${testRecipient.name}` })
      } else {
        throw new Error('Failed to send test message')
      }
    } catch (error) {
      setTestStatus({ type: 'error', message: 'Failed to send test message' })
    } finally {
      setTestSending(false)
    }
  }

  // Update parent component
  useEffect(() => {
    onChange({
      ...nodeData,
      recipients: selectedStaff,
      channels: selectedChannels,
      message,
      subject,
      notificationType
    })
  }, [selectedStaff, selectedChannels, message, subject, notificationType])

  const notificationTypes = [
    { value: 'alert', label: 'Alert', icon: AlertCircle, color: 'text-yellow-400' },
    { value: 'info', label: 'Information', icon: Bell, color: 'text-blue-400' },
    { value: 'success', label: 'Success', icon: CheckCircle, color: 'text-green-400' },
    { value: 'urgent', label: 'Urgent', icon: AlertCircle, color: 'text-red-400' }
  ]

  const channels = [
    { value: 'email', label: 'Email', icon: Mail, available: true },
    { value: 'sms', label: 'SMS', icon: Phone, available: true },
    { value: 'whatsapp', label: 'WhatsApp', icon: MessageSquare, available: true },
    { value: 'telegram', label: 'Telegram', icon: Send, available: true }
  ]

  const variables = [
    { label: 'Lead Name', value: 'lead_name' },
    { label: 'Lead Email', value: 'lead_email' },
    { label: 'Lead Phone', value: 'lead_phone' },
    { label: 'Event Type', value: 'event_type' },
    { label: 'Event Date', value: 'event_date' },
    { label: 'Gym Location', value: 'location' },
    { label: 'Staff Name', value: 'staff_name' },
    { label: 'Current Time', value: 'current_time' }
  ]

  return (
    <div className="space-y-4">
      {/* Notification Type */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Notification Type
        </label>
        <div className="grid grid-cols-2 gap-2">
          {notificationTypes.map(type => {
            const Icon = type.icon
            return (
              <button
                key={type.value}
                onClick={() => setNotificationType(type.value)}
                className={`flex items-center gap-2 p-3 rounded-lg border transition-all ${
                  notificationType === type.value
                    ? 'bg-gray-700 border-blue-500'
                    : 'bg-gray-800 border-gray-600 hover:bg-gray-700'
                }`}
              >
                <Icon className={`h-5 w-5 ${type.color}`} />
                <span className="text-sm text-white">{type.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Staff Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Select Staff Members <span className="text-red-400">*</span>
        </label>
        {loading ? (
          <div className="text-gray-400">Loading staff members...</div>
        ) : staffMembers.length === 0 ? (
          <div className="bg-gray-800 border border-gray-600 rounded-lg p-4">
            <p className="text-gray-400">No staff members found. Add staff in settings first.</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto bg-gray-800 border border-gray-600 rounded-lg p-3">
            {staffMembers.map(staff => (
              <label
                key={staff.id}
                className="flex items-center gap-3 p-2 hover:bg-gray-700 rounded cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedStaff.includes(staff.id)}
                  onChange={() => {
                    toggleStaffSelection(staff.id)
                    const newSelectedStaff = selectedStaff.includes(staff.id) 
                      ? selectedStaff.filter(id => id !== staff.id)
                      : [...selectedStaff, staff.id]
                    onChange({ ...nodeData, recipients: newSelectedStaff })
                  }}
                  className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                />
                <div className="flex items-center gap-2 flex-1">
                  <User className="h-4 w-4 text-gray-400" />
                  <div>
                    <div className="text-white text-sm">{staff.name}</div>
                    <div className="text-gray-400 text-xs">{staff.role}</div>
                  </div>
                </div>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Notification Channels */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Notification Channels <span className="text-red-400">*</span>
        </label>
        <div className="grid grid-cols-2 gap-2">
          {channels.map(channel => {
            const Icon = channel.icon
            return (
              <button
                key={channel.value}
                onClick={() => toggleChannel(channel.value)}
                disabled={!channel.available}
                className={`flex items-center gap-2 p-3 rounded-lg border transition-all ${
                  selectedChannels.includes(channel.value)
                    ? 'bg-blue-600 border-blue-500 text-white'
                    : channel.available
                    ? 'bg-gray-800 border-gray-600 hover:bg-gray-700 text-gray-300'
                    : 'bg-gray-900 border-gray-700 text-gray-500 cursor-not-allowed'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-sm">{channel.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Subject (for email) */}
      {selectedChannels.includes('email') && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Email Subject
          </label>
          <input
            type="text"
            value={subject}
            onChange={(e) => {
              setSubject(e.target.value)
              onChange({ ...nodeData, subject: e.target.value })
            }}
            placeholder="e.g., New Lead Alert: {{lead_name}}"
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}

      {/* Message */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-sm font-medium text-gray-300">
            Message <span className="text-red-400">*</span>
          </label>
          <select
            onChange={(e) => {
              if (e.target.value) {
                insertVariable(e.target.value)
                e.target.value = ''
              }
            }}
            className="px-2 py-1 bg-gray-700 text-white text-sm rounded border border-gray-600"
          >
            <option value="">Insert Variable</option>
            {variables.map(v => (
              <option key={v.value} value={v.value}>
                {v.label}
              </option>
            ))}
          </select>
        </div>
        <textarea
          value={message}
          onChange={(e) => {
            setMessage(e.target.value)
            onChange({ ...nodeData, message: e.target.value })
          }}
          placeholder="Enter the notification message..."
          rows={4}
          required
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-xs text-gray-400 mt-1">
          Use variables like {'{{lead_name}}'} to personalize the message
        </p>
      </div>

      {/* Test Status */}
      {testStatus.type && (
        <div className={`p-3 rounded-lg ${
          testStatus.type === 'success' ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'
        }`}>
          <div className="flex items-center gap-2">
            {testStatus.type === 'success' ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <span className="text-sm">{testStatus.message}</span>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-between pt-4">
        <button
          onClick={sendTestMessage}
          disabled={testSending || selectedStaff.length === 0 || selectedChannels.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
        >
          <Send className="h-4 w-4" />
          {testSending ? 'Sending...' : 'Send Test'}
        </button>
        
        <button
          onClick={() => {
            console.log('Saving internal message configuration:', {
              recipients: selectedStaff,
              channels: selectedChannels,
              message,
              subject,
              notificationType
            })
          }}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          Save Action
        </button>
      </div>
    </div>
  )
}