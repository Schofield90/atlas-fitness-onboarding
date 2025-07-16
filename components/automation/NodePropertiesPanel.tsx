'use client';

import { useState } from 'react';
import { Trash2, Save } from 'lucide-react';
import { FlowNode, AutomationAction } from '@/lib/types/automation';

interface NodePropertiesPanelProps {
  node: FlowNode;
  onUpdateNode: (nodeId: string, data: Partial<FlowNode['data']>) => void;
  onDeleteNode: (nodeId: string) => void;
  actions: AutomationAction[];
}

export default function NodePropertiesPanel({ 
  node, 
  onUpdateNode, 
  onDeleteNode, 
  actions 
}: NodePropertiesPanelProps) {
  const [localData, setLocalData] = useState(node.data);

  const handleSave = () => {
    onUpdateNode(node.id, localData);
  };

  const handleFieldChange = (field: string, value: unknown) => {
    setLocalData(prev => ({
      ...prev,
      config: {
        ...prev.config,
        [field]: value,
      },
    }));
  };

  const handleLabelChange = (label: string) => {
    setLocalData(prev => ({
      ...prev,
      label,
    }));
  };

  const handleDescriptionChange = (description: string) => {
    setLocalData(prev => ({
      ...prev,
      description,
    }));
  };

  const handleActionChange = (actionId: string) => {
    const selectedAction = actions.find(a => a.id === actionId);
    setLocalData(prev => ({
      ...prev,
      action: selectedAction,
      label: selectedAction?.name || prev.label,
      description: selectedAction?.description || prev.description,
    }));
  };

  const renderTriggerConfig = () => {
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Trigger Type
          </label>
          <select
            value={localData.config.trigger_type || ''}
            onChange={(e) => handleFieldChange('trigger_type', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select a trigger...</option>
            <option value="lead_created">New Lead Created</option>
            <option value="lead_status_changed">Lead Status Changed</option>
            <option value="client_joined">Client Joined</option>
            <option value="membership_expired">Membership Expired</option>
            <option value="payment_failed">Payment Failed</option>
            <option value="date_based">Scheduled (Date/Time)</option>
            <option value="manual">Manual Trigger</option>
          </select>
        </div>

        {localData.config.trigger_type === 'lead_status_changed' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status Change
            </label>
            <div className="space-y-2">
              <select
                value={localData.config.from_status || ''}
                onChange={(e) => handleFieldChange('from_status', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">From any status</option>
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="qualified">Qualified</option>
                <option value="interested">Interested</option>
                <option value="not_interested">Not Interested</option>
              </select>
              <select
                value={localData.config.to_status || ''}
                onChange={(e) => handleFieldChange('to_status', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">To any status</option>
                <option value="contacted">Contacted</option>
                <option value="qualified">Qualified</option>
                <option value="interested">Interested</option>
                <option value="not_interested">Not Interested</option>
                <option value="converted">Converted</option>
                <option value="lost">Lost</option>
              </select>
            </div>
          </div>
        )}

        {localData.config.trigger_type === 'date_based' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Schedule
            </label>
            <div className="space-y-2">
              <select
                value={localData.config.schedule_type || ''}
                onChange={(e) => handleFieldChange('schedule_type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select schedule type...</option>
                <option value="once">Once</option>
                <option value="recurring">Recurring</option>
              </select>
              
              {localData.config.schedule_type === 'once' && (
                <input
                  type="datetime-local"
                  value={localData.config.scheduled_at || ''}
                  onChange={(e) => handleFieldChange('scheduled_at', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              )}
              
              {localData.config.schedule_type === 'recurring' && (
                <input
                  type="text"
                  placeholder="0 9 * * 1 (every Monday at 9 AM)"
                  value={localData.config.cron_expression || ''}
                  onChange={(e) => handleFieldChange('cron_expression', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderActionConfig = () => {
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Action
          </label>
          <select
            value={localData.action?.id || ''}
            onChange={(e) => handleActionChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select an action...</option>
            {actions.map(action => (
              <option key={action.id} value={action.id}>
                {action.name} ({action.category})
              </option>
            ))}
          </select>
        </div>

        {localData.action && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Action Configuration</h4>
            
            {localData.action.type === 'email' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Recipient
                  </label>
                  <input
                    type="text"
                    placeholder="{{ lead.email }} or specific email"
                    value={localData.config.recipient || ''}
                    onChange={(e) => handleFieldChange('recipient', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Subject
                  </label>
                  <input
                    type="text"
                    placeholder="Welcome {{ lead.first_name }}!"
                    value={localData.config.subject || ''}
                    onChange={(e) => handleFieldChange('subject', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Message
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Hi {{ lead.first_name }}, welcome to Atlas Fitness!"
                    value={localData.config.message || ''}
                    onChange={(e) => handleFieldChange('message', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            )}

            {localData.action.type === 'sms' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    placeholder="{{ lead.phone }} or +1234567890"
                    value={localData.config.phone || ''}
                    onChange={(e) => handleFieldChange('phone', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Message
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Hi {{ lead.first_name }}, thanks for your interest!"
                    value={localData.config.message || ''}
                    onChange={(e) => handleFieldChange('message', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    maxLength={160}
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    {(localData.config.message?.length || 0)}/160 characters
                  </div>
                </div>
              </div>
            )}

            {localData.action.type === 'database' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Operation
                  </label>
                  <select
                    value={localData.config.operation || ''}
                    onChange={(e) => handleFieldChange('operation', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select operation...</option>
                    <option value="create_lead">Create Lead</option>
                    <option value="update_lead">Update Lead</option>
                    <option value="create_activity">Create Activity</option>
                    <option value="assign_lead">Assign Lead</option>
                  </select>
                </div>
              </div>
            )}

            {localData.action.type === 'delay' && (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Hours
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="24"
                      value={localData.config.hours || 0}
                      onChange={(e) => handleFieldChange('hours', parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Minutes
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="59"
                      value={localData.config.minutes || 0}
                      onChange={(e) => handleFieldChange('minutes', parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Seconds
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="59"
                      value={localData.config.seconds || 0}
                      onChange={(e) => handleFieldChange('seconds', parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderConditionConfig = () => {
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Condition Type
          </label>
          <select
            value={localData.config.condition_type || ''}
            onChange={(e) => handleFieldChange('condition_type', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select condition...</option>
            <option value="lead_score">Lead Score</option>
            <option value="lead_source">Lead Source</option>
            <option value="custom_field">Custom Field</option>
            <option value="time_based">Time Based</option>
          </select>
        </div>

        {localData.config.condition_type === 'lead_score' && (
          <div className="space-y-2">
            <select
              value={localData.config.score_operator || ''}
              onChange={(e) => handleFieldChange('score_operator', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select operator...</option>
              <option value="greater_than">Greater than</option>
              <option value="less_than">Less than</option>
              <option value="equal_to">Equal to</option>
            </select>
            <input
              type="number"
              placeholder="Score value (0-100)"
              value={localData.config.score_value || ''}
              onChange={(e) => handleFieldChange('score_value', parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Node Properties</h3>
        <button
          onClick={() => onDeleteNode(node.id)}
          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
          title="Delete node"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Basic Properties */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">Basic Properties</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Name
              </label>
              <input
                type="text"
                value={localData.label}
                onChange={(e) => handleLabelChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Description
              </label>
              <textarea
                rows={2}
                value={localData.description || ''}
                onChange={(e) => handleDescriptionChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Node-specific Configuration */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">Configuration</h4>
          {node.type === 'trigger' && renderTriggerConfig()}
          {node.type === 'action' && renderActionConfig()}
          {node.type === 'condition' && renderConditionConfig()}
          {node.type === 'delay' && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Hours
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="24"
                    value={localData.config.hours || 0}
                    onChange={(e) => handleFieldChange('hours', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Minutes
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={localData.config.minutes || 0}
                    onChange={(e) => handleFieldChange('minutes', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Seconds
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={localData.config.seconds || 0}
                    onChange={(e) => handleFieldChange('seconds', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        <button
          onClick={handleSave}
          className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
        >
          <Save className="h-4 w-4" />
          Save Changes
        </button>
      </div>
    </div>
  );
}