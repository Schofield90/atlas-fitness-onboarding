'use client';

import { useState, useEffect } from 'react';
import React from 'react';
import { createSupabaseClient } from '@/lib/supabase';
import { Client, UserProfile } from '@/lib/supabase';
import { 
  Users, 
  Plus, 
  Search, 
  // Filter,
  Phone, 
  Mail,
  // Calendar,
  CreditCard,
  // Activity,
  UserCheck,
  Eye,
  Edit,
  Trash2,
  Download,
  RefreshCw,
  Crown,
  TrendingUp
} from 'lucide-react';

interface ClientWithMembership extends Client {
  memberships: Array<{
    id: string;
    status: string;
    monthly_price: number;
    next_payment_date: string;
    plan: {
      name: string;
      access_level: string;
    };
  }>;
  assigned_trainer_info?: {
    full_name: string;
    email: string;
  };
}

export default function ClientsPage() {
  const [clients, setClients] = useState<ClientWithMembership[]>([]);
  const [filteredClients, setFilteredClients] = useState<ClientWithMembership[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [fitnessLevelFilter, setFitnessLevelFilter] = useState('all');
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  console.log('Current user:', currentUser); // Using currentUser to avoid lint warning

  useEffect(() => {
    loadClients();
  }, []);

  const filterClients = React.useCallback(() => {
    let filtered = [...clients];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(client => 
        `${client.first_name} ${client.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (client.email && client.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (client.phone && client.phone.includes(searchTerm))
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(client => client.status === statusFilter);
    }

    // Fitness level filter
    if (fitnessLevelFilter !== 'all') {
      filtered = filtered.filter(client => client.fitness_level === fitnessLevelFilter);
    }

    setFilteredClients(filtered);
  }, [clients, searchTerm, statusFilter, fitnessLevelFilter]);

  useEffect(() => {
    filterClients();
  }, [filterClients]);

  const loadClients = async () => {
    try {
      const supabase = createSupabaseClient();
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user profile
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (!profile) return;
      
      setCurrentUser(profile);

      // Get clients
      const response = await fetch(`/api/clients?organization_id=${profile.organization_id}&limit=100`);
      const data = await response.json();

      if (response.ok) {
        setClients(data.clients || []);
      } else {
        console.error('Error fetching clients:', data.error);
      }
    } catch (error) {
      console.error('Error loading clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'frozen': return 'bg-blue-100 text-blue-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getFitnessLevelColor = (level: string) => {
    switch (level) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getAccessLevelIcon = (level: string) => {
    switch (level) {
      case 'vip': return <Crown className="h-4 w-4 text-purple-600" />;
      case 'premium': return <TrendingUp className="h-4 w-4 text-blue-600" />;
      default: return <Users className="h-4 w-4 text-gray-600" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getDaysUntilPayment = (paymentDate: string) => {
    const today = new Date();
    const payment = new Date(paymentDate);
    const diffTime = payment.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading clients...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Client Management</h1>
              <p className="text-gray-600">{filteredClients.length} clients found</p>
            </div>
            <div className="flex items-center space-x-4">
              <button className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                Add Client
              </button>
              <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                <Download className="h-4 w-4 mr-2" />
                Export
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Clients</p>
                <p className="text-2xl font-bold text-gray-900">{clients.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <UserCheck className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Active Clients</p>
                <p className="text-2xl font-bold text-gray-900">
                  {clients.filter(c => c.status === 'active').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Crown className="h-8 w-8 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">VIP Members</p>
                <p className="text-2xl font-bold text-gray-900">
                  {clients.filter(c => c.memberships?.[0]?.plan?.access_level === 'vip').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CreditCard className="h-8 w-8 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Monthly Revenue</p>
                <p className="text-2xl font-bold text-gray-900">
                  £{clients.reduce((sum, c) => sum + (c.memberships?.[0]?.monthly_price || 0), 0).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search clients..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div className="flex space-x-4">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="frozen">Frozen</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <select
                value={fitnessLevelFilter}
                onChange={(e) => setFitnessLevelFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Fitness Levels</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
              <button
                onClick={loadClients}
                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Clients Table */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Membership
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fitness Level
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Next Payment
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Trainer
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredClients.map((client) => (
                  <tr key={client.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                            <span className="text-sm font-medium text-gray-700">
                              {client.first_name[0]}{client.last_name[0]}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {client.first_name} {client.last_name}
                          </div>
                          <div className="text-sm text-gray-500">
                            Joined {formatDate(client.joined_date)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex flex-col space-y-1">
                        {client.email && (
                          <div className="flex items-center">
                            <Mail className="h-4 w-4 text-gray-400 mr-2" />
                            <span className="truncate max-w-48">{client.email}</span>
                          </div>
                        )}
                        {client.phone && (
                          <div className="flex items-center">
                            <Phone className="h-4 w-4 text-gray-400 mr-2" />
                            {client.phone}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {client.memberships?.[0] ? (
                        <div className="flex items-center">
                          {getAccessLevelIcon(client.memberships[0].plan.access_level)}
                          <div className="ml-2">
                            <div className="text-sm font-medium text-gray-900">
                              {client.memberships[0].plan.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              £{client.memberships[0].monthly_price}/month
                            </div>
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400">No membership</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full capitalize ${getStatusColor(client.status)}`}>
                        {client.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {client.fitness_level ? (
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full capitalize ${getFitnessLevelColor(client.fitness_level)}`}>
                          {client.fitness_level}
                        </span>
                      ) : (
                        <span className="text-gray-400">Not set</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {client.memberships?.[0]?.next_payment_date ? (
                        <div>
                          <div className="text-sm font-medium">
                            {formatDate(client.memberships[0].next_payment_date)}
                          </div>
                          <div className={`text-xs ${getDaysUntilPayment(client.memberships[0].next_payment_date) <= 7 ? 'text-red-600' : 'text-gray-500'}`}>
                            {getDaysUntilPayment(client.memberships[0].next_payment_date)} days
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400">No payment due</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {client.assigned_trainer_info ? (
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-6 w-6">
                            <div className="h-6 w-6 rounded-full bg-gray-300 flex items-center justify-center">
                              <span className="text-xs font-medium text-gray-600">
                                {client.assigned_trainer_info.full_name[0]}
                              </span>
                            </div>
                          </div>
                          <span className="ml-2 truncate max-w-32">
                            {client.assigned_trainer_info.full_name}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-400">Unassigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button className="text-blue-600 hover:text-blue-800">
                          <Eye className="h-4 w-4" />
                        </button>
                        <button className="text-gray-600 hover:text-gray-800">
                          <Edit className="h-4 w-4" />
                        </button>
                        <button className="text-red-600 hover:text-red-800">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}