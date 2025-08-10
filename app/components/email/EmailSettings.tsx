'use client';

import { useState, useEffect } from 'react';
import Button from '@/app/components/ui/Button';
import Input from '@/app/components/ui/input';
import Label from '@/app/components/ui/label';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import Card from '@/app/components/ui/Card';
import { Switch } from '@/app/components/ui/switch';
import { Textarea } from '@/app/components/ui/textarea';
import { Mail, Send, CheckCircle, XCircle, AlertCircle, Settings, TestTube } from 'lucide-react';

export default function EmailSettings() {
  const [testMode, setTestMode] = useState(true);
  const [testEmail, setTestEmail] = useState('');
  const [testSubject, setTestSubject] = useState('Test Email from CRM');
  const [testContent, setTestContent] = useState('This is a test email to verify your email configuration is working correctly.');
  const [sending, setSending] = useState(false);
  const [configStatus, setConfigStatus] = useState<any>(null);
  const [sendResult, setSendResult] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    checkConfiguration();
    fetchStats();
  }, []);

  const checkConfiguration = async () => {
    try {
      const response = await fetch('/api/email/test');
      const data = await response.json();
      setConfigStatus(data);
      setTestMode(data.testMode);
    } catch (error) {
      console.error('Failed to check configuration:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/email/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const sendTestEmail = async () => {
    setSending(true);
    setSendResult(null);

    try {
      const response = await fetch('/api/email/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: testEmail,
          subject: testSubject,
          text: testContent,
          html: `<p>${testContent}</p>`,
          testMode
        }),
      });

      const result = await response.json();
      setSendResult(result);
      
      // Refresh stats after sending
      setTimeout(fetchStats, 1000);
    } catch (error: any) {
      setSendResult({
        success: false,
        error: error.message
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Configuration Status */}
      <Card>
        <div className="p-6 border-b border-gray-700">
          <h3 className="flex items-center gap-2 text-lg font-semibold">
            <Settings className="h-5 w-5" />
            Email Configuration Status
          </h3>
          <p className="text-sm text-gray-400 mt-1">
            Current email service configuration and status
          </p>
        </div>
        <div className="p-6">
          {configStatus && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Service Status</span>
                <div className="flex items-center gap-2">
                  {configStatus.success ? (
                    <>
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm text-green-600">Connected</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 text-red-500" />
                      <span className="text-sm text-red-600">Not Connected</span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Provider</span>
                <span className="text-sm text-muted-foreground">
                  {configStatus.configuration?.hasResendKey ? 'Resend' : 'Not Configured'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">From Email</span>
                <span className="text-sm text-muted-foreground">
                  {configStatus.configuration?.fromEmail || 'Not set'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Test Mode</span>
                <Switch
                  checked={testMode}
                  onCheckedChange={setTestMode}
                />
              </div>

              {!configStatus.configuration?.hasResendKey && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No email API key configured. Emails will be logged but not sent.
                    Add RESEND_API_KEY to your environment variables to enable email sending.
                  </AlertDescription>
                </Alert>
              )}

              {testMode && (
                <Alert>
                  <TestTube className="h-4 w-4" />
                  <AlertDescription>
                    Test mode is enabled. Emails will be logged but not actually sent.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Test Email Form */}
      <Card>
        <div className="p-6 border-b border-gray-700">
          <h3 className="flex items-center gap-2 text-lg font-semibold">
            <Mail className="h-5 w-5" />
            Send Test Email
          </h3>
          <p className="text-sm text-gray-400 mt-1">
            Test your email configuration by sending a test email
          </p>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="testEmail">Recipient Email</Label>
              <Input
                id="testEmail"
                type="email"
                placeholder="test@example.com"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="testSubject">Subject</Label>
              <Input
                id="testSubject"
                placeholder="Test Email Subject"
                value={testSubject}
                onChange={(e) => setTestSubject(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="testContent">Content</Label>
              <Textarea
                id="testContent"
                placeholder="Email content..."
                value={testContent}
                onChange={(e) => setTestContent(e.target.value)}
                rows={4}
              />
            </div>

            <Button
              onClick={sendTestEmail}
              disabled={!testEmail || sending}
              className="w-full"
            >
              {sending ? (
                <>Sending...</>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Test Email
                </>
              )}
            </Button>

            {sendResult && (
              <Alert className={sendResult.success ? 'border-green-500' : 'border-red-500'}>
                {sendResult.success ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
                <AlertDescription>
                  {sendResult.message || sendResult.error || 'Email sent successfully'}
                  {sendResult.messageId && (
                    <div className="mt-1 text-xs text-muted-foreground">
                      Message ID: {sendResult.messageId}
                    </div>
                  )}
                  {sendResult.provider && (
                    <div className="text-xs text-muted-foreground">
                      Provider: {sendResult.provider}
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </div>
        </div>
      </Card>

      {/* Email Statistics */}
      {stats && (
        <Card>
          <div className="p-6 border-b border-gray-700">
            <h3 className="text-lg font-semibold">Email Statistics (Last 30 Days)</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div>
                <div className="text-2xl font-bold">{stats.total || 0}</div>
                <div className="text-sm text-muted-foreground">Total</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">{stats.sent || 0}</div>
                <div className="text-sm text-muted-foreground">Sent</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">{stats.delivered || 0}</div>
                <div className="text-sm text-muted-foreground">Delivered</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">{stats.failed || 0}</div>
                <div className="text-sm text-muted-foreground">Failed</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-600">{stats.bounced || 0}</div>
                <div className="text-sm text-muted-foreground">Bounced</div>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}