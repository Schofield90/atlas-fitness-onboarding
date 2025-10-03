'use client';

import React, { useState, useEffect } from 'react';
import { Clock, Users, Phone, Mail, ArrowUp, ArrowDown, X, Check, UserPlus } from 'lucide-react';

interface WaitlistEntry {
  id: string;
  customer_id: string;
  position: number;
  added_at: string;
  status: 'waiting' | 'promoted' | 'expired' | 'cancelled';
  customer: {
    name: string;
    email: string;
    phone: string;
  };
}

interface WaitlistManagerProps {
  classSessionId: string;
  organizationId: string;
  onWaitlistChange?: () => void;
}

interface AddToWaitlistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (customerId: string) => void;
  availableCustomers: any[];
}

function AddToWaitlistModal({ isOpen, onClose, onAdd, availableCustomers }: AddToWaitlistModalProps) {
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen) return null;

  const filteredCustomers = availableCustomers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAdd = () => {
    if (selectedCustomerId) {
      onAdd(selectedCustomerId);
      setSelectedCustomerId('');
      setSearchTerm('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h3 className="text-lg font-semibold text-white">Add to Waitlist</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-700 rounded"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Search Customer
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div className="max-h-64 overflow-y-auto space-y-2">
            {filteredCustomers.map((customer) => (
              <label
                key={customer.id}
                className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedCustomerId === customer.id
                    ? 'border-orange-500 bg-orange-500/10'
                    : 'border-gray-600 hover:border-gray-500'
                }`}
              >
                <input
                  type="radio"
                  name="customer"
                  value={customer.id}
                  checked={selectedCustomerId === customer.id}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="mr-3 text-orange-500 focus:ring-orange-500"
                />
                <div>
                  <div className="text-white font-medium">{customer.name}</div>
                  <div className="text-gray-400 text-sm">{customer.email}</div>
                </div>
              </label>
            ))}
          </div>

          {filteredCustomers.length === 0 && (
            <div className="text-center text-gray-400 py-8">
              No customers found
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 p-4 border-t border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleAdd}
            disabled={!selectedCustomerId}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Add to Waitlist
          </button>
        </div>
      </div>
    </div>
  );
}

export default function WaitlistManager({ classSessionId, organizationId, onWaitlistChange }: WaitlistManagerProps) {
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [availableCustomers, setAvailableCustomers] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    loadWaitlist();
    loadAvailableCustomers();
  }, [classSessionId]);

  const loadWaitlist = async () => {
    try {
      const response = await fetch(`/api/classes/waitlist?classSessionId=${classSessionId}`);
      const data = await response.json();

      if (response.ok) {
        setWaitlist(data.waitlist || []);
      } else {
        console.error('Failed to load waitlist:', data.error);
      }
    } catch (error) {
      console.error('Error loading waitlist:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableCustomers = async () => {
    try {
      const response = await fetch('/api/customers');
      const data = await response.json();

      if (response.ok) {
        // Filter out customers already on waitlist or booked
        const waitlistCustomerIds = waitlist.map(w => w.customer_id);
        const availableCustomers = (data.customers || []).filter(
          (customer: any) => !waitlistCustomerIds.includes(customer.id)
        );
        setAvailableCustomers(availableCustomers);
      }
    } catch (error) {
      console.error('Error loading customers:', error);
    }
  };

  const addToWaitlist = async (customerId: string) => {
    try {
      const response = await fetch('/api/classes/waitlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          classSessionId,
          customerId,
          autoBook: true
        }),
      });

      const data = await response.json();

      if (response.ok) {
        await loadWaitlist();
        await loadAvailableCustomers();
        onWaitlistChange?.();
      } else {
        alert('Failed to add to waitlist: ' + data.error);
      }
    } catch (error) {
      console.error('Error adding to waitlist:', error);
      alert('Failed to add to waitlist');
    }
  };

  const promoteFromWaitlist = async (waitlistId: string) => {
    try {
      const response = await fetch('/api/classes/waitlist', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          waitlistId,
          action: 'promote'
        }),
      });

      const data = await response.json();

      if (response.ok) {
        await loadWaitlist();
        onWaitlistChange?.();
        alert('Customer promoted to booking successfully!');
      } else {
        alert('Failed to promote customer: ' + data.error);
      }
    } catch (error) {
      console.error('Error promoting customer:', error);
      alert('Failed to promote customer');
    }
  };

  const removeFromWaitlist = async (waitlistId: string) => {
    if (!confirm('Are you sure you want to remove this customer from the waitlist?')) {
      return;
    }

    try {
      const response = await fetch(`/api/classes/waitlist?waitlistId=${waitlistId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok) {
        await loadWaitlist();
        await loadAvailableCustomers();
        onWaitlistChange?.();
      } else {
        alert('Failed to remove from waitlist: ' + data.error);
      }
    } catch (error) {
      console.error('Error removing from waitlist:', error);
      alert('Failed to remove from waitlist');
    }
  };

  const movePosition = async (waitlistId: string, direction: 'up' | 'down') => {
    const currentEntry = waitlist.find(w => w.id === waitlistId);
    if (!currentEntry) return;

    const newPosition = direction === 'up' 
      ? Math.max(1, currentEntry.position - 1)
      : Math.min(waitlist.length, currentEntry.position + 1);

    if (newPosition === currentEntry.position) return;

    try {
      // Create new positions array
      const newPositions = waitlist.map(entry => {
        if (entry.id === waitlistId) {
          return { id: entry.id, position: newPosition };
        } else if (direction === 'up' && entry.position === newPosition) {
          return { id: entry.id, position: entry.position + 1 };
        } else if (direction === 'down' && entry.position === newPosition) {
          return { id: entry.id, position: entry.position - 1 };
        }
        return { id: entry.id, position: entry.position };
      });

      const response = await fetch('/api/classes/waitlist', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'reorder',
          positions: newPositions
        }),
      });

      if (response.ok) {
        await loadWaitlist();
      } else {
        const data = await response.json();
        alert('Failed to reorder waitlist: ' + data.error);
      }
    } catch (error) {
      console.error('Error reordering waitlist:', error);
      alert('Failed to reorder waitlist');
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-orange-400" />
          <h3 className="text-lg font-semibold text-white">Waitlist</h3>
          <span className="bg-gray-700 text-gray-300 px-2 py-1 rounded text-sm">
            {waitlist.length} waiting
          </span>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          Add Customer
        </button>
      </div>

      {waitlist.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No customers on waitlist</p>
          <p className="text-sm mt-1">Add customers who want to join when spots become available</p>
        </div>
      ) : (
        <div className="space-y-3">
          {waitlist.map((entry, index) => (
            <div
              key={entry.id}
              className="flex items-center justify-between p-4 bg-gray-700 rounded-lg border border-gray-600"
            >
              <div className="flex items-center gap-4">
                <div className="flex flex-col items-center gap-1">
                  <span className="text-orange-400 font-semibold text-lg">#{entry.position}</span>
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => movePosition(entry.id, 'up')}
                      disabled={entry.position === 1}
                      className="p-1 hover:bg-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ArrowUp className="w-3 h-3 text-gray-400" />
                    </button>
                    <button
                      onClick={() => movePosition(entry.id, 'down')}
                      disabled={entry.position === waitlist.length}
                      className="p-1 hover:bg-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ArrowDown className="w-3 h-3 text-gray-400" />
                    </button>
                  </div>
                </div>

                <div className="flex-1">
                  <div className="text-white font-medium">{entry.customer.name}</div>
                  <div className="flex items-center gap-4 text-sm text-gray-400">
                    <div className="flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      {entry.customer.email}
                    </div>
                    <div className="flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      {entry.customer.phone}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Added {new Date(entry.added_at).toLocaleDateString('en-GB')} at{' '}
                    {new Date(entry.added_at).toLocaleTimeString('en-GB', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => promoteFromWaitlist(entry.id)}
                  className="flex items-center gap-1 px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                  title="Promote to booking"
                >
                  <Check className="w-4 h-4" />
                  Promote
                </button>
                <button
                  onClick={() => removeFromWaitlist(entry.id)}
                  className="p-2 text-red-400 hover:bg-red-900/20 rounded transition-colors"
                  title="Remove from waitlist"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <AddToWaitlistModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={addToWaitlist}
        availableCustomers={availableCustomers}
      />
    </div>
  );
}