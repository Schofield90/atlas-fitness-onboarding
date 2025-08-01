"use client";

import { useState } from 'react';
import { BookingCalendar } from '@/components/booking/BookingCalendar';
import { ClassBookingModal } from '@/components/booking/ClassBookingModal';
import { CustomerBookings } from '@/components/booking/CustomerBookings';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, History } from 'lucide-react';

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

export default function BookingPage() {
  const [selectedSession, setSelectedSession] = useState<SessionSlot | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);

  const handleSessionSelect = (session: SessionSlot) => {
    setSelectedSession(session);
    setShowBookingModal(true);
  };

  const handleBookingComplete = () => {
    setShowBookingModal(false);
    setSelectedSession(null);
    // Optionally refresh the calendar or show a success message
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="book" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="book" className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Book Sessions
          </TabsTrigger>
          <TabsTrigger value="my-bookings" className="flex items-center gap-2">
            <History className="w-4 h-4" />
            My Bookings
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="book" className="mt-6">
          <BookingCalendar onSessionSelect={handleSessionSelect} />
        </TabsContent>
        
        <TabsContent value="my-bookings" className="mt-6">
          <CustomerBookings />
        </TabsContent>
      </Tabs>

      {/* Booking Modal */}
      {selectedSession && (
        <ClassBookingModal
          session={selectedSession}
          isOpen={showBookingModal}
          onClose={() => setShowBookingModal(false)}
          onBookingComplete={handleBookingComplete}
        />
      )}
    </div>
  );
}