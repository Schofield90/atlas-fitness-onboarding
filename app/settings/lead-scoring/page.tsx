'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/app/lib/supabase/client'
import SettingsHeader from '@/app/components/settings/SettingsHeader'
import { 
  Target,
  Activity,
  TrendingUp,
  Users,
  Clock,
  MessageSquare,
  Phone,
  Calendar,
  ChevronRight,
  Plus,
  Edit2,
  Trash2,
  Save,
  AlertCircle,
  Zap,
  Trophy
} from 'lucide-react'

interface ScoringRule {
  id: string
  name: string
  description: string
  category: 'engagement' | 'profile' | 'behavior' | 'interaction'
  condition: string
  points: number
  is_active: boolean
  icon: string
}

interface ScoringThreshold {
  id: string
  label: string
  min_score: number
  max_score: number
  color: string
  actions: string[]
}

interface LeadScoringSettings {
  id?: string
  organization_id: string
  scoring_enabled: boolean
  auto_assign_enabled: boolean
  auto_assign_threshold: number
  notification_threshold: number
  decay_enabled: boolean
  decay_days: number
  decay_percentage: number
  rules: ScoringRule[]
  thresholds: ScoringThreshold[]
}

export default function LeadScoringPage() {
  const [settings, setSettings] = useState<LeadScoringSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingRule, setEditingRule] = useState<ScoringRule | null>(null)
  const [showAddRule, setShowAddRule] = useState(false)
  const supabase = createClient()

  const gymScoringRules: ScoringRule[] = [
    // Engagement Rules
    {
      id: '1',
      name: 'Booked Tour',
      description: 'Lead scheduled a gym tour',
      category: 'engagement',
      condition: 'booking.type = tour',
      points: 30,
      is_active: true,
      icon: 'Calendar'
    },
    {
      id: '2',
      name: 'Attended Tour',
      description: 'Lead completed gym tour',
      category: 'engagement',
      condition: 'booking.status = completed',
      points: 40,
      is_active: true,
      icon: 'CheckCircle'
    },
    {
      id: '3',
      name: 'Trial Session Booked',
      description: 'Lead booked a free trial workout',
      category: 'engagement',
      condition: 'booking.type = trial',
      points: 25,
      is_active: true,
      icon: 'Dumbbell'
    },
    {
      id: '4',
      name: 'Website Form Submission',
      description: 'Submitted contact form',
      category: 'engagement',
      condition: 'lead.source = website',
      points: 10,
      is_active: true,
      icon: 'Globe'
    },
    // Interaction Rules
    {
      id: '5',
      name: 'Responded to Text',
      description: 'Lead replied to SMS/WhatsApp',
      category: 'interaction',
      condition: 'message.type = inbound',
      points: 15,
      is_active: true,
      icon: 'MessageSquare'
    },
    {
      id: '6',
      name: 'Answered Phone Call',
      description: 'Had phone conversation with staff',
      category: 'interaction',
      condition: 'call.status = answered',
      points: 20,
      is_active: true,
      icon: 'Phone'
    },
    {
      id: '7',
      name: 'Email Opened',
      description: 'Opened marketing email',
      category: 'interaction',
      condition: 'email.opened = true',
      points: 5,
      is_active: true,
      icon: 'Mail'
    },
    {
      id: '8',
      name: 'Email Link Clicked',
      description: 'Clicked link in email',
      category: 'interaction',
      condition: 'email.clicked = true',
      points: 10,
      is_active: true,
      icon: 'MousePointer'
    },
    // Profile Rules
    {
      id: '9',
      name: 'Complete Profile',
      description: 'Provided all contact details',
      category: 'profile',
      condition: 'lead.phone AND lead.email',
      points: 10,
      is_active: true,
      icon: 'User'
    },
    {
      id: '10',
      name: 'Fitness Goals Set',
      description: 'Specified fitness objectives',
      category: 'profile',
      condition: 'lead.goals IS NOT NULL',
      points: 15,
      is_active: true,
      icon: 'Target'
    },
    {
      id: '11',
      name: 'Budget Qualified',
      description: 'Can afford membership',
      category: 'profile',
      condition: 'lead.budget >= minimum_price',
      points: 20,
      is_active: true,
      icon: 'CreditCard'
    },
    // Behavior Rules
    {
      id: '12',
      name: 'Multiple Interactions',
      description: '3+ touchpoints in last 7 days',
      category: 'behavior',
      condition: 'interactions.count >= 3',
      points: 25,
      is_active: true,
      icon: 'Activity'
    },
    {
      id: '13',
      name: 'Quick Response',
      description: 'Responds within 1 hour',
      category: 'behavior',
      condition: 'response.time < 60',
      points: 15,
      is_active: true,
      icon: 'Zap'
    },
    {
      id: '14',
      name: 'Referral',
      description: 'Referred by existing member',
      category: 'profile',
      condition: 'lead.source = referral',
      points: 35,
      is_active: true,
      icon: 'Users'
    }
  ]

  const defaultThresholds: ScoringThreshold[] = [
    {
      id: '1',
      label: 'Cold',
      min_score: 0,
      max_score: 25,
      color: 'bg-gray-500',
      actions: ['Add to nurture campaign', 'Send intro offer']
    },
    {
      id: '2',
      label: 'Warm',
      min_score: 26,
      max_score: 50,
      color: 'bg-yellow-500',
      actions: ['Follow up call', 'Send tour invitation']
    },
    {
      id: '3',
      label: 'Hot',
      min_score: 51,
      max_score: 75,
      color: 'bg-orange-500',
      actions: ['Priority call', 'Assign to senior coach', 'Send trial offer']
    },
    {
      id: '4',
      label: 'Ready to Buy',
      min_score: 76,
      max_score: 100,
      color: 'bg-red-500',
      actions: ['Immediate call', 'Manager notification', 'Fast-track to membership']
    }
  ]

  const [newRule, setNewRule] = useState<Partial<ScoringRule>>({
    name: '',
    description: '',
    category: 'engagement',
    points: 10,
    is_active: true
  })

  useEffect(() => {
    fetchSettings()
  }, [])

  // Loading timeout to prevent infinite spinners
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading) {
        console.warn('Loading timeout - forcing loading to stop')
        setLoading(false)
      }
    }, 5000) // 5 second timeout
    
    return () => clearTimeout(timeout)
  }, [loading])

  const fetchSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: userOrg } = await supabase
        .from('user_organizations')
        .select('organization_id')
        .eq('user_id', user.id)
        .single()

      if (!userOrg) return

      // Fetch lead scoring settings
      const { data: scoringSettings } = await supabase
        .from('lead_scoring_settings')
        .select('*')
        .eq('organization_id', userOrg.organization_id)
        .single()

      if (scoringSettings) {
        setSettings(scoringSettings)
      } else {
        // Initialize with gym-optimized defaults
        const defaultSettings: LeadScoringSettings = {
          organization_id: userOrg.organization_id,
          scoring_enabled: true,
          auto_assign_enabled: true,
          auto_assign_threshold: 50,
          notification_threshold: 75,
          decay_enabled: true,
          decay_days: 30,
          decay_percentage: 10,
          rules: gymScoringRules,
          thresholds: defaultThresholds
        }
        setSettings(defaultSettings)
      }
    } catch (error) {
      setLoading(false)
      console.error('Error fetching settings:', error)
      // Use defaults as fallback
      setSettings({
        organization_id: '',
        scoring_enabled: true,
        auto_assign_enabled: true,
        auto_assign_threshold: 50,
        notification_threshold: 75,
        decay_enabled: true,
        decay_days: 30,
        decay_percentage: 10,
        rules: gymScoringRules,
        thresholds: defaultThresholds
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSaveSettings = async () => {
    if (!settings) return
    setSaving(true)

    try {
      if (settings.id) {
        // Update existing settings
        const { error } = await supabase
          .from('lead_scoring_settings')
          .update(settings)
          .eq('id', settings.id)

        if (error) throw error
      } else {
        // Insert new settings
        const { data, error } = await supabase
          .from('lead_scoring_settings')
          .insert(settings)
          .select()
          .single()

        if (error) throw error
        setSettings({ ...settings, id: data.id })
      }

      alert('Lead scoring settings saved successfully!')
    } catch (error) {
      setLoading(false)
      console.error('Error saving settings:', error)
      alert('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleRule = (ruleId: string) => {
    if (!settings) return
    
    const updatedRules = settings.rules.map(rule =>
      rule.id === ruleId ? { ...rule, is_active: !rule.is_active } : rule
    )
    
    setSettings({ ...settings, rules: updatedRules })
  }

  const handleUpdateRule = (ruleId: string, updates: Partial<ScoringRule>) => {
    if (!settings) return
    
    const updatedRules = settings.rules.map(rule =>
      rule.id === ruleId ? { ...rule, ...updates } : rule
    )
    
    setSettings({ ...settings, rules: updatedRules })
    setEditingRule(null)
  }

  const handleAddRule = () => {
    if (!settings || !newRule.name) return

    const rule: ScoringRule = {
      id: Date.now().toString(),
      name: newRule.name,
      description: newRule.description || '',
      category: newRule.category || 'engagement',
      condition: '',
      points: newRule.points || 10,
      is_active: true,
      icon: 'Star'
    }

    setSettings({ ...settings, rules: [...settings.rules, rule] })
    setNewRule({
      name: '',
      description: '',
      category: 'engagement',
      points: 10,
      is_active: true
    })
    setShowAddRule(false)
  }

  const handleDeleteRule = (ruleId: string) => {
    if (!settings) return
    if (!confirm('Are you sure you want to delete this scoring rule?')) return
    
    const updatedRules = settings.rules.filter(rule => rule.id !== ruleId)
    setSettings({ ...settings, rules: updatedRules })
  }

  const calculateExampleScore = () => {
    if (!settings) return 0
    return settings.rules
      .filter(r => r.is_active)
      .slice(0, 5)
      .reduce((sum, rule) => sum + rule.points, 0)
  }

  const getScoreColor = (score: number) => {
    if (!settings) return 'bg-gray-500'
    const threshold = settings.thresholds.find(
      t => score >= t.min_score && score <= t.max_score
    )
    return threshold?.color || 'bg-gray-500'
  }

  const getRuleIcon = (iconName: string) => {
    const icons: { [key: string]: any } = {
      Calendar: <Calendar className="h-4 w-4" />,
      MessageSquare: <MessageSquare className="h-4 w-4" />,
      Phone: <Phone className="h-4 w-4" />,
      Users: <Users className="h-4 w-4" />,
      Target: <Target className="h-4 w-4" />,
      Activity: <Activity className="h-4 w-4" />,
      Zap: <Zap className="h-4 w-4" />
    }
    return icons[iconName] || <ChevronRight className="h-4 w-4" />
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-400">Loading lead scoring settings...</p>
      </div>
    )
  }

  if (!settings) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-400">No settings found</p>
      </div>
    )
  }

  const exampleScore = calculateExampleScore()

  return (
    <div className="space-y-6">
      <SettingsHeader 
        title="Lead Scoring"
        description="Automatically score and prioritize leads based on engagement"
      />

      {/* Info Banner */}
      <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-blue-400 mt-0.5" />
          <div>
            <p className="text-sm text-blue-300 font-medium">Gym-Optimized Scoring</p>
            <p className="text-xs text-blue-200 mt-1">
              Our scoring system is pre-configured for gym lead conversion. 
              Leads are automatically scored based on tour bookings, trial sessions, 
              response times, and engagement patterns specific to fitness businesses.
            </p>
          </div>
        </div>
      </div>

      {/* Score Preview */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Live Score Preview</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {settings.thresholds.map((threshold) => (
            <div
              key={threshold.id}
              className={`p-4 rounded-lg ${
                exampleScore >= threshold.min_score && exampleScore <= threshold.max_score
                  ? 'ring-2 ring-blue-500'
                  : ''
              }`}
              style={{ backgroundColor: 'rgba(55, 65, 81, 0.5)' }}
            >
              <div className={`inline-block px-2 py-1 rounded text-xs font-medium text-white ${threshold.color}`}>
                {threshold.label}
              </div>
              <p className="text-2xl font-bold text-white mt-2">
                {threshold.min_score}-{threshold.max_score}
              </p>
              <p className="text-xs text-gray-400 mt-1">points</p>
              <div className="mt-3 space-y-1">
                {threshold.actions.map((action, idx) => (
                  <p key={idx} className="text-xs text-gray-300">• {action}</p>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 bg-gray-700 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Example Lead Score</p>
              <p className="text-3xl font-bold text-white">{exampleScore}</p>
            </div>
            <div className={`px-4 py-2 rounded-lg ${getScoreColor(exampleScore)}`}>
              <Trophy className="h-6 w-6 text-white" />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Based on active rules with sample engagement
          </p>
        </div>
      </div>

      {/* General Settings */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-white mb-6">General Settings</h2>
        
        <div className="space-y-6">
          <div>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.scoring_enabled}
                onChange={(e) => setSettings({ ...settings, scoring_enabled: e.target.checked })}
                className="rounded border-gray-600 bg-gray-700 text-blue-500"
              />
              <div>
                <span className="text-white">Enable Lead Scoring</span>
                <p className="text-xs text-gray-400">
                  Automatically calculate scores for all leads
                </p>
              </div>
            </label>
          </div>

          <div>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.auto_assign_enabled}
                onChange={(e) => setSettings({ ...settings, auto_assign_enabled: e.target.checked })}
                className="rounded border-gray-600 bg-gray-700 text-blue-500"
              />
              <div>
                <span className="text-white">Auto-Assign Hot Leads</span>
                <p className="text-xs text-gray-400">
                  Automatically assign high-scoring leads to available staff
                </p>
              </div>
            </label>
          </div>

          {settings.auto_assign_enabled && (
            <div className="ml-7">
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Auto-Assign Threshold
              </label>
              <input
                type="number"
                value={settings.auto_assign_threshold}
                onChange={(e) => setSettings({ ...settings, auto_assign_threshold: parseInt(e.target.value) })}
                className="w-32 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                min="0"
                max="100"
              />
              <p className="text-xs text-gray-500 mt-1">
                Leads scoring above this will be auto-assigned
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Manager Notification Threshold
            </label>
            <input
              type="number"
              value={settings.notification_threshold}
              onChange={(e) => setSettings({ ...settings, notification_threshold: parseInt(e.target.value) })}
              className="w-32 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              min="0"
              max="100"
            />
            <p className="text-xs text-gray-500 mt-1">
              Notify managers when leads reach this score
            </p>
          </div>

          <div>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.decay_enabled}
                onChange={(e) => setSettings({ ...settings, decay_enabled: e.target.checked })}
                className="rounded border-gray-600 bg-gray-700 text-blue-500"
              />
              <div>
                <span className="text-white">Score Decay</span>
                <p className="text-xs text-gray-400">
                  Reduce scores over time for inactive leads
                </p>
              </div>
            </label>
          </div>

          {settings.decay_enabled && (
            <div className="ml-7 grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Decay After Days
                </label>
                <input
                  type="number"
                  value={settings.decay_days}
                  onChange={(e) => setSettings({ ...settings, decay_days: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  min="1"
                  max="90"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Decay Percentage
                </label>
                <input
                  type="number"
                  value={settings.decay_percentage}
                  onChange={(e) => setSettings({ ...settings, decay_percentage: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  min="1"
                  max="50"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Scoring Rules */}
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold text-white">Scoring Rules</h2>
          <button
            onClick={() => setShowAddRule(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Add Rule
          </button>
        </div>

        {/* Rules by Category */}
        {['engagement', 'interaction', 'profile', 'behavior'].map((category) => (
          <div key={category} className="mb-6">
            <h3 className="text-sm font-medium text-gray-400 mb-3 capitalize">
              {category} Rules
            </h3>
            <div className="space-y-2">
              {settings.rules
                .filter(rule => rule.category === category)
                .map((rule) => (
                  <div
                    key={rule.id}
                    className="flex items-center gap-4 p-3 bg-gray-700 rounded-lg"
                  >
                    <input
                      type="checkbox"
                      checked={rule.is_active}
                      onChange={() => handleToggleRule(rule.id)}
                      className="rounded border-gray-600 bg-gray-800 text-blue-500"
                    />
                    
                    <div className="p-2 bg-gray-600 rounded">
                      {getRuleIcon(rule.icon)}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white">{rule.name}</span>
                        <span className="px-2 py-0.5 bg-blue-900 text-blue-300 rounded text-xs">
                          +{rule.points} pts
                        </span>
                      </div>
                      <p className="text-xs text-gray-400">{rule.description}</p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingRule(rule)}
                        className="p-1 hover:bg-gray-600 rounded"
                      >
                        <Edit2 className="h-4 w-4 text-gray-400" />
                      </button>
                      <button
                        onClick={() => handleDeleteRule(rule.id)}
                        className="p-1 hover:bg-gray-600 rounded"
                      >
                        <Trash2 className="h-4 w-4 text-red-400" />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSaveSettings}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="h-4 w-4" />
          {saving ? 'Saving...' : 'Save Scoring Settings'}
        </button>
      </div>

      {/* Add Rule Modal */}
      {showAddRule && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-semibold text-white mb-4">Add Scoring Rule</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Rule Name *
                </label>
                <input
                  type="text"
                  value={newRule.name}
                  onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  placeholder="e.g., Completed Trial"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={newRule.description}
                  onChange={(e) => setNewRule({ ...newRule, description: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  placeholder="Brief description of the rule"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Category
                </label>
                <select
                  value={newRule.category}
                  onChange={(e) => setNewRule({ ...newRule, category: e.target.value as any })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                >
                  <option value="engagement">Engagement</option>
                  <option value="interaction">Interaction</option>
                  <option value="profile">Profile</option>
                  <option value="behavior">Behavior</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Points
                </label>
                <input
                  type="number"
                  value={newRule.points}
                  onChange={(e) => setNewRule({ ...newRule, points: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  min="1"
                  max="100"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleAddRule}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Add Rule
              </button>
              <button
                onClick={() => setShowAddRule(false)}
                className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Rule Modal */}
      {editingRule && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-semibold text-white mb-4">Edit Scoring Rule</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Points
                </label>
                <input
                  type="number"
                  value={editingRule.points}
                  onChange={(e) => setEditingRule({ ...editingRule, points: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  min="1"
                  max="100"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => handleUpdateRule(editingRule.id, { points: editingRule.points })}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Save Changes
              </button>
              <button
                onClick={() => setEditingRule(null)}
                className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}