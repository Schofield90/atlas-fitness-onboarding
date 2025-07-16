'use client';

import { useState } from 'react';
import { 
  ChevronDown, 
  ChevronUp, 
  Mail, 
  Phone, 
  MessageCircle, 
  Play,
  Facebook,
  Smartphone,
  TrendingUp,
  CreditCard,
  Settings
} from 'lucide-react';

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
}

export default function HelpPage() {
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);

  const faqs: FAQ[] = [
    {
      id: '1',
      question: 'How do I connect my Facebook ads account?',
      answer: 'During onboarding, you\'ll be prompted to connect your Facebook Business account. This allows us to automatically receive leads from your Facebook ad campaigns. If you need to reconnect later, go to Settings > Integrations.',
      category: 'Setup'
    },
    {
      id: '2',
      question: 'How fast do you actually respond to leads?',
      answer: 'We send SMS responses within 5 minutes of receiving a lead. Our average response time is 1 minute 47 seconds. This is 23x faster than the industry average and helps you convert 31% more leads.',
      category: 'Features'
    },
    {
      id: '3',
      question: 'Can I customize the SMS messages?',
      answer: 'Yes! You can fully customize all SMS templates to match your gym\'s voice and branding. Go to Automations > Settings to edit your message templates.',
      category: 'Features'
    },
    {
      id: '4',
      question: 'What happens after my 14-day trial?',
      answer: 'After your trial ends, you\'ll be automatically charged £197/month. You can cancel anytime before the trial ends with no charges. No long-term contracts or setup fees.',
      category: 'Billing'
    },
    {
      id: '5',
      question: 'How do I track ROI and performance?',
      answer: 'Your dashboard shows real-time analytics including response times, conversion rates, and estimated ROI. You can see exactly how much additional revenue you\'re generating from faster lead response.',
      category: 'Analytics'
    },
    {
      id: '6',
      question: 'What if I get charged accidentally?',
      answer: 'No worries! Contact us immediately and we\'ll process a full refund. We offer a 30-day money-back guarantee if you\'re not satisfied with the results.',
      category: 'Billing'
    },
    {
      id: '7',
      question: 'Do you work with Google Ads leads too?',
      answer: 'Currently we focus on Facebook leads, but Google Ads integration is coming soon. Sign up for our newsletter to be notified when it\'s available.',
      category: 'Features'
    },
    {
      id: '8',
      question: 'Can I use this with multiple gym locations?',
      answer: 'Yes! Each location needs its own account, but we offer multi-location discounts. Contact us for pricing if you have 3+ locations.',
      category: 'Setup'
    }
  ];

  const toggleFAQ = (id: string) => {
    setExpandedFAQ(expandedFAQ === id ? null : id);
  };

  const categories = [...new Set(faqs.map(faq => faq.category))];

  const tutorials = [
    {
      title: 'Getting Started: Complete Setup Guide',
      description: 'Walk through the entire setup process from connecting Facebook to sending your first automated SMS',
      duration: '8 min',
      icon: <Settings className="h-5 w-5" />
    },
    {
      title: 'Connecting Your Facebook Ads Account',
      description: 'Step-by-step guide to connecting your Facebook Business account and lead forms',
      duration: '3 min',
      icon: <Facebook className="h-5 w-5" />
    },
    {
      title: 'Customizing Your SMS Templates',
      description: 'How to personalize your automated messages to match your gym\'s brand voice',
      duration: '5 min',
      icon: <Smartphone className="h-5 w-5" />
    },
    {
      title: 'Understanding Your Analytics Dashboard',
      description: 'Learn how to read your ROI metrics and optimize your lead response performance',
      duration: '6 min',
      icon: <TrendingUp className="h-5 w-5" />
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Help Center</h1>
          <p className="text-xl text-gray-600">
            Get help with Atlas Fitness and maximize your lead conversion
          </p>
        </div>

        {/* Quick Contact */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-12">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Need Immediate Help?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Mail className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Email Support</h3>
              <p className="text-sm text-gray-600 mb-4">Usually respond within 2 hours</p>
              <a 
                href="mailto:support@atlasfitness.com" 
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                support@atlasfitness.com
              </a>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Live Chat</h3>
              <p className="text-sm text-gray-600 mb-4">Available 9 AM - 6 PM GMT</p>
              <button className="text-green-600 hover:text-green-700 font-medium">
                Start Chat
              </button>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Phone className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Phone Support</h3>
              <p className="text-sm text-gray-600 mb-4">For urgent issues only</p>
              <a 
                href="tel:+447700900123" 
                className="text-purple-600 hover:text-purple-700 font-medium"
              >
                +44 7700 900123
              </a>
            </div>
          </div>
        </div>

        {/* Video Tutorials */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-12">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Video Tutorials</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {tutorials.map((tutorial, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors cursor-pointer">
                <div className="flex items-start">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mr-4">
                    {tutorial.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">{tutorial.title}</h3>
                    <p className="text-sm text-gray-600 mb-2">{tutorial.description}</p>
                    <div className="flex items-center text-sm text-gray-500">
                      <Play className="h-4 w-4 mr-1" />
                      <span>{tutorial.duration}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ Section */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Frequently Asked Questions</h2>
          
          <div className="space-y-4">
            {categories.map(category => (
              <div key={category}>
                <h3 className="text-lg font-medium text-gray-900 mb-3 border-b border-gray-200 pb-2">
                  {category}
                </h3>
                <div className="space-y-2 mb-6">
                  {faqs.filter(faq => faq.category === category).map((faq) => (
                    <div key={faq.id} className="border border-gray-200 rounded-lg">
                      <button
                        onClick={() => toggleFAQ(faq.id)}
                        className="w-full text-left p-4 hover:bg-gray-50 transition-colors flex items-center justify-between"
                      >
                        <span className="font-medium text-gray-900">{faq.question}</span>
                        {expandedFAQ === faq.id ? (
                          <ChevronUp className="h-5 w-5 text-gray-500" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-gray-500" />
                        )}
                      </button>
                      {expandedFAQ === faq.id && (
                        <div className="px-4 pb-4 text-gray-700">
                          {faq.answer}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Still Need Help */}
        <div className="mt-12 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-8 text-center">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">Still Need Help?</h3>
          <p className="text-gray-600 mb-6">
            Can't find what you're looking for? Our support team is here to help you succeed.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="mailto:support@atlasfitness.com"
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-semibold transition-colors"
            >
              Contact Support
            </a>
            <button className="bg-white text-blue-600 px-6 py-3 rounded-lg hover:bg-gray-50 font-semibold transition-colors border border-blue-200">
              Book a Demo Call
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}