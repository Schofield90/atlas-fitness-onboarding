'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  Mail, 
  Building, 
  Phone, 
  MapPin, 
  ArrowRight, 
  CheckCircle,
  Shield,
  Clock,
  Zap
} from 'lucide-react';

export default function SignupPage() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    gymName: '',
    phone: '',
    location: '',
    fullName: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const router = useRouter();

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const validatePhone = (phone: string) => {
    const re = /^[\+]?[\d\s\-\(\)]{10,}$/;
    return re.test(phone);
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    if (!formData.email) {
      setErrors({ email: 'Email is required' });
      return;
    }
    
    if (!validateEmail(formData.email)) {
      setErrors({ email: 'Please enter a valid email address' });
      return;
    }

    setLoading(true);
    
    try {
      // Check if email already exists
      const { data: existingUser } = await supabase
        .from('auth.users')
        .select('email')
        .eq('email', formData.email)
        .single();

      if (existingUser) {
        setErrors({ email: 'Account already exists. Please sign in instead.' });
        setLoading(false);
        return;
      }

      // Move to step 2
      setStep(2);
    } catch (error) {
      console.error('Email validation error:', error);
      // Continue to step 2 even if check fails
      setStep(2);
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    // Validate all fields
    const newErrors: Record<string, string> = {};
    
    if (!formData.fullName) newErrors.fullName = 'Full name is required';
    if (!formData.gymName) newErrors.gymName = 'Gym name is required';
    if (!formData.phone) newErrors.phone = 'Phone number is required';
    if (!formData.location) newErrors.location = 'Location is required';
    
    if (!validatePhone(formData.phone)) {
      newErrors.phone = 'Please enter a valid phone number';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    
    try {
      // Create user account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2), // Generate random password
        options: {
          data: {
            full_name: formData.fullName,
            gym_name: formData.gymName,
            phone: formData.phone,
            location: formData.location
          }
        }
      });

      if (authError) {
        throw authError;
      }

      if (authData.user) {
        // Create organization
        const { data: orgData, error: orgError } = await supabase
          .from('organizations')
          .insert([{
            name: formData.gymName,
            type: 'gym',
            settings: {
              location: formData.location,
              phone: formData.phone,
              trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
            }
          }])
          .select()
          .single();

        if (orgError) {
          throw orgError;
        }

        // Create user profile
        const { error: profileError } = await supabase
          .from('user_profiles')
          .insert([{
            id: authData.user.id,
            email: formData.email,
            full_name: formData.fullName,
            organization_id: orgData.id,
            role: 'owner',
            avatar_url: null,
            settings: {
              notifications: true,
              timezone: 'Europe/London'
            }
          }]);

        if (profileError) {
          throw profileError;
        }

        // Redirect to onboarding
        router.push('/onboarding');
      }
    } catch (error) {
      console.error('Signup error:', error);
      setErrors({ 
        general: error instanceof Error ? error.message : 'Failed to create account. Please try again.' 
      });
    } finally {
      setLoading(false);
    }
  };

  const benefits = [
    {
      icon: <Zap className="h-5 w-5" />,
      title: "Instant Lead Response",
      description: "SMS sent within 5 minutes of lead submission"
    },
    {
      icon: <CheckCircle className="h-5 w-5" />,
      title: "31% Higher Conversion",
      description: "Proven results from 127 UK gyms"
    },
    {
      icon: <Shield className="h-5 w-5" />,
      title: "No Risk Trial",
      description: "14 days free, no credit card required"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Start Your Free 14-Day Trial
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Join 127 UK gyms who never miss a lead
          </p>
          
          {/* Progress indicator */}
          <div className="flex items-center justify-center mb-12">
            <div className="flex items-center space-x-4">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                1
              </div>
              <div className={`w-16 h-1 ${step >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                2
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Form Section */}
          <div className="bg-white rounded-xl shadow-lg p-8">
            {step === 1 ? (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  Let's get started
                </h2>
                
                <form onSubmit={handleEmailSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="your@email.com"
                        required
                      />
                    </div>
                    {errors.email && (
                      <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                    )}
                  </div>
                  
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    {loading ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    ) : (
                      <>
                        Continue
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </>
                    )}
                  </button>
                </form>
              </div>
            ) : (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  Tell us about your gym
                </h2>
                
                <form onSubmit={handleCompleteSignup} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Your Full Name
                    </label>
                    <input
                      type="text"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="John Smith"
                      required
                    />
                    {errors.fullName && (
                      <p className="mt-1 text-sm text-red-600">{errors.fullName}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Gym Name
                    </label>
                    <div className="relative">
                      <Building className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                      <input
                        type="text"
                        value={formData.gymName}
                        onChange={(e) => setFormData({ ...formData, gymName: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="FitLife Gym"
                        required
                      />
                    </div>
                    {errors.gymName && (
                      <p className="mt-1 text-sm text-red-600">{errors.gymName}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="+44 7700 900123"
                        required
                      />
                    </div>
                    {errors.phone && (
                      <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Location
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                      <input
                        type="text"
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Manchester, UK"
                        required
                      />
                    </div>
                    {errors.location && (
                      <p className="mt-1 text-sm text-red-600">{errors.location}</p>
                    )}
                  </div>

                  {errors.general && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <p className="text-sm text-red-600">{errors.general}</p>
                    </div>
                  )}
                  
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    {loading ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    ) : (
                      <>
                        Create Account & Start Trial
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* Benefits Section */}
          <div className="space-y-8">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-6">
                What you'll get:
              </h3>
              
              <div className="space-y-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-start space-x-4">
                    <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <div className="text-blue-600">
                        {benefit.icon}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">{benefit.title}</h4>
                      <p className="text-gray-600">{benefit.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-6">
              <h4 className="font-bold text-gray-900 mb-4">Trial includes:</h4>
              <ul className="space-y-2">
                <li className="flex items-center text-sm text-gray-700">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  Unlimited SMS responses
                </li>
                <li className="flex items-center text-sm text-gray-700">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  Facebook & Google lead integration
                </li>
                <li className="flex items-center text-sm text-gray-700">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  Real-time analytics dashboard
                </li>
                <li className="flex items-center text-sm text-gray-700">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  Phone & email support
                </li>
              </ul>
            </div>

            <div className="bg-gray-50 rounded-xl p-6">
              <div className="flex items-center space-x-2 mb-4">
                <Clock className="h-5 w-5 text-gray-500" />
                <span className="font-semibold text-gray-900">Setup takes 15 minutes</span>
              </div>
              <p className="text-sm text-gray-600">
                Most gyms are live and responding to leads within 15 minutes of signing up.
              </p>
            </div>
          </div>
        </div>

        {/* Trust indicators */}
        <div className="mt-12 text-center">
          <div className="flex items-center justify-center space-x-8 text-sm text-gray-500">
            <div className="flex items-center">
              <Shield className="h-4 w-4 mr-1" />
              <span>GDPR Compliant</span>
            </div>
            <div className="flex items-center">
              <CheckCircle className="h-4 w-4 mr-1" />
              <span>UK Data Protection</span>
            </div>
            <div className="flex items-center">
              <Clock className="h-4 w-4 mr-1" />
              <span>24/7 Support</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}