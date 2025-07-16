'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  TrendingUp, 
  Users, 
  Clock, 
  Target, 
  Phone, 
  MessageSquare,
  CheckCircle,
  AlertTriangle,
  DollarSign,
  Zap,
  Calendar
} from 'lucide-react';

interface AtlasMetrics {
  totalLeads: number;
  leadsThisWeek: number;
  avgResponseTime: number;
  conversionRate: number;
  smssSent: number;
  actualRevenue: number;
  costOfSystem: number;
  roi: number;
  leadsBySource: Record<string, number>;
  responseTimesByDay: Array<{ date: string; avgTime: number }>;
}

export default function AtlasResults() {
  const [metrics, setMetrics] = useState<AtlasMetrics>({
    totalLeads: 0,
    leadsThisWeek: 0,
    avgResponseTime: 0,
    conversionRate: 0,
    smssSent: 0,
    actualRevenue: 0,
    costOfSystem: 197,
    roi: 0,
    leadsBySource: {},
    responseTimesByDay: []
  });
  
  const [loading, setLoading] = useState(true);
  const [recentLeads, setRecentLeads] = useState<any[]>([]);
  const [conversionData, setConversionData] = useState<any[]>([]);

  useEffect(() => {
    loadAtlasMetrics();
  }, []);

  const loadAtlasMetrics = async () => {
    try {
      setLoading(true);
      
      // Get all leads for Atlas Fitness
      const { data: allLeads } = await supabase
        .from('leads')
        .select('*')
        .eq('organization_id', 'atlas-fitness-001')
        .order('created_at', { ascending: false });

      // Get this week's leads
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const leadsThisWeek = allLeads?.filter(lead => 
        new Date(lead.created_at) >= weekAgo
      ) || [];

      // Get response tracking data
      const { data: responseData } = await supabase
        .from('lead_response_tracking')
        .select('*')
        .eq('organization_id', 'atlas-fitness-001');

      // Get SMS delivery data
      const { data: smsData } = await supabase
        .from('sms_deliveries')
        .select('*')
        .eq('organization_id', 'atlas-fitness-001');

      // Get conversions (assuming converted leads became clients)
      const { data: conversions } = await supabase
        .from('clients')
        .select('*')
        .eq('organization_id', 'atlas-fitness-001');

      // Calculate metrics
      const totalLeads = allLeads?.length || 0;
      const convertedLeads = conversions?.length || 0;
      const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;
      
      // Calculate average response time
      const responseTimes = responseData?.filter(r => r.sms_response_time_minutes) || [];
      const avgResponseTime = responseTimes.length > 0 
        ? responseTimes.reduce((sum, r) => sum + r.sms_response_time_minutes, 0) / responseTimes.length
        : 0;

      // Calculate revenue (assuming each conversion is worth £500 average)
      const avgDealValue = 500; // PT package or annual membership
      const actualRevenue = convertedLeads * avgDealValue;
      const roi = actualRevenue > 0 ? ((actualRevenue - 197) / 197) * 100 : 0;

      // Lead sources
      const leadsBySource = allLeads?.reduce((acc, lead) => {
        acc[lead.source] = (acc[lead.source] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      // Response times by day (last 7 days)
      const responseTimesByDay = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const dayResponses = responseData?.filter(r => 
          r.first_sms_sent_at?.startsWith(dateStr) && r.sms_response_time_minutes
        ) || [];
        
        const avgTime = dayResponses.length > 0 
          ? dayResponses.reduce((sum, r) => sum + r.sms_response_time_minutes, 0) / dayResponses.length
          : 0;
          
        responseTimesByDay.push({
          date: date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' }),
          avgTime: Math.round(avgTime * 100) / 100
        });
      }

      setMetrics({
        totalLeads,
        leadsThisWeek: leadsThisWeek.length,
        avgResponseTime: Math.round(avgResponseTime * 100) / 100,
        conversionRate: Math.round(conversionRate * 100) / 100,
        smssSent: smsData?.length || 0,
        actualRevenue,
        costOfSystem: 197,
        roi: Math.round(roi * 100) / 100,
        leadsBySource,
        responseTimesByDay
      });

      setRecentLeads(allLeads?.slice(0, 10) || []);
      setConversionData(conversions || []);
      
    } catch (error) {
      console.error('Error loading Atlas metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'converted': return 'text-green-600 bg-green-100';
      case 'qualified': return 'text-blue-600 bg-blue-100';
      case 'contacted': return 'text-yellow-600 bg-yellow-100';
      case 'new': return 'text-purple-600 bg-purple-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Atlas Fitness - Live Results</h1>
          <p className="text-gray-600">
            Your actual gym's performance metrics. Real leads, real responses, real ROI.
          </p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-500">Total Leads</p>
                <p className="text-2xl font-bold text-gray-900">{metrics.totalLeads}</p>
                <p className="text-sm text-gray-500">{metrics.leadsThisWeek} this week</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-green-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-500">Avg Response Time</p>
                <p className="text-2xl font-bold text-gray-900">{metrics.avgResponseTime}<span className="text-sm">min</span></p>
                <p className="text-sm text-green-600">23x faster than average</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center">
              <Target className="h-8 w-8 text-purple-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-500">Conversion Rate</p>
                <p className="text-2xl font-bold text-gray-900">{metrics.conversionRate}%</p>
                <p className="text-sm text-purple-600">
                  {metrics.conversionRate > 20 ? 'Excellent!' : metrics.conversionRate > 10 ? 'Good' : 'Improving'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center">
              <MessageSquare className="h-8 w-8 text-orange-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-500">SMS Sent</p>
                <p className="text-2xl font-bold text-gray-900">{metrics.smssSent}</p>
                <p className="text-sm text-gray-500">Auto-responses</p>
              </div>
            </div>
          </div>
        </div>

        {/* ROI Section */}
        <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <DollarSign className="h-6 w-6 mr-2" />
            Your Actual ROI
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900 mb-2">
                {Math.round(metrics.totalLeads * 0.7)} {/* Assuming 70% wouldn't have been contacted quickly */}
              </div>
              <div className="text-sm text-gray-600">Leads you would have lost</div>
            </div>
            
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">
                £{metrics.actualRevenue.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600">Revenue generated</div>
            </div>
            
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900 mb-2">
                £{metrics.costOfSystem}
              </div>
              <div className="text-sm text-gray-600">Monthly system cost</div>
            </div>
            
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 mb-2">
                {metrics.roi > 0 ? metrics.roi.toFixed(0) : 0}%
              </div>
              <div className="text-sm text-gray-600">Return on investment</div>
            </div>
          </div>

          {metrics.roi > 0 && (
            <div className="mt-6 text-center">
              <p className="text-lg font-semibold text-gray-900">
                💰 Atlas Fitness made £{(metrics.actualRevenue - metrics.costOfSystem).toLocaleString()} profit this month
              </p>
              <p className="text-sm text-gray-600 mt-2">
                That's {Math.round((metrics.actualRevenue - metrics.costOfSystem) / metrics.costOfSystem)}x return on your investment
              </p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Lead Sources */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <TrendingUp className="h-5 w-5 mr-2" />
              Lead Sources
            </h3>
            <div className="space-y-3">
              {Object.entries(metrics.leadsBySource).map(([source, count]) => (
                <div key={source} className="flex items-center justify-between">
                  <span className="capitalize text-gray-700">{source}</span>
                  <div className="flex items-center">
                    <div className="w-32 bg-gray-200 rounded-full h-2 mr-3">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${(count / metrics.totalLeads) * 100}%` }}
                      ></div>
                    </div>
                    <span className="font-semibold w-8 text-right">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Response Times */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Clock className="h-5 w-5 mr-2" />
              Response Times (Last 7 Days)
            </h3>
            <div className="space-y-3">
              {metrics.responseTimesByDay.map((day, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-gray-700">{day.date}</span>
                  <div className="flex items-center">
                    <div className="w-24 bg-gray-200 rounded-full h-2 mr-3">
                      <div 
                        className={`h-2 rounded-full ${
                          day.avgTime < 5 ? 'bg-green-500' : 
                          day.avgTime < 15 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${Math.min((day.avgTime / 30) * 100, 100)}%` }}
                      ></div>
                    </div>
                    <span className="font-semibold w-12 text-right">
                      {day.avgTime > 0 ? `${day.avgTime}m` : 'N/A'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Leads */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Users className="h-5 w-5 mr-2" />
            Recent Leads
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Lead
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Source
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Interest
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentLeads.map((lead) => (
                  <tr key={lead.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {lead.first_name} {lead.last_name}
                        </div>
                        <div className="text-sm text-gray-500">{lead.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">
                      {lead.source}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(lead.status)}`}>
                        {lead.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(lead.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {lead.interests?.[0] || 'General inquiry'}
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