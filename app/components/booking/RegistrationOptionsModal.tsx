'use client';

import React, { useState, useEffect } from 'react';
import { X, CreditCard, Calendar, Users, AlertCircle, CheckCircle, Gift } from 'lucide-react';
import { createClient } from '@/app/lib/supabase/client';

interface CustomerMembership {
  id: string;
  status: 'active' | 'paused' | 'cancelled' | 'expired';
  start_date: string;
  end_date?: string;
  remaining_classes?: number;
  membership_plan: {
    id: string;
    name: string;
    description: string;
    price: number;
    billing_period: string;
    features: any;
  };
}

interface Customer {
  id: string;
  name: string;
  email: string;
  first_name?: string;
  last_name?: string;
}

interface RegistrationOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer;
  session: any;
  onRegister: (customer: Customer, registrationType: 'membership' | 'drop-in' | 'free', membershipId?: string) => Promise<void>;
}

export default function RegistrationOptionsModal({ 
  isOpen, 
  onClose, 
  customer, 
  session,
  onRegister 
}: RegistrationOptionsModalProps) {
  const [memberships, setMemberships] = useState<CustomerMembership[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMembership, setSelectedMembership] = useState<string | null>(null);
  const [registering, setRegistering] = useState(false);

  useEffect(() => {
    if (isOpen && customer) {
      console.log('RegistrationOptionsModal opened with customer:', customer);
      console.log('Customer ID:', customer.id);
      console.log('Customer details:', JSON.stringify(customer, null, 2));
      fetchCustomerMemberships();
    }
  }, [isOpen, customer]);

  const fetchCustomerMemberships = async () => {
    try {
      setLoading(true);
      const supabase = createClient();
      
      console.log('Fetching memberships for customer:', customer);
      
      // First check if this customer has memberships as a client (using leads table)
      const { data: clientMemberships, error: clientError } = await supabase
        .from('customer_memberships')
        .select(`
          *,
          membership_plan:membership_plans(*)
        `)
        .eq('customer_id', customer.id)
        .in('status', ['active', 'paused'])
        .order('created_at', { ascending: false });

      if (clientError) {
        console.error('Error fetching customer memberships:', clientError);
        
        // Try alternative query if foreign key issue
        const { data: altData, error: altError } = await supabase
          .from('customer_memberships')
          .select('*')
          .eq('customer_id', customer.id)
          .in('status', ['active', 'paused']);
          
        if (!altError && altData) {
          // Fetch membership plans separately
          const planIds = altData.map(m => m.membership_plan_id).filter(Boolean);
          const { data: plans } = await supabase
            .from('membership_plans')
            .select('*')
            .in('id', planIds);
            
          const membershipsWithPlans = altData.map(m => ({
            ...m,
            membership_plan: plans?.find(p => p.id === m.membership_plan_id)
          }));
          
          console.log('Alternative query memberships:', membershipsWithPlans);
          setMemberships(membershipsWithPlans || []);
          if (membershipsWithPlans && membershipsWithPlans.length > 0) {
            setSelectedMembership(membershipsWithPlans[0].id);
          }
        } else {
          setMemberships([]);
        }
      } else {
        console.log('Found memberships:', clientMemberships);
        console.log('Membership count:', clientMemberships?.length || 0);
        if (clientMemberships && clientMemberships.length > 0) {
          console.log('First membership details:', clientMemberships[0]);
        }
        setMemberships(clientMemberships || []);
        // Auto-select first active membership if available
        if (clientMemberships && clientMemberships.length > 0) {
          setSelectedMembership(clientMemberships[0].id);
        }
      }
    } catch (error) {
      console.error('Error fetching memberships:', error);
      setMemberships([]);
    } finally {
      setLoading(false);
    }
  };

  const handleMembershipRegistration = async () => {
    if (!selectedMembership) return;
    
    try {
      setRegistering(true);
      await onRegister(customer, 'membership', selectedMembership);
      onClose();
    } catch (error) {
      console.error('Error registering with membership:', error);
    } finally {
      setRegistering(false);
    }
  };

  const handleDropInRegistration = async () => {
    try {
      setRegistering(true);
      await onRegister(customer, 'drop-in');
      onClose();
    } catch (error) {
      console.error('Error registering as drop-in:', error);
    } finally {
      setRegistering(false);
    }
  };
  
  const handleFreeRegistration = async () => {
    try {
      setRegistering(true);
      await onRegister(customer, 'free');
      onClose();
    } catch (error) {
      console.error('Error registering as free:', error);
    } finally {
      setRegistering(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-600';
      case 'paused': return 'bg-yellow-600';
      case 'cancelled': return 'bg-red-600';
      case 'expired': return 'bg-gray-600';
      default: return 'bg-gray-600';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    // Convert from pence to pounds
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount / 100);
  };

  if (!isOpen) return null;

  const customerName = customer.name || `${customer.first_name || ''} ${customer.last_name || ''}`.trim();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[10000] flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Registration Options</h2>
              <p className="text-sm text-gray-600 mt-1">
                Register <span className="font-medium">{customerName}</span> for {session.title}
              </p>
            </div>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[70vh]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
                <p className="text-gray-500">Loading membership options...</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Active Memberships Section */}
              {memberships.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-blue-600" />
                    Active Memberships
                  </h3>
                  <div className="space-y-3">
                    {memberships.map((membership) => (
                      <div 
                        key={membership.id}
                        className={`border-2 rounded-lg p-4 cursor-pointer transition-colors ${
                          selectedMembership === membership.id 
                            ? 'border-blue-600 bg-blue-50' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => setSelectedMembership(membership.id)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <input
                                type="radio"
                                name="membership"
                                checked={selectedMembership === membership.id}
                                onChange={() => setSelectedMembership(membership.id)}
                                className="text-blue-600"
                              />
                              <h4 className="font-medium text-gray-900">
                                {membership.membership_plan.name}
                              </h4>
                              <span className={`px-2 py-1 text-xs text-white rounded-full ${getStatusColor(membership.status)}`}>
                                {membership.status}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mt-1 ml-6">
                              {membership.membership_plan.description}
                            </p>
                            <div className="flex items-center gap-4 mt-2 ml-6 text-sm text-gray-500">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                Started {formatDate(membership.start_date)}
                              </span>
                              {membership.end_date && (
                                <span>
                                  • Ends {formatDate(membership.end_date)}
                                </span>
                              )}
                              {membership.remaining_classes !== null && (
                                <span className="flex items-center gap-1">
                                  <Users className="w-4 h-4" />
                                  {membership.remaining_classes} classes remaining
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-semibold text-gray-900">
                              {formatCurrency(membership.membership_plan.price)}
                            </div>
                            <div className="text-sm text-gray-500">
                              /{membership.membership_plan.billing_period}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Register with Membership Button */}
                  <button
                    onClick={handleMembershipRegistration}
                    disabled={!selectedMembership || registering}
                    className="w-full mt-4 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {registering ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                        Registering...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        Register with Selected Membership
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* No Memberships Message */}
              {memberships.length === 0 && (
                <div className="text-center py-8">
                  <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Memberships</h3>
                  <p className="text-gray-600">
                    {customerName} doesn't have any active memberships for this class.
                  </p>
                </div>
              )}

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">or</span>
                </div>
              </div>

              {/* Drop-in Option */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-orange-600" />
                  Drop-in Registration
                </h3>
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900">Pay-as-you-go</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        Register without a membership. Payment will be required at the time of the class.
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold text-gray-900">
                        {formatCurrency(session.dropInPrice || 15)}
                      </div>
                      <div className="text-sm text-gray-500">per class</div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleDropInRegistration}
                  disabled={registering}
                  className="w-full mt-4 px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {registering ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      Registering...
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-4 h-4" />
                      Register as Drop-in
                    </>
                  )}
                </button>
              </div>
              
              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">or</span>
                </div>
              </div>
              
              {/* Free Registration Option */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                  <Gift className="w-5 h-5 text-green-600" />
                  Complimentary Registration
                </h3>
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900">Register for free</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        Comp this visit - no payment required. Perfect for trial sessions or special circumstances.
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold text-gray-900">
                        FREE
                      </div>
                      <div className="text-sm text-gray-500">this visit</div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleFreeRegistration}
                  disabled={registering}
                  className="w-full mt-4 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {registering ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      Registering...
                    </>
                  ) : (
                    <>
                      <Gift className="w-4 h-4" />
                      Register for Free
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}