'use client';

import React, { useState } from 'react';
import { X, Save } from 'lucide-react';
import { createClient } from '@/app/lib/supabase/client';

interface AddClassTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: () => void;
}

const AddClassTypeModal: React.FC<AddClassTypeModalProps> = ({ isOpen, onClose, onAdd }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: 'blue'
  });
  const [loading, setLoading] = useState(false);
  
  if (!isOpen) return null;
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      alert('Please enter a class type name');
      return;
    }
    
    try {
      setLoading(true);
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        alert('Please login to add class types');
        return;
      }
      
      const { error } = await supabase
        .from('class_types')
        .insert({
          name: formData.name,
          description: formData.description,
          color: formData.color,
          user_id: user.id
        });
      
      if (error) throw error;
      
      setFormData({ name: '', description: '', color: 'blue' });
      onAdd();
      onClose();
    } catch (error) {
      console.error('Error adding class type:', error);
      alert('Failed to add class type');
    } finally {
      setLoading(false);
    }
  };
  
  const colorOptions = [
    { value: 'slate', label: 'Gray', className: 'bg-gray-600' },
    { value: 'orange', label: 'Orange', className: 'bg-orange-600' },
    { value: 'purple', label: 'Purple', className: 'bg-purple-600' },
    { value: 'blue', label: 'Blue', className: 'bg-blue-600' },
    { value: 'green', label: 'Green', className: 'bg-green-600' },
    { value: 'pink', label: 'Pink', className: 'bg-pink-600' }
  ];
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <h3 className="text-lg font-semibold text-white">Add Class Type</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Class Type Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-orange-500"
              placeholder="e.g., HIIT, Yoga, Strength Training"
              required
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Description (Optional)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-orange-500"
              rows={3}
              placeholder="Brief description of this class type"
            />
          </div>
          
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Color
            </label>
            <div className="grid grid-cols-3 gap-2">
              {colorOptions.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, color: color.value })}
                  className={`
                    flex items-center justify-center gap-2 px-3 py-2 rounded-lg border-2 transition-all
                    ${formData.color === color.value 
                      ? 'border-orange-500' 
                      : 'border-gray-600 hover:border-gray-500'
                    }
                  `}
                >
                  <div className={`w-4 h-4 rounded ${color.className}`} />
                  <span className="text-sm text-gray-300">{color.label}</span>
                </button>
              ))}
            </div>
          </div>
          
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 rounded-lg transition-colors flex items-center gap-2 text-white"
            >
              <Save className="h-4 w-4" />
              {loading ? 'Adding...' : 'Add Class Type'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddClassTypeModal;