"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  PhoneIcon,
  MagnifyingGlassIcon,
  CalendarIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  UserIcon,
} from "@heroicons/react/24/outline";

interface Booking {
  id: string;
  leadName: string;
  leadEmail: string;
  leadPhone: string;
  organizationName: string;
  scheduledAt: string;
  duration: number;
  callType: string;
  status: string;
  outcome: string | null;
  notes: string | null;
  staffMember: string | null;
}

export default function BookingsPage() {
  const searchParams = useSearchParams();
  const orgFilter = searchParams?.get("org");

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<'all' | 'upcoming' | 'completed' | 'no_show' | 'cancelled'>('upcoming');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  useEffect(() => {
    fetchBookings();
  }, [orgFilter, statusFilter]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (orgFilter) params.set('org', orgFilter);
      if (statusFilter !== 'all') params.set('status', statusFilter);

      const response = await fetch(`/api/saas-admin/lead-bots/bookings?${params}`);
      if (!response.ok) throw new Error("Failed to fetch bookings");

      const data = await response.json();
      setBookings(data.bookings);
    } catch (error) {
      console.error("Error fetching bookings:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateBookingStatus = async (bookingId: string, status: string, outcome?: string) => {
    try {
      const response = await fetch(`/api/saas-admin/lead-bots/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, outcome }),
      });

      if (!response.ok) throw new Error("Failed to update booking");

      // Refresh bookings
      await fetchBookings();
      setSelectedBooking(null);
      alert(`Booking ${status} successfully`);
    } catch (error) {
      console.error("Error updating booking:", error);
      alert("Failed to update booking");
    }
  };

  const filteredBookings = bookings.filter(booking => {
    const matchesSearch =
      booking.leadName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.leadEmail?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.organizationName.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesSearch;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
      case 'confirmed':
        return 'bg-blue-900 text-blue-200';
      case 'completed':
        return 'bg-green-900 text-green-200';
      case 'no_show':
        return 'bg-yellow-900 text-yellow-200';
      case 'cancelled':
        return 'bg-red-900 text-red-200';
      default:
        return 'bg-gray-700 text-gray-300';
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Call Bookings</h1>
        <p className="mt-2 text-gray-400">
          Manage discovery calls and sales appointments booked by AI agents
        </p>
      </div>

      {/* Filters */}
      <div className="bg-gray-800 rounded-lg p-4 mb-6 border border-gray-700">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by lead name, email, or organization..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          {/* Status Filter */}
          <div className="flex gap-2">
            <button
              onClick={() => setStatusFilter('upcoming')}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${
                statusFilter === 'upcoming'
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Upcoming
            </button>
            <button
              onClick={() => setStatusFilter('completed')}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${
                statusFilter === 'completed'
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Completed
            </button>
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${
                statusFilter === 'all'
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              All
            </button>
          </div>
        </div>
      </div>

      {/* Bookings List */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            <p className="mt-4 text-gray-400">Loading bookings...</p>
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="p-12 text-center">
            <PhoneIcon className="h-16 w-16 mx-auto mb-4 text-gray-600" />
            <p className="text-gray-400">No bookings found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-700">
              <thead className="bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Lead
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Organization
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Scheduled
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-gray-800 divide-y divide-gray-700">
                {filteredBookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-gray-750">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <UserIcon className="h-5 w-5 text-gray-400 mr-2" />
                        <div>
                          <div className="text-sm font-medium text-white">{booking.leadName}</div>
                          <div className="text-sm text-gray-400">{booking.leadEmail}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {booking.organizationName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-300">
                        <CalendarIcon className="h-4 w-4 mr-2 text-gray-400" />
                        {new Date(booking.scheduledAt).toLocaleString()}
                      </div>
                      <div className="flex items-center text-xs text-gray-500 mt-1">
                        <ClockIcon className="h-3 w-3 mr-1" />
                        {booking.duration} min
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-900 text-purple-200 capitalize">
                        {booking.callType}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(booking.status)} capitalize`}>
                        {booking.status.replace('_', ' ')}
                      </span>
                      {booking.outcome && (
                        <div className="text-xs text-gray-400 mt-1 capitalize">
                          {booking.outcome}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => setSelectedBooking(booking)}
                        className="text-orange-500 hover:text-orange-400 mr-3"
                      >
                        View
                      </button>
                      {booking.status === 'scheduled' || booking.status === 'confirmed' ? (
                        <>
                          <button
                            onClick={() => updateBookingStatus(booking.id, 'completed', 'qualified')}
                            className="text-green-500 hover:text-green-400 mr-3"
                          >
                            Complete
                          </button>
                          <button
                            onClick={() => updateBookingStatus(booking.id, 'no_show')}
                            className="text-yellow-500 hover:text-yellow-400"
                          >
                            No Show
                          </button>
                        </>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Booking Details Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-700">
            <div className="p-6 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold text-white">Booking Details</h3>
                <button
                  onClick={() => setSelectedBooking(null)}
                  className="text-gray-400 hover:text-white"
                >
                  <XCircleIcon className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Lead Info */}
              <div>
                <h4 className="text-lg font-semibold text-white mb-3">Lead Information</h4>
                <div className="bg-gray-700 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Name:</span>
                    <span className="text-white font-medium">{selectedBooking.leadName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Email:</span>
                    <span className="text-white">{selectedBooking.leadEmail}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Phone:</span>
                    <span className="text-white">{selectedBooking.leadPhone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Organization:</span>
                    <span className="text-white">{selectedBooking.organizationName}</span>
                  </div>
                </div>
              </div>

              {/* Booking Info */}
              <div>
                <h4 className="text-lg font-semibold text-white mb-3">Booking Information</h4>
                <div className="bg-gray-700 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Scheduled:</span>
                    <span className="text-white">{new Date(selectedBooking.scheduledAt).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Duration:</span>
                    <span className="text-white">{selectedBooking.duration} minutes</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Type:</span>
                    <span className="text-white capitalize">{selectedBooking.callType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Status:</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedBooking.status)} capitalize`}>
                      {selectedBooking.status.replace('_', ' ')}
                    </span>
                  </div>
                  {selectedBooking.outcome && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Outcome:</span>
                      <span className="text-white capitalize">{selectedBooking.outcome}</span>
                    </div>
                  )}
                  {selectedBooking.staffMember && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Staff Member:</span>
                      <span className="text-white">{selectedBooking.staffMember}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Notes */}
              {selectedBooking.notes && (
                <div>
                  <h4 className="text-lg font-semibold text-white mb-3">Notes</h4>
                  <div className="bg-gray-700 rounded-lg p-4">
                    <p className="text-white whitespace-pre-wrap">{selectedBooking.notes}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
