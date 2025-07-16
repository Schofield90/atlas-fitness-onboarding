'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseClient } from '@/lib/supabase';
import { 
  Zap, 
  Users, 
  UserPlus, 
  Calendar,
  CreditCard,
  Clock,
  TrendingUp,
  MessageSquare,
  CheckCircle,
  Settings,
  Play,
  BarChart3,
  TestTube,
  Settings2,
  BarChart
} from 'lucide-react';
import { AutomationTemplate, GymAutomation, AutomationMetrics } from '@/lib/types/simple-automation';

export default function AutomationsPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<AutomationTemplate[]>([]);
  const [automations, setAutomations] = useState<GymAutomation[]>([]);
  const [metrics, setMetrics] = useState<AutomationMetrics>({
    total_executions: 0,
    successful_executions: 0,
    success_rate: 0,
    avg_response_time_minutes: 0,
    sms_sent_today: 0,
    leads_contacted_today: 0,
    conversion_rate: 0,
    roi_estimate: 0,
  });
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const supabase = createSupabaseClient();
      
      // Load templates
      const { data: templatesData, error: templatesError } = await supabase
        .from('automation_templates')
        .select('*')
        .eq('is_active', true)
        .order('category', { ascending: true });

      if (templatesError) throw templatesError;
      setTemplates(templatesData || []);

      // Load gym automations
      const { data: automationsData, error: automationsError } = await supabase
        .from('gym_automations')
        .select(`
          *,
          template:automation_templates(*)
        `)
        .order('created_at', { ascending: false });

      if (automationsError) throw automationsError;
      setAutomations(automationsData || []);

      // Load basic metrics
      await loadMetrics();
    } catch (error) {
      console.error('Error loading automation data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const loadMetrics = async () => {
    try {
      const supabase = createSupabaseClient();
      
      // Get execution stats
      const { count: totalExecutions } = await supabase
        .from('automation_executions')
        .select('*', { count: 'exact', head: true });

      const { count: successfulExecutions } = await supabase
        .from('automation_executions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed');

      // Get today's SMS count
      const today = new Date().toISOString().split('T')[0];
      const { count: smsToday } = await supabase
        .from('sms_deliveries')
        .select('*', { count: 'exact', head: true })
        .gte('triggered_at', `${today}T00:00:00Z`)
        .lt('triggered_at', `${today}T23:59:59Z`);

      // Get leads contacted today
      const { count: leadsToday } = await supabase
        .from('lead_response_tracking')
        .select('*', { count: 'exact', head: true })
        .gte('lead_created_at', `${today}T00:00:00Z`)
        .lt('lead_created_at', `${today}T23:59:59Z`);

      setMetrics({
        total_executions: totalExecutions || 0,
        successful_executions: successfulExecutions || 0,
        success_rate: totalExecutions ? ((successfulExecutions || 0) / totalExecutions) * 100 : 0,
        avg_response_time_minutes: 8, // Placeholder - calculate from lead_response_tracking
        sms_sent_today: smsToday || 0,
        leads_contacted_today: leadsToday || 0,
        conversion_rate: 23, // Placeholder - calculate from actual conversions
        roi_estimate: 450, // Placeholder - calculate from revenue attribution
      });
    } catch (error) {
      console.error('Error loading metrics:', error);
    }
  };

  const toggleAutomation = async (templateId: string, currentlyActive: boolean) => {
    try {
      const supabase = createSupabaseClient();
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user profile for organization
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();

      if (!profile) return;

      if (currentlyActive) {
        // Deactivate
        const { error } = await supabase
          .from('gym_automations')
          .update({ is_active: false })
          .eq('template_id', templateId)
          .eq('organization_id', profile.organization_id);

        if (error) throw error;
      } else {
        // Get template for default config
        const template = templates.find(t => t.id === templateId);
        if (!template) return;

        // Activate (create or update)
        const { error } = await supabase
          .from('gym_automations')
          .upsert({
            organization_id: profile.organization_id,
            template_id: templateId,
            is_active: true,
            config: template.default_config,
            created_by: user.id,
          });

        if (error) throw error;
      }

      await loadData();
    } catch (error) {
      console.error('Error toggling automation:', error);
    }
  };

  const getTemplateIcon = (templateKey: string) => {
    switch (templateKey) {
      case 'lead_follow_up': return <UserPlus className="h-6 w-6" />;
      case 'dormant_member': return <Users className="h-6 w-6" />;
      case 'birthday_engagement': return <Calendar className="h-6 w-6" />;
      case 'trial_conversion': return <TrendingUp className="h-6 w-6" />;
      case 'payment_recovery': return <CreditCard className="h-6 w-6" />;
      default: return <Zap className="h-6 w-6" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'lead_management': return 'bg-blue-100 text-blue-800';
      case 'member_retention': return 'bg-green-100 text-green-800';
      case 'engagement': return 'bg-purple-100 text-purple-800';
      case 'recovery': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const isTemplateActive = (templateId: string) => {
    return automations.some(a => a.template_id === templateId && a.is_active);
  };

  const getTemplateStats = (templateId: string) => {
    const automation = automations.find(a => a.template_id === templateId);
    return automation ? {
      triggered: automation.triggered_count,
      successful: automation.successful_count,
      successRate: automation.triggered_count > 0 ? Math.round((automation.successful_count / automation.triggered_count) * 100) : 0
    } : { triggered: 0, successful: 0, successRate: 0 };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading automations...</p>
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
              <h1 className="text-2xl font-bold text-gray-900">Smart Automations</h1>
              <p className="text-gray-600">Pre-built automations that actually work for gyms</p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => router.push('/automations/analytics')}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <BarChart className="h-4 w-4" />
                Analytics
              </button>
              <button
                onClick={() => router.push('/automations/sms-config')}
                className="bg-gray-100 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-200 flex items-center gap-2"
              >
                <Settings2 className="h-4 w-4" />
                SMS Setup
              </button>
              <button
                onClick={() => router.push('/automations/test')}
                className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 flex items-center gap-2"
              >
                <TestTube className="h-4 w-4" />
                Test Automation
              </button>
              <div className="text-right">
                <p className="text-sm text-gray-500">Response Time Goal</p>
                <p className="text-lg font-semibold text-blue-600">&lt; 5 minutes</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Clock className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Avg Response Time</p>
                <p className="text-2xl font-semibold text-gray-900">{metrics.avg_response_time_minutes}m</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <MessageSquare className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">SMS Sent Today</p>
                <p className="text-2xl font-semibold text-gray-900">{metrics.sms_sent_today}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrendingUp className="h-8 w-8 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Conversion Rate</p>
                <p className="text-2xl font-semibold text-gray-900">{metrics.conversion_rate}%</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <BarChart3 className="h-8 w-8 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Monthly ROI</p>
                <p className="text-2xl font-semibold text-gray-900">£{metrics.roi_estimate}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Automation Templates */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Automation Templates</h2>
            <p className="text-sm text-gray-500">Toggle automations on/off. Each takes under 5 minutes to configure.</p>
          </div>
          
          <div className="divide-y divide-gray-200">
            {templates.map((template) => {
              const isActive = isTemplateActive(template.id);
              const stats = getTemplateStats(template.id);
              
              return (
                <div key={template.id} className="px-6 py-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className={`flex-shrink-0 p-3 rounded-lg ${isActive ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                        {getTemplateIcon(template.template_key)}
                      </div>
                      <div className="ml-4 flex-1">
                        <h3 className="text-lg font-medium text-gray-900">{template.name}</h3>
                        <p className="text-sm text-gray-500 mt-1">{template.description}</p>
                        <div className="flex items-center mt-3 space-x-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(template.category)}`}>
                            {template.category.replace('_', ' ')}
                          </span>
                          <div className="flex items-center text-sm text-gray-500">
                            <Clock className="h-4 w-4 mr-1" />
                            {template.setup_time_minutes} min setup
                          </div>
                          {isActive && (
                            <div className="flex items-center space-x-3 text-sm">
                              <span className="text-gray-600">{stats.triggered} triggered</span>
                              <span className="text-green-600">{stats.successRate}% success</span>
                            </div>
                          )}
                        </div>
                        <div className="mt-2">
                          <p className="text-sm font-medium text-blue-600">{template.expected_impact}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <button
                        onClick={() => toggleAutomation(template.id, isActive)}
                        className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${
                          isActive 
                            ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {isActive ? (
                          <>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Active
                          </>
                        ) : (
                          <>
                            <Play className="h-4 w-4 mr-2" />
                            Activate
                          </>
                        )}
                      </button>
                      
                      {isActive && (
                        <button
                          onClick={() => router.push(`/automations/${template.id}/configure`)}
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                          title="Configure automation"
                        >
                          <Settings className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ROI Calculator */}
        <div className="mt-8 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Estimated Monthly Impact</h3>
              <p className="text-sm text-gray-600">Based on industry benchmarks for gyms your size</p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-blue-600">£{metrics.roi_estimate * 12}/year</p>
              <p className="text-sm text-gray-600">in additional revenue</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-6 mt-6">
            <div className="text-center">
              <p className="text-2xl font-semibold text-gray-900">30%</p>
              <p className="text-sm text-gray-600">Faster lead response</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-semibold text-gray-900">20%</p>
              <p className="text-sm text-gray-600">Reduction in churn</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-semibold text-gray-900">15%</p>
              <p className="text-sm text-gray-600">Better trial conversion</p>
            </div>
          </div>
          <div className="mt-6 text-center space-x-4">
            <button
              onClick={() => router.push('/dashboard/roi')}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-semibold"
            >
              See Full ROI Breakdown
            </button>
            <button
              onClick={() => router.push('/demo')}
              className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-lg hover:from-purple-700 hover:to-pink-700 font-semibold"
            >
              Watch 5-Minute Demo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}