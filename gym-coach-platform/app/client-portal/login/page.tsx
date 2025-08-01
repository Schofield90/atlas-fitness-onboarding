'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Key, ArrowRight } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function ClientPortalLoginPage() {
  const router = useRouter();
  const [accessCode, setAccessCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/client-portal/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: accessCode })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Invalid access code');
      }

      // Redirect to claim page with token
      router.push(`/client-portal/claim?token=${data.magic_link_token}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatAccessCode = (value: string) => {
    // Remove all non-alphanumeric characters
    const cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    
    // Add dashes every 4 characters
    const parts = [];
    for (let i = 0; i < cleaned.length; i += 4) {
      parts.push(cleaned.slice(i, i + 4));
    }
    
    return parts.join('-').slice(0, 14); // Max length with dashes
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="mx-auto h-12 w-12 bg-primary rounded-full flex items-center justify-center mb-4">
            <Key className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-3xl font-bold">Client Portal Access</h1>
          <p className="text-muted-foreground mt-2">
            Enter your access code to create your account
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Enter Access Code</CardTitle>
            <CardDescription>
              You should have received this code from your gym via email or in person
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="access-code">Access Code</Label>
                <Input
                  id="access-code"
                  type="text"
                  placeholder="XXXX-XXXX-XXXX"
                  value={accessCode}
                  onChange={(e) => setAccessCode(formatAccessCode(e.target.value))}
                  className="text-center font-mono text-lg"
                  maxLength={14}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Format: XXXX-XXXX-XXXX (letters and numbers only)
                </p>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={loading || accessCode.length !== 14}
              >
                {loading ? 'Verifying...' : 'Continue'}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          <p>Don't have an access code?</p>
          <p>Contact your gym to get started</p>
        </div>
      </div>
    </div>
  );
}