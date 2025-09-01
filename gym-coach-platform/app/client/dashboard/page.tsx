"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, TrendingUp, Users, User, CreditCard, Gift, ArrowRight, Bell } from 'lucide-react';
import Link from 'next/link';

export default function ClientDashboard() {
  // Mock data - replace with actual data from your API
  const upcomingSessions = [
    {
      id: '1',
      title: 'HIIT Class',
      type: 'gym_class',
      date: new Date(Date.now() + 86400000), // Tomorrow
      time: '09:00 AM',
      duration: 45,
      trainer: 'Sarah Johnson',
      location: 'Studio A',
    },
    {
      id: '2',
      title: 'Personal Training',
      type: 'personal_training',
      date: new Date(Date.now() + 172800000), // Day after tomorrow
      time: '06:00 PM',
      duration: 60,
      trainer: 'Mike Wilson',
      location: 'Main Floor',
    },
  ];

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
            {upcomingSessions.map((session) => (
              <div key={session.id} className="flex items-start justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{session.title}</h4>
                    <Badge variant="outline" className="text-xs">
                      {session.type.replace('_', ' ')}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {session.date.toLocaleDateString('en-GB', { 
                      weekday: 'short', 
                      day: 'numeric', 
                      month: 'short' 
                    })} at {session.time}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {session.trainer} • {session.location} • {session.duration} mins
                  </p>
                </div>
                <Button variant="outline" size="sm">
                  Manage
                </Button>
              </div>
            ))}
            
            {upcomingSessions.length === 0 && (
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