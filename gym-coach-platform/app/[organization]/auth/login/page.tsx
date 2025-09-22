"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Eye, EyeOff, Mail, Phone, ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

export default function ClientLogin() {
  const [showPassword, setShowPassword] = useState(false);
  const [loginMethod, setLoginMethod] = useState<'email' | 'phone'>('email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Welcome Back</CardTitle>
          <p className="text-muted-foreground">Sign in to book and manage your sessions</p>
        </CardHeader>
        <CardContent>
          <Tabs value={loginMethod} onValueChange={(v) => setLoginMethod(v as any)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="email" className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email
              </TabsTrigger>
              <TabsTrigger value="phone" className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                Phone
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="email" className="space-y-4">
              <EmailLoginForm loading={loading} setLoading={setLoading} error={error} setError={setError} />
            </TabsContent>
            
            <TabsContent value="phone" className="space-y-4">
              <PhoneLoginForm loading={loading} setLoading={setLoading} error={error} setError={setError} />
            </TabsContent>
          </Tabs>
          
          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Don't have an account?{' '}
              <button
                onClick={() => {
                  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
                  const isOnMembersSubdomain = hostname.includes('members.gymleadhub.co.uk') || hostname.includes('members.localhost');

                  if (isOnMembersSubdomain) {
                    router.push('/signup-simple');
                  } else {
                    const membersUrl = hostname.includes('localhost')
                      ? 'http://members.localhost:3000/signup-simple'
                      : 'https://members.gymleadhub.co.uk/signup-simple';
                    window.location.href = membersUrl;
                  }
                }}
                className="text-primary hover:underline font-medium"
              >
                Sign up here
              </button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function EmailLoginForm({ loading, setLoading, error, setError }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      // Redirect to appropriate dashboard based on current domain
      const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
      const isOnMembersSubdomain = hostname.includes('members.gymleadhub.co.uk') || hostname.includes('members.localhost');

      if (isOnMembersSubdomain) {
        router.push('/client/dashboard');
      } else {
        // Redirect to members subdomain for client access
        const membersUrl = hostname.includes('localhost')
          ? 'http://members.localhost:3000/client/dashboard'
          : 'https://members.gymleadhub.co.uk/client/dashboard';
        window.location.href = membersUrl;
      }
    } catch (err: any) {
      setError(err.message || 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 rounded-md bg-red-50 border border-red-200">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
      
      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-medium">
          Email address
        </label>
        <Input
          id="email"
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="password" className="text-sm font-medium">
          Password
        </label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <label className="flex items-center">
          <input type="checkbox" className="rounded border-gray-300" />
          <span className="ml-2 text-sm text-gray-600">Remember me</span>
        </label>
        <button type="button" className="text-sm text-primary hover:underline">
          Forgot password?
        </button>
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Signing in...' : 'Sign in'}
        <ArrowRight className="w-4 h-4 ml-2" />
      </Button>
    </form>
  );
}

function PhoneLoginForm({ loading, setLoading, error, setError }: any) {
  const [phone, setPhone] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const router = useRouter();

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Format phone number for UK
      const formattedPhone = phone.startsWith('0') 
        ? `+44${phone.slice(1)}` 
        : phone.startsWith('+') 
        ? phone 
        : `+44${phone}`;

      const { error } = await supabase.auth.signInWithOtp({
        phone: formattedPhone,
      });

      if (error) throw error;

      setCodeSent(true);
    } catch (err: any) {
      setError(err.message || 'Failed to send verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const formattedPhone = phone.startsWith('0') 
        ? `+44${phone.slice(1)}` 
        : phone.startsWith('+') 
        ? phone 
        : `+44${phone}`;

      const { error } = await supabase.auth.verifyOtp({
        phone: formattedPhone,
        token: verificationCode,
        type: 'sms',
      });

      if (error) throw error;

      // Redirect to appropriate dashboard based on current domain
      const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
      const isOnMembersSubdomain = hostname.includes('members.gymleadhub.co.uk') || hostname.includes('members.localhost');

      if (isOnMembersSubdomain) {
        router.push('/client/dashboard');
      } else {
        // Redirect to members subdomain for client access
        const membersUrl = hostname.includes('localhost')
          ? 'http://members.localhost:3000/client/dashboard'
          : 'https://members.gymleadhub.co.uk/client/dashboard';
        window.location.href = membersUrl;
      }
    } catch (err: any) {
      setError(err.message || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {!codeSent ? (
        <form onSubmit={handleSendCode} className="space-y-4">
          {error && (
            <div className="p-3 rounded-md bg-red-50 border border-red-200">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
          
          <div className="space-y-2">
            <label htmlFor="phone" className="text-sm font-medium">
              Phone number
            </label>
            <Input
              id="phone"
              type="tel"
              placeholder="07123 456789"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              className="w-full"
            />
            <p className="text-xs text-gray-500">We'll send you a verification code</p>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Sending code...' : 'Send verification code'}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </form>
      ) : (
        <form onSubmit={handleVerifyCode} className="space-y-4">
          {error && (
            <div className="p-3 rounded-md bg-red-50 border border-red-200">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
          
          <div className="space-y-2">
            <label htmlFor="code" className="text-sm font-medium">
              Verification code
            </label>
            <Input
              id="code"
              type="text"
              placeholder="Enter 6-digit code"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              required
              className="w-full text-center text-lg tracking-wider"
              maxLength={6}
            />
            <p className="text-xs text-gray-500">Check your SMS messages for the code</p>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Verifying...' : 'Verify & Sign in'}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>

          <button
            type="button"
            onClick={() => setCodeSent(false)}
            className="w-full text-sm text-gray-600 hover:text-gray-800"
          >
            Didn't receive the code? Try again
          </button>
        </form>
      )}
    </>
  );
}