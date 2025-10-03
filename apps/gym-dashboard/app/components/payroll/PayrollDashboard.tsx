'use client';

import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  Users, 
  Clock, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle, 
  XCircle,
  Calendar,
  FileText,
  Settings
} from 'lucide-react';
import { useOrganization } from '@/app/hooks/useOrganization';

interface PayrollDashboardProps {
  onCreateBatch: () => void;
  onViewReports: () => void;
  onXeroSync: () => void;
}

interface DashboardStats {
  currentBatches: {
    draft: number;
    processing: number;
    pending_approval: number;
    completed: number;
  };
  monthlyTotals: {
    gross_pay: number;
    net_pay: number;
    employee_count: number;
    batches_processed: number;
  };
  recentActivity: Array<{
    id: string;
    action: string;
    description: string;
    timestamp: string;
    status: 'success' | 'warning' | 'error';
  }>;
  xeroStatus: {
    connected: boolean;
    last_sync: string;
    employees_synced: number;
    conflicts: number;
  };
}

export default function PayrollDashboard({ 
  onCreateBatch, 
  onViewReports, 
  onXeroSync 
}: PayrollDashboardProps) {
  const { organization } = useOrganization();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (organization?.id) {
      fetchDashboardData();
    }
  }, [organization?.id]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [batchesResponse, syncStatusResponse] = await Promise.all([
        fetch(`/api/payroll/batches?organizationId=${organization?.id}&limit=50`),
        fetch(`/api/payroll/sync-xero?organizationId=${organization?.id}&type=status`)
      ]);

      if (!batchesResponse.ok || !syncStatusResponse.ok) {
        throw new Error('Failed to fetch dashboard data');
      }

      const batchesData = await batchesResponse.json();
      const syncStatusData = await syncStatusResponse.json();

      // Process batches data
      const batches = batchesData.data || [];
      const currentBatches = {
        draft: batches.filter((b: any) => b.status === 'draft').length,
        processing: batches.filter((b: any) => b.status === 'processing').length,
        pending_approval: batches.filter((b: any) => b.status === 'pending_approval').length,
        completed: batches.filter((b: any) => b.status === 'completed').length,
      };

      // Calculate monthly totals
      const currentMonth = new Date().toISOString().slice(0, 7);
      const monthlyBatches = batches.filter((b: any) => 
        b.pay_period_start.startsWith(currentMonth) && b.status === 'completed'
      );

      const monthlyTotals = {
        gross_pay: monthlyBatches.reduce((sum: number, b: any) => sum + (b.total_gross_pay || 0), 0),
        net_pay: monthlyBatches.reduce((sum: number, b: any) => sum + (b.total_net_pay || 0), 0),
        employee_count: monthlyBatches.reduce((sum: number, b: any) => sum + (b.employee_count || 0), 0),
        batches_processed: monthlyBatches.length,
      };

      // Generate recent activity
      const recentActivity = batches
        .slice(0, 5)
        .map((batch: any) => ({
          id: batch.id,
          action: `Payroll ${batch.status === 'completed' ? 'Completed' : 'Updated'}`,
          description: `${batch.name} - ${batch.employee_count} employees`,
          timestamp: batch.updated_at,
          status: batch.status === 'completed' ? 'success' : 
                   batch.status === 'error' ? 'error' : 'warning',
        }));

      setStats({
        currentBatches,
        monthlyTotals,
        recentActivity,
        xeroStatus: syncStatusData.data || {
          connected: false,
          last_sync: null,
          employees_synced: 0,
          conflicts: 0,
        },
      });

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-400" />;
      case 'warning':
      default:
        return <AlertCircle className="w-4 h-4 text-yellow-400" />;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900 border border-red-700 text-red-100 px-4 py-3 rounded-lg">
        <div className="flex items-center gap-2">
          <XCircle className="w-5 h-5" />
          <span>Error loading dashboard: {error}</span>
        </div>
        <button
          onClick={fetchDashboardData}
          className="mt-2 text-sm underline hover:no-underline"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-6">
      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={onCreateBatch}
          className="p-6 bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg text-left hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg"
        >
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="w-8 h-8 text-white" />
            <span className="text-blue-100 text-sm">New</span>
          </div>
          <h3 className="text-white font-semibold text-lg">Create Payroll Batch</h3>
          <p className="text-blue-100 text-sm">Start new payroll processing</p>
        </button>

        <button
          onClick={onXeroSync}
          className="p-6 bg-gradient-to-r from-green-600 to-green-700 rounded-lg text-left hover:from-green-700 hover:to-green-800 transition-all duration-200 shadow-lg"
        >
          <div className="flex items-center justify-between mb-2">
            <Settings className="w-8 h-8 text-white" />
            <span className={`text-sm ${stats.xeroStatus.connected ? 'text-green-100' : 'text-red-200'}`}>
              {stats.xeroStatus.connected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          <h3 className="text-white font-semibold text-lg">Xero Integration</h3>
          <p className="text-green-100 text-sm">Sync employees & payroll data</p>
        </button>

        <button
          onClick={onViewReports}
          className="p-6 bg-gradient-to-r from-purple-600 to-purple-700 rounded-lg text-left hover:from-purple-700 hover:to-purple-800 transition-all duration-200 shadow-lg"
        >
          <div className="flex items-center justify-between mb-2">
            <FileText className="w-8 h-8 text-white" />
            <span className="text-purple-100 text-sm">Reports</span>
          </div>
          <h3 className="text-white font-semibold text-lg">View Reports</h3>
          <p className="text-purple-100 text-sm">Payroll registers & summaries</p>
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Active Batches</p>
              <p className="text-2xl font-bold text-white">
                {stats.currentBatches.draft + stats.currentBatches.processing + stats.currentBatches.pending_approval}
              </p>
            </div>
            <Clock className="w-8 h-8 text-orange-400" />
          </div>
          <div className="mt-4 flex gap-4 text-xs">
            <span className="text-blue-400">Draft: {stats.currentBatches.draft}</span>
            <span className="text-yellow-400">Processing: {stats.currentBatches.processing}</span>
            <span className="text-orange-400">Approval: {stats.currentBatches.pending_approval}</span>
          </div>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Monthly Gross Pay</p>
              <p className="text-2xl font-bold text-white">
                {formatCurrency(stats.monthlyTotals.gross_pay)}
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-400" />
          </div>
          <p className="text-gray-400 text-xs mt-2">
            {stats.monthlyTotals.batches_processed} batches processed
          </p>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Employees Paid</p>
              <p className="text-2xl font-bold text-white">
                {stats.monthlyTotals.employee_count}
              </p>
            </div>
            <Users className="w-8 h-8 text-blue-400" />
          </div>
          <p className="text-gray-400 text-xs mt-2">
            {stats.xeroStatus.employees_synced} synced with Xero
          </p>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Completed Batches</p>
              <p className="text-2xl font-bold text-white">
                {stats.currentBatches.completed}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
          <p className="text-gray-400 text-xs mt-2">
            This month
          </p>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-orange-400" />
            Recent Activity
          </h3>
          <div className="space-y-3">
            {stats.recentActivity.length > 0 ? (
              stats.recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3 p-3 bg-gray-700 rounded-lg">
                  {getStatusIcon(activity.status)}
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium">{activity.action}</p>
                    <p className="text-gray-400 text-sm">{activity.description}</p>
                    <p className="text-gray-500 text-xs mt-1">
                      {new Date(activity.timestamp).toLocaleDateString('en-AU', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-400 text-sm">No recent activity</p>
            )}
          </div>
        </div>

        {/* Xero Integration Status */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Settings className="w-5 h-5 text-orange-400" />
            Xero Integration
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
              <div className="flex items-center gap-3">
                {stats.xeroStatus.connected ? (
                  <CheckCircle className="w-5 h-5 text-green-400" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-400" />
                )}
                <span className="text-white font-medium">Connection Status</span>
              </div>
              <span className={`text-sm ${stats.xeroStatus.connected ? 'text-green-400' : 'text-red-400'}`}>
                {stats.xeroStatus.connected ? 'Connected' : 'Disconnected'}
              </span>
            </div>

            {stats.xeroStatus.connected && (
              <>
                <div className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                  <span className="text-gray-300">Employees Synced</span>
                  <span className="text-white font-medium">{stats.xeroStatus.employees_synced}</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                  <span className="text-gray-300">Sync Conflicts</span>
                  <span className={`font-medium ${stats.xeroStatus.conflicts > 0 ? 'text-yellow-400' : 'text-green-400'}`}>
                    {stats.xeroStatus.conflicts}
                  </span>
                </div>

                {stats.xeroStatus.last_sync && (
                  <div className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                    <span className="text-gray-300">Last Sync</span>
                    <span className="text-white text-sm">
                      {new Date(stats.xeroStatus.last_sync).toLocaleDateString('en-AU', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                )}
              </>
            )}

            <button
              onClick={onXeroSync}
              className="w-full mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
            >
              {stats.xeroStatus.connected ? 'Manage Sync' : 'Setup Connection'}
            </button>
          </div>
        </div>
      </div>

      {/* Alerts/Notifications */}
      {stats.xeroStatus.conflicts > 0 && (
        <div className="bg-yellow-900 border border-yellow-700 text-yellow-100 px-4 py-3 rounded-lg">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            <span className="font-medium">Sync Conflicts Detected</span>
          </div>
          <p className="text-sm mt-1">
            {stats.xeroStatus.conflicts} employee record conflicts need resolution.
          </p>
          <button
            onClick={onXeroSync}
            className="mt-2 text-sm underline hover:no-underline"
          >
            Resolve conflicts
          </button>
        </div>
      )}
    </div>
  );
}