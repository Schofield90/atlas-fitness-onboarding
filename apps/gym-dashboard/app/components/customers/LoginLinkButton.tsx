'use client';

import { useState } from 'react';
import { Button } from '@/app/components/ui/button';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import { 
  Link, 
  Mail, 
  MessageSquare, 
  Copy, 
  CheckCircle, 
  Loader2,
  Send 
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';

interface LoginLinkButtonProps {
  customerId: string;
  customerEmail?: string;
  customerPhone?: string;
  customerName?: string;
}

export default function LoginLinkButton({ 
  customerId, 
  customerEmail, 
  customerPhone,
  customerName = 'Customer'
}: LoginLinkButtonProps) {
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sent, setSent] = useState<'email' | 'sms' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loginLink, setLoginLink] = useState<string | null>(null);

  // Generate login link
  const generateLoginLink = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/customers/generate-login-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate login link');
      }

      setLoginLink(data.loginLink);
      return data.loginLink;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Send via email
  const sendViaEmail = async () => {
    if (!customerEmail) {
      setError('No email address available for this customer');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const link = loginLink || await generateLoginLink();
      if (!link) return;

      const response = await fetch('/api/customers/send-login-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          method: 'email',
          email: customerEmail,
          loginLink: link,
          customerName,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send email');
      }

      setSent('email');
      setTimeout(() => setSent(null), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Send via SMS
  const sendViaSMS = async () => {
    if (!customerPhone) {
      setError('No phone number available for this customer');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const link = loginLink || await generateLoginLink();
      if (!link) return;

      const response = await fetch('/api/customers/send-login-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          method: 'sms',
          phone: customerPhone,
          loginLink: link,
          customerName,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send SMS');
      }

      setSent('sms');
      setTimeout(() => setSent(null), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Copy link
  const copyLink = async () => {
    setLoading(true);
    setError(null);

    try {
      const link = loginLink || await generateLoginLink();
      if (!link) return;

      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" disabled={loading}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Link className="h-4 w-4" />
            )}
            <span className="ml-2">Login Link</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Send Customer Login Link</DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          <DropdownMenuItem 
            onClick={sendViaEmail}
            disabled={!customerEmail || loading}
          >
            <Mail className="h-4 w-4 mr-2" />
            Send via Email
            {sent === 'email' && <CheckCircle className="h-3 w-3 ml-auto text-green-500" />}
          </DropdownMenuItem>

          <DropdownMenuItem 
            onClick={sendViaSMS}
            disabled={!customerPhone || loading}
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Send via SMS
            {sent === 'sms' && <CheckCircle className="h-3 w-3 ml-auto text-green-500" />}
          </DropdownMenuItem>

          <DropdownMenuItem onClick={copyLink}>
            <Copy className="h-4 w-4 mr-2" />
            Copy Link
            {copied && <CheckCircle className="h-3 w-3 ml-auto text-green-500" />}
          </DropdownMenuItem>

          <DropdownMenuSeparator />
          
          <DropdownMenuItem 
            onClick={() => window.open(`/customer-portal/${customerId}`, '_blank')}
          >
            <Send className="h-4 w-4 mr-2" />
            Open Portal
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {error && (
        <Alert variant="destructive" className="mt-2">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}