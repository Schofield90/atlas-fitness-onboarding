"use client";

import { useState, useMemo } from 'react';
import { Calendar, momentLocalizer, Event } from 'react-big-calendar';
import moment from 'moment';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar as CalendarIcon, Clock, MapPin, User, Users, Filter } from 'lucide-react';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import './BookingCalendar.css';

const localizer = momentLocalizer(moment);

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

interface BookingCalendarProps {
  onSessionSelect?: (session: SessionSlot) => void;
}

export function BookingCalendar({ onSessionSelect }: BookingCalendarProps) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewType, setViewType] = useState<'calendar' | 'list'>('calendar');
  const [sessionType, setSessionType] = useState<'all' | 'gym_class' | 'personal_training' | 'coaching_call'>('all');
  const [selectedView, setSelectedView] = useState<'week' | 'day'>('week');
  
  // Mock data - replace with actual API call
  const availableSlots: SessionSlot[] = [
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
      title: 'Personal Training Slot',
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

  const filteredSlots = useMemo(() => {
    return availableSlots.filter(slot => 
      sessionType === 'all' || slot.slot_type === sessionType
    );
  }, [sessionType]);

  const events: Event[] = useMemo(() => {
    return filteredSlots.map(slot => ({
      id: slot.id,
      title: slot.title,
      start: new Date(slot.start_time),
      end: new Date(slot.end_time),
      resource: slot,
    }));
  }, [filteredSlots]);

  const getEventClassName = (slot: SessionSlot) => {
    const baseClass = 'booking-event';
    const typeClass = `booking-event-${slot.slot_type.replace('_', '-')}`;
    const availabilityClass = slot.current_bookings >= slot.max_bookings ? 'booking-event-full' : '';
    return `${baseClass} ${typeClass} ${availabilityClass}`;
  };

  const handleSelectEvent = (event: Event) => {
    if (onSessionSelect && event.resource) {
      onSessionSelect(event.resource as SessionSlot);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold">Book a Session</h1>
        
        <div className="flex items-center gap-2">
          <Tabs value={viewType} onValueChange={(v) => setViewType(v as any)}>
            <TabsList>
              <TabsTrigger value="calendar">
                <CalendarIcon className="w-4 h-4 mr-2" />
                Calendar
              </TabsTrigger>
              <TabsTrigger value="list">List</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Filter by type:</span>
          </div>
          <Tabs value={sessionType} onValueChange={(v) => setSessionType(v as any)}>
            <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
              <TabsTrigger value="all">All Sessions</TabsTrigger>
              <TabsTrigger value="gym_class">Classes</TabsTrigger>
              <TabsTrigger value="personal_training">Personal Training</TabsTrigger>
              <TabsTrigger value="coaching_call">Coaching</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      {/* Calendar/List View */}
      {viewType === 'calendar' ? (
        <Card>
          <CardContent className="p-4 lg:p-6">
            <div className="h-[600px]">
              <Calendar
                localizer={localizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
                style={{ height: '100%' }}
                onSelectEvent={handleSelectEvent}
                eventPropGetter={(event) => ({
                  className: getEventClassName(event.resource as SessionSlot),
                })}
                views={['week', 'day']}
                view={selectedView}
                onView={(view) => setSelectedView(view as any)}
                defaultView="week"
                step={30}
                timeslots={2}
                min={new Date(0, 0, 0, 6, 0, 0)}
                max={new Date(0, 0, 0, 22, 0, 0)}
                components={{
                  event: EventComponent,
                }}
              />
            </div>
          </CardContent>
        </Card>
      ) : (
        <SessionsList slots={filteredSlots} onSessionSelect={onSessionSelect} />
      )}
    </div>
  );
}

// Custom event component for the calendar
function EventComponent({ event }: { event: Event }) {
  const slot = event.resource as SessionSlot;
  const spotsLeft = slot.max_bookings - slot.current_bookings;
  const isFull = spotsLeft === 0;

  return (
    <div className="p-1 h-full">
      <div className="font-medium text-xs truncate">{event.title}</div>
      <div className="text-xs opacity-75">{slot.trainer_name}</div>
      <div className="text-xs mt-1">
        {isFull ? (
          <span className="text-red-500">Full</span>
        ) : (
          <span>{spotsLeft} spots</span>
        )}
      </div>
    </div>
  );
}

// List view component
function SessionsList({ 
  slots, 
  onSessionSelect 
}: { 
  slots: SessionSlot[];
  onSessionSelect?: (session: SessionSlot) => void;
}) {
  const groupedSlots = useMemo(() => {
    const groups: Record<string, SessionSlot[]> = {};
    
    slots.forEach(slot => {
      const date = moment.utc(slot.start_time).format('YYYY-MM-DD');
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(slot);
    });
    
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [slots]);

  return (
    <div className="space-y-6">
      {groupedSlots.map(([date, daySlots]) => (
        <Card key={date}>
          <CardHeader>
            <CardTitle className="text-lg">
              {moment.utc(date).format('dddd, DD MMMM YYYY')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {daySlots.map(slot => {
              const spotsLeft = slot.max_bookings - slot.current_bookings;
              const isFull = spotsLeft === 0;
              
              return (
                <div 
                  key={slot.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                  onClick={() => onSessionSelect?.(slot)}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">{slot.title}</h4>
                      <Badge variant="outline" className="text-xs">
                        {slot.slot_type.replace('_', ' ')}
                      </Badge>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {moment.utc(slot.start_time).format('h:mm A')} - {moment.utc(slot.end_time).format('h:mm A')}
                      </div>
                      
                      {slot.trainer_name && (
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {slot.trainer_name}
                        </div>
                      )}
                      
                      {slot.location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {slot.location}
                        </div>
                      )}
                      
                      <div className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {isFull ? (
                          <span className="text-red-500">Full</span>
                        ) : (
                          <span>{spotsLeft} spots left</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="font-medium">
                      £{slot.member_cost || slot.base_cost}
                    </div>
                    <Button 
                      size="sm" 
                      variant={isFull ? "outline" : "default"}
                      disabled={isFull}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSessionSelect?.(slot);
                      }}
                    >
                      {isFull ? 'Join Waitlist' : 'Book Now'}
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}
      
      {groupedSlots.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <CalendarIcon className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-20" />
            <p className="text-muted-foreground">No sessions available for the selected filters</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}