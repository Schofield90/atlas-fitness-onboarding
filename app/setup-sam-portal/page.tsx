'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Check, Copy, Mail, User } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function SetupSamPortalPage() {
  const [loading, setLoading] = useState(true);
  const [client, setClient] = useState<any>(null);
  const [portalAccess, setPortalAccess] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const supabase = createClientComponentClient();

  useEffect(() => {
    checkSamClient();
  }, []);

  const checkSamClient = async () => {
    try {
      // Check if Sam exists
      const { data: samClient, error } = await supabase
        .from('clients')
        .select('*')
        .eq('email', 'samschofield90@hotmail.co.uk')
        .single();

      if (error || !samClient) {
        console.log('Sam not found, checking by name...');
        const { data: byName } = await supabase
          .from('clients')
          .select('*')
          .eq('name', 'Sam Schofield')
          .single();
        
        if (byName) {
          setClient(byName);
          await checkPortalAccess(byName.id);
        } else {
          console.log('Sam not found at all');
        }
      } else {
        setClient(samClient);
        await checkPortalAccess(samClient.id);
      }
    } catch (error) {
      console.error('Error checking Sam:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkPortalAccess = async (clientId: string) => {
    const { data, error } = await supabase
      .from('client_portal_access')
      .select('*')
      .eq('client_id', clientId)
      .single();

    if (data) {
      setPortalAccess(data);
    }
  };

  const createPortalAccess = async () => {
    if (!client) return;

    setLoading(true);
    try {
      // Generate access code
      const accessCode = generateAccessCode();
      const magicToken = crypto.randomUUID();

      const { data, error } = await supabase
        .from('client_portal_access')
        .insert({
          client_id: client.id,
          organization_id: client.organization_id,
          access_code: accessCode,
          magic_link_token: magicToken,
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
        })
        .select()
        .single();

      if (error) throw error;
      setPortalAccess(data);
      toast.success('Portal access created!');
    } catch (error) {
      console.error('Error creating portal access:', error);
      toast.error('Failed to create portal access');
    } finally {
      setLoading(false);
    }
  };

  const generateAccessCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 12; i++) {
      if (i === 4 || i === 8) {
        code += '-';
      } else {
        code += chars[Math.floor(Math.random() * chars.length)];
      }
    }
    return code;
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
    if (!client || !portalAccess) return;

    setSendingEmail(true);
    try {
      const response = await fetch(`/api/clients/${client.id}/send-welcome`, {
        method: 'POST'
      });

      if (response.ok) {
        toast.success('Welcome email sent!');
        await checkPortalAccess(client.id);
      } else {
        toast.error('Failed to send email');
      }
    } catch (error) {
      console.error('Error sending email:', error);
      toast.error('Error sending email');
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

  const portalUrl = `${window.location.origin}/client-portal`;
  const magicLink = portalAccess ? `${window.location.origin}/client-portal/claim?token=${portalAccess.magic_link_token}` : '';

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">Setup Sam Schofield Portal Access</h1>

      {/* Client Info */}
      <Card>
        <CardHeader>
          <CardTitle>Client Information</CardTitle>
        </CardHeader>
        <CardContent>
          {client ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Name:</span> {client.name}
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Email:</span> {client.email || 'Not set'}
              </div>
              <div>
                <span className="font-medium">Status:</span> {client.status}
              </div>
              <div>
                <span className="font-medium">ID:</span> {client.id}
              </div>
            </div>
          ) : (
            <Alert>
              <AlertDescription>
                Sam Schofield client not found. Please create the client first.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Portal Access */}
      {client && (
        <Card>
          <CardHeader>
            <CardTitle>Portal Access</CardTitle>
          </CardHeader>
          <CardContent>
            {portalAccess ? (
              <div className="space-y-4">
                <Alert className="bg-green-50 border-green-200">
                  <Check className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    Portal access is set up!
                  </AlertDescription>
                </Alert>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Access Code</label>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="flex-1 p-2 bg-gray-100 rounded font-mono">
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
                  </div>

                  <div>
                    <label className="text-sm font-medium">Magic Link</label>
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="text"
                        value={magicLink}
                        readOnly
                        className="flex-1 p-2 text-sm bg-gray-100 rounded"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(magicLink)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Portal Login URL</label>
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="text"
                        value={`${portalUrl}/login`}
                        readOnly
                        className="flex-1 p-2 text-sm bg-gray-100 rounded"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(`${portalUrl}/login`, '_blank')}
                      >
                        Open
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={() => window.open(magicLink, '_blank')}
                    className="flex-1"
                  >
                    Test Magic Link Login
                  </Button>
                  {client.email && (
                    <Button
                      onClick={sendWelcomeEmail}
                      variant="outline"
                      disabled={sendingEmail}
                    >
                      {sendingEmail ? 'Sending...' : 'Send Welcome Email'}
                    </Button>
                  )}
                </div>

                <div className="text-sm text-muted-foreground">
                  <p>Status: {portalAccess.is_claimed ? 'Claimed' : 'Unclaimed'}</p>
                  <p>Expires: {new Date(portalAccess.expires_at).toLocaleDateString()}</p>
                  {portalAccess.welcome_email_sent && (
                    <p>Welcome email sent: {new Date(portalAccess.welcome_email_sent_at).toLocaleString()}</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <Alert>
                  <AlertDescription>
                    No portal access found for Sam. Click below to create it.
                  </AlertDescription>
                </Alert>
                <Button onClick={createPortalAccess} className="w-full">
                  Create Portal Access
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Quick Links */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Links for Testing</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => window.open('/client-portal/login', '_blank')}
          >
            Open Client Portal Login Page
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => window.open('/client/booking', '_blank')}
          >
            Open Client Booking Page
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => window.open('/client/dashboard', '_blank')}
          >
            Open Client Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}