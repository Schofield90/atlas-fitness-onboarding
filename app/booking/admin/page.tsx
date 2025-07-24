'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/app/components/DashboardLayout';
import { createClient } from '@supabase/supabase-js';
import { Plus, Edit2, Trash2, Calendar, Users, Clock } from 'lucide-react';
import moment from 'moment';

export default function BookingAdminPage() {
  const [programs, setPrograms] = useState<any[]>([]);
  const [classSessions, setClassSessions] = useState<any[]>([]);
  const [showProgramForm, setShowProgramForm] = useState(false);
  const [showClassForm, setShowClassForm] = useState(false);
  const [editingProgram, setEditingProgram] = useState<any>(null);
  const [editingClass, setEditingClass] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [organization, setOrganization] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !authUser) {
        router.push('/login');
        return;
      }

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*, organizations(*)')
        .eq('id', authUser.id)
        .single();

      if (userError || !userData) {
        console.error('Error fetching user data:', userError);
        return;
      }

      setUser(userData);
      setOrganization(userData.organizations);
      
      // Fetch programs and classes
      await fetchPrograms(userData.organizations.id);
      await fetchClasses(userData.organizations.id);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPrograms = async (orgId: string) => {
    const { data, error } = await supabase
      .from('programs')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });

    if (!error) {
      setPrograms(data || []);
    }
  };

  const fetchClasses = async (orgId: string) => {
    const { data, error } = await supabase
      .from('class_sessions')
      .select('*, programs!inner(name)')
      .eq('organization_id', orgId)
      .gte('start_time', new Date().toISOString())
      .order('start_time', { ascending: true })
      .limit(50);

    if (!error) {
      setClassSessions(data || []);
    }
  };

  const handleSaveProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    
    const programData = {
      organization_id: organization.id,
      name: formData.get('name'),
      description: formData.get('description'),
      duration_weeks: formData.get('duration_weeks') ? parseInt(formData.get('duration_weeks') as string) : null,
      price_pennies: parseInt(formData.get('price_pennies') as string),
      max_participants: parseInt(formData.get('max_participants') as string),
      program_type: formData.get('program_type'),
      is_active: true
    };

    if (editingProgram) {
      const { error } = await supabase
        .from('programs')
        .update(programData)
        .eq('id', editingProgram.id);

      if (!error) {
        setEditingProgram(null);
        setShowProgramForm(false);
        fetchPrograms(organization.id);
      }
    } else {
      const { error } = await supabase
        .from('programs')
        .insert(programData);

      if (!error) {
        setShowProgramForm(false);
        fetchPrograms(organization.id);
      }
    }
  };

  const handleSaveClass = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    
    const classData = {
      organization_id: organization.id,
      program_id: formData.get('program_id'),
      trainer_id: user.id,
      name: formData.get('name'),
      description: formData.get('description'),
      start_time: new Date(`${formData.get('date')}T${formData.get('start_time')}`).toISOString(),
      end_time: new Date(`${formData.get('date')}T${formData.get('end_time')}`).toISOString(),
      max_capacity: parseInt(formData.get('max_capacity') as string),
      current_bookings: 0,
      room_location: formData.get('room_location'),
      session_status: 'scheduled'
    };

    if (editingClass) {
      const { error } = await supabase
        .from('class_sessions')
        .update(classData)
        .eq('id', editingClass.id);

      if (!error) {
        setEditingClass(null);
        setShowClassForm(false);
        fetchClasses(organization.id);
      }
    } else {
      const { error } = await supabase
        .from('class_sessions')
        .insert(classData);

      if (!error) {
        setShowClassForm(false);
        fetchClasses(organization.id);
      }
    }
  };

  const handleDeleteProgram = async (id: string) => {
    if (confirm('Are you sure you want to delete this program?')) {
      const { error } = await supabase
        .from('programs')
        .delete()
        .eq('id', id);

      if (!error) {
        fetchPrograms(organization.id);
      }
    }
  };

  const handleDeleteClass = async (id: string) => {
    if (confirm('Are you sure you want to delete this class?')) {
      const { error } = await supabase
        .from('class_sessions')
        .delete()
        .eq('id', id);

      if (!error) {
        fetchClasses(organization.id);
      }
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-screen">
          <div className="text-lg text-gray-600">Loading...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Booking System Admin</h1>

        {/* Programs Section */}
        <div className="mb-12">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold text-gray-800">Programs</h2>
            <button
              onClick={() => {
                setEditingProgram(null);
                setShowProgramForm(true);
              }}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              <Plus size={20} />
              Add Program
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {programs.map((program) => (
              <div key={program.id} className="bg-white p-6 rounded-lg shadow-md">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-semibold">{program.name}</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEditingProgram(program);
                        setShowProgramForm(true);
                      }}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={() => handleDeleteProgram(program.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
                <p className="text-gray-600 text-sm mb-3">{program.description}</p>
                <div className="space-y-1 text-sm">
                  <p><span className="font-medium">Type:</span> {program.program_type}</p>
                  <p><span className="font-medium">Price:</span> £{(program.price_pennies / 100).toFixed(2)}</p>
                  <p><span className="font-medium">Max Participants:</span> {program.max_participants}</p>
                  {program.duration_weeks && (
                    <p><span className="font-medium">Duration:</span> {program.duration_weeks} weeks</p>
                  )}
                  <p><span className="font-medium">Status:</span> 
                    <span className={`ml-2 px-2 py-1 text-xs rounded ${program.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {program.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Classes Section */}
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold text-gray-800">Upcoming Classes</h2>
            <button
              onClick={() => {
                setEditingClass(null);
                setShowClassForm(true);
              }}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
            >
              <Plus size={20} />
              Add Class
            </button>
          </div>

          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Class</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date & Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Capacity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {classSessions.map((session) => (
                  <tr key={session.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{session.name || session.programs?.name}</div>
                        <div className="text-sm text-gray-500">{session.programs?.name}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{moment(session.start_time).format('MMM DD, YYYY')}</div>
                      <div className="text-sm text-gray-500">
                        {moment(session.start_time).format('h:mm A')} - {moment(session.end_time).format('h:mm A')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {session.room_location || 'Main Studio'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{session.current_bookings}/{session.max_capacity}</div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                        <div 
                          className={`h-2 rounded-full ${
                            session.current_bookings >= session.max_capacity ? 'bg-red-600' :
                            session.current_bookings >= session.max_capacity * 0.8 ? 'bg-yellow-600' :
                            'bg-green-600'
                          }`}
                          style={{ width: `${(session.current_bookings / session.max_capacity) * 100}%` }}
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleDeleteClass(session.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Program Form Modal */}
        {showProgramForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-xl font-semibold mb-4">
                {editingProgram ? 'Edit Program' : 'Add New Program'}
              </h3>
              <form onSubmit={handleSaveProgram}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                    <input
                      type="text"
                      name="name"
                      defaultValue={editingProgram?.name}
                      required
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      name="description"
                      defaultValue={editingProgram?.description}
                      rows={3}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                    <select
                      name="program_type"
                      defaultValue={editingProgram?.program_type || 'ongoing'}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="ongoing">Ongoing</option>
                      <option value="challenge">Challenge</option>
                      <option value="trial">Trial</option>
                      <option value="taster">Taster</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Price (pence)</label>
                    <input
                      type="number"
                      name="price_pennies"
                      defaultValue={editingProgram?.price_pennies || 0}
                      required
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Max Participants</label>
                    <input
                      type="number"
                      name="max_participants"
                      defaultValue={editingProgram?.max_participants || 12}
                      required
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Duration (weeks, optional)</label>
                    <input
                      type="number"
                      name="duration_weeks"
                      defaultValue={editingProgram?.duration_weeks || ''}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowProgramForm(false);
                      setEditingProgram(null);
                    }}
                    className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Save
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Class Form Modal */}
        {showClassForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-xl font-semibold mb-4">Add New Class</h3>
              <form onSubmit={handleSaveClass}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Program</label>
                    <select
                      name="program_id"
                      required
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select a program</option>
                      {programs.map((program) => (
                        <option key={program.id} value={program.id}>{program.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name (optional)</label>
                    <input
                      type="text"
                      name="name"
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
                    <textarea
                      name="description"
                      rows={2}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                    <input
                      type="date"
                      name="date"
                      min={new Date().toISOString().split('T')[0]}
                      required
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                      <input
                        type="time"
                        name="start_time"
                        required
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                      <input
                        type="time"
                        name="end_time"
                        required
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Room/Location</label>
                    <input
                      type="text"
                      name="room_location"
                      placeholder="e.g., Studio A"
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Max Capacity</label>
                    <input
                      type="number"
                      name="max_capacity"
                      defaultValue={12}
                      required
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowClassForm(false);
                      setEditingClass(null);
                    }}
                    className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Save
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}