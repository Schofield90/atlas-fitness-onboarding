/**
 * @deprecated This component is deprecated and no longer maintained.
 * Please use the main WorkflowBuilder component at /app/components/automation/WorkflowBuilder.tsx instead.
 * This file is kept for backward compatibility but will be removed in future versions.
 * 
 * Migration: Replace all imports from /app/components/workflows/WorkflowBuilder with /app/components/automation/WorkflowBuilder
 */

'use client';

import React, { useState } from 'react';
import { Plus, Trash2, Settings, Play, Save } from 'lucide-react';
import { Button } from '@/app/components/ui/Button';
import { Badge } from '@/app/components/ui/Badge';
import { WORKFLOW_TRIGGERS, WORKFLOW_ACTIONS } from '@/src/services/workflow.service';

interface WorkflowAction {
  id: string;
  type: string;
  config: Record<string, any>;
  conditions?: Array<{
    field: string;
    operator: string;
    value: any;
  }>;
}

interface WorkflowBuilderProps {
  initialWorkflow?: {
    name: string;
    trigger_type: string;
    trigger_config: Record<string, any>;
    actions: WorkflowAction[];
    active: boolean;
  };
  onSave?: (workflow: any) => void;
  onCancel?: () => void;
}

export default function WorkflowBuilder({ initialWorkflow, onSave, onCancel }: WorkflowBuilderProps) {
  const [name, setName] = useState(initialWorkflow?.name || '');
  const [triggerType, setTriggerType] = useState(initialWorkflow?.trigger_type || '');
  const [actions, setActions] = useState<WorkflowAction[]>(
    initialWorkflow?.actions || []
  );
  const [active, setActive] = useState(initialWorkflow?.active ?? true);

  const addAction = () => {
    const newAction: WorkflowAction = {
      id: Date.now().toString(),
      type: 'send_email',
      config: {}
    };
    setActions([...actions, newAction]);
  };

  const removeAction = (actionId: string) => {
    setActions(actions.filter(a => a.id !== actionId));
  };

  const updateAction = (actionId: string, updates: Partial<WorkflowAction>) => {
    setActions(actions.map(a => 
      a.id === actionId ? { ...a, ...updates } : a
    ));
  };

  const handleSave = () => {
    const workflow = {
      name,
      trigger_type: triggerType,
      trigger_config: {},
      actions: actions.map(({ id, ...action }) => action),
      active
    };
    onSave?.(workflow);
  };

  const renderActionConfig = (action: WorkflowAction) => {
    const actionDef = WORKFLOW_ACTIONS[action.type as keyof typeof WORKFLOW_ACTIONS];
    if (!actionDef) return null;

    return (
      <div className="space-y-3">
        {Object.entries(actionDef.config).map(([key, config]) => {
          if (config.type === 'string') {
            return (
              <div key={key}>
                <label className="block text-sm font-medium mb-1 capitalize">
                  {key.replace(/_/g, ' ')}
                  {config.required && <span className="text-red-500">*</span>}
                </label>
                <input
                  type="text"
                  className="w-full p-2 border rounded-lg"
                  value={action.config[key] || ''}
                  onChange={(e) => updateAction(action.id, {
                    config: { ...action.config, [key]: e.target.value }
                  })}
                  placeholder={`e.g., {{trigger.${key}}}`}
                />
              </div>
            );
          }

          if (config.type === 'enum' && config.values) {
            return (
              <div key={key}>
                <label className="block text-sm font-medium mb-1 capitalize">
                  {key.replace(/_/g, ' ')}
                </label>
                <select
                  className="w-full p-2 border rounded-lg"
                  value={action.config[key] || config.default || ''}
                  onChange={(e) => updateAction(action.id, {
                    config: { ...action.config, [key]: e.target.value }
                  })}
                >
                  <option value="">Select...</option>
                  {config.values.map(value => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </div>
            );
          }

          if (config.type === 'number') {
            return (
              <div key={key}>
                <label className="block text-sm font-medium mb-1 capitalize">
                  {key.replace(/_/g, ' ')}
                  {config.required && <span className="text-red-500">*</span>}
                </label>
                <input
                  type="number"
                  className="w-full p-2 border rounded-lg"
                  value={action.config[key] || ''}
                  onChange={(e) => updateAction(action.id, {
                    config: { ...action.config, [key]: parseInt(e.target.value) }
                  })}
                  min={config.min}
                  max={config.max}
                />
              </div>
            );
          }

          return null;
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">
          {initialWorkflow ? 'Edit Workflow' : 'Create Workflow'}
        </h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!name || !triggerType || actions.length === 0}>
            <Save className="h-4 w-4 mr-2" />
            Save Workflow
          </Button>
        </div>
      </div>

      {/* Basic Info */}
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <h3 className="text-lg font-semibold">Basic Information</h3>
        
        <div>
          <label className="block text-sm font-medium mb-1">
            Workflow Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            className="w-full p-2 border rounded-lg"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Welcome Email Series"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Trigger <span className="text-red-500">*</span>
          </label>
          <select
            className="w-full p-2 border rounded-lg"
            value={triggerType}
            onChange={(e) => setTriggerType(e.target.value)}
          >
            <option value="">Select a trigger...</option>
            {Object.entries(WORKFLOW_TRIGGERS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="active"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
          />
          <label htmlFor="active" className="text-sm font-medium">
            Workflow is active
          </label>
        </div>
      </div>

      {/* Actions */}
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Actions</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={addAction}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Action
          </Button>
        </div>

        {actions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No actions added yet</p>
            <p className="text-sm mt-1">Click "Add Action" to get started</p>
          </div>
        ) : (
          <div className="space-y-4">
            {actions.map((action, index) => (
              <div key={action.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-semibold">
                      {index + 1}
                    </div>
                    <select
                      className="p-2 border rounded-lg"
                      value={action.type}
                      onChange={(e) => updateAction(action.id, { 
                        type: e.target.value,
                        config: {} // Reset config when changing type
                      })}
                    >
                      {Object.entries(WORKFLOW_ACTIONS).map(([key, def]) => (
                        <option key={key} value={key}>
                          {def.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    onClick={() => removeAction(action.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {renderActionConfig(action)}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Preview */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Workflow Preview</h3>
        <div className="flex items-center gap-2">
          <Badge variant="info">Trigger</Badge>
          <span className="text-sm">{WORKFLOW_TRIGGERS[triggerType as keyof typeof WORKFLOW_TRIGGERS] || 'No trigger selected'}</span>
        </div>
        {actions.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-sm text-gray-600">Then:</p>
            {actions.map((action, index) => (
              <div key={action.id} className="flex items-center gap-2 ml-4">
                <span className="text-sm text-gray-500">{index + 1}.</span>
                <Badge variant="default">
                  {WORKFLOW_ACTIONS[action.type as keyof typeof WORKFLOW_ACTIONS]?.name || action.type}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}