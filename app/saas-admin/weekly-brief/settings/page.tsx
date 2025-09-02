'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/app/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { 
  Settings,
  Plus,
  Edit,
  Trash2,
  Clock,
  Mail,
  Users,
  Check,
  X,
  AlertCircle,
  Save
} from 'lucide-react'

interface Schedule {
  id: string
  name: string
  cron_schedule: string
  recipients: string[]
  is_active: boolean
  last_run_at: string | null
  next_run_at: string | null
  created_at: string
}

export default function WeeklyBriefSettingsPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [loading, setLoading] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    cronSchedule: '0 9 * * 1', // Default: Monday 9am
    recipients: ['sam@atlas-gyms.co.uk', 'sam@gymleadhub.co.uk'],
    isActive: true
  })
  const [saving, setSaving] = useState(false)

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkAuthAndLoadSchedules()
  }, [])

  const checkAuthAndLoadSchedules = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      
      if (error || !user) {
        router.push('/login')
        return
      }

      // Check authorization
      const authorizedEmails = ['sam@atlas-gyms.co.uk', 'sam@gymleadhub.co.uk']
      const isAuth = authorizedEmails.includes(user.email?.toLowerCase() || '')
      
      if (!isAuth) {
        setLoading(false)
        return
      }

      setIsAuthorized(true)
      await loadSchedules()
    } catch (error) {
      console.error('Error checking auth:', error)
      setLoading(false)
    }
  }

  const loadSchedules = async () => {
    try {
      const response = await fetch('/api/saas-admin/weekly-brief/schedule')
      if (response.ok) {
        const data = await response.json()
        setSchedules(data.schedules || [])
      }
    } catch (error) {
      console.error('Error loading schedules:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateSchedule = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/saas-admin/weekly-brief/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          cronSchedule: formData.cronSchedule,
          recipients: formData.recipients,
          isActive: formData.isActive
        })
      })

      if (response.ok) {
        await loadSchedules()
        setShowCreateForm(false)
        resetForm()
      } else {
        const error = await response.json()
        alert(`Error creating schedule: ${error.error}`)
      }
    } catch (error) {
      console.error('Error creating schedule:', error)
      alert('Error creating schedule')
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateSchedule = async () => {
    if (!editingSchedule) return

    setSaving(true)
    try {
      const response = await fetch('/api/saas-admin/weekly-brief/schedule', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingSchedule.id,
          name: formData.name,
          cronSchedule: formData.cronSchedule,
          recipients: formData.recipients,
          isActive: formData.isActive
        })
      })

      if (response.ok) {
        await loadSchedules()
        setEditingSchedule(null)
        resetForm()
      } else {
        const error = await response.json()
        alert(`Error updating schedule: ${error.error}`)
      }
    } catch (error) {
      console.error('Error updating schedule:', error)
      alert('Error updating schedule')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteSchedule = async (id: string) => {
    if (!confirm('Are you sure you want to delete this schedule?')) return

    try {
      const response = await fetch(`/api/saas-admin/weekly-brief/schedule?id=${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await loadSchedules()
      } else {
        const error = await response.json()
        alert(`Error deleting schedule: ${error.error}`)
      }
    } catch (error) {
      console.error('Error deleting schedule:', error)
      alert('Error deleting schedule')
    }
  }

  const handleEditSchedule = (schedule: Schedule) => {
    setEditingSchedule(schedule)
    setFormData({
      name: schedule.name,
      cronSchedule: schedule.cron_schedule,
      recipients: schedule.recipients,
      isActive: schedule.is_active
    })
  }

  const resetForm = () => {
    setFormData({
      name: '',
      cronSchedule: '0 9 * * 1',
      recipients: ['sam@atlas-gyms.co.uk', 'sam@gymleadhub.co.uk'],
      isActive: true
    })
    setShowCreateForm(false)
    setEditingSchedule(null)
  }

  const getCronDescription = (cronSchedule: string) => {
    const descriptions: Record<string, string> = {
      '0 9 * * 1': 'Every Monday at 9:00 AM',
      '0 9 * * 0': 'Every Sunday at 9:00 AM',
      '0 9 * * 2': 'Every Tuesday at 9:00 AM',
      '0 9 * * 3': 'Every Wednesday at 9:00 AM',
      '0 9 * * 4': 'Every Thursday at 9:00 AM',
      '0 9 * * 5': 'Every Friday at 9:00 AM',
      '0 9 * * 6': 'Every Saturday at 9:00 AM',
    }
    return descriptions[cronSchedule] || cronSchedule
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading brief settings...</p>
        </div>
      </div>
    )
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center bg-gray-800 p-8 rounded-lg max-w-md">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
          <p className="text-gray-400 mb-6">You don't have permission to access these settings.</p>
          <button
            onClick={() => router.push('/saas-admin')}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
          >
            Back to Admin Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-purple-500">Weekly Brief Settings</h1>
            <p className="text-sm text-gray-400">Manage automated report schedules</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowCreateForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              New Schedule
            </button>
            <button
              onClick={() => router.push('/saas-admin/weekly-brief')}
              className="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
            >
              Back to Brief
            </button>
          </div>
        </div>
      </header>

      <div className="p-6">
        {/* Create/Edit Form */}
        {(showCreateForm || editingSchedule) && (
          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Settings className="w-5 h-5 text-purple-500" />
              {editingSchedule ? 'Edit Schedule' : 'Create New Schedule'}
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-2">Schedule Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Weekly Executive Brief - Monday"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Schedule (Cron Expression)</label>
                <select
                  value={formData.cronSchedule}
                  onChange={(e) => setFormData({ ...formData, cronSchedule: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="0 9 * * 0">Sunday at 9:00 AM</option>
                  <option value="0 9 * * 1">Monday at 9:00 AM</option>
                  <option value="0 9 * * 2">Tuesday at 9:00 AM</option>
                  <option value="0 9 * * 3">Wednesday at 9:00 AM</option>
                  <option value="0 9 * * 4">Thursday at 9:00 AM</option>
                  <option value="0 9 * * 5">Friday at 9:00 AM</option>
                  <option value="0 9 * * 6">Saturday at 9:00 AM</option>
                </select>
                <p className="text-xs text-gray-400 mt-1">
                  {getCronDescription(formData.cronSchedule)}
                </p>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">Recipients (one per line)</label>
                <textarea
                  value={formData.recipients.join('\n')}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    recipients: e.target.value.split('\n').filter(email => email.trim()) 
                  })}
                  rows={3}
                  placeholder="sam@atlas-gyms.co.uk&#10;sam@gymleadhub.co.uk"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="mr-2"
                />
                <label htmlFor="isActive" className="text-sm">Active</label>
              </div>
            </div>

            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={editingSchedule ? handleUpdateSchedule : handleCreateSchedule}
                disabled={saving || !formData.name.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {saving ? 'Saving...' : (editingSchedule ? 'Update Schedule' : 'Create Schedule')}
              </button>
              <button
                onClick={resetForm}
                className="px-4 py-2 bg-gray-600 rounded-lg hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Schedules List */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-500" />
            Scheduled Reports ({schedules.length})
          </h2>

          {schedules.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="w-12 h-12 text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Schedules Found</h3>
              <p className="text-gray-400 mb-6">Create your first automated weekly brief schedule.</p>
              <button
                onClick={() => setShowCreateForm(true)}
                className="flex items-center gap-2 px-6 py-3 bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors mx-auto"
              >
                <Plus className="h-5 w-5" />
                Create Schedule
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {schedules.map((schedule) => (
                <div key={schedule.id} className="bg-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-medium">{schedule.name}</h3>
                        <div className={`px-2 py-1 rounded text-xs ${
                          schedule.is_active ? 'bg-green-900 text-green-300' : 'bg-gray-600 text-gray-300'
                        }`}>
                          {schedule.is_active ? 'Active' : 'Inactive'}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-300">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-blue-400" />
                          {getCronDescription(schedule.cron_schedule)}
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-green-400" />
                          {schedule.recipients.length} recipient{schedule.recipients.length !== 1 ? 's' : ''}
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-purple-400" />
                          Next: {schedule.next_run_at ? new Date(schedule.next_run_at).toLocaleString() : 'Not scheduled'}
                        </div>
                      </div>

                      {schedule.last_run_at && (
                        <div className="mt-2 text-xs text-gray-400">
                          Last run: {new Date(schedule.last_run_at).toLocaleString()}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => handleEditSchedule(schedule)}
                        className="p-2 text-blue-400 hover:bg-gray-600 rounded-lg transition-colors"
                        title="Edit Schedule"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteSchedule(schedule.id)}
                        className="p-2 text-red-400 hover:bg-gray-600 rounded-lg transition-colors"
                        title="Delete Schedule"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Help Section */}
        <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-6 mt-6">
          <h3 className="text-lg font-medium mb-3 text-blue-300">Scheduling Information</h3>
          <div className="text-sm text-blue-200 space-y-2">
            <p>• Schedules use cron expressions to determine when briefs are sent</p>
            <p>• The system checks for due schedules every hour</p>
            <p>• Briefs are automatically generated and emailed to recipients</p>
            <p>• You can manually generate briefs anytime from the main brief page</p>
            <p>• All email sends are logged for tracking and debugging</p>
          </div>
        </div>
      </div>
    </div>
  )
}