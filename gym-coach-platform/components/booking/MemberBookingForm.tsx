"use client";

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  Users, 
  CreditCard, 
  Plus,
  Minus,
  Repeat,
  CalendarDays,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import moment from 'moment';

interface Member {
  id: string;
  name: string;
  email: string;
  phone: string;
}

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

interface MemberBookingFormProps {
  member: Member;
  isOpen: boolean;
  onClose: () => void;
  onBookingComplete: () => void;
}

export function MemberBookingForm({ 
  member, 
  isOpen, 
  onClose, 
  onBookingComplete 
}: MemberBookingFormProps) {
  const [bookingType, setBookingType] = useState<'single' | 'multiple' | 'recurring'>('single');
  const [selectedSession, setSelectedSession] = useState<SessionSlot | null>(null);
  const [availableSessions, setAvailableSessions] = useState<SessionSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(false);
  
  // Single session booking
  const [singleDate, setSingleDate] = useState(moment().format('YYYY-MM-DD'));
  
  // Multiple sessions booking
  const [multipleSessions, setMultipleSessions] = useState<{
    sessionId: string;
    date: string;
  }[]>([{ sessionId: '', date: moment().format('YYYY-MM-DD') }]);
  
  // Recurring booking
  const [recurringConfig, setRecurringConfig] = useState({
    sessionId: '',
    startDate: moment().format('YYYY-MM-DD'),
    endDate: moment().add(1, 'month').format('YYYY-MM-DD'),
    frequency: 'weekly' as 'daily' | 'weekly' | 'monthly',
    daysOfWeek: [] as number[], // 0 = Sunday, 1 = Monday, etc.
    occurrences: 4
  });
  
  // Common fields
  const [notes, setNotes] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'paid' | 'comp'>('pending');

  useEffect(() => {
    if (isOpen) {
      loadAvailableSessions();
    }
  }, [isOpen]);

  const loadAvailableSessions = async () => {
    setLoadingSessions(true);
    try {
      const response = await fetch('/api/client/available-slots');
      if (response.ok) {
        const data = await response.json();
        // Transform the API response to match our SessionSlot interface
        const transformedSessions: SessionSlot[] = (data.slots || []).map((slot: any) => ({
          id: slot.id,
          title: slot.title,
          start_time: slot.start_time,
          end_time: slot.end_time,
          slot_type: slot.slot_type,
          trainer_name: slot.trainer?.name || slot.coach?.name,
          location: slot.location,
          max_bookings: slot.max_bookings || 1,
          current_bookings: slot.current_bookings || 0,
          base_cost: slot.base_cost || 0,
          member_cost: slot.member_cost,
          is_available: slot.is_available
        }));
        
        setAvailableSessions(transformedSessions);
      } else {
        throw new Error('Failed to fetch available sessions');
      }
    } catch (error) {
      console.error('Error loading sessions:', error);
      toast.error('Failed to load available sessions');
      
      // Fallback to mock data if API fails
      const mockSessions: SessionSlot[] = [
        {
          id: '1',
          title: 'Morning HIIT',
          start_time: moment().add(1, 'day').hour(9).minute(0).toISOString(),
          end_time: moment().add(1, 'day').hour(9).minute(45).toISOString(),
          slot_type: 'gym_class',
          trainer_name: 'Sarah Johnson',
          location: 'Studio A',
          max_bookings: 8,
          current_bookings: 5,
          base_cost: 15,
          member_cost: 10,
          is_available: true,
        },
        {
          id: '2',
          title: 'Yoga Flow',
          start_time: moment().add(1, 'day').hour(10).minute(30).toISOString(),
          end_time: moment().add(1, 'day').hour(11).minute(30).toISOString(),
          slot_type: 'gym_class',
          trainer_name: 'Emma Wilson',
          location: 'Studio B',
          max_bookings: 8,
          current_bookings: 6,
          base_cost: 12,
          member_cost: 8,
          is_available: true,
        },
        {
          id: '3',
          title: 'Personal Training',
          start_time: moment().add(2, 'days').hour(14).minute(0).toISOString(),
          end_time: moment().add(2, 'days').hour(15).minute(0).toISOString(),
          slot_type: 'personal_training',
          trainer_name: 'Mike Davis',
          location: 'Main Floor',
          max_bookings: 1,
          current_bookings: 0,
          base_cost: 50,
          member_cost: 40,
          is_available: true,
        },
      ];
      setAvailableSessions(mockSessions);
    } finally {
      setLoadingSessions(false);
    }
  };

  const handleSingleBooking = async () => {
    if (!selectedSession) {
      toast.error('Please select a session');
      return;
    }

    setLoading(true);
    try {
      // Create the booking date by combining the selected date with the session time
      const sessionDate = new Date(singleDate);
      const sessionStartTime = new Date(selectedSession.start_time);
      const sessionEndTime = new Date(selectedSession.end_time);
      
      // Set the date but keep the time from the session slot using UTC
      const bookingStartTime = new Date(sessionDate);
      bookingStartTime.setUTCHours(sessionStartTime.getUTCHours(), sessionStartTime.getUTCMinutes(), 0, 0);

      const bookingEndTime = new Date(sessionDate);
      bookingEndTime.setUTCHours(sessionEndTime.getUTCHours(), sessionEndTime.getUTCMinutes(), 0, 0);

      const bookingData = {
        client_id: member.id,
        session_slot_id: selectedSession.id,
        session_start_time: bookingStartTime.toISOString(),
        session_end_time: bookingEndTime.toISOString(),
        cost: selectedSession.member_cost || selectedSession.base_cost,
        payment_status: paymentStatus,
        notes: notes || null
      };

      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bookingData),
      });

      if (response.ok) {
        toast.success(`Successfully booked ${member.name} for ${selectedSession.title}`);
        onBookingComplete();
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create booking');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to create booking');
    } finally {
      setLoading(false);
    }
  };

  const handleMultipleBooking = async () => {
    const validSessions = multipleSessions.filter(s => s.sessionId && s.date);
    if (validSessions.length === 0) {
      toast.error('Please select at least one session');
      return;
    }

    setLoading(true);
    try {
      const bookingData = {
        client_id: member.id,
        sessions: validSessions.map(session => ({
          session_slot_id: session.sessionId,
          date: session.date
        })),
        payment_status: paymentStatus,
        notes: notes || null
      };

      const response = await fetch('/api/bookings/multiple', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bookingData),
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(`Successfully booked ${result.count} sessions for ${member.name}`);
        onBookingComplete();
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create bookings');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to create bookings');
    } finally {
      setLoading(false);
    }
  };

  const handleRecurringBooking = async () => {
    if (!recurringConfig.sessionId || !recurringConfig.startDate) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const selectedSession = getSessionById(recurringConfig.sessionId);
      
      const bookingData = {
        client_id: member.id,
        session_slot_id: recurringConfig.sessionId,
        start_date: recurringConfig.startDate,
        end_date: recurringConfig.endDate,
        frequency: recurringConfig.frequency,
        days_of_week: recurringConfig.daysOfWeek,
        occurrences: recurringConfig.occurrences,
        cost_per_session: selectedSession?.member_cost || selectedSession?.base_cost || 0,
        payment_status: paymentStatus,
        notes: notes || null
      };

      const response = await fetch('/api/bookings/recurring', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bookingData),
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(`Successfully created ${result.count} recurring bookings for ${member.name}`);
        onBookingComplete();
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create recurring booking');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to create recurring booking');
    } finally {
      setLoading(false);
    }
  };

  const addMultipleSession = () => {
    setMultipleSessions([...multipleSessions, { sessionId: '', date: moment().format('YYYY-MM-DD') }]);
  };

  const removeMultipleSession = (index: number) => {
    setMultipleSessions(multipleSessions.filter((_, i) => i !== index));
  };

  const updateMultipleSession = (index: number, field: 'sessionId' | 'date', value: string) => {
    const updated = [...multipleSessions];
    updated[index][field] = value;
    setMultipleSessions(updated);
  };

  const getSessionById = (id: string) => {
    return availableSessions.find(s => s.id === id);
  };

  const calculateTotalCost = () => {
    if (bookingType === 'single' && selectedSession) {
      return selectedSession.member_cost || selectedSession.base_cost;
    }
    
    if (bookingType === 'multiple') {
      return multipleSessions.reduce((total, session) => {
        const sessionData = getSessionById(session.sessionId);
        if (sessionData) {
          return total + (sessionData.member_cost || sessionData.base_cost);
        }
        return total;
      }, 0);
    }
    
    if (bookingType === 'recurring') {
      const sessionData = getSessionById(recurringConfig.sessionId);
      if (sessionData) {
        return (sessionData.member_cost || sessionData.base_cost) * recurringConfig.occurrences;
      }
    }
    
    return 0;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Book Session for {member.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Booking Type Selection */}
          <Tabs value={bookingType} onValueChange={(v) => setBookingType(v as any)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="single">
                <CalendarDays className="w-4 h-4 mr-2" />
                Single Session
              </TabsTrigger>
              <TabsTrigger value="multiple">
                <Plus className="w-4 h-4 mr-2" />
                Multiple Sessions
              </TabsTrigger>
              <TabsTrigger value="recurring">
                <Repeat className="w-4 h-4 mr-2" />
                Recurring Booking
              </TabsTrigger>
            </TabsList>

            {/* Single Session Booking */}
            <TabsContent value="single" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Session</Label>
                  <Select value={selectedSession?.id || ''} onValueChange={(value) => {
                    const session = availableSessions.find(s => s.id === value);
                    setSelectedSession(session || null);
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a session" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableSessions.map((session) => (
                        <SelectItem key={session.id} value={session.id}>
                          <div className="flex items-center justify-between w-full">
                            <span>{session.title}</span>
                            <Badge variant="outline" className="ml-2">
                              £{session.member_cost || session.base_cost}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={singleDate}
                    onChange={(e) => setSingleDate(e.target.value)}
                    min={moment().format('YYYY-MM-DD')}
                  />
                </div>
              </div>

              {selectedSession && (
                <Card>
                  <CardContent className="pt-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">
                          {moment.utc(selectedSession.start_time).format('h:mm A')} - {moment.utc(selectedSession.end_time).format('h:mm A')}
                        </span>
                      </div>
                      
                      {selectedSession.trainer_name && (
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">{selectedSession.trainer_name}</span>
                        </div>
                      )}
                      
                      {selectedSession.location && (
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">{selectedSession.location}</span>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">
                          {selectedSession.max_bookings - selectedSession.current_bookings} spots available
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Multiple Sessions Booking */}
            <TabsContent value="multiple" className="space-y-4">
              <div className="space-y-4">
                {multipleSessions.map((session, index) => (
                  <Card key={index}>
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-4">
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Session {index + 1}</Label>
                            <Select 
                              value={session.sessionId} 
                              onValueChange={(value) => updateMultipleSession(index, 'sessionId', value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select a session" />
                              </SelectTrigger>
                              <SelectContent>
                                {availableSessions.map((availableSession) => (
                                  <SelectItem key={availableSession.id} value={availableSession.id}>
                                    {availableSession.title} - £{availableSession.member_cost || availableSession.base_cost}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label>Date</Label>
                            <Input
                              type="date"
                              value={session.date}
                              onChange={(e) => updateMultipleSession(index, 'date', e.target.value)}
                              min={moment().format('YYYY-MM-DD')}
                            />
                          </div>
                        </div>

                        {multipleSessions.length > 1 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeMultipleSession(index)}
                          >
                            <Minus className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}

                <Button variant="outline" onClick={addMultipleSession} className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Another Session
                </Button>
              </div>
            </TabsContent>

            {/* Recurring Booking */}
            <TabsContent value="recurring" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Session Type</Label>
                  <Select 
                    value={recurringConfig.sessionId} 
                    onValueChange={(value) => setRecurringConfig({...recurringConfig, sessionId: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a session type" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableSessions.map((session) => (
                        <SelectItem key={session.id} value={session.id}>
                          {session.title} - £{session.member_cost || session.base_cost}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Frequency</Label>
                  <Select 
                    value={recurringConfig.frequency} 
                    onValueChange={(value) => setRecurringConfig({...recurringConfig, frequency: value as any})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={recurringConfig.startDate}
                    onChange={(e) => setRecurringConfig({...recurringConfig, startDate: e.target.value})}
                    min={moment().format('YYYY-MM-DD')}
                  />
                </div>

                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={recurringConfig.endDate}
                    onChange={(e) => setRecurringConfig({...recurringConfig, endDate: e.target.value})}
                    min={recurringConfig.startDate}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label>Number of Occurrences</Label>
                  <Input
                    type="number"
                    min="1"
                    max="52"
                    value={recurringConfig.occurrences}
                    onChange={(e) => setRecurringConfig({...recurringConfig, occurrences: parseInt(e.target.value) || 1})}
                  />
                  <p className="text-sm text-muted-foreground">
                    This will create {recurringConfig.occurrences} bookings
                  </p>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Common Fields */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Payment Status</Label>
                <Select value={paymentStatus} onValueChange={(value) => setPaymentStatus(value as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending Payment</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="comp">Complimentary</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Total Cost</Label>
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">£{calculateTotalCost()}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes (Optional)</Label>
              <Textarea
                placeholder="Any special requirements or notes for this booking..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          {/* Booking Summary */}
          {calculateTotalCost() > 0 && (
            <Alert>
              <CheckCircle className="w-4 h-4" />
              <AlertDescription>
                <strong>Booking Summary:</strong> {' '}
                {bookingType === 'single' && selectedSession && `1 session - ${selectedSession.title}`}
                {bookingType === 'multiple' && `${multipleSessions.filter(s => s.sessionId).length} sessions`}
                {bookingType === 'recurring' && `${recurringConfig.occurrences} recurring sessions`}
                {' '} for a total of £{calculateTotalCost()}
              </AlertDescription>
            </Alert>
          )}

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
            
            <Button
              onClick={() => {
                if (bookingType === 'single') handleSingleBooking();
                else if (bookingType === 'multiple') handleMultipleBooking();
                else if (bookingType === 'recurring') handleRecurringBooking();
              }}
              disabled={loading || loadingSessions}
              className="flex-1"
            >
              {loading ? 'Creating Booking...' : 'Create Booking'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}