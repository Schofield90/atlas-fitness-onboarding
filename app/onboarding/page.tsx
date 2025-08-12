'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/app/lib/supabase/client'
import Button from '@/app/components/ui/Button'
import { Card } from '@/app/components/ui/Card'
import { Building2, Users, CreditCard, Check, Loader2, Dumbbell } from 'lucide-react'

interface OnboardingStep {
  id: string
  title: string
  description: string
  icon: any
  completed: boolean
}

interface TeamMember {
  email: string
  role: 'admin' | 'staff' | 'viewer'
}

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [currentStep, setCurrentStep] = useState(0)
  const [organizationData, setOrganizationData] = useState({
    name: '',
    type: 'gym',
    phone: '',
    email: '',
    address: ''
  })
  const [selectedPlan, setSelectedPlan] = useState('starter')
  const [plans, setPlans] = useState<any[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [newMemberEmail, setNewMemberEmail] = useState('')
  const [newMemberRole, setNewMemberRole] = useState<'admin' | 'staff' | 'viewer'>('staff')
  
  const steps: OnboardingStep[] = [
    {
      id: 'organization',
      title: 'Organization Details',
      description: 'Tell us about your gym',
      icon: Building2,
      completed: false
    },
    {
      id: 'plan',
      title: 'Choose Your Plan',
      description: 'Select the best plan for your needs',
      icon: CreditCard,
      completed: false
    },
    {
      id: 'team',
      title: 'Invite Your Team',
      description: 'Add staff members to your organization',
      icon: Users,
      completed: false
    }
  ]
  
  useEffect(() => {
    checkExistingOrganization()
    fetchPlans()
  }, [])
  
  const checkExistingOrganization = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }
      
      // Check if user already has an organization
      const { data: userOrg } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single()
      
      if (userOrg) {
        // User already has an organization, redirect to dashboard
        router.push('/dashboard')
        return
      }
      
      setLoading(false)
    } catch (error) {
      console.error('Error checking organization:', error)
      setLoading(false)
    }
  }
  
  const fetchPlans = async () => {
    try {
      const { data } = await supabase
        .from('saas_plans')
        .select('*')
        .eq('is_active', true)
        .order('price_monthly', { ascending: true })
      
      if (data) setPlans(data)
    } catch (error) {
      console.error('Error fetching plans:', error)
    }
  }
  
  const handleOrganizationSubmit = async () => {
    try {
      setLoading(true)
      
      // Import the server action
      const { createOrganization } = await import('@/app/actions/organization')
      
      // Call the server action
      const result = await createOrganization(organizationData)
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to create organization')
      }
      
      // Successfully created organization, move to next step
      setCurrentStep(1)
    } catch (error: any) {
      console.error('Error creating organization:', error)
      alert(`Failed to create organization: ${error.message || 'Please try again.'}`)
    } finally {
      setLoading(false)
    }
  }
  
  const handlePlanSelection = async () => {
    try {
      setLoading(true)
      
      // Get the selected plan
      const plan = plans.find(p => p.slug === selectedPlan)
      if (!plan) throw new Error('Invalid plan selected')
      
      // Create checkout session
      const response = await fetch('/api/saas/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: plan.id })
      })
      
      if (!response.ok) throw new Error('Failed to create checkout session')
      
      const { sessionId } = await response.json()
      
      // Redirect to Stripe Checkout
      const stripe = await import('@stripe/stripe-js').then(m => m.loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!))
      if (!stripe) throw new Error('Stripe not loaded')
      
      const { error } = await stripe.redirectToCheckout({ sessionId })
      if (error) throw error
    } catch (error) {
      console.error('Error selecting plan:', error)
      alert('Failed to process plan selection. Please try again.')
      setLoading(false)
    }
  }
  
  const skipToApp = () => {
    router.push('/dashboard/overview')
  }
  
  const addTeamMember = () => {
    if (!newMemberEmail || !validateEmail(newMemberEmail)) {
      alert('Please enter a valid email address')
      return
    }
    
    if (teamMembers.some(m => m.email === newMemberEmail)) {
      alert('This email has already been added')
      return
    }
    
    setTeamMembers([...teamMembers, { email: newMemberEmail, role: newMemberRole }])
    setNewMemberEmail('')
    setNewMemberRole('staff')
  }
  
  const removeTeamMember = (email: string) => {
    setTeamMembers(teamMembers.filter(m => m.email !== email))
  }
  
  const inviteTeamMembers = async () => {
    if (teamMembers.length === 0) {
      skipToApp()
      return
    }
    
    try {
      setLoading(true)
      
      // Send invitations
      const response = await fetch('/api/staff/invite-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ members: teamMembers })
      })
      
      if (!response.ok) {
        throw new Error('Failed to send invitations')
      }
      
      // Continue to dashboard
      router.push('/dashboard/overview?onboarding=complete')
    } catch (error) {
      console.error('Error inviting team:', error)
      // Continue anyway
      skipToApp()
    } finally {
      setLoading(false)
    }
  }
  
  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-8">
            <Dumbbell className="h-12 w-12 text-orange-500 mr-3" />
            <h1 className="text-5xl font-bold text-orange-500">GymLeadHub</h1>
          </div>
          <h2 className="text-3xl font-bold mb-4 text-white">Welcome to Your All-in-One Fitness CRM</h2>
          <p className="text-xl text-gray-400">Let's get your gym set up in just a few steps</p>
        </div>
        
        {/* Progress Steps */}
        <div className="flex justify-between mb-12">
          {steps.map((step, index) => {
            const Icon = step.icon
            const isActive = index === currentStep
            const isCompleted = index < currentStep
            
            return (
              <div key={step.id} className="flex items-center flex-1">
                <div className="flex items-center">
                  <div className={`
                    w-12 h-12 rounded-full flex items-center justify-center transition-all
                    ${isCompleted ? 'bg-green-500 text-white' : isActive ? 'bg-orange-500 text-white' : 'bg-gray-700 text-gray-400'}
                  `}>
                    {isCompleted ? <Check className="h-6 w-6" /> : <Icon className="h-6 w-6" />}
                  </div>
                  <div className="ml-4">
                    <p className={`font-semibold ${isActive ? 'text-white' : 'text-gray-400'}`}>
                      {step.title}
                    </p>
                    <p className="text-sm text-gray-500">{step.description}</p>
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-4 ${
                    isCompleted ? 'bg-green-500' : 'bg-gray-700'
                  }`} />
                )}
              </div>
            )
          })}
        </div>
        
        {/* Step Content */}
        <Card className="p-8 bg-gray-800 border-gray-700">
          {currentStep === 0 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold mb-6 text-white">Tell us about your gym</h2>
              
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">Organization Name</label>
                <input
                  type="text"
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                  placeholder="GymLeadHub Harrogate"
                  value={organizationData.name}
                  onChange={(e) => setOrganizationData({...organizationData, name: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">Contact Email</label>
                <input
                  type="email"
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                  placeholder="hello@gymleadhub.com"
                  value={organizationData.email}
                  onChange={(e) => setOrganizationData({...organizationData, email: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">Phone Number</label>
                <input
                  type="tel"
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                  placeholder="+44 1234 567890"
                  value={organizationData.phone}
                  onChange={(e) => setOrganizationData({...organizationData, phone: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">Address</label>
                <textarea
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                  rows={3}
                  placeholder="123 Fitness Street\nHarrogate\nHG1 2AB"
                  value={organizationData.address}
                  onChange={(e) => setOrganizationData({...organizationData, address: e.target.value})}
                />
              </div>
              
              <div className="flex justify-end">
                <button
                  onClick={handleOrganizationSubmit}
                  disabled={!organizationData.name || !organizationData.email}
                  className="px-6 py-3 bg-orange-500 text-white font-semibold rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Continue
                </button>
              </div>
            </div>
          )}
          
          {currentStep === 1 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold mb-6 text-white">Choose your plan</h2>
              <p className="text-gray-400 mb-8">Start with a 14-day free trial. No credit card required.</p>
              
              <div className="grid md:grid-cols-3 gap-6">
                {plans.map((plan) => (
                  <div
                    key={plan.id}
                    className={`border-2 rounded-lg p-6 cursor-pointer transition-all ${
                      selectedPlan === plan.slug
                        ? 'border-orange-500 bg-orange-500/10'
                        : 'border-gray-600 hover:border-gray-500 bg-gray-800/50'
                    }`}
                    onClick={() => setSelectedPlan(plan.slug)}
                  >
                    <h3 className="text-xl font-bold mb-2 text-white">{plan.name}</h3>
                    <p className="text-3xl font-bold mb-4 text-white">
                      £{(plan.price_monthly / 100).toFixed(0)}
                      <span className="text-sm font-normal text-gray-400">/month</span>
                    </p>
                    <ul className="space-y-2 text-sm text-gray-300">
                      <li>✓ {plan.features.staff_accounts === -1 ? 'Unlimited' : plan.features.staff_accounts} staff accounts</li>
                      <li>✓ {plan.features.monthly_bookings === -1 ? 'Unlimited' : plan.features.monthly_bookings} bookings/month</li>
                      <li>✓ {plan.features.sms_credits} SMS credits</li>
                      <li>✓ {plan.features.email_credits} email credits</li>
                      {plan.features.api_access && <li>✓ API access</li>}
                      {plan.features.white_label && <li>✓ White label branding</li>}
                    </ul>
                  </div>
                ))}
              </div>
              
              <div className="flex justify-between">
                <button
                  onClick={() => setCurrentStep(0)}
                  className="px-6 py-3 border border-gray-600 text-gray-300 font-semibold rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Back
                </button>
                <div className="space-x-4">
                  <button
                    onClick={skipToApp}
                    className="px-6 py-3 border border-gray-600 text-gray-300 font-semibold rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Skip for now
                  </button>
                  <button
                    onClick={handlePlanSelection}
                    className="px-6 py-3 bg-orange-500 text-white font-semibold rounded-lg hover:bg-orange-600 transition-colors"
                  >
                    Start Free Trial
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {currentStep === 2 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold mb-6 text-white">Invite your team</h2>
              <p className="text-gray-400 mb-8">Add staff members to help manage your gym. You can always do this later.</p>
              
              <div className="space-y-4">
                <div className="flex gap-4">
                  <input
                    type="email"
                    className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                    placeholder="team@example.com"
                    value={newMemberEmail}
                    onChange={(e) => setNewMemberEmail(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addTeamMember()}
                  />
                  <select 
                    className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                    value={newMemberRole}
                    onChange={(e) => setNewMemberRole(e.target.value as 'admin' | 'staff' | 'viewer')}
                  >
                    <option value="admin">Admin</option>
                    <option value="staff">Staff</option>
                    <option value="viewer">Viewer</option>
                  </select>
                  <button
                    onClick={addTeamMember}
                    className="px-6 py-2 border border-gray-600 text-gray-300 font-semibold rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Add
                  </button>
                </div>
                
                {/* Team member list */}
                {teamMembers.length > 0 && (
                  <div className="mt-6 space-y-2">
                    <h3 className="font-medium text-sm text-gray-300">Team members to invite:</h3>
                    {teamMembers.map((member) => (
                      <div key={member.email} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                        <div>
                          <p className="font-medium text-white">{member.email}</p>
                          <p className="text-sm text-gray-400 capitalize">{member.role}</p>
                        </div>
                        <button
                          onClick={() => removeTeamMember(member.email)}
                          className="text-red-400 hover:text-red-300 text-sm transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Role descriptions */}
                <div className="mt-6 p-4 bg-gray-700/30 rounded-lg border border-gray-600">
                  <h4 className="font-medium text-sm mb-2 text-white">Role Permissions:</h4>
                  <ul className="text-sm text-gray-300 space-y-1">
                    <li><strong className="text-orange-400">Admin:</strong> Full access to all features and settings</li>
                    <li><strong className="text-orange-400">Staff:</strong> Manage members, bookings, and messages</li>
                    <li><strong className="text-orange-400">Viewer:</strong> Read-only access to reports and data</li>
                  </ul>
                </div>
              </div>
              
              <div className="flex justify-between mt-8">
                <button
                  onClick={() => setCurrentStep(1)}
                  className="px-6 py-3 border border-gray-600 text-gray-300 font-semibold rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Back
                </button>
                <div className="space-x-4">
                  <button
                    onClick={skipToApp}
                    className="px-6 py-3 border border-gray-600 text-gray-300 font-semibold rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Skip for now
                  </button>
                  <button 
                    onClick={inviteTeamMembers}
                    disabled={loading}
                    className="px-6 py-3 bg-orange-500 text-white font-semibold rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Sending invites...
                      </>
                    ) : (
                      teamMembers.length > 0 
                        ? `Send ${teamMembers.length} invitation${teamMembers.length > 1 ? 's' : ''}`
                        : 'Continue to Dashboard'
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}