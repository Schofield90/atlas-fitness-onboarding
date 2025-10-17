'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Search, UserPlus, X } from 'lucide-react';
import DashboardLayout from '@/app/components/DashboardLayout';
import { createClient } from '@/app/lib/supabase/client';

interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
}

interface ClassSession {
  id: string;
  program: {
    name: string;
  };
  start_time: string;
  capacity: number;
  bookings: Array<{
    customer_id: string;
  }>;
}

export default function AddMemberPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;
  
  const [session, setSession] = useState<ClassSession | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    fetchData();
  }, [sessionId]);

  const fetchData = async () => {
    try {
      const supabase = createClient();
      
      // Fetch session details
      const { data: sessionData, error: sessionError } = await supabase
        .from('class_sessions')
        .select(`
          *,
          program:programs(name),
          bookings(customer_id)
        `)
        .eq('id', sessionId)
        .single();

      if (sessionError) throw sessionError;
      setSession(sessionData);

      // Fetch all customers
      const { data: customersData, error: customersError } = await supabase
        .from('leads')
        .select('id, name, email, phone')
        .order('name');

      if (customersError) throw customersError;
      
      // Filter out customers who are already booked
      const bookedCustomerIds = sessionData.bookings.map((b: any) => b.customer_id);
      const availableCustomers = customersData.filter(c => !bookedCustomerIds.includes(c.id));
      
      setCustomers(availableCustomers);
    } catch (error) {
      console.error('Error fetching data:', error);
      setErrorMessage('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const addMemberToSession = async (customerId: string) => {
    setAdding(true);
    setErrorMessage('');
    setSuccessMessage('');
    
    try {
      const supabase = createClient();
      
      // Check if session is full
      if (session && session.bookings.length >= session.capacity) {
        setErrorMessage('This session is full');
        return;
      }
      
      // Create booking
      const { error } = await supabase
        .from('bookings')
        .insert({
          class_session_id: sessionId,
          customer_id: customerId,
          status: 'confirmed',
          booking_type: 'staff_added'
        });

      if (error) throw error;
      
      setSuccessMessage('Member added successfully!');
      
      // Redirect back after a short delay
      setTimeout(() => {
        router.push(`/booking/session/${sessionId}`);
      }, 1000);
      
    } catch (error: any) {
      console.error('Error adding member:', error);
      setErrorMessage(error.message || 'Failed to add member');
    } finally {
      setAdding(false);
    }
  };

  const filteredCustomers = customers.filter(customer => 
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (customer.phone && customer.phone.includes(searchTerm))
  );

  if (loading) {
    return (
      <DashboardLayout userData={null}>
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!session) {
    return (
      <DashboardLayout userData={null}>
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
          <p className="text-gray-400">Session not found</p>
        </div>
      </DashboardLayout>
    );
  }

  const spotsLeft = session.capacity - session.bookings.length;
  const startTime = new Date(session.start_time);

  return (
    <DashboardLayout userData={null}>
      <div className="min-h-screen bg-gray-900">
        <div className="container mx-auto px-6 py-8">
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-gray-400 hover:text-white mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Session
            </button>
            
            <div>
              <h1 className="text-3xl font-bold mb-2">Add Member to Session</h1>
              <p className="text-gray-400">
                {session.program.name} - {startTime.toLocaleDateString('en-GB')} at {startTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
              </p>
              <p className="text-sm text-orange-400 mt-1">
                {spotsLeft} spots remaining
              </p>
            </div>
          </div>

          {/* Messages */}
          {successMessage && (
            <div className="mb-6 p-4 bg-green-900/30 border border-green-600 rounded-lg text-green-400 flex items-center justify-between">
              <span>{successMessage}</span>
              <button onClick={() => setSuccessMessage('')}>
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          
          {errorMessage && (
            <div className="mb-6 p-4 bg-red-900/30 border border-red-600 rounded-lg text-red-400 flex items-center justify-between">
              <span>{errorMessage}</span>
              <button onClick={() => setErrorMessage('')}>
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Search */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search members by name, email, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>

          {/* Members List */}
          <div className="bg-gray-800 rounded-lg border border-gray-700">
            <div className="p-4 border-b border-gray-700">
              <h2 className="text-lg font-semibold">Available Members ({filteredCustomers.length})</h2>
            </div>
            <div className="divide-y divide-gray-700 max-h-[600px] overflow-y-auto">
              {filteredCustomers.map((customer) => (
                <div key={customer.id} className="p-4 hover:bg-gray-700/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-white">{customer.name}</p>
                      <p className="text-sm text-gray-400">{customer.email}</p>
                      {customer.phone && (
                        <p className="text-sm text-gray-400">{customer.phone}</p>
                      )}
                    </div>
                    <button
                      onClick={() => addMemberToSession(customer.id)}
                      disabled={adding || spotsLeft === 0}
                      className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                        spotsLeft === 0
                          ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                          : 'bg-orange-500 hover:bg-orange-600 text-white'
                      }`}
                    >
                      <UserPlus className="w-4 h-4" />
                      {adding ? 'Adding...' : 'Add to Session'}
                    </button>
                  </div>
                </div>
              ))}
              
              {filteredCustomers.length === 0 && (
                <div className="p-8 text-center text-gray-400">
                  {searchTerm 
                    ? 'No members found matching your search' 
                    : customers.length === 0 
                      ? 'All members are already booked for this session' 
                      : 'No members available'
                  }
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}