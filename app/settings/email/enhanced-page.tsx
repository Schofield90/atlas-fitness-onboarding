'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/app/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Mail, Settings, CheckCircle, AlertCircle, ArrowUpCircle, Key, Globe } from 'lucide-react';

interface EmailConfig {
  id: string;
  service_type: 'shared' | 'dedicated';
  subdomain?: string;
  shared_domain?: string;
  custom_domain?: string;
  from_name: string;
  from_email: string;
  reply_to_email?: string;
  daily_limit?: number;
  dns_verified?: boolean;
  is_active: boolean;
}

export default function EnhancedEmailSettingsPage() {
  const [config, setConfig] = useState<EmailConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const supabase = createClient();
  const router = useRouter();

  // Form states
  const [fromName, setFromName] = useState('');
  const [replyToEmail, setReplyToEmail] = useState('');
  
  // Upgrade form states
  const [resendApiKey, setResendApiKey] = useState('');
  const [customDomain, setCustomDomain] = useState('');
  const [customFromEmail, setCustomFromEmail] = useState('');

  useEffect(() => {
    loadConfiguration();
    loadStats();
  }, []);

  const loadConfiguration = async () => {
    try {
      // Get current user's organization
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: orgData } = await supabase
        .from('user_organizations')
        .select('organization_id')
        .eq('user_id', user.id)
        .single();

      if (!orgData) return;

      // Get email configuration
      const { data, error } = await supabase
        .from('email_configurations')
        .select('*')
        .eq('organization_id', orgData.organization_id)
        .single();

      if (data) {
        setConfig(data);
        setFromName(data.from_name || '');
        setReplyToEmail(data.reply_to_email || '');
      }
    } catch (error) {
      console.error('Error loading configuration:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch('/api/email/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleSaveBasicSettings = async () => {
    if (!config) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('email_configurations')
        .update({
          from_name: fromName,
          reply_to_email: replyToEmail
        })
        .eq('id', config.id);

      if (!error) {
        await loadConfiguration();
        alert('Settings saved successfully!');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleUpgradeToDedicated = async () => {
    if (!resendApiKey || !customDomain || !customFromEmail) {
      alert('Please fill in all fields');
      return;
    }

    if (!config) return;

    setUpgrading(true);
    try {
      const { error } = await supabase
        .from('email_configurations')
        .update({
          service_type: 'dedicated',
          resend_api_key: resendApiKey,
          custom_domain: customDomain,
          from_email: customFromEmail,
          daily_limit: null
        })
        .eq('id', config.id);

      if (!error) {
        await loadConfiguration();
        alert('Successfully upgraded to dedicated email service!');
        setResendApiKey('');
        setCustomDomain('');
        setCustomFromEmail('');
      }
    } catch (error) {
      console.error('Error upgrading:', error);
      alert('Failed to upgrade');
    } finally {
      setUpgrading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-800 rounded w-1/3 mb-8"></div>
            <div className="space-y-4">
              <div className="h-32 bg-gray-800 rounded"></div>
              <div className="h-32 bg-gray-800 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8 flex items-center gap-3">
          <Mail className="h-8 w-8 text-orange-500" />
          Email Configuration
        </h1>

        {/* Current Configuration */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Current Configuration
          </h2>
          
          {config && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Service Type:</span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  config.service_type === 'dedicated' 
                    ? 'bg-green-900 text-green-300' 
                    : 'bg-blue-900 text-blue-300'
                }`}>
                  {config.service_type === 'dedicated' ? 'Dedicated' : 'Shared'}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-gray-400">From Email:</span>
                <span className="text-white">{config.from_email}</span>
              </div>
              
              {config.service_type === 'shared' && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Daily Limit:</span>
                    <span className="text-white">{config.daily_limit || 100} emails</span>
                  </div>
                  
                  {stats && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Today's Usage:</span>
                      <span className="text-white">
                        {stats.sentToday || 0} / {config.daily_limit || 100}
                      </span>
                    </div>
                  )}
                </>
              )}
              
              {config.service_type === 'dedicated' && config.custom_domain && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Custom Domain:</span>
                  <span className="text-white flex items-center gap-2">
                    {config.custom_domain}
                    {config.dns_verified && (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    )}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Basic Settings */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Basic Settings</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                From Name
              </label>
              <input
                type="text"
                value={fromName}
                onChange={(e) => setFromName(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="Your Gym Name"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Reply-To Email
              </label>
              <input
                type="email"
                value={replyToEmail}
                onChange={(e) => setReplyToEmail(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="replies@yourgym.com"
              />
            </div>
            
            <button
              onClick={handleSaveBasicSettings}
              disabled={saving}
              className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>

        {/* Upgrade to Dedicated */}
        {config?.service_type === 'shared' && (
          <div className="bg-gradient-to-br from-orange-900/20 to-orange-800/20 border border-orange-700 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <ArrowUpCircle className="h-5 w-5 text-orange-500" />
              Upgrade to Dedicated Email Service
            </h2>
            
            <div className="mb-6 space-y-2">
              <p className="text-gray-300">Get unlimited emails with your own domain!</p>
              <ul className="list-disc list-inside text-gray-400 text-sm space-y-1">
                <li>Send from your own domain (e.g., info@yourgym.com)</li>
                <li>No daily limits</li>
                <li>Better deliverability</li>
                <li>Custom branding in all emails</li>
              </ul>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1 flex items-center gap-2">
                  <Key className="h-4 w-4" />
                  Resend API Key
                </label>
                <input
                  type="password"
                  value={resendApiKey}
                  onChange={(e) => setResendApiKey(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="re_xxxxxxxxxxxxx"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Get your API key from <a href="https://resend.com" target="_blank" className="text-orange-500 hover:underline">resend.com</a>
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1 flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Your Domain
                </label>
                <input
                  type="text"
                  value={customDomain}
                  onChange={(e) => setCustomDomain(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="yourgym.com"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  From Email Address
                </label>
                <input
                  type="email"
                  value={customFromEmail}
                  onChange={(e) => setCustomFromEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="info@yourgym.com"
                />
              </div>
              
              <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-4">
                <p className="text-sm text-yellow-300 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>
                    After upgrading, you'll need to verify your domain in Resend by adding DNS records.
                    We'll guide you through this process.
                  </span>
                </p>
              </div>
              
              <button
                onClick={handleUpgradeToDedicated}
                disabled={upgrading}
                className="w-full px-4 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-md hover:from-orange-600 hover:to-orange-700 disabled:opacity-50 font-semibold"
              >
                {upgrading ? 'Upgrading...' : 'Upgrade to Dedicated Email Service'}
              </button>
            </div>
          </div>
        )}

        {/* DNS Verification for Dedicated */}
        {config?.service_type === 'dedicated' && !config.dns_verified && (
          <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-yellow-300 mb-4">DNS Verification Required</h2>
            <p className="text-gray-300 mb-4">
              To start sending emails from your domain, add these DNS records:
            </p>
            <div className="bg-gray-900 rounded-lg p-4">
              <code className="text-sm text-gray-300">
                SPF: v=spf1 include:amazonses.com ~all<br />
                DKIM: Check your Resend dashboard for DKIM records
              </code>
            </div>
            <p className="text-sm text-gray-400 mt-4">
              Once added, emails will automatically start sending from your domain.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}