'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/app/lib/supabase/client'
import { Shield, Key, Smartphone, Users, AlertTriangle, Check, X, Loader2 } from 'lucide-react'
import SettingsHeader from '@/app/components/settings/SettingsHeader'

export default function SecurityPage() {
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)
  const [sessions, setSessions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    fetchSecuritySettings()
    fetchActiveSessions()
  }, [])

  const fetchSecuritySettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // In a real app, you'd fetch 2FA status from user metadata or a settings table
      // For now, we'll simulate it
      setTwoFactorEnabled(false)
    } catch (error) {
      console.error('Error fetching security settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchActiveSessions = async () => {
    // In a real app, you'd fetch active sessions from your backend
    // For now, we'll simulate some data
    setSessions([
      {
        id: '1',
        device: 'Chrome on MacOS',
        ip: '192.168.1.1',
        location: 'London, UK',
        lastActive: new Date().toISOString(),
        current: true
      },
      {
        id: '2',
        device: 'Safari on iPhone',
        ip: '192.168.1.2',
        location: 'London, UK',
        lastActive: new Date(Date.now() - 3600000).toISOString(),
        current: false
      }
    ])
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      alert('New passwords do not match')
      return
    }

    if (passwordForm.newPassword.length < 8) {
      alert('Password must be at least 8 characters long')
      return
    }

    setSaving(true)
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordForm.newPassword
      })

      if (error) throw error

      alert('Password updated successfully!')
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch (error: any) {
      console.error('Error updating password:', error)
      alert(error.message || 'Failed to update password')
    } finally {
      setSaving(false)
    }
  }

  const handleEnable2FA = async () => {
    // In a real app, this would initiate 2FA setup
    alert('Two-factor authentication setup would open here')
    setTwoFactorEnabled(true)
  }

  const handleDisable2FA = async () => {
    if (!confirm('Are you sure you want to disable two-factor authentication? This will make your account less secure.')) {
      return
    }
    setTwoFactorEnabled(false)
  }

  const handleRevokeSession = async (sessionId: string) => {
    if (!confirm('Are you sure you want to sign out this device?')) return
    
    // In a real app, this would revoke the session
    setSessions(sessions.filter(s => s.id !== sessionId))
  }

  const getPasswordStrength = (password: string) => {
    if (!password) return { strength: 0, label: '', color: '' }
    
    let strength = 0
    if (password.length >= 8) strength++
    if (password.length >= 12) strength++
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++
    if (/[0-9]/.test(password)) strength++
    if (/[^A-Za-z0-9]/.test(password)) strength++

    const labels = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong']
    const colors = ['', 'bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500', 'bg-green-600']

    return {
      strength,
      label: labels[strength],
      color: colors[strength]
    }
  }

  const passwordStrength = getPasswordStrength(passwordForm.newPassword)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <SettingsHeader 
        title="Security"
        description="Manage your account security and access"
        icon={<Shield className="h-6 w-6" />}
      />

      {/* Change Password */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Key className="h-5 w-5" />
          Change Password
        </h3>
        
        <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Current Password
            </label>
            <input
              type="password"
              value={passwordForm.currentPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              New Password
            </label>
            <input
              type="password"
              value={passwordForm.newPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              required
            />
            {passwordForm.newPassword && (
              <div className="mt-2">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all ${passwordStrength.color}`}
                      style={{ width: `${(passwordStrength.strength / 5) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-400">{passwordStrength.label}</span>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Confirm New Password
            </label>
            <input
              type="password"
              value={passwordForm.confirmPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              required
            />
            {passwordForm.confirmPassword && passwordForm.newPassword && (
              <p className={`text-xs mt-1 ${
                passwordForm.newPassword === passwordForm.confirmPassword 
                  ? 'text-green-400' 
                  : 'text-red-400'
              }`}>
                {passwordForm.newPassword === passwordForm.confirmPassword 
                  ? '✓ Passwords match' 
                  : '✗ Passwords do not match'
                }
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>

      {/* Two-Factor Authentication */}
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              Two-Factor Authentication
            </h3>
            <p className="text-gray-400 text-sm">
              Add an extra layer of security to your account by requiring a verification code in addition to your password.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {twoFactorEnabled ? (
              <>
                <Check className="h-5 w-5 text-green-500" />
                <span className="text-green-500 text-sm">Enabled</span>
              </>
            ) : (
              <>
                <X className="h-5 w-5 text-gray-500" />
                <span className="text-gray-500 text-sm">Disabled</span>
              </>
            )}
          </div>
        </div>
        
        <div className="mt-4">
          {twoFactorEnabled ? (
            <button
              onClick={handleDisable2FA}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Disable 2FA
            </button>
          ) : (
            <button
              onClick={handleEnable2FA}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Enable 2FA
            </button>
          )}
        </div>
      </div>

      {/* Active Sessions */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Users className="h-5 w-5" />
          Active Sessions
        </h3>
        
        <div className="space-y-3">
          {sessions.map((session) => (
            <div key={session.id} className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
              <div>
                <p className="text-white font-medium">
                  {session.device}
                  {session.current && (
                    <span className="ml-2 text-xs px-2 py-1 bg-green-600 text-white rounded">Current</span>
                  )}
                </p>
                <p className="text-sm text-gray-400">
                  {session.location} • {session.ip}
                </p>
                <p className="text-xs text-gray-500">
                  Last active: {new Date(session.lastActive).toLocaleString()}
                </p>
              </div>
              {!session.current && (
                <button
                  onClick={() => handleRevokeSession(session.id)}
                  className="px-3 py-1 text-sm text-red-400 hover:text-red-300 hover:bg-gray-600 rounded"
                >
                  Sign Out
                </button>
              )}
            </div>
          ))}
        </div>
        
        <div className="mt-4 p-4 bg-yellow-600/20 border border-yellow-600 rounded-lg">
          <p className="text-sm text-yellow-400 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            If you notice any unfamiliar devices or locations, sign them out immediately and change your password.
          </p>
        </div>
      </div>

      {/* Security Tips */}
      <div className="bg-gray-900 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-400 mb-2">Security Best Practices</h4>
        <ul className="space-y-1 text-xs text-gray-500">
          <li>• Use a strong, unique password that you don't use on other sites</li>
          <li>• Enable two-factor authentication for maximum security</li>
          <li>• Regularly review your active sessions and sign out unfamiliar devices</li>
          <li>• Be cautious of phishing emails asking for your login credentials</li>
          <li>• Keep your browser and operating system up to date</li>
        </ul>
      </div>
    </div>
  )
}