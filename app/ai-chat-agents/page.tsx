'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  MessageSquare,
  Bot,
  Settings,
  Plus,
  Book,
  Power,
  PowerOff,
  Mail,
  Phone,
  Calendar,
  ExternalLink,
  Sparkles,
} from 'lucide-react';

interface ChatAgent {
  id: string;
  name: string;
  description: string | null;
  status: string;
  enabled: boolean;
  ghl_webhook_url: string | null;
  ghl_api_key: string | null;
  ghl_calendar_id: string | null;
  ghl_webhook_secret: string | null;
  follow_up_config: {
    enabled: boolean;
    delay_hours: number;
    max_follow_ups: number;
    channels: string[];
  };
  booking_config: {
    enabled: boolean;
    auto_book: boolean;
    confirmation_required: boolean;
  };
  organization_id: string;
  organization_name?: string;
  created_at: string;
  updated_at: string;
  stats?: {
    conversations: number;
    conversions: number;
    bookings: number;
  };
}

interface Organization {
  id: string;
  name: string;
}

/**
 * Super Admin AI Chat Agents Management
 * Only accessible by sam@gymleadhub.co.uk
 * Manages chat agents across all organizations
 */
export default function AdminAIChatAgentsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [agents, setAgents] = useState<ChatAgent[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<ChatAgent | null>(null);

  // Check super admin access
  useEffect(() => {
    checkSuperAdminAccess();
  }, []);

  const checkSuperAdminAccess = async () => {
    try {
      const supabase = createClient();
      const { data: { user }, error } = await supabase.auth.getUser();

      if (error || !user) {
        router.push('/signin');
        return;
      }

      // Only allow sam@gymleadhub.co.uk or *@gymleadhub.co.uk
      const isSuperAdmin =
        user.email === 'sam@gymleadhub.co.uk' ||
        user.email?.endsWith('@gymleadhub.co.uk') ||
        user.email?.endsWith('@atlas-gyms.co.uk');

      if (!isSuperAdmin) {
        // Redirect non-super-admins to regular dashboard
        router.push('/');
        return;
      }

      setUser(user);
      await Promise.all([fetchOrganizations(), fetchAgents()]);
    } catch (error) {
      console.error('Error checking super admin access:', error);
      router.push('/signin');
    } finally {
      setLoading(false);
    }
  };

  const fetchOrganizations = async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name')
        .order('name');

      if (!error && data) {
        setOrganizations(data);
      }
    } catch (error) {
      console.error('Error fetching organizations:', error);
    }
  };

  const fetchAgents = async () => {
    try {
      const response = await fetch('/api/admin/chat-agents');
      if (!response.ok) throw new Error('Failed to fetch agents');

      const { success, data } = await response.json();
      if (success && data.agents) {
        setAgents(data.agents);
      }
    } catch (error) {
      console.error('Error fetching agents:', error);
    }
  };

  const filteredAgents = selectedOrgId === 'all'
    ? agents
    : agents.filter(a => a.organization_id === selectedOrgId);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Verifying super admin access...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-3">
                <Bot className="h-8 w-8 text-orange-500" />
                Super Admin: AI Chat Agents
              </h1>
              <p className="text-sm text-gray-400 mt-1">
                Manage chat agents across all organizations
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-400">
                {user?.email}
              </span>
              <button
                onClick={() => router.push('/ai-chat-agents/baseline')}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg flex items-center gap-2 transition-colors"
              >
                <Sparkles className="h-4 w-4" />
                Edit Baseline Agent
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded-lg flex items-center gap-2 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Create Chat Agent
              </button>
            </div>
          </div>

          {/* Organization Filter */}
          <div className="mt-4 flex items-center gap-4">
            <label className="text-sm text-gray-400">Filter by Organization:</label>
            <select
              value={selectedOrgId}
              onChange={(e) => setSelectedOrgId(e.target.value)}
              className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="all">All Organizations ({agents.length})</option>
              {organizations.map((org) => {
                const count = agents.filter(a => a.organization_id === org.id).length;
                return (
                  <option key={org.id} value={org.id}>
                    {org.name} ({count})
                  </option>
                );
              })}
            </select>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Agents</p>
                <p className="text-3xl font-bold text-white mt-1">{agents.length}</p>
              </div>
              <Bot className="h-10 w-10 text-blue-500" />
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Active Agents</p>
                <p className="text-3xl font-bold text-green-500 mt-1">
                  {agents.filter(a => a.enabled).length}
                </p>
              </div>
              <Power className="h-10 w-10 text-green-500" />
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Organizations</p>
                <p className="text-3xl font-bold text-purple-500 mt-1">{organizations.length}</p>
              </div>
              <Settings className="h-10 w-10 text-purple-500" />
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Conversations</p>
                <p className="text-3xl font-bold text-orange-500 mt-1">
                  {agents.reduce((sum, a) => sum + (a.stats?.conversations || 0), 0)}
                </p>
              </div>
              <MessageSquare className="h-10 w-10 text-orange-500" />
            </div>
          </div>
        </div>

        {/* Agents Grid */}
        {filteredAgents.length === 0 ? (
          <div className="bg-gray-800 rounded-lg p-12 text-center border border-gray-700">
            <Bot className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-300 mb-2">
              No agents found
            </h3>
            <p className="text-gray-400 mb-6">
              {selectedOrgId === 'all'
                ? 'Create your first AI chat agent to get started'
                : 'No agents configured for this organization'}
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 bg-orange-600 hover:bg-orange-700 rounded-lg flex items-center gap-2 transition-colors mx-auto"
            >
              <Plus className="h-5 w-5" />
              Create Chat Agent
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAgents.map((agent) => (
              <div
                key={agent.id}
                className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-gray-600 transition-colors"
              >
                {/* Agent Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${agent.enabled ? 'bg-green-900/30' : 'bg-gray-700'}`}>
                      {agent.enabled ? (
                        <Power className="h-6 w-6 text-green-500" />
                      ) : (
                        <PowerOff className="h-6 w-6 text-gray-400" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">{agent.name}</h3>
                      <p className="text-xs text-gray-400">{agent.organization_name}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedAgent(agent);
                      setShowConfigModal(true);
                    }}
                    className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <Settings className="h-5 w-5 text-gray-400" />
                  </button>
                </div>

                {/* Description */}
                {agent.description && (
                  <p className="text-sm text-gray-400 mb-4 line-clamp-2">
                    {agent.description}
                  </p>
                )}

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 mb-4 pb-4 border-b border-gray-700">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-white">
                      {agent.stats?.conversations || 0}
                    </p>
                    <p className="text-xs text-gray-400">Conversations</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-500">
                      {agent.stats?.conversions || 0}
                    </p>
                    <p className="text-xs text-gray-400">Conversions</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-500">
                      {agent.stats?.bookings || 0}
                    </p>
                    <p className="text-xs text-gray-400">Bookings</p>
                  </div>
                </div>

                {/* Configuration Status */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">GHL Connected</span>
                    <span className={agent.ghl_api_key ? 'text-green-500' : 'text-gray-500'}>
                      {agent.ghl_api_key ? '✓' : '✗'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Booking Enabled</span>
                    <span className={agent.booking_config?.enabled ? 'text-green-500' : 'text-gray-500'}>
                      {agent.booking_config?.enabled ? '✓' : '✗'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Follow-ups</span>
                    <span className={agent.follow_up_config?.enabled ? 'text-green-500' : 'text-gray-500'}>
                      {agent.follow_up_config?.enabled ? '✓' : '✗'}
                    </span>
                  </div>
                </div>

                {/* Follow-up Channels */}
                {agent.follow_up_config?.enabled && (
                  <div className="mt-4 flex gap-2">
                    {agent.follow_up_config.channels.includes('email') && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-gray-700 text-gray-400 rounded text-xs">
                        <Mail className="h-3 w-3" />
                        Email
                      </div>
                    )}
                    {agent.follow_up_config.channels.includes('sms') && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-gray-700 text-gray-400 rounded text-xs">
                        <Phone className="h-3 w-3" />
                        SMS
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Documentation Link */}
        <div className="mt-8 bg-blue-900/20 border border-blue-800 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <Book className="h-6 w-6 text-blue-400 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h3 className="font-semibold text-blue-300 mb-2">Need Help?</h3>
              <p className="text-gray-300 text-sm mb-3">
                Check out the complete documentation for setting up and managing AI chat agents.
              </p>
              <a
                href="/docs/ai-chat-agents"
                target="_blank"
                className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm"
              >
                View Documentation
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-lg max-w-2xl w-full p-6">
            <h2 className="text-xl font-bold mb-4">Create Chat Agent</h2>
            <p className="text-gray-400 mb-4">
              Coming soon: Agent creation interface for super admins
            </p>
            <button
              onClick={() => setShowCreateModal(false)}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {showConfigModal && selectedAgent && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-lg max-w-2xl w-full p-6">
            <h2 className="text-xl font-bold mb-4">Configure Agent</h2>
            <p className="text-gray-400 mb-4">
              Coming soon: Agent configuration interface for super admins
            </p>
            <button
              onClick={() => {
                setShowConfigModal(false);
                setSelectedAgent(null);
              }}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
