'use client';

import React, { useState, useEffect } from 'react';
import { Filter, Plus } from 'lucide-react';
import { createClient } from '@/app/lib/supabase/client';
import AddClassTypeModal from './AddClassTypeModal';

interface ClassType {
  id: string;
  name: string;
  color: string;
  count?: number;
}

const ClassTypeFilter: React.FC = () => {
  const [selectedType, setSelectedType] = useState('all');
  const [classTypes, setClassTypes] = useState<ClassType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  
  useEffect(() => {
    fetchClassTypes();
  }, []);
  
  const fetchClassTypes = async () => {
    try {
      const supabase = createClient();
      
      // Get current user's organization
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');
      
      // Get user's organization
      const { data: userOrg } = await supabase
        .from('user_organizations')
        .select('organization_id')
        .eq('user_id', user.id)
        .single();
      
      const organizationId = userOrg?.organization_id || '63589490-8f55-4157-bd3a-e141594b740e'; // Fallback
      
      // Fetch programs (class types)
      const { data, error } = await supabase
        .from('programs')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      
      const types: ClassType[] = [
        { id: 'all', name: 'All Classes', count: 0, color: 'slate' },
        ...(data || []).map(type => ({
          id: type.id,
          name: type.name,
          color: 'orange', // Default color since programs don't have colors
          count: 0 // TODO: Get actual count from class_sessions
        }))
      ];
      
      setClassTypes(types);
    } catch (error) {
      console.error('Error fetching class types:', error);
      // Set default "All Classes" option even on error
      setClassTypes([{ id: 'all', name: 'All Classes', count: 0, color: 'slate' }]);
    } finally {
      setLoading(false);
    }
  };
  
  const getColorClasses = (color: string, isSelected: boolean) => {
    const colors = {
      slate: isSelected ? 'bg-gray-700 text-white border-gray-600' : 'text-gray-300 hover:text-white hover:bg-gray-700',
      orange: isSelected ? 'bg-orange-600 text-white border-orange-500' : 'text-orange-400 hover:text-orange-300 hover:bg-orange-950',
      purple: isSelected ? 'bg-purple-600 text-white border-purple-500' : 'text-purple-400 hover:text-purple-300 hover:bg-purple-950',
      blue: isSelected ? 'bg-blue-600 text-white border-blue-500' : 'text-blue-400 hover:text-blue-300 hover:bg-blue-950',
      green: isSelected ? 'bg-green-600 text-white border-green-500' : 'text-green-400 hover:text-green-300 hover:bg-green-950',
      pink: isSelected ? 'bg-pink-600 text-white border-pink-500' : 'text-pink-400 hover:text-pink-300 hover:bg-pink-950'
    };
    return colors[color] || colors.slate;
  };
  
  if (loading) {
    return (
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-gray-400" />
          <h3 className="text-sm font-medium text-gray-300">Class Types</h3>
        </div>
        <div className="space-y-2">
          <div className="h-10 bg-gray-700 rounded-lg animate-pulse" />
          <div className="h-10 bg-gray-700 rounded-lg animate-pulse" />
        </div>
      </div>
    );
  }
  
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Filter className="w-4 h-4 text-gray-400" />
        <h3 className="text-sm font-medium text-gray-300">Class Types</h3>
      </div>
      
      <div className="space-y-2">
        {classTypes.length > 1 ? (
          classTypes.map((type) => (
            <button
              key={type.id}
              onClick={() => {
                setSelectedType(type.id);
                console.log(`Filter by class type: ${type.name}`);
                // In a real app, this would filter the calendar
              }}
              className={`
                w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium
                border transition-all duration-200
                ${getColorClasses(type.color, selectedType === type.id)}
              `}
            >
              <span>{type.name}</span>
              {type.count !== undefined && (
                <span className="text-xs opacity-75">{type.count}</span>
              )}
            </button>
          ))
        ) : (
          <button
            onClick={() => setShowAddModal(true)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium
              border border-dashed border-gray-600 text-gray-400 hover:text-white hover:border-gray-500
              transition-all duration-200"
          >
            <Plus className="w-4 h-4" />
            <span>Add First Class Type</span>
          </button>
        )}
      </div>
      
      <AddClassTypeModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={() => {
          fetchClassTypes();
        }}
      />
    </div>
  );
};

export default ClassTypeFilter;