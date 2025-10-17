'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/app/lib/supabase/client'
import { Plus, Tag, X, Edit2, Check, Loader2 } from 'lucide-react'
import SettingsHeader from '@/app/components/settings/SettingsHeader'

interface TagType {
  id: string
  name: string
  color: string
  description?: string
  type: 'lead' | 'customer' | 'general'
  usage_count: number
}

export default function TagsPage() {
  const [tags, setTags] = useState<TagType[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingTag, setEditingTag] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    color: '#3B82F6',
    description: '',
    type: 'general' as 'lead' | 'customer' | 'general'
  })
  const supabase = createClient()

  useEffect(() => {
    fetchTags()
  }, [])

  const fetchTags = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: userOrg } = await supabase
        .from('user_organizations')
        .select('organization_id')
        .eq('user_id', user.id)
        .single()

      if (!userOrg) return

      const { data: tagsData } = await supabase
        .from('tags')
        .select('*')
        .eq('organization_id', userOrg.organization_id)
        .order('name')

      setTags(tagsData || [])
    } catch (error) {
      console.error('Error fetching tags:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTag = async () => {
    if (!formData.name.trim()) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: userOrg } = await supabase
        .from('user_organizations')
        .select('organization_id')
        .eq('user_id', user.id)
        .single()

      if (!userOrg) return

      const { error } = await supabase
        .from('tags')
        .insert({
          organization_id: userOrg.organization_id,
          name: formData.name,
          color: formData.color,
          description: formData.description || null,
          type: formData.type,
          usage_count: 0
        })

      if (error) throw error

      setShowAddModal(false)
      setFormData({ name: '', color: '#3B82F6', description: '', type: 'general' })
      fetchTags()
    } catch (error) {
      console.error('Error creating tag:', error)
    }
  }

  const handleUpdateTag = async (tagId: string, updates: Partial<TagType>) => {
    try {
      const { error } = await supabase
        .from('tags')
        .update(updates)
        .eq('id', tagId)

      if (error) throw error
      fetchTags()
    } catch (error) {
      console.error('Error updating tag:', error)
    }
  }

  const handleDeleteTag = async (tagId: string) => {
    if (!confirm('Are you sure you want to delete this tag? This action cannot be undone.')) return

    try {
      const { error } = await supabase
        .from('tags')
        .delete()
        .eq('id', tagId)

      if (error) throw error
      fetchTags()
    } catch (error) {
      console.error('Error deleting tag:', error)
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'lead': return 'text-blue-400'
      case 'customer': return 'text-green-400'
      default: return 'text-gray-400'
    }
  }

  const colorOptions = [
    '#EF4444', // Red
    '#F59E0B', // Amber
    '#10B981', // Emerald
    '#3B82F6', // Blue
    '#6366F1', // Indigo
    '#8B5CF6', // Violet
    '#EC4899', // Pink
    '#6B7280', // Gray
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <SettingsHeader 
        title="Tags"
        description="Organize your contacts and leads with custom tags"
        icon={<Tag className="h-6 w-6" />}
        action={
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Add Tag
          </button>
        }
      />

      {/* Tags Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tags.map((tag) => (
          <div key={tag.id} className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-3">
                <div 
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: tag.color }}
                />
                {editingTag === tag.id ? (
                  <input
                    type="text"
                    value={tag.name}
                    onChange={(e) => {
                      const updatedTags = tags.map(t => 
                        t.id === tag.id ? { ...t, name: e.target.value } : t
                      )
                      setTags(updatedTags)
                    }}
                    className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                    autoFocus
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-white">{tag.name}</h3>
                    <span className="text-xs text-gray-400">– {(tag.usage_count ?? 0)} {tag.usage_count === 1 ? 'use' : 'uses'}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1">
                {editingTag === tag.id ? (
                  <button
                    onClick={() => {
                      handleUpdateTag(tag.id, { name: tag.name })
                      setEditingTag(null)
                    }}
                    className="p-1 text-green-400 hover:bg-gray-700 rounded"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    onClick={() => setEditingTag(tag.id)}
                    className="p-1 text-gray-400 hover:text-white hover:bg-gray-700 rounded"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                )}
                <button
                  onClick={() => handleDeleteTag(tag.id)}
                  className="p-1 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            
            <p className={`text-xs ${getTypeColor(tag.type)} mb-2`}>
              {tag.type}
            </p>
            
            {tag.description && (
              <p className="text-sm text-gray-400 mb-2">{tag.description}</p>
            )}
            
            
          </div>
        ))}
      </div>

      {tags.length === 0 && (
        <div className="bg-gray-800 rounded-lg p-8 text-center">
          <Tag className="h-12 w-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No tags yet</h3>
          <p className="text-gray-400 mb-4">Create your first tag to start organizing your contacts</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Create Tag
          </button>
        </div>
      )}

      {/* Add Tag Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold text-white mb-4">Create New Tag</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Tag Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  placeholder="e.g., VIP Customer"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Color
                </label>
                <div className="flex gap-2">
                  {colorOptions.map((color) => (
                    <button
                      key={color}
                      onClick={() => setFormData({ ...formData, color })}
                      className={`w-8 h-8 rounded-full ${formData.color === color ? 'ring-2 ring-white' : ''}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Type
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                >
                  <option value="general">General</option>
                  <option value="lead">Lead</option>
                  <option value="customer">Customer</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  rows={3}
                  placeholder="Optional description for this tag"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-4 py-2 text-gray-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTag}
                disabled={!formData.name.trim()}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Create Tag
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}