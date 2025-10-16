"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/app/lib/supabase/client";

interface AgentMetrics {
  totalLeads: number;
  leadsResponded: number;
  callsBooked: number;
  callsAnswered: number;
  callsNoAnswer: number;
  salesMade: number;
  salesLost: number;
  responseRate: number;
  bookingRate: number;
  pickupRate: number;
  closeRate: number;
  leadToSaleRate: number;
}

interface Agent {
  id: string;
  name: string;
  organization_id: string;
}

interface AgentReport {
  agentId: string;
  agentName: string;
  metrics: AgentMetrics;
}

interface CumulativeReport {
  organizationId: string;
  period: string;
  date: string;
  totalAgents: number;
  cumulative: AgentMetrics;
  agents: AgentReport[];
}

export default function AgentReportsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string>("all");
  const [period, setPeriod] = useState<string>("all_time");
  const [individualReport, setIndividualReport] = useState<any>(null);
  const [cumulativeReport, setCumulativeReport] = useState<CumulativeReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);

  // Fetch organization ID and agents on mount
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const response = await fetch("/api/saas-admin/reports/agents");
        if (!response.ok) {
          console.error("[Reports] Failed to fetch agents");
          return;
        }

        const data = await response.json();
        console.log("[Reports] Received:", data);

        if (data.organizationId) {
          setOrganizationId(data.organizationId);
        }

        if (data.agents) {
          console.log("[Reports] Found agents:", data.agents);
          setAgents(data.agents);
        }
      } catch (error) {
        console.error("[Reports] Error fetching agents:", error);
      }
    };

    fetchInitialData();
  }, []);

  // Fetch report when selections change
  useEffect(() => {
    if (!organizationId) return;

    const fetchReport = async () => {
      setLoading(true);
      setError(null);

      try {
        if (selectedAgent === "all") {
          // Fetch cumulative report
          const response = await fetch(
            `/api/admin/reports/all-agents?organizationId=${organizationId}&period=${period}`
          );

          if (!response.ok) {
            throw new Error("Failed to fetch cumulative report");
          }

          const { data } = await response.json();
          setCumulativeReport(data);
          setIndividualReport(null);
        } else {
          // Fetch individual agent report
          const response = await fetch(
            `/api/admin/reports/agent/${selectedAgent}?period=${period}`
          );

          if (!response.ok) {
            throw new Error("Failed to fetch agent report");
          }

          const { data } = await response.json();
          setIndividualReport(data);
          setCumulativeReport(null);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [selectedAgent, period, organizationId]);

  const formatPercentage = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  const MetricsCard = ({ title, metrics }: { title: string; metrics: AgentMetrics }) => (
    <div className="bg-gray-800 rounded-lg shadow p-6 border border-gray-700">
      <h3 className="text-lg font-semibold mb-4 text-white">{title}</h3>

      {/* Funnel Metrics */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <p className="text-sm text-gray-400">Total Leads</p>
          <p className="text-2xl font-bold text-white">{metrics.totalLeads}</p>
        </div>
        <div>
          <p className="text-sm text-gray-400">Leads Responded</p>
          <p className="text-2xl font-bold text-white">{metrics.leadsResponded}</p>
        </div>
        <div>
          <p className="text-sm text-gray-400">Calls Booked</p>
          <p className="text-2xl font-bold text-white">{metrics.callsBooked}</p>
        </div>
        <div>
          <p className="text-sm text-gray-400">Calls Answered</p>
          <p className="text-2xl font-bold text-white">{metrics.callsAnswered}</p>
        </div>
        <div>
          <p className="text-sm text-gray-400">Sales Made</p>
          <p className="text-2xl font-bold text-green-400">{metrics.salesMade}</p>
        </div>
        <div>
          <p className="text-sm text-gray-400">No Shows/Lost</p>
          <p className="text-2xl font-bold text-red-400">
            {metrics.callsNoAnswer + metrics.salesLost}
          </p>
        </div>
      </div>

      {/* Conversion Rates */}
      <div className="border-t border-gray-700 pt-4">
        <h4 className="text-md font-semibold mb-3 text-white">Conversion Rates</h4>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-gray-400">Response Rate</span>
            <span className="font-semibold text-white">{formatPercentage(metrics.responseRate)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-400">Booking Rate</span>
            <span className="font-semibold text-white">{formatPercentage(metrics.bookingRate)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-400">Pickup Rate</span>
            <span className="font-semibold text-white">{formatPercentage(metrics.pickupRate)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-400">Close Rate</span>
            <span className="font-semibold text-white">{formatPercentage(metrics.closeRate)}</span>
          </div>
          <div className="flex justify-between border-t border-gray-700 pt-2">
            <span className="text-sm font-bold text-white">Lead to Sale</span>
            <span className="font-bold text-green-400">
              {formatPercentage(metrics.leadToSaleRate)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6 text-white">AI Agent Performance Reports</h1>

        {/* Filters */}
        <div className="bg-gray-800 rounded-lg shadow p-4 mb-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-300">Agent</label>
              <select
                value={selectedAgent}
                onChange={(e) => setSelectedAgent(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="all">All Agents (Cumulative)</option>
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-300">Time Period</label>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="daily">Today</option>
              <option value="weekly">Last 7 Days</option>
              <option value="monthly">This Month</option>
              <option value="all_time">All Time</option>
            </select>
          </div>
        </div>
      </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
            <p className="mt-2 text-gray-400">Loading report...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-900 border border-red-700 rounded-lg p-4 mb-6">
            <p className="text-red-200">{error}</p>
          </div>
        )}

      {/* Individual Agent Report */}
      {!loading && individualReport && (
        <div>
          <MetricsCard title={`Performance Metrics`} metrics={individualReport.metrics} />
        </div>
      )}

        {/* Cumulative Report */}
        {!loading && cumulativeReport && (
          <div className="space-y-6">
            {/* Cumulative Metrics */}
            <MetricsCard
              title={`Cumulative Performance (${cumulativeReport.totalAgents} Agents)`}
              metrics={cumulativeReport.cumulative}
            />

            {/* Agent Breakdown */}
            <div className="bg-gray-800 rounded-lg shadow p-6 border border-gray-700">
              <h3 className="text-lg font-semibold mb-4 text-white">Agent Breakdown</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left py-2 text-gray-300">Agent</th>
                      <th className="text-right py-2 text-gray-300">Leads</th>
                      <th className="text-right py-2 text-gray-300">Responded</th>
                      <th className="text-right py-2 text-gray-300">Booked</th>
                      <th className="text-right py-2 text-gray-300">Answered</th>
                      <th className="text-right py-2 text-gray-300">Sales</th>
                      <th className="text-right py-2 text-gray-300">L→S %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cumulativeReport.agents.map((agent) => (
                      <tr key={agent.agentId} className="border-b border-gray-700">
                        <td className="py-2 text-white">{agent.agentName}</td>
                        <td className="text-right text-white">{agent.metrics.totalLeads}</td>
                        <td className="text-right text-white">{agent.metrics.leadsResponded}</td>
                        <td className="text-right text-white">{agent.metrics.callsBooked}</td>
                        <td className="text-right text-white">{agent.metrics.callsAnswered}</td>
                        <td className="text-right font-semibold text-green-400">
                          {agent.metrics.salesMade}
                        </td>
                        <td className="text-right font-semibold text-white">
                          {formatPercentage(agent.metrics.leadToSaleRate)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
