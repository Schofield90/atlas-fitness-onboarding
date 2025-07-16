'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createSupabaseClient } from '@/lib/supabase';
import { UserProfile } from '@/lib/supabase';
import { 
  ArrowLeft, 
  Plus, 
  X,
  Target,
  Users,
  Image,
  Globe,
  Facebook,
  Instagram,
  Save,
  Settings,
} from 'lucide-react';

const campaignSchema = z.object({
  name: z.string().min(1, 'Campaign name is required'),
  objective: z.enum(['LEAD_GENERATION', 'REACH', 'TRAFFIC', 'ENGAGEMENT', 'CONVERSIONS', 'BRAND_AWARENESS']),
  platform: z.enum(['facebook', 'instagram', 'google', 'other']),
  budget_type: z.enum(['daily', 'lifetime']),
  budget_amount: z.coerce.number().positive('Budget must be positive'),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().optional(),
  target_audience: z.object({
    age_min: z.coerce.number().min(18).max(100).optional(),
    age_max: z.coerce.number().min(18).max(100).optional(),
    genders: z.array(z.enum(['male', 'female', 'all'])).optional(),
    locations: z.array(z.string()).optional(),
    interests: z.array(z.string()).optional(),
    languages: z.array(z.string()).optional(),
  }).optional(),
  ad_creative: z.object({
    headline: z.string().optional(),
    description: z.string().optional(),
    image_urls: z.array(z.string()).optional(),
    video_url: z.string().optional(),
    call_to_action: z.string().optional(),
    destination_url: z.string().url().optional(),
  }).optional(),
  lead_form_fields: z.array(z.object({
    field_name: z.string(),
    field_type: z.enum(['text', 'email', 'phone', 'select', 'checkbox']),
    required: z.boolean(),
    options: z.array(z.string()).optional(),
  })).optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

type CampaignFormData = z.infer<typeof campaignSchema>;

export default function NewCampaignPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [interests, setInterests] = useState<Array<{ id: string; name: string }>>([]);
  const [interestSearch, setInterestSearch] = useState('');

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    formState: { errors },
  } = useForm<CampaignFormData>({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      platform: 'facebook',
      budget_type: 'daily',
      budget_amount: 10,
      start_date: new Date().toISOString().split('T')[0],
      target_audience: {
        age_min: 18,
        age_max: 65,
        genders: ['all'],
        locations: ['GB'],
        interests: [],
        languages: ['en'],
      },
      ad_creative: {
        call_to_action: 'Learn More',
      },
      lead_form_fields: [
        { field_name: 'first_name', field_type: 'text', required: true },
        { field_name: 'last_name', field_type: 'text', required: true },
        { field_name: 'email', field_type: 'email', required: true },
        { field_name: 'phone', field_type: 'phone', required: false },
      ],
      tags: [],
    },
  });

  const { fields: leadFormFields, append: appendLeadFormField, remove: removeLeadFormField } = useFieldArray({
    control,
    name: 'lead_form_fields',
  });

  const loadUserData = useCallback(async () => {
    try {
      const supabase = createSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/');
        return;
      }

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (!profile) {
        router.push('/');
        return;
      }

      setCurrentUser(profile);
    } catch (error) {
      console.error('Error loading user data:', error);
      router.push('/');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  const searchInterests = async (query: string) => {
    if (!query || query.length < 2) {
      setInterests([]);
      return;
    }

    try {
      // Mock interests for now - in production, this would call Meta API
      const mockInterests = [
        { id: '1', name: 'Fitness' },
        { id: '2', name: 'Health and wellness' },
        { id: '3', name: 'Gym' },
        { id: '4', name: 'Weight loss' },
        { id: '5', name: 'Bodybuilding' },
        { id: '6', name: 'Yoga' },
        { id: '7', name: 'Running' },
        { id: '8', name: 'Nutrition' },
        { id: '9', name: 'Personal training' },
        { id: '10', name: 'CrossFit' },
      ].filter(interest => 
        interest.name.toLowerCase().includes(query.toLowerCase())
      );

      setInterests(mockInterests);
    } catch (error) {
      console.error('Error searching interests:', error);
    }
  };

  const onSubmit = async (data: CampaignFormData) => {
    if (!currentUser) return;

    setCreating(true);
    try {
      const response = await fetch('/api/campaigns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          organization_id: currentUser.organization_id,
          user_id: currentUser.id,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        router.push(`/campaigns/${result.campaign.id}`);
      } else {
        console.error('Error creating campaign:', result.error);
        alert('Failed to create campaign: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error creating campaign:', error);
      alert('Failed to create campaign. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  // Platform icon helper (reserved for future use)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'facebook': return <Facebook className="h-5 w-5" />;
      case 'instagram': return <Instagram className="h-5 w-5" />;
      case 'google': return <Globe className="h-5 w-5" />;
      default: return <Globe className="h-5 w-5" />;
    }
  };

  const getStepIcon = (step: number) => {
    switch (step) {
      case 1: return <Target className="h-5 w-5" />;
      case 2: return <Users className="h-5 w-5" />;
      {/* eslint-disable-next-line jsx-a11y/alt-text */}
      case 3: return <Image className="h-5 w-5" />;
      case 4: return <Settings className="h-5 w-5" />;
      default: return <Target className="h-5 w-5" />;
    }
  };

  const steps = [
    { id: 1, name: 'Campaign Setup', description: 'Basic campaign configuration' },
    { id: 2, name: 'Audience', description: 'Target audience settings' },
    { id: 3, name: 'Creative', description: 'Ad creative and messaging' },
    { id: 4, name: 'Lead Form', description: 'Lead capture form fields' },
  ];

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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <button
                onClick={() => router.push('/campaigns')}
                className="flex items-center text-gray-500 hover:text-gray-700"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Back to Campaigns
              </button>
              <div className="ml-6">
                <h1 className="text-2xl font-bold text-gray-900">Create New Campaign</h1>
                <p className="text-gray-600">Set up your marketing campaign</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                type="button"
                onClick={() => router.push('/campaigns')}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="campaign-form"
                disabled={creating}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                <Save className="h-4 w-4 mr-2" />
                {creating ? 'Creating...' : 'Create Campaign'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className="flex items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                  currentStep >= step.id
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'border-gray-300 text-gray-500'
                }`}>
                  {getStepIcon(step.id)}
                </div>
                <div className="ml-3">
                  <p className={`text-sm font-medium ${
                    currentStep >= step.id ? 'text-blue-600' : 'text-gray-500'
                  }`}>
                    {step.name}
                  </p>
                  <p className="text-xs text-gray-500">{step.description}</p>
                </div>
              </div>
              {index < steps.length - 1 && (
                <div className={`flex-1 h-0.5 mx-8 ${
                  currentStep > step.id ? 'bg-blue-600' : 'bg-gray-300'
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* Form */}
        <div className="bg-white shadow rounded-lg">
          <form id="campaign-form" onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
            {/* Step 1: Campaign Setup */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Campaign Setup</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Campaign Name
                      </label>
                      <input
                        {...register('name')}
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter campaign name"
                      />
                      {errors.name && (
                        <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Platform
                      </label>
                      <select
                        {...register('platform')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="facebook">Facebook</option>
                        <option value="instagram">Instagram</option>
                        <option value="google">Google</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Objective
                      </label>
                      <select
                        {...register('objective')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="LEAD_GENERATION">Lead Generation</option>
                        <option value="REACH">Reach</option>
                        <option value="TRAFFIC">Traffic</option>
                        <option value="ENGAGEMENT">Engagement</option>
                        <option value="CONVERSIONS">Conversions</option>
                        <option value="BRAND_AWARENESS">Brand Awareness</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Budget Type
                      </label>
                      <select
                        {...register('budget_type')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="daily">Daily Budget</option>
                        <option value="lifetime">Lifetime Budget</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Budget Amount (£)
                      </label>
                      <input
                        {...register('budget_amount')}
                        type="number"
                        step="0.01"
                        min="1"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        placeholder="10.00"
                      />
                      {errors.budget_amount && (
                        <p className="mt-1 text-sm text-red-600">{errors.budget_amount.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Start Date
                      </label>
                      <input
                        {...register('start_date')}
                        type="date"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      />
                      {errors.start_date && (
                        <p className="mt-1 text-sm text-red-600">{errors.start_date.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        End Date (Optional)
                      </label>
                      <input
                        {...register('end_date')}
                        type="date"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Audience Targeting */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Target Audience</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Age Range
                      </label>
                      <div className="flex items-center space-x-3">
                        <input
                          {...register('target_audience.age_min')}
                          type="number"
                          min="18"
                          max="100"
                          className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                          placeholder="18"
                        />
                        <span className="text-gray-500">to</span>
                        <input
                          {...register('target_audience.age_max')}
                          type="number"
                          min="18"
                          max="100"
                          className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                          placeholder="65"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Gender
                      </label>
                      <div className="flex items-center space-x-4">
                        <label className="flex items-center">
                          <input
                            {...register('target_audience.genders')}
                            type="checkbox"
                            value="all"
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="ml-2 text-sm text-gray-700">All</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            {...register('target_audience.genders')}
                            type="checkbox"
                            value="male"
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="ml-2 text-sm text-gray-700">Male</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            {...register('target_audience.genders')}
                            type="checkbox"
                            value="female"
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="ml-2 text-sm text-gray-700">Female</span>
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Locations
                      </label>
                      <input
                        {...register('target_audience.locations.0')}
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        placeholder="GB, US, CA"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Enter country codes separated by commas
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Languages
                      </label>
                      <input
                        {...register('target_audience.languages.0')}
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        placeholder="en, es, fr"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Enter language codes separated by commas
                      </p>
                    </div>
                  </div>

                  <div className="mt-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Interests
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={interestSearch}
                        onChange={(e) => {
                          setInterestSearch(e.target.value);
                          searchInterests(e.target.value);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Search interests..."
                      />
                      
                      {interests.length > 0 && (
                        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                          {interests.map((interest) => (
                            <button
                              key={interest.id}
                              type="button"
                              onClick={() => {
                                const currentInterests = watch('target_audience.interests') || [];
                                if (!currentInterests.includes(interest.name)) {
                                  setValue('target_audience.interests', [...currentInterests, interest.name]);
                                }
                                setInterestSearch('');
                                setInterests([]);
                              }}
                              className="w-full px-4 py-2 text-left hover:bg-gray-50 focus:bg-gray-50"
                            >
                              {interest.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <div className="mt-3 flex flex-wrap gap-2">
                      {(watch('target_audience.interests') || []).map((interest, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                        >
                          {interest}
                          <button
                            type="button"
                            onClick={() => {
                              const currentInterests = watch('target_audience.interests') || [];
                              setValue('target_audience.interests', currentInterests.filter((_, i) => i !== index));
                            }}
                            className="ml-1 text-blue-600 hover:text-blue-800"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Ad Creative */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Ad Creative</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Headline
                      </label>
                      <input
                        {...register('ad_creative.headline')}
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Transform Your Body at Atlas Fitness"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Call to Action
                      </label>
                      <select
                        {...register('ad_creative.call_to_action')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="Learn More">Learn More</option>
                        <option value="Sign Up">Sign Up</option>
                        <option value="Get Started">Get Started</option>
                        <option value="Contact Us">Contact Us</option>
                        <option value="Book Now">Book Now</option>
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Description
                      </label>
                      <textarea
                        {...register('ad_creative.description')}
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Join Atlas Fitness and achieve your fitness goals with our expert trainers and state-of-the-art equipment."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Image URL
                      </label>
                      <input
                        {...register('ad_creative.image_urls.0')}
                        type="url"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        placeholder="https://example.com/image.jpg"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Video URL (Optional)
                      </label>
                      <input
                        {...register('ad_creative.video_url')}
                        type="url"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        placeholder="https://example.com/video.mp4"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Destination URL
                      </label>
                      <input
                        {...register('ad_creative.destination_url')}
                        type="url"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        placeholder="https://atlasfitness.com/join"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Lead Form */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Lead Form Fields</h3>
                  
                  <div className="space-y-4">
                    {leadFormFields.map((field, index) => (
                      <div key={field.id} className="flex items-center space-x-4 p-4 border border-gray-200 rounded-md">
                        <div className="flex-1">
                          <input
                            {...register(`lead_form_fields.${index}.field_name`)}
                            type="text"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Field name"
                          />
                        </div>
                        <div className="flex-1">
                          <select
                            {...register(`lead_form_fields.${index}.field_type`)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="text">Text</option>
                            <option value="email">Email</option>
                            <option value="phone">Phone</option>
                            <option value="select">Select</option>
                            <option value="checkbox">Checkbox</option>
                          </select>
                        </div>
                        <div className="flex items-center">
                          <input
                            {...register(`lead_form_fields.${index}.required`)}
                            type="checkbox"
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <label className="ml-2 text-sm text-gray-700">Required</label>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeLeadFormField(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    
                    <button
                      type="button"
                      onClick={() => appendLeadFormField({ field_name: '', field_type: 'text', required: false })}
                      className="flex items-center px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Field
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes
                  </label>
                  <textarea
                    {...register('notes')}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Additional campaign notes..."
                  />
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
                disabled={currentStep === 1}
                className={`px-4 py-2 text-sm font-medium rounded-md ${
                  currentStep === 1
                    ? 'text-gray-400 cursor-not-allowed'
                    : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                }`}
              >
                Previous
              </button>
              
              {currentStep < steps.length ? (
                <button
                  type="button"
                  onClick={() => setCurrentStep(Math.min(steps.length, currentStep + 1))}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
                >
                  Next
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {creating ? 'Creating...' : 'Create Campaign'}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}