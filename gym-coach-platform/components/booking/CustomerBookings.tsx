"use client";

import { useState, useMemo } from 'react';
import moment from 'moment';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Calendar, Clock, MapPin, User, X, CheckCircle, AlertCircle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Booking {
  id: string;
  session_title: string;
  session_type: 'gym_class' | 'personal_training' | 'coaching_call';
  start_time: string;
  end_time: string;
  trainer_name?: string;
  location?: string;
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  cost: number;
  booked_at: string;
  cancellation_deadline: string;
}

export function CustomerBookings() {
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  const [cancellingBooking, setCancellingBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(false);

  // Mock data - replace with actual API call
  const bookings: Booking[] = [
    {
      id: '1',
      session_title: 'Morning HIIT',
      session_type: 'gym_class',
      start_time: moment().add(2, 'days').hour(9).minute(0).toISOString(),
      end_time: moment().add(2, 'days').hour(9).minute(45).toISOString(),
      trainer_name: 'Sarah Johnson',
      location: 'Studio A',
      status: 'confirmed',
      cost: 10,
      booked_at: moment().subtract(1, 'day').toISOString(),
      cancellation_deadline: moment().add(1, 'day').hour(9).minute(0).toISOString(),
    },
    {
      id: '2',
      session_title: 'Personal Training',
      session_type: 'personal_training',
      start_time: moment().add(5, 'days').hour(18).minute(0).toISOString(),
      end_time: moment().add(5, 'days').hour(19).minute(0).toISOString(),
      trainer_name: 'Mike Davis',
      location: 'Main Floor',
      status: 'scheduled',
      cost: 40,
      booked_at: moment().subtract(2, 'days').toISOString(),
      cancellation_deadline: moment().add(4, 'days').hour(18).minute(0).toISOString(),
    },
    {
      id: '3',
      session_title: 'Yoga Flow',
      session_type: 'gym_class',
      start_time: moment().subtract(3, 'days').hour(10).minute(30).toISOString(),
      end_time: moment().subtract(3, 'days').hour(11).minute(30).toISOString(),
      trainer_name: 'Emma Wilson',
      location: 'Studio B',
      status: 'completed',
      cost: 8,
      booked_at: moment().subtract(5, 'days').toISOString(),
      cancellation_deadline: moment().subtract(4, 'days').hour(10).minute(30).toISOString(),
    },
  ];

  const { upcomingBookings, pastBookings } = useMemo(() => {
    const now = moment();
    const upcoming = bookings.filter(b => 
      moment(b.start_time).isAfter(now) && 
      b.status !== 'cancelled'
    ).sort((a, b) => moment(a.start_time).diff(moment(b.start_time)));
    
    const past = bookings.filter(b => 
      moment(b.start_time).isBefore(now) || 
      b.status === 'cancelled'
    ).sort((a, b) => moment(b.start_time).diff(moment(a.start_time)));
    
    return { upcomingBookings: upcoming, pastBookings: past };
  }, []);

  const canCancelBooking = (booking: Booking) => {
    return moment().isBefore(moment(booking.cancellation_deadline)) && 
           booking.status !== 'cancelled' &&
           booking.status !== 'completed';
  };

  const handleCancelBooking = async () => {
    if (!cancellingBooking) return;
    
    setLoading(true);
    try {
      // Mock API call - replace with actual cancellation API
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Update the booking status locally
      // In real app, refetch bookings from API
      setCancellingBooking(null);
    } catch (error) {
      console.error('Failed to cancel booking:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: Booking['status']) => {
    const statusConfig = {
      scheduled: { label: 'Scheduled', variant: 'secondary' as const },
      confirmed: { label: 'Confirmed', variant: 'default' as const },
      completed: { label: 'Completed', variant: 'outline' as const },
      cancelled: { label: 'Cancelled', variant: 'destructive' as const },
      no_show: { label: 'No Show', variant: 'destructive' as const },
    };
    
    const config = statusConfig[status];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const BookingCard = ({ booking }: { booking: Booking }) => {
    const sessionDate = moment(booking.start_time);
    const duration = moment(booking.end_time).diff(sessionDate, 'minutes');
    const canCancel = canCancelBooking(booking);
    const hoursUntilSession = sessionDate.diff(moment(), 'hours');
    
    return (
      <Card className="overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-2">
                <h4 className="font-medium">{booking.session_title}</h4>
                {getStatusBadge(booking.status)}
              </div>
              
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>{sessionDate.format('dddd, DD MMMM YYYY')}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>
                    {sessionDate.format('h:mm A')} - {moment(booking.end_time).format('h:mm A')} ({duration} mins)
                  </span>
                </div>
                
                {booking.trainer_name && (
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    <span>{booking.trainer_name}</span>
                  </div>
                )}
                
                {booking.location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    <span>{booking.location}</span>
                  </div>
                )}
              </div>
              
              {booking.status === 'confirmed' && hoursUntilSession <= 24 && hoursUntilSession > 0 && (
                <div className="flex items-center gap-2 text-sm text-orange-600">
                  <AlertCircle className="w-4 h-4" />
                  <span>Session starts in {hoursUntilSession} hours</span>
                </div>
              )}
            </div>
            
            <div className="text-right space-y-2">
              <p className="font-medium">£{booking.cost}</p>
              
              {canCancel && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCancellingBooking(booking)}
                  className="text-red-600 hover:text-red-700"
                >
                  <X className="w-4 h-4 mr-1" />
                  Cancel
                </Button>
              )}
              
              {booking.status === 'completed' && (
                <Button variant="outline" size="sm">
                  Book Again
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="upcoming">
            Upcoming ({upcomingBookings.length})
          </TabsTrigger>
          <TabsTrigger value="past">
            Past ({pastBookings.length})
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="upcoming" className="mt-6 space-y-4">
          {upcomingBookings.length > 0 ? (
            upcomingBookings.map(booking => (
              <BookingCard key={booking.id} booking={booking} />
            ))
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <Calendar className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-20" />
                <p className="text-muted-foreground">No upcoming bookings</p>
                <Button variant="link" className="mt-2">
                  Book a session
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="past" className="mt-6 space-y-4">
          {pastBookings.length > 0 ? (
            pastBookings.map(booking => (
              <BookingCard key={booking.id} booking={booking} />
            ))
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <CheckCircle className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-20" />
                <p className="text-muted-foreground">No past bookings</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Cancellation Confirmation Dialog */}
      <AlertDialog open={!!cancellingBooking} onOpenChange={() => setCancellingBooking(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Booking</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel your booking for{' '}
              <span className="font-medium">{cancellingBooking?.session_title}</span> on{' '}
              {cancellingBooking && moment(cancellingBooking.start_time).format('DD MMMM YYYY [at] h:mm A')}?
              <br /><br />
              This action cannot be undone. You will receive a full refund as you are cancelling 
              more than 24 hours before the session.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Keep Booking</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelBooking}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700"
            >
              {loading ? 'Cancelling...' : 'Cancel Booking'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}