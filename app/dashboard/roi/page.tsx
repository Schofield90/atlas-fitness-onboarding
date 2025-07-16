'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseClient } from '@/lib/supabase';
import { 
  ArrowLeft, 
  TrendingUp, 
  DollarSign, 
  Target,
  AlertTriangle,
  Calculator,
  PiggyBank,
  Zap,
  TrendingDown,
  Edit3,
  Save,
  X
} from 'lucide-react';

interface ROIMetrics {
  // Inputs (editable)
  averageTrialValue: number;
  averageMemberLTV: number;
  systemCost: number;
  
  // Real data from automation
  leadsThisMonth: number;
  respondedUnder5Min: number;
  respondedOver5Min: number;
  
  // Conversion rates (industry benchmarks)
  under5MinConversionRate: number;
  over5MinConversionRate: number;
  
  // Calculated money metrics
  revenueFromFastResponse: number;
  revenueFromSlowResponse: number;
  totalRevenue: number;
  potentialRevenue: number;
  leftOnTable: number;
  roi: number;
  paybackDays: number;
  monthlyProfit: number;
}

export default function ROIDashboardPage() {
  const router = useRouter();
  const [metrics, setMetrics] = useState<ROIMetrics>({
    averageTrialValue: 50,
    averageMemberLTV: 600,
    systemCost: 197,
    leadsThisMonth: 0,
    respondedUnder5Min: 0,
    respondedOver5Min: 0,
    under5MinConversionRate: 31,
    over5MinConversionRate: 8,
    revenueFromFastResponse: 0,
    revenueFromSlowResponse: 0,
    totalRevenue: 0,
    potentialRevenue: 0,
    leftOnTable: 0,
    roi: 0,
    paybackDays: 0,
    monthlyProfit: 0
  });
  
  const [loading, setLoading] = useState(true);
  const [editingInputs, setEditingInputs] = useState(false);
  const [inputValues, setInputValues] = useState({
    averageTrialValue: 50,
    averageMemberLTV: 600,
    systemCost: 197
  });

  const loadROIData = useCallback(async () => {
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

      // Get this month's data
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      
      // Load lead response data for this month
      const { data: responseData, error } = await supabase
        .from('lead_response_tracking')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .gte('lead_created_at', startOfMonth.toISOString())
        .order('lead_created_at', { ascending: false });

      if (error) throw error;

      const leadData = responseData || [];
      const totalLeads = leadData.length;
      const under5Min = leadData.filter(lead => 
        lead.sms_response_time_minutes && lead.sms_response_time_minutes <= 5
      ).length;
      const over5Min = leadData.filter(lead => 
        lead.sms_response_time_minutes && lead.sms_response_time_minutes > 5
      ).length;

      // Load stored ROI settings or use defaults
      const { data: settingsData } = await supabase
        .from('organization_settings')
        .select('setting_value')
        .eq('organization_id', profile.organization_id)
        .eq('setting_key', 'roi_settings')
        .single();

      const roiSettings = settingsData?.setting_value || {
        averageTrialValue: 50,
        averageMemberLTV: 600,
        systemCost: 197
      };

      setInputValues(roiSettings);
      
      // Calculate ROI metrics
      const calculatedMetrics = calculateROI({
        ...roiSettings,
        leadsThisMonth: totalLeads,
        respondedUnder5Min: under5Min,
        respondedOver5Min: over5Min
      });

      setMetrics(calculatedMetrics);

    } catch (error) {
      console.error('Error loading ROI data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadROIData();
  }, [loadROIData]);

  const calculateROI = (data: {
    averageTrialValue: number;
    averageMemberLTV: number;
    systemCost: number;
    leadsThisMonth: number;
    respondedUnder5Min: number;
    respondedOver5Min: number;
  }): ROIMetrics => {
    const under5MinConversionRate = 31; // Industry benchmark
    const over5MinConversionRate = 8;   // Industry benchmark
    
    // Calculate revenue from fast responses
    const fastResponseRevenue = data.respondedUnder5Min * (under5MinConversionRate / 100) * data.averageMemberLTV;
    
    // Calculate revenue from slow responses
    const slowResponseRevenue = data.respondedOver5Min * (over5MinConversionRate / 100) * data.averageMemberLTV;
    
    // Calculate what revenue WOULD be if all leads were responded to quickly
    const potentialRevenue = data.leadsThisMonth * (under5MinConversionRate / 100) * data.averageMemberLTV;
    
    // Money left on the table
    const leftOnTable = potentialRevenue - (fastResponseRevenue + slowResponseRevenue);
    
    // Total current revenue
    const totalRevenue = fastResponseRevenue + slowResponseRevenue;
    
    // Monthly profit (revenue - system cost)
    const monthlyProfit = totalRevenue - data.systemCost;
    
    // ROI calculation
    const roi = data.systemCost > 0 ? (monthlyProfit / data.systemCost) * 100 : 0;
    
    // Payback period in days
    const dailyProfit = monthlyProfit / 30;
    const paybackDays = dailyProfit > 0 ? Math.ceil(data.systemCost / dailyProfit) : 0;

    return {
      averageTrialValue: data.averageTrialValue,
      averageMemberLTV: data.averageMemberLTV,
      systemCost: data.systemCost,
      leadsThisMonth: data.leadsThisMonth,
      respondedUnder5Min: data.respondedUnder5Min,
      respondedOver5Min: data.respondedOver5Min,
      under5MinConversionRate,
      over5MinConversionRate,
      revenueFromFastResponse: fastResponseRevenue,
      revenueFromSlowResponse: slowResponseRevenue,
      totalRevenue,
      potentialRevenue,
      leftOnTable,
      roi,
      paybackDays,
      monthlyProfit
    };
  };

  const saveSettings = async () => {
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

      // Save ROI settings
      await supabase
        .from('organization_settings')
        .upsert({
          organization_id: profile.organization_id,
          setting_key: 'roi_settings',
          setting_value: inputValues
        });

      // Recalculate with new values
      const calculatedMetrics = calculateROI({
        ...inputValues,
        leadsThisMonth: metrics.leadsThisMonth,
        respondedUnder5Min: metrics.respondedUnder5Min,
        respondedOver5Min: metrics.respondedOver5Min
      });

      setMetrics(calculatedMetrics);
      setEditingInputs(false);
      
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  const handleInputChange = (field: string, value: number) => {
    setInputValues(prev => ({ ...prev, [field]: value }));
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatPercentage = (value: number): string => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(0)}%`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading ROI data...</p>
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
                <h1 className="text-2xl font-bold text-gray-900">ROI Dashboard</h1>
                <p className="text-gray-600">See the financial impact of faster lead response</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {editingInputs ? (
                <div className="flex space-x-2">
                  <button
                    onClick={saveSettings}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"
                  >
                    <Save className="h-4 w-4" />
                    Save
                  </button>
                  <button
                    onClick={() => setEditingInputs(false)}
                    className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 flex items-center gap-2"
                  >
                    <X className="h-4 w-4" />
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setEditingInputs(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                  <Edit3 className="h-4 w-4" />
                  Edit Values
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Numbers */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Main Revenue Impact */}
          <div className="md:col-span-2 bg-gradient-to-r from-green-500 to-green-600 rounded-lg shadow-lg p-8 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-lg font-medium">Additional Revenue This Month</p>
                <p className="text-4xl font-bold mt-2">{formatCurrency(metrics.totalRevenue)}</p>
                <p className="text-green-100 mt-2">From {metrics.respondedUnder5Min + metrics.respondedOver5Min} responded leads</p>
              </div>
              <div className="text-right">
                <DollarSign className="h-16 w-16 text-green-200" />
              </div>
            </div>
          </div>

          {/* ROI Percentage */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Return on Investment</p>
                <p className={`text-3xl font-bold mt-2 ${metrics.roi >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatPercentage(metrics.roi)}
                </p>
                <p className="text-gray-500 text-sm mt-1">
                  {metrics.paybackDays > 0 ? `${metrics.paybackDays} days to break even` : 'Immediate payback'}
                </p>
              </div>
              <TrendingUp className="h-12 w-12 text-green-500" />
            </div>
          </div>
        </div>

        {/* Money Left on Table Alert */}
        {metrics.leftOnTable > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-8">
            <div className="flex items-start">
              <AlertTriangle className="h-6 w-6 text-red-600 mt-0.5 mr-3" />
              <div>
                <h3 className="text-lg font-semibold text-red-900">You&apos;re Leaving Money on the Table!</h3>
                <p className="text-red-700 mt-1">
                  <span className="font-bold text-xl">{formatCurrency(metrics.leftOnTable)}</span> in potential revenue this month from slow lead responses.
                </p>
                <p className="text-red-600 text-sm mt-2">
                  If all {metrics.leadsThisMonth} leads were responded to within 5 minutes, you could generate {formatCurrency(metrics.potentialRevenue)} total revenue.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Target className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Fast Response Revenue</p>
                <p className="text-2xl font-semibold text-gray-900">{formatCurrency(metrics.revenueFromFastResponse)}</p>
                <p className="text-sm text-green-600">{metrics.respondedUnder5Min} leads under 5min</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrendingDown className="h-8 w-8 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Slow Response Revenue</p>
                <p className="text-2xl font-semibold text-gray-900">{formatCurrency(metrics.revenueFromSlowResponse)}</p>
                <p className="text-sm text-red-600">{metrics.respondedOver5Min} leads over 5min</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <PiggyBank className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Monthly Profit</p>
                <p className={`text-2xl font-semibold ${metrics.monthlyProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(metrics.monthlyProfit)}
                </p>
                <p className="text-sm text-gray-500">After {formatCurrency(metrics.systemCost)} system cost</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Zap className="h-8 w-8 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Leads</p>
                <p className="text-2xl font-semibold text-gray-900">{metrics.leadsThisMonth}</p>
                <p className="text-sm text-gray-500">This month</p>
              </div>
            </div>
          </div>
        </div>

        {/* Conversion Comparison */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Response Time Impact</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-4 bg-green-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-green-900">Under 5 Minutes</p>
                  <p className="text-2xl font-bold text-green-600">{metrics.under5MinConversionRate}%</p>
                  <p className="text-sm text-green-700">conversion rate</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-green-600">{metrics.respondedUnder5Min} leads</p>
                  <p className="text-lg font-semibold text-green-900">{formatCurrency(metrics.revenueFromFastResponse)}</p>
                </div>
              </div>
              
              <div className="flex justify-between items-center p-4 bg-red-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-red-900">Over 5 Minutes</p>
                  <p className="text-2xl font-bold text-red-600">{metrics.over5MinConversionRate}%</p>
                  <p className="text-sm text-red-700">conversion rate</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-red-600">{metrics.respondedOver5Min} leads</p>
                  <p className="text-lg font-semibold text-red-900">{formatCurrency(metrics.revenueFromSlowResponse)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Editable Assumptions */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Your Business Metrics</h3>
              <Calculator className="h-5 w-5 text-gray-400" />
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Average Member Lifetime Value
                </label>
                {editingInputs ? (
                  <input
                    type="number"
                    value={inputValues.averageMemberLTV}
                    onChange={(e) => handleInputChange('averageMemberLTV', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  />
                ) : (
                  <p className="text-lg font-semibold text-gray-900">{formatCurrency(metrics.averageMemberLTV)}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Average Trial Value
                </label>
                {editingInputs ? (
                  <input
                    type="number"
                    value={inputValues.averageTrialValue}
                    onChange={(e) => handleInputChange('averageTrialValue', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  />
                ) : (
                  <p className="text-lg font-semibold text-gray-900">{formatCurrency(metrics.averageTrialValue)}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  System Cost per Month
                </label>
                {editingInputs ? (
                  <input
                    type="number"
                    value={inputValues.systemCost}
                    onChange={(e) => handleInputChange('systemCost', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  />
                ) : (
                  <p className="text-lg font-semibold text-gray-900">{formatCurrency(metrics.systemCost)}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg shadow-lg p-8 text-white text-center">
          <h2 className="text-2xl font-bold mb-4">Ready to Capture Every Lead?</h2>
          <p className="text-lg mb-6">
            Don&apos;t let slow responses cost you {formatCurrency(metrics.leftOnTable)} per month. 
            Start responding to leads in under 5 minutes and maximize your ROI.
          </p>
          <div className="flex justify-center space-x-4">
            <button
              onClick={() => router.push('/automations')}
              className="bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
            >
              Set Up Automation
            </button>
            <button
              onClick={() => router.push('/automations/test')}
              className="bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-800 transition-colors border border-blue-300"
            >
              Test 5-Minute Response
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}