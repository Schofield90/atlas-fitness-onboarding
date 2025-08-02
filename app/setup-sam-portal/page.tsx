'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/app/lib/supabase/client';
import { Check, Copy, Mail, User } from 'lucide-react';

export default function SetupSamPortalPage() {
  const [loading, setLoading] = useState(true);
  const [client, setClient] = useState<any>(null);
  const [portalAccess, setPortalAccess] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const supabase = createClient();

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

      // Get organization ID - try to find it from existing data
      const { data: org } = await supabase
        .from('organizations')
        .select('id')
        .limit(1)
        .single();

      const { data, error } = await supabase
        .from('client_portal_access')
        .insert({
          client_id: client.id,
          organization_id: org?.id || null,
          access_code: accessCode,
          magic_link_token: magicToken,
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      setPortalAccess(data);
      alert('Portal access created!');
    } catch (error) {
      console.error('Error creating portal access:', error);
      alert('Failed to create portal access');
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
    } catch (error) {
      alert('Failed to copy');
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
        alert('Welcome email sent!');
        await checkPortalAccess(client.id);
      } else {
        alert('Failed to send email');
      }
    } catch (error) {
      console.error('Error sending email:', error);
      alert('Error sending email');
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
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Client Information</h2>
        {client ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-gray-500" />
              <span className="font-medium">Name:</span> {client.name}
            </div>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-gray-500" />
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
          <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
            Sam Schofield client not found. Please create the client first.
          </div>
        )}
      </div>

      {/* Portal Access */}
      {client && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Portal Access</h2>
          {portalAccess ? (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded p-4 flex items-center gap-2">
                <Check className="h-4 w-4 text-green-600" />
                <span className="text-green-800">Portal access is set up!</span>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Access Code</label>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="flex-1 p-2 bg-gray-100 rounded font-mono">
                      {portalAccess.access_code}
                    </code>
                    <button
                      className="px-3 py-2 border rounded hover:bg-gray-50"
                      onClick={() => copyToClipboard(portalAccess.access_code)}
                    >
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </button>
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
                    <button
                      className="px-3 py-2 border rounded hover:bg-gray-50"
                      onClick={() => copyToClipboard(magicLink)}
                    >
                      <Copy className="h-4 w-4" />
                    </button>
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
                    <button
                      className="px-3 py-2 border rounded hover:bg-gray-50"
                      onClick={() => window.open(`${portalUrl}/login`, '_blank')}
                    >
                      Open
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => window.open(magicLink, '_blank')}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Test Magic Link Login
                </button>
                {client.email && (
                  <button
                    onClick={sendWelcomeEmail}
                    className="px-4 py-2 border rounded hover:bg-gray-50"
                    disabled={sendingEmail}
                  >
                    {sendingEmail ? 'Sending...' : 'Send Welcome Email'}
                  </button>
                )}
              </div>

              <div className="text-sm text-gray-600">
                <p>Status: {portalAccess.is_claimed ? 'Claimed' : 'Unclaimed'}</p>
                <p>Expires: {new Date(portalAccess.expires_at).toLocaleDateString()}</p>
                {portalAccess.welcome_email_sent && (
                  <p>Welcome email sent: {new Date(portalAccess.welcome_email_sent_at).toLocaleString()}</p>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
                No portal access found for Sam. Click below to create it.
              </div>
              <button 
                onClick={createPortalAccess} 
                className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Create Portal Access
              </button>
            </div>
          )}
        </div>
      )}

      {/* Quick Links */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Quick Links for Testing</h2>
        <div className="space-y-2">
          <button
            className="w-full px-4 py-2 border rounded hover:bg-gray-50 text-left"
            onClick={() => window.open('/client-portal/login', '_blank')}
          >
            Open Client Portal Login Page
          </button>
          <button
            className="w-full px-4 py-2 border rounded hover:bg-gray-50 text-left"
            onClick={() => window.open('/client/booking', '_blank')}
          >
            Open Client Booking Page
          </button>
          <button
            className="w-full px-4 py-2 border rounded hover:bg-gray-50 text-left"
            onClick={() => window.open('/client/dashboard', '_blank')}
          >
            Open Client Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}