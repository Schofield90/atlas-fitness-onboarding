'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/app/lib/supabase/client'
import Button from '@/app/components/ui/Button'
import { Card } from '@/app/components/ui/Card'
import { Building2, Users, CreditCard, Check, Loader2 } from 'lucide-react'

interface OnboardingStep {
  id: string
  title: string
  description: string
  icon: any
  completed: boolean
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
        .from('user_organizations')
        .select('organization_id')
        .eq('user_id', user.id)
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
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No user found')
      
      // Create organization
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: organizationData.name,
          type: organizationData.type,
          phone: organizationData.phone,
          email: organizationData.email,
          address: organizationData.address
        })
        .select()
        .single()
      
      if (orgError) throw orgError
      
      // Add user as owner
      const { error: userOrgError } = await supabase
        .from('user_organizations')
        .insert({
          user_id: user.id,
          organization_id: org.id,
          role: 'owner',
          is_active: true
        })
      
      if (userOrgError) throw userOrgError
      
      // Create organization settings
      const { error: settingsError } = await supabase
        .from('organization_settings')
        .insert({
          organization_id: org.id,
          support_email: organizationData.email,
          support_phone: organizationData.phone
        })
      
      if (settingsError) throw settingsError
      
      setCurrentStep(1)
    } catch (error) {
      console.error('Error creating organization:', error)
      alert('Failed to create organization. Please try again.')
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
    router.push('/dashboard')
  }
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-600" />
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Welcome to Atlas Fitness Platform</h1>
          <p className="text-xl text-gray-600">Let's get your gym set up in just a few steps</p>
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
                    w-12 h-12 rounded-full flex items-center justify-center
                    ${isCompleted ? 'bg-green-500 text-white' : isActive ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-500'}
                  `}>
                    {isCompleted ? <Check className="h-6 w-6" /> : <Icon className="h-6 w-6" />}
                  </div>
                  <div className="ml-4">
                    <p className={`font-semibold ${isActive ? 'text-gray-900' : 'text-gray-500'}`}>
                      {step.title}
                    </p>
                    <p className="text-sm text-gray-500">{step.description}</p>
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-4 ${
                    isCompleted ? 'bg-green-500' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            )
          })}
        </div>
        
        {/* Step Content */}
        <Card className="p-8">
          {currentStep === 0 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold mb-6">Tell us about your gym</h2>
              
              <div>
                <label className="block text-sm font-medium mb-2">Organization Name</label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="Atlas Fitness Harrogate"
                  value={organizationData.name}
                  onChange={(e) => setOrganizationData({...organizationData, name: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Contact Email</label>
                <input
                  type="email"
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="hello@atlasfitness.com"
                  value={organizationData.email}
                  onChange={(e) => setOrganizationData({...organizationData, email: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Phone Number</label>
                <input
                  type="tel"
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="+44 1234 567890"
                  value={organizationData.phone}
                  onChange={(e) => setOrganizationData({...organizationData, phone: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Address</label>
                <textarea
                  className="w-full px-4 py-2 border rounded-lg"
                  rows={3}
                  placeholder="123 Fitness Street\nHarrogate\nHG1 2AB"
                  value={organizationData.address}
                  onChange={(e) => setOrganizationData({...organizationData, address: e.target.value})}
                />
              </div>
              
              <div className="flex justify-end">
                <Button
                  onClick={handleOrganizationSubmit}
                  disabled={!organizationData.name || !organizationData.email}
                >
                  Continue
                </Button>
              </div>
            </div>
          )}
          
          {currentStep === 1 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold mb-6">Choose your plan</h2>
              <p className="text-gray-600 mb-8">Start with a 14-day free trial. No credit card required.</p>
              
              <div className="grid md:grid-cols-3 gap-6">
                {plans.map((plan) => (
                  <div
                    key={plan.id}
                    className={`border rounded-lg p-6 cursor-pointer transition-all ${
                      selectedPlan === plan.slug
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedPlan(plan.slug)}
                  >
                    <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                    <p className="text-3xl font-bold mb-4">
                      £{(plan.price_monthly / 100).toFixed(0)}
                      <span className="text-sm font-normal text-gray-600">/month</span>
                    </p>
                    <ul className="space-y-2 text-sm">
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
                <Button variant="outline" onClick={() => setCurrentStep(0)}>
                  Back
                </Button>
                <div className="space-x-4">
                  <Button variant="outline" onClick={skipToApp}>
                    Skip for now
                  </Button>
                  <Button onClick={handlePlanSelection}>
                    Start Free Trial
                  </Button>
                </div>
              </div>
            </div>
          )}
          
          {currentStep === 2 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold mb-6">Invite your team</h2>
              <p className="text-gray-600 mb-8">Add staff members to help manage your gym. You can always do this later.</p>
              
              <div className="space-y-4">
                <div className="flex gap-4">
                  <input
                    type="email"
                    className="flex-1 px-4 py-2 border rounded-lg"
                    placeholder="team@example.com"
                  />
                  <select className="px-4 py-2 border rounded-lg">
                    <option value="admin">Admin</option>
                    <option value="staff">Staff</option>
                    <option value="viewer">Viewer</option>
                  </select>
                  <Button variant="outline">Add</Button>
                </div>
              </div>
              
              <div className="flex justify-between mt-8">
                <Button variant="outline" onClick={() => setCurrentStep(1)}>
                  Back
                </Button>
                <Button onClick={skipToApp}>
                  Continue to Dashboard
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}