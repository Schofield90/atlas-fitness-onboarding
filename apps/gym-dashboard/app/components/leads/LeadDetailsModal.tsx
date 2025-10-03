'use client';

import React, { useState } from 'react';
import { X, Mail, Phone, Calendar, Tag, Edit2, UserCheck } from 'lucide-react';
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
  metadata?: Record<string, any>;
  assigned_user?: {
    full_name: string;
  };
  opportunities?: Array<{
    id: string;
    stage: string;
    value_cents: number;
    probability: number;
  }>;
}

interface LeadDetailsModalProps {
  lead: Lead;
  onClose: () => void;
  onEdit?: (lead: Lead) => void;
  onConvert?: (lead: Lead) => void;
}

export default function LeadDetailsModal({ lead, onClose, onEdit, onConvert }: LeadDetailsModalProps) {
  const [activeTab, setActiveTab] = useState<'details' | 'activity' | 'notes'>('details');
  
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

  const handleConvert = async () => {
    try {
      const response = await fetch(`/api/v2/leads/${lead.id}/convert`, {
        method: 'POST'
      });

      if (response.ok) {
        const data = await response.json();
        onConvert?.(lead);
        onClose();
      }
    } catch (error) {
      console.error('Error converting lead:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-4">
            <div>
              <h2 className="text-xl font-bold">
                {lead.first_name || lead.last_name ? 
                  `${lead.first_name || ''} ${lead.last_name || ''}`.trim() : 
                  'Unnamed Lead'
                }
              </h2>
              <div className="flex items-center gap-3 mt-1">
                <Badge variant={getStatusColor(lead.status)}>
                  {lead.status}
                </Badge>
                <Badge variant={getScoreColor(lead.score)}>
                  Score: {lead.score}
                </Badge>
                {lead.source && (
                  <span className="text-sm text-gray-500">
                    Source: {lead.source}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {lead.status !== 'converted' && lead.status !== 'lost' && (
              <Button
                variant="outline"
                onClick={handleConvert}
                className="flex items-center gap-2"
              >
                <UserCheck className="h-4 w-4" />
                Convert to Client
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => onEdit?.(lead)}
              className="flex items-center gap-2"
            >
              <Edit2 className="h-4 w-4" />
              Edit
            </Button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b">
          <div className="flex">
            <button
              className={`px-6 py-3 font-medium ${
                activeTab === 'details'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
              onClick={() => setActiveTab('details')}
            >
              Details
            </button>
            <button
              className={`px-6 py-3 font-medium ${
                activeTab === 'activity'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
              onClick={() => setActiveTab('activity')}
            >
              Activity
            </button>
            <button
              className={`px-6 py-3 font-medium ${
                activeTab === 'notes'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
              onClick={() => setActiveTab('notes')}
            >
              Notes
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 200px)' }}>
          {activeTab === 'details' && (
            <div className="space-y-6">
              {/* Contact Information */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Contact Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  {lead.email && (
                    <div className="flex items-center gap-3">
                      <Mail className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-500">Email</p>
                        <p className="font-medium">{lead.email}</p>
                      </div>
                    </div>
                  )}
                  {lead.phone && (
                    <div className="flex items-center gap-3">
                      <Phone className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-500">Phone</p>
                        <p className="font-medium">{lead.phone}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Created</p>
                      <p className="font-medium">{formatBritishDate(lead.created_at)}</p>
                    </div>
                  </div>
                  {lead.assigned_user && (
                    <div className="flex items-center gap-3">
                      <UserCheck className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-500">Assigned To</p>
                        <p className="font-medium">{lead.assigned_user.full_name}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Tags */}
              {lead.tags.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {lead.tags.map((tag, index) => (
                      <Badge key={index} variant="default">
                        <Tag className="h-3 w-3 mr-1" />
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Opportunities */}
              {lead.opportunities && lead.opportunities.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Opportunities</h3>
                  <div className="space-y-3">
                    {lead.opportunities.map(opp => (
                      <div key={opp.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium capitalize">{opp.stage.replace('_', ' ')}</p>
                            <p className="text-sm text-gray-500">
                              Probability: {opp.probability}%
                            </p>
                          </div>
                          <p className="text-lg font-semibold">
                            £{(opp.value_cents / 100).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Custom Fields */}
              {lead.metadata && Object.keys(lead.metadata).length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Additional Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {Object.entries(lead.metadata).map(([key, value]) => (
                      <div key={key}>
                        <p className="text-sm text-gray-500 capitalize">
                          {key.replace(/_/g, ' ')}
                        </p>
                        <p className="font-medium">{String(value)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="text-center py-8 text-gray-500">
              <p>Activity timeline coming soon...</p>
            </div>
          )}

          {activeTab === 'notes' && (
            <div className="text-center py-8 text-gray-500">
              <p>Notes feature coming soon...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}