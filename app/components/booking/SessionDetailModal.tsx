'use client';

import React, { useState, useEffect } from 'react';
import { X, Calendar, MapPin, User, Users, Clock, Edit2, MoreVertical, UserPlus, Download, Mail, ChevronLeft, ChevronRight } from 'lucide-react';
import { createClient } from '@/app/lib/supabase/client';
import { createAdminClient } from '@/app/lib/supabase/admin';
import RegistrationOptionsModal from './RegistrationOptionsModal';

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
  const [showOptionsMenu, setShowOptionsMenu] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  
  useEffect(() => {
    if (session) {
      fetchAttendees();
    }
  }, [session]);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showOptionsMenu && !(event.target as Element).closest('.attendee-options-menu')) {
        setShowOptionsMenu(null);
      }
    };
    
    if (showOptionsMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showOptionsMenu]);
  
  const fetchAttendees = async () => {
    try {
      setLoading(true);
      console.log('Fetching attendees for session:', session.id);
      
      // Use API endpoint to fetch attendees
      const response = await fetch(`/api/booking/attendees?sessionId=${session.id}`);
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch attendees');
      }
      
      // Transform attendees to the format expected by the component
      const attendeesList = (result.attendees || []).map((attendee: any) => ({
        id: attendee.clientId || attendee.id,
        name: attendee.name,
        email: attendee.email,
        status: attendee.status || 'registered',
        membershipType: attendee.membershipType || 'No Membership'
      }));
      
      setAttendees(attendeesList);
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
      
      // Search in leads table (single source of truth for all customers)
      console.log('Searching in leads table for:', query);
      let { data: leadsData, error: leadsError } = await supabase
        .from('leads')
        .select('id, email, name, status')
        .or(`name.ilike.%${query}%,email.ilike.%${query}%`)
        .limit(10);
      
      let data = [];
      
      if (!leadsError && leadsData && leadsData.length > 0) {
        console.log('Found customers:', leadsData);
        // Filter to show converted/clients first
        const sortedLeads = leadsData.sort((a, b) => {
          if (a.status === 'converted' && b.status !== 'converted') return -1;
          if (b.status === 'converted' && a.status !== 'converted') return 1;
          return 0;
        });
        
        data = sortedLeads.map(lead => ({
          id: lead.id,
          first_name: lead.name?.split(' ')[0] || '',
          last_name: lead.name?.split(' ').slice(1).join(' ') || '',
          email: lead.email,
          name: lead.name || '',
          status: lead.status
        }));
        
        console.log('Mapped search results:', data);
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
  
  const openRegistrationModal = (customer: any) => {
    setSelectedCustomer(customer);
    setShowRegistrationModal(true);
    // Clear search
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleCustomerRegistration = async (customer: any, registrationType: 'membership' | 'drop-in' | 'free', membershipId?: string) => {
    try {
      console.log('Registering customer:', { customer, session, registrationType, membershipId });
      
      // Use API endpoint to register customer
      const response = await fetch('/api/booking/add-customer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          classSessionId: session.id,
          customerId: customer.id,
          clientId: customer.id, // Send both in case either works
          registrationType,
          membershipId
        }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to register customer');
      }
      
      // Refresh attendees list
      fetchAttendees();
      
      // Show success message
      console.log('Customer registered successfully');
    } catch (error: any) {
      console.error('Error registering customer:', error);
      alert(`Failed to register customer: ${error.message || 'Unknown error'}`);
      throw error; // Re-throw to let the modal handle it
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
  
  const removeAttendee = async (attendeeId: string) => {
    if (!confirm('Are you sure you want to remove this attendee from the session?')) {
      return;
    }
    
    try {
      // Use API endpoint to remove attendee
      const response = await fetch('/api/booking/remove-attendee', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          classSessionId: session.id,
          customerId: attendeeId
        }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to remove attendee');
      }
      
      // Remove from local state
      setAttendees(prev => prev.filter(a => a.id !== attendeeId));
      
      // Close options menu
      setShowOptionsMenu(null);
      
      // Show success message
      console.log('Attendee removed successfully');
    } catch (error: any) {
      console.error('Error removing attendee:', error);
      alert(`Failed to remove attendee: ${error.message || 'Unknown error'}`);
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
                  onClick={() => setShowOptionsMenu(showOptionsMenu ? null : 'main')}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"
                >
                  Options
                  <MoreVertical className="w-4 h-4" />
                </button>
                
                {showOptionsMenu === 'main' && (
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
                    onClick={() => openRegistrationModal(customer)}
                    className="w-full text-left px-4 py-2 hover:bg-gray-100 border-b border-gray-100 last:border-0"
                  >
                    <div className="font-medium text-sm text-gray-900">
                      {customer.name || `${customer.first_name || ''} ${customer.last_name || ''}`.trim()}
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
                      <div className="relative attendee-options-menu">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowOptionsMenu(showOptionsMenu === attendee.id ? null : attendee.id);
                          }}
                          className="p-2 hover:bg-gray-200 rounded"
                        >
                          <MoreVertical className="w-4 h-4 text-gray-600" />
                        </button>
                        
                        {/* Dropdown Menu */}
                        {showOptionsMenu === attendee.id && (
                          <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-20 py-1 min-w-[160px]">
                            <button
                              onClick={() => removeAttendee(attendee.id)}
                              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                            >
                              <X className="w-4 h-4" />
                              Remove from session
                            </button>
                          </div>
                        )}
                      </div>
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
      
      {/* Registration Options Modal */}
      {selectedCustomer && (
        <RegistrationOptionsModal
          isOpen={showRegistrationModal}
          onClose={() => {
            setShowRegistrationModal(false);
            setSelectedCustomer(null);
          }}
          customer={selectedCustomer}
          session={session}
          onRegister={handleCustomerRegistration}
        />
      )}
    </div>
  );
}