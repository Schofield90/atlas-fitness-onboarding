'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function CreateTestClasses() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const router = useRouter();

  const createTestClasses = async () => {
    setLoading(true);
    setMessage('');
    
    try {
      const supabase = createClient();
      
      // Get the current user's organization
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setMessage('No user logged in');
        setLoading(false);
        return;
      }

      // Get organization ID
      const { data: orgUser } = await supabase
        .from('organization_users')
        .select('organization_id')
        .eq('user_id', user.id)
        .single();

      if (!orgUser) {
        setMessage('No organization found');
        setLoading(false);
        return;
      }

      const organizationId = orgUser.organization_id;

      // Create test programs first
      const programs = [
        { name: 'HIIT Blast', description: 'High intensity interval training', price_pennies: 2000, duration_minutes: 45 },
        { name: 'Yoga Flow', description: 'Vinyasa yoga class', price_pennies: 1800, duration_minutes: 60 },
        { name: 'Strength Training', description: 'Full body strength workout', price_pennies: 2500, duration_minutes: 60 },
        { name: 'Pilates', description: 'Core-focused pilates class', price_pennies: 2200, duration_minutes: 50 },
        { name: 'Boxing Fitness', description: 'Boxing-inspired cardio workout', price_pennies: 2000, duration_minutes: 45 }
      ];

      const { data: createdPrograms, error: programError } = await supabase
        .from('programs')
        .insert(programs.map(p => ({ ...p, organization_id: organizationId, is_active: true })))
        .select();

      if (programError) {
        setMessage(`Error creating programs: ${programError.message}`);
        setLoading(false);
        return;
      }

      // Create class sessions for the next 7 days
      const sessions = [];
      const now = new Date();
      const instructors = ['Sarah Chen', 'Mike Johnson', 'Emma Wilson', 'Tom Davis', 'Lisa Anderson'];
      const locations = ['Studio A', 'Studio B', 'Main Gym', 'Yoga Room'];
      
      for (let day = 0; day < 7; day++) {
        const date = new Date(now);
        date.setDate(date.getDate() + day);
        
        // Morning classes (9am, 10:30am)
        if (day % 2 === 0) {
          date.setHours(9, 0, 0, 0);
          sessions.push({
            organization_id: organizationId,
            program_id: createdPrograms[0].id, // HIIT
            start_time: date.toISOString(),
            end_time: new Date(date.getTime() + 45 * 60000).toISOString(),
            instructor_name: instructors[0],
            capacity: 20,
            location: locations[0],
            duration_minutes: 45
          });
        }
        
        date.setHours(10, 30, 0, 0);
        sessions.push({
          organization_id: organizationId,
          program_id: createdPrograms[1].id, // Yoga
          start_time: date.toISOString(),
          end_time: new Date(date.getTime() + 60 * 60000).toISOString(),
          instructor_name: instructors[1],
          capacity: 25,
          location: locations[3],
          duration_minutes: 60
        });
        
        // Evening classes (5:30pm, 7pm)
        date.setHours(17, 30, 0, 0);
        sessions.push({
          organization_id: organizationId,
          program_id: createdPrograms[2].id, // Strength
          start_time: date.toISOString(),
          end_time: new Date(date.getTime() + 60 * 60000).toISOString(),
          instructor_name: instructors[2],
          capacity: 15,
          location: locations[2],
          duration_minutes: 60
        });
        
        if (day % 3 === 0) {
          date.setHours(19, 0, 0, 0);
          sessions.push({
            organization_id: organizationId,
            program_id: createdPrograms[4].id, // Boxing
            start_time: date.toISOString(),
            end_time: new Date(date.getTime() + 45 * 60000).toISOString(),
            instructor_name: instructors[4],
            capacity: 18,
            location: locations[0],
            duration_minutes: 45
          });
        }
      }

      const { data: createdSessions, error: sessionError } = await supabase
        .from('class_sessions')
        .insert(sessions)
        .select();

      if (sessionError) {
        setMessage(`Error creating sessions: ${sessionError.message}`);
        setLoading(false);
        return;
      }

      // Create some test bookings
      const { data: leads } = await supabase
        .from('leads')
        .select('id')
        .eq('organization_id', organizationId)
        .limit(10);

      if (leads && leads.length > 0 && createdSessions) {
        const bookings = [];
        
        // Add bookings to some sessions
        createdSessions.forEach((session, index) => {
          const numBookings = Math.floor(Math.random() * 10) + 5; // 5-15 bookings per class
          for (let i = 0; i < numBookings && i < leads.length; i++) {
            bookings.push({
              class_session_id: session.id,
              customer_id: leads[i].id,
              status: 'confirmed',
              booking_date: new Date().toISOString()
            });
          }
        });

        await supabase.from('bookings').insert(bookings);
      }

      setMessage(`Successfully created ${createdPrograms.length} programs and ${createdSessions.length} class sessions!`);
      
      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        router.push('/dashboard/overview');
      }, 2000);

    } catch (error: any) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">Create Test Classes</h1>
        
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <p className="text-gray-300 mb-6">
            This will create test programs and class sessions for the next 7 days with some sample bookings.
          </p>
          
          <button
            onClick={createTestClasses}
            disabled={loading}
            className="px-6 py-3 bg-orange-500 text-white font-medium rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating...' : 'Create Test Classes'}
          </button>
          
          {message && (
            <div className={`mt-4 p-4 rounded-lg ${message.includes('Error') ? 'bg-red-900/20 text-red-400' : 'bg-green-900/20 text-green-400'}`}>
              {message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}