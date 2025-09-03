'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Users, CreditCard, Calendar, Clock, Check, X } from 'lucide-react';
import DashboardLayout from '@/app/components/DashboardLayout';
import { createClient } from '@/app/lib/supabase/client';
import { useOrganization } from '@/app/hooks/useOrganization';
import toast from '@/app/lib/toast';

interface MembershipPlan {
  id: string;
  name: string;
  description: string;
  price_pennies: number;
  billing_period: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'one_time';
  contract_length_months?: number;
  class_limit?: number;
  features: any;
  signup_fee_pennies: number;
  cancellation_fee_pennies: number;
  cancellation_notice_days: number;
  is_active: boolean;
  trial_days: number;
  created_at: string;
  updated_at: string;
}

interface MembershipPlanModal {
  isOpen: boolean;
  plan?: MembershipPlan;
}

export default function MembershipPlansPage() {
  const { organizationId } = useOrganization();
  const supabase = createClient();
  
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<MembershipPlanModal>({ isOpen: false });
  const [formData, setFormData] = useState<Partial<MembershipPlan>>({
    name: '',
    description: '',
    price_pennies: 0,
    billing_period: 'monthly',
    class_limit: null,
    features: {},
    signup_fee_pennies: 0,
    cancellation_fee_pennies: 0,
    cancellation_notice_days: 30,
    is_active: true,
    trial_days: 0
  });

  useEffect(() => {
    if (organizationId) {
      loadMembershipPlans();
    }
  }, [organizationId]);

  const loadMembershipPlans = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('membership_plans')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPlans(data || []);
    } catch (error) {
      console.error('Error loading membership plans:', error);
      toast.error('Failed to load membership plans');
    } finally {
      setLoading(false);
    }
  };

  const handleSavePlan = async () => {
    try {
      // Validate required fields
      if (!formData.name || !formData.name.trim()) {
        toast.error('Plan name is required');
        return;
      }
      
      if (!formData.price_pennies || formData.price_pennies <= 0) {
        toast.error('Price must be greater than 0');
        return;
      }
      
      const planData = {
        ...formData,
        organization_id: organizationId,
        updated_at: new Date().toISOString()
      };

      if (modal.plan) {
        // Update existing plan
        const { error } = await supabase
          .from('membership_plans')
          .update(planData)
          .eq('id', modal.plan.id)
          .eq('organization_id', organizationId);

        if (error) throw error;
        toast.success('Membership plan updated successfully');
      } else {
        // Create new plan
        const { error } = await supabase
          .from('membership_plans')
          .insert({
            ...planData,
            created_at: new Date().toISOString()
          });

        if (error) throw error;
        toast.success('Membership plan created successfully');
      }

      await loadMembershipPlans();
      setModal({ isOpen: false });
      resetForm();
    } catch (error) {
      console.error('Error saving membership plan:', error);
      toast.error('Failed to save membership plan');
    }
  };

  const handleDeletePlan = async (planId: string) => {
    if (!confirm('Are you sure you want to delete this membership plan? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('membership_plans')
        .delete()
        .eq('id', planId)
        .eq('organization_id', organizationId);

      if (error) throw error;

      toast.success('Membership plan deleted successfully');
      await loadMembershipPlans();
    } catch (error) {
      console.error('Error deleting membership plan:', error);
      toast.error('Failed to delete membership plan');
    }
  };

  const openModal = (plan?: MembershipPlan) => {
    if (plan) {
      setFormData({
        name: plan.name,
        description: plan.description,
        price_pennies: plan.price_pennies,
        billing_period: plan.billing_period,
        contract_length_months: plan.contract_length_months,
        class_limit: plan.class_limit,
        features: plan.features,
        signup_fee_pennies: plan.signup_fee_pennies,
        cancellation_fee_pennies: plan.cancellation_fee_pennies,
        cancellation_notice_days: plan.cancellation_notice_days,
        is_active: plan.is_active,
        trial_days: plan.trial_days
      });
    } else {
      resetForm();
    }
    setModal({ isOpen: true, plan });
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price_pennies: 0,
      billing_period: 'monthly',
      class_limit: null,
      features: {},
      signup_fee_pennies: 0,
      cancellation_fee_pennies: 0,
      cancellation_notice_days: 30,
      is_active: true,
      trial_days: 0
    });
  };

  const formatPrice = (pennies: number) => {
    return `£${(pennies / 100).toFixed(2)}`;
  };

  const getBillingPeriodLabel = (period: string) => {
    const labels: { [key: string]: string } = {
      daily: 'Daily',
      weekly: 'Weekly',
      monthly: 'Monthly',
      quarterly: 'Quarterly',
      yearly: 'Yearly',
      one_time: 'One-time'
    };
    return labels[period] || period;
  };

  if (loading) {
    return (
      <DashboardLayout userData={null}>
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
            <p className="text-gray-400">Loading membership plans...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userData={null}>
      <div className="min-h-screen bg-gray-900">
        <div className="container mx-auto px-6 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white">Membership Plans</h1>
              <p className="text-gray-400 mt-1">Manage your gym's membership options and pricing</p>
            </div>
            <button
              onClick={() => openModal()}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Membership Plan
            </button>
          </div>

          {/* Plans Grid */}
          {plans.length === 0 ? (
            <div className="bg-gray-800 rounded-lg p-12 border border-gray-700 text-center">
              <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No Membership Plans</h3>
              <p className="text-gray-400 mb-6">Create your first membership plan to start offering subscriptions to your customers.</p>
              <button
                onClick={() => openModal()}
                className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
              >
                Create Your First Plan
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  className={`bg-gray-800 rounded-lg p-6 border ${
                    plan.is_active ? 'border-gray-700' : 'border-gray-600 opacity-70'
                  } hover:border-orange-500 transition-colors`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-white">{plan.name}</h3>
                      {!plan.is_active && (
                        <span className="text-xs bg-gray-700 text-gray-400 px-2 py-1 rounded mt-1 inline-block">
                          Inactive
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => openModal(plan)}
                        className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeletePlan(plan.id)}
                        className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="text-3xl font-bold text-white mb-2">
                    {formatPrice(plan.price_pennies)}
                    <span className="text-lg font-normal text-gray-400">
                      /{getBillingPeriodLabel(plan.billing_period).toLowerCase()}
                    </span>
                  </div>

                  {plan.description && (
                    <p className="text-gray-400 text-sm mb-4">{plan.description}</p>
                  )}

                  <div className="space-y-2 mb-6">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-300">
                        {plan.class_limit ? `${plan.class_limit} classes` : 'Unlimited classes'}
                      </span>
                    </div>

                    {plan.contract_length_months && (
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-300">
                          {plan.contract_length_months} month contract
                        </span>
                      </div>
                    )}

                    {plan.trial_days > 0 && (
                      <div className="flex items-center gap-2 text-sm">
                        <Check className="w-4 h-4 text-green-400" />
                        <span className="text-gray-300">
                          {plan.trial_days} day free trial
                        </span>
                      </div>
                    )}

                    {plan.signup_fee_pennies > 0 && (
                      <div className="flex items-center gap-2 text-sm">
                        <CreditCard className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-300">
                          {formatPrice(plan.signup_fee_pennies)} signup fee
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="text-xs text-gray-500">
                    Created {new Date(plan.created_at).toLocaleDateString('en-GB')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {modal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <h2 className="text-xl font-semibold text-white">
                {modal.plan ? 'Edit Membership Plan' : 'Create Membership Plan'}
              </h2>
              <button
                onClick={() => setModal({ isOpen: false })}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Plan Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="e.g., Premium Membership"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Status
                  </label>
                  <select
                    value={formData.is_active ? 'active' : 'inactive'}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.value === 'active' })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  rows={3}
                  placeholder="Brief description of what this plan includes..."
                />
              </div>

              {/* Pricing */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Price (£) *
                  </label>
                  <input
                    type="number"
                    value={formData.price_pennies ? formData.price_pennies / 100 : ''}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      price_pennies: Math.round(parseFloat(e.target.value || '0') * 100) 
                    })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Billing Period *
                  </label>
                  <select
                    value={formData.billing_period}
                    onChange={(e) => setFormData({ ...formData, billing_period: e.target.value as any })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    required
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="yearly">Yearly</option>
                    <option value="one_time">One-time</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Class Limit
                  </label>
                  <input
                    type="number"
                    value={formData.class_limit || ''}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      class_limit: e.target.value ? parseInt(e.target.value) : null 
                    })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    min="0"
                    placeholder="Unlimited"
                  />
                  <p className="text-xs text-gray-500 mt-1">Leave empty for unlimited</p>
                </div>
              </div>

              {/* Additional Fees */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Signup Fee (£)
                  </label>
                  <input
                    type="number"
                    value={formData.signup_fee_pennies ? formData.signup_fee_pennies / 100 : ''}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      signup_fee_pennies: Math.round(parseFloat(e.target.value || '0') * 100) 
                    })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Cancellation Fee (£)
                  </label>
                  <input
                    type="number"
                    value={formData.cancellation_fee_pennies ? formData.cancellation_fee_pennies / 100 : ''}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      cancellation_fee_pennies: Math.round(parseFloat(e.target.value || '0') * 100) 
                    })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Trial Days
                  </label>
                  <input
                    type="number"
                    value={formData.trial_days || ''}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      trial_days: parseInt(e.target.value || '0') 
                    })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    min="0"
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Contract Terms */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Contract Length (months)
                  </label>
                  <input
                    type="number"
                    value={formData.contract_length_months || ''}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      contract_length_months: e.target.value ? parseInt(e.target.value) : undefined 
                    })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    min="0"
                    placeholder="No contract"
                  />
                  <p className="text-xs text-gray-500 mt-1">Leave empty for no minimum contract</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Cancellation Notice (days)
                  </label>
                  <input
                    type="number"
                    value={formData.cancellation_notice_days || ''}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      cancellation_notice_days: parseInt(e.target.value || '30') 
                    })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    min="0"
                    placeholder="30"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t border-gray-700">
              <button
                onClick={() => setModal({ isOpen: false })}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePlan}
                className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
              >
                {modal.plan ? 'Update Plan' : 'Create Plan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}