'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Badge } from '@/app/components/ui/Badge';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeftIcon, 
  ArrowRightIcon,
  CheckIcon,
  EyeIcon,
  DevicePhoneMobileIcon,
  ComputerDesktopIcon,
  PhotoIcon,
  VideoCameraIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';
import { AdCreativeBuilder } from '@/app/components/ads/AdCreativeBuilder';
import { AudienceBuilder } from '@/app/components/ads/AudienceBuilder';

interface CampaignObjective {
  id: string;
  name: string;
  description: string;
  category: 'awareness' | 'consideration' | 'conversion';
  recommended?: boolean;
}

interface AdAccount {
  id: string;
  account_name: string;
  facebook_ad_account_id: string;
  currency: string;
  is_active: boolean;
}

interface CampaignData {
  name: string;
  objective: string;
  account_id: string;
  special_ad_categories: string[];
  buying_type: 'AUCTION' | 'RESERVED';
  campaign_budget_optimization: boolean;
  daily_budget?: number;
  lifetime_budget?: number;
  bid_strategy: string;
  schedule_start_time?: Date;
  schedule_end_time?: Date;
}

interface AdSetData {
  name: string;
  optimization_goal: string;
  billing_event: string;
  bid_amount?: number;
  daily_budget?: number;
  lifetime_budget?: number;
  targeting: {
    age_min: number;
    age_max: number;
    genders: number[];
    geo_locations: any;
    interests: any[];
    behaviors: any[];
    custom_audiences: string[];
    excluded_custom_audiences: string[];
  };
  placements: string[];
}

interface CreativeData {
  name: string;
  title: string;
  body: string;
  call_to_action_type: string;
  link_url: string;
  display_url: string;
  image_url?: string;
  video_url?: string;
  creative_type: 'single_image' | 'video' | 'carousel';
}

const CAMPAIGN_OBJECTIVES: CampaignObjective[] = [
  {
    id: 'LEAD_GENERATION',
    name: 'Lead Generation',
    description: 'Collect leads for your gym through forms',
    category: 'conversion',
    recommended: true
  },
  {
    id: 'REACH',
    name: 'Reach',
    description: 'Show your ads to the maximum number of people',
    category: 'awareness'
  },
  {
    id: 'TRAFFIC',
    name: 'Traffic',
    description: 'Send people to your website or app',
    category: 'consideration'
  },
  {
    id: 'ENGAGEMENT',
    name: 'Engagement',
    description: 'Get more likes, comments, and shares',
    category: 'consideration'
  },
  {
    id: 'CONVERSIONS',
    name: 'Conversions',
    description: 'Get more website purchases or actions',
    category: 'conversion'
  }
];

