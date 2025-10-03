'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/app/lib/supabase/client'
import SetupWizard from '@/app/components/settings/sms/SetupWizard'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface RegulatoryBundle {
  id: string
  bundle_status: string
  business_info: any
  documents: any[]
  use_cases: any[]
}

export default function SMSSetupPage() {
  const [loading, setLoading] = useState(true)
  const [existingBundle, setExistingBundle] = useState<RegulatoryBundle | null>(null)
  const [organizationId, setOrganizationId] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadExistingData()
  }, [])

  const loadExistingData = async () => {
    try {
      // Get current user and organization
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data: userOrg } = await supabase
        .from('user_organizations')
        .select('organization_id, role')
        .eq('user_id', user.id)
        .single()

      if (!userOrg) {
        router.push('/dashboard')
        return
      }

      // Check if user has admin permissions
      if (!['owner', 'admin'].includes(userOrg.role)) {
        router.push('/settings/sms')
        return
      }

      setOrganizationId(userOrg.organization_id)

      // Load existing regulatory bundle
      const { data: bundleData } = await supabase
        .from('regulatory_bundles')
        .select('*')
        .eq('organization_id', userOrg.organization_id)
        .single()

      setExistingBundle(bundleData)

    } catch (error) {
      console.error('Error loading setup data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSetupComplete = () => {
    router.push('/settings/sms')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (!organizationId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Access Denied</h1>
          <p className="text-gray-400 mb-6">You don't have permission to set up SMS services.</p>
          <Link
            href="/settings/sms"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to SMS Settings
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/settings/sms"
            className="inline-flex items-center text-gray-400 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to SMS Settings
          </Link>
          
          <div className="text-center">
            <h1 className="text-3xl font-bold text-white mb-2">
              UK SMS Service Setup
            </h1>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Complete the setup process to get your UK phone number and start sending SMS messages 
              in compliance with UK regulations.
            </p>
          </div>
        </div>

        {/* Progress and Info */}
        <div className="mb-8 grid md:grid-cols-3 gap-4">
          <div className="bg-gray-800 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-blue-400 mb-1">5-10</div>
            <div className="text-sm text-gray-400">Minutes to complete</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-400 mb-1">1-3</div>
            <div className="text-sm text-gray-400">Business days for approval</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-purple-400 mb-1">FREE</div>
            <div className="text-sm text-gray-400">Setup and approval</div>
          </div>
        </div>

        {/* Setup Wizard */}
        <div className="bg-gray-800 rounded-lg shadow-xl">
          <SetupWizard
            organizationId={organizationId}
            existingBundle={existingBundle}
            onComplete={handleSetupComplete}
          />
        </div>

        {/* Help Section */}
        <div className="mt-8 bg-blue-900/20 border border-blue-700 rounded-lg p-6">
          <h3 className="text-lg font-medium text-blue-300 mb-3">Need Help?</h3>
          <div className="space-y-2 text-sm text-blue-200">
            <p>• Ensure you have your business registration documents ready</p>
            <p>• Your business must be registered in the UK for compliance</p>
            <p>• The approval process typically takes 1-3 business days</p>
            <p>• You can save your progress and return later if needed</p>
          </div>
          <div className="mt-4">
            <Link
              href="/help/sms-setup"
              className="text-blue-400 hover:text-blue-300 underline"
            >
              View detailed setup guide →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}