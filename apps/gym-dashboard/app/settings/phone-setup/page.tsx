'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/app/lib/supabase/client'
import SettingsHeader from '@/app/components/settings/SettingsHeader'
import { 
  Phone, Search, CreditCard, Key, MessageCircle, CheckCircle, 
  AlertCircle, ArrowRight, HelpCircle, Loader2, ExternalLink,
  Building, User, DollarSign, Clock, Shield, Zap
} from 'lucide-react'
import PhoneSetupAssistant from '@/app/components/phone/PhoneSetupAssistant'
import NumberSearchModal from '@/app/components/phone/NumberSearchModal'
import TwilioCredentialsModal from '@/app/components/phone/TwilioCredentialsModal'

type SetupMethod = 'none' | 'provision' | 'external'
type SetupStep = 'choose' | 'configure' | 'complete'

interface PhoneConfig {
  method: SetupMethod
  twilioAccountSid?: string
  twilioAuthToken?: string
  phoneNumber?: string
  phoneSid?: string
  isExternalAccount: boolean
  monthlyCharge?: number
  capabilities?: string[]
}

export default function PhoneSetupPage() {
  const [setupMethod, setSetupMethod] = useState<SetupMethod>('none')
  const [currentStep, setCurrentStep] = useState<SetupStep>('choose')
  const [phoneConfig, setPhoneConfig] = useState<PhoneConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAssistant, setShowAssistant] = useState(true)
  const [showNumberSearch, setShowNumberSearch] = useState(false)
  const [showCredentialsModal, setShowCredentialsModal] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    checkExistingSetup()
  }, [])

  const checkExistingSetup = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: userOrg } = await supabase
        .from('user_organizations')
        .select('organization_id')
        .eq('user_id', user.id)
        .single()

      if (!userOrg) return

      // Check for existing phone configuration
      const { data: phoneData } = await supabase
        .from('phone_configurations')
        .select('*')
        .eq('organization_id', userOrg.organization_id)
        .single()

      if (phoneData) {
        setPhoneConfig(phoneData)
        setCurrentStep('complete')
        setSetupMethod(phoneData.isExternalAccount ? 'external' : 'provision')
      }
    } catch (error) {
      console.error('Error checking existing setup:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleMethodSelection = (method: SetupMethod) => {
    setSetupMethod(method)
    if (method === 'provision') {
      setShowNumberSearch(true)
    } else if (method === 'external') {
      setShowCredentialsModal(true)
    }
  }

  const handleNumberProvisioned = async (phoneData: any) => {
    setPhoneConfig({
      method: 'provision',
      phoneNumber: phoneData.phoneNumber,
      phoneSid: phoneData.sid,
      isExternalAccount: false,
      monthlyCharge: phoneData.price,
      capabilities: phoneData.capabilities
    })
    setShowNumberSearch(false)
    setCurrentStep('complete')
  }

  const handleCredentialsSaved = async (credentials: any) => {
    setPhoneConfig({
      method: 'external',
      twilioAccountSid: credentials.accountSid,
      twilioAuthToken: credentials.authToken,
      phoneNumber: credentials.selectedNumber,
      isExternalAccount: true
    })
    setShowCredentialsModal(false)
    setCurrentStep('complete')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <SettingsHeader 
        title="Phone Number Setup"
        description="Choose how you want to manage phone communications for your gym"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {currentStep === 'choose' && (
            <>
              {/* Setup Method Selection */}
              <div className="bg-gray-800 rounded-lg p-6">
                <h2 className="text-xl font-semibold text-white mb-6">
                  Choose Your Setup Method
                </h2>
                
                <div className="grid md:grid-cols-2 gap-4">
                  {/* In-App Provisioning Option */}
                  <button
                    onClick={() => handleMethodSelection('provision')}
                    className="text-left p-6 bg-gray-700 rounded-lg hover:bg-gray-600 transition-all border-2 border-transparent hover:border-orange-500 group"
                  >
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-orange-600 rounded-lg group-hover:bg-orange-500">
                        <Zap className="h-6 w-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-white mb-2">
                          Quick Setup (Recommended)
                        </h3>
                        <p className="text-sm text-gray-300 mb-3">
                          Get a phone number instantly through our platform. 
                          We handle all the technical setup for you.
                        </p>
                        
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-xs text-green-400">
                            <CheckCircle className="h-3 w-3" />
                            <span>Set up in 2 minutes</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-green-400">
                            <CheckCircle className="h-3 w-3" />
                            <span>No technical knowledge required</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-green-400">
                            <CheckCircle className="h-3 w-3" />
                            <span>Instant activation</span>
                          </div>
                        </div>

                        <div className="mt-3 pt-3 border-t border-gray-600">
                          <p className="text-xs text-gray-400">
                            Starting from £10/month
                          </p>
                        </div>
                      </div>
                    </div>
                  </button>

                  {/* External Twilio Option */}
                  <button
                    onClick={() => handleMethodSelection('external')}
                    className="text-left p-6 bg-gray-700 rounded-lg hover:bg-gray-600 transition-all border-2 border-transparent hover:border-blue-500 group"
                  >
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-blue-600 rounded-lg group-hover:bg-blue-500">
                        <Key className="h-6 w-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-white mb-2">
                          Use Your Own Twilio Account
                        </h3>
                        <p className="text-sm text-gray-300 mb-3">
                          Connect your existing Twilio account or create a new one. 
                          You have full control over your phone numbers.
                        </p>
                        
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-xs text-blue-400">
                            <CheckCircle className="h-3 w-3" />
                            <span>Full control & ownership</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-blue-400">
                            <CheckCircle className="h-3 w-3" />
                            <span>Direct Twilio pricing</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-blue-400">
                            <CheckCircle className="h-3 w-3" />
                            <span>Advanced features access</span>
                          </div>
                        </div>

                        <div className="mt-3 pt-3 border-t border-gray-600">
                          <p className="text-xs text-gray-400">
                            Requires Twilio account
                          </p>
                        </div>
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Comparison Table */}
              <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4">
                  Compare Setup Methods
                </h3>
                
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left py-3 text-gray-400 font-medium">Feature</th>
                        <th className="text-center py-3 text-orange-400 font-medium">Quick Setup</th>
                        <th className="text-center py-3 text-blue-400 font-medium">Own Twilio</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      <tr className="border-b border-gray-700">
                        <td className="py-3 text-gray-300">Setup Time</td>
                        <td className="text-center py-3 text-green-400">2 minutes</td>
                        <td className="text-center py-3 text-yellow-400">10-15 minutes</td>
                      </tr>
                      <tr className="border-b border-gray-700">
                        <td className="py-3 text-gray-300">Technical Knowledge</td>
                        <td className="text-center py-3 text-green-400">None required</td>
                        <td className="text-center py-3 text-yellow-400">Basic required</td>
                      </tr>
                      <tr className="border-b border-gray-700">
                        <td className="py-3 text-gray-300">Monthly Cost</td>
                        <td className="text-center py-3">From £10</td>
                        <td className="text-center py-3">Variable (Twilio rates)</td>
                      </tr>
                      <tr className="border-b border-gray-700">
                        <td className="py-3 text-gray-300">Number Ownership</td>
                        <td className="text-center py-3">Platform manages</td>
                        <td className="text-center py-3">You own directly</td>
                      </tr>
                      <tr className="border-b border-gray-700">
                        <td className="py-3 text-gray-300">Support</td>
                        <td className="text-center py-3 text-green-400">Full support</td>
                        <td className="text-center py-3">Self-service + docs</td>
                      </tr>
                      <tr>
                        <td className="py-3 text-gray-300">Best For</td>
                        <td className="text-center py-3 text-gray-400">Most gyms</td>
                        <td className="text-center py-3 text-gray-400">Tech-savvy owners</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {currentStep === 'complete' && phoneConfig && (
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-green-600 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white">
                    Phone Setup Complete
                  </h2>
                  <p className="text-sm text-gray-400">
                    Your phone number is ready to use
                  </p>
                </div>
              </div>

              <div className="bg-gray-700 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-gray-400">Phone Number</span>
                  <span className="text-white font-mono text-lg">
                    {phoneConfig.phoneNumber || 'Configuring...'}
                  </span>
                </div>
                
                {phoneConfig.capabilities && (
                  <div className="flex gap-2 pt-3 border-t border-gray-600">
                    {phoneConfig.capabilities.map((cap) => (
                      <span key={cap} className="px-2 py-1 bg-gray-600 rounded text-xs text-gray-300">
                        {cap}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <a
                  href="/settings/phone"
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                >
                  <Settings className="h-4 w-4" />
                  Configure Settings
                </a>
                
                <a
                  href="/settings/phone-setup"
                  onClick={(e) => {
                    e.preventDefault()
                    setCurrentStep('choose')
                    setPhoneConfig(null)
                  }}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
                >
                  Change Setup
                </a>
              </div>
            </div>
          )}
        </div>

        {/* AI Assistant Sidebar */}
        <div className="lg:col-span-1">
          <PhoneSetupAssistant 
            isOpen={showAssistant}
            onClose={() => setShowAssistant(false)}
            currentStep={currentStep}
            setupMethod={setupMethod}
          />
        </div>
      </div>

      {/* Modals */}
      {showNumberSearch && (
        <NumberSearchModal
          isOpen={showNumberSearch}
          onClose={() => setShowNumberSearch(false)}
          onNumberSelected={handleNumberProvisioned}
        />
      )}

      {showCredentialsModal && (
        <TwilioCredentialsModal
          isOpen={showCredentialsModal}
          onClose={() => setShowCredentialsModal(false)}
          onCredentialsSaved={handleCredentialsSaved}
        />
      )}
    </div>
  )
}