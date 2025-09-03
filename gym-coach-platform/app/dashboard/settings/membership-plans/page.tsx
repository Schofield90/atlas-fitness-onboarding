'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Plus, Edit, Trash2, DollarSign, Users, Clock, Star, AlertCircle } from 'lucide-react'
import { toast } from 'react-hot-toast'

interface MembershipPlan {
  id: string
  organization_id: string
  name: string
  description: string | null
  price_pennies: number
  currency: string
  billing_cycle: 'monthly' | 'quarterly' | 'yearly' | 'one-time'
  trial_days: number
  is_active: boolean
  features: string[]
  max_members: number | null
  includes_personal_training: boolean
  includes_classes: boolean
  includes_nutrition: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export default function MembershipPlansPage() {
  const [plans, setPlans] = useState<MembershipPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [editingPlan, setEditingPlan] = useState<MembershipPlan | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  useEffect(() => {
    loadPlans()
  }, [])

  const loadPlans = async () => {
    try {
      const response = await fetch('/api/membership-plans')
      if (response.ok) {
        const data = await response.json()
        setPlans(data.plans || [])
      } else {
        toast.error('Failed to load membership plans')
      }
    } catch (error) {
      console.error('Error loading plans:', error)
      toast.error('Error loading membership plans')
    } finally {
      setLoading(false)
    }
  }

  const getDefaultPlan = (): Partial<MembershipPlan> => ({
    name: '',
    description: '',
    price_pennies: 0,
    currency: 'GBP',
    billing_cycle: 'monthly',
    trial_days: 0,
    is_active: true,
    features: [],
    max_members: null,
    includes_personal_training: false,
    includes_classes: true,
    includes_nutrition: false,
    sort_order: plans.length
  })

  const formatPrice = (pricePennies: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 2,
    }).format(pricePennies / 100)
  }

  const getBillingCycleLabel = (cycle: string) => {
    const labels = {
      monthly: 'per month',
      quarterly: 'per quarter',
      yearly: 'per year',
      'one-time': 'one-time'
    }
    return labels[cycle as keyof typeof labels] || cycle
  }

  const handleCreatePlan = () => {
    setEditingPlan(getDefaultPlan() as MembershipPlan)
    setIsDialogOpen(true)
  }

  const handleEditPlan = (plan: MembershipPlan) => {
    setEditingPlan({ ...plan })
    setIsDialogOpen(true)
  }

  const handleSavePlan = async () => {
    if (!editingPlan) return

    try {
      const isNew = !editingPlan.id
      const url = isNew ? '/api/membership-plans' : `/api/membership-plans/${editingPlan.id}`
      const method = isNew ? 'POST' : 'PUT'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editingPlan)
      })

      if (response.ok) {
        toast.success(isNew ? 'Plan created successfully' : 'Plan updated successfully')
        setIsDialogOpen(false)
        setEditingPlan(null)
        loadPlans()
      } else {
        const error = await response.json()
        toast.error(error.message || 'Failed to save plan')
      }
    } catch (error) {
      console.error('Error saving plan:', error)
      toast.error('Error saving plan')
    }
  }

  const handleDeletePlan = async (planId: string) => {
    if (!confirm('Are you sure you want to delete this membership plan? This cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`/api/membership-plans/${planId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast.success('Plan deleted successfully')
        loadPlans()
      } else {
        const error = await response.json()
        toast.error(error.message || 'Failed to delete plan')
      }
    } catch (error) {
      console.error('Error deleting plan:', error)
      toast.error('Error deleting plan')
    }
  }

  const updateEditingPlan = (updates: Partial<MembershipPlan>) => {
    if (editingPlan) {
      setEditingPlan({ ...editingPlan, ...updates })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Membership Plans</h1>
          <p className="text-gray-600 mt-1">
            Create and manage your gym's membership offerings
          </p>
        </div>
        <Button onClick={handleCreatePlan}>
          <Plus className="w-4 h-4 mr-2" />
          Add Plan
        </Button>
      </div>

      {plans.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <DollarSign className="w-16 h-16 text-gray-300 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No membership plans yet</h3>
            <p className="text-gray-600 text-center mb-6 max-w-md">
              Create your first membership plan to start managing member subscriptions and pricing.
            </p>
            <Button onClick={handleCreatePlan}>
              <Plus className="w-4 h-4 mr-2" />
              Create First Plan
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <Card key={plan.id} className="relative overflow-hidden">
              {!plan.is_active && (
                <div className="absolute top-4 right-4">
                  <Badge variant="secondary">Inactive</Badge>
                </div>
              )}
              
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl">{plan.name}</CardTitle>
                    {plan.description && (
                      <CardDescription className="mt-2">
                        {plan.description}
                      </CardDescription>
                    )}
                  </div>
                </div>
                
                <div className="flex items-baseline space-x-2">
                  <span className="text-3xl font-bold text-green-600">
                    {formatPrice(plan.price_pennies)}
                  </span>
                  <span className="text-sm text-gray-500">
                    {getBillingCycleLabel(plan.billing_cycle)}
                  </span>
                </div>
                
                {plan.trial_days > 0 && (
                  <Badge variant="outline" className="w-fit">
                    {plan.trial_days} days free trial
                  </Badge>
                )}
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Features */}
                {plan.features.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Features</h4>
                    <ul className="space-y-1">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="text-sm text-gray-600 flex items-center">
                          <Star className="w-3 h-3 text-yellow-500 mr-2 flex-shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Includes */}
                <div className="flex flex-wrap gap-1">
                  {plan.includes_classes && (
                    <Badge variant="outline" className="text-xs">Classes</Badge>
                  )}
                  {plan.includes_personal_training && (
                    <Badge variant="outline" className="text-xs">Personal Training</Badge>
                  )}
                  {plan.includes_nutrition && (
                    <Badge variant="outline" className="text-xs">Nutrition</Badge>
                  )}
                </div>

                {/* Member limit */}
                {plan.max_members && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Users className="w-4 h-4 mr-1" />
                    Max {plan.max_members} members
                  </div>
                )}

                {/* Actions */}
                <div className="flex space-x-2 pt-4 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditPlan(plan)}
                    className="flex-1"
                  >
                    <Edit className="w-3 h-3 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeletePlan(plan.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPlan?.id ? 'Edit Membership Plan' : 'Create Membership Plan'}
            </DialogTitle>
          </DialogHeader>

          {editingPlan && (
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Plan Name *</Label>
                  <Input
                    id="name"
                    value={editingPlan.name}
                    onChange={(e) => updateEditingPlan({ name: e.target.value })}
                    placeholder="e.g., Basic Membership"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="price">Price (£) *</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    value={(editingPlan.price_pennies / 100).toFixed(2)}
                    onChange={(e) => updateEditingPlan({ 
                      price_pennies: Math.round(parseFloat(e.target.value || '0') * 100) 
                    })}
                    placeholder="29.99"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={editingPlan.description || ''}
                  onChange={(e) => updateEditingPlan({ description: e.target.value })}
                  placeholder="Describe what's included in this membership..."
                  rows={3}
                />
              </div>

              {/* Billing and Trial */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="billing-cycle">Billing Cycle</Label>
                  <Select
                    value={editingPlan.billing_cycle}
                    onValueChange={(value) => updateEditingPlan({ 
                      billing_cycle: value as MembershipPlan['billing_cycle'] 
                    })}
                  >
                    <SelectTrigger id="billing-cycle">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                      <SelectItem value="one-time">One-time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="trial-days">Trial Days</Label>
                  <Input
                    id="trial-days"
                    type="number"
                    min="0"
                    value={editingPlan.trial_days}
                    onChange={(e) => updateEditingPlan({ 
                      trial_days: parseInt(e.target.value || '0') 
                    })}
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Features */}
              <div className="space-y-2">
                <Label htmlFor="features">Features (one per line)</Label>
                <Textarea
                  id="features"
                  value={editingPlan.features.join('\n')}
                  onChange={(e) => updateEditingPlan({ 
                    features: e.target.value.split('\n').filter(f => f.trim()) 
                  })}
                  placeholder="Gym access&#10;Locker room&#10;Basic equipment"
                  rows={4}
                />
              </div>

              {/* Includes */}
              <div className="space-y-4">
                <Label>What's Included</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="includes-classes"
                      checked={editingPlan.includes_classes}
                      onCheckedChange={(checked) => updateEditingPlan({ includes_classes: checked })}
                    />
                    <Label htmlFor="includes-classes">Classes</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="includes-training"
                      checked={editingPlan.includes_personal_training}
                      onCheckedChange={(checked) => updateEditingPlan({ includes_personal_training: checked })}
                    />
                    <Label htmlFor="includes-training">Personal Training</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="includes-nutrition"
                      checked={editingPlan.includes_nutrition}
                      onCheckedChange={(checked) => updateEditingPlan({ includes_nutrition: checked })}
                    />
                    <Label htmlFor="includes-nutrition">Nutrition</Label>
                  </div>
                </div>
              </div>

              {/* Settings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="max-members">Max Members (optional)</Label>
                  <Input
                    id="max-members"
                    type="number"
                    min="1"
                    value={editingPlan.max_members || ''}
                    onChange={(e) => updateEditingPlan({ 
                      max_members: e.target.value ? parseInt(e.target.value) : null 
                    })}
                    placeholder="Unlimited"
                  />
                </div>

                <div className="flex items-center space-x-2 pt-6">
                  <Switch
                    id="is-active"
                    checked={editingPlan.is_active}
                    onCheckedChange={(checked) => updateEditingPlan({ is_active: checked })}
                  />
                  <Label htmlFor="is-active">Plan is active</Label>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSavePlan}>
                  {editingPlan.id ? 'Update Plan' : 'Create Plan'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Warning if no plans are active */}
      {plans.length > 0 && !plans.some(p => p.is_active) && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You have no active membership plans. Members won't be able to sign up until you activate at least one plan.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}