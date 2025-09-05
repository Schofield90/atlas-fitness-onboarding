'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowLeft, User, Activity, CreditCard, FileText, 
  AlertTriangle, StickyNote, Calendar, Phone, Mail,
  MapPin, Heart, Users, TrendingDown, TrendingUp, 
  Edit, Save, X 
} from 'lucide-react';
import DashboardLayout from '@/app/components/DashboardLayout';
import { createClient } from '@/app/lib/supabase/client';
import { useOrganization } from '@/app/hooks/useOrganization';
import MembershipsTab from '@/app/components/customers/tabs/MembershipsTab';
import NotesTab from '@/app/components/customers/tabs/NotesTab';

interface CustomerProfile {
  id: string;
  first_name?: string;
  last_name?: string;
  email: string;
  phone?: string;
  date_of_birth?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  medical_conditions?: string;
  allergies?: string;
  profile_photo_url?: string;
  preferred_contact_method?: string;
  communication_preferences?: any;
  tags?: string[];
  last_visit?: string;
  total_visits?: number;
  churn_risk_score?: number;
  churn_risk_factors?: any;
  lifetime_value?: number;
  notes?: string;
  created_at: string;
  updated_at?: string;
}

interface CustomerActivity {
  id: string;
  type: 'booking' | 'payment' | 'note' | 'communication';
  title: string;
  description: string;
  date: string;
  metadata?: any;
}

type TabType = 'profile' | 'activity' | 'registrations' | 'payments' | 'memberships' | 'waivers' | 'notes';

