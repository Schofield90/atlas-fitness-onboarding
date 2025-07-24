'use client';

import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

export default function SetupOrganization() {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [orgId, setOrgId] = useState('');
  const [result, setResult] = useState<any>(null);
  const router = useRouter();

  const supabase = typeof window !== 'undefined' && 
    process.env.NEXT_PUBLIC_SUPABASE_URL && 
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 
    createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ) : null;

  const createOrganizationAndUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.target as HTMLFormElement);
    const orgName = formData.get('orgName') as string;
    const ownerName = formData.get('ownerName') as string;
    const ownerEmail = formData.get('ownerEmail') as string;

    try {
      // Create organization using service role
      const response = await fetch('/api/debug/create-org', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgName,
          ownerName,
          ownerEmail
        })
      });

      const data = await response.json();

      if (response.ok) {
        setOrgId(data.organization.id);
        setResult(data);
        setStep(2);
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      alert('Failed to create organization');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const createSampleData = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/debug/seed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId: orgId })
      });

      const data = await response.json();
      setResult({ ...result, seedData: data });
      setStep(3);
    } catch (error) {
      alert('Failed to create sample data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">🏢 Setup Your Gym Organization</h1>
        
        {step === 1 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Create Your Gym Business</h2>
            <p className="text-gray-600 mb-6">
              You need to create an organization (your gym business) before you can use the booking system.
            </p>

            <form onSubmit={createOrganizationAndUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Gym/Business Name *
                </label>
                <input
                  type="text"
                  name="orgName"
                  defaultValue="Atlas Performance Gym"
                  required
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Atlas Performance Gym"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Your Name *
                </label>
                <input
                  type="text"
                  name="ownerName"
                  required
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Your full name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Your Email *
                </label>
                <input
                  type="email"
                  name="ownerEmail"
                  required
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="your@email.com"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`w-full py-3 px-4 rounded-lg font-medium ${
                  loading
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {loading ? 'Creating...' : 'Create Organization & Setup User'}
              </button>
            </form>
          </div>
        )}

        {step === 2 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-green-900 mb-4">
              ✅ Organization Created: {result?.organization?.name}
            </h3>
            <p className="text-sm text-green-700 mb-4">ID: <code>{orgId}</code></p>

            <button
              onClick={createSampleData}
              disabled={loading}
              className={`w-full py-3 px-4 rounded-lg font-medium ${
                loading
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {loading ? 'Creating Sample Data...' : 'Step 2: Create Fitness Programs & Classes'}
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-4">
                🎉 Setup Complete!
              </h3>
              <div className="space-y-2 text-sm">
                <p><strong>Programs Created:</strong> {result?.seedData?.programs}</p>
                <p><strong>Class Sessions:</strong> {result?.seedData?.sessions}</p>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">🚀 Test Your Booking System</h3>
              <div className="space-y-3">
                <a
                  href={`/book/public/${orgId}`}
                  target="_blank"
                  className="block w-full py-3 px-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium text-center"
                >
                  🎯 Test Public Booking Page (No Login Required)
                </a>

                <button
                  onClick={() => router.push('/booking')}
                  className="block w-full py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-center"
                >
                  📅 Go to Internal Booking System
                </button>

                <a
                  href="/booking/admin"
                  target="_blank"
                  className="block w-full py-3 px-4 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium text-center"
                >
                  ⚙️ Admin Panel (Manage Programs & Classes)
                </a>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold mb-2">📋 What's Been Created:</h4>
              <ul className="text-sm space-y-1">
                <li>• Your gym organization: <strong>{result?.organization?.name}</strong></li>
                <li>• 4 fitness programs with different pricing</li>
                <li>• 2 weeks of class schedules</li>
                <li>• Public booking page for customers</li>
                <li>• Admin panel for managing classes</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}