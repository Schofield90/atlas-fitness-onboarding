'use client';

import React, { useState, useEffect } from 'react';
import { 
  Play,
  Pause, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Users, 
  DollarSign,
  AlertTriangle,
  Calendar,
  FileText,
  Download,
  RefreshCw,
  Settings,
  Edit,
  Trash2,
  Eye
} from 'lucide-react';
import { useOrganization } from '@/app/hooks/useOrganization';

interface PayrollBatchProps {
  batchId?: string;
  onBack: () => void;
  onEditBatch?: (batchId: string) => void;
}

interface BatchData {
  id: string;
  name: string;
  pay_period_start: string;
  pay_period_end: string;
  payment_date: string;
  status: 'draft' | 'calculating' | 'pending_approval' | 'approved' | 'processing' | 'completed' | 'cancelled' | 'error';
  frequency: string;
  total_gross_pay: number;
  total_deductions: number;
  total_tax: number;
  total_super: number;
  total_net_pay: number;
  employee_count: number;
  xero_payrun_id?: string;
  approved_by?: string;
  approved_at?: string;
  processed_by?: string;
  processed_at?: string;
  created_at: string;
  updated_at: string;
  notes?: string;
  employees: Array<{
    id: string;
    employee_id: string;
    xero_employee_id: string;
    regular_hours: number;
    overtime_hours: number;
    gross_pay: number;
    deductions: number;
    tax: number;
    super_amount: number;
    net_pay: number;
    status: string;
    timesheet_validated: boolean;
    organization_staff?: {
      name: string;
      email: string;
      payroll_number: string;
    };
  }>;
}

interface ProcessingJob {
  id: string;
  status: string;
  progress_percentage: number;
  steps: Array<{
    id: string;
    name: string;
    description: string;
    status: string;
    error_message?: string;
  }>;
  errors: string[];
  warnings: string[];
}