export default function CustomerProfilePage() {
  const params = useParams();
  const router = useRouter();
  const customerId = params.customerId as string;
  const { organizationId } = useOrganization();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [customer, setCustomer] = useState<CustomerProfile | null>(null);
  const [activities, setActivities] = useState<CustomerActivity[]>([]);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [memberships, setMemberships] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<CustomerProfile>>({});

  useEffect(() => {
    if (customerId && organizationId) {
      loadCustomerProfile();
    }
  }, [customerId, organizationId]);

  useEffect(() => {
    if (customerId && organizationId && activeTab !== 'profile') {
      loadTabData();
    }
  }, [activeTab, customerId, organizationId]);

  const loadCustomerProfile = async () => {
    setLoading(true);
    try {
      // Prefer clients table; fallback to leads if not found
      let { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', customerId)
        .single();

      if (error || !data) {
        const res = await supabase
          .from('leads')
          .select('*')
          .eq('id', customerId)
          .eq('organization_id', organizationId)
          .single();
        data = res.data as any
        error = res.error as any
      }

      if (error) throw error;

      if (data) {
        // Normalize to CustomerProfile shape
        const name = (data.name || `${data.first_name || ''} ${data.last_name || ''}`).trim()
        const normalized: any = {
          ...data,
          name,
          total_visits: data.total_visits || 0,
          last_visit_date: data.last_visit || data.last_visit_date,
          created_at: data.created_at,
          updated_at: data.updated_at
        }
        setCustomer(normalized);
        setEditForm(normalized);
      }
    } catch (error) {
      console.error('Error loading customer:', error);
      alert('Failed to load customer profile');
      router.push('/members');
    } finally {
      setLoading(false);
    }
  };

  const loadTabData = async () => {
    try {
      switch (activeTab) {
        case 'activity':
          await loadActivity();
          break;
        case 'registrations':
          await loadRegistrations();
          break;
        case 'payments':
          await loadPayments();
          break;
        case 'memberships':
          await loadMemberships();
          break;
        case 'notes':
          await loadNotes();
          break;
      }
    } catch (error) {
      console.error('Error loading tab data:', error);
    }
  };

  const loadActivity = async () => {
    try {
      // Load customer activity from various sources
      const response = await fetch(`/api/customers/${customerId}/activity`);
      const data = await response.json();
      
      if (response.ok) {
        setActivities(data.activities || []);
      }
    } catch (error) {
      console.error('Error loading activity:', error);
    }
  };

  const loadRegistrations = async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .or(`customer_id.eq.${customerId},client_id.eq.${customerId}`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRegistrations(data || []);
    } catch (error) {
      console.error('Error loading registrations:', error);
    }
  };

  const loadPayments = async () => {
    try {
      const { data, error } = await supabase
        .from('payment_transactions')
        .select('*')
        .or(`customer_id.eq.${customerId},client_id.eq.${customerId}`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPayments(data || []);
    } catch (error) {
      console.error('Error loading payments:', error);
    }
  };

  const loadMemberships = async () => {
    try {
      const { data, error } = await supabase
        .from('customer_memberships')
        .select(`
          *,
          membership_plans (
            name,
            price_pennies,
            billing_period
          )
        `)
        .or(`customer_id.eq.${customerId},client_id.eq.${customerId}`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMemberships(data || []);
    } catch (error) {
      console.error('Error loading memberships:', error);
    }
  };

  const loadNotes = async () => {
    try {
      const { data, error } = await supabase
        .from('customer_notes')
        .select(`
          *,
          users:created_by (
            name,
            email
          )
        `)
        .or(`customer_id.eq.${customerId},client_id.eq.${customerId}`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotes(data || []);
    } catch (error) {
      console.error('Error loading notes:', error);
    }
  };

  const handleAddNote = async (noteContent: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('customer_notes')
        .insert({
          customer_id: customerId,
          organization_id: organizationId,
          content: noteContent,
          created_by: user.id,
          is_internal: true
        });

      if (error) throw error;
      await loadNotes();
      alert('Note added successfully');
    } catch (error) {
      console.error('Error adding note:', error);
      alert('Failed to add note');
    }
  };

  const handleSaveProfile = async () => {
    try {
      // Update whichever record exists
      const updates = { ...editForm, updated_at: new Date().toISOString() }
      const { error: updateClientErr } = await supabase
        .from('clients')
        .update(updates)
        .eq('id', customerId)
      const { error: updateLeadErr } = await supabase
        .from('leads')
        .update(updates)
        .eq('id', customerId)
        .eq('organization_id', organizationId)
      const error = updateClientErr && updateLeadErr ? (updateClientErr || updateLeadErr) : null

      if (error) throw error;

      setCustomer({ ...customer!, ...editForm });
      setIsEditing(false);
      alert('Customer profile updated successfully');
    } catch (error) {
      console.error('Error updating customer:', error);
      alert('Failed to update customer profile');
    }
  };

  const getChurnRiskColor = (score?: number) => {
    if (!score) return 'text-gray-400';
    if (score >= 0.7) return 'text-red-400';
    if (score >= 0.4) return 'text-yellow-400';
    return 'text-green-400';
  };

  const getChurnRiskLabel = (score?: number) => {
    if (!score) return 'Unknown';
    if (score >= 0.7) return 'High Risk';
    if (score >= 0.4) return 'Medium Risk';
    return 'Low Risk';
  };

  if (loading) {
    return (
      <DashboardLayout userData={null}>
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
            <p className="text-gray-400">Loading customer profile...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!customer) {
    return (
      <DashboardLayout userData={null}>
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
          <div className="text-center">
            <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <p className="text-gray-400">Customer not found</p>
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
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/members')}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-400" />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-white">{`${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'Unknown Member'}</h1>
                <p className="text-gray-400 mt-1">Customer Profile & Management</p>
              </div>
            </div>
            <div className="flex gap-3">
              {isEditing ? (
                <>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setEditForm(customer);
                    }}
                    className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                  >
                    <X className="w-4 h-4 inline mr-2" />
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveProfile}
                    className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                  >
                    <Save className="w-4 h-4 inline mr-2" />
                    Save Changes
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  <Edit className="w-4 h-4 inline mr-2" />
                  Edit Profile
                </button>
              )}
            </div>
          </div>

          {/* Customer Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div className="flex items-center gap-3 mb-2">
                <Activity className="w-5 h-5 text-blue-400" />
                <span className="text-gray-400 text-sm">Total Visits</span>
              </div>
              <div className="text-2xl font-bold text-white">{customer.total_visits || 0}</div>
            </div>

            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div className="flex items-center gap-3 mb-2">
                <CreditCard className="w-5 h-5 text-green-400" />
                <span className="text-gray-400 text-sm">Lifetime Value</span>
              </div>
              <div className="text-2xl font-bold text-white">
                £{((customer.lifetime_value || 0) / 100).toFixed(2)}
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div className="flex items-center gap-3 mb-2">
                <TrendingDown className="w-5 h-5 text-orange-400" />
                <span className="text-gray-400 text-sm">Churn Risk</span>
              </div>
              <div className={`text-2xl font-bold ${getChurnRiskColor(customer.churn_risk_score)}`}>
                {getChurnRiskLabel(customer.churn_risk_score)}
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div className="flex items-center gap-3 mb-2">
                <Calendar className="w-5 h-5 text-purple-400" />
                <span className="text-gray-400 text-sm">Last Visit</span>
              </div>
              <div className="text-2xl font-bold text-white">
                {customer.last_visit 
                  ? new Date(customer.last_visit).toLocaleDateString('en-GB')
                  : 'Never'
                }
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex space-x-1 bg-gray-800 p-1 rounded-lg mb-6 overflow-x-auto">
            {[
              { key: 'profile', label: 'Profile', icon: User },
              { key: 'activity', label: 'Activity', icon: Activity },
              { key: 'registrations', label: 'Class Bookings', icon: Calendar },
              { key: 'payments', label: 'Payments', icon: CreditCard },
              { key: 'memberships', label: 'Memberships', icon: Users },
              { key: 'waivers', label: 'Waivers', icon: FileText },
              { key: 'notes', label: 'Notes', icon: StickyNote }
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key as TabType)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${
                  activeTab === key
                    ? 'bg-orange-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {activeTab === 'profile' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Basic Information */}
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-4">Basic Information</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">First Name</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editForm.first_name || ''}
                        onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    ) : (
                      <p className="text-white">{customer.first_name || 'Not provided'}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Last Name</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editForm.last_name || ''}
                        onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    ) : (
                      <p className="text-white">{customer.last_name || 'Not provided'}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Email</label>
                    {isEditing ? (
                      <input
                        type="email"
                        value={editForm.email || ''}
                        onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    ) : (
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-gray-400" />
                        <p className="text-white">{customer.email}</p>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Phone</label>
                    {isEditing ? (
                      <input
                        type="tel"
                        value={editForm.phone || ''}
                        onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    ) : (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <p className="text-white">{customer.phone}</p>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Date of Birth</label>
                    {isEditing ? (
                      <input
                        type="date"
                        value={editForm.date_of_birth || ''}
                        onChange={(e) => setEditForm({ ...editForm, date_of_birth: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    ) : (
                      <p className="text-white">
                        {customer.date_of_birth 
                          ? new Date(customer.date_of_birth).toLocaleDateString('en-GB')
                          : 'Not provided'
                        }
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Emergency Contact */}
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-4">Emergency Contact</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Contact Name</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editForm.emergency_contact_name || ''}
                        onChange={(e) => setEditForm({ ...editForm, emergency_contact_name: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    ) : (
                      <p className="text-white">{customer.emergency_contact_name || 'Not provided'}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Contact Phone</label>
                    {isEditing ? (
                      <input
                        type="tel"
                        value={editForm.emergency_contact_phone || ''}
                        onChange={(e) => setEditForm({ ...editForm, emergency_contact_phone: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    ) : (
                      <p className="text-white">{customer.emergency_contact_phone || 'Not provided'}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Medical Information */}
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Heart className="w-5 h-5 text-red-400" />
                  Medical Information
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Medical Conditions</label>
                    {isEditing ? (
                      <textarea
                        value={editForm.medical_conditions || ''}
                        onChange={(e) => setEditForm({ ...editForm, medical_conditions: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                        rows={3}
                        placeholder="Any medical conditions or health concerns..."
                      />
                    ) : (
                      <p className="text-white">{customer.medical_conditions || 'None reported'}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Allergies</label>
                    {isEditing ? (
                      <textarea
                        value={editForm.allergies || ''}
                        onChange={(e) => setEditForm({ ...editForm, allergies: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                        rows={3}
                        placeholder="Any allergies or dietary restrictions..."
                      />
                    ) : (
                      <p className="text-white">{customer.allergies || 'None reported'}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Tags & Preferences */}
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-4">Tags & Preferences</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Customer Tags</label>
                    <div className="flex flex-wrap gap-2">
                      {(customer.tags || []).map((tag, index) => (
                        <span
                          key={index}
                          className="bg-orange-900/20 text-orange-400 px-2 py-1 rounded text-sm"
                        >
                          {tag}
                        </span>
                      ))}
                      {(!customer.tags || customer.tags.length === 0) && (
                        <span className="text-gray-400">No tags assigned</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Preferred Contact Method</label>
                    {isEditing ? (
                      <select
                        value={editForm.preferred_contact_method || ''}
                        onChange={(e) => setEditForm({ ...editForm, preferred_contact_method: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                      >
                        <option value="">Select method</option>
                        <option value="email">Email</option>
                        <option value="sms">SMS</option>
                        <option value="whatsapp">WhatsApp</option>
                        <option value="phone">Phone</option>
                        <option value="none">No contact</option>
                      </select>
                    ) : (
                      <p className="text-white capitalize">
                        {customer.preferred_contact_method || 'Not specified'}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Activity Tab */}
          {activeTab === 'activity' && (
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4">Recent Activity</h3>
              {activities.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No activity recorded yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {activities.map((activity) => (
                    <div key={activity.id} className="flex items-start gap-4 p-4 bg-gray-700 rounded-lg">
                      <div className="flex-1">
                        <h4 className="text-white font-medium">{activity.title}</h4>
                        <p className="text-gray-400 text-sm mt-1">{activity.description}</p>
                        <p className="text-gray-500 text-xs mt-2">
                          {new Date(activity.date).toLocaleString('en-GB')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Memberships Tab */}
          {activeTab === 'memberships' && (
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <MembershipsTab customerId={customerId} />
            </div>
          )}

          {/* Notes Tab */}
          {activeTab === 'notes' && (
            <NotesTab 
              notes={notes}
              onAddNote={handleAddNote}
              onRefresh={loadNotes}
            />
          )}

          {/* Other tabs would be implemented similarly */}
          {activeTab !== 'profile' && activeTab !== 'activity' && activeTab !== 'memberships' && activeTab !== 'notes' && (
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4 capitalize">{activeTab}</h3>
              <div className="text-center py-8 text-gray-400">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>This section is under development</p>
                <p className="text-sm mt-1">Content for {activeTab} will be available soon</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}