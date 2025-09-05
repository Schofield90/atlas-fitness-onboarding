'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  ArrowLeft, 
  Mail, 
  Phone, 
  Calendar, 
  CreditCard, 
  User, 
  Copy, 
  Check,
  Send,
  Key,
  ExternalLink,
  Users,
  Clock,
  MapPin,
  Plus,
  Edit,
  FileText
} from 'lucide-react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { toast } from 'react-hot-toast';
import { formatBritishDate, formatBritishDateTime } from '@/lib/utils/british-format';
import { BodyCompositionSection } from '@/components/clients/BodyCompositionSection';
import { CustomerBookings } from '@/components/booking/CustomerBookings';
import { MemberBookingForm } from '@/components/booking/MemberBookingForm';

interface Member {
  id: string;
  name: string;
  email: string;
  phone: string;
  status?: string;
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

interface PortalAccess {
  id: string;
  access_code: string;
  magic_link_token: string;
  is_claimed: boolean;
  claimed_at?: string;
  expires_at: string;
  welcome_email_sent: boolean;
  welcome_email_sent_at?: string;
}

export default function MemberDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [member, setMember] = useState<Member | null>(null);
  const [portalAccess, setPortalAccess] = useState<PortalAccess | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [showNotesDialog, setShowNotesDialog] = useState(false);
  const [notesText, setNotesText] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const supabase = createClientComponentClient();

  useEffect(() => {
    if (params.id) {
      loadMember();
    }
  }, [params.id]);

  const loadMember = async () => {
    try {
      // Get member details via API
      const response = await fetch(`/api/clients/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setMember(data);
      } else {
        console.error('Failed to load member:', response.status, response.statusText);
        toast.error('Failed to load member details');
      }

      // Get portal access via Supabase
      const { data: accessData, error: accessError } = await supabase
        .from('client_portal_access')
        .select('*')
        .eq('client_id', params.id)
        .single();

      if (!accessError && accessData) {
        setPortalAccess(accessData);
      }
    } catch (error) {
      console.error('Error loading member:', error);
      toast.error('Error loading member details');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('Copied to clipboard');
    } catch (error) {
      toast.error('Failed to copy');
    }
  };

  const sendWelcomeEmail = async () => {
    setSendingEmail(true);
    try {
      const response = await fetch(`/api/clients/${params.id}/send-welcome`, {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error('Failed to send email');
      }

      toast.success('Welcome email sent successfully');
      await loadMember(); // Reload to get updated status
    } catch (error) {
      console.error('Error sending email:', error);
      toast.error('Failed to send welcome email');
    } finally {
      setSendingEmail(false);
    }
  };

  const resendWelcomeEmail = async () => {
    setSendingEmail(true);
    try {
      const response = await fetch(`/api/clients/${params.id}/resend-welcome`, {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error('Failed to resend email');
      }

      toast.success('Welcome email resent successfully');
    } catch (error) {
      console.error('Error resending email:', error);
      toast.error('Failed to resend welcome email');
    } finally {
      setSendingEmail(false);
    }
  };

  const handleAddNote = () => {
    setNotesText(member?.notes || '');
    setShowNotesDialog(true);
  };

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    try {
      const response = await fetch(`/api/clients/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notes: notesText
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save notes');
      }

      toast.success('Notes saved successfully');
      setShowNotesDialog(false);
      await loadMember(); // Reload to get updated notes
    } catch (error) {
      console.error('Error saving notes:', error);
      toast.error('Failed to save notes');
    } finally {
      setSavingNotes(false);
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

  const portalUrl = `${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/client-portal/login`;

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
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="bookings">Bookings</TabsTrigger>
          <TabsTrigger value="membership">Membership</TabsTrigger>
          <TabsTrigger value="portal">Portal Access</TabsTrigger>
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

          {/* Body Composition */}
          <BodyCompositionSection clientId={member.id} clientPhone={member.phone} />
        </TabsContent>

        {/* Bookings Tab */}
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

        {/* Portal Access Tab */}
        <TabsContent value="portal" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Client Portal Access
              </CardTitle>
            </CardHeader>
            <CardContent>
              {portalAccess ? (
                <div className="space-y-6">
                  {/* Access Code */}
                  <div className="bg-gray-50 p-6 rounded-lg space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Access Code</p>
                      <div className="flex items-center gap-3">
                        <code className="text-2xl font-mono bg-white px-4 py-2 rounded border">
                          {portalAccess.access_code}
                        </code>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(portalAccess.access_code)}
                        >
                          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Client can use this code at: {portalUrl}
                      </p>
                    </div>

                    {/* Status */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Status</p>
                        <Badge variant={portalAccess.is_claimed ? 'default' : 'secondary'}>
                          {portalAccess.is_claimed ? 'Claimed' : 'Unclaimed'}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Welcome Email</p>
                        <Badge variant={portalAccess.welcome_email_sent ? 'default' : 'secondary'}>
                          {portalAccess.welcome_email_sent ? 'Sent' : 'Not Sent'}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Expires</p>
                        <p className="text-sm font-medium">{formatBritishDate(portalAccess.expires_at)}</p>
                      </div>
                    </div>

                    {portalAccess.claimed_at && (
                      <div>
                        <p className="text-sm text-muted-foreground">Claimed At</p>
                        <p className="text-sm">{formatBritishDateTime(portalAccess.claimed_at)}</p>
                      </div>
                    )}

                    {portalAccess.welcome_email_sent_at && (
                      <div>
                        <p className="text-sm text-muted-foreground">Email Sent At</p>
                        <p className="text-sm">{formatBritishDateTime(portalAccess.welcome_email_sent_at)}</p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3">
                    {!portalAccess.welcome_email_sent && member.email && (
                      <Button
                        onClick={sendWelcomeEmail}
                        disabled={sendingEmail}
                      >
                        <Send className="h-4 w-4 mr-2" />
                        {sendingEmail ? 'Sending...' : 'Send Welcome Email'}
                      </Button>
                    )}
                    {portalAccess.welcome_email_sent && member.email && !portalAccess.is_claimed && (
                      <Button
                        variant="outline"
                        onClick={resendWelcomeEmail}
                        disabled={sendingEmail}
                      >
                        <Send className="h-4 w-4 mr-2" />
                        {sendingEmail ? 'Sending...' : 'Resend Welcome Email'}
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      onClick={() => window.open(portalUrl, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View Portal Login
                    </Button>
                  </div>

                  {!member.email && (
                    <Alert>
                      <AlertDescription>
                        Add an email address to this member's profile to send welcome emails.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              ) : (
                <Alert>
                  <AlertDescription>
                    No portal access found. Creating access code...
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notes Tab */}
        <TabsContent value="notes" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Member Notes
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddNote}
                >
                  {member.notes ? (
                    <>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Notes
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Notes
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {member.notes ? (
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{member.notes}</p>
              ) : (
                <p className="text-muted-foreground text-sm">No notes added yet. Click "Add Notes" to get started.</p>
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

      {/* Notes Dialog */}
      <Dialog open={showNotesDialog} onOpenChange={setShowNotesDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {member?.notes ? 'Edit Notes' : 'Add Notes'} for {member?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notesText}
                onChange={(e) => setNotesText(e.target.value)}
                placeholder="Add any relevant notes about this member..."
                className="min-h-[200px] resize-none"
              />
              <p className="text-xs text-muted-foreground">
                These notes are private and only visible to staff members.
              </p>
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowNotesDialog(false)}
                disabled={savingNotes}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveNotes}
                disabled={savingNotes}
              >
                {savingNotes ? 'Saving...' : 'Save Notes'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
