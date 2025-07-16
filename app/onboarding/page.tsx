'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';
import { 
  CheckCircle, 
  Facebook, 
  MessageSquare, 
  Zap, 
  ArrowRight,
  Phone,
  Play,
  ExternalLink,
  Sparkles,
  Target,
  Clock
} from 'lucide-react';

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [testPhoneNumber, setTestPhoneNumber] = useState('');
  const [testSMSResult, setTestSMSResult] = useState<string | null>(null);
  const [facebookConnected, setFacebookConnected] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/signup');
        return;
      }
      setUser(user);
    };
    getUser();
  }, [router]);

  const handleFacebookConnect = async () => {
    setLoading(true);
    
    // For now, simulate the Facebook connection
    // In production, this would use Facebook OAuth
    setTimeout(() => {
      setFacebookConnected(true);
      setCompletedSteps([...completedSteps, 1]);
      setLoading(false);
    }, 2000);
  };

  const handleTestSMS = async () => {
    if (!testPhoneNumber) {
      setTestSMSResult('Please enter a phone number');
      return;
    }

    setLoading(true);
    setTestSMSResult(null);
    
    try {
      const response = await fetch('/api/sms/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber: testPhoneNumber,
          message: `🎉 Congratulations! Your Atlas Fitness lead response system is LIVE! New leads will receive instant SMS responses like this one. Test by ${user?.user_metadata?.gym_name || 'Atlas Fitness'}`
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setTestSMSResult('✅ SMS sent successfully! Check your phone.');
        setCompletedSteps([...completedSteps, 2]);
      } else {
        setTestSMSResult('❌ Failed to send SMS. Please try again or contact support.');
      }
    } catch (error) {
      console.error('SMS test error:', error);
      setTestSMSResult('❌ Error sending SMS. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleActivateAutomation = async () => {
    setLoading(true);
    
    try {
      // Get the lead follow-up template
      const { data: template } = await supabase
        .from('automation_templates')
        .select('*')
        .eq('template_key', 'lead_follow_up')
        .single();

      if (template) {
        // Activate the lead follow-up automation
        const { error } = await supabase
          .from('gym_automations')
          .insert([{
            template_id: template.id,
            is_active: true,
            config: {
              sms_delay_minutes: 5,
              sms_message: `Hi {{first_name}}! Thanks for your interest in ${user?.user_metadata?.gym_name || 'our gym'}. I'd love to help you achieve your fitness goals. When would be a good time for a quick chat about your fitness journey? Reply STOP to opt out.`,
              email_delay_hours: 1,
              email_subject: 'Welcome to Your Fitness Journey!',
              task_delay_hours: 24,
              task_message: 'Follow up with lead if no response to SMS or email'
            }
          }]);

        if (!error) {
          setCompletedSteps([...completedSteps, 3]);
        }
      }
    } catch (error) {
      console.error('Automation activation error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFinishOnboarding = () => {
    router.push('/dashboard');
  };

  const steps = [
    {
      id: 1,
      title: 'Connect Facebook',
      description: 'Link your Facebook account to receive leads',
      icon: <Facebook className="h-8 w-8" />,
      color: 'blue',
      completed: completedSteps.includes(1)
    },
    {
      id: 2,
      title: 'Test SMS Setup',
      description: 'Send a test SMS to verify everything works',
      icon: <MessageSquare className="h-8 w-8" />,
      color: 'green',
      completed: completedSteps.includes(2)
    },
    {
      id: 3,
      title: 'Activate Automation',
      description: 'Turn on instant lead responses',
      icon: <Zap className="h-8 w-8" />,
      color: 'purple',
      completed: completedSteps.includes(3)
    }
  ];

  const allStepsComplete = completedSteps.length === 3;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Welcome to Atlas Fitness! 🎉
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Let's get you set up in 3 quick steps. You'll be responding to leads in under 5 minutes!
          </p>
          
          {/* Progress indicator */}
          <div className="flex items-center justify-center mb-8">
            <div className="flex items-center space-x-4">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
                    step.completed 
                      ? 'bg-green-500 text-white' 
                      : currentStep === step.id 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-200 text-gray-600'
                  }`}>
                    {step.completed ? (
                      <CheckCircle className="h-5 w-5" />
                    ) : (
                      step.id
                    )}
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`w-16 h-1 mx-4 ${
                      step.completed ? 'bg-green-500' : 'bg-gray-200'
                    }`}></div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {!allStepsComplete ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Current Step */}
            <div className="bg-white rounded-xl shadow-lg p-8">
              {currentStep === 1 && (
                <div>
                  <div className="flex items-center mb-6">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                      <Facebook className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">Connect Facebook</h2>
                      <p className="text-gray-600">Link your Facebook account to receive leads</p>
                    </div>
                  </div>
                  
                  <div className="mb-6">
                    <p className="text-gray-700 mb-4">
                      We'll connect to your Facebook Business account to automatically receive leads from your ads.
                    </p>
                    
                    <div className="bg-blue-50 rounded-lg p-4 mb-4">
                      <h4 className="font-semibold text-blue-900 mb-2">What we'll access:</h4>
                      <ul className="space-y-1 text-sm text-blue-800">
                        <li>• Read your lead generation forms</li>
                        <li>• Receive new lead notifications</li>
                        <li>• Basic business profile information</li>
                      </ul>
                    </div>
                  </div>
                  
                  <button
                    onClick={handleFacebookConnect}
                    disabled={loading || facebookConnected}
                    className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    {loading ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    ) : facebookConnected ? (
                      <>
                        <CheckCircle className="h-5 w-5 mr-2" />
                        Connected Successfully!
                      </>
                    ) : (
                      <>
                        <Facebook className="h-5 w-5 mr-2" />
                        Connect Facebook Account
                      </>
                    )}
                  </button>
                  
                  {facebookConnected && (
                    <button
                      onClick={() => setCurrentStep(2)}
                      className="w-full mt-4 bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 font-semibold transition-colors flex items-center justify-center"
                    >
                      Next Step
                      <ArrowRight className="h-5 w-5 ml-2" />
                    </button>
                  )}
                </div>
              )}

              {currentStep === 2 && (
                <div>
                  <div className="flex items-center mb-6">
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mr-4">
                      <MessageSquare className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">Test SMS Setup</h2>
                      <p className="text-gray-600">Send a test SMS to verify everything works</p>
                    </div>
                  </div>
                  
                  <div className="mb-6">
                    <p className="text-gray-700 mb-4">
                      Let's test your SMS system with your phone number. This ensures leads will receive messages correctly.
                    </p>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Your Phone Number
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                        <input
                          type="tel"
                          value={testPhoneNumber}
                          onChange={(e) => setTestPhoneNumber(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          placeholder="+44 7700 900123"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={handleTestSMS}
                    disabled={loading || !testPhoneNumber}
                    className="w-full bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center mb-4"
                  >
                    {loading ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    ) : (
                      <>
                        <MessageSquare className="h-5 w-5 mr-2" />
                        Send Test SMS
                      </>
                    )}
                  </button>
                  
                  {testSMSResult && (
                    <div className={`p-4 rounded-lg mb-4 ${
                      testSMSResult.includes('✅') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
                    }`}>
                      <p className="font-medium">{testSMSResult}</p>
                    </div>
                  )}
                  
                  {completedSteps.includes(2) && (
                    <button
                      onClick={() => setCurrentStep(3)}
                      className="w-full bg-purple-600 text-white py-3 px-6 rounded-lg hover:bg-purple-700 font-semibold transition-colors flex items-center justify-center"
                    >
                      Next Step
                      <ArrowRight className="h-5 w-5 ml-2" />
                    </button>
                  )}
                </div>
              )}

              {currentStep === 3 && (
                <div>
                  <div className="flex items-center mb-6">
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mr-4">
                      <Zap className="h-6 w-6 text-purple-600" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">Activate Automation</h2>
                      <p className="text-gray-600">Turn on instant lead responses</p>
                    </div>
                  </div>
                  
                  <div className="mb-6">
                    <p className="text-gray-700 mb-4">
                      Ready to go live? We'll activate your lead response automation so new leads get instant SMS responses.
                    </p>
                    
                    <div className="bg-purple-50 rounded-lg p-4 mb-4">
                      <h4 className="font-semibold text-purple-900 mb-2">What happens next:</h4>
                      <ul className="space-y-1 text-sm text-purple-800">
                        <li>• New leads trigger automatic SMS within 5 minutes</li>
                        <li>• Follow-up email sent after 1 hour if no response</li>
                        <li>• Staff task created after 24 hours if needed</li>
                      </ul>
                    </div>
                  </div>
                  
                  <button
                    onClick={handleActivateAutomation}
                    disabled={loading}
                    className="w-full bg-purple-600 text-white py-3 px-6 rounded-lg hover:bg-purple-700 font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    {loading ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    ) : (
                      <>
                        <Zap className="h-5 w-5 mr-2" />
                        Activate Lead Response System
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Side Panel */}
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Setup Progress</h3>
                <div className="space-y-4">
                  {steps.map((step) => (
                    <div key={step.id} className="flex items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
                        step.completed 
                          ? 'bg-green-500 text-white' 
                          : currentStep === step.id 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-gray-200 text-gray-600'
                      }`}>
                        {step.completed ? (
                          <CheckCircle className="h-4 w-4" />
                        ) : (
                          step.id
                        )}
                      </div>
                      <div className="flex-1">
                        <p className={`font-medium ${
                          step.completed ? 'text-green-600' : 'text-gray-900'
                        }`}>
                          {step.title}
                        </p>
                        <p className="text-sm text-gray-600">{step.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6">
                <h4 className="font-bold text-gray-900 mb-4">💡 Pro Tip</h4>
                <p className="text-sm text-gray-700">
                  The faster you respond to leads, the higher your conversion rate. Studies show that responding within 5 minutes increases conversion by 31%!
                </p>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6">
                <h4 className="font-bold text-gray-900 mb-4">Need Help?</h4>
                <p className="text-sm text-gray-600 mb-4">
                  If you run into any issues, we're here to help!
                </p>
                <div className="space-y-2">
                  <a 
                    href="mailto:support@atlasfitness.com" 
                    className="flex items-center text-sm text-blue-600 hover:text-blue-700"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Email Support
                  </a>
                  <a 
                    href="/help" 
                    className="flex items-center text-sm text-blue-600 hover:text-blue-700"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Help Center
                  </a>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Celebration Screen */
          <div className="text-center">
            <div className="bg-white rounded-xl shadow-lg p-12 max-w-2xl mx-auto">
              <div className="mb-8">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Sparkles className="h-10 w-10 text-green-600" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  🎉 You're Live!
                </h2>
                <p className="text-xl text-gray-600 mb-8">
                  Your lead response system is now active. New leads will receive SMS responses within 5 minutes!
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="text-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                    <Target className="h-6 w-6 text-blue-600" />
                  </div>
                  <h4 className="font-semibold text-gray-900">Ready to Convert</h4>
                  <p className="text-sm text-gray-600">31% higher conversion rate</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                    <Clock className="h-6 w-6 text-green-600" />
                  </div>
                  <h4 className="font-semibold text-gray-900">Lightning Fast</h4>
                  <p className="text-sm text-gray-600">Under 5 minute response</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                    <Zap className="h-6 w-6 text-purple-600" />
                  </div>
                  <h4 className="font-semibold text-gray-900">Fully Automated</h4>
                  <p className="text-sm text-gray-600">Works 24/7 for you</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={handleFinishOnboarding}
                  className="bg-blue-600 text-white py-3 px-8 rounded-lg hover:bg-blue-700 font-semibold transition-colors flex items-center justify-center"
                >
                  View Dashboard
                  <ArrowRight className="h-5 w-5 ml-2" />
                </button>
                <button
                  onClick={() => router.push('/demo')}
                  className="bg-gray-100 text-gray-700 py-3 px-8 rounded-lg hover:bg-gray-200 font-semibold transition-colors flex items-center justify-center"
                >
                  <Play className="h-5 w-5 mr-2" />
                  Watch Demo Again
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}