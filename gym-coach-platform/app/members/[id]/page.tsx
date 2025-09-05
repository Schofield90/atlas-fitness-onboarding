'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  ArrowLeft, 
  Mail, 
  Phone, 
  Calendar, 
  CreditCard, 
  User, 
  Users,
  Clock,
  MapPin,
  Plus
} from 'lucide-react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { toast } from 'react-hot-toast';
import { formatBritishDate, formatBritishDateTime } from '@/lib/utils/british-format';
import { CustomerBookings } from '@/components/booking/CustomerBookings';
import { MemberBookingForm } from '@/components/booking/MemberBookingForm';

interface Member {
  id: string;
  name: string;
  email: string;
  phone: string;
  membership_status: 'active' | 'paused' | 'cancelled';
  membership_type?: string;
  membership_plan?: {
    id: string;
    name: string;
    price_pennies: number;
    currency: string;
    billing_cycle: string;
  };
  start_date: string;
  end_date?: string;
  total_revenue: number;
  created_at: string;
  updated_at: string;
  date_of_birth?: string;
  emergency_contact?: string;
  notes?: string;
  tags?: string[];
  assigned_to?: string;
  organization_id: string;
}

export default function MemberDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [showBookingForm, setShowBookingForm] = useState(false);
  const supabase = createClientComponentClient();

  useEffect(() => {
    if (params.id) {
      loadMember();
    }
  }, [params.id]);

  const loadMember = async () => {
    try {
      const response = await fetch(`/api/clients/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setMember(data.client);
      } else {
        console.error('Failed to load member:', response.status, response.statusText);
        toast.error('Failed to load member details');
      }
    } catch (error) {
      console.error('Error loading member:', error);
      toast.error('Error loading member details');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (pricePennies: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 2,
    }).format(pricePennies / 100);
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      active: 'bg-green-100 text-green-800',
      paused: 'bg-yellow-100 text-yellow-800',
      cancelled: 'bg-red-100 text-red-800',
    };

    return (
      <Badge className={styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertDescription>Member not found</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/members')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Members
          </Button>
          <h1 className="text-3xl font-bold">{member.name}</h1>
          {getStatusBadge(member.membership_status)}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="bookings">Class Bookings</TabsTrigger>
          <TabsTrigger value="membership">Membership</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{member.email || 'Not provided'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-medium">{member.phone || 'Not provided'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Member Since</p>
                    <p className="font-medium">{formatBritishDate(member.created_at)}</p>
                  </div>
                </div>
                {member.date_of_birth && (
                  <div className="flex items-center gap-3">
                    <User className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Date of Birth</p>
                      <p className="font-medium">{formatBritishDate(member.date_of_birth)}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Membership Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Membership Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <p className="text-sm text-muted-foreground">Current Plan</p>
                  <p className="font-medium">
                    {member.membership_plan?.name || member.membership_type || 'No plan assigned'}
                  </p>
                  {member.membership_plan && (
                    <p className="text-sm text-muted-foreground">
                      {formatPrice(member.membership_plan.price_pennies)} / {member.membership_plan.billing_cycle}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  {getStatusBadge(member.membership_status)}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Revenue</p>
                  <p className="font-medium">{formatPrice(member.total_revenue || 0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Class Bookings Tab */}
        <TabsContent value="bookings" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Class Bookings</h2>
              <p className="text-muted-foreground">Manage bookings for {member.name}</p>
            </div>
            <Button onClick={() => setShowBookingForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Book Session
            </Button>
          </div>

          <CustomerBookings memberId={member.id} />
        </TabsContent>

        {/* Membership Tab */}
        <TabsContent value="membership" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Membership Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Membership Plan</p>
                    <p className="font-medium">
                      {member.membership_plan?.name || member.membership_type || 'No plan assigned'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    {getStatusBadge(member.membership_status)}
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Start Date</p>
                    <p className="font-medium">
                      {member.start_date ? formatBritishDate(member.start_date) : 'Not set'}
                    </p>
                  </div>
                  {member.end_date && (
                    <div>
                      <p className="text-sm text-muted-foreground">End Date</p>
                      <p className="font-medium">{formatBritishDate(member.end_date)}</p>
                    </div>
                  )}
                </div>
                {member.membership_plan && (
                  <div className="pt-4 border-t">
                    <h4 className="font-medium mb-2">Plan Details</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Price</p>
                        <p className="font-medium">{formatPrice(member.membership_plan.price_pennies)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Billing Cycle</p>
                        <p className="font-medium">{member.membership_plan.billing_cycle}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notes Tab */}
        <TabsContent value="notes" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Member Notes</CardTitle>
            </CardHeader>
            <CardContent>
              {member.notes ? (
                <p className="whitespace-pre-wrap">{member.notes}</p>
              ) : (
                <p className="text-muted-foreground">No notes available for this member.</p>
              )}
            </CardContent>
          </Card>
          
          {member.emergency_contact && (
            <Card>
              <CardHeader>
                <CardTitle>Emergency Contact</CardTitle>
              </CardHeader>
              <CardContent>
                <p>{member.emergency_contact}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Booking Form Modal */}
      {showBookingForm && (
        <MemberBookingForm
          member={member}
          isOpen={showBookingForm}
          onClose={() => setShowBookingForm(false)}
          onBookingComplete={() => {
            setShowBookingForm(false);
            // Refresh bookings
            setActiveTab('bookings');
          }}
        />
      )}
    </div>
  );
}