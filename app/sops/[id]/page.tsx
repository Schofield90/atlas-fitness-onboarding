'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Edit3, 
  Share2, 
  Clock, 
  Users, 
  CheckCircle, 
  AlertTriangle,
  MessageCircle,
  FileText,
  Calendar,
  User,
  Tag,
  Download,
  Printer,
  MoreVertical,
  UserPlus,
  History
} from 'lucide-react';
import { Button } from '@/app/components/ui/Button';
import { Badge } from '@/app/components/ui/Badge';
import { SOPEditor } from '@/app/components/sops/SOPEditor';

interface SOPDetails {
  id: string;
  title: string;
  content: string;
  description?: string;
  category: string;
  tags: string[];
  version: number;
  status: 'draft' | 'review' | 'approved' | 'archived';
  training_required: boolean;
  effective_date?: string;
  review_date?: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  approved_by?: string;
  category_info?: {
    name: string;
    color?: string;
    icon?: string;
  };
  creator?: {
    id: string;
    name: string;
    email: string;
  };
  approver?: {
    id: string;
    name: string;
    email: string;
  };
  training_stats?: {
    total_assigned: number;
    completed: number;
    in_progress: number;
    overdue: number;
  };
  versions?: Array<{
    id: string;
    version: number;
    title: string;
    changes_summary: string;
    created_at: string;
    creator: {
      name: string;
      email: string;
    };
  }>;
  comments?: Array<{
    id: string;
    content: string;
    created_at: string;
    user: {
      name: string;
      email: string;
    };
    replies?: Array<{
      id: string;
      content: string;
      created_at: string;
      user: {
        name: string;
        email: string;
      };
    }>;
  }>;
  training_records?: Array<{
    id: string;
    user_id: string;
    status: string;
    assigned_at: string;
    completed_at?: string;
    quiz_score?: number;
    quiz_passed?: boolean;
    user: {
      name: string;
      email: string;
    };
  }>;
}

interface TrainingAssignment {
  user_ids: string[];
  due_date?: string;
  notes?: string;
}

