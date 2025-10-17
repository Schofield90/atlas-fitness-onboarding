'use client';

import React, { useState, useEffect } from 'react';
import { 
  FileText,
  Download,
  Calendar,
  Filter,
  Search,
  TrendingUp,
  DollarSign,
  Users,
  PieChart,
  BarChart3,
  RefreshCw,
  Eye,
  X
} from 'lucide-react';
import { useOrganization } from '@/app/hooks/useOrganization';

interface PayrollReportsProps {
  onBack: () => void;
}

interface Report {
  id: string;
  batch_id: string;
  report_type: string;
  report_data: any;
  generated_at: string;
  generated_by: string;
  payroll_batches?: {
    name: string;
    pay_period_start: string;
    pay_period_end: string;
    status: string;
  };
}

interface ReportFilter {
  reportType: string;
  startDate: string;
  endDate: string;
  search: string;
}

export default function PayrollReports({ onBack }: PayrollReportsProps) {
  const { organization } = useOrganization();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  
  const [filters, setFilters] = useState<ReportFilter>({
    reportType: 'all',
    startDate: '',
    endDate: '',
    search: '',
  });

  const reportTypes = [
    { value: 'all', label: 'All Reports' },
    { value: 'payroll_register', label: 'Payroll Register' },
    { value: 'tax_summary', label: 'Tax Summary' },
    { value: 'super_summary', label: 'Super Summary' },
    { value: 'cost_centre', label: 'Cost Centre Report' },
    { value: 'banking_file', label: 'Banking File' },
    { value: 'audit_report', label: 'Audit Report' },
    { value: 'pay_advice', label: 'Pay Advice' },
  ];

  useEffect(() => {
    if (organization?.id) {
      fetchReports();
    }
  }, [organization?.id, filters]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        organizationId: organization?.id!,
      });

      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);

      const response = await fetch(`/api/payroll/reports?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch reports');
      }

      const data = await response.json();
      let reportsData = data.data || [];

      // Apply client-side filters
      if (filters.reportType !== 'all') {
        reportsData = reportsData.filter((r: Report) => r.report_type === filters.reportType);
      }

      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        reportsData = reportsData.filter((r: Report) => 
          r.payroll_batches?.name.toLowerCase().includes(searchTerm) ||
          r.report_type.toLowerCase().includes(searchTerm)
        );
      }

      setReports(reportsData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const generateReport = async (reportType: string, batchId?: string) => {
    if (!batchId) {
      alert('Please select a batch to generate reports for');
      return;
    }

    try {
      setGenerating(reportType);

      const response = await fetch('/api/payroll/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: organization?.id,
          batchId,
          reportType,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate report');
      }

      await fetchReports();
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGenerating(null);
    }
  };

  const downloadReport = (report: Report) => {
    const dataStr = JSON.stringify(report.report_data, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${report.report_type}_${report.batch_id}_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const viewReport = (report: Report) => {
    setSelectedReport(report);
    setShowReportModal(true);
  };

  const getReportIcon = (reportType: string) => {
    switch (reportType) {
      case 'payroll_register':
        return <FileText className="w-5 h-5 text-blue-400" />;
      case 'tax_summary':
        return <PieChart className="w-5 h-5 text-red-400" />;
      case 'super_summary':
        return <TrendingUp className="w-5 h-5 text-green-400" />;
      case 'cost_centre':
        return <BarChart3 className="w-5 h-5 text-purple-400" />;
      case 'banking_file':
        return <DollarSign className="w-5 h-5 text-green-400" />;
      case 'audit_report':
        return <Eye className="w-5 h-5 text-yellow-400" />;
      case 'pay_advice':
        return <Users className="w-5 h-5 text-orange-400" />;
      default:
        return <FileText className="w-5 h-5 text-gray-400" />;
    }
  };

  const formatReportType = (type: string) => {
    return type.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
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
            <h1 className="text-2xl font-bold text-white">Payroll Reports</h1>
            <p className="text-gray-400">Generate and view payroll reports</p>
          </div>
        </div>
        
        <button
          onClick={fetchReports}
          className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Report Type</label>
            <select
              value={filters.reportType}
              onChange={(e) => setFilters(prev => ({ ...prev, reportType: e.target.value }))}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
            >
              {reportTypes.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Start Date</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">End Date</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                placeholder="Search reports..."
                className="w-full pl-10 pr-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Generate Section */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Quick Generate Reports</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {reportTypes.slice(1).map(type => (
            <button
              key={type.value}
              onClick={() => generateReport(type.value, 'latest')} // TODO: Implement batch selector
              disabled={generating === type.value}
              className="p-4 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 rounded-lg text-left transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                {getReportIcon(type.value)}
                {generating === type.value && (
                  <RefreshCw className="w-4 h-4 animate-spin text-orange-400" />
                )}
              </div>
              <h4 className="text-white font-medium text-sm">{type.label}</h4>
              <p className="text-gray-400 text-xs">Generate latest</p>
            </button>
          ))}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-900 border border-red-700 text-red-100 px-4 py-3 rounded-lg">
          <div className="flex items-center gap-2">
            <X className="w-5 h-5" />
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

      {/* Reports Table */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Generated Reports</h3>
          <span className="text-gray-400 text-sm">{reports.length} reports found</span>
        </div>

        {reports.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400">No reports found</p>
            <p className="text-gray-500 text-sm">Generate your first report to get started</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-3 px-4 text-gray-300">Report Type</th>
                  <th className="text-left py-3 px-4 text-gray-300">Batch</th>
                  <th className="text-left py-3 px-4 text-gray-300">Pay Period</th>
                  <th className="text-left py-3 px-4 text-gray-300">Generated</th>
                  <th className="text-left py-3 px-4 text-gray-300">Generated By</th>
                  <th className="text-left py-3 px-4 text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((report) => (
                  <tr key={report.id} className="border-b border-gray-700 hover:bg-gray-750">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        {getReportIcon(report.report_type)}
                        <span className="text-white font-medium">
                          {formatReportType(report.report_type)}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <p className="text-white">{report.payroll_batches?.name || 'Unknown'}</p>
                        <p className="text-gray-400 text-sm">ID: {report.batch_id.slice(0, 8)}...</p>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-300">
                      {report.payroll_batches ? (
                        <div>
                          <p>{new Date(report.payroll_batches.pay_period_start).toLocaleDateString('en-AU')}</p>
                          <p className="text-gray-400 text-sm">
                            to {new Date(report.payroll_batches.pay_period_end).toLocaleDateString('en-AU')}
                          </p>
                        </div>
                      ) : (
                        'N/A'
                      )}
                    </td>
                    <td className="py-3 px-4 text-gray-300">
                      {new Date(report.generated_at).toLocaleDateString('en-AU', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3 px-4 text-gray-300">{report.generated_by}</td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => viewReport(report)}
                          className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                          title="View Report"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => downloadReport(report)}
                          className="p-2 bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
                          title="Download Report"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Report View Modal */}
      {showReportModal && selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden border border-gray-700">
            {/* Modal Header */}
            <div className="bg-gray-900 border-b border-gray-700 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getReportIcon(selectedReport.report_type)}
                  <div>
                    <h2 className="text-xl font-bold text-white">
                      {formatReportType(selectedReport.report_type)}
                    </h2>
                    <p className="text-gray-400 text-sm">
                      {selectedReport.payroll_batches?.name}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowReportModal(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <pre className="bg-gray-900 border border-gray-600 rounded-lg p-4 text-gray-300 text-sm overflow-x-auto">
                {JSON.stringify(selectedReport.report_data, null, 2)}
              </pre>
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-900 border-t border-gray-700 px-6 py-4 flex gap-3">
              <button
                onClick={() => downloadReport(selectedReport)}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download
              </button>
              <button
                onClick={() => setShowReportModal(false)}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}