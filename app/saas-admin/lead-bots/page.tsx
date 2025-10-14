"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ChartBarIcon,
  ChatBubbleBottomCenterTextIcon,
  PhoneIcon,
  UserGroupIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  SparklesIcon,
  Cog8ToothIcon,
} from "@heroicons/react/24/outline";

interface Stats {
  totalLeads: number;
  activeConversations: number;
  callsBooked: number;
  qualifiedLeads: number;
  responseRate: number;
  avgQualificationScore: number;
}

interface Organization {
  id: string;
  name: string;
  agentEnabled: boolean;
  totalLeads: number;
  activeConversations: number;
  callsBooked: number;
}

export default function LeadBotsPage() {
  const [stats, setStats] = useState<Stats>({
    totalLeads: 0,
    activeConversations: 0,
    callsBooked: 0,
    qualifiedLeads: 0,
    responseRate: 0,
    avgQualificationScore: 0,
  });
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    fetchOrganizations();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch("/api/saas-admin/lead-bots/stats");
      if (!response.ok) throw new Error("Failed to fetch stats");
      const data = await response.json();
      setStats(data.stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const fetchOrganizations = async () => {
    try {
      const response = await fetch("/api/saas-admin/lead-bots/organizations");
      if (!response.ok) throw new Error("Failed to fetch organizations");
      const data = await response.json();
      setOrganizations(data.organizations);
    } catch (error) {
      console.error("Error fetching organizations:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Lead Qualification Bots</h1>
          <p className="mt-2 text-gray-400">
            GoHighLevel AI agents for lead qualification and call booking
          </p>
        </div>
        <Link
          href="/saas-admin/lead-bots/agents/create"
          className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-semibold transition-colors flex items-center gap-2 shadow-lg"
        >
          <SparklesIcon className="h-5 w-5" />
          Create New Agent
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Total Leads</p>
              <p className="mt-2 text-3xl font-bold text-white">{stats.totalLeads}</p>
            </div>
            <UserGroupIcon className="h-12 w-12 text-blue-500" />
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Active Conversations</p>
              <p className="mt-2 text-3xl font-bold text-white">{stats.activeConversations}</p>
            </div>
            <ChatBubbleBottomCenterTextIcon className="h-12 w-12 text-green-500" />
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Calls Booked</p>
              <p className="mt-2 text-3xl font-bold text-white">{stats.callsBooked}</p>
            </div>
            <PhoneIcon className="h-12 w-12 text-purple-500" />
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Qualified Leads</p>
              <p className="mt-2 text-3xl font-bold text-white">{stats.qualifiedLeads}</p>
            </div>
            <CheckCircleIcon className="h-12 w-12 text-green-500" />
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Response Rate</p>
              <p className="mt-2 text-3xl font-bold text-white">{stats.responseRate}%</p>
            </div>
            <ChartBarIcon className="h-12 w-12 text-orange-500" />
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Avg Qualification Score</p>
              <p className="mt-2 text-3xl font-bold text-white">{stats.avgQualificationScore}/100</p>
            </div>
            <ClockIcon className="h-12 w-12 text-yellow-500" />
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Link
          href="/saas-admin/lead-bots/conversations"
          className="bg-gray-800 hover:bg-gray-700 rounded-lg p-6 border border-gray-700 transition-colors"
        >
          <ChatBubbleBottomCenterTextIcon className="h-8 w-8 text-blue-500 mb-3" />
          <h3 className="text-lg font-semibold text-white mb-1">Conversations</h3>
          <p className="text-sm text-gray-400">View all lead conversations</p>
        </Link>

        <Link
          href="/saas-admin/lead-bots/bookings"
          className="bg-gray-800 hover:bg-gray-700 rounded-lg p-6 border border-gray-700 transition-colors"
        >
          <PhoneIcon className="h-8 w-8 text-purple-500 mb-3" />
          <h3 className="text-lg font-semibold text-white mb-1">Call Bookings</h3>
          <p className="text-sm text-gray-400">Manage scheduled calls</p>
        </Link>

        <Link
          href="/saas-admin/lead-bots/templates"
          className="bg-gray-800 hover:bg-gray-700 rounded-lg p-6 border border-gray-700 transition-colors"
        >
          <ClockIcon className="h-8 w-8 text-green-500 mb-3" />
          <h3 className="text-lg font-semibold text-white mb-1">Task Templates</h3>
          <p className="text-sm text-gray-400">Edit follow-up automations</p>
        </Link>

        <Link
          href="/saas-admin/lead-bots/agents"
          className="bg-gray-800 hover:bg-gray-700 rounded-lg p-6 border border-gray-700 transition-colors"
        >
          <SparklesIcon className="h-8 w-8 text-orange-500 mb-3" />
          <h3 className="text-lg font-semibold text-white mb-1">AI Agents</h3>
          <p className="text-sm text-gray-400">Create & manage AI agents</p>
        </Link>
      </div>

      {/* Organizations List */}
      <div className="bg-gray-800 rounded-lg border border-gray-700">
        <div className="p-6 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">Organizations</h2>
          <p className="mt-1 text-sm text-gray-400">
            Lead bot status and performance per organization
          </p>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            <p className="mt-2 text-gray-400">Loading organizations...</p>
          </div>
        ) : organizations.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <p>No organizations with lead bots configured yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-700">
              <thead className="bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Organization
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Total Leads
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Active Convos
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Calls Booked
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-gray-800 divide-y divide-gray-700">
                {organizations.map((org) => (
                  <tr key={org.id} className="hover:bg-gray-750">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-white">{org.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {org.agentEnabled ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-900 text-green-200">
                          <CheckCircleIcon className="h-4 w-4 mr-1" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-700 text-gray-300">
                          <XCircleIcon className="h-4 w-4 mr-1" />
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {org.totalLeads}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {org.activeConversations}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {org.callsBooked}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Link
                        href={`/saas-admin/lead-bots/agents?org=${org.id}`}
                        className="text-orange-500 hover:text-orange-400 mr-4"
                      >
                        Configure
                      </Link>
                      <Link
                        href={`/saas-admin/lead-bots/conversations?org=${org.id}`}
                        className="text-blue-500 hover:text-blue-400"
                      >
                        View Convos
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
