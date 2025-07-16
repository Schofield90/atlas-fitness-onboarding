'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Phone, 
  MessageSquare, 
  CheckCircle, 
  AlertTriangle, 
  Play,
  Settings,
  Target,
  Zap,
  Users,
  TrendingUp
} from 'lucide-react';

export default function AtlasSetup() {
  const [testResults, setTestResults] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [metrics, setMetrics] = useState({
    leadsToday: 0,
    avgResponseTime: 0,
    conversionRate: 0
  });

  useEffect(() => {
    loadAtlasMetrics();
  }, []);

  const loadAtlasMetrics = async () => {
    try {
      // Get today's leads for Atlas Fitness
      const today = new Date().toISOString().split('T')[0];
      const { data: leads } = await supabase
        .from('leads')
        .select('*')
        .eq('organization_id', 'atlas-fitness-001')
        .gte('created_at', today);

      // Get response tracking data
      const { data: responses } = await supabase
        .from('lead_response_tracking')
        .select('*')
        .eq('organization_id', 'atlas-fitness-001')
        .not('sms_response_time_minutes', 'is', null);

      const avgResponseTime = responses?.length 
        ? responses.reduce((sum, r) => sum + (r.sms_response_time_minutes || 0), 0) / responses.length
        : 0;

      const conversionRate = leads?.length 
        ? (leads.filter(l => l.status === 'converted').length / leads.length) * 100
        : 0;

      setMetrics({
        leadsToday: leads?.length || 0,
        avgResponseTime: Math.round(avgResponseTime * 100) / 100,
        conversionRate: Math.round(conversionRate * 100) / 100
      });
    } catch (error) {
      console.error('Error loading metrics:', error);
    }
  };

  const testSMSToOwner = async () => {
    setLoading({ ...loading, sms: true });
    try {
      const response = await fetch('/api/sms/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: '+44 7700 900123', // Your actual number
          message: '🎉 Atlas Fitness CRM: System test successful! New lead "Sarah Johnson" just inquired about PT. Response sent in 1:23. - Your CRM'
        })
      });
      
      const result = await response.json();
      setTestResults({ ...testResults, sms: result.success });
    } catch (error) {
      console.error('SMS test failed:', error);
      setTestResults({ ...testResults, sms: false });
    } finally {
      setLoading({ ...loading, sms: false });
    }
  };

  const testMetaWebhook = async () => {
    setLoading({ ...loading, webhook: true });
    try {
      // Simulate a Meta webhook with test data
      const testLead = {
        id: 'test-webhook-' + Date.now(),
        created_time: new Date().toISOString(),
        ad_id: 'test-ad-123',
        campaign_id: 'test-campaign-456',
        form_id: 'test-form-789',
        field_data: [
          { name: 'full_name', values: ['Test Sarah Johnson'] },
          { name: 'email', values: ['test.sarah@example.com'] },
          { name: 'phone_number', values: ['+44 7700 900456'] }
        ]
      };

      const response = await fetch('/api/webhooks/meta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          object: 'page',
          entry: [{
            id: 'test-page-123',
            time: Date.now(),
            changes: [{
              field: 'leadgen',
              value: {
                leadgen_id: testLead.id,
                page_id: 'test-page-123',
                form_id: testLead.form_id,
                adgroup_id: testLead.ad_id,
                campaign_id: testLead.campaign_id,
                ad_id: testLead.ad_id,
                created_time: Math.floor(Date.now() / 1000)
              }
            }]
          }]
        })
      });

      const result = await response.json();
      setTestResults({ ...testResults, webhook: response.ok });
      
      if (response.ok) {
        loadAtlasMetrics(); // Refresh metrics
      }
    } catch (error) {
      console.error('Webhook test failed:', error);
      setTestResults({ ...testResults, webhook: false });
    } finally {
      setLoading({ ...loading, webhook: false });
    }
  };

  const createTestLead = async () => {
    setLoading({ ...loading, lead: true });
    try {
      const { data, error } = await supabase
        .from('leads')
        .insert([{
          organization_id: 'atlas-fitness-001',
          first_name: 'Test',
          last_name: 'Lead',
          email: 'test.lead@example.com',
          phone: '+44 7700 900999',
          source: 'manual_test',
          campaign: 'System Test',
          status: 'new',
          interests: ['personal training', 'system test'],
          notes: 'Test lead created from Atlas Setup page'
        }])
        .select()
        .single();

      if (error) throw error;

      setTestResults({ ...testResults, lead: true });
      loadAtlasMetrics(); // Refresh metrics
    } catch (error) {
      console.error('Test lead creation failed:', error);
      setTestResults({ ...testResults, lead: false });
    } finally {
      setLoading({ ...loading, lead: false });
    }
  };

  const automationMessages = {
    pt_inquiry: `Hi {{first_name}}! Thanks for your interest in PT at Atlas Fitness. I'm Sam, the owner. When works best for a quick chat about your fitness goals? I have slots tomorrow at 10am or 2pm. - Sam`,
    trial_signup: `Hi {{first_name}}! 🎉 Your free trial at Atlas Fitness is confirmed! Quick question - are you more interested in weight training or classes? Just want to make sure your first session is perfect. - Sam`,
    membership_inquiry: `Hi {{first_name}}! Thanks for your interest in joining Atlas Fitness. I'd love to show you around and find the perfect membership for you. Are you free for a quick tour tomorrow? - Sam`
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Atlas Fitness Live Setup</h1>
        <p className="text-gray-600">
          Set up and test your own gym's lead response system. This is your live environment - real leads, real responses, real results.
        </p>
      </div>

      {/* Live Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-blue-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-500">Leads Today</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.leadsToday}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center">
            <Zap className="h-8 w-8 text-green-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-500">Avg Response Time</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.avgResponseTime}min</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center">
            <Target className="h-8 w-8 text-purple-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-500">Conversion Rate</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.conversionRate}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* System Tests */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
        <h2 className="text-xl font-semibold mb-6 flex items-center">
          <Settings className="h-5 w-5 mr-2" />
          System Tests
        </h2>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center">
              <Phone className="h-5 w-5 text-blue-600 mr-3" />
              <div>
                <p className="font-medium">SMS to Your Phone</p>
                <p className="text-sm text-gray-500">Test SMS delivery to +44 7700 900123</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {testResults.sms !== undefined && (
                testResults.sms ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                )
              )}
              <button
                onClick={testSMSToOwner}
                disabled={loading.sms}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {loading.sms ? 'Testing...' : 'Test SMS'}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center">
              <MessageSquare className="h-5 w-5 text-green-600 mr-3" />
              <div>
                <p className="font-medium">Meta Webhook</p>
                <p className="text-sm text-gray-500">Test Facebook lead webhook integration</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {testResults.webhook !== undefined && (
                testResults.webhook ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                )
              )}
              <button
                onClick={testMetaWebhook}
                disabled={loading.webhook}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
              >
                {loading.webhook ? 'Testing...' : 'Test Webhook'}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center">
              <Play className="h-5 w-5 text-purple-600 mr-3" />
              <div>
                <p className="font-medium">Create Test Lead</p>
                <p className="text-sm text-gray-500">Create a test lead and trigger automation</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {testResults.lead !== undefined && (
                testResults.lead ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                )
              )}
              <button
                onClick={createTestLead}
                disabled={loading.lead}
                className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 disabled:opacity-50"
              >
                {loading.lead ? 'Creating...' : 'Create Test Lead'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Your Automations */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
        <h2 className="text-xl font-semibold mb-6">Your Atlas Fitness Automations</h2>
        
        <div className="space-y-6">
          <div className="border border-green-200 bg-green-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-green-800">PT Lead Response</h3>
              <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm">ACTIVE</span>
            </div>
            <p className="text-sm text-green-700 mb-3">
              When someone inquires about personal training
            </p>
            <textarea
              className="w-full p-3 border border-green-300 rounded text-sm"
              rows={3}
              value={automationMessages.pt_inquiry}
              readOnly
            />
          </div>

          <div className="border border-blue-200 bg-blue-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-blue-800">Free Trial Welcome</h3>
              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">ACTIVE</span>
            </div>
            <p className="text-sm text-blue-700 mb-3">
              When someone signs up for a free trial
            </p>
            <textarea
              className="w-full p-3 border border-blue-300 rounded text-sm"
              rows={3}
              value={automationMessages.trial_signup}
              readOnly
            />
          </div>

          <div className="border border-purple-200 bg-purple-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-purple-800">Membership Inquiry</h3>
              <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-sm">ACTIVE</span>
            </div>
            <p className="text-sm text-purple-700 mb-3">
              When someone asks about membership options
            </p>
            <textarea
              className="w-full p-3 border border-purple-300 rounded text-sm"
              rows={3}
              value={automationMessages.membership_inquiry}
              readOnly
            />
          </div>
        </div>
      </div>

      {/* Next Steps */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Next Steps to Go Live</h2>
        <div className="space-y-3">
          <div className="flex items-start">
            <div className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5">1</div>
            <div>
              <p className="font-medium">Run the SQL setup script</p>
              <p className="text-sm text-gray-600">Execute atlas-setup.sql in your Supabase dashboard</p>
            </div>
          </div>
          
          <div className="flex items-start">
            <div className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5">2</div>
            <div>
              <p className="font-medium">Add your environment variables</p>
              <p className="text-sm text-gray-600">META_ACCESS_TOKEN, TWILIO credentials, etc.</p>
            </div>
          </div>
          
          <div className="flex items-start">
            <div className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5">3</div>
            <div>
              <p className="font-medium">Set up Facebook webhook</p>
              <p className="text-sm text-gray-600">Point to: https://your-domain.vercel.app/api/webhooks/meta</p>
            </div>
          </div>
          
          <div className="flex items-start">
            <div className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5">4</div>
            <div>
              <p className="font-medium">Launch your first Facebook ad</p>
              <p className="text-sm text-gray-600">Even £5/day will generate test leads</p>
            </div>
          </div>
          
          <div className="flex items-start">
            <div className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5">5</div>
            <div>
              <p className="font-medium">Watch the magic happen!</p>
              <p className="text-sm text-gray-600">Track your real results and ROI</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}