'use client';

import { useState, useEffect } from 'react';
import React from 'react';
import { createSupabaseClient } from '@/lib/supabase';
import { Campaign, UserProfile } from '@/lib/supabase';
import { 
  Plus, 
  Search, 
  Target,
  DollarSign,
  Users,
  TrendingUp,
  Eye,
  Edit,
  Download,
  RefreshCw,
  Pause,
  Facebook,
  Instagram,
  Globe,
  MoreHorizontal,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react';

interface CampaignWithMetrics extends Omit<Campaign, 'created_by'> {
  created_by: { full_name: string; avatar_url: string | null; } | null;
  metrics: {
    impressions: number;
    clicks: number;
    spend: number;
    leads: number;
    conversions: number;
    ctr: number;
    cpc: number;
    cpm: number;
    cost_per_lead: number;
    cost_per_conversion: number;
    roas: number;
  } | null;
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<CampaignWithMetrics[]>([]);
  const [filteredCampaigns, setFilteredCampaigns] = useState<CampaignWithMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [platformFilter, setPlatformFilter] = useState('all');
  const [objectiveFilter, setObjectiveFilter] = useState('all');
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [metaIntegration, setMetaIntegration] = useState<{
    connected: boolean;
    account_name?: string;
    last_sync?: string;
  } | null>(null);

  useEffect(() => {
    loadCampaigns();
    checkMetaIntegration();
  }, []);

  const filterCampaigns = React.useCallback(() => {
    let filtered = [...campaigns];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(campaign => 
        campaign.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        campaign.type.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(campaign => campaign.status === statusFilter);
    }

    // Platform filter
    if (platformFilter !== 'all') {
      filtered = filtered.filter(campaign => campaign.type === platformFilter);
    }

    // Type filter
    if (objectiveFilter !== 'all') {
      filtered = filtered.filter(campaign => campaign.type === objectiveFilter);
    }

    setFilteredCampaigns(filtered);
  }, [campaigns, searchTerm, statusFilter, platformFilter, objectiveFilter]);

  useEffect(() => {
    filterCampaigns();
  }, [campaigns, searchTerm, statusFilter, platformFilter, objectiveFilter, filterCampaigns]);

  const loadCampaigns = async () => {
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

      // Get campaigns
      const response = await fetch(`/api/campaigns?organization_id=${profile.organization_id}`);
      const data = await response.json();

      if (response.ok) {
        setCampaigns(data.campaigns || []);
      } else {
        console.error('Error fetching campaigns:', data.error);
      }
    } catch (error) {
      console.error('Error loading campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkMetaIntegration = async () => {
    try {
      const supabase = createSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();

      if (!profile) return;

      const response = await fetch(`/api/integrations/meta?organization_id=${profile.organization_id}`);
      const data = await response.json();

      if (response.ok) {
        setMetaIntegration(data);
      }
    } catch (error) {
      console.error('Error checking Meta integration:', error);
    }
  };

  const syncMetaData = async () => {
    if (!currentUser) return;

    try {
      const response = await fetch('/api/integrations/meta', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          organization_id: currentUser.organization_id,
          user_id: currentUser.id,
          force_sync: true,
        }),
      });

      if (response.ok) {
        await loadCampaigns();
        await checkMetaIntegration();
      }
    } catch (error) {
      console.error('Error syncing Meta data:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'deleted': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="h-4 w-4" />;
      case 'paused': return <Pause className="h-4 w-4" />;
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'deleted': return <XCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'facebook': return <Facebook className="h-4 w-4" />;
      case 'instagram': return <Instagram className="h-4 w-4" />;
      case 'google': return <Globe className="h-4 w-4" />;
      default: return <Globe className="h-4 w-4" />;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-GB').format(num);
  };

  const formatPercentage = (num: number) => {
    return `${(num * 100).toFixed(2)}%`;
  };

  // Calculate summary metrics
  const summaryMetrics = campaigns.reduce((acc, campaign) => {
    const metrics = campaign.metrics;
    if (metrics) {
      acc.totalSpend += metrics.spend;
      acc.totalImpressions += metrics.impressions;
      acc.totalClicks += metrics.clicks;
      acc.totalLeads += metrics.leads;
      acc.totalConversions += metrics.conversions;
    }
    return acc;
  }, {
    totalSpend: 0,
    totalImpressions: 0,
    totalClicks: 0,
    totalLeads: 0,
    totalConversions: 0,
  });

  const avgCTR = summaryMetrics.totalImpressions > 0 ? summaryMetrics.totalClicks / summaryMetrics.totalImpressions : 0;
  const avgCPC = summaryMetrics.totalClicks > 0 ? summaryMetrics.totalSpend / summaryMetrics.totalClicks : 0;
  const avgCostPerLead = summaryMetrics.totalLeads > 0 ? summaryMetrics.totalSpend / summaryMetrics.totalLeads : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading campaigns...</p>
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
              <h1 className="text-2xl font-bold text-gray-900">Campaign Management</h1>
              <p className="text-gray-600">{filteredCampaigns.length} campaigns found</p>
            </div>
            <div className="flex items-center space-x-4">
              {metaIntegration?.connected && (
                <button
                  onClick={syncMetaData}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Sync Meta
                </button>
              )}
              <button
                onClick={() => window.location.href = '/campaigns/new'}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Campaign
              </button>
              <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                <Download className="h-4 w-4 mr-2" />
                Export
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Meta Integration Status */}
      {!metaIntegration?.connected && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-yellow-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">
                  Meta Ads Integration Required
                </h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>
                    Connect your Meta Ads account to automatically sync campaigns and capture leads.
                  </p>
                </div>
                <div className="mt-4">
                  <button
                    onClick={() => window.location.href = '/settings/integrations'}
                    className="text-sm font-medium text-yellow-800 hover:text-yellow-600"
                  >
                    Connect Meta Ads Account →
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Summary Metrics */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <DollarSign className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Spend</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {formatCurrency(summaryMetrics.totalSpend)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Eye className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Impressions</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {formatNumber(summaryMetrics.totalImpressions)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Target className="h-8 w-8 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Clicks</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {formatNumber(summaryMetrics.totalClicks)}
                </p>
                <p className="text-sm text-gray-500">
                  CTR: {formatPercentage(avgCTR)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-8 w-8 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Leads</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {formatNumber(summaryMetrics.totalLeads)}
                </p>
                <p className="text-sm text-gray-500">
                  Cost: {formatCurrency(avgCostPerLead)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Conversions</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {formatNumber(summaryMetrics.totalConversions)}
                </p>
                <p className="text-sm text-gray-500">
                  CPC: {formatCurrency(avgCPC)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search campaigns..."
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
                <option value="paused">Paused</option>
                <option value="completed">Completed</option>
              </select>
              <select
                value={platformFilter}
                onChange={(e) => setPlatformFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Platforms</option>
                <option value="facebook">Facebook</option>
                <option value="instagram">Instagram</option>
                <option value="google">Google</option>
              </select>
              <select
                value={objectiveFilter}
                onChange={(e) => setObjectiveFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Objectives</option>
                <option value="LEAD_GENERATION">Lead Generation</option>
                <option value="REACH">Reach</option>
                <option value="TRAFFIC">Traffic</option>
                <option value="ENGAGEMENT">Engagement</option>
                <option value="CONVERSIONS">Conversions</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Campaigns Table */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Campaign
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Platform
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Budget
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Performance
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Leads
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredCampaigns.map((campaign) => (
                  <tr key={campaign.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <Target className="h-5 w-5 text-blue-600" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {campaign.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {campaign.type}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(campaign.status)}`}>
                        {getStatusIcon(campaign.status)}
                        <span className="ml-1 capitalize">{campaign.status}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getPlatformIcon(campaign.type)}
                        <span className="ml-2 text-sm text-gray-900 capitalize">
                          {campaign.type}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>
                        <div className="font-medium">
                          {formatCurrency(campaign.budget || 0)}
                        </div>
                        <div className="text-gray-500 capitalize">
                          daily
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {campaign.metrics ? (
                        <div className="space-y-1">
                          <div className="flex justify-between">
                            <span>Spend:</span>
                            <span>{formatCurrency(campaign.metrics.spend)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>CTR:</span>
                            <span>{formatPercentage(campaign.metrics.ctr)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>CPC:</span>
                            <span>{formatCurrency(campaign.metrics.cpc)}</span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400">No data</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {campaign.metrics ? (
                        <div className="space-y-1">
                          <div className="font-medium">
                            {formatNumber(campaign.metrics.leads)} leads
                          </div>
                          <div className="text-gray-500">
                            {formatCurrency(campaign.metrics.cost_per_lead)} per lead
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400">No data</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div>
                        {new Date(campaign.created_at).toLocaleDateString()}
                      </div>
                      <div className="text-xs">
                        by {campaign.created_by?.full_name || 'Unknown'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => window.location.href = `/campaigns/${campaign.id}`}
                          className="text-blue-600 hover:text-blue-800"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => window.location.href = `/campaigns/${campaign.id}/edit`}
                          className="text-gray-600 hover:text-gray-800"
                          title="Edit Campaign"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          className="text-gray-600 hover:text-gray-800"
                          title="More Options"
                        >
                          <MoreHorizontal className="h-4 w-4" />
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