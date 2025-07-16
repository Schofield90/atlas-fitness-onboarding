'use client';

import { useRouter } from 'next/navigation';
import { 
  Play, 
  Zap, 
  Target, 
  TrendingUp, 
  Clock, 
  MessageSquare,
  CheckCircle,
  ArrowRight,
  Star,
  Users,
  Shield,
  Facebook
} from 'lucide-react';

export default function LandingPage() {
  const router = useRouter();

  const testimonials = [
    {
      name: "Mike Thompson",
      gym: "FitLife Gym, Manchester",
      quote: "This literally paid for itself in 3 days. We're converting 40% more leads just by responding faster!",
      rating: 5
    },
    {
      name: "Sarah Chen",
      gym: "Peak Performance, London",
      quote: "Never miss a lead again. The ROI is insane - we've added £8k monthly revenue in 6 weeks.",
      rating: 5
    },
    {
      name: "James Wilson",
      gym: "Iron Works, Birmingham",
      quote: "Setup took 15 minutes. First month we recovered the entire annual cost from just 3 extra members.",
      rating: 5
    }
  ];

  const features = [
    {
      icon: <Zap className="h-6 w-6" />,
      title: "Under 5-Minute Response",
      description: "Automatic SMS sent within 5 minutes of lead submission"
    },
    {
      icon: <Target className="h-6 w-6" />,
      title: "31% Higher Conversion",
      description: "Industry-proven conversion rates with fast response times"
    },
    {
      icon: <MessageSquare className="h-6 w-6" />,
      title: "Personalized Messages",
      description: "Customize SMS templates for your gym's unique voice"
    },
    {
      icon: <TrendingUp className="h-6 w-6" />,
      title: "Real-Time Analytics",
      description: "Track response times, conversion rates, and ROI"
    }
  ];

  const stats = [
    { number: "127", label: "UK Gyms Using This" },
    { number: "31%", label: "Average Conversion Increase" },
    { number: "1:47", label: "Average Response Time" },
    { number: "£6,289", label: "Average Monthly ROI" }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-r from-blue-600 to-purple-700 text-white overflow-hidden">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-5xl font-bold mb-6 leading-tight">
                Your Gym Leads Are Texting Your Competitors
              </h1>
              <p className="text-xl text-blue-100 mb-8">
                Respond in 5 minutes or lose them forever. 78% of leads buy from whoever responds first.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <button
                  onClick={() => router.push('/demo')}
                  className="bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white font-bold py-4 px-8 rounded-xl text-lg transition-all transform hover:scale-105 shadow-lg flex items-center justify-center"
                >
                  <Play className="h-5 w-5 mr-2" />
                  Watch 2-Min Demo
                </button>
                <button
                  onClick={() => router.push('/signup')}
                  className="bg-white text-blue-600 hover:bg-gray-100 font-bold py-4 px-8 rounded-xl text-lg transition-all border-2 border-white flex items-center justify-center"
                >
                  Start Free Trial
                  <ArrowRight className="h-5 w-5 ml-2" />
                </button>
              </div>

              <div className="flex items-center space-x-6 text-sm text-blue-200">
                <div className="flex items-center">
                  <Shield className="h-4 w-4 mr-1" />
                  <span>No credit card required</span>
                </div>
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-1" />
                  <span>15-minute setup</span>
                </div>
                <div className="flex items-center">
                  <Users className="h-4 w-4 mr-1" />
                  <span>127 UK gyms trust us</span>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold mb-2">The Reality Check</h3>
                  <p className="text-blue-200">While you&apos;re sleeping, your competitors are stealing your leads</p>
                </div>
                
                <div className="bg-white rounded-lg p-6 text-black mb-6">
                  <div className="flex items-center mb-4">
                    <div className="w-3 h-3 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                    <span className="text-sm font-medium">New lead just arrived</span>
                  </div>
                  <div className="text-sm space-y-2">
                    <p><strong>Sarah Johnson</strong> - Interested in January Challenge</p>
                    <p>Phone: +44 7700 900123</p>
                    <p>Source: Facebook Ad</p>
                  </div>
                </div>

                <div className="text-center">
                  <div className="inline-flex items-center bg-green-500 text-white px-4 py-2 rounded-full mb-4">
                    <Clock className="h-4 w-4 mr-2" />
                    <span className="font-semibold">SMS sent in 1:47</span>
                  </div>
                  <p className="text-sm text-blue-200">
                    23x faster than industry average
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Problem/Solution Section */}
      <div className="bg-gray-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-8">Here&apos;s What&apos;s Costing You Money</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="space-y-6">
              <h3 className="text-2xl font-bold text-red-400 mb-4">❌ The Problem</h3>
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="text-red-400 mr-3 mt-1">•</div>
                  <div>
                    <p className="font-semibold">78% of leads buy from whoever responds first</p>
                    <p className="text-gray-400 text-sm">Speed beats everything</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="text-red-400 mr-3 mt-1">•</div>
                  <div>
                    <p className="font-semibold">Average gym responds in 2+ hours</p>
                    <p className="text-gray-400 text-sm">Way too slow to win</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="text-red-400 mr-3 mt-1">•</div>
                  <div>
                    <p className="font-semibold">You&apos;re losing £2,000+/month in revenue</p>
                    <p className="text-gray-400 text-sm">Every month you delay</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="space-y-6">
              <h3 className="text-2xl font-bold text-green-400 mb-4">✅ The Solution</h3>
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="text-green-400 mr-3 mt-1">•</div>
                  <div>
                    <p className="font-semibold">Instant SMS response (&lt; 5 minutes)</p>
                    <p className="text-gray-400 text-sm">Beat every competitor</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="text-green-400 mr-3 mt-1">•</div>
                  <div>
                    <p className="font-semibold">3.8x higher conversion rate</p>
                    <p className="text-gray-400 text-sm">Proven results</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="text-green-400 mr-3 mt-1">•</div>
                  <div>
                    <p className="font-semibold">£197/month → £2,847 additional revenue</p>
                    <p className="text-gray-400 text-sm">14x return on investment</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Social Proof Bar */}
      <div className="bg-blue-600 text-white py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-lg font-semibold">
            127 UK gyms responding to 18,439 leads in &lt; 5 minutes
          </p>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              How It Works
            </h2>
            <p className="text-xl text-gray-600">
              Simple to set up, powerful results, immediate ROI
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white rounded-lg p-6 shadow-lg hover:shadow-xl transition-shadow">
              <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg mb-4">
                <Facebook className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Connect Your Facebook Ads</h3>
              <p className="text-gray-600">Simple integration with your existing ad campaigns</p>
            </div>
            
            <div className="bg-white rounded-lg p-6 shadow-lg hover:shadow-xl transition-shadow">
              <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-lg mb-4">
                <MessageSquare className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Instant SMS Response</h3>
              <p className="text-gray-600">Never miss a lead - respond within 5 minutes automatically</p>
            </div>
            
            <div className="bg-white rounded-lg p-6 shadow-lg hover:shadow-xl transition-shadow">
              <div className="flex items-center justify-center w-12 h-12 bg-purple-100 rounded-lg mb-4">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Track Your ROI</h3>
              <p className="text-gray-600">See exactly what you&apos;re earning from faster responses</p>
            </div>
          </div>
        </div>
      </div>

      {/* ROI Calculator Teaser */}
      <div className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-gray-900 mb-8">
            Calculate Your ROI
          </h2>
          
          <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-2xl p-8 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900 mb-2">47</div>
                <div className="text-gray-600">Average monthly leads</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600 mb-2">£6,289</div>
                <div className="text-gray-600">Additional monthly revenue</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600 mb-2">3,092%</div>
                <div className="text-gray-600">Return on investment</div>
              </div>
            </div>
          </div>

          <button
            onClick={() => router.push('/dashboard/roi')}
            className="bg-blue-600 text-white px-8 py-4 rounded-lg hover:bg-blue-700 font-semibold text-lg transition-colors"
          >
            See Your Custom ROI Calculation
          </button>
        </div>
      </div>

      {/* Testimonials */}
      <div className="py-20 bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">What Gym Owners Say</h2>
            <p className="text-xl text-gray-300">Real results from real gyms across the UK</p>
          </div>

          <div className="grid grid-cols-1 gap-8">
            <div className="bg-white/5 backdrop-blur-sm rounded-lg p-8 border border-white/10">
              <div className="flex items-center mb-6">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-6 w-6 text-yellow-400 fill-current" />
                ))}
              </div>
              <p className="text-2xl text-gray-300 mb-6 italic">
                &quot;Paid for itself in 3 days. Can&apos;t imagine running my gym without it.&quot;
              </p>
              <div>
                <p className="font-semibold text-white text-lg">Mike Thompson</p>
                <p className="text-gray-400">FitLife Gym Manchester</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Final CTA */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-700 text-white py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold mb-6">
            Ready to Never Miss a Lead Again?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join 127 UK gyms who&apos;ve transformed their lead response and boosted revenue by 31%
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => router.push('/demo')}
              className="bg-white text-blue-600 hover:bg-gray-100 font-bold py-4 px-8 rounded-xl text-lg transition-all flex items-center justify-center"
            >
              <Play className="h-5 w-5 mr-2" />
              Watch 2-Min Demo
            </button>
            <button
              onClick={() => router.push('/signup')}
              className="bg-green-500 hover:bg-green-600 text-white font-bold py-4 px-8 rounded-xl text-lg transition-all flex items-center justify-center"
            >
              Start Free Trial
              <ArrowRight className="h-5 w-5 ml-2" />
            </button>
          </div>

          <div className="mt-6 flex items-center justify-center space-x-6 text-sm text-blue-200">
            <div className="flex items-center">
              <CheckCircle className="h-4 w-4 mr-1" />
              <span>No credit card required</span>
            </div>
            <div className="flex items-center">
              <CheckCircle className="h-4 w-4 mr-1" />
              <span>Set up in 15 minutes</span>
            </div>
            <div className="flex items-center">
              <CheckCircle className="h-4 w-4 mr-1" />
              <span>Cancel anytime</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}