'use client'

import { useState } from 'react'
import { CreditCard, Download, Calendar, CheckCircle, XCircle, Star, Zap, Crown, Shield, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface Plan {
  id: string
  name: string
  price: number
  interval: 'month' | 'year'
  features: string[]
  popular?: boolean
  current?: boolean
  limits: {
    members: number | string
    staff: number | string
    storage: string
    campaigns: number | string
    analytics: boolean
  }
}

interface Invoice {
  id: string
  date: string
  amount: number
  status: 'paid' | 'pending' | 'failed'
  description: string
  downloadUrl?: string
}

interface UsageMetric {
  name: string
  used: number
  limit: number | string
  unit: string
  percentage: number
}

const plans: Plan[] = [
  {
    id: 'starter',
    name: 'Starter',
    price: 29,
    interval: 'month',
    current: true,
    features: [
      'Up to 100 members',
      '2 staff accounts',
      'Basic reporting',
      'Email support',
      'Lead management',
      '5GB storage'
    ],
    limits: {
      members: 100,
      staff: 2,
      storage: '5GB',
      campaigns: 5,
      analytics: false
    }
  },
  {
    id: 'professional',
    name: 'Professional',
    price: 79,
    interval: 'month',
    popular: true,
    features: [
      'Up to 500 members',
      '10 staff accounts',
      'Advanced analytics',
      'Priority support',
      'Marketing automation',
      'AI insights',
      '50GB storage',
      'Custom integrations'
    ],
    limits: {
      members: 500,
      staff: 10,
      storage: '50GB',
      campaigns: 'Unlimited',
      analytics: true
    }
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 199,
    interval: 'month',
    features: [
      'Unlimited members',
      'Unlimited staff',
      'Custom analytics',
      '24/7 phone support',
      'White-label options',
      'Advanced AI features',
      '500GB storage',
      'Dedicated account manager',
      'Custom integrations',
      'SLA guarantee'
    ],
    limits: {
      members: 'Unlimited',
      staff: 'Unlimited',
      storage: '500GB',
      campaigns: 'Unlimited',
      analytics: true
    }
  }
]

const mockInvoices: Invoice[] = [
  {
    id: 'inv_001',
    date: '2024-01-01',
    amount: 29.00,
    status: 'paid',
    description: 'Starter Plan - January 2024',
    downloadUrl: '/invoices/inv_001.pdf'
  },
  {
    id: 'inv_002',
    date: '2024-02-01',
    amount: 29.00,
    status: 'paid',
    description: 'Starter Plan - February 2024',
    downloadUrl: '/invoices/inv_002.pdf'
  },
  {
    id: 'inv_003',
    date: '2024-03-01',
    amount: 29.00,
    status: 'pending',
    description: 'Starter Plan - March 2024'
  }
]

const mockUsage: UsageMetric[] = [
  {
    name: 'Active Members',
    used: 87,
    limit: 100,
    unit: 'members',
    percentage: 87
  },
  {
    name: 'Staff Accounts',
    used: 2,
    limit: 2,
    unit: 'accounts',
    percentage: 100
  },
  {
    name: 'Storage Used',
    used: 2.3,
    limit: 5,
    unit: 'GB',
    percentage: 46
  },
  {
    name: 'Monthly Campaigns',
    used: 4,
    limit: 5,
    unit: 'campaigns',
    percentage: 80
  }
]

export default function BillingPage() {
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false)
  const [showPaymentDialog, setShowPaymentDialog] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const currentPlan = plans.find(plan => plan.current)

  const handleUpgrade = (plan: Plan) => {
    setSelectedPlan(plan)
    setShowUpgradeDialog(true)
  }

  const handleUpdatePayment = () => {
    setShowPaymentDialog(true)
  }

  const handleDownloadInvoice = (invoice: Invoice) => {
    // Simulate download
    console.log(`Downloading invoice ${invoice.id}`)
  }

  const getStatusColor = (status: Invoice['status']) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'failed':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: Invoice['status']) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'pending':
        return <Calendar className="w-4 h-4 text-yellow-600" />
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-600" />
      default:
        return null
    }
  }

  const getPlanIcon = (planId: string) => {
    switch (planId) {
      case 'starter':
        return <Zap className="w-5 h-5" />
      case 'professional':
        return <Star className="w-5 h-5" />
      case 'enterprise':
        return <Crown className="w-5 h-5" />
      default:
        return <Shield className="w-5 h-5" />
    }
  }

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-600'
    if (percentage >= 75) return 'text-yellow-600'
    return 'text-green-600'
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Billing & Subscription</h1>
          <p className="text-gray-600">Manage your subscription and billing information</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={handleUpdatePayment}>
            <CreditCard className="w-4 h-4 mr-2" />
            Update Payment
          </Button>
        </div>
      </div>

      {/* Current Plan Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            {currentPlan && getPlanIcon(currentPlan.id)}
            <span>Current Plan: {currentPlan?.name}</span>
            {currentPlan?.popular && (
              <Badge className="bg-blue-100 text-blue-800">Popular</Badge>
            )}
          </CardTitle>
          <CardDescription>
            ${currentPlan?.price}/month • Next billing date: March 1, 2024
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {mockUsage.map((metric, index) => (
              <div key={index} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">{metric.name}</span>
                  <span className={`text-sm font-medium ${getUsageColor(metric.percentage)}`}>
                    {metric.used}{typeof metric.limit === 'number' && `/${metric.limit}`} {metric.unit}
                  </span>
                </div>
                <Progress 
                  value={metric.percentage} 
                  className={`h-2 ${metric.percentage >= 90 ? '[&>div]:bg-red-500' : metric.percentage >= 75 ? '[&>div]:bg-yellow-500' : ''}`}
                />
                {metric.percentage >= 90 && (
                  <p className="text-xs text-red-600 flex items-center">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Usage limit almost reached
                  </p>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="plans" className="space-y-6">
        <TabsList>
          <TabsTrigger value="plans">Plans</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="usage">Usage Details</TabsTrigger>
        </TabsList>

        <TabsContent value="plans" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <Card key={plan.id} className={`relative ${plan.popular ? 'border-blue-500 shadow-lg' : ''}`}>
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-blue-600 text-white">Most Popular</Badge>
                  </div>
                )}
                {plan.current && (
                  <div className="absolute -top-3 right-4">
                    <Badge className="bg-green-600 text-white">Current Plan</Badge>
                  </div>
                )}
                
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    {getPlanIcon(plan.id)}
                    <span>{plan.name}</span>
                  </CardTitle>
                  <CardDescription>
                    <div className="text-3xl font-bold text-gray-900">
                      ${plan.price}
                      <span className="text-sm font-normal text-gray-600">/{plan.interval}</span>
                    </div>
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <ul className="space-y-2">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center space-x-2">
                        <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                        <span className="text-sm text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <div className="pt-4">
                    {plan.current ? (
                      <Button className="w-full" variant="outline" disabled>
                        Current Plan
                      </Button>
                    ) : (
                      <Button
                        className={`w-full ${plan.popular ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
                        variant={plan.popular ? 'default' : 'outline'}
                        onClick={() => handleUpgrade(plan)}
                      >
                        {plan.price > (currentPlan?.price || 0) ? 'Upgrade' : 'Downgrade'}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Plan changes take effect immediately. You'll be charged a prorated amount for upgrades.
            </AlertDescription>
          </Alert>
        </TabsContent>

        <TabsContent value="invoices" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
              <CardDescription>
                View and download your billing history
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockInvoices.map((invoice) => (
                  <div key={invoice.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center space-x-4">
                      {getStatusIcon(invoice.status)}
                      <div>
                        <p className="font-medium text-gray-900">{invoice.description}</p>
                        <div className="flex items-center space-x-4 mt-1">
                          <span className="text-sm text-gray-600">
                            {new Date(invoice.date).toLocaleDateString()}
                          </span>
                          <Badge className={getStatusColor(invoice.status)}>
                            {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <span className="font-semibold text-gray-900">
                        ${invoice.amount.toFixed(2)}
                      </span>
                      {invoice.downloadUrl && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownloadInvoice(invoice)}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="usage" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {mockUsage.map((metric, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="text-lg">{metric.name}</CardTitle>
                  <CardDescription>
                    Current usage vs plan limits
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-gray-900">
                      {metric.used}
                      {typeof metric.limit === 'number' && (
                        <span className="text-lg font-normal text-gray-600">
                          /{metric.limit}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">{metric.unit}</p>
                  </div>
                  
                  {typeof metric.limit === 'number' && (
                    <>
                      <Progress value={metric.percentage} className="h-3" />
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>0</span>
                        <span>{metric.percentage}%</span>
                        <span>{metric.limit}</span>
                      </div>
                    </>
                  )}
                  
                  {metric.percentage >= 90 && (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        You're approaching your {metric.name.toLowerCase()} limit. Consider upgrading your plan.
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Upgrade Dialog */}
      <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Upgrade to {selectedPlan?.name}
            </DialogTitle>
            <DialogDescription>
              Confirm your plan upgrade and updated billing
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600">Current Plan</span>
                <span className="font-medium">{currentPlan?.name} - ${currentPlan?.price}/month</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">New Plan</span>
                <span className="font-medium">{selectedPlan?.name} - ${selectedPlan?.price}/month</span>
              </div>
            </div>
            
            <div className="border-t pt-4">
              <div className="flex justify-between items-center">
                <span className="font-semibold">Prorated Amount Due Today</span>
                <span className="text-lg font-bold">
                  ${selectedPlan ? Math.max(0, selectedPlan.price - (currentPlan?.price || 0)) : 0}
                </span>
              </div>
              <p className="text-xs text-gray-600 mt-1">
                You'll be charged the prorated difference for the remaining billing period
              </p>
            </div>
            
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                This is a development environment. No actual charges will be made.
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUpgradeDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => setShowUpgradeDialog(false)} disabled={isLoading}>
              {isLoading ? 'Processing...' : 'Confirm Upgrade'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Method Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Payment Method</DialogTitle>
            <DialogDescription>
              Update your billing information and payment method
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                This is a development environment. Payment method updates are simulated.
              </AlertDescription>
            </Alert>
            
            <div className="mt-4 space-y-4">
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <CreditCard className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="font-medium">**** **** **** 4242</p>
                    <p className="text-sm text-gray-600">Expires 12/25</p>
                  </div>
                </div>
              </div>
              
              <p className="text-sm text-gray-600">
                In a production environment, you would be redirected to a secure payment form to update your billing information.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => setShowPaymentDialog(false)}>
              Update Payment Method
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}