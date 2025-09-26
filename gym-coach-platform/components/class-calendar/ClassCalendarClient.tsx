"use client";

import { useState, useMemo, useEffect } from 'react';
import { Calendar, momentLocalizer, Event } from 'react-big-calendar';
import moment from 'moment';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  User,
  Users,
  Filter,
  Edit,
  MoreHorizontal,
  Trash2,
  X
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { EditSessionModal } from '@/components/class-calendar/EditSessionModal';
import { useToast } from '@/hooks/use-toast';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import '../../app/class-calendar/globals.css';

const localizer = momentLocalizer(moment);

interface ClassSession {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  session_type: 'gym_class' | 'personal_training' | 'coaching_call';
  trainer_name?: string;
  trainer_id?: string;
  location?: string;
  max_capacity: number;
  current_bookings: number;
  base_cost: number;
  member_cost?: number;
  is_available: boolean;
  notes?: string;
  is_cancelled?: boolean;
}

export function ClassCalendarClient() {
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewType, setViewType] = useState<'calendar' | 'list'>('calendar');
  const [sessionType, setSessionType] = useState<'all' | 'gym_class' | 'personal_training' | 'coaching_call'>('all');
  const [selectedView, setSelectedView] = useState<'week' | 'day' | 'month'>('week');
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<ClassSession | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // Fetch sessions from API
  useEffect(() => {
    const fetchSessions = async () => {
      setLoading(true);
      try {
        const startDate = moment(selectedDate).startOf('month').toISOString();
        const endDate = moment(selectedDate).endOf('month').toISOString();

        const params = new URLSearchParams({
          startDate,
          endDate,
          ...(sessionType !== 'all' && { sessionType })
        });

        // Use the new class-sessions endpoint that connects to the database
        const response = await fetch(`/api/class-sessions?${params}`);

        if (!response.ok) {
          throw new Error('Failed to fetch sessions');
        }

        const data = await response.json();

        if (data.success) {
          setSessions(data.data);
        } else {
          throw new Error(data.error || 'Failed to fetch sessions');
        }
      } catch (error) {
        console.error('Error fetching sessions:', error);

        // Don't show error toast if we're just loading empty data
        if (sessions.length === 0) {
          toast({
            title: "No Sessions Found",
            description: "No class sessions found. Create some sessions to see them here.",
          });
        }
      } finally {
        setLoading(false);
      }
    };

    fetchSessions();
  }, [selectedDate, sessionType, toast]);

  const filteredSessions = useMemo(() => {
    return sessions.filter(session =>
      sessionType === 'all' || session.session_type === sessionType
    );
  }, [sessions, sessionType]);

  const events: Event[] = useMemo(() => {
    return filteredSessions.map(session => ({
      id: session.id,
      title: session.title,
      start: new Date(session.start_time),
      end: new Date(session.end_time),
      resource: session,
    }));
  }, [filteredSessions]);

  const getEventClassName = (session: ClassSession) => {
    const baseClass = 'class-event';
    const typeClass = `class-event-${session.session_type.replace('_', '-')}`;
    const availabilityClass = session.current_bookings >= session.max_capacity ? 'class-event-full' : '';
    const cancelledClass = session.is_cancelled ? 'class-event-cancelled' : '';
    return `${baseClass} ${typeClass} ${availabilityClass} ${cancelledClass}`;
  };

  const handleSelectEvent = (event: Event) => {
    console.log('Calendar event clicked:', event);
    const session = event.resource as ClassSession;
    setSelectedSession(session);
    setShowEditModal(true);
  };

  const handleEditSession = (session: ClassSession) => {
    console.log('Edit session clicked from list:', session);
    setSelectedSession(session);
    setShowEditModal(true);
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm('Are you sure you want to delete this session?')) {
      return;
    }

    try {
      const response = await fetch(`/api/class-sessions?sessionId=${sessionId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete session');
      }

      setSessions(prev => prev.filter(s => s.id !== sessionId));
      toast({
        title: "Session Deleted",
        description: "The session has been successfully deleted.",
      });
    } catch (error) {
      console.error('Error deleting session:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete session. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCancelSession = async (sessionId: string) => {
    if (!confirm('Are you sure you want to cancel this session? Participants will be notified.')) {
      return;
    }

    try {
      const response = await fetch(`/api/class-sessions`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          is_cancelled: true,
          session_status: 'cancelled'
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to cancel session');
      }

      setSessions(prev => prev.map(s =>
        s.id === sessionId ? { ...s, is_cancelled: true } : s
      ));
      toast({
        title: "Session Cancelled",
        description: "The session has been cancelled. Participants will be notified.",
      });
    } catch (error) {
      console.error('Error cancelling session:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to cancel session. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateSession = async (updatedSession: ClassSession) => {
    try {
      const response = await fetch(`/api/class-sessions`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: updatedSession.id,
          title: updatedSession.title,
          start_time: updatedSession.start_time,
          end_time: updatedSession.end_time,
          session_type: updatedSession.session_type,
          trainer_id: updatedSession.trainer_id,
          instructor_name: updatedSession.trainer_name,
          room_name: updatedSession.location,
          max_capacity: updatedSession.max_capacity,
          base_cost: updatedSession.base_cost,
          member_cost: updatedSession.member_cost,
          notes: updatedSession.notes,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to update session');
      }

      setSessions(prev => prev.map(s =>
        s.id === updatedSession.id ? updatedSession : s
      ));
      setShowEditModal(false);
      setSelectedSession(null);
      toast({
        title: "Session Updated",
        description: "The session has been successfully updated.",
      });
    } catch (error) {
      console.error('Error updating session:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update session. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold">Class Schedule Management</h1>

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
      {loading ? (
        <Card>
          <CardContent className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground mt-4">Loading class schedule...</p>
          </CardContent>
        </Card>
      ) : (
        <>
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
                      className: getEventClassName(event.resource as ClassSession),
                    })}
                    views={['week', 'day', 'month']}
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
            <SessionsList
              sessions={filteredSessions}
              onEditSession={handleEditSession}
              onDeleteSession={handleDeleteSession}
              onCancelSession={handleCancelSession}
            />
          )}
        </>
      )}

      {/* Edit Session Modal */}
      {selectedSession && (
        <EditSessionModal
          session={selectedSession}
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedSession(null);
          }}
          onUpdate={handleUpdateSession}
        />
      )}
    </div>
  );
}

// Custom event component for the calendar
function EventComponent({ event }: { event: Event }) {
  const session = event.resource as ClassSession;
  const spotsLeft = session.max_capacity - session.current_bookings;
  const isFull = spotsLeft === 0;

  return (
    <div className="p-1 h-full relative cursor-pointer hover:opacity-90">
      <div className="font-medium text-xs truncate">{event.title}</div>
      <div className="text-xs opacity-75">{session.trainer_name || 'No instructor'}</div>
      <div className="text-xs mt-1">
        <span className="font-semibold">{session.max_capacity}</span> capacity
        {session.is_cancelled ? (
          <span className="text-red-500 ml-1">(Cancelled)</span>
        ) : isFull ? (
          <span className="text-red-500 ml-1">(Full)</span>
        ) : (
          <span className="ml-1">({session.current_bookings} booked)</span>
        )}
      </div>
    </div>
  );
}

// List view component
function SessionsList({
  sessions,
  onEditSession,
  onDeleteSession,
  onCancelSession
}: {
  sessions: ClassSession[];
  onEditSession: (session: ClassSession) => void;
  onDeleteSession: (sessionId: string) => void;
  onCancelSession: (sessionId: string) => void;
}) {
  const groupedSessions = useMemo(() => {
    const groups: Record<string, ClassSession[]> = {};

    sessions.forEach(session => {
      const date = moment.utc(session.start_time).format('YYYY-MM-DD');
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(session);
    });

    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [sessions]);

  return (
    <div className="space-y-6">
      {groupedSessions.map(([date, daySessions]) => (
        <Card key={date}>
          <CardHeader>
            <CardTitle className="text-lg">
              {moment.utc(date).format('dddd, DD MMMM YYYY')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {daySessions.map(session => {
              const spotsLeft = session.max_capacity - session.current_bookings;
              const isFull = spotsLeft === 0;

              return (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">{session.title}</h4>
                      <Badge variant="outline" className="text-xs">
                        {session.session_type.replace('_', ' ')}
                      </Badge>
                      {session.is_cancelled && (
                        <Badge variant="destructive" className="text-xs">
                          Cancelled
                        </Badge>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {moment.utc(session.start_time).format('h:mm A')} - {moment.utc(session.end_time).format('h:mm A')}
                      </div>

                      {session.trainer_name && (
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {session.trainer_name}
                        </div>
                      )}

                      {session.location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {session.location}
                        </div>
                      )}

                      <div className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {session.is_cancelled ? (
                          <span className="text-red-500">Cancelled</span>
                        ) : isFull ? (
                          <span className="text-red-500">Full ({session.current_bookings}/{session.max_capacity})</span>
                        ) : (
                          <span>{session.current_bookings}/{session.max_capacity} booked</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="text-right mr-4">
                      <div className="font-medium">
                        £{session.member_cost || session.base_cost}
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEditSession(session)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Session
                        </DropdownMenuItem>
                        {!session.is_cancelled && (
                          <DropdownMenuItem onClick={() => onCancelSession(session.id)}>
                            <X className="h-4 w-4 mr-2" />
                            Cancel Session
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={() => onDeleteSession(session.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Session
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}

      {groupedSessions.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <CalendarIcon className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-20" />
            <p className="text-muted-foreground">No sessions found for the selected filters</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}