export default function PayrollBatch({ batchId, onBack, onEditBatch }: PayrollBatchProps) {
  const { organization } = useOrganization();
  const [batch, setBatch] = useState<BatchData | null>(null);
  const [processingJob, setProcessingJob] = useState<ProcessingJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (organization?.id && batchId) {
      fetchBatchData();
    }
  }, [organization?.id, batchId]);

  const fetchBatchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/payroll/batches/${batchId}?organizationId=${organization?.id}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch batch data');
      }

      const data = await response.json();
      setBatch(data.data);

      // If batch is processing, also fetch job status
      if (data.data.status === 'processing' || data.data.status === 'calculating') {
        fetchProcessingStatus();
      }

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchProcessingStatus = async () => {
    try {
      const response = await fetch(
        `/api/payroll/process?organizationId=${organization?.id}&status=processing&limit=1`
      );
      
      if (response.ok) {
        const data = await response.json();
        const jobs = data.data || [];
        const relevantJob = jobs.find((job: any) => job.batch_id === batchId);
        
        if (relevantJob) {
          setProcessingJob(relevantJob);
        }
      }
    } catch (err) {
      console.error('Failed to fetch processing status:', err);
    }
  };

  const handleAction = async (action: string, additionalData: any = {}) => {
    try {
      setActionLoading(action);
      
      let endpoint = '';
      let method = 'POST';
      let body: any = {
        organizationId: organization?.id,
        ...additionalData,
      };

      switch (action) {
        case 'calculate':
          endpoint = '/api/payroll/process';
          body.batchId = batchId;
          body.action = 'calculate';
          break;
        case 'process':
          endpoint = '/api/payroll/process';
          body.batchId = batchId;
          body.action = 'process_full';
          break;
        case 'approve':
          endpoint = `/api/payroll/batches/${batchId}`;
          method = 'PUT';
          body.action = 'approve';
          body.userId = 'current-user'; // TODO: Get from auth context
          break;
        case 'reject':
          endpoint = `/api/payroll/batches/${batchId}`;
          method = 'PUT';
          body.action = 'reject';
          body.userId = 'current-user';
          body.reason = additionalData.reason || 'No reason provided';
          break;
        default:
          throw new Error('Invalid action');
      }

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Action failed');
      }

      await fetchBatchData();
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium";
    
    switch (status) {
      case 'draft':
        return `${baseClasses} bg-gray-100 text-gray-800`;
      case 'calculating':
        return `${baseClasses} bg-blue-100 text-blue-800`;
      case 'pending_approval':
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      case 'approved':
        return `${baseClasses} bg-green-100 text-green-800`;
      case 'processing':
        return `${baseClasses} bg-blue-100 text-blue-800`;
      case 'completed':
        return `${baseClasses} bg-green-100 text-green-800`;
      case 'cancelled':
        return `${baseClasses} bg-red-100 text-red-800`;
      case 'error':
        return `${baseClasses} bg-red-100 text-red-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
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
          <span>Error: {error}</span>
        </div>
        <div className="flex gap-2 mt-3">
          <button
            onClick={fetchBatchData}
            className="text-sm underline hover:no-underline"
          >
            Retry
          </button>
          <button
            onClick={onBack}
            className="text-sm underline hover:no-underline"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  if (!batch) return null;

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
            <h1 className="text-2xl font-bold text-white">{batch.name}</h1>
            <p className="text-gray-400">
              Pay Period: {new Date(batch.pay_period_start).toLocaleDateString('en-AU')} - {new Date(batch.pay_period_end).toLocaleDateString('en-AU')}
            </p>
          </div>
          <div className={getStatusBadge(batch.status)}>
            {batch.status.replace('_', ' ').toUpperCase()}
          </div>
        </div>
        
        <div className="flex gap-2">
          {batch.status === 'draft' && onEditBatch && (
            <button
              onClick={() => onEditBatch(batch.id)}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <Edit className="w-4 h-4" />
              Edit
            </button>
          )}
          
          <button
            onClick={fetchBatchData}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Processing Status */}
      {processingJob && (
        <div className="bg-blue-900 border border-blue-700 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Processing Status</h3>
            <span className="text-blue-200 text-sm">{processingJob.progress_percentage}% Complete</span>
          </div>
          
          <div className="w-full bg-blue-800 rounded-full h-2 mb-4">
            <div 
              className="bg-blue-400 h-2 rounded-full transition-all duration-300"
              style={{ width: `${processingJob.progress_percentage}%` }}
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {processingJob.steps.map((step) => (
              <div key={step.id} className="flex items-center gap-2">
                {step.status === 'completed' && <CheckCircle className="w-4 h-4 text-green-400" />}
                {step.status === 'processing' && <RefreshCw className="w-4 h-4 text-blue-400 animate-spin" />}
                {step.status === 'error' && <XCircle className="w-4 h-4 text-red-400" />}
                {step.status === 'pending' && <Clock className="w-4 h-4 text-gray-400" />}
                <span className="text-sm text-blue-100">{step.name}</span>
              </div>
            ))}
          </div>

          {processingJob.errors.length > 0 && (
            <div className="mt-4 p-3 bg-red-900 border border-red-700 rounded-lg">
              <h4 className="text-sm font-medium text-red-100 mb-2">Errors:</h4>
              {processingJob.errors.map((error, index) => (
                <p key={index} className="text-red-200 text-sm">{error}</p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Employees</p>
              <p className="text-2xl font-bold text-white">{batch.employee_count}</p>
            </div>
            <Users className="w-8 h-8 text-blue-400" />
          </div>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Gross Pay</p>
              <p className="text-2xl font-bold text-white">{formatCurrency(batch.total_gross_pay)}</p>
            </div>
            <DollarSign className="w-8 h-8 text-green-400" />
          </div>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Total Tax</p>
              <p className="text-2xl font-bold text-white">{formatCurrency(batch.total_tax)}</p>
            </div>
            <FileText className="w-8 h-8 text-red-400" />
          </div>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Net Pay</p>
              <p className="text-2xl font-bold text-white">{formatCurrency(batch.total_net_pay)}</p>
            </div>
            <DollarSign className="w-8 h-8 text-orange-400" />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Actions</h3>
        <div className="flex flex-wrap gap-3">
          {batch.status === 'draft' && (
            <>
              <button
                onClick={() => handleAction('calculate')}
                disabled={actionLoading === 'calculate'}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                {actionLoading === 'calculate' ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                Calculate Payroll
              </button>
            </>
          )}

          {batch.status === 'pending_approval' && (
            <>
              <button
                onClick={() => handleAction('approve')}
                disabled={actionLoading === 'approve'}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                {actionLoading === 'approve' ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                Approve
              </button>

              <button
                onClick={() => {
                  const reason = prompt('Please provide a reason for rejection:');
                  if (reason) handleAction('reject', { reason });
                }}
                disabled={actionLoading === 'reject'}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                {actionLoading === 'reject' ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <XCircle className="w-4 h-4" />
                )}
                Reject
              </button>
            </>
          )}

          {batch.status === 'approved' && (
            <button
              onClick={() => handleAction('process')}
              disabled={actionLoading === 'process'}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              {actionLoading === 'process' ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Settings className="w-4 h-4" />
              )}
              Process to Xero
            </button>
          )}

          {batch.status === 'completed' && (
            <button
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download Reports
            </button>
          )}
        </div>
      </div>

      {/* Employee Details */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Employee Details</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-3 px-4 text-gray-300">Employee</th>
                <th className="text-left py-3 px-4 text-gray-300">Regular Hours</th>
                <th className="text-left py-3 px-4 text-gray-300">Overtime Hours</th>
                <th className="text-left py-3 px-4 text-gray-300">Gross Pay</th>
                <th className="text-left py-3 px-4 text-gray-300">Tax</th>
                <th className="text-left py-3 px-4 text-gray-300">Super</th>
                <th className="text-left py-3 px-4 text-gray-300">Net Pay</th>
                <th className="text-left py-3 px-4 text-gray-300">Status</th>
              </tr>
            </thead>
            <tbody>
              {batch.employees.map((employee) => (
                <tr key={employee.id} className="border-b border-gray-700">
                  <td className="py-3 px-4">
                    <div>
                      <p className="text-white font-medium">{employee.organization_staff?.name || 'Unknown'}</p>
                      <p className="text-gray-400 text-sm">{employee.organization_staff?.payroll_number}</p>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-white">{employee.regular_hours.toFixed(2)}</td>
                  <td className="py-3 px-4 text-white">{employee.overtime_hours.toFixed(2)}</td>
                  <td className="py-3 px-4 text-white">{formatCurrency(employee.gross_pay)}</td>
                  <td className="py-3 px-4 text-white">{formatCurrency(employee.tax)}</td>
                  <td className="py-3 px-4 text-white">{formatCurrency(employee.super_amount)}</td>
                  <td className="py-3 px-4 text-white font-medium">{formatCurrency(employee.net_pay)}</td>
                  <td className="py-3 px-4">
                    <span className={getStatusBadge(employee.status)}>
                      {employee.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Batch Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Batch Information</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-400">Pay Period</span>
              <span className="text-white">
                {new Date(batch.pay_period_start).toLocaleDateString('en-AU')} - {new Date(batch.pay_period_end).toLocaleDateString('en-AU')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Payment Date</span>
              <span className="text-white">{new Date(batch.payment_date).toLocaleDateString('en-AU')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Frequency</span>
              <span className="text-white capitalize">{batch.frequency}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Created</span>
              <span className="text-white">{new Date(batch.created_at).toLocaleDateString('en-AU')}</span>
            </div>
            {batch.xero_payrun_id && (
              <div className="flex justify-between">
                <span className="text-gray-400">Xero Payrun ID</span>
                <span className="text-white font-mono text-sm">{batch.xero_payrun_id}</span>
              </div>
            )}
          </div>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Approval Details</h3>
          <div className="space-y-3">
            {batch.approved_by ? (
              <>
                <div className="flex justify-between">
                  <span className="text-gray-400">Approved By</span>
                  <span className="text-white">{batch.approved_by}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Approved At</span>
                  <span className="text-white">
                    {batch.approved_at ? new Date(batch.approved_at).toLocaleDateString('en-AU') : 'N/A'}
                  </span>
                </div>
              </>
            ) : (
              <p className="text-gray-400">Not yet approved</p>
            )}

            {batch.processed_at && (
              <div className="flex justify-between">
                <span className="text-gray-400">Processed At</span>
                <span className="text-white">{new Date(batch.processed_at).toLocaleDateString('en-AU')}</span>
              </div>
            )}

            {batch.notes && (
              <div>
                <span className="text-gray-400 block mb-1">Notes</span>
                <p className="text-white text-sm bg-gray-700 p-2 rounded">{batch.notes}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}