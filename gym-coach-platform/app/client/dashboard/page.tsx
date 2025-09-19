"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, TrendingUp, Users, User, CreditCard, Gift, ArrowRight, Bell } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { useAuth } from '@/components/providers/AuthProvider';

interface UpcomingSession {
  id: string;
  title: string;
  session_type: 'gym_class' | 'personal_training' | 'coaching_call';
  start_time: string;
  end_time: string;
  trainer_name?: string;
  location?: string;
  status: string;
  cost: number;
}

export default function ClientDashboard() {
  const { user, loading: authLoading } = useAuth();
  const [upcomingSessions, setUpcomingSessions] = useState<UpcomingSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);

  useEffect(() => {
    if (!authLoading) {
      if (user) {
        loadUpcomingSessions();
      } else {
        // User not authenticated, clear sessions
        setUpcomingSessions([]);
        setLoadingSessions(false);
      }
    }
  }, [authLoading, user]);

  const loadUpcomingSessions = async () => {
    if (!user) return;

    try {
      setLoadingSessions(true);
      // Get upcoming sessions for the current user
      const now = new Date().toISOString();
      const response = await fetch(`/api/bookings?startDate=${now}&memberId=${user.id}`);

      if (response.ok) {
        const data = await response.json();

        // Transform and filter for upcoming sessions only
        const now = new Date();
        const sessions: UpcomingSession[] = (data.bookings || [])
          .filter((session: any) =>
            new Date(session.start_time) > now &&
            session.status !== 'cancelled' &&
            session.status !== 'completed'
          )
          .slice(0, 3) // Only show next 3 sessions on dashboard
          .map((session: any) => ({
            id: session.id,
            title: session.title || 'Unknown Session',
            session_type: session.session_type || 'gym_class',
            start_time: session.start_time,
            end_time: session.end_time,
            trainer_name: session.trainer?.name || session.coach?.name,
            location: session.room_or_location,
            status: session.status,
            cost: session.cost || 0
          }));

        setUpcomingSessions(sessions);
      } else if (response.status === 401) {
        toast.error('Please sign in to view your sessions');
        setUpcomingSessions([]);
      } else {
        throw new Error('Failed to fetch sessions');
      }
    } catch (error) {
      console.error('Error loading upcoming sessions:', error);

      // Show user-friendly error message
      if (error instanceof Error && error.message.includes('Failed to fetch')) {
        toast.error('Unable to load sessions. Please check your connection.');
      } else {
        toast.error('Failed to load upcoming sessions');
      }

      // Fallback to empty array instead of mock data
      setUpcomingSessions([]);
    } finally {
      setLoadingSessions(false);
    }
  };


  const stats = {
    sessionsThisMonth: 12,
    totalSessions: 48,
    membershipDaysLeft: 15,
    referralCredits: 25,
  };

  const notifications = [
    {
      id: '1',
      title: 'New class available!',
      message: 'Yoga Flow has been added to the schedule',
      time: '2 hours ago',
      unread: true,
    },
    {
      id: '2',
      title: 'Referral reward earned',
      message: 'You earned £10 credit from your referral',
      time: '1 day ago',
      unread: false,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">Welcome back, John!</h1>
        <p className="text-blue-100 mb-4">Ready to crush your fitness goals today?</p>
        <Link href="/client/booking">
          <Button variant="secondary" size="lg">
            Book a Session
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">This Month</p>
                <p className="text-2xl font-bold">{stats.sessionsThisMonth}</p>
              </div>
              <Calendar className="w-8 h-8 text-primary opacity-20" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Sessions</p>
                <p className="text-2xl font-bold">{stats.totalSessions}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500 opacity-20" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Membership</p>
                <p className="text-2xl font-bold">{stats.membershipDaysLeft}d</p>
              </div>
              <Clock className="w-8 h-8 text-orange-500 opacity-20" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Credits</p>
                <p className="text-2xl font-bold">£{stats.referralCredits}</p>
              </div>
              <Users className="w-8 h-8 text-purple-500 opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Upcoming Sessions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Upcoming Sessions</CardTitle>
            <Link href="/client/booking">
              <Button variant="ghost" size="sm">View all</Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadingSessions || authLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="p-4 border rounded-lg">
                    <div className="animate-pulse space-y-3">
                      <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : upcomingSessions.length > 0 ? (
              upcomingSessions.map((session) => {
                const sessionDate = new Date(session.start_time);
                const sessionEndDate = new Date(session.end_time);
                const duration = Math.round((sessionEndDate.getTime() - sessionDate.getTime()) / (1000 * 60));

                return (
                  <div key={session.id} className="flex items-start justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{session.title}</h4>
                        <Badge variant="outline" className="text-xs">
                          {session.session_type.replace('_', ' ')}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {sessionDate.toLocaleDateString('en-GB', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short'
                        })} at {sessionDate.toLocaleTimeString('en-GB', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {session.trainer_name ? `${session.trainer_name} • ` : ''}
                        {session.location ? `${session.location} • ` : ''}
                        {duration} mins
                      </p>
                    </div>
                    <Button variant="outline" size="sm">
                      Manage
                    </Button>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>No upcoming sessions</p>
                <Link href="/client/booking">
                  <Button variant="link" className="mt-2">Book your first session</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Notifications */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Notifications</CardTitle>
            <Bell className="w-5 h-5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-4">
            {notifications.map((notification) => (
              <div 
                key={notification.id} 
                className={`p-4 border rounded-lg ${
                  notification.unread ? 'bg-blue-50 border-blue-200' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <h4 className="font-medium text-sm">{notification.title}</h4>
                    <p className="text-sm text-muted-foreground">{notification.message}</p>
                    <p className="text-xs text-muted-foreground">{notification.time}</p>
                  </div>
                  {notification.unread && (
                    <div className="w-2 h-2 bg-blue-600 rounded-full" />
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link href="/client/booking">
              <Button variant="outline" className="w-full h-24 flex-col gap-2">
                <Calendar className="w-6 h-6" />
                <span className="text-xs">Book Session</span>
              </Button>
            </Link>
            <Link href="/client/profile">
              <Button variant="outline" className="w-full h-24 flex-col gap-2">
                <User className="w-6 h-6" />
                <span className="text-xs">Update Profile</span>
              </Button>
            </Link>
            <Link href="/client/payments">
              <Button variant="outline" className="w-full h-24 flex-col gap-2">
                <CreditCard className="w-6 h-6" />
                <span className="text-xs">Payment Methods</span>
              </Button>
            </Link>
            <Link href="/client/referrals">
              <Button variant="outline" className="w-full h-24 flex-col gap-2">
                <Gift className="w-6 h-6" />
                <span className="text-xs">Refer Friends</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}