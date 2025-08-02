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
      // First, let's check all clients to see what's in the table
      const { data: allClients, error: allError } = await supabase
        .from('clients')
        .select('id, name, email, organization_id')
        .order('created_at', { ascending: false });
      
      console.log('All clients:', allClients);
      console.log('Total clients found:', allClients?.length || 0);

      // Check if Sam exists by email
      const { data: samClient, error } = await supabase
        .from('clients')
        .select('*')
        .eq('email', 'samschofield90@hotmail.co.uk')
        .maybeSingle();

      if (error) {
        console.error('Error searching by email:', error);
      }

      if (!samClient) {
        console.log('Sam not found by email, checking by name...');
        // Try by full name
        const { data: byName, error: nameError } = await supabase
          .from('clients')
          .select('*')
          .or('name.eq.Sam Schofield,and(first_name.eq.Sam,last_name.eq.Schofield)')
          .maybeSingle();
        
        if (nameError) {
          console.error('Error searching by name:', nameError);
        }
        
        if (!byName) {
          // Try case-insensitive search on both name fields
          const { data: byNameInsensitive } = await supabase
            .from('clients')
            .select('*')
            .or('name.ilike.%sam%schofield%,and(first_name.ilike.%sam%,last_name.ilike.%schofield%)');
          
          console.log('Case-insensitive search results:', byNameInsensitive);
          
          if (byNameInsensitive && byNameInsensitive.length > 0) {
            setClient(byNameInsensitive[0]);
            await checkPortalAccess(byNameInsensitive[0].id);
          } else {
            console.log('Sam not found at all. Available clients:', allClients?.map(c => ({ 
              name: c.name, 
              email: c.email 
            })));
          }
        } else {
          setClient(byName);
          await checkPortalAccess(byName.id);
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
      const response = await fetch('/api/setup/create-portal-access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          clientId: client.id
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create portal access');
      }

      setPortalAccess(data.portalAccess);
      alert('Portal access created!');
    } catch (error: any) {
      console.error('Error creating portal access:', error);
      alert('Failed to create portal access: ' + error.message);
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

  const createSamClient = async () => {
    setLoading(true);
    try {
      // Call API endpoint to create client with admin privileges
      const response = await fetch('/api/setup/create-sam-client', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create client');
      }

      const newClient = data.client;

      setClient(newClient);
      alert('Sam Schofield client created successfully!');
      // Refresh the page to show portal access options
      await checkSamClient();
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to create client');
    } finally {
      setLoading(false);
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
              <span className="font-medium">Name:</span> {client.name || `${client.first_name} ${client.last_name}`}
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
          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
              Sam Schofield client not found. Please create the client first.
            </div>
            <button
              onClick={createSamClient}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Sam Schofield Client'}
            </button>
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