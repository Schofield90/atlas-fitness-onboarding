'use client';

import React, { useState, useEffect } from 'react';
import { 
  Settings,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Users,
  Calendar,
  Clock,
  ExternalLink,
  Zap,
  ArrowRight,
  RefreshCcw as Sync,
  Eye,
  CheckSquare,
  X
} from 'lucide-react';
import { useOrganization } from '@/app/hooks/useOrganization';

interface XeroSyncProps {
  onBack: () => void;
}

interface SyncStatus {
  connected: boolean;
  employeeCount?: number;
  totalEmployees: number;
  syncedEmployees: number;
  unsyncedEmployees: number;
  lastSyncDate?: string;
  conflicts: number;
}

interface EmployeeMapping {
  localEmployee?: {
    id: string;
    name: string;
    email: string;
    status: string;
    xero_employee_id?: string;
  };
  xeroEmployee?: {
    employeeID: string;
    firstName: string;
    lastName: string;
    email: string;
    status: string;
  };
  syncStatus: 'synced' | 'needs_sync' | 'conflict' | 'error';
  differences?: string[];
  lastSynced?: string;
}

interface SyncHistory {
  id: string;
  action: string;
  description: string;
  created_at: string;
}

export default function XeroSync({ onBack }: XeroSyncProps) {
  const { organization } = useOrganization();
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [employeeMappings, setEmployeeMappings] = useState<EmployeeMapping[]>([]);
  const [syncHistory, setSyncHistory] = useState<SyncHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  const [activeTab, setActiveTab] = useState<'overview' | 'mappings' | 'history'>('overview');
  const [selectedMappings, setSelectedMappings] = useState<Set<number>>(new Set());
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [selectedConflict, setSelectedConflict] = useState<EmployeeMapping | null>(null);

  useEffect(() => {
    if (organization?.id) {
      fetchSyncData();
    }
  }, [organization?.id]);

  const fetchSyncData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [statusResponse, mappingsResponse, historyResponse] = await Promise.all([
        fetch(`/api/payroll/sync-xero?organizationId=${organization?.id}&type=status`),
        fetch(`/api/payroll/sync-xero?organizationId=${organization?.id}&type=mappings`),
        fetch(`/api/payroll/sync-xero?organizationId=${organization?.id}&type=history&limit=20`)
      ]);

      if (!statusResponse.ok || !mappingsResponse.ok || !historyResponse.ok) {
        throw new Error('Failed to fetch sync data');
      }

      const [statusData, mappingsData, historyData] = await Promise.all([
        statusResponse.json(),
        mappingsResponse.json(),
        historyResponse.json()
      ]);

      setSyncStatus(statusData.data);
      setEmployeeMappings(mappingsData.data || []);
      setSyncHistory(historyData.data || []);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: string, additionalData: any = {}) => {
    try {
      setActionLoading(action);
      setError(null);

      const response = await fetch('/api/payroll/sync-xero', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: organization?.id,
          action,
          ...additionalData,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Action failed');
      }

      const result = await response.json();
      
      // Show success message or handle result
      if (result.success) {
        await fetchSyncData();
      }

    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleMappingSelect = (index: number, selected: boolean) => {
    const newSelection = new Set(selectedMappings);
    if (selected) {
      newSelection.add(index);
    } else {
      newSelection.delete(index);
    }
    setSelectedMappings(newSelection);
  };

  const handleBulkSync = async () => {
    if (selectedMappings.size === 0) return;

    const mappingsToSync = Array.from(selectedMappings).map(index => 
      employeeMappings[index]
    );

    for (const mapping of mappingsToSync) {
      if (mapping.localEmployee?.id) {
        await handleAction('sync_single_employee', { employeeId: mapping.localEmployee.id });
      }
    }

    setSelectedMappings(new Set());
  };

  const resolveConflict = (mapping: EmployeeMapping) => {
    setSelectedConflict(mapping);
    setShowConflictModal(true);
  };

  const handleConflictResolution = async (resolution: 'use_local' | 'use_xero') => {
    if (!selectedConflict?.localEmployee?.id) return;

    await handleAction('resolve_conflict', {
      employeeId: selectedConflict.localEmployee.id,
      resolution,
    });

    setShowConflictModal(false);
    setSelectedConflict(null);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'synced':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'needs_sync':
        return <Clock className="w-5 h-5 text-yellow-400" />;
      case 'conflict':
        return <AlertTriangle className="w-5 h-5 text-orange-400" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-400" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium";
    
    switch (status) {
      case 'synced':
        return `${baseClasses} bg-green-100 text-green-800`;
      case 'needs_sync':
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      case 'conflict':
        return `${baseClasses} bg-orange-100 text-orange-800`;
      case 'error':
        return `${baseClasses} bg-red-100 text-red-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            ← Back
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">Xero Integration</h1>
            <p className="text-gray-400">Sync employees and payroll data with Xero</p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => handleAction('test_connection')}
            disabled={actionLoading === 'test_connection'}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            {actionLoading === 'test_connection' ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Zap className="w-4 h-4" />
            )}
            Test Connection
          </button>
          
          <button
            onClick={fetchSyncData}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-900 border border-red-700 text-red-100 px-4 py-3 rounded-lg">
          <div className="flex items-center gap-2">
            <XCircle className="w-5 h-5" />
            <span>Error: {error}</span>
          </div>
          <button
            onClick={() => setError(null)}
            className="mt-2 text-sm underline hover:no-underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Connection Status */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {syncStatus?.connected ? (
              <CheckCircle className="w-8 h-8 text-green-400" />
            ) : (
              <XCircle className="w-8 h-8 text-red-400" />
            )}
            <div>
              <h3 className="text-lg font-semibold text-white">
                {syncStatus?.connected ? 'Connected to Xero' : 'Not Connected to Xero'}
              </h3>
              <p className="text-gray-400">
                {syncStatus?.connected 
                  ? `${syncStatus.employeeCount || 0} employees found in Xero`
                  : 'Connect your Xero account to sync employees and payroll data'
                }
              </p>
            </div>
          </div>
          
          {!syncStatus?.connected && (
            <button className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2">
              <ExternalLink className="w-5 h-5" />
              Connect to Xero
            </button>
          )}
        </div>

        {syncStatus?.connected && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Total Employees</p>
                  <p className="text-2xl font-bold text-white">{syncStatus.totalEmployees}</p>
                </div>
                <Users className="w-6 h-6 text-blue-400" />
              </div>
            </div>

            <div className="bg-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Synced</p>
                  <p className="text-2xl font-bold text-green-400">{syncStatus.syncedEmployees}</p>
                </div>
                <CheckCircle className="w-6 h-6 text-green-400" />
              </div>
            </div>

            <div className="bg-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Unsynced</p>
                  <p className="text-2xl font-bold text-yellow-400">{syncStatus.unsyncedEmployees}</p>
                </div>
                <Clock className="w-6 h-6 text-yellow-400" />
              </div>
            </div>

            <div className="bg-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Conflicts</p>
                  <p className="text-2xl font-bold text-orange-400">{syncStatus.conflicts}</p>
                </div>
                <AlertTriangle className="w-6 h-6 text-orange-400" />
              </div>
            </div>
          </div>
        )}
      </div>

      {syncStatus?.connected && (
        <>
          {/* Quick Actions */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => handleAction('sync_employees_to_xero')}
                disabled={actionLoading === 'sync_employees_to_xero'}
                className="p-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg text-left transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <ArrowRight className="w-6 h-6 text-white" />
                  {actionLoading === 'sync_employees_to_xero' && (
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  )}
                </div>
                <h4 className="text-white font-medium">Sync to Xero</h4>
                <p className="text-blue-100 text-sm">Push local employees to Xero</p>
              </button>

              <button
                onClick={() => handleAction('sync_employees_from_xero')}
                disabled={actionLoading === 'sync_employees_from_xero'}
                className="p-4 bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-lg text-left transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <Sync className="w-6 h-6 text-white" />
                  {actionLoading === 'sync_employees_from_xero' && (
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  )}
                </div>
                <h4 className="text-white font-medium">Sync from Xero</h4>
                <p className="text-green-100 text-sm">Pull employees from Xero</p>
              </button>

              <button
                onClick={() => handleAction('get_xero_employees')}
                disabled={actionLoading === 'get_xero_employees'}
                className="p-4 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded-lg text-left transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <Eye className="w-6 h-6 text-white" />
                  {actionLoading === 'get_xero_employees' && (
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  )}
                </div>
                <h4 className="text-white font-medium">View Xero Data</h4>
                <p className="text-purple-100 text-sm">Check Xero employee records</p>
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg">
            <div className="border-b border-gray-700">
              <nav className="-mb-px flex">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`px-6 py-3 border-b-2 font-medium text-sm ${
                    activeTab === 'overview'
                      ? 'border-orange-400 text-orange-400'
                      : 'border-transparent text-gray-400 hover:text-gray-300'
                  }`}
                >
                  Overview
                </button>
                <button
                  onClick={() => setActiveTab('mappings')}
                  className={`px-6 py-3 border-b-2 font-medium text-sm ${
                    activeTab === 'mappings'
                      ? 'border-orange-400 text-orange-400'
                      : 'border-transparent text-gray-400 hover:text-gray-300'
                  }`}
                >
                  Employee Mappings
                  {syncStatus.conflicts > 0 && (
                    <span className="ml-2 bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full">
                      {syncStatus.conflicts}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('history')}
                  className={`px-6 py-3 border-b-2 font-medium text-sm ${
                    activeTab === 'history'
                      ? 'border-orange-400 text-orange-400'
                      : 'border-transparent text-gray-400 hover:text-gray-300'
                  }`}
                >
                  Sync History
                </button>
              </nav>
            </div>

            <div className="p-6">
              {activeTab === 'overview' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-white font-medium mb-3">Sync Summary</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Last Sync:</span>
                          <span className="text-white">
                            {syncStatus.lastSyncDate 
                              ? new Date(syncStatus.lastSyncDate).toLocaleDateString('en-AU')
                              : 'Never'
                            }
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Sync Status:</span>
                          <span className={`font-medium ${syncStatus.conflicts > 0 ? 'text-orange-400' : 'text-green-400'}`}>
                            {syncStatus.conflicts > 0 ? 'Has Conflicts' : 'Up to Date'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-white font-medium mb-3">Next Steps</h4>
                      <div className="space-y-2 text-sm">
                        {syncStatus.unsyncedEmployees > 0 && (
                          <p className="text-yellow-400">• {syncStatus.unsyncedEmployees} employees need syncing</p>
                        )}
                        {syncStatus.conflicts > 0 && (
                          <p className="text-orange-400">• {syncStatus.conflicts} conflicts need resolution</p>
                        )}
                        {syncStatus.conflicts === 0 && syncStatus.unsyncedEmployees === 0 && (
                          <p className="text-green-400">• All employees are in sync</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'mappings' && (
                <div className="space-y-4">
                  {/* Mapping Controls */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className="text-gray-400 text-sm">
                        {selectedMappings.size} of {employeeMappings.length} selected
                      </span>
                      {selectedMappings.size > 0 && (
                        <button
                          onClick={handleBulkSync}
                          disabled={actionLoading === 'bulk_sync'}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded text-sm transition-colors"
                        >
                          Sync Selected
                        </button>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => setSelectedMappings(new Set(Array.from({ length: employeeMappings.length }, (_, i) => i)))}
                        className="text-orange-400 hover:text-orange-300 text-sm"
                      >
                        Select All
                      </button>
                      <button
                        onClick={() => setSelectedMappings(new Set())}
                        className="text-gray-400 hover:text-gray-300 text-sm"
                      >
                        Clear All
                      </button>
                    </div>
                  </div>

                  {/* Mappings Table */}
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead>
                        <tr className="border-b border-gray-700">
                          <th className="text-left py-3 px-4 text-gray-300 w-12">
                            <input
                              type="checkbox"
                              checked={selectedMappings.size === employeeMappings.length}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedMappings(new Set(Array.from({ length: employeeMappings.length }, (_, i) => i)));
                                } else {
                                  setSelectedMappings(new Set());
                                }
                              }}
                              className="rounded"
                            />
                          </th>
                          <th className="text-left py-3 px-4 text-gray-300">Employee</th>
                          <th className="text-left py-3 px-4 text-gray-300">Status</th>
                          <th className="text-left py-3 px-4 text-gray-300">Xero Employee</th>
                          <th className="text-left py-3 px-4 text-gray-300">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {employeeMappings.map((mapping, index) => (
                          <tr key={index} className="border-b border-gray-700">
                            <td className="py-3 px-4">
                              <input
                                type="checkbox"
                                checked={selectedMappings.has(index)}
                                onChange={(e) => handleMappingSelect(index, e.target.checked)}
                                className="rounded"
                              />
                            </td>
                            <td className="py-3 px-4">
                              <div>
                                <p className="text-white font-medium">
                                  {mapping.localEmployee?.name || 'Unknown'}
                                </p>
                                <p className="text-gray-400 text-sm">
                                  {mapping.localEmployee?.email}
                                </p>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                {getStatusIcon(mapping.syncStatus)}
                                <span className={getStatusBadge(mapping.syncStatus)}>
                                  {mapping.syncStatus.replace('_', ' ')}
                                </span>
                              </div>
                              {mapping.differences && mapping.differences.length > 0 && (
                                <p className="text-orange-400 text-xs mt-1">
                                  {mapping.differences.length} difference(s)
                                </p>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              {mapping.xeroEmployee ? (
                                <div>
                                  <p className="text-white">
                                    {mapping.xeroEmployee.firstName} {mapping.xeroEmployee.lastName}
                                  </p>
                                  <p className="text-gray-400 text-sm">
                                    {mapping.xeroEmployee.email}
                                  </p>
                                </div>
                              ) : (
                                <span className="text-gray-400">Not in Xero</span>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex gap-2">
                                {mapping.syncStatus === 'conflict' && (
                                  <button
                                    onClick={() => resolveConflict(mapping)}
                                    className="p-1 bg-orange-600 hover:bg-orange-700 text-white rounded text-sm transition-colors"
                                  >
                                    Resolve
                                  </button>
                                )}
                                {mapping.syncStatus === 'needs_sync' && mapping.localEmployee?.id && (
                                  <button
                                    onClick={() => handleAction('sync_single_employee', { employeeId: mapping.localEmployee!.id })}
                                    className="p-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors"
                                  >
                                    Sync
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'history' && (
                <div className="space-y-4">
                  {syncHistory.length === 0 ? (
                    <p className="text-gray-400 text-center py-8">No sync history available</p>
                  ) : (
                    <div className="space-y-3">
                      {syncHistory.map((entry) => (
                        <div key={entry.id} className="flex items-start gap-3 p-3 bg-gray-700 rounded-lg">
                          <Calendar className="w-5 h-5 text-orange-400 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-white font-medium">{entry.action}</p>
                            <p className="text-gray-300 text-sm">{entry.description}</p>
                            <p className="text-gray-400 text-xs mt-1">
                              {new Date(entry.created_at).toLocaleDateString('en-AU', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Conflict Resolution Modal */}
      {showConflictModal && selectedConflict && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full border border-gray-700">
            <div className="bg-gray-900 border-b border-gray-700 px-6 py-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Resolve Sync Conflict</h2>
                <button
                  onClick={() => setShowConflictModal(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="mb-6">
                <h3 className="text-lg font-medium text-white mb-4">
                  Conflict detected for: {selectedConflict.localEmployee?.name}
                </h3>
                
                {selectedConflict.differences && (
                  <div className="bg-orange-900 border border-orange-700 rounded-lg p-4 mb-4">
                    <h4 className="font-medium text-orange-100 mb-2">Differences:</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {selectedConflict.differences.map((diff, index) => (
                        <li key={index} className="text-orange-200 text-sm">{diff}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => handleConflictResolution('use_local')}
                  className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                >
                  Use Local Data
                  <p className="text-blue-100 text-sm font-normal">Override Xero with local employee data</p>
                </button>
                
                <button
                  onClick={() => handleConflictResolution('use_xero')}
                  className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
                >
                  Use Xero Data
                  <p className="text-green-100 text-sm font-normal">Override local with Xero employee data</p>
                </button>
              </div>
              
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => setShowConflictModal(false)}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}