'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseClient } from '@/lib/supabase';
import { 
  ArrowLeft, 
  Clock, 
  MessageSquare, 
  Target,
  CheckCircle,
  XCircle,
  AlertCircle,
  Timer
} from 'lucide-react';

interface ResponseMetrics {
  avg_sms_response_time: number;
  avg_email_response_time: number;
  avg_human_response_time: number;
  under_5_min_rate: number;
  under_1_hour_rate: number;
  same_day_response_rate: number;
  total_leads_today: number;
  total_leads_this_week: number;
  total_leads_this_month: number;
  fastest_response_time: number;
  slowest_response_time: number;
}

interface LeadResponse {
  id: string;
  lead_id: string;
  lead_created_at: string;
  sms_response_time_minutes: number | null;
  email_response_time_minutes: number | null;
  human_response_time_minutes: number | null;
  basic_score: number;
  responded_to_sms: boolean;
  responded_to_email: boolean;
  converted_to_trial: boolean;
  converted_to_member: boolean;
  lead: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    source: string;
  };
}

export default function LeadResponseAnalyticsPage() {
  const router = useRouter();
  const [metrics, setMetrics] = useState<ResponseMetrics>({
    avg_sms_response_time: 0,
    avg_email_response_time: 0,
    avg_human_response_time: 0,
    under_5_min_rate: 0,
    under_1_hour_rate: 0,
    same_day_response_rate: 0,
    total_leads_today: 0,
    total_leads_this_week: 0,
    total_leads_this_month: 0,
    fastest_response_time: 0,
    slowest_response_time: 0
  });
  const [recentLeads, setRecentLeads] = useState<LeadResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month'>('week');

  const loadAnalytics = useCallback(async () => {
    try {
      const supabase = createSupabaseClient();
      
      // Get current user and organization
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();

      if (!profile) return;

      // Calculate date range
      const now = new Date();
      let startDate: Date;
      
      switch (timeRange) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
      }

      // Load lead response tracking data
      const { data: responseData, error: responseError } = await supabase
        .from('lead_response_tracking')
        .select(`
          *,
          lead:leads(first_name, last_name, email, phone, source)
        `)
        .eq('organization_id', profile.organization_id)
        .gte('lead_created_at', startDate.toISOString())
        .order('lead_created_at', { ascending: false })
        .limit(50);

      if (responseError) throw responseError;

      setRecentLeads(responseData || []);

      // Calculate metrics
      const validSmsResponses = responseData?.filter(r => r.sms_response_time_minutes !== null) || [];
      const validEmailResponses = responseData?.filter(r => r.email_response_time_minutes !== null) || [];
      const validHumanResponses = responseData?.filter(r => r.human_response_time_minutes !== null) || [];
      
      const totalLeads = responseData?.length || 0;
      const under5MinCount = validSmsResponses.filter(r => r.sms_response_time_minutes! <= 5).length;
      const under1HourCount = validSmsResponses.filter(r => r.sms_response_time_minutes! <= 60).length;
      const sameDayCount = validSmsResponses.filter(r => r.sms_response_time_minutes! <= 1440).length;

      const avgSmsResponse = validSmsResponses.length > 0 
        ? validSmsResponses.reduce((sum, r) => sum + r.sms_response_time_minutes!, 0) / validSmsResponses.length 
        : 0;

      const avgEmailResponse = validEmailResponses.length > 0 
        ? validEmailResponses.reduce((sum, r) => sum + r.email_response_time_minutes!, 0) / validEmailResponses.length 
        : 0;

      const avgHumanResponse = validHumanResponses.length > 0 
        ? validHumanResponses.reduce((sum, r) => sum + r.human_response_time_minutes!, 0) / validHumanResponses.length 
        : 0;

      const fastestResponse = validSmsResponses.length > 0 
        ? Math.min(...validSmsResponses.map(r => r.sms_response_time_minutes!))
        : 0;

      const slowestResponse = validSmsResponses.length > 0 
        ? Math.max(...validSmsResponses.map(r => r.sms_response_time_minutes!))
        : 0;

      setMetrics({
        avg_sms_response_time: avgSmsResponse,
        avg_email_response_time: avgEmailResponse,
        avg_human_response_time: avgHumanResponse,
        under_5_min_rate: totalLeads > 0 ? (under5MinCount / totalLeads) * 100 : 0,
        under_1_hour_rate: totalLeads > 0 ? (under1HourCount / totalLeads) * 100 : 0,
        same_day_response_rate: totalLeads > 0 ? (sameDayCount / totalLeads) * 100 : 0,
        total_leads_today: totalLeads,
        total_leads_this_week: totalLeads,
        total_leads_this_month: totalLeads,
        fastest_response_time: fastestResponse,
        slowest_response_time: slowestResponse
      });

    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const formatTime = (minutes: number): string => {
    if (minutes < 60) {
      return `${Math.round(minutes)}m`;
    } else if (minutes < 1440) {
      return `${Math.round(minutes / 60)}h`;
    } else {
      return `${Math.round(minutes / 1440)}d`;
    }
  };

  const getResponseStatusColor = (responseTime: number | null): string => {
    if (!responseTime) return 'text-gray-500';
    if (responseTime <= 5) return 'text-green-600';
    if (responseTime <= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getResponseStatusIcon = (responseTime: number | null) => {
    if (!responseTime) return <XCircle className="h-4 w-4 text-gray-500" />;
    if (responseTime <= 5) return <CheckCircle className="h-4 w-4 text-green-600" />;
    if (responseTime <= 60) return <AlertCircle className="h-4 w-4 text-yellow-600" />;
    return <XCircle className="h-4 w-4 text-red-600" />;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading analytics...</p>
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
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.back()}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Lead Response Analytics</h1>
                <p className="text-gray-600">Track your 5-minute response time goal</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value as 'today' | 'week' | 'month')}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="today">Today</option>
                <option value="week">Last 7 Days</option>
                <option value="month">Last 30 Days</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Target className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Under 5 Minutes</p>
                <p className="text-2xl font-semibold text-gray-900">{metrics.under_5_min_rate.toFixed(1)}%</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Clock className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Avg Response Time</p>
                <p className="text-2xl font-semibold text-gray-900">{formatTime(metrics.avg_sms_response_time)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <MessageSquare className="h-8 w-8 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Leads</p>
                <p className="text-2xl font-semibold text-gray-900">{metrics.total_leads_today}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Timer className="h-8 w-8 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Fastest Response</p>
                <p className="text-2xl font-semibold text-gray-900">{formatTime(metrics.fastest_response_time)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Performance Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Response Time Goals</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Under 5 minutes</span>
                <span className="text-sm font-semibold text-green-600">{metrics.under_5_min_rate.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Under 1 hour</span>
                <span className="text-sm font-semibold text-yellow-600">{metrics.under_1_hour_rate.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Same day</span>
                <span className="text-sm font-semibold text-blue-600">{metrics.same_day_response_rate.toFixed(1)}%</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Response Channels</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">SMS Average</span>
                <span className="text-sm font-semibold text-gray-900">{formatTime(metrics.avg_sms_response_time)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Email Average</span>
                <span className="text-sm font-semibold text-gray-900">{formatTime(metrics.avg_email_response_time)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Human Contact</span>
                <span className="text-sm font-semibold text-gray-900">{formatTime(metrics.avg_human_response_time)}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Speed Records</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Fastest Response</span>
                <span className="text-sm font-semibold text-green-600">{formatTime(metrics.fastest_response_time)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Slowest Response</span>
                <span className="text-sm font-semibold text-red-600">{formatTime(metrics.slowest_response_time)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Target</span>
                <span className="text-sm font-semibold text-blue-600">&lt; 5 minutes</span>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Leads Table */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Recent Lead Responses</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lead</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SMS Response</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email Response</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lead Score</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {lead.lead?.first_name} {lead.lead?.last_name}
                        </div>
                        <div className="text-sm text-gray-500">{lead.lead?.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {lead.lead?.source}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(lead.lead_created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getResponseStatusIcon(lead.sms_response_time_minutes)}
                        <span className={`ml-2 text-sm ${getResponseStatusColor(lead.sms_response_time_minutes)}`}>
                          {lead.sms_response_time_minutes ? formatTime(lead.sms_response_time_minutes) : 'No response'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getResponseStatusIcon(lead.email_response_time_minutes)}
                        <span className={`ml-2 text-sm ${getResponseStatusColor(lead.email_response_time_minutes)}`}>
                          {lead.email_response_time_minutes ? formatTime(lead.email_response_time_minutes) : 'No response'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 w-10 h-10">
                          <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-gray-900">{lead.basic_score}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex space-x-2">
                        {lead.converted_to_member && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Member
                          </span>
                        )}
                        {lead.converted_to_trial && !lead.converted_to_member && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            Trial
                          </span>
                        )}
                        {!lead.converted_to_trial && !lead.converted_to_member && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            Lead
                          </span>
                        )}
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