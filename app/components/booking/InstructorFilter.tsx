'use client';

import React, { useState, useEffect } from 'react';
import { Users, Plus } from 'lucide-react';
import { createClient } from '@/app/lib/supabase/client';
import AddStaffModal from './AddStaffModal';

interface Instructor {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  classes?: number;
  status?: string;
}

const InstructorFilter: React.FC = () => {
  const [selectedInstructor, setSelectedInstructor] = useState('all');
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  
  useEffect(() => {
    fetchInstructors();
  }, []);
  
  const fetchInstructors = async () => {
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
      
      // Try to fetch from instructors table first
      const { data, error } = await supabase
        .from('instructors')
        .select('*')
        .eq('organization_id', organizationId)
        .order('name');
      
      if (error) {
        console.warn('Instructors table not found, using fallback');
        // Fallback: Get unique instructor names from class_sessions
        const { data: sessions } = await supabase
          .from('class_sessions')
          .select('instructor_name')
          .eq('organization_id', organizationId)
          .not('instructor_name', 'is', null);
        
        const uniqueInstructors = [...new Set(sessions?.map(s => s.instructor_name) || [])];
        
        const instructorList: Instructor[] = [
          { id: 'all', name: 'All Instructors', classes: 0 },
          ...uniqueInstructors.map((name, index) => ({
            id: `inst-${index}`,
            name: name,
            avatar: name.charAt(0).toUpperCase(),
            classes: 0,
            status: 'active'
          }))
        ];
        
        setInstructors(instructorList);
      } else {
        const instructorList: Instructor[] = [
          { id: 'all', name: 'All Instructors', classes: 0 },
          ...(data || []).map(inst => ({
            id: inst.id,
            name: inst.name,
            email: inst.email,
            avatar: inst.name.charAt(0).toUpperCase(),
            classes: 0,
            status: 'active'
          }))
        ];
        
        setInstructors(instructorList);
      }
    } catch (error) {
      console.error('Error fetching instructors:', error);
      // Set default "All Instructors" option even on error
      setInstructors([{ id: 'all', name: 'All Instructors', classes: 0 }]);
    } finally {
      setLoading(false);
    }
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'busy': return 'bg-amber-500';
      case 'offline': return 'bg-slate-500';
      default: return 'bg-slate-500';
    }
  };
  
  if (loading) {
    return (
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-4 h-4 text-gray-400" />
          <h3 className="text-sm font-medium text-gray-300">Instructors</h3>
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
        <Users className="w-4 h-4 text-gray-400" />
        <h3 className="text-sm font-medium text-gray-300">Instructors</h3>
      </div>
      
      <div className="space-y-2">
        {instructors.length > 1 ? (
          instructors.map((instructor) => (
            <button
              key={instructor.id}
              onClick={() => {
                setSelectedInstructor(instructor.id);
                console.log(`Filter by instructor: ${instructor.name}`);
                // In a real app, this would filter the calendar
              }}
              className={`
                w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm
                transition-all duration-200 border
                ${selectedInstructor === instructor.id
                  ? 'bg-gray-700 text-white border-gray-600'
                  : 'text-gray-300 hover:text-white hover:bg-gray-700 border-transparent'
                }
              `}
            >
              <div className="flex items-center gap-2 flex-1">
                {instructor.avatar && instructor.id !== 'all' && (
                  <div className="relative">
                    <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-white font-medium">
                      {instructor.avatar}
                    </div>
                    <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-gray-900 ${getStatusColor(instructor.status || 'active')}`} />
                  </div>
                )}
                <span className="font-medium">{instructor.name}</span>
              </div>
              {instructor.classes !== undefined && (
                <span className="text-xs opacity-75">{instructor.classes}</span>
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
            <span>Add First Staff Member</span>
          </button>
        )}
      </div>
      
      <AddStaffModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={() => {
          fetchInstructors();
        }}
      />
    </div>
  );
};

export default InstructorFilter;