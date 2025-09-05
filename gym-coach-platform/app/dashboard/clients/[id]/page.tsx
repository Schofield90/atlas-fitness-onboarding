'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Apple
} from 'lucide-react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { toast } from 'react-hot-toast';
import { formatBritishDate, formatBritishDateTime } from '@/lib/utils/british-format';
import { BodyCompositionSection } from '@/components/clients/BodyCompositionSection';

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

export default function ClientDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [client, setClient] = useState<Client | null>(null);
  const [portalAccess, setPortalAccess] = useState<PortalAccess | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const supabase = createClientComponentClient();

  useEffect(() => {
    if (params.id) {
      loadClient();
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

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="nutrition">
            <Apple className="w-4 h-4 mr-2" />
            Nutrition
          </TabsTrigger>
          <TabsTrigger value="body-composition">Body Composition</TabsTrigger>
          <TabsTrigger value="portal">Portal Access</TabsTrigger>
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
        </TabsContent>

        {/* Nutrition Tab */}
        <TabsContent value="nutrition" className="space-y-6">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Apple className="w-16 h-16 text-gray-300 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Client Nutrition Coach</h3>
              <p className="text-gray-600 text-center mb-6 max-w-md">
                Manage {client.name}'s nutrition plan and recommendations.
              </p>
              <Button 
                onClick={() => window.location.href = `/dashboard/clients/${client.id}/nutrition`}
              >
                <Apple className="h-4 w-4 mr-2" />
                Open Nutrition Coach
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Body Composition Tab */}
        <TabsContent value="body-composition" className="space-y-6">
          <BodyCompositionSection clientId={client.id} clientPhone={client.phone} />
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
        </TabsContent>
      </Tabs>
    </div>
  );
}