"use client";

import { useState } from 'react';
import moment from 'moment';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar, Clock, MapPin, User, Users, CreditCard, Info } from 'lucide-react';

interface SessionSlot {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  slot_type: 'gym_class' | 'personal_training' | 'coaching_call';
  trainer_name?: string;
  location?: string;
  max_bookings: number;
  current_bookings: number;
  base_cost: number;
  member_cost?: number;
  is_available: boolean;
}

interface ClassBookingModalProps {
  session: SessionSlot;
  isOpen: boolean;
  onClose: () => void;
  onBookingComplete: () => void;
}

export function ClassBookingModal({ 
  session, 
  isOpen, 
  onClose, 
  onBookingComplete 
}: ClassBookingModalProps) {
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const spotsLeft = session.max_bookings - session.current_bookings;
  const isFull = spotsLeft === 0;
  const sessionDate = moment.utc(session.start_time);
  const sessionDuration = moment.utc(session.end_time).diff(moment.utc(session.start_time), 'minutes');

  const handleBooking = async () => {
    setLoading(true);
    setError(null);

    try {
      // Mock API call - replace with actual booking API
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Simulate success
      onBookingComplete();
    } catch (err: any) {
      setError(err.message || 'Failed to book session');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinWaitlist = async () => {
    setLoading(true);
    setError(null);

    try {
      // Mock API call - replace with actual waitlist API
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Simulate success
      onBookingComplete();
    } catch (err: any) {
      setError(err.message || 'Failed to join waitlist');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">{session.title}</DialogTitle>
          <DialogDescription>
            <Badge variant="outline" className="mt-2">
              {session.slot_type.replace('_', ' ')}
            </Badge>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Session Details */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span>{sessionDate.format('dddd, DD MMMM YYYY')}</span>
            </div>
            
            <div className="flex items-center gap-3 text-sm">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span>
                {sessionDate.format('h:mm A')} - {moment.utc(session.end_time).format('h:mm A')}
                ({sessionDuration} minutes)
              </span>
            </div>
            
            {session.trainer_name && (
              <div className="flex items-center gap-3 text-sm">
                <User className="w-4 h-4 text-muted-foreground" />
                <span>{session.trainer_name}</span>
              </div>
            )}
            
            {session.location && (
              <div className="flex items-center gap-3 text-sm">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span>{session.location}</span>
              </div>
            )}
            
            <div className="flex items-center gap-3 text-sm">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span>
                {isFull ? (
                  <span className="text-red-500">Class is full</span>
                ) : (
                  <span>{spotsLeft} of {session.max_bookings} spots available</span>
                )}
              </span>
            </div>
            
            <div className="flex items-center gap-3 text-sm">
              <CreditCard className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">
                £{session.member_cost || session.base_cost}
              </span>
            </div>
          </div>

          {/* Booking Notes */}
          <div className="space-y-2">
            <label htmlFor="notes" className="text-sm font-medium">
              Special requests or notes (optional)
            </label>
            <Textarea
              id="notes"
              placeholder="Any injuries, preferences, or special requirements..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          {/* Cancellation Policy */}
          <Alert>
            <Info className="w-4 h-4" />
            <AlertDescription className="text-sm">
              Free cancellation up to 24 hours before the session. Late cancellations 
              or no-shows will be charged the full session fee.
            </AlertDescription>
          </Alert>

          {/* Error Message */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
            className="flex-1"
          >
            Cancel
          </Button>
          
          {isFull ? (
            <Button
              onClick={handleJoinWaitlist}
              disabled={loading}
              className="flex-1"
            >
              {loading ? 'Joining waitlist...' : 'Join Waitlist'}
            </Button>
          ) : (
            <Button
              onClick={handleBooking}
              disabled={loading}
              className="flex-1"
            >
              {loading ? 'Booking...' : 'Confirm Booking'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}