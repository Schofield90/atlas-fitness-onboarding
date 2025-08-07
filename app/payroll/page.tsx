'use client';

import React, { useState, useEffect } from 'react';
import { 
  Plus,
  DollarSign,
  Settings,
  FileText,
  Clock,
  CheckCircle,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { useOrganization } from '@/app/hooks/useOrganization';
import PayrollDashboard from '@/app/components/payroll/PayrollDashboard';
import PayrollBatch from '@/app/components/payroll/PayrollBatch';
import PayrollReports from '@/app/components/payroll/PayrollReports';
import XeroSync from '@/app/components/payroll/XeroSync';

type ViewType = 'dashboard' | 'batches' | 'batch-detail' | 'reports' | 'xero-sync' | 'create-batch';

interface PayrollBatchSummary {
  id: string;
  name: string;
  pay_period_start: string;
  pay_period_end: string;
  payment_date: string;
  status: 'draft' | 'calculating' | 'pending_approval' | 'approved' | 'processing' | 'completed' | 'cancelled' | 'error';
  total_gross_pay: number;
  total_net_pay: number;
  employee_count: number;
  created_at: string;
  updated_at: string;
}

interface CreateBatchForm {
  name: string;
  payPeriodStart: string;
  payPeriodEnd: string;
  paymentDate: string;
  frequency: 'weekly' | 'fortnightly' | 'monthly' | 'custom';
  includeAllEmployees: boolean;
  selectedEmployeeIds: string[];
}

export default function PayrollPage() {
  const { organization } = useOrganization();
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [batches, setBatches] = useState<PayrollBatchSummary[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [createBatchForm, setCreateBatchForm] = useState<CreateBatchForm>({
    name: '',
    payPeriodStart: '',
    payPeriodEnd: '',
    paymentDate: '',
    frequency: 'fortnightly',
    includeAllEmployees: true,
    selectedEmployeeIds: [],
  });

  useEffect(() => {
    if (organization?.id) {
      fetchInitialData();
    }
  }, [organization?.id]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchBatches(),
        fetchEmployees(),
      ]);
    } catch (err) {
      console.error('Failed to fetch initial data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchBatches = async () => {
    try {
      const response = await fetch(`/api/payroll/batches?organizationId=${organization?.id}&limit=20`);
      if (response.ok) {
        const data = await response.json();
        setBatches(data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch batches:', err);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await fetch(`/api/staff?organizationId=${organization?.id}`);
      if (response.ok) {
        const data = await response.json();
        setEmployees(data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch employees:', err);
    }
  };

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);

      const employeeIds = createBatchForm.includeAllEmployees 
        ? employees.map(emp => emp.id) 
        : createBatchForm.selectedEmployeeIds;

      const response = await fetch('/api/payroll/batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: organization?.id,
          name: createBatchForm.name,
          payPeriodStart: createBatchForm.payPeriodStart,
          payPeriodEnd: createBatchForm.payPeriodEnd,
          paymentDate: createBatchForm.paymentDate,
          frequency: createBatchForm.frequency,
          employeeIds,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create batch');
      }

      const result = await response.json();
      
      // Reset form and redirect to batch detail
      setCreateBatchForm({
        name: '',
        payPeriodStart: '',
        payPeriodEnd: '',
        paymentDate: '',
        frequency: 'fortnightly',
        includeAllEmployees: true,
        selectedEmployeeIds: [],
      });

      setSelectedBatchId(result.data.id);
      setCurrentView('batch-detail');
      await fetchBatches();

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium";
    
    switch (status) {
      case 'draft':
        return `${baseClasses} bg-gray-700 text-gray-300`;
      case 'calculating':
        return `${baseClasses} bg-blue-700 text-blue-300`;
      case 'pending_approval':
        return `${baseClasses} bg-yellow-700 text-yellow-300`;
      case 'approved':
        return `${baseClasses} bg-green-700 text-green-300`;
      case 'processing':
        return `${baseClasses} bg-purple-700 text-purple-300`;
      case 'completed':
        return `${baseClasses} bg-green-700 text-green-300`;
      case 'cancelled':
        return `${baseClasses} bg-red-700 text-red-300`;
      case 'error':
        return `${baseClasses} bg-red-700 text-red-300`;
      default:
        return `${baseClasses} bg-gray-700 text-gray-300`;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'processing':
        return <RefreshCw className="w-4 h-4 text-purple-400 animate-spin" />;
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-red-400" />;
      default:
        return <Clock className="w-4 h-4 text-yellow-400" />;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
    }).format(amount);
  };

  const renderNavigation = () => (
    <div className="flex items-center justify-between mb-6">
      <div className="flex gap-2">
        <button
          onClick={() => setCurrentView('dashboard')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            currentView === 'dashboard'
              ? 'bg-orange-500 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          Dashboard
        </button>
        <button
          onClick={() => setCurrentView('batches')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            currentView === 'batches'
              ? 'bg-orange-500 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          Payroll Batches
        </button>
        <button
          onClick={() => setCurrentView('reports')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            currentView === 'reports'
              ? 'bg-orange-500 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          Reports
        </button>
        <button
          onClick={() => setCurrentView('xero-sync')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            currentView === 'xero-sync'
              ? 'bg-orange-500 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          Xero Sync
        </button>
      </div>

      {currentView === 'batches' && (
        <button
          onClick={() => setCurrentView('create-batch')}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Create Batch
        </button>
      )}
    </div>
  );

  const renderCreateBatchForm = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => setCurrentView('batches')}
          className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
        >
          ← Back
        </button>
        <h1 className="text-2xl font-bold text-white">Create New Payroll Batch</h1>
      </div>

      {error && (
        <div className="bg-red-900 border border-red-700 text-red-100 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <form onSubmit={handleCreateBatch} className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Batch Name *
            </label>
            <input
              type="text"
              value={createBatchForm.name}
              onChange={(e) => setCreateBatchForm(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              placeholder="e.g., Payroll Week Ending 15/03/2024"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Pay Frequency *
            </label>
            <select
              value={createBatchForm.frequency}
              onChange={(e) => setCreateBatchForm(prev => ({ ...prev, frequency: e.target.value as any }))}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              required
            >
              <option value="weekly">Weekly</option>
              <option value="fortnightly">Fortnightly</option>
              <option value="monthly">Monthly</option>
              <option value="custom">Custom</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Pay Period Start *
            </label>
            <input
              type="date"
              value={createBatchForm.payPeriodStart}
              onChange={(e) => setCreateBatchForm(prev => ({ ...prev, payPeriodStart: e.target.value }))}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Pay Period End *
            </label>
            <input
              type="date"
              value={createBatchForm.payPeriodEnd}
              onChange={(e) => setCreateBatchForm(prev => ({ ...prev, payPeriodEnd: e.target.value }))}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Payment Date *
            </label>
            <input
              type="date"
              value={createBatchForm.paymentDate}
              onChange={(e) => setCreateBatchForm(prev => ({ ...prev, paymentDate: e.target.value }))}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              required
            />
          </div>
        </div>

        <div className="mt-6">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={createBatchForm.includeAllEmployees}
              onChange={(e) => setCreateBatchForm(prev => ({ 
                ...prev, 
                includeAllEmployees: e.target.checked,
                selectedEmployeeIds: e.target.checked ? [] : prev.selectedEmployeeIds
              }))}
              className="rounded"
            />
            <span className="text-white">Include all active employees ({employees.length})</span>
          </label>
        </div>

        {!createBatchForm.includeAllEmployees && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Select Employees
            </label>
            <div className="max-h-48 overflow-y-auto bg-gray-700 border border-gray-600 rounded-lg p-3">
              {employees.map((employee) => (
                <label key={employee.id} className="flex items-center gap-3 py-1">
                  <input
                    type="checkbox"
                    checked={createBatchForm.selectedEmployeeIds.includes(employee.id)}
                    onChange={(e) => {
                      const newIds = e.target.checked
                        ? [...createBatchForm.selectedEmployeeIds, employee.id]
                        : createBatchForm.selectedEmployeeIds.filter(id => id !== employee.id);
                      setCreateBatchForm(prev => ({ ...prev, selectedEmployeeIds: newIds }));
                    }}
                    className="rounded"
                  />
                  <span className="text-white">{employee.name}</span>
                  <span className="text-gray-400 text-sm">({employee.email})</span>
                </label>
              ))}
            </div>
            <p className="text-gray-400 text-sm mt-2">
              {createBatchForm.selectedEmployeeIds.length} employee(s) selected
            </p>
          </div>
        )}

        <div className="mt-6 flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            Create Batch
          </button>
          <button
            type="button"
            onClick={() => setCurrentView('batches')}
            className="px-6 py-3 bg-gray-600 hover:bg-gray-500 text-white font-medium rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );

  const renderBatchesList = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Payroll Batches</h1>
        <button
          onClick={fetchBatches}
          className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {batches.length === 0 ? (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-12 text-center">
          <DollarSign className="w-16 h-16 text-gray-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No Payroll Batches</h3>
          <p className="text-gray-400 mb-6">Create your first payroll batch to get started</p>
          <button
            onClick={() => setCurrentView('create-batch')}
            className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2 mx-auto"
          >
            <Plus className="w-5 h-5" />
            Create First Batch
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {batches.map((batch) => (
            <div
              key={batch.id}
              className="bg-gray-800 border border-gray-700 rounded-lg p-6 hover:border-gray-600 transition-colors cursor-pointer"
              onClick={() => {
                setSelectedBatchId(batch.id);
                setCurrentView('batch-detail');
              }}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-white">{batch.name}</h3>
                    <div className={getStatusBadge(batch.status)}>
                      {batch.status.replace('_', ' ').toUpperCase()}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-gray-400">Pay Period</p>
                      <p className="text-white">
                        {new Date(batch.pay_period_start).toLocaleDateString('en-AU')} - {new Date(batch.pay_period_end).toLocaleDateString('en-AU')}
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-gray-400">Payment Date</p>
                      <p className="text-white">{new Date(batch.payment_date).toLocaleDateString('en-AU')}</p>
                    </div>
                    
                    <div>
                      <p className="text-gray-400">Employees</p>
                      <p className="text-white">{batch.employee_count}</p>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="flex items-center gap-2 mb-2">
                    {getStatusIcon(batch.status)}
                  </div>
                  <div className="text-sm">
                    <p className="text-gray-400">Gross Pay</p>
                    <p className="text-white font-medium">{formatCurrency(batch.total_gross_pay)}</p>
                  </div>
                  <div className="text-sm mt-2">
                    <p className="text-gray-400">Net Pay</p>
                    <p className="text-white font-medium">{formatCurrency(batch.total_net_pay)}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  if (loading && currentView === 'dashboard') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-8">
        {(currentView === 'dashboard' || currentView === 'batches' || currentView === 'reports' || currentView === 'xero-sync') && renderNavigation()}
        
        {currentView === 'dashboard' && (
          <PayrollDashboard
            onCreateBatch={() => setCurrentView('create-batch')}
            onViewReports={() => setCurrentView('reports')}
            onXeroSync={() => setCurrentView('xero-sync')}
          />
        )}

        {currentView === 'batches' && renderBatchesList()}

        {currentView === 'create-batch' && renderCreateBatchForm()}

        {currentView === 'batch-detail' && selectedBatchId && (
          <PayrollBatch
            batchId={selectedBatchId}
            onBack={() => setCurrentView('batches')}
            onEditBatch={(batchId) => {
              setSelectedBatchId(batchId);
              // TODO: Implement edit functionality
              console.log('Edit batch:', batchId);
            }}
          />
        )}

        {currentView === 'reports' && (
          <PayrollReports
            onBack={() => setCurrentView('dashboard')}
          />
        )}

        {currentView === 'xero-sync' && (
          <XeroSync
            onBack={() => setCurrentView('dashboard')}
          />
        )}
      </div>
    </div>
  );
}