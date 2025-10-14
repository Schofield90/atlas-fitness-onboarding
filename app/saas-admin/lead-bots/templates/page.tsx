"use client";

import { useEffect, useState } from "react";
import { PencilIcon, PlusIcon, TrashIcon, ClockIcon, CheckCircleIcon } from "@heroicons/react/24/outline";

interface TaskTemplate {
  id: string;
  name: string;
  description: string;
  triggerEvent: string;
  taskTitleTemplate: string;
  taskInstructionsTemplate: string;
  scheduleDelayMinutes: number;
  priority: number;
  enabled: boolean;
  organizationName: string;
}

export default function TaskTemplatesPage() {
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTemplate, setEditingTemplate] = useState<TaskTemplate | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/saas-admin/lead-bots/templates");
      if (!response.ok) throw new Error("Failed to fetch templates");

      const data = await response.json();
      setTemplates(data.templates);
    } catch (error) {
      console.error("Error fetching templates:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveTemplate = async () => {
    if (!editingTemplate) return;

    try {
      setSaving(true);
      const response = await fetch(`/api/saas-admin/lead-bots/templates/${editingTemplate.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editingTemplate.name,
          description: editingTemplate.description,
          task_title_template: editingTemplate.taskTitleTemplate,
          task_instructions_template: editingTemplate.taskInstructionsTemplate,
          schedule_delay_minutes: editingTemplate.scheduleDelayMinutes,
          priority: editingTemplate.priority,
          enabled: editingTemplate.enabled,
        }),
      });

      if (!response.ok) throw new Error("Failed to save template");

      await fetchTemplates();
      setEditingTemplate(null);
      alert("Template saved successfully");
    } catch (error) {
      console.error("Error saving template:", error);
      alert("Failed to save template");
    } finally {
      setSaving(false);
    }
  };

  const toggleTemplate = async (template: TaskTemplate) => {
    try {
      const response = await fetch(`/api/saas-admin/lead-bots/templates/${template.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !template.enabled }),
      });

      if (!response.ok) throw new Error("Failed to toggle template");

      await fetchTemplates();
    } catch (error) {
      console.error("Error toggling template:", error);
      alert("Failed to toggle template");
    }
  };

  const formatDelay = (minutes: number) => {
    if (minutes < 0) {
      const absMinutes = Math.abs(minutes);
      if (absMinutes >= 60) {
        return `${absMinutes / 60} hour${absMinutes / 60 > 1 ? 's' : ''} before`;
      }
      return `${absMinutes} minute${absMinutes > 1 ? 's' : ''} before`;
    }

    if (minutes >= 1440) {
      return `${minutes / 1440} day${minutes / 1440 > 1 ? 's' : ''} after`;
    }
    if (minutes >= 60) {
      return `${minutes / 60} hour${minutes / 60 > 1 ? 's' : ''} after`;
    }
    return `${minutes} minute${minutes > 1 ? 's' : ''} after`;
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Task Templates</h1>
        <p className="mt-2 text-gray-400">
          Configure automated follow-up tasks for lead qualification
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          <p className="ml-4 text-gray-400">Loading templates...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {templates.map((template) => (
            <div key={template.id} className="bg-gray-800 rounded-lg border border-gray-700 p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-semibold text-white">{template.name}</h3>
                    {template.enabled ? (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-900 text-green-200 flex items-center">
                        <CheckCircleIcon className="h-3 w-3 mr-1" />
                        Enabled
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-700 text-gray-300">
                        Disabled
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-400 mb-3">{template.description}</p>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Trigger:</span>
                      <p className="text-white font-medium">{template.triggerEvent.replace(/_/g, ' ')}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Delay:</span>
                      <p className="text-white font-medium flex items-center">
                        <ClockIcon className="h-4 w-4 mr-1" />
                        {formatDelay(template.scheduleDelayMinutes)}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500">Priority:</span>
                      <p className="text-white font-medium">{template.priority}/10</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Organization:</span>
                      <p className="text-white font-medium">{template.organizationName}</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingTemplate(template)}
                    className="p-2 text-blue-500 hover:bg-blue-900 hover:bg-opacity-30 rounded-lg transition-colors"
                  >
                    <PencilIcon className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => toggleTemplate(template)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      template.enabled
                        ? 'bg-red-900 hover:bg-red-800 text-red-200'
                        : 'bg-green-900 hover:bg-green-800 text-green-200'
                    }`}
                  >
                    {template.enabled ? 'Disable' : 'Enable'}
                  </button>
                </div>
              </div>

              <div className="border-t border-gray-700 pt-4 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-400 mb-2">Task Title Template:</h4>
                    <p className="text-white text-sm bg-gray-700 rounded p-3">{template.taskTitleTemplate}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-400 mb-2">Task Instructions:</h4>
                    <p className="text-white text-sm bg-gray-700 rounded p-3 max-h-24 overflow-y-auto">
                      {template.taskInstructionsTemplate}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {editingTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-gray-700">
            <div className="p-6 border-b border-gray-700">
              <h3 className="text-2xl font-bold text-white">Edit Template</h3>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Name</label>
                <input
                  type="text"
                  value={editingTemplate.name}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                <textarea
                  value={editingTemplate.description}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, description: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Delay (minutes)</label>
                  <input
                    type="number"
                    value={editingTemplate.scheduleDelayMinutes}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, scheduleDelayMinutes: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Negative = before event, Positive = after event</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Priority (0-10)</label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={editingTemplate.priority}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, priority: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Task Title Template</label>
                <input
                  type="text"
                  value={editingTemplate.taskTitleTemplate}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, taskTitleTemplate: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Use {{lead_name}}, {{call_time}} for variables"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Task Instructions Template</label>
                <textarea
                  value={editingTemplate.taskInstructionsTemplate}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, taskInstructionsTemplate: e.target.value })}
                  rows={6}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Instructions for AI agent. Use {{lead_name}}, {{call_time}} for variables"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="enabled"
                  checked={editingTemplate.enabled}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, enabled: e.target.checked })}
                  className="mr-2"
                />
                <label htmlFor="enabled" className="text-white">Enabled</label>
              </div>
            </div>

            <div className="p-6 border-t border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => setEditingTemplate(null)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveTemplate}
                disabled={saving}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-700 text-white rounded-lg font-medium transition-colors"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
