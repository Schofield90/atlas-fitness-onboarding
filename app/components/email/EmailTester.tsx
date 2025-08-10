'use client';

import { useState } from 'react';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Badge } from '@/app/components/ui/badge';
import { 
  Send, 
  Eye, 
  Shield, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Loader2,
  RefreshCw,
  Mail,
  Zap
} from 'lucide-react';

interface SpamCheckResult {
  score: number;
  details: string[];
  passed: boolean;
}

interface EmailPreview {
  html: string;
  text: string;
  subject: string;
}

export default function EmailTester() {
  const [testEmail, setTestEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [template, setTemplate] = useState('custom');
  const [loading, setLoading] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<EmailPreview | null>(null);
  const [spamCheck, setSpamCheck] = useState<SpamCheckResult | null>(null);
  const [activeTab, setActiveTab] = useState('compose');

  // Available email templates
  const templates = [
    { value: 'custom', label: 'Custom Email' },
    { value: 'welcome', label: 'Welcome Email' },
    { value: 'booking-confirmation', label: 'Booking Confirmation' },
    { value: 'reminder', label: 'Class Reminder' },
    { value: 'follow-up', label: 'Follow Up' },
    { value: 'promotional', label: 'Promotional' },
  ];

  // Load template content
  const loadTemplate = (templateValue: string) => {
    setTemplate(templateValue);
    
    const templateContent: Record<string, { subject: string; content: string }> = {
      welcome: {
        subject: 'Welcome to Atlas Fitness! 🎉',
        content: `Hi {{name}},

Welcome to Atlas Fitness! We're thrilled to have you join our fitness community.

Here's what you can expect:
- Access to all our premium facilities
- Expert trainers ready to help you reach your goals
- A supportive community of fitness enthusiasts

Your first class is on us! Book it here: {{booking_link}}

If you have any questions, just reply to this email or call us at {{phone}}.

Let's crush those fitness goals together!

Best,
The Atlas Fitness Team`
      },
      'booking-confirmation': {
        subject: 'Class Booking Confirmed - {{class_name}}',
        content: `Hi {{name}},

Great news! Your booking is confirmed.

📅 Class: {{class_name}}
📍 Location: {{location}}
🕐 Date & Time: {{date_time}}
👤 Instructor: {{instructor}}

What to bring:
- Water bottle
- Towel
- Your energy!

Need to cancel? You can do so up to 24 hours before the class.

See you there!

The Atlas Fitness Team`
      },
      reminder: {
        subject: 'Class Reminder: {{class_name}} Tomorrow',
        content: `Hi {{name}},

Just a friendly reminder about your upcoming class:

📅 {{class_name}}
🕐 Tomorrow at {{time}}
📍 {{location}}

We're looking forward to seeing you!

The Atlas Fitness Team`
      },
      'follow-up': {
        subject: 'How was your experience at Atlas Fitness?',
        content: `Hi {{name}},

We hope you enjoyed your recent visit to Atlas Fitness!

We'd love to hear about your experience. Your feedback helps us improve and provide the best possible service.

How would you rate your visit? Just reply to this email with your thoughts.

Also, if you haven't already, consider joining our membership program for exclusive benefits:
- Unlimited classes
- Priority booking
- Member-only events
- 20% off personal training

Learn more: {{membership_link}}

Thanks for being part of our community!

Best,
The Atlas Fitness Team`
      },
      promotional: {
        subject: '🔥 Limited Time: 30% Off Memberships',
        content: `Hi {{name}},

Ready to take your fitness journey to the next level?

For this week only, we're offering 30% off all membership plans!

✅ Unlimited classes
✅ Full facility access
✅ Free fitness assessment
✅ Nutrition guidance
✅ Member app access

This offer ends {{end_date}}, so don't miss out!

Claim your discount: {{signup_link}}

Questions? Reply to this email or call us at {{phone}}.

Let's make this your strongest year yet!

The Atlas Fitness Team`
      },
    };

    if (templateValue !== 'custom' && templateContent[templateValue]) {
      setSubject(templateContent[templateValue].subject);
      setContent(templateContent[templateValue].content);
    }
  };

  // Send test email
  const sendTestEmail = async () => {
    if (!testEmail || !subject || !content) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError(null);
    setTestResult(null);

    try {
      const response = await fetch('/api/email/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: testEmail,
          subject,
          content,
          template,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send test email');
      }

      setTestResult('success');
      setTimeout(() => setTestResult(null), 5000);
    } catch (err: any) {
      setError(err.message);
      setTestResult('error');
    } finally {
      setLoading(false);
    }
  };

  // Preview email
  const previewEmail = async () => {
    if (!subject || !content) {
      setError('Please provide subject and content');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/email/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject,
          content,
          template,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate preview');
      }

      setPreview(data);
      setActiveTab('preview');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Check spam score
  const checkSpamScore = async () => {
    if (!subject || !content) {
      setError('Please provide subject and content');
      return;
    }

    setLoading(true);
    setError(null);
    setSpamCheck(null);

    try {
      const response = await fetch('/api/email/spam-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject,
          content,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to check spam score');
      }

      setSpamCheck(data);
      setActiveTab('spam');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Email Testing Tools
        </CardTitle>
        <CardDescription>
          Test email delivery, preview templates, and check spam scores
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="compose">Compose</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
            <TabsTrigger value="spam">Spam Check</TabsTrigger>
          </TabsList>

          <TabsContent value="compose" className="space-y-4">
            <div className="space-y-4">
              {/* Template Selection */}
              <div className="space-y-2">
                <Label htmlFor="template">Email Template</Label>
                <select
                  id="template"
                  value={template}
                  onChange={(e) => loadTemplate(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2"
                >
                  {templates.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Test Email */}
              <div className="space-y-2">
                <Label htmlFor="test-email">Send Test To</Label>
                <Input
                  id="test-email"
                  type="email"
                  placeholder="test@example.com"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                />
              </div>

              {/* Subject */}
              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  placeholder="Email subject..."
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Use variables like {'{{name}}'}, {'{{class_name}}'}, etc.
                </p>
              </div>

              {/* Content */}
              <div className="space-y-2">
                <Label htmlFor="content">Content</Label>
                <Textarea
                  id="content"
                  placeholder="Email content..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={10}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button
                  onClick={sendTestEmail}
                  disabled={loading}
                  className="flex-1"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  <span className="ml-2">Send Test</span>
                </Button>
                <Button
                  onClick={previewEmail}
                  variant="outline"
                  disabled={loading}
                >
                  <Eye className="h-4 w-4" />
                  <span className="ml-2">Preview</span>
                </Button>
                <Button
                  onClick={checkSpamScore}
                  variant="outline"
                  disabled={loading}
                >
                  <Shield className="h-4 w-4" />
                  <span className="ml-2">Check Spam</span>
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="preview" className="space-y-4">
            {preview ? (
              <div className="space-y-4">
                <div className="rounded-lg border p-4">
                  <h3 className="font-semibold mb-2">Subject Line</h3>
                  <p className="text-sm">{preview.subject}</p>
                </div>

                <div className="rounded-lg border p-4">
                  <h3 className="font-semibold mb-2">HTML Preview</h3>
                  <div 
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: preview.html }}
                  />
                </div>

                <div className="rounded-lg border p-4">
                  <h3 className="font-semibold mb-2">Plain Text Version</h3>
                  <pre className="text-sm whitespace-pre-wrap">{preview.text}</pre>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Click "Preview" in the Compose tab to see email preview
              </div>
            )}
          </TabsContent>

          <TabsContent value="spam" className="space-y-4">
            {spamCheck ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Spam Score</h3>
                  <Badge 
                    variant={spamCheck.passed ? 'default' : 'destructive'}
                    className="text-lg px-3 py-1"
                  >
                    {spamCheck.score}/10
                  </Badge>
                </div>

                <Alert className={spamCheck.passed ? 'border-green-500' : 'border-red-500'}>
                  <AlertDescription className="flex items-center gap-2">
                    {spamCheck.passed ? (
                      <>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        Your email passed the spam check!
                      </>
                    ) : (
                      <>
                        <XCircle className="h-4 w-4 text-red-500" />
                        Your email might be flagged as spam
                      </>
                    )}
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <h4 className="font-semibold">Check Results:</h4>
                  {spamCheck.details.map((detail, index) => (
                    <div key={index} className="flex items-start gap-2 text-sm">
                      {detail.includes('✓') ? (
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                      ) : detail.includes('⚠') ? (
                        <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500 mt-0.5" />
                      )}
                      <span>{detail.replace(/[✓⚠✗]/g, '').trim()}</span>
                    </div>
                  ))}
                </div>

                <Button
                  onClick={checkSpamScore}
                  variant="outline"
                  className="w-full"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span className="ml-2">Re-check Score</span>
                </Button>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Click "Check Spam" in the Compose tab to analyze your email
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Status Messages */}
        {testResult === 'success' && (
          <Alert className="mt-4 border-green-500">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>Test email sent successfully!</AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}