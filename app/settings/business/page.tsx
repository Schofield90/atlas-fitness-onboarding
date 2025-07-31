'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/app/lib/supabase/client'
import SettingsHeader from '@/app/components/settings/SettingsHeader'
import BusinessInformationForm from '@/app/components/settings/business/BusinessInformationForm'
import BusinessHoursForm from '@/app/components/settings/business/BusinessHoursForm'
import ContactInformationForm from '@/app/components/settings/business/ContactInformationForm'
import BrandingForm from '@/app/components/settings/business/BrandingForm'

export default function BusinessProfilePage() {
  const [settings, setSettings] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    fetchSettings()
  }, [])

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

      const { data: settings } = await supabase
        .from('organization_settings')
        .select('*')
        .eq('organization_id', userOrg.organization_id)
        .single()

      if (settings) {
        setSettings(settings)
      } else {
        // Create default settings if none exist
        const { data: newSettings } = await supabase
          .from('organization_settings')
          .insert({
            organization_id: userOrg.organization_id,
            business_name: 'My Gym',
          })
          .select()
          .single()
        
        setSettings(newSettings)
      }
    } catch (error) {
      console.error('Error fetching settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateSettings = async (updates: any) => {
    try {
      const { data, error } = await supabase
        .from('organization_settings')
        .update(updates)
        .eq('id', settings.id)
        .select()
        .single()

      if (error) throw error
      
      setSettings(data)
      return { success: true }
    } catch (error) {
      console.error('Error updating settings:', error)
      return { success: false, error }
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-400">Loading settings...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <SettingsHeader 
        title="Business Profile"
        description="Manage your business information and branding"
      />
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BusinessInformationForm settings={settings} onUpdate={updateSettings} />
        <ContactInformationForm settings={settings} onUpdate={updateSettings} />
        <BusinessHoursForm settings={settings} onUpdate={updateSettings} />
        <BrandingForm settings={settings} onUpdate={updateSettings} />
      </div>
    </div>
  )
}