'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseClient } from '@/lib/supabase';
import { 
  AutomationTemplate, 
  GymAutomation, 
  LeadFollowUpConfig,
  DormantMemberConfig,
  BirthdayEngagementConfig,
  TrialConversionConfig,
  PaymentRecoveryConfig
} from '@/lib/types/simple-automation';
import { 
  ArrowLeft, 
  Save, 
  MessageSquare, 
  Clock, 
  User, 
  Settings,
  Zap
} from 'lucide-react';

interface ConfigureAutomationPageProps {
  params: Promise<{ id: string }>;
}

export default function ConfigureAutomationPage(props: ConfigureAutomationPageProps) {
  const params = use(props.params);
  const router = useRouter();
  const [template, setTemplate] = useState<AutomationTemplate | null>(null);
  const [automation, setAutomation] = useState<GymAutomation | null>(null);
  const [config, setConfig] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [staffMembers, setStaffMembers] = useState<Array<{ id: string; name: string; email: string }>>([]);

  const loadData = useCallback(async () => {
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

      // Load template
      const { data: templateData, error: templateError } = await supabase
        .from('automation_templates')
        .select('*')
        .eq('id', params.id)
        .single();

      if (templateError) throw templateError;
      setTemplate(templateData);

      // Load existing automation (if any)
      const { data: automationData } = await supabase
        .from('gym_automations')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .eq('template_id', params.id)
        .single();

      setAutomation(automationData);
      setConfig(automationData?.config || templateData.default_config);

      // Load staff members for assignment
      const { data: staffData } = await supabase
        .from('user_profiles')
        .select('id, first_name, last_name, email')
        .eq('organization_id', profile.organization_id)
        .eq('role', 'staff');

      setStaffMembers(staffData?.map(staff => ({
        id: staff.id,
        name: `${staff.first_name} ${staff.last_name}`,
        email: staff.email
      })) || []);

    } catch (error) {
      console.error('Error loading automation data:', error);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const saveConfiguration = async () => {
    if (!template) return;

    setSaving(true);
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

      // Update or create automation
      const { error } = await supabase
        .from('gym_automations')
        .upsert({
          organization_id: profile.organization_id,
          template_id: template.id,
          is_active: automation?.is_active || false,
          config,
          created_by: user.id,
        });

      if (error) throw error;

      router.push('/automations');
    } catch (error) {
      console.error('Error saving configuration:', error);
      alert('Failed to save configuration. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const updateConfig = (key: string, value: unknown) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading configuration...</p>
        </div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Template not found</p>
        </div>
      </div>
    );
  }

  const renderConfigurationForm = () => {
    switch (template.template_key) {
      case 'lead_follow_up':
        return <LeadFollowUpConfigForm config={config as unknown as LeadFollowUpConfig} updateConfig={updateConfig} staffMembers={staffMembers} />;
      case 'dormant_member':
        return <DormantMemberConfigForm config={config as unknown as DormantMemberConfig} updateConfig={updateConfig} />;
      case 'birthday_engagement':
        return <BirthdayEngagementConfigForm config={config as unknown as BirthdayEngagementConfig} updateConfig={updateConfig} staffMembers={staffMembers} />;
      case 'trial_conversion':
        return <TrialConversionConfigForm config={config as unknown as TrialConversionConfig} updateConfig={updateConfig} staffMembers={staffMembers} />;
      case 'payment_recovery':
        return <PaymentRecoveryConfigForm config={config as unknown as PaymentRecoveryConfig} updateConfig={updateConfig} staffMembers={staffMembers} />;
      default:
        return <div>Unknown template type</div>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.back()}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Configure {template.name}</h1>
                <p className="text-gray-600">{template.description}</p>
              </div>
            </div>
            <button
              onClick={saveConfiguration}
              disabled={saving}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Setup Tips */}
        <div className="bg-blue-50 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <Zap className="h-5 w-5 text-blue-600 mt-0.5 mr-3" />
            <div>
              <h3 className="font-medium text-blue-900">Quick Setup Tips</h3>
              <ul className="text-sm text-blue-700 mt-1 space-y-1">
                <li>• Use placeholders like {`{{lead.first_name}}`} or {`{{gym.name}}`} for personalization</li>
                <li>• Keep SMS messages under 160 characters for best delivery rates</li>
                <li>• Set realistic timing - instant responses feel more authentic</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Configuration Form */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center">
              <Settings className="h-5 w-5 text-gray-400 mr-2" />
              <h2 className="text-lg font-medium text-gray-900">Automation Settings</h2>
            </div>
          </div>
          
          <div className="px-6 py-6">
            {renderConfigurationForm()}
          </div>
        </div>

        {/* Expected Impact */}
        <div className="mt-6 bg-green-50 rounded-lg p-4">
          <h3 className="font-medium text-green-900 mb-2">Expected Impact</h3>
          <p className="text-green-700">{template.expected_impact}</p>
          <p className="text-sm text-green-600 mt-1">Setup time: {template.setup_time_minutes} minutes</p>
        </div>
      </div>
    </div>
  );
}

// Individual configuration forms for each template type

function LeadFollowUpConfigForm({ 
  config, 
  updateConfig, 
  staffMembers 
}: { 
  config: LeadFollowUpConfig; 
  updateConfig: (key: string, value: unknown) => void;
  staffMembers: Array<{ id: string; name: string; email: string }>;
}) {
  return (
    <div className="space-y-6">
      {/* SMS Configuration */}
      <div>
        <div className="flex items-center mb-3">
          <MessageSquare className="h-5 w-5 text-blue-600 mr-2" />
          <h3 className="text-lg font-medium text-gray-900">Initial SMS</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Send SMS after (minutes)
            </label>
            <input
              type="number"
              min="1"
              max="60"
              value={config.sms_delay_minutes || 5}
              onChange={(e) => updateConfig('sms_delay_minutes', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">Keep under 5 minutes for best results</p>
          </div>
        </div>
        
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            SMS Message
          </label>
          <textarea
            value={config.sms_message || ''}
            onChange={(e) => updateConfig('sms_message', e.target.value)}
            rows={3}
            maxLength={160}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            placeholder="Hi {{lead.first_name}}! Thanks for your interest in {{gym.name}}..."
          />
          <p className="text-xs text-gray-500 mt-1">
            {config.sms_message?.length || 0}/160 characters
          </p>
        </div>
      </div>

      {/* Email Configuration */}
      <div>
        <div className="flex items-center mb-3">
          <Clock className="h-5 w-5 text-green-600 mr-2" />
          <h3 className="text-lg font-medium text-gray-900">Follow-up Email</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Send email after (hours)
            </label>
            <input
              type="number"
              min="1"
              max="48"
              value={config.email_delay_hours || 2}
              onChange={(e) => updateConfig('email_delay_hours', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Subject
            </label>
            <input
              type="text"
              value={config.email_subject || ''}
              onChange={(e) => updateConfig('email_subject', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              placeholder="Welcome to {{gym.name}}!"
            />
          </div>
        </div>
      </div>

      {/* Staff Task Configuration */}
      <div>
        <div className="flex items-center mb-3">
          <User className="h-5 w-5 text-orange-600 mr-2" />
          <h3 className="text-lg font-medium text-gray-900">Staff Follow-up</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Create task after (hours)
            </label>
            <input
              type="number"
              min="1"
              max="72"
              value={config.task_delay_hours || 24}
              onChange={(e) => updateConfig('task_delay_hours', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Assign to
            </label>
            <select
              value={config.assigned_user_id || ''}
              onChange={(e) => updateConfig('assigned_user_id', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select staff member</option>
              {staffMembers.map(staff => (
                <option key={staff.id} value={staff.id}>{staff.name}</option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Task Description
          </label>
          <input
            type="text"
            value={config.task_message || ''}
            onChange={(e) => updateConfig('task_message', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            placeholder="Follow up with {{lead.first_name}} - no response to initial outreach"
          />
        </div>
      </div>
    </div>
  );
}

function DormantMemberConfigForm({ 
  config, 
  updateConfig 
}: { 
  config: DormantMemberConfig; 
  updateConfig: (key: string, value: unknown) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Inactive Days (Check-in)
          </label>
          <input
            type="number"
            min="7"
            max="30"
            value={config.inactive_days || 14}
            onChange={(e) => updateConfig('inactive_days', parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Offer Days
          </label>
          <input
            type="number"
            min="14"
            max="45"
            value={config.offer_days || 21}
            onChange={(e) => updateConfig('offer_days', parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Final Days
          </label>
          <input
            type="number"
            min="21"
            max="60"
            value={config.final_days || 30}
            onChange={(e) => updateConfig('final_days', parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Check-in Message
        </label>
        <textarea
          value={config.checkin_sms || ''}
          onChange={(e) => updateConfig('checkin_sms', e.target.value)}
          rows={2}
          maxLength={160}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
          placeholder="Hi {{member.first_name}}! We've missed you at {{gym.name}}..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Offer Message
        </label>
        <textarea
          value={config.offer_sms || ''}
          onChange={(e) => updateConfig('offer_sms', e.target.value)}
          rows={2}
          maxLength={160}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
          placeholder="{{member.first_name}}, we'd love to see you back! Claim your FREE..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Final Message
        </label>
        <textarea
          value={config.final_message || ''}
          onChange={(e) => updateConfig('final_message', e.target.value)}
          rows={2}
          maxLength={160}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
          placeholder="Last chance {{member.first_name}} - we don't want to lose you!"
        />
      </div>
    </div>
  );
}

function BirthdayEngagementConfigForm({ 
  config, 
  updateConfig, 
  staffMembers 
}: { 
  config: BirthdayEngagementConfig; 
  updateConfig: (key: string, value: unknown) => void;
  staffMembers: Array<{ id: string; name: string; email: string }>;
}) {
  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Birthday Message
        </label>
        <textarea
          value={config.birthday_sms || ''}
          onChange={(e) => updateConfig('birthday_sms', e.target.value)}
          rows={2}
          maxLength={160}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
          placeholder="Happy Birthday {{member.first_name}}! 🎉 Celebrate with a FREE guest pass..."
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Offer Valid Days
          </label>
          <input
            type="number"
            min="1"
            max="30"
            value={config.offer_valid_days || 7}
            onChange={(e) => updateConfig('offer_valid_days', parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Assign Call To
          </label>
          <select
            value={config.assigned_user_id || ''}
            onChange={(e) => updateConfig('assigned_user_id', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select staff member</option>
            {staffMembers.map(staff => (
              <option key={staff.id} value={staff.id}>{staff.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Staff Task
        </label>
        <input
          type="text"
          value={config.staff_task || ''}
          onChange={(e) => updateConfig('staff_task', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
          placeholder="Call {{member.first_name}} personally to wish happy birthday"
        />
      </div>
    </div>
  );
}

function TrialConversionConfigForm({ 
  config, 
  updateConfig, 
  staffMembers 
}: { 
  config: TrialConversionConfig; 
  updateConfig: (key: string, value: unknown) => void;
  staffMembers: Array<{ id: string; name: string; email: string }>;
}) {
  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Reminder Days Before Trial Ends
        </label>
        <input
          type="number"
          min="1"
          max="7"
          value={config.reminder_days_before || 3}
          onChange={(e) => updateConfig('reminder_days_before', parseInt(e.target.value))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Reminder Message
        </label>
        <textarea
          value={config.reminder_sms || ''}
          onChange={(e) => updateConfig('reminder_sms', e.target.value)}
          rows={2}
          maxLength={160}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
          placeholder="{{member.first_name}}, your trial at {{gym.name}} ends in 3 days!"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Offer Message
        </label>
        <textarea
          value={config.offer_sms || ''}
          onChange={(e) => updateConfig('offer_sms', e.target.value)}
          rows={2}
          maxLength={160}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
          placeholder="Special offer for {{member.first_name}}: Join today and save 50%!"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Discount Percentage
          </label>
          <input
            type="number"
            min="0"
            max="100"
            value={config.discount_percentage || 50}
            onChange={(e) => updateConfig('discount_percentage', parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Assign Follow-up To
          </label>
          <select
            value={config.assigned_user_id || ''}
            onChange={(e) => updateConfig('assigned_user_id', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select staff member</option>
            {staffMembers.map(staff => (
              <option key={staff.id} value={staff.id}>{staff.name}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

function PaymentRecoveryConfigForm({ 
  config, 
  updateConfig, 
  staffMembers 
}: { 
  config: PaymentRecoveryConfig; 
  updateConfig: (key: string, value: unknown) => void;
  staffMembers: Array<{ id: string; name: string; email: string }>;
}) {
  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Immediate Message (Payment Failed)
        </label>
        <textarea
          value={config.immediate_sms || ''}
          onChange={(e) => updateConfig('immediate_sms', e.target.value)}
          rows={2}
          maxLength={160}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
          placeholder="Hi {{member.first_name}}, there was an issue processing your payment..."
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Reminder Delay (Days)
          </label>
          <input
            type="number"
            min="1"
            max="14"
            value={config.reminder_delay_days || 3}
            onChange={(e) => updateConfig('reminder_delay_days', parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Staff Task After (Days)
          </label>
          <input
            type="number"
            min="3"
            max="30"
            value={config.staff_task_days || 7}
            onChange={(e) => updateConfig('staff_task_days', parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Reminder Message
        </label>
        <textarea
          value={config.reminder_sms || ''}
          onChange={(e) => updateConfig('reminder_sms', e.target.value)}
          rows={2}
          maxLength={160}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
          placeholder="Friendly reminder {{member.first_name}} - please update your payment details..."
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Max Attempts
          </label>
          <input
            type="number"
            min="1"
            max="5"
            value={config.max_attempts || 3}
            onChange={(e) => updateConfig('max_attempts', parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Assign To
          </label>
          <select
            value={config.assigned_user_id || ''}
            onChange={(e) => updateConfig('assigned_user_id', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select staff member</option>
            {staffMembers.map(staff => (
              <option key={staff.id} value={staff.id}>{staff.name}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}