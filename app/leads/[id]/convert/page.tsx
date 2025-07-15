'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createSupabaseClient } from '@/lib/supabase';
import { Lead, MembershipPlan, UserProfile } from '@/lib/supabase';
import { ArrowLeft, User, MapPin, Heart, CreditCard, Users } from 'lucide-react';

const clientConversionSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().optional(),
  date_of_birth: z.string().optional(),
  gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']).optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  postcode: z.string().optional(),
  country: z.string().optional().default('UK'),
  emergency_name: z.string().optional(),
  emergency_phone: z.string().optional(),
  emergency_relationship: z.string().optional(),
  medical_conditions: z.string().optional(),
  medications: z.string().optional(),
  fitness_level: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  goals: z.string().optional(),
  membership_plan_id: z.string().min(1, 'Membership plan is required'),
  start_date: z.string().min(1, 'Start date is required'),
  billing_date: z.coerce.number().min(1).max(31),
  assigned_trainer: z.string().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

type ClientConversionData = z.infer<typeof clientConversionSchema>;

export default function ConvertLeadPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [lead, setLead] = useState<Lead | null>(null);
  const [membershipPlans, setMembershipPlans] = useState<MembershipPlan[]>([]);
  const [trainers, setTrainers] = useState<UserProfile[]>([]);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [converting, setConverting] = useState(false);

  const {
    register,
    handleSubmit,
    // watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(clientConversionSchema),
    defaultValues: {
      country: 'UK',
      start_date: new Date().toISOString().split('T')[0],
      billing_date: 1,
    },
  });

  const loadData = useCallback(async () => {
    try {
      const supabase = createSupabaseClient();
      const { id } = await params;
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (!profile) return;
      setCurrentUser(profile);

      // Get lead data
      const leadResponse = await fetch(`/api/leads/${id}`);
      const leadData = await leadResponse.json();
      
      if (leadResponse.ok && leadData.lead) {
        setLead(leadData.lead);
        
        // Pre-fill form with lead data
        setValue('first_name', leadData.lead.first_name);
        setValue('last_name', leadData.lead.last_name);
        setValue('email', leadData.lead.email || '');
        setValue('phone', leadData.lead.phone || '');
        setValue('goals', leadData.lead.goals || '');
      }

      // Get membership plans
      const plansResponse = await fetch(`/api/membership-plans?organization_id=${profile.organization_id}&is_active=true`);
      const plansData = await plansResponse.json();
      
      if (plansResponse.ok && plansData.plans) {
        setMembershipPlans(plansData.plans);
      }

      // Get trainers
      const { data: trainersData } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .in('role', ['admin', 'staff']);
      
      setTrainers(trainersData || []);

    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, [params, setValue]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onSubmit = async (data: ClientConversionData) => {
    if (!currentUser) return;

    setConverting(true);
    
    try {
      const { id } = await params;
      const response = await fetch(`/api/leads/${id}/convert`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          user_id: currentUser.id,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        router.push(`/clients/${result.client.id}`);
      } else {
        console.error('Conversion failed:', result.error);
        alert('Failed to convert lead: ' + result.error);
      }
    } catch (error) {
      console.error('Error converting lead:', error);
      alert('Failed to convert lead. Please try again.');
    } finally {
      setConverting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Lead not found</p>
          <button
            onClick={() => router.back()}
            className="mt-4 inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center">
              <button
                onClick={() => router.back()}
                className="mr-4 p-2 text-gray-400 hover:text-gray-600"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Convert Lead to Client</h1>
                <p className="text-gray-600">
                  {lead.first_name} {lead.last_name} • {lead.source}
                  {lead.qualification_score && (
                    <span className="ml-2 text-green-600">
                      Score: {lead.qualification_score}/100
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* Personal Information */}
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center mb-6">
              <User className="h-5 w-5 text-gray-400 mr-2" />
              <h2 className="text-lg font-medium text-gray-900">Personal Information</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">First Name</label>
                <input
                  type="text"
                  {...register('first_name')}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
                {errors.first_name && (
                  <p className="mt-1 text-sm text-red-600">{errors.first_name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Last Name</label>
                <input
                  type="text"
                  {...register('last_name')}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
                {errors.last_name && (
                  <p className="mt-1 text-sm text-red-600">{errors.last_name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  {...register('email')}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Phone</label>
                <input
                  type="tel"
                  {...register('phone')}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
                <input
                  type="date"
                  {...register('date_of_birth')}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Gender</label>
                <select
                  {...register('gender')}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                  <option value="prefer_not_to_say">Prefer not to say</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Fitness Level</label>
                <select
                  {...register('fitness_level')}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select fitness level</option>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Assigned Trainer</label>
                <select
                  {...register('assigned_trainer')}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select trainer</option>
                  {trainers.map((trainer) => (
                    <option key={trainer.id} value={trainer.id}>
                      {trainer.full_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700">Goals</label>
              <textarea
                {...register('goals')}
                rows={3}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Client's fitness goals..."
              />
            </div>
          </div>

          {/* Address Information */}
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center mb-6">
              <MapPin className="h-5 w-5 text-gray-400 mr-2" />
              <h2 className="text-lg font-medium text-gray-900">Address Information</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Address</label>
                <input
                  type="text"
                  {...register('address')}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">City</label>
                <input
                  type="text"
                  {...register('city')}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Postcode</label>
                <input
                  type="text"
                  {...register('postcode')}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center mb-6">
              <Heart className="h-5 w-5 text-gray-400 mr-2" />
              <h2 className="text-lg font-medium text-gray-900">Emergency Contact</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <input
                  type="text"
                  {...register('emergency_name')}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Phone</label>
                <input
                  type="tel"
                  {...register('emergency_phone')}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Relationship</label>
                <input
                  type="text"
                  {...register('emergency_relationship')}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Health Information */}
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center mb-6">
              <Heart className="h-5 w-5 text-gray-400 mr-2" />
              <h2 className="text-lg font-medium text-gray-900">Health Information</h2>
            </div>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">Medical Conditions</label>
                <textarea
                  {...register('medical_conditions')}
                  rows={3}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Any medical conditions or injuries..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Medications</label>
                <textarea
                  {...register('medications')}
                  rows={3}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Current medications..."
                />
              </div>
            </div>
          </div>

          {/* Membership Information */}
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center mb-6">
              <CreditCard className="h-5 w-5 text-gray-400 mr-2" />
              <h2 className="text-lg font-medium text-gray-900">Membership Information</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">Membership Plan</label>
                <select
                  {...register('membership_plan_id')}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select membership plan</option>
                  {membershipPlans.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name} - £{plan.price}/{plan.billing_cycle}
                    </option>
                  ))}
                </select>
                {errors.membership_plan_id && (
                  <p className="mt-1 text-sm text-red-600">{errors.membership_plan_id.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Start Date</label>
                <input
                  type="date"
                  {...register('start_date')}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
                {errors.start_date && (
                  <p className="mt-1 text-sm text-red-600">{errors.start_date.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Billing Date</label>
                <select
                  {...register('billing_date')}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                    <option key={day} value={day}>
                      {day}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center mb-6">
              <Users className="h-5 w-5 text-gray-400 mr-2" />
              <h2 className="text-lg font-medium text-gray-900">Additional Notes</h2>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Notes</label>
              <textarea
                {...register('notes')}
                rows={4}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Any additional notes about the client..."
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={converting}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              {converting ? 'Converting...' : 'Convert to Client'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}