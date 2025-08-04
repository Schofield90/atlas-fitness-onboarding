'use client';

import React, { useState, useEffect } from 'react';
import { X, Calendar, MapPin, User, Users, Clock, Edit2, MoreVertical, UserPlus, Download, Mail, ChevronLeft, ChevronRight } from 'lucide-react';
import { createClient } from '@/app/lib/supabase/client';
import { createAdminClient } from '@/app/lib/supabase/admin';

interface Attendee {
  id: string;
  name: string;
  email: string;
  status: 'attended' | 'registered' | 'no-show' | 'cancelled';
  membershipType?: string;
  profileImage?: string;
}

interface SessionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: any;
  onUpdate?: () => void;
}

export default function SessionDetailModal({ isOpen, onClose, session, onUpdate }: SessionDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'attendees' | 'activity'>('attendees');
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  
  useEffect(() => {
    if (session) {
      fetchAttendees();
    }
  }, [session]);
  
  const fetchAttendees = async () => {
    try {
      setLoading(true);
      let supabase;
      try {
        supabase = await createAdminClient();
      } catch {
        supabase = createClient();
      }
      
      console.log('Fetching attendees for session:', session.id);
      
      // First try with customers table
      let { data: bookings, error } = await supabase
        .from('bookings')
        .select(`
          *,
          customer:customers(
            id,
            first_name,
            last_name,
            email
          )
        `)
        .eq('class_session_id', session.id)
        .order('created_at');
      
      if (error) {
        console.log('Customers table not found, trying clients');
        // If customers table doesn't exist, try with clients
        let supabaseForClients;
        try {
          supabaseForClients = await createAdminClient();
        } catch {
          supabaseForClients = createClient();
        }
        const { data: bookingsWithClients, error: clientError } = await supabaseForClients
          .from('bookings')
          .select(`
            *,
            client:clients(
              id,
              name,
              email
            )
          `)
          .eq('class_session_id', session.id)
          .order('created_at');
        
        if (clientError) {
          console.error('Error fetching bookings:', clientError);
          throw clientError;
        }
        
        // Transform bookings with clients to attendees format
        const attendeesList = (bookingsWithClients || []).map(booking => ({
          id: booking.client?.id || booking.client_id,
          name: booking.client?.name || 'Unknown',
          email: booking.client?.email || '',
          status: booking.status || 'registered',
          membershipType: '12 Month Programme' // TODO: Get from actual membership
        }));
        
        setAttendees(attendeesList);
      } else {
        // Transform bookings with customers to attendees format
        const attendeesList = (bookings || []).map(booking => ({
          id: booking.customer?.id || booking.customer_id,
          name: booking.customer ? `${booking.customer.first_name} ${booking.customer.last_name}` : 'Unknown',
          email: booking.customer?.email || '',
          status: booking.status || 'registered',
          membershipType: '12 Month Programme' // TODO: Get from actual membership
        }));
        
        setAttendees(attendeesList);
      }
    } catch (error) {
      console.error('Error fetching attendees:', error);
      setAttendees([]);
    } finally {
      setLoading(false);
    }
  };
  
  const searchCustomers = async (query: string) => {
    if (!query || query.length < 2) {
      setSearchResults([]);
      return;
    }
    
    try {
      setSearching(true);
      const supabase = createClient();
      
      console.log('Searching for customers with query:', query);
      
      // First try the customers table
      let { data, error } = await supabase
        .from('customers')
        .select('id, first_name, last_name, email')
        .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%`)
        .limit(10);
      
      if (error) {
        console.log('Customers table not found, trying clients table');
        // If customers table doesn't exist, try clients table
        const { data: clientsData, error: clientsError } = await supabase
          .from('clients')
          .select('id, name, email')
          .or(`name.ilike.%${query}%,email.ilike.%${query}%`)
          .limit(10);
        
        if (clientsError) throw clientsError;
        
        // Transform clients data to match customers format
        data = (clientsData || []).map(client => ({
          id: client.id,
          first_name: client.name?.split(' ')[0] || '',
          last_name: client.name?.split(' ').slice(1).join(' ') || '',
          email: client.email
        }));
      }
      
      console.log('Search results:', data);
      setSearchResults(data || []);
    } catch (error) {
      console.error('Error searching customers:', error);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };
  
  const addCustomerToSession = async (customer: any) => {
    try {
      console.log('Adding customer to session:', { customer, session });
      
      // Use API endpoint to bypass RLS issues
      const response = await fetch('/api/booking/add-customer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          classSessionId: session.id,
          customerId: customer.id,
          clientId: customer.id // Send both in case either works
        }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to add customer');
      }
      
      // Refresh attendees list
      fetchAttendees();
      
      // Clear search
      setSearchQuery('');
      setSearchResults([]);
      
      // Show success message
      console.log('Customer added successfully');
    } catch (error: any) {
      console.error('Error adding customer to session:', error);
      alert(`Failed to add customer to session: ${error.message || 'Unknown error'}`);
    }
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'attended': return 'bg-green-600';
      case 'registered': return 'bg-blue-600';
      case 'no-show': return 'bg-red-600';
      case 'cancelled': return 'bg-gray-600';
      default: return 'bg-gray-600';
    }
  };
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'attended': return '✓';
      case 'no-show': return '✗';
      case 'registered': return '•';
      case 'cancelled': return '—';
      default: return '•';
    }
  };
  
  const updateAttendeeStatus = async (attendeeId: string, newStatus: string) => {
    try {
      let supabase;
      try {
        supabase = await createAdminClient();
      } catch {
        supabase = createClient();
      }
      
      // Update booking status
      const { error } = await supabase
        .from('bookings')
        .update({ status: newStatus })
        .eq('customer_id', attendeeId)
        .eq('class_session_id', session.id);
      
      if (error) throw error;
      
      // Update local state
      setAttendees(prev => prev.map(a => 
        a.id === attendeeId ? { ...a, status: newStatus as any } : a
      ));
    } catch (error) {
      console.error('Error updating attendee status:', error);
      alert('Failed to update status');
    }
  };
  
  if (!isOpen || !session) return null;
  
  const startTime = new Date(session.startTime);
  const endTime = new Date(startTime.getTime() + session.duration * 60000);
  
  console.log('SessionDetailModal render - isOpen:', isOpen, 'session:', session);
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[9999] flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
              <div>
                <nav className="flex items-center text-sm text-gray-500">
                  <a href="#" className="hover:text-blue-600">Calendar</a>
                  <span className="mx-2">/</span>
                  <span className="text-gray-900">{session.title}</span>
                </nav>
                <h2 className="text-xl font-semibold text-gray-900 mt-1">{session.title}</h2>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button className="p-2 hover:bg-gray-200 rounded">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-sm text-gray-600">Jump to</span>
              <button className="p-2 hover:bg-gray-200 rounded">
                <ChevronRight className="w-5 h-5" />
              </button>
              
              <div className="relative ml-4">
                <button 
                  onClick={() => setShowOptionsMenu(!showOptionsMenu)}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"
                >
                  Options
                  <MoreVertical className="w-4 h-4" />
                </button>
                
                {showOptionsMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                    <button className="w-full text-left px-4 py-2 hover:bg-gray-100">Edit Session</button>
                    <button className="w-full text-left px-4 py-2 hover:bg-gray-100">Duplicate</button>
                    <button className="w-full text-left px-4 py-2 hover:bg-gray-100">Cancel Session</button>
                    <button className="w-full text-left px-4 py-2 hover:bg-gray-100 text-red-600">Delete</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Session Info */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span className="text-gray-900">
                {startTime.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-400" />
              <span className="text-gray-900">
                {startTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} - 
                {endTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-gray-400" />
              <span className="text-gray-900">{session.room || 'Harrogate'}</span>
            </div>
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-gray-400" />
              <span className="text-gray-900">{session.instructor}</span>
            </div>
          </div>
          
          <div className="mt-3 flex flex-wrap gap-2 text-sm">
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4 text-gray-400" />
              <span className="text-gray-900">{attendees.length} / {session.capacity}</span>
              <Edit2 className="w-3 h-3 text-gray-400 cursor-pointer hover:text-gray-600" />
            </div>
            <span className="text-gray-400">•</span>
            <span className="text-gray-600">Visible to: everyone</span>
            <span className="text-gray-400">•</span>
            <span className="text-gray-600">Registrations closed</span>
            <span className="text-gray-400">•</span>
            <span className="text-gray-600">58 Memberships • Drop-ins not allowed</span>
          </div>
          
          <button className="mt-3 text-blue-600 text-sm hover:text-blue-700 flex items-center gap-1">
            <Edit2 className="w-3 h-3" />
            Add a note
          </button>
        </div>
        
        {/* Stats */}
        <div className="px-6 py-4 bg-white border-b border-gray-200">
          <div className="grid grid-cols-5 gap-4 text-center">
            <div>
              <div className="text-2xl font-semibold text-gray-900">{attendees.filter(a => a.status === 'registered').length}</div>
              <div className="text-sm text-gray-600">Registered</div>
            </div>
            <div>
              <div className="text-2xl font-semibold text-gray-900">{attendees.filter(a => a.status === 'attended').length}/{attendees.length}</div>
              <div className="text-sm text-gray-600">Attended</div>
            </div>
            <div>
              <div className="text-2xl font-semibold text-gray-900">{attendees.filter(a => a.status === 'no-show').length}/{attendees.length}</div>
              <div className="text-sm text-gray-600">No-Shows</div>
            </div>
            <div>
              <div className="text-2xl font-semibold text-gray-900">0</div>
              <div className="text-sm text-gray-600">Late Cancels</div>
            </div>
            <div>
              <div className="text-2xl font-semibold text-gray-900">0</div>
              <div className="text-sm text-gray-600">On Waitlist</div>
            </div>
          </div>
        </div>
        
        {/* Add Customer */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <h3 className="text-sm font-medium text-gray-900 mb-3">Add a customer</h3>
          <div className="relative">
            <div className="flex gap-2">
              <input 
                type="text"
                placeholder="Find an existing customer (type at least 2 characters)"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 placeholder-gray-400"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  searchCustomers(e.target.value);
                }}
              />
              <button className="px-4 py-2 bg-green-600 text-white rounded-md text-sm hover:bg-green-700 flex items-center gap-2">
                <UserPlus className="w-4 h-4" />
                Create new customer
              </button>
            </div>
            
            {/* Search Results Dropdown */}
            {searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg z-10 max-h-60 overflow-y-auto">
                {searchResults.map((customer) => (
                  <button
                    key={customer.id}
                    onClick={() => addCustomerToSession(customer)}
                    className="w-full text-left px-4 py-2 hover:bg-gray-100 border-b border-gray-100 last:border-0"
                  >
                    <div className="font-medium text-sm text-gray-900">
                      {customer.first_name} {customer.last_name}
                    </div>
                    <div className="text-xs text-gray-500">{customer.email}</div>
                  </button>
                ))}
              </div>
            )}
            
            {searching && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg z-10 p-4 text-center text-sm text-gray-500">
                Searching...
              </div>
            )}
          </div>
        </div>
        
        {/* Tabs */}
        <div className="border-b border-gray-200">
          <div className="flex">
            <button
              onClick={() => setActiveTab('attendees')}
              className={`px-6 py-3 text-sm font-medium border-b-2 ${
                activeTab === 'attendees' 
                  ? 'text-blue-600 border-blue-600' 
                  : 'text-gray-500 border-transparent hover:text-gray-700'
              }`}
            >
              Attendees
            </button>
            <button
              onClick={() => setActiveTab('activity')}
              className={`px-6 py-3 text-sm font-medium border-b-2 ${
                activeTab === 'activity' 
                  ? 'text-blue-600 border-blue-600' 
                  : 'text-gray-500 border-transparent hover:text-gray-700'
              }`}
            >
              Activity Feed
            </button>
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto max-h-96 bg-white">
          {activeTab === 'attendees' && (
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <span className="text-sm text-gray-600">Sort by</span>
                <div className="flex gap-2">
                  <button className="p-2 hover:bg-gray-100 rounded">
                    <Mail className="w-4 h-4 text-gray-600" />
                  </button>
                  <button className="p-2 hover:bg-gray-100 rounded">
                    <Download className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
              </div>
              
              <div className="space-y-3">
                {attendees.map((attendee) => (
                  <div key={attendee.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center text-white font-medium">
                        {attendee.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{attendee.name}</div>
                        <div className="text-sm text-gray-600">
                          {attendee.membershipType} 
                          {attendee.status === 'registered' && ' (via a reservation)'}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <select
                          value={attendee.status}
                          onChange={(e) => updateAttendeeStatus(attendee.id, e.target.value)}
                          className={`w-24 px-3 py-2 rounded text-white font-bold text-sm cursor-pointer ${getStatusColor(attendee.status)}`}
                        >
                          <option value="registered">Registered</option>
                          <option value="attended">Attended</option>
                          <option value="no-show">No Show</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </div>
                      <button className="p-2 hover:bg-gray-200 rounded">
                        <MoreVertical className="w-4 h-4 text-gray-600" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {activeTab === 'activity' && (
            <div className="p-6">
              <p className="text-gray-500">No activity yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}