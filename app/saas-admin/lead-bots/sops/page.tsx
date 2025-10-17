"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  DocumentTextIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ArrowLeftIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";

interface SOP {
  id: string;
  name: string;
  description?: string;
  content: string;
  strictness_level?: 'exact_script' | 'guideline' | 'general_tone';
  created_at: string;
  updated_at: string;
}

export default function SOPsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [sops, setSops] = useState<SOP[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingSOP, setEditingSOP] = useState<SOP | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    content: "",
    strictness_level: "guideline" as 'exact_script' | 'guideline' | 'general_tone',
  });

  // Fetch SOPs on mount
  useEffect(() => {
    fetchSOPs();
  }, []);

  async function fetchSOPs() {
    try {
      setLoading(true);
      const response = await fetch('/api/saas-admin/lead-bots/sops');
      if (response.ok) {
        const { sops } = await response.json();
        setSops(sops || []);
      }
    } catch (error) {
      console.error("Error fetching SOPs:", error);
    } finally {
      setLoading(false);
    }
  }

  function handleCreate() {
    setEditingSOP(null);
    setFormData({
      name: "",
      description: "",
      content: "",
      strictness_level: "guideline"
    });
    setShowModal(true);
  }

  function handleEdit(sop: SOP) {
    setEditingSOP(sop);
    setFormData({
      name: sop.name,
      description: sop.description || "",
      content: sop.content,
      strictness_level: sop.strictness_level || "guideline",
    });
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!formData.name.trim() || !formData.content.trim()) {
      alert("Name and content are required");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        name: formData.name,
        description: formData.description,
        content: formData.content,
        strictness_level: formData.strictness_level,
      };

      let response;
      if (editingSOP) {
        // Update existing SOP
        response = await fetch("/api/saas-admin/lead-bots/sops", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, id: editingSOP.id }),
        });
      } else {
        // Create new SOP
        response = await fetch("/api/saas-admin/lead-bots/sops", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || "Failed to save SOP");
      }

      // Refresh SOPs list
      await fetchSOPs();
      setShowModal(false);
      setFormData({ name: "", description: "", content: "" });
      setEditingSOP(null);
    } catch (error: any) {
      console.error("Error saving SOP:", error);
      alert(`Failed to save SOP: ${error.message}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this SOP? This will unlink it from all agents.")) {
      return;
    }

    try {
      const response = await fetch(`/api/saas-admin/lead-bots/sops?id=${id}`, {
        method: "DELETE"
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || "Failed to delete SOP");
      }

      // Refresh SOPs list
      await fetchSOPs();
    } catch (error: any) {
      console.error("Error deleting SOP:", error);
      alert(`Failed to delete SOP: ${error.message}`);
    }
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <Link
          href="/saas-admin/lead-bots/agents"
          className="inline-flex items-center text-gray-400 hover:text-white mb-4"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          Back to Agents
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <DocumentTextIcon className="h-8 w-8 text-blue-500" />
              <h1 className="text-3xl font-bold text-white">AI SOPs</h1>
            </div>
            <p className="mt-2 text-gray-400">
              Standard Operating Procedures for AI agent behavior
            </p>
          </div>
          <button
            onClick={handleCreate}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <PlusIcon className="h-5 w-5" />
            Create SOP
          </button>
        </div>
      </div>

      {/* SOPs List */}
      {sops.length === 0 ? (
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-12 text-center">
          <DocumentTextIcon className="h-12 w-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-400 mb-2">
            No SOPs yet
          </h3>
          <p className="text-gray-500 mb-6">
            Create your first Standard Operating Procedure to define AI agent behavior
          </p>
          <button
            onClick={handleCreate}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors inline-flex items-center gap-2"
          >
            <PlusIcon className="h-5 w-5" />
            Create First SOP
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sops.map((sop) => (
            <div
              key={sop.id}
              className="bg-gray-800 rounded-lg border border-gray-700 p-6 hover:border-blue-500 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white mb-2">{sop.name}</h3>
                  <div className="inline-flex">
                    {sop.strictness_level === 'exact_script' && (
                      <span className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded text-xs font-medium">
                        📜 Exact Script
                      </span>
                    )}
                    {sop.strictness_level === 'guideline' && (
                      <span className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded text-xs font-medium">
                        📋 Guideline
                      </span>
                    )}
                    {sop.strictness_level === 'general_tone' && (
                      <span className="px-2 py-1 bg-green-500/20 text-green-300 rounded text-xs font-medium">
                        💡 General Tone
                      </span>
                    )}
                    {!sop.strictness_level && (
                      <span className="px-2 py-1 bg-gray-500/20 text-gray-400 rounded text-xs font-medium">
                        📋 Guideline (default)
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(sop)}
                    className="p-1 text-gray-400 hover:text-blue-500 transition-colors"
                  >
                    <PencilIcon className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(sop.id)}
                    className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
              {sop.description && (
                <p className="text-sm text-gray-400 mb-3">{sop.description}</p>
              )}
              <div className="bg-gray-900 rounded p-3 mb-3">
                <pre className="text-xs text-gray-300 whitespace-pre-wrap line-clamp-3">
                  {sop.content}
                </pre>
              </div>
              <div className="text-xs text-gray-500">
                Last updated: {new Date(sop.updated_at).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg max-w-4xl w-full border border-gray-700 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-700">
              <h3 className="text-2xl font-bold text-white">
                {editingSOP ? "Edit SOP" : "Create New SOP"}
              </h3>
              <p className="text-sm text-gray-400 mt-1">
                Define how AI agents should behave and respond
              </p>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Lead Qualification Process"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={2}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Brief description of this SOP's purpose"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Strictness Level *
                </label>
                <select
                  value={formData.strictness_level}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      strictness_level: e.target.value as 'exact_script' | 'guideline' | 'general_tone'
                    })
                  }
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="exact_script">
                    📜 Exact Script - Copy word-for-word (for message templates)
                  </option>
                  <option value="guideline">
                    📋 Guideline - Follow closely but allow adaptation
                  </option>
                  <option value="general_tone">
                    💡 General Tone - Use as general guidance only
                  </option>
                </select>
                <p className="text-xs text-gray-400 mt-2">
                  <strong>Exact Script:</strong> AI will copy the template exactly (use for first/second/third message templates)
                  <br />
                  <strong>Guideline:</strong> AI will follow closely but adapt to context (use for pricing/booking flows)
                  <br />
                  <strong>General Tone:</strong> AI will use as general guidance (use for tone/style rules)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Content *
                </label>
                <textarea
                  value={formData.content}
                  onChange={(e) =>
                    setFormData({ ...formData, content: e.target.value })
                  }
                  rows={15}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter the AI instructions for this SOP..."
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  This content will be included in agent prompts when this SOP is selected
                </p>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setFormData({
                      name: "",
                      description: "",
                      content: "",
                      strictness_level: "guideline"
                    });
                    setEditingSOP(null);
                  }}
                  className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      {editingSOP ? "Update SOP" : "Create SOP"}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
