'use client';

import React, { useState, useEffect } from 'react';
import moment from 'moment';
import { Calendar, Clock, MapPin, User, AlertCircle } from 'lucide-react';

interface CustomerBookingsProps {
  customerId: string;
}

interface Booking {
  id: string;
  booking_status: string;
  created_at: string;
  class_name?: string;
  start_time: string;
  end_time: string;
  room_location?: string;
  program_name?: string;
  trainer_name?: string;
}

const CustomerBookings: React.FC<CustomerBookingsProps> = ({ customerId }) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBookings();
  }, [customerId]);

  const fetchBookings = async () => {
    try {
      const response = await fetch(`/api/booking/customer/${customerId}/bookings`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch bookings');
      }
      
      const bookingData = await response.json();
      setBookings(bookingData);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    if (!confirm('Are you sure you want to cancel this booking?')) return;
    
    try {
      const response = await fetch(`/api/booking/${bookingId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ reason: 'Customer requested cancellation' })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to cancel booking');
      }
      
      fetchBookings(); // Refresh list
      alert('Booking cancelled successfully');
    } catch (error) {
      console.error('Error cancelling booking:', error);
      alert(error instanceof Error ? error.message : 'Failed to cancel booking');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'attended': return 'bg-blue-100 text-blue-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'no_show': return 'bg-orange-100 text-orange-800';
      case 'waitlist': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) return <div className="flex justify-center items-center h-96">Loading bookings...</div>;

  const upcomingBookings = bookings.filter(
    b => moment(b.start_time).isAfter(moment()) && b.booking_status === 'confirmed'
  );
  const pastBookings = bookings.filter(
    b => moment(b.start_time).isBefore(moment()) || b.booking_status !== 'confirmed'
  );

  return (
    <div className="customer-bookings">
      <h3 className="text-2xl font-bold mb-6">My Bookings</h3>
      
      {bookings.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No bookings found. Book your first class!</p>
        </div>
      ) : (
        <div className="space-y-6">
          {upcomingBookings.length > 0 && (
            <div>
              <h4 className="text-lg font-semibold mb-4">Upcoming Classes</h4>
              <div className="space-y-4">
                {upcomingBookings.map(booking => (
                  <BookingCard 
                    key={booking.id} 
                    booking={booking} 
                    onCancel={handleCancelBooking}
                    showCancelButton={true}
                  />
                ))}
              </div>
            </div>
          )}
          
          {pastBookings.length > 0 && (
            <div>
              <h4 className="text-lg font-semibold mb-4">Past Classes</h4>
              <div className="space-y-4">
                {pastBookings.map(booking => (
                  <BookingCard 
                    key={booking.id} 
                    booking={booking} 
                    onCancel={handleCancelBooking}
                    showCancelButton={false}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface BookingCardProps {
  booking: Booking;
  onCancel: (bookingId: string) => void;
  showCancelButton: boolean;
}

const BookingCard: React.FC<BookingCardProps> = ({ booking, onCancel, showCancelButton }) => {
  const canCancel = showCancelButton && 
    moment(booking.start_time).diff(moment(), 'hours') > 24 &&
    booking.booking_status === 'confirmed';

  return (
    <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <h5 className="font-semibold text-lg">{booking.program_name}</h5>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(booking.booking_status)}`}>
          {booking.booking_status.replace('_', ' ')}
        </span>
      </div>
      
      <div className="space-y-2 text-sm text-gray-600">
        <div className="flex items-center gap-2">
          <Calendar size={16} />
          <span>{moment(booking.start_time).format('dddd, MMMM Do YYYY')}</span>
        </div>
        
        <div className="flex items-center gap-2">
          <Clock size={16} />
          <span>{moment(booking.start_time).format('h:mm A')} - {moment(booking.end_time).format('h:mm A')}</span>
        </div>
        
        {booking.trainer_name && (
          <div className="flex items-center gap-2">
            <User size={16} />
            <span>{booking.trainer_name}</span>
          </div>
        )}
        
        {booking.room_location && (
          <div className="flex items-center gap-2">
            <MapPin size={16} />
            <span>{booking.room_location}</span>
          </div>
        )}
      </div>
      
      <div className="mt-4 flex justify-between items-center">
        {canCancel ? (
          <button 
            onClick={() => onCancel(booking.id)}
            className="text-red-600 hover:text-red-800 text-sm font-medium"
          >
            Cancel Booking
          </button>
        ) : (
          <div />
        )}
        
        {booking.booking_status === 'confirmed' && 
         moment(booking.start_time).diff(moment(), 'hours') <= 24 && 
         moment(booking.start_time).isAfter(moment()) && (
          <p className="text-xs text-gray-500 flex items-center gap-1">
            <AlertCircle size={12} />
            Cannot cancel within 24 hours
          </p>
        )}
      </div>
    </div>
  );
};

function getStatusColor(status: string): string {
  switch (status) {
    case 'confirmed': return 'bg-green-100 text-green-800';
    case 'attended': return 'bg-blue-100 text-blue-800';
    case 'cancelled': return 'bg-red-100 text-red-800';
    case 'no_show': return 'bg-orange-100 text-orange-800';
    case 'waitlist': return 'bg-purple-100 text-purple-800';
    default: return 'bg-gray-100 text-gray-800';
  }
}

export default CustomerBookings;