export default function CreateCampaignPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [adAccounts, setAdAccounts] = useState<AdAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  
  // Campaign data state
  const [campaignData, setCampaignData] = useState<CampaignData>({
    name: '',
    objective: 'LEAD_GENERATION',
    account_id: '',
    special_ad_categories: [],
    buying_type: 'AUCTION',
    campaign_budget_optimization: false,
    bid_strategy: 'LOWEST_COST_WITHOUT_CAP'
  });

  const [adSetData, setAdSetData] = useState<AdSetData>({
    name: '',
    optimization_goal: 'LEAD_GENERATION',
    billing_event: 'IMPRESSIONS',
    daily_budget: 2000, // $20 in cents
    targeting: {
      age_min: 18,
      age_max: 65,
      genders: [1, 2], // All genders
      geo_locations: {},
      interests: [],
      behaviors: [],
      custom_audiences: [],
      excluded_custom_audiences: []
    },
    placements: ['feed', 'right_hand_column', 'suggested_video', 'instant_article']
  });

  const [creativeData, setCreativeData] = useState<CreativeData>({
    name: '',
    title: '',
    body: '',
    call_to_action_type: 'LEARN_MORE',
    link_url: '',
    display_url: '',
    creative_type: 'single_image'
  });

  useEffect(() => {
    fetchAdAccounts();
  }, []);

  const fetchAdAccounts = async () => {
    try {
      const response = await fetch('/api/ads/accounts');
      if (response.ok) {
        const data = await response.json();
        setAdAccounts(data.accounts || []);
        if (data.accounts?.length > 0) {
          setCampaignData(prev => ({
            ...prev,
            account_id: data.accounts[0].id
          }));
        }
      }
    } catch (error) {
      console.error('Failed to fetch ad accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const validateStep = (step: number) => {
    switch (step) {
      case 1:
        return campaignData.name && campaignData.objective && campaignData.account_id;
      case 2:
        return adSetData.name && (adSetData.daily_budget || adSetData.lifetime_budget);
      case 3:
        return true; // Audience targeting is optional
      case 4:
        return creativeData.name && creativeData.title && creativeData.body;
      default:
        return false;
    }
  };

  const nextStep = () => {
    if (validateStep(currentStep) && currentStep < 5) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const publishCampaign = async () => {
    setPublishing(true);
    try {
      const response = await fetch('/api/ads/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaign: campaignData,
          adset: adSetData,
          creative: creativeData
        })
      });

      if (response.ok) {
        const data = await response.json();
        router.push(`/ads-manager?created=${data.campaign_id}`);
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create campaign');
      }
    } catch (error) {
      console.error('Failed to publish campaign:', error);
      alert('Failed to create campaign. Please try again.');
    } finally {
      setPublishing(false);
    }
  };

  const steps = [
    { id: 1, name: 'Campaign Setup', description: 'Choose objective and settings' },
    { id: 2, name: 'Budget & Schedule', description: 'Set budget and timeline' },
    { id: 3, name: 'Audience', description: 'Define your target audience' },
    { id: 4, name: 'Creative', description: 'Create your ad content' },
    { id: 5, name: 'Review', description: 'Review and publish' }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Link href="/ads-manager">
              <Button variant="outline" size="sm">
                <ArrowLeftIcon className="h-4 w-4 mr-2" />
                Back to Ads Manager
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold">Create New Campaign</h1>
              <p className="text-gray-400 mt-2">
                Step {currentStep} of {steps.length}: {steps[currentStep - 1].description}
              </p>
            </div>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                  currentStep > step.id ? 'bg-green-600 border-green-600' :
                  currentStep === step.id ? 'bg-blue-600 border-blue-600' :
                  'bg-gray-800 border-gray-600'
                }`}>
                  {currentStep > step.id ? (
                    <CheckIcon className="w-5 h-5 text-white" />
                  ) : (
                    <span className="text-white font-medium">{step.id}</span>
                  )}
                </div>
                <div className="ml-3">
                  <div className={`text-sm font-medium ${
                    currentStep >= step.id ? 'text-white' : 'text-gray-400'
                  }`}>
                    {step.name}
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div className={`mx-4 h-0.5 w-16 ${
                    currentStep > step.id ? 'bg-green-600' : 'bg-gray-600'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            {/* Step 1: Campaign Setup */}
            {currentStep === 1 && (
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle>Campaign Setup</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium mb-2">Campaign Name</label>
                    <input
                      type="text"
                      value={campaignData.name}
                      onChange={(e) => setCampaignData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter campaign name"
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Ad Account</label>
                    <select
                      value={campaignData.account_id}
                      onChange={(e) => setCampaignData(prev => ({ ...prev, account_id: e.target.value }))}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {adAccounts.map(account => (
                        <option key={account.id} value={account.id}>
                          {account.account_name} ({account.currency})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-4">Campaign Objective</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {CAMPAIGN_OBJECTIVES.map(objective => (
                        <div
                          key={objective.id}
                          onClick={() => setCampaignData(prev => ({ ...prev, objective: objective.id }))}
                          className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                            campaignData.objective === objective.id
                              ? 'border-blue-500 bg-blue-600/10'
                              : 'border-gray-600 bg-gray-700 hover:border-gray-500'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="font-medium text-white">{objective.name}</h3>
                              <p className="text-sm text-gray-400 mt-1">{objective.description}</p>
                              <Badge className={`mt-2 ${
                                objective.category === 'awareness' ? 'bg-yellow-600' :
                                objective.category === 'consideration' ? 'bg-blue-600' :
                                'bg-green-600'
                              }`}>
                                {objective.category}
                              </Badge>
                            </div>
                            {objective.recommended && (
                              <Badge className="bg-purple-600">Recommended</Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 2: Budget & Schedule */}
            {currentStep === 2 && (
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle>Budget & Schedule</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium mb-2">Ad Set Name</label>
                    <input
                      type="text"
                      value={adSetData.name}
                      onChange={(e) => setAdSetData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter ad set name"
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium mb-2">Budget Type</label>
                      <div className="space-y-3">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="budget_type"
                            checked={!!adSetData.daily_budget}
                            onChange={() => setAdSetData(prev => ({ 
                              ...prev, 
                              daily_budget: prev.daily_budget || 2000,
                              lifetime_budget: undefined 
                            }))}
                            className="mr-2"
                          />
                          <span>Daily Budget</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="budget_type"
                            checked={!!adSetData.lifetime_budget}
                            onChange={() => setAdSetData(prev => ({ 
                              ...prev, 
                              lifetime_budget: prev.lifetime_budget || 10000,
                              daily_budget: undefined 
                            }))}
                            className="mr-2"
                          />
                          <span>Lifetime Budget</span>
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        {adSetData.daily_budget ? 'Daily Budget' : 'Lifetime Budget'} (USD)
                      </label>
                      <input
                        type="number"
                        value={adSetData.daily_budget ? adSetData.daily_budget / 100 : adSetData.lifetime_budget ? adSetData.lifetime_budget / 100 : ''}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value) * 100;
                          setAdSetData(prev => ({
                            ...prev,
                            [adSetData.daily_budget ? 'daily_budget' : 'lifetime_budget']: value
                          }));
                        }}
                        min="1"
                        step="0.01"
                        placeholder="Enter amount"
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Optimization Goal</label>
                    <select
                      value={adSetData.optimization_goal}
                      onChange={(e) => setAdSetData(prev => ({ ...prev, optimization_goal: e.target.value }))}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="LEAD_GENERATION">Lead Generation</option>
                      <option value="REACH">Reach</option>
                      <option value="IMPRESSIONS">Impressions</option>
                      <option value="LINK_CLICKS">Link Clicks</option>
                      <option value="LANDING_PAGE_VIEWS">Landing Page Views</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Bid Strategy</label>
                    <select
                      value={adSetData.billing_event}
                      onChange={(e) => setAdSetData(prev => ({ ...prev, billing_event: e.target.value }))}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="IMPRESSIONS">Impressions</option>
                      <option value="LINK_CLICKS">Link Clicks</option>
                      <option value="LANDING_PAGE_VIEWS">Landing Page Views</option>
                    </select>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 3: Audience */}
            {currentStep === 3 && (
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle>Audience Targeting</CardTitle>
                </CardHeader>
                <CardContent>
                  <AudienceBuilder
                    targeting={adSetData.targeting}
                    onChange={(targeting) => setAdSetData(prev => ({ ...prev, targeting }))}
                  />
                </CardContent>
              </Card>
            )}

            {/* Step 4: Creative */}
            {currentStep === 4 && (
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle>Ad Creative</CardTitle>
                </CardHeader>
                <CardContent>
                  <AdCreativeBuilder
                    creative={creativeData}
                    onChange={setCreativeData}
                  />
                </CardContent>
              </Card>
            )}

            {/* Step 5: Review */}
            {currentStep === 5 && (
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle>Review & Publish</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="font-medium text-white mb-3">Campaign Details</h3>
                      <div className="space-y-2 text-sm">
                        <div><span className="text-gray-400">Name:</span> {campaignData.name}</div>
                        <div><span className="text-gray-400">Objective:</span> {campaignData.objective}</div>
                        <div><span className="text-gray-400">Ad Set:</span> {adSetData.name}</div>
                        <div>
                          <span className="text-gray-400">Budget:</span>{' '}
                          ${(adSetData.daily_budget || adSetData.lifetime_budget)! / 100}{' '}
                          {adSetData.daily_budget ? 'daily' : 'lifetime'}
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-medium text-white mb-3">Audience</h3>
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="text-gray-400">Age:</span> {adSetData.targeting.age_min}-{adSetData.targeting.age_max}
                        </div>
                        <div>
                          <span className="text-gray-400">Interests:</span>{' '}
                          {adSetData.targeting.interests.length} selected
                        </div>
                        <div>
                          <span className="text-gray-400">Behaviors:</span>{' '}
                          {adSetData.targeting.behaviors.length} selected
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-medium text-white mb-3">Creative Preview</h3>
                    <div className="bg-gray-700 p-4 rounded-lg">
                      <div className="text-lg font-medium">{creativeData.title}</div>
                      <div className="text-gray-300 mt-2">{creativeData.body}</div>
                      <div className="mt-3">
                        <Badge className="bg-blue-600">{creativeData.call_to_action_type}</Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar Preview */}
          <div className="space-y-6">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <EyeIcon className="h-5 w-5 mr-2" />
                  Preview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <ComputerDesktopIcon className="h-5 w-5 text-gray-400" />
                    <span className="text-sm text-gray-400">Desktop Feed</span>
                  </div>
                  
                  <div className="border border-gray-600 rounded-lg p-4 bg-gray-700">
                    <div className="flex items-center space-x-2 mb-3">
                      <div className="w-8 h-8 bg-blue-600 rounded-full"></div>
                      <div>
                        <div className="text-sm font-medium">Your Gym Name</div>
                        <div className="text-xs text-gray-400">Sponsored</div>
                      </div>
                    </div>
                    
                    {creativeData.image_url ? (
                      <div className="w-full h-32 bg-gray-600 rounded mb-3 flex items-center justify-center">
                        <PhotoIcon className="h-8 w-8 text-gray-400" />
                      </div>
                    ) : (
                      <div className="w-full h-32 bg-gradient-to-r from-blue-600 to-purple-600 rounded mb-3 flex items-center justify-center">
                        <span className="text-white font-medium">Your Ad Image</span>
                      </div>
                    )}
                    
                    <div className="text-sm font-medium mb-1">
                      {creativeData.title || 'Your Ad Title'}
                    </div>
                    <div className="text-xs text-gray-300 mb-3">
                      {creativeData.body || 'Your ad description will appear here...'}
                    </div>
                    
                    <Button size="sm" className="w-full bg-blue-600 hover:bg-blue-700">
                      {creativeData.call_to_action_type || 'Learn More'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle>Estimated Results</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Daily Reach:</span>
                    <span>2,100 - 6,200</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Link Clicks:</span>
                    <span>75 - 200</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Cost per Click:</span>
                    <span>$0.10 - $0.27</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center mt-8">
          <Button
            onClick={prevStep}
            disabled={currentStep === 1}
            variant="outline"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Previous
          </Button>

          <div className="flex space-x-4">
            {currentStep < 5 ? (
              <Button
                onClick={nextStep}
                disabled={!validateStep(currentStep)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Next
                <ArrowRightIcon className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={publishCampaign}
                disabled={publishing}
                className="bg-green-600 hover:bg-green-700"
              >
                {publishing ? 'Publishing...' : 'Publish Campaign'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}