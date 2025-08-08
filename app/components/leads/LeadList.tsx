'use client';

import React, { useState, useEffect } from 'react';
import { Search, Filter, Download, Upload, UserPlus, ChevronDown } from 'lucide-react';
import { formatBritishDate } from '@/app/lib/utils/british-format';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';

interface Lead {
  id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  status: 'new' | 'contacted' | 'qualified' | 'converted' | 'lost';
  source?: string;
  score: number;
  tags: string[];
  created_at: string;
  assigned_user?: {
    full_name: string;
  };
}

interface LeadListProps {
  onLeadClick?: (lead: Lead) => void;
  onCreateClick?: () => void;
  onImportClick?: () => void;
}

export default function LeadList({ onLeadClick, onCreateClick, onImportClick }: LeadListProps) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchLeads();
  }, [page, selectedStatus, selectedTags, searchTerm]);

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '25'
      });

      if (searchTerm) params.append('search', searchTerm);
      if (selectedStatus.length > 0) params.append('status', selectedStatus.join(','));
      if (selectedTags.length > 0) params.append('tags', selectedTags.join(','));

      const response = await fetch(`/api/v2/leads?${params}`);
      const data = await response.json();

      setLeads(data.data || []);
      setTotalPages(data.totalPages || 1);
    } catch (error) {
      console.error('Error fetching leads:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'info';
      case 'contacted': return 'warning';
      case 'qualified': return 'success';
      case 'converted': return 'success';
      case 'lost': return 'error';
      default: return 'default';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'success';
    if (score >= 40) return 'warning';
    return 'default';
  };

  const statusOptions = ['new', 'contacted', 'qualified', 'converted', 'lost'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Leads</h2>
          <p className="text-gray-600">Manage and track your potential customers</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={onImportClick}
            className="flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            Import
          </Button>
          <Button
            onClick={onCreateClick}
            className="flex items-center gap-2"
          >
            <UserPlus className="h-4 w-4" />
            Add Lead
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search leads..."
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            Filters
            <ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </Button>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="bg-gray-50 p-4 rounded-lg space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Status</label>
              <div className="flex flex-wrap gap-2">
                {statusOptions.map(status => (
                  <label key={status} className="flex items-center">
                    <input
                      type="checkbox"
                      className="mr-2"
                      checked={selectedStatus.includes(status)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedStatus([...selectedStatus, status]);
                        } else {
                          setSelectedStatus(selectedStatus.filter(s => s !== status));
                        }
                      }}
                    />
                    <span className="capitalize">{status}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Leads Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Contact
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Score
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Source
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tags
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                  Loading leads...
                </td>
              </tr>
            ) : leads.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                  No leads found
                </td>
              </tr>
            ) : (
              leads.map(lead => (
                <tr
                  key={lead.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => onLeadClick?.(lead)}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {lead.first_name || lead.last_name ? 
                          `${lead.first_name || ''} ${lead.last_name || ''}`.trim() : 
                          'Unnamed Lead'
                        }
                      </div>
                      {lead.assigned_user && (
                        <div className="text-xs text-gray-500">
                          Assigned to: {lead.assigned_user.full_name}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm">
                      {lead.email && (
                        <div className="text-gray-900">{lead.email}</div>
                      )}
                      {lead.phone && (
                        <div className="text-gray-500">{lead.phone}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge variant={getStatusColor(lead.status)}>
                      {lead.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge variant={getScoreColor(lead.score)}>
                      {lead.score}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {lead.source || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatBritishDate(lead.created_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-wrap gap-1">
                      {lead.tags.slice(0, 3).map((tag, index) => (
                        <Badge key={index} variant="default" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {lead.tags.length > 3 && (
                        <Badge variant="default" className="text-xs">
                          +{lead.tags.length - 3}
                        </Badge>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-700">
            Page {page} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}