export default function SOPDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const [sop, setSop] = useState<SOPDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('content');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [staff, setStaff] = useState<Array<{ id: string; name: string; email: string; }>>([]);

  useEffect(() => {
    if (params.id) {
      fetchSOPDetails();
      fetchStaff();
    }
  }, [params.id]);

  const fetchSOPDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/sops/${params.id}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch SOP details');
      }

      const data = await response.json();
      setSop(data.sop);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchStaff = async () => {
    try {
      const response = await fetch('/api/staff');
      if (response.ok) {
        const data = await response.json();
        setStaff(data.staff || []);
      }
    } catch (error) {
      console.error('Error fetching staff:', error);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = (updatedSop: SOPDetails) => {
    setSop(updatedSop);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const handleAssignTraining = async (assignment: TrainingAssignment) => {
    try {
      const response = await fetch('/api/training/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sop_id: params.id,
          ...assignment
        })
      });

      if (!response.ok) {
        throw new Error('Failed to assign training');
      }

      const result = await response.json();
      
      // Refresh SOP details to get updated training stats
      await fetchSOPDetails();
      
      setShowAssignModal(false);
      
      // Show success message (you could use a toast notification here)
      alert(`Successfully assigned training to ${result.assignments_created} users`);
      
    } catch (error) {
      console.error('Error assigning training:', error);
      alert('Failed to assign training. Please try again.');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'review': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'archived': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const renderMarkdown = (content: string) => {
    // Simple markdown rendering - in production you'd use a proper markdown parser
    return content
      .replace(/^# (.*$)/gm, '<h1 class="text-2xl font-bold mb-4">$1</h1>')
      .replace(/^## (.*$)/gm, '<h2 class="text-xl font-semibold mb-3">$1</h2>')
      .replace(/^### (.*$)/gm, '<h3 class="text-lg font-medium mb-2">$1</h3>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n\n/g, '</p><p class="mb-4">')
      .replace(/\n/g, '<br>')
      .replace(/^(.*)/, '<p class="mb-4">$1</p>');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="bg-white rounded-lg shadow p-6 space-y-4">
              <div className="h-6 bg-gray-200 rounded w-1/2"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !sop) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto text-center py-12">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {error || 'SOP not found'}
          </h2>
          <Button onClick={() => router.push('/sops')} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to SOPs
          </Button>
        </div>
      </div>
    );
  }

  if (isEditing) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <SOPEditor
          sop={sop}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => router.push('/sops')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to SOPs
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{sop.title}</h1>
              <div className="flex items-center gap-4 mt-1">
                <Badge className={getStatusColor(sop.status)}>
                  {sop.status.charAt(0).toUpperCase() + sop.status.slice(1)}
                </Badge>
                <span className="text-sm text-gray-500">
                  Version {sop.version}
                </span>
                <span className="text-sm text-gray-500">
                  Updated {formatDate(sop.updated_at)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Export
            </Button>
            <Button variant="outline" className="flex items-center gap-2">
              <Printer className="h-4 w-4" />
              Print
            </Button>
            {sop.training_required && (
              <Button 
                onClick={() => setShowAssignModal(true)}
                className="flex items-center gap-2"
              >
                <UserPlus className="h-4 w-4" />
                Assign Training
              </Button>
            )}
            <Button onClick={handleEdit} className="flex items-center gap-2">
              <Edit3 className="h-4 w-4" />
              Edit
            </Button>
            <Button variant="outline">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {['content', 'training', 'history', 'comments'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm capitalize ${
                    activeTab === tab
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab === 'content' && <FileText className="h-4 w-4 inline mr-2" />}
                  {tab === 'training' && <Users className="h-4 w-4 inline mr-2" />}
                  {tab === 'history' && <History className="h-4 w-4 inline mr-2" />}
                  {tab === 'comments' && <MessageCircle className="h-4 w-4 inline mr-2" />}
                  {tab}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {/* Content Tab */}
            {activeTab === 'content' && (
              <div className="space-y-6">
                {/* Metadata */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-gray-50 rounded-lg p-4">
                  <div>
                    <div className="text-sm font-medium text-gray-500">Category</div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline">{sop.category}</Badge>
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500">Created By</div>
                    <div className="mt-1">
                      <div className="font-medium">{sop.creator?.name}</div>
                      <div className="text-sm text-gray-500">{formatDate(sop.created_at)}</div>
                    </div>
                  </div>
                  {sop.training_required && (
                    <div>
                      <div className="text-sm font-medium text-gray-500">Training Status</div>
                      <div className="mt-1">
                        <div className="text-lg font-bold">
                          {sop.training_stats?.completed || 0}/{sop.training_stats?.total_assigned || 0}
                        </div>
                        <div className="text-sm text-gray-500">Completed</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Tags */}
                {sop.tags && sop.tags.length > 0 && (
                  <div>
                    <div className="text-sm font-medium text-gray-500 mb-2">Tags</div>
                    <div className="flex flex-wrap gap-2">
                      {sop.tags.map((tag, index) => (
                        <Badge key={index} variant="secondary" className="flex items-center gap-1">
                          <Tag className="h-3 w-3" />
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Description */}
                {sop.description && (
                  <div>
                    <div className="text-sm font-medium text-gray-500 mb-2">Description</div>
                    <p className="text-gray-700">{sop.description}</p>
                  </div>
                )}

                {/* Content */}
                <div>
                  <div className="text-sm font-medium text-gray-500 mb-4">Content</div>
                  <div 
                    className="prose max-w-none"
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(sop.content) }}
                  />
                </div>

                {/* Dates */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 rounded-lg p-4">
                  {sop.effective_date && (
                    <div>
                      <div className="text-sm font-medium text-gray-500">Effective Date</div>
                      <div className="flex items-center gap-2 mt-1">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span>{formatDate(sop.effective_date)}</span>
                      </div>
                    </div>
                  )}
                  {sop.review_date && (
                    <div>
                      <div className="text-sm font-medium text-gray-500">Review Date</div>
                      <div className="flex items-center gap-2 mt-1">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span>{formatDate(sop.review_date)}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Training Tab */}
            {activeTab === 'training' && (
              <div className="space-y-6">
                {!sop.training_required ? (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Training Not Required
                    </h3>
                    <p className="text-gray-500">
                      This SOP doesn't require training completion.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Training Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="bg-blue-50 rounded-lg p-4">
                        <div className="text-2xl font-bold text-blue-600">
                          {sop.training_stats?.total_assigned || 0}
                        </div>
                        <div className="text-sm text-blue-600">Total Assigned</div>
                      </div>
                      <div className="bg-green-50 rounded-lg p-4">
                        <div className="text-2xl font-bold text-green-600">
                          {sop.training_stats?.completed || 0}
                        </div>
                        <div className="text-sm text-green-600">Completed</div>
                      </div>
                      <div className="bg-yellow-50 rounded-lg p-4">
                        <div className="text-2xl font-bold text-yellow-600">
                          {sop.training_stats?.in_progress || 0}
                        </div>
                        <div className="text-sm text-yellow-600">In Progress</div>
                      </div>
                      <div className="bg-red-50 rounded-lg p-4">
                        <div className="text-2xl font-bold text-red-600">
                          {sop.training_stats?.overdue || 0}
                        </div>
                        <div className="text-sm text-red-600">Overdue</div>
                      </div>
                    </div>

                    {/* Training Records */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold">Training Records</h3>
                        <Button 
                          onClick={() => setShowAssignModal(true)}
                          className="flex items-center gap-2"
                        >
                          <UserPlus className="h-4 w-4" />
                          Assign Training
                        </Button>
                      </div>

                      {sop.training_records && sop.training_records.length > 0 ? (
                        <div className="bg-white border rounded-lg overflow-hidden">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  User
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Status
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Assigned
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Completed
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Score
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {sop.training_records.map((record) => (
                                <tr key={record.id} className="hover:bg-gray-50">
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div>
                                      <div className="font-medium text-gray-900">
                                        {record.user.name}
                                      </div>
                                      <div className="text-sm text-gray-500">
                                        {record.user.email}
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <Badge 
                                      className={
                                        record.status === 'completed' ? 'bg-green-100 text-green-800' :
                                        record.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                                        record.status === 'overdue' ? 'bg-red-100 text-red-800' :
                                        'bg-gray-100 text-gray-800'
                                      }
                                    >
                                      {record.status.replace('_', ' ')}
                                    </Badge>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {formatDate(record.assigned_at)}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {record.completed_at ? formatDate(record.completed_at) : '-'}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {record.quiz_score ? `${record.quiz_score}%` : '-'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="text-center py-8 bg-gray-50 rounded-lg">
                          <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <h3 className="text-lg font-medium text-gray-900 mb-2">
                            No Training Assigned
                          </h3>
                          <p className="text-gray-500 mb-4">
                            No staff members have been assigned this training yet.
                          </p>
                          <Button 
                            onClick={() => setShowAssignModal(true)}
                            className="flex items-center gap-2"
                          >
                            <UserPlus className="h-4 w-4" />
                            Assign Training
                          </Button>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* History Tab */}
            {activeTab === 'history' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold">Version History</h3>
                
                {sop.versions && sop.versions.length > 0 ? (
                  <div className="space-y-4">
                    {sop.versions.map((version) => (
                      <div key={version.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge>Version {version.version}</Badge>
                            <span className="font-medium">{version.title}</span>
                          </div>
                          <span className="text-sm text-gray-500">
                            {formatDate(version.created_at)}
                          </span>
                        </div>
                        <p className="text-gray-600 mb-2">{version.changes_summary}</p>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <User className="h-4 w-4" />
                          {version.creator.name}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <History className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No Version History
                    </h3>
                    <p className="text-gray-500">
                      This is the initial version of the SOP.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Comments Tab */}
            {activeTab === 'comments' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold">Comments</h3>
                
                <div className="text-center py-8">
                  <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Comments Coming Soon
                  </h3>
                  <p className="text-gray-500">
                    Comment functionality will be available in a future update.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Training Assignment Modal */}
        {showAssignModal && (
          <TrainingAssignmentModal
            staff={staff}
            onAssign={handleAssignTraining}
            onClose={() => setShowAssignModal(false)}
          />
        )}
      </div>
    </div>
  );
}

// Training Assignment Modal Component
function TrainingAssignmentModal({ 
  staff, 
  onAssign, 
  onClose 
}: {
  staff: Array<{ id: string; name: string; email: string; }>;
  onAssign: (assignment: TrainingAssignment) => void;
  onClose: () => void;
}) {
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedUsers.length === 0) {
      alert('Please select at least one staff member');
      return;
    }

    onAssign({
      user_ids: selectedUsers,
      due_date: dueDate || undefined,
      notes: notes || undefined
    });
  };

  const toggleUser = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[80vh] overflow-y-auto">
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">Assign Training</h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Staff Members *
              </label>
              <div className="max-h-40 overflow-y-auto border rounded-lg p-2 space-y-2">
                {staff.map((member) => (
                  <label key={member.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded">
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(member.id)}
                      onChange={() => toggleUser(member.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <div className="font-medium">{member.name}</div>
                      <div className="text-sm text-gray-500">{member.email}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Due Date (Optional)
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Any additional instructions or notes..."
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">
                Assign Training ({selectedUsers.length} users)
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}