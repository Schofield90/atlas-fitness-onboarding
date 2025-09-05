'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
  FileText,
  Plus,
  Clock,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { toast } from 'react-hot-toast';
import { formatBritishDate, formatBritishDateTime } from '@/lib/utils/british-format';
import { BodyCompositionSection } from '@/components/clients/BodyCompositionSection';
import ClientMessaging from '@/components/messaging/ClientMessaging';

interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: string;
  created_at: string;
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

interface Waiver {
  id: string;
  title: string;
  content: string;
  version: number;
  is_active: boolean;
  required_for: string[];
  created_at: string;
  updated_at: string;
}

interface CustomerWaiver {
  id: string;
  customer_id: string;
  waiver_id: string;
  signed_at: string;
  signature_data?: string;
  ip_address?: string;
  waiver: Waiver;
}

interface PendingWaiverAssignment {
  id: string;
  client_id: string;
  waiver_id: string;
  assigned_at: string;
  expires_at: string;
  status: string;
  waiver: Waiver;
}

export default function ClientDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [client, setClient] = useState<Client | null>(null);
  const [portalAccess, setPortalAccess] = useState<PortalAccess | null>(null);
  const [customerWaivers, setCustomerWaivers] = useState<CustomerWaiver[]>([]);
  const [pendingWaivers, setPendingWaivers] = useState<PendingWaiverAssignment[]>([]);
  const [availableWaivers, setAvailableWaivers] = useState<Waiver[]>([]);
  const [loading, setLoading] = useState(true);
  const [waiversLoading, setWaiversLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [assigningWaiver, setAssigningWaiver] = useState(false);
  const supabase = createClientComponentClient();

  useEffect(() => {
    if (params.id) {
      loadClient();
      loadWaivers();
    }
  }, [params.id]);

  const loadClient = async () => {
    try {
      // Get client details
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', params.id)
        .single();

      if (clientError) throw clientError;
      setClient(clientData);

      // Get portal access
      const { data: accessData, error: accessError } = await supabase
        .from('client_portal_access')
        .select('*')
        .eq('client_id', params.id)
        .single();

      if (!accessError && accessData) {
        setPortalAccess(accessData);
      }
    } catch (error) {
      console.error('Error loading client:', error);
      toast.error('Failed to load client details');
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
      await loadClient(); // Reload to get updated status
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

  const loadWaivers = async () => {
    setWaiversLoading(true);
    try {
      // Load customer waivers (signed)
      const { data: customerWaiversData, error: customerWaiversError } = await supabase
        .from('customer_waivers')
        .select(`
          id,
          customer_id,
          waiver_id,
          signed_at,
          signature_data,
          ip_address,
          waivers:waiver_id (
            id,
            title,
            content,
            version,
            is_active,
            required_for,
            created_at,
            updated_at
          )
        `)
        .eq('customer_id', params.id);

      if (customerWaiversError) throw customerWaiversError;

      // Transform the data to match our interface
      const transformedWaivers = customerWaiversData?.map(cw => ({
        ...cw,
        waiver: Array.isArray(cw.waivers) ? cw.waivers[0] : cw.waivers
      })) || [];

      setCustomerWaivers(transformedWaivers);

      // Load pending waiver assignments
      const { data: pendingWaiversData, error: pendingWaiversError } = await supabase
        .from('pending_waiver_assignments')
        .select(`
          id,
          client_id,
          waiver_id,
          assigned_at,
          expires_at,
          status,
          waivers:waiver_id (
            id,
            title,
            content,
            version,
            is_active,
            required_for,
            created_at,
            updated_at
          )
        `)
        .eq('client_id', params.id)
        .eq('status', 'pending');

      if (pendingWaiversError) throw pendingWaiversError;

      // Transform the data
      const transformedPendingWaivers = pendingWaiversData?.map(pw => ({
        ...pw,
        waiver: Array.isArray(pw.waivers) ? pw.waivers[0] : pw.waivers
      })) || [];

      setPendingWaivers(transformedPendingWaivers);

      // Load available waivers
      const { data: availableWaiversData, error: availableWaiversError } = await supabase
        .from('waivers')
        .select('*')
        .eq('is_active', true);

      if (availableWaiversError) throw availableWaiversError;
      setAvailableWaivers(availableWaiversData || []);

    } catch (error) {
      console.error('Error loading waivers:', error);
      toast.error('Failed to load waivers');
    } finally {
      setWaiversLoading(false);
    }
  };

  const assignWaiver = async (waiverId: string) => {
    setAssigningWaiver(true);
    try {
      const response = await fetch(`/api/clients/${params.id}/assign-waiver`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ waiverId }),
      });

      if (!response.ok) {
        throw new Error('Failed to assign waiver');
      }

      toast.success('Waiver assigned successfully! Push notification sent to client.');
      await loadWaivers(); // Reload waivers
    } catch (error) {
      console.error('Error assigning waiver:', error);
      toast.error('Failed to assign waiver');
    } finally {
      setAssigningWaiver(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertDescription>Client not found</AlertDescription>
        </Alert>
      </div>
    );
  }

  const portalUrl = `${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/client-portal/login`;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/dashboard/clients')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Clients
          </Button>
          <h1 className="text-3xl font-bold">{client.name}</h1>
          <Badge variant={client.status === 'active' ? 'default' : 'secondary'}>
            {client.status}
          </Badge>
        </div>
      </div>

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
                <p className="font-medium">{client.email || 'Not provided'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Phone</p>
                <p className="font-medium">{client.phone || 'Not provided'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Member Since</p>
                <p className="font-medium">{formatBritishDate(client.created_at)}</p>
              </div>
            </div>
            {client.date_of_birth && (
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Date of Birth</p>
                  <p className="font-medium">{formatBritishDate(client.date_of_birth)}</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Portal Access */}
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
                {!portalAccess.welcome_email_sent && client.email && (
                  <Button
                    onClick={sendWelcomeEmail}
                    disabled={sendingEmail}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {sendingEmail ? 'Sending...' : 'Send Welcome Email'}
                  </Button>
                )}
                {portalAccess.welcome_email_sent && client.email && !portalAccess.is_claimed && (
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

              {!client.email && (
                <Alert>
                  <AlertDescription>
                    Add an email address to this client's profile to send welcome emails.
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

      {/* Body Composition */}
      <BodyCompositionSection clientId={client.id} clientPhone={client.phone} />

      {/* Client Messages */}
      <ClientMessaging 
        clientId={client.id}
        clientName={client.name}
        clientEmail={client.email}
      />

      {/* Waivers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Waivers
          </CardTitle>
        </CardHeader>
        <CardContent>
          {waiversLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Signed Waivers */}
              {customerWaivers.length > 0 && (
                <div>
                  <h4 className="text-lg font-semibold mb-3">Signed Waivers</h4>
                  <div className="space-y-3">
                    {customerWaivers.map((customerWaiver) => (
                      <div key={customerWaiver.id} className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                        <div className="flex items-center gap-3">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                          <div>
                            <p className="font-medium">{customerWaiver.waiver.title}</p>
                            <p className="text-sm text-muted-foreground">
                              Signed on {formatBritishDateTime(customerWaiver.signed_at)}
                            </p>
                            <div className="flex gap-2 mt-1">
                              {customerWaiver.waiver.required_for?.map((req) => (
                                <Badge key={req} variant="secondary" className="text-xs">
                                  {req}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                        <Badge variant="default" className="bg-green-600">
                          Signed
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pending Waivers */}
              {pendingWaivers.length > 0 && (
                <div>
                  <h4 className="text-lg font-semibold mb-3">Pending Waivers</h4>
                  <div className="space-y-3">
                    {pendingWaivers.map((pendingWaiver) => (
                      <div key={pendingWaiver.id} className="flex items-center justify-between p-4 bg-orange-50 rounded-lg border border-orange-200">
                        <div className="flex items-center gap-3">
                          <Clock className="h-5 w-5 text-orange-600" />
                          <div>
                            <p className="font-medium">{pendingWaiver.waiver.title}</p>
                            <p className="text-sm text-muted-foreground">
                              Assigned on {formatBritishDateTime(pendingWaiver.assigned_at)}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Expires on {formatBritishDate(pendingWaiver.expires_at)}
                            </p>
                            <div className="flex gap-2 mt-1">
                              {pendingWaiver.waiver.required_for?.map((req) => (
                                <Badge key={req} variant="secondary" className="text-xs">
                                  {req}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-orange-600 border-orange-600">
                          Pending Signature
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Available Waivers to Assign */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-lg font-semibold">Available Waivers</h4>
                  <Button
                    onClick={() => window.open('/dashboard/settings/waivers', '_blank')}
                    variant="outline"
                    size="sm"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Manage Templates
                  </Button>
                </div>

                {availableWaivers.length === 0 ? (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      No waiver templates available. Create waiver templates first to assign them to clients.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-3">
                    {availableWaivers
                      .filter(waiver => 
                        !customerWaivers.some(cw => cw.waiver_id === waiver.id) &&
                        !pendingWaivers.some(pw => pw.waiver_id === waiver.id)
                      )
                      .map((waiver) => (
                        <div key={waiver.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
                          <div className="flex items-center gap-3">
                            <Clock className="h-5 w-5 text-orange-600" />
                            <div>
                              <p className="font-medium">{waiver.title}</p>
                              <p className="text-sm text-muted-foreground">
                                Version {waiver.version} • Created {formatBritishDate(waiver.created_at)}
                              </p>
                              <div className="flex gap-2 mt-1">
                                {waiver.required_for?.map((req) => (
                                  <Badge key={req} variant="secondary" className="text-xs">
                                    {req}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                          <Button
                            onClick={() => assignWaiver(waiver.id)}
                            disabled={assigningWaiver}
                            size="sm"
                          >
                            <Send className="h-4 w-4 mr-2" />
                            {assigningWaiver ? 'Assigning...' : 'Assign & Notify'}
                          </Button>
                        </div>
                      ))}
                    
                    {availableWaivers.every(waiver => 
                      customerWaivers.some(cw => cw.waiver_id === waiver.id) ||
                      pendingWaivers.some(pw => pw.waiver_id === waiver.id)
                    ) && (
                      <Alert>
                        <CheckCircle className="h-4 w-4" />
                        <AlertDescription>
                          All available waivers have been assigned to this client.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Additional Information */}
      {client.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{client.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}